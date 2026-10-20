/* The workshop's control panel: every HouseSpec field, grouped like docs/architecture/house-spec.md.
   Shows resolved values (preset ⊕ overrides); every change goes to the controller as an override. */
import { useState, type ReactNode } from 'react';
import { useController } from '@hooks/useController';
import { PRESETS, PRESET_IDS, type PresetId } from '@core/presets';
import { LIMITS } from '@core/spec';
import type {
  AwningKind, BalconyKind, Canopy, Goods, GroundKind, RoofItem, RoofKind, RoofShelter, SignKind, SignSpec, WallFinish, WindowKind,
} from '@core/types';
import type { SceneController } from '@scenes/controller';
import type { WorkshopController } from '@scenes/workshop/workshopController';

const GROUND: [GroundKind, string][] = [['fold', 'Cửa xếp'], ['roll', 'Cửa cuốn'], ['glass', 'Cửa kính'], ['wood', 'Cửa gỗ 4 cánh'], ['iron', 'Cửa sắt hoa'], ['wall', 'Tường + cửa nhỏ']];
const AWNING: [AwningKind, string][] = [['none', 'Không'], ['fabric', 'Bạt'], ['metal', 'Tôn']];
const GOODS: [Goods, string][] = [['none', 'Không'], ['stools', 'Bàn ghế nhựa'], ['bikes', 'Xe máy dựng'], ['crates', 'Két bia, thùng hàng']];
const WALL: [WallFinish, string][] = [['plain', 'Trơn'], ['tile', 'Ốp gạch men'], ['paint-old', 'Sơn cũ loang lổ'], ['stone-base', 'Ốp đá chân tường']];
const WINDOW: [WindowKind, string][] = [['tall', 'Cửa sổ đứng'], ['louver', 'Cửa chớp'], ['glass-doors', 'Cửa kính ra ban công'], ['pair', 'Cặp cửa nhỏ'], ['wide', 'Cửa ngang 3 ô'], ['arch', 'Cửa vòm'], ['french', 'Cửa Pháp + cánh chớp'], ['glass', 'Mảng kính lớn']];
const BALCONY: [BalconyKind, string][] = [['none', 'Không'], ['rail', 'Lan can sắt'], ['solid', 'Lan can xây'], ['cage', 'Chuồng cọp']];
const CANOPY: [Canopy, string][] = [['none', 'Không'], ['concrete', 'Ô văng bê tông'], ['metal', 'Mái tôn nhỏ']];
const ROOF: [RoofKind, string][] = [['flat', 'Mái bằng'], ['metal2', 'Tôn 2 dốc'], ['metal1', 'Tôn 1 dốc'], ['tile', 'Mái ngói']];
const SHELTER: [RoofShelter, string][] = [['none', 'Không'], ['terrace', 'Che sân thượng'], ['full', 'Che cả mái']];
const SIGNS: [SignKind, string, string][] = [
  ['facade', 'Biển hộp đèn', 'chữ (trống = tên quán)'], ['side-panels', 'Biển 2 bên cửa', 'TRÁI|PHẢI'],
  ['projecting-vertical', 'Biển dọc chìa', 'chữ dọc'], ['projecting-round', 'Biển tròn chìa', 'ký hiệu'],
  ['standee', 'Biển đứng (standee)', 'MENU'], ['barber-pole', 'Cột xoắn barber', ''], ['billboard', 'Biển lớn trên cao', 'DÒNG 1|DÒNG 2'],
];
const ITEMS: [RoofItem, string][] = [['tank-h', 'Bồn inox nằm'], ['tank-v', 'Bồn đứng'], ['solar', 'Máy NLMT'], ['antenna', 'Ăng-ten'], ['ac', 'Cục nóng'], ['flag', 'Cột cờ']];

const m = (u: number) => `${(u / 10).toFixed(1)} m`;

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="ws-section" open={open}><summary>{title}</summary><div className="ws-body">{children}</div></details>;
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

