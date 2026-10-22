/* CityView: owns the three.js scene of a City in the browser (M3–M5). React only reads its snapshot
   (useSyncExternalStore) and calls its methods; the snapshot changes on meaningful events and at
   most twice a second for the fps, never per frame.

   Camera (ADR-035): one orthographic camera, two modes.
     2D  — true isometric (elevation asin(1/√3) ≈ 35.26°), locked to the 4 views 45° + 90°·k, which
           are the old SVG app's views; Q / E turn 90°; zoom and pan only.
     3D  — free orbit (OrbitControls), zoom, pan. Back to 2D snaps to the nearest view.
   Detail (ADR-036): the base layer (ground, streets, areas) is built once; buildings come in 64 m
   tiles, each built per detail level when first needed — every tile at a low level right away,
   then one tile a frame at the wanted level, nearest the middle of the view first.
   Street life (ADR-037): furniture in 64 m cells (poles, lamps, signals, trees in two looks, wires
   with travelling pulses at night), the signal phase driving the signal heads, traffic stepped
   every frame and drawn as instances. View distance hides far tiles, cells and vehicles.
   Colours are the theme tokens read from CSS; lit things are the accent and glow (bloom) in the
   dark theme only. Lifecycle: mount(host) / unmount() pair cleanly (React StrictMode mounts twice). */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import {
  METRO, metroTracks, trainAt, trainCount, roadNetwork, signalsAt, spawnTraffic, stepTraffic, streetFurniture, trafficLanes,
  type City, type Lane, type Signals, type Track, type Vehicle, type VehicleKind,
} from '@my-city/core';
import { beaconsOf, buildBase, buildTile, cityFloors, tilesOf, type Detail, type Layer, type Tile } from '@render/city';
import { STREET_LAMPS, buildFurnitureCell, furnitureBuckets, signalLamp, type FurnitureBucket, type FurnitureCell } from '@render/furniture';
import { buildShowcase, showcasesOf, type BuiltShowcase, type ShowcaseItem } from '@render/showcase';
import { placeVehicle, vehicleModel, type VehicleModel, type VehiclePart } from '@render/vehicles';
import { at as pathAt, carModel, stationLamp, type CarModel } from '@render/metro';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { Surface } from '@render/batch';
import { isHouseLamp, windowRank, windowShade, type Shade } from '@render/lights';
import { FAR, detailFor, farness, loadQuality, lowerLevel, saveQuality, type Quality } from './quality';
import { lightOn, loadLights, saveLights, type LightSettings } from './lights';
import {
  STREET_LABEL_MODES, buildStreetCatalog, selectVisibleStreetLabels,
  type ProjectedStreetLabel, type StreetEntry, type StreetLabelMode,
} from './streetLabels';
import {
  PLACE_INFO_MODES, buildPlaceCatalog, selectVisiblePlaceLabels,
  type PlaceCatalog, type PlaceEntry, type PlaceInfoMode,
} from './placeInfo';

export type Mode = '2d' | '3d';
export type Theme = 'dark' | 'light';

export interface Snapshot {
  mode: Mode;
  /** nearest of the 4 isometric views */
  view: 0 | 1 | 2 | 3;
  /** camera heading, degrees (0 = view 0) */
  heading: number;
  theme: Theme;
  night: boolean;
  quality: Quality;
  /** the detail level being shown, and how many tiles still wait for it */
  detail: Detail;
  pending: number;
  fps: number;
  lit: number;
  floors: number;
  vehicles: number;
  /** the light of each direction and its countdown */
  signals: Pick<Signals, 'x' | 'y' | 'xLeft' | 'yLeft'>;
  /** the quality was stepped down by itself, to this level */
  lowered: string | null;
  lights: LightSettings;
  stats: Layer['stats'];
  /** id of the standalone showcase diorama currently displayed, or null for the full city map */
  showcase: string | null;
  /** street name display mode: 'pin' (callout pole), 'map' (along street like Google Maps/OSM), or 'off' */
  streetLabels: StreetLabelMode;
  /** place/building/park/monument/heritage info display mode: 'off', 'popup', or 'label' */
  placeInfo: PlaceInfoMode;
}

const ISO_EL = Math.asin(1 / Math.sqrt(3));
const FRUSTUM = 300;   // metres tall at zoom 1
const CELL_R = 46;     // half the diagonal of a 64 m cell
const azOf = (k: number) => Math.PI / 4 - (k * Math.PI) / 2;
const KINDS: VehicleKind[] = ['bike', 'sedan', 'hatch', 'taxi', 'van'];

const SURFACE_TOKEN: Record<Surface, string> = {
  ground: '--body', wall: '--body', roof: '--deck', glass: '--glass', road: '--recess', walk: '--deck',
  marking: '--line', grass: '--panel', water: '--glass', pitch: '--recess', plaza: '--deck',
  metal: '--deck', awning: '--deck', plant: '--panel',
};

const SHELL_VERT = `uniform vec2 res;
  void main() {
    vec4 p4 = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p4 = instanceMatrix * p4; n = mat3(instanceMatrix) * n;
    #endif
    vec4 p = projectionMatrix * modelViewMatrix * p4;
    vec4 d4 = projectionMatrix * vec4(normalize(normalMatrix * n), 0.0);
    vec2 d = length(d4.xy) > 1e-5 ? normalize(d4.xy) : vec2(0.0);
    p.xy += d * 2.0 / res * p.w;
    gl_Position = p;
  }`;

interface TileState { tile: Tile; layers: Map<Detail, { layer: Layer; group: THREE.Group | null }>; shown: Detail | -1 }
interface CellState { bucket: FurnitureBucket; cell: FurnitureCell | null; groups: { poles: THREE.Group; fixtures: THREE.Group; trees: THREE.Group; simple: THREE.Group } | null; wires: LineSegments2 | null; pulses: LineSegments2 | null; pools: THREE.Mesh | null }
interface Fleet { model: VehicleModel; meshes: THREE.InstancedMesh[]; list: Vehicle[] }
interface Train { track: Track; offset: number; cars: THREE.Group[]; doors: THREE.MeshBasicMaterial; stopping: boolean }

