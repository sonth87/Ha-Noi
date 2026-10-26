/* Guards for the real-world placement of things that were once hand-placed with guessed coordinates
   (a made-up river polygon, 4-point arterial roads, a bridge model 500 m off its deck). */
import { describe, expect, it } from 'vitest';
import { centroid, pointInRing, polylineLength, type Vec2 } from '@my-city/core';
import { loadCity } from './index';

const { city } = loadCity('nga-tu-thai-ha');
const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('no invented geometry', () => {
  it('has none of the old made-up ids (99000000010–30 water/parks, 99000001000–27 roads)', () => {
    const bad = (src: string) => /^osm:way\/9900000(00(01\d|02\d|030)|10(0\d|1\d|2[0-7]))$/.test(src);
    expect(city.streets.filter(s => bad(s.source)).map(s => s.source)).toEqual([]);
    expect(city.areas.filter(a => bad(a.source)).map(a => a.source)).toEqual([]);
  });

  it('has no invented element left in the map data (nothing with an id in the 99… range)', () => {
    const invented = (src: string) => /^osm:(way|relation)\/99\d{9}$/.test(src);
    expect([...city.streets, ...city.areas, ...city.buildings].map(x => x.source).filter(invented)).toEqual([]);
  });

  it('draws the Red River as real water, not one 17 km² polygon', () => {
    const water = city.areas.filter(a => a.kind === 'water');
    const shoelace = (r: readonly Vec2[]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * p[1], 0) / 2);
    // Hồ Tây is 5.3 km²; nothing but the river itself should be anywhere near that
    const big = water.filter(a => shoelace(a.polygon) > 6e6);
    expect(big.length).toBeLessThanOrEqual(2);
    const lake = water.find(a => a.name === 'Hồ Tây')!;
    expect(shoelace(lake.polygon)).toBeGreaterThan(4.5e6);
    expect(shoelace(lake.polygon)).toBeLessThan(6e6);
  });
});

describe('bridges and arterials sit where they really are', () => {
  it('Nguyễn Văn Cừ is a long continuous road on the east bank, not in the water', () => {
    const roads = city.streets.filter(s => s.name === 'Đường Nguyễn Văn Cừ');
    const len = roads.reduce((s, r) => s + polylineLength(r.path), 0);
    expect(len).toBeGreaterThan(3000);
    const water = city.areas.filter(a => a.kind === 'water');
    let inWater = 0, n = 0;
    for (const r of roads) for (const p of r.path) { n++; if (water.some(a => pointInRing(p, a.polygon))) inWater++; }
    expect(inWater / n).toBeLessThan(0.05);
  });
});

describe('quick-navigation places', () => {
  it('each one lands near a real, named element of the map (no stale coordinates)', () => {
    const named = [
      ...city.buildings.map(b => ({ n: b.name, c: b.footprint[0]! })),
      ...city.areas.flatMap(a => [{ n: a.name, c: a.polygon[0]! }, { n: a.name, c: centroid(a.polygon) }]),
      ...city.features.map(f => ({ n: f.name, c: f.at })),
      ...city.streets.map(s => ({ n: s.name, c: s.path[Math.floor(s.path.length / 2)]! })),
    ].filter(x => x.n && x.n.length > 4) as { n: string; c: Vec2 }[];
    const far: string[] = [];
    for (const p of city.places ?? []) {
      if (p.id === 'home') continue;
      const toks = p.name.split(/[–\-(),&]/).map(s => s.trim().toLowerCase()).filter(s => s.length > 4);
      const near = named.some(x => dist(x.c, p.at) < 700 && toks.some(t => x.n.toLowerCase().includes(t) || t.includes(x.n.toLowerCase())));
      if (!near) far.push(p.id);
    }
    // places whose OSM element has no name tag nearby (checked by hand against OSM on 2026-10-26)
    const known = ['nut-giao-thanh-xuan', 'dinh-dong-ngac', 'den-hai-ba-trung', 'times-city', 'vinhomes-smart-city', 'keangnam-landmark72'];
    expect(far.filter(id => !known.includes(id))).toEqual([]);
  });
});

describe('wards', () => {
  it('uses the real OSM ward outlines to name the district of a place', () => {
    const temple = city.buildings.find(b => b.model === 'den-ngoc-son')!;
    expect(temple.district).toBe('Phường Hoàn Kiếm');
    const lakeHoanKiem = city.areas.find(a => a.name === 'Hồ Hoàn Kiếm')!;
    expect(lakeHoanKiem.district).toBe('Phường Hoàn Kiếm');
  });
});

describe('bridge heights', () => {
  const bridges = city.streets.filter(s => s.layer > 0 && s.profile.length && s.kind !== 'footway' && s.kind !== 'steps');
  const key = (p: Vec2) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const endZ = (s: (typeof bridges)[number], end: 0 | 1) => s.profile[end ? s.profile.length - 1 : 0]![1];

  it('is continuous where two bridge pieces meet (no dips to the ground at the joints of one bridge)', () => {
    const at = new Map<string, number[]>();
    for (const s of bridges) for (const e of [0, 1] as const) {
      const k = key(s.path[e ? s.path.length - 1 : 0]!);
      at.set(k, [...(at.get(k) ?? []), endZ(s, e)]);
    }
    const jumpy = [...at.entries()].filter(([, z]) => z.length > 1 && Math.max(...z) - Math.min(...z) > 0.3);
    expect(jumpy.length).toBe(0);
  });

  it('ramps gently on long bridges and Cầu Long Biên rides at its real height', () => {
    for (const s of bridges.filter(x => x.name === 'Cầu Long Biên')) for (let i = 1; i < s.profile.length; i++) {
      const [a, za] = s.profile[i - 1]!, [b, zb] = s.profile[i]!;
      expect(Math.abs(zb - za) / (b - a), s.id).toBeLessThan(0.06);
    }
    const lb = bridges.filter(s => s.name === 'Cầu Long Biên');
    expect(lb.length).toBe(2);   // the two carriageways
    for (const d of lb) expect(Math.max(...d.profile.map(q => q[1]))).toBeCloseTo(9.5, 1);
  });

  it('decks that meet at a joint are about as wide as each other (no 3 m deck feeding a 13 m one)', () => {
    const at = new Map<string, number[]>();
    for (const s of bridges) for (const e of [s.path[0]!, s.path[s.path.length - 1]!]) at.set(key(e), [...(at.get(key(e)) ?? []), s.width]);
    const bad = [...at.entries()].filter(([, w]) => w.length > 1 && Math.max(...w) / Math.min(...w) > 2.1);
    expect(bad.length).toBe(0);
  });
});

describe('bridges cut by the edge of the map', () => {
  it('keep their deck height at the cut instead of dropping to the ground', () => {
    const cut = city.streets.filter(s => s.name === 'Cầu Nhật Tân' && s.profile.length && polylineLength(s.path) > 400);
    expect(cut.length).toBeGreaterThan(0);
    for (const s of cut) {
      const ends = [s.profile[0]![1], s.profile[s.profile.length - 1]![1]];
      expect(Math.max(...ends)).toBeGreaterThan(14);   // the end at the map edge is up at the 15 m deck
    }
  });
});
