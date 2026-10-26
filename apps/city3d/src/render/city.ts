/* The city as layers the view puts on screen (M3–M4, ADR-035, ADR-036). No materials here: the view
   makes those from the theme tokens.
     - the base layer: ground, areas, streets and bridges, built once;
     - building tiles: the buildings grouped in 64 m squares, each tile built per detail level
       (L0–L3) only when the view first needs it.
   Every layer is merged per surface (a few draw calls), its windows carry a colour attribute so a
   floor lights by rewriting its slice, and a lookup turns a clicked triangle back into a building
   and a floor. Pure. */
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { buildingHeight, centroid, floorId, floorZ, pointInRing, type Building, type City } from '@my-city/core';
import { Batch, type LampRange, type Surface } from './batch';
import { beaconsOf, buildBuildings, cityFloors, type Detail } from './buildings';
import {
  buildAreas,
  buildForecourts,
  buildGround,
  buildLocalStreetTileBatch,
  buildMonumentFeatures,
  buildStreets,
  localStreetTilesOf,
  type LocalStreetTile,
} from './streets';
import { buildMetro } from './metro';

export { localStreetTilesOf, type LocalStreetTile };

export interface Layer {
  surfaces: Map<Surface, THREE.BufferGeometry>;
  shell: THREE.BufferGeometry;
  creases: LineSegmentsGeometry;
  details: LineSegmentsGeometry;
  /** window quads, with a `color` attribute the view rewrites per lamp */
  windows: THREE.BufferGeometry;
  /** lamp id → the window vertices it lights, in this layer */
  lamps: Map<string, LampRange[]>;
  /** lamp id → its windows' outline segments in `details` (coloured per segment) */
  lampLines: Map<string, LampRange[]>;
  /** clicked triangle of a surface mesh → building id */
  ownerOf: (surface: Surface, face: number) => string | undefined;
  /** building + clicked point (three.js) → floor id */
  floorAt: (building: string, point: THREE.Vector3) => string | undefined;
  stats: { triangles: number; lines: number; windows: number };
}

export interface MapBaseLayers {
  /** Flat ground, lakes, rivers, parks, and plazas — visible at all zoom levels including city overview */
  terrain: Layer;
  /** Named/major street carriageways and road bridges — visible when zoom >= 0.20, hidden in city overview */
  majorStreets: Layer;
  /** Minor alleys, sidewalks, lane markings, and building forecourts — visible only in close street view (zoom >= 0.72) */
  localStreets: Layer;
  /** Metro viaducts, station platforms, and monument statues — visible when zoom >= 0.38 */
  metro: Layer;
}

export interface Tile {
  id: string;
  buildings: Building[];
  /** middle of the tile and the radius round it holding all its buildings (m, city model) */
  center: [number, number];
  radius: number;
}

export const TILE = 64;

/** True for iconic/bespoke landmarks, historic temples/pagodas/monuments, tall towers, and major named buildings */
export function isMajorLandmarkBuilding(b: Building): boolean {
  if (b.model != null) return true;
  const h = buildingHeight(b);
  if (h >= 38) return true;
  if (b.name && h >= 22) return true;
  return false;
}

export function buildBase(city: City, shellB?: Batch, railB?: Batch): Layer {
  const B = new Batch();
  buildGround(B, city);
  buildAreas(B, city);
  buildStreets(B, city);
  buildForecourts(B, city);
  buildMetro(B, city, shellB ?? B, railB);
  return layerOf(B, true, city);
}

/** The six batches of the map base before they become GPU geometry: this is the expensive part (about
    1.5 s for the whole of Hà Nội) and it is pure data, so it can run in a Web Worker (`baseWorker.ts`). */
export interface MapBaseBatches {
  terrain: Batch;
  major: Batch;
  local: Batch;
  metro: Batch;
  /** metro station shells and rail tracks, drawn by their own groups */
  shell: Batch;
  rail: Batch;
}

export function buildMapBaseBatches(city: City, skipLocalStreets = false, shellB?: Batch, railB?: Batch): MapBaseBatches {
  const terrain = new Batch();
  buildGround(terrain, city);
  buildAreas(terrain, city, false);

  const major = new Batch();
  buildStreets(major, city, 'major');

  const local = new Batch();
  if (!skipLocalStreets) {
    buildStreets(local, city, 'local');
    buildForecourts(local, city);
  }

  const metro = new Batch();
  buildMonumentFeatures(metro, city);
  buildMetro(metro, city, shellB ?? metro, railB);
  return { terrain, major, local, metro, shell: shellB ?? new Batch(), rail: railB ?? new Batch() };
}

/** the batches as layers (cheap compared with building them) */
export function layersOfBase(city: City, b: MapBaseBatches): MapBaseLayers & { stationShell: Layer; railTracks: Layer } {
  return {
    terrain: layerOf(b.terrain, true, city),
    majorStreets: layerOf(b.major, true, city),
    localStreets: layerOf(b.local, true, city),
    metro: layerOf(b.metro, true, city),
    stationShell: layerOf(b.shell, true, city),
    railTracks: layerOf(b.rail, true, city),
  };
}

/** Build separated semantic base layers so zoomed-out stages can hide local alleys/sidewalks/forecourts or all streets */
export function buildMapBaseLayers(city: City, shellB?: Batch, railB?: Batch, skipLocalStreets = false): MapBaseLayers {
  const { terrain, majorStreets, localStreets, metro } = layersOfBase(city, buildMapBaseBatches(city, skipLocalStreets, shellB, railB));
  return { terrain, majorStreets, localStreets, metro };
}

/** Build a single 256 m spatial tile of local streets, sidewalks, lane markings, footways, and forecourts on demand */
export function buildLocalStreetTile(city: City, tile: LocalStreetTile): Layer {
  const B = new Batch();
  buildLocalStreetTileBatch(B, tile);
  return layerOf(B, true, city);
}