function Text({ label, value, placeholder, max = 24, onChange }: { label: string; value: string; placeholder?: string; max?: number; onChange(v: string): void }) {
  return (
    <label className="ws-row">
      <span>{label}</span>
      <input type="text" value={value} placeholder={placeholder} maxLength={max} onChange={e => onChange(e.target.value)} />
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
  const setSign = (k: SignKind, patch: Partial<SignSpec> | null) =>
    c.patch({ signs: patch === null ? s.signs.filter(x => x.type !== k) : s.signs.some(x => x.type === k)
      ? s.signs.map(x => (x.type === k ? { ...x, ...patch } : x)) : [...s.signs, { type: k, ...patch }] });

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

      <Section title="Khối & mặt tiền">
        <Range label="Mặt tiền" value={s.w} min={LIMITS.minW} max={LIMITS.maxW} step={2} fmt={m} onChange={w => c.patch({ w })} />
        <Range label="Chiều sâu" value={s.d} min={60} max={200} step={5} fmt={m} onChange={d => c.patch({ d })} />
        <Range label="Số tầng trên" value={s.floors} min={0} max={LIMITS.maxFloors} onChange={floors => c.patch({ floors })} />
        <Range label="Cao tầng 1" value={s.groundH} min={30} max={50} fmt={m} onChange={groundH => c.patch({ groundH })} />
        <Range label="Cao tầng trên" value={s.floorH} min={28} max={40} fmt={m} onChange={floorH => c.patch({ floorH })} />
        <Range label="Đua ra" value={s.overhang} min={0} max={LIMITS.maxOverhang} fmt={m} onChange={overhang => c.patch({ overhang })} />
        <Check label="Tầng hầm (nửa hầm) để xe" checked={s.basement > 0} onChange={on => c.patch({ basement: on ? 14 : 0 })} />
        {s.basement > 0 && <Range label="Cao hầm" value={s.basement} min={LIMITS.basement[0]} max={LIMITS.basement[1]} fmt={m} onChange={basement => c.patch({ basement })} />}
        <Select label="Tường" value={s.wall} options={WALL} onChange={wall => c.patch({ wall })} />
        <Range label="Số gian" value={s.bays} min={0} max={6} fmt={v => (v ? String(v) : 'tự động')} onChange={bays => c.patch({ bays })} />
      </Section>

      <Section title="Tầng 1 & vỉa hè">
        <Select label="Cửa" value={s.ground} options={GROUND} onChange={ground => c.patch({ ground })} />
        <Check label="Đang mở hàng" checked={s.shop} onChange={shop => c.patch({ shop })} />
        <Select label="Mái hiên" value={s.awning} options={AWNING} onChange={awning => c.patch({ awning })} />
        <Select label="Bày vỉa hè" value={s.goods} options={GOODS} onChange={goods => c.patch({ goods })} />
        <Select label="Cây trước nhà" value={s.trees} options={[['none', 'Không'], ['left', 'Bên trái'], ['right', 'Bên phải'], ['both', 'Hai bên']]} onChange={trees => c.patch({ trees })} />
        {s.trees !== 'none' && <Select label="Cỡ cây" value={s.treeSize} options={[['small', 'Nhỏ'], ['medium', 'Vừa'], ['large', 'To, tán rộng']]} onChange={treeSize => c.patch({ treeSize })} />}
        <Text label="Tên quán" value={s.shopName} max={16} onChange={shopName => c.patch({ shopName })} />
        <Range label="Tờ dán A5" value={s.stickers} min={0} max={4} onChange={stickers => c.patch({ stickers })} />
      </Section>

      <Section title="Biển hiệu">
        {SIGNS.map(([k, t, hint]) => {
          const sign = s.signs.find(x => x.type === k);
          return (
            <div key={k} className="ws-sign">
              <Check label={t} checked={!!sign} onChange={on => setSign(k, on ? {} : null)} />
              {sign && hint && <input type="text" className="ws-sign-text" value={sign.text ?? ''} placeholder={hint} maxLength={28}
                onChange={e => setSign(k, { text: e.target.value || undefined })} />}
            </div>
          );
        })}
      </Section>

      {s.floors > 0 && (
        <Section title="Các tầng trên">
          {[...s.upper].map((fl, i) => ({ fl, i })).reverse().map(({ fl, i }) => (
            <div className="ws-floor" key={i}>
              <h4>Tầng {i + 2}</h4>
              <Select label="Cửa sổ" value={fl.window} options={WINDOW} onChange={window => c.patchFloor(i, { window })} />
              <Select label="Ban công" value={fl.balcony} options={BALCONY} onChange={balcony => c.patchFloor(i, { balcony })} />
              {fl.balcony !== 'none' && <Select label="Độ dài" value={fl.balconyWidth} options={[['full', 'Dài hết mặt tiền'], ['short', 'Ngắn, quanh cửa']]} onChange={balconyWidth => c.patchFloor(i, { balconyWidth })} />}
              <Select label="Che cửa sổ" value={fl.canopy} options={CANOPY} onChange={canopy => c.patchFloor(i, { canopy })} />
              <Range label="Chậu cây" value={fl.plants} min={0} max={3} onChange={plants => c.patchFloor(i, { plants })} />
              <Check label="Phơi quần áo ở ban công" checked={fl.laundry} onChange={laundry => c.patchFloor(i, { laundry })} />
              <Check label="Cục nóng mặt tiền (khi không có ban công)" checked={fl.ac} onChange={ac => c.patchFloor(i, { ac })} />
            </div>
          ))}
        </Section>
      )}

      <Section title="Mái">
        <Select label="Loại mái" value={s.roof} options={ROOF} onChange={roof => c.patch({ roof })} />
        <Check label="Phòng tum + sân thượng" checked={s.topRoom} onChange={topRoom => c.patch({ topRoom })} />
        {s.topRoom && <Range label="Tum lùi vào" value={s.topSetback} min={15} max={60} fmt={m} onChange={topSetback => c.patch({ topSetback })} />}
        <Check label="Tum thang nhỏ (khi không có phòng tum)" checked={s.stairHut} onChange={stairHut => c.patch({ stairHut })} />
        <Select label="Mái tôn che" value={s.roofShelter} options={SHELTER} onChange={roofShelter => c.patch({ roofShelter })} />
        <Range label="Tường chắn" value={s.parapet} min={0} max={12} fmt={m} onChange={parapet => c.patch({ parapet })} />
        <Check label="Dây phơi trên sân thượng" checked={s.laundry} onChange={laundry => c.patch({ laundry })} />
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
        <Check label="Cửa sổ nhỏ trên tường hồi" checked={s.sideWindows} onChange={sideWindows => c.patch({ sideWindows })} />
        <Text label="Quảng cáo sơn" value={s.sideAd} placeholder="DÒNG 1|DÒNG 2" max={40} onChange={sideAd => c.patch({ sideAd })} />
      </Section>

      {issues.length > 0 && (
        <Section title={`Cảnh báo (${issues.length})`}>
          <ul className="ws-issues">
            {issues.map((is, i) => <li key={i} className={is.level}><b>{is.field}</b> — {is.message}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Cấu hình (JSON)" open={false}>
        <textarea className="ws-json" readOnly value={text} rows={Math.min(14, text.split('\n').length)} />
        <button type="button" className="pill" onClick={copy}>{copied ? 'Đã chép ✓' : 'Chép JSON'}</button>
        <p className="ws-note">Dán vào <code>src/core/presets.ts</code> (thêm <code>label</code>) để thành preset mới.</p>
      </Section>
    </aside>
  );
}
