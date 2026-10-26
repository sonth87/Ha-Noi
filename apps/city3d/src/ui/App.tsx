/* The shell around the scene (ADR-063): loading, then the top bar with its menus, the settings sheet, the camera
   dock, the bars of a 3D model and of an immersive view, and the status line with the data credit (A15). React
   only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { roadNetwork, streetFurniture } from '@my-city/core';
import { loadCityStreamingInitAsync } from '@my-city/osm-import';
import { CityView } from '@view/CityView';
import { startInWorker } from '@view/prebuild';
import { DEFAULT_AREA_ID } from '@view/constants';
import { getLocale, t } from '@view/i18n';
import { frameForCity, parseUrlState } from '@view/urlState';
import { Explorer } from './Explorer';
import { Icon, type IconName } from './icons';
import { LoadingScreen, type LoadingProgress } from './LoadingScreen';
import { PlacesMenu, PovMenu } from './Menus';
import { MapDock, PovBar, ShowcaseBar, StatusBar } from './Overlays';
import { SettingsSheet } from './SettingsSheet';
import { applyUiGlassToRoot, loadUiGlassSettings, saveUiGlassSettings, type UiGlassSettings } from './liquidGlass';

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
      const initialChunkKeys = computeInitialViewportChunkKeys();
      let counts: { buildings: number; streets: number; stations: number } | undefined;
      const imported = (c: typeof counts) => {
        counts = c;
        onProgress({
          step: 3,
          percent: 72,
          label: isEn ? '3/5 · Building road network, flyovers & Metro...' : '3/5 · Đang dựng mạng lưới giao thông & tuyến Metro...',
          ...(c ? { counts: c } : {}),
        });
      };
      await yieldToBrowser();
      onProgress({
        step: 2,
        percent: 48,
        label: isEn ? '2/5 · Decoding buildings, lakes & terrain...' : '2/5 · Đang giải mã công trình, sông hồ & địa hình...',
      });
      // download, import, road network, furniture and the map base all run in a worker so the page stays
      // responsive (ADR-059); if that fails the main thread does it the old way
      const started = await startInWorker(DEFAULT_AREA_ID, initialChunkKeys, imported);
      let built: CityView;
      if (started) {
        built = new CityView(started.city, started.loadedChunks, started.prebuilt);
      } else {
        const { city, loadedChunks } = await loadCityStreamingInitAsync(DEFAULT_AREA_ID, initialChunkKeys);
        imported({ buildings: city.buildings.length, streets: city.streets.length, stations: city.stations.length });
        await yieldToBrowser();
        const net = roadNetwork(city);
        await yieldToBrowser();
        streetFurniture(city, net);
        built = new CityView(city, loadedChunks, null);
      }
      onProgress({
        step: 4,
        percent: 92,
        label: isEn ? '4/5 · Initializing 3D landmarks & place catalog...' : '4/5 · Đang khởi tạo công trình biểu tượng & địa danh...',
        ...(counts ? { counts } : {}),
      });
      await yieldToBrowser();

      onProgress({
        step: 5,
        percent: 100,
        label: isEn ? '5/5 · Entering 3D Hanoi Map...' : '5/5 · Đang hoàn tất khung cảnh 3D...',
        counts,
      });
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

type Menu = 'places' | 'landmarks' | 'pov' | null;

function AppShell({ view: v }: { view: CityView }) {
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const loc = s.locale;
  const host = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [settings, setSettings] = useState(false);
  const [glass, setGlass] = useState<UiGlassSettings>(() => loadUiGlassSettings());
  const [hint, setHint] = useState<string | null>(null);

  const onGlass = (patch: Partial<UiGlassSettings>) => setGlass(prev => { const next = { ...prev, ...patch }; saveUiGlassSettings(next); return next; });
  const toggle = (m: Exclude<Menu, null>) => { setSettings(false); setMenu(cur => (cur === m ? null : m)); };

  useEffect(() => { v.mount(host.current!); return () => v.unmount(); }, [v]);
  useEffect(() => { applyUiGlassToRoot(shellRef.current, glass); }, [glass, menu, settings, s.showcase, s.povMode]);
  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => applyUiGlassToRoot(el, glass));
    ro.observe(el);
    return () => ro.disconnect();
  }, [glass]);
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 4200);
    return () => clearTimeout(id);
  }, [hint]);

  // a press outside an open menu closes it (on a phone the sheet's backdrop does it); the top bar is not outside
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => { if (!topRef.current?.contains(e.target as Node)) setMenu(null); };
    addEventListener('pointerdown', onDown);
    return () => removeEventListener('pointerdown', onDown);
  }, [menu]);

  // keys: Esc closes the innermost thing first (menu, settings, then the view handles popup and POV);
  // P opens the immersive-view menu (it used to jump straight into a train); G the settings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest('input, select, textarea, [contenteditable="true"]');
      const pressing = target?.closest('button') && (e.key === ' ' || e.key === 'Enter');
      if (e.key === 'Escape' && (menu || settings)) { setMenu(null); setSettings(false); e.preventDefault(); return; }
      if (typing || pressing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') { setMenu(null); setSettings(x => !x); e.preventDefault(); return; }
      if (k === 'p') { toggle('pov'); e.preventDefault(); return; }
      if (v.key(e)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => v.keyUp(e);
    const onBlur = () => { for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']) v.keyUp(new KeyboardEvent('keyup', { key: k })); };
    addEventListener('keydown', onKey);
    addEventListener('keyup', onUp);
    addEventListener('blur', onBlur);
    return () => { removeEventListener('keydown', onKey); removeEventListener('keyup', onUp); removeEventListener('blur', onBlur); };
  }, [v, menu, settings]);

  const item = v.showcaseItem(s.showcase);
  const nav = (m: Exclude<Menu, null>, icon: IconName, label: string) => (
    <button type="button" className="nav-btn" aria-expanded={menu === m} onClick={() => toggle(m)} title={label}>
      <Icon name={icon} /><span className="nav-label">{label}</span>
    </button>
  );

  return (
    <div className="shell" ref={shellRef}>
      <main>
        <div className="stage" ref={host} aria-label={t('stage.aria', { mode: s.mode }, loc)}>
          <header className="top-bar" ref={topRef} onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
            <nav className="top-group ui-surface" aria-label="My City">
              <span className="brand"><i className="dot" /><b>My City</b></span>
              {nav('places', 'mapPin', t('nav.places', undefined, loc))}
              {nav('landmarks', 'cube', t('nav.landmarks', undefined, loc))}
              {nav('pov', 'view', t('nav.experience', undefined, loc))}
            </nav>
            <div className="top-group ui-surface">
              <button type="button" className="nav-btn icon-only" onClick={() => v.toggleDayNight()} aria-pressed={s.night}
                title={s.night ? t('top.night.onTitle', undefined, loc) : t('top.night.offTitle', undefined, loc)}
                aria-label={s.night ? t('top.night.onTitle', undefined, loc) : t('top.night.offTitle', undefined, loc)}>
                <Icon name={s.night ? 'moon' : 'sun'} />
              </button>
              <button type="button" className="nav-btn" aria-expanded={settings} onClick={() => { setMenu(null); setSettings(x => !x); }} title={t('top.settings.title', undefined, loc)}>
                <Icon name="sliders" /><span className="nav-label">{t('nav.settings', undefined, loc)}</span>
              </button>
            </div>
            {menu === 'places' && <PlacesMenu v={v} locale={loc} onClose={() => setMenu(null)} />}
            {menu === 'landmarks' && <Explorer v={v} locale={loc} current={s.showcase} onClose={() => setMenu(null)} />}
            {menu === 'pov' && <PovMenu v={v} locale={loc} active={s.povMode} onClose={() => setMenu(null)} />}
          </header>

          {settings && <SettingsSheet v={v} s={s} glass={glass} onGlass={onGlass} onClose={() => setSettings(false)} />}

          {item && s.povMode === 'map' && <ShowcaseBar v={v} item={item} locale={loc} />}
          {s.povMode !== 'map' && <PovBar v={v} s={s} />}
          {s.povMode === 'map' && <MapDock v={v} s={s} host={host} onHint={setHint} />}
          {hint && <div className="toast ui-surface" role="status" onPointerDown={e => e.stopPropagation()}>{hint}</div>}
          <StatusBar v={v} s={s} item={item} />
        </div>
      </main>
    </div>
  );
}
