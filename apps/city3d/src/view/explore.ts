/* The landmark explorer's data (ADR-063): scope (country → city → ward), search, category, order, and how many
   are shown. Built to stay usable with many cities and thousands of entries: the scope is picked from lists, not
   laid out as rows of buttons; results come a page at a time; "near the view" puts what is on screen first.
   Pure, tested in Node; ui/Explorer.tsx draws it. */
import type { ShowcaseItem } from '@render/showcase';

export type ExploreSort = 'near' | 'az' | 'tall';

export interface ExploreQuery {
  country: string;
  city: string;
  /** a ward / district name, or '' for all */
  district: string;
  category: string;
  search: string;
  sort: ExploreSort;
}

export interface ScopeOption { id: string; name: string; count: number }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** search that ignores Vietnamese tone marks ("chua mot cot" finds "Chùa Một Cột"), every word */
export function matchesText(text: string, search: string): boolean {
  const q = fold(search.trim());
  if (!q) return true;
  const f = fold(text);
  return q.split(/\s+/).every(w => f.includes(w));
}

export const matches = (item: ShowcaseItem, search: string) =>
  matchesText(`${item.name} ${item.group} ${item.district ?? ''} ${item.address ?? ''}`, search);

const countBy = (items: readonly ShowcaseItem[], key: (x: ShowcaseItem) => [string, string] | null): ScopeOption[] => {
  const m = new Map<string, ScopeOption>();
  for (const x of items) {
    const k = key(x);
    if (!k) continue;
    const o = m.get(k[0]);
    if (o) o.count++; else m.set(k[0], { id: k[0], name: k[1], count: 1 });
  }
  return [...m.values()];
};

export const countries = (items: readonly ShowcaseItem[]) => countBy(items, x => [x.countryCode, x.countryName]);
export const cities = (items: readonly ShowcaseItem[], country: string) =>
  countBy(items.filter(x => x.countryCode === country), x => [x.cityId, x.cityName]);
export const districts = (items: readonly ShowcaseItem[], city: string) =>
  countBy(items.filter(x => x.cityId === city), x => (x.district ? [x.district, x.district] : null)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

/** the entries in scope and matching the search, before the category (its chips show counts of these) */
export function inScope(items: readonly ShowcaseItem[], q: ExploreQuery): ShowcaseItem[] {
  return items.filter(x => x.countryCode === q.country && x.cityId === q.city && (!q.district || x.district === q.district) && matches(x, q.search));
}

export function categories(items: readonly ShowcaseItem[]): ScopeOption[] {
  return countBy(items, x => [x.categoryId, x.group]).sort((a, b) => (Number.parseInt(a.id, 10) || 99) - (Number.parseInt(b.id, 10) || 99));
}

/** the list to show: in the category, in order; entries not on the map go last when sorting by distance */
export function results(items: readonly ShowcaseItem[], q: ExploreQuery, centre: readonly [number, number]): ShowcaseItem[] {
  const list = q.category ? items.filter(x => x.categoryId === q.category) : [...items];
  const dist = (x: ShowcaseItem) => (x.at ? Math.hypot(x.at[0] - centre[0], x.at[1] - centre[1]) : Infinity);
  const name = (x: ShowcaseItem) => cleanName(x.name);
  if (q.sort === 'near') list.sort((a, b) => dist(a) - dist(b) || name(a).localeCompare(name(b), 'vi'));
  else if (q.sort === 'tall') list.sort((a, b) => (b.heightM ?? 0) - (a.heightM ?? 0) || name(a).localeCompare(name(b), 'vi'));
  else list.sort((a, b) => name(a).localeCompare(name(b), 'vi'));
  return list;
}

/** the name without the "(12 tầng)" the list used to carry: floors are shown on their own */
export const cleanName = (name: string) => name.replace(/\s*\(\d+\s*tầng\)$/iu, '').trim();

/** distance to show next to an entry, in m or km */
export function distanceLabel(item: ShowcaseItem, centre: readonly [number, number]): string | null {
  if (!item.at) return null;
  const d = Math.hypot(item.at[0] - centre[0], item.at[1] - centre[1]);
  return d < 950 ? `${Math.max(10, Math.round(d / 10) * 10)} m` : `${(d / 1000).toFixed(d < 9500 ? 1 : 0)} km`;
}

/** how many are shown at first, and added by "show more" */
export const PAGE = 40;
