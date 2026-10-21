/* Buildings from the city model, at a detail level (M4, ADR-036):
     L0  massing only: every part a prism;
     L1  + windows floor by floor on every wall that faces out (a party wall gets windows only
         above the neighbour). Style from the data: glass facade → a band of 1.6 m panes per floor;
         Việt Tower → a ribbon of 2 m panes; anything else → punched windows about every 2.6 m,
         and a shop front on the ground floor of a generated house's street side;
     L2  generated houses built in full by the house generator (house3d.ts); other buildings get
         the facade of their kind: balconies on apartment blocks and schools, a glass shop front
         on commercial ground floors, ribbons on offices;
     L3  houses with every small thing (house3d.ts); AC units on apartment walls, water tanks on
         the roofs of blocks.
   Việt Tower's mast is drawn at every level. Floors light by id `<building>/<n>` (core floorId);
   the roof room of a house is the floor above the top one. Pure. */
import * as THREE from 'three';
import { bbox, centroid, floorId, floorZ, frontStreet, hash, partTop, pointInRing, type Building, type BuildingPart, type City, type Vec2 } from '@my-city/core';
import { V, type Batch } from './batch';
import { buildHouse } from './house3d';

export type Detail = 0 | 1 | 2 | 3;

type Style = 'curtain' | 'ribbon' | 'punched';

/** every lamp id of the city, bottom to top per building (the same at every detail level) */
export function cityFloors(city: City): string[] {
  const out: string[] = [];
  for (const b of city.buildings) {
    const levels = Math.max(...b.parts.map(p => p.floors.length));
    for (let n = 1; n <= levels; n++) out.push(floorId(b, n));
    if (b.house?.spec.topRoom && b.house.spec.roof === 'flat') out.push(floorId(b, levels + 1));
  }
  return out;
}

/** the aircraft lights on the models, in three.js coordinates */
export function beaconsOf(city: City): THREE.Vector3[] {
  return city.buildings.filter(b => b.model === 'viet-tower').map(b => mastOf(b).light);
}

/** height of whatever other building stands at p (0 = open); buildings bucketed in a 25 m grid so
    a probe only looks at the few nearby */
const cache = new WeakMap<City, (self: Building, p: Vec2) => number>();
export function neighbours(city: City) {
  const hit = cache.get(city);
  if (hit) return hit;
  const G = 25, grid = new Map<string, { b: Building; box: ReturnType<typeof bbox> }[]>();
  for (const b of city.buildings) {
    const box = bbox(b.footprint);
    for (let i = Math.floor(box.x0 / G); i <= Math.floor(box.x1 / G); i++) for (let j = Math.floor(box.y0 / G); j <= Math.floor(box.y1 / G); j++) {
      const k = `${i},${j}`, l = grid.get(k);
      if (l) l.push({ b, box }); else grid.set(k, [{ b, box }]);
    }
  }
  const fn = (self: Building, p: Vec2) => {
    let h = 0;
    for (const { b, box } of grid.get(`${Math.floor(p[0] / G)},${Math.floor(p[1] / G)}`) ?? []) {
      if (b === self || p[0] < box.x0 || p[0] > box.x1 || p[1] < box.y0 || p[1] > box.y1) continue;
      for (const part of b.parts) if (pointInRing(p, part.footprint)) h = Math.max(h, partTop(part));
    }
    return h;
  };
  cache.set(city, fn);
  return fn;
}

const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const shopCache = new WeakMap<City, (b: Building) => number>();
function shopEdgeOf(city: City) {
  const hit = shopCache.get(city);
  if (hit) return hit;
  const G = 64, grid = new Map<string, City['streets']>();
  for (const s of city.streets) {
    if (s.layer !== 0 || !MAIN.has(s.kind)) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of s.path) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    for (let i = Math.floor((x0 - 30) / G); i <= Math.floor((x1 + 30) / G); i++) for (let j = Math.floor((y0 - 30) / G); j <= Math.floor((y1 + 30) / G); j++) {
      const k = `${i},${j}`, l = grid.get(k);
      if (l) l.push(s); else grid.set(k, [s]);
    }
  }
  const fn = (b: Building) => {
    const p = b.footprint[b.front] ?? b.footprint[0]!;
    const mains = grid.get(`${Math.floor(p[0] / G)},${Math.floor(p[1] / G)}`);
    if (!mains) return -1;
    const f = frontStreet(b.footprint, b.front, mains);
    return f && f.gap < 25 ? b.front : -1;
  };
  shopCache.set(city, fn);
  return fn;
}

