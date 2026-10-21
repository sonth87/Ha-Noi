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
  METRO, metroTracks, trainAt, roadNetwork, signalsAt, spawnTraffic, stepTraffic, streetFurniture, trafficLanes,
  type City, type Lane, type Signals, type Track, type Vehicle, type VehicleKind,
} from '@my-city/core';
import { beaconsOf, buildBase, buildTile, cityFloors, tilesOf, type Detail, type Layer, type Tile } from '@render/city';
import { STREET_LAMPS, buildFurniture, signalLamp, type FurnitureCell } from '@render/furniture';
import { buildShowcase, showcasesOf, type BuiltShowcase, type ShowcaseItem } from '@render/showcase';
import { placeVehicle, vehicleModel, type VehicleModel, type VehiclePart } from '@render/vehicles';
import { at as pathAt, carModel, stationLamp, type CarModel } from '@render/metro';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { Surface } from '@render/batch';
import { isHouseLamp, windowRank, windowShade, type Shade } from '@render/lights';
import { FAR, detailFor, farness, loadQuality, lowerLevel, saveQuality, type Quality } from './quality';
import { lightOn, loadLights, saveLights, type LightSettings } from './lights';

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
interface CellState { cell: FurnitureCell; groups: { poles: THREE.Group; fixtures: THREE.Group; trees: THREE.Group; simple: THREE.Group } | null; wires: LineSegments2 | null; pulses: LineSegments2 | null; pools: THREE.Mesh | null }
interface Fleet { model: VehicleModel; meshes: THREE.InstancedMesh[]; list: Vehicle[] }
interface Train { track: Track; cars: THREE.Group[]; doors: THREE.MeshBasicMaterial; stopping: boolean }

export class CityView {
  readonly base: Layer;
  readonly tiles: TileState[];
  readonly cells: CellState[];
  readonly floors: string[];
  readonly lanes: Lane[];
  readonly tracks: Track[];
  readonly showcases: ShowcaseItem[];
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
    this.cells = buildFurniture(streetFurniture(city, net)).map(cell => ({ cell, groups: null, wires: null, pulses: null, pools: null }));
    for (const c of this.cells) for (const l of [c.cell.poles, c.cell.fixtures, c.cell.trees, c.cell.simpleTrees]) this.layers.add(l);
    this.lanes = trafficLanes(net);
    this.tracks = metroTracks(city);
    this.showcases = showcasesOf(city);
    for (const s of Object.keys(SURFACE_TOKEN) as Surface[]) {
      this.mats.surface.set(s, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    }
    // day (the light theme) by default (user, 2026-10-21); night (the dark theme and the lamps) is
    // one switch, remembered
    let theme: Theme = 'light';
    try { if (localStorage.getItem('city3d-theme') === 'dark') theme = 'dark'; } catch { /* default */ }
    const quality = loadQuality();
    this.vehicles = spawnTraffic(this.lanes, quality.traffic);
    const sig = signalsAt(0);
    this.snap = {
      mode: '2d', view: 0, heading: 0, theme, night: theme === 'dark', quality, detail: 1, pending: 0, fps: 0, lit: 0, floors: this.floors.length,
      vehicles: this.vehicles.length, signals: { x: sig.x, y: sig.y, xLeft: sig.xLeft, yLeft: sig.yLeft }, lowered: null, lights: loadLights(), stats: this.base.stats,
      showcase: null,
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
    controls.zoomSpeed = 1.15;
    controls.minZoom = 0.16; controls.maxZoom = 40;
    controls.minPolarAngle = 0.05; controls.maxPolarAngle = 1.45;
    // map-style (ADR-043): left drag moves over the ground, right drag (or shift + drag) turns and
    // tilts, the wheel zooms toward the pointer; one finger moves, two pinch+pan in 2D or pinch+turn in 3D
    controls.screenSpacePanning = false;
    controls.zoomToCursor = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: this.snap.mode === '3d' ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN };
    controls.rotateSpeed = 0.65;
    const onControlStart = () => { this.interacting = true; this.interactCooldown = performance.now() + 180; };
    const onControlChange = () => { if (this.interacting) this.interactCooldown = performance.now() + 140; };
    const onControlEnd = () => { this.interacting = false; this.interactCooldown = performance.now() + 140; };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);
    controls.addEventListener('end', onControlEnd);
    this.place(camera, controls, azOf(this.snap.view), ISO_EL);

