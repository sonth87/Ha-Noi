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
  type Area, type Building, type BuildingPart, type City, type CityLandmarkCatalogEntry, type CityPlace, type Feature, type Junction, type Overrides, type Rail, type Rect, type Station, type Street, type Vec2,
} from '@my-city/core';
import type { OsmExtract, OsmNode, OsmRelation, OsmTags, OsmWay } from '@my-city/osm-data';
import { projector, type Frame } from './frame';
import { areaKind, buildingHint, featureKind, levelsOf, railKind, streetKind } from './tags';

export interface AreaConfig {
  /** osm-data area id */
  area: string;
  name: string;
  /** default city/metropolis name for fallback addresses (e.g. 'Hà Nội') */
  cityName?: string;
  frame: Frame;
  /** the part of the frame to keep: a union of rectangles (m) */
  region: Rect[];
  /** optional resolver turning city-frame [x, y] into an administrative district name */
  districtOf?: (pt: Vec2) => string;
  /** optional heritage / monument / park descriptions keyed by place name */
  heritageNotes?: Readonly<Record<string, string>>;
  /** optional area name normalizations keyed by raw name or source id */
  areaNameOverrides?: Readonly<Record<string, string>>;
  /** optional station metadata resolver */
  stationMeta?: (rawName: string, at: Vec2) => { lineTag?: string; lineName?: string; address?: string };
  /** curated quick-navigation places for the area */
  places?: CityPlace[];
  /** curated 13-category landmark catalog for the city/region */
  landmarksCatalog?: readonly CityLandmarkCatalogEntry[];
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

export interface ImportOptions {
  /** Pre-imported arterial streets from the city skeleton so chunk buildings orient to main roads */
  extraStreets?: readonly Street[];
  /** When true, skip overrides.add so synthetic buildings/features are not duplicated per chunk */
  isChunk?: boolean;
}

export function importArea(
  data: OsmExtract,
  cfg: AreaConfig,
  attribution: string,
  options?: ImportOptions,
): { city: City; report: ImportReport } {
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
      let cutProf: [number, number][] = [];
      if (prof.length) {
        const s0 = along(full, piece[0]!), s1 = s0 + polylineLength(piece);
        cutProf = cutProfile(prof, s0, s1);
      }
      streets.push({
        id, name: t.name, kind, path: piece, ...shape, oneway, layer: bridge ? 1 : layer,
        profile: cutProf, source: src('way', w.id),
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
  const railPaths = [...ways.values()].filter(w => railKind(tags(w)) === 'metro').map(w => path(w));
  const isMetroShellOrPier = (t: OsmTags, ring: Vec2[]) =>
    t.building === 'transportation' || t.building === 'train_station' ||
    (t.building === 'yes' && t.height === '8' && ringArea(ring) < 12 && railPaths.some(rp => nearPath(centroid(ring), rp, 4)));
  const push = (list: Raw[], id: string, source: string, ring: Vec2[], t: OsmTags) => { const r = normalizeRing(ring); if (r.length >= 3) list.push({ id, source, ring: r, t }); };
  const outlineByWayId = new Map<number, Raw>();
  for (const w of ways.values()) {
    const t = tags(w);
    if (w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const wPath = path(w);
    if (t.building && t.building !== 'no') {
      if (!isMetroShellOrPier(t, wPath)) {
        const prevLen = outlines.length;
        push(outlines, `w${w.id}`, src('way', w.id), wPath, t);
        if (outlines.length > prevLen) outlineByWayId.set(w.id, outlines[outlines.length - 1]!);
      }
    } else if (t['building:part'] && t['building:part'] !== 'no') push(partsRaw, `w${w.id}`, src('way', w.id), wPath, t);
  }
  for (const r of relations) {
    const t = tags(r);
    if (t.type === 'building') {
      const outWays = r.members.filter(m => m.type === 'way' && (m.role === 'outline' || m.role === 'outer')).map(m => ways.get(m.ref)).filter((w): w is OsmWay => !!w && w.nodes.length >= 4 && w.nodes[0] === w.nodes[w.nodes.length - 1]);
      outWays.forEach((w, k) => {
        const existing = outlineByWayId.get(w.id);
        if (existing) {
          existing.t = { ...t, ...existing.t };
        } else {
          push(outlines, `r${r.id}${outWays.length > 1 ? `-${k}` : ''}`, src('relation', r.id), path(w), { building: 'apartments', ...tags(w), ...t });
        }
      });
      continue;
    }
    if (t.type !== 'multipolygon') continue;
    const isB = !!t.building && t.building !== 'no', isP = !!t['building:part'];
    if (!isB && !isP) continue;
    if (isB) {
      const outerWayIds = r.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '')).map(m => m.ref);
      if (outerWayIds.length > 0 && outerWayIds.every(id => outlineByWayId.has(id))) {
        for (const id of outerWayIds) {
          const existing = outlineByWayId.get(id)!;
          existing.t = { ...t, ...existing.t };
        }
        continue;
      }
    }
    const { outer, inner } = rings(r, ways, path);
    report.droppedHoles += inner;
    outer.forEach((ring, k) => push(isB ? outlines : partsRaw, `r${r.id}${outer.length > 1 ? `-${k}` : ''}`, src('relation', r.id), ring, t));
  }

  const keep = outlines.filter(b => inside(centroid(b.ring)));
  type BoxedOutline = { b: Raw; box: Rect; area: number };
  const keepWithBox: BoxedOutline[] = keep.map(b => ({ b, box: bbox(b.ring), area: ringArea(b.ring) })).sort((a, b) => a.area - b.area);
  const OG = 64, outlineGrid = new Map<string, BoxedOutline[]>();
  const addOutlineToGrid = (entry: BoxedOutline) => {
    const { x0, y0, x1, y1 } = entry.box;
    for (let i = Math.floor((x0 - 1) / OG); i <= Math.floor((x1 + 1) / OG); i++) {
      for (let j = Math.floor((y0 - 1) / OG); j <= Math.floor((y1 + 1) / OG); j++) {
        const k = `${i},${j}`, l = outlineGrid.get(k);
        if (l) l.push(entry); else outlineGrid.set(k, [entry]);
      }
    }
  };
  for (const entry of keepWithBox) addOutlineToGrid(entry);

  const partsOf = new Map<string, Raw[]>();
  for (const p of partsRaw) {
    const c = centroid(p.ring);
    const pBox = bbox(p.ring);
    const candSet = new Set<BoxedOutline>();
    for (let i = Math.floor(pBox.x0 / OG); i <= Math.floor(pBox.x1 / OG); i++) {
      for (let j = Math.floor(pBox.y0 / OG); j <= Math.floor(pBox.y1 / OG); j++) {
        const cell = outlineGrid.get(`${i},${j}`);
        if (cell) for (const x of cell) candSet.add(x);
      }
    }
    const cands = candSet.size > 1 ? [...candSet].sort((a, b) => a.area - b.area) : [...candSet];
    // the smallest outline holding the part's centre (or sharing a vertex/edge with it)
    const owner = (
      cands.find(x => c[0] >= x.box.x0 && c[0] <= x.box.x1 && c[1] >= x.box.y0 && c[1] <= x.box.y1 && pointInRing(c, x.b.ring)) ??
      cands.find(x => p.ring.some(v =>
        v[0] >= x.box.x0 - 0.5 && v[0] <= x.box.x1 + 0.5 && v[1] >= x.box.y0 - 0.5 && v[1] <= x.box.y1 + 0.5 &&
        (pointInRing(v, x.b.ring) || x.b.ring.some(u => dist(u, v) < 0.5)),
      ))
    )?.b;
    if (!owner) {
      if (inside(c)) {
        const promoted: Raw = { id: `bp_${p.id}`, source: p.source, ring: p.ring, t: { ...p.t, building: p.t.building ?? p.t['building:part'] ?? 'yes' } };
        keep.push(promoted);
        const newEntry: BoxedOutline = { b: promoted, box: pBox, area: ringArea(promoted.ring) };
        keepWithBox.push(newEntry);
        addOutlineToGrid(newEntry);
        partsOf.set(promoted.id, [p]);
      }
      continue;
    }
    let list = partsOf.get(owner.id);
    if (!list) partsOf.set(owner.id, (list = []));
    list.push(p);
  }

  const allFrontCandidates = options?.extraStreets ? [...streets, ...options.extraStreets] : streets;
  const fronts = allFrontCandidates.filter(s => s.kind !== 'footway' && s.kind !== 'steps' && s.layer === 0);
  const FG = 48, frontGrid = new Map<string, Street[]>();
  for (const s of fronts) {
    const pad = s.width / 2 + 42;
    const seenCells = new Set<string>();
    for (let k = 1; k < s.path.length; k++) {
      const a = s.path[k - 1]!, b = s.path[k]!;
      const x0 = Math.min(a[0], b[0]) - pad, x1 = Math.max(a[0], b[0]) + pad;
      const y0 = Math.min(a[1], b[1]) - pad, y1 = Math.max(a[1], b[1]) + pad;
      for (let i = Math.floor(x0 / FG); i <= Math.floor(x1 / FG); i++) {
        for (let j = Math.floor(y0 / FG); j <= Math.floor(y1 / FG); j++) {
          const key = `${i},${j}`;
          if (seenCells.has(key)) continue;
          seenCells.add(key);
          const l = frontGrid.get(key);
          if (l) l.push(s); else frontGrid.set(key, [s]);
        }
      }
    }
  }
  const nearStreets = (ring: readonly Vec2[]) => {
    const rb = bbox(ring), set = new Set<Street>();
    const i0 = Math.floor(rb.x0 / FG), i1 = Math.floor(rb.x1 / FG);
    const j0 = Math.floor(rb.y0 / FG), j1 = Math.floor(rb.y1 / FG);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const cell = frontGrid.get(`${i},${j}`);
        if (cell) for (const s of cell) set.add(s);
      }
    }
    if (set.size) return [...set];
    for (let i = i0 - 2; i <= i1 + 2; i++) {
      for (let j = j0 - 2; j <= j1 + 2; j++) {
        const cell = frontGrid.get(`${i},${j}`);
        if (cell) for (const s of cell) set.add(s);
      }
    }
    return set.size ? [...set] : [];
  };
  const formatOsmAddress = (t: OsmTags, fallbackStreet?: string): string | undefined => {
    const hn = t['addr:housenumber']?.trim();
    const st = t['addr:street']?.trim() || fallbackStreet?.trim();
    const sub = t['addr:subdistrict']?.trim();
    const parts: string[] = [];
    if (hn && st) parts.push(`${hn} ${st}`);
    else if (st) parts.push(st);
    else if (hn) parts.push(`Số ${hn}`);
    if (sub) parts.push(sub.startsWith('Phường') ? sub : `P. ${sub}`);
    return parts.length ? parts.join(', ') : undefined;
  };
  const inferSubtype = (t: OsmTags): string | undefined => {
    if (t.historic || t.heritage || t.amenity === 'place_of_worship' || t.building === 'temple' || t.building === 'church' || t.landuse === 'religious') return 'heritage';
    if (t.amenity === 'hospital' || t.building === 'hospital' || t.amenity === 'clinic') return 'hospital';
    if (t.amenity === 'university' || t.amenity === 'college' || t.building === 'university') return 'university';
    if (t.amenity === 'school' || t.amenity === 'kindergarten' || t.building === 'school') return 'school';
    if (t.amenity === 'cinema' || t.amenity === 'theatre') return 'cinema';
    if (t.building === 'government' || t.office === 'government' || t.amenity === 'townhall' || t.amenity === 'police') return 'government';
    return undefined;
  };

