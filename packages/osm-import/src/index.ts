/* @my-city/osm-import: OpenStreetMap extracts (osm-data) → the city model (core), with each area's
   settings and hand corrections (ADR-032). Pure: no DOM, no renderer. */
import { ATTRIBUTION, loadArea } from '@my-city/osm-data';
import type { City } from '@my-city/core';
import { importArea, type AreaConfig, type ImportReport } from './import';
import { NGA_TU_THAI_HA } from './area-nga-tu-thai-ha';

export { importArea, type AreaConfig, type ImportReport } from './import';
export { projector, type Frame } from './frame';

export const AREA_CONFIGS: Readonly<Record<string, AreaConfig>> = { [NGA_TU_THAI_HA.area]: NGA_TU_THAI_HA };

/** the city of an area, ready to draw */
export function loadCity(areaId: string): { city: City; report: ImportReport } {
  const cfg = AREA_CONFIGS[areaId];
  if (!cfg) throw new Error(`no import settings for area "${areaId}"`);
  return importArea(loadArea(areaId).data, cfg, ATTRIBUTION);
}
