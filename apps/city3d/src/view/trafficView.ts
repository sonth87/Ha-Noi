/* Which vehicles exist (around the camera) and which get drawn this frame. No GPU objects: tested in Node.
   A vehicle is culled by where it *is* (after placing it on its lane), never by where its lane starts:
   lanes run up to 5.5 km, so a lane-start test hid cars right under the camera (CS-09, rule A27). */
import * as THREE from 'three';
import { closestOnSegment, spawnTraffic, type Lane, type Vehicle } from '@my-city/core';
import { placeVehicle } from '@render/vehicles';
import { SpatialGrid } from './spatialGrid';

/**
 * Places every vehicle of `list` on its lane and calls `onVisible(slot, matrix)` for those `inView` accepts,
 * with consecutive slots from 0. Returns how many were visible.
 */
export function placeVisibleVehicles(
  list: readonly Vehicle[],
  lanes: readonly Lane[],
  inView: (x: number, z: number) => boolean,
  onVisible: (slot: number, matrix: THREE.Matrix4, vehicle: Vehicle) => void,
  mat: THREE.Matrix4 = new THREE.Matrix4(),
): number {
  const e = mat.elements;
  let vis = 0;
  for (const v of list) {
    const lane = lanes[v.lane];
    if (!lane) continue;
    placeVehicle(v, lane, mat);
    if (!inView(e[12]!, e[14]!)) continue;
    onVisible(vis, mat, v);
    vis++;
  }
  return vis;
}

/** Vehicles live on the lanes that pass within this distance of the view's focus (m). */
export const TRAFFIC_RADIUS = 600;
/** never more than this many simulated at once (a 0.6 density within 600 m of the centre is ~2 k) */
export const MAX_VEHICLES = 4000;

/**
 * Traffic around the camera (CS-09: 900 vehicles spread over 3.5 k lanes of the whole city left about 2 % of
 * the density on screen). A lane is a loop, so keeping every vehicle of the lanes that pass near the focus gives
 * a steady flow there. When the focus has moved far enough, `around` picks the lanes again; vehicles already
 * driving keep their state (same id = same lane, track and slot), new lanes bring their own.
 */
export class TrafficArea {
  private readonly grid = new SpatialGrid<number>(256);
  centre: { x: number; z: number } | null = null;

  constructor(private readonly lanes: readonly Lane[]) {
    lanes.forEach((ln, i) => {
      for (let k = 1; k < ln.path.length; k++) {
        const a = ln.path[k - 1]!, b = ln.path[k]!;
        const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
        this.grid.insert(i, cx, cz, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
      }
    });
  }

  /** the focus moved more than a third of the radius from where the lanes were picked */
  stale(x: number, z: number): boolean {
    return !this.centre || Math.hypot(x - this.centre.x, z - this.centre.z) > TRAFFIC_RADIUS / 3;
  }

  /** indices of the lanes with a segment within the radius of (x, z) */
  lanesNear(x: number, z: number): number[] {
    const out: number[] = [];
    for (const i of this.grid.query(x, z, TRAFFIC_RADIUS)) {
      const p = this.lanes[i]!.path;
      for (let k = 1; k < p.length; k++) {
        if (closestOnSegment([x, z], p[k - 1]!, p[k]!).d <= TRAFFIC_RADIUS) { out.push(i); break; }
      }
    }
    return out.sort((a, b) => a - b);
  }

  /** the vehicles for a focus at (x, z): `previous` ones that are still on a picked lane keep going */
  around(x: number, z: number, density: number, previous: readonly Vehicle[]): Vehicle[] {
    this.centre = { x, z };
    const idx = this.lanesNear(x, z);
    const spawned = spawnTraffic(idx.map(i => this.lanes[i]!), density).map(v => ({ ...v, lane: idx[v.lane]! }));
    const kept = new Map(previous.map(v => [v.id, v]));
    let out = spawned.map(v => kept.get(v.id) ?? v);
    if (out.length > MAX_VEHICLES) {
      const stride = out.length / MAX_VEHICLES;
      out = Array.from({ length: MAX_VEHICLES }, (_, i) => out[Math.floor(i * stride)]!);
    }
    return out;
  }
}

/** a vehicle placed this frame: ground position and heading (from its instance matrix) */
export interface PlacedVehicle { x: number; z: number; heading: number; len: number }

export const placedFrom = (m: THREE.Matrix4, len: number): PlacedVehicle => {
  const e = m.elements;
  return { x: e[12]!, z: e[14]!, heading: Math.atan2(e[2]!, e[0]!), len };
};

/** Free distance a traffic vehicle has before the player's car, if that car is in front of it in its lane
    (within 25 m ahead and 1.8 m to the side); Infinity otherwise. Feeds stepTraffic's obstacleAhead. */
export function playerAhead(v: PlacedVehicle, player: { x: number; z: number }): number {
  const dx = player.x - v.x, dz = player.z - v.z, c = Math.cos(v.heading), s = Math.sin(v.heading);
  const along = dx * c + dz * s, side = Math.abs(-dx * s + dz * c);
  return along > 0 && along < 25 && side < 1.8 ? along - v.len / 2 - PLAYER_HALF_LEN - 1.5 : Infinity;
}

const PLAYER_HALF_LEN = 2.2;
const PLAYER_R = 1.6;

/** Keep the player's car out of the traffic: push it off every vehicle it overlaps (circles of ~half a car)
    and take most of its speed if it was driving into one. Mutates and returns whether it hit something. */
export function separateFromTraffic(car: { x: number; y: number; heading: number; speed: number }, traffic: readonly PlacedVehicle[]): boolean {
  let hit = false;
  for (const v of traffic) {
    const r = PLAYER_R + Math.max(0.6, v.len / 2.6);
    const dx = car.x - v.x, dy = car.y - v.z, d = Math.hypot(dx, dy);
    if (d >= r) continue;
    const nx = d > 1e-6 ? dx / d : -Math.cos(car.heading), ny = d > 1e-6 ? dy / d : -Math.sin(car.heading);
    car.x = v.x + nx * r;
    car.y = v.z + ny * r;
    const vx = Math.cos(car.heading) * car.speed, vy = Math.sin(car.heading) * car.speed;
    if (vx * nx + vy * ny < 0) car.speed *= -0.15;
    hit = true;
  }
  return hit;
}
