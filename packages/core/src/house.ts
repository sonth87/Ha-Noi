/* resolveHouse: DEFAULTS ⊕ preset ⊕ input → a complete HouseSpec, plus the issues found while
   resolving. randomHouse: a seeded random input. Ported from apps/svg/src/core/spec.ts with every
   size in metres (ADR-033); the SVG-only parts (placement, cutaway) are left behind. Pure. */
import { SIZE } from './units';
import { hash, type Rng } from './rng';
import { PRESETS, PRESET_IDS, type PresetId } from './presets';
import type { BalconyKind, FloorSpec, HouseInput, HouseSpec, Issue, RoofItem, SignSpec, WindowKind } from './house-types';

type Defaults = Omit<HouseSpec, 'id' | 'seed' | 'upper' | 'preset'>;

export const DEFAULTS: Defaults = {
  w: SIZE.tubeW, d: SIZE.tubeD,
  floors: 3, basement: 0, groundH: SIZE.groundH, floorH: SIZE.floorH, overhang: 0, wall: 'plain', bays: 0,
  ground: 'fold', shop: true, awning: 'none', goods: 'none', trees: 'none', treeSize: 'medium', shopName: 'TẠP HÓA', signs: [{ type: 'facade' }], stickers: 1,
  roof: 'flat', topRoom: false, topSetback: 2.8, parapet: 0.8, stairHut: false, roofShelter: 'none', laundry: false, roofPlants: 0, roofPlantKind: 'mixed',
  roofItems: ['tank-h'], sideAC: 1, sideEnd: '+a', sideClear: 0, sideAd: '', sideWindows: false,
};

const FLOOR_DEFAULT = { window: 'tall' as WindowKind, balcony: 'rail' as BalconyKind, balconyFloors: 'all' as const, plants: 1 };

export const LIMITS = { minW: 2.5, maxW: 14, minD: 6, maxFloors: 8, maxOverhang: 1.2, basement: [1, 2] } as const;

export function isPreset(id: string | undefined): id is PresetId {
  return !!id && (PRESET_IDS as string[]).includes(id);
}

