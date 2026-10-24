/* @my-city/osm-import: OpenStreetMap extracts (osm-data) → the city model (core), with each area's
   settings and hand corrections (ADR-032). Pure: no DOM, no renderer. */
import { ATTRIBUTION, loadArea, loadAreaAsync } from '@my-city/osm-data';
import type { City } from '@my-city/core';
import { importArea, type AreaConfig, type ImportReport } from './import';
import { NGA_TU_THAI_HA } from './area-nga-tu-thai-ha';

export { loadAreaAsync } from '@my-city/osm-data';
export { importArea, type AreaConfig, type ImportReport } from './import';
export { projector, unprojector, type Frame } from './frame';

const areaRegistry: Record<string, AreaConfig> = { [NGA_TU_THAI_HA.area]: NGA_TU_THAI_HA };
export const AREA_CONFIGS: Readonly<Record<string, AreaConfig>> = areaRegistry;

const cityCache = new Map<string, { city: City; report: ImportReport }>();

/** Register a custom area or city configuration at runtime (for extensions or multi-city apps) */
export function registerAreaConfig(cfg: AreaConfig): void {
  areaRegistry[cfg.area] = cfg;
  cityCache.delete(cfg.area);
}

/** the city of an area, ready to draw */
export function loadCity(areaId: string): { city: City; report: ImportReport } {
  const cached = cityCache.get(areaId);
  if (cached) return cached;
  const cfg = AREA_CONFIGS[areaId];
  if (!cfg) throw new Error(`no import settings for area "${areaId}"`);
  const built = importArea(loadArea(areaId).data, cfg, ATTRIBUTION);
  cityCache.set(areaId, built);
  return built;
}

/** asynchronous loader for multi-city code-splitting */
export async function loadCityAsync(areaId: string): Promise<{ city: City; report: ImportReport }> {
  const cached = cityCache.get(areaId);
  if (cached) return cached;
  const cfg = AREA_CONFIGS[areaId];
  if (!cfg) throw new Error(`no import settings for area "${areaId}"`);
  const { data } = await loadAreaAsync(areaId);
  const built = importArea(data, cfg, ATTRIBUTION);
  cityCache.set(areaId, built);
  return built;
}
