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
import {
  CUSTOM_MASSING_MODELS,
  MAX_FLAG_VIEW_SPAN_M,
  createWavingFlagGroup,
  drawLandmarkBuilding,
  getFlagMaterial,
  isFlagVisibleAtSpan,
  landmarkBeaconsOf,
  landmarkFlagsOf,
  landmarkSurfaceMap,
  registerFlagPainter,
  stepSharedWavingFlags,
  stepWavingFlag,
  type FlagCountryCode,
  type WavingFlagInstance,
  type WavingFlagSpec,
} from './landmarks';

export {
  MAX_FLAG_VIEW_SPAN_M,
  createWavingFlagGroup,
  getFlagMaterial,
  isFlagVisibleAtSpan,
  registerFlagPainter,
  stepSharedWavingFlags,
  stepWavingFlag,
  type FlagCountryCode,
  type WavingFlagInstance,
  type WavingFlagSpec,
};
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
  const out: THREE.Vector3[] = [];
  for (const b of city.buildings) {
    if (b.model === 'viet-tower') out.push(mastOf(b).light);
    else if (b.model === 'vpbank-tower') out.push(...vpbankSpireOf(b).lights);
    else if (b.model) out.push(...landmarkBeaconsOf(b));
  }
  return out;
}

/** Waving Vietnamese national flags on ceremonial flagpoles across the city */
export function flagpolesOf(city: City): WavingFlagSpec[] {
  const out: WavingFlagSpec[] = [];
  for (const b of city.buildings) {
    if (b.model) out.push(...landmarkFlagsOf(b));
  }
  return out;
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
    if (b.model && CUSTOM_MASSING_MODELS.has(b.model)) {
      drawLandmarkBuilding(B, b, level);
      continue;
    }
    if (level >= 2 && b.house) {
      const R = b.footprint, f = b.front, n = R.length, p = R[f]!, q = R[(f + 1) % n]!, w = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u: Vec2 = [(q[0] - p[0]) / w, (q[1] - p[1]) / w], nn: Vec2 = [u[1], -u[0]], d = b.house.spec.d;
      // the neighbour against each end wall, probed half-way back
      const probe = (a: number): Vec2 => [p[0] + u[0] * a - nn[0] * d * 0.5, p[1] + u[1] * a - nn[1] * d * 0.5];
      buildHouse(B, b, b.house.spec, level as 2 | 3, { neighbourAt: end => neighbour(b, probe(end > 0 ? w + 0.6 : -0.6)), heightAt: pt => neighbour(b, pt) });
      continue;
    }
    B.withSurfaceMap(landmarkSurfaceMap(b.model), () => {
      for (const part of b.parts) {
        const glass = part.facade === 'glass';
        B.solid(part.footprint, part.z0, partTop(part), () => (glass ? 'glass' : 'wall'), 'roof', b.id);
        if (!b.model && part.roof === 'pitched') {
          const pc = centroid(part.footprint), pz = partTop(part);
          B.solid(scaleRing(part.footprint, pc, 1.04), pz, pz + 0.45, () => 'heritage-roof', 'heritage-roof', b.id);
          B.solid(scaleRing(part.footprint, pc, 0.72), pz + 0.45, pz + 1.45, () => 'heritage-roof', 'heritage-roof', b.id);
        }
        if (level === 0) continue;
        const style: Style = glass ? 'curtain' : b.model === 'viet-tower' || (level >= 2 && b.kind === 'office') ? 'ribbon' : 'punched';
        windows(B, b, part, style, level, neighbour, !b.model && !b.house && part.id === b.id ? shopEdge(b) : -1);
      }
      if (b.model === 'vpbank-tower') drawVpbankTower(B, b, level);
      else if (b.model === 'national-cinema') drawNationalCinema(B, b, level);
      else if (b.model && drawLandmarkBuilding(B, b, level)) { /* drawn by landmark builder */ }
      else if (level === 3 && !b.house && !b.model && b.kind !== 'kiosk') roofTanks(B, b);
    });
  }
}

