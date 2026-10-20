/* The workshop's control panel: every HouseSpec field, grouped like docs/architecture/house-spec.md.
   Shows resolved values (preset ⊕ overrides); every change goes to the controller as an override. */
import { useState, type ReactNode } from 'react';
import { useController } from '@hooks/useController';
import { PRESETS, PRESET_IDS, type PresetId } from '@core/presets';
import { LIMITS } from '@core/spec';
import type { AwningKind, BalconyKind, GroundKind, RoofItem, RoofKind, RoofShelter, SignKind, WindowKind } from '@core/types';
import type { SceneController } from '@scenes/controller';
import type { WorkshopController } from '@scenes/workshop/workshopController';

const GROUND: [GroundKind, string][] = [['fold', 'Cửa xếp'], ['roll', 'Cửa cuốn'], ['glass', 'Cửa kính'], ['wood', 'Cửa gỗ 4 cánh'], ['wall', 'Tường + cửa nhỏ']];
const AWNING: [AwningKind, string][] = [['none', 'Không'], ['fabric', 'Bạt']];
const WINDOW: [WindowKind, string][] = [['tall', 'Cửa sổ đứng'], ['louver', 'Cửa chớp'], ['glass-doors', 'Cửa kính ra ban công'], ['pair', 'Cặp cửa nhỏ'], ['wide', 'Cửa ngang 3 ô']];
const BALCONY: [BalconyKind, string][] = [['none', 'Không'], ['rail', 'Lan can sắt'], ['cage', 'Chuồng cọp']];
const ROOF: [RoofKind, string][] = [['flat', 'Mái bằng'], ['metal2', 'Mái tôn 2 dốc']];
const SHELTER: [RoofShelter, string][] = [['none', 'Không'], ['terrace', 'Che sân thượng'], ['full', 'Che cả mái']];
const SIGNS: [SignKind, string][] = [['facade', 'Biển hộp đèn'], ['side-panels', 'Biển 2 bên cửa'], ['projecting-vertical', 'Biển dọc chìa'], ['projecting-round', 'Biển tròn chìa'], ['standee', 'Biển đứng (standee)'], ['barber-pole', 'Cột xoắn barber'], ['billboard', 'Biển lớn trên cao']];
const ITEMS: [RoofItem, string][] = [['tank-h', 'Bồn inox nằm'], ['tank-v', 'Bồn đứng'], ['solar', 'Máy NLMT'], ['antenna', 'Ăng-ten']];

const m = (u: number) => `${(u / 10).toFixed(1)} m`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ws-section"><h3>{title}</h3>{children}</section>;
}

