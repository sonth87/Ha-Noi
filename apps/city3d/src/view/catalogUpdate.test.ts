/* A streamed chunk updates the place and street catalogs in place (A31, CS-09); the result must match a
   rebuild of the whole catalog over the merged city. */
import { describe, expect, it } from 'vitest';
import { loadCityChunkCityAsync, loadCityStreamingInitAsync } from '@my-city/osm-import';
import { mergeChunk } from './chunkMerge';
import { addBuildingsToCatalog, buildPlaceCatalog } from './placeInfo';
import { buildStreetCatalog, updateStreetCatalog } from './streetLabels';

describe('catalogs updated by a chunk', () => {
  it('match a full rebuild', async () => {
    const { city } = await loadCityStreamingInitAsync('vn/ha-noi', ['0,0']);
    const live = { ...city, buildings: [...city.buildings], streets: [...city.streets], features: [...city.features] };
    const places = buildPlaceCatalog(live, new Set(), 'vi');
    let streets = buildStreetCatalog(live);
    const chunk = (await loadCityChunkCityAsync('vn/ha-noi', '2,0', city.streets))!;
    const ids = { buildings: new Set(live.buildings.map(b => b.id)), streets: new Set(live.streets.map(s => s.id)), features: new Set(live.features.map(f => f.id)) };
    const { newBuildings, newStreets } = mergeChunk(live, chunk, ids);
    expect(newBuildings.length).toBeGreaterThan(100);

    addBuildingsToCatalog(places, newBuildings, live, new Set(), 'vi');
    const names = new Set(newStreets.map(s => s.name?.trim()).filter((n): n is string => Boolean(n)));
    streets = updateStreetCatalog(streets, live, names);

    const full = buildPlaceCatalog(live, new Set(), 'vi');
    expect([...places.byId.keys()].sort()).toEqual([...full.byId.keys()].sort());
    const fullStreets = buildStreetCatalog(live);
    const key = (e: { name: string; totalLength: number; tier: number }) => `${e.name}|${Math.round(e.totalLength)}|${e.tier}`;
    expect(streets.map(key)).toEqual(fullStreets.map(key));
  }, 120_000);
});