  // Collect named institutional campuses (universities, hospitals, schools, temples) to enrich buildings inside them
  type Campus = { name: string; ring: Vec2[]; box: Rect; address?: string; subtype?: string };
  const campuses: Campus[] = [];
  for (const w of ways.values()) {
    const t = tags(w);
    if (t.building || !t.name || w.nodes.length < 4 || w.nodes[0] !== w.nodes[w.nodes.length - 1]) continue;
    const sub = inferSubtype(t);
    if (!sub) continue;
    const ring = normalizeRing(path(w));
    if (ring.length >= 3) campuses.push({ name: t.name, ring, box: bbox(ring), address: formatOsmAddress(t), subtype: sub });
  }
  for (const r of relations) {
    const t = tags(r);
    if (t.building || !t.name) continue;
    const sub = inferSubtype(t);
    if (!sub) continue;
    const { outer } = rings(r, ways, path);
    for (const o of outer) {
      const ring = normalizeRing(o);
      if (ring.length >= 3) campuses.push({ name: t.name, ring, box: bbox(ring), address: formatOsmAddress(t), subtype: sub });
    }
  }
  const campusGrid = new Map<string, Campus[]>();
  for (const cp of campuses) {
    for (let i = Math.floor(cp.box.x0 / FG); i <= Math.floor(cp.box.x1 / FG); i++) {
      for (let j = Math.floor(cp.box.y0 / FG); j <= Math.floor(cp.box.y1 / FG); j++) {
        const k = `${i},${j}`, l = campusGrid.get(k);
        if (l) l.push(cp); else campusGrid.set(k, [cp]);
      }
    }
  }

