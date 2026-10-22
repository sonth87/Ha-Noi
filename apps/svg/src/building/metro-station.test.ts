import { describe, expect, it } from 'vitest';
import { renderMetroStationSvg } from '@building/metro-station';

describe('metro-station building SVG', () => {
  it('renders a standalone isometric SVG for all 4 views', () => {
    for (const k of [0, 1, 2, 3] as const) {
      const svg = renderMetroStationSvg(k);
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('data-floor="MS/1"');
      expect(svg).toContain('data-floor="MS/2"');
      expect(svg).toContain('data-floor="MS/3"');
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });
});
