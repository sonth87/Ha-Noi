/* Compose a scene: depth-sort every item, frame the result, and translate the drawing into the
   frame. Items are drawn with kernel(0, 0); the frame's offset is applied once, here. */
import { frame } from '@iso/frame';
import type { Vec3 } from '@iso/kernel';
import { depthSort } from '@core/depth';
import type { Item } from '@core/types';
import { f } from '@render/svg';

export interface Composed {
  svg: string;
  viewBox: string;
  warnings: string[];
}

export function composeScene(items: readonly Item[], margin = 0.05, aspect = 4 / 3): Composed {
  const pts: Vec3[] = [];
  for (const { box: b } of items)
    for (const x of [b.x, b.x + b.w]) for (const y of [b.y, b.y + b.d]) for (const z of [b.z, b.z + b.h]) pts.push([x, y, z]);
  const F = frame(pts.length ? pts : [[0, 0, 0]], margin, aspect);
  const [ox, oy] = F.P(0, 0, 0);
  const { order, warnings } = depthSort(items);
  return { svg: `<g transform="translate(${f(ox)} ${f(oy)})">${order.map(i => i.svg).join('')}</g>`, viewBox: F.viewBox, warnings };
}