export function buildBuildings(B: Batch, city: City, list: readonly Building[], level: Detail) {
  const neighbour = neighbours(city);
  const shopEdge = shopEdgeOf(city);
  for (const b of list) {
    if (b.model === 'viet-tower') drawMast(B, b);
    if (level >= 2 && b.house) {
      const R = b.footprint, f = b.front, n = R.length, p = R[f]!, q = R[(f + 1) % n]!, w = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u: Vec2 = [(q[0] - p[0]) / w, (q[1] - p[1]) / w], nn: Vec2 = [u[1], -u[0]], d = b.house.spec.d;
      // the neighbour against each end wall, probed half-way back
      const probe = (a: number): Vec2 => [p[0] + u[0] * a - nn[0] * d * 0.5, p[1] + u[1] * a - nn[1] * d * 0.5];
      buildHouse(B, b, b.house.spec, level as 2 | 3, { neighbourAt: end => neighbour(b, probe(end > 0 ? w + 0.6 : -0.6)), heightAt: pt => neighbour(b, pt) });
      continue;
    }
    for (const part of b.parts) {
      const glass = part.facade === 'glass';
      B.solid(part.footprint, part.z0, partTop(part), () => (glass ? 'glass' : 'wall'), 'roof', b.id);
      if (level === 0) continue;
      const style: Style = glass ? 'curtain' : b.model === 'viet-tower' || (level >= 2 && b.kind === 'office') ? 'ribbon' : 'punched';
      windows(B, b, part, style, level, neighbour, !b.model && !b.house && part.id === b.id ? shopEdge(b) : -1);
    }
    if (level === 3 && !b.house && !b.model && b.kind !== 'kiosk') roofTanks(B, b);
  }
}

/** `shop`: the edge on a main street, whose ground floor is a shop front with a sign (L2 and up) */
function windows(B: Batch, b: Building, part: BuildingPart, style: Style, level: Detail, neighbour: (self: Building, p: Vec2) => number, shop = -1) {
  const R = part.footprint, n = R.length;
  const dir = (i: number) => { const p = R[i]!, q = R[(i + 1) % n]!; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const turn = (i: number) => { let t = Math.abs(dir(i) - dir((i - 1 + n) % n)); if (t > Math.PI) t = 2 * Math.PI - t; return t; };
  const front = b.house && part.id === b.id ? b.front : -1;
  const balconies = level >= 2 && (b.kind === 'apartment' || b.kind === 'school');
  const shopfront = level >= 2 && (b.kind === 'commercial' || b.kind === 'kiosk');
  R.forEach((p, i) => {
    const q = R[(i + 1) % n]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 0.5) return;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux;   // along the wall, outward
    const nrm = new THREE.Vector3(nx, 0, ny), off = 0.06;
    const probe: Vec2 = [(p[0] + q[0]) / 2 + nx * 0.6, (p[1] + q[1]) / 2 + ny * 0.6];
    const blockedTo = neighbour(b, probe);
    const at = (t: number, s: number, z: number) => V(p[0] + ux * t + nx * s, p[1] + uy * t + ny * s, z);
    const rect = (lamp: string, t0: number, t1: number, z0: number, z1: number) => B.window(lamp, [at(t0, off, z0), at(t1, off, z0), at(t1, off, z1), at(t0, off, z1)], nrm);
    const box = (t0: number, t1: number, s0: number, s1: number, z0: number, z1: number, surf: 'wall' | 'metal' = 'wall') => {
      const ring: Vec2[] = [[t0, s0], [t1, s0], [t1, s1], [t0, s1]].map(([t, s]) => [p[0] + ux * t! + nx * s!, p[1] + uy * t! + ny * s!]);
      B.solid(ring, z0, z1, () => surf, surf === 'metal' ? 'metal' : 'roof');
    };
    // bands run on round a curve and stop short of a real corner
    const c0 = turn(i) > 0.5 ? 0.35 : 0, c1 = turn((i + 1) % n) > 0.5 ? 0.35 : 0;
    part.floors.forEach((h, k) => {
      const z = floorZ(part, k), lamp = floorId(b, k + 1);
      if (z + h <= blockedTo + 0.01) return;
      // glass bands are panes, about 1.6 m (curtain) or 2 m (ribbon) wide with a 12 cm frame between,
      // so a lit floor reads as windows (iso-glow) and windows light one at a time
      if (style === 'curtain' || style === 'ribbon') {
        const a0 = c0, a1 = L - c1, n = Math.max(1, Math.round((a1 - a0) / (style === 'curtain' ? 1.6 : 2))), pw = (a1 - a0) / n;
        const [zb, zt] = style === 'curtain' ? [0.08, 0.92] : [0.24, 0.78];
        for (let c = 0; c < n; c++) rect(lamp, a0 + c * pw + (c > 0 ? 0.06 : 0), a0 + (c + 1) * pw - (c < n - 1 ? 0.06 : 0), z + h * zb, z + h * zt);
      }
      else if (k === 0 && i === front) rect(lamp, L * 0.1, L * 0.9, z + 0.15, z + h * 0.8);   // shop front
      else if (k === 0 && level >= 2 && i === shop && L >= 3) {
        // the ground floor on a main street: glass shop fronts and a lit sign band above them
        rect(lamp, c0 + 0.3, L - c1 - 0.3, z + 0.1, z + h * 0.72);
        box(c0 + 0.2, L - c1 - 0.2, 0, 0.2, z + h * 0.76, z + h * 0.97, 'metal');
        B.window(lamp, [at(c0 + 0.3, 0.21, z + h * 0.79), at(L - c1 - 0.3, 0.21, z + h * 0.79), at(L - c1 - 0.3, 0.21, z + h * 0.94), at(c0 + 0.3, 0.21, z + h * 0.94)], nrm);
      }
      else if (k === 0 && shopfront && L >= 2) rect(lamp, c0 + 0.2, L - c1 - 0.2, z + 0.1, z + h * 0.85);
      else {
        if (L < 1.8) return;
        const cols = Math.max(1, Math.floor((L - 0.6) / 2.6)), cw = (L - 0.6) / cols, ww = Math.min(1.5, cw * 0.55);
        for (let c = 0; c < cols; c++) {
          const m = 0.3 + cw * (c + 0.5);
          rect(lamp, m - ww / 2, m + ww / 2, z + h * 0.3, z + h * 0.8);
          const seed = hash(`${b.id}:${i}:${k}:${c}`);
          // every other window of an apartment block or school opens onto a small balcony
          if (balconies && k > 0 && L >= 6 && (c + k) % 2 === 0) {
            box(m - ww / 2 - 0.3, m + ww / 2 + 0.3, 0, 0.8, z, z + 0.12);
            box(m - ww / 2 - 0.3, m + ww / 2 + 0.3, 0.75, 0.8, z + 0.12, z + 1.0, 'metal');
          } else if (level === 3 && b.kind === 'apartment' && k > 0 && seed % 5 === 0) box(m + ww / 2 + 0.15, m + ww / 2 + 0.95, 0, 0.35, z + 0.2, z + 0.75, 'metal');
        }
      }
    });
  });
}

