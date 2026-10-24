/* Streets and areas from the city model (M3, M5 · ADR-037), drawn from the road network (core
   roadNetwork: pieces joined into roads, corners smoothed, junctions with their arms):
     - carriageways: one flat strip per road, no seams where OSM split it;
     - junctions: between every two neighbouring arms, the corner is filled with asphalt out to a
       kerb fillet (radius 4 m, 2 m with an alley or service road), and when both arms have a
       sidewalk on that side the sidewalk follows the fillet round the corner;
     - sidewalks: raised 15 cm kerbed strips on the sides the model gives, stopping exactly where
       the corner fillets begin, so junction mouths and alley mouths stay open;
     - lane markings: dashes between lanes (and down the middle of two-way roads), not inside
       junctions;
     - bridges (layer ≥ 1 with a height profile): a deck following the profile, low parapets,
       solid ramp walls near the ground and piers under the deck;
     - forecourts: the ground between a building's front and the street paved like the sidewalk;
     - areas: flat fills (grass, water, pitches, plazas) with their outlines.
   Pure. */
import * as THREE from 'three';
import { closestOnPath, dist, frontStreet, polylineLength, roadNetwork, type Area, type Arm, type City, type NetNode, type Road, type Vec2 } from '@my-city/core';
import { V, type Batch, type Surface } from './batch';
import { drawMonumentFeature } from './landmarks';

const ROAD_Z = 0.1, WALK_Z = 0.25, MARK_Z = 0.12;

/** the ground under every rectangle of the region (with a 20 m margin) */
export function buildGround(B: Batch, city: City) {
  const m = 20;
  for (const { x0, y0, x1, y1 } of city.region) B.flat('ground', [[x0 - m, y0 - m], [x1 + m, y0 - m], [x1 + m, y1 + m], [x0 - m, y1 + m]], 0);
}

export type StreetRenderMode = 'all' | 'major' | 'local';

const isMinorRoad = (r: Road) =>
  r.kind === 'alley' ||
  r.kind === 'service' ||
  (r.kind === 'residential' && (!r.name || polylineLength(r.path) < 120));

const isArterialRoad = (kind: Road['kind']) =>
  kind === 'primary' || kind === 'secondary' || kind === 'tertiary';

export const LOCAL_STREET_TILE = 256;

export interface LocalStreetCuts {
  left: [number, number][];
  right: [number, number][];
  marks: [number, number][];
}

export interface LocalStreetSharedContext {
  roads: Map<string, Road>;
  cuts: Map<string, LocalStreetCuts>;
  metroStations: City['stations'];
  forecourtGrid: Map<string, City['streets']>;
}

export interface LocalStreetTile {
  id: string;
  center: [number, number];
  radius: number;
  nodes: NetNode[];
  roads: Road[];
  footways: City['streets'];
  buildings: City['buildings'];
  ctx: LocalStreetSharedContext;
}

const FORECOURT_GRID = 48;

