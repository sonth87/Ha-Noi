/* Landmark spots that are placed as offsets from a real-map anchor must stay in step with the OSM data. */
import { describe, expect, it } from 'vitest';
import { loadCity } from '@my-city/osm-import';
import { NGOC_SON_MAP_CENTRE } from './landmarks/vn/ha-noi/index';
import { orientedBoxOf } from './landmarks/shared';

const { city } = loadCity('nga-tu-thai-ha');

describe('Đền Ngọc Sơn cluster', () => {
  const temple = city.buildings.find(b => b.model === 'den-ngoc-son')!;
  const c = orientedBoxOf(temple.footprint, temple.front).c;
  const dist = (p: readonly number[], q: readonly number[]) => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!);

  it('is anchored where the temple really is', () => {
    expect(dist(c, NGOC_SON_MAP_CENTRE)).toBeLessThan(3);
  });

  it('puts Cầu Thê Húc and Tháp Bút on their real OSM positions', () => {
    const at = (dx: number, dy: number) => [c[0] + dx, c[1] + dy];
    const bridge = city.streets.find(s => s.source === 'osm:way/9566542')!;
    const [a, b] = [bridge.path[0]!, bridge.path[bridge.path.length - 1]!];
    const ends = [at(14.6, 14.06), at(31.85, 56.99)];
    // either way round: the OSM way may run island → shore or the other way
    const [near, far] = dist(a, ends[0]!) < dist(a, ends[1]!) ? [a, b] : [b, a];
    expect(dist(near, ends[0]!)).toBeLessThan(6);
    expect(dist(far, ends[1]!)).toBeLessThan(6);
    const penTower = city.features.find(f => f.name === 'Tháp Bút')!;
    expect(dist(penTower.at, at(39.46, 98.0))).toBeLessThan(6);
  });
});