export function resolveHouse(input: HouseInput): { spec: HouseSpec; issues: Issue[] } {
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
      window: merged.window, balcony: on ? merged.balcony : 'none', plants: merged.plants, ac: false, canopy: 'none', laundry: false, balconyWidth: 'full', plantKind: 'mixed',
      ...preset.upper?.[i], ...input.upper?.[i],
    } as FloorSpec;
  });

  const spec: HouseSpec = {
    id: input.id,
    preset: input.preset,
    w: merged.w, d: merged.d,
    seed: input.seed ?? hash(input.id),
    floors, basement: merged.basement, groundH: merged.groundH, floorH: merged.floorH, overhang: merged.overhang,
    wall: merged.wall, bays: clampInt(merged.bays, 0, 6, 'bays', warn),
    ground: merged.ground, shop: merged.shop, awning: merged.awning, goods: merged.goods, trees: merged.trees, treeSize: merged.treeSize, shopName: merged.shopName,
    signs: [...merged.signs], stickers: clampInt(merged.stickers, 0, 4, 'stickers', warn),
    upper,
    roof: merged.roof, topRoom: merged.topRoom, topSetback: merged.topSetback, parapet: merged.parapet, stairHut: merged.stairHut, roofShelter: merged.roofShelter,
    laundry: merged.laundry, roofPlants: clampInt(merged.roofPlants, 0, 3, 'roofPlants', warn), roofPlantKind: merged.roofPlantKind,
    roofItems: [...merged.roofItems], sideAC: clampInt(merged.sideAC, 0, 3, 'sideAC', warn),
    sideEnd: merged.sideEnd, sideClear: Math.max(0, merged.sideClear), sideAd: merged.sideAd, sideWindows: merged.sideWindows,
  };

  // consistency rules (house-spec §4)
  if (spec.w < LIMITS.minW) error('w', `frontage ${spec.w} is below the minimum ${LIMITS.minW}`);
  if (spec.w > LIMITS.maxW) error('w', `frontage ${spec.w} is above the maximum ${LIMITS.maxW}`);
  if (spec.d < LIMITS.minD) error('d', `depth ${spec.d} m is below ${LIMITS.minD} m`);
  if (spec.floors === 0) {
    if (spec.overhang) { spec.overhang = 0; warn('overhang', 'a single-storey house cannot overhang; set to 0'); }
    if (spec.topRoom) { spec.topRoom = false; warn('topRoom', 'needs at least one upper floor; removed'); }
  }
  if (spec.basement !== 0 && (spec.basement < LIMITS.basement[0] || spec.basement > LIMITS.basement[1])) {
    const b = Math.min(LIMITS.basement[1], Math.max(LIMITS.basement[0], spec.basement));
    warn('basement', `${spec.basement} adjusted to ${b} (1–2 m, or 0 for none)`); spec.basement = b;
  }
  if (spec.overhang > LIMITS.maxOverhang) { spec.overhang = LIMITS.maxOverhang; warn('overhang', `clamped to ${LIMITS.maxOverhang}`); }
  if (spec.roof !== 'flat') {
    if (spec.topRoom) { spec.topRoom = false; warn('topRoom', 'only on a flat roof; removed'); }
    const kept = spec.roofItems.filter(i => i === 'antenna');
    if (kept.length !== spec.roofItems.length) { spec.roofItems = kept; warn('roofItems', 'only an antenna fits on a pitched roof'); }
    spec.roofPlants = 0; spec.laundry = false;
    if (spec.stairHut) { spec.stairHut = false; warn('stairHut', 'only on a flat roof; removed'); }
    if (spec.roofShelter !== 'none') { spec.roofShelter = 'none'; warn('roofShelter', 'only over a flat roof; removed'); }
  }
  // a terrace shelter needs a roof room to lean on; without one it covers the whole roof, and vice versa
  if (spec.roofShelter === 'terrace' && !spec.topRoom) { spec.roofShelter = 'full'; warn('roofShelter', 'no roof room: covering the whole roof instead'); }
  if (spec.roofShelter === 'full' && spec.topRoom) { spec.roofShelter = 'terrace'; warn('roofShelter', 'roof room present: covering the terrace instead'); }
  if (spec.roofShelter === 'full' && spec.roofItems.includes('solar')) {
    spec.roofItems = spec.roofItems.filter(i => i !== 'solar'); warn('roofItems', 'a solar heater cannot sit under a full roof shelter; removed');
  }
  // a flag beside a full shelter's back edge makes a ring of boxes no draw order can satisfy
  if (spec.roofShelter === 'full' && spec.roofItems.includes('flag')) {
    spec.roofItems = spec.roofItems.filter(i => i !== 'flag'); warn('roofItems', 'no flag pole on a fully sheltered roof; removed');
  }
  if (spec.stairHut && spec.topRoom) { spec.stairHut = false; warn('stairHut', 'the roof room already holds the stairs; removed'); }
  spec.upper.forEach((fl, i) => {
    if (fl.balcony === 'cage' && fl.canopy !== 'none') { fl.canopy = 'none'; warn(`upper[${i}].canopy`, 'a cage has its own cap; canopy removed'); }
    if (fl.laundry && fl.balcony === 'none') { fl.laundry = false; warn(`upper[${i}].laundry`, 'clothes need a balcony to dry on; removed'); }
  });
  if (spec.topRoom && spec.topSetback < 1.5) { spec.topSetback = 1.5; warn('topSetback', 'raised to 1.5 m so the terrace fits'); }
  if (spec.floors === 0) spec.signs = spec.signs.filter(s => { const ok = s.type !== 'projecting-vertical' && s.type !== 'billboard'; if (!ok) warn('signs', `${s.type} needs an upper floor; removed`); return ok; });
  if (spec.signs.some(s => s.type === 'side-panels') && spec.w < 3.4) {
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

/** storey heights of a house, bottom to top: the ground floor (over its semi-basement) and the upper floors */
export const houseStoreys = (s: Pick<HouseSpec, 'basement' | 'groundH' | 'floors' | 'floorH'>): number[] =>
  [s.basement + s.groundH, ...Array.from({ length: s.floors }, () => s.floorH)];

/** Top of the house's solid mass (upper floors; roof room and roof items not included). */
export const topZ = (s: Pick<HouseSpec, 'groundH' | 'floors' | 'floorH' | 'basement'>) => s.basement + s.groundH + s.floors * s.floorH;

/** heights of roof items above the roof they stand on (render/parts/roof-items.ts) */
const ITEM_H: Record<string, number> = { 'tank-h': 1.6, 'tank-v': 1.8, solar: 2.4, antenna: 3.2, ac: 0.7, flag: 3 };

/** Highest point of a house: roof, roof room, roof items, shelter (for neighbours' sideClear). */
export function peakZ(s: HouseSpec): number {
  const top = topZ(s);
  if (s.roof !== 'flat') return top + 1.4 + (s.roofItems.includes('antenna') ? 2.6 : 0);
  const base = s.topRoom ? top + s.floorH - 0.2 : top;
  let z = Math.max(top + s.parapet, top + 1.5 /* pots, laundry */, base, s.stairHut ? top + 2.4 : 0, ...s.roofItems.map(i => base + (ITEM_H[i] ?? 0)));
  // the shelter's ridge rises 0.3 × the frontage above its eaves (old app: round(w · 0.3) in 1 m = 10 units)
  if (s.roofShelter === 'terrace') z = Math.max(z, top + s.floorH + 0.1 + s.w * 0.3);
  if (s.roofShelter === 'full') z = Math.max(z, top + 2.4 + s.w * 0.3);
  return z;
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
const WINDOWS: WindowKind[] = ['tall', 'tall', 'louver', 'glass-doors', 'pair', 'wide', 'arch', 'french', 'glass'];
const BALCONIES: BalconyKind[] = ['rail', 'rail', 'solid', 'glass', 'cage', 'none'];

/** A seeded random house. `base.w`, `base.d` and `base.floors`, when given, are kept (a house built
    on a real footprint); everything else is picked, the preset from `pool` (default: all). */
export function randomHouse(r: Rng, id: string, base: Partial<HouseInput> = {}, pool: readonly PresetId[] = PRESET_IDS): HouseInput {
  const preset = r.pick(pool.length ? pool : PRESET_IDS);
  const p = PRESETS[preset] as Partial<HouseInput>;
  const pitched = base.floors !== undefined ? base.floors === 0 && r.chance(0.7) : p.roof === 'metal2' || r.chance(0.12);
  const roof = pitched ? r.pick(['metal2', 'metal2', 'metal1', 'tile'] as const) : 'flat';
  const wide = base.w !== undefined ? base.w >= 7 : r.chance(0.12);
  const w = base.w ?? (wide ? r.int(40, 60) * 0.2 : Math.round(r.int(32, 46) / 2) * 0.2);
  const floors = base.floors ?? (pitched ? 0 : r.int(1, 6));
  const shopName = r.pick(SHOP_NAMES);
  const signs: SignSpec[] = [{ type: 'facade' }];
  if (shopName === 'CẮT TÓC') signs.push({ type: 'barber-pole' });
  if (floors > 0 && r.chance(0.35)) signs.push({ type: 'projecting-vertical' });
  if (r.chance(0.25)) signs.push({ type: 'projecting-round' });
  if (r.chance(0.3)) signs.push({ type: 'standee', text: 'MENU' });
  if (floors >= 4 && r.chance(0.3)) signs.push({ type: 'billboard', text: 'CHO THUÊ BIỂN' });
  const topRoom = !pitched && floors >= 2 && r.chance(0.45);
  // many tube houses roof their terrace (or the whole roof) with corrugated metal; many don't
  const roofShelter = pitched ? 'none' : topRoom ? (r.chance(0.5) ? 'terrace' : 'none') : (r.chance(0.35) ? 'full' : 'none');
  const items: RoofItem[] = pitched ? (r.chance(0.5) ? ['antenna'] : []) :
    (['tank-h', 'tank-v', 'solar', 'antenna', 'ac', 'flag'] as RoofItem[]).filter((_it, i) => i === 0 ? r.chance(0.7) : i === 2 && roofShelter === 'full' ? false : r.chance(i >= 4 ? 0.25 : 0.4));
  return {
    ...base,
    id,
    preset,
    seed: r.int(1, 1e6),
    w, d: base.d ?? r.int(12, 18),
    // wide houses (2–3 frontages) often raise the ground floor over a semi-basement garage; some don't
    floors, basement: (wide ? r.chance(0.6) : r.chance(0.06)) ? r.int(12, 16) / 10 : 0,
    overhang: floors > 0 && r.chance(0.4) ? 0.8 : 0,
    ground: r.pick(['fold', 'roll', 'glass', 'wood'] as const), shop: r.chance(0.85),
    awning: r.chance(0.4) ? 'fabric' : 'none', shopName, signs, stickers: r.int(0, 3),
    upper: Array.from({ length: floors }, () => {
      const balcony = r.pick(BALCONIES);
      return {
        window: r.pick(WINDOWS), balcony, plants: r.int(0, 3), ac: r.chance(0.25),
        canopy: balcony === 'cage' ? 'none' as const : r.pick(['none', 'none', 'concrete', 'metal'] as const),
        laundry: balcony !== 'none' && r.chance(0.3),
        balconyWidth: r.chance(0.45) ? 'short' as const : 'full' as const,
      };
    }),
    wall: r.pick(['plain', 'plain', 'tile', 'paint-old', 'stone-base'] as const),
    goods: r.pick(['none', 'none', 'stools', 'bikes', 'crates'] as const),
    // Hà Nội streets are full of trees: most frontages have one, some two, small to huge
    trees: r.pick(['none', 'left', 'right', 'both', 'left', 'right'] as const),
    treeSize: r.pick(['small', 'medium', 'medium', 'large', 'large'] as const),
    stairHut: !pitched && !topRoom && floors > 0 && r.chance(0.3),
    sideAd: r.chance(0.15) ? r.pick(['KHOAN CẮT BÊ TÔNG|0912 345 678', 'CHO THUÊ NHÀ|0987 654 321', 'SƠN NƯỚC|0903 111 222']) : '',
    sideWindows: r.chance(0.25),
    roof, topRoom, roofShelter,
    laundry: r.chance(0.5), roofPlants: r.int(0, 2), roofItems: items, sideAC: r.int(0, 3),
  };
}
