/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { roadNetwork, streetFurniture } from '@my-city/core';
import { loadCitySkeletonAsync, loadCityStreamingInitAsync } from '@my-city/osm-import';
import { MAP_PALETTES, PALETTES, accentKey } from '@my-city/theme';
import { CityView, type PegmanDropPreview } from '@view/CityView';
import { DEFAULT_AREA_ID, POV_MODES, type PovMode } from '@view/constants';
import { LOCALE_LABELS, PLACE_INFO_NAMES_I18N, STREET_LABEL_NAMES_I18N, getLocale, t, type TranslationKey } from '@view/i18n';
import { lightOn } from '@view/lights';
import { PLACE_INFO_MODES, type PlaceInfoMode } from '@view/placeInfo';
import { isMobileDevice } from '@view/quality';
import { STREET_LABEL_MODES, type StreetLabelMode } from '@view/streetLabels';
import { frameForCity, parseUrlState } from '@view/urlState';
import { LightsPanel } from './LightsPanel';
import { LoadingScreen, type LoadingProgress } from './LoadingScreen';
import { QualityPanel } from './QualityPanel';
import {
  applyUiGlassToRoot,
  loadUiGlassSettings,
  saveUiGlassSettings,
  type UiGlassMode,
  type UiGlassSettings,
} from './liquidGlass';

let shared: CityView | null = null;
let sharedPromise: Promise<CityView> | null = null;

const yieldToBrowser = () =>
  new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 16));
    } else {
      setTimeout(resolve, 16);
    }
  });

function computeInitialViewportChunkKeys(): string[] {
  const frame = frameForCity(DEFAULT_AREA_ID);
  const initUrl = typeof window !== 'undefined' ? parseUrlState(window.location, frame) : null;
  const x = initUrl?.x ?? 0;
  const z = initUrl?.z ?? 0;
  const cx = Math.floor(x / 1024);
  const cy = Math.floor(z / 1024);
  // Load the 2x2 neighborhood of 1024m × 1024m chunks closest to the initial camera target
  const dx = x - (cx + 0.5) * 1024 >= 0 ? 1 : -1;
  const dy = z - (cy + 0.5) * 1024 >= 0 ? 1 : -1;
  return [
    `${cx},${cy}`,
    `${cx + dx},${cy}`,
    `${cx},${cy + dy}`,
    `${cx + dx},${cy + dy}`,
  ];
}

function loadSharedViewAsync(onProgress: (p: LoadingProgress) => void): Promise<CityView> {
  if (shared) return Promise.resolve(shared);
  if (sharedPromise) return sharedPromise;

  const isEn = getLocale() === 'en';
  sharedPromise = (async () => {
    try {
      onProgress({
        step: 1,
        percent: 22,
        label: isEn ? '1/5 · Loading Hanoi OpenStreetMap data...' : '1/5 · Đang tải dữ liệu khung bản đồ Hà Nội...',
      });
      await yieldToBrowser();
      await loadCitySkeletonAsync(DEFAULT_AREA_ID);

      onProgress({
        step: 2,
        percent: 48,
        label: isEn ? '2/5 · Decoding buildings, lakes & terrain...' : '2/5 · Đang giải mã công trình, sông hồ & địa hình...',
      });
      await yieldToBrowser();
      const initialChunkKeys = computeInitialViewportChunkKeys();
      const { city, loadedChunks } = await loadCityStreamingInitAsync(DEFAULT_AREA_ID, initialChunkKeys);
      const counts = {
        buildings: city.buildings.length,
        streets: city.streets.length,
        stations: city.stations.length,
      };

      onProgress({
        step: 3,
        percent: 72,
        label: isEn ? '3/5 · Building road network, flyovers & Metro...' : '3/5 · Đang dựng mạng lưới giao thông & tuyến Metro...',
        counts,
      });
      await yieldToBrowser();
      const net = roadNetwork(city);
      await yieldToBrowser();
      streetFurniture(city, net);

      onProgress({
        step: 4,
        percent: 92,
        label: isEn ? '4/5 · Initializing 3D landmarks & place catalog...' : '4/5 · Đang khởi tạo công trình biểu tượng & địa danh...',
        counts,
      });
      await yieldToBrowser();
      const built = new CityView(city, loadedChunks);

      onProgress({
        step: 5,
        percent: 100,
        label: isEn ? '5/5 · Entering 3D Hanoi Map...' : '5/5 · Đang hoàn tất khung cảnh 3D...',
        counts,
      });
      await new Promise<void>(resolve => setTimeout(resolve, 180));
      shared = built;
      return built;
    } catch (err) {
      sharedPromise = null;
      throw err;
    }
  })();

  return sharedPromise;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shared?.dispose();
    shared = null;
    sharedPromise = null;
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconMinus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

const IconRotateCw = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

/** Rotating compass needle (North red/accent tip + South light tip) */
const IconCompassNeedle = ({ heading }: { heading: number }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="compass-needle-svg"
    style={{ transform: `rotate(${-heading}deg)` }}
  >
    <polygon points="12,2.2 15.4,12 8.6,12" className="compass-north-tip" />
    <polygon points="12,21.8 15.4,12 8.6,12" className="compass-south-tip" />
    <circle cx="12" cy="12" r="1.8" className="compass-pivot" />
  </svg>
);

/** Google Maps–style crosshair "My Location" icon */
const IconMyLocation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
  </svg>
);

