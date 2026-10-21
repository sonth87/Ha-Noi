/* Streets and areas from the city model (M3):
     - at-grade carriageways: a flat strip along the centre line, `width` wide;
     - sidewalks: raised 15 cm kerbed strips on the sides the model gives, cut wherever they would
       cross another road (so junctions and alley mouths stay open);
     - lane markings: dashes between lanes (and down the middle of two-way streets), kept off
       other roads;
     - bridges (layer ≥ 1 with a height profile): a deck following the profile, low parapets,
       solid ramp walls near the ground and piers under the deck;
     - areas: flat fills (grass, water, pitches, plazas) with their outlines.
   Junction corners between two carriageways are left as ground for now (M5). Pure. */
import * as THREE from 'three';
import { closestOnPath, dist, polylineLength, streetZ, type Area, type City, type Street, type Vec2 } from '@my-city/core';
import { V, type Batch, type Surface } from './batch';

const ROAD_Z = 0.1, WALK_Z = 0.25, MARK_Z = 0.12;

export function buildGround(B: Batch, city: City) {
  const { x0, y0, x1, y1 } = city.bounds, m = 20;
  B.flat('ground', [[x0 - m, y0 - m], [x1 + m, y0 - m], [x1 + m, y1 + m], [x0 - m, y1 + m]], 0);
}

export function buildStreets(B: Batch, city: City) {
  const roads = city.streets.filter(s => s.kind !== 'footway' && s.kind !== 'steps');
  const atGrade = roads.filter(s => !elevated(s));
  /** is p on the carriageway (or its sidewalks) of a road other than `self`? */
  const onOther = (self: Street, p: Vec2, pad: number) => atGrade.some(o => o !== self && closestOnPath(p, o.path).d < o.width / 2 + pad);

  for (const s of city.streets) {
    if (elevated(s)) { bridge(B, s); continue; }
    if (s.kind === 'footway' || s.kind === 'steps') { B.flat('walk', strip(s.path, -s.width / 2, s.width / 2), ROAD_Z * 0.5); continue; }
    B.flat('road', strip(s.path, -s.width / 2, s.width / 2), ROAD_Z);
    // sidewalks: right is +offset, left is −offset (city-model §2: looking along the path)
    for (const [side, w] of [[1, s.sidewalk.right], [-1, s.sidewalk.left]] as const) {
      if (w <= 0) continue;
      const a = s.width / 2, mid = side * (a + w / 2);
      for (const run of runs(s.path, mid, p => !onOther(s, p, 0.3))) B.solid(strip(run, side * a, side * (a + w)), 0, WALK_Z, () => 'walk', 'walk');
    }
    // lane markings
    const offs: number[] = [];
    if (!s.oneway && s.lanes >= 2) offs.push(0);
    if (s.oneway) for (let k = 1; k < s.lanes; k++) offs.push(-s.width / 2 + (k * s.width) / s.lanes);
    for (const o of offs) for (const run of runs(s.path, o, p => !onOther(s, p, 1.5), 1)) dashes(B, run);
  }
}

export function buildAreas(B: Batch, city: City) {
  const SURF: Partial<Record<Area['kind'], [Surface, number]>> = {
    park: ['grass', 0.02], grass: ['grass', 0.03], plaza: ['plaza', 0.03], 'traffic-island': ['plaza', 0.12], pitch: ['pitch', 0.04], water: ['water', 0.04], pool: ['water', 0.05],
  };
  for (const a of city.areas) { const k = SURF[a.kind]; if (k) B.flat(k[0], a.polygon, k[1], 'detail'); }
}

const elevated = (s: Street) => s.layer > 0 && s.profile.length > 0;

// ---------- geometry along a centre line ----------

/** right-hand unit normal of a direction (x east, y south: (−dy, dx)) */
const rightOf = (a: Vec2, b: Vec2): Vec2 => { const L = dist(a, b) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };

/** the line `d` metres to the right of a path (negative = left), with mitred corners */
export function offsetLine(path: readonly Vec2[], d: number): Vec2[] {
  return path.map((p, i) => {
    const n0 = i > 0 ? rightOf(path[i - 1]!, p) : rightOf(p, path[i + 1]!);
    const n1 = i < path.length - 1 ? rightOf(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(3, 1 / Math.max(0.33, mx * n0[0] + my * n0[1]));
    return [p[0] + mx * d * k, p[1] + my * d * k];
  });
}

/** the ring between offsets d0 and d1 of a path */
export function strip(path: readonly Vec2[], d0: number, d1: number): Vec2[] {
  return [...offsetLine(path, d0), ...offsetLine(path, d1).reverse()];
}

/** points every `step` m along a path */
function resample(path: readonly Vec2[], step: number): { p: Vec2; s: number }[] {
  const out: { p: Vec2; s: number }[] = [{ p: path[0]!, s: 0 }];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    for (let t = step - ((acc % step) || 0); t < L; t += step) out.push({ p: [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L], s: acc + t });
    acc += L;
    out.push({ p: b, s: acc });
  }
  return out.filter((q, i) => i === 0 || q.s - out[i - 1]!.s > 1e-6);
}

