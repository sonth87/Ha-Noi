import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PRESET_IDS, buildingLevels, floorId, houseFor, houseStoreys, resolveHouse, type Building } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { Batch } from './batch';
import { buildCityGeometry, buildTile, tilesOf } from './city';
import { buildHouse } from './house3d';
import { offsetLine, strip } from './streets';
import { windowRank } from './lights';
import { buildShowcase, showcasesOf } from './showcase';

const { city: fullCity } = loadCity('nga-tu-thai-ha');
// Representative core slice (Ngã tư Thái Hà 650m radius + all custom landmarks across Đống Đa & Ba Đình)
// so building 4 detail levels in one worker stays well within V8's default heap limit.
const city = {
  ...fullCity,
  buildings: fullCity.buildings.filter(b => b.model || Math.hypot(b.footprint[0]![0], b.footprint[0]![1]) <= 650),
};
const g = buildCityGeometry(city);

describe('city geometry', () => {
  it('is finite everywhere', () => {
    const bad = (a: ArrayLike<number>) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]!)) return true; return false; };
    for (const geo of [...g.surfaces.values(), g.shell, g.windows]) expect(bad(geo.getAttribute('position').array)).toBe(false);
    expect(g.stats.triangles).toBeGreaterThan(5000);
  });

  it('has a lamp for every floor of every building, with windows', () => {
    const expected = city.buildings.reduce((s, b) => s + buildingLevels(b) + (b.house?.spec.topRoom && b.house.spec.roof === 'flat' ? 1 : 0), 0);
    expect(g.floors).toHaveLength(expected);
    expect(new Set(g.floors).size).toBe(expected);
    const vt = city.buildings.find(b => b.model === 'viet-tower')!, nv = city.buildings.find(b => b.model === 'novotel')!;
    for (let n = 1; n <= 18; n++) expect(g.lamps.get(floorId(vt, n))?.length).toBeGreaterThan(0);
    for (let n = 1; n <= 27; n++) expect(g.lamps.get(floorId(nv, n))?.length).toBeGreaterThan(0);
    // at L1 most storeys of the city have at least one window (roof rooms only get theirs from L2)
    expect(g.floors.filter(f => g.lamps.has(f)).length / g.floors.length).toBeGreaterThan(0.8);
  });

  it('lights about the chosen share of every tower\'s windows', () => {
    for (const model of ['viet-tower', 'novotel']) {
      const b = city.buildings.find(x => x.model === model)!;
      let all = 0, lit = 0;
      for (const [id, ranges] of g.lamps) if (id.startsWith(`${b.id}/`)) {
        let k = 0;
        for (const r of ranges) for (let w = 0; w < r.count; w += 6, k++) { all++; if (windowRank(id, k) < 0.2) lit++; }
      }
      expect(all, model).toBeGreaterThan(300);
      expect(lit / all, model).toBeGreaterThan(0.15);
      expect(lit / all, model).toBeLessThan(0.25);
    }
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
    expect(g.beacons.length).toBeGreaterThanOrEqual(3);
    expect(g.beacons[0]!.y).toBeGreaterThan(80);
  });

  it('offsets to the right of the direction of travel', () => {
    // heading east (x+), y points south: the right side is +y
    expect(offsetLine([[0, 0], [10, 0]], 2)).toEqual([[0, 2], [10, 2]]);
    expect(strip([[0, 0], [10, 0]], -1, 1)).toEqual([[0, -1], [10, -1], [10, 1], [0, 1]]);
  });
});

const finite = (B: Batch) => [...B.tris.values(), B.win, B.creases, B.details, B.shell.pos].every(a => a.every(Number.isFinite));