/** one or two water tanks near the middle of a block's highest roof */
function roofTanks(B: Batch, b: Building) {
  const part = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a)), c = centroid(part.footprint), z = partTop(part);
  const n = 1 + (hash(b.id) % 2);
  for (let i = 0; i < n; i++) {
    const x = c[0] + i * 1.6 - 0.8 * (n - 1), y = c[1];
    if (!pointInRing([x, y], part.footprint)) continue;
    B.solid([[x - 0.45, y - 0.45], [x + 0.45, y - 0.45], [x + 0.45, y + 0.45], [x - 0.45, y + 0.45]], z, z + 0.3, () => 'metal', 'metal');
    B.solid(Array.from({ length: 8 }, (_, k): Vec2 => [x + 0.5 * Math.cos((k * Math.PI) / 4), y + 0.5 * Math.sin((k * Math.PI) / 4)]), z + 0.3, z + 1.6, () => 'metal', 'metal');
  }
}

/** Việt Tower: a lattice mast over the round end of the tower (its tallest part): the south end,
    facing the wedge (OSM way 845096110). */
function mastOf(b: Building) {
  const tower = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
  const c = centroid(tower.footprint), far = tower.footprint.reduce((a, p) => (p[1] > a[1] ? p : a));
  const base: Vec2 = [c[0] + (far[0] - c[0]) * 0.35, c[1] + (far[1] - c[1]) * 0.35], z0 = partTop(tower), H = 13;
  return { base, z0, H, light: V(base[0], base[1], z0 + H + 0.8) };
}

function drawMast(B: Batch, b: Building) {
  const { base, z0, H } = mastOf(b), legs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const at = (z: number, [a, bb]: [number, number]) => { const w = 0.8 - (0.68 * (z - z0)) / H; return V(base[0] + a * w, base[1] + bb * w, z); };
  for (const l of legs) B.line(at(z0, l), at(z0 + H, l), 'crease');
  for (let z = z0; z < z0 + H - 0.5; z += 1.3) legs.forEach((l, i) => { B.line(at(z, l), at(z + 1.3, legs[(i + 1) % 4]!), 'crease'); B.line(at(z, l), at(z, legs[(i + 1) % 4]!), 'crease'); });
  B.line(V(base[0], base[1], z0 + H), V(base[0], base[1], z0 + H + 0.6), 'crease');
}
