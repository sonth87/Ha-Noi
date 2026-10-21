/* importArea: an OSM extract + the area's settings → a City (docs/architecture/osm-import.md).
     1. project every node into the area frame (metres, Tây Sơn along +x);
     2. streets (highway ways), clipped to the area, with widths, sidewalks and bridge decks from the rules;
     3. buildings (building ways and multipolygons) whose centre is in the area; their parts
        (building:part) by containment; storeys from OSM, else from the rules;
     4. areas (parks, grass, water, pitches, pools, islands, bridge outlines), clipped;
     5. point features (lights, crossings, bus stops, trees…) and junctions (where 3+ arms of roads meet; footpaths do not make junctions);
     5b. rails (metro on its viaduct, railways, trams) clipped to the area, and stations with their platforms;
     6. the front edge of every building, and the generated house for small ones;
     7. the area's hand corrections (overrides).
   Every list is sorted by id, so the same extract always gives the same city. Pure. */
import {
  applyOverrides, bbox, bridgeProfile, centroid, clipPathTo, clipRing, closestOnSegment, dist, inRegion, railHeight, frontEdge, frontage, frontStreet, guessKind, guessLevels, houseFor, houseStoreys,
  inRect, normalizeRing, pointInRing, polylineLength, area as ringArea, storeyHeights, streetShape,
  type Area, type Building, type BuildingPart, type City, type Feature, type Junction, type Overrides, type Rail, type Rect, type Station, type Street, type Vec2,
} from '@my-city/core';
import type { OsmExtract, OsmNode, OsmRelation, OsmTags, OsmWay } from '@my-city/osm-data';
import { projector, type Frame } from './frame';
import { areaKind, buildingHint, featureKind, levelsOf, railKind, streetKind } from './tags';

export interface AreaConfig {
  /** osm-data area id */
  area: string;
  name: string;
  frame: Frame;
  /** the part of the frame to keep: a union of rectangles (m) */
  region: Rect[];
  overrides: Overrides;
}

export interface ImportReport {
  counts: Record<string, number>;
  /** overrides that matched nothing (stale after a new download?) */
  unusedOverrides: string[];
  /** building parts outside every building outline */
  orphanParts: string[];
  /** multipolygon inner rings (courtyards) that were dropped */
  droppedHoles: number;
  /** buildings whose front edge was not near any street */
  noStreet: string[];
}

