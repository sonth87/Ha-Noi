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
import { closestOnPath, dist, frontStreet, pointInRing, polylineLength, roadNetwork, type Area, type Arm, type City, type NetNode, type Road, type Vec2 } from '@my-city/core';
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

export interface RoadTaper {
  totalL: number;
  h0: number;
  hStart: number;
  tStart: number;
  hEnd: number;
  tEnd: number;
  walkL0: number;
  walkR0: number;
  walkLStart: number;
  walkRStart: number;
  walkLEnd: number;
  walkREnd: number;
}

export interface LocalStreetSharedContext {
  roads: Map<string, Road>;
  tapers: Map<string, RoadTaper>;
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

function halfAt(taper: RoadTaper, s: number): number {
  const L = taper.totalL;
  if (L <= 1e-4) return taper.h0;
  const startTapered = taper.hStart < taper.h0 - 0.02;
  const endTapered = taper.hEnd < taper.h0 - 0.02;
  if (startTapered && endTapered && (L < 75 || taper.tStart + taper.tEnd >= L * 0.95)) {
    const u = Math.max(0, Math.min(1, s / L));
    const sm = u * u * (3 - 2 * u);
    return taper.hStart + (taper.hEnd - taper.hStart) * sm;
  }
  let h = taper.h0;
  if (startTapered && taper.tStart > 1e-3 && s < taper.tStart) {
    const u = Math.max(0, Math.min(1, s / taper.tStart));
    const sm = u * u * (3 - 2 * u);
    h = Math.min(h, taper.hStart + (taper.h0 - taper.hStart) * sm);
  }
  if (endTapered && taper.tEnd > 1e-3 && s > L - taper.tEnd) {
    const u = Math.max(0, Math.min(1, (L - s) / taper.tEnd));
    const sm = u * u * (3 - 2 * u);
    h = Math.min(h, taper.hEnd + (taper.h0 - taper.hEnd) * sm);
  }
  return h;
}

function walkAt(taper: RoadTaper, side: 1 | -1, s: number): number {
  const L = taper.totalL;
  const w0 = side === 1 ? taper.walkR0 : taper.walkL0;
  const wStart = side === 1 ? taper.walkRStart : taper.walkLStart;
  const wEnd = side === 1 ? taper.walkREnd : taper.walkLEnd;
  if (L <= 1e-4) return w0;
  const startTapered = taper.hStart < taper.h0 - 0.02;
  const endTapered = taper.hEnd < taper.h0 - 0.02;
  if (startTapered && endTapered && (L < 75 || taper.tStart + taper.tEnd >= L * 0.95)) {
    const u = Math.max(0, Math.min(1, s / L));
    const sm = u * u * (3 - 2 * u);
    return wStart + (wEnd - wStart) * sm;
  }
  let w = w0;
  if (startTapered && taper.tStart > 1e-3 && s < taper.tStart) {
    const u = Math.max(0, Math.min(1, s / taper.tStart));
    const sm = u * u * (3 - 2 * u);
    w = wStart + (w0 - wStart) * sm;
  }
  if (endTapered && taper.tEnd > 1e-3 && s > L - taper.tEnd) {
    const u = Math.max(0, Math.min(1, (L - s) / taper.tEnd));
    const sm = u * u * (3 - 2 * u);
    w = wEnd + (w0 - wEnd) * sm;
  }
  return w;
}

function densifyTaperedPath(path: readonly Vec2[], taper: RoadTaper): Vec2[] {
  const startTapered = taper.hStart < taper.h0 - 0.02;
  const endTapered = taper.hEnd < taper.h0 - 0.02;
  if (!startTapered && !endTapered) return path as Vec2[];
  const fullTaper = startTapered && endTapered && (taper.totalL < 75 || taper.tStart + taper.tEnd >= taper.totalL * 0.95);
  const out: Vec2[] = [path[0]!];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, segL = dist(a, b);
    const s0 = acc, s1 = acc + segL;
    const inStart = startTapered && s0 < taper.tStart + 2;
    const inEnd = endTapered && s1 > taper.totalL - taper.tEnd - 2;
    if ((fullTaper || inStart || inEnd) && segL > 1.8) {
      const steps = Math.ceil(segL / 1.8);
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
    } else {
      out.push(b);
    }
    acc = s1;
  }
  return out;
}

type RenderNetwork = {
  roads: Map<string, Road>;
  roadList: Road[];
  nodes: NetNode[];
  tapers: Map<string, RoadTaper>;
};

/** The network is the same for the major layer and the local tiles, and costs about a second on a
    laptop: keep the last one per city (streets stream in, so the street count is part of the key). */
const renderNetworkCache = new WeakMap<City, { streets: number; net: RenderNetwork }>();

function prepareRenderNetwork(city: City): RenderNetwork {
  const hit = renderNetworkCache.get(city);
  if (hit && hit.streets === city.streets.length) return hit.net;
  const net = computeRenderNetwork(city);
  renderNetworkCache.set(city, { streets: city.streets.length, net });
  return net;
}

