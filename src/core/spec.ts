/* resolveSpec: DEFAULTS ⊕ preset ⊕ input → a complete HouseSpec, plus the issues found while
   resolving (docs/architecture/house-spec.md §1, §4). randomHouse: a seeded random input for
   the catalog's "R". Pure: no DOM, no Math.random. */
import { M, SIZE } from '@core/units';
import { hash, type Rng } from '@core/rng';
import { PRESETS, PRESET_IDS, type PresetId } from '@core/presets';
import type { BalconyKind, FloorSpec, HouseInput, HouseSpec, Issue, RoofItem, SignSpec, WindowKind } from '@core/types';

type Defaults = Omit<HouseSpec, 'id' | 'seed' | 'upper' | 'preset'>;

export const DEFAULTS: Defaults = {
  x: 0, y: 0, w: SIZE.tubeW, d: SIZE.tubeD, facing: 'S',
  floors: 3, groundH: SIZE.groundH, floorH: SIZE.floorH, overhang: 0,
  ground: 'fold', shop: true, awning: 'none', shopName: 'TẠP HÓA', signs: [{ type: 'facade' }], stickers: 1,
  roof: 'flat', topRoom: false, topSetback: 2.8 * M, parapet: 0.8 * M, laundry: false, roofPlants: 0,
  roofItems: ['tank-h'], sideAC: 1,
};

const FLOOR_DEFAULT = { window: 'tall' as WindowKind, balcony: 'rail' as BalconyKind, balconyFloors: 'all' as const, plants: 1 };

export const LIMITS = { minW: 2.5 * M, maxFloors: 8, maxOverhang: 1.2 * M } as const;

export function isPreset(id: string | undefined): id is PresetId {
  return !!id && (PRESET_IDS as string[]).includes(id);
}

export function resolveSpec(input: HouseInput): { spec: HouseSpec; issues: Issue[] } {
  const issues: Issue[] = [];
  const warn = (field: string, message: string) => issues.push({ level: 'warn', field, message });
  const error = (field: string, message: string) => issues.push({ level: 'error', field, message });

  if (input.preset && !isPreset(input.preset)) error('preset', `unknown preset "${input.preset}"`);
  const preset: Partial<HouseInput> = isPreset(input.preset) ? PRESETS[input.preset] : {};
  const merged = { ...DEFAULTS, ...FLOOR_DEFAULT, ...stripLabel(preset), ...input };

  // per-floor: defaults for every upper floor, then the preset's floor list, then the input's
  const floors = clampInt(merged.floors, 0, LIMITS.maxFloors, 'floors', warn);
  const upper: FloorSpec[] = Array.from({ length: floors }, (_, i) => {
    const n = i + 2;   // floor number: ground = 1
    const on = merged.balconyFloors === 'all' || (merged.balconyFloors === 'odd' && n % 2 === 1) || (merged.balconyFloors === 'even' && n % 2 === 0);
    return {
      window: merged.window, balcony: on ? merged.balcony : 'none', plants: merged.plants, ac: false,
      ...preset.upper?.[i], ...input.upper?.[i],
    };
  });

  const spec: HouseSpec = {
    id: input.id,
    preset: input.preset,
    x: merged.x, y: merged.y, w: merged.w, d: merged.d, facing: merged.facing,
    seed: input.seed ?? hash(input.id),
    floors, groundH: merged.groundH, floorH: merged.floorH, overhang: merged.overhang,
    ground: merged.ground, shop: merged.shop, awning: merged.awning, shopName: merged.shopName,
    signs: [...merged.signs], stickers: clampInt(merged.stickers, 0, 4, 'stickers', warn),
    upper,
    roof: merged.roof, topRoom: merged.topRoom, topSetback: merged.topSetback, parapet: merged.parapet,
    laundry: merged.laundry, roofPlants: clampInt(merged.roofPlants, 0, 3, 'roofPlants', warn),
    roofItems: [...merged.roofItems], sideAC: clampInt(merged.sideAC, 0, 3, 'sideAC', warn),
  };

  // consistency rules (house-spec §4)
  if (spec.w < LIMITS.minW) error('w', `frontage ${spec.w} is below the minimum ${LIMITS.minW}`);
  if (spec.d < 6 * M) error('d', `depth ${spec.d} is below 6 m`);
  if (spec.floors === 0) {
    if (spec.overhang) { spec.overhang = 0; warn('overhang', 'a single-storey house cannot overhang; set to 0'); }
    if (spec.topRoom) { spec.topRoom = false; warn('topRoom', 'needs at least one upper floor; removed'); }
  }
  if (spec.overhang > LIMITS.maxOverhang) { spec.overhang = LIMITS.maxOverhang; warn('overhang', `clamped to ${LIMITS.maxOverhang}`); }
  if (spec.roof !== 'flat') {
    if (spec.topRoom) { spec.topRoom = false; warn('topRoom', 'only on a flat roof; removed'); }
    const kept = spec.roofItems.filter(i => i === 'antenna');
    if (kept.length !== spec.roofItems.length) { spec.roofItems = kept; warn('roofItems', 'only an antenna fits on a pitched roof'); }
    spec.roofPlants = 0; spec.laundry = false;
  }
  if (spec.topRoom && spec.topSetback < 1.5 * M) { spec.topSetback = 1.5 * M; warn('topSetback', 'raised to 1.5 m so the terrace fits'); }
  if (spec.floors === 0) spec.signs = spec.signs.filter(s => { const ok = s.type !== 'projecting-vertical' && s.type !== 'billboard'; if (!ok) warn('signs', `${s.type} needs an upper floor; removed`); return ok; });
  if (spec.signs.some(s => s.type === 'side-panels') && spec.w < 3.4 * M) {
    spec.signs = spec.signs.filter(s => s.type !== 'side-panels'); warn('signs', 'side panels need a 3.4 m frontage; removed');
  }
  return { spec, issues };
}

