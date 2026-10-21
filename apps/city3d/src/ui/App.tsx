/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { loadCity } from '@my-city/osm-import';
import { CityView } from '@view/CityView';
import { lightOn } from '@view/lights';
import { QualityPanel } from './QualityPanel';
import { LightsPanel } from './LightsPanel';

const AREA = 'nga-tu-thai-ha';
const LIGHT = { go: 'xanh', wait: 'vàng', stop: 'đỏ' } as const;
let shared: CityView | null = null;
const view = () => (shared ??= new CityView(loadCity(AREA).city));

export function App() {
  const v = view();
  const s = useSyncExternalStore(v.subscribe, v.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(true);

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

  return (
    <div className="shell">
      <header className="top">
        <b className="brand"><i className="dot" />My City · 3D</b>
        {v.places.map(p => <button key={p.id} onClick={() => v.flyTo(p.at)}>{p.name}{p.id === 'home' ? <kbd>H</kbd> : null}</button>)}
        <button onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'}>{s.mode === '2d' ? '2D' : '3D'} <kbd>V</kbd></button>
        <button onClick={() => v.rotate(-1)}>⟲ <kbd>Q</kbd></button>
        <button onClick={() => v.rotate(1)}>⟳ <kbd>E</kbd></button>
        <button onClick={() => v.toggleDayNight()} aria-pressed={s.night} title="Ngày: giao diện sáng, tắt đèn · Đêm: giao diện tối, bật đèn">{s.night ? 'Đêm' : 'Ngày'} <kbd>N</kbd></button>
        <button onClick={() => setPanel(p => !p)} aria-pressed={panel}>Đèn · chất lượng <kbd>G</kbd></button>
      </header>
      <main>
        <div className="stage" ref={host} aria-label={`Ngã tư Thái Hà – Tây Sơn – Chùa Bộc và phố Thái Hà, chế độ ${s.mode}. Kéo để di chuyển${s.mode === '3d' ? ', chuột phải hoặc shift + kéo để xoay và nghiêng' : ''}, cuộn để phóng to vào con trỏ, phím W A S D hoặc mũi tên để đi, nhấp đúp để bay tới, click một tầng để bật đèn.`} />
        {panel && (
          <aside className="panel">
            <LightsPanel lights={s.lights} onChange={p => v.setLights(p)} />
            <QualityPanel quality={s.quality} stats={s.stats} detail={s.detail} pending={s.pending} lowered={s.lowered} onChange={q => v.setQuality(q)} />
          </aside>
        )}
      </main>
      <footer>
        <span>kéo: di chuyển · {s.mode === '3d' ? 'chuột phải / shift + kéo: xoay, nghiêng · R F: nghiêng · ' : ''}cuộn: phóng vào con trỏ · WASD / mũi tên: đi · +/−: phóng · nhấp đúp: bay tới · click tầng: bật đèn</span>
        <span className="read">{s.mode} · góc {s.mode === '2d' ? s.view : `${s.heading}°`} · chi tiết L{s.detail} · cửa sáng {lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%{s.lit ? ` + ${s.lit} tầng bật tay` : ''} · {s.vehicles} xe · Tây Sơn {LIGHT[s.signals.x]} {s.signals.xLeft}s · Thái Hà {LIGHT[s.signals.y]} {s.signals.yLeft}s · {s.fps} fps</span>
        <span className="credit">© OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