const src = (type: string, id: number) => `osm:${type}/${id}`;
const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function importArea(data: OsmExtract, cfg: AreaConfig, attribution: string): { city: City; report: ImportReport } {
  const P = projector(cfg.frame), region = cfg.region, inside = (p: Vec2) => inRegion(p, region);
  const R: Rect = { x0: Math.min(...region.map(r => r.x0)), y0: Math.min(...region.map(r => r.y0)), x1: Math.max(...region.map(r => r.x1)), y1: Math.max(...region.map(r => r.y1)) };
  const nodes = new Map<number, OsmNode>(), ways = new Map<number, OsmWay>(), relations: OsmRelation[] = [];
  for (const e of data.elements) {
    if (e.type === 'node') nodes.set(e.id, e);
    else if (e.type === 'way') ways.set(e.id, e);
    else relations.push(e);
  }
  const xy = new Map<number, Vec2>();
  for (const n of nodes.values()) xy.set(n.id, P(n.lat, n.lon));
  const path = (w: OsmWay): Vec2[] => w.nodes.map(id => xy.get(id)).filter((p): p is Vec2 => !!p);
  const tags = (e: { tags?: OsmTags }): OsmTags => e.tags ?? {};
  const report: ImportReport = { counts: {}, unusedOverrides: [], orphanParts: [], droppedHoles: 0, noStreet: [] };

  // ---------- 2. streets ----------
  const streets: Street[] = [];
  const streetNodes = new Map<number, Set<string>>();   // node → ids of the street pieces through it
  const degree = new Map<number, number>();               // node → street arms leaving it (an end counts 1, a node inside a way 2)
  for (const w of ways.values()) {
    const t = tags(w), kind = streetKind(t);
    if (!kind) continue;
    const full = path(w);
    if (full.length < 2) continue;
    const oneway = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout';
    const lanes = Number.parseInt(t.lanes ?? '', 10);
    const shape = streetShape(kind, Number.isFinite(lanes) ? lanes : undefined, oneway);
    const layer = Number.parseInt(t.layer ?? '0', 10) || 0;
    const bridge = t.bridge && t.bridge !== 'no' && layer > 0;
    const L = polylineLength(full), prof = bridge ? bridgeProfile(kind, L, 1) : [];
    const road = kind !== 'footway' && kind !== 'steps';
    if (road) w.nodes.forEach((nid, i) => degree.set(nid, (degree.get(nid) ?? 0) + (i === 0 || i === w.nodes.length - 1 ? 1 : 2)));
    const pieces = clipPathTo(full, inside);
    pieces.forEach((piece, k) => {
      const id = pieces.length > 1 ? `s${w.id}-${k}` : `s${w.id}`;
      const s0 = along(full, piece[0]!), s1 = s0 + polylineLength(piece);
      streets.push({
        id, name: t.name, kind, path: piece, ...shape, oneway, layer: bridge ? 1 : layer,
        profile: prof.length ? cutProfile(prof, s0, s1) : [], source: src('way', w.id),
      });
      for (const nid of w.nodes) {
        const p = xy.get(nid);
        if (road && p && inside(p)) { const set = streetNodes.get(nid) ?? new Set(); set.add(id); streetNodes.set(nid, set); }
      }
    });
  }

  // ---------- 3. buildings and parts ----------
  type Raw = { id: string; source: string; ring: Vec2[]; t: OsmTags };
  const outlines: Raw[] = [], partsRaw: Raw[] = [];
  const push = (list: Raw[], id: string, source: string, ring: Vec2[], t: OsmTags) => { const r = normalizeRing(ring); if (r.length >= 3) list.push({ id, source, ring: r, t }); };
  for (const w of ways.values()) {
    const t = tags(w);
    if (w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    if (t.building && t.building !== 'no') push(outlines, `w${w.id}`, src('way', w.id), path(w), t);
    else if (t['building:part'] && t['building:part'] !== 'no') push(partsRaw, `w${w.id}`, src('way', w.id), path(w), t);
  }
  for (const r of relations) {
    const t = tags(r);
    if (t.type !== 'multipolygon') continue;
    const isB = !!t.building && t.building !== 'no', isP = !!t['building:part'];
    if (!isB && !isP) continue;
    const { outer, inner } = rings(r, ways, path);
    report.droppedHoles += inner;
    outer.forEach((ring, k) => push(isB ? outlines : partsRaw, `r${r.id}${outer.length > 1 ? `-${k}` : ''}`, src('relation', r.id), ring, t));
  }

  const keep = outlines.filter(b => inside(centroid(b.ring)));
  const keepWithBox = keep.map(b => ({ b, box: bbox(b.ring), area: ringArea(b.ring) })).sort((a, b) => a.area - b.area);
  const partsOf = new Map<string, Raw[]>();
  for (const p of partsRaw) {
    const c = centroid(p.ring);
    // the smallest outline holding the part's centre
    const owner = keepWithBox.find(x => c[0] >= x.box.x0 && c[0] <= x.box.x1 && c[1] >= x.box.y0 && c[1] <= x.box.y1 && pointInRing(c, x.b.ring))?.b;
    if (!owner) { if (inside(c)) report.orphanParts.push(p.source); continue; }
    partsOf.set(owner.id, [...(partsOf.get(owner.id) ?? []), p]);
  }

  const fronts = streets.filter(s => s.kind !== 'footway' && s.kind !== 'steps' && s.layer === 0);
  const FG = 64, frontGrid = new Map<string, Street[]>();
  for (const s of fronts) {
    const sb = bbox(s.path), pad = s.width / 2 + 45;
    for (let i = Math.floor((sb.x0 - pad) / FG); i <= Math.floor((sb.x1 + pad) / FG); i++) {
      for (let j = Math.floor((sb.y0 - pad) / FG); j <= Math.floor((sb.y1 + pad) / FG); j++) {
        const k = `${i},${j}`, l = frontGrid.get(k);
        if (l) l.push(s); else frontGrid.set(k, [s]);
      }
    }
  }
  const nearStreets = (ring: readonly Vec2[]) => {
    const rb = bbox(ring), set = new Set<Street>();
    for (let i = Math.floor(rb.x0 / FG); i <= Math.floor(rb.x1 / FG); i++) {
      for (let j = Math.floor(rb.y0 / FG); j <= Math.floor(rb.y1 / FG); j++) {
        for (const s of frontGrid.get(`${i},${j}`) ?? []) set.add(s);
      }
    }
    return set.size ? [...set] : fronts;
  };
  const buildings: Building[] = keep.map(b => {
    const kind = guessKind(b.ring, buildingHint(b.t)), own = levelsOf(b.t);
    const levels = own ?? guessLevels(kind, b.source);
    const raw = partsOf.get(b.id) ?? [];
    const parts: BuildingPart[] = raw.length
      ? raw.map(p => ({ id: p.id, footprint: p.ring, z0: 0, floors: storeyHeights(kind, levelsOf(p.t) ?? levels), facade: 'wall', roof: 'flat', source: p.source }))
      : [{ id: b.id, footprint: b.ring, z0: 0, floors: storeyHeights(kind, levels), facade: 'wall', roof: b.t['roof:shape'] && b.t['roof:shape'] !== 'flat' ? 'pitched' : 'flat', source: b.source }];
    const localFronts = nearStreets(b.ring);
    const front = frontEdge(b.ring, localFronts);
    const { w, d } = frontage(b.ring, front);
    const fromOsm = own !== undefined || raw.some(p => levelsOf(p.t) !== undefined);
    // on a main street a house is always a shop (rules.houseFor)
    const facing = frontStreet(b.ring, front, localFronts), on = facing && facing.gap < 25 && MAIN.has(facing.street.kind) ? 'main' : 'minor';
    const house = raw.length ? undefined : houseFor(b.source, kind, levels, w, d, {}, on);
    // a generated house sets its own storey heights (a raised ground floor over a semi-basement…)
    if (house) parts[0] = { ...parts[0]!, floors: houseStoreys(house.spec) };
    return { id: b.id, name: b.t.name, kind, footprint: b.ring, parts, levelsFrom: fromOsm ? 'osm' : 'rule', front, house, source: b.source };
  });
  for (const b of buildings) {
    const p = b.footprint[b.front]!, q = b.footprint[(b.front + 1) % b.footprint.length]!, mid: Vec2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const localFronts = nearStreets(b.footprint);
    if (!localFronts.some(s => nearPath(mid, s.path, s.width / 2 + 40))) report.noStreet.push(b.source);
  }

  // ---------- 4. areas ----------
  const areas: Area[] = [];
  const addArea = (id: string, source: string, ring: Vec2[], t: OsmTags) => {
    const kind = areaKind(t);
    if (!kind) return;
    // clipped to the rectangle holding its middle (or any vertex of it)
    const nr = normalizeRing(ring), c = centroid(nr), box = region.find(r => inRect(c, r)) ?? region.find(r => nr.some(q => inRect(q, r)));
    if (!box) return;
    const clipped = clipRing(nr, box);
    if (clipped.length >= 3) areas.push({ id, kind, name: t.name, polygon: clipped, source });
  };
  for (const w of ways.values()) if (w.nodes.length >= 4 && w.nodes[0] === w.nodes[w.nodes.length - 1]) addArea(`a${w.id}`, src('way', w.id), path(w), tags(w));
  for (const r of relations) {
    if (tags(r).type !== 'multipolygon' || !areaKind(tags(r))) continue;
    const { outer, inner } = rings(r, ways, path);
    report.droppedHoles += inner;
    outer.forEach((ring, k) => addArea(`ar${r.id}${outer.length > 1 ? `-${k}` : ''}`, src('relation', r.id), ring, tags(r)));
  }

  // ---------- 5. features and junctions ----------
  const features: Feature[] = [];
  for (const n of nodes.values()) {
    const kind = n.tags && featureKind(n.tags), at = xy.get(n.id)!;
    if (kind && inside(at)) features.push({ id: `n${n.id}`, kind, at, source: src('node', n.id) });
  }
  const signals = features.filter(f => f.kind === 'traffic-signals');
  const junctions: Junction[] = [];
  // a junction is where three or more arms meet; two ways simply continuing each other are not one
  for (const [nid, ids] of streetNodes) {
    if ((degree.get(nid) ?? 0) < 3) continue;
    const at = xy.get(nid)!;
    junctions.push({ id: `j${nid}`, at, streets: [...ids].sort(), signals: signals.some(f => dist(f.at, at) < 20) });
  }

  // ---------- 6b. rails and stations ----------
  const rails: Rail[] = [];
  for (const w of ways.values()) {
    const t = tags(w), kind = railKind(t);
    if (!kind) continue;
    const layer = Number.parseInt(t.layer ?? '0', 10) || 0, elevated = (!!t.bridge && t.bridge !== 'no') || layer > 0;
    const pieces = clipPathTo(path(w), inside);
    pieces.forEach((piece, k) => rails.push({
      id: pieces.length > 1 ? `rl${w.id}-${k}` : `rl${w.id}`, name: t.name, kind, path: piece, elevated, height: railHeight(kind, elevated), source: src('way', w.id),
    }));
  }
  const platformRings = [...ways.values()].filter(w => tags(w).railway === 'platform' && w.nodes[0] === w.nodes[w.nodes.length - 1]).map(w => normalizeRing(path(w)));
  const stations: Station[] = [];
  for (const n of nodes.values()) {
    const t = n.tags ?? {};
    if (t.railway !== 'station' && t.public_transport !== 'station') continue;
    const at = xy.get(n.id)!, kind = t.station === 'subway' || t.station === 'light_rail' ? 'metro' : t.station === 'tram' ? 'tram' : 'rail';
    if (!inside(at) && !rails.some(r => r.kind === kind && r.path.some(p => dist(p, at) < 80))) continue;
    stations.push({ id: `st${n.id}`, name: t.name, kind, at, platforms: platformRings.filter(r => dist(centroid(r), at) < 120), source: src('node', n.id) });
  }

  // ---------- 7. hand corrections ----------
  const base: City = {
    id: cfg.area, name: cfg.name, bounds: R, region,
    streets: streets.sort(byId), junctions: junctions.sort(byId), buildings: buildings.sort(byId), areas: areas.sort(byId), features: features.sort(byId),
    rails: rails.sort(byId), stations: stations.sort(byId), attribution: [attribution],
  };
  const { city, unused } = applyOverrides(base, cfg.overrides);
  report.unusedOverrides = unused;
  report.counts = {
    streets: city.streets.length, junctions: city.junctions.length, buildings: city.buildings.length,
    parts: city.buildings.reduce((s, b) => s + b.parts.length, 0), houses: city.buildings.filter(b => b.house).length,
    areas: city.areas.length, features: city.features.length, rails: city.rails.length, stations: city.stations.length,
  };
  return { city, report };
}

/** distance along a polyline to the point on it nearest p */
function along(path: readonly Vec2[], p: Vec2): number {
  let best = { d: Infinity, s: 0 }, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, c = closestOnSegment(p, a, b), L = dist(a, b);
    if (c.d < best.d) best = { d: c.d, s: acc + c.t * L };
    acc += L;
  }
  return best.s;
}

