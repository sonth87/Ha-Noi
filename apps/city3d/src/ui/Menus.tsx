/* The two short menus of the top bar: places to fly to, and the immersive views (ADR-063). Entering a view only
   ever happens from here, from Pegman dropped on the map, or the POV bar: never from a single key or a tap. */
import { useMemo, useState } from 'react';
import type { CityView } from '@view/CityView';
import { matchesText } from '@view/explore';
import { t, type Locale, type TranslationKey } from '@view/i18n';
import type { PovMode } from '@view/constants';
import { Icon, type IconName } from './icons';
import { Sheet } from './Sheet';

export function PlacesMenu({ v, locale: loc, onClose }: { v: CityView; locale: Locale; onClose: () => void }) {
  const places = v.places;
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const groups = useMemo(() => [...new Set(places.map(p => p.group))], [places]);
  const list = places.filter(p => (!group || p.group === group) && matchesText(`${p.name} ${p.group}`, search));
  return (
    <Sheet title={t('places.title', undefined, loc)} closeLabel={t('ui.close', undefined, loc)} onClose={onClose} className="places">
      <div className="search-field">
        <Icon name="search" />
        <input type="search" value={search} placeholder={t('top.places.search', undefined, loc)} onChange={e => setSearch(e.target.value)} aria-label={t('top.places.search', undefined, loc)} />
      </div>
      <div className="chip-row" role="group">
        <button type="button" className="chip" aria-pressed={!group} onClick={() => setGroup('')}>{t('explore.allCategories', undefined, loc)} <em>{places.length}</em></button>
        {groups.map(g => <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? '' : g)}>{g}</button>)}
      </div>
      <ul className="ex-list">
        {list.map(p => (
          <li key={p.id} className="ex-row">
            <button type="button" className="ex-main" onClick={() => { v.flyTo(p.at); onClose(); }}>
              <span className="ex-icon"><Icon name={p.group === t('top.places.metroGroup', undefined, loc) ? 'train' : 'mapPin'} size={18} /></span>
              <span className="ex-text"><b>{p.name}</b><span>{p.group}</span></span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="empty">{t('top.places.empty', undefined, loc)}</p>}
    </Sheet>
  );
}

export const POV_LABEL: Record<PovMode, { label: TranslationKey; sub?: TranslationKey; icon: IconName }> = {
  map: { label: 'pov.mode.map', icon: 'layers' },
  'metro-cab': { label: 'pov.mode.metro-cab', sub: 'pov.sub.metro-cab', icon: 'train' },
  'metro-passenger': { label: 'pov.mode.metro-passenger', sub: 'pov.sub.metro-passenger', icon: 'eye' },
  'drive-cabin': { label: 'pov.mode.drive-cabin', sub: 'pov.sub.drive-cabin', icon: 'car' },
  'drive-inside': { label: 'pov.mode.drive-inside', sub: 'pov.sub.drive-inside', icon: 'view' },
};

export function PovMenu({ v, locale: loc, active, onClose }: { v: CityView; locale: Locale; active: PovMode; onClose: () => void }) {
  return (
    <Sheet title={t('pov.menu.title', undefined, loc)} closeLabel={t('ui.close', undefined, loc)} onClose={onClose} className="pov-menu">
      <ul className="mode-list">
        {(['metro-cab', 'metro-passenger', 'drive-cabin', 'drive-inside'] as const).map(pm => (
          <li key={pm}>
            <button type="button" className="mode-card" aria-pressed={active === pm} onClick={() => { v.setPovMode(pm); onClose(); }}>
              <span className="mode-icon"><Icon name={POV_LABEL[pm].icon} size={22} /></span>
              <span className="ex-text"><b>{t(POV_LABEL[pm].label, undefined, loc)}</b><span>{t(POV_LABEL[pm].sub!, undefined, loc)}</span></span>
              <Icon name="chevronRight" />
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">{t('pov.menu.dragHint', undefined, loc)}</p>
      <p className="hint">{t('pov.menu.exitHint', undefined, loc)}</p>
    </Sheet>
  );
}