function computeRenderNetwork(city: City): RenderNetwork {
  const net = roadNetwork(city);
  const roadList: Road[] = net.roads.map(r => ({ ...r, path: [...r.path] }));
  const roads = new Map(roadList.map(r => [r.id, r]));
  const nodes: NetNode[] = net.nodes.map(n => ({
    ...n,
    arms: n.arms.map(a => ({ ...a })),
  }));

  // Augment nodes with 2-arm connection points where roads of different widths/kinds meet end-to-end
  const existingGrid = new Map<string, Vec2[]>();
  for (const n of nodes) {
    const k = `${Math.floor(n.at[0])},${Math.floor(n.at[1])}`;
    const l = existingGrid.get(k);
    if (l) l.push(n.at); else existingGrid.set(k, [n.at]);
  }
  const hasExistingNode = (p: Vec2) => {
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const l = existingGrid.get(`${gx + dx},${gy + dy}`);
        if (l && l.some(q => dist(p, q) < 0.25)) return true;
      }
    }
    return false;
  };

  const endBuckets = new Map<string, { pt: Vec2; arms: Arm[] }>();
  for (const r of roadList) {
    if (r.layer > 0 && r.profile.length) continue;
    const L = polylineLength(r.path);
    if (r.path.length < 2 || L < 0.2) continue;
    const endpoints: { pt: Vec2; adj: Vec2; at: number; dir: 1 | -1 }[] = [
      { pt: r.path[0]!, adj: r.path[1]!, at: 0, dir: 1 },
      { pt: r.path[r.path.length - 1]!, adj: r.path[r.path.length - 2]!, at: L, dir: -1 },
    ];
    for (const ep of endpoints) {
      if (hasExistingNode(ep.pt)) continue;
      const key = `${r.layer}:${Math.round(ep.pt[0] * 5)},${Math.round(ep.pt[1] * 5)}`;
      let b = endBuckets.get(key);
      if (!b) {
        b = { pt: ep.pt, arms: [] };
        endBuckets.set(key, b);
      }
      const d = dist(ep.adj, ep.pt) || 1;
      const u: Vec2 = [(ep.adj[0] - ep.pt[0]) / d, (ep.adj[1] - ep.pt[1]) / d];
      const fwd = ep.dir === 1;
      b.arms.push({
        road: r.id,
        at: ep.at,
        dir: ep.dir,
        u,
        half: r.width / 2,
        walkL: fwd ? r.sidewalk.left : r.sidewalk.right,
        walkR: fwd ? r.sidewalk.right : r.sidewalk.left,
      });
    }
  }
  let synIdx = 0;
  for (const b of endBuckets.values()) {
    if (b.arms.length < 2) continue;
    b.arms.sort((x, y) => Math.atan2(x.u[1], x.u[0]) - Math.atan2(y.u[1], y.u[0]));
    nodes.push({ id: `syn-${synIdx++}`, at: b.pt, arms: b.arms, signals: false });
  }

  const tapers = new Map<string, RoadTaper>();
  for (const r of roadList) {
    const totalL = polylineLength(r.path);
    const h0 = r.width / 2;
    tapers.set(r.id, {
      totalL,
      h0,
      hStart: h0,
      tStart: 0,
      hEnd: h0,
      tEnd: 0,
      walkL0: r.sidewalk.left,
      walkR0: r.sidewalk.right,
      walkLStart: r.sidewalk.left,
      walkRStart: r.sidewalk.right,
      walkLEnd: r.sidewalk.left,
      walkREnd: r.sidewalk.right,
    });
  }

  const armHalfNow = (arm: Arm) => {
    const t = tapers.get(arm.road)!;
    if (arm.dir === 1 && arm.at < 0.5) return t.hStart;
    if (arm.dir === -1 && arm.at > t.totalL - 0.5) return t.hEnd;
    return halfAt(t, arm.at);
  };

  const applyArmTaper = (arm: Arm, hTarget: number, wLTarget: number, wRTarget: number) => {
    const t = tapers.get(arm.road)!;
    if (arm.dir === 1 && arm.at < 0.5 && hTarget < t.hStart - 0.01) {
      t.hStart = hTarget;
      t.tStart = Math.min(32, Math.max(14, (t.h0 - hTarget) * 6.5), t.totalL * 0.85);
      t.walkLStart = wLTarget;
      t.walkRStart = wRTarget;
    } else if (arm.dir === -1 && arm.at > t.totalL - 0.5 && hTarget < t.hEnd - 0.01) {
      t.hEnd = hTarget;
      t.tEnd = Math.min(32, Math.max(14, (t.h0 - hTarget) * 6.5), t.totalL * 0.85);
      t.walkLEnd = wRTarget;
      t.walkREnd = wLTarget;
    }
  };

  for (let pass = 0; pass < 2; pass++) {
    for (const node of nodes) {
      const candidates: { a: Arm; b: Arm; score: number }[] = [];
      for (let i = 0; i < node.arms.length; i++) {
        for (let j = i + 1; j < node.arms.length; j++) {
          const A = node.arms[i]!, Bm = node.arms[j]!;
          if (A.road === Bm.road) continue;
          const rA = roads.get(A.road)!, rB = roads.get(Bm.road)!;
          if ((rA.layer > 0 && rA.profile.length) || (rB.layer > 0 && rB.profile.length)) continue;
          if (rA.layer !== rB.layer || isMinorRoad(rA) !== isMinorRoad(rB)) continue;
          const turn = Math.acos(Math.max(-1, Math.min(1, -(A.u[0] * Bm.u[0] + A.u[1] * Bm.u[1]))));
          if (turn >= 0.65) continue;
          const score =
            turn +
            (rA.name && rA.name === rB.name ? -0.25 : 0) +
            (rA.kind === rB.kind ? -0.1 : 0);
          candidates.push({ a: A, b: Bm, score });
        }
      }
      candidates.sort((x, y) => x.score - y.score);
      const matched = new Set<Arm>();
      for (const { a: A, b: Bm } of candidates) {
        if (matched.has(A) || matched.has(Bm)) continue;
        matched.add(A);
        matched.add(Bm);
        const hShared = Math.min(armHalfNow(A), armHalfNow(Bm));
        const wAR = A.walkR > 0 && Bm.walkL > 0 ? Math.min(A.walkR, Bm.walkL) : A.walkR;
        const wAL = A.walkL > 0 && Bm.walkR > 0 ? Math.min(A.walkL, Bm.walkR) : A.walkL;
        const wBR = Bm.walkR > 0 && A.walkL > 0 ? Math.min(Bm.walkR, A.walkL) : Bm.walkR;
        const wBL = Bm.walkL > 0 && A.walkR > 0 ? Math.min(Bm.walkL, A.walkR) : Bm.walkL;
        applyArmTaper(A, hShared, wAL, wAR);
        applyArmTaper(Bm, hShared, wBL, wBR);
      }
      // Secondary continuation arms at Y-splits/merges
      for (const C of node.arms) {
        if (matched.has(C)) continue;
        const rC = roads.get(C.road)!;
        if (rC.layer > 0 && rC.profile.length) continue;
        let bestD: Arm | null = null, bestTurn = 0.6;
        for (const D of node.arms) {
          if (D === C || D.road === C.road) continue;
          const rD = roads.get(D.road)!;
          if (rD.layer !== rC.layer || isMinorRoad(rD) !== isMinorRoad(rC)) continue;
          const turn = Math.acos(Math.max(-1, Math.min(1, -(C.u[0] * D.u[0] + C.u[1] * D.u[1]))));
          if (turn < bestTurn) {
            bestTurn = turn;
            bestD = D;
          }
        }
        if (bestD) {
          const hShared = Math.min(armHalfNow(C), armHalfNow(bestD));
          const wCR = C.walkR > 0 && bestD.walkL > 0 ? Math.min(C.walkR, bestD.walkL) : C.walkR;
          const wCL = C.walkL > 0 && bestD.walkR > 0 ? Math.min(C.walkL, bestD.walkR) : C.walkL;
          applyArmTaper(C, hShared, wCL, wCR);
        }
      }
    }

    if (pass === 0) {
      for (const t of tapers.values()) {
        if (t.totalL > 0 && t.totalL < 28) {
          const maxDiff = t.totalL * 0.08;
          if (t.hStart < t.hEnd - maxDiff) {
            t.hEnd = t.hStart + maxDiff;
            t.tEnd = t.totalL;
          } else if (t.hEnd < t.hStart - maxDiff) {
            t.hStart = t.hEnd + maxDiff;
            t.tStart = t.totalL;
          }
        }
      }
    }
  }

  for (const node of nodes) {
    for (const arm of node.arms) {
      arm.half = armHalfNow(arm);
    }
  }

  for (const r of roadList) {
    const t = tapers.get(r.id)!;
    r.path = densifyTaperedPath(r.path, t);
    t.totalL = polylineLength(r.path);
  }

  return { roads, roadList, nodes, tapers };
}

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

