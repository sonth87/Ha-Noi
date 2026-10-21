/* The elevated metro (ADR-042): Line 2A's viaduct, Thái Hà station and its trains.
     viaduct  under each track a box girder (the deck) with a low parapet on its outer side and the
              two rails; T-shaped piers every 30 m between the two tracks, not under the station;
     station  after Line 2A's elevated stations (three levels: entrances on the ground, the concourse
              above the street at about 6–10 m, two side platforms at track level), the iso-glow
              metro figure lending the furniture:
                - piers under the station, the concourse box with a band of windows (lit at night),
                - a side platform each side of the tracks, a lit edge strip (lit while a train
                  stands there), a railing on its outer edge,
                - a curved (barrel) roof over both platforms and tracks on columns,
                - departure boards hanging from the roof (screens always lit), name boards, benches,
                  bins, lamps under the roof (lit at night),
                - a covered stair from the concourse down to the ground at each side;
     trains   4 cars (Line 2A's sets), each a long rounded box with a window band and two doors a
              side, the end cars with a windscreen and head lamps; built in the car's own frame
              (nose +x) for the view to place along the track.
   Lamps: "station/<id>" (concourse and roof lamps, with the street lamps), "station/<id>/edge"
   (platform edges, while a train stops), "station/<id>/board" (screens). Pure. */
import * as THREE from 'three';
import { METRO, closestOnSegment, dist, normalizeRing, polylineLength, type City, type Rail, type Station, type Vec2 } from '@my-city/core';
import { V, Batch, type Surface } from './batch';

export const stationLamp = (st: Station, part: '' | 'edge' | 'board' = '') => `station/${st.id}${part ? `/${part}` : ''}`;

const DECK = 1.8;          // girder depth under the rails (m)
const PLATFORM = 1.05;     // platform top above the rail top
const CONCOURSE: [number, number] = [6, 10];

/** the two tracks of a line run as a pair: for each metro rail, the other one beside it */
function pairOf(rail: Rail, rails: Rail[]): Rail | undefined {
  return rails.find(o => o !== rail && o.kind === rail.kind && o.elevated && rail.path.some(p => nearest(o.path, p).d < 8));
}

export function buildMetro(B: Batch, city: City) {
  const rails = city.rails.filter(r => r.kind === 'metro' && r.elevated);
  const stations = city.stations.filter(s => s.kind === 'metro');
  const inStation = (p: Vec2) => stations.some(s => dist(s.at, p) < stationLength(s) / 2 + 6);
  for (const r of rails) {
    const other = pairOf(r, rails), h = r.height, S = resample(r.path, 3);
    // the outer side: away from the other track, judged half-way along (right of the path is (−dy, dx))
    const m = Math.floor(S.length / 2), p = S[m]!, q = S[Math.min(m + 1, S.length - 1)] ?? p, dd = dist(p, q) || 1;
    const right: Vec2 = [-(q[1] - p[1]) / dd, (q[0] - p[0]) / dd], o = other ? nearest(other.path, p).at : null;
    const side = o && (o[0] - p[0]) * right[0] + (o[1] - p[1]) * right[1] > 0 ? -1 : 1;
    // deck: a box girder 4.6 m wide under the track
    B.solid(strip(S, -2.3, 2.3), h - DECK, h - 0.25, () => 'wall', 'roof');
    // the parapet on the outer edge, 0.9 m
    B.solid(strip(S, side * 2.1, side * 2.3), h - 0.25, h + 0.9, () => 'wall', 'roof');
    // the rails, standard gauge
    for (const g of [-0.72, 0.72]) {
      const line = offset(S, g);
      for (let i = 1; i < line.length; i++) B.line(V(line[i - 1]![0], line[i - 1]![1], h), V(line[i]![0], line[i]![1], h), 'detail');
    }
    // piers between the pair (drawn once: from the rail with the smaller id), none in a station
    if (other && r.id < other.id) {
      const L = polylineLength(r.path);
      for (let s = 15; s < L; s += 30) {
        const p = at(r.path, s), o = nearest(other.path, p.p).at, m: Vec2 = [(p.p[0] + o[0]) / 2, (p.p[1] + o[1]) / 2];
        if (inStation(m)) continue;
        const u: Vec2 = [Math.cos(p.h), Math.sin(p.h)], v: Vec2 = [-u[1], u[0]];
        const rect = (a: number, b: number): Vec2[] => [[-a, -b], [a, -b], [a, b], [-a, b]].map(([x, y]) => [m[0] + u[0] * x! + v[0] * y!, m[1] + u[1] * x! + v[1] * y!]);
        B.solid(rect(0.8, 0.8), 0, h - DECK - 1.2, () => 'wall', 'roof');
        B.solid(rect(0.9, 5), h - DECK - 1.2, h - DECK, () => 'wall', 'roof');   // the crosshead under both girders
      }
    }
  }
  for (const st of stations) station(B, st, rails);
}