/** Single merged Layer containing only major landmarks and tall buildings across the city (for mid-range zoom 0.38 <= zoom < 0.72) */
export function buildLandmarkOverviewLayer(city: City, level: Detail = 1): Layer {
  const B = new Batch();
  const landmarks = city.buildings.filter(isMajorLandmarkBuilding);
  buildBuildings(B, city, landmarks, level);
  return layerOf(B, true, city);
}

/** the buildings grouped by the 64 m square their centre falls in */
export function tilesOf(city: City, size = TILE): Tile[] {
  const groups = new Map<string, Building[]>();
  for (const b of city.buildings) {
    const c = centroid(b.footprint), k = `${Math.floor(c[0] / size)},${Math.floor(c[1] / size)}`;
    let list = groups.get(k);
    if (!list) groups.set(k, (list = []));
    list.push(b);
  }
  return [...groups].map(([k, bs]) => {
    const [i, j] = k.split(',').map(Number) as [number, number], center: [number, number] = [(i + 0.5) * size, (j + 0.5) * size];
    let radius = 0;
    for (const b of bs) {
      for (const p of b.footprint) {
        const d = Math.hypot(p[0] - center[0], p[1] - center[1]);
        if (d > radius) radius = d;
      }
    }
    return { id: k, buildings: bs, center, radius };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
}


export function buildTile(city: City, tile: Tile, level: Detail, skipIds?: ReadonlySet<string>): Layer {
  const B = new Batch();
  const bs = skipIds && skipIds.size ? tile.buildings.filter(b => !skipIds.has(b.id)) : tile.buildings;
  buildBuildings(B, city, bs, level);
  return layerOf(B, true, city);
}

/** everything in one layer at one level (tests, and a quick look at the whole) */
export function buildCityGeometry(city: City, level: Detail = 1): Layer & { floors: string[]; beacons: THREE.Vector3[] } {
  const B = new Batch();
  buildGround(B, city);
  buildAreas(B, city);
  buildStreets(B, city);
  buildForecourts(B, city);
  buildMetro(B, city, B, level >= 3 ? B : undefined);
  buildBuildings(B, city, city.buildings, level);
  return { ...layerOf(B, true, city), floors: cityFloors(city), beacons: beaconsOf(city) };
}

export { beaconsOf, cityFloors, type Detail };

const cityBuildingMapCache = new WeakMap<City, Map<string, Building>>();

function buildingMapOf(city?: City): Map<string, Building> | null {
  if (!city) return null;
  let m = cityBuildingMapCache.get(city);
  if (!m) {
    m = new Map(city.buildings.map(b => [b.id, b]));
    cityBuildingMapCache.set(city, m);
  } else if (m.size !== city.buildings.length) {
    for (let i = m.size; i < city.buildings.length; i++) {
      const b = city.buildings[i];
      if (b) m.set(b.id, b);
    }
  }
  return m;
}

/** a Batch as a layer; without lines, the silhouette and line buffers are left empty */
export function layerOf(B: Batch, lines = true, city?: City): Layer {
  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
  const surfaces = new Map<Surface, THREE.BufferGeometry>();
  for (const [s, pos] of B.tris) if (pos.length) surfaces.set(s, geo(pos));

  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(lines ? B.shell.pos : [], 3));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(lines ? B.shell.nrm : [], 3));
  shell.computeBoundingSphere();
  const seg = (pos: number[], colours = false) => {
    const p = lines && pos.length ? pos : [0, 0, 0, 0, 0, 0], g = new LineSegmentsGeometry().setPositions(p);
    // window outlines turn to the accent when their window lights: a colour per segment end
    if (colours) g.setColors(new Float32Array(p.length).fill(1));
    g.computeBoundingSphere();
    return g;
  };

  const windows = geo(B.win);
  windows.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(B.win.length), 3));

  // picking: triangle ranges per surface, sorted, searched by bisection
  const ranges = new Map<Surface, { start: number; end: number; owner: string }[]>();
  for (const o of B.owners) { const l = ranges.get(o.surface) ?? []; l.push(o); ranges.set(o.surface, l); }
  for (const l of ranges.values()) l.sort((a, b) => a.start - b.start);
  const ownerOf = (s: Surface, face: number) => {
    const l = ranges.get(s);
    if (!l) return undefined;
    let lo = 0, hi = l.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1, r = l[m]!; if (face < r.start) hi = m - 1; else if (face >= r.end) lo = m + 1; else return r.owner; }
    return undefined;
  };
  const byId = buildingMapOf(city);
  const floorAt = (id: string, p: THREE.Vector3) => {
    const b = byId?.get(id);
    if (!b) return undefined;
    const xy: [number, number] = [p.x, p.z], z = p.y;
    const part = b.parts.find(q => pointInRing(xy, q.footprint)) ?? b.parts.reduce((a, q) => (q.floors.length > a.floors.length ? q : a));
    const top = floorZ(part, part.floors.length);
    // above the top floor: a house's roof room
    if (z >= top && b.house?.spec.topRoom) return floorId(b, part.floors.length + 1);
    let k = 0;
    while (k + 1 < part.floors.length && z >= floorZ(part, k + 1)) k++;
    return floorId(b, k + 1);
  };

  const triangles = [...B.tris.values()].reduce((s, l) => s + l.length / 9, 0);
  return {
    surfaces, shell, creases: seg(B.creases), details: seg(B.details, true), windows, lamps: B.lamps, lampLines: lines ? B.lampLines : new Map(), ownerOf, floorAt,
    stats: { triangles, lines: (B.creases.length + B.details.length) / 6, windows: B.win.length / 18 },
  };
}
