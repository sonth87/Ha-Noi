import { describe, expect, it } from 'vitest';
import { loadCity } from '@my-city/osm-import';
import { tilesOf } from '@render/city';
import { SpatialGrid } from './spatialGrid';

describe('SpatialGrid', () => {
  it('finds an item from any query box that meets its own box, and only those', () => {
    const g = new SpatialGrid<string>(64);
    g.insert('small', 10, 10, 5);
    g.insert('wide', 1000, 0, 400);
    expect([...g.query(0, 0, 20)]).toEqual(['small']);
    expect(g.query(700, 0, 10).has('wide')).toBe(true);
    expect(g.query(5000, 5000, 100).size).toBe(0);
  });

  it('returns a re-filed item once', () => {
    const g = new SpatialGrid<string>(64);
    g.insert('a', 0, 0, 10);
    g.insert('a', 0, 0, 90);
    expect([...g.query(0, 0, 200)]).toEqual(['a']);
  });

  /** the point of it (A32): around a view, a frame looks at a small share of the whole city */
  it('on the real map a 600 m view touches a small share of the tiles, close to what is in reach, and misses none', () => {
    const tiles = tilesOf(loadCity('nga-tu-thai-ha').city);
    const g = new SpatialGrid<(typeof tiles)[number]>(256);
    for (const t of tiles) g.insert(t, t.center[0], t.center[1], t.radius);
    const reach = 600;
    const got = g.query(0, 0, reach);
    const want = tiles.filter(t => Math.hypot(t.center[0], t.center[1]) - t.radius <= reach);
    for (const t of want) expect(got.has(t)).toBe(true);
    expect(got.size).toBeLessThan(tiles.length / 5);
    expect(got.size).toBeLessThanOrEqual(want.length * 2);
  }, 60_000);
});
