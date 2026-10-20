import { describe, expect, it } from 'vitest';
import { kernel } from '@iso/kernel';
import { catalogCenter, catalogLots, placeInLot } from '@core/layout';
import { PRESET_IDS } from '@core/presets';
import { randomHouse, resolveSpec } from '@core/spec';
import { rng } from '@core/rng';
import { rotateSpec } from '@core/view';
import type { HouseInput, Item, ViewK } from '@core/types';
import { renderHouse } from '@render/house';
import { renderLot } from '@render/props/lot';
import { composeScene } from '@render/scene';

const K = kernel(0, 0);

function catalog(inputs: HouseInput[], k: ViewK) {
  const lots = catalogLots(inputs.length), [cx, cy] = catalogCenter(lots.length), items: Item[] = [];
  inputs.forEach((input, i) => {
    const lot = rotateSpec(lots[i]!, k, cx, cy);
    items.push(...renderLot(K, lot, i, 'x'), ...renderHouse(K, placeInLot(lot, resolveSpec(input).spec)));
  });
  return composeScene(items);
}

describe('catalog scene', () => {
  const presets = PRESET_IDS.map((p, i) => ({ id: `lot${i}`, preset: p }));

  for (const k of [0, 1, 2, 3] as ViewK[]) {
    it(`sorts cleanly in view ${k}`, () => {
      const c = catalog(presets, k);
      expect(c.warnings).toEqual([]);
      expect(c.svg).not.toMatch(/NaN|undefined/);
    });
  }

  it('sorts cleanly with random houses in every view', () => {
    const r = rng(7);
    for (let round = 0; round < 10; round++) {
      const inputs = presets.map(p => randomHouse(r, p.id));
      for (const k of [0, 1, 2, 3] as ViewK[]) expect(catalog(inputs, k).warnings, `round ${round} view ${k}`).toEqual([]);
    }
  });

  it('builds a rotated catalog fast enough to feel instant (NFR-04 budget is 300 ms for the crossroads)', () => {
    const t = performance.now();
    for (const k of [0, 1, 2, 3] as ViewK[]) catalog(presets, k);
    expect((performance.now() - t) / 4).toBeLessThan(100);
  });
});
