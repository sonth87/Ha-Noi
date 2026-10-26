/* The landmark explorer (ADR-063): scope pickers, search, category chips, order, and a list in which every entry
   opens its 3D model or shows where it stands on the map. The data rules are in view/explore.ts. */
import { useMemo, useState } from 'react';
import type { CityView } from '@view/CityView';
import {
  PAGE, categories, cities, cleanName, countries, distanceLabel, districts, inScope, results, type ExploreQuery, type ExploreSort,
} from '@view/explore';
import { t, type Locale, type TranslationKey } from '@view/i18n';
import { Icon } from './icons';
import { Sheet } from './Sheet';

const SORTS: ExploreSort[] = ['near', 'az', 'tall'];

export function Explorer({ v, locale: loc, current, onClose }: { v: CityView; locale: Locale; current: string | null; onClose: () => void }) {
  const items = v.showcases;
  const [q, setQ] = useState<ExploreQuery>(() => {
    const country = countries(items)[0]?.id ?? '';
    const city = cities(items, country)[0]?.id ?? '';
    return { country, city, district: '', category: '', search: '', sort: 'near' };
  });
  const [limit, setLimit] = useState(PAGE);
  // distances from where the view was when the list opened (not every frame)
  const centre = useMemo(() => v.viewCentre(), [v]);
  const set = (p: Partial<ExploreQuery>) => { setQ(prev => ({ ...prev, ...p })); setLimit(PAGE); };

  const countryList = useMemo(() => countries(items), [items]);
  const cityList = useMemo(() => cities(items, q.country), [items, q.country]);
  const districtList = useMemo(() => districts(items, q.city), [items, q.city]);
  const scoped = useMemo(() => inScope(items, q), [items, q]);
  const cats = useMemo(() => categories(scoped), [scoped]);
  const list = useMemo(() => results(scoped, q, centre), [scoped, q, centre]);

  return (
    <Sheet title={t('explore.title', undefined, loc)} closeLabel={t('ui.close', undefined, loc)} onClose={onClose} className="explorer"
      headExtra={<span className="sheet-count">{t('explore.count', { count: scoped.length }, loc)}</span>}>
      <div className="ex-scope">
        {countryList.length > 1 && (
          <label className="field">
            <span>{t('explore.country', undefined, loc)}</span>
            <select value={q.country} onChange={e => set({ country: e.target.value, city: cities(items, e.target.value)[0]?.id ?? '', district: '', category: '' })}>
              {countryList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
            </select>
          </label>
        )}
        <label className="field">
          <span>{t('explore.city', undefined, loc)}</span>
          <select value={q.city} onChange={e => set({ city: e.target.value, district: '', category: '' })}>
            {cityList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t('explore.district', undefined, loc)}</span>
          <select value={q.district} onChange={e => set({ district: e.target.value, category: '' })}>
            <option value="">{t('explore.allDistricts', undefined, loc)}</option>
            {districtList.map(d => <option key={d.id} value={d.id}>{d.name} ({d.count})</option>)}
          </select>
        </label>
      </div>

      <div className="search-field">
        <Icon name="search" />
        <input type="search" value={q.search} placeholder={t('explore.search', undefined, loc)} onChange={e => set({ search: e.target.value })} aria-label={t('explore.search', undefined, loc)} />
      </div>

      <div className="chip-row" role="group">
        <button type="button" className="chip" aria-pressed={!q.category} onClick={() => set({ category: '' })}>
          {t('explore.allCategories', undefined, loc)} <em>{scoped.length}</em>
        </button>
        {cats.map(c => (
          <button key={c.id} type="button" className="chip" aria-pressed={q.category === c.id} onClick={() => set({ category: q.category === c.id ? '' : c.id })}>
            {c.name.replace(/^\d+\.\s*/, '')} <em>{c.count}</em>
          </button>
        ))}
      </div>

      <div className="seg-control" role="group" aria-label={t('explore.sort', undefined, loc)}>
        {SORTS.map(sort => (
          <button key={sort} type="button" aria-pressed={q.sort === sort} onClick={() => set({ sort })}>
            {t(`explore.sort.${sort}` as TranslationKey, undefined, loc)}
          </button>
        ))}
      </div>

      <ul className="ex-list">
        {list.slice(0, limit).map(item => {
          const dist = distanceLabel(item, centre);
          return (
            <li key={item.id} className={`ex-row${current === item.id ? ' active' : ''}`}>
              <button type="button" className="ex-main" onClick={() => { v.setShowcase(item.id); onClose(); }} title={t('explore.model', undefined, loc)}>
                <span className="ex-icon"><Icon name={item.id.startsWith('station:') ? 'train' : 'cube'} size={18} /></span>
                <span className="ex-text">
                  <b>{cleanName(item.name)}</b>
                  <span>
                    {[item.group.replace(/^\d+\.\s*/, ''), item.district, item.levels ? t('explore.floors', { levels: item.levels }, loc) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {dist && <span className="ex-dist">{dist}</span>}
              </button>
              {item.at ? (
                <button type="button" className="icon-btn-round" onClick={() => { v.showItemOnMap(item.id); onClose(); }}
                  aria-label={t('explore.onMap', undefined, loc)} title={t('explore.onMap', undefined, loc)}>
                  <Icon name="mapPin" />
                </button>
              ) : (
                <span className="ex-flag" title={t('explore.modelOnly', undefined, loc)}>3D</span>
              )}
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="empty">{t('explore.empty', undefined, loc)}</p>}
      {list.length > limit && (
        <button type="button" className="btn-wide" onClick={() => setLimit(l => l + PAGE)}>
          {t('explore.more', { count: Math.min(PAGE, list.length - limit) }, loc)}
        </button>
      )}
      <p className="hint">{t('explore.tip', undefined, loc)}</p>
    </Sheet>
  );
}