function computeRoadCuts(
  nodes: readonly NetNode[],
  roads: Map<string, Road>,
  tapers: Map<string, RoadTaper>,
  B: Batch | null,
  mode: StreetRenderMode,
): Map<string, LocalStreetCuts> {
  const cuts = new Map<string, LocalStreetCuts>();
  const cutOf = (id: string) => { let c = cuts.get(id); if (!c) cuts.set(id, (c = { left: [], right: [], marks: [] })); return c; };
  for (const node of nodes) {
    if (node.arms.some(a => roads.get(a.road)!.layer > 0 && zAt(roads.get(a.road)!, a.at) > 0.5)) continue;
    const corners = junction(B, node, roads, tapers, mode);
    for (const [k, arm] of node.arms.entries()) {
      const c = cutOf(arm.road), span = (t: number): [number, number] => (arm.dir > 0 ? [arm.at - 0.01, arm.at + t] : [arm.at - t, arm.at + 0.01]);
      // the arm's right side faces the corner after it, its left the corner before it
      const after = corners[k], before = corners[(k - 1 + node.arms.length) % node.arms.length];
      // a sidewalk on the arm's right is the path's right when the arm runs along the path
      if (after && (mode !== 'major' || !after.isMinorCorner)) (arm.dir > 0 ? c.right : c.left).push(span(after.tA));
      if (before && (mode !== 'major' || !before.isMinorCorner)) (arm.dir > 0 ? c.left : c.right).push(span(before.tB));
      const others = Math.max(0, ...node.arms.filter(a => a !== arm).map(a => a.half));
      if (node.arms.length >= 3) c.marks.push(span(others + 2));
    }
  }
  return cuts;
}

/** Emit a continuous quad strip between two equal-length offset polylines at height z. */
function flatRibbon(B: Batch, surf: Surface, leftEdge: readonly Vec2[], rightEdge: readonly Vec2[], z: number) {
  const n = Math.min(leftEdge.length, rightEdge.length);
  if (n < 2) return;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < n; i++) {
    const l0 = leftEdge[i - 1]!, l1 = leftEdge[i]!;
    const r0 = rightEdge[i - 1]!, r1 = rightEdge[i]!;
    const dL = dist(l0, l1), dR = dist(r0, r1);
    if (dL < 1e-4 && dR < 1e-4) continue;
    if (dL < 1e-4) {
      B.tri(surf, V(l0[0], l0[1], z), V(r0[0], r0[1], z), V(r1[0], r1[1], z), up);
    } else if (dR < 1e-4) {
      B.tri(surf, V(l0[0], l0[1], z), V(r0[0], r0[1], z), V(l1[0], l1[1], z), up);
    } else {
      B.quad(surf, [V(l0[0], l0[1], z), V(r0[0], r0[1], z), V(r1[0], r1[1], z), V(l1[0], l1[1], z)], up);
    }
  }
}

