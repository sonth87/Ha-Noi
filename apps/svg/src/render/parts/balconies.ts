/* Balconies (rail, chuồng cọp cage), pots, facade AC units. FR-06. Ported from the reference house.
   Railings are drawn on every visible face of the balcony volume except the side against the wall. */
import { slits } from '@iso/kernel';
import type { FloorSpec } from '@core/types';
import type { Ctx } from '@render/parts/ctx';
import type { LocalSide } from '@core/view';
import { f, g } from '@render/svg';
import { pot } from '@render/parts/plants';

const OUT = 10;   // balcony depth

const railBars = (len: number, h: number) =>
  `<path class="rail" d="M0 0H${f(len)}M0 ${f(h)}H${f(len)}${Array.from({ length: Math.floor(len / 2.4) + 1 }, (_, i) => `M${f(Math.min(i * 2.4, len))} 0V${f(h)}`).join('')}"/>`;
/** lan can kính: tinted panels with a top rail and posts at the ends */
const glassPanels = (len: number, h: number) =>
  `<rect class="glass-panel" x="0.3" y="0.8" width="${f(len - 0.6)}" height="${f(h - 0.8)}"/>` +
  `<path class="glint" d="M${f(len * 0.18)} ${f(h - 1)}l${f(h * 0.5)} ${f(-h * 0.7)}M${f(len * 0.18 + 2)} ${f(h - 1)}l${f(h * 0.3)} ${f(-h * 0.42)}M${f(len * 0.62)} ${f(h - 1)}l${f(h * 0.5)} ${f(-h * 0.7)}"/>` +
  `<path class="rail" d="M0 0H${f(len)}M0.3 0V${f(h)}M${f(len - 0.3)} 0V${f(h)}"/>`;
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

/** the balconies of one floor: one across the frontage, or short ones (a little wider than the
    window, one per bay) — the bays match the facade's window bays */
export function balcony(c: Ctx, n: number, fl: FloorSpec): void {
  if (fl.balcony === 'none') return;
  const W = c.s.w;
  if (fl.balconyWidth === 'full') return balconySpan(c, n, fl, 0, W, '');
  const bays = c.s.bays > 0 ? c.s.bays : Math.max(1, Math.round(W / 40)), bw = W / bays;
  for (let k = 0; k < bays; k++) {
    const sw = Math.min(bw - 4, Math.max(14, bw * 0.62));
    balconySpan(c, n, fl, k * bw + (bw - sw) / 2 - 2, sw + 4, bays > 1 ? `-${k}` : '');
  }
}

/** one balcony between a0 and a0 + w (the rail sits 2 in from each end, the cage 1) */
function balconySpan(c: Ctx, n: number, fl: FloorSpec, a0: number, w: number, tag: string): void {
  const { s, D } = c, z = s.groundH + (n - 2) * s.floorH, b = c.fy, a1 = a0 + w;
  const spots: [number, number][] = [[4, 4.8], [12, 4.2], [w - 9, 5]];
  const plants = Math.min(fl.plants, w < 22 ? 2 : 3);
  // clothes line under the floor above, but clear of an ô văng (which starts at floorH − 5.6)
  const lineZ = z + s.floorH - 8, dry = fl.laundry ? laundry(c, a0 + 4, a1 - 4, b + OUT - 5, lineZ) : '';
  if (fl.balcony === 'rail' || fl.balcony === 'solid' || fl.balcony === 'glass') {
    const rh = 11, ra = a0 + 2, rw = w - 4;
    let svg = D.box(ra, b, z, rw, OUT, 2);
    for (let i = 0; i < plants; i++) { const [pa, sz] = spots[i]!; svg += pot(c, ra + pa, b + OUT - 3.5, z + 2, sz, fl.plantKind); }
    svg += dry;
    if (fl.balcony === 'rail') svg += onOpenSides(c, ra, b, z + 2, rw, OUT, rh, len => railBars(len, rh));
    else if (fl.balcony === 'glass') svg += onOpenSides(c, ra, b, z + 2, rw, OUT, rh, len => glassPanels(len, rh));
    else {
      // lan can xây: thin solid walls on the open sides
      const t = 1.2, walls: [number, number, number, number][] = [[ra, b, t, OUT - t], [ra + rw - t, b, t, OUT - t], [ra, b + OUT - t, rw, t]];
      for (const [a, bb, la, lb] of walls) svg += D.box(a, bb, z + 2, la, lb, rh - 1);
    }
    // tall plants and laundry reach up to here, still under an ô văng (floorH − 5.6)
    c.add(`balcony-${n}${tag}`, ra, b, z, rw, OUT, s.floorH - 7, svg);
  } else {
    const h = s.floorH - 2, ca = a0 + 1, cw = w - 2;
    let svg = D.box(ca, b, z, cw, OUT, 2);
    if (fl.plants > 0) svg += pot(c, ca + cw - 6, b + 4, z + 2, 2.4, fl.plantKind);
    svg += dry;
    svg += onOpenSides(c, ca, b, z + 2, cw, OUT, h - 2, len => cageGrid(len, h - 4));
    svg += D.box(ca - 0.8, b, z + h - 1.5, cw + 1.6, OUT + 1.2, 1.5);
    c.add(`cage-${n}${tag}`, ca - 0.8, b, z, cw + 1.6, OUT + 1.2, h, svg);
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
