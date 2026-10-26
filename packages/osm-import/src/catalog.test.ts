/* Guards for the landmark catalog (docs/architecture/case-studies.md CS-09, CS-10): one entry is one
   landmark, its OSM anchor exists, and its text is clean Vietnamese / English. */
import { describe, expect, it } from 'vitest';
import type { Building, City } from '@my-city/core';
import { getCityManifest, loadCityChunk, loadCitySkeleton, mergeOsmExtracts } from '@my-city/osm-data';
import { HA_NOI_LANDMARKS_CATALOG } from './cities/vn/ha-noi/landmarks-catalog';
import { getAreaConfig, loadCity } from './index';
import { importArea } from './import';

/** models the generic rules give to any pagoda, temple, church, monument… (import.ts › genericModel) */
const GENERIC = new Set(['statue-monument-plaza', 'tuong-dai-cam-tu', 'church-hall', 'traditional-mausoleum', 'traditional-pagoda', 'traditional-temple']);

/** for every landmark model: the buildings that carry it, beyond the catalog entries and the overrides (by OSM id) that use it */
function overclaimed(buildings: readonly Building[]): string[] {
  const entries = new Map<string, number>();
  const count = (m: string | undefined) => { if (m && !GENERIC.has(m)) entries.set(m, (entries.get(m) ?? 0) + 1); };
  for (const e of HA_NOI_LANDMARKS_CATALOG) count(e.model);
  for (const o of Object.values(getAreaConfig('nga-tu-thai-ha').overrides.buildings ?? {})) count(o.model);
  const used = new Map<string, Building[]>();
  for (const b of buildings) if (b.model && entries.has(b.model)) { const l = used.get(b.model); if (l) l.push(b); else used.set(b.model, [b]); }
  return [...used].filter(([m, bs]) => bs.length > entries.get(m)!).map(([m, bs]) => `${m}: ${bs.length} > ${entries.get(m)} (${bs.map(b => b.name).join(' | ')})`);
}

describe('landmark catalog', () => {
  it('puts a landmark’s own model on no more buildings than catalog entries use it (whole city)', () => {
    expect(overclaimed(loadCity('nga-tu-thai-ha').city.buildings)).toEqual([]);
  });

  it('…and the same when the skeleton and each chunk are imported apart, as the app streams them', () => {
    const cfg = getAreaConfig('nga-tu-thai-ha');
    const manifest = getCityManifest('nga-tu-thai-ha');
    const skeleton = loadCitySkeleton(manifest.id).data;
    const all: Building[] = [...importArea(skeleton, cfg, '').city.buildings];
    const seen = new Set(all.map(b => b.id));
    for (const c of manifest.chunks) {
      const ext = loadCityChunk(manifest.id, c.key);
      if (!ext) continue;
      const city: City = importArea(mergeOsmExtracts([ext]), cfg, '', { isChunk: true }).city;
      for (const b of city.buildings) if (!seen.has(b.id)) { seen.add(b.id); all.push(b); }
    }
    expect(overclaimed(all)).toEqual([]);
  }, 120_000);

  /** A29: matching by name is how a catalog entry finds its building only until someone writes the id down;
      an entry whose name hits a building must say which one (entries that hit none stay in the diorama only) */
  it('an entry without osmSource matches no building by name', () => {
    const norm = (x: string) => x.replace(/[“”"']/gu, '').replace(/\s+/gu, ' ').trim().toLowerCase();
    const names = new Set(loadCity('nga-tu-thai-ha').city.buildings.flatMap(b => (b.name ? [norm(b.name)] : [])));
    const implicit = HA_NOI_LANDMARKS_CATALOG.filter(e => !e.osmSource)
      .filter(e => [e.name, e.name.replace(/\s*\([^)]*\)\s*$/u, ''), ...(e.aliases ?? [])].some(n => names.has(norm(n))))
      .map(e => e.id);
    expect(implicit).toEqual([]);
  });

  it('every osmSource names an element that is in the map data', () => {
    const sources = new Set(loadCity('nga-tu-thai-ha').city.buildings.map(b => b.source));
    const missing = HA_NOI_LANDMARKS_CATALOG.filter(e => e.osmSource && !sources.has(e.osmSource)).map(e => `${e.id} → ${e.osmSource}`);
    expect(missing).toEqual([]);
  });

  it('has no stray Han, Hangul, kana or Cyrillic characters in its text', () => {
    const stray = /[Ѐ-ӿᄀ-ᇿ぀-ヿ㄰-㆏一-鿿가-힯]/u;
    const bad = HA_NOI_LANDMARKS_CATALOG.flatMap(e => [e.name, e.address, e.description, ...(e.aliases ?? [])].filter((s): s is string => Boolean(s) && stray.test(s!)).map(s => `${e.id}: ${s}`));
    expect(bad).toEqual([]);
  });
});

describe('the generic importer holds no city data (A16, CS-09)', () => {
  it('import.ts names no OSM element; a city lists its exceptions in its own config', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, 'import.ts'), 'utf8');
    expect(src.match(/osm:(way|node|relation)\/\d{3,}/g) ?? []).toEqual([]);
  });
});
