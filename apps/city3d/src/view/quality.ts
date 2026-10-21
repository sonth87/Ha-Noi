/* Quality settings (ADR-032; M3 has the first few, M4–M5 add detail levels, traffic density,
   wires, trees, view distance). Four levels, plus "custom" as soon as one option is changed.
   Remembered per viewer in localStorage (a convenience: everything works without it). */

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityOptions {
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
  low: { pixelRatio: 1, msaa: false, bloom: false, silhouette: true, creases: true, details: false, windows: true },
  medium: { pixelRatio: 1.5, msaa: true, bloom: true, silhouette: true, creases: true, details: false, windows: true },
  high: { pixelRatio: 2, msaa: true, bloom: true, silhouette: true, creases: true, details: true, windows: true },
  ultra: { pixelRatio: 3, msaa: true, bloom: true, silhouette: true, creases: true, details: true, windows: true },
};

export const LEVEL_NAMES: Record<QualityLevel | 'custom', string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', ultra: 'Rất cao', custom: 'Tùy chỉnh' };

export const quality = (level: QualityLevel): Quality => ({ level, ...LEVELS[level] });

/** the options changed by hand: the level becomes "custom" unless they match a level exactly */
export function withOption(q: Quality, patch: Partial<QualityOptions>): Quality {
  const opts: QualityOptions = { ...q, ...patch };
  const same = (Object.keys(LEVELS) as QualityLevel[]).find(l => (Object.keys(opts) as (keyof QualityOptions)[]).every(k => LEVELS[l][k] === opts[k]));
  return { ...opts, level: same ?? 'custom' };
}

const KEY = 'city3d-quality';

export function loadQuality(): Quality {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const q = JSON.parse(raw) as Partial<Quality>;
      return { ...quality('high'), ...q };
    }
  } catch { /* private mode, blocked storage, bad JSON: use the default */ }
  return quality('high');
}

export function saveQuality(q: Quality) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* not remembered, still applied */ }
}
