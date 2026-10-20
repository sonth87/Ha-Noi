/* Exposed side walls (tường hồi): stains, a drain pipe, hung AC units. FR-11. */
import { slits } from '@iso/kernel';
import type { Ctx } from '@render/parts/ctx';
import type { Face } from '@render/local';
import { f, g } from '@render/svg';
import type { LocalSide } from '@core/view';

/** stains (+ a drain pipe near the street edge) on a visible end face */
export function endWall(c: Ctx, face: Face | null, side: LocalSide, count: number, pipe: boolean): string {
  if (!face) return '';
  let s = '';
  for (let i = 0; i < count; i++) {
    const u = c.r.next() * (face.w - 4) + 2, v0 = c.r.next() * Math.max(1, face.h - 14) + 4;
    s += `<path class="stain" d="M${f(u)} ${f(v0)}v${f(4 + c.r.next() * 9)}"/>`;
  }
  // from outside the +a end the street edge is on the left; from outside the −a end, on the right
  if (pipe) s += `<path class="pipe" d="M${f(side === '+a' ? 3 : face.w - 3)} 0V${f(face.h)}"/>`;
  return g(face.t, s);
}

/** AC units hung on the exposed side wall (spec.sideEnd), above the ground floor and the neighbour (sideClear) */
export function sideACs(c: Ctx): void {
  const { s, D } = c;
  if (s.floors === 0 || s.sideAC === 0) return;
  const side = s.sideEnd, a0 = side === '+a' ? s.w : -6;
  const spots: [number, number][] = [[0.4, 1.5], [0.63, 2.3], [0.25, 3.1]];
  for (let i = 0; i < s.sideAC; i++) {
    const [fb, ff] = spots[i]!;
    const b = c.fy * fb, z = s.groundH + s.floorH * Math.min(ff, s.floors) - 12;
    if (z < s.groundH + 2 || z < s.sideClear + 1) continue;
    if (s.signs.some(x => x.type === 'billboard') && z + 7 > c.topZ - 31) continue;   // leave the billboard's wall clear
    let svg = D.box(a0, b, z, 6, 9, 7);
    const fan = D.face(a0, b, z, 6, 9, 7, '+b'), grille = D.face(a0, b, z, 6, 9, 7, side);
    if (fan) svg += g(fan.t, `<circle class="detail" cx="3" cy="3.6" r="2.3"/>`);
    if (grille) svg += g(grille.t, slits(1, 8, 1.2, 1, 6));
    c.add(`side-ac-${i}`, a0, b, z, 6, 9, 7, svg);
  }
}