/** platform length from the data (the platforms' extent), 100 m when none is mapped */
function stationLength(st: Station): number {
  const pts = st.platforms.flat();
  if (pts.length < 2) return 100;
  let best = 0;
  for (const a of pts) for (const b of pts) best = Math.max(best, dist(a, b));
  return Math.min(140, Math.max(60, best));
}

function station(B: Batch, st: Station, rails: Rail[]) {
  // the station's frame: middle between its two tracks, u along them, v across
  const near = rails.map(r => ({ r, n: nearest(r.path, st.at) })).filter(x => x.n.d < 40).sort((a, b) => a.n.d - b.n.d).slice(0, 2);
  if (!near.length) return;
  const c: Vec2 = near.length === 2 ? [(near[0]!.n.at[0] + near[1]!.n.at[0]) / 2, (near[0]!.n.at[1] + near[1]!.n.at[1]) / 2] : near[0]!.n.at;
  const a0 = at(near[0]!.r.path, near[0]!.n.s), u: Vec2 = [Math.cos(a0.h), Math.sin(a0.h)], v: Vec2 = [-u[1], u[0]];
  const t = near.length === 2 ? dist(near[0]!.n.at, near[1]!.n.at) / 2 : 2, h = near[0]!.r.height;
  const L = stationLength(st), hl = L / 2, pw = 4, W = t + 1.6 + pw;   // half widths: track, platform, whole
  const P = (a: number, b: number, z: number) => V(c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, z);
  const ring = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([a, b]) => [c[0] + u[0] * a! + v[0] * b!, c[1] + u[1] * a! + v[1] * b!]);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, s: Surface = 'wall') => B.solid(ring(x0, x1, y0, y1), z0, z1, () => s, s === 'wall' ? 'roof' : s);
  const lamp = stationLamp(st), edge = stationLamp(st, 'edge'), board = stationLamp(st, 'board');
  const nU = (s: number) => new THREE.Vector3(u[0] * s, 0, u[1] * s), nV = (s: number) => new THREE.Vector3(v[0] * s, 0, v[1] * s), up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);

  // ---- the concourse over the street, on its piers ----
  const cl = hl * 0.6, [cz0, cz1] = CONCOURSE;
  for (const a of [-cl + 3, -cl / 3, cl / 3, cl - 3]) for (const b of [-W + 1.5, W - 1.5]) box(a - 0.7, a + 0.7, b - 0.7, b + 0.7, 0, cz0);
  box(-cl, cl, -W - 0.5, W + 0.5, cz0, cz1);
  for (const s of [-1, 1]) {
    // a band of glass all along each long side, in panes, lit at night
    const b = s * (W + 0.56), n = Math.round((2 * cl - 2) / 2.2), pw2 = (2 * cl - 2) / n;
    for (let i = 0; i < n; i++) { const x0 = -cl + 1 + i * pw2 + 0.06, x1 = x0 + pw2 - 0.12; B.window(lamp, [P(x0, b, cz0 + 1.1), P(x1, b, cz0 + 1.1), P(x1, b, cz1 - 0.9), P(x0, b, cz1 - 0.9)], nV(s)); }
  }
  // the piers carrying the track deck through the station
  for (let a = -hl + 6; a <= hl - 6; a += 18) box(a - 0.8, a + 0.8, -t - 0.8, t + 0.8, cz1, h - DECK);

  // ---- the side platforms ----
  const zp = h + PLATFORM;
  for (const s of [-1, 1]) {
    const b0 = s * (t + 1.6), b1 = s * W, lo = Math.min(b0, b1), hi = Math.max(b0, b1);
    box(-hl, hl, lo, hi, h - DECK, zp);
    // the lit edge strip along the track side
    const e0 = b0 + s * 0.15, e1 = b0 + s * 0.45;
    B.window(edge, [P(-hl + 1, e0, zp + 0.01), P(hl - 1, e0, zp + 0.01), P(hl - 1, e1, zp + 0.01), P(-hl + 1, e1, zp + 0.01)], up);
    // the railing along the outer edge
    box(-hl, hl, s > 0 ? hi - 0.08 : lo, s > 0 ? hi : lo + 0.08, zp, zp + 1.1, 'metal');
    // benches, bins along the platform, the middle third left clear
    for (const a of [-hl + 12, -hl + 26, hl - 26, hl - 12]) {
      const bm = s * (W - 1.2);
      box(a - 0.9, a + 0.9, bm - 0.25, bm + 0.25, zp, zp + 0.45, 'metal');
      box(a - 0.9, a + 0.9, s > 0 ? bm + 0.2 : bm - 0.25, s > 0 ? bm + 0.25 : bm - 0.2, zp + 0.45, zp + 0.9, 'metal');
      const bb: Vec2 = [c[0] + u[0] * (a + 3) + v[0] * bm, c[1] + u[1] * (a + 3) + v[1] * bm];
      B.solid(Array.from({ length: 8 }, (_, k): Vec2 => [bb[0] + 0.25 * Math.cos((k * Math.PI) / 4), bb[1] + 0.25 * Math.sin((k * Math.PI) / 4)]), zp, zp + 0.85, () => 'metal', 'metal');
    }
  }

  // ---- the roof: a barrel over platforms and tracks, on columns ----
  const zr = zp + 5.2, rise = 2.2, R = W + 0.8, N = 10, ra = hl + 2;
  const arc = (k: number): [number, number] => { const b = -R + (2 * R * k) / N; return [b, zr + rise * (1 - (b / R) ** 2)]; };
  for (let k = 0; k < N; k++) {
    const [b0, z0] = arc(k), [b1, z1] = arc(k + 1);
    B.quad('roof', [P(-ra, b0, z0), P(ra, b0, z0), P(ra, b1, z1), P(-ra, b1, z1)], up);
    B.line(P(-ra, b1, z1), P(ra, b1, z1), 'detail');
  }
  for (const a of [-ra, ra]) for (let k = 0; k < N; k++) { const [b0, z0] = arc(k), [b1, z1] = arc(k + 1); B.line(P(a, b0, z0), P(a, b1, z1), 'crease'); }
  for (const b of [-R, R]) B.line(P(-ra, b, zr), P(ra, b, zr), 'crease');
  for (let a = -hl + 4; a <= hl - 4; a += 12) for (const b of [-W + 0.3, W - 0.3]) box(a - 0.15, a + 0.15, b - 0.15, b + 0.15, zp, zr, 'metal');
  // lamps under the roof, a row over each platform
  for (const s of [-1, 1]) for (let a = -hl + 6; a <= hl - 6; a += 8) {
    const b = s * (t + 1.6 + pw / 2), zl = zr - 0.4;
    box(a - 0.5, a + 0.5, b - 0.1, b + 0.1, zl, zl + 0.1, 'metal');
    B.window(lamp, [P(a - 0.45, b - 0.08, zl - 0.01), P(a + 0.45, b - 0.08, zl - 0.01), P(a + 0.45, b + 0.08, zl - 0.01), P(a - 0.45, b + 0.08, zl - 0.01)], down);
  }
  // departure boards hanging over each platform, facing along it both ways (screens: always lit)
  for (const s of [-1, 1]) for (const a of [-hl / 3, hl / 3]) {
    const b = s * (t + 1.6 + pw / 2), z0 = zp + 2.8, z1 = z0 + 0.7;
    box(a - 0.06, a + 0.06, b - 1.2, b + 1.2, z0, z1, 'metal');
    for (const f of [-1, 1]) B.window(board, [P(a + f * 0.07, b - 1.1, z0 + 0.08), P(a + f * 0.07, b + 1.1, z0 + 0.08), P(a + f * 0.07, b + 1.1, z1 - 0.08), P(a + f * 0.07, b - 1.1, z1 - 0.08)], nU(f));
    B.line(P(a, b - 1, z1), P(a, b - 1, zr - 0.2), 'detail'); B.line(P(a, b + 1, z1), P(a, b + 1, zr - 0.2), 'detail');
  }
  // the name board on each long side, under the roof edge (lit with the station)
  for (const s of [-1, 1]) {
    const b = s * (R + 0.02);
    box(-8, 8, Math.min(b, b + s * 0.15), Math.max(b, b + s * 0.15), zr - 1.3, zr - 0.3, 'metal');
    B.window(lamp, [P(-7.6, b + s * 0.16, zr - 1.2), P(7.6, b + s * 0.16, zr - 1.2), P(7.6, b + s * 0.16, zr - 0.4), P(-7.6, b + s * 0.16, zr - 0.4)], nV(s));
  }

  // ---- a covered stair from the concourse down to the ground at each side ----
  for (const s of [-1, 1]) {
    const a0 = s * (cl - 6), steps = 14, run = 0.62, rise2 = cz0 / steps, bw = 2.6;
    for (let i = 0; i < steps; i++) {
      const b0 = s * (W + 0.5 + i * run), b1 = b0 + s * run;
      box(a0 - bw / 2, a0 + bw / 2, Math.min(b0, b1), Math.max(b0, b1), 0, cz0 - i * rise2);
    }
    const bEnd = s * (W + 0.5 + steps * run);
    // its roof: a sloping sheet over the flight, on posts
    B.panel('roof', [P(a0 - bw / 2 - 0.3, s * (W + 0.5), cz1 - 0.6), P(a0 + bw / 2 + 0.3, s * (W + 0.5), cz1 - 0.6), P(a0 + bw / 2 + 0.3, bEnd, 3.2), P(a0 - bw / 2 - 0.3, bEnd, 3.2)], up);
    for (const a of [a0 - bw / 2 - 0.2, a0 + bw / 2 + 0.2]) box(a - 0.06, a + 0.06, bEnd - 0.06 * s - 0.06, bEnd - 0.06 * s + 0.06, 0, 3.2, 'metal');
  }
}

