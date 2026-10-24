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
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import {
  METRO, buildingHeight, metroTracks, roadNetwork, signalsAt, spawnTraffic, stepTraffic, streetFurniture, trafficLanes, trainAt, trainCount,
  type City, type Lane, type Signals, type Track, type TrainPhase, type Vehicle, type VehicleKind,
} from '@my-city/core';
import { Batch, type Surface } from '@render/batch';
import {
  MAX_FLAG_VIEW_SPAN_M, createWavingFlagGroup, flagpolesOf, isFlagVisibleAtSpan, stepSharedWavingFlags, type WavingFlagInstance,
} from '@render/buildings';
import {
  beaconsOf, buildLandmarkOverviewLayer, buildMapBaseLayers, buildTile, cityFloors, layerOf, tilesOf,
  type Detail, type Layer, type MapBaseLayers, type Tile,
} from '@render/city';
import { STREET_LAMPS, buildFurnitureCell, furnitureBuckets, signalLamp, type FurnitureBucket, type FurnitureCell } from '@render/furniture';
import { isHouseLamp, windowRank, windowShade, type Shade } from '@render/lights';
import { at as pathAt, carModel, stationLamp, type CarModel } from '@render/metro';
import { buildShowcase, showcasesOf, type BuiltShowcase, type ShowcaseItem } from '@render/showcase';
import { placeVehicle, vehicleModel, type VehicleModel, type VehiclePart } from '@render/vehicles';
import {
  HANOI_OUTER_BOUNDARY, WARD_BOUNDARIES, adminBoundaryModeForZoom, buildDashedBoundarySegments, mapZoomStage,
  type AdminBoundaryDef, type MapZoomStage,
} from '@render/adminBoundaries';
import {
  CELL_R, FLY_DURATION_MS, FRUSTUM, HOVER_MIN_PX_PER_METRE, HOVER_REGULAR_BLDG_MIN_PX_PER_METRE,
  HOVER_THROTTLE_MS, ISO_EL, MIN_ZOOM_TO_CURSOR_EL, MOVE_KEYS, ORBIT_RADIUS, PAN_BOUNDS_MARGIN,
  POV_CONFIG, POV_MODES, SEE_THROUGH, SHELL_VERT, STORAGE_KEYS, SURFACE_TOKEN, TURN_DURATION_MS, VEHICLE_KINDS,
  azFromHeading, azOf, headingFromAz, type PovMode,
} from './constants';
import { LOCALES, getLocale, setGlobalLocale, t, type Locale } from './i18n';
import { lightOn, loadLights, saveLights, type LightSettings } from './lights';
import {
  createPlaceLabelNode, createStreetLabelNode, createStreetPlaceEntry,
  renderHoverBannerDom, renderPopupCardDom, syncPopupBulbDom,
} from './overlayDom';
import {
  PLACE_INFO_MODES, buildPlaceCatalog, selectVisiblePlaceLabels,
  type PlaceCatalog, type PlaceEntry, type PlaceInfoMode,
} from './placeInfo';
import { PovController, type DriveControlKey } from './povController';
import { FAR, detailFor, farness, isMobileDevice, loadQuality, lowerLevel, saveQuality, type Quality } from './quality';
import { CityEventBus, type CityExtension, type CitySDK, type PopupActionDescriptor } from './sdk';
import { buildBuildingBoundsIndex, computeForegroundCut, type BldgBounds } from './seeThrough';
import {
  STREET_LABEL_MODES, buildStreetCatalog, selectVisibleStreetLabels,
  type ProjectedStreetLabel, type StreetEntry, type StreetLabelMode,
} from './streetLabels';
import { formatUrlState, frameForCity, parseUrlState } from './urlState';
import { projector } from '@my-city/osm-import';

export type Mode = '2d' | '3d';
export type Theme = 'dark' | 'light';

export interface PegmanDropPreview {
  kind: 'metro' | 'car';
  world: [number, number, number];
  screenX: number;
  screenY: number;
  trainIndex: number;
  label: string;
}

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
  /** see-through foreground buildings when zoomed in very close (default: true) */
  seeThrough: boolean;
  /** current UI and catalog language ('vi' | 'en') */
  locale: Locale;
  /** active camera viewpoint mode ('map' or immersive perspective / driving views) */
  povMode: PovMode;
  /** instantaneous speed (km/h) in POV / driving mode */
  povSpeedKmh: number;
  /** 1-based index of the currently boarded Metro train */
  povTrainIndex: number;
  /** total Metro trains operating across tracks */
  povTrainTotal: number;
  /** current Metro train motion phase */
  povTrainPhase: TrainPhase;
  /** passenger window side (1 = right, -1 = left) */
  povWindowSide: 1 | -1;
  /** current street or metro station name for POV HUD / mini-map */
  povLocationName: string;
}

interface TileState {
  tile: Tile;
  layers: Map<Detail, { layer: Layer; group: THREE.Group | null }>;
  shown: Detail | -1;
  cutKey: string;
  cutLayer: Layer | null;
  cutGroup: THREE.Group | null;
}

interface CellState {
  bucket: FurnitureBucket;
  cell: FurnitureCell | null;
  groups: { poles: THREE.Group; fixtures: THREE.Group; trees: THREE.Group; simple: THREE.Group } | null;
  wires: LineSegments2 | null;
  pulses: LineSegments2 | null;
  pools: THREE.Mesh | null;
}

interface Fleet {
  model: VehicleModel;
  meshes: THREE.InstancedMesh[];
  list: Vehicle[];
}

interface Train {
  track: Track;
  offset: number;
  cars: THREE.Group[];
  doors: THREE.MeshBasicMaterial;
  stopping: boolean;
}

const MAX_ACTIVE_VEHICLES = 900;
function spawnBoundedTraffic(lanes: readonly Lane[], density: number): Vehicle[] {
  const all = spawnTraffic(lanes, density);
  if (all.length <= MAX_ACTIVE_VEHICLES) return all;
  const stride = all.length / MAX_ACTIVE_VEHICLES;
  const out: Vehicle[] = [];
  for (let i = 0; i < MAX_ACTIVE_VEHICLES; i++) {
    out.push(all[Math.min(all.length - 1, Math.floor(i * stride))]!);
  }
  return out;
}

