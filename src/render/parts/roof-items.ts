/* Things on a roof (FR-08): horizontal inox tank on legs, upright tank, antenna, solar water heater.
   Laid out in a rectangle (local a0..a1, b0..b1 at height z), back to front, so they never overlap. */
import { slits } from '@iso/kernel';
import type { Ctx } from '@render/parts/ctx';
import { g } from '@render/svg';

export interface RoofArea { a0: number; a1: number; b0: number; b1: number; z: number }

export function roofItems(c: Ctx, area: RoofArea): void {
  const { s, D } = c, { a0, a1, b0, b1, z } = area, has = (k: string) => s.roofItems.includes(k as never);

  if (has('tank-h')) {
    const t0 = a0 + 3, t1 = Math.min(a0 + 27, a1 - 10), bc = b0 + 20;
    let svg = D.box(t0 + 3, bc - 4, z, 2, 8, 4) + D.box(t1 - 5, bc - 4, z, 2, 8, 4);
    svg += D.cylinderA(t0, t1, bc, z + 10, 6);
    c.add('tank-h', t0, bc - 6, z, t1 - t0, 12, 16, svg);
  }
  if (has('tank-v')) {
    const ta = has('tank-h') ? a1 - 14 : a0 + 3;
    c.add('tank-v', ta, b0 + 2, z, 12, 12, 18, D.box(ta, b0 + 2, z, 12, 12, 16, 6) + D.box(ta + 3, b0 + 5, z + 16, 6, 6, 2, 3));
  }
  if (has('antenna')) {
    const aa = a1 - 5, bb = b0 + 16;   // crossbars clear of the parapet; in front of an upright tank, beside a horizontal one
    const svg = `<path class="mast" d="${D.path([[aa, bb, z], [aa, bb, z + 32]])}${D.path([[aa - 4, bb, z + 26], [aa + 4, bb, z + 26]])}${D.path([[aa - 3, bb, z + 21], [aa + 3, bb, z + 21]])}"/>`;
    c.add('antenna', aa - 4, bb - 0.5, z, 8, 1, 32, svg);
  }
  if (has('solar')) {
    // panel tilted toward the street; its tank sits behind the panel's top edge
    // leave the front strip to roof pots when the roof has no room
    const front = s.roofPlants > 0 && !s.topRoom ? 10 : 4;
    const sw = Math.min(28, a1 - a0 - 6), sx = a0 + 3, bb = b1 - front, bt = bb - 14, zb = z + 4, zt = z + 18;
    if (bt - 7.6 > b0 + 27) {
      let svg = D.cylinderA(sx, sx + sw, bt - 4, zt + 2, 3.4, 1);
      svg += `<path class="mast" d="${D.path([[sx + 2, bt, z], [sx + 2, bt, zt]])}${D.path([[sx + sw - 2, bt, z], [sx + sw - 2, bt, zt]])}"/>`;
      svg += g(D.plane([sx, bt, zt], [1, 0, 0], [0, (bb - bt) / 14, -(zt - zb) / 14]), `<rect class="face solar" width="${sw}" height="14"/>${slits(2, sw - 2, 2, 1, 13)}`);
      c.add('solar', sx, bt - 7.4, z, sw, bb - bt + 7.4, zt + 5.4 - z, svg);
    }
  }
}
