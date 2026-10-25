import { describe, expect, it } from 'vitest';
import { MAP_PALETTES, PALETTES, accentCss, accentKey } from './palettes';

describe('palettes', () => {
  it('writes accent tokens for every entry, in both themes', () => {
    const css = accentCss(PALETTES.city);
    for (const a of PALETTES.city) {
      expect(css).toContain(`:root[data-accent="${accentKey(a)}"]`);
      expect(css).toContain(a[1]);
    }
    expect(css).toContain('[data-theme="light"]');
  });

  it('defines 4 map color palettes with 4 visual swatch colors each', () => {
    expect(MAP_PALETTES.map((p) => p[0])).toEqual(['0', '1', '2', '3']);
    for (const [, swatches] of MAP_PALETTES) {
      expect(swatches).toHaveLength(4);
    }
  });
});

