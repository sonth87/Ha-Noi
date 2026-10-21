import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildingLevels, floorId } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { buildCityGeometry } from './city';
import { offsetLine, strip } from './streets';

const { city } = loadCity('nga-tu-thai-ha');
const g = buildCityGeometry(city);

describe('city geometry', () => {
  it('is finite everywhere', () => {
    const bad = (a: ArrayLike<number>) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]!)) return true; return false; };
    for (const geo of [...g.surfaces.values(), g.shell, g.windows]) expect(bad(geo.getAttribute('position').array)).toBe(false);
    expect(g.stats.triangles).toBeGreaterThan(5000);
  });

  it('has a lamp for every floor of every building, with windows', () => {
    const expected = city.buildings.reduce((s, b) => s + buildingLevels(b), 0);
    expect(g.floors).toHaveLength(expected);
    expect(new Set(g.floors).size).toBe(expected);
    const vt = city.buildings.find(b => b.model === 'viet-tower')!, nv = city.buildings.find(b => b.model === 'novotel')!;
    for (let n = 1; n <= 18; n++) expect(g.lamps.get(floorId(vt, n))?.length).toBeGreaterThan(0);
    for (let n = 1; n <= 27; n++) expect(g.lamps.get(floorId(nv, n))?.length).toBeGreaterThan(0);
    // most floors of the city have at least one window
    expect(g.floors.filter(f => g.lamps.has(f)).length / g.floors.length).toBeGreaterThan(0.85);
  });

  it('turns a clicked point back into its floor', () => {
    const vt = city.buildings.find(b => b.model === 'viet-tower')!, c = vt.parts[0]!.footprint[0]!;
    expect(g.floorAt(vt.id, new THREE.Vector3(c[0], 0.5, c[1]))).toBe(floorId(vt, 1));
    expect(g.floorAt(vt.id, new THREE.Vector3(c[0], 66, c[1]))).toBe(floorId(vt, 18));
    // every building can be clicked: some of its wall (or glass) triangles map back to it
    const owners = new Set<string>();
    for (const s of ['wall', 'glass', 'roof'] as const) {
      const n = g.surfaces.get(s)!.getAttribute('position').count / 3;
      for (let f = 0; f < n; f++) { const o = g.ownerOf(s, f); if (o) owners.add(o); }
    }
    expect(city.buildings.every(b => owners.has(b.id))).toBe(true);
  });

  it('lifts the flyover deck to 6 m', () => {
    const road = g.surfaces.get('road')!.getAttribute('position');
    let top = 0;
    for (let i = 0; i < road.count; i++) top = Math.max(top, road.getY(i));
    expect(top).toBeCloseTo(6, 1);
    expect(g.beacons).toHaveLength(1);
    expect(g.beacons[0]!.y).toBeGreaterThan(80);
  });

  it('offsets to the right of the direction of travel', () => {
    // heading east (x+), y points south: the right side is +y
    expect(offsetLine([[0, 0], [10, 0]], 2)).toEqual([[0, 2], [10, 2]]);
    expect(strip([[0, 0], [10, 0]], -1, 1)).toEqual([[0, -1], [10, -1], [10, 1], [0, 1]]);
  });
});
