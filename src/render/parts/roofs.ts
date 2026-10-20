/* Roofs (FR-03): flat with parapets, optional set-back roof room with a terrace (pots, laundry),
   or a gable metal roof. Roof items go on the roof room if there is one. */
import { slits } from '@iso/kernel';
import { sagLine } from '@render/geom';
import type { Ctx } from '@render/parts/ctx';
import { band } from '@render/parts/ctx';
import { pot } from '@render/parts/balconies';
import { backWindow, sill, win } from '@render/parts/windows';
import { endWall } from '@render/parts/walls';
import { roofItems } from '@render/parts/roof-items';
import { g } from '@render/svg';

export function roof(c: Ctx): void {
  if (c.s.roof === 'metal2') return gable(c);
  flat(c);
}

function flat(c: Ctx): void {
  const { s, D } = c, W = s.w, L = c.fy, z = c.topZ, P = s.parapet, T = 3;
  const wall = (name: string, a: number, b: number, la: number, lb: number) => { if (la > 0 && lb > 0) c.add(name, a, b, z, la, lb, P, D.box(a, b, z, la, lb, P)); };

  if (!s.topRoom) {
    wall('parapet-back', 0, 0, W, T);
    wall('parapet-l', 0, T, T, L - 2 * T);
    wall('parapet-r', W - T, T, T, L - 2 * T);
    wall('parapet-front', 0, L - T, W, T);
    for (let i = 0; i < s.roofPlants; i++) c.add(`roof-pot-${i}`, T + 3 + i * 8 - 1.6, L - 9.6, z, 3.2, 3.2, 10, pot(c, T + 3 + i * 8, L - 8, z, 2.8));
    roofItems(c, { a0: T, a1: W - T, b0: T, b1: L - T, z });
    if (s.roofShelter === 'full') {
      // leave the back strip open for the tanks and antenna
      const open = s.roofItems.some(i => i !== 'solar') ? T + 28 : T;
      shelter(c, open, z + 24, true);
    }
    return;
  }

  // roof room, set back from the facade; terrace in front
  const rb0 = Math.round(L * 0.2), rb1 = L - s.topSetback, RH = s.floorH - 2, id = c.floorId(s.floors + 2);
  let svg = D.box(0, rb0, z, W, rb1 - rb0, RH);
  const front = D.face(0, rb0, z, W, rb1 - rb0, RH, '+b'), back = D.face(0, rb0, z, W, rb1 - rb0, RH, '-b');
  if (front) svg += band(id, front.t, front.w, RH, win(() => c.v(), 6, 7, 11, RH - 7) + win(() => c.v(), W - 17, 8, 12, 11) + sill(W - 17, 19.8, 12));
  if (back) svg += band(id, back.t, back.w, RH, backWindow(() => c.v(), back.w, RH));
  const side = D.endSide();
  svg += endWall(c, D.face(0, rb0, z, W, rb1 - rb0, RH, side), side, 6, false);
  c.add('roof-room', 0, rb0, z, W, rb1 - rb0, RH, svg);

  wall('parapet-back', 0, 0, W, T);
  wall('parapet-bl', 0, T, T, rb0 - T);
  wall('parapet-br', W - T, T, T, rb0 - T);
  wall('parapet-tl', 0, rb1, T, L - T - rb1);
  wall('parapet-tr', W - T, rb1, T, L - T - rb1);
  wall('parapet-front', 0, L - T, W, T);

  // terrace: pots and a laundry line
  const spots: [number, number, number][] = [[7, 9, 3.4], [14, 17, 2.6], [8, 4, 2.4]];
  for (let i = 0; i < s.roofPlants; i++) {
    const [pa, pb, sz] = spots[i]!;
    if (rb1 + pb + 2 < L - T) c.add(`terrace-pot-${i}`, pa - 1.6, rb1 + pb - 1.6, z, 3.2, 3.2, 3 + sz * 2, pot(c, pa, rb1 + pb, z, sz));
  }
  if (s.laundry) {
    const lb = rb1 + 9, x0 = W * 0.55, x1 = W * 0.9, zt = z + 15;
    let l = `<path class="rail" d="${D.path([[x0, lb, z], [x0, lb, zt]])}${D.path([[x1, lb, z], [x1, lb, zt]])}"/>`;
    l += `<path class="rail" d="${D.path(sagLine([x0, lb, zt], [x1, lb, zt], 1.2, 8))}"/>`;
    const cloth = D.face(x0 + 2, lb, zt - 8.6, 10, 0.01, 8, '+b') ?? D.face(x0 + 2, lb, zt - 8.6, 10, 0.01, 8, '-b');
    if (cloth) l += g(cloth.t, `<rect class="face cloth" width="4" height="6"/><rect class="face cloth" x="5.5" y="0.3" width="3" height="8"/><rect class="face cloth" x="9.5" y="0.2" width="2.5" height="5"/>`);
    c.add('laundry', x0, lb - 0.5, z, x1 - x0, 1, 15, l);
  }
  roofItems(c, { a0: 0, a1: W, b0: rb0, b1: rb1, z: z + RH });
  // the terrace roof sits a little above the roof room's ceiling, on four posts (user feedback)
  if (s.roofShelter === 'terrace') shelter(c, rb1, z + RH + 3, true);
}

