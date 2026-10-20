/* Street trees at the curb in front of a house (Hà Nội streets are full of them): small, medium or
   large, on the left, right or both ends of the frontage as seen from the street. They stand past
   the house's REACH (1.9 m), on the curb side of the sidewalk, so they never meet balconies or
   signs; a large tree's crown spreads along the street and out over the road edge instead. */
import type { Ctx } from '@render/parts/ctx';
import { f } from '@render/svg';
import { TREE } from '@core/units';

export function streetTrees(c: Ctx): void {
  const { s } = c;
  if (s.trees === 'none') return;
  const at = s.trees === 'both' ? [4, s.w - 4] : s.trees === 'left' ? [4] : [s.w - 4];
  at.forEach((a, i) => tree(c, a, s.d + TREE[s.treeSize].trunkB, s.treeSize, i));
}

function tree(c: Ctx, a: number, b: number, size: 'small' | 'medium' | 'large', i: number): void {
  const { D } = c, k = TREE[size], z0 = 2, r = () => c.r.next();
  let svg = D.box(a - 2.5, b - 2.5, z0, 5, 5, 0.6) + `<path class="mast trunk" d="${D.path([[a, b, z0 + 0.6], [a, b, k.zc - k.rz * 0.4]])}"/>`;
  if (size === 'large') svg += `<path class="mast" d="${D.path([[a, b, k.zc - 6], [a - 5, b, k.zc - 2]])}${D.path([[a, b, k.zc - 4], [a + 6, b + 1, k.zc]])}"/>`;
  // crown: overlapping clumps (back ones first), each with a few leaf strokes
  const clumps = size === 'large' ? 7 : size === 'medium' ? 4 : 3;
  const pts: [number, number, number, number][] = [];
  for (let j = 0; j < clumps; j++) {
    const t = (j / clumps) * Math.PI * 2 + r() * 0.6;
    pts.push([a + Math.cos(t) * k.ra * 0.55, b + Math.sin(t) * k.rb * 0.45, k.zc + (r() - 0.3) * k.rz * 0.5, Math.min(k.ra, k.rz) * (0.55 + r() * 0.2)]);
  }
  pts.push([a, b, k.zc + k.rz * 0.25, Math.min(k.ra, k.rz) * 0.7]);
  pts.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const [ca, cb, cz, cr] of pts) {
    const [x, y] = D.P(ca, cb, cz);
    svg += `<circle class="face crown" cx="${f(x)}" cy="${f(y)}" r="${f(cr)}"/>`;
    for (let m = 0; m < 3; m++) {
      const lx = x + (r() - 0.5) * cr, ly = y + (r() - 0.6) * cr;
      svg += `<path class="detail" d="M${f(lx)} ${f(ly)}q${f(cr * 0.15)} ${f(-cr * 0.2)} ${f(cr * 0.35)} 0"/>`;
    }
  }
  c.add(`tree-${i}`, a - k.ra, b - k.rb, z0, 2 * k.ra, 2 * k.rb, k.zc + k.rz - z0, svg);
}

