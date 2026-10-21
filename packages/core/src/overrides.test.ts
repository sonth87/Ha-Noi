import { describe, expect, it } from 'vitest';
import { applyOverrides } from './overrides';
import { buildingLevels, partTop, type Building, type City } from './city';
import { houseFor } from './rules';

const tube: Building = {
  id: 'b1', kind: 'tube-house', footprint: [[0, 0], [4, 0], [4, 16], [0, 16]], levelsFrom: 'rule', front: 2, source: 'osm:way/1',
  parts: [{ id: 'b1', footprint: [[0, 0], [4, 0], [4, 16], [0, 16]], z0: 0, floors: [3.8, 3.2, 3.2], facade: 'wall', roof: 'flat', source: 'osm:way/1' }],
  house: houseFor('osm:way/1', 'tube-house', 3, 4, 16),
};
const tower: Building = {
  id: 'b2', kind: 'other', footprint: [[0, 0], [20, 0], [20, 20], [0, 20]], levelsFrom: 'osm', front: 0, source: 'osm:way/2',
  parts: [{ id: 'p', footprint: [[0, 0], [20, 0], [20, 20], [0, 20]], z0: 0, floors: [3, 3], facade: 'wall', roof: 'flat', source: 'osm:way/3' }],
};
const city: City = { id: 'c', name: 'c', bounds: { x0: 0, y0: 0, x1: 1, y1: 1 }, region: [{ x0: 0, y0: 0, x1: 1, y1: 1 }], streets: [], junctions: [], buildings: [tube, tower], areas: [], features: [], rails: [], stations: [], attribution: [] };

describe('applyOverrides', () => {
  it('changes storeys and keeps the generated house in step', () => {
    const { city: c, unused } = applyOverrides(city, { buildings: { 'osm:way/1': { levels: 5 } } });
    const b = c.buildings[0]!;
    expect(unused).toEqual([]);
    expect(buildingLevels(b)).toBe(5);
    expect(b.levelsFrom).toBe('override');
    expect(b.house!.spec.floors).toBe(4);
  });

  it('sets part storeys and facades, renames, removes', () => {
    const { city: c } = applyOverrides(city, {
      buildings: { 'osm:way/2': { name: 'T', kind: 'hotel', model: 'm', parts: { 'osm:way/3': { floors: [4.2, 3, 3], facade: 'glass' } } }, 'osm:way/1': { remove: true } },
    });
    expect(c.buildings).toHaveLength(1);
    const b = c.buildings[0]!;
    expect([b.name, b.kind, b.model]).toEqual(['T', 'hotel', 'm']);
    expect(partTop(b.parts[0]!)).toBeCloseTo(10.2, 9);
    expect(b.parts[0]!.facade).toBe('glass');
  });

  it('reports corrections that matched nothing', () => {
    const { unused } = applyOverrides(city, { buildings: { 'osm:way/404': { levels: 2 }, 'osm:way/2': { parts: { 'osm:way/405': { floors: [3] } } } }, streets: { 'osm:way/406': { width: 3 } } });
    expect(unused.sort()).toEqual(['buildings:osm:way/404', 'part:osm:way/2:osm:way/405', 'streets:osm:way/406']);
  });
});
