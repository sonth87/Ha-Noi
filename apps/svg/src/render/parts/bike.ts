/* A scooter seen side-on (wheels, body with rear hump, floorboard and front shield, seat,
   handlebar), optionally with its rider. Drawn along local a (riding down the street) or along
   local b (parked nose-in on the sidewalk). Length 18 from the tail; `dir` turns it around. */
import type { LocalDraw, LV } from '@render/local';
import { f, g } from '@render/svg';

export const SCOOTER_LEN = 18;

export function scooter(D: LocalDraw, along: 'a' | 'b', u0: number, cross: number, dir: 1 | -1, z0: number, rider: boolean): string {
  const L = SCOOTER_LEN, x = (u: number) => (dir > 0 ? u : L - u);
  const pt = (u: number, w: number, z: number): LV => (along === 'a' ? [u0 + u, cross + w, z0 + z] : [cross + w, u0 + u, z0 + z]);
  const box = (u: number, w: number, z: number, lu: number, lw: number, h: number, r: number) =>
    along === 'a' ? D.box(u0 + u, cross + w, z0 + z, lu, lw, h, r) : D.box(cross + w, u0 + u, z0 + z, lw, lu, h, r);
  const side = D.plane(pt(0, 0, 8), along === 'a' ? [1, 0, 0] : [0, 1, 0], [0, 0, -1]);   // v down from z = 8
  const wheel = (u: number) => `<circle class="wheel" cx="${f(x(u))}" cy="5" r="3"/><circle class="detail" cx="${f(x(u))}" cy="5" r="1"/>`;
  const prof: [number, number][] = [[1.5, 4.6], [2.5, 1.2], [7.5, 0.4], [9, 3.2], [12, 3.6], [14.5, -1.6], [15.6, -1.4], [16.2, 3.8], [13.2, 5.6], [4, 5.6]];
  const body = `<path class="face" d="M${prof.map(([u, z]) => `${f(x(u))} ${f(z)}`).join('L')}Z"/>`;
  const hl = D.P(...pt(x(16.4), 0, 7.4)), tl = D.P(...pt(x(1.2), 0, 6.8));
  let s = g(side, wheel(3.4) + wheel(15) + body) +
    box(Math.min(x(4), x(9.5)), -1.6, 8.2, 5.5, 3.2, 1.4, 0.8) +                                   // seat
    `<path class="mast" d="${D.path([pt(x(9.6), 0, 13.8), pt(x(14.4), 0, 10.2)])}${D.path([pt(x(14.8), -2.6, 10.2), pt(x(14.8), 2.6, 10.2)])}"/>`;
  if (rider) {
    const head = D.P(...pt(x(7.6), 0, 18.2));
    s += box(Math.min(x(5.8), x(9.6)), -1.5, 9.6, 3.8, 3, 6.4, 1.2) + `<circle class="face" cx="${f(head[0])}" cy="${f(head[1])}" r="1.9"/>`;
  }
  s += `<g class="lamp" data-night="1"><circle class="bulb" cx="${f(hl[0])}" cy="${f(hl[1])}" r="1"/><circle class="bulb tail" cx="${f(tl[0])}" cy="${f(tl[1])}" r="0.7"/></g>`;
  return s;
}
