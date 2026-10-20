import { describe, expect, it } from 'vitest';
import { depthSort, screenOverlap } from '@core/depth';
import type { Box3 } from '@core/types';

const item = (id: string, x: number, y: number, z: number, w: number, d: number, h: number) => ({ id, box: { x, y, z, w, d, h } as Box3 });
const ids = (xs: { id: string }[]) => xs.map(i => i.id);
const before = (order: string[], a: string, b: string) => expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));

describe('screenOverlap', () => {
  it('separates boxes side by side along the screen', () => {
    // same row along x, one far right: no overlap
    expect(screenOverlap({ x: 0, y: 0, z: 0, w: 10, d: 10, h: 10 }, { x: 100, y: -100, z: 0, w: 10, d: 10, h: 10 })).toBe(false);
  });
  it('detects a tall box in front of a low one', () => {
    expect(screenOverlap({ x: 0, y: 0, z: 0, w: 10, d: 10, h: 2 }, { x: 0, y: 12, z: 0, w: 10, d: 10, h: 60 })).toBe(true);
  });
});

describe('depthSort', () => {
  it('orders a row of adjacent houses along x back to front', () => {
    const row = [item('c', 80, 0, 0, 40, 150, 100), item('a', 0, 0, 0, 40, 150, 60), item('b', 40, 0, 0, 40, 150, 200)];
    const o = ids(depthSort(row).order);
    before(o, 'a', 'b'); before(o, 'b', 'c');
  });

  it('orders a row along y', () => {
    const row = [item('n2', 0, 80, 0, 150, 40, 90), item('n1', 0, 40, 0, 150, 40, 30), item('n0', 0, 0, 0, 150, 40, 120)];
    const o = ids(depthSort(row).order);
    before(o, 'n0', 'n1'); before(o, 'n1', 'n2');
  });

  it('draws the far side of a street before the near side', () => {
    // the near house sits across the street and further along x, so the two overlap on screen
    const near = item('near', 150, 160, 0, 40, 150, 120), far = item('far', 0, 0, 0, 40, 150, 120);
    expect(screenOverlap(near.box, far.box)).toBe(true);
    const o = ids(depthSort([near, far]).order);
    before(o, 'far', 'near');
  });

  it('stacks: lower box first', () => {
    const o = ids(depthSort([item('roofTank', 5, 5, 100, 10, 10, 10), item('body', 0, 0, 0, 40, 40, 100)]).order);
    before(o, 'body', 'roofTank');
  });

  // lesson 1 from the reference house: awning → hanging sign → floor-2 balcony slab
  it('hangs a sign under an overhang between the awning and the balcony slab', () => {
    const awning = item('awning', 60, 150, 24, 40, 14, 5);
    const sign = item('sign', 61, 158, 30.4, 38, 0.6, 7.6);
    const slab = item('slab', 62, 158, 38, 36, 10, 13);
    const upper = item('upper', 60, 0, 38, 40, 158, 96);
    const o = ids(depthSort([slab, upper, sign, awning]).order);
    before(o, 'awning', 'sign'); before(o, 'sign', 'slab'); before(o, 'upper', 'slab');
  });

  it('is stable and warns on interpenetrating boxes', () => {
    const r = depthSort([item('p', 0, 0, 0, 10, 10, 10), item('q', 5, 5, 5, 10, 10, 10)]);
    expect(ids(r.order)).toEqual(['p', 'q']);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('handles a few hundred items quickly', () => {
    const many = Array.from({ length: 600 }, (_, i) => item(`h${i}`, (i % 30) * 40, Math.floor(i / 30) * 160, 0, 40, 150, 30 + (i * 37) % 170));
    const t = performance.now();
    const r = depthSort(many);
    expect(r.order).toHaveLength(600);
    expect(r.warnings).toEqual([]);
    expect(performance.now() - t).toBeLessThan(500);
  });
});