    mapGroup.add(this.group(this.base));
    // a remount starts from fresh meshes; the built layers are kept
    for (const t of this.tiles) { for (const v of t.layers.values()) v.group = null; t.shown = -1; }
    for (const c of this.cells) {
      c.groups = { poles: this.group(c.cell.poles), fixtures: this.group(c.cell.fixtures), trees: this.group(c.cell.trees), simple: this.group(c.cell.simpleTrees) };
      c.wires = new LineSegments2(c.cell.wires, this.mats.wire);
      c.pulses = new LineSegments2(c.cell.wires, this.mats.pulse);
      c.pulses.computeLineDistances();
      c.pools = new THREE.Mesh(c.cell.pools, this.mats.pool);
      c.pools.userData.night = 'pool';
      mapGroup.add(c.groups.poles, c.groups.fixtures, c.groups.trees, c.groups.simple, c.wires, c.pulses, c.pools);
    }
    const beacons = beaconsOf(this.city).map(p => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff); b.position.copy(p); mapGroup.add(b); return b; });
    const fleets = new Map<VehicleKind, Fleet>();
    for (const kind of KINDS) {
      const fleet: Fleet = { model: vehicleModel(kind), meshes: [], list: this.vehicles.filter(v => v.kind === kind) };
      this.fleetMeshes(fleet, mapGroup);
      fleets.set(kind, fleet);
    }
    this.trains = this.tracks.map(track => this.trainMeshes(track, mapGroup));
    const vehicleLines = new LineSegments2(this.linesFor(fleets), this.mats.crease);
    vehicleLines.frustumCulled = false;
    vehicleLines.userData.tier = 'creases';
    mapGroup.add(vehicleLines);

    const composer = new EffectComposer(renderer);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.35, 0.5);

    // double click / double tap: fly to that spot on the ground
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
    const flyToClient = (clientX: number, clientY: number) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(ground, hitPt)) this.flyTo([hitPt.x, hitPt.z], false);
    };
    const onDbl = (e: MouseEvent) => flyToClient(e.clientX, e.clientY);

    // input: a click/tap (not a drag) lights or darkens the floor under it; on touch, disable zoomToCursor so two-finger pinch doesn't drift toward a single finger
    let down: [number, number] | null = null;
    let lastTap: { t: number; x: number; y: number } | null = null;
    const onTouchStart = () => { controls.zoomToCursor = false; };
    const onWheel = () => { controls.zoomToCursor = true; };
    const onDown = (e: PointerEvent) => {
      controls.zoomToCursor = e.pointerType === 'mouse';
      down = [e.clientX, e.clientY];
    };
    const onUp = (e: PointerEvent) => {
      const maxMove = e.pointerType === 'touch' ? 10 : 4;
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > maxMove) return;
      if (e.pointerType === 'touch') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28) {
          lastTap = null;
          flyToClient(e.clientX, e.clientY);
          return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const pickable: THREE.Object3D[] = [];
      if (this.snap.showcase) {
        showcaseGroup.traverse(o => { if (o.userData.surface) pickable.push(o); });
      } else {
        for (const t of this.tiles) {
          const g = t.shown >= 0 ? t.layers.get(t.shown as Detail)?.group : null;
          if (g?.visible) for (const o of g.children) if (o.userData.surface) pickable.push(o);
        }
      }
      const hit = ray.intersectObjects(pickable, false)[0];
      if (!hit || hit.faceIndex == null) return;
      const layer = hit.object.userData.layer as Layer;
      const owner = layer.ownerOf(hit.object.userData.surface as Surface, hit.faceIndex);
      const floor = owner && layer.floorAt(owner, hit.point);
      if (floor) this.setLamp(floor, !this.lit.has(floor));
    };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onDown);
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
      controls.update();
      this.keepInside();
      this.zoomFade();
      const blink = this.snap.night && Math.floor(now / 700) % 2 === 0;
      if (this.snap.showcase) {
        if (this.activeShowcase) for (const b of this.activeShowcase.beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
      } else {
        this.detailStep();
        this.distanceStep();
        this.trafficStep(dt);
        for (const b of beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
        this.mats.pulse.dashOffset -= dt * 9;
      }
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

    this.mounted = {
      host, renderer, scene, mapGroup, showcaseGroup, camera, controls, composer, bloom, beacons, fleets, vehicleLines,
      stop: () => {
        cancelAnimationFrame(raf); ro.disconnect();
        controls.removeEventListener('start', onControlStart);
        controls.removeEventListener('change', onControlChange);
        controls.removeEventListener('end', onControlEnd);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointerup', onUp);
        renderer.domElement.removeEventListener('dblclick', onDbl);
        renderer.domElement.removeEventListener('webglcontextlost', onLost);
      },
    };
    this.applyMode(this.snap.mode, false);
    this.applyQuality(this.snap.quality);
    this.applyTheme(this.snap.theme);
    resize();
    // nearby tiles at once at a low level, so the initial view is there from the first frame without stalling startup
    const first = Math.min(1, this.wantedDetail()) as Detail;
    for (const t of this.tiles) if (this.nearTile(t)) this.show(t, this.ensure(t, first));
    this.houseLights(false);
    this.streetLamps();
    for (const st of this.city.stations) this.setLamp(stationLamp(st, 'board'), true, false);
    this.nightThings();
    if (this.snap.showcase) this.mountShowcase(this.snap.showcase);
    else this.update({ stats: this.shownStats() });
    raf = requestAnimationFrame(tick);
  }

  unmount() {
    const m = this.mounted;
    if (!m) return;
    m.stop();
    this.timers.forEach(clearTimeout); this.timers = [];
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
      return;
    }
    if (m && !this.snap.showcase) {
      this.savedMapCam = { target: m.controls.target.clone(), zoom: m.camera.zoom };
    }
    this.mountShowcase(id);
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
    this.update({ vehicles: this.vehicles.length });
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
  private trainMeshes(track: Track, parent: THREE.Object3D): Train {
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
    return { track, cars, doors, stopping: false };
  }

  /** each frame: the trains by their timetable; the platform edge lights while a train stands there */
  private trainStep() {
    const hide = this.snap.quality.autoDetail && this.pxPerMetre() < FAR.vehicles;
    const lit = new Set<string>();
    for (const tr of this.trains) {
      if (hide) { for (const g of tr.cars) g.visible = false; continue; }
      const { head, phase } = trainAt(tr.track, this.sim.t), L = tr.track.length;
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
      if (stopping) for (const s of tr.track.stops) { const st = this.city.stations.find(x => x.id === s.station); if (st) lit.add(stationLamp(st, 'edge')); }
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
    return Math.max(far, (FRUSTUM / m.camera.zoom) * 0.95);
  }

  private nearTile(t: TileState) {
    const m = this.mounted;
    if (!m) return true;
    const far = this.tileRange(), c = m.controls.target;
    return far <= 0 || Math.hypot(t.tile.center[0] - c.x, t.tile.center[1] - c.z) - t.tile.radius <= far;
  }

  private distanceStep() {
    const m = this.mounted;
    if (!m) return;
    const far = this.snap.quality.viewDistance, tFar = this.tileRange(), c = m.controls.target;
    const near = (p: [number, number], r: number, lim = far) => lim <= 0 || Math.hypot(p[0] - c.x, p[1] - c.z) - r <= lim;
    for (const t of this.tiles) {
      const v = t.shown >= 0 ? t.layers.get(t.shown as Detail) : undefined;
      if (v?.group) v.group.visible = near(t.tile.center, t.tile.radius, tFar);
    }
    const q = this.snap.quality, px = this.pxPerMetre(), showFurn = !(q.autoDetail && px < FAR.furniture);
    const trees = this.treeLook();
    for (const s of this.cells) {
      const on = near(s.cell.center, CELL_R), g = s.groups;
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

  /** each frame: show every nearby tile at the wanted level when it is built, and build one more when not mid-gesture */
  private detailStep() {
    const m = this.mounted;
    if (!m) return;
    const want = this.wantedDetail(), c = m.controls.target, waiting: TileState[] = [];
    for (const t of this.tiles) {
      if (!this.nearTile(t)) continue;
      if (t.layers.has(want)) this.show(t, this.ensure(t, want));
      else waiting.push(t);
    }
    const busy = this.interacting || performance.now() < this.interactCooldown;
    if (waiting.length && !busy) {
      const near = waiting.reduce((a, t) => (dist2(t.tile.center, c) < dist2(a.tile.center, c) ? t : a));
      this.show(near, this.ensure(near, want));
    }
    const pending = busy ? waiting.length : Math.max(0, waiting.length - 1);
    if (want !== this.snap.detail || pending !== this.snap.pending) this.update({ detail: want, pending, stats: this.shownStats() });
  }

  private shownStats(): Layer['stats'] {
    if (this.activeShowcase) return { ...this.activeShowcase.built.layer.stats };
    const s = { ...this.base.stats };
    const add = (l: Layer) => { s.triangles += l.stats.triangles; s.lines += l.stats.lines; s.windows += l.stats.windows; };
    for (const t of this.tiles) { const l = t.shown >= 0 ? t.layers.get(t.shown as Detail)?.layer : undefined; if (l) add(l); }
    for (const c of this.cells) { add(c.cell.fixtures); if (this.snap.quality.wires) add(c.cell.poles); if (this.snap.quality.trees === 'full') add(c.cell.trees); }
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
        else if (t === 'windows' && px < FAR.furniture) on = false;
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

  /** lines fade, vehicles lose their lines then their outline then hide completely, bikes go, trees simplify then hide —
      as the view zooms out; applied when the farness moves by a step or crosses a cutoff */
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
    this.mats.crease.opacity = 1 - 0.8 * fCrease;
    this.mats.detail.opacity = 1 - 0.85 * f;
    this.mats.wire.opacity = 1 - 0.6 * f;
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
  /** places to fly to: key intersections/corridors in the expanded area and every metro station */
  get places(): { id: string; name: string; at: [number, number] }[] {
    return [
      { id: 'home', name: 'Ngã tư Thái Hà', at: [0, 0] },
      { id: 'nga-tu-so', name: 'Ngã Tư Sở', at: [-785, -36] },
      { id: 'chua-boc', name: 'Chùa Bộc', at: [50, 760] },
      { id: 'nguyen-luong-bang', name: 'Nguyễn Lương Bằng', at: [585, 0] },
      { id: 'o-cho-dua', name: 'Ô Chợ Dừa', at: [1142, 50] },
      { id: 'xa-dan', name: 'Xã Đàn', at: [986, 500] },
      { id: 'hoang-cau', name: 'Hồ Hoàng Cầu', at: [750, -520] },
      { id: 'lang-ha', name: 'Láng Hạ', at: [260, -1230] },
      ...this.city.stations.map(s => ({ id: s.id, name: `Ga ${s.name ?? ''}`.trim(), at: [s.at[0], s.at[1]] as [number, number] })),
    ];
  }

  private fly: { from: THREE.Vector3; to: THREE.Vector3; t0: number } | null = null;

  /** glide the view's middle to a point on the ground (the city model's x, y); switches back to the map if in showcase mode */
  flyTo(p: [number, number], exitShowcase = true) {
    if (exitShowcase && this.snap.showcase) this.setShowcase(null);
    const m = this.mounted;
    if (!m) return;
    this.fly = { from: m.controls.target.clone(), to: new THREE.Vector3(p[0], 0, p[1]), t0: performance.now() };
  }

  /** zoom in (k > 1) or out, round the middle of the view */
  zoom(k: number) {
    const m = this.mounted;
    if (!m) return;
    m.camera.zoom = Math.max(m.controls.minZoom, Math.min(m.controls.maxZoom, m.camera.zoom * k));
    m.camera.updateProjectionMatrix();
  }

  /** tilt up (+1) or down (3D only) */
  tilt(dir: 1 | -1) {
    if (!this.mounted || this.snap.mode !== '3d') return;
    this.startTurn(this.azimuth(), Math.max(0.15, Math.min(1.45, this.elevation() + dir * 0.18)));
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

  /** the view's middle stays within the area (and 60 m round it), or within the showcase plate */
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
    const b = this.city.bounds;
    const x = Math.max(b.x0 - 60, Math.min(b.x1 + 60, t.x)), z = Math.max(b.y0 - 60, Math.min(b.y1 + 60, t.z));
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
