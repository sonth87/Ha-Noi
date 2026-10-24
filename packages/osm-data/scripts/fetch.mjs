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
async function postOverpass(q, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'User-Agent': 'my-city/1.0',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: 'data=' + encodeURIComponent(q),
      });
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
  'start_date', 'railway', 'station', 'type', 'office', 'religion',
  'addr:housenumber', 'addr:street', 'addr:subdistrict',
]);

// Fetch the 4 expanded districts (Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân) via Overpass POST
const newDistrictBoxes = a.bboxes.slice(-4);
for (const [idx, [w, s_, e_, n]] of newDistrictBoxes.entries()) {
  const q = `[out:json][timeout:180];(way["highway"~"^(trunk|primary|secondary|tertiary|residential|living_street|pedestrian|unclassified|trunk_link|primary_link|secondary_link|tertiary_link)$"](${s_},${w},${n},${e_});way["natural"="water"](${s_},${w},${n},${e_});relation["natural"="water"](${s_},${w},${n},${e_});way["water"](${s_},${w},${n},${e_});relation["water"](${s_},${w},${n},${e_});way["leisure"~"^(park|garden|pitch|swimming_pool)$"](${s_},${w},${n},${e_});relation["leisure"~"^(park|garden)$"](${s_},${w},${n},${e_});way["landuse"~"^(grass|recreation_ground|religious|basin)$"](${s_},${w},${n},${e_});way["man_made"="bridge"](${s_},${w},${n},${e_});node["historic"](${s_},${w},${n},${e_});way["historic"](${s_},${w},${n},${e_});relation["historic"](${s_},${w},${n},${e_});node["tourism"~"^(attraction|museum|artwork|viewpoint|hotel)$"](${s_},${w},${n},${e_});way["tourism"](${s_},${w},${n},${e_});node["amenity"~"^(place_of_worship|theatre|cinema|townhall|library|marketplace|hospital|university|college)$"](${s_},${w},${n},${e_});way["amenity"~"^(place_of_worship|theatre|cinema|townhall|library|marketplace|hospital|university|college|school|embassy|police|post_office)$"](${s_},${w},${n},${e_});way["building"](${s_},${w},${n},${e_});way["building:part"](${s_},${w},${n},${e_});relation["type"~"^(building|multipolygon)$"]["building"](${s_},${w},${n},${e_}););(._;>;);out body;`;
  console.log(`Fetching district box ${idx + 1}/${newDistrictBoxes.length} (${s_},${w},${n},${e_})...`);
  const data = await postOverpass(q, 5);
  head ??= { version: '0.6', generator: data.generator, copyright: 'OpenStreetMap and contributors', attribution: 'http://www.openstreetmap.org/copyright', license: 'http://opendatacommons.org/licenses/odbl/1-0/' };
  for (const el of data.elements) seen.set(`${el.type}/${el.id}`, el);
  console.log(`  +${data.elements.length} elements (total unique: ${seen.size})`);
}


const inCoreArea = (lat, lon) => lat >= 20.995 && lat <= 21.046 && lon >= 105.800 && lon <= 105.8475;
const inHoanKiemCore = (lat, lon) => lat >= 21.021 && lat <= 21.039 && lon >= 105.844 && lon <= 105.859;
const inExpandedArea = (lat, lon) => lat >= 20.984 && lat <= 21.077 && lon >= 105.797 && lon <= 105.866;

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

const approxWayAreaM2 = (w) => {
  const ns = (w.nodes || []).map(id => nodes.get(id)).filter(Boolean);
  if (ns.length < 4) return 0;
  const lat0 = ns[0].lat * Math.PI / 180, k = Math.cos(lat0) * 111320, ky = 110540;
  let s = 0;
  for (let i = 0; i < ns.length - 1; i++) {
    const x0 = ns[i].lon * k, y0 = ns[i].lat * ky;
    const x1 = ns[i + 1].lon * k, y1 = ns[i + 1].lat * ky;
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s) * 0.5;
};

const keptRels = rels.filter(r => {
  const t = r.tags || {};
  if (t.type !== 'building' && t.type !== 'multipolygon') return false;
  return (r.members || []).some(m => {
    if (m.type !== 'way') return false;
    const w = ways.get(m.ref);
    return w && (w.nodes || []).some(nid => { const n = nodes.get(nid); return n && inExpandedArea(n.lat, n.lon); });
  });
});
const relWayIds = new Set();
for (const r of keptRels) for (const m of r.members || []) if (m.type === 'way') relWayIds.add(m.ref);

const keptWays = [...ways.values()].filter(w => {
  if (relWayIds.has(w.id)) return true;
  if (!w.tags) return false;
  const t = w.tags;
  if (t.railway && ['subway', 'light_rail', 'monorail', 'rail', 'platform'].includes(t.railway)) return true;
  const n0 = nodes.get(w.nodes?.[0]);
  if (!n0 || !inExpandedArea(n0.lat, n0.lon)) return false;
  if (inCoreArea(n0.lat, n0.lon)) return true;
  if (t.highway || t.natural || t.water || t.leisure || t.landuse || t.man_made || t.historic || t.heritage || t.tourism || t.amenity) return true;
  if (t['building:part']) return true;
  if (t.building) {
    if (t.name || t['building:levels'] || t.height || t.office || t['addr:street']) return true;
    if (t.building !== 'yes' && t.building !== 'house' && t.building !== 'residential' && t.building !== 'detached') return true;
    const minArea = inHoanKiemCore(n0.lat, n0.lon) ? 85 : 165;
    return approxWayAreaM2(w) >= minArea;
  }
  return true;
});

const usedNodeIds = new Set();
for (const w of keptWays) for (const nid of w.nodes || []) usedNodeIds.add(nid);
const keptNodes = [...nodes.values()].filter(n =>
  usedNodeIds.has(n.id) ||
  (n.tags && (inExpandedArea(n.lat, n.lon) || n.tags.railway === 'station' || n.tags.public_transport === 'station'))
);

const order = { node: 0, way: 1, relation: 2 };
const elements = [...keptNodes, ...keptWays, ...keptRels].sort((p, q) => order[p.type] - order[q.type] || p.id - q.id);
const body = JSON.stringify({ version: head.version, generator: head.generator, copyright: head.copyright, attribution: head.attribution, license: head.license, elements });
writeFileSync(dir + a.file, body);
a.fetched = new Date().toISOString().slice(0, 10);
writeFileSync(dir + 'areas.json', JSON.stringify(areas, null, 2) + '\n');
const count = t => elements.filter(e => e.type === t).length;
console.log(`${a.file}: ${count('node')} nodes, ${count('way')} ways, ${count('relation')} relations · ${(body.length / 1e6).toFixed(2)} MB`);