export class CityView {
  readonly baseLayers: MapBaseLayers;
  readonly base: Layer;
  readonly stationShell: Layer;
  readonly railTracks: Layer;
  private landmarkOverviewLayer: Layer | null = null;
  readonly tiles: TileState[];
  private readonly landmarkTileSet = new Set<TileState>();
  private readonly bldgBounds: BldgBounds[];
  readonly cells: CellState[];
  readonly floors: string[];
  readonly lanes: Lane[];
  readonly tracks: Track[];
  readonly showcases: ShowcaseItem[];
  readonly streetCatalog: StreetEntry[];
  placeCatalog: PlaceCatalog;
  readonly sdk: CitySDK;
  private readonly pov: PovController;
  private miniMapCanvas: HTMLCanvasElement | null = null;
  private readonly events = new CityEventBus();
  private readonly extensions = new Map<string, { ext: CityExtension; cleanup?: () => void }>();
  private readonly popupActions = new Map<string, PopupActionDescriptor>();
  private readonly customLayers = new Map<string, THREE.Object3D>();
  private readonly showcaseIdSet: ReadonlySet<string>;
  private readonly streetById = new Map<string, StreetEntry>();
  private readonly panBounds: { x0: number; y0: number; x1: number; y1: number };
  private readonly showcaseCache = new Map<string, BuiltShowcase>();
  private activeShowcase: { built: BuiltShowcase; beacons: THREE.Mesh[]; flags: WavingFlagInstance[]; doors: THREE.MeshBasicMaterial; shellGroup: THREE.Group | null } | null = null;
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
  private placeItems = new Map<string, { entry: PlaceEntry; x: number; y: number; anchorWorld?: [number, number, number]; offsetY?: number }>();
  private placeSig = '';
  private lastPlaceSelect = 0;
  private adminLayer: HTMLDivElement | null = null;
  private adminNodes = new Map<string, HTMLButtonElement>();
  private adminSig = '';
  private lastDistStep = 0;
  private hoveredPinKey: string | null = null;
  private hoverBanner: HTMLDivElement | null = null;
  private popupCard: HTMLDivElement | null = null;
  private myLocationMarker: HTMLDivElement | null = null;
  private myLocation: [number, number] | null = null;
  private activePopup: { entry: PlaceEntry; floor?: string } | null = null;
  private hoveredPlaceId: string | null = null;
  private readonly frame;
  private readonly northAz: number;
  private savedCam: { x: number; z: number; zoom: number; az: number; el: number; place: string | null };
  private urlCandidateSig = '';
  private urlSyncedSig = '';
  private urlDirtyAt = 0;
  private lastUrlWrite = 0;
  private mounted: {
    host: HTMLElement;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    mapGroup: THREE.Group;
    terrainGroup: THREE.Group;
    majorStreetsGroup: THREE.Group;
    localStreetsGroup: THREE.Group;
    metroBaseGroup: THREE.Group;
    tilesGroup: THREE.Group;
    furnitureGroup: THREE.Group;
    landmarkOverviewGroup: THREE.Group;
    stationShellGroup: THREE.Group;
    railTrackGroup: THREE.Group;
    wardBoundaryLines: LineSegments2;
    cityBoundaryLines: LineSegments2;
    showcaseGroup: THREE.Group;
    extensionGroup: THREE.Group;
    camera: THREE.OrthographicCamera;
    controls: OrbitControls;
    composer: EffectComposer | null;
    bloom: UnrealBloomPass | null;
    beacons: THREE.Mesh[];
    flags: WavingFlagInstance[];
    fleets: Map<VehicleKind, Fleet>;
    vehicleLines: LineSegments2;
    stop: () => void;
  } | null = null;
  private turn: { a0: number; a1: number; e0: number; e1: number; t0: number } | null = null;
  private sim = { t: 0, prev: null as Signals | null, phase: -1, slow: 0 };
  private readonly mats = {
    surface: new Map<Surface, THREE.MeshBasicMaterial>(),
    shell: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, res: { value: new THREE.Vector2(1, 1) } },
      vertexShader: SHELL_VERT,
      fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
      side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 24,
    }),
    crease: new LineMaterial({ linewidth: 1, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    baseCrease: new LineMaterial({ linewidth: 1, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    wardBoundary: new LineMaterial({ linewidth: 1.75, transparent: true, opacity: 0.78, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -12 }),
    cityBoundary: new LineMaterial({ linewidth: 2.4, transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -12 }),
    detail: new LineMaterial({ linewidth: 1, vertexColors: true, color: 0xffffff, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    wire: new LineMaterial({ linewidth: 1, transparent: true }),
    pulse: new LineMaterial({ linewidth: 2, dashed: true, dashSize: 0.8, gapSize: 23, transparent: true }),
    windows: new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    vehicle: Object.fromEntries((['body', 'top', 'glass', 'wheel', 'head', 'tail', 'sign'] as VehiclePart[]).map(p => { const onTop = p === 'glass' || p === 'head' || p === 'tail' || p === 'sign'; return [p, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: onTop ? -1 : 1, polygonOffsetUnits: onTop ? -1 : 1 })]; })) as Record<Exclude<VehiclePart, 'beam'>, THREE.MeshBasicMaterial>,
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
  private readonly vehicleShell = (() => {
    const m = this.mats.shell.clone();
    m.uniforms.res = this.mats.shell.uniforms.res!;
    return m;
  })();
  private farF = 0;
  private carModels: CarModel[] = [];
  private colors: Record<Shade, THREE.Color> = { off: new THREE.Color(), on: new THREE.Color(), hi: new THREE.Color(), dim: new THREE.Color() };
  private outline: Record<Shade, THREE.Color> = { off: new THREE.Color(), on: new THREE.Color(), hi: new THREE.Color(), dim: new THREE.Color() };

  constructor(readonly city: City) {
    this.frame = frameForCity(city.id);
    this.northAz = Math.PI / 2 + (this.frame.bearing * Math.PI) / 180;
    const stationShellB = new Batch();
    const railTracksB = new Batch();
    this.baseLayers = buildMapBaseLayers(city, stationShellB, railTracksB);
    this.base = this.baseLayers.terrain;
    this.stationShell = layerOf(stationShellB, true, city);
    this.railTracks = layerOf(railTracksB, true, city);
    this.layers.add(this.baseLayers.terrain);
    this.layers.add(this.baseLayers.majorStreets);
    this.layers.add(this.baseLayers.localStreets);
    this.layers.add(this.baseLayers.metro);
    this.layers.add(this.stationShell);
    this.layers.add(this.railTracks);
    this.floors = cityFloors(city);
    this.tiles = tilesOf(city).map(tile => ({ tile, layers: new Map(), shown: -1 as const, cutKey: '', cutLayer: null, cutGroup: null }));
    for (const t of this.tiles) {
      if (t.tile.buildings.some(b => b.model != null || buildingHeight(b) >= 28 || (Boolean(b.name) && buildingHeight(b) >= 16))) {
        this.landmarkTileSet.add(t);
      }
    }
    this.bldgBounds = buildBuildingBoundsIndex(this.tiles);
    const net = roadNetwork(city);
    this.cells = furnitureBuckets(streetFurniture(city, net)).map(bucket => ({ bucket, cell: null, groups: null, wires: null, pulses: null, pools: null }));
    this.lanes = trafficLanes(net);
    this.tracks = metroTracks(city);
    this.showcases = showcasesOf(city);
    this.showcaseIdSet = new Set(this.showcases.map(s => s.id));
    this.streetCatalog = buildStreetCatalog(city);
    for (const s of this.streetCatalog) this.streetById.set(s.id, s);
    const initLocale = getLocale();
    this.placeCatalog = buildPlaceCatalog(city, this.showcaseIdSet, initLocale);

    const b = city.bounds;
    let x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    for (const st of city.stations) {
      if (st.at[0] < x0) x0 = st.at[0];
      if (st.at[1] < y0) y0 = st.at[1];
      if (st.at[0] > x1) x1 = st.at[0];
      if (st.at[1] > y1) y1 = st.at[1];
    }
    this.panBounds = { x0, y0, x1, y1 };
    this.pov = new PovController(city, this.panBounds);
    for (const s of Object.keys(SURFACE_TOKEN) as Surface[]) {
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      this.mats.surface.set(s, mat);
    }

    let theme: Theme = 'light';
    try { if (localStorage.getItem('city3d-theme') === 'dark') theme = 'dark'; } catch { /* default */ }
    let streetLabels: StreetLabelMode = 'pin';
    try {
      const savedLbl = localStorage.getItem(STORAGE_KEYS.STREET_LABELS) as StreetLabelMode | null;
      if (savedLbl && STREET_LABEL_MODES.includes(savedLbl)) streetLabels = savedLbl;
    } catch { /* default */ }
    let placeInfo: PlaceInfoMode = 'popup';
    try {
      const savedPlace = localStorage.getItem(STORAGE_KEYS.PLACE_INFO) as PlaceInfoMode | null;
      if (savedPlace && PLACE_INFO_MODES.includes(savedPlace)) placeInfo = savedPlace;
    } catch { /* default */ }

    const initUrl = typeof window !== 'undefined' ? parseUrlState(window.location, this.frame) : null;
    if (initUrl?.night !== undefined) theme = initUrl.night ? 'dark' : 'light';
    if (initUrl?.streetLabels !== undefined) streetLabels = initUrl.streetLabels;
    if (initUrl?.placeInfo !== undefined) placeInfo = initUrl.placeInfo;
    const initMode: Mode = initUrl?.mode ?? '2d';
    const initHeading = initUrl?.heading ?? 0;
    const initView = (((Math.round(initHeading / 90) % 4) + 4) % 4) as Snapshot['view'];
    const initAz = initUrl?.heading !== undefined ? azFromHeading(initUrl.heading, this.northAz) : azOf(initView, this.northAz);
    const initEl = initUrl?.tilt !== undefined ? Math.max(0.05, Math.min(1.43, (initUrl.tilt * Math.PI) / 180)) : ISO_EL;
    const validShowcase = initUrl?.showcase && this.showcases.some(s => s.id === initUrl.showcase) ? initUrl.showcase : null;

    this.savedCam = {
      x: initUrl?.x ?? 0,
      z: initUrl?.z ?? 0,
      zoom: initUrl?.zoom ?? 1.4,
      az: initAz,
      el: initEl,
      place: initUrl?.place ?? null,
    };

    const quality = loadQuality();
    this.vehicles = spawnBoundedTraffic(this.lanes, quality.traffic);
    const sig = signalsAt(0);
    const totalTrains = this.tracks.reduce((acc, tr) => acc + trainCount(tr), 0);
    this.snap = {
      mode: initMode, view: initView, heading: Math.round(initHeading), theme, night: theme === 'dark', quality, detail: 1, pending: 0, fps: 0, lit: 0, floors: this.floors.length,
      vehicles: this.vehicles.length, signals: { x: sig.x, y: sig.y, xLeft: sig.xLeft, yLeft: sig.yLeft }, lowered: null, lights: loadLights(), stats: this.base.stats,
      showcase: validShowcase, streetLabels, placeInfo, seeThrough: initUrl?.seeThrough ?? true, locale: initLocale,
      povMode: 'map', povSpeedKmh: 0, povTrainIndex: 1, povTrainTotal: Math.max(1, totalTrains), povTrainPhase: 'run', povWindowSide: 1, povLocationName: '',
    };

    this.sdk = this.createSDK();
  }

  private createSDK(): CitySDK {
    const sdk: CitySDK = {
      events: this.events,
      getCity: () => this.city,
      getSnapshot: () => this.snap,
      getLocale: () => this.snap.locale,
      setLocale: locale => this.setLocale(locale),
      flyTo: pt => this.flyTo(pt),
      setZoom: zoom => {
        const m = this.mounted;
        if (!m) return;
        m.camera.zoom = Math.max(m.controls.minZoom, Math.min(m.controls.maxZoom, zoom));
        m.camera.updateProjectionMatrix();
      },
      setMode: mode => this.setMode(mode),
      getPovMode: () => this.snap.povMode,
      setPovMode: mode => this.setPovMode(mode),
      setNight: night => {
        this.setNight(night);
        this.setTheme(night ? 'dark' : 'light');
      },
      setSeeThrough: on => this.setSeeThrough(on),
      setShowcase: id => this.setShowcase(id),
      openPlace: id => {
        const entry = this.placeCatalog.byId.get(id);
        if (!entry) return false;
        this.openPopup(entry);
        return true;
      },
      closePopup: () => this.closePopup(),
      getPlace: id => this.placeCatalog.byId.get(id),
      searchPlaces: query => {
        const q = query.trim().toLowerCase();
        if (!q) return [...this.placeCatalog.labels];
        const out: PlaceEntry[] = [];
        for (const entry of this.placeCatalog.byId.values()) {
          if (entry.name.toLowerCase().includes(q) || entry.address.toLowerCase().includes(q)) {
            out.push(entry);
          }
        }
        return out;
      },
      setLamp: (id, on) => this.setLamp(id, on),
      addCustomLayer: (id, object) => {
        const prev = this.customLayers.get(id);
        if (prev && this.mounted) this.mounted.extensionGroup.remove(prev);
        this.customLayers.set(id, object);
        if (this.mounted) this.mounted.extensionGroup.add(object);
      },
      removeCustomLayer: id => {
        const obj = this.customLayers.get(id);
        if (!obj) return;
        this.customLayers.delete(id);
        if (this.mounted) this.mounted.extensionGroup.remove(obj);
      },
      registerPopupAction: action => {
        this.popupActions.set(action.id, action);
        if (this.activePopup) this.renderPopupContent();
        return () => {
          this.popupActions.delete(action.id);
          if (this.activePopup) this.renderPopupContent();
        };
      },
      getPopupActions: () => Array.from(this.popupActions.values()),
      use: extension => {
        if (this.extensions.has(extension.id)) this.sdk.unuse(extension.id);
        if (extension.popupActions) {
          for (const act of extension.popupActions) this.popupActions.set(act.id, act);
        }
        const cleanup = this.mounted && extension.onMount ? (extension.onMount(sdk) ?? undefined) : undefined;
        this.extensions.set(extension.id, { ext: extension, ...(cleanup ? { cleanup } : {}) });
        if (this.activePopup) this.renderPopupContent();
        return () => this.sdk.unuse(extension.id);
      },
      unuse: extensionId => {
        const rec = this.extensions.get(extensionId);
        if (!rec) return;
        this.extensions.delete(extensionId);
        if (rec.ext.popupActions) {
          for (const act of rec.ext.popupActions) this.popupActions.delete(act.id);
        }
        try { rec.cleanup?.(); } catch { /* ignore */ }
        try { rec.ext.onUnmount?.(sdk); } catch { /* ignore */ }
        if (this.activePopup) this.renderPopupContent();
      },
      getExtensions: () => Array.from(this.extensions.values(), r => r.ext),
      on: (event, handler) => this.events.on(event, handler),
      off: (event, handler) => this.events.off(event, handler),
    };
    return sdk;
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
    const onLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    const mapGroup = new THREE.Group();
    const showcaseGroup = new THREE.Group();
    const extensionGroup = new THREE.Group();
    showcaseGroup.visible = false;
    for (const obj of this.customLayers.values()) extensionGroup.add(obj);
    scene.add(mapGroup, showcaseGroup, extensionGroup);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 7000);
    const target = new THREE.Vector3(this.savedCam.x, 0, this.savedCam.z);
    camera.zoom = this.savedCam.zoom;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.18;
    controls.panSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.minZoom = 0.075; controls.maxZoom = 60;
    controls.minPolarAngle = 0.05; controls.maxPolarAngle = 1.43;
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
    this.place(camera, controls, this.savedCam.az, this.savedCam.el);

    const terrainGroup = this.group(this.baseLayers.terrain, true);
    const majorStreetsGroup = this.group(this.baseLayers.majorStreets, true);
    const localStreetsGroup = this.group(this.baseLayers.localStreets, true);
    const metroBaseGroup = this.group(this.baseLayers.metro, true);
    const tilesGroup = new THREE.Group();
    const furnitureGroup = new THREE.Group();
    const landmarkOverviewGroup = new THREE.Group();
    landmarkOverviewGroup.visible = false;
    const stationShellGroup = this.group(this.stationShell, false);
    const railTrackGroup = this.group(this.railTracks, false);
    railTrackGroup.visible = this.snap.quality.houseDetail >= 3 || this.pov.isActive();
    const wardBoundaryLines = new LineSegments2(
      new LineSegmentsGeometry().setPositions(buildDashedBoundarySegments(WARD_BOUNDARIES, 0.6, 26, 16)),
      this.mats.wardBoundary,
    );
    wardBoundaryLines.frustumCulled = false;
    wardBoundaryLines.visible = false;
    const cityBoundaryLines = new LineSegments2(
      new LineSegmentsGeometry().setPositions(buildDashedBoundarySegments([HANOI_OUTER_BOUNDARY], 0.85, 72, 44)),
      this.mats.cityBoundary,
    );
    cityBoundaryLines.frustumCulled = false;
    cityBoundaryLines.visible = false;
    mapGroup.add(
      terrainGroup,
      majorStreetsGroup,
      localStreetsGroup,
      metroBaseGroup,
      tilesGroup,
      furnitureGroup,
      landmarkOverviewGroup,
      stationShellGroup,
      railTrackGroup,
      wardBoundaryLines,
      cityBoundaryLines,
    );
    for (const t of this.tiles) {
      for (const v of t.layers.values()) v.group = null;
      t.shown = -1;
      t.cutKey = '';
      t.cutGroup = null;
    }
    for (const c of this.cells) { c.groups = null; c.wires = null; c.pulses = null; c.pools = null; }
    const beacons = beaconsOf(this.city).map(p => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff); b.position.copy(p); mapGroup.add(b); return b; });
    const flags = flagpolesOf(this.city).map(spec => {
      const f = createWavingFlagGroup(spec);
      mapGroup.add(f.group);
      return f;
    });
    const fleets = new Map<VehicleKind, Fleet>();
    for (const kind of VEHICLE_KINDS) {
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
    this.pov.mountPlayerCar(mapGroup, this.mats.vehicle, this.mats.beam, this.vehicleShell, this.mats.crease);

    // Helper to raycast against buildings, stations, parks, lakes, and monuments
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
    const flyToClient = (clientX: number, clientY: number) => {
      if (this.pov.isActive()) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.activeCamera());
      if (ray.ray.intersectPlane(ground, hitPt)) this.flyTo([hitPt.x, hitPt.z], false);
    };
    const pickAtClient = (clientX: number, clientY: number): { owner: string; floor?: string; point: THREE.Vector3 } | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.activeCamera());
      const pickable: THREE.Object3D[] = [];
      if (this.snap.showcase) {
        showcaseGroup.traverse(o => { if (o.userData.surface && o.visible && o.parent?.visible !== false) pickable.push(o); });
      } else {
        if (tilesGroup.visible) {
          for (const t of this.tiles) {
            const g = t.cutGroup?.visible ? t.cutGroup : (t.shown >= 0 ? t.layers.get(t.shown as Detail)?.group : null);
            if (g?.visible) for (const o of g.children) if (o.userData.surface) pickable.push(o);
          }
        }
        if (landmarkOverviewGroup.visible) {
          landmarkOverviewGroup.traverse(o => { if (o.userData.surface && o.visible) pickable.push(o); });
        }
        if (stationShellGroup.visible) for (const o of stationShellGroup.children) if (o.userData.surface) pickable.push(o);
        for (const grp of [metroBaseGroup, terrainGroup, majorStreetsGroup, localStreetsGroup]) {
          if (grp.visible) for (const o of grp.children) if (o.userData.surface) pickable.push(o);
        }
      }
      const hits = ray.intersectObjects(pickable, false);
      for (const hit of hits) {
        if (hit.faceIndex == null) continue;
        const surface = hit.object.userData.surface as Surface;
        const layer = hit.object.userData.layer as Layer;
        const owner = layer.ownerOf(surface, hit.faceIndex);
        if (owner) {
          const floor = layer.floorAt(owner, hit.point);
          return { owner, ...(floor ? { floor } : {}), point: hit.point };
        }
      }
      return null;
    };

    const onDbl = (e: MouseEvent) => {
      const pinHit = this.hitLabelAtClient(e.clientX, e.clientY);
      if (pinHit) {
        if (pinHit.kind === 'place') {
          this.openPopup(pinHit.entry);
          if (!this.pov.isActive()) this.flyTo(pinHit.entry.ground, false);
        } else {
          this.openStreetPopup(pinHit.street, pinHit.item.world);
        }
        return;
      }
      if (!this.snap.showcase && this.snap.placeInfo !== 'off') {
        const picked = pickAtClient(e.clientX, e.clientY);
        if (picked) {
          const entry = this.placeCatalog.byId.get(picked.owner);
          if (entry) {
            this.openPopup(entry, picked.floor);
            return;
          }
        }
      }
      flyToClient(e.clientX, e.clientY);
    };

    let down: [number, number] | null = null;
    let povDragPrev: [number, number] | null = null;
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
      if (this.pov.isActive()) return;
      if (e.touches.length === 2 && touchGesture && this.snap.mode === '2d') {
        const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
        const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
        let dAng = Math.atan2(dy, dx) - touchGesture.ang0;
        while (dAng > Math.PI) dAng -= 2 * Math.PI;
        while (dAng < -Math.PI) dAng += 2 * Math.PI;
        if (Math.abs(dAng) > 0.24) {
          this.setMode('3d');
          touchGesture = null;
        }
      }
    };
    const onTouchEnd = () => { touchGesture = null; };
    const onWheel = () => {
      controls.zoomToCursor = this.elevation() >= MIN_ZOOM_TO_CURSOR_EL;
    };
    const onDown = (e: PointerEvent) => {
      controls.zoomToCursor = e.pointerType === 'mouse' && this.elevation() >= MIN_ZOOM_TO_CURSOR_EL;
      down = [e.clientX, e.clientY];
      if (this.pov.isActive()) {
        povDragPrev = [e.clientX, e.clientY];
      }
    };

    let lastHoverTime = 0;
    const onMove = (e: PointerEvent) => {
      if (this.pov.isActive() && povDragPrev && (e.buttons !== 0 || e.pointerType === 'touch')) {
        const dx = e.clientX - povDragPrev[0];
        const dy = e.clientY - povDragPrev[1];
        povDragPrev = [e.clientX, e.clientY];
        this.pov.addLookDelta(dx, dy);
        return;
      }
      if (e.pointerType !== 'mouse' || this.interacting || (e.buttons & 7) !== 0) return;
      if (this.snap.showcase) {
        this.hideHoverBanner();
        this.clearHoveredPin();
        return;
      }
      const now = performance.now();
      if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
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

      const px = this.pov.isActive() ? 8 : this.pxPerMetre();
      if (this.snap.placeInfo === 'off' || px < HOVER_MIN_PX_PER_METRE) {
        this.hideHoverBanner();
        renderer.domElement.style.cursor = '';
        return;
      }
      const picked = pickAtClient(e.clientX, e.clientY);
      const entry = picked ? this.placeCatalog.byId.get(picked.owner) : undefined;
      if (!entry || (entry.category === 'building' && entry.tier > 1 && px < HOVER_REGULAR_BLDG_MIN_PX_PER_METRE)) {
        this.hideHoverBanner();
        renderer.domElement.style.cursor = picked?.floor ? 'pointer' : '';
        return;
      }
      renderer.domElement.style.cursor = 'pointer';
      const r = host.getBoundingClientRect();
      this.showHoverBanner(entry, e.clientX - r.left, e.clientY - r.top, picked?.floor);
    };
    const onLeave = () => {
      povDragPrev = null;
      this.hideHoverBanner();
      this.clearHoveredPin();
      renderer.domElement.style.cursor = '';
    };

    const onUp = (e: PointerEvent) => {
      povDragPrev = null;
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
            return;
          }
          if (!this.snap.showcase && this.snap.placeInfo !== 'off') {
            const pickedDbl = pickAtClient(e.clientX, e.clientY);
            if (pickedDbl) {
              const entry = this.placeCatalog.byId.get(pickedDbl.owner);
              if (entry) {
                this.openPopup(entry, pickedDbl.floor);
                return;
              }
            }
          }
          flyToClient(e.clientX, e.clientY);
          return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      if (pinHit) {
        if (pinHit.kind === 'place') {
          this.openPopup(pinHit.entry);
        } else if (!this.pov.isActive()) {
          this.flyTo(pinHit.item.world, false);
        }
        return;
      }
      const picked = pickAtClient(e.clientX, e.clientY);
      if (!picked) {
        if (this.activePopup) this.closePopup();
        return;
      }
      if (picked.floor) {
        this.setLamp(picked.floor, !this.lit.has(picked.floor));
        this.syncPopupBulb();
        return;
      }
      const st = this.city.stations.find(s => s.id === picked.owner);
      if (st) {
        const lid = stationLamp(st);
        this.setLamp(lid, !this.lit.has(lid));
        this.syncPopupBulb();
      }
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
      this.mounted?.composer?.setSize(w, h);
      camera.left = (-FRUSTUM * a) / 2; camera.right = (FRUSTUM * a) / 2; camera.top = FRUSTUM / 2; camera.bottom = -FRUSTUM / 2;
      camera.updateProjectionMatrix();
      this.pov.resize(w, h);
      this.resolution();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0, frames = 0, t0 = performance.now(), last = t0, lastPovTelSync = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const povActive = this.pov.isActive();
      if (!povActive) {
        this.animate(now);
        this.keysMove(dt);
        this.syncLowCamera();
        controls.update();
        this.stabilizeCamera();
        this.keepInside();
      }
      this.syncForegroundCut();
      this.zoomFade();
      const blink = this.snap.night && Math.floor(now / 700) % 2 === 0;
      const flagTime = now / 1000;
      if (this.snap.showcase) {
        if (this.activeShowcase) {
          for (const b of this.activeShowcase.beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
          if (this.activeShowcase.flags.length > 0) stepSharedWavingFlags(flagTime);
        }
      } else {
        this.trafficStep(dt);
        if (povActive) {
          const camPos = this.activeCamera().position;
          let anyFlagVis = false;
          for (const f of flags) {
            const vis = Math.hypot(f.spec.polePos[0] - camPos.x, f.spec.polePos[1] - camPos.z) <= MAX_FLAG_VIEW_SPAN_M;
            f.group.visible = vis;
            if (vis) anyFlagVis = true;
          }
          if (anyFlagVis) stepSharedWavingFlags(flagTime);
          const tel = this.pov.step(dt, this.sim.t, this.trains, this.nightOn('beam'));
          if (this.miniMapCanvas) {
            this.pov.drawMiniMap(this.miniMapCanvas, this.trains, this.sim.t);
          }
          if (
            now - lastPovTelSync > 120 &&
            (tel.speedKmh !== this.snap.povSpeedKmh ||
              tel.trainIndex !== this.snap.povTrainIndex ||
              tel.trainPhase !== this.snap.povTrainPhase ||
              tel.windowSide !== this.snap.povWindowSide ||
              tel.locationName !== this.snap.povLocationName)
          ) {
            lastPovTelSync = now;
            this.update({
              povSpeedKmh: tel.speedKmh,
              povTrainIndex: tel.trainIndex,
              povTrainTotal: tel.trainTotal,
              povTrainPhase: tel.trainPhase,
              povWindowSide: tel.windowSide,
              povLocationName: tel.locationName,
            });
          }
        } else {
          const showFlags = isFlagVisibleAtSpan(FRUSTUM / camera.zoom);
          for (const f of flags) f.group.visible = showFlags;
          if (showFlags) stepSharedWavingFlags(flagTime);
        }
        this.detailStep();
        if (!this.interacting || now - this.lastDistStep > 120) {
          this.lastDistStep = now;
          this.distanceStep();
        }
        for (const b of beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
        this.mats.pulse.dashOffset -= dt * 9;
      }
      this.streetLabelsStep();
      this.placeInfoStep();
      this.adminBoundariesStep();
      this.myLocationStep();
      this.syncUrlState(now);
      for (const { ext } of this.extensions.values()) {
        try { ext.onTick?.(dt, this.sdk); } catch { /* isolate extension errors */ }
      }
      this.events.emit('tick', { dt, now });
      if (this.mounted) {
        if (this.mounted.bloom?.enabled && this.mounted.composer) this.mounted.composer.render();
        else this.mounted.renderer.render(scene, this.activeCamera());
      }
      if (!povActive) {
        const az = Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);
        const heading = Math.round(headingFromAz(az, this.northAz)) % 360;
        const view = (((Math.round(heading / 90) % 4) + 4) % 4) as Snapshot['view'];
        if (heading !== this.snap.heading || view !== this.snap.view) {
          this.update({ heading, view });
        }
      }
      frames++;
      if (now - t0 > 500) {
        const fps = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now;
        if (fps !== this.snap.fps) this.update({ fps });
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

    const adminLayer = document.createElement('div');
    adminLayer.className = 'admin-boundary-labels';
    host.appendChild(adminLayer);
    this.adminLayer = adminLayer;
    this.adminNodes.clear();
    this.adminSig = '';

    const myLocEl = document.createElement('div');
    myLocEl.className = 'my-location-marker';
    myLocEl.style.display = 'none';
    myLocEl.innerHTML = '<span class="my-location-halo"></span><span class="my-location-dot"></span>';
    host.appendChild(myLocEl);
    this.myLocationMarker = myLocEl;

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

    const onPopState = () => this.applyUrlFromLocation();
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);

    this.mounted = {
      host,
      renderer,
      scene,
      mapGroup,
      terrainGroup,
      majorStreetsGroup,
      localStreetsGroup,
      metroBaseGroup,
      tilesGroup,
      furnitureGroup,
      landmarkOverviewGroup,
      stationShellGroup,
      railTrackGroup,
      wardBoundaryLines,
      cityBoundaryLines,
      showcaseGroup,
      extensionGroup,
      camera,
      controls,
      composer: null,
      bloom: null,
      beacons,
      flags,
      fleets,
      vehicleLines,
      stop: () => {
        cancelAnimationFrame(raf); ro.disconnect();
        window.removeEventListener('popstate', onPopState);
        window.removeEventListener('hashchange', onPopState);
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
    if (typeof window !== 'undefined') window.MyCitySDK = this.sdk;
    for (const rec of this.extensions.values()) {
      try {
        const cleanup = rec.ext.onMount?.(this.sdk);
        if (cleanup) rec.cleanup = cleanup;
      } catch { /* ignore */ }
    }
    this.events.emit('ready', { city: this.city });

    this.applyMode(this.snap.mode, false);
    this.applyQuality(this.snap.quality);
    this.applyTheme(this.snap.theme);
    resize();
    // Build only the closest visible tiles synchronously so initial mount is instantaneous
    if (this.currentZoomStage() === 'full') {
      const first = Math.min(1, this.wantedDetail()) as Detail;
      const closestTiles = [...this.tiles]
        .filter(t => this.nearTile(t))
        .sort((a, b) => dist2(a.tile.center, controls.target) - dist2(b.tile.center, controls.target))
        .slice(0, 12);
      for (const t of closestTiles) {
        this.show(t, this.ensure(t, first));
        this.syncTileVisibility(t, true);
      }
    }
    this.houseLights(false);
    this.streetLamps();
    for (const st of this.city.stations) this.setLamp(stationLamp(st, 'board'), true, false);
    this.distanceStep(true);
    this.nightThings();
    if (this.snap.showcase) {
      this.savedMapCam = { target: new THREE.Vector3(this.savedCam.x, 0, this.savedCam.z), zoom: this.savedCam.zoom };
      this.mountShowcase(this.snap.showcase);
    } else {
      this.update({ stats: this.shownStats() });
      if (this.savedCam.place) this.openPlaceById(this.savedCam.place);
    }
    this.streetLabelsStep(true);
    this.placeInfoStep(true);
    this.adminBoundariesStep(true);
    this.syncUrlState(performance.now(), true);
    raf = requestAnimationFrame(tick);
  }

  unmount() {
    const m = this.mounted;
    if (!m) return;
    if (!this.snap.showcase) {
      this.savedCam = {
        x: m.controls.target.x,
        z: m.controls.target.z,
        zoom: m.camera.zoom,
        az: this.azimuth(),
        el: this.elevation(),
        place: this.activePopup?.entry.id ?? this.savedCam.place,
      };
    }
    for (const rec of this.extensions.values()) {
      try { rec.cleanup?.(); } catch { /* ignore */ }
      rec.cleanup = undefined;
    }
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
    this.adminLayer?.remove();
    this.adminLayer = null;
    this.adminNodes.clear();
    this.adminSig = '';
    this.myLocationMarker?.remove();
    this.myLocationMarker = null;
    this.hoverBanner?.remove();
    this.hoverBanner = null;
    this.popupCard?.remove();
    this.popupCard = null;
    this.activePopup = null;

    // Free all per-mount GPU & ArrayBuffer allocations (prevents StrictMode & HMR memory exhaustion)
    this.pov.unmountPlayerCar(m.mapGroup);
    m.wardBoundaryLines.geometry.dispose();
    m.cityBoundaryLines.geometry.dispose();
    m.vehicleLines.geometry.dispose();
    for (const f of m.fleets.values()) {
      for (const o of f.meshes) o.dispose();
      for (const g of f.model.parts.values()) g.dispose();
      f.model.shell.dispose();
    }
    m.fleets.clear();
    for (const b of m.beacons) b.geometry.dispose();
    for (const tr of this.trains) {
      tr.doors.dispose();
      for (const car of tr.cars) {
        for (const child of car.children) {
          if (child instanceof LineSegments2) child.geometry.dispose();
        }
      }
    }
    this.trains = [];

    m.controls.dispose();
    m.composer?.dispose();
    m.bloom?.dispose();
    m.renderer.dispose();
    m.renderer.forceContextLoss();
    m.renderer.domElement.remove();
    this.mounted = null;
  }

  /** Full teardown for HMR reload so all cached Layer and CarModel ArrayBuffers are released */
  dispose() {
    this.unmount();
    const disposeLayer = (l: Layer) => {
      for (const g of l.surfaces.values()) g.dispose();
      l.shell.dispose();
      l.creases.dispose();
      l.details.dispose();
      l.windows.dispose();
    };
    for (const l of this.layers) disposeLayer(l);
    this.layers.clear();
    for (const t of this.tiles) {
      t.layers.clear();
      if (t.cutLayer) {
        disposeLayer(t.cutLayer);
        t.cutLayer = null;
      }
    }
    for (const c of this.cells) {
      if (c.cell) {
        c.cell.wires.dispose();
        c.cell.pools.dispose();
        c.cell = null;
      }
    }
    for (const cm of this.carModels) {
      if (!cm) continue;
      for (const g of cm.parts.values()) g.dispose();
      cm.shell.dispose();
    }
    this.carModels = [];
  }

  // ---------- commands ----------
  private activeCamera(): THREE.Camera {
    return this.pov.isActive() ? this.pov.camera : this.mounted!.camera;
  }

  setMiniMapCanvas(canvas: HTMLCanvasElement | null) {
    this.miniMapCanvas = canvas;
    if (canvas && this.pov.isActive()) {
      this.pov.drawMiniMap(canvas, this.trains, this.sim.t);
    }
  }

  /** Immediately build L1 for any unbuilt tiles visible from the POV camera so the city is never empty */
  private ensurePovVisibleTiles() {
    if (!this.mounted || !this.pov.isActive()) return;
    for (const t of this.tiles) {
      const vis = this.pov.isTileVisibleInPov(t.tile.center, t.tile.radius, this.landmarkTileSet.has(t));
      if (vis && t.shown < 1) {
        this.show(t, this.ensure(t, 1));
      }
      this.syncTileVisibility(t, vis);
    }
  }

  setMode(mode: Mode) {
    if (this.pov.isActive()) this.setPovMode('map');
    this.update({ mode });
    this.applyMode(mode, true);
    this.events.emit('mode:change', { mode });
  }
  toggleMode() { this.setMode(this.snap.mode === '2d' ? '3d' : '2d'); }

  setPovMode(povMode: PovMode, keepSelection = false) {
    if (povMode === this.snap.povMode && !keepSelection) return;
    if (povMode !== 'map' && this.snap.showcase) {
      this.setShowcase(null);
    }
    this.hideHoverBanner();
    this.closePopup();
    this.held.clear();
    const m = this.mounted;
    const mapTarget = m ? { x: m.controls.target.x, z: m.controls.target.z } : { x: this.savedCam.x, z: this.savedCam.z };
    this.pov.setMode(povMode, this.trains, mapTarget, this.sim.t, keepSelection);
    if (m) {
      m.controls.enabled = !this.pov.isActive();
      m.railTrackGroup.visible = this.snap.quality.houseDetail >= 3 || this.pov.isActive();
      if (povMode === 'map') {
        for (const t of this.tiles) this.syncTileVisibility(t, this.nearTile(t) && t.shown >= 0);
      } else {
        this.pov.step(0, this.sim.t, this.trains, this.nightOn('beam'));
        this.ensurePovVisibleTiles();
      }
      this.syncForegroundCut();
      this.applyBloom();
      this.zoomFade(true);
      this.detailStep();
      this.distanceStep(true);
    }
    const tel = this.pov.getTelemetry();
    this.update({
      povMode,
      povSpeedKmh: tel.speedKmh,
      povTrainIndex: tel.trainIndex,
      povTrainTotal: tel.trainTotal,
      povTrainPhase: tel.trainPhase,
      povWindowSide: tel.windowSide,
      povLocationName: tel.locationName,
    });
    this.streetLabelsStep(true);
    this.placeInfoStep(true);
    this.events.emit('pov:change', { povMode });
  }

  cyclePovMode() {
    const idx = POV_MODES.indexOf(this.snap.povMode);
    const next = POV_MODES[(idx + 1) % POV_MODES.length]!;
    this.setPovMode(next);
  }

  nextPovTrain() {
    this.pov.nextTrain(this.trains);
    const tel = this.pov.step(0, this.sim.t, this.trains, this.nightOn('beam'));
    this.ensurePovVisibleTiles();
    this.syncForegroundCut();
    this.update({
      povTrainIndex: tel.trainIndex,
      povTrainTotal: tel.trainTotal,
      povTrainPhase: tel.trainPhase,
      povLocationName: tel.locationName,
    });
  }

  togglePovWindowSide() {
    this.pov.toggleWindowSide();
    const tel = this.pov.step(0, this.sim.t, this.trains, this.nightOn('beam'));
    this.update({ povWindowSide: tel.windowSide });
  }

  toggleDriveCamera() {
    if (!this.pov.isDriving()) return;
    const m = this.mounted;
    const mapTarget = m ? { x: m.controls.target.x, z: m.controls.target.z } : { x: this.savedCam.x, z: this.savedCam.z };
    const next = this.pov.toggleDriveCamera(this.trains, mapTarget);
    this.update({ povMode: next });
    this.events.emit('pov:change', { povMode: next });
  }

  resetPovCar() {
    const m = this.mounted;
    const mapTarget = m ? { x: m.controls.target.x, z: m.controls.target.z } : { x: 0, z: 0 };
    this.pov.resetCarNear(mapTarget.x, mapTarget.z);
    const tel = this.pov.step(0, this.sim.t, this.trains, this.nightOn('beam'));
    this.ensurePovVisibleTiles();
    this.update({ povLocationName: tel.locationName, povSpeedKmh: 0 });
  }

  centerPovLook() {
    this.pov.centerLook();
  }

  setDriveTouchControl(control: DriveControlKey, active: boolean) {
    this.pov.setTouchControl(control, active);
  }

  setLocale(locale: Locale) {
    if (locale === this.snap.locale) return;
    setGlobalLocale(locale);
    this.placeCatalog = buildPlaceCatalog(this.city, this.showcaseIdSet, locale);
    this.update({ locale });
    if (this.placeLayer) {
      this.placeLayer.replaceChildren();
      this.placeNodes.clear();
      this.placeItems.clear();
      this.placeSig = '';
    }
    if (this.activePopup) {
      const updated = this.placeCatalog.byId.get(this.activePopup.entry.id);
      if (updated) this.activePopup.entry = updated;
      this.renderPopupContent();
    }
    this.placeInfoStep(true);
    this.events.emit('locale:change', { locale });
  }

  toggleLocale() {
    const idx = LOCALES.indexOf(this.snap.locale);
    const next = LOCALES[(idx + 1) % LOCALES.length]!;
    this.setLocale(next);
  }

  /** switch between the full city map (id = null) and a standalone diorama showcase on an iso-glow base plate */
  setShowcase(id: string | null) {
    if (id === this.snap.showcase) return;
    if (id && this.pov.isActive()) this.setPovMode('map');
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
      this.events.emit('showcase:change', { showcase: null });
      return;
    }
    if (m && !this.snap.showcase) {
      this.savedMapCam = { target: m.controls.target.clone(), zoom: m.camera.zoom };
    }
    this.mountShowcase(id);
    this.streetLabelsStep(true);
    this.placeInfoStep(true);
    this.events.emit('showcase:change', { showcase: id });
  }

  private mountShowcase(id: string) {
    let built = this.showcaseCache.get(id);
    if (!built) {
      const next = buildShowcase(this.city, id);
      if (!next) return;
      built = next;
      this.showcaseCache.set(id, built);
      this.layers.add(built.layer);
      if (built.shellLayer) this.layers.add(built.shellLayer);
    }
    const m = this.mounted;
    const doors = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const beacons: THREE.Mesh[] = [];
    const flags: WavingFlagInstance[] = [];
    this.activeShowcase = { built, beacons, flags, doors, shellGroup: null };
    if (id.startsWith('station:')) {
      for (const st of this.city.stations) this.setLamp(stationLamp(st, 'edge'), true, false);
    }
    if (m) {
      m.mapGroup.visible = false;
      m.showcaseGroup.clear();
      m.showcaseGroup.visible = true;
      m.showcaseGroup.add(this.group(built.layer));
      if (built.shellLayer) {
        const shellGroup = this.group(built.shellLayer);
        shellGroup.visible = !(this.snap.seeThrough && built.item.zoom >= SEE_THROUGH.SHOWCASE_MIN_ZOOM);
        m.showcaseGroup.add(shellGroup);
        this.activeShowcase.shellGroup = shellGroup;
        this.paintLayer(built.shellLayer);
      }
      const poolMesh = new THREE.Mesh(built.pools, this.mats.pool);
      poolMesh.userData.night = 'pool';
      m.showcaseGroup.add(poolMesh);
      for (const p of built.beacons) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff);
        b.position.copy(p);
        m.showcaseGroup.add(b);
        beacons.push(b);
      }
      for (const spec of built.flags) {
        const f = createWavingFlagGroup(spec);
        m.showcaseGroup.add(f.group);
        flags.push(f);
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

  /** turn by 90° around True North (Bắc -> Đông -> Nam -> Tây); in 3D, turn too, keeping the tilt */
  rotate(dir: 1 | -1) {
    if (!this.mounted || this.pov.isActive()) return;
    const az = this.azimuth(), k = Math.round((this.northAz - az) / (Math.PI / 2)) + dir;
    this.startTurn(azOf(k, this.northAz), this.snap.mode === '2d' ? ISO_EL : this.elevation());
  }

  /** Smoothly rotate the camera back to True Geographic North (0° Bắc) */
  resetNorth() {
    if (!this.mounted) return;
    if (this.pov.isActive()) {
      this.pov.centerLook();
      return;
    }
    const curHeading = headingFromAz(this.azimuth(), this.northAz);
    const alreadyNorth = curHeading <= 1.2 || curHeading >= 358.8;
    const targetEl = this.snap.mode === '2d' || alreadyNorth ? ISO_EL : this.elevation();
    this.startTurn(azOf(0, this.northAz), targetEl);
  }

  /** Fly to the user's current position (GPS if inside Hanoi bounds, otherwise Ngã tư Thái Hà – Tây Sơn [0, 0]) and show a pulsing dot */
  goToMyLocation() {
    const applyLoc = (pt: [number, number]) => {
      this.myLocation = pt;
      this.flyTo(pt);
      const m = this.mounted;
      if (m && m.camera.zoom < 1.85) {
        m.camera.zoom = 2.15;
        m.camera.updateProjectionMatrix();
      }
      this.myLocationStep();
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const toXY = projector(this.frame);
          const [x, z] = toXY(pos.coords.latitude, pos.coords.longitude);
          const b = this.panBounds;
          const inside =
            x >= b.x0 - 400 &&
            x <= b.x1 + 400 &&
            z >= b.y0 - 400 &&
            z <= b.y1 + 400;
          applyLoc(inside ? [x, z] : [0, 0]);
        },
        () => applyLoc([0, 0]),
        { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 },
      );
    } else {
      applyLoc([0, 0]);
    }
  }

  private myLocationStep() {
    const m = this.mounted, el = this.myLocationMarker;
    if (!m || !el) return;
    if (!this.myLocation || this.snap.showcase || this.pov.isActive()) {
      if (el.style.display !== 'none') el.style.display = 'none';
      return;
    }
    const w = m.host.clientWidth, h = m.host.clientHeight;
    const tmp = new THREE.Vector3(this.myLocation[0], 0.4, this.myLocation[1]).project(m.camera);
    const vis = tmp.z >= -1 && tmp.z <= 1;
    if (!vis) {
      el.style.display = 'none';
      return;
    }
    const sx = (tmp.x * 0.5 + 0.5) * w;
    const sy = (-tmp.y * 0.5 + 0.5) * h;
    el.style.display = '';
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
  }

  /** Raycast a Pegman drag position `(clientX, clientY)` onto the map to preview Metro vs Street Car drop target */
  previewPegmanDrop(clientX: number, clientY: number): PegmanDropPreview | null {
    const m = this.mounted;
    if (!m || this.snap.showcase) return null;
    const rect = m.renderer.domElement.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.activeCamera());

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const viaductPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10.5);
    const hitGnd = new THREE.Vector3();
    const hitVia = new THREE.Vector3();
    if (!ray.ray.intersectPlane(groundPlane, hitGnd)) return null;
    if (!ray.ray.intersectPlane(viaductPlane, hitVia)) hitVia.copy(hitGnd);

    const b = this.panBounds;
    const clampX = (v: number) => Math.max(b.x0, Math.min(b.x1, v));
    const clampZ = (v: number) => Math.max(b.y0, Math.min(b.y1, v));

    const target = this.pov.findPegmanTarget(
      [clampX(hitGnd.x), clampZ(hitGnd.z)],
      [clampX(hitVia.x), clampZ(hitVia.z)],
      this.trains,
      this.sim.t,
    );

    const proj = new THREE.Vector3(target.world[0], target.world[2], target.world[1]).project(this.activeCamera());
    const screenX = (proj.x * 0.5 + 0.5) * rect.width;
    const screenY = (-proj.y * 0.5 + 0.5) * rect.height;

    return {
      kind: target.kind,
      world: target.world,
      screenX,
      screenY,
      trainIndex: target.trainIndex,
      label: target.label,
    };
  }

  /** Drop Pegman at `(clientX, clientY)`: enters `'metro-cab'` on the nearest train if dropped on Metro, or `'drive-cabin'` on the street */
  dropPegmanAt(clientX: number, clientY: number): boolean {
    const preview = this.previewPegmanDrop(clientX, clientY);
    if (!preview) return false;
    const m = this.mounted;
    if (preview.kind === 'metro') {
      this.pov.selectTrainIndex(preview.trainIndex, this.trains);
      this.setPovMode('metro-cab', true);
      return true;
    }
    const camForward = m
      ? Math.atan2(m.controls.target.z - m.camera.position.z, m.controls.target.x - m.camera.position.x)
      : undefined;
    this.pov.spawnCarAtDrop(preview.world[0], preview.world[1], camForward);
    this.setPovMode('drive-cabin', true);
    return true;
  }

  setTheme(theme: Theme) {
    this.update({ theme });
    try { localStorage.setItem('city3d-theme', theme); } catch { /* not remembered */ }
    this.applyTheme(theme);
    this.events.emit('theme:change', { theme, night: this.snap.night });
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
    if (!lowered) saveQuality(q);
    if (traffic) this.respawn();
    this.applyQuality(q);
  }

  setStreetLabels(streetLabels: StreetLabelMode) {
    if (streetLabels === this.snap.streetLabels) return;
    this.update({ streetLabels });
    try { localStorage.setItem(STORAGE_KEYS.STREET_LABELS, streetLabels); } catch { /* not remembered */ }
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
    try { localStorage.setItem(STORAGE_KEYS.PLACE_INFO, placeInfo); } catch { /* not remembered */ }
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

  setSeeThrough(seeThrough: boolean) {
    if (seeThrough === this.snap.seeThrough) return;
    this.update({ seeThrough });
    this.syncForegroundCut();
  }

  toggleSeeThrough() {
    this.setSeeThrough(!this.snap.seeThrough);
  }

  private streetLabelsStep(force = false) {
    const m = this.mounted, layer = this.labelLayer;
    if (!m || !layer) return;
    const mode = this.snap.streetLabels;
    const povActive = this.pov.isActive();
    const stage = this.currentZoomStage();
    if (this.snap.showcase || mode === 'off' || povActive || stage === 'city') {
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
    const activeCam = this.activeCamera();
    const focus = m.controls.target;
    const cp = activeCam.position;
    const sig = `${mode}|${this.snap.povMode}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}|${activeCam.quaternion.y.toFixed(3)}`;
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
      tmp.set(world[0], world[2], world[1]).project(activeCam);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    const now = performance.now();
    if (this.interacting && !force && this.labelItems.size > 0 && now - this.lastLabelSelect < 140) {
      for (const [key, item] of this.labelItems) {
        const node = this.labelNodes.get(key);
        if (!node) continue;
        const scr = project([item.world[0], item.world[1], 0.4]);
        node.style.display = scr.visible ? '' : 'none';
        if (!scr.visible) continue;
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
      [focus.x, focus.z],
      project,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.id}`;
      keepIds.add(key);
      this.labelItems.set(key, item);
      let btn = this.labelNodes.get(key);
      if (!btn) {
        btn = createStreetLabelNode(item, mode);
        layer.appendChild(btn);
        this.labelNodes.set(key, btn);
      }
      btn.style.display = '';

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
    const activeCam = this.activeCamera();
    const povActive = this.pov.isActive();
    const stage = this.currentZoomStage();
    const focus = povActive ? this.pov.getFocusPoint() : m.controls.target;
    const tmp = new THREE.Vector3();
    const project = (world: [number, number, number]) => {
      tmp.set(world[0], world[2], world[1]).project(activeCam);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    if (popupEl && this.activePopup && !this.snap.showcase && !povActive) {
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

    if (this.snap.showcase || mode === 'off' || povActive || stage === 'streets' || stage === 'city') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.placeNodes.clear();
        this.placeItems.clear();
        this.placeSig = 'off';
      }
      return;
    }

    const cp = activeCam.position;
    const sig = `${mode}|${this.snap.povMode}|${this.snap.locale}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}|${activeCam.quaternion.y.toFixed(3)}|${this.activePopup?.entry.id ?? ''}`;
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
    if ((this.interacting || povActive) && !force && this.placeItems.size > 0 && now - this.lastPlaceSelect < 140) {
      for (const [key, item] of this.placeItems) {
        const node = this.placeNodes.get(key);
        if (!node) continue;
        const scr = project(item.anchorWorld ?? item.entry.world);
        node.style.display = scr.visible ? '' : 'none';
        if (!scr.visible) continue;
        item.x = scr.x;
        item.y = scr.y + (item.offsetY ?? 0);
        node.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      return;
    }
    this.lastPlaceSelect = now;

    const visible = selectVisiblePlaceLabels(
      this.placeCatalog,
      mode,
      povActive ? 8.5 : this.pxPerMetre(),
      w,
      h,
      [focus.x, focus.z],
      project,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.entry.id}`;
      keepIds.add(key);
      this.placeItems.set(key, { entry: item.entry, x: item.x, y: item.y, anchorWorld: item.anchorWorld, offsetY: item.offsetY });
      let btn = this.placeNodes.get(key);
      if (!btn) {
        btn = createPlaceLabelNode(item.entry, mode);
        layer.appendChild(btn);
        this.placeNodes.set(key, btn);
      }
      btn.style.display = '';

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

  private createAdminLabelNode(def: AdminBoundaryDef, mode: 'ward' | 'city'): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-boundary-badge is-${mode}`;
    const title = document.createElement('span');
    title.className = 'admin-boundary-title';
    title.textContent = def.name;
    btn.appendChild(title);
    if (def.subtitle) {
      const sub = document.createElement('span');
      sub.className = 'admin-boundary-sub';
      sub.textContent = def.subtitle;
      btn.appendChild(sub);
    }
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this.flyTo([def.center[0], def.center[1]], false);
      if (this.mounted && mode === 'city' && this.mounted.camera.zoom < 0.45) {
        this.mounted.camera.zoom = 0.55;
        this.mounted.camera.updateProjectionMatrix();
      } else if (this.mounted && mode === 'ward' && this.mounted.camera.zoom < 1.1) {
        this.mounted.camera.zoom = 1.25;
        this.mounted.camera.updateProjectionMatrix();
      }
    });
    return btn;
  }

  private adminBoundariesStep(force = false) {
    const m = this.mounted, layer = this.adminLayer;
    if (!m || !layer) return;
    const povActive = this.pov.isActive();
    const mode = adminBoundaryModeForZoom(m.camera.zoom, Boolean(this.snap.showcase), povActive);
    m.wardBoundaryLines.visible = mode === 'ward';
    m.cityBoundaryLines.visible = mode === 'city';

    if (mode === 'off') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.adminNodes.clear();
        this.adminSig = 'off';
      }
      return;
    }

    const w = m.host.clientWidth, h = m.host.clientHeight;
    const activeCam = this.activeCamera();
    const focus = m.controls.target;
    const cp = activeCam.position;
    const sig = `${mode}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}`;
    if (!force && sig === this.adminSig) return;
    this.adminSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.adminNodes.clear();
    }

    const defs: readonly AdminBoundaryDef[] = mode === 'city' ? [HANOI_OUTER_BOUNDARY] : WARD_BOUNDARIES;
    const tmp = new THREE.Vector3();
    const keepIds = new Set<string>();
    const padX = mode === 'city' ? 80 : 56;
    const padY = mode === 'city' ? 60 : 44;

    for (const def of defs) {
      tmp.set(def.center[0], mode === 'city' ? 6 : 2.5, def.center[1]).project(activeCam);
      const sx = (tmp.x * 0.5 + 0.5) * w;
      const sy = (-tmp.y * 0.5 + 0.5) * h;
      const inBounds = tmp.z >= -1 && tmp.z <= 1 && sx >= padX && sx <= w - padX && sy >= padY && sy <= h - padY;
      if (!inBounds) continue;

      keepIds.add(def.id);
      let node = this.adminNodes.get(def.id);
      if (!node) {
        node = this.createAdminLabelNode(def, mode);
        layer.appendChild(node);
        this.adminNodes.set(def.id, node);
      }
      node.style.display = '';
      node.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }

    for (const [id, node] of this.adminNodes) {
      if (!keepIds.has(id)) {
        node.remove();
        this.adminNodes.delete(id);
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

  private openStreetPopup(street: StreetEntry, world: [number, number]) {
    const cityName = this.city.cityName ?? this.city.name.split(':')[0]?.trim() ?? '';
    const entry = createStreetPlaceEntry(street, world, cityName, this.snap.locale);
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
    const floorTag = floorNum && Number.isFinite(floorNum) ? ` · ${t('popup.floor', { floor: floorNum }, this.snap.locale)}` : '';
    const sig = `${entry.id}|${floorTag}|${this.snap.locale}`;
    if (this.hoveredPlaceId !== sig) {
      this.hoveredPlaceId = sig;
      renderHoverBannerDom(banner, entry, floorTag, this.snap.locale);
      this.events.emit('place:hover', { entry, ...(floor ? { floor } : {}) });
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
    if (this.hoveredPlaceId !== null) {
      this.hoveredPlaceId = null;
      this.events.emit('place:hover', { entry: null });
    }
  }

  private openPopup(entry: PlaceEntry, floor?: string) {
    this.hideHoverBanner();
    this.activePopup = { entry, ...(floor ? { floor } : {}) };
    this.savedCam.place = entry.id;
    this.renderPopupContent();
    this.placeInfoStep(true);
    this.events.emit('place:select', { entry, ...(floor ? { floor } : {}) });
  }

  closePopup() {
    this.activePopup = null;
    this.savedCam.place = null;
    if (this.popupCard) {
      this.popupCard.style.display = 'none';
      this.popupCard.replaceChildren();
    }
    this.placeInfoStep(true);
    this.events.emit('place:select', { entry: null });
  }

  private isEntryLit(entry: PlaceEntry): boolean {
    if (entry.buildingId) {
      const prefix = `${entry.buildingId}#`;
      return this.floors.some(f => f.startsWith(prefix) && this.lit.has(f));
    }
    if (entry.category === 'station') {
      const stId = entry.id.startsWith('station:') ? entry.id.slice('station:'.length) : entry.id;
      const st = this.city.stations.find(s => s.id === stId);
      if (st) return this.lit.has(stationLamp(st));
    }
    return false;
  }

  private toggleEntryLamps(entry: PlaceEntry) {
    if (entry.buildingId) {
      const prefix = `${entry.buildingId}#`;
      const list = this.floors.filter(f => f.startsWith(prefix));
      if (!list.length) return;
      const turnOn = !list.some(f => this.lit.has(f));
      for (const f of list) this.setLamp(f, turnOn, false);
      this.update({ lit: this.countLit() });
      return;
    }
    if (entry.category === 'station') {
      const stId = entry.id.startsWith('station:') ? entry.id.slice('station:'.length) : entry.id;
      const st = this.city.stations.find(s => s.id === stId);
      if (st) {
        const lid = stationLamp(st);
        this.setLamp(lid, !this.lit.has(lid));
      }
    }
  }

  private syncPopupBulb() {
    const popupEl = this.popupCard, active = this.activePopup;
    if (!popupEl || !active) return;
    syncPopupBulbDom(popupEl, this.isEntryLit(active.entry), this.snap.locale);
  }

  private renderPopupContent() {
    const popupEl = this.popupCard, active = this.activePopup;
    if (!popupEl || !active) return;
    renderPopupCardDom({
      popupEl,
      entry: active.entry,
      ...(active.floor ? { floor: active.floor } : {}),
      isLit: this.isEntryLit(active.entry),
      locale: this.snap.locale,
      sdk: this.sdk,
      customActions: Array.from(this.popupActions.values()),
      onToggleLamps: () => {
        this.toggleEntryLamps(active.entry);
        this.syncPopupBulb();
      },
      onClose: () => this.closePopup(),
      onOpenShowcase: scId => this.setShowcase(scId),
    });
  }

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

  private ambient = 0;

  private houseLights(ease: boolean) {
    this.timers.forEach(clearTimeout); this.timers = [];
    const L = this.snap.lights, target = lightOn(L.house, this.snap.night) ? L.share : 0, from = this.ambient;
    const steps = ease && Math.abs(target - from) > 0.01 ? 10 : 1;
    for (let i = 1; i <= steps; i++) {
      const go = () => { this.ambient = from + ((target - from) * i) / steps; for (const l of this.layers) this.paintLayer(l); };
      if (steps === 1) go(); else this.timers.push(setTimeout(go, i * 50));
    }
  }

  private streetLamps() {
    const on = lightOn(this.snap.lights.street, this.snap.night);
    this.setLamp(STREET_LAMPS, on, false);
    for (const st of this.city.stations) this.setLamp(stationLamp(st), on, false);
    this.syncPopupBulb();
  }

  private activeFloors() { return this.activeShowcase?.built.floors.length ? this.activeShowcase.built.floors : this.floors; }

  private countLit() { return this.activeFloors().reduce((n, f) => n + (this.lit.has(f) ? 1 : 0), 0); }

  toggleAll() {
    const list = this.activeFloors();
    const on = !list.some(f => this.lit.has(f));
    for (const f of list) this.setLamp(f, on, false);
    this.update({ lit: this.countLit() });
    this.syncPopupBulb();
  }

  private held = new Set<string>();

  keyUp(e: KeyboardEvent) {
    this.held.delete(e.key.toLowerCase());
    this.pov.handleKeyUp(e.key);
  }

  key(e: KeyboardEvent): boolean {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.activePopup) {
        this.closePopup();
        return true;
      }
      if (this.pov.isActive()) {
        this.setPovMode('map');
        return true;
      }
    }
    if (k === 'p') {
      this.cyclePovMode();
      return true;
    }
    if (this.pov.isActive()) {
      if (k === 'tab' && this.pov.isMetro()) {
        e.preventDefault();
        this.nextPovTrain();
        return true;
      }
      if (k === 'v' && this.pov.isDriving()) {
        this.toggleDriveCamera();
        return true;
      }
      if (this.pov.handleKeyDown(e.key)) {
        if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
        return true;
      }
    } else if (MOVE_KEYS[k]) {
      this.held.add(k);
      return true;
    }
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
      case 'x': this.toggleSeeThrough(); return true;
      case ' ': this.toggleAll(); return true;
      default: return false;
    }
  }

  // ---------- traffic ----------
  private respawn() {
    this.vehicles = spawnBoundedTraffic(this.lanes, this.snap.quality.traffic);
    const m = this.mounted;
    if (m) {
      for (const [kind, f] of m.fleets) {
        f.list = this.vehicles.filter(v => v.kind === kind);
        if (f.list.length > (f.meshes[0]?.instanceMatrix.count ?? 0)) this.fleetMeshes(f, m.mapGroup);
        for (const o of f.meshes) o.count = f.list.length;
      }
      m.vehicleLines.geometry.dispose();
      m.vehicleLines.geometry = this.linesFor(m.fleets);
      this.tiers(m.scene); this.nightThings();
    }
  }

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

  private linesFor(fleets: Map<VehicleKind, Fleet>): LineSegmentsGeometry {
    let n = 0;
    for (const f of fleets.values()) n += f.list.length * f.model.lines.length;
    // Cap to ~650 simultaneously visible vehicles' crease lines (~1.4 MB instead of ~40 MB)
    const cap = Math.min(Math.max(6, n), 360_000);
    return new LineSegmentsGeometry().setPositions(new Float32Array(cap));
  }

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

  private trainStep() {
    const stage = this.currentZoomStage();
    const hide = !this.pov.isActive() && (stage !== 'full' || (this.snap.quality.autoDetail && this.pxPerMetre() < FAR.vehicles));
    const lit = new Set<string>();
    for (const tr of this.trains) {
      if (hide) { for (const g of tr.cars) g.visible = false; continue; }
      const { head, phase } = trainAt(tr.track, this.sim.t + tr.offset), L = tr.track.length;
      tr.cars.forEach((g, i) => {
        const s = head === null ? NaN : head - METRO.carLen / 2 - i * (METRO.carLen + METRO.gap);
        if (!(s > -METRO.carLen / 2 && s < L + METRO.carLen / 2)) { g.visible = false; return; }
        const { p, h } = pathAt(tr.track.path, Math.max(0, Math.min(L, s)));
        g.visible = !g.userData.hiddenByPov;
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

  private trainColors() {
    const css = getComputedStyle(document.documentElement), tok = (n: string) => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff');
    const tMat = this.mats.train, night = this.snap.night;
    tMat.body.color = tok('--body'); tMat.top.color = tok('--deck'); tMat.glass.color = tok('--glass');
    tMat.win.color = tok(night ? '--accent' : '--recess'); tMat.head.color = tok(night ? '--accent-hi' : '--detail');
    for (const tr of this.trains) tr.doors.color = tok(tr.stopping ? '--accent-hi' : '--recess');
    if (this.activeShowcase) this.activeShowcase.doors.color = tok('--accent-hi');
  }

  private trafficStep(dt: number) {
    const m = this.mounted;
    if (!m) return;
    this.sim.t += dt;
    this.trainStep();
    const povActive = this.pov.isActive();
    const stage = this.currentZoomStage();
    if (!povActive && (stage !== 'full' || (this.snap.quality.autoDetail && this.pxPerMetre() < FAR.vehicles))) return;
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
    const far = this.snap.quality.viewDistance, c = m.controls.target, mat = new THREE.Matrix4();
    const drawLines = m.vehicleLines.visible;
    const buf = (m.vehicleLines.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute).data, arr = buf.array as Float32Array, maxLineFloats = arr.length, e = mat.elements;
    let k = 0;
    for (const f of m.fleets.values()) {
      const local = f.model.lines;
      let vis = 0;
      for (let i = 0; i < f.list.length; i++) {
        const v = f.list[i]!;
        const lane = this.lanes[v.lane]!;
        const p0 = lane.path[0]!;
        if (!povActive && far > 0 && (Math.abs(p0[0] - c.x) > far + 650 || Math.abs(p0[1] - c.z) > far + 650)) continue;
        placeVehicle(v, lane, mat);
        const vx = e[12]!, vz = e[14]!;
        const out = povActive
          ? !this.pov.isPointVisibleInPov(vx, vz, 4, POV_CONFIG.CULL_VEHICLE_DIST)
          : far > 0 && Math.hypot(vx - c.x, vz - c.z) > far;
        if (out) continue;
        for (const o of f.meshes) o.setMatrixAt(vis, mat);
        vis++;
        if (drawLines && k + local.length <= maxLineFloats) {
          for (let j = 0; j < local.length; j += 3, k += 3) {
            const x = local[j]!, y = local[j + 1]!, z = local[j + 2]!;
            arr[k] = e[0]! * x + e[4]! * y + e[8]! * z + vx;
            arr[k + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
            arr[k + 2] = e[2]! * x + e[6]! * y + e[10]! * z + vz;
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

  // ---------- view distance, progressive zoom stages, and auto quality ----------
  private currentZoomStage(): MapZoomStage {
    const m = this.mounted;
    const zoom = m ? m.camera.zoom : this.savedCam.zoom;
    return mapZoomStage(zoom, Boolean(this.snap.showcase), this.pov.isActive());
  }

  private ensureLandmarkOverviewGroup() {
    const m = this.mounted;
    if (!m) return;
    if (!this.landmarkOverviewLayer) {
      this.landmarkOverviewLayer = buildLandmarkOverviewLayer(this.city, 1);
      this.layers.add(this.landmarkOverviewLayer);
      this.paintLayer(this.landmarkOverviewLayer);
    }
    if (m.landmarkOverviewGroup.children.length === 0) {
      m.landmarkOverviewGroup.add(this.group(this.landmarkOverviewLayer));
    }
  }

  private syncZoomStageVisibility(stage: MapZoomStage) {
    const m = this.mounted;
    if (!m) return;
    if (stage === 'landmarks') {
      this.ensureLandmarkOverviewGroup();
    }
    m.terrainGroup.visible = true;
    m.majorStreetsGroup.visible = stage !== 'city';
    m.localStreetsGroup.visible = stage === 'full';
    m.metroBaseGroup.visible = stage === 'full' || stage === 'landmarks';
    m.tilesGroup.visible = stage === 'full';
    m.furnitureGroup.visible = stage === 'full';
    m.landmarkOverviewGroup.visible = stage === 'landmarks';
    m.railTrackGroup.visible = stage === 'full' && (this.snap.quality.houseDetail >= 3 || this.pov.isActive());
    if (stage === 'streets' || stage === 'city') {
      m.stationShellGroup.visible = false;
    }
    const showBeacons = stage === 'full' || stage === 'landmarks';
    for (const b of m.beacons) b.visible = showBeacons;
  }

  private tileRange() {
    const m = this.mounted, far = this.snap.quality.viewDistance;
    if (!m) return 520;
    const el = Math.max(0.12, this.elevation());
    const elScale = Math.min(2.0, Math.sin(ISO_EL) / Math.max(0.25, Math.sin(el)));
    const viewportRadius = (FRUSTUM / m.camera.zoom) * 0.92 * elScale + 90;
    return far > 0 ? Math.min(Math.max(far, 720), viewportRadius) : viewportRadius;
  }

  private nearTile(t: TileState) {
    const m = this.mounted;
    if (!m) return true;
    if (this.pov.isActive()) {
      return this.pov.isTileVisibleInPov(t.tile.center, t.tile.radius, this.landmarkTileSet.has(t));
    }
    const far = this.tileRange(), c = m.controls.target;
    return Math.hypot(t.tile.center[0] - c.x, t.tile.center[1] - c.z) - t.tile.radius <= far;
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
      this.mounted.furnitureGroup.add(s.groups.poles, s.groups.fixtures, s.groups.trees, s.groups.simple, s.wires, s.pulses, s.pools);
      for (const l of [cell.poles, cell.fixtures, cell.trees, cell.simpleTrees]) this.paintLayer(l);
    }
  }

  private syncTileVisibility(t: TileState, visible: boolean) {
    const v = t.shown >= 0 ? t.layers.get(t.shown as Detail) : undefined;
    if (t.cutKey && t.cutGroup) {
      if (v?.group) v.group.visible = false;
      t.cutGroup.visible = visible;
    } else {
      if (t.cutGroup) t.cutGroup.visible = false;
      if (v?.group) v.group.visible = visible;
    }
  }

  private distanceStep(initial = false) {
    const m = this.mounted;
    if (!m) return;
    const povActive = this.pov.isActive();
    const stage = this.currentZoomStage();
    this.syncZoomStageVisibility(stage);
    if (!povActive && stage !== 'full') return;

    const q = this.snap.quality, far = q.viewDistance, tFar = this.tileRange(), c = m.controls.target;
    const near = (p: [number, number], r: number, lim = far) => lim <= 0 || Math.hypot(p[0] - c.x, p[1] - c.z) - r <= lim;
    for (const t of this.tiles) {
      if (povActive) {
        const vis = this.pov.isTileVisibleInPov(t.tile.center, t.tile.radius, this.landmarkTileSet.has(t));
        this.syncTileVisibility(t, vis);
        continue;
      }
      const inRange = near(t.tile.center, t.tile.radius, tFar);
      this.syncTileVisibility(t, inRange && t.shown >= 0);
    }
    const px = this.pxPerMetre(), showFurn = povActive || !(q.autoDetail && px < FAR.furniture);
    const trees = this.treeLook();
    const needCell = showFurn || trees !== 'off';
    let built = 0;
    const maxBuild = initial || povActive ? 8 : this.interacting ? 0 : 2;
    const cellLim = far > 0 ? Math.min(far, tFar) : tFar;
    for (const s of this.cells) {
      const on = povActive
        ? this.pov.isPointVisibleInPov(s.bucket.center[0], s.bucket.center[1], CELL_R, POV_CONFIG.CULL_FURN_DIST)
        : near(s.bucket.center, CELL_R, cellLim);
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
    if (this.sim.slow < 6) return;
    this.sim.slow = 0;
    const lower = lowerLevel(q);
    if (lower) this.setQuality(lower, lower.level);
  }

  // ---------- detail levels and tiles ----------
  private wantedDetail(): Detail {
    if (this.pov.isActive()) return this.snap.quality.houseDetail;
    const m = this.mounted;
    const px = m ? (m.host.clientHeight * m.camera.zoom) / FRUSTUM : 4;
    return detailFor(px, this.snap.quality);
  }

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
      this.mounted.tilesGroup.add(v.group);
      this.paintLayer(v.layer);
    }
    return level;
  }

  private show(t: TileState, level: Detail) {
    if (t.shown === level) return;
    for (const [l, v] of t.layers) if (v.group) v.group.visible = l === level && !t.cutKey;
    t.shown = level;
  }

  private detailStep() {
    const m = this.mounted;
    if (!m) return;
    const povActive = this.pov.isActive();
    const stage = this.currentZoomStage();
    this.syncZoomStageVisibility(stage);
    if (!povActive && stage !== 'full') {
      if (this.snap.pending !== 0) this.update({ pending: 0, stats: this.shownStats() });
      return;
    }

    const want = this.wantedDetail();
    const focus = povActive ? this.pov.getFocusPoint() : m.controls.target;
    const waiting: { t: TileState; level: Detail }[] = [], unbuilt: TileState[] = [];
    for (const t of this.tiles) {
      if (!this.nearTile(t)) {
        this.syncTileVisibility(t, false);
        continue;
      }
      const tileWant = povActive ? this.pov.tileDetailInPov(t.tile.center, want) : want;
      if (t.layers.has(tileWant)) {
        this.show(t, this.ensure(t, tileWant));
        this.syncTileVisibility(t, true);
      } else if (t.shown < 0) {
        unbuilt.push(t);
        if (tileWant > 0) waiting.push({ t, level: tileWant });
      } else {
        this.syncTileVisibility(t, true);
        waiting.push({ t, level: tileWant });
      }
    }
    if (unbuilt.length) {
      unbuilt.sort((a, b) => dist2XZ(a.tile.center, focus) - dist2XZ(b.tile.center, focus));
      const l0Budget = this.interacting ? 3 : isMobileDevice() ? 5 : 8;
      for (let i = 0; i < Math.min(l0Budget, unbuilt.length); i++) {
        const t = unbuilt[i]!;
        this.show(t, this.ensure(t, povActive ? 1 : 0));
        this.syncTileVisibility(t, true);
      }
    }
    const busy = !povActive && (this.interacting || performance.now() < this.interactCooldown);
    if (waiting.length && !busy) {
      waiting.sort((a, b) => dist2XZ(a.t.tile.center, focus) - dist2XZ(b.t.tile.center, focus));
      const budget = povActive ? 4 : want <= 1 ? 3 : 2;
      for (let i = 0; i < Math.min(budget, waiting.length); i++) {
        const item = waiting[i]!;
        this.show(item.t, this.ensure(item.t, item.level));
        this.syncTileVisibility(item.t, true);
      }
    }
    const pending = busy ? waiting.length : Math.max(0, waiting.length - (povActive ? 4 : want <= 1 ? 3 : 2));
    if (want !== this.snap.detail || pending !== this.snap.pending) this.update({ detail: want, pending, stats: this.shownStats() });
  }

  private shownStats(): Layer['stats'] {
    if (this.activeShowcase) return { ...this.activeShowcase.built.layer.stats };
    const s = { ...this.baseLayers.terrain.stats };
    const add = (l: Layer) => { s.triangles += l.stats.triangles; s.lines += l.stats.lines; s.windows += l.stats.windows; };
    const m = this.mounted;
    if (!m || m.majorStreetsGroup.visible) add(this.baseLayers.majorStreets);
    if (!m || m.localStreetsGroup.visible) add(this.baseLayers.localStreets);
    if (!m || m.metroBaseGroup.visible) add(this.baseLayers.metro);
    if (m?.stationShellGroup.visible !== false) add(this.stationShell);
    if (m?.railTrackGroup.visible) add(this.railTracks);
    if (m?.landmarkOverviewGroup.visible && this.landmarkOverviewLayer) {
      add(this.landmarkOverviewLayer);
    }
    if (!m || m.tilesGroup.visible) {
      for (const t of this.tiles) {
        if (t.cutKey && t.cutLayer && t.cutGroup?.visible) {
          add(t.cutLayer);
          continue;
        }
        const v = t.shown >= 0 ? t.layers.get(t.shown as Detail) : undefined;
        if (v?.layer && v.group?.visible) add(v.layer);
      }
    }
    if (!m || m.furnitureGroup.visible) {
      for (const c of this.cells) if (c.cell && c.groups?.fixtures.visible) {
        add(c.cell.fixtures);
        if (this.snap.quality.wires) add(c.cell.poles);
        if (this.snap.quality.trees === 'full') add(c.cell.trees);
      }
    }
    return s;
  }

  private group(layer: Layer, isBase = false): THREE.Group {
    const g = new THREE.Group();
    for (const [s, geo] of layer.surfaces) {
      const mesh = new THREE.Mesh(geo, this.mats.surface.get(s)!);
      mesh.userData = { surface: s, layer };
      g.add(mesh);
    }
    const shell = new THREE.Mesh(layer.shell, this.mats.shell); shell.userData.tier = 'silhouette';
    const creases = new LineSegments2(layer.creases, isBase ? this.mats.baseCrease : this.mats.crease);
    creases.userData.tier = isBase ? 'streetLines' : 'creases';
    const details = new LineSegments2(layer.details, this.mats.detail); details.userData.tier = 'details';
    const windows = new THREE.Mesh(layer.windows, this.mats.windows); windows.userData.tier = 'windows';
    g.add(shell, creases, details, windows);
    this.tiers(g);
    return g;
  }

  private tiers(g: THREE.Object3D) {
    const q = this.snap.quality, auto = q.autoDetail && !this.snap.showcase, px = this.pxPerMetre();
    g.traverse(o => {
      const tier = o.userData.tier as (keyof Quality | 'streetLines') | undefined;
      if (!tier) return;
      let on = tier === 'streetLines' ? q.creases : (q[tier] as boolean);
      if (auto && on) {
        if (tier === 'details' && px < FAR.details) on = false;
        else if (tier === 'creases' && px < FAR.creases) on = false;
        else if (tier === 'streetLines' && px < FAR.streetLines) on = false;
        else if (tier === 'silhouette' && px < FAR.silhouette) on = false;
        else if (tier === 'windows' && px < 1.8) on = false;
      }
      o.visible = on;
    });
  }

  private nightThings() {
    const m = this.mounted;
    if (m) m.scene.traverse(o => { const k = o.userData.night; if (k) o.visible = this.nightOn(k as string); });
    this.zoomFade(true);
    const css = getComputedStyle(document.documentElement);
    this.vehicleColors(n => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff'));
    this.trainColors();
  }

  private poolsOn() { return lightOn(this.snap.lights.street, this.snap.night) && this.snap.theme === 'dark'; }

  private vehicleColors(tok: (n: string) => THREE.Color) {
    const v = this.mats.vehicle, night = lightOn(this.snap.lights.vehicle, this.snap.night);
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
    if (notify) {
      this.update({ lit: this.countLit() });
      this.events.emit('building:lightToggle', { id, on });
    }
  }

  private paint(layer: Layer, id: string) {
    const ranges = layer.lamps.get(id);
    if (!ranges) return;
    const fill = layer.windows.getAttribute('color') as THREE.BufferAttribute, floor = this.lit.has(id), share = isHouseLamp(id) ? this.ambient : 0;
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
    this.mats.baseCrease.color = tok('--line');
    this.mats.wardBoundary.color = tok('--accent');
    this.mats.cityBoundary.color = tok('--accent-hi');
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
    if (m.composer) {
      m.composer.dispose();
      m.composer = null;
    }
    m.railTrackGroup.visible = q.houseDetail >= 3 || this.pov.isActive();
    this.tiers(m.scene);
    this.nightThings();
    this.resolution();
    this.applyBloom();
    this.zoomFade(true);
    this.distanceStep();
  }

  private resolution() {
    const m = this.mounted;
    if (!m) return;
    const res = m.renderer.getDrawingBufferSize(new THREE.Vector2());
    for (const l of [this.mats.crease, this.mats.baseCrease, this.mats.wardBoundary, this.mats.cityBoundary, this.mats.detail, this.mats.wire, this.mats.pulse]) l.resolution.copy(res);
    (this.mats.shell.uniforms.res!.value as THREE.Vector2).copy(res);
  }

  private applyBloom() {
    const m = this.mounted;
    if (!m) return;
    const g = this.snap.lights.glow;
    const want = this.snap.quality.bloom && this.snap.theme === 'dark' && g > 0;
    if (!want) {
      if (m.bloom) m.bloom.enabled = false;
      if (m.composer) {
        m.composer.dispose();
        m.composer = null;
      }
      if (m.bloom) {
        m.bloom.dispose();
        m.bloom = null;
      }
      return;
    }
    if (!m.bloom) {
      m.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.35, 0.5);
    }
    if (!m.composer) {
      const target = new THREE.WebGLRenderTarget(1, 1, { samples: this.snap.quality.msaa ? 4 : 0, type: THREE.HalfFloatType });
      m.composer = new EffectComposer(m.renderer, target);
      m.composer.addPass(new RenderPass(m.scene, this.activeCamera()));
      m.composer.addPass(m.bloom);
      m.composer.addPass(new OutputPass());
      m.composer.setSize(m.host.clientWidth, m.host.clientHeight);
    } else {
      const renderPass = m.composer.passes[0] as RenderPass | undefined;
      if (renderPass) renderPass.camera = this.activeCamera();
    }
    m.bloom.enabled = true;
    m.bloom.strength = 0.45 * g;
    m.bloom.radius = 0.3;
    m.bloom.threshold = 0.55;
  }

  // ---------- zoomed out: less of the small things (ADR-044, ADR-049) ----------
  private far = '';

  private pxPerMetre() {
    if (this.pov.isActive()) return 10;
    const m = this.mounted;
    return m ? (m.host.clientHeight * m.camera.zoom) / FRUSTUM : 4;
  }

  private zoomFade(force = false) {
    const m = this.mounted;
    if (!m) return;
    const stage = this.currentZoomStage();
    const px = this.pxPerMetre(), auto = this.snap.quality.autoDetail && !this.snap.showcase && !this.pov.isActive();
    const f = !auto ? 0 : Math.round(farness(px, this.snap.quality) * 20) / 20;
    const key = `${stage}|${f}|${this.snap.povMode}|${px < FAR.vehicleLines}|${px < FAR.bikes}|${px < FAR.details}|${px < FAR.vehicles}|${px < FAR.creases}|${px < FAR.silhouette}|${px < FAR.streetLines}|${this.snap.showcase ?? ''}`;
    if (key === this.far && !force) return;
    this.far = key;
    this.farF = f;
    this.syncZoomStageVisibility(stage);
    const css = getComputedStyle(document.documentElement);
    this.vehicleColors(n => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff'));
    this.mats.crease.opacity = 1 - 0.85 * f;
    this.mats.baseCrease.opacity = Math.max(0.24, (1 - 0.72 * f) * 0.75);
    this.mats.detail.opacity = 1 - 0.85 * f;
    this.mats.wire.opacity = 1 - 0.5 * f;
    this.tiers(m.scene);
    const hideAllVehicles = stage !== 'full' || (auto && px < FAR.vehicles);
    m.vehicleLines.visible = !hideAllVehicles && this.snap.quality.creases && !(auto && px < FAR.vehicleLines);
    for (const [kind, fl] of m.fleets) for (const o of fl.meshes) {
      const shell = o.material === this.vehicleShell;
      o.visible = !hideAllVehicles && !(auto && kind === 'bike' && px < FAR.bikes) && !(shell && (!this.snap.quality.silhouette || (auto && px < FAR.silhouette)));
      if (o.userData.night) o.visible = o.visible && this.nightOn(o.userData.night as string);
    }
  }

  private nightOn(k: string) {
    const cars = lightOn(this.snap.lights.vehicle, this.snap.night);
    return k === 'beam' ? cars && this.snap.theme === 'dark' : k === 'pool' ? this.poolsOn() : this.snap.night;
  }

  private treeLook() {
    const q = this.snap.quality, px = this.pxPerMetre();
    if (!q.autoDetail || q.trees === 'off') return q.trees;
    if (px < FAR.trees) return 'off';
    return q.trees === 'full' && px < FAR.simpleTrees ? 'simple' : q.trees;
  }

  // ---------- moving about (ADR-043) ----------
  /** places to fly to: read from `city.places` (defined per AreaConfig) + all metro stations */
  get places(): { id: string; name: string; group: string; at: [number, number] }[] {
    const configured = this.city.places ?? [
      { id: 'home', name: this.city.cityName ?? this.city.name, group: t('top.places.defaultGroup', undefined, this.snap.locale), at: [0, 0] as [number, number] },
    ];
    const stationPrefix = this.snap.locale === 'en' ? 'Station' : 'Ga';
    const metroGroup = t('top.places.metroGroup', undefined, this.snap.locale);
    return [
      ...configured,
      ...this.city.stations.map(s => ({
        id: s.id,
        name: `${stationPrefix} ${s.name ?? ''}`.trim(),
        group: metroGroup,
        at: [s.at[0], s.at[1]] as [number, number],
      })),
    ];
  }

  private fly: { from: THREE.Vector3; to: THREE.Vector3; t0: number } | null = null;

  flyTo(p: [number, number], exitShowcase = true) {
    if (exitShowcase && this.snap.showcase) this.setShowcase(null);
    if (this.pov.isActive()) this.setPovMode('map');
    const m = this.mounted;
    if (!m) return;
    this.fly = { from: m.controls.target.clone(), to: new THREE.Vector3(p[0], m.controls.target.y, p[1]), t0: performance.now() };
  }

  zoom(k: number) {
    const m = this.mounted;
    if (!m || this.pov.isActive()) return;
    m.camera.zoom = Math.max(m.controls.minZoom, Math.min(m.controls.maxZoom, m.camera.zoom * k));
    m.camera.updateProjectionMatrix();
  }

  tilt(dir: 1 | -1) {
    if (!this.mounted || this.pov.isActive()) return;
    if (this.snap.mode !== '3d') {
      this.update({ mode: '3d' });
      this.applyMode('3d', false);
    }
    this.startTurn(this.azimuth(), Math.max(0.12, Math.min(1.45, this.elevation() + dir * 0.16)));
  }

  private syncLowCamera() {
    const m = this.mounted;
    if (!m) return;
    const el = Math.max(0.08, this.elevation());
    m.controls.panSpeed = Math.max(0.24, Math.min(1, Math.sin(el) / Math.sin(ISO_EL)));
    if (el < MIN_ZOOM_TO_CURSOR_EL) m.controls.zoomToCursor = false;

    let wantY = 0;
    if (this.snap.mode === '3d' && !this.activeShowcase && el < MIN_ZOOM_TO_CURSOR_EL) {
      const lowF = Math.max(0, Math.min(1, (MIN_ZOOM_TO_CURSOR_EL - el) / 0.24));
      const zoomF = Math.max(0, Math.min(1, (m.camera.zoom - 0.9) / 2.2));
      wantY = lowF * zoomF * 12;
    }
    const dy = (wantY - m.controls.target.y) * 0.18;
    if (Math.abs(dy) > 0.01) {
      m.controls.target.y += dy;
      m.camera.position.y += dy;
    }
  }

  private stabilizeCamera() {
    const m = this.mounted;
    if (!m) return;
    const c = m.controls.target;
    const dx = m.camera.position.x - c.x;
    const dy = m.camera.position.y - c.y;
    const dz = m.camera.position.z - c.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-3) {
      this.place(m.camera, m.controls, this.northAz, ISO_EL);
      return;
    }
    const az = Math.atan2(dz, dx);
    const rawEl = Math.asin(Math.max(-1, Math.min(1, dy / dist)));
    const el = this.snap.mode === '2d' ? ISO_EL : Math.max(0.10, Math.min(1.43, rawEl));
    if (Math.abs(dist - ORBIT_RADIUS) > 0.5 || Math.abs(el - rawEl) > 1e-4) {
      this.place(m.camera, m.controls, az, el);
    }
  }

  private clearAllTileCuts() {
    for (const t of this.tiles) {
      if (!t.cutKey) continue;
      t.cutKey = '';
      this.syncTileVisibility(t, this.nearTile(t) && t.shown >= 0);
    }
  }

  private syncForegroundCut() {
    const m = this.mounted;
    if (!m) return;
    if (this.activeShowcase?.shellGroup) {
      this.activeShowcase.shellGroup.visible = !(this.snap.seeThrough && m.camera.zoom >= SEE_THROUGH.SHOWCASE_MIN_ZOOM);
    }
    if (this.pov.isActive()) {
      m.stationShellGroup.visible = !(this.snap.seeThrough && this.pov.isMetro() && this.pov.isNearStation(85));
      this.clearAllTileCuts();
      return;
    }
    const stage = this.currentZoomStage();
    if (stage !== 'full') {
      m.stationShellGroup.visible = stage === 'landmarks';
      this.clearAllTileCuts();
      return;
    }
    if (!this.snap.seeThrough || this.snap.showcase) {
      m.stationShellGroup.visible = true;
      this.clearAllTileCuts();
      return;
    }

    const { nearStation, hiddenByTile } = computeForegroundCut({
      city: this.city,
      bldgBounds: this.bldgBounds,
      zoom: m.camera.zoom,
      elevation: this.elevation(),
      targetX: m.controls.target.x,
      targetZ: m.controls.target.z,
      cameraX: m.camera.position.x,
      cameraZ: m.camera.position.z,
    });
    m.stationShellGroup.visible = !nearStation;

    if (hiddenByTile.size === 0) {
      this.clearAllTileCuts();
      return;
    }

    for (let idx = 0; idx < this.tiles.length; idx++) {
      const t = this.tiles[idx]!;
      const hidden = hiddenByTile.get(idx);
      if (!hidden || !hidden.length || t.shown < 0) {
        if (t.cutKey) {
          t.cutKey = '';
          this.syncTileVisibility(t, this.nearTile(t));
        }
        continue;
      }
      const level = t.shown as Detail;
      const key = `${level}:${hidden.join(',')}`;
      if (t.cutKey !== key) {
        if (t.cutGroup) m.tilesGroup.remove(t.cutGroup);
        if (t.cutLayer) this.layers.delete(t.cutLayer);
        t.cutLayer = buildTile(this.city, t.tile, level, new Set(hidden));
        this.layers.add(t.cutLayer);
        t.cutGroup = this.group(t.cutLayer);
        m.tilesGroup.add(t.cutGroup);
        this.paintLayer(t.cutLayer);
        t.cutKey = key;
      }
      this.syncTileVisibility(t, this.nearTile(t));
    }
  }

  private keysMove(dt: number) {
    const m = this.mounted;
    if (!m || !this.held.size) return;
    let fx = 0, fy = 0;
    for (const k of this.held) { const d = MOVE_KEYS[k]; if (d) { fx += d[0]; fy += d[1]; } }
    if (!fx && !fy) return;
    const f = m.controls.target.clone().sub(m.camera.position).setY(0).normalize(), right = new THREE.Vector3(-f.z, 0, f.x);
    const step = new THREE.Vector3().addScaledVector(f, fy).addScaledVector(right, fx).normalize().multiplyScalar(((FRUSTUM / m.camera.zoom) * 0.5) * dt);
    m.controls.target.add(step); m.camera.position.add(step);
  }

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
    const x = Math.max(b.x0 - PAN_BOUNDS_MARGIN, Math.min(b.x1 + PAN_BOUNDS_MARGIN, t.x));
    const z = Math.max(b.y0 - PAN_BOUNDS_MARGIN, Math.min(b.y1 + PAN_BOUNDS_MARGIN, t.z));
    if (x !== t.x || z !== t.z) { const d = new THREE.Vector3(x - t.x, 0, z - t.z); t.add(d); m.camera.position.add(d); }
  }

  // ---------- camera ----------
  private applyMode(mode: Mode, animate: boolean) {
    const m = this.mounted;
    if (!m) return;
    m.controls.enableRotate = mode === '3d';
    m.controls.touches.TWO = mode === '3d' ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
    if (mode === '2d') {
      const k = animate ? 0 : Math.round((this.northAz - this.azimuth()) / (Math.PI / 2));
      const targetAz = azOf(k, this.northAz);
      if (animate) this.startTurn(targetAz, ISO_EL); else this.place(m.camera, m.controls, targetAz, ISO_EL);
    }
  }

  private azimuth() { const m = this.mounted!; return Math.atan2(m.camera.position.z - m.controls.target.z, m.camera.position.x - m.controls.target.x); }
  private elevation() { const m = this.mounted!, d = m.camera.position.clone().sub(m.controls.target); return Math.asin(d.y / d.length()); }

  private startTurn(a1: number, e1: number) {
    let a0 = this.azimuth();
    while (a1 - a0 > Math.PI) a0 += 2 * Math.PI;
    while (a0 - a1 > Math.PI) a0 -= 2 * Math.PI;
    this.turn = { a0, a1, e0: this.elevation(), e1, t0: performance.now() };
  }

  private animate(now: number) {
    const m = this.mounted;
    if (m && this.fly) {
      const f = this.fly, u = Math.min(1, (now - f.t0) / FLY_DURATION_MS), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const next = f.from.clone().lerp(f.to, e), d = next.clone().sub(m.controls.target);
      m.controls.target.add(d); m.camera.position.add(d);
      if (u >= 1) this.fly = null;
    }
    const t = this.turn;
    if (!m || !t) return;
    const u = Math.min(1, (now - t.t0) / TURN_DURATION_MS), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    this.place(m.camera, m.controls, t.a0 + (t.a1 - t.a0) * e, t.e0 + (t.e1 - t.e0) * e);
    if (u >= 1) this.turn = null;
  }

  private place(camera: THREE.OrthographicCamera, controls: OrbitControls, az: number, el: number) {
    const R = ORBIT_RADIUS, c = controls.target;
    camera.position.set(c.x + R * Math.cos(el) * Math.cos(az), c.y + R * Math.sin(el), c.z + R * Math.cos(el) * Math.sin(az));
    camera.lookAt(c);
  }

  // ---------- URL state synchronization (`/@lat,lon,157m,0h,35.3t,2d?...`) ----------
  private openPlaceById(placeId: string) {
    const entry = this.placeCatalog.byId.get(placeId);
    if (entry) {
      this.openPopup(entry);
      return;
    }
    if (placeId.startsWith('street:')) {
      const st = this.streetById.get(placeId.slice('street:'.length));
      const anchor = st?.samples[0]?.at;
      if (st && anchor) this.openStreetPopup(st, [anchor[0], anchor[1]]);
    }
  }

  private syncUrlState(now: number, force = false) {
    const m = this.mounted;
    if (!m || typeof window === 'undefined' || !window.history?.replaceState) return;
    const mapTarget = this.snap.showcase && this.savedMapCam ? this.savedMapCam.target : m.controls.target;
    const mapZoom = this.snap.showcase && this.savedMapCam ? this.savedMapCam.zoom : m.camera.zoom;
    const az = this.azimuth();
    const heading = headingFromAz(az, this.northAz);
    const tilt = (this.elevation() * 180) / Math.PI;
    const placeId = !this.snap.showcase && this.activePopup ? this.activePopup.entry.id : null;

    const sig = `${mapTarget.x.toFixed(1)},${mapTarget.z.toFixed(1)}|${mapZoom.toFixed(2)}|${heading.toFixed(1)}|${tilt.toFixed(1)}|${this.snap.mode}|${this.snap.night ? 1 : 0}|${this.snap.seeThrough ? 1 : 0}|${this.snap.streetLabels}|${this.snap.placeInfo}|${this.snap.showcase ?? ''}|${placeId ?? ''}`;
    if (sig !== this.urlCandidateSig) {
      this.urlCandidateSig = sig;
      this.urlDirtyAt = now;
    }
    const busy = this.interacting || this.fly !== null || this.turn !== null || this.held.size > 0;
    if (!force) {
      if (sig === this.urlSyncedSig) return;
      if (busy && now - this.lastUrlWrite < 1200) return;
      if (!busy && now - this.urlDirtyAt < 300) return;
      if (now - this.lastUrlWrite < 280) return;
    }
    this.urlSyncedSig = sig;
    this.lastUrlWrite = now;

    this.events.emit('camera:change', {
      x: mapTarget.x,
      z: mapTarget.z,
      zoom: mapZoom,
      heading,
      tilt,
      mode: this.snap.mode,
    });

    const nextUrl = formatUrlState(
      {
        x: mapTarget.x,
        z: mapTarget.z,
        zoom: mapZoom,
        heading,
        tilt,
        mode: this.snap.mode,
        night: this.snap.night,
        seeThrough: this.snap.seeThrough,
        streetLabels: this.snap.streetLabels,
        placeInfo: this.snap.placeInfo,
        showcase: this.snap.showcase,
        place: placeId,
      },
      this.frame,
    );
    const curUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== curUrl) {
      try {
        window.history.replaceState(null, '', nextUrl);
      } catch {
        /* ignore browser history rate limits */
      }
    }
  }

  private applyUrlFromLocation() {
    if (typeof window === 'undefined') return;
    const parsed = parseUrlState(window.location, this.frame);
    if (!parsed) return;
    const m = this.mounted;
    if (parsed.night !== undefined && parsed.night !== this.snap.night) {
      this.setNight(parsed.night);
      this.setTheme(parsed.night ? 'dark' : 'light');
    }
    if (parsed.seeThrough !== undefined) this.setSeeThrough(parsed.seeThrough);
    if (parsed.streetLabels !== undefined) this.setStreetLabels(parsed.streetLabels);
    if (parsed.placeInfo !== undefined) this.setPlaceInfo(parsed.placeInfo);
    if (parsed.mode !== undefined && parsed.mode !== this.snap.mode) {
      this.update({ mode: parsed.mode });
      this.applyMode(parsed.mode, false);
    }
    if (m) {
      if (parsed.x !== undefined && parsed.z !== undefined) {
        m.controls.target.set(parsed.x, m.controls.target.y, parsed.z);
      }
      if (parsed.zoom !== undefined) {
        m.camera.zoom = parsed.zoom;
        m.camera.updateProjectionMatrix();
      }
      const az = parsed.heading !== undefined ? azFromHeading(parsed.heading, this.northAz) : this.azimuth();
      const el = parsed.tilt !== undefined ? Math.max(0.05, Math.min(1.43, (parsed.tilt * Math.PI) / 180)) : this.elevation();
      this.place(m.camera, m.controls, az, el);
    }
    if (parsed.showcase !== undefined) {
      this.setShowcase(parsed.showcase);
    } else if (parsed.place) {
      this.openPlaceById(parsed.place);
    }
  }
}

const dist2 = (c: [number, number], v: THREE.Vector3) => (c[0] - v.x) ** 2 + (c[1] - v.z) ** 2;
const dist2XZ = (c: [number, number], v: { x: number; z: number }) => (c[0] - v.x) ** 2 + (c[1] - v.z) ** 2;

