/* Foliage drawing shared by potted plants and street trees. A crown or a clump is ONE silhouette:
   an ellipse whose edge is broken into small leafy scallops (not separate circles, which read as
   balloons), filled, with a hairline edge; inside, a few clump contours on the shadow side and
   short leaf ticks give it volume. Everything is in screen space around a projected point. */
import { f } from '@render/svg';

export type Rand = () => number;

/** scalloped, slightly irregular ellipse outline as a closed path */
export function leafyOutline(cx: number, cy: number, rx: number, ry: number, bumps: number, r: Rand, depth = 0.16): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < bumps; i++) {
    const t = (i / bumps) * Math.PI * 2 + (r() - 0.5) * (Math.PI / bumps) * 0.6;
    const k = 1 + (r() - 0.5) * 0.14;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < bumps; i++) {
    const p = pts[i]!, q = pts[(i + 1) % bumps]!;
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const ox = (mx - cx) * depth * (0.8 + r() * 0.5), oy = (my - cy) * depth * (0.8 + r() * 0.5);
    d += `Q${f(mx + ox * 2)} ${f(my + oy * 2)} ${f(q[0])} ${f(q[1])}`;
  }
  return d + 'Z';
}

/** cloud-like outline: points round an ellipse joined by outward arcs, so the edge is a run of soft
    lobes of uneven size (a saw-tooth edge read as a toy, user feedback) */
export function cloudOutline(cx: number, cy: number, rx: number, ry: number, lobes: number, r: Rand): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < lobes; i++) {
    const t = (i / lobes) * Math.PI * 2 + (r() - 0.5) * (Math.PI / lobes) * 0.8;
    const k = 0.9 + r() * 0.12;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < lobes; i++) {
    const p = pts[i]!, q = pts[(i + 1) % lobes]!, chord = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const rad = chord * (0.55 + r() * 0.15);
    d += `A${f(rad)} ${f(rad)} 0 0 1 ${f(q[0])} ${f(q[1])}`;
  }
  return d + 'Z';
}

/** a leafy clump: soft-lobed silhouette + shadow-side contours + a few leaf ticks */
export function clump(cx: number, cy: number, rx: number, ry: number, r: Rand, cls = 'crown'): string {
  const lobes = Math.max(6, Math.min(11, Math.round((rx + ry) * 0.45)));
  let s = `<path class="face ${cls}" d="${cloudOutline(cx, cy, rx, ry, lobes, r)}"/>`;
  // inner contours: a couple of scalloped arcs on the lower right, where the clump turns away from the light
  let arcs = '';
  for (let j = 0; j < 2; j++) {
    const a0 = 0.15 + j * 0.9 + r() * 0.3, a1 = a0 + 0.9, k = 0.55 + j * 0.15;
    const n = 4, step = (a1 - a0) / n;
    arcs += `M${f(cx + Math.cos(a0) * rx * k)} ${f(cy + Math.sin(a0) * ry * k)}`;
    for (let i = 1; i <= n; i++) {
      const t = a0 + i * step, tm = t - step / 2;
      arcs += `Q${f(cx + Math.cos(tm) * rx * (k + 0.1))} ${f(cy + Math.sin(tm) * ry * (k + 0.1))} ${f(cx + Math.cos(t) * rx * k)} ${f(cy + Math.sin(t) * ry * k)}`;
    }
  }
  s += `<path class="leaf-line" d="${arcs}"/>`;
  // leaf ticks scattered inside
  let ticks = '';
  const n = Math.round((rx * ry) / 14) + 2;
  for (let i = 0; i < n; i++) {
    const t = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75;
    const x = cx + Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d, l = 0.5 + r() * 0.7;
    ticks += `M${f(x - l)} ${f(y)}q${f(l)} ${f(-l * 0.8)} ${f(l * 2)} 0`;
  }
  return s + `<path class="leaf-line" d="${ticks}"/>`;
}

/** a single pointed leaf from (x, y) toward angle `deg`, length l */
export function blade(x: number, y: number, l: number, deg: number, w = 0.32): string {
  const t = (deg * Math.PI) / 180, ex = x + Math.cos(t) * l, ey = y + Math.sin(t) * l;
  const nx = -Math.sin(t) * l * w, ny = Math.cos(t) * l * w;
  const mx = (x + ex) / 2, my = (y + ey) / 2;
  return `<path class="leaf" d="M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z"/>`;
}

/** a tapered trunk from (x, y0) up to (x2, y1): a filled sliver, wider at the foot */
export function trunk(x: number, y0: number, x2: number, y1: number, w0: number, w1: number): string {
  return `<path class="face trunk" d="M${f(x - w0)} ${f(y0)}L${f(x2 - w1)} ${f(y1)}L${f(x2 + w1)} ${f(y1)}L${f(x + w0)} ${f(y0)}Z"/>`;
}