export class CityView {
  readonly base: Layer;
  readonly tiles: TileState[];
  readonly cells: CellState[];
  readonly floors: string[];
  readonly lanes: Lane[];
  readonly tracks: Track[];
  readonly showcases: ShowcaseItem[];
  readonly streetCatalog: StreetEntry[];
  readonly placeCatalog: PlaceCatalog;
  private readonly streetById = new Map<string, StreetEntry>();
  private readonly panBounds: { x0: number; y0: number; x1: number; y1: number };
  private readonly showcaseCache = new Map<string, BuiltShowcase>();
  private activeShowcase: { built: BuiltShowcase; beacons: THREE.Mesh[]; doors: THREE.MeshBasicMaterial } | null = null;
  private savedMapCam: { target: THREE.Vector3; zoom: number } | null = null;
  private trains: Train[] = [];
  private vehicles: Vehicle[] = [];
  /** every layer built so far: a lamp is painted wherever it appears */
  private readonly layers = new Set<Layer>();
  private snap: Snapshot;
  private readonly listeners = new Set<() => void>();
  private lit = new Set<string>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private labelLayer: HTMLDivElement | null = null;
  private labelNodes = new Map<string, HTMLButtonElement>();
  private labelItems = new Map<string, ProjectedStreetLabel>();
  private labelSig = '';
  private lastLabelSelect = 0;
  private placeLayer: HTMLDivElement | null = null;
  private placeNodes = new Map<string, HTMLButtonElement>();
  private placeItems = new Map<string, { entry: PlaceEntry; x: number; y: number }>();
  private placeSig = '';
  private lastPlaceSelect = 0;
  private lastDistStep = 0;
  private hoveredPinKey: string | null = null;
  private hoverBanner: HTMLDivElement | null = null;
  private popupCard: HTMLDivElement | null = null;
  private activePopup: { entry: PlaceEntry; floor?: string } | null = null;
  private hoveredPlaceId: string | null = null;
  private mounted: {
    host: HTMLElement; renderer: THREE.WebGLRenderer; scene: THREE.Scene; mapGroup: THREE.Group; showcaseGroup: THREE.Group;
    camera: THREE.OrthographicCamera; controls: OrbitControls; composer: EffectComposer; bloom: UnrealBloomPass;
    beacons: THREE.Mesh[]; fleets: Map<VehicleKind, Fleet>; vehicleLines: LineSegments2; stop: () => void;
  } | null = null;
  private turn: { a0: number; a1: number; e0: number; e1: number; t0: number } | null = null;
  private sim = { t: 0, prev: null as Signals | null, phase: -1, slow: 0 };
  private readonly mats = {
    surface: new Map<Surface, THREE.MeshBasicMaterial>(),
    shell: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, res: { value: new THREE.Vector2(1, 1) } },
      vertexShader: SHELL_VERT, fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
      side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 24,
    }),
    crease: new LineMaterial({ linewidth: 1, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    // window outlines are coloured per segment (dark, or the accent when lit): the material stays white
    detail: new LineMaterial({ linewidth: 1, vertexColors: true, color: 0xffffff, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    wire: new LineMaterial({ linewidth: 1, transparent: true }),
    pulse: new LineMaterial({ linewidth: 2, dashed: true, dashSize: 0.8, gapSize: 23, transparent: true }),
    windows: new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    vehicle: Object.fromEntries((['body', 'top', 'glass', 'wheel', 'head', 'tail', 'sign'] as VehiclePart[]).map(p => { const onTop = p === 'glass' || p === 'head' || p === 'tail' || p === 'sign'; return [p, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: onTop ? -1 : 1, polygonOffsetUnits: onTop ? -1 : 1 })]; })) as Record<Exclude<VehiclePart, 'beam'>, THREE.MeshBasicMaterial>,
    // a pool of light: the accent fading from the middle out, added onto the ground (iso-glow's light pools)
    pool: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, opacity: { value: 0.16 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 color; uniform float opacity; varying vec2 vUv;
        void main() { float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); a *= a; gl_FragColor = vec4(color * a * opacity, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }),
    beam: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    train: Object.fromEntries((['body', 'top', 'glass', 'win', 'head'] as const).map(p => { const lit = p !== 'body' && p !== 'top'; return [p, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: lit ? -1 : 1, polygonOffsetUnits: lit ? -1 : 1 })]; })) as Record<'body' | 'top' | 'glass' | 'win' | 'head', THREE.MeshBasicMaterial>,
    beaconOn: new THREE.MeshBasicMaterial(),
    beaconOff: new THREE.MeshBasicMaterial(),
  };
  /** window fill and outline per shade (iso-glow: lit = accent with an accent-hi outline, hi =
      accent-hi, dim = lit at 45 % over the wall, off = dark) */
  /** the vehicles' outline: a copy of the shared one, so it can fade without fading the buildings' */
  private readonly vehicleShell = (() => {
    const m = this.mats.shell.clone();
    m.uniforms.res = this.mats.shell.uniforms.res!;   // one resolution for both
    return m;
  })();
  private farF = 0;
  private carModels: CarModel[] = [];
  private colors: Record<Shade, THREE.Color> = { off: new THREE.Color(), on: new THREE.Color(), hi: new THREE.Color(), dim: new THREE.Color() };
  private outline: Record<Shade, THREE.Color> = { off: new THREE.Color(), on: new THREE.Color(), hi: new THREE.Color(), dim: new THREE.Color() };

  constructor(readonly city: City) {
    this.base = buildBase(city);
    this.layers.add(this.base);
    this.floors = cityFloors(city);
    this.tiles = tilesOf(city).map(tile => ({ tile, layers: new Map(), shown: -1 as const }));
    const net = roadNetwork(city);
    this.cells = furnitureBuckets(streetFurniture(city, net)).map(bucket => ({ bucket, cell: null, groups: null, wires: null, pulses: null, pools: null }));
    this.lanes = trafficLanes(net);
    this.tracks = metroTracks(city);
    this.showcases = showcasesOf(city);
    this.streetCatalog = buildStreetCatalog(city);
    for (const s of this.streetCatalog) this.streetById.set(s.id, s);
    this.placeCatalog = buildPlaceCatalog(city, new Set(this.showcases.map(s => s.id)));
    const b = city.bounds;
    let x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    for (const st of city.stations) {
      if (st.at[0] < x0) x0 = st.at[0];
      if (st.at[1] < y0) y0 = st.at[1];
      if (st.at[0] > x1) x1 = st.at[0];
      if (st.at[1] > y1) y1 = st.at[1];
    }
    this.panBounds = { x0, y0, x1, y1 };
    for (const s of Object.keys(SURFACE_TOKEN) as Surface[]) {
      this.mats.surface.set(s, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    }
    // day (the light theme) by default (user, 2026-10-21); night (the dark theme and the lamps) is
    // one switch, remembered
    let theme: Theme = 'light';
    try { if (localStorage.getItem('city3d-theme') === 'dark') theme = 'dark'; } catch { /* default */ }
    let streetLabels: StreetLabelMode = 'pin';
    try {
      const savedLbl = localStorage.getItem('city3d-street-labels') as StreetLabelMode | null;
      if (savedLbl && STREET_LABEL_MODES.includes(savedLbl)) streetLabels = savedLbl;
    } catch { /* default */ }
    let placeInfo: PlaceInfoMode = 'popup';
    try {
      const savedPlace = localStorage.getItem('city3d-place-info') as PlaceInfoMode | null;
      if (savedPlace && PLACE_INFO_MODES.includes(savedPlace)) placeInfo = savedPlace;
    } catch { /* default */ }
    const quality = loadQuality();
    this.vehicles = spawnTraffic(this.lanes, quality.traffic);
    const sig = signalsAt(0);
    this.snap = {
      mode: '2d', view: 0, heading: 0, theme, night: theme === 'dark', quality, detail: 1, pending: 0, fps: 0, lit: 0, floors: this.floors.length,
      vehicles: this.vehicles.length, signals: { x: sig.x, y: sig.y, xLeft: sig.xLeft, yLeft: sig.yLeft }, lowered: null, lights: loadLights(), stats: this.base.stats,
      showcase: null, streetLabels, placeInfo,
    };
  }

  // ---------- store ----------
  readonly getSnapshot = () => this.snap;
  readonly subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(p: Partial<Snapshot>) { this.snap = { ...this.snap, ...p }; this.listeners.forEach(f => f()); }

  private interacting = false;
  private interactCooldown = 0;

  // ---------- lifecycle ----------
  mount(host: HTMLElement) {
    if (this.mounted) this.unmount();
    const q = this.snap.quality;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    const onLost = (e: Event) => e.preventDefault();   // let the browser restore the context; three re-uploads everything
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    const mapGroup = new THREE.Group();
    const showcaseGroup = new THREE.Group();
    showcaseGroup.visible = false;
    scene.add(mapGroup, showcaseGroup);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 7000);
    // the view opens on the area's origin (the crossroads), not the middle of the whole region
    const target = new THREE.Vector3(0, 0, 0);
    camera.zoom = 1.4;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.18;
    controls.panSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.minZoom = 0.14; controls.maxZoom = 40;
    controls.minPolarAngle = 0.05; controls.maxPolarAngle = 1.43;
    // map-style (ADR-043): left drag moves over the ground, right drag (or shift + drag) turns and
    // tilts, the wheel zooms toward the pointer; one finger moves, two pinch+pan in 2D or pinch+turn in 3D
    controls.screenSpacePanning = false;
    controls.zoomToCursor = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: this.snap.mode === '3d' ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN };
    controls.rotateSpeed = 0.6;
    const onControlStart = () => { this.interacting = true; this.interactCooldown = performance.now() + 180; this.hideHoverBanner(); this.clearHoveredPin(); };
    const onControlChange = () => { if (this.interacting) this.interactCooldown = performance.now() + 140; };
    const onControlEnd = () => { this.interacting = false; this.interactCooldown = performance.now() + 140; };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);
    controls.addEventListener('end', onControlEnd);
    this.place(camera, controls, azOf(this.snap.view), ISO_EL);

    const baseGroup = this.group(this.base);
    mapGroup.add(baseGroup);
    // a remount starts from fresh meshes; the built layers are kept
    for (const t of this.tiles) { for (const v of t.layers.values()) v.group = null; t.shown = -1; }
    for (const c of this.cells) { c.groups = null; c.wires = null; c.pulses = null; c.pools = null; }
    const beacons = beaconsOf(this.city).map(p => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff); b.position.copy(p); mapGroup.add(b); return b; });
    const fleets = new Map<VehicleKind, Fleet>();
    for (const kind of KINDS) {
      const fleet: Fleet = { model: vehicleModel(kind), meshes: [], list: this.vehicles.filter(v => v.kind === kind) };
      this.fleetMeshes(fleet, mapGroup);
      fleets.set(kind, fleet);
    }
    this.trains = this.tracks.flatMap(track => {
      const count = trainCount(track);
      return Array.from({ length: count }, (_, k) => this.trainMeshes(track, (k * track.period) / count, mapGroup));
    });
    const vehicleLines = new LineSegments2(this.linesFor(fleets), this.mats.crease);
    vehicleLines.frustumCulled = false;
    vehicleLines.userData.tier = 'creases';
    mapGroup.add(vehicleLines);

    const composer = new EffectComposer(renderer);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.35, 0.5);

    // double click / double tap: open popup info if double-clicked on a callout pin, otherwise fly to spot on ground
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
    const flyToClient = (clientX: number, clientY: number) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(ground, hitPt)) this.flyTo([hitPt.x, hitPt.z], false);
    };
    const onDbl = (e: MouseEvent) => {
      const pinHit = this.hitLabelAtClient(e.clientX, e.clientY);
      if (pinHit) {
        if (pinHit.kind === 'place') {
          this.openPopup(pinHit.entry);
          this.flyTo(pinHit.entry.ground, false);
        } else {
          this.openStreetPopup(pinHit.street, pinHit.item.world);
        }
        return;
      }
      flyToClient(e.clientX, e.clientY);
    };

    // Helper to raycast against buildings, stations, parks, lakes, and monuments
    const pickAtClient = (clientX: number, clientY: number): { owner: string; floor?: string; point: THREE.Vector3 } | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const pickable: THREE.Object3D[] = [];
      if (this.snap.showcase) {
        showcaseGroup.traverse(o => { if (o.userData.surface) pickable.push(o); });
      } else {
        for (const t of this.tiles) {
          const g = t.shown >= 0 ? t.layers.get(t.shown as Detail)?.group : null;
          if (g?.visible) for (const o of g.children) if (o.userData.surface) pickable.push(o);
        }
        for (const o of baseGroup.children) if (o.userData.surface) pickable.push(o);
      }
      const hits = ray.intersectObjects(pickable, false);
      for (const hit of hits) {
        if (hit.faceIndex == null) continue;
        const layer = hit.object.userData.layer as Layer;
        const owner = layer.ownerOf(hit.object.userData.surface as Surface, hit.faceIndex);
        if (owner) {
          const floor = layer.floorAt(owner, hit.point);
          return { owner, ...(floor ? { floor } : {}), point: hit.point };
        }
      }
      return null;
    };

    // Mobile two-finger gesture enhancements: allow two-finger twist rotation even when starting in 2D mode,
    // and disable zoomToCursor on touch or low camera angles so pinch-zoom never slides the target away.
    let down: [number, number] | null = null;
    let lastTap: { t: number; x: number; y: number } | null = null;
    let touchGesture: { ang0: number; dist0: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      controls.zoomToCursor = false;
      if (e.touches.length === 2) {
        const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
        const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
        touchGesture = { ang0: Math.atan2(dy, dx), dist0: Math.hypot(dx, dy) };
      } else {
        touchGesture = null;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchGesture && this.snap.mode === '2d') {
        const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
        const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
        let dAng = Math.atan2(dy, dx) - touchGesture.ang0;
        while (dAng > Math.PI) dAng -= 2 * Math.PI;
        while (dAng < -Math.PI) dAng += 2 * Math.PI;
        if (Math.abs(dAng) > 0.24) {
          // User is twisting two fingers to rotate -> seamlessly unlock 3D orbit rotation
          this.setMode('3d');
          touchGesture = null;
        }
      }
    };
    const onTouchEnd = () => { touchGesture = null; };
    const onWheel = () => {
      // At very low camera angles, zoomToCursor rays graze the ground and slide target far away
      controls.zoomToCursor = this.elevation() >= 0.34;
    };
    const onDown = (e: PointerEvent) => {
      controls.zoomToCursor = e.pointerType === 'mouse' && this.elevation() >= 0.34;
      down = [e.clientX, e.clientY];
    };

    let lastHoverTime = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || this.interacting || (e.buttons & 7) !== 0) return;
      if (this.snap.showcase) {
        this.hideHoverBanner();
        this.clearHoveredPin();
        return;
      }
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const pinHit = this.hitLabelAtClient(e.clientX, e.clientY);
      if (pinHit) {
        this.setHoveredPin(pinHit.key);
        renderer.domElement.style.cursor = 'pointer';
        if (pinHit.kind === 'place' && this.snap.placeInfo !== 'off') {
          const r = host.getBoundingClientRect();
          this.showHoverBanner(pinHit.entry, e.clientX - r.left, e.clientY - r.top);
        } else {
          this.hideHoverBanner();
        }
        return;
      }
      this.clearHoveredPin();

      if (this.snap.placeInfo === 'off') {
        this.hideHoverBanner();
        renderer.domElement.style.cursor = '';
        return;
      }
      const picked = pickAtClient(e.clientX, e.clientY);
      const entry = picked ? this.placeCatalog.byId.get(picked.owner) : undefined;
      if (!entry) {
        this.hideHoverBanner();
        renderer.domElement.style.cursor = '';
        return;
      }
      renderer.domElement.style.cursor = 'pointer';
      const r = host.getBoundingClientRect();
      this.showHoverBanner(entry, e.clientX - r.left, e.clientY - r.top, picked?.floor);
    };
    const onLeave = () => {
      this.hideHoverBanner();
      this.clearHoveredPin();
      renderer.domElement.style.cursor = '';
    };

    const onUp = (e: PointerEvent) => {
      const maxMove = e.pointerType === 'touch' ? 12 : 5;
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > maxMove) return;
      const pinHit = this.hitLabelAtClient(e.clientX, e.clientY);
      if (e.pointerType === 'touch') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
          lastTap = null;
          if (pinHit) {
            if (pinHit.kind === 'place') this.openPopup(pinHit.entry);
            else this.openStreetPopup(pinHit.street, pinHit.item.world);
          } else {
            flyToClient(e.clientX, e.clientY);
          }
          return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      if (pinHit) {
        if (pinHit.kind === 'place') {
          this.openPopup(pinHit.entry);
        } else {
          this.flyTo(pinHit.item.world, false);
        }
        return;
      }
      const picked = pickAtClient(e.clientX, e.clientY);
      if (!picked) {
        if (this.activePopup) this.closePopup();
        return;
      }
      if (!this.snap.showcase && this.snap.placeInfo !== 'off' && !e.shiftKey) {
        const entry = this.placeCatalog.byId.get(picked.owner);
        if (entry) {
          this.openPopup(entry, picked.floor);
          return;
        }
      }
      if (picked.floor) this.setLamp(picked.floor, !this.lit.has(picked.floor));
    };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('dblclick', onDbl);

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight, a = w / Math.max(1, h);
      renderer.setSize(w, h);
      this.mounted?.composer.setSize(w, h);
      camera.left = (-FRUSTUM * a) / 2; camera.right = (FRUSTUM * a) / 2; camera.top = FRUSTUM / 2; camera.bottom = -FRUSTUM / 2;
      camera.updateProjectionMatrix();
      this.resolution();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0, frames = 0, t0 = performance.now(), last = t0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.animate(now);
      this.keysMove(dt);
      this.syncLowCamera();
      controls.update();
      this.keepInside();
      this.zoomFade();
      const blink = this.snap.night && Math.floor(now / 700) % 2 === 0;
      if (this.snap.showcase) {
        if (this.activeShowcase) for (const b of this.activeShowcase.beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
      } else {
        this.detailStep();
        if (!this.interacting || now - this.lastDistStep > 120) {
          this.lastDistStep = now;
          this.distanceStep();
        }
        this.trafficStep(dt);
        for (const b of beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
        this.mats.pulse.dashOffset -= dt * 9;
      }
      this.streetLabelsStep();
      this.placeInfoStep();
      if (this.mounted) {
        if (this.mounted.bloom.enabled) this.mounted.composer.render();
        else this.mounted.renderer.render(scene, camera);
      }
      frames++;
      if (now - t0 > 500) {
        const fps = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now;
        const az = Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);
        const heading = Math.round((((((Math.PI / 4 - az) * 180) / Math.PI) % 360) + 360) % 360);
        const view = (((Math.round(heading / 90) % 4) + 4) % 4) as Snapshot['view'];
        if (fps !== this.snap.fps || heading !== this.snap.heading || view !== this.snap.view) this.update({ fps, heading, view });
        this.autoQuality(fps);
      }
    };

    const labelLayer = document.createElement('div');
    labelLayer.className = 'street-labels';
    host.appendChild(labelLayer);
    this.labelLayer = labelLayer;
    this.labelNodes.clear();
    this.labelItems.clear();
    this.labelSig = '';

    const placeLayer = document.createElement('div');
    placeLayer.className = 'place-labels';
    host.appendChild(placeLayer);
    this.placeLayer = placeLayer;
    this.placeNodes.clear();
    this.placeItems.clear();
    this.placeSig = '';

    const hoverBanner = document.createElement('div');
    hoverBanner.className = 'place-hover-banner';
    hoverBanner.style.display = 'none';
    host.appendChild(hoverBanner);
    this.hoverBanner = hoverBanner;

    const popupCard = document.createElement('div');
    popupCard.className = 'place-popup';
    popupCard.style.display = 'none';
    popupCard.addEventListener('pointerdown', e => e.stopPropagation());
    popupCard.addEventListener('pointerup', e => e.stopPropagation());
    popupCard.addEventListener('wheel', e => e.stopPropagation());
    host.appendChild(popupCard);
    this.popupCard = popupCard;

    this.mounted = {
      host, renderer, scene, mapGroup, showcaseGroup, camera, controls, composer, bloom, beacons, fleets, vehicleLines,
      stop: () => {
        cancelAnimationFrame(raf); ro.disconnect();
        controls.removeEventListener('start', onControlStart);
        controls.removeEventListener('change', onControlChange);
        controls.removeEventListener('end', onControlEnd);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('touchmove', onTouchMove);
        renderer.domElement.removeEventListener('touchend', onTouchEnd);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerleave', onLeave);
        renderer.domElement.removeEventListener('pointerup', onUp);
        renderer.domElement.removeEventListener('dblclick', onDbl);
        renderer.domElement.removeEventListener('webglcontextlost', onLost);
      },
    };
    this.applyMode(this.snap.mode, false);
    this.applyQuality(this.snap.quality);
    this.applyTheme(this.snap.theme);
    resize();
    // nearby tiles at L1 right away; distant tiles stream in on demand or during idle frames
    const first = Math.min(1, this.wantedDetail()) as Detail;
    for (const t of this.tiles) if (this.nearTile(t)) this.show(t, this.ensure(t, first));
    this.houseLights(false);
    this.streetLamps();
    for (const st of this.city.stations) this.setLamp(stationLamp(st, 'board'), true, false);
    this.distanceStep(true);
    this.nightThings();
    if (this.snap.showcase) this.mountShowcase(this.snap.showcase);
    else this.update({ stats: this.shownStats() });
    this.streetLabelsStep(true);
    this.placeInfoStep(true);
    raf = requestAnimationFrame(tick);
  }

  unmount() {
    const m = this.mounted;
    if (!m) return;
    m.stop();
    this.timers.forEach(clearTimeout); this.timers = [];
    this.labelLayer?.remove();
    this.labelLayer = null;
    this.labelNodes.clear();
    this.labelItems.clear();
    this.labelSig = '';
    this.placeLayer?.remove();
    this.placeLayer = null;
    this.placeNodes.clear();
    this.placeItems.clear();
    this.placeSig = '';
    this.hoverBanner?.remove();
    this.hoverBanner = null;
    this.popupCard?.remove();
    this.popupCard = null;
    this.activePopup = null;
    m.controls.dispose(); m.composer.dispose(); m.renderer.dispose();
    m.renderer.domElement.remove();
    this.mounted = null;
  }

  // ---------- commands ----------
  setMode(mode: Mode) { this.update({ mode }); this.applyMode(mode, true); }
  toggleMode() { this.setMode(this.snap.mode === '2d' ? '3d' : '2d'); }

  /** switch between the full city map (id = null) and a standalone diorama showcase on an iso-glow base plate */
  setShowcase(id: string | null) {
    if (id === this.snap.showcase) return;
    this.hideHoverBanner();
    this.closePopup();
    const m = this.mounted;
    if (!id) {
      this.activeShowcase = null;
      if (m) {
        m.showcaseGroup.clear();
        m.showcaseGroup.visible = false;
        m.mapGroup.visible = true;
        const restore = this.savedMapCam;
        if (restore) {
          m.controls.target.copy(restore.target);
          m.camera.zoom = restore.zoom;
          m.camera.updateProjectionMatrix();
          this.place(m.camera, m.controls, this.azimuth(), this.elevation());
        }
      }
      this.update({ showcase: null, pending: 0, lit: this.countLit(), floors: this.floors.length, stats: this.shownStats() });
      this.streetLabelsStep(true);
      this.placeInfoStep(true);
      return;
    }
    if (m && !this.snap.showcase) {
      this.savedMapCam = { target: m.controls.target.clone(), zoom: m.camera.zoom };
    }
    this.mountShowcase(id);
    this.streetLabelsStep(true);
    this.placeInfoStep(true);
  }

  private mountShowcase(id: string) {
    let built = this.showcaseCache.get(id);
    if (!built) {
      const next = buildShowcase(this.city, id);
      if (!next) return;
      built = next;
      this.showcaseCache.set(id, built);
      this.layers.add(built.layer);
    }
    const m = this.mounted;
    const doors = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const beacons: THREE.Mesh[] = [];
    this.activeShowcase = { built, beacons, doors };
    if (id.startsWith('station:')) {
      for (const st of this.city.stations) this.setLamp(stationLamp(st, 'edge'), true, false);
    }
    if (m) {
      m.mapGroup.visible = false;
      m.showcaseGroup.clear();
      m.showcaseGroup.visible = true;
      m.showcaseGroup.add(this.group(built.layer));
      const poolMesh = new THREE.Mesh(built.pools, this.mats.pool);
      poolMesh.userData.night = 'pool';
      m.showcaseGroup.add(poolMesh);
      for (const p of built.beacons) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff);
        b.position.copy(p);
        m.showcaseGroup.add(b);
        beacons.push(b);
      }
      for (const c of built.cars) {
        const model: CarModel = (this.carModels[c.cab ? 1 : 0] ??= carModel(c.cab)), g = new THREE.Group();
        for (const [part, geo] of model.parts) g.add(new THREE.Mesh(geo, part === 'door' ? doors : this.mats.train[part]));
        const shell = new THREE.Mesh(model.shell, this.mats.shell); shell.userData.tier = 'silhouette';
        const lines = new LineSegments2(new LineSegmentsGeometry().setPositions(model.lines), this.mats.crease); lines.userData.tier = 'creases';
        g.add(shell, lines);
        g.position.set(c.at[0], c.at[2], c.at[1]);
        g.rotation.y = c.heading;
        m.showcaseGroup.add(g);
      }
      this.fly = null;
      m.controls.target.set(0, 0, 0);
      m.camera.zoom = built.item.zoom;
      m.camera.updateProjectionMatrix();
      this.place(m.camera, m.controls, this.azimuth(), this.elevation());
      this.tiers(m.showcaseGroup);
      this.paintLayer(built.layer);
      this.nightThings();
    }
    this.update({
      showcase: id,
      detail: 3,
      pending: 0,
      lit: this.countLit(),
      floors: built.floors.length || this.floors.length,
      stats: built.layer.stats,
    });
  }

  /** turn by 90°; in 3D, turn too, keeping the tilt */
  rotate(dir: 1 | -1) {
    if (!this.mounted) return;
    const az = this.azimuth(), k = Math.round((Math.PI / 4 - az) / (Math.PI / 2)) + dir;
    this.startTurn(azOf(k), this.snap.mode === '2d' ? ISO_EL : this.elevation());
  }

  setTheme(theme: Theme) {
    this.update({ theme });
    try { localStorage.setItem('city3d-theme', theme); } catch { /* not remembered */ }
    this.applyTheme(theme);
  }
  /** Ngày ↔ Đêm: the light theme by day, the dark theme and the lamps by night, one switch (ADR-045) */
  toggleDayNight() {
    const night = !this.snap.night;
    this.setNight(night);
    this.setTheme(night ? 'dark' : 'light');
  }

  setQuality(q: Quality, lowered: string | null = null) {
    const traffic = q.traffic !== this.snap.quality.traffic;
    this.update({ quality: q, lowered });
    saveQuality(q);
    if (traffic) this.respawn();
    this.applyQuality(q);
  }

  setStreetLabels(streetLabels: StreetLabelMode) {
    if (streetLabels === this.snap.streetLabels) return;
    this.update({ streetLabels });
    try { localStorage.setItem('city3d-street-labels', streetLabels); } catch { /* not remembered */ }
    this.streetLabelsStep(true);
  }

  cycleStreetLabels() {
    const idx = STREET_LABEL_MODES.indexOf(this.snap.streetLabels);
    const next = STREET_LABEL_MODES[(idx + 1) % STREET_LABEL_MODES.length]!;
    this.setStreetLabels(next);
  }

  setPlaceInfo(placeInfo: PlaceInfoMode) {
    if (placeInfo === this.snap.placeInfo) return;
    this.update({ placeInfo });
    try { localStorage.setItem('city3d-place-info', placeInfo); } catch { /* not remembered */ }
    if (placeInfo === 'off') {
      this.hideHoverBanner();
      this.closePopup();
    }
    this.placeInfoStep(true);
  }

  cyclePlaceInfo() {
    const idx = PLACE_INFO_MODES.indexOf(this.snap.placeInfo);
    const next = PLACE_INFO_MODES[(idx + 1) % PLACE_INFO_MODES.length]!;
    this.setPlaceInfo(next);
  }

  private streetLabelsStep(force = false) {
    const m = this.mounted, layer = this.labelLayer;
    if (!m || !layer) return;
    const mode = this.snap.streetLabels;
    if (this.snap.showcase || mode === 'off') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.labelNodes.clear();
        this.labelItems.clear();
        this.labelSig = 'off';
      }
      return;
    }

    const w = m.host.clientWidth, h = m.host.clientHeight;
    const c = m.controls.target, cp = m.camera.position;
    const sig = `${mode}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${c.x.toFixed(1)},${c.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}`;
    if (!force && sig === this.labelSig) return;
    this.labelSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.labelNodes.clear();
      this.labelItems.clear();
      this.lastLabelSelect = 0;
    }

    const tmp = new THREE.Vector3();
    const project = (world: [number, number, number]) => {
      tmp.set(world[0], world[2], world[1]).project(m.camera);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    const now = performance.now();
    // Fast path while actively dragging/panning: just re-project existing DOM nodes without collision/DOM churn
    if (this.interacting && !force && this.labelItems.size > 0 && now - this.lastLabelSelect < 140) {
      for (const [key, item] of this.labelItems) {
        const node = this.labelNodes.get(key);
        if (!node) continue;
        const scr = project([item.world[0], item.world[1], 0.4]);
        item.x = scr.x;
        item.y = scr.y;
        if (mode === 'pin') {
          node.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0)`;
        } else {
          node.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${item.angleDeg}deg)`;
        }
      }
      return;
    }
    this.lastLabelSelect = now;

    const visible = selectVisibleStreetLabels(
      this.streetCatalog,
      mode,
      this.pxPerMetre(),
      w,
      h,
      [c.x, c.z],
      project,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.id}`;
      keepIds.add(key);
      this.labelItems.set(key, item);
      let btn = this.labelNodes.get(key);
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.tier = String(item.tier);

        if (mode === 'pin') {
          btn.className = 'street-pin';
          btn.style.setProperty('--stem', `${item.stemHeightPx}px`);
          btn.setAttribute('aria-label', item.info ? `${item.name} — ${item.info}` : item.name);

          const card = document.createElement('span');
          card.className = 'pin-card';
          const title = document.createElement('b');
          title.className = 'pin-title';
          title.textContent = item.shortName;
          card.appendChild(title);
          if (item.info) {
            const meta = document.createElement('span');
            meta.className = 'pin-meta';
            meta.textContent = item.info;
            card.appendChild(meta);
          }

          const stem = document.createElement('i');
          stem.className = 'pin-stem';

          const base = document.createElement('i');
          base.className = 'pin-base';
          for (const cls of ['w1', 'w2', 'w3']) {
            const wave = document.createElement('u');
            wave.className = `pin-wave ${cls}`;
            base.appendChild(wave);
          }
          const dot = document.createElement('s');
          dot.className = 'pin-dot';
          base.appendChild(dot);

          btn.append(card, stem, base);
        } else {
          btn.className = 'street-map-label';
          btn.title = item.info ? `${item.name} · ${item.info}` : item.name;
          const txt = document.createElement('span');
          txt.className = 'map-label-text';
          txt.textContent = item.name;
          btn.appendChild(txt);
          if (item.info) {
            const meta = document.createElement('em');
            meta.className = 'map-label-meta';
            meta.textContent = item.info;
            btn.appendChild(meta);
          }
        }

        layer.appendChild(btn);
        this.labelNodes.set(key, btn);
      }

      if (mode === 'pin') {
        btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0)`;
      } else {
        btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${item.angleDeg}deg)`;
      }
    }

    for (const [key, node] of this.labelNodes) {
      if (!keepIds.has(key)) {
        node.remove();
        this.labelNodes.delete(key);
        this.labelItems.delete(key);
        if (this.hoveredPinKey === key) this.hoveredPinKey = null;
      }
    }
  }

  private placeInfoStep(force = false) {
    const m = this.mounted, layer = this.placeLayer, popupEl = this.popupCard;
    if (!m || !layer) return;
    const mode = this.snap.placeInfo;

    const w = m.host.clientWidth, h = m.host.clientHeight;
    const tmp = new THREE.Vector3();
    const project = (world: [number, number, number]) => {
      tmp.set(world[0], world[2], world[1]).project(m.camera);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    // Update anchored popup card position if open
    if (popupEl && this.activePopup && !this.snap.showcase) {
      const entry = this.activePopup.entry;
      const scr = project([entry.world[0], entry.world[1], entry.world[2] + 2.5]);
      if (w <= 640) {
        popupEl.dataset.dock = 'mobile';
        popupEl.style.transform = '';
      } else {
        popupEl.dataset.dock = 'anchor';
        const px = Math.max(170, Math.min(w - 170, scr.x));
        const py = Math.max(96, Math.min(h - 46, scr.y));
        popupEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    }

    if (this.snap.showcase || mode === 'off') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.placeNodes.clear();
        this.placeItems.clear();
        this.placeSig = 'off';
      }
      return;
    }

    const c = m.controls.target, cp = m.camera.position;
    const sig = `${mode}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}|${this.activePopup?.entry.id ?? ''}`;
    if (!force && sig === this.placeSig) return;
    this.placeSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.placeNodes.clear();
      this.placeItems.clear();
      this.lastPlaceSelect = 0;
    }

    const now = performance.now();
    // Fast path while actively dragging/panning: just re-project existing DOM nodes
    if (this.interacting && !force && this.placeItems.size > 0 && now - this.lastPlaceSelect < 140) {
      for (const [key, item] of this.placeItems) {
        const node = this.placeNodes.get(key);
        if (!node) continue;
        const scr = project(item.entry.world);
        item.x = scr.x;
        item.y = scr.y;
        node.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      return;
    }
    this.lastPlaceSelect = now;

    const visible = selectVisiblePlaceLabels(
      this.placeCatalog,
      mode,
      this.pxPerMetre(),
      w,
      h,
      [c.x, c.z],
      project,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.entry.id}`;
      keepIds.add(key);
      this.placeItems.set(key, { entry: item.entry, x: item.x, y: item.y });
      let btn = this.placeNodes.get(key);
      if (!btn) {
        const entry = item.entry;
        btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.category = entry.category;
        btn.dataset.tier = String(entry.tier);

        if (mode === 'label') {
          btn.className = 'place-label-card';
          const head = document.createElement('span');
          head.className = 'place-label-head';
          const badge = document.createElement('i');
          badge.className = 'place-label-badge';
          badge.textContent = entry.badge;
          const title = document.createElement('b');
          title.className = 'place-label-name';
          title.textContent = entry.name;
          head.append(badge, title);

          const addr = document.createElement('span');
          addr.className = 'place-label-addr';
          addr.textContent = entry.address;

          const pointer = document.createElement('s');
          pointer.className = 'place-label-stem';

          btn.append(head, addr, pointer);
        } else {
          btn.className = 'place-marker-pill';
          const dot = document.createElement('i');
          dot.className = 'place-marker-dot';
          const txt = document.createElement('span');
          txt.className = 'place-marker-text';
          txt.textContent = entry.name;
          btn.append(dot, txt);
        }

        layer.appendChild(btn);
        this.placeNodes.set(key, btn);
      }

      btn.classList.toggle('active', this.activePopup?.entry.id === item.entry.id);
      btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }

    for (const [key, node] of this.placeNodes) {
      if (!keepIds.has(key)) {
        node.remove();
        this.placeNodes.delete(key);
        this.placeItems.delete(key);
      }
    }
  }

  /** Hit-test visible place or street pins at client coordinates without blocking map drag (`pointer-events: none`) */
  private hitLabelAtClient(clientX: number, clientY: number):
    | { kind: 'place'; key: string; entry: PlaceEntry; x: number; y: number }
    | { kind: 'street'; key: string; street: StreetEntry; item: ProjectedStreetLabel; x: number; y: number }
    | null {
    const m = this.mounted;
    if (!m || this.snap.showcase) return null;
    const rect = m.host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 1. Place labels / pills first (higher z-index)
    if (this.snap.placeInfo !== 'off') {
      const isCard = this.snap.placeInfo === 'label';
      for (const [key, item] of this.placeItems) {
        const halfW = isCard ? 78 : 54;
        const h = isCard ? 46 : 26;
        if (x >= item.x - halfW && x <= item.x + halfW && y >= item.y - h && y <= item.y + 4) {
          return { kind: 'place', key, entry: item.entry, x: item.x, y: item.y - h };
        }
      }
    }

    // 2. Street callout pins / map labels
    if (this.snap.streetLabels !== 'off') {
      const isPin = this.snap.streetLabels === 'pin';
      for (const [key, item] of this.labelItems) {
        if (isPin) {
          const totalH = item.stemHeightPx + 32;
          const halfW = Math.max(36, Math.min(72, item.shortName.length * 4 + 16));
          const hitCard = x >= item.x - halfW && x <= item.x + halfW && y >= item.y - totalH - 6 && y <= item.y - item.stemHeightPx + 8;
          const hitBase = Math.hypot(x - item.x, y - item.y) <= 14;
          if (hitCard || hitBase) {
            const street = this.streetById.get(item.id);
            if (street) return { kind: 'street', key, street, item, x: item.x, y: item.y - totalH };
          }
        } else {
          const halfW = Math.max(36, Math.min(75, item.name.length * 3.8 + 14));
          if (x >= item.x - halfW && x <= item.x + halfW && y >= item.y - 14 && y <= item.y + 14) {
            const street = this.streetById.get(item.id);
            if (street) return { kind: 'street', key, street, item, x: item.x, y: item.y - 14 };
          }
        }
      }
    }

    return null;
  }

  private setHoveredPin(key: string | null) {
    if (this.hoveredPinKey === key) return;
    if (this.hoveredPinKey) {
      this.labelNodes.get(this.hoveredPinKey)?.classList.remove('is-hover');
    }
    this.hoveredPinKey = key;
    if (key) {
      this.labelNodes.get(key)?.classList.add('is-hover');
    }
  }

  private clearHoveredPin() {
    this.setHoveredPin(null);
  }

  /** Synthesize a rich PlaceEntry popup for a street when double-clicked on a callout pin */
  private openStreetPopup(street: StreetEntry, world: [number, number]) {
    const tierDesc =
      street.tier === 1
        ? 'Trục giao thông huyết mạch đô thị kết nối liên quận Đống Đa – Ba Đình.'
        : street.tier === 2
          ? 'Tuyến phố chính tập trung thương mại, dịch vụ, cơ quan và khu dân cư sầm uất.'
          : 'Tuyến phố / ngõ nội khu kết nối các tổ dân phố và khu tập thể.';
    const lenM = Math.round(street.totalLength);
    const entry: PlaceEntry = {
      id: `street:${street.id}`,
      name: street.name,
      category: 'building',
      categoryLabel: street.tier === 1 ? 'Trục đường lớn' : street.tier === 2 ? 'Tuyến phố chính' : 'Tuyến phố nội khu',
      badge: 'ĐG',
      address: `${street.name}, Hà Nội`,
      description: tierDesc,
      metrics: [
        { label: 'Chiều dài tuyến', value: lenM >= 1000 ? `${(lenM / 1000).toFixed(2)} km` : `${lenM} m` },
        ...(street.lanes ? [{ label: 'Quy mô làn', value: `${street.lanes} làn xe` }] : []),
        { label: 'Bề rộng lòng đường', value: `${street.width} m` },
        { label: 'Cấp đường', value: street.tier === 1 ? 'Cấp 1 (Trục chính)' : street.tier === 2 ? 'Cấp 2 (Phố chính)' : 'Cấp 3 (Nội khu)' },
      ],
      world: [world[0], world[1], 4],
      ground: world,
      tier: street.tier,
      minPxPerMetre: street.minPxPerMetre,
      source: 'osm',
    };
    this.openPopup(entry);
  }

  private showHoverBanner(entry: PlaceEntry, x: number, y: number, floor?: string) {
    const banner = this.hoverBanner, m = this.mounted;
    if (!banner || !m) return;
    if (this.activePopup?.entry.id === entry.id) {
      this.hideHoverBanner();
      return;
    }
    const floorNum = floor ? Number(floor.split('#')[1]) + 1 : null;
    const floorTag = floorNum && Number.isFinite(floorNum) ? ` · Tầng ${floorNum}` : '';
    const sig = `${entry.id}|${floorTag}`;
    if (this.hoveredPlaceId !== sig) {
      this.hoveredPlaceId = sig;
      banner.dataset.category = entry.category;
      banner.replaceChildren();
      const top = document.createElement('div');
      top.className = 'hover-banner-top';
      const badge = document.createElement('span');
      badge.className = 'hover-banner-badge';
      badge.textContent = entry.categoryLabel;
      const hint = document.createElement('span');
      hint.className = 'hover-banner-hint';
      hint.textContent = 'Click xem chi tiết';
      top.append(badge, hint);

      const title = document.createElement('strong');
      title.className = 'hover-banner-title';
      title.textContent = entry.name;

      const sub = document.createElement('span');
      sub.className = 'hover-banner-sub';
      sub.textContent = `${entry.address}${floorTag}`;

      banner.append(top, title, sub);
    }
    const w = m.host.clientWidth;
    const bx = Math.max(120, Math.min(w - 120, x));
    const by = Math.max(58, y - 14);
    banner.style.display = '';
    banner.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  private hideHoverBanner() {
    if (!this.hoverBanner) return;
    this.hoverBanner.style.display = 'none';
    this.hoveredPlaceId = null;
  }

  private openPopup(entry: PlaceEntry, floor?: string) {
    this.hideHoverBanner();
    this.activePopup = { entry, ...(floor ? { floor } : {}) };
    this.renderPopupContent();
    this.placeInfoStep(true);
  }

  closePopup() {
    this.activePopup = null;
    if (this.popupCard) {
      this.popupCard.style.display = 'none';
      this.popupCard.replaceChildren();
    }
    this.placeInfoStep(true);
  }

  private toggleBuildingLamps(buildingId: string) {
    const prefix = `${buildingId}#`;
    const list = this.floors.filter(f => f.startsWith(prefix));
    if (!list.length) return;
    const turnOn = !list.some(f => this.lit.has(f));
    for (const f of list) this.setLamp(f, turnOn, false);
    this.update({ lit: this.countLit() });
  }

  private renderPopupContent() {
    const popupEl = this.popupCard, active = this.activePopup;
    if (!popupEl || !active) return;
    const { entry, floor } = active;
    popupEl.dataset.category = entry.category;
    popupEl.replaceChildren();

    const header = document.createElement('div');
    header.className = 'popup-header';
    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'popup-badges';
    const badge = document.createElement('span');
    badge.className = 'popup-badge';
    badge.textContent = entry.categoryLabel;
    badgeWrap.appendChild(badge);
    if (floor) {
      const fNum = Number(floor.split('#')[1]) + 1;
      if (Number.isFinite(fNum)) {
        const fBadge = document.createElement('span');
        fBadge.className = 'popup-floor-badge';
        fBadge.textContent = `Tầng ${fNum}`;
        badgeWrap.appendChild(fBadge);
      }
    }
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'popup-close';
    closeBtn.title = 'Đóng (Esc)';
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    closeBtn.addEventListener('click', () => this.closePopup());
    header.append(badgeWrap, closeBtn);

    const title = document.createElement('h3');
    title.className = 'popup-title';
    title.textContent = entry.name;

    const addr = document.createElement('div');
    addr.className = 'popup-addr';
    addr.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span></span>`;
    addr.querySelector('span')!.textContent = entry.address;

    const desc = document.createElement('p');
    desc.className = 'popup-desc';
    desc.textContent = entry.description;

    const grid = document.createElement('div');
    grid.className = 'popup-metrics';
    for (const m of entry.metrics) {
      const cell = document.createElement('div');
      cell.className = 'popup-metric';
      const lbl = document.createElement('span');
      lbl.textContent = m.label;
      const val = document.createElement('strong');
      val.textContent = m.value;
      cell.append(lbl, val);
      grid.appendChild(cell);
    }

    const actions = document.createElement('div');
    actions.className = 'popup-actions';

    const flyBtn = document.createElement('button');
    flyBtn.type = 'button';
    flyBtn.className = 'popup-btn primary';
    flyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>Bay tới</span>';
    flyBtn.addEventListener('click', () => {
      this.flyTo(entry.ground, false);
    });
    actions.appendChild(flyBtn);

    if (floor) {
      const floorBtn = document.createElement('button');
      floorBtn.type = 'button';
      floorBtn.className = 'popup-btn';
      const updateFloorText = () => {
        const isLit = this.lit.has(floor);
        floorBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg><span>${isLit ? 'Tắt đèn tầng' : 'Bật đèn tầng'}</span>`;
      };
      updateFloorText();
      floorBtn.addEventListener('click', () => {
        this.setLamp(floor, !this.lit.has(floor));
        updateFloorText();
      });
      actions.appendChild(floorBtn);
    }

    if (entry.buildingId) {
      const bldId = entry.buildingId;
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'popup-btn';
      allBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg><span>Đèn cả tòa</span>';
      allBtn.addEventListener('click', () => {
        this.toggleBuildingLamps(bldId);
        if (floor) this.renderPopupContent();
      });
      actions.appendChild(allBtn);
    }

    if (entry.showcaseId) {
      const scId = entry.showcaseId;
      const scBtn = document.createElement('button');
      scBtn.type = 'button';
      scBtn.className = 'popup-btn';
      scBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span>Xem đế 3D</span>';
      scBtn.addEventListener('click', () => {
        this.setShowcase(scId);
      });
      actions.appendChild(scBtn);
    }

    popupEl.append(header, title, addr, desc, grid, actions);
    popupEl.style.display = '';
  }

  /** night: the street lamps come on, pulses run along the wires; the houses and the vehicles
      light as their settings say (auto: at night) */
  setNight(night: boolean) {
    this.update({ night });
    this.streetLamps();
    this.houseLights(true);
    this.nightThings();
  }

  setLights(patch: Partial<LightSettings>) {
    const lights = { ...this.snap.lights, ...patch };
    this.update({ lights });
    saveLights(lights);
    if (patch.house !== undefined || patch.share !== undefined) this.houseLights(patch.house !== undefined);
    if (patch.street !== undefined) this.streetLamps();
    this.update({ lit: this.countLit() });
    this.nightThings();
    this.applyBloom();
  }

  /** the share of windows lit now (the house light settings, eased in and out over half a second) */
  private ambient = 0;

  /** the windows to what the house light settings ask for */
  private houseLights(ease: boolean) {
    this.timers.forEach(clearTimeout); this.timers = [];
    const L = this.snap.lights, target = lightOn(L.house, this.snap.night) ? L.share : 0, from = this.ambient;
    const steps = ease && Math.abs(target - from) > 0.01 ? 10 : 1;
    for (let i = 1; i <= steps; i++) {
      const go = () => { this.ambient = from + ((target - from) * i) / steps; for (const l of this.layers) this.paintLayer(l); };
      if (steps === 1) go(); else this.timers.push(setTimeout(go, i * 50));
    }
  }

  /** street lamps, garden lamps and the stations' lamps, as the street light setting says */
  private streetLamps() {
    const on = lightOn(this.snap.lights.street, this.snap.night);
    this.setLamp(STREET_LAMPS, on, false);
    for (const st of this.city.stations) this.setLamp(stationLamp(st), on, false);
  }

  private activeFloors() { return this.activeShowcase?.built.floors.length ? this.activeShowcase.built.floors : this.floors; }

  private countLit() { return this.activeFloors().reduce((n, f) => n + (this.lit.has(f) ? 1 : 0), 0); }

  /** every floor on, or every floor off when any is on */
  toggleAll() {
    const list = this.activeFloors();
    const on = !list.some(f => this.lit.has(f));
    for (const f of list) this.setLamp(f, on, false);
    this.update({ lit: this.countLit() });
  }

  /** keys held to move: W A S D or the arrows */
  private held = new Set<string>();
  private static MOVE: Record<string, [number, number]> = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

  keyUp(e: KeyboardEvent) { this.held.delete(e.key.toLowerCase()); }

  key(e: KeyboardEvent): boolean {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    if (k === 'escape' && this.activePopup) { this.closePopup(); return true; }
    if (CityView.MOVE[k]) { this.held.add(k); return true; }
    switch (k) {
      case 'r': this.tilt(1); return true;
      case 'f': this.tilt(-1); return true;
      case '+': case '=': this.zoom(1.25); return true;
      case '-': case '_': this.zoom(1 / 1.25); return true;
      case 'h': this.flyTo([0, 0]); return true;
      case 'v': this.toggleMode(); return true;
      case 'q': this.rotate(-1); return true;
      case 'e': this.rotate(1); return true;
      case 'n': case 't': this.toggleDayNight(); return true;
      case 'l': this.cycleStreetLabels(); return true;
      case 'i': this.cyclePlaceInfo(); return true;
      case ' ': this.toggleAll(); return true;
      default: return false;
    }
  }

  // ---------- traffic ----------
  private respawn() {
    this.vehicles = spawnTraffic(this.lanes, this.snap.quality.traffic);
    const m = this.mounted;
    if (m) {
      for (const [kind, f] of m.fleets) {
        f.list = this.vehicles.filter(v => v.kind === kind);
        // more than the meshes hold: make them again
        if (f.list.length > (f.meshes[0]?.instanceMatrix.count ?? 0)) this.fleetMeshes(f, m.mapGroup);
        for (const o of f.meshes) o.count = f.list.length;
      }
      m.vehicleLines.geometry.dispose();
      m.vehicleLines.geometry = this.linesFor(m.fleets);
      this.tiers(m.scene); this.nightThings();
    }
  }

  /** a fleet's instanced meshes: one per part, its shell; the head and tail lamps and the taxi sign
      change colour at night, the beams only show at night in the dark theme */
  private fleetMeshes(f: Fleet, parent: THREE.Object3D) {
    for (const o of f.meshes) { parent.remove(o); o.dispose(); }
    const n = Math.max(1, f.list.length);
    f.meshes = [];
    for (const [part, geo] of f.model.parts) {
      const mesh = new THREE.InstancedMesh(geo, part === 'beam' ? this.mats.beam : this.mats.vehicle[part], n);
      if (part === 'beam') mesh.userData.night = 'beam';
      f.meshes.push(mesh);
    }
    const shell = new THREE.InstancedMesh(f.model.shell, this.vehicleShell, n);
    shell.userData.tier = 'silhouette';
    f.meshes.push(shell);
    for (const o of f.meshes) { o.frustumCulled = false; o.count = f.list.length; parent.add(o); }
  }

  /** one line buffer for the creases of every vehicle, rewritten each frame */
  private linesFor(fleets: Map<VehicleKind, Fleet>): LineSegmentsGeometry {
    let n = 0;
    for (const f of fleets.values()) n += f.list.length * f.model.lines.length;
    const g = new LineSegmentsGeometry().setPositions(new Float32Array(Math.max(6, n)));
    return g;
  }

  /** a train's four cars, each a group of its parts, its outline and its lines; the last car turned
      round so the train has a cab at both ends */
  private trainMeshes(track: Track, offset: number, parent: THREE.Object3D): Train {
    const doors = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const cars = Array.from({ length: METRO.cars }, (_, i) => {
      const cab = i === 0 || i === METRO.cars - 1, model: CarModel = (this.carModels[cab ? 1 : 0] ??= carModel(cab)), g = new THREE.Group();
      for (const [part, geo] of model.parts) g.add(new THREE.Mesh(geo, part === 'door' ? doors : this.mats.train[part]));
      const shell = new THREE.Mesh(model.shell, this.mats.shell); shell.userData.tier = 'silhouette';
      const lines = new LineSegments2(new LineSegmentsGeometry().setPositions(model.lines), this.mats.crease); lines.userData.tier = 'creases';
      g.add(shell, lines);
      g.userData.flip = i === METRO.cars - 1;
      g.visible = false;
      parent.add(g);
      return g;
    });
    return { track, offset, cars, doors, stopping: false };
  }

  /** each frame: the trains by their timetable; the platform edge lights while a train stands there */
  private trainStep() {
    const hide = this.snap.quality.autoDetail && this.pxPerMetre() < FAR.vehicles;
    const lit = new Set<string>();
    for (const tr of this.trains) {
      if (hide) { for (const g of tr.cars) g.visible = false; continue; }
      const { head, phase } = trainAt(tr.track, this.sim.t + tr.offset), L = tr.track.length;
      tr.cars.forEach((g, i) => {
        const s = head === null ? NaN : head - METRO.carLen / 2 - i * (METRO.carLen + METRO.gap);
        if (!(s > -METRO.carLen / 2 && s < L + METRO.carLen / 2)) { g.visible = false; return; }
        const { p, h } = pathAt(tr.track.path, Math.max(0, Math.min(L, s)));
        g.visible = true;
        g.position.set(p[0], tr.track.height, p[1]);
        g.rotation.y = -h + (g.userData.flip ? Math.PI : 0);
      });
      const stopping = phase === 'stop' || phase === 'brake';
      if (stopping !== tr.stopping) { tr.stopping = stopping; this.trainColors(); }
      if (stopping && head !== null) {
        for (const s of tr.track.stops) {
          if (Math.abs(s.s - head) < 40) {
            const st = this.city.stations.find(x => x.id === s.station);
            if (st) lit.add(stationLamp(st, 'edge'));
          }
        }
      }
    }
    for (const st of this.city.stations) this.setLamp(stationLamp(st, 'edge'), lit.has(stationLamp(st, 'edge')), false);
  }

  /** cars in the theme's colours; windows lit at night, doors lit while the train stands at a station */
  private trainColors() {
    const css = getComputedStyle(document.documentElement), tok = (n: string) => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff');
    const t = this.mats.train, night = this.snap.night;
    t.body.color = tok('--body'); t.top.color = tok('--deck'); t.glass.color = tok('--glass');
    t.win.color = tok(night ? '--accent' : '--recess'); t.head.color = tok(night ? '--accent-hi' : '--detail');
    for (const tr of this.trains) tr.doors.color = tok(tr.stopping ? '--accent-hi' : '--recess');
    if (this.activeShowcase) this.activeShowcase.doors.color = tok('--accent-hi');
  }

  /** each frame: lights by the clock, everyone moves, the instances follow */
  private trafficStep(dt: number) {
    const m = this.mounted;
    if (!m) return;
    this.sim.t += dt;
    this.trainStep();
    const sig = signalsAt(this.sim.t);
    stepTraffic(this.vehicles, this.lanes, sig, this.sim.prev, dt);
    this.sim.prev = sig;
    if (sig.phase !== this.sim.phase || sig.xLeft !== this.snap.signals.xLeft || sig.yLeft !== this.snap.signals.yLeft) {
      if (sig.phase !== this.sim.phase) {
        this.sim.phase = sig.phase;
        for (const g of ['x', 'y'] as const) for (const l of ['stop', 'wait', 'go'] as const) this.setLamp(signalLamp(g, l), sig[g] === l, false);
      }
      this.update({ signals: { x: sig.x, y: sig.y, xLeft: sig.xLeft, yLeft: sig.yLeft } });
    }
    if (this.snap.quality.autoDetail && this.pxPerMetre() < FAR.vehicles) return;
    const far = this.snap.quality.viewDistance, c = m.controls.target, mat = new THREE.Matrix4();
    const drawLines = m.vehicleLines.visible;
    const buf = (m.vehicleLines.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute).data, arr = buf.array as Float32Array, e = mat.elements;
    let k = 0;
    for (const f of m.fleets.values()) {
      const local = f.model.lines;
      let vis = 0;
      for (let i = 0; i < f.list.length; i++) {
        const v = f.list[i]!;
        placeVehicle(v, this.lanes[v.lane]!, mat);
        const out = far > 0 && Math.hypot(e[12]! - c.x, e[14]! - c.z) > far;
        if (out) continue;
        for (const o of f.meshes) o.setMatrixAt(vis, mat);
        vis++;
        if (drawLines) {
          for (let j = 0; j < local.length; j += 3, k += 3) {
            const x = local[j]!, y = local[j + 1]!, z = local[j + 2]!;
            arr[k] = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
            arr[k + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
            arr[k + 2] = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
          }
        }
      }
      for (const o of f.meshes) {
        o.count = vis;
        if (vis > 0) o.instanceMatrix.needsUpdate = true;
      }
    }
    if (drawLines) {
      m.vehicleLines.geometry.instanceCount = k / 6;
      buf.needsUpdate = true;
    }
  }

  // ---------- view distance and the quality stepping down by itself ----------
  private tileRange() {
    const m = this.mounted, far = this.snap.quality.viewDistance;
    if (!m || far <= 0) return 0;
    const el = Math.max(0.08, this.elevation());
    const elScale = Math.min(2.4, Math.sin(ISO_EL) / Math.max(0.22, Math.sin(el)));
    return Math.max(far, (FRUSTUM / m.camera.zoom) * 0.95 * elScale);
  }

  private nearTile(t: TileState) {
    const m = this.mounted;
    if (!m) return true;
    const far = this.tileRange(), c = m.controls.target;
    return far <= 0 || Math.hypot(t.tile.center[0] - c.x, t.tile.center[1] - c.z) - t.tile.radius <= far;
  }

  private ensureCell(s: CellState) {
    if (!s.cell) {
      s.cell = buildFurnitureCell(s.bucket);
      for (const l of [s.cell.poles, s.cell.fixtures, s.cell.trees, s.cell.simpleTrees]) this.layers.add(l);
    }
    if (!s.groups && this.mounted) {
      const cell = s.cell;
      s.groups = {
        poles: this.group(cell.poles),
        fixtures: this.group(cell.fixtures),
        trees: this.group(cell.trees),
        simple: this.group(cell.simpleTrees),
      };
      s.wires = new LineSegments2(cell.wires, this.mats.wire);
      s.pulses = new LineSegments2(cell.wires, this.mats.pulse);
      s.pulses.computeLineDistances();
      s.pools = new THREE.Mesh(cell.pools, this.mats.pool);
      s.pools.userData.night = 'pool';
      this.mounted.mapGroup.add(s.groups.poles, s.groups.fixtures, s.groups.trees, s.groups.simple, s.wires, s.pulses, s.pools);
      for (const l of [cell.poles, cell.fixtures, cell.trees, cell.simpleTrees]) this.paintLayer(l);
    }
  }

  private distanceStep(initial = false) {
    const m = this.mounted;
    if (!m) return;
    const far = this.snap.quality.viewDistance, tFar = this.tileRange(), c = m.controls.target;
    const near = (p: [number, number], r: number, lim = far) => lim <= 0 || Math.hypot(p[0] - c.x, p[1] - c.z) - r <= lim;
    for (const t of this.tiles) {
      if (!near(t.tile.center, t.tile.radius, tFar) && t.shown > 0 && t.layers.has(0)) this.show(t, this.ensure(t, 0));
      const v = t.shown >= 0 ? t.layers.get(t.shown as Detail) : undefined;
      if (v?.group) v.group.visible = true;
    }
    const q = this.snap.quality, px = this.pxPerMetre(), showFurn = !(q.autoDetail && px < FAR.furniture);
    const trees = this.treeLook();
    const needCell = showFurn || trees !== 'off';
    let built = 0;
    // Never build heavy furniture cells mid-drag on mobile/desktop; stream them in during idle frames
    const maxBuild = initial ? Infinity : this.interacting ? 0 : 2;
    for (const s of this.cells) {
      const on = near(s.bucket.center, CELL_R);
      if (on && needCell && (!s.cell || !s.groups) && built < maxBuild) {
        this.ensureCell(s);
        built++;
      }
      const g = s.groups;
      if (g) {
        g.fixtures.visible = on && showFurn;
        g.poles.visible = on && showFurn && q.wires;
        g.trees.visible = on && trees === 'full';
        g.simple.visible = on && trees === 'simple';
      }
      if (s.wires) s.wires.visible = on && showFurn && q.wires;
      if (s.pulses) s.pulses.visible = on && showFurn && q.wires && this.snap.night;
      if (s.pools) s.pools.visible = on && showFurn && this.poolsOn();
    }
  }

  private autoQuality(fps: number) {
    const q = this.snap.quality;
    if (!q.autoQuality || this.snap.pending > 0 || document.hidden) { this.sim.slow = 0; return; }
    this.sim.slow = fps < 28 ? this.sim.slow + 1 : 0;
    if (this.sim.slow < 6) return;   // 3 s below 28 fps
    this.sim.slow = 0;
    const lower = lowerLevel(q);
    if (lower) this.setQuality(lower, lower.level);
  }

  // ---------- detail levels and tiles ----------
  /** the detail level the quality settings and the zoom ask for */
  private wantedDetail(): Detail {
    const m = this.mounted;
    const px = m ? (m.host.clientHeight * m.camera.zoom) / FRUSTUM : 4;
    return detailFor(px, this.snap.quality);
  }

  /** a tile's layer at a level, built (and its meshes made) if need be */
  private ensure(t: TileState, level: Detail): Detail {
    let v = t.layers.get(level);
    if (!v) {
      v = { layer: buildTile(this.city, t.tile, level), group: null };
      t.layers.set(level, v);
      this.layers.add(v.layer);
    }
    if (!v.group && this.mounted) {
      v.group = this.group(v.layer);
      v.group.visible = false;
      this.mounted.mapGroup.add(v.group);
      this.paintLayer(v.layer);
    }
    return level;
  }

  private show(t: TileState, level: Detail) {
    if (t.shown === level) return;
    for (const [l, v] of t.layers) if (v.group) v.group.visible = l === level;
    t.shown = level;
  }

  /** each frame: show every nearby tile at the wanted level when it is built, and build more when not mid-gesture */
  private detailStep() {
    const m = this.mounted;
    if (!m) return;
    const want = this.wantedDetail(), c = m.controls.target, waiting: TileState[] = [];
    for (const t of this.tiles) {
      if (!this.nearTile(t)) continue;
      if (t.layers.has(want)) this.show(t, this.ensure(t, want));
      else {
        // never leave a visible street bare while panning/flying: put up L0 massing right away
        if (t.shown < 0) this.show(t, this.ensure(t, 0));
        waiting.push(t);
      }
    }
    const busy = this.interacting || performance.now() < this.interactCooldown;
    if (waiting.length && !busy) {
      waiting.sort((a, b) => dist2(a.tile.center, c) - dist2(b.tile.center, c));
      const budget = want <= 1 ? 3 : 2;
      for (let i = 0; i < Math.min(budget, waiting.length); i++) {
        this.show(waiting[i]!, this.ensure(waiting[i]!, want));
      }
    } else if (!busy) {
      // Pre-warm L0 for distant tiles during idle frames so zooming out later is instant
      let prewarm = 0;
      for (const t of this.tiles) {
        if (t.shown < 0) {
          this.show(t, this.ensure(t, 0));
          if (++prewarm >= 3) break;
        }
      }
    }
    const pending = busy ? waiting.length : Math.max(0, waiting.length - (want <= 1 ? 3 : 2));
    if (want !== this.snap.detail || pending !== this.snap.pending) this.update({ detail: want, pending, stats: this.shownStats() });
  }

  private shownStats(): Layer['stats'] {
    if (this.activeShowcase) return { ...this.activeShowcase.built.layer.stats };
    const s = { ...this.base.stats };
    const add = (l: Layer) => { s.triangles += l.stats.triangles; s.lines += l.stats.lines; s.windows += l.stats.windows; };
    for (const t of this.tiles) { const l = t.shown >= 0 ? t.layers.get(t.shown as Detail)?.layer : undefined; if (l) add(l); }
    for (const c of this.cells) if (c.cell) { add(c.cell.fixtures); if (this.snap.quality.wires) add(c.cell.poles); if (this.snap.quality.trees === 'full') add(c.cell.trees); }
    return s;
  }

  /** the meshes of a layer, with the shared materials */
  private group(layer: Layer): THREE.Group {
    const g = new THREE.Group();
    for (const [s, geo] of layer.surfaces) {
      const mesh = new THREE.Mesh(geo, this.mats.surface.get(s)!);
      mesh.userData = { surface: s, layer };
      g.add(mesh);
    }
    const shell = new THREE.Mesh(layer.shell, this.mats.shell); shell.userData.tier = 'silhouette';
    const creases = new LineSegments2(layer.creases, this.mats.crease); creases.userData.tier = 'creases';
    const details = new LineSegments2(layer.details, this.mats.detail); details.userData.tier = 'details';
    const windows = new THREE.Mesh(layer.windows, this.mats.windows); windows.userData.tier = 'windows';
    g.add(shell, creases, details, windows);
    this.tiers(g);
    return g;
  }

  /** line tiers and windows on or off per the quality settings and zoom level */
  private tiers(g: THREE.Object3D) {
    const q = this.snap.quality, auto = q.autoDetail && !this.snap.showcase, px = this.pxPerMetre();
    g.traverse(o => {
      const t = o.userData.tier as keyof Quality | undefined;
      if (!t) return;
      let on = q[t] as boolean;
      if (auto && on) {
        if (t === 'details' && px < FAR.details) on = false;
        else if (t === 'creases' && px < FAR.creases) on = false;
        else if (t === 'silhouette' && px < FAR.silhouette) on = false;
        else if (t === 'windows' && px < 1.1) on = false;
      }
      o.visible = on;
    });
  }

  /** things that only show at night (headlight beams: only in the dark theme too) */
  private nightThings() {
    const m = this.mounted;
    if (m) m.scene.traverse(o => { const k = o.userData.night; if (k) o.visible = this.nightOn(k as string); });
    this.zoomFade(true);
    const css = getComputedStyle(document.documentElement);
    this.vehicleColors(n => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff'));
    this.trainColors();
  }

  /** the pools of light under the street lamps: when the lamps are on, in the dark theme */
  private poolsOn() { return lightOn(this.snap.lights.street, this.snap.night) && this.snap.theme === 'dark'; }

  /** vehicles take the theme's colours; their lamps and the taxi sign light at night */
  private vehicleColors(tok: (n: string) => THREE.Color) {
    const v = this.mats.vehicle, night = lightOn(this.snap.lights.vehicle, this.snap.night);
    // zoomed out a vehicle is a grey block (darker than the road) with a faint outline: it still
    // reads as a vehicle, with none of the lines inside it (ADR-045)
    const f = this.farF;
    v.body.color = tok('--body').lerp(tok('--line'), 0.45 * f); v.top.color = tok('--deck').lerp(tok('--line'), 0.45 * f);
    (this.vehicleShell.uniforms.color!.value as THREE.Color).copy(tok('--line').lerp(tok('--recess'), 0.6 * f)); v.glass.color = tok('--glass'); v.wheel.color = tok('--recess');
    v.head.color = tok(night ? '--accent-hi' : '--detail');
    v.tail.color = night ? tok('--accent') : tok('--detail');
    v.sign.color = tok(night ? '--accent' : '--recess');
    this.mats.beam.color = tok('--accent');
    (this.mats.pool.uniforms.color!.value as THREE.Color).copy(tok('--accent'));
  }

  // ---------- lamps ----------
  private setLamp(id: string, on: boolean, notify = true) {
    if (on === this.lit.has(id)) return;
    if (on) this.lit.add(id); else this.lit.delete(id);
    for (const l of this.layers) this.paint(l, id);
    if (notify) this.update({ lit: this.countLit() });
  }

  /** a lamp's windows to its colours: off, or each window in its own shade (render/lights.ts),
      its outline with it */
  private paint(layer: Layer, id: string) {
    const ranges = layer.lamps.get(id);
    if (!ranges) return;
    const fill = layer.windows.getAttribute('color') as THREE.BufferAttribute, floor = this.lit.has(id), share = isHouseLamp(id) ? this.ambient : 0;
    /** a window's shade: its floor switched on (all its windows, each in its shade), or it is among
        the share of windows lit (never one of the dark ones then) */
    const shade = (k: number): Shade => { const s = windowShade(id, k); return floor ? s : windowRank(id, k) < share ? (s === 'off' ? 'dim' : s) : 'off'; };
    let k = 0;
    for (const r of ranges) for (let w = r.start; w < r.start + r.count; w += 6, k++) {
      const c = this.colors[shade(k)];
      for (let v = w; v < w + 6; v++) fill.setXYZ(v, c.r, c.g, c.b);
    }
    fill.needsUpdate = true;
    const lines = layer.lampLines.get(id), col = layer.details.attributes.instanceColorStart as THREE.InterleavedBufferAttribute | undefined;
    if (!lines || !col) return;
    const arr = col.data.array as Float32Array;
    k = 0;
    for (const r of lines) for (let s = r.start; s < r.start + r.count; s += 4, k++) {
      const c = this.outline[shade(k)];
      for (let j = s * 6; j < (s + 4) * 6; j += 3) { arr[j] = c.r; arr[j + 1] = c.g; arr[j + 2] = c.b; }
    }
    col.data.needsUpdate = true;
  }

  /** every window and line of a layer to the current colours */
  private paintLayer(layer: Layer) {
    const fill = layer.windows.getAttribute('color') as THREE.BufferAttribute, off = this.colors.off;
    for (let v = 0; v < fill.count; v++) fill.setXYZ(v, off.r, off.g, off.b);
    fill.needsUpdate = true;
    const col = layer.details.attributes.instanceColorStart as THREE.InterleavedBufferAttribute | undefined;
    if (col) {
      const arr = col.data.array as Float32Array, d = this.outline.off;
      for (let j = 0; j < arr.length; j += 3) { arr[j] = d.r; arr[j + 1] = d.g; arr[j + 2] = d.b; }
      col.data.needsUpdate = true;
    }
    for (const id of layer.lamps.keys()) if (this.lit.has(id) || (this.ambient > 0 && isHouseLamp(id))) this.paint(layer, id);
  }

  // ---------- theme and quality ----------
  private applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    const css = getComputedStyle(document.documentElement);
    const tok = (n: string) => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff');
    for (const [s, m] of this.mats.surface) m.color = tok(SURFACE_TOKEN[s]);
    (this.mats.shell.uniforms.color!.value as THREE.Color).copy(tok('--line'));
    this.mats.crease.color = tok('--line');
    this.mats.wire.color = tok('--line');
    this.mats.pulse.color = tok('--accent');
    this.nightThings();
    const wall = tok('--body');
    this.colors.off = tok('--recess');
    this.colors.on = tok('--accent');
    this.colors.hi = tok('--accent-hi');
    this.colors.dim = tok('--accent').lerp(wall, 0.55);
    this.outline.off = tok('--detail');
    this.outline.on = tok('--accent-hi');
    this.outline.hi = tok('--accent-hi');
    this.outline.dim = tok('--accent-hi').lerp(wall, 0.55);
    this.mats.beaconOn.color = tok('--accent-hi');
    this.mats.beaconOff.color = tok('--line');
    for (const l of this.layers) this.paintLayer(l);
    if (this.mounted) this.mounted.scene.background = tok('--bg');
    this.applyBloom();
  }

  private applyQuality(q: Quality) {
    const m = this.mounted;
    if (!m) return;
    m.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    // the composer's render target carries the multisampling; rebuild it on change
    m.composer.dispose();
    const target = new THREE.WebGLRenderTarget(1, 1, { samples: q.msaa ? 4 : 0, type: THREE.HalfFloatType });
    m.composer = new EffectComposer(m.renderer, target);
    m.composer.addPass(new RenderPass(m.scene, m.camera));
    m.composer.addPass(m.bloom);
    m.composer.addPass(new OutputPass());
    m.composer.setSize(m.host.clientWidth, m.host.clientHeight);
    this.tiers(m.scene);
    this.nightThings();
    this.resolution();
    this.applyBloom();
    this.zoomFade(true);
  }

  private resolution() {
    const m = this.mounted;
    if (!m) return;
    const res = m.renderer.getDrawingBufferSize(new THREE.Vector2());
    for (const l of [this.mats.crease, this.mats.detail, this.mats.wire, this.mats.pulse]) l.resolution.copy(res);
    (this.mats.shell.uniforms.res!.value as THREE.Vector2).copy(res);
  }

  /** glow round lit things: only the accent is bright enough to pass the threshold; strength from
      the light settings */
  private applyBloom() {
    const m = this.mounted;
    if (!m) return;
    const g = this.snap.lights.glow;
    m.bloom.enabled = this.snap.quality.bloom && this.snap.theme === 'dark' && g > 0;
    // iso-glow: windows barely glow, lamps and signs softly — only the bright accent passes
    m.bloom.strength = 0.45 * g; m.bloom.radius = 0.3; m.bloom.threshold = 0.55;
  }

  // ---------- zoomed out: less of the small things (ADR-044, ADR-049) ----------
  private far = '';

  /** pixels per metre on screen now */
  private pxPerMetre() { const m = this.mounted; return m ? (m.host.clientHeight * m.camera.zoom) / FRUSTUM : 4; }

  /** lines fade gently while keeping creases and silhouettes crisp when zoomed out */
  private zoomFade(force = false) {
    const m = this.mounted;
    if (!m) return;
    const px = this.pxPerMetre(), auto = this.snap.quality.autoDetail && !this.snap.showcase;
    const f = !auto ? 0 : Math.round(farness(px, this.snap.quality) * 20) / 20;
    const fCrease = !auto ? 0 : Math.round(Math.max(0, Math.min(1, (FAR.near - px) / (FAR.near - FAR.creases))) * 20) / 20;
    const key = `${f}|${fCrease}|${px < FAR.vehicleLines}|${px < FAR.bikes}|${px < FAR.details}|${px < FAR.vehicles}|${px < FAR.creases}|${px < FAR.silhouette}|${this.snap.showcase ?? ''}`;
    if (key === this.far && !force) return;
    this.far = key;
    this.farF = f;
    const css = getComputedStyle(document.documentElement);
    this.vehicleColors(n => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff'));
    // Keep building creases and details crisp when zoomed out so the map never looks washed-out or blurry
    this.mats.crease.opacity = 1 - 0.32 * fCrease;
    this.mats.detail.opacity = 1 - 0.45 * f;
    this.mats.wire.opacity = 1 - 0.5 * f;
    this.tiers(m.scene);
    m.vehicleLines.visible = this.snap.quality.creases && !(auto && px < FAR.vehicleLines);
    const hideAllVehicles = auto && px < FAR.vehicles;
    for (const [kind, fl] of m.fleets) for (const o of fl.meshes) {
      const shell = o.material === this.vehicleShell;
      o.visible = !hideAllVehicles && !(auto && kind === 'bike' && px < FAR.bikes) && !(shell && (!this.snap.quality.silhouette || (auto && px < FAR.silhouette)));
      if (o.userData.night) o.visible = o.visible && this.nightOn(o.userData.night as string);
    }
  }

  /** is a night-only thing on now */
  private nightOn(k: string) {
    const cars = lightOn(this.snap.lights.vehicle, this.snap.night);
    return k === 'beam' ? cars && this.snap.theme === 'dark' : k === 'pool' ? this.poolsOn() : this.snap.night;
  }

  /** the tree look in use: full trees turn simple when zoomed out, and hide completely when very far out */
  private treeLook() {
    const q = this.snap.quality, px = this.pxPerMetre();
    if (!q.autoDetail || q.trees === 'off') return q.trees;
    if (px < FAR.trees) return 'off';
    return q.trees === 'full' && px < FAR.simpleTrees ? 'simple' : q.trees;
  }

  // ---------- moving about (ADR-043) ----------
  /** places to fly to: key intersections/corridors across Đống Đa, Ba Đình, and every metro station */
  get places(): { id: string; name: string; group: string; at: [number, number] }[] {
    return [
      { id: 'home', name: 'Ngã tư Thái Hà – Tây Sơn', group: 'Quận Đống Đa', at: [0, 0] },
      { id: 'vpbank-lang-ha', name: 'VPBank Tower (89 Láng Hạ – Cuối Thái Hà)', group: 'Quận Đống Đa', at: [255, -1165] },
      { id: 'rap-chieu-phim-quoc-gia', name: 'Rạp Chiếu phim Quốc gia (87 Láng Hạ)', group: 'Quận Đống Đa', at: [285, -1045] },
      { id: 'thai-thinh', name: 'Phố Thái Thịnh – Yên Lãng', group: 'Quận Đống Đa', at: [-260, -560] },
      { id: 'nga-tu-so', name: 'Ngã Tư Sở', group: 'Quận Đống Đa', at: [-785, -36] },
      { id: 'chua-boc', name: 'Chùa Bộc – Học viện Ngân hàng', group: 'Quận Đống Đa', at: [50, 560] },
      { id: 'pham-ngoc-thach', name: 'Phạm Ngọc Thạch – Kim Liên', group: 'Quận Đống Đa', at: [420, 880] },
      { id: 'ho-dac-di', name: 'Hồ Đắc Di – Nam Đồng', group: 'Quận Đống Đa', at: [520, 480] },
      { id: 'nguyen-luong-bang', name: 'Nguyễn Lương Bằng – Gò Đống Đa', group: 'Quận Đống Đa', at: [420, -20] },
      { id: 'o-cho-dua', name: 'Ô Chợ Dừa', group: 'Quận Đống Đa', at: [1142, 50] },
      { id: 'xa-dan', name: 'Phố Xã Đàn', group: 'Quận Đống Đa', at: [986, 500] },
      { id: 'kham-thien', name: 'Phố Khâm Thiên', group: 'Quận Đống Đa', at: [1420, 210] },
      { id: 'ton-duc-thang', name: 'Tôn Đức Thắng – Văn Miếu Quốc Tử Giám', group: 'Quận Đống Đa', at: [1520, -720] },
      { id: 'hoang-cau', name: 'Hồ Hoàng Cầu', group: 'Quận Đống Đa', at: [750, -520] },
      { id: 'hao-nam', name: 'Phố Hào Nam – Cát Linh', group: 'Quận Đống Đa', at: [980, -820] },
      { id: 'thanh-cong', name: 'Hồ Thành Công – Huỳnh Thúc Kháng', group: 'Quận Ba Đình', at: [210, -1420] },
      { id: 'giang-vo', name: 'Hồ Giảng Võ – Triển lãm Giảng Võ', group: 'Quận Ba Đình', at: [520, -1820] },
      { id: 'kim-ma', name: 'Trục Kim Mã – Núi Trúc', group: 'Quận Ba Đình', at: [720, -2100] },
      { id: 'lotte-lieu-giai', name: 'Lotte Center – Liễu Giai – Đào Tấn', group: 'Quận Ba Đình', at: [-80, -2420] },
      { id: 'ngoc-khanh', name: 'Hồ Thủ Lệ – Ngọc Khánh', group: 'Quận Ba Đình', at: [-420, -2180] },
      { id: 'lang-bac', name: 'Quảng trường Ba Đình – Lăng Chủ tịch Hồ Chí Minh', group: 'Quận Ba Đình', at: [2150, -2380] },
      { id: 'hoang-thanh', name: 'Hoàng thành Thăng Long – Điện Biên Phủ', group: 'Quận Ba Đình', at: [2380, -2120] },
      { id: 'truc-bach', name: 'Hồ Trúc Bạch – Quán Thánh – Phan Đình Phùng', group: 'Quận Ba Đình', at: [2750, -2950] },
      { id: 'doi-can', name: 'Phố Đội Cấn – Ngọc Hà', group: 'Quận Ba Đình', at: [1280, -2480] },
      ...this.city.stations.map(s => ({ id: s.id, name: `Ga ${s.name ?? ''}`.trim(), group: 'Nhà ga Metro', at: [s.at[0], s.at[1]] as [number, number] })),
    ];
  }

  private fly: { from: THREE.Vector3; to: THREE.Vector3; t0: number } | null = null;

  /** glide the view's middle to a point on the ground (the city model's x, y); switches back to the map if in showcase mode */
  flyTo(p: [number, number], exitShowcase = true) {
    if (exitShowcase && this.snap.showcase) this.setShowcase(null);
    const m = this.mounted;
    if (!m) return;
    this.fly = { from: m.controls.target.clone(), to: new THREE.Vector3(p[0], m.controls.target.y, p[1]), t0: performance.now() };
  }

  /** zoom in (k > 1) or out, round the middle of the view */
  zoom(k: number) {
    const m = this.mounted;
    if (!m) return;
    m.camera.zoom = Math.max(m.controls.minZoom, Math.min(m.controls.maxZoom, m.camera.zoom * k));
    m.camera.updateProjectionMatrix();
  }

  /** tilt up (+1) or down (-1); automatically unlocks 3D mode if currently in 2D */
  tilt(dir: 1 | -1) {
    if (!this.mounted) return;
    if (this.snap.mode !== '3d') {
      this.update({ mode: '3d' });
      this.applyMode('3d', false);
    }
    this.startTurn(this.azimuth(), Math.max(0.12, Math.min(1.45, this.elevation() + dir * 0.16)));
  }

  /** stabilize pan speed, zoom-to-cursor, and target elevation when the camera is tilted low */
  private syncLowCamera() {
    const m = this.mounted;
    if (!m) return;
    const el = Math.max(0.08, this.elevation());
    // Scale pan speed when camera is low so vertical screen drag doesn't fling the target 8x across the ground plane
    m.controls.panSpeed = Math.max(0.24, Math.min(1, Math.sin(el) / Math.sin(ISO_EL)));
    if (el < 0.34) m.controls.zoomToCursor = false;

    // When tilted low in 3D and zoomed in, gently lift target.y so buildings stay framed instead of staring at the asphalt
    let wantY = 0;
    if (this.snap.mode === '3d' && !this.activeShowcase && el < 0.38) {
      const lowF = Math.max(0, Math.min(1, (0.38 - el) / 0.24));
      const zoomF = Math.max(0, Math.min(1, (m.camera.zoom - 0.9) / 2.2));
      wantY = lowF * zoomF * 12;
    }
    const dy = (wantY - m.controls.target.y) * 0.18;
    if (Math.abs(dy) > 0.01) {
      m.controls.target.y += dy;
      m.camera.position.y += dy;
    }
  }

  /** held keys move the view over the ground, about half a screen a second, the way it faces */
  private keysMove(dt: number) {
    const m = this.mounted;
    if (!m || !this.held.size) return;
    let fx = 0, fy = 0;
    for (const k of this.held) { const d = CityView.MOVE[k]; if (d) { fx += d[0]; fy += d[1]; } }
    if (!fx && !fy) return;
    const f = m.controls.target.clone().sub(m.camera.position).setY(0).normalize(), right = new THREE.Vector3(-f.z, 0, f.x);
    const step = new THREE.Vector3().addScaledVector(f, fy).addScaledVector(right, fx).normalize().multiplyScalar(((FRUSTUM / m.camera.zoom) * 0.5) * dt);
    m.controls.target.add(step); m.camera.position.add(step);
  }

  /** the view's middle stays within the expanded map bounds (including all metro stations), or within the showcase plate */
  private keepInside() {
    const m = this.mounted;
    if (!m) return;
    const t = m.controls.target;
    if (this.activeShowcase) {
      const r = this.activeShowcase.built.item.radius;
      const x = Math.max(-r, Math.min(r, t.x)), z = Math.max(-r, Math.min(r, t.z));
      if (x !== t.x || z !== t.z) { const d = new THREE.Vector3(x - t.x, 0, z - t.z); t.add(d); m.camera.position.add(d); }
      return;
    }
    const b = this.panBounds;
    const x = Math.max(b.x0 - 120, Math.min(b.x1 + 120, t.x)), z = Math.max(b.y0 - 120, Math.min(b.y1 + 120, t.z));
    if (x !== t.x || z !== t.z) { const d = new THREE.Vector3(x - t.x, 0, z - t.z); t.add(d); m.camera.position.add(d); }
  }

  // ---------- camera ----------
  private applyMode(mode: Mode, animate: boolean) {
    const m = this.mounted;
    if (!m) return;
    m.controls.enableRotate = mode === '3d';
    m.controls.touches.TWO = mode === '3d' ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
    if (mode === '2d') {
      const k = Math.round((Math.PI / 4 - this.azimuth()) / (Math.PI / 2));
      if (animate) this.startTurn(azOf(k), ISO_EL); else this.place(m.camera, m.controls, azOf(k), ISO_EL);
    }
  }

  private azimuth() { const m = this.mounted!; return Math.atan2(m.camera.position.z - m.controls.target.z, m.camera.position.x - m.controls.target.x); }
  private elevation() { const m = this.mounted!, d = m.camera.position.clone().sub(m.controls.target); return Math.asin(d.y / d.length()); }

  private startTurn(a1: number, e1: number) {
    let a0 = this.azimuth();
    // the short way round
    while (a1 - a0 > Math.PI) a0 += 2 * Math.PI;
    while (a0 - a1 > Math.PI) a0 -= 2 * Math.PI;
    this.turn = { a0, a1, e0: this.elevation(), e1, t0: performance.now() };
  }

  private animate(now: number) {
    const m = this.mounted;
    if (m && this.fly) {
      const f = this.fly, u = Math.min(1, (now - f.t0) / 700), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const next = f.from.clone().lerp(f.to, e), d = next.clone().sub(m.controls.target);
      m.controls.target.add(d); m.camera.position.add(d);
      if (u >= 1) this.fly = null;
    }
    const t = this.turn;
    if (!m || !t) return;
    const u = Math.min(1, (now - t.t0) / 450), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    this.place(m.camera, m.controls, t.a0 + (t.a1 - t.a0) * e, t.e0 + (t.e1 - t.e0) * e);
    if (u >= 1) this.turn = null;
  }

  private place(camera: THREE.OrthographicCamera, controls: OrbitControls, az: number, el: number) {
    const R = 1000, c = controls.target;
    camera.position.set(c.x + R * Math.cos(el) * Math.cos(az), c.y + R * Math.sin(el), c.z + R * Math.cos(el) * Math.sin(az));
    camera.lookAt(c);
  }
}

const dist2 = (c: [number, number], v: THREE.Vector3) => (c[0] - v.x) ** 2 + (c[1] - v.z) ** 2;
