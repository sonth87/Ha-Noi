/* Things on a roof (FR-08): horizontal inox tank on legs, upright tank, solar water heater, antenna,
   outdoor AC unit, flag pole. A small allocator places them in the roof rectangle (local a0..a1,
   b0..b1 at height z): each tries its usual spot first, then scans for a free one, and is left out
   if none fits. Under a full metal shelter (cover) only things lower than its eaves may stand. */
import { slits } from '@iso/kernel';
import type { Ctx } from '@render/parts/ctx';
import { g } from '@render/svg';

export interface RoofArea { a0: number; a1: number; b0: number; b1: number; z: number }
/** part of the area under a shelter: b ≥ from, with at most maxH of headroom */
export interface Cover { from: number; maxH: number }

export interface Rect { a: number; b: number; la: number; lb: number }

/** touching is fine (the depth sort handles it); sharing area is not */
const overlaps = (p: Rect, q: Rect) => p.a < q.a + q.la && q.a < p.a + p.la && p.b < q.b + q.lb && q.b < p.b + p.lb;

function allocator(area: RoofArea, cover: Cover | null, reserved: Rect[]) {
  const taken: Rect[] = [...reserved];
  const fits = (r: Rect, h: number) =>
    r.a >= area.a0 && r.a + r.la <= area.a1 && r.b >= area.b0 && r.b + r.lb <= area.b1 &&
    !taken.some(t => overlaps(t, r)) && (!cover || r.b + r.lb <= cover.from || h <= cover.maxH);
  /** place a la × lb footprint of height h: preferred spot, else scan back → front (or front → back) */
  return (la: number, lb: number, h: number, prefer: [number, number], fromFront = false, fromRight = false): Rect | null => {
    const want = { a: prefer[0], b: prefer[1], la, lb };
    if (fits(want, h)) { taken.push(want); return want; }
    const bs: number[] = [], as: number[] = [];
    for (let b = area.b0; b + lb <= area.b1; b += 2) bs.push(b);
    for (let a = area.a0; a + la <= area.a1; a += 2) as.push(a);
    if (fromFront) bs.reverse();
    if (fromRight) as.reverse();
    for (const b of bs) for (const a of as) {
      const r = { a, b, la, lb };
      if (fits(r, h)) { taken.push(r); return r; }
    }
    return null;
  };
}

export function roofItems(c: Ctx, area: RoofArea, cover: Cover | null = null, reserved: Rect[] = []): void {
  const { s, D } = c, { a0, a1, b0, b1, z } = area, has = (k: string) => s.roofItems.includes(k as never);
  const place = allocator(area, cover, reserved);

  if (has('tank-h')) {
    const len = Math.min(24, a1 - a0 - 13);
    const r = len >= 12 ? place(len, 12, 16, [a0 + 3, b0 + 14]) : null;
    if (r) {
      const t0 = r.a, t1 = r.a + r.la, bc = r.b + 6;
      let svg = D.box(t0 + 3, bc - 4, z, 2, 8, 4) + D.box(t1 - 5, bc - 4, z, 2, 8, 4);
      svg += D.cylinderA(t0, t1, bc, z + 10, 6);
      c.add('tank-h', t0, r.b, z, r.la, 12, 16, svg);
    }
  }
  if (has('tank-v')) {
    const r = place(12, 12, 18, [has('tank-h') ? a1 - 14 : a0 + 3, b0 + 2], false, true);
    if (r) c.add('tank-v', r.a, r.b, z, 12, 12, 18, D.box(r.a, r.b, z, 12, 12, 16, 6) + D.box(r.a + 3, r.b + 3, z + 16, 6, 6, 2, 3));
  }
  if (has('antenna')) {
    const r = place(8, 1, 32, [a1 - 9, b0 + 15.5], false, true);
    if (r) {
      const aa = r.a + 4, bb = r.b + 0.5;
      const svg = `<path class="mast" d="${D.path([[aa, bb, z], [aa, bb, z + 32]])}${D.path([[aa - 4, bb, z + 26], [aa + 4, bb, z + 26]])}${D.path([[aa - 3, bb, z + 21], [aa + 3, bb, z + 21]])}"/>`;
      c.add('antenna', r.a, r.b, z, 8, 1, 32, svg);
    }
  }
  if (has('solar')) {
    // panel tilted toward the street; its tank sits behind the panel's top edge
    const front = s.roofPlants > 0 && !s.topRoom ? 10 : 4;
    const sw = Math.min(28, a1 - a0 - 6), depth = 21.4;
    const r = sw >= 14 ? place(sw, depth, 24, [a0 + 3, b1 - front - depth], true) : null;
    if (r) {
      const sx = r.a, bt = r.b + 7.4, bb = bt + 14, zb = z + 4, zt = z + 18;
      let svg = D.cylinderA(sx, sx + sw, bt - 4, zt + 2, 3.4, 1);
      svg += `<path class="mast" d="${D.path([[sx + 2, bt, z], [sx + 2, bt, zt]])}${D.path([[sx + sw - 2, bt, z], [sx + sw - 2, bt, zt]])}"/>`;
      svg += g(D.plane([sx, bt, zt], [1, 0, 0], [0, (bb - bt) / 14, -(zt - zb) / 14]), `<rect class="face solar" width="${sw}" height="14"/>${slits(2, sw - 2, 2, 1, 13)}`);
      c.add('solar', sx, r.b, z, sw, depth, zt + 5.4 - z, svg);
    }
  }
  if (has('ac')) {
    const r = place(10, 6, 7, [a1 - 12, Math.round((b0 + b1) / 2)], true, true);
    if (r) {
      let svg = D.box(r.a, r.b, z, 10, 6, 7);
      const face = D.face(r.a, r.b, z, 10, 6, 7, '+b') ?? D.face(r.a, r.b, z, 10, 6, 7, '-b');
      if (face) svg += g(face.t, `<circle class="detail" cx="3.6" cy="3.6" r="2.6"/>${slits(7.2, 9.2, 1, 1, 6)}`);
      c.add('roof-ac', r.a, r.b, z, 10, 6, 7, svg);
    }
  }
  if (has('flag')) {
    // cột cờ: a pole near the front with a flag along the street
    const r = place(9, 1, 30, [a1 - 10, b1 - 4], true, true);
    if (r) {
      const pa = r.a + 0.5, pb = r.b + 0.5;
      const svg = `<path class="mast" d="${D.path([[pa, pb, z], [pa, pb, z + 30]])}"/>` +
        g(D.plane([pa, pb, z + 29.5], [1, 0, 0], [0, 0, -1]), `<path class="face flag" d="M0 0Q4.2 -0.8 8.4 0.4V5.6Q4.2 4.6 0 5.4Z"/><path class="detail" d="M4.2 1.6l0.5 1.2 1.2 0 -1 0.8 0.4 1.2 -1.1 -0.7 -1.1 0.7 0.4 -1.2 -1 -0.8 1.2 0Z"/>`);
      c.add('flag', r.a, r.b, z, 9, 1, 30, svg);
    }
  }
}