/** two corrugated slopes meeting at a ridge along the depth (b0 → b0 + len), eaves at zEave */
function ribbedGable(c: Ctx, b0: number, len: number, zEave: number, rise: number, cls: string): string {
  const { D } = c, half = c.s.w / 2, ribs = slits(2, half - 1, 2.4, 0, len), x = cls ? ` ${cls}` : '', h = +len.toFixed(2);
  return g(D.plane([0, b0, zEave], [1, 0, rise / half], [0, 1, 0]), `<rect class="face top${x}" width="${half}" height="${h}"/>${ribs}`) +
    g(D.plane([half, b0, zEave + rise], [1, 0, -rise / half], [0, 1, 0]), `<rect class="face${x}" width="${half}" height="${h}"/>${ribs}`);
}

/** mái tôn on a tube house: a gable (ridge along the depth, triangle toward the street) on thin
    posts standing on the parapets, its ends left open so the steel truss shows. Covers the terrace
    in front of the roof room (leaning on its wall) or the whole roof. The sheet is one item above
    everything under it; posts are separate items that stop just below the eaves, and their last
    bit up to the sheet is drawn with the sheet so nothing interpenetrates. */
function shelter(c: Ctx, b0: number, zEave: number, backPosts: boolean): void {
  const { s, D } = c, W = s.w, L = c.fy, P = s.parapet, z = c.topZ, half = W / 2;
  const rise = Math.round(W * 0.3), b1 = L + 2, run = b1 - b0, under = zEave - 0.8;
  const sheetAt = (a: number) => zEave + rise * Math.min(a, W - a) / half;
  const posts: [number, number][] = [[1, L - 2], [W - 2, L - 2]];
  if (backPosts) posts.push([1, b0], [W - 2, b0]);
  let svg = posts.map(([a, b]) => `<path class="mast" d="${D.path([[a + 0.5, b + 0.5, under], [a + 0.5, b + 0.5, sheetAt(a + 0.5)]])}"/>`).join('');
  svg += ribbedGable(c, b0, run, zEave, rise, 'metal');
  // open gable ends: rafters, tie beam, king post
  const truss = (b: number) => `<path class="rail" d="${D.path([[0, b, zEave], [half, b, zEave + rise], [W, b, zEave], [0, b, zEave]])}${D.path([[half, b, zEave], [half, b, zEave + rise]])}${D.path([[W * 0.25, b, zEave], [half, b, zEave + rise * 0.55], [W * 0.75, b, zEave]])}"/>`;
  if (D.L.visible('+b')) svg += truss(b1);
  if (D.L.visible('-b')) svg += truss(b0);
  c.add('shelter', 0, b0, under, W, run, zEave + rise - under, svg);
  posts.forEach(([a, b], i) => c.add(`shelter-post-${i}`, a, b, z + P, 1, 1, under - z - P, D.box(a, b, z + P, 1, 1, under - z - P)));
}

/** gable metal roof on a single-storey house, ridge along the depth; closed gable triangles on the visible ends */
function gable(c: Ctx): void {
  const { s, D } = c, W = s.w, L = c.fy, z = c.topZ, rise = 14, half = W / 2;
  let svg = ribbedGable(c, 0, L, z, rise, '');
  if (D.L.visible('+b')) svg += `<path class="face" d="${D.path([[0, L, z], [half, L, z + rise], [W, L, z]])}Z"/>`;
  if (D.L.visible('-b')) svg += `<path class="face" d="${D.path([[0, 0, z], [half, 0, z + rise], [W, 0, z]])}Z"/>`;
  if (s.roofItems.includes('antenna')) {
    const bb = L * 0.3;
    svg += `<path class="mast" d="${D.path([[half, bb, z + rise], [half, bb, z + rise + 26]])}${D.path([[half - 4, bb, z + rise + 21], [half + 4, bb, z + rise + 21]])}"/>`;
  }
  c.add('roof', 0, 0, z, W, L, rise + (s.roofItems.includes('antenna') ? 26 : 0), svg);
}
