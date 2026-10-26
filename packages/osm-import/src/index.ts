/* @my-city/osm-import: OpenStreetMap extracts (osm-data) → the city model (core), with each area's
   settings and hand corrections (ADR-032). Pure: no DOM, no renderer. */
import {
  ATTRIBUTION,
  loadArea,
  loadAreaAsync,
  loadCityChunkAsync,
  loadCitySkeletonAsync,
  mergeOsmExtracts,
  resolveCityId,
  type OsmExtract,
} from '@my-city/osm-data';
import type { City, Street } from '@my-city/core';
import { importArea, type AreaConfig, type ImportReport } from './import';
import {
  findHaNoiCatalogLandmark,
  HA_NOI_AREA_CONFIG,
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
  NGA_TU_THAI_HA,
} from './area-nga-tu-thai-ha';

export {
  getCityManifest,
  listCities,
  listCountries,
  loadAreaAsync,
  loadCityChunkAsync,
  loadCitySkeletonAsync,
  resolveCityId,
  WORLD_MANIFEST,
} from '@my-city/osm-data';
export { importArea, type AreaConfig, type ImportOptions, type ImportReport } from './import';
export { projector, unprojector, type Frame } from './frame';
export { HA_NOI_WARD_OUTLINES } from './cities/vn/ha-noi/wards.data';
export {
  findHaNoiCatalogLandmark,
  HA_NOI_AREA_CONFIG,
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
};

const areaRegistry: Record<string, AreaConfig> = {
  [NGA_TU_THAI_HA.area]: NGA_TU_THAI_HA,
  'vn/ha-noi': { ...NGA_TU_THAI_HA, area: 'vn/ha-noi' },
};
export const AREA_CONFIGS: Readonly<Record<string, AreaConfig>> = areaRegistry;

const cityCache = new Map<string, { city: City; report: ImportReport }>();
const chunkCityCache = new Map<string, City>();

function getAreaConfig(areaId: string): AreaConfig {
  const direct = AREA_CONFIGS[areaId];
  if (direct) return direct;
  try {
    const canonical = resolveCityId(areaId);
    const cfg = AREA_CONFIGS[canonical];
    if (cfg) return cfg;
  } catch {
    // fall through
  }
  throw new Error(`no import settings for area "${areaId}"`);
}

/** Register a custom area or city configuration at runtime (for extensions or multi-city apps) */
export function registerAreaConfig(cfg: AreaConfig): void {
  areaRegistry[cfg.area] = cfg;
  cityCache.delete(cfg.area);
}

/** the complete city of an area (skeleton + all spatial chunks), ready to draw */
export function loadCity(areaId: string): { city: City; report: ImportReport } {
  const cached = cityCache.get(areaId);
  if (cached) return cached;
  const cfg = getAreaConfig(areaId);
  const built = importArea(loadArea(areaId).data, cfg, ATTRIBUTION);
  cityCache.set(areaId, built);
  return built;
}

/** asynchronous loader for full city (skeleton + all spatial chunks) */
export async function loadCityAsync(areaId: string): Promise<{ city: City; report: ImportReport }> {
  const cached = cityCache.get(areaId);
  if (cached) return cached;
  const cfg = getAreaConfig(areaId);
  const { data } = await loadAreaAsync(areaId);
  const built = importArea(data, cfg, ATTRIBUTION);
  cityCache.set(areaId, built);
  return built;
}

/**
 * Fast 2-tier startup loader: loads ONLY the city's Tier-0 skeleton (major roads, rails, lakes, parks,
 * landmarks, tall buildings) plus the initial viewport's 1024m × 1024m spatial chunks.
 * Remaining neighborhood chunks are streamed on-demand as the camera moves.
 */
export async function loadCityStreamingInitAsync(
  areaId: string,
  initialChunkKeys: readonly string[] = ['0,0', '-1,0', '0,-1', '-1,-1'],
): Promise<{ city: City; report: ImportReport; loadedChunks: string[] }> {
  const cfg = getAreaConfig(areaId);
  const canonical = resolveCityId(areaId);
  const [{ data: skeleton }, ...chunkExtracts] = await Promise.all([
    loadCitySkeletonAsync(canonical),
    ...initialChunkKeys.map(key => loadCityChunkAsync(canonical, key)),
  ]);
  const parts: OsmExtract[] = [skeleton];
  const loadedChunks: string[] = [];
  initialChunkKeys.forEach((key, idx) => {
    const ext = chunkExtracts[idx];
    if (ext) {
      parts.push(ext);
      loadedChunks.push(key);
    }
  });
  const merged = mergeOsmExtracts(parts);
  const { city, report } = importArea(merged, cfg, ATTRIBUTION);
  return { city, report, loadedChunks };
}

/**
 * Dynamically loads and imports a single 1024m × 1024m spatial chunk for on-demand viewport streaming.
 */
export async function loadCityChunkCityAsync(
  areaId: string,
  chunkKey: string,
  extraStreets?: readonly Street[],
): Promise<City | null> {
  const canonical = resolveCityId(areaId);
  const cacheKey = `${canonical}:${chunkKey}`;
  const cached = chunkCityCache.get(cacheKey);
  if (cached) return cached;

  const cfg = getAreaConfig(areaId);
  const extract = await loadCityChunkAsync(canonical, chunkKey);
  if (!extract) return null;

  const { city } = importArea(extract, cfg, ATTRIBUTION, {
    extraStreets,
    isChunk: true,
  });
  chunkCityCache.set(cacheKey, city);
  return city;
}
