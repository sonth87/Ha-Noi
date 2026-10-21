/* One hand-drawn structure on its own, for the "Công trình" page: a corner plot turned to the view
   about its own centre, or — for the flyover — the junction cut out of the real crossroads
   (streets, flyover, junction within reach of it; no houses, no corner plots). */
import type { Kernel } from '@iso/kernel';
import { PLOTS, crossroadsLayout, type Corner, type Crossroads } from '@core/crossroads';
import type { Landmark } from '@core/landmarks';
import { localFrame, rotateBox, rotateSpec } from '@core/view';
import type { Box3, Item, ViewK } from '@core/types';
import { buildCrossroads } from '@render/crossroads-scene';
import { renderNovotel } from '@render/landmarks/novotel';
import { renderThaiBinh } from '@render/landmarks/thai-binh';
import { renderGarden } from '@render/landmarks/garden';

export interface Showcase { items: Item[]; floors: string[] }

const CORNER: Record<Exclude<Landmark['kind'], 'flyover'>, Corner> = { 'thai-binh': 'nw', novotel: 'ne', 'garden-circle': 'sw', 'garden-grove': 'se' };

let crossroads: Crossroads | null = null;

/** how far from the junction the flyover page reaches along each street (street-local, 42 m) */
export const JUNCTION_REACH = 420;

export function sharedCrossroads(): Crossroads { return (crossroads ??= crossroadsLayout(20261021)); }

/** street-local window of the cut-out junction, per street */
export function junctionWindow(cr: Crossroads): Record<'x' | 'y', [number, number]> {
  const w = (st: 'x' | 'y'): [number, number] => { const g = cr[st].lay.gap!; return [g[0] - JUNCTION_REACH, g[1] + JUNCTION_REACH]; };
  return { x: w('x'), y: w('y') };
}

export function renderLandmark(K: Kernel, lm: Landmark, k: ViewK): Showcase {
  if (lm.kind === 'flyover') return junctionCut(K, k);
  const corner = CORNER[lm.kind], [w, d] = PLOTS[corner].size;
  const L = localFrame(rotateSpec({ x: 0, y: 0, w, d, facing: 'S' }, k, w / 2, d / 2));
  // the plot's corner toward the junction, as in the crossroads (gardens draw their paths to it)
  const toward: [-1 | 1, -1 | 1] = [corner === 'nw' || corner === 'sw' ? 1 : -1, corner === 'nw' || corner === 'ne' ? 1 : -1];
  switch (lm.kind) {
    case 'thai-binh': return renderThaiBinh(K, L, w, d);
    case 'novotel': return renderNovotel(K, L, w, d);
    default: return { items: renderGarden(K, L, lm.kind === 'garden-circle' ? 'circle' : 'grove', w, d, toward, `garden-${corner}`, corner === 'sw' ? 11 : 12).items, floors: [] };
  }
}

/** street, flyover and junction items within reach of the junction */
function junctionCut(K: Kernel, k: ViewK): Showcase {
  const cr = sharedCrossroads(), J = cr.junction, R = JUNCTION_REACH;
  const win = rotateBox({ x: J.x - R, y: J.y - R, z: 0, w: J.w + 2 * R, d: J.d + 2 * R, h: 0 }, k, ...cr.center);
  // keep what has its middle inside the window, so the cut edges stay close to straight
  const hits = (b: Box3) => { const cx = b.x + b.w / 2, cy = b.y + b.d / 2; return cx > win.x && cx < win.x + win.w && cy > win.y && cy < win.y + win.d; };
  const { items } = buildCrossroads(K, cr, k, false);
  const keep = items.filter(it => /^(x|y|junction):/.test(it.id) && !it.id.includes(':lots-') && hits(it.box));
  return { items: keep, floors: [] };
}

