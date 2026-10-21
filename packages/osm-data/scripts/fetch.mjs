// Download an area's OpenStreetMap extract (API 0.6 /map.json, one call per bbox, merged without
// duplicates; Overpass with the same boxes when the API keeps failing) into data/, and stamp the date. Usage: pnpm fetch:osm <area-id> (from the repo root).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../data/', import.meta.url));
const areas = JSON.parse(readFileSync(dir + 'areas.json', 'utf8'));
const id = process.argv[2];
if (!id || !areas[id]) {
  console.error(`area id? one of: ${Object.keys(areas).join(', ')}`);
  process.exit(1);
}
/** the API sometimes drops a large response half-way: try again, waiting longer each time */
async function getJson(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'my-city/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return JSON.parse(await res.text());
    } catch (e) {
      if (i >= tries) throw e;
      const wait = 2000 * 2 ** (i - 1);
      console.log(`  ${e.cause?.code ?? e.message} — again in ${wait / 1000} s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

const a = areas[id], seen = new Map();
let head = null;
try {
  for (const bbox of a.bboxes) {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox.join(',')}`;
    console.log(`GET ${url}`);
    const data = await getJson(url);
    head ??= data;
    for (const e of data.elements) seen.set(`${e.type}/${e.id}`, e);
  }
} catch (e) {
  // the main API keeps failing: the same boxes from Overpass (same JSON shape; every node of every way)
  console.log(`API failed (${e.cause?.code ?? e.message}); trying Overpass`);
  seen.clear();
  const boxes = a.bboxes.map(([w, s_, e_, n]) => `nwr(${s_},${w},${n},${e_});`).join('');
  const q = `[out:json][timeout:120];(${boxes});(._;>;);out body;`;
  const data = await getJson(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, 6);
  head = { version: '0.6', generator: data.generator, copyright: 'OpenStreetMap and contributors', attribution: 'http://www.openstreetmap.org/copyright', license: 'http://opendatacommons.org/licenses/odbl/1-0/' };
  for (const el of data.elements) seen.set(`${el.type}/${el.id}`, el);
}
const order = { node: 0, way: 1, relation: 2 };
const elements = [...seen.values()].sort((p, q) => order[p.type] - order[q.type] || p.id - q.id);
const body = JSON.stringify({ version: head.version, generator: head.generator, copyright: head.copyright, attribution: head.attribution, license: head.license, elements });
writeFileSync(dir + a.file, body);
a.fetched = new Date().toISOString().slice(0, 10);
writeFileSync(dir + 'areas.json', JSON.stringify(areas, null, 2) + '\n');
const count = t => elements.filter(e => e.type === t).length;
console.log(`${a.file}: ${count('node')} nodes, ${count('way')} ways, ${count('relation')} relations · ${(body.length / 1e6).toFixed(2)} MB`);
