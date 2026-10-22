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
  const existing = JSON.parse(readFileSync(dir + a.file, 'utf8'));
  head = existing;
  for (const el of existing.elements ?? []) seen.set(`${el.type}/${el.id}`, el);
  console.log(`Loaded ${seen.size} existing elements from ${a.file}`);
} catch { /* fresh fetch */ }

const KEEP_TAGS = new Set([
  'highway', 'area', 'name', 'oneway', 'junction', 'lanes', 'layer', 'bridge',
  'tourism', 'building', 'construction', 'building:part', 'building:levels', 'building:material',
  'height', 'roof:shape', 'man_made', 'area:highway', 'leisure', 'landuse', 'natural', 'water',
  'place', 'amenity', 'public_transport', 'power', 'historic', 'heritage', 'artwork_type',
  'start_date', 'railway', 'station', 'type', 'office',
  'addr:housenumber', 'addr:street', 'addr:subdistrict',
]);

// Fetch the Ba Đình boxes + full Hanoi Metro lines (2A Cát Linh – Hà Đông & Line 3) via Overpass
const baDinhBoxes = a.bboxes.slice(-2);
const boxQueries = baDinhBoxes.map(([w, s_, e_, n]) =>
  `node(${s_},${w},${n},${e_});way(${s_},${w},${n},${e_});relation["type"~"^(building|multipolygon)$"](${s_},${w},${n},${e_});`
).join('');
const metroQuery = `way["railway"~"^(subway|light_rail|monorail)$"](20.945,105.730,21.055,105.860);node["railway"="station"](20.945,105.730,21.055,105.860);way["railway"="platform"](20.945,105.730,21.055,105.860);`;
const q = `[out:json][timeout:120];(${boxQueries}${metroQuery});(._;>;);out body;`;
console.log('Fetching Ba Đình + full Metro lines from Overpass...');
const data = await getJson(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, 6);
head ??= { version: '0.6', generator: data.generator, copyright: 'OpenStreetMap and contributors', attribution: 'http://www.openstreetmap.org/copyright', license: 'http://opendatacommons.org/licenses/odbl/1-0/' };
for (const el of data.elements) seen.set(`${el.type}/${el.id}`, el);

const inArea = (lat, lon) => lat >= 20.995 && lat <= 21.046 && lon >= 105.800 && lon <= 105.854;
const nodes = new Map(), ways = new Map(), rels = [];
for (const e of seen.values()) {
  if (e.tags) {
    const next = {};
    let cnt = 0;
    for (const [k, v] of Object.entries(e.tags)) if (KEEP_TAGS.has(k)) { next[k] = v; cnt++; }
    if (cnt > 0) e.tags = next; else delete e.tags;
  }
  if (e.type === 'node') nodes.set(e.id, e);
  else if (e.type === 'way') ways.set(e.id, e);
  else if (e.type === 'relation') rels.push(e);
}
const keptRels = rels.filter(r => {
  const t = r.tags || {};
  if (t.type !== 'building' && t.type !== 'multipolygon') return false;
  return (r.members || []).some(m => {
    if (m.type !== 'way') return false;
    const w = ways.get(m.ref);
    return w && (w.nodes || []).some(nid => { const n = nodes.get(nid); return n && inArea(n.lat, n.lon); });
  });
});
const relWayIds = new Set();
for (const r of keptRels) for (const m of r.members || []) if (m.type === 'way') relWayIds.add(m.ref);
const keptWays = [...ways.values()].filter(w => {
  if (relWayIds.has(w.id)) return true;
  if (!w.tags) return false;
  if (w.tags.railway && ['subway', 'light_rail', 'monorail', 'platform'].includes(w.tags.railway)) return true;
  return (w.nodes || []).some(nid => { const n = nodes.get(nid); return n && inArea(n.lat, n.lon); });
});
const usedNodeIds = new Set();
for (const w of keptWays) for (const nid of w.nodes || []) usedNodeIds.add(nid);
const keptNodes = [...nodes.values()].filter(n =>
  usedNodeIds.has(n.id) ||
  (n.tags && (inArea(n.lat, n.lon) || n.tags.railway === 'station' || n.tags.public_transport === 'station'))
);

const order = { node: 0, way: 1, relation: 2 };
const elements = [...keptNodes, ...keptWays, ...keptRels].sort((p, q) => order[p.type] - order[q.type] || p.id - q.id);
const body = JSON.stringify({ version: head.version, generator: head.generator, copyright: head.copyright, attribution: head.attribution, license: head.license, elements });
writeFileSync(dir + a.file, body);
a.fetched = new Date().toISOString().slice(0, 10);
writeFileSync(dir + 'areas.json', JSON.stringify(areas, null, 2) + '\n');
const count = t => elements.filter(e => e.type === t).length;
console.log(`${a.file}: ${count('node')} nodes, ${count('way')} ways, ${count('relation')} relations · ${(body.length / 1e6).toFixed(2)} MB`);
