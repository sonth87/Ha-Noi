/* Massing for landmarks (docs/architecture/components.md C1–C3): convex prisms on any plan (ellipse,
   circle, stadium, rounded rectangle) in a plot's local frame, with the faces turned to the viewer
   only, plus floor-by-floor window treatments that light like a house's floors (.fl.on .win).
   A convex prism needs no internal depth sorting: its visible side faces never overlap. */
import type { LocalDraw, LV } from '@render/local';
import { f, g } from '@render/svg';

export type Pt = readonly [number, number];

export function ellipse(ca: number, cb: number, ra: number, rb: number, n = 40): Pt[] {
  return Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return [ca + ra * Math.cos(t), cb + rb * Math.sin(t)] as const; });
}

/** convex hull (a, b), counter-clockwise in (a, b) */
export function hull(pts: readonly Pt[]): Pt[] {
  const p = [...pts].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], hi: Pt[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

/** rectangle a0..a1 × b0..b1 with a radius per corner: [−a−b, +a−b, +a+b, −a+b] */
export function roundRect(a0: number, b0: number, a1: number, b1: number, r: readonly [number, number, number, number], seg = 10): Pt[] {
  const cs: [number, number, number, number][] = [[a0 + r[0], b0 + r[0], r[0], Math.PI], [a1 - r[1], b0 + r[1], r[1], 1.5 * Math.PI], [a1 - r[2], b1 - r[2], r[2], 0], [a0 + r[3], b1 - r[3], r[3], 0.5 * Math.PI]];
  const out: Pt[] = [];
  for (const [ca, cb, rr, t0] of cs) for (let i = 0; i <= seg; i++) { const t = t0 + (i / seg) * 0.5 * Math.PI; out.push([ca + rr * Math.cos(t), cb + rr * Math.sin(t)]); }
  return hull(out);
}

export const bounds = (ring: readonly Pt[]) => {
  const as = ring.map(p => p[0]), bs = ring.map(p => p[1]);
  return { a: Math.min(...as), b: Math.min(...bs), la: Math.max(...as) - Math.min(...as), lb: Math.max(...bs) - Math.min(...bs) };
};

export const scaleRing = (ring: readonly Pt[], k: number, ca: number, cb: number): Pt[] => ring.map(([a, b]) => [ca + (a - ca) * k, cb + (b - cb) * k] as const);

/** which edges (i → i+1) of a counter-clockwise ring face the camera, in this frame */
export function visibleEdges(D: LocalDraw, ring: readonly Pt[]): boolean[] {
  return ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length]!;
    // outward normal of a CCW ring in (a, b): (db, −da)
    const v = D.L.vec(q[1] - p[1], -(q[0] - p[0]), 0);
    return v[0] + v[1] > 1e-9;
  });
}

/** the visible side as one run of ring points (convex ring: one contiguous chain) */
export function visibleChain(D: LocalDraw, ring: readonly Pt[]): Pt[] {
  const vis = visibleEdges(D, ring), n = ring.length;
  let start = vis.findIndex((v, i) => v && !vis[(i - 1 + n) % n]);
  if (start < 0) start = 0;
  const out: Pt[] = [ring[start]!];
  for (let k = 0; k < n && vis[(start + k) % n]; k++) out.push(ring[(start + k + 1) % n]!);
  return out;
}

const poly = (D: LocalDraw, pts: readonly LV[], cls: string) => `<path class="${cls}" d="${D.path(pts)}Z"/>`;

/** a prism over a CCW convex ring: visible side faces, then the top */
export function prism(D: LocalDraw, ring: readonly Pt[], z0: number, z1: number, cls = 'face', topCls = 'face top'): string {
  const vis = visibleEdges(D, ring);
  let s = '';
  ring.forEach((p, i) => {
    if (!vis[i]) return;
    const q = ring[(i + 1) % ring.length]!;
    s += poly(D, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], cls);
  });
  return s + poly(D, ring.map(p => [p[0], p[1], z1] as LV), topCls);
}

/** outline of the visible side (silhouette edges and floor lines are drawn by the caller) */
export function band(chain: readonly Pt[], z0: number, z1: number, inset = 0): LV[] {
  const c = inset ? trimChain(chain, inset) : chain;
  return [...c.map(p => [p[0], p[1], z0] as LV), ...[...c].reverse().map(p => [p[0], p[1], z1] as LV)];
}

