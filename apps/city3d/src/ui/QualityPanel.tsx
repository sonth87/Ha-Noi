/* The quality panel (ADR-032): four levels, or any option by hand ("custom"). M3 has the render
   options; detail levels, traffic, wires, trees and view distance come in M4–M5. */
import { LEVEL_NAMES, LEVELS, quality, withOption, type Quality, type QualityLevel, type QualityOptions } from '@view/quality';
import type { Snapshot } from '@view/CityView';

const TOGGLES: [keyof QualityOptions, string][] = [
  ['windows', 'Cửa sổ'], ['silhouette', 'Nét viền khối'], ['creases', 'Nét cạnh'], ['details', 'Nét chi tiết'], ['bloom', 'Glow (theme tối)'], ['msaa', 'Khử răng cưa'],
];

export function QualityPanel({ quality: q, stats, onChange }: { quality: Quality; stats: Snapshot['stats']; onChange: (q: Quality) => void }) {
  return (
    <aside className="panel" aria-label="Chất lượng hiển thị">
      <h2>Chất lượng · <span className="hi">{LEVEL_NAMES[q.level]}</span></h2>
      <div className="levels">
        {(Object.keys(LEVELS) as QualityLevel[]).map(l => (
          <button key={l} aria-pressed={q.level === l} onClick={() => onChange(quality(l))}>{LEVEL_NAMES[l]}</button>
        ))}
      </div>
      {TOGGLES.map(([k, label]) => (
        <label key={k} className="opt">
          <input type="checkbox" checked={q[k] as boolean} onChange={e => onChange(withOption(q, { [k]: e.target.checked }))} />
          {label}
        </label>
      ))}
      <label className="opt">
        Độ phân giải
        <select value={q.pixelRatio} onChange={e => onChange(withOption(q, { pixelRatio: Number(e.target.value) }))}>
          {[1, 1.5, 2, 3].map(r => <option key={r} value={r}>×{r}</option>)}
        </select>
      </label>
      <p className="note">Sắp có: mức chi tiết nhà (M4); mật độ xe, cột và dây điện, cây, tầm nhìn xa (M5).</p>
      <p className="stats">{stats.triangles.toLocaleString('vi')} tam giác · {stats.windows.toLocaleString('vi')} cửa · {stats.lines.toLocaleString('vi')} nét</p>
    </aside>
  );
}
