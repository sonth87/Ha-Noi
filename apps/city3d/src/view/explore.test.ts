import { describe, expect, it } from 'vitest';
import type { ShowcaseItem } from '@render/showcase';
import { categories, cities, cleanName, distanceLabel, districts, inScope, matches, results, type ExploreQuery } from './explore';

const item = (id: string, name: string, extra: Partial<ShowcaseItem> = {}): ShowcaseItem => ({
  id, name, countryCode: 'vn', countryName: 'Việt Nam', cityId: 'vn/ha-noi', cityName: 'Hà Nội', categoryId: '7-chua', group: 'Chùa',
  subtitle: '', zoom: 3, radius: 30, ...extra,
});
const items = [
  item('a', 'Chùa Một Cột (1 tầng)', { district: 'Phường Ba Đình', at: [100, 0], heightM: 12 }),
  item('b', 'Nhà hát Lớn (4 tầng)', { categoryId: '9-van-hoa', group: 'Văn hoá', district: 'Phường Cửa Nam', at: [10, 0], heightM: 30 }),
  item('c', 'Thành cổ Sơn Tây', { categoryId: '1-thanh', group: 'Thành', district: 'Phường Sơn Tây' }),
  item('d', 'Cầu Rồng', { cityId: 'vn/da-nang', cityName: 'Đà Nẵng', at: [0, 0] }),
];
const q = (p: Partial<ExploreQuery> = {}): ExploreQuery => ({ country: 'vn', city: 'vn/ha-noi', district: '', category: '', search: '', sort: 'near', ...p });

describe('landmark explorer (ADR-063)', () => {
  it('searches without tone marks, every word', () => {
    expect(matches(items[0]!, 'chua mot cot')).toBe(true);
    expect(matches(items[0]!, 'mot ba dinh')).toBe(true);
    expect(matches(items[0]!, 'nha hat')).toBe(false);
  });

  it('scopes by country, city and ward, with counts for the pickers', () => {
    expect(cities(items, 'vn').map(c => [c.name, c.count])).toEqual([['Hà Nội', 3], ['Đà Nẵng', 1]]);
    expect(districts(items, 'vn/ha-noi').map(d => d.name)).toEqual(['Phường Ba Đình', 'Phường Cửa Nam', 'Phường Sơn Tây']);
    expect(inScope(items, q()).map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(inScope(items, q({ district: 'Phường Cửa Nam' })).map(x => x.id)).toEqual(['b']);
    expect(categories(inScope(items, q())).map(c => c.id)).toEqual(['1-thanh', '7-chua', '9-van-hoa']);
  });

  it('orders by distance to the view (entries not on the map last), by name, or by height', () => {
    const scoped = inScope(items, q());
    expect(results(scoped, q(), [0, 0]).map(x => x.id)).toEqual(['b', 'a', 'c']);
    expect(results(scoped, q({ sort: 'az' }), [0, 0]).map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(results(scoped, q({ sort: 'tall' }), [0, 0]).map(x => x.id)).toEqual(['b', 'a', 'c']);
    expect(results(scoped, q({ category: '7-chua' }), [0, 0]).map(x => x.id)).toEqual(['a']);
  });

  it('shows names without the floor count, and distances in m or km', () => {
    expect(cleanName('Nhà hát Lớn (4 tầng)')).toBe('Nhà hát Lớn');
    expect(distanceLabel(items[1]!, [0, 0])).toBe('10 m');
    expect(distanceLabel(item('x', 'x', { at: [2400, 0] }), [0, 0])).toBe('2.4 km');
    expect(distanceLabel(items[2]!, [0, 0])).toBeNull();
  });
});