/** shorten a chain by `d` at both ends */
function trimChain(chain: readonly Pt[], d: number): Pt[] {
  const cut = (pts: Pt[]) => {
    let rest = d;
    while (pts.length > 2) {
      const [p, q] = pts as [Pt, Pt], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len > rest) { const t = rest / len; pts[0] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; break; }
      rest -= len; pts.shift();
    }
    return pts;
  };
  return cut(cut([...chain]).reverse()).reverse();
}

/** Ribbon windows: per floor, one continuous glass band right round the visible side.
    Floors are numbered from `first`; each is its own .fl group (click to light). */
export function ribbons(D: LocalDraw, ring: readonly Pt[], id: string, z0: number, floorH: number, n: number, first = 1, glass: readonly [number, number] = [0.28, 0.8]): string {
  const chain = visibleChain(D, ring);
  let s = '';
  for (let i = 0; i < n; i++) {
    const z = z0 + i * floorH;
    s += `<g class="fl" data-floor="${id}/${first + i}">${poly(D, band(chain, z + floorH * glass[0], z + floorH * glass[1], 1.5), 'win')}</g>`;
  }
  return s;
}

/** Windows on a box's visible faces, per floor, in a staggered "pixel" pattern: on each floor
    every other column is glass, shifted by one column floor to floor. */
export function pixelWindows(D: LocalDraw, a: number, b: number, la: number, lb: number, id: string, z0: number, floorH: number, n: number, first = 1, col = 9): string {
  const sides = (['+a', '-a', '+b', '-b'] as const).map(sd => ({ sd, fc: D.face(a, b, z0, la, lb, floorH * n, sd) })).filter(x => x.fc);
  let s = '';
  for (let i = 0; i < n; i++) {
    let inner = '';
    for (const { fc } of sides) {
      const cols = Math.floor((fc!.w - 4) / col), x0 = (fc!.w - cols * col) / 2, y = fc!.h - (i + 1) * floorH;
      let r = '';
      for (let c = 0; c < cols; c++) if ((c + i) % 2 === 0) r += `<rect class="win" x="${f(x0 + c * col + 1)}" y="${f(y + floorH * 0.18)}" width="${f(col - 2)}" height="${f(floorH * 0.64)}"/>`;
      inner += g(fc!.t, r);
    }
    s += `<g class="fl" data-floor="${id}/${first + i}">${inner}</g>`;
  }
  return s;
}

/** Plain window rows on a box's visible faces, per floor. */
export function windowRows(D: LocalDraw, a: number, b: number, la: number, lb: number, id: string, z0: number, floorH: number, n: number, first = 1, col = 12): string {
  const sides = (['+a', '-a', '+b', '-b'] as const).map(sd => D.face(a, b, z0, la, lb, floorH * n, sd)).filter(Boolean);
  let s = '';
  for (let i = 0; i < n; i++) {
    let inner = '';
    for (const fc of sides) {
      const cols = Math.floor((fc!.w - 4) / col), x0 = (fc!.w - cols * col) / 2, y = fc!.h - (i + 1) * floorH;
      let r = '';
      for (let c = 0; c < cols; c++) r += `<rect class="win" x="${f(x0 + c * col + 2)}" y="${f(y + floorH * 0.22)}" width="${f(col - 4)}" height="${f(floorH * 0.56)}"/>`;
      inner += g(fc!.t, r);
    }
    s += `<g class="fl" data-floor="${id}/${first + i}">${inner}</g>`;
  }
  return s;
}

/** horizontal lines (slab edges) right round the visible side at each height */
export function floorLines(D: LocalDraw, ring: readonly Pt[], zs: readonly number[], cls = 'detail'): string {
  const chain = visibleChain(D, ring);
  return `<path class="${cls}" d="${zs.map(z => D.path(chain.map(p => [p[0], p[1], z] as LV))).join('')}"/>`;
}

/** make a ring counter-clockwise in (a, b) */
export function ccw(ring: readonly Pt[]): Pt[] {
  let s = 0;
  ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length]!; s += p[0] * q[1] - q[0] * p[1]; });
  return s > 0 ? [...ring] : [...ring].reverse();
}

