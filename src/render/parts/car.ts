/* Cars for the street (user request): sedan, hatchback, taxi (lit roof sign) and van, driving along
   local a. Body and cabin are boxes; wheels and windows sit on whichever long side faces the viewer,
   the windscreen or rear window on the visible end; head- and tail-lights light at night.
   Length along a from the tail, centred on `cross` across the lane; `dir` turns it around. */
import type { LocalDraw } from '@render/local';
import type { LocalSide } from '@core/view';
import { f, g } from '@render/svg';

export type CarKind = 'sedan' | 'hatch' | 'taxi' | 'van';
export const CAR_LEN: Record<CarKind, number> = { sedan: 44, hatch: 38, taxi: 44, van: 48 };
const W = 17;

export function car(D: LocalDraw, kind: CarKind, cross: number, dir: 1 | -1): string {
  const L = CAR_LEN[kind], b0 = cross - W / 2;
  const x = (u: number, len = 0) => (dir > 0 ? u : L - u - len);          // a of a part's tail end
  const tall = kind === 'van';
  const bodyH = tall ? 14 : 6.5, z0 = 2.5;
  // cabin (glasshouse): along the car, inset from the sides
  const cab = kind === 'van' ? null : kind === 'hatch' ? [9, 27] as const : [11, 23] as const;
  const near: LocalSide = D.L.visible('+b') ? '+b' : '-b';
  const front: LocalSide = dir > 0 ? '+a' : '-a', back: LocalSide = dir > 0 ? '-a' : '+a';

  let s = D.box(x(0, L), b0, z0, L, W, bodyH, 2);
  // wheels on the visible long side
  const side = D.plane([0, near === '+b' ? b0 + W : b0, z0 + 3], [1, 0, 0], [0, 0, -1]);
  s += g(side, [8, L - 9].map(u => `<circle class="wheel" cx="${f(x(u))}" cy="2.6" r="3.2"/><circle class="detail" cx="${f(x(u))}" cy="2.6" r="1.2"/>`).join(''));
  if (cab) {
    const [c0, cl] = cab, cz = z0 + bodyH, ch = 5;
    s += D.box(x(c0, cl), b0 + 1.4, cz, cl, W - 2.8, ch, 1.2);
    const sf = D.face(x(c0, cl), b0 + 1.4, cz, cl, W - 2.8, ch, near);
    if (sf) s += g(sf.t, `<rect class="car-glass" x="0.8" y="0.7" width="${f(sf.w - 1.6)}" height="${f(ch - 1.4)}" rx="0.6"/><line class="detail" x1="${f(sf.w / 2)}" y1="0.7" x2="${f(sf.w / 2)}" y2="${f(ch - 0.7)}"/>`);
    for (const end of [front, back]) {
      const ef = D.face(x(c0, cl), b0 + 1.4, cz, cl, W - 2.8, ch, end);
      if (ef) s += g(ef.t, `<rect class="car-glass" x="0.9" y="0.7" width="${f(ef.w - 1.8)}" height="${f(ch - 1.3)}" rx="0.6"/>`);
    }
    if (kind === 'taxi') {
      // roof sign, lit at night
      s += `<g class="lamp" data-night="1">${D.boxc(x(c0 + cl / 2 - 3, 6), cross - 2.5, cz + ch, 6, 5, 2, 'taxi-sign')}</g>`;
    }
  } else {
    // van: a row of side windows high up, a windscreen at the front
    const sf = D.face(x(0, L), b0, z0, L, W, bodyH, near);
    if (sf) s += g(sf.t, Array.from({ length: 4 }, (_, i) => `<rect class="car-glass" x="${f(4 + i * (sf.w - 8) / 4)}" y="1.6" width="${f((sf.w - 8) / 4 - 1.2)}" height="4.2" rx="0.5"/>`).join(''));
    const ef = D.face(x(0, L), b0, z0, L, W, bodyH, front);
    if (ef) s += g(ef.t, `<rect class="car-glass" x="1.4" y="1.4" width="${f(ef.w - 2.8)}" height="5" rx="0.6"/>`);
  }
  // lights: two at the front, two at the back, mid-height of the body
  const lz = z0 + Math.min(4, bodyH * 0.55), fu = dir > 0 ? L + 0.1 : -0.1, bu = dir > 0 ? -0.1 : L + 0.1;
  const lamp = (u: number, w: number, cls: string, r: number) => { const p = D.P(u, w, lz); return `<circle class="${cls}" cx="${f(p[0])}" cy="${f(p[1])}" r="${r}"/>`; };
  s += `<g class="lamp" data-night="1">${lamp(fu, b0 + 3, 'bulb', 1)}${lamp(fu, b0 + W - 3, 'bulb', 1)}${lamp(bu, b0 + 3, 'bulb tail', 0.8)}${lamp(bu, b0 + W - 3, 'bulb tail', 0.8)}</g>`;
  return s;
}
