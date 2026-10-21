/* The "Công trình" side panel: pick a structure from a dropdown, read what it is. */
import { useController } from '@hooks/useController';
import { LANDMARKS } from '@core/landmarks';
import type { SceneController } from '@scenes/controller';
import type { LandmarksController } from '@scenes/landmarks/landmarksController';

export function LandmarksPanel({ controller }: { controller: SceneController }) {
  const c = controller as LandmarksController;
  const { sel, landmark: lm, night, floors, lit } = useController(c);

  return (
    <aside className="panel" aria-label="Công trình đặc biệt">
      <label className="ws-row">
        <span>Công trình</span>
        <select value={sel} onChange={e => c.select(Number(e.target.value))}>
          {LANDMARKS.map((l, i) => <option key={l.id} value={i}>{String(i + 1).padStart(2, '0')} · {l.name}</option>)}
        </select>
      </label>

      <div className="ws-buttons">
        <button type="button" className="pill" onClick={() => c.rotate(3)}>⟲ Xoay</button>
        <button type="button" className="pill" onClick={() => c.rotate(1)}>Xoay ⟳</button>
        <button type="button" className="pill" onClick={() => c.toggleNight()}>{night ? 'Ban ngày' : 'Ban đêm'}</button>
        {floors > 0 && <button type="button" className="pill" onClick={() => c.toggleAll()}>{lit === floors ? 'Tắt đèn' : 'Bật mọi tầng'}</button>}
      </div>

      <section className="lm-info">
        <h3>{lm.name}</h3>
        <p className="ws-note">{lm.place}</p>
        <h4>Số liệu</h4>
        <ul className="lm-ul">{lm.facts.map(t => <li key={t}>{t}</li>)}</ul>
        <h4>Đặc điểm khi vẽ</h4>
        <ul className="lm-ul">{lm.features.map(t => <li key={t}>{t}</li>)}</ul>
        {floors > 0 && <p className="ws-note">{floors} tầng bấm được · đang sáng {lit}</p>}
      </section>
    </aside>
  );
}
