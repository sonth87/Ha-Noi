/* House presets (docs/architecture/house-spec.md §3): named partial specs. Adding a preset must
   never require touching render/ (success criterion S3). */
import { M } from '@core/units';
import type { HouseInput } from '@core/types';

export type Preset = Omit<HouseInput, 'id'> & { label: string };

export const PRESETS = {
  /** the approved reference house (P1a), rebuilt from data */
  'nha-mau': {
    label: 'Nhà mẫu · cà phê',
    w: 4 * M, d: 15 * M, floors: 3, overhang: 0.8 * M,
    ground: 'fold', awning: 'fabric', shopName: 'CÀ PHÊ',
    signs: [{ type: 'facade' }, { type: 'projecting-vertical', text: 'CAFE' }, { type: 'standee', text: 'MENU' }],
    stickers: 1,
    upper: [
      { window: 'glass-doors', balcony: 'rail', plants: 3 },
      { window: 'tall', balcony: 'cage', plants: 1 },
      { window: 'louver', balcony: 'none', ac: true },
    ],
    topRoom: true, topSetback: 2.8 * M, laundry: true, roofPlants: 2,
    roofItems: ['tank-h', 'antenna', 'solar'], sideAC: 2,
  },
  'cap4-metal': {
    label: 'Cấp 4 mái tôn · cắt tóc',
    w: 4.2 * M, d: 15 * M, floors: 0,
    ground: 'glass', shopName: 'CẮT TÓC',
    signs: [{ type: 'facade' }, { type: 'barber-pole' }, { type: 'projecting-round', text: '✂' }],
    stickers: 1, roof: 'metal2', sideAC: 0,
  },
  '2f-balcony': {
    label: '2 tầng ban công',
    w: 4 * M, d: 14 * M, floors: 1,
    ground: 'roll', shopName: 'TẠP HÓA', signs: [{ type: 'facade' }],
    window: 'glass-doors', balcony: 'rail', plants: 2,
    roofItems: ['tank-h'], roofPlants: 1, sideAC: 1,
  },
  '3f-tank': {
    label: '3 tầng bồn nước',
    w: 4 * M, d: 15 * M, floors: 2,
    ground: 'roll', shop: false, signs: [], stickers: 2,
    window: 'tall', balcony: 'rail', balconyFloors: 'odd', plants: 1,
    roofItems: ['tank-h', 'solar'], sideAC: 1,
  },
  'tube-5f-cage': {
    label: 'Nhà ống 5 tầng chuồng cọp',
    w: 3.8 * M, d: 18 * M, floors: 4, overhang: 0.8 * M,
    ground: 'fold', awning: 'fabric', shopName: 'PHỞ BÒ',
    signs: [{ type: 'facade' }, { type: 'standee', text: 'PHỞ' }],
    window: 'tall', balcony: 'cage', plants: 1,
    upper: [{ balcony: 'rail', plants: 3 }, {}, { window: 'louver', ac: true }, { window: 'pair', balcony: 'none' }],
    roofItems: ['tank-h', 'antenna'], roofShelter: 'full', roofPlants: 2, sideAC: 2,
  },
  'tube-6f-photo': {
    label: 'Nhà ống 6 tầng · photo',
    w: 3.6 * M, d: 15 * M, floors: 5,
    ground: 'roll', shopName: 'PHOTO',
    signs: [{ type: 'side-panels', text: 'PHOTO|IN ẤN' }, { type: 'billboard', text: 'CHO THUÊ BIỂN' }],
    window: 'tall', balcony: 'rail', balconyFloors: 'odd', plants: 1,
    upper: [{}, {}, {}, {}, { window: 'pair', balcony: 'none' }],
    topRoom: true, roofShelter: 'terrace', laundry: true,
    roofItems: ['tank-v'], roofPlants: 1, sideAC: 0,
  },
} as const satisfies Record<string, Preset>;

export type PresetId = keyof typeof PRESETS;

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
