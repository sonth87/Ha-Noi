/* @my-city/osm-data: hierarchical multi-country / multi-city OpenStreetMap extracts
   (ADR-032, luật A15: © OpenStreetMap contributors, ODbL).
   Supports 2-tier streaming:
   - Tier 0: skeleton.osm.json (major roads, rails, water, parks, landmarks, tall buildings)
   - Tier 1: chunks/chunk_<cx>_<cy>.osm.json (1024m × 1024m spatial chunks of neighborhood buildings & alleys) */
import areasJson from '../data/areas.json' with { type: 'json' };
import worldManifestJson from '../data/world-manifest.json' with { type: 'json' };
import type {
  OsmArea,
  OsmCityManifest,
  OsmCountryManifest,
  OsmElement,
  OsmExtract,
  OsmWorldManifest,
} from './types';
import { CITY_CHUNK_URLS, CITY_SKELETON_URLS } from './urls';

export type * from './types';

export const ATTRIBUTION = '© OpenStreetMap contributors';

export const WORLD_MANIFEST: OsmWorldManifest = worldManifestJson as unknown as OsmWorldManifest;

const cityManifestById = new Map<string, OsmCityManifest>();
const canonicalCityIdByAlias = new Map<string, string>();

for (const country of Object.values(WORLD_MANIFEST.countries)) {
  for (const [slug, city] of Object.entries(country.cities)) {
    cityManifestById.set(city.id, city);
    canonicalCityIdByAlias.set(city.id, city.id);
    canonicalCityIdByAlias.set(slug, city.id);
    for (const legacy of city.legacyIds ?? []) {
      canonicalCityIdByAlias.set(legacy, city.id);
    }
  }
}

export function resolveCityId(id: string): string {
  const canonical = canonicalCityIdByAlias.get(id);
  if (!canonical) throw new Error(`unknown OSM city or area "${id}"`);
  return canonical;
}

export function listCountries(): OsmCountryManifest[] {
  return Object.values(WORLD_MANIFEST.countries);
}

export function listCities(countryCode?: string): OsmCityManifest[] {
  if (countryCode) {
    const c = WORLD_MANIFEST.countries[countryCode];
    return c ? Object.values(c.cities) : [];
  }
  return [...cityManifestById.values()];
}

export function getCityManifest(id: string): OsmCityManifest {
  const canonical = resolveCityId(id);
  const manifest = cityManifestById.get(canonical);
  if (!manifest) throw new Error(`missing city manifest for "${id}"`);
  return manifest;
}

export const AREAS: Readonly<Record<string, OsmArea>> = Object.fromEntries(
  Object.entries(areasJson as unknown as Record<string, Omit<OsmArea, 'id'>>).map(([id, a]) => [id, { id, ...a }]),
);

const extractCache = new Map<string, OsmExtract>();
const pendingLoads = new Map<string, Promise<OsmExtract>>();

interface NodeFsBuiltin {
  readFileSync(path: URL, encoding: 'utf8'): string;
}

function getNodeFs(): NodeFsBuiltin | undefined {
  const g = globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } };
  return g.process?.getBuiltinModule?.('node:fs') as NodeFsBuiltin | undefined;
}

function normalizeExtract(parsed: OsmExtract): OsmExtract {
  if (parsed.license && parsed.copyright) return parsed;
  return {
    ...parsed,
    version: String(parsed.version ?? '0.6'),
    copyright: parsed.copyright ?? 'OpenStreetMap and contributors',
    license: parsed.license ?? 'http://opendatacommons.org/licenses/odbl/1-0/',
  };
}

function loadUrlSync(cacheKey: string, url: URL): OsmExtract {
  const cached = extractCache.get(cacheKey);
  if (cached) return cached;
  const fs = getNodeFs();
  if (!fs) {
    throw new Error(`OSM extract "${cacheKey}" must be loaded asynchronously in browser environments`);
  }
  const parsed = normalizeExtract(JSON.parse(fs.readFileSync(url, 'utf8')) as OsmExtract);
  extractCache.set(cacheKey, parsed);
  return parsed;
}

async function loadUrlAsync(cacheKey: string, url: URL): Promise<OsmExtract> {
  const cached = extractCache.get(cacheKey);
  if (cached) return cached;

  const fs = getNodeFs();
  if (fs && url.protocol === 'file:') {
    const parsed = normalizeExtract(JSON.parse(fs.readFileSync(url, 'utf8')) as OsmExtract);
    extractCache.set(cacheKey, parsed);
    return parsed;
  }

  let pending = pendingLoads.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(url.href, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`failed to fetch OSM extract "${cacheKey}" (HTTP ${res.status})`);
      const parsed = normalizeExtract((await res.json()) as OsmExtract);
      extractCache.set(cacheKey, parsed);
      pendingLoads.delete(cacheKey);
      return parsed;
    })().catch(err => {
      pendingLoads.delete(cacheKey);
      throw err;
    });
    pendingLoads.set(cacheKey, pending);
  }
  return pending;
}

