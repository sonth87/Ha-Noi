/* Balconies (rail, chuồng cọp cage), pots, facade AC units. FR-06. Ported from the reference house.
   Railings are drawn on every visible face of the balcony volume except the side against the wall. */
import { slits } from '@iso/kernel';
import type { FloorSpec } from '@core/types';
import type { Ctx } from '@render/parts/ctx';
import type { LocalSide } from '@core/view';
import { f, g } from '@render/svg';

const OUT = 10;   // balcony depth

/** a pot with a round plant on top, standing at (a, b, z) */
export function pot(c: Ctx, a: number, b: number, z: number, size: number): string {
  const p = c.D.P(a, b, z + 3 + size * 0.8);
  return c.D.box(a - 1.6, b - 1.6, z, 3.2, 3.2, 3, 0.8) +
    `<circle class="face plant" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(size)}"/><circle class="detail" cx="${f(p[0] - size * 0.3)}" cy="${f(p[1] - size * 0.25)}" r="${f(size * 0.5)}"/>`;
}

const railBars = (len: number, h: number) =>
  `<path class="rail" d="M0 0H${f(len)}M0 ${f(h)}H${f(len)}${Array.from({ length: Math.floor(len / 2.4) + 1 }, (_, i) => `M${f(Math.min(i * 2.4, len))} 0V${f(h)}`).join('')}"/>`;
const cageGrid = (len: number, h: number) =>
  `<path class="rail" d="M0 0H${f(len)}M0 ${f(h * 0.62)}H${f(len)}M0 ${f(h)}H${f(len)}${Array.from({ length: Math.floor(len / 1.8) + 1 }, (_, i) => `M${f(Math.min(i * 1.8, len))} 0V${f(h)}`).join('')}"/>`;

/** draw `content(len)` on each visible side of a local volume except its back (the wall) */
function onOpenSides(c: Ctx, a: number, b: number, z: number, la: number, lb: number, h: number, content: (len: number) => string): string {
  let s = '';
  for (const side of ['-a', '+a', '+b'] as LocalSide[]) {
    const face = c.D.face(a, b, z, la, lb, h, side);
    if (face) s += g(face.t, content(face.w));
  }
  return s;
}

/** clothes on a line across the balcony, hanging from zt (a vertical plane along the facade) */
function laundry(c: Ctx, a0: number, a1: number, b: number, zt: number): string {
  const { D } = c, len = a1 - a0;
  let s = `<path class="rail" d="${D.path([[a0, b, zt], [a1, b, zt]])}"/>`;
  let clothes = '', u = 1.5;
  while (u < len - 3) {
    const w = 2.2 + c.r.next() * 2.6, h = 3.5 + c.r.next() * 4;
    if (u + w > len - 1) break;
    clothes += `<rect class="face cloth" x="${f(u)}" y="0.2" width="${f(w)}" height="${f(h)}"/>`;
    u += w + 0.8 + c.r.next() * 1.4;
  }
  s += g(D.plane([a0, b, zt], [1, 0, 0], [0, 0, -1]), clothes);
  return s;
}

export function balcony(c: Ctx, n: number, fl: FloorSpec): void {
  if (fl.balcony === 'none') return;
  const { s, D } = c, W = s.w, z = s.groundH + (n - 2) * s.floorH, b = c.fy;
  const spots: [number, number][] = [[5, 3], [12, 2.4], [W - 10, 3.2]];
  // clothes line under the floor above, but clear of an ô văng (which starts at floorH − 5.6)
  const lineZ = z + s.floorH - 8, dry = fl.laundry ? laundry(c, 4, W - 4, b + OUT - 5, lineZ) : '';
  if (fl.balcony === 'rail' || fl.balcony === 'solid') {
    const rh = 11;
    let svg = D.box(2, b, z, W - 4, OUT, 2);
    for (let i = 0; i < Math.min(3, fl.plants); i++) { const [pa, sz] = spots[i]!; svg += pot(c, 2 + pa, b + OUT - 3.5, z + 2, sz); }
    svg += dry;
    if (fl.balcony === 'rail') svg += onOpenSides(c, 2, b, z + 2, W - 4, OUT, rh, len => railBars(len, rh));
    else {
      // lan can xây: thin solid walls on the open sides, a coping line on top
      const t = 1.2, walls: [number, number, number, number][] = [[2, b, t, OUT - t], [W - 2 - t, b, t, OUT - t], [2, b + OUT - t, W - 4, t]];
      for (const [a, bb, la, lb] of walls) svg += D.box(a, bb, z + 2, la, lb, rh - 1);
    }
    c.add(`balcony-${n}`, 2, b, z, W - 4, OUT, fl.laundry ? lineZ - z : rh + 2, svg);
  } else {
    const h = s.floorH - 2;
    let svg = D.box(1, b, z, W - 2, OUT, 2);
    if (fl.plants > 0) svg += pot(c, W - 7, b + 4, z + 2, 2.4);
    svg += dry;
    svg += onOpenSides(c, 1, b, z + 2, W - 2, OUT, h - 2, len => cageGrid(len, h - 4));
    svg += D.box(0.2, b, z + h - 1.5, W - 0.4, OUT + 1.2, 1.5);
    c.add(`cage-${n}`, 0.2, b, z, W - 0.4, OUT + 1.2, h, svg);
  }
}

/** ô văng over a floor's window: a thin concrete slab or a small corrugated sheet sloping out */
export function canopy(c: Ctx, n: number, fl: FloorSpec): void {
  if (fl.canopy === 'none' || fl.balcony === 'cage') return;
  const { s, D } = c, W = s.w, top = s.groundH + (n - 1) * s.floorH, b = c.fy, out = 6, z0 = top - 5.6;
  let svg: string;
  if (fl.canopy === 'concrete') svg = D.box(1, b, z0 + 0.6, W - 3, out, 1.6);
  else {
    svg = g(D.plane([1, b, top - 3.4], [1, 0, 0], [0, 1, -2 / out]), `<rect class="face metal" width="${W - 3}" height="${out}"/>${slits(2, W - 5, 2, 0, out)}`);
    const edge = D.face(1, b + out - 0.01, z0, W - 3, 0.01, 0.6, '+b');
    if (edge) svg += g(edge.t, `<rect class="face" width="${W - 3}" height="0.6"/>`);
  }
  c.add(`canopy-${n}`, 1, b, z0, W - 3, out, 2.2, svg);
}

/** outdoor AC unit on the facade, below the floor's window (only where there is no balcony) */
export function facadeAC(c: Ctx, n: number): void {
  const { D } = c, z = c.s.groundH + (n - 2) * c.s.floorH + 2, b = c.fy;
  let svg = D.box(3, b, z, 10, 5, 7);
  const face = D.face(3, b, z, 10, 5, 7, '+b');
  if (face) svg += g(face.t, `<circle class="detail" cx="3.6" cy="3.6" r="2.6"/><path class="detail" d="M1 3.6H6.2M3.6 1V6.2"/>${slits(7.2, 9.2, 1, 1, 6)}`);
  c.add(`ac-${n}`, 3, b, z, 10, 5, 7, svg);
}
