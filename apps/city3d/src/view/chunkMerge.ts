/* The data half of streaming a map chunk into the live city (moved out of CityView.ingestCityChunk): which
   of the chunk's buildings, streets and features are new, and the sub-city around a chunk from which its local
   street tiles and street furniture are worked out. Pure; the view keeps the tiles, GPU layers and caches. */
import type { Building, City, Feature, Street } from '@my-city/core';

/** chunks are 1024 m squares in the city frame, keyed `"cx,cy"` */
export const CHUNK_SIZE = 1024;

export interface KnownIds { buildings: Set<string>; streets: Set<string>; features: Set<string> }

export interface ChunkDelta { newBuildings: Building[]; newStreets: Street[]; newFeatures: Feature[] }

export function chunkBounds(key: string): { x0: number; x1: number; y0: number; y1: number } {
  const [cx, cy] = key.split(',').map(Number) as [number, number];
  return { x0: cx * CHUNK_SIZE, x1: (cx + 1) * CHUNK_SIZE, y0: cy * CHUNK_SIZE, y1: (cy + 1) * CHUNK_SIZE };
}

/** Append what the chunk adds (by id) to `city` and remember the ids; returns just the new things. */
export function mergeChunk(city: City, chunk: City, known: KnownIds): ChunkDelta {
  const delta: ChunkDelta = { newBuildings: [], newStreets: [], newFeatures: [] };
  for (const b of chunk.buildings) {
    if (known.buildings.has(b.id)) continue;
    known.buildings.add(b.id);
    city.buildings.push(b);
    delta.newBuildings.push(b);
  }
  for (const s of chunk.streets) {
    if (known.streets.has(s.id)) continue;
    known.streets.add(s.id);
    city.streets.push(s);
    delta.newStreets.push(s);
  }
  for (const f of chunk.features) {
    if (known.features.has(f.id)) continue;
    known.features.add(f.id);
    city.features.push(f);
    delta.newFeatures.push(f);
  }
  return delta;
}

/** The part of the city that matters for one chunk: its streets (96 m margin), buildings and features (64 m)
    and areas (128 m), so that road network and street furniture come out right at the chunk's edges. */
export function chunkSubCity(city: City, key: string): City {
  const { x0, x1, y0, y1 } = chunkBounds(key);
  const within = (x: number, y: number, m: number) => x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m;
  return {
    ...city,
    streets: city.streets.filter(s => s.path.some(p => within(p[0], p[1], 96))),
    buildings: city.buildings.filter(b => { const p = b.footprint[0]; return p !== undefined && within(p[0], p[1], 64); }),
    features: city.features.filter(f => within(f.at[0], f.at[1], 64)),
    areas: city.areas.filter(a => a.polygon.some(p => within(p[0], p[1], 128))),
  };
}
