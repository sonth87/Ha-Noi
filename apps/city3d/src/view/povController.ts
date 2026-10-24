/* Perspective POV Camera, Interactive Vehicle Driving & Circular Mini-Map Controller.
   Supports:
   - 'metro-cab': First-person view from the front driver cab of Metro Line 2A trains.
   - 'metro-passenger': Panoramic window-seat passenger view looking out over the city from the elevated metro.
   - 'drive-cabin': Interactive car driving with close chase camera behind the 3D car.
   - 'drive-top': Interactive car driving with elevated top-down chase camera.
   Includes road carriageway constraint, gentle lane-follow assist, circular mini-map radar renderer,
   and frustum-cone & distance-tiered LOD culling for 60 FPS perspective rendering. */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  METRO,
  TRAIN_LEN,
  closestOnSegment,
  dist,
  polylineLength,
  streetZ,
  trainAt,
  type City,
  type Track,
  type TrainPhase,
  type Vec2,
} from '@my-city/core';
import { V } from '@render/batch';
import type { Detail } from '@render/city';
import { vehicleModel, type VehiclePart } from '@render/vehicles';
import { POV_CONFIG, type PovMode } from './constants';

export interface TrainInstanceRef {
  track: Track;
  offset: number;
  cars: THREE.Group[];
}

export type DriveControlKey = 'throttle' | 'brake' | 'left' | 'right' | 'handbrake';

export interface PovTelemetry {
  mode: PovMode;
  speedKmh: number;
  trainIndex: number;
  trainTotal: number;
  trainPhase: TrainPhase;
  windowSide: 1 | -1;
  locationName: string;
}

export interface PegmanDropTarget {
  kind: 'metro' | 'car';
  /** Snapped 3D world point [x, y, z] in city coordinates (y is Three.js Z) */
  world: [number, number, number];
  /** 0-based index of the nearest Metro train when kind === 'metro' */
  trainIndex: number;
  /** Street name or Metro station / line name */
  label: string;
  /** Road heading in radians when kind === 'car' */
  roadHeading: number;
}

interface BridgeSegment {
  a: Vec2;
  b: Vec2;
  s0: number;
  len: number;
  heading: number;
  halfWidth: number;
  street: City['streets'][number];
}

interface DrivableRoadSegment {
  a: Vec2;
  b: Vec2;
  s0: number;
  totalLen: number;
  len: number;
  heading: number;
  carriageHalfWidth: number;
  layer: number;
  name: string;
}

interface MiniMapLabel {
  name: string;
  x: number;
  y: number;
  heading: number;
  isPrimary: boolean;
}

/** Path position and heading at distance `s` along a 2D polyline */
export function samplePathAt(path: readonly Vec2[], s: number): { p: Vec2; h: number } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    if (acc + L >= s || i === path.length - 1) {
      const t = L > 0 ? Math.max(0, Math.min(1, (s - acc) / L)) : 0;
      return {
        p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        h: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    }
    acc += L;
  }
  return { p: path[0] ?? [0, 0], h: 0 };
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

export class PovController {
  readonly camera: THREE.PerspectiveCamera;
  private mode: PovMode = 'map';
  private trainIndex = 0;
  private windowSide: 1 | -1 = 1;

  // Free-look offsets (radians) controlled by pointer drag or arrow keys
  private lookYaw = 0;
  private lookPitch = 0;

