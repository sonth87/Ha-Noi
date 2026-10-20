/* Street trees at the curb in front of a house (Hà Nội streets are full of them): small, medium or
   large, on the left, right or both ends of the frontage as seen from the street. They stand past
   the house's REACH (1.9 m), on the curb side of the sidewalk, so they never meet balconies or
   signs; a large tree's crown spreads along the street and out over the road edge instead.
   Drawn as a tapered trunk with branches showing under ONE canopy (user feedback: separate round
   circles looked like balloons, a heap of clumps like round lumps). Two habits, by seed:
     dome    bàng, sấu        wide rounded crown
     tall    xà cừ, dầu       taller, narrower crown on a long trunk                          */
import type { Ctx } from '@render/parts/ctx';
import { TREE } from '@core/units';
import { f } from '@render/svg';
import { canopy, trunk } from '@render/parts/foliage';

type Size = 'small' | 'medium' | 'large';

export function streetTrees(c: Ctx): void {
  const { s } = c;
  if (s.trees === 'none') return;
  // two crowns on a narrow frontage would grow into each other: keep the left one
  const both = s.trees === 'both' && s.w - 8 >= 2 * TREE[s.treeSize].ra;
  const at = both ? [4, s.w - 4] : s.trees === 'right' ? [s.w - 4] : [4];
  at.forEach((a, i) => tree(c, a, s.d + TREE[s.treeSize].trunkB, s.treeSize, i));
}

function tree(c: Ctx, a: number, b: number, size: Size, i: number): void {
  const { D } = c, k = TREE[size], z0 = 2, r = () => c.r.next();
  const habit = r() < 0.55 ? 'dome' : 'tall';
  const [fx, fy] = D.P(a, b, z0 + 0.6), [cx, cy] = D.P(a, b, k.zc);
  // crown size on screen from the world half-extents (an ellipsoid seen from the iso direction)
  const rx = 0.85 * k.ra + 0.5 * k.rb, ry = k.rz * 0.95;
  const w0 = size === 'large' ? 2.2 : size === 'medium' ? 1.5 : 1;

  let svg = D.box(a - 2.5, b - 2.5, z0, 5, 5, 0.6);

  const tall = habit === 'tall', crx = tall ? rx * 0.78 : rx, cry = tall ? ry * 1.12 : ry * 0.88;
  const top = cy + cry * 0.35;
  svg += trunk(fx, fy, cx, top, w0, w0 * 0.45);
  // branches fanning up into the crown, visible below its edge
  const nb = size === 'small' ? 2 : 3;
  for (let j = 0; j < nb; j++) {
    const dx = (j - (nb - 1) / 2) * crx * 0.55, by = top + cry * 0.15;
    svg += `<path class="mast branch" d="M${f(cx)} ${f(top + cry * 0.25)}Q${f(cx + dx * 0.4)} ${f(by)} ${f(cx + dx)} ${f(cy - cry * 0.2)}"/>`;
  }
  // one canopy: dome trees spread wide with a flat underside, tall ones rise narrower
  svg += tall ? canopy(cx, cy - cry * 0.15, crx, cry * 1.0, cry * 0.6, r) : canopy(cx, cy - cry * 0.1, crx * 1.05, cry * 0.95, cry * 0.5, r);
  c.add(`tree-${i}`, a - k.ra, b - k.rb, z0, 2 * k.ra, 2 * k.rb, k.zc + k.rz - z0, svg);
}
