/* Small geometry helpers on top of the iso kernel: shapes the original kernel has no primitive for
   (a cylinder lying along x, e.g. an inox water tank). Pure string output. */
import type { Kernel, Vec2, Vec3 } from '@iso/kernel';

const f = (n: number) => n.toFixed(2);

/** Andrew's monotone chain; returns the hull counter-clockwise. */
export function convexHull(points: readonly Vec2[]): Vec2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [], upper: Vec2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const d2 = (pts: readonly Vec2[], close = true) =>
  'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + (close ? 'Z' : '');

/** A cylinder lying along +x, from x0 to x1, axis at (yc, zc). Draws the body silhouette,
    the visible end cap (x1 faces the viewer) and hoop bands on the visible half. */
export function cylinderX(K: Kernel, x0: number, x1: number, yc: number, zc: number, R: number, bands = 2): string {
  const N = 28;
  const ring = (x: number, t0 = 0, t1 = Math.PI * 2, n = N) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = t0 + (t1 - t0) * i / n;
      return K.P(x, yc + R * Math.cos(t), zc + R * Math.sin(t));
    });
  const hull = convexHull([...ring(x0), ...ring(x1)]);
  let s = `<path class="face" d="${d2(hull)}"/><path class="face top" d="${d2(ring(x1))}"/>`;
  // the half of the surface facing the viewer: normal (0, cos t, sin t) · (1, 1, 1) > 0
  for (let i = 1; i <= bands; i++) {
    const x = x0 + (x1 - x0) * i / (bands + 1);
    s += `<path class="detail" d="${d2(ring(x, -Math.PI / 4, Math.PI * 3 / 4, 14), false)}"/>`;
  }
  return s;
}

/** A cylinder with a horizontal axis from p0 to p1 (any direction in x/y): body silhouette,
    the end cap that faces the viewer, hoop bands on the visible half. */
export function cylinderH(K: Kernel, p0: Vec3, p1: Vec3, R: number, bands = 2): string {
  const N = 28;
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const ux = (p1[0] - p0[0]) / len, uy = (p1[1] - p0[1]) / len;
  const nx = -uy, ny = ux;                                   // horizontal, perpendicular to the axis
  const ring = (c: Vec3, t0 = 0, t1 = Math.PI * 2, n = N) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = t0 + (t1 - t0) * i / n, cs = Math.cos(t), sn = Math.sin(t);
      return K.P(c[0] + R * cs * nx, c[1] + R * cs * ny, c[2] + R * sn);
    });
  const hull = convexHull([...ring(p0), ...ring(p1)]);
  const capAt = ux + uy > 0 ? p1 : p0;                      // the end whose outward axis points toward +x/+y
  let s = `<path class="face" d="${d2(hull)}"/><path class="face top" d="${d2(ring(capAt))}"/>`;
  // visible half: (cos t · n + sin t · z) · (1, 1, 1) > 0, centred on atan2(1, nx + ny)
  const mid = Math.atan2(1, nx + ny);
  for (let i = 1; i <= bands; i++) {
    const k = i / (bands + 1);
    const c: Vec3 = [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2]];
    s += `<path class="detail" d="${d2(ring(c, mid - Math.PI / 2, mid + Math.PI / 2, 14), false)}"/>`;
  }
  return s;
}

/** Projected circle lying in a horizontal plane (e.g. a light pool on the ground). */
export function groundCircle(K: Kernel, cx: number, cy: number, z: number, r: number, cls: string, extra = ''): string {
  return `<g transform="${K.TOP(cx, cy, z)}"><circle class="${cls}" cx="0" cy="0" r="${r}" ${extra}/></g>`;
}

/** A 3D polyline sampled along a sagging wire between two points (parabola approximating a catenary). */
export function sagLine(a: Vec3, b: Vec3, sag: number, n = 18): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)] as Vec3;
  });
}