export function mergeOsmExtracts(extracts: readonly OsmExtract[]): OsmExtract {
  if (extracts.length === 0) {
    return normalizeExtract({ version: '0.6', elements: [] });
  }
  if (extracts.length === 1) {
    return normalizeExtract(extracts[0]!);
  }
  const nodes = new Map<number, OsmElement>();
  const ways = new Map<number, OsmElement>();
  const relations = new Map<number, OsmElement>();

  for (const ext of extracts) {
    for (const el of ext.elements) {
      if (el.type === 'node') nodes.set(el.id, el);
      else if (el.type === 'way') ways.set(el.id, el);
      else if (el.type === 'relation') relations.set(el.id, el);
    }
  }

  const base = normalizeExtract(extracts[0]!);
  return {
    version: base.version,
    copyright: base.copyright,
    license: base.license,
    elements: [...nodes.values(), ...ways.values(), ...relations.values()],
  };
}

export function loadCitySkeleton(id: string): { area: OsmArea; manifest: OsmCityManifest; data: OsmExtract } {
  const canonical = resolveCityId(id);
  const manifest = getCityManifest(canonical);
  const area = AREAS[id] ?? AREAS[canonical];
  const url = CITY_SKELETON_URLS[canonical];
  if (!area || !url) throw new Error(`unknown OSM city skeleton "${id}"`);
  const data = loadUrlSync(`skeleton:${canonical}`, url);
  return { area, manifest, data };
}

export async function loadCitySkeletonAsync(
  id: string,
): Promise<{ area: OsmArea; manifest: OsmCityManifest; data: OsmExtract }> {
  const canonical = resolveCityId(id);
  const manifest = getCityManifest(canonical);
  const area = AREAS[id] ?? AREAS[canonical];
  const url = CITY_SKELETON_URLS[canonical];
  if (!area || !url) throw new Error(`unknown OSM city skeleton "${id}"`);
  const data = await loadUrlAsync(`skeleton:${canonical}`, url);
  return { area, manifest, data };
}

export function loadCityChunk(id: string, chunkKey: string): OsmExtract | null {
  const canonical = resolveCityId(id);
  const cityChunks = CITY_CHUNK_URLS[canonical];
  const url = cityChunks?.[chunkKey];
  if (!url) return null;
  return loadUrlSync(`chunk:${canonical}:${chunkKey}`, url);
}

export async function loadCityChunkAsync(id: string, chunkKey: string): Promise<OsmExtract | null> {
  const canonical = resolveCityId(id);
  const cityChunks = CITY_CHUNK_URLS[canonical];
  const url = cityChunks?.[chunkKey];
  if (!url) return null;
  return loadUrlAsync(`chunk:${canonical}:${chunkKey}`, url);
}

export function loadArea(id: string): { area: OsmArea; data: OsmExtract } {
  const canonical = resolveCityId(id);
  const area = AREAS[id] ?? AREAS[canonical];
  if (!area) throw new Error(`unknown OSM area "${id}"`);
  const fullKey = `full:${canonical}`;
  let data = extractCache.get(fullKey);
  if (!data) {
    const { manifest, data: skeleton } = loadCitySkeleton(canonical);
    const parts: OsmExtract[] = [skeleton];
    for (const chunkMeta of manifest.chunks) {
      const chunk = loadCityChunk(canonical, chunkMeta.key);
      if (chunk) parts.push(chunk);
    }
    data = mergeOsmExtracts(parts);
    extractCache.set(fullKey, data);
  }
  return { area, data };
}

export async function loadAreaAsync(id: string): Promise<{ area: OsmArea; data: OsmExtract }> {
  const canonical = resolveCityId(id);
  const area = AREAS[id] ?? AREAS[canonical];
  if (!area) throw new Error(`unknown OSM area "${id}"`);
  const fullKey = `full:${canonical}`;
  const cached = extractCache.get(fullKey);
  if (cached) return { area, data: cached };

  const { manifest, data: skeleton } = await loadCitySkeletonAsync(canonical);
  const chunks = await Promise.all(
    manifest.chunks.map(chunkMeta => loadCityChunkAsync(canonical, chunkMeta.key)),
  );
  const parts: OsmExtract[] = [skeleton];
  for (const c of chunks) {
    if (c) parts.push(c);
  }
  const data = mergeOsmExtracts(parts);
  extractCache.set(fullKey, data);
  return { area, data };
}
