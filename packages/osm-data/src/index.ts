/* @my-city/osm-data: raw OpenStreetMap extracts, one per area, exactly as the API returned them
   (ADR-032, luật A15: © OpenStreetMap contributors, ODbL). No logic beyond loading. */
import areasJson from '../data/areas.json' with { type: 'json' };
import ngaTuThaiHa from '../data/nga-tu-thai-ha.osm.json' with { type: 'json' };
import type { OsmArea, OsmExtract } from './types';

export type * from './types';

export const ATTRIBUTION = '© OpenStreetMap contributors';

const EXTRACTS: Record<string, OsmExtract> = {
  'nga-tu-thai-ha': ngaTuThaiHa as unknown as OsmExtract,
};

const ASYNC_EXTRACTS: Record<string, () => Promise<OsmExtract>> = {
  'nga-tu-thai-ha': async () => {
    const mod = await import('../data/nga-tu-thai-ha.osm.json', { with: { type: 'json' } });
    return (mod.default ?? mod) as unknown as OsmExtract;
  },
};

export const AREAS: Readonly<Record<string, OsmArea>> = Object.fromEntries(
  Object.entries(areasJson as unknown as Record<string, Omit<OsmArea, 'id'>>).map(([id, a]) => [id, { id, ...a }]),
);

export function loadArea(id: string): { area: OsmArea; data: OsmExtract } {
  const area = AREAS[id], data = EXTRACTS[id];
  if (!area || !data) throw new Error(`unknown OSM area "${id}"`);
  return { area, data };
}

export async function loadAreaAsync(id: string): Promise<{ area: OsmArea; data: OsmExtract }> {
  const area = AREAS[id], loader = ASYNC_EXTRACTS[id];
  if (!area || !loader) throw new Error(`unknown OSM area "${id}"`);
  return { area, data: await loader() };
}