/** Google Maps–style Pegman standing figure icon for drag-and-drop Street / Metro POV */
const IconPegman = () => (
  <svg width="18" height="20" viewBox="0 0 24 26" fill="currentColor" aria-hidden="true" className="pegman-svg">
    <circle cx="12" cy="4.6" r="3.3" />
    <path d="M8.2 9.2c-1.3 0-2.3 1-2.3 2.3v4.4c0 .8.6 1.4 1.3 1.4h.9v6.1c0 .9.7 1.6 1.6 1.6h.8c.8 0 1.4-.6 1.4-1.4v-4.6h.2v4.6c0 .8.6 1.4 1.4 1.4h.8c.9 0 1.6-.7 1.6-1.6v-6.1h.9c.7 0 1.3-.6 1.3-1.4v-4.4c0-1.3-1-2.3-2.3-2.3H8.2Z" />
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
  const [readyView, setReadyView] = useState<CityView | null>(() => shared);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<LoadingProgress>(() => {
    const isEn = getLocale() === 'en';
    return {
      step: 1,
      percent: 0,
      label: isEn ? '1/5 · Loading Hanoi OpenStreetMap data...' : '1/5 · Đang tải dữ liệu bản đồ Hà Nội...',
    };
  });

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('city3d-theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (readyView) return;
    let cancelled = false;
    loadSharedViewAsync(p => {
      if (!cancelled) setProgress(p);
    })
      .then(v => {
        if (!cancelled) setReadyView(v);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setProgress(prev => ({
          ...prev,
          error:
            getLocale() === 'en'
              ? `Failed to load 3D map data (${msg}). Please check your connection and try again.`
              : `Không thể nạp dữ liệu bản đồ 3D (${msg}). Vui lòng kiểm tra kết nối mạng và thử lại.`,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [readyView, attempt]);

  if (!readyView) {
    return (
      <LoadingScreen
        progress={progress}
        onRetry={() => {
          setProgress(prev => ({ ...prev, error: null, percent: 8, step: 1 }));
          setAttempt(a => a + 1);
        }}
      />
    );
  }

  return <AppShell view={readyView} />;
}

function AppShell({ view: v }: { view: CityView }) {
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const loc = s.locale;
  const host = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(() => !isMobileDevice());
  const [drawerTab, setDrawerTab] = useState<'appearance' | 'lights' | 'quality'>('appearance');
  const [uiGlass, setUiGlass] = useState<UiGlassSettings>(() => loadUiGlassSettings());
  const [openMenu, setOpenMenu] = useState<'showcase' | 'place' | 'pov' | null>(null);
  const [scSearch, setScSearch] = useState('');
  const [scCat, setScCat] = useState<string>('ALL');
  const [plSearch, setPlSearch] = useState('');
  const [plCat, setPlCat] = useState<string>('ALL');
  const [activePlaceId, setActivePlaceId] = useState('home');
  const [pegmanDrag, setPegmanDrag] = useState<{
    clientX: number;
    clientY: number;
    preview: PegmanDropPreview | null;
  } | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const updateUiGlass = (patch: Partial<UiGlassSettings>) => {
    setUiGlass(prev => {
      const next = { ...prev, ...patch };
      saveUiGlassSettings(next);
      return next;
    });
  };

  useEffect(() => {
    v.mount(host.current!);
    return () => v.unmount();
  }, [v]);

  useEffect(() => {
    applyUiGlassToRoot(shellRef.current, uiGlass);
  }, [uiGlass, panel, drawerTab, openMenu, s.showcase, s.povMode]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      applyUiGlassToRoot(el, uiGlass);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [uiGlass]);

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
    <div className="shell" ref={shellRef}>
      <main>
        <div className="stage" ref={host} aria-label={t('stage.aria', { mode: s.mode }, loc)}>
          {/* Floating Top-Left Navigation Pill & Top-Right Quick Actions Pill */}
          <header className="floating-top" ref={menuWrapRef} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
            <div className="top-left-anchor">
              <div className="top-left-bar ui-surface">
                <b className="brand"><i className="dot" />My City · 3D</b>
                <span className="bar-sep" aria-hidden="true" />

                {/* Searchable & Categorized Popover Trigger for Khu vực */}
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
                </div>

                {/* Searchable & Categorized Popover Trigger for Công trình (Showcases) */}
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
                </div>

                {currentShowcase && (
                  <button type="button" className="icon-btn" onClick={() => v.setShowcase(null)} title={t('top.backToMap.title', undefined, loc)}>
                    <IconArrowLeft />
                    <span className="btn-text">{t('top.backToMap', undefined, loc)}</span>
                  </button>
                )}

                {/* POV & Interactive Driving Picker Trigger */}
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
                </div>

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
              </div>

              {openMenu === 'place' && (
                <div className="popover-panel ui-surface" role="dialog" aria-label={t('top.places.dialog', undefined, loc)}>
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

              {openMenu === 'showcase' && (
                <div className="popover-panel ui-surface" role="dialog" aria-label={t('top.showcases.dialog', undefined, loc)}>
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

              {openMenu === 'pov' && (
                <div className="popover-panel ui-surface" role="dialog" aria-label={t('pov.button', undefined, loc)}>
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

            {/* Top-Right Quick Actions Pill: Visual Map Color Swatches + X-ray + Day/Night + Locale + Settings Drawer */}
            <div className="top-right-bar ui-surface">
              <div className="palette-swatch-bar" role="group" aria-label={t('drawer.mapColors', undefined, loc)}>
                {MAP_PALETTES.map(([id, swatches]) => {
                  const titleKey = `top.palette.${id}` as TranslationKey;
                  const active = s.mapPalette === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`swatch-pill-btn ${active ? 'active' : ''}`}
                      aria-pressed={active}
                      title={t(titleKey, undefined, loc)}
                      aria-label={t(titleKey, undefined, loc)}
                      onClick={() => v.setMapPalette(id)}
                    >
                      <span className="swatch-quad" aria-hidden="true">
                        {swatches.map((c, idx) => (
                          <i key={idx} style={{ background: c }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="bar-sep" aria-hidden="true" />

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

          {/* Floating Right Tabbed Settings Drawer */}
          {panel && (
            <aside className="panel ui-surface" onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
              <div className="drawer-header">
                <div className="drawer-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={drawerTab === 'appearance'}
                    aria-pressed={drawerTab === 'appearance'}
                    onClick={() => setDrawerTab('appearance')}
                  >
                    {t('drawer.tab.appearance', undefined, loc)}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={drawerTab === 'lights'}
                    aria-pressed={drawerTab === 'lights'}
                    onClick={() => setDrawerTab('lights')}
                  >
                    {t('drawer.tab.lights', undefined, loc)}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={drawerTab === 'quality'}
                    aria-pressed={drawerTab === 'quality'}
                    onClick={() => setDrawerTab('quality')}
                  >
                    {t('drawer.tab.quality', undefined, loc)}
                  </button>
                </div>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setPanel(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="drawer-body">
                {drawerTab === 'appearance' && (
                  <>
                    <section>
                      <h2>{t('drawer.uiSurface', undefined, loc)}</h2>
                      <div className="ui-mode-seg" role="group" aria-label={t('drawer.uiSurface', undefined, loc)}>
                        {(['off', 'tint', 'glass'] as const).map((m: UiGlassMode) => {
                          const key = `drawer.uiMode.${m}` as TranslationKey;
                          return (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={uiGlass.mode === m}
                              onClick={() => updateUiGlass({ mode: m })}
                            >
                              {t(key, undefined, loc)}
                            </button>
                          );
                        })}
                      </div>

                      {uiGlass.mode !== 'off' && (
                        <label className="opt slider-row">
                          <span>{t('drawer.uiTransparency', undefined, loc)}</span>
                          <input
                            type="range"
                            min={10}
                            max={90}
                            step={5}
                            value={uiGlass.transparency}
                            onChange={e => updateUiGlass({ transparency: +e.target.value })}
                          />
                          <strong className="slider-val">{uiGlass.transparency}%</strong>
                        </label>
                      )}

                      {uiGlass.mode === 'glass' && (
                        <label className="opt slider-row">
                          <span>{t('drawer.uiLensScale', undefined, loc)}</span>
                          <input
                            type="range"
                            min={0}
                            max={180}
                            step={10}
                            value={uiGlass.lensScale}
                            onChange={e => updateUiGlass({ lensScale: +e.target.value })}
                          />
                          <strong className="slider-val">{uiGlass.lensScale}</strong>
                        </label>
                      )}
                    </section>

                    <section>
                      <h2>{t('drawer.mapColors', undefined, loc)}</h2>
                      <div className="palette-grid" role="group" aria-label={t('drawer.mapColors', undefined, loc)}>
                        {MAP_PALETTES.map(([id, swatches]) => {
                          const labelKey = `top.palette.${id}` as TranslationKey;
                          const active = s.mapPalette === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`palette-card ${active ? 'active' : ''}`}
                              aria-pressed={active}
                              onClick={() => v.setMapPalette(id)}
                            >
                              <div className="palette-bars" aria-hidden="true">
                                {swatches.map((c, idx) => (
                                  <i key={idx} style={{ background: c }} />
                                ))}
                              </div>
                              <span className="palette-card-label">{t(labelKey, undefined, loc)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h2>{t('drawer.accentColors', undefined, loc)}</h2>
                      <div className="accent-grid" role="group" aria-label={t('drawer.accentColors', undefined, loc)}>
                        {PALETTES.city.map(a => {
                          const key = accentKey(a);
                          const [name, , darkHi, lightAccent] = a;
                          const active = s.accent === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`accent-swatch ${active ? 'active' : ''}`}
                              aria-pressed={active}
                              title={name}
                              aria-label={name}
                              onClick={() => v.setAccent(key)}
                            >
                              <span
                                className="accent-dot"
                                style={{ background: s.night ? darkHi : lightAccent }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h2>{t('drawer.mapDisplay', undefined, loc)}</h2>
                      <label className="opt" title={t('top.streetLabels.title', undefined, loc)}>
                        <IconSignpost />
                        <span>{t('top.streetLabels', undefined, loc)}</span>
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
                      <label className="opt" title={t('top.placeInfo.title', undefined, loc)}>
                        <IconInfo />
                        <span>{t('top.placeInfo', undefined, loc)}</span>
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
                      <label className="opt switch-row" title={t('top.seeThrough.title', undefined, loc)}>
                        <span>{t('top.seeThrough', undefined, loc)} <kbd>X</kbd></span>
                        <input
                          type="checkbox"
                          className="switch-input"
                          checked={s.seeThrough}
                          onChange={e => v.setSeeThrough(e.target.checked)}
                        />
                      </label>
                    </section>
                  </>
                )}

                {drawerTab === 'lights' && (
                  <LightsPanel lights={s.lights} locale={loc} onChange={p => v.setLights(p)} />
                )}

                {drawerTab === 'quality' && (
                  <QualityPanel
                    quality={s.quality}
                    locale={loc}
                    stats={s.stats}
                    detail={s.detail}
                    pending={s.pending}
                    lowered={s.lowered}
                    onChange={q => v.setQuality(q)}
                  />
                )}
              </div>
            </aside>
          )}

          {currentShowcase && (
            <div className="plaque ui-surface">
              <b>{currentShowcase.name}</b>
              <span>{currentShowcase.subtitle}</span>
            </div>
          )}

          {s.povMode !== 'map' && (
            <>
              <div className="pov-hud ui-surface" onPointerDown={e => e.stopPropagation()}>
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
                        {s.povLocationName ? ` · ${s.povLocationName}` : ''}
                      </span>
                    )}
                    {(s.povMode === 'drive-cabin' || s.povMode === 'drive-top') && (
                      <span>
                        {s.povLocationName ? `${s.povLocationName} · ` : ''}
                        {t(POV_MODE_I18N[s.povMode].sub!, undefined, loc)}
                      </span>
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

              <div className="pov-minimap-wrap" onPointerDown={e => e.stopPropagation()}>
                <canvas
                  ref={el => v.setMiniMapCanvas(el)}
                  className="pov-minimap-canvas"
                />
                {s.povLocationName && (
                  <div className="pov-minimap-label ui-surface">{s.povLocationName}</div>
                )}
              </div>
            </>
          )}

          {(s.povMode === 'drive-cabin' || s.povMode === 'drive-top') && (
            <div className="drive-touch-pad" onPointerDown={e => e.stopPropagation()}>
              <div className="drive-steer-group ui-surface">
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
              <div className="drive-pedal-group ui-surface">
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
            <>
              {pegmanDrag?.preview && (
                <div
                  className="pegman-drop-target"
                  data-kind={pegmanDrag.preview.kind}
                  style={{
                    transform: `translate3d(${pegmanDrag.preview.screenX.toFixed(1)}px, ${pegmanDrag.preview.screenY.toFixed(1)}px, 0)`,
                  }}
                >
                  <span className="pegman-target-ring" />
                  <span className="pegman-target-core" />
                </div>
              )}

              {pegmanDrag && (
                <div
                  className="pegman-drag-ghost"
                  data-kind={pegmanDrag.preview?.kind ?? 'car'}
                  style={{
                    transform: `translate3d(${pegmanDrag.clientX.toFixed(1)}px, ${pegmanDrag.clientY.toFixed(1)}px, 0)`,
                  }}
                >
                  <div className="pegman-ghost-figure">
                    <IconPegman />
                  </div>
                  <div className="pegman-ghost-badge">
                    {pegmanDrag.preview
                      ? pegmanDrag.preview.kind === 'metro'
                        ? t(
                            'cam.pegman.dropMetro',
                            { train: pegmanDrag.preview.trainIndex + 1, label: pegmanDrag.preview.label },
                            loc,
                          )
                        : t('cam.pegman.dropCar', { label: pegmanDrag.preview.label }, loc)
                      : t('cam.pegman.hint', undefined, loc)}
                  </div>
                </div>
              )}

              <div
                className="map-dock"
                role="group"
                aria-label={t('cam.aria', undefined, loc)}
                onPointerDown={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="dock-btn compass-btn ui-surface"
                  onClick={() => v.resetNorth()}
                  title={t(
                    'cam.compass',
                    { dir: t(`cam.dir.${s.view}` as TranslationKey, undefined, loc), deg: s.heading },
                    loc,
                  )}
                  aria-label={t(
                    'cam.compass',
                    { dir: t(`cam.dir.${s.view}` as TranslationKey, undefined, loc), deg: s.heading },
                    loc,
                  )}
                >
                  <IconCompassNeedle heading={s.heading} />
                  <span className="compass-dir-tag">
                    {t(`cam.dir.${s.view}` as TranslationKey, undefined, loc).slice(0, 1)}
                  </span>
                </button>

                <button
                  type="button"
                  className="dock-btn rot90-btn ui-surface"
                  onClick={e => v.rotate(e.shiftKey ? -1 : 1)}
                  title={t('cam.rot90', undefined, loc)}
                  aria-label={t('cam.rot90', undefined, loc)}
                >
                  <IconRotateCw />
                  <span className="rot90-tag">90°</span>
                </button>

                {!s.showcase && (
                  <button
                    type="button"
                    className="dock-btn loc-btn ui-surface"
                    onClick={() => v.goToMyLocation()}
                    title={t('cam.myLocation', undefined, loc)}
                    aria-label={t('cam.myLocation', undefined, loc)}
                  >
                    <IconMyLocation />
                  </button>
                )}

                <div className="dock-zoom-pill ui-surface">
                  <button
                    type="button"
                    className="dock-zoom-btn"
                    onClick={() => v.zoom(1.28)}
                    title={t('cam.zoomIn', undefined, loc)}
                    aria-label={t('cam.zoomIn', undefined, loc)}
                  >
                    <IconPlus />
                  </button>
                  <span className="dock-zoom-sep" aria-hidden="true" />
                  <button
                    type="button"
                    className="dock-zoom-btn"
                    onClick={() => v.zoom(1 / 1.28)}
                    title={t('cam.zoomOut', undefined, loc)}
                    aria-label={t('cam.zoomOut', undefined, loc)}
                  >
                    <IconMinus />
                  </button>
                </div>

                <button
                  type="button"
                  className="dock-btn mode3d-btn ui-surface"
                  onClick={() => v.toggleMode()}
                  aria-pressed={s.mode === '3d'}
                  title={t('top.mode.title', undefined, loc)}
                >
                  {s.mode === '2d' ? '2D' : '3D'}
                </button>

                {!s.showcase && (
                  <button
                    type="button"
                    className={`dock-btn pegman-btn ui-surface${pegmanDrag ? ' is-dragging' : ''}`}
                    title={t('cam.pegman', undefined, loc)}
                    aria-label={t('cam.pegman', undefined, loc)}
                    onPointerDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      setPegmanDrag({
                        clientX: startX,
                        clientY: startY,
                        preview: v.previewPegmanDrop(startX, startY),
                      });

                      const onMove = (ev: PointerEvent) => {
                        setPegmanDrag({
                          clientX: ev.clientX,
                          clientY: ev.clientY,
                          preview: v.previewPegmanDrop(ev.clientX, ev.clientY),
                        });
                      };
                      const onEnd = (ev: PointerEvent) => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onEnd);
                        window.removeEventListener('pointercancel', onEnd);
                        setPegmanDrag(null);
                        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
                        if (moved > 8) {
                          v.dropPegmanAt(ev.clientX, ev.clientY);
                        } else if (host.current) {
                          const r = host.current.getBoundingClientRect();
                          v.dropPegmanAt(r.left + r.width * 0.5, r.top + r.height * 0.5);
                        }
                      };
                      window.addEventListener('pointermove', onMove);
                      window.addEventListener('pointerup', onEnd);
                      window.addEventListener('pointercancel', onEnd);
                    }}
                  >
                    <IconPegman />
                  </button>
                )}
              </div>
            </>
          )}

          {/* Bottom-Left Compact Status Pill with OSM Credit (A15) */}
          <footer className="status-pill ui-surface" onPointerDown={e => e.stopPropagation()}>
            <span className="fps-badge">{s.fps} fps</span>
            <span className="read">
              {currentShowcase
                ? `${t('footer.diorama', undefined, loc)} · ${currentShowcase.name}`
                : v.city.cityName ?? t('footer.cityMap', undefined, loc)}{' '}
              · {s.povMode !== 'map' ? `${t(POV_MODE_I18N[s.povMode].label, undefined, loc)} · ${s.povSpeedKmh} km/h` : `${s.mode.toUpperCase()} · ${t(`cam.dir.${s.view}` as TranslationKey, undefined, loc)} (${s.heading}°)`} · L{s.detail} · {t('footer.litWindows', undefined, loc)}{' '}
              {lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%
              {s.lit ? ` + ${s.lit} ${t('footer.floors', undefined, loc)}` : ''}
              {!currentShowcase
                ? ` · ${s.vehicles} ${t('footer.vehicles', undefined, loc)} · X:${signalLabel[s.signals.x]}${s.signals.xLeft}s Y:${signalLabel[s.signals.y]}${s.signals.yLeft}s`
                : ''}
            </span>
            <span className="credit">© OpenStreetMap contributors</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
