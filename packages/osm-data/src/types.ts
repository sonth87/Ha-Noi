/* The raw shapes of an OpenStreetMap API 0.6 JSON extract (/map.json). Only what the importer reads. */

export type OsmTags = Readonly<Record<string, string>>;

export interface OsmNode { type: 'node'; id: number; lat: number; lon: number; tags?: OsmTags }
export interface OsmWay { type: 'way'; id: number; nodes: readonly number[]; tags?: OsmTags }
export interface OsmMember { type: 'node' | 'way' | 'relation'; ref: number; role: string }
export interface OsmRelation { type: 'relation'; id: number; members: readonly OsmMember[]; tags?: OsmTags }
export type OsmElement = OsmNode | OsmWay | OsmRelation;

export interface OsmExtract {
  version: string;
  copyright?: string;
  license?: string;
  elements: readonly OsmElement[];
}

export interface OsmArea {
  id: string;
  name: string;
  /** the boxes downloaded and merged, each lon_min, lat_min, lon_max, lat_max */
  bboxes: readonly (readonly [number, number, number, number])[];
  file: string;
  /** YYYY-MM-DD */
  fetched: string;
  note?: string;
}

export interface OsmChunkManifest {
  key: string;
  cx: number;
  cy: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  file: string;
  elements: number;
  bytes: number;
}

export interface OsmCityManifest {
  id: string;
  legacyIds?: readonly string[];
  countryCode: string;
  name: string;
  title: string;
  origin: readonly [number, number];
  bearing: number;
  chunkSizeMeters: number;
  skeleton: string;
  skeletonElements: number;
  chunks: readonly OsmChunkManifest[];
}

export interface OsmCountryManifest {
  code: string;
  name: string;
  cities: Readonly<Record<string, OsmCityManifest>>;
}

export interface OsmWorldManifest {
  version: number;
  countries: Readonly<Record<string, OsmCountryManifest>>;
}

