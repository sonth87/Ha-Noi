/* @my-city/osm-data: raw OpenStreetMap extracts, one per area, exactly as the API returned them
   (ADR-032, luật A15: © OpenStreetMap contributors, ODbL). No logic beyond loading. */
import areasJson from '../data/areas.json' with { type: 'json' };
import type { OsmArea, OsmExtract } from './types';

export type * from './types';

export const ATTRIBUTION = '© OpenStreetMap contributors';

const EXTRACT_URLS: Record<string, URL> = {
  'nga-tu-thai-ha': new URL('../data/nga-tu-thai-ha.osm.json', import.meta.url),
};

const extractCache = new Map<string, OsmExtract>();
const pendingLoads = new Map<string, Promise<OsmExtract>>();

interface NodeFsBuiltin {
  readFileSync(path: URL, encoding: 'utf8'): string;
}

function getNodeFs(): NodeFsBuiltin | undefined {
  const g = globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } };
  return g.process?.getBuiltinModule?.('node:fs') as NodeFsBuiltin | undefined;
}

export const AREAS: Readonly<Record<string, OsmArea>> = Object.fromEntries(
  Object.entries(areasJson as unknown as Record<string, Omit<OsmArea, 'id'>>).map(([id, a]) => [id, { id, ...a }]),
);

export function loadArea(id: string): { area: OsmArea; data: OsmExtract } {
  const area = AREAS[id], url = EXTRACT_URLS[id];
  if (!area || !url) throw new Error(`unknown OSM area "${id}"`);
  let data = extractCache.get(id);
  if (!data) {
    const fs = getNodeFs();
    if (!fs) throw new Error(`OSM area "${id}" must be preloaded with loadAreaAsync("${id}") in browser environments`);
    data = JSON.parse(fs.readFileSync(url, 'utf8')) as OsmExtract;
    extractCache.set(id, data);
  }
  return { area, data };
}

export async function loadAreaAsync(id: string): Promise<{ area: OsmArea; data: OsmExtract }> {
  const area = AREAS[id], url = EXTRACT_URLS[id];
  if (!area || !url) throw new Error(`unknown OSM area "${id}"`);
  const cached = extractCache.get(id);
  if (cached) return { area, data: cached };

  // In Node.js / Vitest where file:// URLs are local files, read and parse directly via JSON.parse
  const fs = getNodeFs();
  if (fs && url.protocol === 'file:') {
    const data = JSON.parse(fs.readFileSync(url, 'utf8')) as OsmExtract;
    extractCache.set(id, data);
    return { area, data };
  }

  let pending = pendingLoads.get(id);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`failed to fetch OSM extract "${id}" (HTTP ${res.status})`);
      const parsed = (await res.json()) as OsmExtract;
      extractCache.set(id, parsed);
      pendingLoads.delete(id);
      return parsed;
    })().catch(err => {
      pendingLoads.delete(id);
      throw err;
    });
    pendingLoads.set(id, pending);
  }
  return { area, data: await pending };
}

