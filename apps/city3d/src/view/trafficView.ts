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
const PLAYER_HALF_W = 0.9;
/** half the width of a traffic vehicle: a car is 1.8 m wide, a motorbike with its rider 0.8 m */
const halfWidthOf = (len: number) => (len < 3 ? 0.4 : 0.9);

/** Keep the player's car out of the traffic. Both are boxes turned to their heading (separating axis test): two
    cars side by side in neighbouring lanes, or nose to tail a metre apart, do not touch (the old test used circles
    of ~3.3 m and called that a crash, ADR-064). When they overlap, the car is pushed out the shortest way and loses
    the part of its speed that went into the other one. Mutates and returns whether it hit something. */
export function separateFromTraffic(car: { x: number; y: number; heading: number; speed: number }, traffic: readonly PlacedVehicle[]): boolean {
  let hit = false;
  for (const v of traffic) {
    const ca = Math.cos(car.heading), sa = Math.sin(car.heading), cb = Math.cos(v.heading), sb = Math.sin(v.heading);
    const axes: [number, number][] = [[ca, sa], [-sa, ca], [cb, sb], [-sb, cb]];
    const dx = car.x - v.x, dy = car.y - v.z;
    const hl = v.len / 2, hw = halfWidthOf(v.len);
    let depth = Infinity, nx = 0, ny = 0;
    for (const [ax, ay] of axes) {
      const ra = PLAYER_HALF_LEN * Math.abs(ca * ax + sa * ay) + PLAYER_HALF_W * Math.abs(-sa * ax + ca * ay);
      const rb = hl * Math.abs(cb * ax + sb * ay) + hw * Math.abs(-sb * ax + cb * ay);
      const d = dx * ax + dy * ay, over = ra + rb - Math.abs(d);
      if (over <= 0) { depth = 0; break; }
      if (over < depth) { depth = over; nx = d >= 0 ? ax : -ax; ny = d >= 0 ? ay : -ay; }
    }
    if (depth <= 0) continue;
    car.x += nx * depth;
    car.y += ny * depth;
    const vx = ca * car.speed, vy = sa * car.speed, into = vx * nx + vy * ny;
    if (into < 0) {
      const tx = vx - into * nx, ty = vy - into * ny;
      car.speed = Math.sign(car.speed) * Math.hypot(tx, ty) * 0.6;
    }
    hit = true;
  }
  return hit;
}
