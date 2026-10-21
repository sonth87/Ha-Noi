import { describe, expect, it } from 'vitest';
import { buildingLevels, centroid, inRect, partTop, polylineLength, signedArea, streetZ, type City, type Vec2 } from '@my-city/core';
import { loadCity } from './index';
import { projector } from './frame';

const { city, report } = loadCity('nga-tu-thai-ha');
const named = (c: City, name: string) => c.streets.filter(s => s.name === name);
/** share of a set of streets' length that runs mostly along x */
const alongX = (ss: City['streets']) => {
  let x = 0, all = 0;
  for (const s of ss) for (let i = 1; i < s.path.length; i++) {
    const a = s.path[i - 1]!, b = s.path[i]!, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    all += L; if (Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1])) x += L;
  }
  return x / all;
};

describe('frame', () => {
  it('puts the origin at (0, 0) and Tây Sơn along +x', () => {
    const P = projector({ origin: [21, 105], bearing: 62.5 });
    expect(P(21, 105)).toEqual([0, 0]);
    // a point 100 m along the bearing lands on +x
    const k = 111320 * Math.cos((21 * Math.PI) / 180), a = (62.5 * Math.PI) / 180;
    const [x, y] = P(21 + (100 * Math.sin(a)) / 110574, 105 + (100 * Math.cos(a)) / k);
    expect(x).toBeCloseTo(100, 6);
    expect(y).toBeCloseTo(0, 6);
  });
});

describe('the crossroads from OpenStreetMap', () => {
  it('has the three streets, Tây Sơn along x, Thái Hà and Chùa Bộc along y', () => {
    expect(alongX(named(city, 'Phố Tây Sơn'))).toBeGreaterThan(0.9);
    expect(alongX(named(city, 'Phố Thái Hà'))).toBeLessThan(0.2);
    expect(alongX(named(city, 'Phố Chùa Bộc'))).toBeLessThan(0.2);
    // Thái Hà north of the junction, Chùa Bộc south
    expect(named(city, 'Phố Thái Hà').every(s => centroid(s.path)[1] < 0 || polylineLength(s.path) < 30)).toBe(true);
    expect(named(city, 'Phố Chùa Bộc').every(s => centroid(s.path)[1] > 0 || polylineLength(s.path) < 30)).toBe(true);
  });

  it('lifts the Tây Sơn flyover to its 6 m deck', () => {
    const fly = named(city, 'Cầu vượt Tây Sơn');
    expect(fly).toHaveLength(1);
    const f = fly[0]!, L = polylineLength(f.path);
    expect(f.layer).toBe(1);
    expect(streetZ(f, 0)).toBe(0);
    expect(streetZ(f, L / 2)).toBe(6);
    expect(alongX(fly)).toBeGreaterThan(0.95);
  });

  it('finds the junction lights and both gardens', () => {
    expect(city.junctions.filter(j => j.signals).length).toBeGreaterThanOrEqual(4);
    const parks = city.areas.filter(a => a.kind === 'park' && a.name).map(a => a.name);
    expect(parks).toEqual(expect.arrayContaining(['Vườn hoa Công đoàn', 'Vườn hoa Thuỷ lợi']));
    // Công Đoàn south-east of the junction, Thủy Lợi south-west
    const at = (n: string) => centroid(city.areas.find(a => a.name === n)!.polygon);
    expect(at('Vườn hoa Công đoàn')[0]).toBeGreaterThan(0);
    expect(at('Vườn hoa Thuỷ lợi')[0]).toBeLessThan(0);
    expect(at('Vườn hoa Công đoàn')[1]).toBeGreaterThan(0);
  });

  it('draws Việt Tower and Novotel from their real parts and storeys', () => {
    const vt = city.buildings.find(b => b.model === 'viet-tower')!, nv = city.buildings.find(b => b.model === 'novotel')!;
    expect(buildingLevels(vt)).toBe(18);
    expect(vt.parts).toHaveLength(3);
    expect(Math.max(...vt.parts.map(partTop))).toBeCloseTo(69.2, 6);
    expect(buildingLevels(nv)).toBe(27);
    expect(nv.parts.find(p => p.facade === 'glass')!.floors).toHaveLength(27);
    // north-west and north-east corners of the junction
    expect(centroid(vt.footprint)[0]).toBeLessThan(0);
    expect(centroid(nv.footprint)[0]).toBeGreaterThan(0);
    expect(centroid(vt.footprint)[1]).toBeLessThan(0);
    expect(centroid(nv.footprint)[1]).toBeLessThan(0);
  });

  it('gives every building storeys, a kind, a front, and houses to the small ones', () => {
    expect(city.buildings.length).toBeGreaterThan(100);
    for (const b of city.buildings) {
      expect(b.parts.length).toBeGreaterThan(0);
      expect(buildingLevels(b)).toBeGreaterThan(0);
      expect(b.front).toBeGreaterThanOrEqual(0);
      expect(b.front).toBeLessThan(b.footprint.length);
      expect(signedArea(b.footprint)).toBeGreaterThan(0);
    }
    const tubes = city.buildings.filter(b => b.kind === 'tube-house');
    expect(tubes.filter(b => b.house).length / tubes.length).toBeGreaterThan(0.6);
  });

  it('keeps everything inside the area, with finite coordinates', () => {
    const R = city.bounds, ok = (p: Vec2) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
    const near = (p: Vec2) => inRect(p, { x0: R.x0 - 1e-6, y0: R.y0 - 1e-6, x1: R.x1 + 1e-6, y1: R.y1 + 1e-6 });
    for (const s of city.streets) for (const p of s.path) { expect(ok(p)).toBe(true); expect(near(p)).toBe(true); }
    for (const a of city.areas) for (const p of a.polygon) expect(near(p)).toBe(true);
    for (const b of city.buildings) expect(near(centroid(b.footprint))).toBe(true);
    expect(city.attribution).toEqual(['© OpenStreetMap contributors']);
  });

  it('opens a shop in every generated house on a main street', () => {
    const main = city.buildings.filter(b => b.house && b.house.input.shop === true && ['fold', 'roll', 'glass'].includes(b.house.spec.ground));
    expect(main.length).toBeGreaterThan(20);
  });

  it('names alleys as alleys, accented names too', () => {
    const ngo = city.streets.filter(s => s.name?.startsWith('Ngõ '));
    expect(ngo.length).toBeGreaterThan(5);
    expect(ngo.every(s => s.kind === 'alley')).toBe(true);
  });

  it('applies every hand correction and leaves no part without a building', () => {
    expect(report.unusedOverrides).toEqual([]);
    expect(report.orphanParts).toEqual([]);
  });

  it('gives the same city every time', () => {
    expect(loadCity('nga-tu-thai-ha').city).toEqual(city);
  });
});
