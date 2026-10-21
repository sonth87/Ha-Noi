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
  /** lon_min, lat_min, lon_max, lat_max */
  bbox: readonly [number, number, number, number];
  file: string;
  /** YYYY-MM-DD */
  fetched: string;
  note?: string;
}