function buildForecourtStreetGrid(city: City): Map<string, City['streets']> {
  const streets = city.streets.filter(s => s.layer === 0 && s.kind !== 'footway' && s.kind !== 'steps');
  const grid = new Map<string, City['streets']>();
  for (const s of streets) {
    const pad = s.width / 2 + 16;
    const seen = new Set<string>();
    for (let k = 1; k < s.path.length; k++) {
      const a = s.path[k - 1]!, b = s.path[k]!;
      const x0 = Math.min(a[0], b[0]) - pad, x1 = Math.max(a[0], b[0]) + pad;
      const y0 = Math.min(a[1], b[1]) - pad, y1 = Math.max(a[1], b[1]) + pad;
      for (let i = Math.floor(x0 / FORECOURT_GRID); i <= Math.floor(x1 / FORECOURT_GRID); i++) {
        for (let j = Math.floor(y0 / FORECOURT_GRID); j <= Math.floor(y1 / FORECOURT_GRID); j++) {
          const key = `${i},${j}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const l = grid.get(key);
          if (l) l.push(s); else grid.set(key, [s]);
        }
      }
    }
  }
  return grid;
}

function computeRoadCuts(net: ReturnType<typeof roadNetwork>, roads: Map<string, Road>, B: Batch | null, mode: StreetRenderMode): Map<string, LocalStreetCuts> {
  const cuts = new Map<string, LocalStreetCuts>();
  const cutOf = (id: string) => { let c = cuts.get(id); if (!c) cuts.set(id, (c = { left: [], right: [], marks: [] })); return c; };
  for (const node of net.nodes) {
    if (node.arms.some(a => roads.get(a.road)!.layer > 0 && zAt(roads.get(a.road)!, a.at) > 0.5)) continue;
    const corners = junction(B, node, roads, mode);
    for (const [k, arm] of node.arms.entries()) {
      const c = cutOf(arm.road), span = (t: number): [number, number] => (arm.dir > 0 ? [arm.at - 0.01, arm.at + t] : [arm.at - t, arm.at + 0.01]);
      // the arm's right side faces the corner after it, its left the corner before it
      const after = corners[k], before = corners[(k - 1 + node.arms.length) % node.arms.length];
      // a sidewalk on the arm's right is the path's right when the arm runs along the path
      if (after) (arm.dir > 0 ? c.right : c.left).push(span(after.tA));
      if (before) (arm.dir > 0 ? c.left : c.right).push(span(before.tB));
      const others = Math.max(0, ...node.arms.filter(a => a !== arm).map(a => a.half));
      c.marks.push(span(others + 2));
    }
  }
  return cuts;
}

function drawRoadGeometry(B: Batch, r: Road, c: LocalStreetCuts, mode: StreetRenderMode) {
  const minor = isMinorRoad(r);
  const drawCarriageway = mode === 'all' || (mode === 'major' ? !minor : minor);
  const drawLocalDetails = mode === 'all' || mode === 'local';
  if (r.layer > 0 && r.profile.length) {
    if (drawCarriageway) bridge(B, r);
    return;
  }
  if (drawCarriageway) {
    B.flat('road', strip(r.path, -r.width / 2, r.width / 2), ROAD_Z);
    if (mode === 'major' && isArterialRoad(r.kind)) {
      const a = r.width / 2;
      for (const [side, cut] of [[1, c.right], [-1, c.left]] as const) {
        for (const run of pieces(r.path, cut)) {
          const edge = offsetLine(run, side * a);
          for (let i = 1; i < edge.length; i++) {
            const p0 = edge[i - 1]!, p1 = edge[i]!;
            B.line(V(p0[0], p0[1], ROAD_Z + 0.01), V(p1[0], p1[1], ROAD_Z + 0.01), 'crease');
          }
        }
      }
    }
  }
  if (!drawLocalDetails) return;
  for (const [side, w, cut] of [[1, r.sidewalk.right, c.right], [-1, r.sidewalk.left, c.left]] as const) {
    if (w <= 0) continue;
    const a = r.width / 2;
    for (const run of pieces(r.path, cut)) {
      walkRibbon(B, offsetLine(run, side * a), offsetLine(run, side * (a + w)));
    }
  }
  const offs: number[] = [];
  const n = r.oneway ? r.lanes : 2 * Math.max(1, Math.floor(r.lanes / 2));
  for (let k = 1; k < n; k++) offs.push(-r.width / 2 + (k * r.width) / n);
  for (const o of offs) for (const run of pieces(r.path, c.marks)) dashes(B, offsetLine(run, o));
}

function drawFootwayGeometry(B: Batch, s: City['streets'][number], metroStations: City['stations']) {
  // Metro station overpass walkways & entrance stairs are rendered in full architectural detail by buildMetro
  if ((s.layer > 0 || s.kind === 'steps') && s.path.some(p => metroStations.some(st => dist(p, st.at) < 90))) return;
  if (s.layer > 0 && s.profile.length) bridge(B, s);
  else B.flat('walk', strip(s.path, -s.width / 2, s.width / 2), ROAD_Z * 0.5);
}

function drawBuildingForecourt(B: Batch, b: City['buildings'][number], grid: Map<string, City['streets']>) {
  const R = b.footprint, p = R[b.front]!, q = R[(b.front + 1) % R.length]!, mid: Vec2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const near = grid.get(`${Math.floor(mid[0] / FORECOURT_GRID)},${Math.floor(mid[1] / FORECOURT_GRID)}`);
  if (!near) return;
  const f = frontStreet(R, b.front, near);
  if (!f || f.gap < 0.3 || f.gap > 15) return;
  const S = f.street;
  // which side of the street the building is on: right is (−dy, dx) along the path
  const i = nearestSeg(S.path, mid), a = S.path[i - 1]!, bb = S.path[i]!;
  const right = (-(bb[1] - a[1])) * (mid[0] - a[0]) + (bb[0] - a[0]) * (mid[1] - a[1]) > 0;
  const walk = right ? S.sidewalk.right : S.sidewalk.left, edge = offsetLine(S.path, (right ? 1 : -1) * (S.width / 2 + walk));
  const p2 = closestOnPath(p, edge).at, q2 = closestOnPath(q, edge).at;
  if (dist(p, p2) > 16 || dist(q, q2) > 16) return;
  B.flat('walk', [p, q, q2, p2], walk > 0 ? WALK_Z : ROAD_Z * 0.6);
}

export function buildStreets(B: Batch, city: City, mode: StreetRenderMode = 'all') {
  const net = roadNetwork(city), roads = new Map(net.roads.map(r => [r.id, r]));
  const cuts = computeRoadCuts(net, roads, B, mode);
  const emptyCut: LocalStreetCuts = { left: [], right: [], marks: [] };
  for (const r of net.roads) {
    drawRoadGeometry(B, r, cuts.get(r.id) ?? emptyCut, mode);
  }
  if (mode === 'major') return;
  const metroStations = city.stations.filter(st => st.kind === 'metro');
  for (const s of city.streets) if (s.kind === 'footway' || s.kind === 'steps') {
    drawFootwayGeometry(B, s, metroStations);
  }
}

/** Partition local streets (minor alleys, sidewalks, lane markings, footways, and building forecourts)
    into 256 m spatial tiles so they are built and rendered on-demand only inside the camera viewport. */
export function localStreetTilesOf(city: City, size = LOCAL_STREET_TILE): LocalStreetTile[] {
  const net = roadNetwork(city), roads = new Map(net.roads.map(r => [r.id, r]));
  const cuts = computeRoadCuts(net, roads, null, 'local');
  const metroStations = city.stations.filter(st => st.kind === 'metro');
  const forecourtGrid = buildForecourtStreetGrid(city);
  const ctx: LocalStreetSharedContext = { roads, cuts, metroStations, forecourtGrid };

  const buckets = new Map<string, {
    nodes: NetNode[];
    roads: Road[];
    footways: City['streets'];
    buildings: City['buildings'];
  }>();
  const bucketOf = (x: number, y: number) => {
    const k = `${Math.floor(x / size)},${Math.floor(y / size)}`;
    let b = buckets.get(k);
    if (!b) {
      b = { nodes: [], roads: [], footways: [], buildings: [] };
      buckets.set(k, b);
    }
    return b;
  };

  for (const node of net.nodes) {
    if (node.arms.some(a => roads.get(a.road)!.layer > 0 && zAt(roads.get(a.road)!, a.at) > 0.5)) continue;
    bucketOf(node.at[0], node.at[1]).nodes.push(node);
  }
  for (const r of net.roads) {
    const mid = r.path[Math.floor(r.path.length / 2)]!;
    bucketOf(mid[0], mid[1]).roads.push(r);
  }
  for (const s of city.streets) {
    if (s.kind !== 'footway' && s.kind !== 'steps') continue;
    const mid = s.path[Math.floor(s.path.length / 2)]!;
    bucketOf(mid[0], mid[1]).footways.push(s);
  }
  for (const b of city.buildings) {
    const R = b.footprint, p = R[b.front]!, q = R[(b.front + 1) % R.length]!;
    bucketOf((p[0] + q[0]) / 2, (p[1] + q[1]) / 2).buildings.push(b);
  }

  const out: LocalStreetTile[] = [];
  for (const [k, b] of buckets) {
    const [i, j] = k.split(',').map(Number) as [number, number];
    const center: [number, number] = [(i + 0.5) * size, (j + 0.5) * size];
    let maxR = size * Math.SQRT1_2;
    const checkPt = (pt: Vec2) => {
      const d = Math.hypot(pt[0] - center[0], pt[1] - center[1]) + 16;
      if (d > maxR) maxR = d;
    };
    for (const n of b.nodes) checkPt(n.at);
    for (const r of b.roads) for (const pt of r.path) checkPt(pt);
    for (const s of b.footways) for (const pt of s.path) checkPt(pt);
    for (const bldg of b.buildings) checkPt(bldg.footprint[bldg.front]!);
    out.push({ id: k, center, radius: maxR, nodes: b.nodes, roads: b.roads, footways: b.footways, buildings: b.buildings, ctx });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function buildLocalStreetTileBatch(B: Batch, tile: LocalStreetTile) {
  const emptyCut: LocalStreetCuts = { left: [], right: [], marks: [] };
  for (const node of tile.nodes) {
    junction(B, node, tile.ctx.roads, 'local');
  }
  for (const r of tile.roads) {
    drawRoadGeometry(B, r, tile.ctx.cuts.get(r.id) ?? emptyCut, 'local');
  }
  for (const s of tile.footways) {
    drawFootwayGeometry(B, s, tile.ctx.metroStations);
  }
  for (const b of tile.buildings) {
    drawBuildingForecourt(B, b, tile.ctx.forecourtGrid);
  }
}

/** Draw a continuous raised sidewalk ribbon with a vertical kerb face and a single longitudinal kerb line,
    without transverse end-cap creases or brick-like subdivisions. */
function walkRibbon(B: Batch, kerbEdge: readonly Vec2[], backEdge: readonly Vec2[]) {
  if (kerbEdge.length < 2 || backEdge.length < 2) return;
  B.flat('walk', [...kerbEdge, ...[...backEdge].reverse()], WALK_Z);
  for (let i = 1; i < kerbEdge.length; i++) {
    const a = kerbEdge[i - 1]!, b = kerbEdge[i]!;
    const L = dist(a, b);
    if (L < 1e-4) continue;
    const n = new THREE.Vector3(-(b[1] - a[1]) / L, 0, (b[0] - a[0]) / L);
    B.quad('walk', [V(a[0], a[1], ROAD_Z), V(b[0], b[1], ROAD_Z), V(b[0], b[1], WALK_Z), V(a[0], a[1], WALK_Z)], n);
    B.line(V(a[0], a[1], WALK_Z), V(b[0], b[1], WALK_Z), 'crease');
  }
}

/** The forecourt of every building facing a street within 15 m: paved from its front edge out to
    the street's sidewalk (raised like it) or, where the street has none (alleys), to the street's
    edge (flat). In Hà Nội the shop fronts open straight onto the sidewalk. */
export function buildForecourts(B: Batch, city: City) {
  const grid = buildForecourtStreetGrid(city);
  for (const b of city.buildings) {
    drawBuildingForecourt(B, b, grid);
  }
}

const nearestSeg = (path: readonly Vec2[], p: Vec2) => {
  let best = 1, bd = Infinity;
  for (let i = 1; i < path.length; i++) { const d = closestOnPath(p, [path[i - 1]!, path[i]!]).d; if (d < bd) { bd = d; best = i; } }
  return best;
};

export function buildAreas(B: Batch, city: City, includeMonuments = true) {
  const SURF: Partial<Record<Area['kind'], [Surface, number]>> = {
    park: ['grass', 0.02], grass: ['grass', 0.03], plaza: ['plaza', 0.03], 'traffic-island': ['plaza', 0.12], pitch: ['pitch', 0.04], water: ['water', 0.04], pool: ['water', 0.05],
  };
  for (const a of city.areas) {
    const k = SURF[a.kind];
    if (k) B.flat(k[0], a.polygon, k[1], 'detail', a.name || a.subtype ? a.id : undefined);
  }
  if (includeMonuments) {
    buildMonumentFeatures(B, city);
  }
}

export function buildMonumentFeatures(B: Batch, city: City) {
  for (const f of city.features) {
    if (f.kind !== 'monument' && f.kind !== 'heritage') continue;
    drawMonumentFeature(B, f);
  }
}

// ---------- junctions ----------

interface Corner { tA: number; tB: number }

/** Fill the corners of a junction; returns, per pair of neighbouring arms (k, k+1), how far from
    the node the fillet begins on each (or null where there is no corner: arms almost in line). */
function junction(B: Batch | null, node: NetNode, roads: Map<string, Road>, mode: StreetRenderMode = 'all'): (Corner | null)[] {
  const n = node.arms.length, out: (Corner | null)[] = [];
  const minor = (a: Arm) => isMinorRoad(roads.get(a.road)!);
  for (let k = 0; k < n; k++) {
    const A = node.arms[k]!, Bm = node.arms[(k + 1) % n]!;
    let th = Math.atan2(Bm.u[1], Bm.u[0]) - Math.atan2(A.u[1], A.u[0]);
    if (th <= 0) th += 2 * Math.PI;
    if (n === 1 || th > Math.PI - 0.15 || th < 0.15) { out.push(null); continue; }
    // the sector lies on A's right and B's left (y points south: right of u is (−u_y, u_x))
    const rA: Vec2 = [-A.u[1], A.u[0]], lB: Vec2 = [Bm.u[1], -Bm.u[0]];
    const pA: Vec2 = [node.at[0] + rA[0] * A.half, node.at[1] + rA[1] * A.half], pB: Vec2 = [node.at[0] + lB[0] * Bm.half, node.at[1] + lB[1] * Bm.half];
    // where the two kerb lines meet: pA + tA·uA = pB + tB·uB
    const det = A.u[0] * -Bm.u[1] - A.u[1] * -Bm.u[0];
    if (Math.abs(det) < 1e-6) { out.push(null); continue; }
    const dx = pB[0] - pA[0], dy = pB[1] - pA[1];
    const tCa = (dx * -Bm.u[1] - dy * -Bm.u[0]) / det, tCb = (A.u[0] * dy - A.u[1] * dx) / det;
    const isMinorCorner = minor(A) || minor(Bm);
    const R = isMinorCorner ? 2 : 4, tl = R / Math.tan(th / 2);
    const tA = tCa + tl, tB = tCb + tl;
    if (tCa < -1 || tCb < -1 || tA > 30 || tB > 30) { out.push(null); continue; }
    if (B) {
      const TA: Vec2 = [pA[0] + A.u[0] * tA, pA[1] + A.u[1] * tA], TB: Vec2 = [pB[0] + Bm.u[0] * tB, pB[1] + Bm.u[1] * tB];
      const C: Vec2 = [TA[0] + rA[0] * R, TA[1] + rA[1] * R];
      const arc = (r: number, steps = 8): Vec2[] => {
        const a0 = Math.atan2(TA[1] - C[1], TA[0] - C[0]), a1 = Math.atan2(TB[1] - C[1], TB[0] - C[0]);
        let d = a1 - a0;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return Array.from({ length: steps + 1 }, (_, i) => [C[0] + r * Math.cos(a0 + (d * i) / steps), C[1] + r * Math.sin(a0 + (d * i) / steps)] as const);
      };
      const drawCornerRoad = mode === 'all' || (mode === 'major' ? !isMinorCorner : isMinorCorner);
      const drawCornerWalk = mode === 'all' || mode === 'local';
      if (drawCornerRoad) {
        // asphalt out to the kerb fillet
        B.flat('road', [node.at, pA, TA, ...arc(R).slice(1, -1), TB, pB], ROAD_Z);
      }
      if (drawCornerWalk) {
        // the sidewalk round the corner, when both arms have one on this side
        const w = Math.min(A.walkR, Bm.walkL);
        if (w > 0 && R > 0.5) {
          walkRibbon(B, arc(R), arc(Math.max(0.3, R - w)));
        }
      }
    }
    out.push({ tA, tB });
  }
  return out;
}

// ---------- geometry along a centre line ----------

/** right-hand unit normal of a direction (x east, y south: (−dy, dx)) */
const rightOf = (a: Vec2, b: Vec2): Vec2 => { const L = dist(a, b) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };

/** the line `d` metres to the right of a path (negative = left), with mitred corners */
export function offsetLine(path: readonly Vec2[], d: number): Vec2[] {
  return path.map((p, i) => {
    const n0 = i > 0 ? rightOf(path[i - 1]!, p) : rightOf(p, path[i + 1]!);
    const n1 = i < path.length - 1 ? rightOf(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(3, 1 / Math.max(0.33, mx * n0[0] + my * n0[1]));
    return [p[0] + mx * d * k, p[1] + my * d * k];
  });
}

/** the ring between offsets d0 and d1 of a path */
export function strip(path: readonly Vec2[], d0: number, d1: number): Vec2[] {
  return [...offsetLine(path, d0), ...offsetLine(path, d1).reverse()];
}

/** the parts of a path left after cutting out the given [from, to] spans (distances along it) */
function pieces(path: readonly Vec2[], cut: readonly [number, number][]): Vec2[][] {
  const L = polylineLength(path), spans = [...cut].sort((a, b) => a[0] - b[0]);
  const keep: [number, number][] = [];
  let s = 0;
  for (const [a, b] of spans) { if (a > s) keep.push([s, Math.min(a, L)]); s = Math.max(s, b); }
  if (s < L) keep.push([s, L]);
  return keep.filter(([a, b]) => b - a > 0.3).map(([a, b]) => cutPath(path, a, b)).filter(p => p.length > 1);
}

/** 3 m dashes every 6 m, 15 cm wide (single O(N) pass along the path) */
function dashes(B: Batch, path: readonly Vec2[]) {
  if (path.length < 2) return;
  const segLen: number[] = [];
  let L = 0;
  for (let i = 1; i < path.length; i++) {
    const d = dist(path[i - 1]!, path[i]!);
    segLen.push(d);
    L += d;
  }
  let idx = 0, acc = 0;
  for (let s0 = 1.5; s0 + 3 <= L - 1.5; s0 += 6) {
    const s1 = s0 + 3;
    while (idx < segLen.length - 1 && acc + segLen[idx]! < s0) {
      acc += segLen[idx]!;
      idx++;
    }
    const piece: Vec2[] = [];
    let j = idx, curAcc = acc;
    while (j < segLen.length && curAcc <= s1) {
      const a = path[j]!, b = path[j + 1]!, d = segLen[j]!;
      if (curAcc + d >= s0) {
        const at = (s: number): Vec2 => [
          a[0] + ((b[0] - a[0]) * (s - curAcc)) / (d || 1),
          a[1] + ((b[1] - a[1]) * (s - curAcc)) / (d || 1),
        ];
        if (!piece.length) piece.push(at(Math.max(s0, curAcc)));
        const pt = at(Math.min(s1, curAcc + d));
        if (dist(pt, piece[piece.length - 1]!) > 1e-6) piece.push(pt);
      }
      curAcc += d;
      j++;
    }
    if (piece.length > 1) B.flat('marking', strip(piece, -0.075, 0.075), MARK_Z);
  }
}

/** the part of a path between distances s0 and s1 */
export function cutPath(path: readonly Vec2[], s0: number, s1: number): Vec2[] {
  const out: Vec2[] = [];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b), at = (s: number): Vec2 => [a[0] + ((b[0] - a[0]) * (s - acc)) / (L || 1), a[1] + ((b[1] - a[1]) * (s - acc)) / (L || 1)];
    if (acc + L >= s0 && acc <= s1) {
      if (!out.length) out.push(at(Math.max(s0, acc)));
      out.push(at(Math.min(s1, acc + L)));
    }
    acc += L;
  }
  return out.filter((p, i) => i === 0 || dist(p, out[i - 1]!) > 1e-6);
}

/** points every `step` m along a path */
function resample(path: readonly Vec2[], step: number): { p: Vec2; s: number }[] {
  const out: { p: Vec2; s: number }[] = [{ p: path[0]!, s: 0 }];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    for (let t = step - ((acc % step) || 0); t < L; t += step) out.push({ p: [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L], s: acc + t });
    acc += L;
    out.push({ p: b, s: acc });
  }
  return out.filter((q, i) => i === 0 || q.s - out[i - 1]!.s > 1e-6);
}

/** road height at distance s */
export function zAt(r: Pick<Road, 'profile'>, s: number): number {
  const p = r.profile;
  if (!p.length) return 0;
  if (s <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) { const [a, za] = p[i - 1]!, [b, zb] = p[i]!; if (s <= b) return b === a ? zb : za + ((zb - za) * (s - a)) / (b - a); }
  return p[p.length - 1]![1];
}

// ---------- bridges ----------

/** A deck along the profile: road surface, 0.4 m parapets 0.9 m high, the underside 1 m below
    the deck (walled down to the ground near the ends), piers every 25 m where it is high. */
function bridge(B: Batch, s: Pick<Road, 'path' | 'profile' | 'width'>) {
  const S = resample(s.path, 2), W = s.width / 2 + 0.4, P = 0.4, H = 0.9;
  const z = S.map(q => zAt(s, q.s)), zb = z.map(h => (h > 3 ? h - 1 : 0));
  const pts = S.map(q => q.p), L = (d: number) => offsetLine(pts, d);
  const oR = L(W), iR = L(W - P), oL = L(-W), iL = L(-W + P);
  const all: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
  const face = (surf: Surface, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3) => { B.quad(surf, [a, b, c, d], n); B.quad(surf, [a, b, c, d], n, all); };
  for (let i = 0; i + 1 < S.length; i++) {
    const j = i + 1, r = rightOf(pts[i]!, pts[j]!), nR = new THREE.Vector3(r[0], 0, r[1]), nL = nR.clone().negate();
    const v = (l: Vec2[], k: number, h: number) => V(l[k]![0], l[k]![1], h);
    face('road', v(iL, i, z[i]!), v(iR, i, z[i]!), v(iR, j, z[j]!), v(iL, j, z[j]!), up);
    for (const [o, inn, n, nIn] of [[oR, iR, nR, nL], [oL, iL, nL, nR]] as const) {
      face('roof', v(o, i, z[i]! + H), v(inn, i, z[i]! + H), v(inn, j, z[j]! + H), v(o, j, z[j]! + H), up);
      face('wall', v(o, i, zb[i]!), v(o, j, zb[j]!), v(o, j, z[j]! + H), v(o, i, z[i]! + H), n);
      face('wall', v(inn, i, z[i]!), v(inn, j, z[j]!), v(inn, j, z[j]! + H), v(inn, i, z[i]! + H), nIn);
    }
    face('wall', v(oL, i, zb[i]!), v(oR, i, zb[i]!), v(oR, j, zb[j]!), v(oL, j, zb[j]!), down);
  }
  B.edgesOf(all, 25);
  // piers: 1.2 m along the deck, 60 % of its width across, every 25 m where the underside is high
  let last = -Infinity;
  for (let k = 0; k < S.length; k++) {
    if (zb[k]! < 2 || S[k]!.s - last < 25) continue;
    last = S[k]!.s;
    const q = pts[k]!, a = k + 1 < pts.length ? pts[k + 1]! : pts[k - 1]!, r = rightOf(q, a), u: Vec2 = [-r[1], r[0]];
    const hw = W * 0.6, hl = 0.6;
    const ring: Vec2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [q[0] + u[0] * x! * hl + r[0] * y! * hw, q[1] + u[1] * x! * hl + r[1] * y! * hw]);
    B.solid(ring, 0, zb[k]!);
  }
}
