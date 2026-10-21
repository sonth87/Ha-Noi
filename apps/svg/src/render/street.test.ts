import { describe, expect, it } from 'vitest';
import { kernel } from '@iso/kernel';
import { behind, screenOverlap } from '@core/depth';
import { STREET, streetLayout } from '@core/layout';
import { resolveSpec } from '@core/spec';
import type { Box3, ViewK } from '@core/types';
import { buildStreet } from '@render/street-scene';
import { composeScene } from '@render/scene';

const K = kernel(0, 0);
const VIEWS: ViewK[] = [0, 1, 2, 3];

function interpenetrating(items: { id: string; box: Box3 }[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]!.box, b = items[j]!.box;
    if (screenOverlap(a, b) && behind(a, b) === 0) out.push(`${items[i]!.id} × ${items[j]!.id}`);
  }
  return out;
}

describe('street layout', () => {
  const lay = streetLayout(1);

  it('lines both sides with 16–26 houses (fewer when some are wide), facades on their lines', () => {
    for (const row of ['far', 'near'] as const) {
      const hs = lay.houses.filter(h => h.row === row);
      expect(hs.length).toBeGreaterThanOrEqual(16);
      expect(hs.length).toBeLessThanOrEqual(26);
      for (const h of hs) {
        const s = resolveSpec(h.input).spec;
        if (row === 'far') expect(s.y + s.d).toBe(STREET.farFacade);
        else expect(s.y).toBe(STREET.nearFacade);
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(STREET.length);
      }
    }
  });

  it('never puts houses on top of each other', () => {
    for (const row of ['far', 'near'] as const) {
      const xs = lay.houses.filter(h => h.row === row).map(h => resolveSpec(h.input).spec).sort((a, b) => a.x - b.x);
      for (let i = 1; i < xs.length; i++) expect(xs[i]!.x).toBeGreaterThanOrEqual(xs[i - 1]!.x + xs[i - 1]!.w);
    }
  });

  it('is reproducible', () => {
    expect(streetLayout(1)).toEqual(lay);
    expect(streetLayout(2)).not.toEqual(lay);
  });
});

describe('street scene', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const k of VIEWS) {
      for (const cut of [false, true]) {
        it(`seed ${seed} · view ${k} · ${cut ? 'cutaway' : 'full'}: no interpenetrating items, clean depth sort`, () => {
          const { items } = buildStreet(K, streetLayout(seed), k, cut);
          expect(interpenetrating(items)).toEqual([]);
          const c = composeScene(items);
          expect(c.warnings).toEqual([]);
          expect(c.svg).not.toMatch(/NaN|undefined/);
        });
      }
    }
  }

  it('cuts exactly the row facing away from the viewer', () => {
    for (const k of VIEWS) {
      const { specs } = buildStreet(K, streetLayout(1), k, true);
      const near = specs.filter(s => s.near);
      expect(near.length).toBeGreaterThan(15);
      expect(near.every(s => s.spec.floors === 0)).toBe(true);
    }
  });

  it('rebuilds within the 300 ms budget (NFR-04)', () => {
    const lay = streetLayout(1);
    const t = performance.now();
    for (const k of VIEWS) composeScene(buildStreet(K, lay, k, true).items);
    expect((performance.now() - t) / 4).toBeLessThan(300);
  });
});
