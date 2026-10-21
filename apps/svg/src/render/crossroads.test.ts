import { describe, expect, it } from 'vitest';
import { kernel } from '@iso/kernel';
import { behind, screenOverlap } from '@core/depth';
import { crossroadsLayout, junctionGrid, cellAt } from '@core/crossroads';
import { resolveSpec } from '@core/spec';
import { footprint, placeIn } from '@core/view';
import type { Box3, ViewK } from '@core/types';
import { buildCrossroads } from '@render/crossroads-scene';
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

const overlap2 = (a: Box3, b: Box3) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.d - 1e-6 && b.y < a.y + a.d - 1e-6;

describe('crossroads layout', () => {
  const cr = crossroadsLayout(1);

  it('keeps every house off the junction and the corner plots', () => {
    const J = { x: cr.junction.x, y: cr.junction.y, z: 0, w: cr.junction.w, d: cr.junction.d, h: 0 };
    const plots = cr.plots.map(p => ({ x: p.x, y: p.y, z: 0, w: p.w, d: p.d, h: 0 }));
    for (const st of ['x', 'y'] as const) {
      expect(cr[st].lay.houses.length).toBeGreaterThan(40);
      for (const h of cr[st].lay.houses) {
        const fp = footprint(placeIn(cr[st].frame, resolveSpec(h.input).spec));
        expect(overlap2(fp, J)).toBe(false);
        for (const p of plots) expect(overlap2(fp, p)).toBe(false);
      }
    }
  });

  it('puts the two streets\' houses on separate ground', () => {
    const fps = (['x', 'y'] as const).flatMap(st => cr[st].lay.houses.map(h => footprint(placeIn(cr[st].frame, resolveSpec(h.input).spec))));
    for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) expect(overlap2(fps[i]!, fps[j]!)).toBe(false);
  });

  it('shares one cell where two lanes cross', () => {
    const g = junctionGrid(cr);
    expect(new Set(g.cells).size).toBe(g.cells.length);
    // the middle of every at-grade lane through the junction lands in a cell
    for (const st of ['x', 'y'] as const) {
      const gap = cr[st].lay.gap!;
      cr[st].lay.section.lanes.forEach((ln, i) => {
        if (ln.fly) return;
        for (let t = gap[0]; t < gap[1]; t += 7) expect(g.cells).toContain(cellAt(cr, g, st, i, t));
      });
    }
  });
});

describe('crossroads scene', () => {
  const cr = crossroadsLayout(20261021);
  for (const k of VIEWS) {
    for (const cut of [false, true]) {
      it(`view ${k} · ${cut ? 'cutaway' : 'full'}: no interpenetrating items, clean depth sort`, () => {
        const { items } = buildCrossroads(K, cr, k, cut);
        expect(interpenetrating(items)).toEqual([]);
        const c = composeScene(items);
        expect(c.warnings).toEqual([]);
        expect(c.svg).not.toMatch(/NaN|undefined/);
      });
    }
  }

  it('lists every tower floor once', () => {
    const { towerFloors } = buildCrossroads(K, cr, 0, true);
    expect(new Set(towerFloors).size).toBe(towerFloors.length);
    expect(towerFloors.filter(id => id.startsWith('NV/'))).toHaveLength(27);
    expect(towerFloors.filter(id => id.startsWith('TB/'))).toHaveLength(18);
  });
});
