/* 2D geometry on the ground plane (metres). Rings are closed implicitly (no repeated first point)
   and stored with positive shoelace area in (x, y): with y pointing south that is clockwise on a
   north-up map, counter-clockwise in the maths sense of the (x, y) axes. Pure. */

export type Vec2 = readonly [number, number];

export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** signed shoelace area */
export function signedArea(ring: readonly Vec2[]): number {
  let s = 0;
  ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length]!; s += p[0] * q[1] - q[0] * p[1]; });
  return s / 2;
}

export const area = (ring: readonly Vec2[]) => Math.abs(signedArea(ring));

/** the ring with positive area; also drops a repeated closing point and consecutive duplicates */
export function normalizeRing(ring: readonly Vec2[], eps = 1e-6): Vec2[] {
  const out: Vec2[] = [];
  for (const p of ring) if (!out.length || dist(p, out[out.length - 1]!) > eps) out.push(p);
  if (out.length > 1 && dist(out[0]!, out[out.length - 1]!) <= eps) out.pop();
  return signedArea(out) < 0 ? out.reverse() : out;
}

export function centroid(ring: readonly Vec2[]): Vec2 {
  const A = signedArea(ring);
  if (Math.abs(A) < 1e-9) { const n = ring.length || 1; return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]; }
  let cx = 0, cy = 0;
  ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length]!, c = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; });
  return [cx / (6 * A), cy / (6 * A)];
}

export function bbox(pts: readonly Vec2[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

export function pointInRing(p: Vec2, ring: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function polylineLength(path: readonly Vec2[]): number {
  let s = 0;
  for (let i = 1; i < path.length; i++) s += dist(path[i - 1]!, path[i]!);
  return s;
}

/** closest point on segment ab to p, and its parameter t in [0, 1] */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { at: Vec2; t: number; d: number } {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  const at: Vec2 = [a[0] + dx * t, a[1] + dy * t];
  return { at, t, d: dist(p, at) };
}

/** closest point on a polyline */
export function closestOnPath(p: Vec2, path: readonly Vec2[]): { at: Vec2; d: number } {
  let best = { at: path[0]!, d: Infinity };
  for (let i = 1; i < path.length; i++) { const c = closestOnSegment(p, path[i - 1]!, path[i]!); if (c.d < best.d) best = c; }
  return best;
}

/** The smallest-area rectangle around a ring (rotating an edge of the hull): its short and long
    side. Used to tell a tube house from a block. */
export function minRect(ring: readonly Vec2[]): { short: number; long: number } {
  const h = hull(ring);
  let best = { a: Infinity, short: 0, long: 0 };
  for (let i = 0; i < h.length; i++) {
    const p = h[i]!, q = h[(i + 1) % h.length]!, L = dist(p, q);
    if (L < 1e-9) continue;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const r of h) { const u = r[0] * ux + r[1] * uy, v = -r[0] * uy + r[1] * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const w = u1 - u0, d = v1 - v0;
    if (w * d < best.a) best = { a: w * d, short: Math.min(w, d), long: Math.max(w, d) };
  }
  return { short: best.short, long: best.long };
}

export function hull(pts: readonly Vec2[]): Vec2[] {
  const p = [...pts].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  if (p.length < 3) return p;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Vec2[] = [], hi: Vec2[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export const inRect = (p: Vec2, r: Rect) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;

/** Clip a polyline to a rectangle (Liang–Barsky per segment); returns the pieces inside. */
export function clipPath(path: readonly Vec2[], r: Rect): Vec2[][] {
  const out: Vec2[][] = [];
  let cur: Vec2[] = [];
  const flush = () => { if (cur.length > 1) out.push(cur); cur = []; };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, a[0] - r.x0], [dx, r.x1 - a[0]], [-dy, a[1] - r.y0], [dy, r.y1 - a[1]]] as const) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 > t1) { ok = false; break; }
    }
    if (!ok) { flush(); continue; }
    const s: Vec2 = [a[0] + dx * t0, a[1] + dy * t0], e: Vec2 = [a[0] + dx * t1, a[1] + dy * t1];
    if (!cur.length) cur.push(s);
    else if (dist(cur[cur.length - 1]!, s) > 1e-9) { flush(); cur.push(s); }
    cur.push(e);
    if (t1 < 1) flush();
  }
  flush();
  return out;
}

/** Clip a ring to a rectangle (Sutherland–Hodgman); [] when nothing is left. */
export function clipRing(ring: readonly Vec2[], r: Rect): Vec2[] {
  const edges: [(p: Vec2) => boolean, (a: Vec2, b: Vec2) => Vec2][] = [
    [p => p[0] >= r.x0, (a, b) => lerpX(a, b, r.x0)], [p => p[0] <= r.x1, (a, b) => lerpX(a, b, r.x1)],
    [p => p[1] >= r.y0, (a, b) => lerpY(a, b, r.y0)], [p => p[1] <= r.y1, (a, b) => lerpY(a, b, r.y1)],
  ];
  let pts: Vec2[] = [...ring];
  for (const [inside, cut] of edges) {
    const src = pts; pts = [];
    src.forEach((p, i) => {
      const q = src[(i + 1) % src.length]!;
      if (inside(p)) { pts.push(p); if (!inside(q)) pts.push(cut(p, q)); }
      else if (inside(q)) pts.push(cut(p, q));
    });
    if (!pts.length) return [];
  }
  return pts.length >= 3 ? normalizeRing(pts) : [];
}
const lerpX = (a: Vec2, b: Vec2, x: number): Vec2 => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
const lerpY = (a: Vec2, b: Vec2, y: number): Vec2 => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
