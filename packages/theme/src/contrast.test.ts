/* Text in the accent colour must be readable in both themes (a bright yellow button label on the light
   panel was not). `--accent-ink` is the accent as text: the bright accent on dark, the accent mixed 48 % /
   52 % black on light. This works the same contrast numbers out for every accent. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTES } from './palettes';

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = (c: number[]) => { const [r, g, b] = c.map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const MIX = 0.48;
const LIGHT_PANELS = ['#f6f6f5', '#e9eaea'];
const DARK_PANEL = '#141516';

describe('accent as text', () => {
  it('tokens.css mixes the light-theme ink 48 % accent with black, in both light blocks', () => {
    expect(css.match(/--accent-ink:color-mix\(in srgb, var\(--accent\) 48%, #000\)/g)?.length).toBe(2);
    expect(css).toContain('--accent-ink:var(--accent-hi)');
  });

  for (const [set, accents] of Object.entries(PALETTES)) for (const [name, , darkHi, lightAccent] of accents) {
    it(`${set}/${name}: ≥ 4.5:1 on the dark panel and ≥ 4.5:1 on the light panels`, () => {
      expect(contrast(rgb(darkHi), rgb(DARK_PANEL))).toBeGreaterThanOrEqual(4.5);
      const ink = rgb(lightAccent).map(v => v * MIX);
      for (const panel of LIGHT_PANELS) expect(contrast(ink, rgb(panel)), panel).toBeGreaterThanOrEqual(4.5);
    });
  }
});