/** `shop`: the edge on a main street, whose ground floor is a shop front with a sign (L2 and up) */
function windows(B: Batch, b: Building, part: BuildingPart, style: Style, level: Detail, neighbour: (self: Building, p: Vec2) => number, shop = -1) {
  const R = part.footprint, n = R.length;
  const dir = (i: number) => { const p = R[i]!, q = R[(i + 1) % n]!; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const turn = (i: number) => { let t = Math.abs(dir(i) - dir((i - 1 + n) % n)); if (t > Math.PI) t = 2 * Math.PI - t; return t; };
  const front = b.house && part.id === b.id ? b.front : -1;
  const isGroundPart = part.z0 === 0 && b.model !== 'vpbank-tower' && b.model !== 'national-cinema';
  const balconies = level >= 2 && (b.kind === 'apartment' || b.kind === 'school');
  const shopfront = level >= 2 && (b.kind === 'commercial' || b.kind === 'kiosk');
  const hasBeltLines = level >= 2 && !b.model && (b.kind === 'apartment' || b.kind === 'school' || b.kind === 'office' || b.kind === 'hotel');
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
      B.solid(ring, z0, z1, () => surf, surf === 'metal' ? 'metal' : 'roof', b.id);
    };
    const isLobbyEdge =
      isGroundPart &&
      !b.house &&
      blockedTo < 1.0 &&
      ((R === b.footprint && (i === b.front || i === shop)) || (L >= 10 && blockedTo === 0));
    const isCommercialLobby =
      style === 'curtain' ||
      style === 'ribbon' ||
      b.kind === 'office' ||
      b.kind === 'commercial' ||
      b.kind === 'hotel' ||
      i === shop ||
      shopfront;
    // bands run on round a curve and stop short of a real corner
    const c0 = turn(i) > 0.5 ? 0.35 : 0, c1 = turn((i + 1) % n) > 0.5 ? 0.35 : 0;
    part.floors.forEach((h, k) => {
      const z = floorZ(part, k), lamp = floorId(b, k + 1);
      if (z + h <= blockedTo + 0.01) return;
      if (hasBeltLines && k < part.floors.length - 1 && L >= 2.5) {
        B.line(at(c0, off + 0.01, z + h), at(L - c1, off + 0.01, z + h), 'detail');
        B.line(at(c0, off + 0.01, z + h - 0.14), at(L - c1, off + 0.01, z + h - 0.14), 'detail');
      }
      // 1. Ground-floor 3D Entrance Lobby / Portico (Sảnh đón tòa nhà) for offices, commercial, hotels, towers, apartments & schools
      if (k === 0 && isLobbyEdge && L >= 3.2) {
        if (isCommercialLobby) {
          // Glazed lobby storefront across the ground floor + projecting 3D entrance portico with columns, steps & lit canopy
          const a0 = c0 + 0.25, a1 = L - c1 - 0.25, mid = L * 0.5;
          const lw = Math.min(6.2, Math.max(2.6, (a1 - a0) * 0.42));
          const ld = level >= 2 ? Math.min(1.5, Math.max(0.95, L * 0.08)) : 0.75;
          const bays = Math.max(3, Math.round((a1 - a0) / 1.8)), bw = (a1 - a0) / bays;
          for (let c = 0; c < bays; c++) {
            const bt0 = a0 + c * bw + 0.05, bt1 = a0 + (c + 1) * bw - 0.05;
            rect(lamp, bt0, bt1, z + 0.08, z + h * 0.84);
            if (level >= 2 && c > 0) B.line(at(a0 + c * bw, off + 0.015, z + 0.08), at(a0 + c * bw, off + 0.015, z + h * 0.84), 'detail');
          }
          // Stepped granite entrance podium (bậc tam cấp đại sảnh)
          box(mid - lw * 0.58, mid + lw * 0.58, 0, ld + 0.36, z, z + 0.14, 'wall');
          if (level >= 2) {
            box(mid - lw * 0.52, mid + lw * 0.52, 0, ld + 0.14, z + 0.14, z + 0.26, 'wall');
            // 3D portico columns framing the lobby entrance
            const colW = Math.min(0.36, lw * 0.12);
            box(mid - lw * 0.5, mid - lw * 0.5 + colW, 0, ld, z + 0.26, z + h * 0.78, 'wall');
            box(mid + lw * 0.5 - colW, mid + lw * 0.5, 0, ld, z + 0.26, z + h * 0.78, 'wall');
            // Projecting double glass lobby doors between the portico columns
            const d0 = mid - lw * 0.5 + colW + 0.06, d1 = mid + lw * 0.5 - colW - 0.06, ds = ld * 0.76;
            B.window(lamp, [at(d0, ds, z + 0.26), at(mid - 0.04, ds, z + 0.26), at(mid - 0.04, ds, z + h * 0.74), at(d0, ds, z + h * 0.74)], nrm);
            B.window(lamp, [at(mid + 0.04, ds, z + 0.26), at(d1, ds, z + 0.26), at(d1, ds, z + h * 0.74), at(mid + 0.04, ds, z + h * 0.74)], nrm);
            B.line(at(mid, ds + 0.02, z + 0.26), at(mid, ds + 0.02, z + h * 0.74), 'detail');
            B.line(at(a0, off + 0.02, z + h * 0.64), at(a1, off + 0.02, z + h * 0.64), 'detail');
          }
          // Projecting 3D lobby canopy & lit fascia sign band
          box(mid - lw * 0.62, mid + lw * 0.62, 0, ld + 0.3, z + h * 0.76, z + h * 0.94, 'wall');
          box(mid - lw * 0.64, mid + lw * 0.64, ld + 0.22, ld + 0.36, z + h * 0.74, z + h * 0.96, 'metal');
          B.window(lamp, [
            at(mid - lw * 0.52, ld + 0.37, z + h * 0.79),
            at(mid + lw * 0.52, ld + 0.37, z + h * 0.79),
            at(mid + lw * 0.52, ld + 0.37, z + h * 0.91),
            at(mid - lw * 0.52, ld + 0.37, z + h * 0.91),
          ], nrm);
          return;
        }
        // Apartment / school / institutional 3D entrance lobby (1 central lobby, or 2 lobbies on long blocks L >= 26m)
        const centers = L >= 26 ? [L * 0.28, L * 0.72] : [L * 0.5];
        const dw = Math.min(3.2, Math.max(1.8, L / (centers.length * 4.2))), dh = h * 0.76;
        const ld = level >= 2 ? 1.1 : 0.65;
        for (const mid of centers) {
          // Stepped entrance stoop (bậc tam cấp sảnh)
          box(mid - dw * 0.68, mid + dw * 0.68, 0, ld + 0.32, z, z + 0.14, 'wall');
          if (level >= 2) {
            box(mid - dw * 0.56, mid + dw * 0.56, 0, ld + 0.12, z + 0.14, z + 0.26, 'wall');
            // 3D porch cheek walls framing the entrance
            box(mid - dw * 0.54, mid - dw * 0.42, 0, ld, z + 0.26, z + dh, 'wall');
            box(mid + dw * 0.42, mid + dw * 0.54, 0, ld, z + 0.26, z + dh, 'wall');
            // Double-leaf glazed entrance door recessed inside the porch
            const ds = ld * 0.68;
            B.window(lamp, [at(mid - dw * 0.4, ds, z + 0.26), at(mid - 0.03, ds, z + 0.26), at(mid - 0.03, ds, z + dh), at(mid - dw * 0.4, ds, z + dh)], nrm);
            B.window(lamp, [at(mid + 0.03, ds, z + 0.26), at(mid + dw * 0.4, ds, z + 0.26), at(mid + dw * 0.4, ds, z + dh), at(mid + 0.03, ds, z + dh)], nrm);
            B.line(at(mid, ds + 0.02, z + 0.26), at(mid, ds + 0.02, z + dh), 'detail');
          } else {
            rect(lamp, mid - dw * 0.42, mid + dw * 0.42, z + 0.16, z + dh);
          }
          // Projecting canopy hood & glowing transom light above the lobby door
          box(mid - dw * 0.66, mid + dw * 0.66, 0, ld + 0.26, z + dh, z + dh + 0.32, 'wall');
          box(mid - dw * 0.68, mid + dw * 0.68, ld + 0.18, ld + 0.32, z + dh - 0.02, z + dh + 0.34, 'metal');
          B.window(lamp, [
            at(mid - dw * 0.48, ld + 0.33, z + dh + 0.05),
            at(mid + dw * 0.48, ld + 0.33, z + dh + 0.05),
            at(mid + dw * 0.48, ld + 0.33, z + dh + 0.27),
            at(mid - dw * 0.48, ld + 0.33, z + dh + 0.27),
          ], nrm);
        }
        // Flanking ground-floor windows outside the lobby portals
        const cols = Math.max(1, Math.floor((L - 0.6) / 2.6)), cw = (L - 0.6) / cols, ww = Math.min(1.4, cw * 0.55);
        for (let c = 0; c < cols; c++) {
          const m = 0.3 + cw * (c + 0.5);
          if (centers.some(mid => Math.abs(m - mid) < dw * 0.82 + ww * 0.5)) continue;
          rect(lamp, m - ww / 2, m + ww / 2, z + 0.3 * h, z + 0.8 * h);
          if (level >= 2) {
            B.line(at(m, off + 0.01, z + 0.3 * h), at(m, off + 0.01, z + 0.8 * h), 'detail');
            box(m - ww / 2 - 0.08, m + ww / 2 + 0.08, 0, 0.12, z + 0.26 * h, z + 0.3 * h, 'wall');
          }
        }
        return;
      }
      // glass bands are panes, about 1.6 m (curtain) or 2 m (ribbon) wide with a 12 cm frame between,
      // so a lit floor reads as windows (iso-glow) and windows light one at a time
      if (style === 'curtain' || style === 'ribbon') {
        const a0 = c0, a1 = L - c1, n = Math.max(1, Math.round((a1 - a0) / (style === 'curtain' ? 1.6 : 2))), pw = (a1 - a0) / n;
        const [zb, zt] = style === 'curtain' ? [0.08, 0.92] : [0.24, 0.78];
        for (let c = 0; c < n; c++) rect(lamp, a0 + c * pw + (c > 0 ? 0.06 : 0), a0 + (c + 1) * pw - (c < n - 1 ? 0.06 : 0), z + h * zb, z + h * zt);
      }
      else if (k === 0 && i === front) {
        // L1 ground-floor house opening + entrance step & canopy
        rect(lamp, L * 0.12, L * 0.88, z + 0.15, z + h * 0.8);
        if (L >= 2.6) {
          box(L * 0.1, L * 0.9, 0, 0.55, z, z + 0.14, 'wall');
          box(L * 0.08, L * 0.92, 0, 0.65, z + h * 0.8, z + h * 0.94, 'metal');
        }
      }
      else if (k === 0 && shopfront && L >= 2) {
        const mid = L * 0.5;
        rect(lamp, c0 + 0.2, L - c1 - 0.2, z + 0.1, z + h * 0.85);
        B.line(at(mid, off + 0.02, z + 0.1), at(mid, off + 0.02, z + h * 0.85), 'detail');
      }
      else {
        if (L < 1.8) return;
        const cols = Math.max(1, Math.floor((L - 0.6) / 2.6)), cw = (L - 0.6) / cols, ww = Math.min(1.5, cw * 0.55);
        for (let c = 0; c < cols; c++) {
          const m = 0.3 + cw * (c + 0.5);
          rect(lamp, m - ww / 2, m + ww / 2, z + 0.3 * h, z + 0.8 * h);
          if (level >= 2) {
            // Vertical center window mullion (02-apartments.js)
            B.line(at(m, off + 0.01, z + 0.3 * h), at(m, off + 0.01, z + 0.8 * h), 'detail');
          }
          const seed = hash(`${b.id}:${i}:${k}:${c}`);
          // every other window of an apartment block or school opens onto a detailed 3-sided balcony (02-apartments.js)
          if (balconies && k > 0 && L >= 6 && (c + k) % 2 === 0) {
            const b0 = m - ww / 2 - 0.32, b1 = m + ww / 2 + 0.32;
            box(b0, b1, 0, 0.88, z, z + 0.15, 'wall');                       // balcony floor slab
            box(b0, b0 + 0.11, 0, 0.76, z + 0.15, z + 0.98, 'wall');         // left cheek wall
            box(b1 - 0.11, b1, 0, 0.76, z + 0.15, z + 0.98, 'wall');         // right cheek wall
            box(b0, b1, 0.76, 0.88, z + 0.15, z + 0.95, 'wall');             // front parapet wall
            box(b0 - 0.02, b1 + 0.02, 0.74, 0.9, z + 0.95, z + 1.03, 'metal'); // metallic top handrail cap
            for (let ts = b0 + 0.22; ts <= b1 - 0.22 + 1e-4; ts += 0.24) {
              B.line(at(ts, 0.89, z + 0.22), at(ts, 0.89, z + 0.91), 'detail');
            }
          } else {
            if (level >= 2) {
              // Projecting window sill below punched window (02-apartments.js)
              box(m - ww / 2 - 0.08, m + ww / 2 + 0.08, 0, 0.12, z + 0.26 * h, z + 0.3 * h, 'wall');
            }
            if (level === 3 && b.kind === 'apartment' && k > 0 && seed % 5 === 0) {
              box(m + ww / 2 + 0.15, m + ww / 2 + 0.95, 0, 0.35, z + 0.2, z + 0.75, 'metal');
            }
          }
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

function scaleRing(ring: readonly Vec2[], c: Vec2, s: number): Vec2[] {
  return ring.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s]);
}

function regPoly(c: Vec2, r: number, n: number, rot = 0): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => [
    c[0] + r * Math.cos(rot + (i * 2 * Math.PI) / n),
    c[1] + r * Math.sin(rot + (i * 2 * Math.PI) / n),
  ]);
}

function vpbankSpireOf(b: Building) {
  const part = b.parts[0]!, R = part.footprint, c = centroid(R), top = partTop(part);
  const p0 = R[0]!, p1 = R[1]!, L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const ux = (p1[0] - p0[0]) / L, uy = (p1[1] - p0[1]) / L;
  const zBase = top + 7.2, H = 9.5;
  const m1: Vec2 = [c[0] - ux * 6.5, c[1] - uy * 6.5];
  const m2: Vec2 = [c[0] + ux * 6.5, c[1] + uy * 6.5];
  return {
    c, top, zBase, H, m1, m2,
    lights: [V(m1[0], m1[1], zBase + H + 0.5), V(m2[0], m2[1], zBase + H + 0.5)],
  };
}

/** VPBank Tower (89 Láng Hạ): 29-storey glass office tower at the Thái Hà – Láng Hạ – Huỳnh Thúc Kháng
    corner with a 4-storey banking podium belt, cantilevered corner entrance canopy, sky-lobby architectural
    cornices, two-tier illuminated rooftop crown penthouse, helipad and twin communications spires. */
function drawVpbankTower(B: Batch, b: Building, level: Detail) {
  const part = b.parts[0]!;
  const R = part.footprint, c = centroid(R), top = partTop(part);
  const topLamp = floorId(b, part.floors.length);
  const lobbyLamp = floorId(b, 1);

  // 1. Banking podium belt courses (floors 2 and 4) & sky-lobby cornices
  B.solid(scaleRing(R, c, 1.035), 8.2, 8.75, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(R, c, 1.055), 16.3, 17.15, () => 'metal', 'roof', b.id);
  B.solid(scaleRing(R, c, 1.025), 41.4, 42.0, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(R, c, 1.025), 66.2, 66.8, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(R, c, 1.045), top - 0.6, top + 0.25, () => 'metal', 'roof', b.id);

  // 2. Two-tier stepped glass rooftop crown penthouse + illuminated signage bands
  const crown1 = scaleRing(R, c, 0.8);
  const crown2 = scaleRing(R, c, 0.58);
  B.solid(crown1, top + 0.25, top + 4.2, () => 'glass', 'roof', b.id);
  B.solid(scaleRing(R, c, 0.82), top + 4.0, top + 4.45, () => 'metal', 'metal', b.id);
  B.solid(crown2, top + 4.45, top + 7.2, () => 'glass', 'roof', b.id);

  if (level >= 1) {
    // Illuminated crown window bands around crown1 and crown2
    const addBand = (ring: readonly Vec2[], z0: number, z1: number, lamp: string) => {
      ring.forEach((p, i) => {
        const q = ring[(i + 1) % ring.length]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L < 1) return;
        const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux, off = 0.08;
        const nrm = new THREE.Vector3(nx, 0, ny);
        const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
        const cols = Math.max(2, Math.round(L / 2.2)), pw = (L - 0.8) / cols;
        for (let k = 0; k < cols; k++) {
          const t0 = 0.4 + k * pw + 0.08, t1 = 0.4 + (k + 1) * pw - 0.08;
          B.window(lamp, [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], nrm);
        }
      });
    };
    addBand(crown1, top + 0.7, top + 3.6, topLamp);
    addBand(crown2, top + 4.8, top + 6.7, topLamp);

    // Grand entrance canopy & colonnade on the front facade (facing Láng Hạ / Thái Hà)
    const f = b.front % R.length, p = R[f]!, q = R[(f + 1) % R.length]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L > 8) {
      const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
      // Ensure outward normal points away from centroid c
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const sign = (mx - c[0]) * uy - (my - c[1]) * ux >= 0 ? 1 : -1;
      const nx = uy * sign, ny = -ux * sign;
      const nrm = new THREE.Vector3(nx, 0, ny);
      const quad = (t0: number, t1: number, s0: number, s1: number): Vec2[] => [
        [p[0] + ux * t0 + nx * s0, p[1] + uy * t0 + ny * s0],
        [p[0] + ux * t1 + nx * s0, p[1] + uy * t1 + ny * s0],
        [p[0] + ux * t1 + nx * s1, p[1] + uy * t1 + ny * s1],
        [p[0] + ux * t0 + nx * s1, p[1] + uy * t0 + ny * s1],
      ];
      const t0 = L * 0.2, t1 = L * 0.8;
      // Stepped entrance podium & cantilevered marquee canopy
      B.solid(quad(t0 - 1.2, t1 + 1.2, 0, 5.2), 0, 0.36, () => 'wall', 'walk', b.id);
      B.solid(quad(t0, t1, 0, 4.6), 4.5, 5.25, () => 'metal', 'metal', b.id);
      const fa0 = V(p[0] + ux * (t0 + 0.4) + nx * 4.68, p[1] + uy * (t0 + 0.4) + ny * 4.68, 4.65);
      const fa1 = V(p[0] + ux * (t1 - 0.4) + nx * 4.68, p[1] + uy * (t1 - 0.4) + ny * 4.68, 4.65);
      const fa2 = V(p[0] + ux * (t1 - 0.4) + nx * 4.68, p[1] + uy * (t1 - 0.4) + ny * 4.68, 5.12);
      const fa3 = V(p[0] + ux * (t0 + 0.4) + nx * 4.68, p[1] + uy * (t0 + 0.4) + ny * 4.68, 5.12);
      B.window(lobbyLamp, [fa0, fa1, fa2, fa3], nrm);
      for (let k = 0; k < 4; k++) {
        const tc = t0 + 0.8 + (k * (t1 - t0 - 1.6)) / 3;
        B.solid(quad(tc - 0.3, tc + 0.3, 3.8, 4.4), 0.36, 4.5, () => 'metal', 'metal', b.id);
      }
    }
  }

  // 3. Rooftop octagonal helipad & twin communications spires
  const { zBase, H, m1, m2 } = vpbankSpireOf(b);
  B.solid(regPoly(c, 5.6, 8, Math.PI / 8), zBase, zBase + 0.45, () => 'metal', 'walk', b.id);
  B.loop(regPoly(c, 4.6, 8, Math.PI / 8).map(([x, y]) => V(x, y, zBase + 0.48)), 'detail');
  for (const m of [m1, m2]) {
    B.solid(regPoly(m, 0.55, 6), zBase, zBase + 2.2, () => 'metal', 'metal', b.id);
    B.line(V(m[0], m[1], zBase + 2.2), V(m[0], m[1], zBase + H), 'crease');
  }
}

