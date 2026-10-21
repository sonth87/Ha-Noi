/* House presets (ported from apps/svg, sizes now in metres): named partial specs. Adding a preset
   must never require touching a renderer. */
import type { HouseInput } from './house-types';

export type Preset = Omit<HouseInput, 'id'> & { label: string };

export const PRESETS = {
  /** the approved reference house (P1a), rebuilt from data */
  'nha-mau': {
    label: 'Nhà mẫu · cà phê',
    w: 4, d: 15, floors: 3, overhang: 0.8,
    ground: 'fold', awning: 'fabric', shopName: 'CÀ PHÊ',
    signs: [{ type: 'facade' }, { type: 'projecting-vertical', text: 'CAFE' }, { type: 'standee', text: 'MENU' }],
    stickers: 1,
    upper: [
      { window: 'glass-doors', balcony: 'rail', plants: 3 },
      { window: 'tall', balcony: 'cage', plants: 1 },
      { window: 'louver', balcony: 'none', ac: true },
    ],
    topRoom: true, topSetback: 2.8, laundry: true, roofPlants: 2,
    roofItems: ['tank-h', 'antenna', 'solar'], sideAC: 2,
  },
  'cap4-metal': {
    label: 'Cấp 4 mái tôn · cắt tóc',
    w: 4.2, d: 15, floors: 0,
    ground: 'glass', shopName: 'CẮT TÓC',
    signs: [{ type: 'facade' }, { type: 'barber-pole' }, { type: 'projecting-round', text: '✂' }],
    stickers: 1, roof: 'metal2', sideAC: 0,
  },
  '2f-balcony': {
    label: '2 tầng ban công',
    w: 4, d: 14, floors: 1,
    ground: 'roll', shopName: 'TẠP HÓA', signs: [{ type: 'facade' }],
    window: 'glass-doors', balcony: 'rail', plants: 2,
    roofItems: ['tank-h'], roofPlants: 1, sideAC: 1, trees: 'left', treeSize: 'small',
  },
  '3f-tank': {
    label: '3 tầng bồn nước',
    w: 4, d: 15, floors: 2,
    ground: 'roll', shop: false, signs: [], stickers: 2,
    window: 'tall', balcony: 'rail', balconyFloors: 'odd', plants: 1,
    upper: [{}, { balconyWidth: 'short', plants: 2 }],
    roofItems: ['tank-h', 'solar'], sideAC: 1, trees: 'right', treeSize: 'medium',
  },
  'tube-5f-cage': {
    label: 'Nhà ống 5 tầng chuồng cọp',
    w: 3.8, d: 18, floors: 4, overhang: 0.8,
    ground: 'fold', awning: 'fabric', shopName: 'PHỞ BÒ',
    signs: [{ type: 'facade' }, { type: 'standee', text: 'PHỞ' }],
    window: 'tall', balcony: 'cage', plants: 1,
    upper: [{ balcony: 'rail', plants: 3 }, {}, { window: 'louver', ac: true }, { window: 'pair', balcony: 'none' }],
    roofItems: ['tank-h', 'antenna'], roofShelter: 'full', roofPlants: 2, sideAC: 2, trees: 'right', treeSize: 'large',
  },
  'tube-6f-photo': {
    label: 'Nhà ống 6 tầng · photo',
    w: 3.6, d: 15, floors: 5,
    ground: 'roll', shopName: 'PHOTO',
    signs: [{ type: 'side-panels', text: 'PHOTO|IN ẤN' }, { type: 'billboard', text: 'CHO THUÊ BIỂN' }],
    window: 'tall', balcony: 'rail', balconyFloors: 'odd', plants: 1,
    upper: [{}, {}, {}, {}, { window: 'pair', balcony: 'none' }],
    topRoom: true, roofShelter: 'terrace', laundry: true,
    roofItems: ['tank-v'], roofPlants: 1, sideAC: 0,
  },
  /** two-and-a-half frontages, raised ground floor over a semi-basement garage */
  'wide-basement': {
    label: 'Nhà rộng · tầng hầm',
    w: 10, d: 16, floors: 4, basement: 1.4,
    ground: 'glass', shopName: 'NHÀ HÀNG',
    signs: [{ type: 'facade' }, { type: 'projecting-vertical', text: 'QUÁN' }],
    window: 'glass-doors', balcony: 'rail', plants: 3,
    upper: [{}, { window: 'wide', balcony: 'none', ac: true }, {}, { window: 'pair', balcony: 'none' }],
    topRoom: true, roofShelter: 'terrace', roofPlants: 3, roofItems: ['tank-h', 'solar'], sideAC: 2, trees: 'both', treeSize: 'medium',
  },
  /** a wide house built like any other */
  'wide-plain': {
    label: 'Nhà rộng · thường',
    w: 8, d: 14, floors: 3,
    ground: 'fold', awning: 'fabric', shopName: 'ĐIỆN MÁY', signs: [{ type: 'facade' }], stickers: 2,
    window: 'tall', balcony: 'rail', balconyFloors: 'even', plants: 2,
    roofItems: ['tank-h', 'tank-v', 'antenna'], roofShelter: 'full', sideAC: 1, trees: 'left', treeSize: 'large',
  },
  // ---- M4: more kinds, to build whole streets from data ----
  'tube-7f-narrow': {
    label: 'Nhà ống 7 tầng hẹp · thuốc',
    w: 3.2, d: 16, floors: 6,
    ground: 'roll', shopName: 'THUỐC', signs: [{ type: 'facade' }, { type: 'projecting-round', text: '+' }],
    window: 'tall', balcony: 'rail', balconyFloors: 'even', plants: 1,
    topRoom: true, roofItems: ['tank-v', 'solar'], sideAC: 2,
  },
  'cap4-tile': {
    label: 'Cấp 4 mái ngói',
    w: 5, d: 12, floors: 0,
    ground: 'wood', shop: false, signs: [], stickers: 0, roof: 'tile', sideAC: 0, trees: 'left', treeSize: 'medium',
  },
  /** an old villa: wide, two storeys over the ground, French windows, a tiled roof */
  'biet-thu': {
    label: 'Biệt thự',
    w: 10, d: 14, floors: 2,
    ground: 'glass', shop: false, signs: [], stickers: 0, wall: 'stone-base',
    window: 'french', balcony: 'glass', plants: 2,
    roof: 'tile', sideAC: 1, trees: 'both', treeSize: 'large',
  },
  /** khu tập thể: a wide old block, cages on every floor, no shop */
  'tap-the': {
    label: 'Khu tập thể',
    w: 12, d: 12, floors: 4,
    ground: 'iron', shop: false, signs: [], stickers: 3, wall: 'paint-old',
    window: 'pair', balcony: 'cage', plants: 1,
    upper: [{ laundry: true }, { ac: true }, { laundry: true }, {}],
    roofItems: ['tank-v', 'tank-h', 'antenna'], roofShelter: 'full', sideAC: 2,
  },
  /** a three-bay shop house with glass balconies */
  'nha-pho-rong': {
    label: 'Nhà phố 3 gian · thời trang',
    w: 9, d: 15, floors: 3,
    ground: 'glass', shopName: 'THỜI TRANG', signs: [{ type: 'facade' }, { type: 'projecting-vertical', text: 'SHOP' }],
    window: 'glass-doors', balcony: 'glass', plants: 2,
    topRoom: true, roofShelter: 'terrace', roofItems: ['tank-h', 'solar'], sideAC: 1, trees: 'right', treeSize: 'medium',
  },
} as const satisfies Record<string, Preset>;

export type PresetId = keyof typeof PRESETS;

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