// ---------- trains ----------

export interface CarModel { parts: Map<'body' | 'top' | 'glass' | 'door' | 'win' | 'head', THREE.BufferGeometry>; shell: THREE.BufferGeometry; lines: Float32Array }

/** One car, nose toward +x, centred, its floor 0.25 m above the rail top: a long box with rounded
    corners, a band of windows and two doors on each side; the end car (`cab`) has a windscreen and
    two head lamps on its +x end. */
export function carModel(cab: boolean): CarModel {
  const B = new Batch(), L = METRO.carLen - 0.4, hw = 1.4, z0 = 0.25, z1 = 3.85, r = 0.35;
  const ringPts: Vec2[] = [];
  for (const [cx, cy, a] of [[L / 2 - r, hw - r, 0], [-L / 2 + r, hw - r, Math.PI / 2], [-L / 2 + r, -hw + r, Math.PI], [L / 2 - r, -hw + r, 1.5 * Math.PI]] as const)
    for (let k = 0; k <= 2; k++) { const t = a + (k / 2) * (Math.PI / 2); ringPts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  B.solid(ringPts, z0, z1, () => 'wall', 'roof');
  const win: number[] = [], door: number[] = [], head: number[] = [], glass: number[] = [];
  const quad = (out: number[], p: THREE.Vector3[], n: THREE.Vector3) => B.quad('wall', p, n, out);
  for (const s of [-1, 1]) {
    const y = s * (hw + 0.01), n = new THREE.Vector3(0, 0, s);
    // doors at a quarter and three quarters, windows between and beyond them
    const doors = [-L / 4, L / 4], dw = 1.3;
    for (const d of doors) { quad(door, [V(d - dw / 2, y, z0 + 0.1), V(d + dw / 2, y, z0 + 0.1), V(d + dw / 2, y, z1 - 0.6), V(d - dw / 2, y, z1 - 0.6)], n); B.line(V(d, y, z0 + 0.1), V(d, y, z1 - 0.6)); }
    const spans: [number, number][] = [[-L / 2 + 1.2, -L / 4 - dw / 2 - 0.4], [-L / 4 + dw / 2 + 0.4, L / 4 - dw / 2 - 0.4], [L / 4 + dw / 2 + 0.4, L / 2 - (cab ? 2.4 : 1.2)]];
    for (const [a, b] of spans) {
      const n2 = Math.max(1, Math.round((b - a) / 1.7)), w2 = (b - a) / n2;
      for (let i = 0; i < n2; i++) { const x0 = a + i * w2 + 0.08, x1 = x0 + w2 - 0.16; quad(win, [V(x0, y, z0 + 1.3), V(x1, y, z0 + 1.3), V(x1, y, z1 - 0.9), V(x0, y, z1 - 0.9)], n); B.loop([V(x0, y, z0 + 1.3), V(x1, y, z0 + 1.3), V(x1, y, z1 - 0.9), V(x0, y, z1 - 0.9)], 'detail'); }
    }
    B.line(V(-L / 2 + 0.4, y, z1 - 0.45), V(L / 2 - 0.4, y, z1 - 0.45));
  }
  if (cab) {
    const x = L / 2 + 0.01, n = new THREE.Vector3(1, 0, 0);
    quad(glass, [V(x, -hw + 0.3, z0 + 1.6), V(x, hw - 0.3, z0 + 1.6), V(x, hw - 0.3, z1 - 0.4), V(x, -hw + 0.3, z1 - 0.4)], n);
    for (const y of [-hw + 0.45, hw - 0.45]) quad(head, [V(x, y - 0.18, z0 + 0.6), V(x, y + 0.18, z0 + 0.6), V(x, y + 0.18, z0 + 0.9), V(x, y - 0.18, z0 + 0.9)], n);
  }
  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
  const parts = new Map<'body' | 'top' | 'glass' | 'door' | 'win' | 'head', THREE.BufferGeometry>([
    ['body', geo(B.tris.get('wall') ?? [])], ['top', geo(B.tris.get('roof') ?? [])], ['glass', geo(glass)], ['door', geo(door)], ['win', geo(win)], ['head', geo(head)],
  ]);
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(B.shell.pos, 3));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(B.shell.nrm, 3));
  return { parts, shell, lines: new Float32Array([...B.creases, ...B.details]) };
}