  const partFloorsOf = (pt: OsmTags, kind: Building['kind'], fallbackLevels: number): number[] => {
    const lv = Number.parseFloat(pt['building:levels'] ?? '');
    const h = Number.parseFloat(pt.height ?? '');
    const z0 = Number.parseFloat(pt.min_height ?? '0') || 0;
    const netH = h > z0 ? h - z0 : h;
    if (!Number.isFinite(lv) && Number.isFinite(netH) && netH > 0) {
      const n = Math.max(1, Math.round(netH / 3.2));
      const fh = Number((netH / n).toFixed(2));
      return Array.from({ length: n }, () => fh);
    }
    return storeyHeights(kind, levelsOf(pt) ?? fallbackLevels);
  };

  const GENERIC_PART_NAME = /^(chung cư|văn phòng.*|toà\s+[a-z0-9]+|tòa\s+[a-z0-9]+|tower\s+[a-z0-9]+|khối\s+[a-z0-9]+|m\d+|s\d+|t\d+)$/iu;

  const normCatalogKey = (s: string) => s.replace(/[“”"']/gu, '').replace(/\s+/gu, ' ').trim().toLowerCase();
  const catalogBySource = new Map<string, CityLandmarkCatalogEntry>();
  const catalogByName = new Map<string, CityLandmarkCatalogEntry>();
  if (cfg.landmarksCatalog) {
    for (const entry of cfg.landmarksCatalog) {
      if (entry.osmSource) catalogBySource.set(entry.osmSource, entry);
      catalogByName.set(normCatalogKey(entry.name), entry);
      const stripped = entry.name.replace(/\s*\([^)]*\)\s*$/u, '').trim();
      if (stripped) catalogByName.set(normCatalogKey(stripped), entry);
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          catalogByName.set(normCatalogKey(alias), entry);
        }
      }
    }
  }

  // Filter out unnamed bridgehead box way/1220021892 and Đình Trấn Ba way/178995271 (both rendered in full 3D detail by drawDenNgocSon)
  const filteredKeep = keep.filter(b => b.source !== 'osm:way/1220021892' && b.source !== 'osm:way/178995271');

  const buildings: Building[] = filteredKeep.map(b => {
    const c = centroid(b.ring);
    const campusCell = campusGrid.get(`${Math.floor(c[0] / FG)},${Math.floor(c[1] / FG)}`);
    const campus = campusCell?.find(cp => inRect(c, cp.box) && pointInRing(c, cp.ring));
    const raw = partsOf.get(b.id) ?? [];
    let name = b.t.name;
    if (!name && raw.length) {
      const partNames = [...new Set(raw.map(p => p.t.name?.trim()).filter((n): n is string => n !== undefined && n.length > 0 && !GENERIC_PART_NAME.test(n)))];
      if (partNames.length) name = partNames.slice(0, 2).join(' – ');
    }
    if (campus && (!name || /^[A-ZĐ]\d{1,2}$/i.test(name.trim()))) {
      name = name ? `${campus.name} – Nhà ${name.trim()}` : campus.name;
    }
    const nTrim = name?.trim() ?? '';
    const nNorm = normCatalogKey(nTrim);
    const catEntry =
      catalogBySource.get(b.source) ??
      (nNorm ? catalogByName.get(nNorm) : undefined);
    const subtype = inferSubtype(b.t) ?? campus?.subtype ?? (catEntry ? 'heritage' : undefined);
    const isMonumentOrArtwork = Boolean(
      b.t.historic === 'monument' ||
        b.t.historic === 'memorial' ||
        b.t.building === 'monument' ||
        b.t.artwork_type ||
        b.t.tourism === 'artwork' ||
        /^(tượng|tượng đài|đài tưởng niệm|nhà bia|cảm tử|quyết tử)\b/iu.test(nNorm),
    );
    const isHeritage = subtype === 'heritage' || isMonumentOrArtwork || Boolean(catEntry?.model);
    const rawKind = guessKind(b.ring, isHeritage ? 'other' : buildingHint(b.t));
    const kind: Building['kind'] = isHeritage && (rawKind === 'tube-house' || rawKind === 'house') ? 'other' : rawKind;
    const own = levelsOf(b.t);
    const baseArea = ringArea(b.ring);
    const levels = own ?? (isHeritage ? (baseArea < 90 ? 1 : 2) : guessLevels(kind, b.source));
    const bFacade: BuildingPart['facade'] = b.t['building:material'] === 'glass' ? 'glass' : 'wall';
    const rawParts: BuildingPart[] = raw.map(p => ({
      id: p.id, footprint: p.ring, z0: Number.parseFloat(p.t.min_height ?? '0') || 0,
      floors: partFloorsOf(p.t, kind, levels),
      facade: (p.t['building:material'] ?? b.t['building:material']) === 'glass' ? 'glass' : 'wall',
      roof: p.t['roof:shape'] && p.t['roof:shape'] !== 'flat' ? 'pitched' : 'flat', source: p.source,
    }));
    // When OSM only mapped the tower building:part(s) inside a larger podium outline, keep the base podium too
    const ov = cfg.overrides.buildings?.[b.source];
    const isBespoke = Boolean(ov?.model && ov?.parts);
    const rawArea = raw.reduce((s, p) => s + ringArea(p.ring), 0);
    const maxPartLevels = raw.length ? Math.max(...raw.map(p => levelsOf(p.t) ?? levels)) : levels;
    const needPodium = raw.length > 0 && !isBespoke && !isHeritage && rawArea < baseArea * 0.82;
    const podiumLevels = own !== undefined && own < maxPartLevels ? own : Math.min(4, Math.max(1, maxPartLevels - 1));
    const parts: BuildingPart[] = raw.length
      ? (needPodium ? [...rawParts, { id: b.id, footprint: b.ring, z0: 0, floors: storeyHeights(kind, Math.max(1, podiumLevels)), facade: bFacade, roof: 'flat', source: b.source }] : rawParts)
      : [{ id: b.id, footprint: b.ring, z0: 0, floors: partFloorsOf(b.t, kind, levels), facade: bFacade, roof: b.t['roof:shape'] && b.t['roof:shape'] !== 'flat' ? 'pitched' : 'flat', source: b.source }];
    const localFronts = nearStreets(b.ring);
    const front = frontEdge(b.ring, localFronts);
    const pFront = b.ring[front]!, qFront = b.ring[(front + 1) % b.ring.length]!, midFront: Vec2 = [(pFront[0] + qFront[0]) / 2, (pFront[1] + qFront[1]) / 2];
    if (!localFronts.some(s => nearPath(midFront, s.path, s.width / 2 + 40))) report.noStreet.push(b.source);
    const { w, d } = frontage(b.ring, front);
    const fromOsm = own !== undefined || raw.some(p => levelsOf(p.t) !== undefined);
    // on a main street a house is always a shop (rules.houseFor); never generate a modern tube house for a heritage building
    const facing = frontStreet(b.ring, front, localFronts), on = facing && facing.gap < 25 && MAIN.has(facing.street.kind) ? 'main' : 'minor';
    const house = raw.length || isHeritage ? undefined : houseFor(b.source, kind, levels, w, d, {}, on);
    // a generated house sets its own storey heights (a raised ground floor over a semi-basement…)
    if (house) parts[0] = { ...parts[0]!, floors: houseStoreys(house.spec) };
    const address = formatOsmAddress(b.t, facing?.street.name) ?? campus?.address;
    const district = cfg.districtOf?.(c);
    const description = (name ? cfg.heritageNotes?.[name.trim()] : undefined) ?? catEntry?.description;
    const autoModel =
      catEntry?.model ??
      (isMonumentOrArtwork
        ? /cảm tử|quyết tử/iu.test(nNorm)
          ? 'tuong-dai-cam-tu'
          : 'statue-monument-plaza'
        : b.t.building === 'church' || b.t.building === 'cathedral' || /^(nhà thờ|giáo xứ|thánh đường)\b/i.test(nTrim)
          ? 'church-hall'
          : /^(lăng|lăng mộ)\b/i.test(nTrim)
            ? 'traditional-mausoleum'
            : /^(chùa|tổ đình)\b/i.test(nTrim) || (isHeritage && b.t.religion === 'buddhist')
              ? 'traditional-pagoda'
              : /^(đền|đình|miếu|phủ)\b/i.test(nTrim) || b.t.building === 'temple' || b.t.building === 'shrine'
                ? 'traditional-temple'
                : undefined);
    return {
      id: b.id, name, kind, footprint: b.ring, parts, levelsFrom: fromOsm ? 'osm' : 'rule', front, house,
      ...(autoModel ? { model: autoModel, isSignatureLandmark: Boolean(nTrim || catEntry) } : {}),
      ...(address ? { address } : {}),
      ...(district ? { district } : {}),
      ...(subtype ? { subtype } : {}),
      ...(description ? { description } : {}),
      source: b.source,
    };
  });

  // ---------- 4. areas ----------
  const areas: Area[] = [];
  const addArea = (id: string, source: string, ring: Vec2[], t: OsmTags, rawHoles?: readonly Vec2[][]) => {
    const kind = areaKind(t);
    if (!kind) return;
    const nr = normalizeRing(ring);
    if (nr.length < 3) return;
    const c = centroid(nr);
    const touchesRegion = region.some(r => inRect(c, r)) || region.some(r => nr.some(q => inRect(q, r)));
    if (!touchesRegion) return;
    // Keep polygons within overall city bounds R completely unclipped so multi-district lakes (Hồ Tây, Hồ Trúc Bạch, etc.)
    // are never sliced by internal district sub-rectangles; only clip to R if vertices extend outside R.
    const allInBounds = nr.every(q => inRect(q, R));
    const clipped = allInBounds ? nr : clipRing(nr, R);
    if (clipped.length < 3) return;
    const validHoles: Vec2[][] = [];
    if (rawHoles?.length) {
      for (const h of rawHoles) {
        const nh = normalizeRing(h);
        if (nh.length < 3) continue;
        const hc = centroid(nh);
        if (!pointInRing(hc, clipped)) continue;
        const ch = nh.every(q => inRect(q, R)) ? nh : clipRing(nh, R);
        if (ch.length >= 3) validHoles.push(ch);
      }
    }
    const nearSt = nearStreets(clipped).filter(s => s.name);
    let bestSt: string | undefined;
    let bestD = Infinity;
    for (const s of nearSt) {
      for (const p of s.path) {
        const d = dist(c, p);
        if (d < bestD) { bestD = d; bestSt = s.name; }
      }
    }
    const rawName = t.name?.trim();
    const name = (rawName && cfg.areaNameOverrides?.[rawName]) ?? cfg.areaNameOverrides?.[source] ?? rawName;
    const address = formatOsmAddress(t, bestD < 220 ? bestSt : undefined);
    const district = cfg.districtOf?.(c);
    const subtype = inferSubtype(t) ?? (kind === 'park' ? 'park' : kind === 'water' ? 'lake' : undefined);
    const description = (name && cfg.heritageNotes?.[name]) ?? (rawName && cfg.heritageNotes?.[rawName]);
    areas.push({
      id, kind, name, polygon: clipped,
      ...(validHoles.length ? { holes: validHoles } : {}),
      ...(address ? { address } : {}),
      ...(district ? { district } : {}),
      ...(subtype ? { subtype } : {}),
      ...(description ? { description } : {}),
      source,
    });
  };
  for (const w of ways.values()) if (w.nodes.length >= 4 && w.nodes[0] === w.nodes[w.nodes.length - 1]) addArea(`a${w.id}`, src('way', w.id), path(w), tags(w));
  for (const r of relations) {
    // Skip rel/6907107 (27km regional Red River relation) because Sông Hồng within Hanoi bounds is already represented cleanly by way/99000000010 & way/1162959477
    if (r.id === 6907107) continue;
    if (tags(r).type !== 'multipolygon' || !areaKind(tags(r))) continue;
    const { outer, innerRings } = rings(r, ways, path);
    outer.forEach((ring, k) => addArea(`ar${r.id}${outer.length > 1 ? `-${k}` : ''}`, src('relation', r.id), ring, tags(r), innerRings));
  }

  // ---------- 5. features and junctions ----------
  const features: Feature[] = [];
  for (const n of nodes.values()) {
    const t = n.tags;
    const kind = t && featureKind(t), at = xy.get(n.id)!;
    if (!kind || !inside(at)) continue;
    if (kind === 'monument' || kind === 'heritage') {
      const nearSt = nearStreets([at]).filter(s => s.name);
      let bestSt: string | undefined, bestD = Infinity;
      for (const s of nearSt) for (const p of s.path) { const d = dist(at, p); if (d < bestD) { bestD = d; bestSt = s.name; } }
      const address = formatOsmAddress(t, bestD < 220 ? bestSt : undefined);
      const district = cfg.districtOf?.(at);
      const description = t.name ? cfg.heritageNotes?.[t.name.trim()] : undefined;
      const subtitle = t.artwork_type === 'statue'
        ? 'Tượng đài lịch sử'
        : t.historic === 'archaeological_site'
          ? `Di chỉ khảo cổ${t.start_date ? ` (từ năm ${t.start_date})` : ''}`
          : 'Di tích lịch sử – văn hóa';
      features.push({
        id: `n${n.id}`, kind, name: t.name,
        ...(address ? { address } : {}),
        ...(district ? { district } : {}),
        ...(description ? { description } : {}),
        subtitle,
        at, source: src('node', n.id),
      });
    } else {
      features.push({ id: `n${n.id}`, kind, at, source: src('node', n.id) });
    }
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
  const rawMetroWays: { w: OsmWay; t: OsmTags; pts: Vec2[]; len: number; elevated: boolean }[] = [];
  for (const w of ways.values()) {
    const t = tags(w), kind = railKind(t);
    if (!kind) continue;
    const layer = Number.parseInt(t.layer ?? '0', 10) || 0, elevated = (!!t.bridge && t.bridge !== 'no') || layer > 0;
    const pts = path(w);
    if (pts.length < 2) continue;
    if (kind === 'metro' && elevated) {
      rawMetroWays.push({ w, t, pts, len: polylineLength(pts), elevated });
      continue;
    }
    const pieces = clipPathTo(pts, inside);
    pieces.forEach((piece, k) => rails.push({
      id: pieces.length > 1 ? `rl${w.id}-${k}` : `rl${w.id}`, name: t.name, kind, path: piece, elevated, height: railHeight(kind, elevated), source: src('way', w.id),
    }));
  }
  if (rawMetroWays.some(m => m.len > 400)) {
    const dirAt = (nids: readonly number[], atEnd: boolean): Vec2 => {
      const a = xy.get(atEnd ? nids[nids.length - 2]! : nids[0]!)!;
      const b = xy.get(atEnd ? nids[nids.length - 1]! : nids[1]!)!;
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [dx / L, dy / L];
    };
    const pool = [...rawMetroWays].sort((a, b) => b.len - a.len);
    const used = new Set<number>();
    const stitched: { id: string; name?: string; path: Vec2[]; source: string }[] = [];
    for (const seed of pool) {
      if (used.has(seed.w.id) || seed.len < 400) continue;
      used.add(seed.w.id);
      let cur = [...seed.w.nodes];
      for (let grew = true; grew;) {
        grew = false;
        const endNode = cur[cur.length - 1]!, endDir = dirAt(cur, true);
        let best: typeof seed | null = null, bestDot = 0.82, rev = false;
        for (const cand of pool) {
          if (used.has(cand.w.id) || (cand.t.name ?? '') !== (seed.t.name ?? '')) continue;
          if (cand.w.nodes[0] === endNode) {
            const d = dirAt(cand.w.nodes, false), dot = endDir[0] * d[0] + endDir[1] * d[1];
            if (dot > bestDot) { bestDot = dot; best = cand; rev = false; }
          } else if (cand.w.nodes[cand.w.nodes.length - 1] === endNode) {
            const d = dirAt(cand.w.nodes, true), dot = -endDir[0] * d[0] - endDir[1] * d[1];
            if (dot > bestDot) { bestDot = dot; best = cand; rev = true; }
          }
        }
        if (best) {
          used.add(best.w.id);
          const nextNodes = rev ? [...best.w.nodes].reverse() : best.w.nodes;
          cur = [...cur, ...nextNodes.slice(1)];
          grew = true;
          continue;
        }
        const startNode = cur[0]!, startDir = dirAt(cur, false);
        best = null; bestDot = 0.82; rev = false;
        for (const cand of pool) {
          if (used.has(cand.w.id) || (cand.t.name ?? '') !== (seed.t.name ?? '')) continue;
          if (cand.w.nodes[cand.w.nodes.length - 1] === startNode) {
            const d = dirAt(cand.w.nodes, true), dot = startDir[0] * d[0] + startDir[1] * d[1];
            if (dot > bestDot) { bestDot = dot; best = cand; rev = false; }
          } else if (cand.w.nodes[0] === startNode) {
            const d = dirAt(cand.w.nodes, false), dot = -startDir[0] * d[0] - startDir[1] * d[1];
            if (dot > bestDot) { bestDot = dot; best = cand; rev = true; }
          }
        }
        if (best) {
          used.add(best.w.id);
          const prevNodes = rev ? [...best.w.nodes].reverse() : best.w.nodes;
          cur = [...prevNodes.slice(0, -1), ...cur];
          grew = true;
        }
      }
      const fullPath = cur.map(id => xy.get(id)).filter((p): p is Vec2 => !!p);
      const clipped = clipPathTo(fullPath, inside);
      const bestPiece =
        clipped.length > 0
          ? clipped.reduce((a, b) => (polylineLength(b) > polylineLength(a) ? b : a))
          : fullPath;
      if (bestPiece.length >= 2) {
        stitched.push({ id: `rl${seed.w.id}`, name: seed.t.name, path: bestPiece, source: src('way', seed.w.id) });
      }
    }
    // Ensure paired parallel tracks on the same metro line run in opposite directions (outbound vs inbound)
    const seenLineDir = new Map<string, Vec2>();
    for (const st of stitched) {
      const key = st.name ?? st.id;
      const p0 = st.path[0]!, p1 = st.path[st.path.length - 1]!;
      const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
      const prev = seenLineDir.get(key);
      if (prev && prev[0] * vx + prev[1] * vy > 0) {
        st.path.reverse();
      } else if (!prev) {
        seenLineDir.set(key, [vx, vy]);
      }
      rails.push({
        id: st.id, name: st.name, kind: 'metro', path: st.path, elevated: true, height: railHeight('metro', true), source: st.source,
      });
    }
  } else {
    for (const m of rawMetroWays) {
      const pieces = clipPathTo(m.pts, inside);
      pieces.forEach((piece, k) => rails.push({
        id: pieces.length > 1 ? `rl${m.w.id}-${k}` : `rl${m.w.id}`, name: m.t.name, kind: 'metro', path: piece, elevated: m.elevated, height: railHeight('metro', m.elevated), source: src('way', m.w.id),
      }));
    }
  }
  const platformRings = [...ways.values()].filter(w => tags(w).railway === 'platform' && w.nodes[0] === w.nodes[w.nodes.length - 1]).map(w => normalizeRing(path(w)));
  const stations: Station[] = [];
  for (const n of nodes.values()) {
    const t = n.tags ?? {};
    if (t.railway !== 'station' && t.public_transport !== 'station') continue;
    const at = xy.get(n.id)!, kind = t.station === 'subway' || t.station === 'light_rail' ? 'metro' : t.station === 'tram' ? 'tram' : 'rail';
    if (!inside(at) && !rails.some(r => r.kind === kind && r.path.some(p => dist(p, at) < 80))) continue;
    if (t.name && stations.some(s => s.kind === kind && s.name === t.name && dist(s.at, at) < 120)) continue;
    const meta = cfg.stationMeta?.(t.name ?? '', at);
    const district = cfg.districtOf?.(at);
    stations.push({
      id: `st${n.id}`, name: t.name, kind, at,
      platforms: platformRings.filter(r => dist(centroid(r), at) < 120),
      ...(meta?.lineTag ? { lineTag: meta.lineTag } : {}),
      ...(meta?.lineName ? { lineName: meta.lineName } : {}),
      ...(meta?.address ? { address: meta.address } : {}),
      ...(district ? { district } : {}),
      source: src('node', n.id),
    });
  }

  // ---------- 7. hand corrections ----------
  const base: City = {
    id: cfg.area, name: cfg.name,
    ...(cfg.cityName ? { cityName: cfg.cityName } : {}),
    bounds: R, region,
    streets: streets.sort(byId), junctions: junctions.sort(byId), buildings: buildings.sort(byId), areas: areas.sort(byId), features: features.sort(byId),
    rails: rails.sort(byId), stations: stations.sort(byId),
    ...(cfg.places ? { places: cfg.places } : {}),
    ...(cfg.landmarksCatalog ? { landmarksCatalog: cfg.landmarksCatalog } : {}),
    attribution: [attribution],
  };
  const effectiveOverrides: Overrides = options?.isChunk
    ? { buildings: cfg.overrides.buildings, streets: cfg.overrides.streets }
    : cfg.overrides;
  const { city, unused } = applyOverrides(base, effectiveOverrides);
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

/** outer and inner rings of a multipolygon, joining member ways end to end */
function rings(r: OsmRelation, ways: Map<number, OsmWay>, path: (w: OsmWay) => Vec2[]): { outer: Vec2[][]; innerRings: Vec2[][]; inner: number } {
  const toRing = (ids: number[]) => path({ type: 'way', id: 0, nodes: ids });
  const stitch = (segs: number[][]): Vec2[][] => {
    const out: Vec2[][] = [];
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
    return out;
  };
  const outerSegs = r.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '')).map(m => ways.get(m.ref)).filter((w): w is OsmWay => !!w).map(w => [...w.nodes]);
  const innerSegs = r.members.filter(m => m.type === 'way' && m.role === 'inner').map(m => ways.get(m.ref)).filter((w): w is OsmWay => !!w).map(w => [...w.nodes]);
  const inner = innerSegs.length;
  return { outer: stitch(outerSegs), innerRings: stitch(innerSegs), inner };
}
