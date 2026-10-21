import { describe, expect, it } from 'vitest';
import { kernel } from '@iso/kernel';
import { behind, screenOverlap } from '@core/depth';
import { PRESET_IDS } from '@core/presets';
import { randomHouse, resolveSpec } from '@core/spec';
import { rng } from '@core/rng';
import type { Box3, Facing, HouseSpec } from '@core/types';
import { floorIds, renderHouse } from '@render/house';
import { composeScene } from '@render/scene';

const K = kernel(0, 0);
const FACINGS: Facing[] = ['S', 'E', 'N', 'W'];
const spec = (preset: string, facing: Facing = 'S') => resolveSpec({ id: `h-${preset}`, preset, facing }).spec;

/** boxes that share volume (touching is fine): the depth sort's one assumption */
function interpenetrating(boxes: { id: string; box: Box3 }[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!.box, b = boxes[j]!.box;
    if (screenOverlap(a, b) && behind(a, b) === 0) out.push(`${boxes[i]!.id} × ${boxes[j]!.id}`);
  }
  return out;
}

describe('renderHouse', () => {
  for (const p of PRESET_IDS) {
    describe(p, () => {
      for (const facing of FACINGS) {
        it(`draws cleanly facing ${facing}`, () => {
          const s = spec(p, facing), items = renderHouse(K, s);
          const svg = items.map(i => i.svg).join('');
          expect(svg).not.toMatch(/NaN|Infinity|undefined/);
          expect(interpenetrating(items)).toEqual([]);
          // every floor can be lit from whichever side is visible
          for (const id of floorIds(s)) expect(svg).toContain(`data-floor="${id}"`);
        });
      }
      it('is reproducible (NFR-06)', () => {
        const a = renderHouse(K, spec(p)).map(i => i.svg).join('');
        expect(renderHouse(K, spec(p)).map(i => i.svg).join('')).toBe(a);
        expect(a).toMatchSnapshot();
      });
    });
  }

  it('shows the facade only for S and E facings', () => {
    const shop = (f: Facing) => renderHouse(K, spec('nha-mau', f)).map(i => i.svg).join('');
    expect(shop('S')).toContain('CÀ PHÊ');
    expect(shop('E')).toContain('CÀ PHÊ');
    expect(shop('N')).not.toContain('CÀ PHÊ');
    expect(shop('W')).not.toContain('CÀ PHÊ');
  });

  it('keeps 300 random houses free of interpenetrating parts', () => {
    const r = rng(2026);
    for (let i = 0; i < 300; i++) {
      const s: HouseSpec = resolveSpec({ ...randomHouse(r, `r${i}`), facing: FACINGS[i % 4]! }).spec;
      expect(interpenetrating(renderHouse(K, s)), `random house ${i} (${s.preset}, ${s.facing})`).toEqual([]);
    }
  });

  it('composes a scene with no depth warnings', () => {
    let x = 0;
    const items = PRESET_IDS.flatMap(p => {
      const s = resolveSpec({ id: p, preset: p, x, y: 40 }).spec;
      x += s.w + 50;
      return renderHouse(K, s);
    });
    const c = composeScene(items);
    expect(c.warnings).toEqual([]);
    expect(c.viewBox).toMatch(/^0 0 [\d.]+ [\d.]+$/);
  });
});