function Range({ label, value, min, max, step = 1, fmt = String, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange(v: number): void;
}) {
  return (
    <label className="ws-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <output>{fmt(value)}</output>
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange(v: T): void }) {
  return (
    <label className="ws-row">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label className="ws-check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function toggle<T>(list: readonly T[], item: T, on: boolean, eq: (a: T) => boolean = a => a === item): T[] {
  return on ? (list.some(eq) ? [...list] : [...list, item]) : list.filter(a => !eq(a));
}

export function WorkshopPanel({ controller }: { controller: SceneController }) {
  const c = controller as WorkshopController;
  const { input, spec: s, issues } = useController(c);
  const [copied, setCopied] = useState(false);
  const { id: _id, ...json } = input;
  const text = JSON.stringify(json, null, 2);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  return (
    <aside className="panel" aria-label="Cấu hình ngôi nhà">
      <div className="ws-top">
        <label className="ws-row">
          <span>Preset</span>
          <select value={input.preset ?? ''} onChange={e => c.setPreset(e.target.value as PresetId | '')}>
            <option value="">— Mặc định —</option>
            {PRESET_IDS.map(p => <option key={p} value={p}>{PRESETS[p].label}</option>)}
          </select>
        </label>
        <div className="ws-buttons">
          <button type="button" className="pill" onClick={() => c.random()}>Ngẫu nhiên</button>
          <button type="button" className="pill" onClick={() => c.setPreset((input.preset as PresetId | undefined) ?? '')}>Bỏ chỉnh</button>
        </div>
      </div>

      <Section title="Khối">
        <Range label="Mặt tiền" value={s.w} min={LIMITS.minW} max={LIMITS.maxW} step={2} fmt={m} onChange={w => c.patch({ w })} />
        <Range label="Chiều sâu" value={s.d} min={60} max={200} step={5} fmt={m} onChange={d => c.patch({ d })} />
        <Range label="Số tầng trên" value={s.floors} min={0} max={LIMITS.maxFloors} onChange={floors => c.patch({ floors })} />
        <Range label="Cao tầng 1" value={s.groundH} min={30} max={50} fmt={m} onChange={groundH => c.patch({ groundH })} />
        <Range label="Cao tầng trên" value={s.floorH} min={28} max={40} fmt={m} onChange={floorH => c.patch({ floorH })} />
        <Range label="Đua ra" value={s.overhang} min={0} max={LIMITS.maxOverhang} fmt={m} onChange={overhang => c.patch({ overhang })} />
        <Check label="Tầng hầm (nửa hầm) để xe" checked={s.basement > 0} onChange={on => c.patch({ basement: on ? 14 : 0 })} />
        {s.basement > 0 && <Range label="Cao hầm" value={s.basement} min={LIMITS.basement[0]} max={LIMITS.basement[1]} fmt={m} onChange={basement => c.patch({ basement })} />}
      </Section>

      <Section title="Tầng 1">
        <Select label="Cửa" value={s.ground} options={GROUND} onChange={ground => c.patch({ ground })} />
        <Check label="Đang mở hàng" checked={s.shop} onChange={shop => c.patch({ shop })} />
        <Select label="Mái hiên" value={s.awning} options={AWNING} onChange={awning => c.patch({ awning })} />
        <label className="ws-row">
          <span>Tên quán</span>
          <input type="text" value={s.shopName} maxLength={16} onChange={e => c.patch({ shopName: e.target.value })} />
        </label>
        <Range label="Tờ dán A5" value={s.stickers} min={0} max={4} onChange={stickers => c.patch({ stickers })} />
        <div className="ws-grid">
          {SIGNS.map(([k, t]) => (
            <Check key={k} label={t} checked={s.signs.some(x => x.type === k)}
              onChange={on => c.patch({ signs: toggle(s.signs, { type: k }, on, x => x.type === k) })} />
          ))}
        </div>
      </Section>

      {s.floors > 0 && (
        <Section title="Các tầng trên">
          {[...s.upper].map((fl, i) => ({ fl, i })).reverse().map(({ fl, i }) => (
            <div className="ws-floor" key={i}>
              <h4>Tầng {i + 2}</h4>
              <Select label="Cửa sổ" value={fl.window} options={WINDOW} onChange={window => c.patchFloor(i, { window })} />
              <Select label="Ban công" value={fl.balcony} options={BALCONY} onChange={balcony => c.patchFloor(i, { balcony })} />
              <Range label="Chậu cây" value={fl.plants} min={0} max={3} onChange={plants => c.patchFloor(i, { plants })} />
              <Check label="Cục nóng mặt tiền (khi không có ban công)" checked={fl.ac} onChange={ac => c.patchFloor(i, { ac })} />
            </div>
          ))}
        </Section>
      )}

      <Section title="Mái">
        <Select label="Loại mái" value={s.roof} options={ROOF} onChange={roof => c.patch({ roof })} />
        <Check label="Phòng tum + sân thượng" checked={s.topRoom} onChange={topRoom => c.patch({ topRoom })} />
        {s.topRoom && <Range label="Tum lùi vào" value={s.topSetback} min={15} max={60} fmt={m} onChange={topSetback => c.patch({ topSetback })} />}
        <Select label="Mái tôn" value={s.roofShelter} options={SHELTER} onChange={roofShelter => c.patch({ roofShelter })} />
        <Range label="Tường chắn" value={s.parapet} min={0} max={12} fmt={m} onChange={parapet => c.patch({ parapet })} />
        <Check label="Dây phơi quần áo" checked={s.laundry} onChange={laundry => c.patch({ laundry })} />
        <Range label="Chậu cây" value={s.roofPlants} min={0} max={3} onChange={roofPlants => c.patch({ roofPlants })} />
        <div className="ws-grid">
          {ITEMS.map(([k, t]) => (
            <Check key={k} label={t} checked={s.roofItems.includes(k)} onChange={on => c.patch({ roofItems: toggle(s.roofItems, k, on) })} />
          ))}
        </div>
      </Section>

      <Section title="Tường hồi">
        <Select label="Bên lộ ra" value={s.sideEnd} options={[['+a', 'Bên phải (nhìn từ phố)'], ['-a', 'Bên trái']]} onChange={sideEnd => c.patch({ sideEnd })} />
        <Range label="Cục nóng treo" value={s.sideAC} min={0} max={3} onChange={sideAC => c.patch({ sideAC })} />
      </Section>

      {issues.length > 0 && (
        <Section title={`Cảnh báo (${issues.length})`}>
          <ul className="ws-issues">
            {issues.map((is, i) => <li key={i} className={is.level}><b>{is.field}</b> — {is.message}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Cấu hình (JSON)">
        <textarea className="ws-json" readOnly value={text} rows={Math.min(14, text.split('\n').length)} />
        <button type="button" className="pill" onClick={copy}>{copied ? 'Đã chép ✓' : 'Chép JSON'}</button>
        <p className="ws-note">Dán vào <code>src/core/presets.ts</code> (thêm <code>label</code>) để thành preset mới.</p>
      </Section>
    </aside>
  );
}
