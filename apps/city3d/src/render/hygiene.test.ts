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
  'render/landmarks.ts': 'NGOC_SON_MAP_CENTRE, checked against OSM by placement.test.ts',
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
  /** A ratchet: CityView.ts is 3.9 k lines and `mount()` alone 600. New code goes into its own module (see
      the seams in docs/architecture/city3d.md §8). Lower this number whenever a piece is moved out. */
  const MAX_LINES = 3990;
  it(`CityView.ts stays under ${MAX_LINES} lines`, () => {
    const lines = readFileSync(join(ROOT, 'view/CityView.ts'), 'utf8').split('\n').length;
    expect(lines).toBeLessThanOrEqual(MAX_LINES);
  });
});
