import { describe, expect, it } from 'vitest';
import { PALETTES, accentCss, accentKey } from './palettes';

describe('palettes', () => {
  it('writes accent tokens for every entry, in both themes', () => {
    const css = accentCss(PALETTES.city);
    for (const a of PALETTES.city) {
      expect(css).toContain(`:root[data-accent="${accentKey(a)}"]`);
      expect(css).toContain(a[1]);
    }
    expect(css).toContain('[data-theme="light"]');
  });
});
