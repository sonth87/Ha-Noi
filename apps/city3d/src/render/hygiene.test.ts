/* Source hygiene (docs/architecture/case-studies.md, CS-02): drawing code must not carry absolute map
   coordinates. They go stale when the map origin or the data changes and then draw things in the wrong place
   without any error. Anchor to the OSM element instead (an offset from its centre), and add a test that
   compares the anchor with the data (see placement.test.ts). */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const PAIR = /\[\s*-?\d{3,5}(\.\d+)?\s*,\s*-?\d{3,5}(\.\d+)?\s*\]/g;

/** file → why it may hold coordinates */
const ALLOWED: Record<string, string> = {
  'render/adminBoundaries.ts': 'the outer Hà Nội outline and the fallback ward boxes (the real wards come from OSM)',
  'render/landmarks/vn/ha-noi/models.ts': 'NGOC_SON_MAP_CENTRE, checked against OSM by placement.test.ts',
  'render/showcase.ts': 'the local frame of the showcase plate, not map coordinates',
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });

describe('no absolute map coordinates in drawing code', () => {
  it('only the allow-listed files contain [x, y] pairs of 3–5 digits', () => {
    const hits: string[] = [];
    for (const f of walk(ROOT)) {
      const rel = f.slice(ROOT.length + 1);
      if (ALLOWED[rel]) continue;
      if (PAIR.test(readFileSync(f, 'utf8'))) hits.push(rel);
      PAIR.lastIndex = 0;
    }
    expect(hits).toEqual([]);
  });
});

describe('CityView does not grow', () => {
  /** A ratchet: CityView.ts is 3.0 k lines (3.9 k before the overlays, the SDK, the chunk merge, the tile index, the window painter, the chunk streamer, the Pegman preview and the map input moved out) and `mount()` alone 600. New code goes into its own module (see
      the seams in docs/architecture/city3d.md §8). Lower this number whenever a piece is moved out. */
  const MAX_LINES = 3000;
  it(`CityView.ts stays under ${MAX_LINES} lines`, () => {
    const lines = readFileSync(join(ROOT, 'view/CityView.ts'), 'utf8').split('\n').length;
    expect(lines).toBeLessThanOrEqual(MAX_LINES);
  });
});

describe('clean text (CS-10)', () => {
  /** machine-written text once slipped Hangul, Han and Cyrillic words into Vietnamese descriptions and comments */
  const STRAY = /[Ѐ-ӿᄀ-ᇿ぀-ヿ㄰-㆏一-鿿가-힯]/u;
  const PACKAGES = join(ROOT, '../../../packages');
  it('no Han, Hangul, kana or Cyrillic characters in app or package sources', () => {
    const files = [...walk(ROOT), ...['core', 'osm-import', 'theme'].flatMap(p => walk(join(PACKAGES, p, 'src')))];
    const hits = files.filter(f => STRAY.test(readFileSync(f, 'utf8'))).map(f => f.slice(ROOT.length - 20));
    expect(hits).toEqual([]);
  });
});

describe('GPU buffers are freed where layers are dropped (CS-09)', () => {
  /** taking a layer out of the live set without disposing it leaked the see-through tiles: only
      disposeLayerObj may remove one, and it frees the buffers */
  it('CityView removes layers only through disposeLayerObj', () => {
    const src = readFileSync(join(ROOT, 'view/CityView.ts'), 'utf8');
    expect(src.match(/this\.layers\.delete\(/g)?.length).toBe(1);
    expect(src).toMatch(/private disposeLayerObj\(l: Layer\) \{\n\s+this\.layers\.delete\(l\);/);
  });
});

describe('per-frame work does not walk the whole city (A32, CS-09)', () => {
  /** these run every frame, every 120 ms, or on every hover; with Hà Nội loaded the city has 4.4 k tiles, so
      they read the spatial grids or the live sets of view/tileIndex.ts instead of this.tiles / localTiles / cells */
  const HOT = ['detailStep', 'distanceStep', 'evictFarCaches', 'syncForegroundCut', 'clearAllTileCuts', 'trafficStep', 'shownStats', 'ensurePovVisibleTiles'];
  it('hot methods of CityView have no loop over every tile, street tile or cell', () => {
    const src = readFileSync(join(ROOT, 'view/CityView.ts'), 'utf8');
    const bad: string[] = [];
    for (const name of HOT) {
      const start = src.search(new RegExp(`\\n  (private )?${name}\\(`));
      expect(start, name).toBeGreaterThan(0);
      const rest = src.slice(start + 1);
      const end = rest.search(/\n {2}(private |readonly |get |set )?[a-zA-Z]+\(.*\{\n/);
      const body = rest.slice(0, end > 0 ? end : undefined);
      if (/of this\.(tiles|localTiles|cells)\)|this\.(tiles|localTiles|cells)\.(forEach|filter|map)\(/.test(body)) bad.push(name);
    }
    expect(bad).toEqual([]);
  });
});

describe('city landmark code stays in its city folder (A16)', () => {
  /** render/landmarks.ts combines the cities; nothing else in the renderer or the view reaches into one */
  it('only render/landmarks.ts imports from render/landmarks/<country>/<city>/', () => {
    const hits = walk(ROOT)
      .map(f => f.slice(ROOT.length + 1))
      .filter(rel => rel !== 'render/landmarks.ts' && !/^render\/landmarks\/[a-z]{2}\//.test(rel))
      .filter(rel => /from '(@render\/|\.\/|\.\.\/)*landmarks\/[a-z]{2}\//.test(readFileSync(join(ROOT, rel), 'utf8')));
    expect(hits).toEqual([]);
  });
});