/** the pieces of a path (resampled) where the point `off` m to its side passes `keep` */
function runs(path: readonly Vec2[], off: number, keep: (p: Vec2) => boolean, step = 1): Vec2[][] {
  const pts = resample(path, step).map(q => q.p), side = offsetLine(pts, off);
  const out: Vec2[][] = [];
  let cur: Vec2[] = [];
  pts.forEach((p, i) => { if (keep(side[i]!)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } });
  if (cur.length > 1) out.push(cur);
  return out;
}

/** 3 m dashes every 6 m, 15 cm wide */
function dashes(B: Batch, path: readonly Vec2[]) {
  const L = polylineLength(path);
  for (let s = 0; s + 3 <= L; s += 6) {
    const piece = cut(path, s, s + 3);
    if (piece.length > 1) B.flat('marking', strip(piece, -0.075, 0.075), MARK_Z);
  }
}

/** the part of a path between distances s0 and s1 */
function cut(path: readonly Vec2[], s0: number, s1: number): Vec2[] {
  const out: Vec2[] = [];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b), at = (s: number): Vec2 => [a[0] + ((b[0] - a[0]) * (s - acc)) / L, a[1] + ((b[1] - a[1]) * (s - acc)) / L];
    if (acc + L >= s0 && acc <= s1) {
      if (!out.length) out.push(at(Math.max(s0, acc)));
      out.push(at(Math.min(s1, acc + L)));
    }
    acc += L;
  }
  return out;
}

// ---------- bridges ----------

/** A deck along the profile: road surface, 0.4 m parapets 0.9 m high, the underside 1 m below
    the deck (walled down to the ground near the ends), piers every 25 m where it is high. */
function bridge(B: Batch, s: Street) {
  const S = resample(s.path, 2), W = s.width / 2 + 0.4, P = 0.4, H = 0.9;
  const z = S.map(q => streetZ(s, q.s)), zb = z.map(h => (h > 3 ? h - 1 : 0));
  const pts = S.map(q => q.p), L = (d: number) => offsetLine(pts, d);
  const oR = L(W), iR = L(W - P), oL = L(-W), iL = L(-W + P);
  const all: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
  const face = (surf: Surface, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3) => { B.quad(surf, [a, b, c, d], n); B.quad(surf, [a, b, c, d], n, all); };
  for (let i = 0; i + 1 < S.length; i++) {
    const j = i + 1, r = rightOf(pts[i]!, pts[j]!), nR = new THREE.Vector3(r[0], 0, r[1]), nL = nR.clone().negate();
    const v = (l: Vec2[], k: number, h: number) => V(l[k]![0], l[k]![1], h);
    face('road', v(iL, i, z[i]!), v(iR, i, z[i]!), v(iR, j, z[j]!), v(iL, j, z[j]!), up);
    for (const [o, inn, n, nIn] of [[oR, iR, nR, nL], [oL, iL, nL, nR]] as const) {
      face('roof', v(o, i, z[i]! + H), v(inn, i, z[i]! + H), v(inn, j, z[j]! + H), v(o, j, z[j]! + H), up);
      face('wall', v(o, i, zb[i]!), v(o, j, zb[j]!), v(o, j, z[j]! + H), v(o, i, z[i]! + H), n);
      face('wall', v(inn, i, z[i]!), v(inn, j, z[j]!), v(inn, j, z[j]! + H), v(inn, i, z[i]! + H), nIn);
    }
    face('wall', v(oL, i, zb[i]!), v(oR, i, zb[i]!), v(oR, j, zb[j]!), v(oL, j, zb[j]!), down);
  }
  B.edgesOf(all, 25);
  // piers: 1.2 m along the deck, 60 % of its width across, every 25 m where the underside is high
  let last = -Infinity;
  for (let k = 0; k < S.length; k++) {
    if (zb[k]! < 2 || S[k]!.s - last < 25) continue;
    last = S[k]!.s;
    const q = pts[k]!, a = k + 1 < pts.length ? pts[k + 1]! : pts[k - 1]!, r = rightOf(q, a), u: Vec2 = [-r[1], r[0]];
    const hw = W * 0.6, hl = 0.6;
    const ring: Vec2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [q[0] + u[0] * x! * hl + r[0] * y! * hw, q[1] + u[1] * x! * hl + r[1] * y! * hw]);
    B.solid(ring, 0, zb[k]!);
  }
}
