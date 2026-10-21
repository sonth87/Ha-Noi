/* Cars for the street (user request): sedan, hatchback, taxi (lit roof sign) and van, driving along
   local a. Body and cabin are boxes; wheels and windows sit on whichever long side faces the viewer,
   the windscreen or rear window on the visible end; head- and tail-lights light at night.
   Length along a from the tail, centred on `cross` across the lane; `dir` turns it around. */
import type { LocalDraw, LV } from '@render/local';
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
  // cabin (glasshouse): long, a little behind the middle, raked screens front and back — a short
  // cabin at one end read as a pickup driving backwards (user feedback). [base start, base length]
  // from the tail; the hatchback's roof runs almost to its tail.
  const cab = kind === 'van' ? null : kind === 'hatch' ? [4, 24] as const : [9, 22] as const;
  const near: LocalSide = D.L.visible('+b') ? '+b' : '-b';
  const front: LocalSide = dir > 0 ? '+a' : '-a';

  let s = D.box(x(0, L), b0, z0, L, W, bodyH, 2);
  // wheels on the visible long side
  const side = D.plane([0, near === '+b' ? b0 + W : b0, z0 + 3], [1, 0, 0], [0, 0, -1]);
  s += g(side, [8, L - 9].map(u => `<circle class="wheel" cx="${f(x(u))}" cy="2.6" r="3.2"/><circle class="detail" cx="${f(x(u))}" cy="2.6" r="1.2"/>`).join(''));
  if (cab) {
    const [c0, cl] = cab, cz = z0 + bodyH, ch = 5.4;
    // roof pulled in: 5 at the windscreen, 3 at the rear (1 on a hatch)
    const r0 = c0 + (kind === 'hatch' ? 1 : 3), r1 = c0 + cl - 5;
    s += cabin(D, x(c0), x(c0 + cl), x(r0), x(r1), b0 + 1.4, b0 + W - 1.4, cz, cz + ch, near);
    if (kind === 'taxi') {
      // roof sign, lit at night
      const m = (r0 + r1) / 2;
      s += `<g class="lamp" data-night="1">${D.boxc(x(m - 3, 6), cross - 2.5, cz + ch, 6, 5, 2, 'taxi-sign')}</g>`;
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

/** The glasshouse: a prism whose base runs a0 → a1 and roof ra0 → ra1 (any order), between b0 and
    b1. Only the faces turned to the viewer are drawn, each with its glass. */
function cabin(D: LocalDraw, a0: number, a1: number, ra0: number, ra1: number, b0: number, b1: number, z0: number, z1: number, near: LocalSide): string {
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1), rlo = Math.min(ra0, ra1), rhi = Math.max(ra0, ra1);
  const bn = near === '+b' ? b1 : b0, bf = near === '+b' ? b0 : b1;
  const poly = (pts: LV[], cls: string) => `<path class="${cls}" d="${D.path(pts)}Z"/>`;
  const lerp = (p: LV, q: LV, t: number): LV => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  // inset glass on a quad p0 p1 p2 p3 (bottom edge p0 → p1)
  const glass = (q: LV[], ib: number, it: number) => {
    const [p0, p1, p2, p3] = q as [LV, LV, LV, LV];
    const b0_ = lerp(p0, p3, ib), b1_ = lerp(p1, p2, ib), t1 = lerp(p1, p2, 1 - it), t0 = lerp(p0, p3, 1 - it);
    const s = 0.08;
    return poly([lerp(b0_, b1_, s), lerp(b0_, b1_, 1 - s), lerp(t0, t1, 1 - s), lerp(t0, t1, s)], 'car-glass');
  };
  // is a face with this local outward normal turned toward the iso camera (+x, +y, +z)?
  const sees = (na: number, nb: number, nz: number) => { const v = D.L.vec(na, nb, nz); return v[0] + v[1] + v[2] > 1e-6; };
  let s = '';
  const faces: { n: [number, number, number]; q: LV[]; g?: [number, number] }[] = [
    // ends: low end (−a) and high end (+a), sloped
    { n: [-(z1 - z0), 0, rlo - lo], q: [[lo, bn, z0], [lo, bf, z0], [rlo, bf, z1], [rlo, bn, z1]], g: [0.12, 0.1] },
    { n: [z1 - z0, 0, hi - rhi], q: [[hi, bf, z0], [hi, bn, z0], [rhi, bn, z1], [rhi, bf, z1]], g: [0.12, 0.1] },
    // long sides
    { n: [0, 1, 0], q: [[lo, b1, z0], [hi, b1, z0], [rhi, b1, z1], [rlo, b1, z1]] },
    { n: [0, -1, 0], q: [[hi, b0, z0], [lo, b0, z0], [rlo, b0, z1], [rhi, b0, z1]] },
  ];
  for (const fc of faces) {
    if (!sees(...fc.n)) continue;
    s += poly(fc.q, 'face');
    if (fc.g) s += glass(fc.q, fc.g[0], fc.g[1]);
    else {
      // side windows: two panes split by the B-pillar, following the raked ends
      const b = fc.n[1] > 0 ? b1 : b0, pil = (rlo + rhi) / 2;
      const zt = (h: number) => z0 + (z1 - z0) * h, aL = (h: number) => lo + (rlo - lo) * h + 0.8, aR = (h: number) => hi - (hi - rhi) * h - 0.8;
      const pane = (u0: (h: number) => number, u1: (h: number) => number) =>
        poly([[u0(0.16), b, zt(0.16)], [u1(0.16), b, zt(0.16)], [u1(0.84), b, zt(0.84)], [u0(0.84), b, zt(0.84)]], 'car-glass');
      s += pane(aL, () => pil - 0.5) + pane(() => pil + 0.5, aR);
    }
  }
  s += poly([[rlo, b0, z1], [rhi, b0, z1], [rhi, b1, z1], [rlo, b1, z1]], 'face top');
  return s;
}
