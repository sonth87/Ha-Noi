import { describe, expect, it } from 'vitest';
import { bridgeProfile, frontEdge, frontage, guessKind, guessLevels, houseFor, storeyHeights, streetShape } from './rules';
import type { Vec2 } from './geom';

describe('street rules', () => {
  it('sizes streets from their kind and lanes', () => {
    expect(streetShape('primary', 3, true)).toEqual({ width: 9.75, lanes: 3, sidewalk: { left: 0, right: 3.5 } });
    expect(streetShape('primary', undefined, false).sidewalk).toEqual({ left: 3.5, right: 3.5 });
    expect(streetShape('alley', undefined, false)).toEqual({ width: 3, lanes: 1, sidewalk: { left: 0, right: 0 } });
  });

  it('ramps a road bridge up to its deck and keeps a footbridge level', () => {
    const p = bridgeProfile('primary', 250, 1);
    expect(p[0]).toEqual([0, 0]);
    expect(p[1]).toEqual([250 / 3, 6]);
    expect(p[3]).toEqual([250, 0]);
    expect(bridgeProfile('footway', 30, 1)).toEqual([[0, 5], [30, 5]]);
  });
});

describe('building rules', () => {
  const tube: Vec2[] = [[0, 0], [4, 0], [4, 16], [0, 16]];
  it('tells a tube house, a house, a block and a kiosk apart', () => {
    expect(guessKind(tube)).toBe('tube-house');
    expect(guessKind([[0, 0], [12, 0], [12, 12], [0, 12]])).toBe('house');
    expect(guessKind([[0, 0], [30, 0], [30, 20], [0, 20]])).toBe('apartment');
    expect(guessKind([[0, 0], [3, 0], [3, 3], [0, 3]])).toBe('kiosk');
    expect(guessKind(tube, 'house')).toBe('tube-house');
    expect(guessKind(tube, 'school')).toBe('school');
  });

  it('picks storeys by seed, the same every time', () => {
    expect(guessLevels('tube-house', 'osm:way/1')).toBe(guessLevels('tube-house', 'osm:way/1'));
    const seen = new Set(Array.from({ length: 50 }, (_, i) => guessLevels('tube-house', `osm:way/${i}`)));
    expect(seen.size).toBeGreaterThan(2);
    expect(storeyHeights('house', 3)).toEqual([3.8, 3.2, 3.2]);
  });

  it('turns the front of a house to the street', () => {
    // street along y = 20, south of the house: the front is the edge 16 → its outward side looks south
    const i = frontEdge(tube, [{ path: [[-50, 20], [50, 20]], width: 8 }]);
    const p = tube[i]!, q = tube[(i + 1) % 4]!;
    expect(p[1]).toBe(16);
    expect(q[1]).toBe(16);
    expect(frontage(tube, i)).toEqual({ w: 4, d: 16 });
  });

  it('builds a house on a real footprint, or none when it does not fit', () => {
    const h = houseFor('osm:way/9', 'tube-house', 4, 4, 16)!;
    expect([h.spec.w, h.spec.d, h.spec.floors]).toEqual([4, 16, 3]);
    expect(houseFor('osm:way/9', 'tube-house', 4, 4, 16)).toEqual(h);
    expect(houseFor('x', 'apartment', 6, 20, 20)).toBeUndefined();
    expect(houseFor('x', 'tube-house', 3, 2, 10)).toBeUndefined();
  });
});
