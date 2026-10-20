/* Isometric projection kernel, ported from iso-glow / iso-figure (MIT, see ./LICENSE).
   Math and output strings match the original exactly; kernel.test.ts checks this against
   the skill's gallery.html. Axes: +x down-right, +y down-left, +z up. */

export type Vec3 = readonly [number, number, number];
export type Vec2 = [number, number];

export const C = Math.cos(Math.PI / 6);
export const S = Math.sin(Math.PI / 6);

export interface Kernel {
  readonly C: number;
  readonly S: number;
  /** 3D point → screen point (with the frame offset) */
  P(x: number, y: number, z: number): Vec2;
  /** 3D direction → screen direction (no offset) */
  D(x: number, y: number, z: number): Vec2;
  /** SVG `matrix(...)` that maps a face-local (u, v) plane at origin O along U and V */
  plane(O: Vec3, U: Vec3, V: Vec3): string;
  /** horizontal plane at height z; u along +x, v along +y */
  TOP(x: number, y: number, z: number): string;
  /** the y = max face, lower-left; u along +x, v downward. Pass its top-left corner (x, y+d, z+h). */
  FRONT(x: number, y: number, z: number): string;
  /** the x = max face, lower-right; u along −y, v downward. Pass its top-left corner (x+w, y+d, z+h). */
  SIDE(x: number, y: number, z: number): string;
  rect(t: string, w: number, h: number, r?: number, cls?: string): string;
  box(x: number, y: number, z: number, w: number, d: number, h: number, r?: number): string;
  boxc(x: number, y: number, z: number, w: number, d: number, h: number, r: number, cls: string): string;
  /** 3D polyline → SVG path "d" */
  path(pts: readonly Vec3[]): string;
}

export function kernel(OX: number, OY: number): Kernel {
  const P = (x: number, y: number, z: number): Vec2 => [(x - y) * C + OX, (x + y) * S - z + OY];
  const D = (x: number, y: number, z: number): Vec2 => [(x - y) * C, (x + y) * S - z];
  const plane = (O: Vec3, U: Vec3, V: Vec3) => {
    const o = P(...O), u = D(...U), v = D(...V);
    return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`;
  };
  const TOP = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 1, 0]);
  const FRONT = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 0, -1]);
  const SIDE = (x: number, y: number, z: number) => plane([x, y, z], [0, -1, 0], [0, 0, -1]);
  const rect = (t: string, w: number, h: number, r = 0, cls = 'face') =>
    `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;

  // Rounded box: one rounded top plus one continuous side wall along the visible part of the
  // outline, so the corners meet cleanly. r = 0 keeps the classic three flat faces.
  const rounded = (x: number, y: number, z: number, w: number, d: number, h: number, r: number, cls: string) => {
    r = Math.min(r, w / 2, d / 2);
    const n = 10, z1 = z + h, q = Math.PI / 4, H = Math.PI / 2, c = cls ? ' ' + cls : '';
    const arc = (cx: number, cy: number, a0: number, a1: number) => {
      const o: [number, number][] = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return o;
    };
    const ring = [...arc(x + w - r, y + r, -H, 0), ...arc(x + w - r, y + d - r, 0, H), ...arc(x + r, y + d - r, H, 2 * H), ...arc(x + r, y + r, 2 * H, 3 * H)];
    const vis = [...arc(x + w - r, y + r, -q, 0), ...arc(x + w - r, y + d - r, 0, H), ...arc(x + r, y + d - r, H, 3 * q)];
    const d3 = (pts: Vec3[]) => 'M' + pts.map(p => P(...p).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z';
    const wall: Vec3[] = [...vis.map(([a, b]): Vec3 => [a, b, z]), ...vis.slice().reverse().map(([a, b]): Vec3 => [a, b, z1])];
    return `<path class="face${c}" d="${d3(wall)}"/><path class="face top${c}" d="${d3(ring.map(([a, b]): Vec3 => [a, b, z1]))}"/>`;
  };

  const box = (x: number, y: number, z: number, w: number, d: number, h: number, r = 0) => r > 0 ? rounded(x, y, z, w, d, h, r, '') :
    rect(SIDE(x + w, y + d, z + h), d, h) + rect(FRONT(x, y + d, z + h), w, h) + rect(TOP(x, y, z + h), w, d, 0, 'face top');
  const boxc = (x: number, y: number, z: number, w: number, d: number, h: number, r: number, cls: string) => r > 0 ? rounded(x, y, z, w, d, h, r, cls) :
    rect(SIDE(x + w, y + d, z + h), d, h, 0, 'face ' + cls) + rect(FRONT(x, y + d, z + h), w, h, 0, 'face ' + cls) + rect(TOP(x, y, z + h), w, d, 0, 'face top ' + cls);
  const path = (pts: readonly Vec3[]) => 'M' + pts.map(p => P(...p).map(n => n.toFixed(2)).join(' ')).join('L');

  return { C, S, P, D, plane, TOP, FRONT, SIDE, rect, box, boxc, path };
}

/** Parallel hairlines in a face-local group: at a0, a0+step … a1, each spanning b0 → b1. */
export function slits(a0: number, a1: number, step: number, b0: number, b1: number, vertical = true, cls = 'detail'): string {
  let s = '';
  for (let a = a0; a <= a1 + 1e-6; a += step)
    s += vertical ? `<line class="${cls}" x1="${a}" y1="${b0}" x2="${a}" y2="${b1}"/>` : `<line class="${cls}" x1="${b0}" y1="${a}" x2="${b1}" y2="${a}"/>`;
  return s;
}

/** Escape text before it goes into an SVG string. */
export const esc = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
