/* Perspective POV Camera & Interactive Vehicle Driving Controller.
   Supports:
   - 'metro-cab': First-person view from the front driver cab of Metro Line 2A trains.
   - 'metro-passenger': Window-seat passenger view looking out over the city from the elevated metro.
   - 'drive-cabin': Interactive car driving with first-person cabin camera.
   - 'drive-top': Interactive car driving with elevated top-down chase camera.
   Includes frustum-cone & distance-tiered LOD culling for 60 FPS perspective rendering. */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  METRO,
  closestOnSegment,
  dist,
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

export class PovController {
  readonly camera: THREE.PerspectiveCamera;
  private mode: PovMode = 'map';
  private trainIndex = 0;
  private windowSide: 1 | -1 = 1;

  // Free-look offsets (radians) controlled by pointer drag
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

  // Pre-indexed bridge segments for smooth overpass driving elevation
  private readonly bridgeSegments: BridgeSegment[] = [];

  // Cached frustum ground origin & forward unit vector (Three.js X, Z plane) for fast 0-alloc culling
  private camGroundX = 0;
  private camGroundZ = 0;
  private camFwdX = 1;
  private camFwdZ = 0;

  // Telemetry snapshot for HUD
  private telemetry: PovTelemetry = {
    mode: 'map',
    speedKmh: 0,
    trainIndex: 0,
    trainTotal: 1,
    trainPhase: 'run',
    windowSide: 1,
  };

  // Player's 3D car mesh (visible in 'drive-top' mode)
  private playerCarGroup: THREE.Group | null = null;
  private playerBeamMesh: THREE.Mesh | null = null;

  // Pre-allocated vectors to avoid GC pressure in 60fps loop
  private readonly tmpTarget = new THREE.Vector3();

  constructor(private readonly city: City, private readonly panBounds: { x0: number; y0: number; x1: number; y1: number }) {
    this.camera = new THREE.PerspectiveCamera(POV_CONFIG.FOV_CAB, 16 / 9, POV_CONFIG.NEAR, POV_CONFIG.FAR);
    this.indexBridges();
  }

  private indexBridges(): void {
    for (const st of this.city.streets) {
      if (st.layer <= 0 || st.profile.length === 0) continue;
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

  /** Build and attach the player's drivable 3D car mesh to the map group */
  mountPlayerCar(
    parent: THREE.Object3D,
    vehicleMats: Record<Exclude<VehiclePart, 'beam'>, THREE.MeshBasicMaterial>,
    beamMat: THREE.MeshBasicMaterial,
    shellMat: THREE.ShaderMaterial,
    creaseMat: LineMaterial,
  ): void {
    if (this.playerCarGroup) {
      parent.remove(this.playerCarGroup);
    }
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

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setMode(
    next: PovMode,
    trains: readonly TrainInstanceRef[],
    mapTarget: { x: number; z: number },
  ): void {
    const prev = this.mode;
    this.mode = next;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.keysPressed.clear();
    this.touchControls.clear();

    // Restore visibility on any train car that was hidden in metro-cab mode
    for (const tr of trains) {
      if (tr.cars[0]) tr.cars[0].userData.hiddenByCabPov = false;
    }

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
      if (!wasDriving || !this.car.initialized) {
        this.spawnCarNear(mapTarget.x, mapTarget.z);
      }
      if (this.playerCarGroup) {
        this.playerCarGroup.visible = next === 'drive-top';
      }
    } else {
      if (this.playerCarGroup) this.playerCarGroup.visible = false;
      if (trains.length > 0) {
        this.trainIndex = this.trainIndex % trains.length;
      }
    }
  }

  /** Snap the player's car onto the nearest main drivable street near `(worldX, worldZ)` */
  resetCarNear(worldX: number, worldZ: number): void {
    this.spawnCarNear(worldX, worldZ);
  }

  private spawnCarNear(worldX: number, worldZ: number): void {
    const p: Vec2 = [worldX, worldZ];
    let bestDist = Infinity;
    let bestPoint: Vec2 = [worldX, worldZ];
    let bestHeading = 0;
    let bestWidth = 10;

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
        }
      }
    }

