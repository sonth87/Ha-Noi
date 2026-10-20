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

export type GroundKind = 'fold' | 'roll' | 'glass' | 'wood' | 'wall';
export type AwningKind = 'none' | 'fabric';
export type WindowKind = 'tall' | 'louver' | 'glass-doors' | 'pair' | 'wide';
export type BalconyKind = 'none' | 'rail' | 'cage';
export type RoofKind = 'flat' | 'metal2';
/** corrugated metal sheet on thin posts over a flat roof: over the terrace in front of the roof room, or over the whole roof */
export type RoofShelter = 'none' | 'terrace' | 'full';
export type RoofItem = 'tank-h' | 'tank-v' | 'solar' | 'antenna';
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
  groundH: number;
  floorH: number;
  /** upper floors jut out over the sidewalk by this much */
  overhang: number;

  ground: GroundKind;
  /** shop open: shutter up, interior lit with the ground floor */
  shop: boolean;
  awning: AwningKind;
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
  /** mái tôn: 'terrace' needs a roof room, 'full' a flat roof without one */
  roofShelter: RoofShelter;
  laundry: boolean;
  /** pots on the terrace / roof, 0–3 */
  roofPlants: number;
  roofItems: RoofItem[];

  /** AC units hung on the exposed side wall, 0–3 */
  sideAC: number;
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
