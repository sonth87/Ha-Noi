/* The crossroads, ready to compose (P4): both streets with their houses, the flyover, the junction,
   and the four corner plots, all turned to the view. Houses facing away from the viewer are cut
   down to their ground floor when cutaway is on (FR-21); landmarks and gardens stay whole. */
import type { Kernel } from '@iso/kernel';
import type { Crossroads, Plot } from '@core/crossroads';
import { cutaway, resolveSpec } from '@core/spec';
import { localFrame, placeIn, rotateSpec, type LocalFrame } from '@core/view';
import type { HouseSpec, Item, ViewK } from '@core/types';
import { renderHouse } from '@render/house';
import { renderStreet } from '@render/props/street';
import { renderFlyover } from '@render/props/flyover';
import { renderJunction } from '@render/props/junction';
import { renderNovotel } from '@render/landmarks/novotel';
import { renderThaiBinh } from '@render/landmarks/thai-binh';
import { renderGarden } from '@render/landmarks/garden';

export interface CrossroadsScene {
  items: Item[];
  specs: { spec: HouseSpec; near: boolean }[];
  /** floor ids of the two towers (for the night cascade) */
  towerFloors: string[];
}

export function corridorFrame(cr: Crossroads, st: 'x' | 'y', k: ViewK): LocalFrame {
  return localFrame(rotateSpec(cr[st].frame, k, ...cr.center));
}

export function plotFrame(cr: Crossroads, p: Plot, k: ViewK): LocalFrame {
  return localFrame(rotateSpec({ x: p.x, y: p.y, w: p.w, d: p.d, facing: 'S' }, k, ...cr.center));
}

export function buildCrossroads(K: Kernel, cr: Crossroads, k: ViewK, cut: boolean): CrossroadsScene {
  const items: Item[] = [], specs: CrossroadsScene['specs'] = [], towerFloors: string[] = [];
  for (const st of ['x', 'y'] as const) {
    const c = cr[st], L = corridorFrame(cr, st, k);
    items.push(...renderStreet(K, c.lay, L, st));
    for (const h of c.lay.houses) {
      let spec = rotateSpec(placeIn(c.frame, resolveSpec(h.input).spec), k, ...cr.center);
      const near = !localFrame(spec).visible('+b');
      if (cut && near) spec = cutaway(spec);
      specs.push({ spec, near });
    }
  }
  const Lx = corridorFrame(cr, 'x', k);
  items.push(...renderFlyover(K, cr.x.lay, Lx, 'x'), ...renderJunction(K, cr, Lx));
  for (const p of cr.plots) {
    const L = plotFrame(cr, p, k);
    if (p.kind === 'novotel') { const r = renderNovotel(K, L, p.w, p.d); items.push(...r.items); towerFloors.push(...r.floors); }
    else if (p.kind === 'thai-binh') { const r = renderThaiBinh(K, L, p.w, p.d); items.push(...r.items); towerFloors.push(...r.floors); }
    else items.push(...renderGarden(K, L, p.kind === 'garden-circle' ? 'circle' : 'grove', p.w, p.d, p.toward, `garden-${p.corner}`, p.corner === 'sw' ? 11 : 12).items);
  }
  items.push(...specs.flatMap(s => renderHouse(K, s.spec)));
  return { items, specs, towerFloors };
}
