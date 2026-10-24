/* Quality settings (ADR-032, ADR-036, ADR-037).
   Four levels, plus "custom" as soon as one option is changed. Remembered per viewer in
   localStorage (a convenience: everything works without it). */

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export type TreeLook = 'off' | 'simple' | 'full';

export interface QualityOptions {
  /** share of the full traffic, 0–1 */
  traffic: number;
  /** power poles and their wires */
  wires: boolean;
  /** street trees: none, plain crowns, or full trees with outlines */
  trees: TreeLook;
  /** buildings, furniture and traffic only this far from the middle of the view (m); 0 = all */
  viewDistance: number;
  /** step down a level by itself when the frame rate stays low */
  autoQuality: boolean;
  /** most detail a building gets: 0 massing · 1 windows · 2 the house · 3 every small thing */
  houseDetail: 0 | 1 | 2 | 3;
  /** lower the detail when zoomed out (where it could not be seen anyway) */
  autoDetail: boolean;
  /** cap on device pixels per CSS pixel */
  pixelRatio: number;
  /** multisampled edges */
  msaa: boolean;
  /** glow on lit things (dark theme only) */
  bloom: boolean;
  /** the three line tiers: silhouettes, folds/corners, window outlines */
  silhouette: boolean;
  creases: boolean;
  details: boolean;
  windows: boolean;
}

export interface Quality extends QualityOptions { level: QualityLevel | 'custom' }

export const LEVELS: Record<QualityLevel, QualityOptions> = {
  low: { traffic: 0.15, wires: false, trees: 'simple', viewDistance: 400, autoQuality: true, houseDetail: 1, autoDetail: true, pixelRatio: 1, msaa: false, bloom: false, silhouette: true, creases: true, details: false, windows: true },
  medium: { traffic: 0.3, wires: true, trees: 'simple', viewDistance: 700, autoQuality: true, houseDetail: 2, autoDetail: true, pixelRatio: 1.5, msaa: false, bloom: false, silhouette: true, creases: true, details: false, windows: true },
  high: { traffic: 0.3, wires: true, trees: 'full', viewDistance: 1200, autoQuality: true, houseDetail: 3, autoDetail: true, pixelRatio: 2, msaa: true, bloom: true, silhouette: true, creases: true, details: true, windows: true },
  ultra: { traffic: 0.6, wires: true, trees: 'full', viewDistance: 0, autoQuality: false, houseDetail: 3, autoDetail: false, pixelRatio: 3, msaa: true, bloom: true, silhouette: true, creases: true, details: true, windows: true },
};

export const LEVEL_NAMES: Record<QualityLevel | 'custom', string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', ultra: 'Rất cao', custom: 'Tùy chỉnh' };

export const quality = (level: QualityLevel): Quality => ({ level, ...LEVELS[level] });

/** Detail for how big a metre is on screen (an orthographic view has no "far": things only get
    small by zooming out). A balcony rail or a pot needs about 9 px a metre to read; the house itself
    (balconies, roofs, signs) about 4.5; below that a building is its block and windows (ADR-044). */
export function detailFor(pxPerMetre: number, q: Pick<QualityOptions, 'houseDetail' | 'autoDetail'>): 0 | 1 | 2 | 3 {
  if (!q.autoDetail) return q.houseDetail;
  const want = pxPerMetre >= 9 ? 3 : pxPerMetre >= 4.5 ? 2 : pxPerMetre >= 1.8 ? 1 : 0;
  return Math.min(q.houseDetail, want) as 0 | 1 | 2 | 3;
}

/** How far out the view is, 0 (close: everything drawn) to 1 (far): from 8 px a metre down to 2.5.
    With "lower detail when zoomed out" on, lines fade and small things go step by step (ADR-044, ADR-049). */
export const FAR = {
  near: 8,
  far: 2.5,
  vehicleLines: 5.5,
  simpleTrees: 4.5,
  bikes: 3,
  furniture: 2.5,
  details: 2.5,
  vehicles: 1.8,
  creases: 1.8,
  silhouette: 1.5,
  trees: 1.4,
  streetLines: 0.10,
} as const;

export function farness(pxPerMetre: number, q: Pick<QualityOptions, 'autoDetail'>): number {
  if (!q.autoDetail) return 0;
  return Math.max(0, Math.min(1, (FAR.near - pxPerMetre) / (FAR.near - FAR.far)));
}

/** the next level down, for stepping down by itself (none below low) */
export function lowerLevel(q: Quality): Quality | null {
  const order: QualityLevel[] = ['low', 'medium', 'high', 'ultra'];
  const i = q.level === 'custom' ? order.findIndex(l => LEVELS[l].houseDetail >= q.houseDetail) : order.indexOf(q.level);
  return i > 0 ? { ...quality(order[i - 1]!), autoQuality: true } : null;
}

/** the options changed by hand: the level becomes "custom" unless they match a level exactly */
export function withOption(q: Quality, patch: Partial<QualityOptions>): Quality {
  const { level: _level, ...opts } = { ...q, ...patch };
  const keys = Object.keys(LEVELS.low) as (keyof QualityOptions)[];
  const same = (Object.keys(LEVELS) as QualityLevel[]).find(l => keys.every(k => LEVELS[l][k] === opts[k]));
  return { ...opts, level: same ?? 'custom' };
}

import { QUALITY_STORAGE_VERSION, STORAGE_KEYS } from './constants';

export function isMobileDevice(): boolean {
  try {
    return typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 768px)').matches);
  } catch {
    return false;
  }
}

export function loadQuality(): Quality {
  const def: QualityLevel = isMobileDevice() ? 'medium' : 'high';
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUALITY);
    if (raw) {
      const { v, ...q } = JSON.parse(raw) as Partial<Quality> & { v?: number };
      if (v === QUALITY_STORAGE_VERSION) return { ...quality(def), ...q };
    }
  } catch { /* private mode, blocked storage, bad JSON: use the default */ }
  return quality(def);
}

export function saveQuality(q: Quality) {
  try { localStorage.setItem(STORAGE_KEYS.QUALITY, JSON.stringify({ ...q, v: QUALITY_STORAGE_VERSION })); } catch { /* not remembered, still applied */ }
}