describe('detail levels', () => {
  let l2: ReturnType<typeof buildCityGeometry>;
  let l3: ReturnType<typeof buildCityGeometry>;

  it('adds detail level by level', () => {
    const l0 = buildCityGeometry(city, 0);
    l2 = buildCityGeometry(city, 2);
    l3 = buildCityGeometry(city, 3);
    const tris = [l0.stats, g.stats, l2.stats, l3.stats];
    expect(tris[1]!.windows).toBeGreaterThan(tris[0]!.windows);
    expect(tris[2]!.triangles).toBeGreaterThan(tris[1]!.triangles);
    expect(tris[3]!.triangles).toBeGreaterThan(tris[2]!.triangles);
  }, 60_000);   // the whole area across all four levels

  it('keeps every storey lit-able at L2 and L3', () => {
    for (const lg of [l2, l3]) {
      expect(lg.floors.filter(f => lg.lamps.has(f)).length / lg.floors.length).toBeGreaterThan(0.85);
    }
  }, 60_000);

  it('puts every building in exactly one tile', () => {
    const tiles = tilesOf(fullCity), ids = tiles.flatMap(t => t.buildings.map(b => b.id));
    expect(ids.sort()).toEqual(fullCity.buildings.map(b => b.id).sort());
    const t = tiles[0]!, L3 = buildTile(fullCity, t, 3);
    expect(L3.stats.triangles).toBeGreaterThan(0);
  });
});

describe('the house generator in 3D', () => {
  // one tube-house footprint, 5 × 16 m, front to the south (y = 16)
  const ring: [number, number][] = [[0, 0], [5, 0], [5, 16], [0, 16]];
  const make = (preset: string, w = 5): Building => {
    const r: [number, number][] = [[0, 0], [w, 0], [w, 16], [0, 16]];
    const input = { id: `t-${preset}`, preset, w, d: 16 };
    const spec = resolveHouse(input).spec;
    return { id: `t-${preset}`, kind: 'tube-house', footprint: r, front: 2, levelsFrom: 'rule', source: 'hand:test', house: { input, spec },
      parts: [{ id: `t-${preset}`, footprint: r, z0: 0, floors: houseStoreys(spec), facade: 'wall', roof: 'flat', source: 'hand:test' }] };
  };

  it('builds every preset at L2 and L3, finite, every storey with a window', () => {
    for (const p of PRESET_IDS) for (const level of [2, 3] as const) {
      const b = make(p, p.startsWith('wide') || p === 'tap-the' || p === 'biet-thu' || p === 'nha-pho-rong' ? 10 : 5), B = new Batch();
      buildHouse(B, b, b.house!.spec, level, { neighbourAt: () => 0 });
      expect(finite(B), `${p} L${level}`).toBe(true);
      for (let n = 1; n <= 1 + b.house!.spec.floors; n++) expect(B.lamps.has(floorId(b, n)), `${p} L${level} floor ${n}`).toBe(true);
      if (b.house!.spec.topRoom) expect(B.lamps.has(floorId(b, b.house!.spec.floors + 2)), `${p} roof room`).toBe(true);
    }
  });

  it('builds the generated houses of the real map', () => {
    const houses = city.buildings.filter(b => b.house);
    expect(houses.length).toBeGreaterThan(50);
    const B = new Batch();
    for (const b of houses) buildHouse(B, b, b.house!.spec, 3, { neighbourAt: () => 0 });
    expect(finite(B)).toBe(true);
    expect(ring).toHaveLength(4);
    expect(houseFor('x', 'tube-house', 4, 4, 16)).toBeDefined();
  });
});

describe('standalone showcase dioramas', () => {
  it('lists OSM landmarks, metro stations and Hanoi archetypes, and builds them on iso-glow plates', () => {
    const list = showcasesOf(city);
    expect(list.length).toBeGreaterThan(15);
    expect(list.some(x => x.id.startsWith('bldg:'))).toBe(true);
    expect(list.some(x => x.id.startsWith('station:'))).toBe(true);
    expect(list.some(x => x.id.startsWith('house:'))).toBe(true);

    const vpbankItem = list.find(x => x.name.includes('VPBank Tower'))!;
    const cinemaItem = list.find(x => x.name.includes('Trung tâm Chiếu phim Quốc gia'))!;
    expect(vpbankItem).toBeDefined();
    expect(cinemaItem).toBeDefined();

    const sampleIds = [
      list.find(x => x.id.startsWith('bldg:'))!.id,
      vpbankItem.id,
      cinemaItem.id,
      list.find(x => x.id.startsWith('station:'))!.id,
      'house:shop',
      'block:tap-the',
    ];
    for (const id of sampleIds) {
      const built = buildShowcase(city, id);
      expect(built, id).not.toBeNull();
      expect(built!.layer.stats.triangles, id).toBeGreaterThan(200);
      expect(built!.layer.stats.lines, id).toBeGreaterThan(50);
    }
  });
});
