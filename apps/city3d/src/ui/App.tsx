/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { loadCity } from '@my-city/osm-import';
import { CityView } from '@view/CityView';
import { DEFAULT_AREA_ID, POV_MODES, type PovMode } from '@view/constants';
import { LOCALE_LABELS, PLACE_INFO_NAMES_I18N, STREET_LABEL_NAMES_I18N, t, type TranslationKey } from '@view/i18n';
import { lightOn } from '@view/lights';
import { PLACE_INFO_MODES, type PlaceInfoMode } from '@view/placeInfo';
import { isMobileDevice } from '@view/quality';
import { STREET_LABEL_MODES, type StreetLabelMode } from '@view/streetLabels';
import { LightsPanel } from './LightsPanel';
import { QualityPanel } from './QualityPanel';

let shared: CityView | null = null;
const view = () => (shared ??= new CityView(loadCity(DEFAULT_AREA_ID).city));
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shared?.unmount();
    shared = null;
  });
}

// Lucide-style crisp inline SVG icons
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.93 7.07 1.41-1.41m11.32-11.32 1.41-1.41" />
  </svg>
);

const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconSliders = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="10" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="8" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="12" y2="3" />
    <line x1="2" x2="6" y1="14" y2="14" />
    <line x1="10" x2="14" y1="8" y2="8" />
    <line x1="18" x2="22" y1="16" y2="16" />
  </svg>
);

const IconSignpost = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z" />
    <path d="M12 13v8" />
    <path d="M12 3v3" />
  </svg>
);

const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

const IconRotateCcw = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconRotateCw = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IconChevronDownPad = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconArrowLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const IconSeeThrough = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconGlobe = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const IconPov = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="9" />
    <line x1="4.93" y1="19.07" x2="9.88" y2="14.12" />
    <line x1="19.07" y1="19.07" x2="14.12" y2="14.12" />
  </svg>
);

const POV_MODE_I18N: Record<PovMode, { label: TranslationKey; sub?: TranslationKey; tag: string }> = {
  map: { label: 'pov.mode.map', tag: '3D' },
  'metro-cab': { label: 'pov.mode.metro-cab', sub: 'pov.sub.metro-cab', tag: 'METRO' },
  'metro-passenger': { label: 'pov.mode.metro-passenger', sub: 'pov.sub.metro-passenger', tag: 'METRO' },
  'drive-cabin': { label: 'pov.mode.drive-cabin', sub: 'pov.sub.drive-cabin', tag: 'CAR' },
  'drive-top': { label: 'pov.mode.drive-top', sub: 'pov.sub.drive-top', tag: 'CAR' },
};

