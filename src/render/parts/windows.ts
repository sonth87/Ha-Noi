/* Windows and doors on a floor band (face-local: v grows down from the floor top). FR-05. */
import { slits } from '@iso/kernel';
import type { WindowKind } from '@core/types';
import { f } from '@render/svg';

type Variant = () => string;

export const win = (v: Variant, x: number, y: number, w: number, h: number) =>
  `<rect class="win${v()}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;
export const sill = (x: number, y: number, w: number) =>
  `<line class="detail" x1="${f(x - 1)}" y1="${f(y)}" x2="${f(x + w + 1)}" y2="${f(y)}"/>`;

const tall = (v: Variant, x: number, y: number, w: number, h: number) =>
  win(v, x, y, w, h) + `<line class="mull" x1="${f(x + w / 2)}" y1="${f(y)}" x2="${f(x + w / 2)}" y2="${f(y + h)}"/>` + sill(x, y + h + 0.8, w);
const louver = (v: Variant, x: number, y: number, w: number, h: number) =>
  win(v, x, y, w, h) + `<g class="mull">${slits(y + 1.6, y + h - 1, 1.6, x + 0.6, x + w - 0.6, false, 'mull')}</g>` + sill(x, y + h + 0.8, w);
const glassDoors = (v: Variant, x: number, y: number, w: number, h: number) =>
  win(v, x, y, w, h) + `<path class="mull" d="M${f(x + w / 2)} ${f(y)}V${f(y + h)}M${f(x)} ${f(y + h * 0.3)}H${f(x + w)}"/>`;

/** the windows of one upper floor, scaled to the face width W and floor height H */
export function windowSet(v: Variant, kind: WindowKind, W: number, H: number): string {
  switch (kind) {
    case 'tall': {
      const w = Math.min(18, Math.max(10, W * 0.45));
      return tall(v, (W - w) / 2, 6, w, H - 14);
    }
    case 'louver': {
      if (W < 30) { const w = W * 0.45; return louver(v, (W - w) / 2, 5, w, H - 12); }
      const w = W * 0.3;
      return louver(v, W * 0.125, 5, w, H - 12) + louver(v, W * 0.575, 5, w, H - 12);
    }
    case 'glass-doors': {
      const w = W * 0.55;
      return glassDoors(v, (W - w) / 2, 3, w, H - 4.5);
    }
    case 'pair': {
      const w = W * 0.22;
      return win(v, W * 0.22, 6, w, H - 14) + win(v, W * 0.56, 6, w, H - 14);
    }
    case 'wide': {
      const w = W * 0.7, x = (W - w) / 2;
      return win(v, x, 8, w, 12) + `<path class="mull" d="M${f(x + w / 3)} 8V20M${f(x + 2 * w / 3)} 8V20"/>` + sill(x, 20.8, w);
    }
  }
}

/** the small window each floor shows at the back */
export const backWindow = (v: Variant, W: number, H: number) => win(v, W * 0.58, Math.min(8, H * 0.25), 6, Math.min(9, H * 0.4));
