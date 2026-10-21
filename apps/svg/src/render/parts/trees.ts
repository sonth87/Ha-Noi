/* Street trees at the curb in front of a house (Hà Nội streets are full of them): small, medium or
   large, on the left, right or both ends of the frontage as seen from the street. They stand past
   the house's REACH (1.9 m), on the curb side of the sidewalk, so they never meet balconies or
   signs; a large tree's crown spreads along the street and out over the road edge instead.
   Drawn as a tapered trunk forking into limbs under ONE canopy built from leaf masses on the
   limbs (foliage.ts → crown). Two habits, by seed:
     spread  bàng, xà cừ      wide, lower tier drooping
     round   sấu, nhội        a little narrower and fuller                                     */
import type { Ctx } from '@render/parts/ctx';
import type { LocalDraw } from '@render/local';
import { TREE } from '@core/units';
import { f } from '@render/svg';
import { crown, trunk } from '@render/parts/foliage';

export type Size = 'small' | 'medium' | 'large';

export function streetTrees(c: Ctx): void {
  const { s } = c;
  if (s.trees === 'none') return;
  // two crowns on a narrow frontage would grow into each other: keep the left one
  const both = s.trees === 'both' && s.w - 8 >= 2 * TREE[s.treeSize].ra;
  const at = both ? [4, s.w - 4] : s.trees === 'right' ? [s.w - 4] : [4];
  at.forEach((a, i) => tree(c, a, s.d + TREE[s.treeSize].trunkB, s.treeSize, i));
}

function tree(c: Ctx, a: number, b: number, size: Size, i: number): void {
  const k = TREE[size], z0 = 2;
  c.add(`tree-${i}`, a - k.ra, b - k.rb, z0, 2 * k.ra, 2 * k.rb, k.zc + k.rz - z0, treeArt(c.D, a, b, z0, size, () => c.r.next()));
}

/** One tree's drawing at (a, b) standing on z0 (also used by gardens and landmarks). */
export function treeArt(D: LocalDraw, a: number, b: number, z0: number, size: Size, r: () => number): string {
  const k = TREE[size];
  const habit = r() < 0.6 ? 'spread' : 'round';
  const [fx, fy] = D.P(a, b, z0 + 0.6), [cx, cy] = D.P(a, b, k.zc);
  // crown size on screen from the world half-extents
  const rx = 0.95 * k.ra + 0.5 * k.rb, ry = k.rz * 0.92;
  const w0 = size === 'large' ? 2.6 : size === 'medium' ? 1.8 : 1.2;
  const { svg: crownSvg, limbs } = crown(cx, cy, rx * (habit === 'spread' ? 1 : 0.86), ry, r, habit === 'spread' ? 1.05 : 0.9);
  // trunk up to the fork, low in the crown; limbs fan out into it (mostly hidden, they show under the canopy)
  const forkY = cy + ry * 0.55;   // in the bay under the crown, so the fork shows
  let svg = D.box(a - 2.5, b - 2.5, z0, 5, 5, 0.6) + trunk(fx, fy, cx, forkY, w0, w0 * 0.6);
  svg += `<path class="limb" d="${limbs.map(([lx, ly]) => `M${f(cx)} ${f(forkY + 0.5)}Q${f((cx + lx) / 2)} ${f(forkY - (forkY - ly) * 0.2)} ${f(lx)} ${f(ly)}`).join('')}"/>`;
  svg += crownSvg;
  // the fork stays visible: the first stretch of each limb drawn over the underside of the crown
  svg += `<path class="limb" d="${limbs.map(([lx, ly]) => { const ex = cx + (lx - cx) * 0.38, ey = forkY + (ly - forkY) * 0.38; return `M${f(cx)} ${f(forkY + 0.5)}Q${f((cx + ex) / 2)} ${f(forkY - (forkY - ey) * 0.3)} ${f(ex)} ${f(ey)}`; }).join('')}"/>`;
  return svg;
}
