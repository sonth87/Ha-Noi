/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

export function App() {
  const v = view();
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(() => !isMobileDevice());

  useEffect(() => {
    v.mount(host.current!);
    return () => v.unmount();
  }, [v]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, select, button') && e.key === ' ') return;
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) { setPanel(p => !p); e.preventDefault(); return; }
      if (v.key(e)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => v.keyUp(e);
    addEventListener('keydown', onKey);
    addEventListener('keyup', onUp);
    // a key held while the window loses focus would keep moving: let go of everything
    const onBlur = () => { for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']) v.keyUp(new KeyboardEvent('keyup', { key: k })); };
    addEventListener('blur', onBlur);
    return () => { removeEventListener('keydown', onKey); removeEventListener('keyup', onUp); removeEventListener('blur', onBlur); };
  }, [v]);

  const groups = Array.from(new Set(v.showcases.map(x => x.group)));
  const currentShowcase = s.showcase ? v.showcases.find(x => x.id === s.showcase) ?? null : null;

  return (
    <div className="shell">
      <header className="top">
        <b className="brand"><i className="dot" />My City · 3D</b>
        <label className="pick">
          <span>Công trình</span>
          <select
            aria-label="Chọn công trình xem riêng trên đế"
            value={s.showcase ?? ''}
            onChange={e => v.setShowcase(e.target.value || null)}
          >
            <option value="">🗺 Bản đồ toàn khu ({v.showcases.length} công trình)</option>
            {groups.map(g => (
              <optgroup key={g} label={g}>
                {v.showcases.filter(x => x.group === g).map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {currentShowcase && (
          <button onClick={() => v.setShowcase(null)} title="Quay lại bản đồ toàn khu">← Bản đồ</button>
        )}
        <label className="pick">
          <span>Khu vực</span>
          <select
            aria-label="Đi tới khu vực trên bản đồ"
            defaultValue="home"
            onChange={e => {
              const p = v.places.find(x => x.id === e.target.value);
              if (p) v.flyTo(p.at);
            }}
          >
            {v.places.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="pick" title="Kiểu hiển thị tên đường (Phím tắt: L)">
          <span>Tên đường</span>
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
          <span>Thông tin</span>
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
        <button onClick={() => v.flyTo([0, 0])} title="Về Ngã tư Thái Hà">Ngã tư <kbd>H</kbd></button>
        <button onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'}>{s.mode === '2d' ? '2D' : '3D'} <kbd>V</kbd></button>
        <button onClick={() => v.rotate(-1)}>⟲ <kbd>Q</kbd></button>
        <button onClick={() => v.rotate(1)}>⟳ <kbd>E</kbd></button>
        <button onClick={() => v.toggleDayNight()} aria-pressed={s.night} title="Ngày: giao diện sáng, tắt đèn · Đêm: giao diện tối, bật đèn">{s.night ? 'Đêm' : 'Ngày'} <kbd>N</kbd></button>
        <button onClick={() => setPanel(p => !p)} aria-pressed={panel}>Đèn · chất lượng <kbd>G</kbd></button>
      </header>
      <main>
        <div className="stage" ref={host} aria-label={`Khu vực Thái Hà – Láng Hạ – Hoàng Cầu – Ô Chợ Dừa – Xã Đàn – Chùa Bộc – Ngã Tư Sở, chế độ ${s.mode}. Kéo để di chuyển${s.mode === '3d' ? ', chuột phải hoặc shift + kéo để xoay và nghiêng' : ''}, cuộn để phóng to vào con trỏ, phím W A S D hoặc mũi tên để đi, nhấp đúp để bay tới, click công trình để xem thông tin.`}>
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
            <button type="button" onClick={() => v.zoom(1.28)} title="Phóng to (+)">＋</button>
            <button type="button" onClick={() => v.zoom(1 / 1.28)} title="Thu nhỏ (−)">－</button>
            <button type="button" onClick={() => v.rotate(-1)} title="Xoay trái 90° (Q)">⟲</button>
            <button type="button" onClick={() => v.rotate(1)} title="Xoay phải 90° (E)">⟳</button>
            <button type="button" onClick={() => v.tilt(1)} title="Nâng cao góc camera (R)">▲</button>
            <button type="button" onClick={() => v.tilt(-1)} title="Hạ thấp góc camera sát phố (F)">▼</button>
          </div>
        </div>
        {panel && (
          <aside className="panel">
            <LightsPanel lights={s.lights} onChange={p => v.setLights(p)} />
            <QualityPanel
              quality={s.quality}
              streetLabels={s.streetLabels}
              placeInfo={s.placeInfo}
              stats={s.stats}
              detail={s.detail}
              pending={s.pending}
              lowered={s.lowered}
              onChange={q => v.setQuality(q)}
              onStreetLabels={m => v.setStreetLabels(m)}
              onPlaceInfo={m => v.setPlaceInfo(m)}
            />
          </aside>
        )}
      </main>
      <footer>
        <span className="hint">kéo: di chuyển · {s.mode === '3d' ? 'chuột phải / shift + kéo / 2 ngón: xoay, nghiêng · R F: nghiêng · ' : 'xoay 2 ngón: bật 3D · '}cuộn: phóng · WASD / mũi tên: đi · I: thông tin · L: tên đường · chạm công trình: xem popup</span>
        <span className="read">
          {currentShowcase ? `đế mô hình · ${currentShowcase.name}` : 'bản đồ'} · {s.mode} · góc {s.mode === '2d' ? s.view : `${s.heading}°`} · chi tiết L{s.detail} · cửa sáng {lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%{s.lit ? ` + ${s.lit} tầng bật tay` : ''}{!currentShowcase ? ` · ${s.vehicles} xe · Tây Sơn ${LIGHT[s.signals.x]} ${s.signals.xLeft}s · Thái Hà ${LIGHT[s.signals.y]} ${s.signals.yLeft}s` : ''} · {s.fps} fps
        </span>
        <span className="credit">© OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
