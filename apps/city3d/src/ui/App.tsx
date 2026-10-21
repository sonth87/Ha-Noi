/* The shell around the scene: top bar, the scene, the quality panel, status line and the data credit
   (A15). React only reads the view's snapshot; the scene itself is three.js, driven by CityView. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { loadCity } from '@my-city/osm-import';
import { CityView } from '@view/CityView';
import { QualityPanel } from './QualityPanel';

const AREA = 'nga-tu-thai-ha';
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
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [v]);

  return (
    <div className="shell">
      <header className="top">
        <b className="brand"><i className="dot" />My City · 3D</b>
        <button onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'}>{s.mode === '2d' ? '2D' : '3D'} <kbd>V</kbd></button>
        <button onClick={() => v.rotate(-1)}>⟲ <kbd>Q</kbd></button>
        <button onClick={() => v.rotate(1)}>⟳ <kbd>E</kbd></button>
        <button onClick={() => v.toggleNight()} aria-pressed={s.night}>{s.night ? 'Đêm' : 'Ngày'} <kbd>N</kbd></button>
        <button onClick={() => v.toggleTheme()}>{s.theme === 'dark' ? 'Tối' : 'Sáng'} <kbd>T</kbd></button>
        <button onClick={() => setPanel(p => !p)} aria-pressed={panel}>Chất lượng <kbd>G</kbd></button>
      </header>
      <main>
        <div className="stage" ref={host} aria-label={`Ngã tư Thái Hà – Tây Sơn – Chùa Bộc, chế độ ${s.mode}. Kéo để ${s.mode === '3d' ? 'xoay, chuột phải để dời' : 'dời'}, cuộn để phóng to, click một tầng để bật đèn.`} />
        {panel && <QualityPanel quality={s.quality} stats={s.stats} onChange={q => v.setQuality(q)} />}
      </main>
      <footer>
        <span>{s.mode === '2d' ? 'kéo dời · cuộn phóng' : 'kéo xoay · chuột phải dời · cuộn phóng'} · click tầng bật đèn · space bật hết</span>
        <span className="read">{s.mode} · góc {s.mode === '2d' ? s.view : `${s.heading}°`} · {s.lit}/{s.floors} tầng sáng · {s.fps} fps</span>
        <span className="credit">© OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
