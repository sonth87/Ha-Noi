/* Buildings from the city model (M3): every part a prism, windows floor by floor on every wall
   that faces out (a party wall gets windows only above the neighbour), and the few hand-made
   details of the models (Việt Tower's mast). The window style follows the data:
     - a glass facade      → a curtain band per floor (thin mullion gaps only at corners);
     - Việt Tower          → one continuous ribbon per floor (its look since the old app);
     - anything else       → punched windows about every 2.6 m, and a shop front on the ground
                             floor of the street side of a generated house.
   Floors light by id `<building>/<n>` (core floorId). Detailed houses are M4. Pure. */
import * as THREE from 'three';
import { bbox, centroid, floorId, floorZ, partTop, pointInRing, type Building, type BuildingPart, type City, type Vec2 } from '@my-city/core';
import { V, type Batch } from './batch';

/** what the view needs to know about the buildings after they are built */
export interface BuiltBuildings {
  /** every floor of every building, bottom to top per building */
  floors: string[];
  /** the aircraft light(s) on the models, in three.js coordinates */
  beacons: THREE.Vector3[];
}

type Style = 'curtain' | 'ribbon' | 'punched';

export function buildBuildings(B: Batch, city: City): BuiltBuildings {
  const floors: string[] = [], beacons: THREE.Vector3[] = [];
  const boxes = city.buildings.map(b => ({ b, box: bbox(b.footprint) }));
  /** height of whatever other building stands at p (0 = open) */
  const neighbour = (self: Building, p: Vec2) => {
    let h = 0;
    for (const { b, box } of boxes) {
      if (b === self || p[0] < box.x0 || p[0] > box.x1 || p[1] < box.y0 || p[1] > box.y1) continue;
      for (const part of b.parts) if (pointInRing(p, part.footprint)) h = Math.max(h, partTop(part));
    }
    return h;
  };

  for (const b of city.buildings) {
    const levels = Math.max(...b.parts.map(p => p.floors.length));
    for (let n = 1; n <= levels; n++) floors.push(floorId(b, n));
    for (const part of b.parts) {
      const glass = part.facade === 'glass';
      B.solid(part.footprint, part.z0, partTop(part), () => (glass ? 'glass' : 'wall'), 'roof', b.id);
      const style: Style = glass ? 'curtain' : b.model === 'viet-tower' ? 'ribbon' : 'punched';
      windows(B, b, part, style, neighbour);
    }
    if (b.model === 'viet-tower') beacons.push(vietTowerMast(B, b));
  }
  return { floors, beacons };
}

function windows(B: Batch, b: Building, part: BuildingPart, style: Style, neighbour: (self: Building, p: Vec2) => number) {
  const R = part.footprint, n = R.length;
  const dir = (i: number) => { const p = R[i]!, q = R[(i + 1) % n]!; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const turn = (i: number) => { let t = Math.abs(dir(i) - dir((i - 1 + n) % n)); if (t > Math.PI) t = 2 * Math.PI - t; return t; };
  const front = b.house && part.id === b.id ? b.front : -1;
  R.forEach((p, i) => {
    const q = R[(i + 1) % n]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 0.5) return;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux;   // along the wall, outward
    const nrm = new THREE.Vector3(nx, 0, ny), off = 0.06;
    // a party wall: windows only above the neighbour standing against it
    const probe: Vec2 = [(p[0] + q[0]) / 2 + nx * 0.6, (p[1] + q[1]) / 2 + ny * 0.6];
    const blockedTo = neighbour(b, probe);
    const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
    const rect = (lamp: string, t0: number, t1: number, z0: number, z1: number) => B.window(lamp, [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], nrm);
    // bands run on round a curve and stop short of a real corner
    const c0 = turn(i) > 0.5 ? 0.35 : 0, c1 = turn((i + 1) % n) > 0.5 ? 0.35 : 0;
    part.floors.forEach((h, k) => {
      const z = floorZ(part, k), lamp = floorId(b, k + 1);
      if (z + h <= blockedTo + 0.01) return;
      if (style === 'curtain') rect(lamp, c0, L - c1, z + h * 0.06, z + h * 0.94);
      else if (style === 'ribbon') rect(lamp, c0, L - c1, z + h * 0.24, z + h * 0.78);
      else if (k === 0 && i === front) rect(lamp, L * 0.1, L * 0.9, z + 0.15, z + h * 0.8);   // shop front
      else {
        if (L < 1.8) return;
        const cols = Math.max(1, Math.floor((L - 0.6) / 2.6)), cw = (L - 0.6) / cols, ww = Math.min(1.5, cw * 0.55);
        for (let c = 0; c < cols; c++) { const m = 0.3 + cw * (c + 0.5); rect(lamp, m - ww / 2, m + ww / 2, z + h * 0.3, z + h * 0.8); }
      }
    });
  });
}

/** Việt Tower: a lattice mast over the round end of the tower (its tallest part): the south end,
    facing the wedge (OSM way 845096110). Returns where the aircraft light sits. */
function vietTowerMast(B: Batch, b: Building): THREE.Vector3 {
  const tower = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
  const c = centroid(tower.footprint), far = tower.footprint.reduce((a, p) => (p[1] > a[1] ? p : a));
  const base: Vec2 = [c[0] + (far[0] - c[0]) * 0.35, c[1] + (far[1] - c[1]) * 0.35];
  const z0 = partTop(tower), H = 13, legs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const at = (s: number, z: number, [a, bb]: [number, number]) => { const w = 0.8 - (0.68 * (z - z0)) / H; return V(base[0] + a * w * s, base[1] + bb * w * s, z); };
  const seg = (p: THREE.Vector3, q: THREE.Vector3) => B.creases.push(p.x, p.y, p.z, q.x, q.y, q.z);
  for (const l of legs) seg(at(1, z0, l), at(1, z0 + H, l));
  for (let z = z0; z < z0 + H - 0.5; z += 1.3) legs.forEach((l, i) => { seg(at(1, z, l), at(1, z + 1.3, legs[(i + 1) % 4]!)); seg(at(1, z, l), at(1, z, legs[(i + 1) % 4]!)); });
  seg(V(base[0], base[1], z0 + H), V(base[0], base[1], z0 + H + 0.6));
  return V(base[0], base[1], z0 + H + 0.8);
}