/** Smoothly round interior bends of a standalone polyline (such as a footway) */
function smoothPolyline(path: readonly Vec2[]): Vec2[] {
  if (path.length <= 2) return [...path];
  let s: Vec2[] = [...path];
  for (let pass = 0; pass < 2 && s.length > 2; pass++) {
    const n: Vec2[] = [s[0]!];
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i]!, b = s[i + 1]!;
      if (i > 0) n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < s.length - 2) n.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    n.push(s[s.length - 1]!);
    s = n;
  }
  return s;
}

/** Cầu Long Biên gets its steel trusses on top of the ordinary deck (which follows its real, ramped height profile) */
const hasBespokeBridge = (r: { name?: string }) => Boolean(r.name && /cầu long biên/i.test(r.name));

const TRUSS_SPAN = 95, TRUSS_CELLS = 8;

/** Cantilever steel trusses (the "dragon" wave of the real bridge) over the river part of the deck:
    one span every 95 m where the deck is at full height and over water; a tall post at each pier. */
function longBienTruss(B: Batch, r: Road, waters: readonly (readonly Vec2[])[], sides: readonly (-1 | 1)[]) {
  const step = TRUSS_SPAN / TRUSS_CELLS, L = polylineLength(r.path);
  const at = (s: number): { p: Vec2; r: Vec2 } => {
    let acc = 0;
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1]!, b = r.path[i]!, d = dist(a, b);
      if (s <= acc + d || i === r.path.length - 1) {
        const t = d ? Math.min(1, Math.max(0, (s - acc) / d)) : 0;
        return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], r: rightOf(a, b) };
      }
      acc += d;
    }
    return { p: r.path[0]!, r: [0, 1] };
  };
  const n = Math.floor(L / step), half = r.width / 2 + 0.1;
  const deckTop = r.profile.length ? Math.max(...r.profile.map(q => q[1])) : 0;
  const over = (c: number) => { const q = at((c * TRUSS_CELLS + TRUSS_CELLS / 2) * step); return zAt(r, (c * TRUSS_CELLS + TRUSS_CELLS / 2) * step) >= deckTop - 0.5 && waters.some(w => pointInRing(q.p, w)); };
  const topRel = (i: number) => 4 + 7.5 * Math.cos((Math.PI * (i % TRUSS_CELLS)) / TRUSS_CELLS) ** 2;
  for (let c = 0; c * TRUSS_CELLS + TRUSS_CELLS <= n; c++) {
    if (!over(c)) continue;
    for (const sv of sides) {
      let prev: THREE.Vector3 | null = null, prevBase: THREE.Vector3 | null = null;
      for (let k = 0; k <= TRUSS_CELLS; k++) {
        const i = c * TRUSS_CELLS + k, s = i * step, q = at(s), z0 = zAt(r, s) + 0.9;
        const x = q.p[0] + q.r[0] * sv * half, y = q.p[1] + q.r[1] * sv * half;
        const base = V(x, y, z0), top = V(x, y, z0 + topRel(i));
        B.line(base, top, 'crease');
        if (prev && prevBase) {
          B.line(prev, top, 'crease');
          B.line(k % 2 ? prevBase : base, k % 2 ? top : prev, 'crease');
        }
        if (k === 0 || k === TRUSS_CELLS) {
          const ring: Vec2[] = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([a, b]) => [x + a!, y + b!]);
          B.solid(ring, z0, z0 + topRel(i), () => 'metal', 'metal');
        }
        prev = top; prevBase = base;
      }
    }
    // overhead sway bracing at the middle of the span
    const sMid = (c * TRUSS_CELLS + TRUSS_CELLS / 2) * step, q = at(sMid), zt = zAt(r, sMid) + 0.9 + topRel(TRUSS_CELLS / 2);
    if (sides.length === 2) B.line(V(q.p[0] - q.r[0] * half, q.p[1] - q.r[1] * half, zt), V(q.p[0] + q.r[0] * half, q.p[1] + q.r[1] * half, zt), 'crease');
  }
}