/** per-floor window bands on a wall: floors numbered `id/first…`, glass from glass[0] to glass[1] of each floor */
export interface Bands { id: string; first: number; floorH: number; glass: readonly [number, number] }

export interface ExtrudeOpts {
  /** extra class of the wall on edge p → q ('' = plain face) */
  wall?: (p: Pt, q: Pt) => string;
  /** window bands on the wall on edge p → q, or none */
  bands?: (p: Pt, q: Pt) => Bands | null;
}

/** A prism over any simple ring, convex or not (a real footprint), drawn as one item: its visible
    walls in painter order for this frame, each with its own window bands, then the top. Walls
    share one height, so ordering them along the view is enough: where two overlap on screen,
    the one nearer the viewer (larger world x + y at the same screen column) goes later. */
export function extrude(D: LocalDraw, ring: readonly Pt[], z0: number, z1: number, o: ExtrudeOpts = {}): string {
  const R = ccw(ring), n = R.length, vis = visibleEdges(D, R);
  const W = R.map(p => D.L.pt(p[0], p[1], 0));
  const S = (i: number) => W[i]![0] - W[i]![1], T = (i: number) => W[i]![0] + W[i]![1];
  const edges = R.map((_, i) => i).filter(i => vis[i]);
  const at = (i: number, s: number) => { const j = (i + 1) % n, s0 = S(i), s1 = S(j); return T(i) + ((T(j) - T(i)) * (s - s0)) / (s1 - s0 || 1); };
  // i must come before j when, over their shared screen columns, i is farther
  const before = (i: number, j: number) => {
    const lo = Math.max(Math.min(S(i), S((i + 1) % n)), Math.min(S(j), S((j + 1) % n)));
    const hi = Math.min(Math.max(S(i), S((i + 1) % n)), Math.max(S(j), S((j + 1) % n)));
    if (hi - lo < 1e-6) return false;
    const m = (lo + hi) / 2;
    return at(i, m) < at(j, m) - 1e-6;
  };
  const mid = (i: number) => (T(i) + T((i + 1) % n)) / 2;
  const order: number[] = [], left = new Set(edges);
  while (left.size) {
    const free = [...left].filter(i => ![...left].some(j => j !== i && before(j, i)));
    const pick = (free.length ? free : [...left]).sort((p, q) => mid(p) - mid(q))[0]!;
    order.push(pick);
    left.delete(pick);
  }

  // window bands stop short of sharp corners and of the silhouette, and run on round a curve
  const dir = (i: number) => { const p = R[i]!, q = R[(i + 1) % n]!; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const sharp = (i: number) => {   // the vertex at the start of edge i
    const k = (i - 1 + n) % n;
    if (!vis[k]) return true;
    let t = Math.abs(dir(i) - dir(k));
    if (t > Math.PI) t = 2 * Math.PI - t;
    return t > 0.5;
  };

  let s = '';
  for (const i of order) {
    const p = R[i]!, q = R[(i + 1) % n]!;
    s += poly(D, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], `face${o.wall ? o.wall(p, q) : ''}`);
    const B = o.bands?.(p, q);
    if (!B) continue;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), ua = (q[0] - p[0]) / len, ub = (q[1] - p[1]) / len;
    const c0 = sharp(i) ? Math.min(1.5, len / 4) : 0, c1 = sharp((i + 1) % n) ? Math.min(1.5, len / 4) : 0;
    const P0: Pt = [p[0] + ua * c0, p[1] + ub * c0], P1: Pt = [q[0] - ua * c1, q[1] - ub * c1];
    const floors = Math.round((z1 - z0) / B.floorH);
    for (let k = 0; k < floors; k++) {
      const za = z0 + k * B.floorH + B.floorH * B.glass[0], zb = z0 + k * B.floorH + B.floorH * B.glass[1];
      s += `<g class="fl" data-floor="${B.id}/${B.first + k}">${poly(D, [[P0[0], P0[1], za], [P1[0], P1[1], za], [P1[0], P1[1], zb], [P0[0], P0[1], zb]], 'win')}</g>`;
    }
  }
  return s + poly(D, R.map(p => [p[0], p[1], z1] as LV), 'face top');
}
