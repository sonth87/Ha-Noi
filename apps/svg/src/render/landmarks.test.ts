import { describe, expect, it } from 'vitest';
import { kernel } from '@iso/kernel';
import { behind, screenOverlap } from '@core/depth';
import { LANDMARKS } from '@core/landmarks';
import type { ViewK } from '@core/types';
import { renderLandmark } from '@render/landmarks/showcase';
import { composeScene } from '@render/scene';

const K = kernel(0, 0);

describe('landmark showcase', () => {
  for (const lm of LANDMARKS) for (const k of [0, 1, 2, 3] as ViewK[]) {
    it(`${lm.id} · view ${k}: no interpenetrating items, clean depth sort`, () => {
      const { items } = renderLandmark(K, lm, k);
      expect(items.length).toBeGreaterThan(5);
      const bad: string[] = [];
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++)
        if (screenOverlap(items[i]!.box, items[j]!.box) && behind(items[i]!.box, items[j]!.box) === 0) bad.push(`${items[i]!.id} × ${items[j]!.id}`);
      expect(bad).toEqual([]);
      const c = composeScene(items);
      expect(c.warnings).toEqual([]);
      expect(c.svg).not.toMatch(/NaN|undefined/);
    });
  }

  it('gives the towers clickable floors, unique ids', () => {
    for (const id of ['thai-binh', 'novotel', 'metro-station']) {
      const { floors, items } = renderLandmark(K, LANDMARKS.find(l => l.id === id)!, 0);
      expect(new Set(floors).size).toBe(floors.length);
      const svg = items.map(i => i.svg).join('');
      for (const f of floors) expect(svg).toContain(`data-floor="${f}"`);
    }
  });

  it('cuts the junction out of the crossroads without houses or corner plots', () => {
    const { items } = renderLandmark(K, LANDMARKS.find(l => l.kind === 'flyover')!, 0);
    expect(items.some(i => i.id.startsWith('x:fly-'))).toBe(true);
    expect(items.some(i => i.id.startsWith('junction:signal-'))).toBe(true);
    expect(items.every(i => /^(x|y|junction):/.test(i.id))).toBe(true);
  });
});