  // Interactive car driving state (city coordinates: x, y on ground, z elevation)
  private car = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    pitch: 0,
    speed: 0,
    steer: 0,
    chaseYaw: 0,
    initialized: false,
  };

  private readonly keysPressed = new Set<string>();
  private readonly touchControls = new Set<DriveControlKey>();

  // Pre-indexed bridge & drivable carriageway segments
  private readonly bridgeSegments: BridgeSegment[] = [];
  private readonly roadSegments: DrivableRoadSegment[] = [];
  private readonly miniMapLabels: MiniMapLabel[] = [];

  // Current player position & heading on the ground plane (for mini-map & culling)
  private playerX = 0;
  private playerY = 0;
  private playerHeading = 0;

  // Cached frustum ground origin & forward unit vector (Three.js X, Z plane) for fast 0-alloc culling
  private camGroundX = 0;
  private camGroundZ = 0;
  private camFwdX = 1;
  private camFwdZ = 0;

  // Telemetry snapshot for HUD
  private telemetry: PovTelemetry = {
    mode: 'map',
    speedKmh: 0,
    trainIndex: 1,
    trainTotal: 1,
    trainPhase: 'run',
    windowSide: 1,
    locationName: '',
  };

  // Player's 3D car mesh (visible in both 'drive-cabin' and 'drive-top' modes)
  private playerCarGroup: THREE.Group | null = null;
  private playerBeamMesh: THREE.Mesh | null = null;

  // Pre-allocated vectors to avoid GC pressure in 60fps loop
  private readonly tmpTarget = new THREE.Vector3();

  constructor(private readonly city: City, private readonly panBounds: { x0: number; y0: number; x1: number; y1: number }) {
    this.camera = new THREE.PerspectiveCamera(POV_CONFIG.FOV_CAB, 16 / 9, POV_CONFIG.NEAR, POV_CONFIG.FAR);
    this.indexRoadsAndBridges();
  }

  private indexRoadsAndBridges(): void {
    const seenStreetNames = new Map<string, { x: number; y: number; heading: number; len: number; isPrimary: boolean }>();

    for (const st of this.city.streets) {
      if (st.kind === 'footway' || st.kind === 'steps') continue;
      const totalLen = polylineLength(st.path);
      if (totalLen < 2) continue;

      // Index elevated bridges for smooth vertical ramp climbing
      if (st.layer > 0 && st.profile.length > 0) {
        let acc = 0;
        for (let i = 1; i < st.path.length; i++) {
          const a = st.path[i - 1]!, b = st.path[i]!, len = dist(a, b);
          if (len > 0.1) {
            this.bridgeSegments.push({
              a,
              b,
              s0: acc,
              len,
              heading: Math.atan2(b[1] - a[1], b[0] - a[0]),
              halfWidth: Math.max(4.5, st.width * 0.65),
              street: st,
            });
          }
          acc += len;
        }
      }

      // Index drivable carriageway segments (skip narrow pedestrian alleys < 4 m wide)
      if (st.width >= 4.0) {
        const carriageHalfWidth = Math.max(2.1, st.width * 0.5 - 0.55);
        let acc = 0;
        for (let i = 1; i < st.path.length; i++) {
          const a = st.path[i - 1]!, b = st.path[i]!, len = dist(a, b);
          if (len > 0.2) {
            const heading = Math.atan2(b[1] - a[1], b[0] - a[0]);
            this.roadSegments.push({
              a,
              b,
              s0: acc,
              totalLen,
              len,
              heading,
              carriageHalfWidth,
              layer: st.layer,
              name: st.name ?? '',
            });

            if (st.name && len > 18) {
              const prev = seenStreetNames.get(st.name);
              if (!prev || len > prev.len) {
                seenStreetNames.set(st.name, {
                  x: (a[0] + b[0]) * 0.5,
                  y: (a[1] + b[1]) * 0.5,
                  heading,
                  len,
                  isPrimary: st.kind === 'primary' || st.kind === 'secondary',
                });
              }
            }
          }
          acc += len;
        }
      }
    }

    for (const [name, info] of seenStreetNames) {
      this.miniMapLabels.push({
        name: name.replace(/^(Phố|Đường)\s+/i, ''),
        x: info.x,
        y: info.y,
        heading: info.heading,
        isPrimary: info.isPrimary,
      });
    }
  }

  getMode(): PovMode {
    return this.mode;
  }

  isActive(): boolean {
    return this.mode !== 'map';
  }

  isDriving(): boolean {
    return this.mode === 'drive-cabin' || this.mode === 'drive-top';
  }

  isMetro(): boolean {
    return this.mode === 'metro-cab' || this.mode === 'metro-passenger';
  }

  getTelemetry(): PovTelemetry {
    return this.telemetry;
  }

  /** Returns true if the POV camera is within `radius` metres of any metro station */
  isNearStation(radius = 85): boolean {
    if (!this.isMetro()) return false;
    for (const st of this.city.stations) {
      if (st.kind !== 'metro') continue;
      if (Math.hypot(st.at[0] - this.playerX, st.at[1] - this.playerY) <= radius) {
        return true;
      }
    }
    return false;
  }

  /** Build and attach the player's drivable 3D car mesh to the map group */
  mountPlayerCar(
    parent: THREE.Object3D,
    vehicleMats: Record<Exclude<VehiclePart, 'beam'>, THREE.MeshBasicMaterial>,
    beamMat: THREE.MeshBasicMaterial,
    shellMat: THREE.ShaderMaterial,
    creaseMat: LineMaterial,
  ): void {
    this.unmountPlayerCar(parent);
    const model = vehicleModel('sedan');
    const g = new THREE.Group();
    for (const [part, geo] of model.parts) {
      const mesh = new THREE.Mesh(geo, part === 'beam' ? beamMat : vehicleMats[part]);
      if (part === 'beam') {
        mesh.userData.night = 'beam';
        this.playerBeamMesh = mesh;
      }
      g.add(mesh);
    }
    const shell = new THREE.Mesh(model.shell, shellMat);
    shell.userData.tier = 'silhouette';
    const lines = new LineSegments2(new LineSegmentsGeometry().setPositions(model.lines), creaseMat);
    lines.userData.tier = 'creases';
    g.add(shell, lines);
    g.visible = false;
    parent.add(g);
    this.playerCarGroup = g;
  }

  /** Remove and dispose the player's 3D car geometries to prevent ArrayBuffer leaks on unmount/HMR */
  unmountPlayerCar(parent?: THREE.Object3D): void {
    if (!this.playerCarGroup) return;
    if (parent) parent.remove(this.playerCarGroup);
    this.playerCarGroup.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.playerCarGroup = null;
    this.playerBeamMesh = null;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  private clearHiddenTrainCars(trains: readonly TrainInstanceRef[]): void {
    for (const tr of trains) {
      for (const car of tr.cars) {
        car.userData.hiddenByPov = false;
      }
    }
  }

  setMode(
    next: PovMode,
    trains: readonly TrainInstanceRef[],
    mapTarget: { x: number; z: number },
    simTime = 0,
    keepSelection = false,
  ): void {
    const prev = this.mode;
    this.mode = next;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.keysPressed.clear();
    this.touchControls.clear();
    this.clearHiddenTrainCars(trains);

    if (next === 'map') {
      if (this.playerCarGroup) this.playerCarGroup.visible = false;
      this.telemetry = { ...this.telemetry, mode: 'map', speedKmh: 0 };
      return;
    }

    const fov =
      next === 'metro-cab'
        ? POV_CONFIG.FOV_CAB
        : next === 'metro-passenger'
          ? POV_CONFIG.FOV_PASSENGER
          : next === 'drive-cabin'
            ? POV_CONFIG.FOV_DRIVE_CABIN
            : POV_CONFIG.FOV_DRIVE_TOP;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    if (next === 'drive-cabin' || next === 'drive-top') {
      const wasDriving = prev === 'drive-cabin' || prev === 'drive-top';
      if (!keepSelection && (!wasDriving || !this.car.initialized)) {
        this.spawnCarNear(mapTarget.x, mapTarget.z);
      }
      if (this.playerCarGroup) {
        this.playerCarGroup.visible = true;
      }
    } else {
      if (this.playerCarGroup) this.playerCarGroup.visible = false;
      const wasMetro = prev === 'metro-cab' || prev === 'metro-passenger';
      if (!keepSelection && !wasMetro && trains.length > 0) {
        this.selectClosestTrain(trains, mapTarget.x, mapTarget.z, simTime);
      } else if (trains.length > 0) {
        this.trainIndex = ((this.trainIndex % trains.length) + trains.length) % trains.length;
      }
    }
  }

  /** Pick the train currently closest to the user's map target (or city center) */
  private selectClosestTrain(
    trains: readonly TrainInstanceRef[],
    targetX: number,
    targetZ: number,
    simTime: number,
  ): void {
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < trains.length; i++) {
      const tr = trains[i]!;
      const { head } = this.resolveActiveTrainState(tr, simTime);
      const { p } = samplePathAt(tr.track.path, Math.max(0, Math.min(tr.track.length, head - METRO.carLen)));
      const dTarget = Math.hypot(p[0] - targetX, p[1] - targetZ);
      const dOrigin = Math.hypot(p[0], p[1]);
      const score = dTarget * 0.7 + dOrigin * 0.3;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    this.trainIndex = bestIdx;
  }

  /** Find the train strictly closest in Euclidean distance to `(worldX, worldZ)` */
  findStrictlyClosestTrain(
    trains: readonly TrainInstanceRef[],
    worldX: number,
    worldZ: number,
    simTime: number,
  ): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < trains.length; i++) {
      const tr = trains[i]!;
      const { head } = this.resolveActiveTrainState(tr, simTime);
      const { p } = samplePathAt(tr.track.path, Math.max(0, Math.min(tr.track.length, head - METRO.carLen)));
      const d = Math.hypot(p[0] - worldX, p[1] - worldZ);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Evaluate whether a Pegman drag point `(groundPt, viaductPt)` lands on Metro track/station or a street */
  findPegmanTarget(
    groundPt: Vec2,
    viaductPt: Vec2,
    trains: readonly TrainInstanceRef[],
    simTime: number,
  ): PegmanDropTarget {
    // 1. Check proximity to Metro stations (radius 68 m) or elevated Metro railway tracks (radius 38 m)
    let bestStationDist = Infinity;
    let nearestStation: City['stations'][number] | null = null;
    for (const st of this.city.stations) {
      if (st.kind !== 'metro') continue;
      const d = Math.min(dist(viaductPt, st.at), dist(groundPt, st.at));
      if (d < bestStationDist) {
        bestStationDist = d;
        nearestStation = st;
      }
    }

    let bestRailDist = Infinity;
    let bestRailPt: Vec2 = viaductPt;
    let bestRailName = 'Metro 2A Cát Linh – Hà Đông';
    for (const r of this.city.rails) {
      if (r.kind !== 'metro' || r.path.length < 2) continue;
      for (let i = 1; i < r.path.length; i++) {
        const a = r.path[i - 1]!, b = r.path[i]!;
        const cVia = closestOnSegment(viaductPt, a, b);
        const cGnd = closestOnSegment(groundPt, a, b);
        const c = cVia.d <= cGnd.d ? cVia : cGnd;
        if (c.d < bestRailDist) {
          bestRailDist = c.d;
          bestRailPt = c.at;
          if (r.name) bestRailName = r.name;
        }
      }
    }

    if (bestStationDist <= 68 || bestRailDist <= 38) {
      const anchorPt: Vec2 =
        nearestStation && bestStationDist <= 68 ? [nearestStation.at[0], nearestStation.at[1]] : bestRailPt;
      const trainIdx = this.findStrictlyClosestTrain(trains, anchorPt[0], anchorPt[1], simTime);
      const label =
        nearestStation && bestStationDist <= 120
          ? `Ga ${nearestStation.name ?? 'Metro'}`
          : bestRailName;
      return {
        kind: 'metro',
        world: [anchorPt[0], anchorPt[1], 10.5],
        trainIndex: trainIdx,
        label,
        roadHeading: 0,
      };
    }

    // 2. Otherwise snap to the closest drivable street carriageway (`lòng đường`)
    let bestRoadDist = Infinity;
    let bestRoadPt: Vec2 = groundPt;
    let bestRoadHeading = 0;
    let bestRoadName = '';

    for (const seg of this.roadSegments) {
      const c = closestOnSegment(groundPt, seg.a, seg.b);
      // Slightly prefer surface streets when distances are nearly equal
      const weightedDist = c.d + (seg.layer > 0 ? 3.5 : 0);
      if (weightedDist < bestRoadDist) {
        bestRoadDist = weightedDist;
        bestRoadPt = c.at;
        bestRoadHeading = seg.heading;
        bestRoadName = seg.name;
      }
    }

    const { z } = this.sampleRoadElevation(bestRoadPt[0], bestRoadPt[1], bestRoadHeading, 0);
    return {
      kind: 'car',
      world: [bestRoadPt[0], bestRoadPt[1], z],
      trainIndex: 0,
      label: bestRoadName || 'Đường nội đô',
      roadHeading: bestRoadHeading,
    };
  }

  /** Lock onto a specific Metro train index before entering `'metro-cab'` */
  selectTrainIndex(index: number, trains: readonly TrainInstanceRef[]): void {
    if (!trains.length) return;
    this.trainIndex = ((index % trains.length) + trains.length) % trains.length;
  }

  /** Snap the player's car onto the nearest main drivable street near `(worldX, worldZ)` */
  resetCarNear(worldX: number, worldZ: number): void {
    this.spawnCarNear(worldX, worldZ);
  }

  /** Spawn the player's car at an exact Pegman drop coordinate `(worldX, worldZ)` along any drivable road */
  spawnCarAtDrop(worldX: number, worldZ: number, preferredHeading?: number): void {
    const p: Vec2 = [worldX, worldZ];
    let bestDist = Infinity;
    let bestPoint: Vec2 = [worldX, worldZ];
    let bestHeading = 0;
    let bestHalfWidth = 3.5;
    let bestName = '';

    for (const seg of this.roadSegments) {
      const c = closestOnSegment(p, seg.a, seg.b);
      const weightedDist = c.d + (seg.layer > 0 ? 2.5 : 0);
      if (weightedDist < bestDist) {
        bestDist = weightedDist;
        bestPoint = c.at;
        bestHeading = seg.heading;
        bestHalfWidth = seg.carriageHalfWidth;
        bestName = seg.name;
      }
    }

    if (preferredHeading !== undefined && Math.cos(preferredHeading - bestHeading) < 0) {
      bestHeading = wrapAngle(bestHeading + Math.PI);
    }

    const laneOffset = Math.min(2.0, bestHalfWidth * 0.45);
    const spawnX = bestPoint[0] - Math.sin(bestHeading) * laneOffset;
    const spawnY = bestPoint[1] + Math.cos(bestHeading) * laneOffset;
    const { z, pitch } = this.sampleRoadElevation(spawnX, spawnY, bestHeading, 0);

    this.car = {
      x: spawnX,
      y: spawnY,
      z,
      heading: bestHeading,
      pitch,
      speed: 0,
      steer: 0,
      chaseYaw: bestHeading,
      initialized: true,
    };
    this.playerX = spawnX;
    this.playerY = spawnY;
    this.playerHeading = bestHeading;
    if (bestName) {
      this.telemetry = { ...this.telemetry, locationName: bestName };
    }
  }

  private spawnCarNear(worldX: number, worldZ: number): void {
    const p: Vec2 = [worldX, worldZ];
    let bestDist = Infinity;
    let bestPoint: Vec2 = [worldX, worldZ];
    let bestHeading = 0;
    let bestWidth = 10;
    let bestName = '';

    for (const st of this.city.streets) {
      if (st.kind !== 'primary' && st.kind !== 'secondary' && st.kind !== 'tertiary') continue;
      if (st.layer > 0) continue; // Spawn on surface road so user can choose whether to take ramp
      for (let i = 1; i < st.path.length; i++) {
        const a = st.path[i - 1]!, b = st.path[i]!;
        const c = closestOnSegment(p, a, b);
        if (c.d < bestDist) {
          bestDist = c.d;
          bestPoint = c.at;
          bestHeading = Math.atan2(b[1] - a[1], b[0] - a[0]);
          bestWidth = st.width;
          bestName = st.name ?? '';
        }
      }
    }

    // Offset slightly to the right-hand lane: in (x, y) where +y is right of +x, right normal is (-sin(h), cos(h))
    const laneOffset = Math.min(2.4, bestWidth * 0.2);
    const spawnX = bestPoint[0] - Math.sin(bestHeading) * laneOffset;
    const spawnY = bestPoint[1] + Math.cos(bestHeading) * laneOffset;

    this.car = {
      x: spawnX,
      y: spawnY,
      z: 0,
      heading: bestHeading,
      pitch: 0,
      speed: 0,
      steer: 0,
      chaseYaw: bestHeading,
      initialized: true,
    };
    this.playerX = spawnX;
    this.playerY = spawnY;
    this.playerHeading = bestHeading;
    if (bestName) {
      this.telemetry = { ...this.telemetry, locationName: bestName };
    }
  }

  /** Switch to the next Metro train in the fleet */
  nextTrain(trains: readonly TrainInstanceRef[]): void {
    if (!trains.length) return;
    this.clearHiddenTrainCars(trains);
    this.trainIndex = (this.trainIndex + 1) % trains.length;
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  /** Flip between left and right window seats in Metro Passenger mode */
  toggleWindowSide(): void {
    this.windowSide = this.windowSide === 1 ? -1 : 1;
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  /** Toggle between Close Chase ('drive-cabin') and Overhead ('drive-top') camera while driving */
  toggleDriveCamera(trains: readonly TrainInstanceRef[], mapTarget: { x: number; z: number }): PovMode {
    const next: PovMode = this.mode === 'drive-cabin' ? 'drive-top' : 'drive-cabin';
    this.setMode(next, trains, mapTarget);
    return next;
  }

  /** Reset free-look orientation back to center */
  centerLook(): void {
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  /** Rotate free-look camera by pointer delta in pixels (drag right -> look right, drag down -> look down) */
  addLookDelta(dxPx: number, dyPx: number): void {
    if (this.mode === 'map') return;
    const sensitivity = 0.0042;
    const maxPitch = this.isDriving() ? 0.42 : 0.68;
    this.lookYaw = wrapAngle(this.lookYaw + dxPx * sensitivity);
    this.lookPitch = Math.max(-maxPitch, Math.min(maxPitch, this.lookPitch - dyPx * sensitivity));
  }

  handleKeyDown(key: string): boolean {
    if (this.mode === 'map') return false;
    const k = key.toLowerCase();
    if (k === 'c') {
      this.centerLook();
      return true;
    }
    if (
      k === 'w' ||
      k === 'arrowup' ||
      k === 's' ||
      k === 'arrowdown' ||
      k === 'a' ||
      k === 'arrowleft' ||
      k === 'd' ||
      k === 'arrowright' ||
      k === ' '
    ) {
      this.keysPressed.add(k);
      return true;
    }
    return false;
  }

  handleKeyUp(key: string): boolean {
    if (this.mode === 'map') return false;
    const k = key.toLowerCase();
    if (this.keysPressed.has(k)) {
      this.keysPressed.delete(k);
      return true;
    }
    return false;
  }

  setTouchControl(control: DriveControlKey, active: boolean): void {
    if (active) this.touchControls.add(control);
    else this.touchControls.delete(control);
  }

  clearInputs(): void {
    this.keysPressed.clear();
    this.touchControls.clear();
  }

  /** Step physics and update the perspective camera for the current frame */
  step(dt: number, simTime: number, trains: readonly TrainInstanceRef[], nightBeamOn: boolean): PovTelemetry {
    if (this.mode === 'metro-cab' || this.mode === 'metro-passenger') {
      this.stepMetro(dt, simTime, trains);
    } else if (this.mode === 'drive-cabin' || this.mode === 'drive-top') {
      this.stepDriving(dt, nightBeamOn);
    }

    // Cache ground position and horizontal forward vector for frustum culling
    this.camGroundX = this.camera.position.x;
    this.camGroundZ = this.camera.position.z;
    const dirX = this.tmpTarget.x - this.camGroundX;
    const dirZ = this.tmpTarget.z - this.camGroundZ;
    const len = Math.hypot(dirX, dirZ);
    if (len > 1e-4) {
      this.camFwdX = dirX / len;
      this.camFwdZ = dirZ / len;
    }

    return this.telemetry;
  }

  /** Ensure the boarded train is always inside the mapped city corridor (never in 'away' void or off the ends) */
  private resolveActiveTrainState(
    tr: TrainInstanceRef,
    simTime: number,
  ): { head: number; phase: TrainPhase; effectiveTime: number } {
    const track = tr.track;
    const L = track.length;
    const sMin = Math.min(L * 0.35, TRAIN_LEN + 8);
    const sMax = Math.max(L * 0.65, L - 10);

    // Find timetable window [tMin, tMax] where the train is well inside [sMin, sMax]
    let tMin = 0;
    let tMax = Math.max(10, track.period - METRO.between);
    for (const leg of track.plan) {
      if (leg.kind !== 'away' && leg.s1 >= sMin && tMin === 0) {
        tMin = leg.t0;
      }
      if (leg.kind !== 'away' && leg.s0 <= sMax) {
        tMax = leg.t1;
      }
    }
    const span = Math.max(8, tMax - tMin);

    let effectiveTime = simTime + tr.offset;
    let { head, phase } = trainAt(track, effectiveTime);
    if (head === null || head < sMin || head > sMax) {
      const u = tMin + ((((simTime + tr.offset + track.phase - tMin) % span) + span) % span);
      effectiveTime = u - track.phase;
      const wrapped = trainAt(track, effectiveTime);
      head = Math.max(sMin, Math.min(sMax, wrapped.head ?? (sMin + sMax) * 0.5));
      phase = wrapped.phase === 'away' ? 'run' : wrapped.phase;
    }
    return { head, phase, effectiveTime };
  }

  private stepMetro(dt: number, simTime: number, trains: readonly TrainInstanceRef[]): void {
    if (!trains.length) return;

    // Allow keyboard W/A/S/D or Arrow keys to pan the camera smoothly while on the train
    const lookLeft = this.keysPressed.has('a') || this.keysPressed.has('arrowleft');
    const lookRight = this.keysPressed.has('d') || this.keysPressed.has('arrowright');
    const lookUp = this.keysPressed.has('w') || this.keysPressed.has('arrowup');
    const lookDown = this.keysPressed.has('s') || this.keysPressed.has('arrowdown');
    if (lookLeft || lookRight) {
      this.lookYaw = wrapAngle(this.lookYaw + ((lookRight ? 1 : 0) - (lookLeft ? 1 : 0)) * 1.35 * dt);
    }
    if (lookUp || lookDown) {
      this.lookPitch = Math.max(-0.68, Math.min(0.68, this.lookPitch + ((lookUp ? 1 : 0) - (lookDown ? 1 : 0)) * 0.95 * dt));
    }

    const idx = ((this.trainIndex % trains.length) + trains.length) % trains.length;
    const tr = trains[idx]!;
    const track = tr.track;
    const L = track.length;

    const { head, phase, effectiveTime } = this.resolveActiveTrainState(tr, simTime);

    // Estimate instantaneous speed (km/h) via finite difference along timetable
    const nextSample = trainAt(track, effectiveTime + 0.2);
    const speedMs =
      nextSample.head !== null
        ? Math.max(0, (nextSample.head - head) / 0.2)
        : phase === 'stop'
          ? 0
          : METRO.speed;
    const speedKmh = Math.round(speedMs * 3.6);

    // Position all 4 cars of the active POV train using its active `head` and hide only the camera's own car
    this.clearHiddenTrainCars(trains);
    const hiddenCarIdx = this.mode === 'metro-cab' ? 0 : 1;
    tr.cars.forEach((g, i) => {
      const s = head - METRO.carLen / 2 - i * (METRO.carLen + METRO.gap);
      const clampedS = Math.max(0, Math.min(L, s));
      const { p, h } = samplePathAt(track.path, clampedS);
      g.position.set(p[0], track.height, p[1]);
      g.rotation.y = -h + (g.userData.flip ? Math.PI : 0);
      const hideThisCar = i === hiddenCarIdx;
      g.userData.hiddenByPov = hideThisCar;
      g.visible = !hideThisCar;
    });

    if (this.mode === 'metro-cab') {
      // Front driver cab of Car 0: elevated above the 1.06 m parapet so both 3D rails and city skyline are clear
      const car0CenterS = Math.max(0, Math.min(L, head - METRO.carLen / 2));
      const cabS = Math.max(0, Math.min(L, car0CenterS + POV_CONFIG.METRO_CAB_OFFSET_FWD));
      const { p, h } = samplePathAt(track.path, cabS);
      const camZ = track.height + POV_CONFIG.METRO_CAB_HEIGHT;

      this.playerX = p[0];
      this.playerY = p[1];
      this.playerHeading = h;

      const yaw = h + this.lookYaw;
      const pitch = -0.09 + this.lookPitch;
      const cosP = Math.cos(pitch);

      this.camera.position.copy(V(p[0], p[1], camZ));
      this.tmpTarget.copy(
        V(
          p[0] + Math.cos(yaw) * cosP * 60,
          p[1] + Math.sin(yaw) * cosP * 60,
          camZ + Math.sin(pitch) * 60,
        ),
      );
      this.camera.lookAt(this.tmpTarget);
    } else {
      // Passenger window seat in Car 1 (Car 1 exterior is hidden so opaque walls never block the camera!)
      const car1S = Math.max(0, Math.min(L, head - METRO.carLen / 2 - (METRO.carLen + METRO.gap)));
      const { p, h } = samplePathAt(track.path, car1S);
      const side = this.windowSide;
      // Outward normal in (x, y) where +y is right of +x: right (+1) = (-sin(h), cos(h)), left (-1) = (sin(h), -cos(h))
      const nx = -Math.sin(h) * side;
      const ny = Math.cos(h) * side;
      const eyeX = p[0] + nx * POV_CONFIG.METRO_PASSENGER_SIDE_OFFSET;
      const eyeY = p[1] + ny * POV_CONFIG.METRO_PASSENGER_SIDE_OFFSET;
      const eyeZ = track.height + POV_CONFIG.METRO_PASSENGER_HEIGHT;

      this.playerX = eyeX;
      this.playerY = eyeY;
      this.playerHeading = h;

      // Default passenger gaze angled ~36° outward-forward so Car 0 on the curving viaduct and city buildings are both visible
      const baseYaw = h + side * 0.62;
      const yaw = baseYaw + this.lookYaw;
      const pitch = -0.10 + this.lookPitch;
      const cosP = Math.cos(pitch);

      this.camera.position.copy(V(eyeX, eyeY, eyeZ));
      this.tmpTarget.copy(
        V(
          eyeX + Math.cos(yaw) * cosP * 60,
          eyeY + Math.sin(yaw) * cosP * 60,
          eyeZ + Math.sin(pitch) * 60,
        ),
      );
      this.camera.lookAt(this.tmpTarget);
    }

    // Nearest metro station or line label for mini-map HUD
    let locationName = track.name ?? 'Metro 2A Cát Linh – Hà Đông';
    for (const st of this.city.stations) {
      if (st.kind === 'metro' && Math.hypot(st.at[0] - this.playerX, st.at[1] - this.playerY) < 110) {
        locationName = `Ga ${st.name ?? 'Thái Hà'}`;
        break;
      }
    }

    this.telemetry = {
      mode: this.mode,
      speedKmh,
      trainIndex: idx + 1,
      trainTotal: trains.length,
      trainPhase: phase,
      windowSide: this.windowSide,
      locationName,
    };
  }

  private stepDriving(dt: number, nightBeamOn: boolean): void {
    const wantThrottle = this.keysPressed.has('w') || this.keysPressed.has('arrowup') || this.touchControls.has('throttle');
    const wantBrake = this.keysPressed.has('s') || this.keysPressed.has('arrowdown') || this.touchControls.has('brake');
    const wantLeft = this.keysPressed.has('a') || this.keysPressed.has('arrowleft') || this.touchControls.has('left');
    const wantRight = this.keysPressed.has('d') || this.keysPressed.has('arrowright') || this.touchControls.has('right');
    const wantHandbrake = this.keysPressed.has(' ') || this.touchControls.has('handbrake');

    const c = this.car;

    // Longitudinal acceleration / braking / reverse
    if (wantHandbrake) {
      if (Math.abs(c.speed) < 0.4) c.speed = 0;
      else c.speed -= Math.sign(c.speed) * POV_CONFIG.DRIVE_BRAKE * 1.35 * dt;
    } else if (wantThrottle) {
      const accel = c.speed < 0 ? POV_CONFIG.DRIVE_BRAKE : POV_CONFIG.DRIVE_ACCEL;
      c.speed = Math.min(POV_CONFIG.DRIVE_MAX_SPEED, c.speed + accel * dt);
    } else if (wantBrake) {
      const decel = c.speed > 0 ? POV_CONFIG.DRIVE_BRAKE : POV_CONFIG.DRIVE_ACCEL * 0.75;
      c.speed = Math.max(-POV_CONFIG.DRIVE_REVERSE_MAX_SPEED, c.speed - decel * dt);
    } else {
      // Natural rolling resistance
      if (Math.abs(c.speed) < 0.18) c.speed = 0;
      else c.speed -= Math.sign(c.speed) * POV_CONFIG.DRIVE_DRAG * dt;
    }

    // Steering input: in Three.js (X = x, Z = y), +heading turns RIGHT (D), -heading turns LEFT (A)
    const targetSteer = (wantRight ? 1 : 0) - (wantLeft ? 1 : 0);
    if (targetSteer !== 0) {
      c.steer = Math.max(-1, Math.min(1, c.steer + targetSteer * POV_CONFIG.DRIVE_STEER_RATE * dt * 2.4));
    } else {
      const returnStep = POV_CONFIG.DRIVE_STEER_RATE * dt * 3.8;
      if (Math.abs(c.steer) <= returnStep) c.steer = 0;
      else c.steer -= Math.sign(c.steer) * returnStep;
    }

    // Bicycle kinematics
    if (Math.abs(c.speed) > 0.02) {
      const speedFactor = 1 / (1 + Math.abs(c.speed) * 0.055);
      const maxSteerAngle = 0.52 * speedFactor;
      const wheelAngle = c.steer * maxSteerAngle;
      const wheelbase = 2.75;
      c.heading = wrapAngle(c.heading + (c.speed / wheelbase) * Math.tan(wheelAngle) * dt);
      c.x += Math.cos(c.heading) * c.speed * dt;
      c.y += Math.sin(c.heading) * c.speed * dt;
      c.x = Math.max(this.panBounds.x0, Math.min(this.panBounds.x1, c.x));
      c.y = Math.max(this.panBounds.y0, Math.min(this.panBounds.y1, c.y));
    }

    // Constrain car strictly to the road carriageway (`lòng đường`) and gently assist lane alignment
    const streetName = this.constrainCarToRoad(dt, targetSteer);

    // Compute road elevation (smoothly climbs overpasses when aligned with bridge direction)
    const { z: targetZ, pitch: targetPitch } = this.sampleRoadElevation(c.x, c.y, c.heading, c.z);
    const zBlend = Math.min(1, dt * 10);
    c.z += (targetZ - c.z) * zBlend;
    c.pitch += (targetPitch - c.pitch) * zBlend;

    this.playerX = c.x;
    this.playerY = c.y;
    this.playerHeading = c.heading;

    // Update 3D player car mesh position & orientation (visible in both car camera views)
    if (this.playerCarGroup) {
      this.playerCarGroup.visible = true;
      this.playerCarGroup.position.copy(V(c.x, c.y, c.z + 0.12));
      this.playerCarGroup.rotation.order = 'YXZ';
      this.playerCarGroup.rotation.y = -c.heading;
      this.playerCarGroup.rotation.z = c.pitch;
      if (this.playerBeamMesh) {
        this.playerBeamMesh.visible = nightBeamOn;
      }
    }

    // Smoothly align chase camera behind the car
    const angleDiff = wrapAngle(c.heading - c.chaseYaw);
    const followSpeed = this.mode === 'drive-cabin' ? 8.5 : 6.5;
    c.chaseYaw = wrapAngle(c.chaseYaw + angleDiff * Math.min(1, dt * followSpeed));
    const camYaw = c.chaseYaw + this.lookYaw;

    if (this.mode === 'drive-cabin') {
      // Close third-person chase camera behind the car ('Góc nhìn gần / Sau xe')
      const distBack = POV_CONFIG.DRIVE_CLOSE_DISTANCE * Math.cos(this.lookPitch * 0.35);
      const heightUp = POV_CONFIG.DRIVE_CLOSE_HEIGHT + Math.sin(this.lookPitch) * 2.4;

      const camX = c.x - Math.cos(camYaw) * distBack;
      const camY = c.y - Math.sin(camYaw) * distBack;
      const camZ = c.z + Math.max(1.8, heightUp);

      const lookAhead = 9.5;
      const targetX = c.x + Math.cos(c.heading) * lookAhead;
      const targetY = c.y + Math.sin(c.heading) * lookAhead;
      const targetZ = c.z + 1.15 + Math.sin(c.pitch) * lookAhead;

      this.camera.position.copy(V(camX, camY, camZ));
      this.tmpTarget.copy(V(targetX, targetY, targetZ));
      this.camera.lookAt(this.tmpTarget);
    } else {
      // High overhead third-person chase camera ('Góc nhìn cao / Toàn cảnh')
      const distBack = POV_CONFIG.DRIVE_TOP_DISTANCE * Math.cos(this.lookPitch * 0.45);
      const heightUp = POV_CONFIG.DRIVE_TOP_HEIGHT + Math.sin(this.lookPitch) * 6;

      const camX = c.x - Math.cos(camYaw) * distBack;
      const camY = c.y - Math.sin(camYaw) * distBack;
      const camZ = c.z + Math.max(5.5, heightUp);

      const lookAhead = 6.0;
      const targetX = c.x + Math.cos(c.heading) * lookAhead;
      const targetY = c.y + Math.sin(c.heading) * lookAhead;
      const targetZ = c.z + 0.9;

      this.camera.position.copy(V(camX, camY, camZ));
      this.tmpTarget.copy(V(targetX, targetY, targetZ));
      this.camera.lookAt(this.tmpTarget);
    }

    this.telemetry = {
      mode: this.mode,
      speedKmh: Math.round(Math.abs(c.speed) * 3.6),
      trainIndex: this.trainIndex + 1,
      trainTotal: Math.max(1, this.telemetry.trainTotal),
      trainPhase: 'run',
      windowSide: this.windowSide,
      locationName: streetName || this.telemetry.locationName,
    };
  }

  /** Keep the car inside the road carriageway (`lòng đường`) and gently assist straight-line lane keeping */
  private constrainCarToRoad(dt: number, targetSteer: number): string {
    if (!this.roadSegments.length) return '';
    const c = this.car;
    const p: Vec2 = [c.x, c.y];

    let bestSeg: DrivableRoadSegment | null = null;
    let bestClosest: Vec2 = p;
    let bestDist = Infinity;
    let bestNormRatio = Infinity;

    let alignedSeg: DrivableRoadSegment | null = null;
    let bestAlignDot = 0.72; // ~44 degrees

    for (const seg of this.roadSegments) {
      // Quick bounding box filter
      const pad = seg.carriageHalfWidth + 14;
      if (
        c.x < Math.min(seg.a[0], seg.b[0]) - pad ||
        c.x > Math.max(seg.a[0], seg.b[0]) + pad ||
        c.y < Math.min(seg.a[1], seg.b[1]) - pad ||
        c.y > Math.max(seg.a[1], seg.b[1]) + pad
      ) {
        continue;
      }

      // Layer compatibility: when on the elevated bridge deck, stay on the bridge; when on ground, ignore high bridge middle
      if (c.z > 2.2 && seg.layer === 0) continue;
      if (c.z < 1.0 && seg.layer > 0) {
        const nearRamp = seg.s0 < 38 || seg.s0 + seg.len > seg.totalLen - 38;
        if (!nearRamp) continue;
      }

      const proj = closestOnSegment(p, seg.a, seg.b);
      const ratio = proj.d / seg.carriageHalfWidth;
      if (ratio < bestNormRatio) {
        bestNormRatio = ratio;
        bestDist = proj.d;
        bestClosest = proj.at;
        bestSeg = seg;
      }

      if (proj.d <= seg.carriageHalfWidth + 1.2) {
        const absCos = Math.abs(Math.cos(c.heading - seg.heading));
        if (absCos > bestAlignDot) {
          bestAlignDot = absCos;
          alignedSeg = seg;
        }
      }
    }

    if (!bestSeg) return '';

    // 1. Gentle straight-lane alignment assist when cruising without active steering input
    if (targetSteer === 0 && Math.abs(c.speed) > 0.35 && alignedSeg) {
      const roadDir =
        Math.cos(c.heading - alignedSeg.heading) >= 0
          ? alignedSeg.heading
          : wrapAngle(alignedSeg.heading + Math.PI);
      const diff = wrapAngle(roadDir - c.heading);
      if (Math.abs(diff) < 0.38) {
        c.heading = wrapAngle(c.heading + diff * Math.min(1, dt * 2.8));
      }
    }

    // 2. Hard carriageway curb constraint: prevent driving onto sidewalks or through buildings
    if (bestDist > bestSeg.carriageHalfWidth) {
      const dx = c.x - bestClosest[0];
      const dy = c.y - bestClosest[1];
      const dLen = Math.hypot(dx, dy) || 1;
      c.x = bestClosest[0] + (dx / dLen) * bestSeg.carriageHalfWidth;
      c.y = bestClosest[1] + (dy / dLen) * bestSeg.carriageHalfWidth;

      // Slide smoothly along the curb tangent in the direction of motion
      const moveHeading = c.speed >= 0 ? c.heading : wrapAngle(c.heading + Math.PI);
      const roadDir =
        Math.cos(moveHeading - bestSeg.heading) >= 0
          ? bestSeg.heading
          : wrapAngle(bestSeg.heading + Math.PI);
      const targetHeading = c.speed >= 0 ? roadDir : wrapAngle(roadDir + Math.PI);
      const err = wrapAngle(targetHeading - c.heading);
      c.heading = wrapAngle(c.heading + err * Math.min(1, dt * 7.0));
      c.speed *= Math.max(0.84, 1 - dt * 1.4);
    }

    return alignedSeg?.name || bestSeg.name;
  }

  private sampleRoadElevation(x: number, y: number, heading: number, currentZ: number): { z: number; pitch: number } {
    const p: Vec2 = [x, y];
    let bestZ = 0;
    let bestPitch = 0;
    let bestDist = Infinity;

    for (const seg of this.bridgeSegments) {
      const c = closestOnSegment(p, seg.a, seg.b);
      if (c.d > seg.halfWidth) continue;
      const cosAlign = Math.cos(heading - seg.heading);
      if (Math.abs(cosAlign) < 0.55 && currentZ < 1.2) continue;
      if (c.d < bestDist) {
        bestDist = c.d;
        const s = seg.s0 + c.t * seg.len;
        const z0 = streetZ(seg.street, s);
        const zAhead = streetZ(seg.street, Math.max(0, Math.min(seg.s0 + seg.len, s + (cosAlign >= 0 ? 2.5 : -2.5))));
        bestZ = z0;
        bestPitch = Math.atan2(zAhead - z0, 2.5);
      }
    }
    return { z: bestZ, pitch: bestPitch };
  }

  // ---------- Circular Mini-Map HUD Renderer ----------

  /** Render the rotating circular mini-map radar (`mini map tròn nhỏ`) onto a 2D canvas */
  drawMiniMap(
    canvas: HTMLCanvasElement,
    trains: readonly TrainInstanceRef[],
    simTime: number,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = canvas.clientWidth || 144;
    const size = Math.round(cssSize * dpr);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    const css = getComputedStyle(document.documentElement);
    const tok = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const colBg = tok('--bg', '#12151a');
    const colPanel = tok('--panel', '#1b2028');
    const colDeck = tok('--deck', '#2a303c');
    const colLine = tok('--line', '#6c7a89');
    const colAccent = tok('--accent', '#f59e0b');
    const colAccentHi = tok('--accent-hi', '#fbbf24');
    const colInk = tok('--ink-hi', '#f3f4f6');
    const colWater = tok('--glass', '#3b82f6');

    const cx = size * 0.5;
    const cy = size * 0.5;
    const radius = size * 0.5 - 3 * dpr;
    const mapRangeMeters = this.isMetro() ? 340 : 210;
    const scale = radius / mapRangeMeters;

    ctx.clearRect(0, 0, size, size);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Background fill
    ctx.fillStyle = colBg;
    ctx.fillRect(0, 0, size, size);

    // Transform world (x, y) around (playerX, playerY) so player heading points UP (-Y on canvas):
    // Forward u = (cos(h), sin(h)) -> screen (0, -1)
    // Right   v = (-sin(h), cos(h)) -> screen (+1, 0)
    const h = this.playerHeading;
    const cosH = Math.cos(h);
    const sinH = Math.sin(h);
    const px = this.playerX;
    const py = this.playerY;

    const toScreen = (wx: number, wy: number): [number, number] => {
      const dx = wx - px;
      const dy = wy - py;
      const right = -dx * sinH + dy * cosH;
      const fwd = dx * cosH + dy * sinH;
      return [cx + right * scale, cy - fwd * scale];
    };

    // 1. Water bodies & parks
    for (const area of this.city.areas) {
      if (area.kind !== 'water' && area.kind !== 'park') continue;
      const poly = area.polygon;
      if (poly.length < 3) continue;
      const p0 = poly[0]!;
      if (Math.hypot(p0[0] - px, p0[1] - py) > mapRangeMeters * 2.2) continue;
      ctx.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const [sx, sy] = toScreen(poly[i]![0], poly[i]![1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = area.kind === 'water' ? colWater : colPanel;
      ctx.globalAlpha = area.kind === 'water' ? 0.45 : 0.65;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. Streets (carriageway strokes + curb outlines)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const st of this.city.streets) {
      if (st.kind === 'footway' || st.kind === 'steps' || st.width < 3.5) continue;
      const pts = st.path;
      if (pts.length < 2) continue;
      const mid = pts[pts.length >> 1]!;
      if (Math.hypot(mid[0] - px, mid[1] - py) > mapRangeMeters * 1.65) continue;

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = toScreen(pts[i]![0], pts[i]![1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      const wPx = Math.max(1.8 * dpr, st.width * scale);
      ctx.strokeStyle = colLine;
      ctx.lineWidth = wPx + 1.4 * dpr;
      ctx.stroke();
      ctx.strokeStyle = st.layer > 0 ? colPanel : colDeck;
      ctx.lineWidth = wPx;
      ctx.stroke();
    }

    // 3. Elevated Metro Line 2A track & stations
    for (const r of this.city.rails) {
      if (r.kind !== 'metro' || !r.elevated || r.path.length < 2) continue;
      ctx.beginPath();
      for (let i = 0; i < r.path.length; i++) {
        const [sx, sy] = toScreen(r.path[i]![0], r.path[i]![1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = colAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.2 * dpr;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Metro stations & moving trains on mini-map
    for (const st of this.city.stations) {
      if (st.kind !== 'metro') continue;
      const [sx, sy] = toScreen(st.at[0], st.at[1]);
      if (Math.hypot(sx - cx, sy - cy) > radius) continue;
      ctx.fillStyle = colAccentHi;
      ctx.strokeStyle = colBg;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.6 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const tr of trains) {
      const { head } = trainAt(tr.track, simTime + tr.offset);
      if (head === null) continue;
      const { p } = samplePathAt(tr.track.path, Math.max(0, Math.min(tr.track.length, head - METRO.carLen)));
      const [sx, sy] = toScreen(p[0], p[1]);
      if (Math.hypot(sx - cx, sy - cy) > radius) continue;
      ctx.fillStyle = colAccentHi;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.6 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Compact street name labels inside the mini-map
    ctx.font = `600 ${Math.round(8.5 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let drawnLabels = 0;
    for (const lbl of this.miniMapLabels) {
      if (drawnLabels >= 5) break;
      const d = Math.hypot(lbl.x - px, lbl.y - py);
      if (d > mapRangeMeters * 0.82 || d < 18) continue;
      const [sx, sy] = toScreen(lbl.x, lbl.y);
      if (Math.hypot(sx - cx, sy - cy) > radius - 18 * dpr) continue;
      ctx.fillStyle = colBg;
      ctx.globalAlpha = 0.82;
      const tw = ctx.measureText(lbl.name).width + 6 * dpr;
      ctx.fillRect(sx - tw * 0.5, sy - 5.5 * dpr, tw, 11 * dpr);
      ctx.globalAlpha = 1;
      ctx.fillStyle = lbl.isPrimary ? colAccentHi : colInk;
      ctx.fillText(lbl.name, sx, sy);
      drawnLabels++;
    }

    // 5. View frustum cone fan from center
    const lookOffset = this.isMetro() && this.mode === 'metro-passenger'
      ? this.windowSide * 0.62 + this.lookYaw
      : this.lookYaw;
    const coneHalf = (this.camera.fov * Math.PI) / 360;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lookOffset);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius * 0.55, -Math.PI * 0.5 - coneHalf, -Math.PI * 0.5 + coneHalf);
    ctx.closePath();
    ctx.fillStyle = colAccentHi;
    ctx.globalAlpha = 0.14;
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    // 6. Player directional arrow in center (pointing UP)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = colAccentHi;
    ctx.strokeStyle = colBg;
    ctx.lineWidth = 1.8 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, -7.5 * dpr);
    ctx.lineTo(5.8 * dpr, 6.2 * dpr);
    ctx.lineTo(0, 3.2 * dpr);
    ctx.lineTo(-5.8 * dpr, 6.2 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end circle clip

    // Outer circular bezel & rotating North ('B') badge on the rim
    ctx.strokeStyle = colAccentHi;
    ctx.lineWidth = 1.8 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // True North in city coordinates: bearing is 62.5° CCW from East (27.5° CW from North),
    // so North direction vector in (x, y) is (cos(-0.48), sin(-0.48))
    const northWorldAngle = (-27.5 * Math.PI) / 180;
    const [nxScreen, nyScreen] = toScreen(
      px + Math.cos(northWorldAngle) * mapRangeMeters,
      py + Math.sin(northWorldAngle) * mapRangeMeters,
    );
    const nAng = Math.atan2(nyScreen - cy, nxScreen - cx);
    const nBadgeX = cx + Math.cos(nAng) * (radius - 8 * dpr);
    const nBadgeY = cy + Math.sin(nAng) * (radius - 8 * dpr);
    ctx.fillStyle = colAccentHi;
    ctx.beginPath();
    ctx.arc(nBadgeX, nBadgeY, 6.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colBg;
    ctx.font = `700 ${Math.round(7.5 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nBadgeX, nBadgeY + 0.5 * dpr);
  }

  // ---------- High-Performance Frustum & Distance LOD Culling ----------

  /** Current focal point in Three.js ground coordinates `(x, z)` for tile prioritization */
  getFocusPoint(): { x: number; z: number } {
    if (this.isDriving()) {
      return { x: this.car.x, z: this.car.y };
    }
    return { x: this.camGroundX + this.camFwdX * 45, z: this.camGroundZ + this.camFwdZ * 45 };
  }

  /** Fast frustum-cone + distance check for building tiles in POV mode */
  isTileVisibleInPov(center: [number, number], radius: number, isLandmark: boolean): boolean {
    const dx = center[0] - this.camGroundX;
    const dz = center[1] - this.camGroundZ;
    const fwd = dx * this.camFwdX + dz * this.camFwdZ;

    // Always keep landmarks in front of the camera visible on the skyline
    if (isLandmark) {
      return fwd > -radius - 95;
    }

    // Keep a generous radius around the vehicle/train so turning or looking around never shows empty space
    const distSq = dx * dx + dz * dz;
    const nearRadius = 155 + radius;
    if (distSq <= nearRadius * nearRadius) return true;

    const backAllowance = this.mode === 'drive-top' || this.isMetro() ? 85 : 45;
    if (fwd < -radius - backAllowance) return false;

    const maxDist = POV_CONFIG.CULL_MAX_DIST + radius;
    if (distSq > maxDist * maxDist) return false;

    const lat = Math.abs(-dx * this.camFwdZ + dz * this.camFwdX);
    const coneHalfWidth = Math.max(95, Math.max(0, fwd) * 1.55) + radius;
    return lat <= coneHalfWidth;
  }

  /** Distance-tiered building detail level (L1–L3) in POV mode */
  tileDetailInPov(center: [number, number], maxDetail: Detail): Detail {
    const d = Math.hypot(center[0] - this.camGroundX, center[1] - this.camGroundZ);
    const raw: Detail = d < POV_CONFIG.LOD_L3_DIST ? 3 : d < POV_CONFIG.LOD_L2_DIST ? 2 : 1;
    return Math.min(maxDetail, raw) as Detail;
  }

  /** Fast check for street furniture cells and dynamic vehicles in POV mode */
  isPointVisibleInPov(x: number, z: number, radius: number, maxDist: number): boolean {
    const dx = x - this.camGroundX;
    const dz = z - this.camGroundZ;
    const distSq = dx * dx + dz * dz;
    const nearR = 95 + radius;
    if (distSq <= nearR * nearR) return true;
    const backLimit = this.mode === 'drive-top' || this.isMetro() ? 65 : 35;
    const fwd = dx * this.camFwdX + dz * this.camFwdZ;
    if (fwd < -radius - backLimit) return false;
    const lim = maxDist + radius;
    if (distSq > lim * lim) return false;
    const lat = Math.abs(-dx * this.camFwdZ + dz * this.camFwdX);
    return lat <= Math.max(70, Math.max(0, fwd) * 1.5) + radius;
  }
}
