/* The quality panel (ADR-032, ADR-036, ADR-037): four levels, or any option by hand ("custom"):
   building detail, street life (traffic, poles and wires, trees), view distance, stepping down by
   itself, and the render options. */
import { LEVEL_NAMES, LEVELS, quality, withOption, type Quality, type QualityLevel, type QualityOptions, type TreeLook } from '@view/quality';
import { STREET_LABEL_MODES, STREET_LABEL_NAMES, type StreetLabelMode } from '@view/streetLabels';
import { PLACE_INFO_MODES, PLACE_INFO_NAMES, type PlaceInfoMode } from '@view/placeInfo';
import type { Snapshot } from '@view/CityView';

const DETAIL = ['L0 · khối', 'L1 · cửa sổ', 'L2 · nhà', 'L3 · mọi chi tiết'];

const TREES: [TreeLook, string][] = [['off', 'Không'], ['simple', 'Đơn giản'], ['full', 'Đầy đủ']];
const DISTANCE: [number, string][] = [[150, '150 m'], [250, '250 m'], [450, '450 m'], [800, '800 m'], [1500, '1500 m'], [0, 'Hết']];

const TOGGLES: [keyof QualityOptions, string][] = [
  ['autoDetail', 'Tự giảm chi tiết khi thu nhỏ'], ['wires', 'Cột và dây điện'], ['autoQuality', 'Tự hạ mức khi chậm'], ['windows', 'Cửa sổ'], ['silhouette', 'Nét viền khối'], ['creases', 'Nét cạnh'], ['details', 'Nét chi tiết'], ['bloom', 'Glow (theme tối)'], ['msaa', 'Khử răng cưa'],
];

export function QualityPanel({
  quality: q,
  streetLabels,
  placeInfo,
  stats,
  detail,
  pending,
  lowered,
  onChange,
  onStreetLabels,
  onPlaceInfo,
}: {
  quality: Quality;
  streetLabels: StreetLabelMode;
  placeInfo: PlaceInfoMode;
  stats: Snapshot['stats'];
  detail: Snapshot['detail'];
  pending: number;
  lowered: string | null;
  onChange: (q: Quality) => void;
  onStreetLabels: (mode: StreetLabelMode) => void;
  onPlaceInfo: (mode: PlaceInfoMode) => void;
}) {
  return (
    <section aria-label="Chất lượng hiển thị">
      <h2>Chất lượng · <span className="hi">{LEVEL_NAMES[q.level]}</span></h2>
      <div className="levels">
        {(Object.keys(LEVELS) as QualityLevel[]).map(l => (
          <button key={l} aria-pressed={q.level === l} onClick={() => onChange(quality(l))}>{LEVEL_NAMES[l]}</button>
        ))}
      </div>
      <label className="opt">
        Tên đường
        <select value={streetLabels} onChange={e => onStreetLabels(e.target.value as StreetLabelMode)}>
          {STREET_LABEL_MODES.map(m => <option key={m} value={m}>{STREET_LABEL_NAMES[m]}</option>)}
        </select>
      </label>
      <label className="opt">
        Thông tin địa điểm
        <select value={placeInfo} onChange={e => onPlaceInfo(e.target.value as PlaceInfoMode)}>
          {PLACE_INFO_MODES.map(m => <option key={m} value={m}>{PLACE_INFO_NAMES[m]}</option>)}
        </select>
      </label>
      <label className="opt">
        Chi tiết nhà
        <select value={q.houseDetail} onChange={e => onChange(withOption(q, { houseDetail: Number(e.target.value) as QualityOptions['houseDetail'] }))}>
          {DETAIL.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </label>
      <label className="opt">
        Mật độ xe
        <input type="range" min={0} max={100} step={10} value={Math.round(q.traffic * 100)} onChange={e => onChange(withOption(q, { traffic: Number(e.target.value) / 100 }))} />
        <span className="hi">{Math.round(q.traffic * 100)}%</span>
      </label>
      <label className="opt">
        Cây
        <select value={q.trees} onChange={e => onChange(withOption(q, { trees: e.target.value as TreeLook }))}>
          {TREES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="opt">
        Tầm nhìn xa
        <select value={q.viewDistance} onChange={e => onChange(withOption(q, { viewDistance: Number(e.target.value) }))}>
          {DISTANCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
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
      <p className="note">Đang vẽ: <span className="hi">{DETAIL[detail]}</span>{pending > 0 ? ` · còn ${pending} ô đang dựng` : ''}</p>
      {lowered && <p className="note warn">Máy chạy chậm nên đã tự hạ xuống mức {LEVEL_NAMES[lowered as QualityLevel] ?? lowered}.</p>}
      <p className="stats">{stats.triangles.toLocaleString('vi')} tam giác · {stats.windows.toLocaleString('vi')} cửa · {stats.lines.toLocaleString('vi')} nét</p>
    </section>
  );
}