export function App() {
  const v = view();
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const loc = s.locale;
  const host = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(() => !isMobileDevice());
  const [openMenu, setOpenMenu] = useState<'showcase' | 'place' | 'pov' | null>(null);
  const [scSearch, setScSearch] = useState('');
  const [scCat, setScCat] = useState<string>('ALL');
  const [plSearch, setPlSearch] = useState('');
  const [plCat, setPlCat] = useState<string>('ALL');
  const [activePlaceId, setActivePlaceId] = useState('home');
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    v.mount(host.current!);
    return () => v.unmount();
  }, [v]);

  useEffect(() => {
    const onDownOutside = (e: PointerEvent) => {
      if (openMenu && menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    addEventListener('pointerdown', onDownOutside);
    return () => removeEventListener('pointerdown', onDownOutside);
  }, [openMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, select, button')) {
        if (e.key === 'Escape' && openMenu) {
          setOpenMenu(null);
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && openMenu) { setOpenMenu(null); e.preventDefault(); return; }
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) { setPanel(p => !p); e.preventDefault(); return; }
      if (v.key(e)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => v.keyUp(e);
    addEventListener('keydown', onKey);
    addEventListener('keyup', onUp);
    const onBlur = () => { for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']) v.keyUp(new KeyboardEvent('keyup', { key: k })); };
    addEventListener('blur', onBlur);
    return () => { removeEventListener('keydown', onKey); removeEventListener('keyup', onUp); removeEventListener('blur', onBlur); };
  }, [v, openMenu]);

  const scGroups = useMemo(() => Array.from(new Set(v.showcases.map(x => x.group))), [v.showcases]);
  const plGroups = useMemo(() => Array.from(new Set(v.places.map(x => x.group))), [v.places]);
  const currentShowcase = s.showcase ? v.showcases.find(x => x.id === s.showcase) ?? null : null;
  const currentPlace = v.places.find(x => x.id === activePlaceId) ?? v.places[0]!;

  const filteredShowcases = useMemo(() => {
    const q = scSearch.trim().toLowerCase();
    return v.showcases.filter(item => {
      if (scCat !== 'ALL' && item.group !== scCat) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
    });
  }, [v.showcases, scSearch, scCat]);

  const filteredPlaces = useMemo(() => {
    const q = plSearch.trim().toLowerCase();
    return v.places.filter(item => {
      if (plCat !== 'ALL' && item.group !== plCat) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
    });
  }, [v.places, plSearch, plCat]);

  const signalLabel = {
    go: t('footer.signal.go', undefined, loc),
    wait: t('footer.signal.wait', undefined, loc),
    stop: t('footer.signal.stop', undefined, loc),
  } as const;

  const streetNames = STREET_LABEL_NAMES_I18N[loc];
  const placeNames = PLACE_INFO_NAMES_I18N[loc];

  return (
    <div className="shell">
      <header className="top" ref={menuWrapRef}>
        <b className="brand"><i className="dot" />My City · 3D</b>

        {/* Searchable & Categorized Popover for Công trình (Showcases) */}
        <div className="popover-wrap">
          <button
            type="button"
            className="picker-trigger"
            aria-expanded={openMenu === 'showcase'}
            aria-label={t('top.showcases.aria', undefined, loc)}
            onClick={() => setOpenMenu(m => (m === 'showcase' ? null : 'showcase'))}
          >
            <IconBox />
            <span className="picker-label">
              {currentShowcase ? currentShowcase.name : t('top.showcases', { count: v.showcases.length }, loc)}
            </span>
            <IconChevronDown />
          </button>
          {openMenu === 'showcase' && (
            <div className="popover-panel" role="dialog" aria-label={t('top.showcases.dialog', undefined, loc)}>
              <div className="popover-search">
                <IconSearch />
                <input
                  type="search"
                  placeholder={t('top.showcases.search', undefined, loc)}
                  value={scSearch}
                  onChange={e => setScSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="popover-tabs">
                <button
                  type="button"
                  aria-pressed={scCat === 'ALL'}
                  onClick={() => setScCat('ALL')}
                >
                  {t('top.showcases.all', { count: v.showcases.length }, loc)}
                </button>
                {scGroups.map(g => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={scCat === g}
                    onClick={() => setScCat(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="popover-list">
                <button
                  type="button"
                  className={`popover-item ${!s.showcase ? 'active' : ''}`}
                  onClick={() => {
                    v.setShowcase(null);
                    setOpenMenu(null);
                  }}
                >
                  <div className="popover-item-main">
                    <b>{t('top.showcases.mapTitle', undefined, loc)}</b>
                    <span>{t('top.showcases.mapSub', undefined, loc)}</span>
                  </div>
                  <em className="popover-tag">{t('top.showcases.mapTag', undefined, loc)}</em>
                </button>
                {filteredShowcases.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`popover-item ${s.showcase === item.id ? 'active' : ''}`}
                    onClick={() => {
                      v.setShowcase(item.id);
                      setOpenMenu(null);
                    }}
                  >
                    <div className="popover-item-main">
                      <b>{item.name}</b>
                      <span>{item.subtitle}</span>
                    </div>
                    <em className="popover-tag">{item.group}</em>
                  </button>
                ))}
                {filteredShowcases.length === 0 && (
                  <div className="popover-empty">{t('top.showcases.empty', undefined, loc)}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {currentShowcase && (
          <button type="button" className="icon-btn" onClick={() => v.setShowcase(null)} title={t('top.backToMap.title', undefined, loc)}>
            <IconArrowLeft />
            <span>{t('top.backToMap', undefined, loc)}</span>
          </button>
        )}

        {/* Searchable & Categorized Popover for Khu vực (Places / Districts / Metro Stations) */}
        <div className="popover-wrap">
          <button
            type="button"
            className="picker-trigger"
            aria-expanded={openMenu === 'place'}
            aria-label={t('top.places.aria', undefined, loc)}
            onClick={() => setOpenMenu(m => (m === 'place' ? null : 'place'))}
          >
            <IconMapPin />
            <span className="picker-label">{currentPlace.name}</span>
            <IconChevronDown />
          </button>
          {openMenu === 'place' && (
            <div className="popover-panel" role="dialog" aria-label={t('top.places.dialog', undefined, loc)}>
              <div className="popover-search">
                <IconSearch />
                <input
                  type="search"
                  placeholder={t('top.places.search', undefined, loc)}
                  value={plSearch}
                  onChange={e => setPlSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="popover-tabs">
                <button
                  type="button"
                  aria-pressed={plCat === 'ALL'}
                  onClick={() => setPlCat('ALL')}
                >
                  {t('top.places.all', { count: v.places.length }, loc)}
                </button>
                {plGroups.map(g => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={plCat === g}
                    onClick={() => setPlCat(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="popover-list">
                {filteredPlaces.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`popover-item ${activePlaceId === p.id ? 'active' : ''}`}
                    onClick={() => {
                      setActivePlaceId(p.id);
                      v.flyTo(p.at);
                      setOpenMenu(null);
                    }}
                  >
                    <div className="popover-item-main">
                      <b>{p.name}</b>
                    </div>
                    <em className="popover-tag">{p.group}</em>
                  </button>
                ))}
                {filteredPlaces.length === 0 && (
                  <div className="popover-empty">{t('top.places.empty', undefined, loc)}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* POV & Interactive Driving Picker */}
        <div className="popover-wrap">
          <button
            type="button"
            className="picker-trigger"
            aria-expanded={openMenu === 'pov'}
            aria-pressed={s.povMode !== 'map'}
            title={t('pov.button.title', undefined, loc)}
            onClick={() => setOpenMenu(m => (m === 'pov' ? null : 'pov'))}
          >
            <IconPov />
            <span className="picker-label">
              {s.povMode === 'map'
                ? t('pov.button', undefined, loc)
                : t(POV_MODE_I18N[s.povMode].label, undefined, loc)}
            </span>
            <kbd>P</kbd>
            <IconChevronDown />
          </button>
          {openMenu === 'pov' && (
            <div className="popover-panel" role="dialog" aria-label={t('pov.button', undefined, loc)}>
              <div className="popover-list">
                {POV_MODES.map(pm => {
                  const meta = POV_MODE_I18N[pm];
                  return (
                    <button
                      key={pm}
                      type="button"
                      className={`popover-item ${s.povMode === pm ? 'active' : ''}`}
                      onClick={() => {
                        v.setPovMode(pm);
                        setOpenMenu(null);
                      }}
                    >
                      <div className="popover-item-main">
                        <b>{t(meta.label, undefined, loc)}</b>
                        {meta.sub && <span>{t(meta.sub, undefined, loc)}</span>}
                      </div>
                      <em className="popover-tag">{meta.tag}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <label className="pick" title={t('top.streetLabels.title', undefined, loc)}>
          <IconSignpost />
          <span className="pick-title">{t('top.streetLabels', undefined, loc)}</span>
          <select
            aria-label={t('top.streetLabels', undefined, loc)}
            value={s.streetLabels}
            onChange={e => v.setStreetLabels(e.target.value as StreetLabelMode)}
          >
            {STREET_LABEL_MODES.map(m => (
              <option key={m} value={m}>{streetNames[m]}</option>
            ))}
          </select>
        </label>

        <label className="pick" title={t('top.placeInfo.title', undefined, loc)}>
          <IconInfo />
          <span className="pick-title">{t('top.placeInfo', undefined, loc)}</span>
          <select
            aria-label={t('top.placeInfo', undefined, loc)}
            value={s.placeInfo}
            onChange={e => v.setPlaceInfo(e.target.value as PlaceInfoMode)}
          >
            {PLACE_INFO_MODES.map(m => (
              <option key={m} value={m}>{placeNames[m]}</option>
            ))}
          </select>
        </label>

        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setActivePlaceId('home');
              v.flyTo([0, 0]);
            }}
            title={t('top.home.title', undefined, loc)}
            aria-label={t('top.home', undefined, loc)}
          >
            <IconHome />
            <span className="btn-text">{t('top.home', undefined, loc)}</span>
            <kbd>H</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => v.toggleMode()}
            aria-pressed={s.mode === '3d'}
            title={t('top.mode.title', undefined, loc)}
          >
            <span>{s.mode === '2d' ? '2D' : '3D'}</span>
            <kbd>V</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => v.toggleSeeThrough()}
            aria-pressed={s.seeThrough}
            title={t('top.seeThrough.title', undefined, loc)}
            aria-label={t('top.seeThrough', undefined, loc)}
          >
            <IconSeeThrough />
            <span className="btn-text">{t('top.seeThrough', undefined, loc)}</span>
            <kbd>X</kbd>
          </button>

          <button
            type="button"
            className="icon-only-btn"
            onClick={() => v.toggleDayNight()}
            aria-pressed={s.night}
            aria-label={s.night ? t('top.night.onTitle', undefined, loc) : t('top.night.offTitle', undefined, loc)}
            title={s.night ? t('top.night.onTitle', undefined, loc) : t('top.night.offTitle', undefined, loc)}
          >
            {s.night ? <IconMoon /> : <IconSun />}
            <kbd>N</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => v.toggleLocale()}
            title={t('top.locale.title', undefined, loc)}
            aria-label={t('top.locale.title', undefined, loc)}
          >
            <IconGlobe />
            <span>{LOCALE_LABELS[loc]}</span>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => setPanel(p => !p)}
            aria-pressed={panel}
            title={t('top.settings.title', undefined, loc)}
            aria-label={t('top.settings', undefined, loc)}
          >
            <IconSliders />
            <span className="btn-text">{t('top.settings', undefined, loc)}</span>
            <kbd>G</kbd>
          </button>
        </div>
      </header>
      <main>
        <div className="stage" ref={host} aria-label={t('stage.aria', { mode: s.mode }, loc)}>
          {currentShowcase && (
            <div className="plaque">
              <b>{currentShowcase.name}</b>
              <span>{currentShowcase.subtitle}</span>
            </div>
          )}

          {s.povMode !== 'map' && (
            <div className="pov-hud" onPointerDown={e => e.stopPropagation()}>
              <div className="pov-hud-top">
                <div className="pov-speed">
                  <strong>{s.povSpeedKmh}</strong>
                  <span>km/h</span>
                </div>
                <div className="pov-meta">
                  <b>{t(POV_MODE_I18N[s.povMode].label, undefined, loc)}</b>
                  {(s.povMode === 'metro-cab' || s.povMode === 'metro-passenger') && (
                    <span>
                      {t(`pov.status.${s.povTrainPhase}` as TranslationKey, undefined, loc)}
                    </span>
                  )}
                  {(s.povMode === 'drive-cabin' || s.povMode === 'drive-top') && (
                    <span>{t(POV_MODE_I18N[s.povMode].sub!, undefined, loc)}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="pov-exit-btn"
                  onClick={() => v.setPovMode('map')}
                >
                  {t('pov.hud.exit', undefined, loc)}
                </button>
              </div>

              <div className="pov-hud-modes">
                {(['metro-cab', 'metro-passenger', 'drive-cabin', 'drive-top'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    aria-pressed={s.povMode === pm}
                    onClick={() => v.setPovMode(pm)}
                  >
                    {t(POV_MODE_I18N[pm].label, undefined, loc)}
                  </button>
                ))}
              </div>

              <div className="pov-hud-actions">
                {(s.povMode === 'metro-cab' || s.povMode === 'metro-passenger') && (
                  <button
                    type="button"
                    onClick={() => v.nextPovTrain()}
                  >
                    {t('pov.hud.nextTrain', { index: s.povTrainIndex + 1, total: s.povTrainTotal }, loc)}
                  </button>
                )}
                {s.povMode === 'metro-passenger' && (
                  <button
                    type="button"
                    onClick={() => v.togglePovWindowSide()}
                  >
                    {t('pov.hud.windowSide', undefined, loc)}
                  </button>
                )}
                {(s.povMode === 'drive-cabin' || s.povMode === 'drive-top') && (
                  <>
                    <button
                      type="button"
                      onClick={() => v.toggleDriveCamera()}
                    >
                      {t('pov.hud.switchDriveCam', undefined, loc)}
                    </button>
                    <button
                      type="button"
                      onClick={() => v.resetPovCar()}
                    >
                      {t('pov.hud.resetCar', undefined, loc)}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => v.centerPovLook()}
                >
                  {t('pov.hud.centerLook', undefined, loc)}
                </button>
              </div>
            </div>
          )}

          {(s.povMode === 'drive-cabin' || s.povMode === 'drive-top') && (
            <div className="drive-touch-pad" onPointerDown={e => e.stopPropagation()}>
              <div className="drive-steer-group">
                <button
                  type="button"
                  className="drive-pad-btn"
                  onPointerDown={() => { v.setDriveTouchControl('left', true); v.setDriveTouchControl('right', false); }}
                  onPointerUp={() => v.setDriveTouchControl('left', false)}
                  onPointerCancel={() => v.setDriveTouchControl('left', false)}
                  onPointerLeave={() => v.setDriveTouchControl('left', false)}
                  aria-label="Steer Left"
                >
                  ◄ A
                </button>
                <button
                  type="button"
                  className="drive-pad-btn"
                  onPointerDown={() => { v.setDriveTouchControl('right', true); v.setDriveTouchControl('left', false); }}
                  onPointerUp={() => v.setDriveTouchControl('right', false)}
                  onPointerCancel={() => v.setDriveTouchControl('right', false)}
                  onPointerLeave={() => v.setDriveTouchControl('right', false)}
                  aria-label="Steer Right"
                >
                  D ►
                </button>
              </div>
              <div className="drive-pedal-group">
                <button
                  type="button"
                  className="drive-pad-btn brake"
                  onPointerDown={() => { v.setDriveTouchControl('brake', true); v.setDriveTouchControl('throttle', false); }}
                  onPointerUp={() => v.setDriveTouchControl('brake', false)}
                  onPointerCancel={() => v.setDriveTouchControl('brake', false)}
                  onPointerLeave={() => v.setDriveTouchControl('brake', false)}
                  aria-label="Brake / Reverse"
                >
                  ▼ S
                </button>
                <button
                  type="button"
                  className="drive-pad-btn throttle"
                  onPointerDown={() => { v.setDriveTouchControl('throttle', true); v.setDriveTouchControl('brake', false); }}
                  onPointerUp={() => v.setDriveTouchControl('throttle', false)}
                  onPointerCancel={() => v.setDriveTouchControl('throttle', false)}
                  onPointerLeave={() => v.setDriveTouchControl('throttle', false)}
                  aria-label="Throttle"
                >
                  ▲ W
                </button>
              </div>
            </div>
          )}

          {s.povMode === 'map' && (
            <div className="cam-pad" role="group" aria-label={t('cam.aria', undefined, loc)}>
              <button type="button" onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'} title={t('top.mode.title', undefined, loc)}>
                {s.mode === '2d' ? '2D' : '3D'}
              </button>
              <button type="button" onClick={() => v.zoom(1.28)} title={t('cam.zoomIn', undefined, loc)} aria-label={t('cam.zoomIn', undefined, loc)}>
                <IconPlus />
              </button>
              <button type="button" onClick={() => v.zoom(1 / 1.28)} title={t('cam.zoomOut', undefined, loc)} aria-label={t('cam.zoomOut', undefined, loc)}>
                <IconMinus />
              </button>
              <button type="button" onClick={() => v.rotate(-1)} title={t('cam.rotLeft', undefined, loc)} aria-label={t('cam.rotLeft', undefined, loc)}>
                <IconRotateCcw />
              </button>
              <button type="button" onClick={() => v.rotate(1)} title={t('cam.rotRight', undefined, loc)} aria-label={t('cam.rotRight', undefined, loc)}>
                <IconRotateCw />
              </button>
              <button type="button" onClick={() => v.tilt(1)} title={t('cam.tiltUp', undefined, loc)} aria-label={t('cam.tiltUp', undefined, loc)}>
                <IconChevronUp />
              </button>
              <button type="button" onClick={() => v.tilt(-1)} title={t('cam.tiltDown', undefined, loc)} aria-label={t('cam.tiltDown', undefined, loc)}>
                <IconChevronDownPad />
              </button>
            </div>
          )}
        </div>
        {panel && (
          <aside className="panel">
            <LightsPanel lights={s.lights} locale={loc} onChange={p => v.setLights(p)} />
            <QualityPanel
              quality={s.quality}
              streetLabels={s.streetLabels}
              placeInfo={s.placeInfo}
              seeThrough={s.seeThrough}
              locale={loc}
              stats={s.stats}
              detail={s.detail}
              pending={s.pending}
              lowered={s.lowered}
              onChange={q => v.setQuality(q)}
              onStreetLabels={m => v.setStreetLabels(m)}
              onPlaceInfo={m => v.setPlaceInfo(m)}
              onSeeThrough={on => v.setSeeThrough(on)}
            />
          </aside>
        )}
      </main>
      <footer>
        <span className="hint">
          {s.povMode === 'metro-cab' || s.povMode === 'metro-passenger'
            ? t('pov.hint.metro', undefined, loc)
            : s.povMode === 'drive-cabin' || s.povMode === 'drive-top'
              ? t('pov.hint.drive', undefined, loc)
              : t(s.mode === '3d' ? 'footer.hint.3d' : 'footer.hint.2d', undefined, loc)}
        </span>
        <span className="read">
          {currentShowcase
            ? `${t('footer.diorama', undefined, loc)} · ${currentShowcase.name}`
            : v.city.cityName ?? t('footer.cityMap', undefined, loc)}{' '}
          · {s.povMode !== 'map' ? `${t(POV_MODE_I18N[s.povMode].label, undefined, loc)} · ${s.povSpeedKmh} km/h` : `${s.mode} · ${t('footer.angle', undefined, loc)} ${s.mode === '2d' ? s.view : `${s.heading}°`}`} · L{s.detail} · {t('footer.litWindows', undefined, loc)}{' '}
          {lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%
          {s.lit ? ` + ${s.lit} ${t('footer.floors', undefined, loc)}` : ''}
          {!currentShowcase
            ? ` · ${s.vehicles} ${t('footer.vehicles', undefined, loc)} · X ${signalLabel[s.signals.x]} ${s.signals.xLeft}s · Y ${signalLabel[s.signals.y]} ${s.signals.yLeft}s`
            : ''}{' '}
          · {s.fps} fps
        </span>
        <span className="credit">© OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
