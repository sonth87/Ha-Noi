/* Windows and doors on a floor band (face-local: v grows down from the floor top). FR-05. */
import { slits } from '@iso/kernel';
import type { WindowKind } from '@core/types';
import { f } from '@render/svg';

type Variant = () => string;

const paneVar = (seed: number): string => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  const r = s - Math.floor(s);
  return r < 0.16 ? ' off' : r < 0.38 ? ' dim' : r < 0.56 ? ' hi' : '';
};

const noDead = (cls: string) => (cls === ' off' ? ' dim' : cls);

export const win = (v: Variant, x: number, y: number, w: number, h: number) =>
  `<rect class="win${v()}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;

const twoPanes = (v: Variant, x: number, y: number, w: number, h: number) => {
  const hw = w / 2, v0 = v(), raw1 = paneVar(x * 13 + y * 29 + w * 7);
  const v1 = v0 === ' off' && raw1 === ' off' ? '' : raw1;
  return `<rect class="win${v0}" x="${f(x)}" y="${f(y)}" width="${f(hw)}" height="${f(h)}"/>` +
    `<rect class="win${v1}" x="${f(x + hw)}" y="${f(y)}" width="${f(hw)}" height="${f(h)}"/>`;
};

export const sill = (x: number, y: number, w: number) =>
  `<line class="detail" x1="${f(x - 1)}" y1="${f(y)}" x2="${f(x + w + 1)}" y2="${f(y)}"/>`;

const tall = (v: Variant, x: number, y: number, w: number, h: number) =>
  twoPanes(v, x, y, w, h) + `<line class="mull" x1="${f(x + w / 2)}" y1="${f(y)}" x2="${f(x + w / 2)}" y2="${f(y + h)}"/>` + sill(x, y + h + 0.8, w);
const louver = (v: Variant, x: number, y: number, w: number, h: number) =>
  win(v, x, y, w, h) + `<g class="mull">${slits(y + 1.6, y + h - 1, 1.6, x + 0.6, x + w - 0.6, false, 'mull')}</g>` + sill(x, y + h + 0.8, w);
const glassDoors = (v: Variant, x: number, y: number, w: number, h: number) =>
  twoPanes(v, x, y, w, h) + `<path class="mull" d="M${f(x + w / 2)} ${f(y)}V${f(y + h)}M${f(x)} ${f(y + h * 0.3)}H${f(x + w)}"/>`;

/** the windows of one upper floor, scaled to the face width W and floor height H */
export function windowSet(v: Variant, kind: WindowKind, W: number, H: number): string {
  switch (kind) {
    case 'tall': {
      const w = Math.min(18, Math.max(10, W * 0.45));
      return tall(v, (W - w) / 2, 6, w, H - 14);
    }
    case 'louver': {
      if (W < 30) { const w = W * 0.45; return louver(() => noDead(v()), (W - w) / 2, 5, w, H - 12); }
      const w = W * 0.3, v0 = v(), raw1 = v(), v1 = v0 === ' off' && raw1 === ' off' ? '' : raw1;
      return louver(() => v0, W * 0.125, 5, w, H - 12) + louver(() => v1, W * 0.575, 5, w, H - 12);
    }
    case 'glass-doors': {
      const w = W * 0.55;
      return glassDoors(v, (W - w) / 2, 3, w, H - 4.5);
    }
    case 'pair': {
      const w = W * 0.22, v0 = v(), raw1 = v(), v1 = v0 === ' off' && raw1 === ' off' ? '' : raw1;
      return win(() => v0, W * 0.22, 6, w, H - 14) + win(() => v1, W * 0.56, 6, w, H - 14);
    }
    case 'wide': {
      const w = W * 0.7, x = (W - w) / 2, pw = w / 3;
      const vs: string[] = [v(), paneVar(x * 17 + W), paneVar(x * 31 + H)];
      if (!vs.some(c => c !== ' off')) vs[1] = '';
      return vs.map((c, i) => `<rect class="win${c}" x="${f(x + i * pw)}" y="8" width="${f(pw)}" height="12"/>`).join('') +
        `<path class="mull" d="M${f(x + pw)} 8V20M${f(x + 2 * pw)} 8V20"/>` + sill(x, 20.8, w);
    }
    case 'arch': {
      // cửa vòm: a tall opening with a round head
      const w = Math.min(16, Math.max(10, W * 0.4)), x = (W - w) / 2, r = w / 2, top = 4, bot = H - 6;
      return `<path class="win${noDead(v())}" d="M${f(x)} ${f(bot)}V${f(top + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(top + r)}V${f(bot)}Z"/>` +
        `<path class="mull" d="M${f(x + r)} ${f(top)}V${f(bot)}M${f(x)} ${f(top + r)}H${f(x + w)}"/>` + sill(x, bot + 0.8, w);
    }
    case 'french': {
      // cửa Pháp: tall glazed doors with louvred shutters folded open either side
      const w = Math.min(16, W * 0.38), x = (W - w) / 2, top = 3, h = H - 5, sw = w / 2;
      const shutter = (sx: number) => `<rect class="face" x="${f(sx)}" y="${top}" width="${f(sw)}" height="${f(h)}"/>${slits(top + 1.6, top + h - 1, 1.4, sx + 0.5, sx + sw - 0.5, false)}`;
      return twoPanes(v, x, top, w, h) + `<path class="mull" d="M${f(x + w / 2)} ${top}V${f(top + h)}M${f(x)} ${f(top + h * 0.28)}H${f(x + w)}"/>` +
        shutter(x - sw - 0.4) + shutter(x + w + 0.4);
    }
    case 'glass': {
      // a wall of glass across the bay, split into individual panes with off/dim/hi variation
      const x = 2, w = W - 4, n = Math.max(2, Math.round(w / 8)), pw = w / n;
      const v0 = v();
      const vs: string[] = Array.from({ length: n }, (_, i) => (i === 0 ? v0 : paneVar(x * 11 + W * 7 + i * 23)));
      if (!vs.some(c => c !== ' off')) vs[0] = '';
      return vs.map((c, i) => `<rect class="win${c}" x="${f(x + i * pw)}" y="3" width="${f(pw)}" height="${f(H - 6)}"/>`).join('') +
        `<path class="mull" d="${Array.from({ length: n - 1 }, (_, i) => `M${f(x + (i + 1) * pw)} 3V${f(H - 3)}`).join('')}M${f(x)} ${f(H * 0.35)}H${f(x + w)}"/>`;
    }
  }
}

/** the small window each floor shows at the back */
export const backWindow = (v: Variant, W: number, H: number) => win(() => noDead(v()), W * 0.58, Math.min(8, H * 0.25), 6, Math.min(9, H * 0.4));

