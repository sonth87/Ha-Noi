/* Bookkeeping for the streamed map pieces (building tiles, local street tiles, furniture cells): their state
   records, the spatial grids that find what is around the view, and the live sets of what is showing, built,
   or cut for see-through. CityView owns the three.js side (groups, buffers); this holds no GPU objects, so its
   rules are tested in Node (rule A32, CS-09; split out of CityView, city3d.md §8). */
import type * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import type { Detail, Layer, LocalStreetTile, Tile } from '@render/city';
import type { FurnitureBucket, FurnitureCell } from '@render/furniture';
import { CELL_R } from './constants';
import type { BldgBounds } from './seeThrough';
import { SpatialGrid } from './spatialGrid';

export interface TileState {
  tile: Tile;
  layers: Map<Detail, { layer: Layer; group: THREE.Group | null }>;
  shown: Detail | -1;
  cutKey: string;
  cutLayer: Layer | null;
  cutGroup: THREE.Group | null;
  lastUsed: number;
}

export interface LocalTileState {
  tile: LocalStreetTile;
  layer: Layer | null;
  group: THREE.Group | null;
  lastUsed: number;
}

export interface CellState {
  bucket: FurnitureBucket;
  cell: FurnitureCell | null;
  groups: { poles: THREE.Group; fixtures: THREE.Group; trees: THREE.Group; simple: THREE.Group } | null;
  wires: LineSegments2 | null;
  pulses: LineSegments2 | null;
  pools: THREE.Mesh | null;
  lastUsed: number;
}

export class TileIndex {
  readonly tiles = new SpatialGrid<TileState>(256);
  readonly landmarks = new SpatialGrid<TileState>(512);
  readonly local = new SpatialGrid<LocalTileState>(256);
  readonly cells = new SpatialGrid<CellState>(256);
  readonly buildings = new SpatialGrid<BldgBounds>(128);
  /** what may be showing: what leaves the view is hidden from these, without walking the city */
  readonly visibleTiles = new Set<TileState>();
  readonly visibleLocal = new Set<LocalTileState>();
  readonly visibleCells = new Set<CellState>();
  /** what holds built buffers (for the memory caps), and which tiles have a see-through copy */
  readonly builtTiles = new Set<TileState>();
  readonly builtLocal = new Set<LocalTileState>();
  readonly builtCells = new Set<CellState>();
  readonly cutTiles = new Set<TileState>();

  /** file a tile (again, after its radius grew); landmark tiles also go in the far-reaching grid */
  fileTile(t: TileState, isLandmark: boolean) {
    this.tiles.insert(t, t.tile.center[0], t.tile.center[1], t.tile.radius);
    if (isLandmark) this.landmarks.insert(t, t.tile.center[0], t.tile.center[1], t.tile.radius);
  }

  fileLocal(lt: LocalTileState) { this.local.insert(lt, lt.tile.center[0], lt.tile.center[1], lt.tile.radius); }

  fileCell(c: CellState) { this.cells.insert(c, c.bucket.center[0], c.bucket.center[1], CELL_R); }

  fileBuildings(bounds: readonly BldgBounds[]) {
    for (const b of bounds) this.buildings.insert(b, b.cx, b.cy, b.r);
  }

  /** a new mount: its groups are new, so nothing is showing or cut yet */
  resetShown() {
    for (const set of [this.visibleTiles, this.visibleLocal, this.visibleCells, this.cutTiles]) set.clear();
  }

  clear() {
    this.resetShown();
    for (const set of [this.builtTiles, this.builtLocal, this.builtCells]) set.clear();
  }
}

/** Least recently used items over `max` that are also outside `keepRadius` of the focus: what to free. */
export function lruEvictions<T extends { lastUsed: number }>(
  built: ReadonlySet<T>,
  max: number,
  now: number,
  focus: { x: number; z: number },
  keepRadius: number,
  centre: (x: T) => readonly [number, number],
  radius: (x: T) => number,
): T[] {
  if (built.size <= max) return [];
  const away = (x: T) => Math.hypot(centre(x)[0] - focus.x, centre(x)[1] - focus.z) - radius(x) > keepRadius;
  const candidates = [...built].filter(x => x.lastUsed < now && away(x)).sort((a, b) => a.lastUsed - b.lastUsed);
  return candidates.slice(0, built.size - max);
}
