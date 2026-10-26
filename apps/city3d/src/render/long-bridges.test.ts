/* Bridges drawn along their road (docs/architecture/case-studies.md CS-05): Cầu Nhật Tân gets five pylons over
   the river part of its deck and Cầu Long Biên steel trusses; both come from the OSM road, not from a box. */
import { describe, expect, it } from 'vitest';
import type { Vec2 } from '@my-city/core';
import { Batch } from './batch';
import { nhatTanPylons } from './streets';

const deck = (y: number, len = 3000) => ({
  id: `d${y}`, name: 'Cầu Nhật Tân', kind: 'trunk', path: [[0, y], [len, y]] as Vec2[], width: 14, lanes: 3, oneway: true, layer: 1,
  profile: [[0, 15], [len, 15]] as [number, number][], sidewalk: { left: 0, right: 0 }, streets: [],
});
// the river: 2 km of the 3 km deck is over water
const river: Vec2[] = [[500, -200], [2500, -200], [2500, 200], [500, 200]];
const maxY = (l: number[]) => { let m = 0; for (let i = 1; i < l.length; i += 3) m = Math.max(m, l[i]!); return m; };

describe('Cầu Nhật Tân pylons', () => {
  it('stand over the water, 300 m apart, far above the deck, between the two carriageways', () => {
    const B = new Batch();
    nhatTanPylons(B, deck(0) as never, deck(18) as never, [river]);
    const all = [...B.tris.values()].flat();
    expect(maxY(all)).toBeGreaterThan(15 + 90);
    // pylon x positions: apex solids ('metal') are 2.4 m long along the deck
    const xs = new Set<number>();
    const l = B.tris.get('metal') ?? [];
    for (let i = 0; i < l.length; i += 9) if (l[i + 1]! > 15 + 78) xs.add(Math.round(l[i]! / 300));
    expect(xs.size).toBe(5);
    // between the carriageways (y 0 and 18) and over the river
    for (let i = 0; i < l.length; i += 9) if (l[i + 1]! > 15 + 78) { expect(l[i + 2]!).toBeGreaterThan(-2); expect(l[i + 2]!).toBeLessThan(20); expect(l[i]!).toBeGreaterThan(500); expect(l[i]!).toBeLessThan(2500); }
    expect(B.creases.length).toBeGreaterThan(500);
  });

  it('draws nothing when the deck is not over enough water (the map ends before the river)', () => {
    const B = new Batch();
    nhatTanPylons(B, deck(0, 600) as never, deck(18, 600) as never, [[[0, -50], [150, -50], [150, 50], [0, 50]]]);
    expect([...B.tris.values()].flat().length).toBe(0);
  });
});

describe('on the real map', () => {
  it('Cầu Nhật Tân is in the map far enough to have its river span, and its pylons are drawn', async () => {
    const { loadCity } = await import('@my-city/osm-import');
    const { buildStreets } = await import('./streets');
    const { city } = loadCity('nga-tu-thai-ha');
    const lens = city.streets.filter(s => s.name === 'Cầu Nhật Tân').map(s => s.path.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s.path[i - 1]![0], p[1] - s.path[i - 1]![1]) : 0), 0));
    expect(Math.max(...lens)).toBeGreaterThan(2500);
    const B = new Batch();
    buildStreets(B, city, 'major');
    const metal = B.tris.get('metal') ?? [];
    let top = 0;
    for (let i = 1; i < metal.length; i += 3) top = Math.max(top, metal[i]!);
    expect(top).toBeGreaterThan(100);
  }, 120000);
});
