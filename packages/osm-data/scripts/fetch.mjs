// Download an area's OpenStreetMap extract (API 0.6 /map.json) into data/, and stamp the date.
// Usage: pnpm fetch:osm <area-id>   (from the repo root)   — see data/README.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../data/', import.meta.url));
const areas = JSON.parse(readFileSync(dir + 'areas.json', 'utf8'));
const id = process.argv[2];
if (!id || !areas[id]) {
  console.error(`area id? one of: ${Object.keys(areas).join(', ')}`);
  process.exit(1);
}
const a = areas[id];
const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${a.bbox.join(',')}`;
console.log(`GET ${url}`);
const res = await fetch(url, { headers: { 'User-Agent': 'my-city/1.0' } });
if (!res.ok) { console.error(`HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
const body = await res.text();
const data = JSON.parse(body);
writeFileSync(dir + a.file, body);
a.fetched = new Date().toISOString().slice(0, 10);
writeFileSync(dir + 'areas.json', JSON.stringify(areas, null, 2) + '\n');
const count = t => data.elements.filter(e => e.type === t).length;
console.log(`${a.file}: ${count('node')} nodes, ${count('way')} ways, ${count('relation')} relations · ${(body.length / 1e6).toFixed(2)} MB`);