function stripLabel(p: Partial<HouseInput> & { label?: string }): Partial<HouseInput> {
  const { label: _label, upper: _upper, ...rest } = p;
  return rest;
}

function clampInt(v: number, lo: number, hi: number, field: string, warn: (f: string, m: string) => void): number {
  const n = Math.round(v);
  if (n < lo || n > hi || n !== v) warn(field, `${v} adjusted to ${Math.min(hi, Math.max(lo, n))}`);
  return Math.min(hi, Math.max(lo, n));
}

/** Errors stop a house from drawing; duplicate ids are a scene-level error. */
export function sceneIssues(inputs: readonly HouseInput[]): Issue[] {
  const seen = new Set<string>(), out: Issue[] = [];
  for (const h of inputs) {
    if (seen.has(h.id)) out.push({ level: 'error', field: 'id', message: `duplicate house id "${h.id}"` });
    seen.add(h.id);
  }
  return out;
}

// ---------- random houses (catalog "R") ----------

const SHOP_NAMES = ['CÀ PHÊ', 'PHỞ BÒ', 'TẠP HÓA', 'SỬA XE', 'BÚN CHẢ', 'CẮT TÓC', 'PHOTO', 'BÁNH MÌ', 'THUỐC', 'ĐIỆN THOẠI'];
const WINDOWS: WindowKind[] = ['tall', 'tall', 'louver', 'glass-doors', 'pair', 'wide'];
const BALCONIES: BalconyKind[] = ['rail', 'rail', 'cage', 'none'];

export function randomHouse(r: Rng, id: string, base: Partial<HouseInput> = {}): HouseInput {
  const preset = r.pick(PRESET_IDS);
  const p = PRESETS[preset] as Partial<HouseInput>;
  const pitched = p.roof === 'metal2' || r.chance(0.12);
  const floors = pitched ? 0 : r.int(1, 6);
  const shopName = r.pick(SHOP_NAMES);
  const signs: SignSpec[] = [{ type: 'facade' }];
  if (shopName === 'CẮT TÓC') signs.push({ type: 'barber-pole' });
  if (floors > 0 && r.chance(0.35)) signs.push({ type: 'projecting-vertical' });
  if (r.chance(0.25)) signs.push({ type: 'projecting-round' });
  if (r.chance(0.3)) signs.push({ type: 'standee', text: 'MENU' });
  if (floors >= 4 && r.chance(0.3)) signs.push({ type: 'billboard', text: 'CHO THUÊ BIỂN' });
  const items: RoofItem[] = pitched ? (r.chance(0.5) ? ['antenna'] : []) :
    (['tank-h', 'tank-v', 'solar', 'antenna'] as RoofItem[]).filter((_it, i) => i === 0 ? r.chance(0.7) : r.chance(0.4));
  return {
    ...base,
    id,
    preset,
    seed: r.int(1, 1e6),
    w: Math.round(r.int(32, 46) / 2) * 2, d: r.int(12, 18) * M,
    floors, overhang: floors > 0 && r.chance(0.4) ? 0.8 * M : 0,
    ground: r.pick(['fold', 'roll', 'glass', 'wood'] as const), shop: r.chance(0.85),
    awning: r.chance(0.4) ? 'fabric' : 'none', shopName, signs, stickers: r.int(0, 3),
    upper: Array.from({ length: floors }, () => ({ window: r.pick(WINDOWS), balcony: r.pick(BALCONIES), plants: r.int(0, 3), ac: r.chance(0.25) })),
    roof: pitched ? 'metal2' : 'flat', topRoom: !pitched && floors >= 2 && r.chance(0.45),
    laundry: r.chance(0.5), roofPlants: r.int(0, 2), roofItems: items, sideAC: r.int(0, 3),
  };
}
