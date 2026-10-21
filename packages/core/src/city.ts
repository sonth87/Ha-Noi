/* The city model (docs/architecture/city-model.md): everything a renderer needs to draw an area,
   whatever the data came from (OpenStreetMap through osm-import, or built by hand). Metres, x east
   (along Tây Sơn toward Ô Chợ Dừa), y south, z up (ADR-033). Rings have positive shoelace area
   (geom.ts). A renderer draws any City; adding a street or a building is adding data. */
import type { Vec2 } from './geom';
import type { HouseInput, HouseSpec } from './house-types';

/** where an element came from: e.g. "osm:way/136257265", or "hand:…" */
export type SourceId = string;

export type StreetKind = 'primary' | 'secondary' | 'tertiary' | 'link' | 'residential' | 'service' | 'alley' | 'footway' | 'steps';

export interface Street {
  id: string;
  name?: string;
  kind: StreetKind;
  /** centre line, in the direction of travel for one-way streets */
  path: Vec2[];
  /** carriageway width (m) */
  width: number;
  lanes: number;
  oneway: boolean;
  /** sidewalk width (m) on each side, looking along `path` */
  sidewalk: { left: number; right: number };
  /** 0 at grade; 1 and up on a bridge */
  layer: number;
  /** road surface height along the path: [distance from the start (m), z (m)], increasing distance;
      empty = at grade everywhere */
  profile: [number, number][];
  source: SourceId;
}

export interface Junction {
  id: string;
  at: Vec2;
  /** ids of the streets meeting here */
  streets: string[];
  /** traffic lights at or right next to it */
  signals: boolean;
}

export type BuildingKind = 'kiosk' | 'tube-house' | 'house' | 'villa' | 'apartment' | 'office' | 'commercial' | 'hotel' | 'school' | 'other';

export interface BuildingPart {
  id: string;
  footprint: Vec2[];
  /** height of the bottom of the part (m) */
  z0: number;
  /** storey heights, bottom to top (m); the part is z0 … z0 + sum */
  floors: number[];
  /** walls: rendered/painted, or curtain glass */
  facade: 'wall' | 'glass';
  roof: 'flat' | 'pitched';
  source: SourceId;
}

export interface Building {
  id: string;
  name?: string;
  kind: BuildingKind;
  /** the whole building's outline */
  footprint: Vec2[];
  /** the masses to draw (at least one); with real parts, the outline itself is not drawn */
  parts: BuildingPart[];
  /** where the storey count came from */
  levelsFrom: 'osm' | 'override' | 'rule';
  /** index i of the footprint edge (i → i+1) facing the street */
  front: number;
  /** facade detail for houses built by the generator (tube houses, small houses, kiosks) */
  house?: { input: HouseInput; spec: HouseSpec };
  /** a hand-made model the renderer may use for details ('viet-tower', 'novotel', …) */
  model?: string;
  source: SourceId;
}

export type AreaKind = 'park' | 'grass' | 'water' | 'pitch' | 'pool' | 'plaza' | 'traffic-island' | 'bridge';

export interface Area {
  id: string;
  kind: AreaKind;
  name?: string;
  polygon: Vec2[];
  source: SourceId;
}

export type FeatureKind = 'traffic-signals' | 'crossing' | 'bus-stop' | 'tree' | 'street-lamp' | 'power-pole';

export interface Feature {
  id: string;
  kind: FeatureKind;
  at: Vec2;
  source: SourceId;
}

export type RailKind = 'metro' | 'rail' | 'tram';

export interface Rail {
  id: string;
  name?: string;
  kind: RailKind;
  /** centre line of one track, in its direction of travel when the data gives one */
  path: Vec2[];
  /** on a viaduct (or a bridge) above the street */
  elevated: boolean;
  /** height of the top of the rails above the street (m), when elevated */
  height: number;
  source: SourceId;
}

export interface Station {
  id: string;
  name?: string;
  kind: RailKind;
  at: Vec2;
  /** the platforms (outlines) */
  platforms: Vec2[][];
  source: SourceId;
}

export interface City {
  id: string;
  name: string;
  /** the part of the world the model covers: the box round it, and the rectangles it is made of */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  region: { x0: number; y0: number; x1: number; y1: number }[];
  streets: Street[];
  junctions: Junction[];
  buildings: Building[];
  areas: Area[];
  features: Feature[];
  rails: Rail[];
  stations: Station[];
  /** data credits the app must show (e.g. "© OpenStreetMap contributors") */
  attribution: string[];
}

// ---------- reading the model ----------

/** top of a part (m) */
export const partTop = (p: BuildingPart) => p.z0 + p.floors.reduce((s, h) => s + h, 0);

/** bottom height of storey i (0-based) of a part */
export const floorZ = (p: BuildingPart, i: number) => p.z0 + p.floors.slice(0, i).reduce((s, h) => s + h, 0);

export const buildingHeight = (b: Building) => Math.max(...b.parts.map(partTop));

/** storeys of the building: the most of any part (parts stand on the ground; storey n of every
    part is the same floor n of the building) */
export const buildingLevels = (b: Building) => Math.max(...b.parts.map(p => p.floors.length));

/** id of storey n (1 = ground) of a building, for lighting by floor */
export const floorId = (b: Building, n: number) => `${b.id}/${n}`;

/** road height at distance s along a street */
export function streetZ(st: Street, s: number): number {
  const p = st.profile;
  if (!p.length) return 0;
  if (s <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) {
    const [s0, z0] = p[i - 1]!, [s1, z1] = p[i]!;
    if (s <= s1) return s1 === s0 ? z1 : z0 + ((z1 - z0) * (s - s0)) / (s1 - s0);
  }
  return p[p.length - 1]![1];
}
