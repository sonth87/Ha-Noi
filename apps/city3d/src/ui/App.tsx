/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { loadCity } from '@my-city/osm-import';
import { CityView } from '@view/CityView';
import { lightOn } from '@view/lights';
import { isMobileDevice } from '@view/quality';
import { STREET_LABEL_MODES, STREET_LABEL_NAMES, type StreetLabelMode } from '@view/streetLabels';
import { PLACE_INFO_MODES, PLACE_INFO_NAMES, type PlaceInfoMode } from '@view/placeInfo';
import { QualityPanel } from './QualityPanel';
import { LightsPanel } from './LightsPanel';

const AREA = 'nga-tu-thai-ha';
const LIGHT = { go: 'xanh', wait: 'vàng', stop: 'đỏ' } as const;
let shared: CityView | null = null;
const view = () => (shared ??= new CityView(loadCity(AREA).city));
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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IconChevronDownPad = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

export function App() {
  const v = view();
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(() => !isMobileDevice());
  const [openMenu, setOpenMenu] = useState<'showcase' | 'place' | null>(null);
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
            aria-label="Chọn công trình xem riêng trên đế"
            onClick={() => setOpenMenu(m => (m === 'showcase' ? null : 'showcase'))}
          >
            <IconBox />
            <span className="picker-label">
              {currentShowcase ? currentShowcase.name : `Công trình (${v.showcases.length})`}
            </span>
            <IconChevronDown />
          </button>
          {openMenu === 'showcase' && (
            <div className="popover-panel" role="dialog" aria-label="Danh sách công trình 3D">
              <div className="popover-search">
                <IconSearch />
                <input
                  type="search"
                  placeholder="Tìm công trình, nhà ga, di tích..."
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
                  Tất cả ({v.showcases.length})
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
                    <b>Bản đồ toàn khu Đống Đa – Ba Đình</b>
                    <span>Hiển thị toàn bộ thành phố, giao thông và tàu Metro</span>
                  </div>
                  <em className="popover-tag">Bản đồ</em>
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
                  <div className="popover-empty">Không tìm thấy công trình phù hợp</div>
                )}
              </div>
            </div>
          )}
        </div>

        {currentShowcase && (
          <button type="button" className="icon-btn" onClick={() => v.setShowcase(null)} title="Quay lại bản đồ toàn khu">
            <IconArrowLeft />
            <span>Bản đồ</span>
          </button>
        )}

        {/* Searchable & Categorized Popover for Khu vực (Places / Districts / Metro Stations) */}
        <div className="popover-wrap">
          <button
            type="button"
            className="picker-trigger"
            aria-expanded={openMenu === 'place'}
            aria-label="Đi tới khu vực trên bản đồ"
            onClick={() => setOpenMenu(m => (m === 'place' ? null : 'place'))}
          >
            <IconMapPin />
            <span className="picker-label">{currentPlace.name}</span>
            <IconChevronDown />
          </button>
          {openMenu === 'place' && (
            <div className="popover-panel" role="dialog" aria-label="Danh sách khu vực và nhà ga">
              <div className="popover-search">
                <IconSearch />
                <input
                  type="search"
                  placeholder="Tìm khu vực, phố, quận, nhà ga..."
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
                  Tất cả ({v.places.length})
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
                  <div className="popover-empty">Không tìm thấy khu vực phù hợp</div>
                )}
              </div>
            </div>
          )}
        </div>

        <label className="pick" title="Kiểu hiển thị tên đường (Phím tắt: L)">
          <IconSignpost />
          <span className="pick-title">Tên đường</span>
          <select
            aria-label="Kiểu hiển thị tên đường"
            value={s.streetLabels}
            onChange={e => v.setStreetLabels(e.target.value as StreetLabelMode)}
          >
            {STREET_LABEL_MODES.map(m => (
              <option key={m} value={m}>{STREET_LABEL_NAMES[m]}</option>
            ))}
          </select>
        </label>

        <label className="pick" title="Hiển thị thông tin tòa nhà, công viên, hồ, di tích, tượng đài (Phím tắt: I)">
          <IconInfo />
          <span className="pick-title">Thông tin</span>
          <select
            aria-label="Hiển thị thông tin công trình và địa điểm"
            value={s.placeInfo}
            onChange={e => v.setPlaceInfo(e.target.value as PlaceInfoMode)}
          >
            {PLACE_INFO_MODES.map(m => (
              <option key={m} value={m}>{PLACE_INFO_NAMES[m]}</option>
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
            title="Về Ngã tư Thái Hà – Tây Sơn (H)"
            aria-label="Về Ngã tư Thái Hà"
          >
            <IconHome />
            <span className="btn-text">Ngã tư</span>
            <kbd>H</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => v.toggleMode()}
            aria-pressed={s.mode === '3d'}
            title="Chuyển góc nhìn 2D / 3D (V)"
          >
            <span>{s.mode === '2d' ? '2D' : '3D'}</span>
            <kbd>V</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => v.toggleSeeThrough()}
            aria-pressed={s.seeThrough}
            title="Bật/tắt chế độ nhìn xuyên tòa nhà chắn trước mặt khi zoom vào rất sát (X)"
            aria-label="Nhìn xuyên tòa nhà chắn trước khi zoom sát"
          >
            <IconSeeThrough />
            <span className="btn-text">Nhìn xuyên</span>
            <kbd>X</kbd>
          </button>

          <button
            type="button"
            className="icon-only-btn"
            onClick={() => v.toggleDayNight()}
            aria-pressed={s.night}
            aria-label={s.night ? 'Chế độ Đêm (Nhấn để chuyển sang Ngày)' : 'Chế độ Ngày (Nhấn để chuyển sang Đêm)'}
            title={s.night ? 'Đang ở chế độ Đêm · Nhấn để chuyển sang Ngày (N)' : 'Đang ở chế độ Ngày · Nhấn để chuyển sang Đêm (N)'}
          >
            {s.night ? <IconMoon /> : <IconSun />}
            <kbd>N</kbd>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => setPanel(p => !p)}
            aria-pressed={panel}
            title="Bảng điều chỉnh Đèn & Chất lượng hiển thị (G)"
            aria-label="Đèn và chất lượng"
          >
            <IconSliders />
            <span className="btn-text">Cài đặt</span>
            <kbd>G</kbd>
          </button>
        </div>
      </header>
      <main>
        <div className="stage" ref={host} aria-label={`Bản đồ 3D Quận Đống Đa & Quận Ba Đình, chế độ ${s.mode}. Kéo để di chuyển${s.mode === '3d' ? ', chuột phải hoặc shift + kéo để xoay và nghiêng' : ''}, cuộn để phóng to vào con trỏ, phím W A S D hoặc mũi tên để đi, nhấp đúp vào cột ghim hoặc công trình để xem thông tin.`}>
          {currentShowcase && (
            <div className="plaque">
              <b>{currentShowcase.name}</b>
              <span>{currentShowcase.subtitle}</span>
            </div>
          )}
          <div className="cam-pad" role="group" aria-label="Điều khiển camera nhanh">
            <button type="button" onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'} title="Đổi góc nhìn 2D / 3D (V)">
              {s.mode === '2d' ? '2D' : '3D'}
            </button>
            <button type="button" onClick={() => v.zoom(1.28)} title="Phóng to (+)" aria-label="Phóng to">
              <IconPlus />
            </button>
            <button type="button" onClick={() => v.zoom(1 / 1.28)} title="Thu nhỏ (−)" aria-label="Thu nhỏ">
              <IconMinus />
            </button>
            <button type="button" onClick={() => v.rotate(-1)} title="Xoay trái 90° (Q)" aria-label="Xoay trái 90 độ">
              <IconRotateCcw />
            </button>
            <button type="button" onClick={() => v.rotate(1)} title="Xoay phải 90° (E)" aria-label="Xoay phải 90 độ">
              <IconRotateCw />
            </button>
            <button type="button" onClick={() => v.tilt(1)} title="Nâng cao góc camera (R)" aria-label="Nâng cao góc camera">
              <IconChevronUp />
            </button>
            <button type="button" onClick={() => v.tilt(-1)} title="Hạ thấp góc camera sát phố (F)" aria-label="Hạ thấp góc camera">
              <IconChevronDownPad />
            </button>
          </div>
        </div>
        {panel && (
          <aside className="panel">
            <LightsPanel lights={s.lights} onChange={p => v.setLights(p)} />
            <QualityPanel
              quality={s.quality}
              streetLabels={s.streetLabels}
              placeInfo={s.placeInfo}
              seeThrough={s.seeThrough}
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
        <span className="hint">kéo: di chuyển · click tầng: bật/tắt đèn · nhấp đúp công trình/ghim: xem thông tin · {s.mode === '3d' ? 'chuột phải / shift + kéo: xoay, nghiêng · ' : ''}cuộn: phóng</span>
        <span className="read">
          {currentShowcase ? `đế mô hình · ${currentShowcase.name}` : 'Đống Đa – Ba Đình'} · {s.mode} · góc {s.mode === '2d' ? s.view : `${s.heading}°`} · L{s.detail} · cửa sáng {lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%{s.lit ? ` + ${s.lit} tầng` : ''}{!currentShowcase ? ` · ${s.vehicles} xe · Tây Sơn ${LIGHT[s.signals.x]} ${s.signals.xLeft}s · Thái Hà ${LIGHT[s.signals.y]} ${s.signals.yLeft}s` : ''} · {s.fps} fps
        </span>
        <span className="credit">© OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
