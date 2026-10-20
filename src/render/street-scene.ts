/* One street, ready to compose: houses resolved and turned to the view, the row nearest the
   viewer cut down to its ground floor when cutaway is on (FR-21), plus the street furniture. */
import type { Kernel } from '@iso/kernel';
import { streetCenter, type StreetLayout } from '@core/layout';
import { cutaway, resolveSpec } from '@core/spec';
import { localFrame, rotateSpec } from '@core/view';
import type { HouseSpec, Item, ViewK } from '@core/types';
import { renderHouse } from '@render/house';
import { renderStreet } from '@render/props/street';

export interface StreetScene {
  items: Item[];
  /** houses as drawn (rotated; cut when near and cutaway is on) */
  specs: { spec: HouseSpec; near: boolean }[];
}

export function buildStreet(K: Kernel, lay: StreetLayout, k: ViewK, cut: boolean): StreetScene {
  const [cx, cy] = streetCenter();
  const specs = lay.houses.map(h => {
    let spec = rotateSpec(resolveSpec(h.input).spec, k, cx, cy);
    // "near" = its facade faces away from the viewer, so the row stands between us and the street
    const near = !localFrame(spec).visible('+b');
    if (cut && near) spec = cutaway(spec);
    return { spec, near };
  });
  return { specs, items: [...renderStreet(K, lay, k), ...specs.flatMap(x => renderHouse(K, x.spec))] };
}