function drawRoadGeometry(B: Batch, r: Road, taper: RoadTaper, c: LocalStreetCuts, mode: StreetRenderMode) {
  const minor = isMinorRoad(r);
  const drawCarriageway = mode === 'all' || (mode === 'major' ? !minor : minor);
  const drawLocalDetails = mode === 'all' || mode === 'local';
  if (r.layer > 0 && r.profile.length) {
    if (drawCarriageway) bridge(B, r);
    return;
  }
  if (drawCarriageway) {
    const leftEdge = offsetTaperedLine(r.path, 0, 1, -1, taper);
    const rightEdge = offsetTaperedLine(r.path, 0, 1, 1, taper);
    flatRibbon(B, 'road', leftEdge, rightEdge, ROAD_Z);
    if (mode === 'major' && isArterialRoad(r.kind)) {
      for (const [side, cut] of [[1, c.right], [-1, c.left]] as const) {
        for (const run of piecesWithS(r.path, cut)) {
          const edge = offsetTaperedLine(run.path, run.s0, 1, side, taper);
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
    for (const run of piecesWithS(r.path, cut)) {
      const kerb = offsetTaperedLine(run.path, run.s0, 1, side, taper);
      const back = offsetTaperedLine(run.path, run.s0, 1, side, taper, s => walkAt(taper, side, s));
      walkRibbon(B, kerb, back);
    }
  }
  const offs: number[] = [];
  const n = r.oneway ? r.lanes : 2 * Math.max(1, Math.floor(r.lanes / 2));
  for (let k = 1; k < n; k++) offs.push(-r.width / 2 + (k * r.width) / n);
  for (const o of offs) {
    const absO = Math.abs(o);
    const markCut = [...c.marks];
    if (absO > 0.1) {
      if (halfAt(taper, 0) < absO + 1.3) markCut.push([0, Math.max(taper.tStart, taper.totalL * 0.5)]);
      if (halfAt(taper, taper.totalL) < absO + 1.3) markCut.push([Math.min(taper.totalL - taper.tEnd, taper.totalL * 0.5), taper.totalL]);
    }
    for (const run of pieces(r.path, markCut)) dashes(B, offsetLine(run, o));
  }
}

function drawFootwayGeometry(B: Batch, s: City['streets'][number], metroStations: City['stations']) {
  // Metro station overpass walkways & entrance stairs are rendered in full architectural detail by buildMetro
  if ((s.layer > 0 || s.kind === 'steps') && s.path.some(p => metroStations.some(st => dist(p, st.at) < 90))) return;
  // Bespoke pedestrian bridges (e.g. Cầu Thê Húc) are rendered in full 3D architectural detail by landmarks
  if (s.source === 'osm:way/9566542' || (s.name && /thê húc/i.test(s.name))) return;
  if (s.layer > 0 && s.profile.length) bridge(B, s);
  else {
    const fp = smoothPolyline(s.path), h = s.width / 2;
    flatRibbon(B, 'walk', offsetLine(fp, -h), offsetLine(fp, h), ROAD_Z * 0.5);
  }
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
  const { roads, roadList, nodes, tapers } = prepareRenderNetwork(city);
  const cuts = computeRoadCuts(nodes, roads, tapers, B, mode);
  const emptyCut: LocalStreetCuts = { left: [], right: [], marks: [] };
  const waters = city.areas.filter(a => a.kind === 'water').map(a => a.polygon);
  // the two carriageways of Cầu Long Biên each get a truss on their outer side only
  const lbDecks = roadList.filter(r => r.layer > 0 && r.profile.length && hasBespokeBridge(r));
  const outerSides = (r: Road): (-1 | 1)[] => {
    const other = lbDecks.find(o => o !== r);
    if (!other) return [-1, 1];
    const mid = r.path[Math.floor(r.path.length / 2)]!, om = closestOnPath(mid, other.path).at;
    const a = r.path[Math.floor(r.path.length / 2) - 1] ?? r.path[0]!, b = r.path[Math.floor(r.path.length / 2)]!, n = rightOf(a, b);
    return [(om[0] - mid[0]) * n[0] + (om[1] - mid[1]) * n[1] > 0 ? -1 : 1];
  };
  for (const r of roadList) {
    drawRoadGeometry(B, r, tapers.get(r.id)!, cuts.get(r.id) ?? emptyCut, mode);
    if (mode !== 'local' && lbDecks.includes(r)) longBienTruss(B, r, waters, outerSides(r));
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
  const { roads, roadList, nodes, tapers } = prepareRenderNetwork(city);
  const cuts = computeRoadCuts(nodes, roads, tapers, null, 'local');
  const metroStations = city.stations.filter(st => st.kind === 'metro');
  const forecourtGrid = buildForecourtStreetGrid(city);
  const ctx: LocalStreetSharedContext = { roads, tapers, cuts, metroStations, forecourtGrid };

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

  for (const node of nodes) {
    if (node.arms.some(a => roads.get(a.road)!.layer > 0 && zAt(roads.get(a.road)!, a.at) > 0.5)) continue;
    bucketOf(node.at[0], node.at[1]).nodes.push(node);
  }
  for (const r of roadList) {
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
    junction(B, node, tile.ctx.roads, tile.ctx.tapers, 'local');
  }
  for (const r of tile.roads) {
    drawRoadGeometry(B, r, tile.ctx.tapers.get(r.id)!, tile.ctx.cuts.get(r.id) ?? emptyCut, 'local');
  }
  for (const s of tile.footways) {
    drawFootwayGeometry(B, s, tile.ctx.metroStations);
  }
  for (const b of tile.buildings) {
    drawBuildingForecourt(B, b, tile.ctx.forecourtGrid);
  }
}

/** Draw a continuous raised sidewalk ribbon with a vertical kerb face and a single longitudinal kerb line,
    using direct 1-to-1 quad strips so curved sidewalks never triangulate across chords. */
function walkRibbon(B: Batch, kerbEdge: readonly Vec2[], backEdge: readonly Vec2[]) {
  if (kerbEdge.length < 2 || backEdge.length < 2) return;
  if (kerbEdge.length === backEdge.length) {
    flatRibbon(B, 'walk', kerbEdge, backEdge, WALK_Z);
  } else {
    B.flat('walk', [...kerbEdge, ...[...backEdge].reverse()], WALK_Z);
  }
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
    if (k) B.flat(k[0], a.polygon, k[1], 'detail', a.name || a.subtype ? a.id : undefined, a.holes);
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

interface Corner { tA: number; tB: number; isMinorCorner: boolean }

/** Sample a road arm at distance `t` away from its junction node, returning the exact point on the
    road's centerline, the unit tangent `u` pointing away from the junction, and its right/left normals. */
function sampleArm(road: Road, arm: Arm, t: number): { pt: Vec2; u: Vec2; r: Vec2; l: Vec2 } {
  const path = road.path;
  const totalL = polylineLength(path);
  const targetS = Math.max(0, Math.min(totalL, arm.dir > 0 ? arm.at + t : arm.at - t));
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, segL = dist(a, b);
    if (acc + segL >= targetS - 1e-6 || i === path.length - 1) {
      const f = segL > 1e-6 ? Math.max(0, Math.min(1, (targetS - acc) / segL)) : 0;
      const pt: Vec2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const d = segL || 1;
      const u: Vec2 = [((b[0] - a[0]) / d) * arm.dir, ((b[1] - a[1]) / d) * arm.dir];
      const r: Vec2 = [-u[1], u[0]];
      const l: Vec2 = [u[1], -u[0]];
      return { pt, u, r, l };
    }
    acc += segL;
  }
  const pt = path[0]!;
  return { pt, u: arm.u, r: [-arm.u[1], arm.u[0]], l: [arm.u[1], -arm.u[0]] };
}

/** Sample the kerb edge along `arm` from `0` to `t` (on the right side if `rightSide` is true, else left). */
function armKerbEdge(
  road: Road,
  taper: RoadTaper,
  arm: Arm,
  t: number,
  rightSide: boolean,
  extra?: (s: number) => number,
): Vec2[] {
  const s0 = arm.dir > 0 ? arm.at : Math.max(0, arm.at - t);
  const s1 = arm.dir > 0 ? arm.at + t : arm.at;
  const sub = cutPath(road.path, Math.max(0, s0), Math.min(taper.totalL, s1));
  const targetS = Math.max(0, Math.min(taper.totalL, arm.dir > 0 ? arm.at + t : arm.at - t));
  const dMag = halfAt(taper, targetS) + (extra ? extra(targetS) : 0);
  if (sub.length < 2) {
    const s = sampleArm(road, arm, t);
    const n = rightSide ? s.r : s.l;
    return [[s.pt[0] + n[0] * dMag, s.pt[1] + n[1] * dMag]];
  }
  const ordered = arm.dir > 0 ? sub : [...sub].reverse();
  const sign: 1 | -1 = rightSide ? 1 : -1;
  return offsetTaperedLine(ordered, arm.at, arm.dir, sign, taper, extra);
}

/** Smooth circular-like cubic Bézier curve from `p0` (with unit outgoing tangent `d0`)
    to `p1` (with unit incoming tangent `d1`). Guaranteed loop-free and exact at both endpoints. */
function bezierFillet(p0: Vec2, d0: Vec2, p1: Vec2, d1: Vec2, steps = 12): Vec2[] {
  const chord = dist(p0, p1);
  if (chord < 1e-4) return [p0, p1];
  const cosA = Math.max(-1, Math.min(1, d0[0] * d1[0] + d0[1] * d1[1]));
  const alpha = Math.acos(cosA);
  const denom = 3 * Math.pow(Math.cos(alpha * 0.25), 2);
  const h = Math.min(chord * 0.55, chord / Math.max(1.5, denom));
  const b1: Vec2 = [p0[0] + d0[0] * h, p0[1] + d0[1] * h];
  const b2: Vec2 = [p1[0] - d1[0] * h, p1[1] - d1[1] * h];
  const out: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;
    const c0 = mt * mt * mt, c1 = 3 * mt * mt * t, c2 = 3 * mt * t * t, c3 = t * t * t;
    out.push([
      c0 * p0[0] + c1 * b1[0] + c2 * b2[0] + c3 * p1[0],
      c0 * p0[1] + c1 * b1[1] + c2 * b2[1] + c3 * p1[1],
    ]);
  }
  return out;
}

/** Fill the corners of a junction; returns, per pair of neighbouring arms (k, k+1), how far from
    the node the fillet begins on each (or null where there is no corner: arms almost in line). */
function junction(
  B: Batch | null,
  node: NetNode,
  roads: Map<string, Road>,
  tapers: Map<string, RoadTaper>,
  mode: StreetRenderMode = 'all',
): (Corner | null)[] {
  const n = node.arms.length, out: (Corner | null)[] = [];
  const minor = (a: Arm) => isMinorRoad(roads.get(a.road)!);
  const up = new THREE.Vector3(0, 1, 0);

  for (let k = 0; k < n; k++) {
    const A = node.arms[k]!, Bm = node.arms[(k + 1) % n]!;
    let th = Math.atan2(Bm.u[1], Bm.u[0]) - Math.atan2(A.u[1], A.u[0]);
    if (th <= 0) th += 2 * Math.PI;
    if (n === 1 || th < 0.15) { out.push(null); continue; }

    const roadA = roads.get(A.road)!, roadB = roads.get(Bm.road)!;
    const taperA = tapers.get(A.road)!, taperB = tapers.get(Bm.road)!;
    const hNodeA = halfAt(taperA, A.at), hNodeB = halfAt(taperB, Bm.at);
    const sideA: 1 | -1 = A.dir > 0 ? 1 : -1;
    const sideB: 1 | -1 = Bm.dir > 0 ? -1 : 1;
    const wNodeA = walkAt(taperA, sideA, A.at), wNodeB = walkAt(taperB, sideB, Bm.at);

    // the sector lies on A's right and B's left (y points south: right of u is (−u_y, u_x))
    const rA: Vec2 = [-A.u[1], A.u[0]], lB: Vec2 = [Bm.u[1], -Bm.u[0]];
    const isMinorCorner = minor(A) || minor(Bm);
    const drawCornerRoad = mode === 'all' || (mode === 'major' ? !isMinorCorner : isMinorCorner);
    const drawCornerWalk = mode === 'all' || mode === 'local';

    // Outer (convex) side of a bend at a node: fill the small outer wedge so no V-notch appears
    if (th > Math.PI - 0.15) {
      const dAng = th - Math.PI;
      if (B && dAng > 0.002 && dAng < 1.25) {
        const a0 = Math.atan2(rA[1], rA[0]);
        const steps = Math.max(4, Math.ceil(dAng / 0.14));
        const outerKerb: Vec2[] = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, s = u * u * (3 - 2 * u), ang = a0 + dAng * u;
          const rK = hNodeA * (1 - s) + hNodeB * s;
          outerKerb.push([node.at[0] + rK * Math.cos(ang), node.at[1] + rK * Math.sin(ang)]);
        }
        if (drawCornerRoad) {
          for (let i = 1; i < outerKerb.length; i++) {
            const q0 = outerKerb[i - 1]!, q1 = outerKerb[i]!;
            B.tri('road', V(node.at[0], node.at[1], ROAD_Z), V(q0[0], q0[1], ROAD_Z), V(q1[0], q1[1], ROAD_Z), up);
          }
          if (mode === 'major' && (isArterialRoad(roadA.kind) || isArterialRoad(roadB.kind))) {
            for (let i = 1; i < outerKerb.length; i++) {
              const q0 = outerKerb[i - 1]!, q1 = outerKerb[i]!;
              B.line(V(q0[0], q0[1], ROAD_Z + 0.01), V(q1[0], q1[1], ROAD_Z + 0.01), 'crease');
            }
          }
        }
        if (drawCornerWalk && wNodeA > 0 && wNodeB > 0) {
          const outerBack: Vec2[] = [];
          for (let i = 0; i <= steps; i++) {
            const u = i / steps, s = u * u * (3 - 2 * u), ang = a0 + dAng * u;
            const rB = (hNodeA + wNodeA) * (1 - s) + (hNodeB + wNodeB) * s;
            outerBack.push([node.at[0] + rB * Math.cos(ang), node.at[1] + rB * Math.sin(ang)]);
          }
          walkRibbon(B, outerKerb, outerBack);
        }
      }
      out.push(null);
      continue;
    }

    const pA: Vec2 = [node.at[0] + rA[0] * hNodeA, node.at[1] + rA[1] * hNodeA];
    const pB: Vec2 = [node.at[0] + lB[0] * hNodeB, node.at[1] + lB[1] * hNodeB];
    // where the two kerb lines meet: pA + tA·uA = pB + tB·uB
    const det = A.u[0] * -Bm.u[1] - A.u[1] * -Bm.u[0];
    if (Math.abs(det) < 1e-6) { out.push(null); continue; }
    const dx = pB[0] - pA[0], dy = pB[1] - pA[1];
    const tCa = (dx * -Bm.u[1] - dy * -Bm.u[0]) / det, tCb = (A.u[0] * dy - A.u[1] * dx) / det;

    const maxA = Math.min(28, taperA.totalL * 0.8);
    const maxB = Math.min(28, taperB.totalL * 0.8);

    const walkNeed = wNodeA > 0 && wNodeB > 0 ? Math.max(wNodeA, wNodeB) + 0.8 : 0;
    const R = Math.max(isMinorCorner ? 2.2 : 4.2, walkNeed);
    const tl = R / Math.tan(th / 2);
    let tA = tCa + tl, tB = tCb + tl;
    if (th > 1.4) {
      const minObtuse = Math.min(8, Math.abs(hNodeA - hNodeB) * 2 + 1.5);
      tA = Math.min(maxA, Math.max(tA, minObtuse));
      tB = Math.min(maxB, Math.max(tB, minObtuse));
    }
    if ((th <= 1.4 && (tCa < -2 || tCb < -2)) || tA < 0.05 || tB < 0.05 || tA > maxA || tB > maxB) {
      out.push(null);
      continue;
    }

    if (B) {
      const sA = sampleArm(roadA, A, tA), sB = sampleArm(roadB, Bm, tB);
      const edgeA = armKerbEdge(roadA, taperA, A, tA, true);
      const edgeBRaw = armKerbEdge(roadB, taperB, Bm, tB, false);
      const TA: Vec2 = edgeA[edgeA.length - 1]!;
      const TB: Vec2 = edgeBRaw[edgeBRaw.length - 1]!;
      let d0: Vec2 = [-sA.u[0], -sA.u[1]];
      if (edgeA.length >= 2) {
        const qPrev = edgeA[edgeA.length - 2]!, dL = dist(TA, qPrev);
        if (dL > 1e-4) d0 = [(qPrev[0] - TA[0]) / dL, (qPrev[1] - TA[1]) / dL];
      }
      let d1: Vec2 = sB.u;
      if (edgeBRaw.length >= 2) {
        const qPrev = edgeBRaw[edgeBRaw.length - 2]!, dL = dist(TB, qPrev);
        if (dL > 1e-4) d1 = [(TB[0] - qPrev[0]) / dL, (TB[1] - qPrev[1]) / dL];
      }
      const kerbArc = bezierFillet(TA, d0, TB, d1, 12);

      if (drawCornerRoad) {
        // Triangle fan from node.at along the exact arm kerbs and fillet arc (never self-intersects)
        const edgeB = [...edgeBRaw].reverse();
        const boundary: Vec2[] = [...edgeA, ...kerbArc.slice(1, -1), ...edgeB];
        for (let i = 1; i < boundary.length; i++) {
          const q0 = boundary[i - 1]!, q1 = boundary[i]!;
          if (dist(q0, q1) < 1e-4) continue;
          B.tri('road', V(node.at[0], node.at[1], ROAD_Z), V(q0[0], q0[1], ROAD_Z), V(q1[0], q1[1], ROAD_Z), up);
        }
        if (mode === 'major' && (isArterialRoad(roadA.kind) || isArterialRoad(roadB.kind))) {
          for (let i = 1; i < kerbArc.length; i++) {
            const q0 = kerbArc[i - 1]!, q1 = kerbArc[i]!;
            B.line(V(q0[0], q0[1], ROAD_Z + 0.01), V(q1[0], q1[1], ROAD_Z + 0.01), 'crease');
          }
        }
      }
      if (drawCornerWalk && wNodeA > 0 && wNodeB > 0 && R > 0.5) {
        // Both arms have sidewalks: connect exact back-of-sidewalk endpoints TA_back -> TB_back
        const backEdgeA = armKerbEdge(roadA, taperA, A, tA, true, s => walkAt(taperA, sideA, s));
        const backEdgeB = armKerbEdge(roadB, taperB, Bm, tB, false, s => walkAt(taperB, sideB, s));
        const TA_back: Vec2 = backEdgeA[backEdgeA.length - 1]!;
        const TB_back: Vec2 = backEdgeB[backEdgeB.length - 1]!;
        const backArc = bezierFillet(TA_back, d0, TB_back, d1, 12);
        walkRibbon(B, kerbArc, backArc);
      }
    }
    out.push({ tA, tB, isMinorCorner });
  }
  return out;
}

// ---------- geometry along a centre line ----------

/** right-hand unit normal of a direction (x east, y south: (−dy, dx)) */
const rightOf = (a: Vec2, b: Vec2): Vec2 => { const L = dist(a, b) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };

/** Offset a polyline using a smoothly tapered road width profile, with forward-monotonic clamping. */
function offsetTaperedLine(
  path: readonly Vec2[],
  s0: number,
  sDir: 1 | -1,
  side: 1 | -1,
  taper: RoadTaper,
  extra?: (s: number) => number,
): Vec2[] {
  const out: Vec2[] = [];
  let acc = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    if (i > 0) acc += dist(path[i - 1]!, p);
    const s = Math.max(0, Math.min(taper.totalL, s0 + sDir * acc));
    const d = side * (halfAt(taper, s) + (extra ? extra(s) : 0));
    const n0 = i > 0 ? rightOf(path[i - 1]!, p) : rightOf(p, path[i + 1]!);
    const n1 = i < path.length - 1 ? rightOf(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(2.2, 1 / Math.max(0.45, mx * n0[0] + my * n0[1]));
    let pt: Vec2 = [p[0] + mx * d * k, p[1] + my * d * k];
    if (i > 0) {
      const prev = out[i - 1]!;
      const prevCenter = path[i - 1]!;
      const segLen = dist(prevCenter, p);
      if (segLen > 1e-4) {
        const ux = (p[0] - prevCenter[0]) / segLen, uy = (p[1] - prevCenter[1]) / segLen;
        const fwd = (pt[0] - prev[0]) * ux + (pt[1] - prev[1]) * uy;
        if (fwd < 0) pt = prev;
      }
    }
    out.push(pt);
  }
  return out;
}

/** the line `d` metres to the right of a path (negative = left), with mitred corners and forward-monotonic clamping
    so tight inner bends never fold backwards into self-intersecting loops */
export function offsetLine(path: readonly Vec2[], d: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    const n0 = i > 0 ? rightOf(path[i - 1]!, p) : rightOf(p, path[i + 1]!);
    const n1 = i < path.length - 1 ? rightOf(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(2.2, 1 / Math.max(0.45, mx * n0[0] + my * n0[1]));
    let pt: Vec2 = [p[0] + mx * d * k, p[1] + my * d * k];
    if (i > 0) {
      const prev = out[i - 1]!;
      const prevCenter = path[i - 1]!;
      const segLen = dist(prevCenter, p);
      if (segLen > 1e-4) {
        const ux = (p[0] - prevCenter[0]) / segLen, uy = (p[1] - prevCenter[1]) / segLen;
        const fwd = (pt[0] - prev[0]) * ux + (pt[1] - prev[1]) * uy;
        // If an inner offset point moves backwards against the path direction, clamp it to prev so it pivots cleanly
        if (fwd < 0) pt = prev;
      }
    }
    out.push(pt);
  }
  return out;
}

/** the ring between offsets d0 and d1 of a path */
export function strip(path: readonly Vec2[], d0: number, d1: number): Vec2[] {
  return [...offsetLine(path, d0), ...offsetLine(path, d1).reverse()];
}

/** the parts of a path left after cutting out the given [from, to] spans (distances along it), with their start arc-length s0 */
function piecesWithS(path: readonly Vec2[], cut: readonly [number, number][]): { path: Vec2[]; s0: number }[] {
  const L = polylineLength(path), spans = [...cut].sort((a, b) => a[0] - b[0]);
  const keep: [number, number][] = [];
  let s = 0;
  for (const [a, b] of spans) { if (a > s) keep.push([s, Math.min(a, L)]); s = Math.max(s, b); }
  if (s < L) keep.push([s, L]);
  return keep
    .filter(([a, b]) => b - a > 0.3)
    .map(([a, b]) => ({ path: cutPath(path, a, b), s0: a }))
    .filter(p => p.path.length > 1);
}

/** the parts of a path left after cutting out the given [from, to] spans (distances along it) */
function pieces(path: readonly Vec2[], cut: readonly [number, number][]): Vec2[][] {
  return piecesWithS(path, cut).map(p => p.path);
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
