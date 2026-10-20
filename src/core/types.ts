/* Shared data types (docs/architecture/house-spec.md). Units: 1 m = 10. */

/** Street-facing direction in data space: N = −y, S = +y, E = +x, W = −x. */
export type Facing = 'N' | 'E' | 'S' | 'W';

/** View rotation: the world turned k × 90° (docs/architecture/overview.md §6). */
export type ViewK = 0 | 1 | 2 | 3;

/** Axis-aligned 3D box: corner + size, in code units. */
export interface Box3 {
  x: number; y: number; z: number;
  w: number; d: number; h: number;
}

/** Anything the depth sort orders: a world box plus the SVG drawn for it. */
export interface Item {
  id: string;
  box: Box3;
  svg: string;
}

// ---------- house spec ----------

export type GroundKind = 'fold' | 'roll' | 'glass' | 'wood' | 'wall' | 'iron';
export type AwningKind = 'none' | 'fabric' | 'metal';
export type WindowKind = 'tall' | 'louver' | 'glass-doors' | 'pair' | 'wide' | 'arch' | 'french' | 'glass';
export type BalconyKind = 'none' | 'rail' | 'solid' | 'glass' | 'cage';
export type RoofKind = 'flat' | 'metal2' | 'metal1' | 'tile';
/** facade finish: plain render, glazed tiles, old peeling paint, stone cladding on the ground floor */
export type WallFinish = 'plain' | 'tile' | 'paint-old' | 'stone-base';
/** ô văng: a small concrete or metal canopy over a floor's window */
export type Canopy = 'none' | 'concrete' | 'metal';
/** what the shop puts out on the sidewalk */
export type Goods = 'none' | 'stools' | 'bikes' | 'crates';
/** corrugated metal sheet on thin posts over a flat roof: over the terrace in front of the roof room, or over the whole roof */
export type RoofShelter = 'none' | 'terrace' | 'full';
export type RoofItem = 'tank-h' | 'tank-v' | 'solar' | 'antenna' | 'ac' | 'flag';
export type SignKind = 'facade' | 'side-panels' | 'projecting-vertical' | 'projecting-round' | 'standee' | 'barber-pole' | 'billboard';

export interface SignSpec {
  type: SignKind;
  /** lettering; defaults to the house's shopName */
  text?: string;
}

/** One upper floor (floor 2 and up). */
export interface FloorSpec {
  window: WindowKind;
  balcony: BalconyKind;
  /** pots on this floor's balcony, 0–3 */
  plants: number;
  /** outdoor AC unit on the facade below this floor's window */
  ac: boolean;
  /** balcony across the whole frontage, or short: a little wider than the window, one per bay */
  balconyWidth: 'full' | 'short';
  /** ô văng over the window (not with a cage, which has its own cap) */
  canopy: Canopy;
  /** clothes drying on the balcony */
  laundry: boolean;
}

/** A fully resolved house: every field present (after resolveSpec). */
export interface HouseSpec {
  id: string;
  preset?: string;
  /** footprint corner (smallest x, y), before view rotation */
  x: number;
  y: number;
  /** frontage along the street */
  w: number;
  /** depth away from the street (ground floor; upper floors add `overhang`) */
  d: number;
  facing: Facing;
  seed: number;

  /** storeys above the ground floor; 0 = single-storey house */
  floors: number;
  /** semi-basement garage under a raised ground floor (0 = none); the ground floor sits this much higher */
  basement: number;
  groundH: number;
  floorH: number;
  /** upper floors jut out over the sidewalk by this much */
  overhang: number;

  /** facade finish */
  wall: WallFinish;
  /** bays across the upper facade (0 = one per ~4 m) */
  bays: number;

  ground: GroundKind;
  /** shop open: shutter up, interior lit with the ground floor */
  shop: boolean;
  awning: AwningKind;
  /** set out on the sidewalk in front of the shop */
  goods: Goods;
  /** street trees at the curb in front of the house (left / right as seen from the street) */
  trees: 'none' | 'left' | 'right' | 'both';
  treeSize: 'small' | 'medium' | 'large';
  shopName: string;
  signs: SignSpec[];
  /** A5 paper ads stuck at ground-floor height, 0–4 */
  stickers: number;

  /** one entry per upper floor, bottom to top */
  upper: FloorSpec[];

  roof: RoofKind;
  /** a room on the roof, set back from the facade, with a terrace in front (flat roof only) */
  topRoom: boolean;
  /** distance from the upper facade to the roof room's front wall */
  topSetback: number;
  parapet: number;
  /** a small stair hut at the back of a flat roof without a roof room */
  stairHut: boolean;
  /** mái tôn: 'terrace' needs a roof room, 'full' a flat roof without one */
  roofShelter: RoofShelter;
  laundry: boolean;
  /** pots on the terrace / roof, 0–3 */
  roofPlants: number;
  roofItems: RoofItem[];

  /** AC units hung on the exposed side wall, 0–3 */
  sideAC: number;
  /** which end wall is exposed (tường hồi): things hung on the side (AC units, billboard) go only here */
  sideEnd: '+a' | '-a';
  /** height above which that end wall is free of the neighbour (0 = nothing next to it) */
  sideClear: number;
  /** painted ad on the exposed end wall ('' = none), "LINE 1|LINE 2" */
  sideAd: string;
  /** small windows in the exposed end wall, above the neighbour, lit with their floor */
  sideWindows: boolean;
}

/** What a scene or preset writes: an id plus any subset of fields; `upper` may be partial per floor. */
export type HouseInput = Partial<Omit<HouseSpec, 'id' | 'upper'>> & {
  id: string;
  upper?: Partial<FloorSpec>[];
  /** defaults for every upper floor, applied before `upper` */
  window?: WindowKind;
  balcony?: BalconyKind;
  balconyFloors?: 'all' | 'odd' | 'even' | 'none';
  plants?: number;
};

export interface Issue {
  level: 'error' | 'warn';
  field: string;
  message: string;
}
