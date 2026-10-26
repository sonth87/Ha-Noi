import { describe, expect, it } from 'vitest';
import { HA_NOI_WARD_OUTLINES } from '@my-city/osm-import';
import { HANOI_OUTER_BOUNDARY, outerOutline } from './adminBoundaries';

const area = (r: readonly (readonly number[])[]) => Math.abs(r.reduce((s, p, i) => s + p[0]! * r[(i + 1) % r.length]![1]! - r[(i + 1) % r.length]![0]! * p[1]!, 0) / 2);

describe('outer outline of the city', () => {
  it('is the union of the real ward outlines (area within 3 % of the wards together)', () => {
    const wards = Object.values(HA_NOI_WARD_OUTLINES).map(w => w.polygon);
    const sum = wards.reduce((s, w) => s + area(w), 0);
    expect(HANOI_OUTER_BOUNDARY.polygon.length).toBeGreaterThan(100);   // not the 30-point stepped fallback
    expect(Math.abs(area(HANOI_OUTER_BOUNDARY.polygon) - sum) / sum).toBeLessThan(0.03);
  });

  it('chains the unshared edges of two squares into one ring and drops the shared one', () => {
    const a = [[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][];
    const b = [[10, 0], [20, 0], [20, 10], [10, 10]] as [number, number][];
    const ring = outerOutline([a, b])!;
    expect(area(ring)).toBe(200);
    expect(outerOutline([])).toBeNull();
  });
});