// ---------- path helpers ----------

export function nearest(path: readonly Vec2[], p: Vec2): { at: Vec2; d: number; s: number } {
  let best = { at: path[0]!, d: Infinity, s: 0 }, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, q = closestOnSegment(p, a, b), L = dist(a, b);
    if (q.d < best.d) best = { at: q.at, d: q.d, s: acc + q.t * L };
    acc += L;
  }
  return best;
}

/** point and heading at distance s along a path */
export function at(path: readonly Vec2[], s: number): { p: Vec2; h: number } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    if (acc + L >= s || i === path.length - 1) { const t = L ? Math.max(0, Math.min(1, (s - acc) / L)) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], h: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    acc += L;
  }
  return { p: path[0]!, h: 0 };
}

function resample(path: readonly Vec2[], step: number): Vec2[] {
  const L = polylineLength(path), n = Math.max(1, Math.ceil(L / step));
  return Array.from({ length: n + 1 }, (_, i) => at(path, (i * L) / n).p);
}

function offset(path: readonly Vec2[], d: number): Vec2[] {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)]!, b = path[Math.min(path.length - 1, i + 1)]!, L = dist(a, b) || 1;
    return [p[0] - ((b[1] - a[1]) / L) * d, p[1] + ((b[0] - a[0]) / L) * d] as const;
  });
}

function strip(path: readonly Vec2[], d0: number, d1: number): Vec2[] {
  return normalizeRing([...offset(path, d0), ...offset(path, d1).reverse()]);
}
