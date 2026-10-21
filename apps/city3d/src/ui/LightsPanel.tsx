/* The lights panel (ADR-039): house lights and vehicle lights — automatic (on at night), on or off —
   how many floors light (0–100 %), and how strong the glow is. */
import type { LightMode, LightSettings } from '@view/lights';

const MODES: [LightMode, string][] = [['auto', 'Tự động'], ['on', 'Bật'], ['off', 'Tắt']];

function Modes({ value, onChange }: { value: LightMode; onChange: (m: LightMode) => void }) {
  return (
    <div className="seg">
      {MODES.map(([m, l]) => <button key={m} aria-pressed={value === m} onClick={() => onChange(m)}>{l}</button>)}
    </div>
  );
}

export function LightsPanel({ lights: L, onChange }: { lights: LightSettings; onChange: (p: Partial<LightSettings>) => void }) {
  return (
    <section aria-label="Đèn">
      <h2>Đèn</h2>
      <div className="row"><span>Đèn nhà</span><Modes value={L.house} onChange={house => onChange({ house })} /></div>
      <label className="opt">
        Cửa sáng
        <input type="range" min={0} max={100} step={5} value={Math.round(L.share * 100)} onChange={e => onChange({ share: Number(e.target.value) / 100 })} />
        <span className="hi">{Math.round(L.share * 100)}%</span>
      </label>
      <div className="row"><span>Đèn xe</span><Modes value={L.vehicle} onChange={vehicle => onChange({ vehicle })} /></div>
      <div className="row"><span>Đèn đường</span><Modes value={L.street} onChange={street => onChange({ street })} /></div>
      <label className="opt">
        Độ glow
        <input type="range" min={0} max={200} step={10} value={Math.round(L.glow * 100)} onChange={e => onChange({ glow: Number(e.target.value) / 100 })} />
        <span className="hi">{Math.round(L.glow * 100)}%</span>
      </label>
      <p className="note">Tự động: tối (phím N) thì bật. Cửa sáng: tỉ lệ cửa sổ có đèn, rải đều mọi tòa. Click một tầng để bật / tắt cả tầng đó.</p>
    </section>
  );
}