/** Trung tâm Chiếu phim Quốc gia (87 Láng Hạ): Iconic multi-hall cinema complex at the Thái Hà – Láng Hạ
    crossroads featuring a cylindrical 3-storey glass rotunda lobby at the front L-courtyard, perimeter
    colonnade, grand semicircular entrance steps, cantilevered curved marquee canopy, and stepped dome. */
export function nationalCinemaRotundaCenter(b: Building): Vec2 {
  const c0 = centroid(b.footprint);
  return [c0[0] - 4, c0[1] - 34];
}

function drawNationalCinema(B: Batch, b: Building, level: Detail) {
  const rc = nationalCinemaRotundaCenter(b);
  // Forecourt plaza & grand semicircular entrance steps facing Thái Hà – Láng Hạ (-y / -x)
  const plaza: Vec2[] = [
    [rc[0] - 22, rc[1] - 20],
    [rc[0] + 22, rc[1] - 20],
    [rc[0] + 22, rc[1] + 18],
    [rc[0] - 22, rc[1] + 18],
  ];
  B.solid(plaza, 0, 0.32, () => 'wall', 'walk', b.id);
  for (let s = 0; s < 3; s++) {
    B.solid(regPoly(rc, 19.6 - s * 0.9, 16), 0.32 + s * 0.22, 0.32 + (s + 1) * 0.22, () => 'wall', 'walk', b.id);
  }

  // Connecting gallery wings bridging the central rotunda to the East, North, and West cinema halls
  B.solid([[rc[0] - 7, rc[1] + 8], [rc[0] + 9, rc[1] + 8], [rc[0] + 9, rc[1] + 20], [rc[0] - 7, rc[1] + 20]], 0.32, 13.5, () => 'wall', 'roof', b.id);
  B.solid([[rc[0] + 8, rc[1] - 8], [rc[0] + 24, rc[1] - 8], [rc[0] + 24, rc[1] + 6], [rc[0] + 8, rc[1] + 6]], 0.32, 13.5, () => 'wall', 'roof', b.id);
  B.solid([[rc[0] - 22, rc[1] - 2], [rc[0] - 8, rc[1] - 2], [rc[0] - 8, rc[1] + 12], [rc[0] - 22, rc[1] + 12]], 0.32, 13.5, () => 'wall', 'roof', b.id);

  // Main 3-storey 16-sided glass rotunda lobby (z = 0.98 .. 14.4 m) + cornice ring
  const rotundaRing = regPoly(rc, 15.8, 16);
  B.solid(rotundaRing, 0.98, 14.2, () => 'glass', 'roof', b.id);
  B.solid(regPoly(rc, 16.6, 16), 14.2, 15.0, () => 'metal', 'roof', b.id);

  // Upper drum (4th level, z = 15.0 .. 18.8 m), stepped dome (5th level, z = 18.8 .. 22.0 m), cap & spire
  const drumRing = regPoly(rc, 12.6, 16);
  const domeRing = regPoly(rc, 9.4, 16);
  const capRing = regPoly(rc, 5.8, 12);
  B.solid(drumRing, 15.0, 18.8, () => 'glass', 'roof', b.id);
  B.solid(regPoly(rc, 13.1, 16), 18.8, 19.3, () => 'metal', 'metal', b.id);
  B.solid(domeRing, 19.3, 22.2, () => 'wall', 'roof', b.id);
  B.solid(capRing, 22.2, 24.4, () => 'metal', 'metal', b.id);
  B.line(V(rc[0], rc[1], 24.4), V(rc[0], rc[1], 28.5), 'crease');

  // Perimeter colonnade of 12 structural columns around the rotunda + cantilevered entrance marquee canopy
  for (let i = 0; i < 12; i++) {
    const ang = (i * 2 * Math.PI) / 12;
    const colCenter: Vec2 = [rc[0] + 16.9 * Math.cos(ang), rc[1] + 16.9 * Math.sin(ang)];
    B.solid(regPoly(colCenter, 0.52, 8), 0.98, 14.2, () => 'wall', 'roof', b.id);
  }

  // Curved front marquee canopy facing the Thái Hà – Láng Hạ corner (angles -3π/4 .. -π/6)
  const marqueePts: Vec2[] = [];
  const innerPts: Vec2[] = [];
  const N = 8;
  for (let i = 0; i <= N; i++) {
    const a = -0.88 * Math.PI + (i / N) * (0.72 * Math.PI);
    marqueePts.push([rc[0] + 20.4 * Math.cos(a), rc[1] + 20.4 * Math.sin(a)]);
    innerPts.unshift([rc[0] + 15.5 * Math.cos(a), rc[1] + 15.5 * Math.sin(a)]);
  }
  B.solid([...marqueePts, ...innerPts], 4.8, 5.65, () => 'metal', 'metal', b.id);

  if (level === 0) return;

  // Illuminated curved glass panes on all 3 storeys of the rotunda + upper drum + marquee fascia
  const addCylWindows = (ring: readonly Vec2[], z0: number, z1: number, lamp: string) => {
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L < 0.8) return;
      const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux, off = 0.08;
      const nrm = new THREE.Vector3(nx, 0, ny);
      const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
      B.window(lamp, [at(0.25, z0), at(L - 0.25, z0), at(L - 0.25, z1), at(0.25, z1)], nrm);
    });
  };
  for (let f = 0; f < 3; f++) {
    const z0 = 1.2 + f * 4.2 + 0.35, z1 = 1.2 + (f + 1) * 4.2 - 0.35;
    addCylWindows(rotundaRing, z0, z1, floorId(b, f + 1));
  }
  addCylWindows(drumRing, 15.4, 18.3, floorId(b, 4));
  addCylWindows(domeRing, 19.7, 21.7, floorId(b, 5));

  // Lit cinema marquee sign band along the front canopy edge
  const marqueeLamp = floorId(b, 1);
  for (let i = 0; i < marqueePts.length - 1; i++) {
    const p = marqueePts[i]!, q = marqueePts[i + 1]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux, off = 0.08;
    const nrm = new THREE.Vector3(nx, 0, ny);
    const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
    B.window(marqueeLamp, [at(0.15, 4.92), at(L - 0.15, 4.92), at(L - 0.15, 5.52), at(0.15, 5.52)], nrm);
  }
}