/** the part of a height profile between s0 and s1, re-based to start at 0 */
function cutProfile(prof: [number, number][], s0: number, s1: number): [number, number][] {
  const z = (s: number) => {
    if (s <= prof[0]![0]) return prof[0]![1];
    for (let i = 1; i < prof.length; i++) { const [a, za] = prof[i - 1]!, [b, zb] = prof[i]!; if (s <= b) return b === a ? zb : za + ((zb - za) * (s - a)) / (b - a); }
    return prof[prof.length - 1]![1];
  };
  return [[0, z(s0)], ...prof.filter(([s]) => s > s0 && s < s1).map(([s, h]): [number, number] => [s - s0, h]), [s1 - s0, z(s1)]];
}

const nearPath = (p: Vec2, path: readonly Vec2[], r: number) => path.some((a, i) => i > 0 && closestOnSegment(p, path[i - 1]!, a).d <= r);

/** outer rings of a multipolygon, joining its member ways end to end; counts inner rings */
function rings(r: OsmRelation, ways: Map<number, OsmWay>, path: (w: OsmWay) => Vec2[]): { outer: Vec2[][]; inner: number } {
  const segs = r.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '')).map(m => ways.get(m.ref)).filter((w): w is OsmWay => !!w).map(w => [...w.nodes]);
  const inner = r.members.filter(m => m.type === 'way' && m.role === 'inner').length;
  const out: Vec2[][] = [];
  const toRing = (ids: number[]) => path({ type: 'way', id: 0, nodes: ids });
  while (segs.length) {
    let ring = segs.shift()!;
    for (let grew = true; grew && ring[0] !== ring[ring.length - 1];) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i]!, end = ring[ring.length - 1];
        if (s[0] === end) ring = [...ring, ...s.slice(1)];
        else if (s[s.length - 1] === end) ring = [...ring, ...[...s].reverse().slice(1)];
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length >= 4 && ring[0] === ring[ring.length - 1]) out.push(toRing(ring));
  }
  return { outer: out, inner };
}
