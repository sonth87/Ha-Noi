import { describe, expect, it } from 'vitest';
import { area, centroid, clipPath, clipRing, closestOnPath, minRect, normalizeRing, pointInRing, polylineLength, signedArea, type Vec2 } from './geom';

const sq: Vec2[] = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe('geom', () => {
  it('normalises rings: positive area, no closing point, no duplicates', () => {
    const r = normalizeRing([[0, 0], [0, 10], [10, 10], [10, 10], [10, 0], [0, 0]]);
    expect(r).toHaveLength(4);
    expect(signedArea(r)).toBeGreaterThan(0);
    expect(area(r)).toBe(100);
  });

  it('finds centroids, containment and lengths', () => {
    expect(centroid(sq)).toEqual([5, 5]);
    expect(pointInRing([5, 5], sq)).toBe(true);
    expect(pointInRing([15, 5], sq)).toBe(false);
    expect(polylineLength([[0, 0], [3, 4], [3, 10]])).toBe(11);
    expect(closestOnPath([5, 3], [[0, 0], [10, 0]]).d).toBe(3);
  });

  it('measures a rotated tube house by its smallest rectangle', () => {
    const a = Math.PI / 5, rot = ([x, y]: Vec2): Vec2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const r = minRect(([[0, 0], [4, 0], [4, 15], [0, 15]] as Vec2[]).map(rot));
    expect(r.short).toBeCloseTo(4, 6);
    expect(r.long).toBeCloseTo(15, 6);
  });

  it('clips paths and rings to a rectangle', () => {
    const R = { x0: 0, y0: 0, x1: 10, y1: 10 };
    expect(clipPath([[-5, 5], [15, 5]], R)).toEqual([[[0, 5], [10, 5]]]);
    expect(clipPath([[-5, -5], [-1, -1]], R)).toEqual([]);
    // leaves and comes back: two pieces
    expect(clipPath([[2, 2], [2, 20], [8, 20], [8, 2]], R)).toHaveLength(2);
    expect(area(clipRing([[-5, -5], [5, -5], [5, 5], [-5, 5]], R))).toBeCloseTo(25, 9);
    expect(clipRing([[20, 20], [30, 20], [30, 30]], R)).toEqual([]);
  });
});