    // Offset slightly to the right-hand lane
    const laneOffset = Math.min(2.8, bestWidth * 0.22);
    const spawnX = bestPoint[0] + Math.sin(bestHeading) * laneOffset;
    const spawnY = bestPoint[1] - Math.cos(bestHeading) * laneOffset;

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
  }

  /** Switch to the next Metro train in the fleet */
  nextTrain(trains: readonly TrainInstanceRef[]): void {
    if (!trains.length) return;
    for (const tr of trains) {
      if (tr.cars[0]) tr.cars[0].userData.hiddenByCabPov = false;
    }
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

  /** Toggle between Cabin and Top-Down Chase camera while driving */
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

  /** Rotate free-look camera by pointer delta in pixels */
  addLookDelta(dxPx: number, dyPx: number): void {
    if (this.mode === 'map') return;
    const sensitivity = 0.0038;
    const maxYaw = this.mode === 'drive-top' ? Math.PI : Math.PI * 0.72;
    const maxPitch = this.mode === 'drive-top' ? 0.35 : 0.62;
    this.lookYaw = Math.max(-maxYaw, Math.min(maxYaw, this.lookYaw - dxPx * sensitivity));
    this.lookPitch = Math.max(-maxPitch, Math.min(maxPitch, this.lookPitch - dyPx * sensitivity));
  }

  handleKeyDown(key: string): boolean {
    if (this.mode === 'map') return false;
    const k = key.toLowerCase();
    if (k === 'c') {
      this.centerLook();
      return true;
    }
    if (this.isDriving()) {
      if (k === 'w' || k === 'arrowup' || k === 's' || k === 'arrowdown' || k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright' || k === ' ') {
        this.keysPressed.add(k);
        return true;
      }
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
      this.stepMetro(simTime, trains);
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

  private stepMetro(simTime: number, trains: readonly TrainInstanceRef[]): void {
    if (!trains.length) return;
    const idx = ((this.trainIndex % trains.length) + trains.length) % trains.length;
    const tr = trains[idx]!;
    const track = tr.track;
    const L = track.length;

    // Active running duration of the track (excluding 'away' dwell outside map)
    const activePeriod = Math.max(10, track.period - METRO.between);
    let { head, phase } = trainAt(track, simTime + tr.offset);
    let effectiveTime = simTime + tr.offset;
    if (head === null) {
      // Seamlessly wrap onto the active part of the timetable so the user never stares at an empty void
      const u = (((simTime + tr.offset + track.phase) % activePeriod) + activePeriod) % activePeriod;
      effectiveTime = u - track.phase;
      const wrapped = trainAt(track, effectiveTime);
      head = wrapped.head ?? METRO.carLen;
      phase = wrapped.phase;
    }

    // Estimate instantaneous speed (km/h) via finite difference along timetable
    const nextSample = trainAt(track, effectiveTime + 0.2);
    const speedMs =
      nextSample.head !== null && head !== null
        ? Math.max(0, (nextSample.head - head) / 0.2)
        : phase === 'stop'
          ? 0
          : METRO.speed;
    const speedKmh = Math.round(speedMs * 3.6);

    if (this.mode === 'metro-cab') {
      // Front driver cab of Car 0
      const car0CenterS = Math.max(0, Math.min(L, head - METRO.carLen / 2));
      const cabS = Math.max(0, Math.min(L, car0CenterS + POV_CONFIG.METRO_CAB_OFFSET_FWD));
      const { p, h } = samplePathAt(track.path, cabS);
      const camZ = track.height + POV_CONFIG.METRO_CAB_HEIGHT;

      // Hide Car 0's exterior shell so the camera has a clean windshield view
      if (tr.cars[0]) {
        tr.cars[0].visible = false;
        tr.cars[0].userData.hiddenByCabPov = true;
      }

      const yaw = h + this.lookYaw;
      const pitch = -0.03 + this.lookPitch;
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
      // Passenger window seat in Car 1 (or Car 0 if near start)
      if (tr.cars[0] && tr.cars[0].userData.hiddenByCabPov) {
        tr.cars[0].visible = true;
        tr.cars[0].userData.hiddenByCabPov = false;
      }
      const car1S = Math.max(0, Math.min(L, head - METRO.carLen / 2 - (METRO.carLen + METRO.gap)));
      const { p, h } = samplePathAt(track.path, car1S);
      const side = this.windowSide;
      // Normal perpendicular to track direction (right = +1, left = -1)
      const nx = Math.sin(h) * side;
      const ny = -Math.cos(h) * side;
      const eyeX = p[0] + nx * POV_CONFIG.METRO_PASSENGER_SIDE_OFFSET;
      const eyeY = p[1] + ny * POV_CONFIG.METRO_PASSENGER_SIDE_OFFSET;
      const eyeZ = track.height + POV_CONFIG.METRO_PASSENGER_HEIGHT;

      // Default passenger gaze angled ~72° out the window and slightly downward toward the streets
      const baseYaw = h - side * 1.25;
      const yaw = baseYaw + this.lookYaw;
      const pitch = -0.14 + this.lookPitch;
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

    this.telemetry = {
      mode: this.mode,
      speedKmh,
      trainIndex: idx + 1,
      trainTotal: trains.length,
      trainPhase: phase,
      windowSide: this.windowSide,
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
      const decel = c.speed > 0 ? POV_CONFIG.DRIVE_BRAKE : POV_CONFIG.DRIVE_ACCEL * 0.7;
      c.speed = Math.max(-POV_CONFIG.DRIVE_REVERSE_MAX_SPEED, c.speed - decel * dt);
    } else {
      // Natural rolling resistance
      if (Math.abs(c.speed) < 0.15) c.speed = 0;
      else c.speed -= Math.sign(c.speed) * POV_CONFIG.DRIVE_DRAG * dt;
    }

    // Steering input with auto-centering
    const targetSteer = (wantLeft ? 1 : 0) - (wantRight ? 1 : 0);
    if (targetSteer !== 0) {
      c.steer = Math.max(-1, Math.min(1, c.steer + targetSteer * POV_CONFIG.DRIVE_STEER_RATE * dt * 2.4));
    } else {
      const returnStep = POV_CONFIG.DRIVE_STEER_RATE * dt * 3.2;
      if (Math.abs(c.steer) <= returnStep) c.steer = 0;
      else c.steer -= Math.sign(c.steer) * returnStep;
    }

    // Bicycle kinematics
    if (Math.abs(c.speed) > 0.02) {
      const speedFactor = 1 / (1 + Math.abs(c.speed) * 0.045);
      const maxSteerAngle = 0.58 * speedFactor;
      const wheelAngle = c.steer * maxSteerAngle;
      const wheelbase = 2.65;
      c.heading += (c.speed / wheelbase) * Math.tan(wheelAngle) * dt;
      c.x += Math.cos(c.heading) * c.speed * dt;
      c.y += Math.sin(c.heading) * c.speed * dt;
      c.x = Math.max(this.panBounds.x0, Math.min(this.panBounds.x1, c.x));
      c.y = Math.max(this.panBounds.y0, Math.min(this.panBounds.y1, c.y));
    }

    // Compute road elevation (smoothly climbs overpasses when aligned with bridge direction)
    const { z: targetZ, pitch: targetPitch } = this.sampleRoadElevation(c.x, c.y, c.heading, c.z);
    const zBlend = Math.min(1, dt * 10);
    c.z += (targetZ - c.z) * zBlend;
    c.pitch += (targetPitch - c.pitch) * zBlend;

    // Update 3D player car mesh position & orientation
    if (this.playerCarGroup) {
      this.playerCarGroup.visible = this.mode === 'drive-top';
      this.playerCarGroup.position.copy(V(c.x, c.y, c.z + 0.12));
      this.playerCarGroup.rotation.order = 'YXZ';
      this.playerCarGroup.rotation.y = -c.heading;
      this.playerCarGroup.rotation.z = c.pitch;
      if (this.playerBeamMesh) {
        this.playerBeamMesh.visible = nightBeamOn;
      }
    }

    if (this.mode === 'drive-cabin') {
      // First-person cabin view from the driver's seat
      const eyeX = c.x + Math.cos(c.heading) * POV_CONFIG.DRIVE_CABIN_FWD;
      const eyeY = c.y + Math.sin(c.heading) * POV_CONFIG.DRIVE_CABIN_FWD;
      const eyeZ = c.z + POV_CONFIG.DRIVE_CABIN_HEIGHT;
      const yaw = c.heading + this.lookYaw - c.steer * 0.08;
      const pitch = c.pitch - 0.02 + this.lookPitch;
      const cosP = Math.cos(pitch);

      this.camera.position.copy(V(eyeX, eyeY, eyeZ));
      this.tmpTarget.copy(
        V(
          eyeX + Math.cos(yaw) * cosP * 50,
          eyeY + Math.sin(yaw) * cosP * 50,
          eyeZ + Math.sin(pitch) * 50,
        ),
      );
      this.camera.lookAt(this.tmpTarget);
    } else {
      // Elevated top-down chase camera ('drive-top')
      const angleDiff = Math.atan2(Math.sin(c.heading - c.chaseYaw), Math.cos(c.heading - c.chaseYaw));
      c.chaseYaw += angleDiff * Math.min(1, dt * 6.5);
      const camYaw = c.chaseYaw + this.lookYaw;
      const distBack = POV_CONFIG.DRIVE_TOP_DISTANCE * Math.cos(this.lookPitch * 0.5);
      const heightUp = POV_CONFIG.DRIVE_TOP_HEIGHT + Math.sin(this.lookPitch) * 6;

      const camX = c.x - Math.cos(camYaw) * distBack;
      const camY = c.y - Math.sin(camYaw) * distBack;
      const camZ = c.z + Math.max(4.5, heightUp);

      const lookAhead = 6.5;
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
    };
  }

  private sampleRoadElevation(x: number, y: number, heading: number, currentZ: number): { z: number; pitch: number } {
    const p: Vec2 = [x, y];
    let bestZ = 0;
    let bestPitch = 0;
    let bestDist = Infinity;

    for (const seg of this.bridgeSegments) {
      const c = closestOnSegment(p, seg.a, seg.b);
      if (c.d > seg.halfWidth) continue;
      // Check alignment with bridge direction (either forward or reverse along the bridge)
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
      return fwd > -radius - 65;
    }

    // In elevated top-down driving view, keep a generous radius around the car plus forward cone
    const backAllowance = this.mode === 'drive-top' ? 65 : 32;
    if (fwd < -radius - backAllowance) return false;

    const distSq = dx * dx + dz * dz;
    const maxDist = POV_CONFIG.CULL_MAX_DIST + radius;
    if (distSq > maxDist * maxDist) return false;

    const lat = Math.abs(-dx * this.camFwdZ + dz * this.camFwdX);
    const coneHalfWidth = Math.max(65, Math.max(0, fwd) * 1.45) + radius;
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
    const backLimit = this.mode === 'drive-top' ? 50 : 25;
    const fwd = dx * this.camFwdX + dz * this.camFwdZ;
    if (fwd < -radius - backLimit) return false;
    const lim = maxDist + radius;
    if (dx * dx + dz * dz > lim * lim) return false;
    const lat = Math.abs(-dx * this.camFwdZ + dz * this.camFwdX);
    return lat <= Math.max(55, Math.max(0, fwd) * 1.4) + radius;
  }
}
