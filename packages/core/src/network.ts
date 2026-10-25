/* The road network (docs/architecture/city-model.md §7, ADR-037): the city's street pieces joined
   into roads and the junctions between them, ready for a renderer or the traffic model.
     - Roads: pieces that simply continue each other (meeting end to end, two and only two, with
       the same kind, name, width, direction rule and layer) become one road, so a street split
       in many OSM ways draws as one strip with no seams.
     - Smoothing: corners are rounded by corner cutting (Chaikin, two passes) between fixed points:
       the ends and every junction, which stay exactly where they are. Bridge profiles stretch
       with the path.
     - Nodes: every junction with its arms, each arm a road leaving it, with its direction, half
       width and the sidewalk on each side (looking away from the junction).
     - Runs: roads chained on through junctions where the street goes straight on (same name and
       kind, turning less than 35°, one-way roads only forward), so a whole street can carry its
       poles and wires across the alleys that cut it into roads.
     - Routes: the same, but across a change of name (Thái Hà goes straight on as Chùa Bộc) and
       turning less than 20°: what traffic drives along.
   Pure. */
import type { City, Street } from './city';
import { dist, polylineLength, type Vec2 } from './geom';

export interface Road {
  id: string;
  name?: string;
  kind: Street['kind'];
  path: Vec2[];
  width: number;
  lanes: number;
  oneway: boolean;
  sidewalk: Street['sidewalk'];
  layer: number;
  profile: [number, number][];
  /** the street pieces it is made of, in order */
  streets: string[];
}

export interface Arm {
  road: string;
  /** distance along the road's path where the junction is */
  at: number;
  /** +1: the arm runs along the path (away from the junction), −1: against it */
  dir: 1 | -1;
  /** unit direction away from the junction */
  u: Vec2;
  half: number;
  /** sidewalk widths on the arm's left and right, looking away from the junction */
  walkL: number;
  walkR: number;
}

export interface NetNode { id: string; at: Vec2; arms: Arm[]; signals: boolean }

/** a street followed straight through its junctions */
export interface Run {
  id: string;
  name?: string;
  kind: Road['kind'];
  oneway: boolean;
  layer: number;
  path: Vec2[];
  /** the roads it is made of: their stretch [from, to] along the run, turned round or not */
  parts: { road: string; from: number; to: number; reversed: boolean }[];
  /** junctions it passes, by distance along it */
  nodes: { node: string; at: number }[];
}

export interface Network { roads: Road[]; nodes: NetNode[]; runs: Run[]; routes: Run[] }

const EPS = 0.05;
const same = (a: Vec2, b: Vec2) => dist(a, b) < EPS;
const isRoad = (s: Street) => s.kind !== 'footway' && s.kind !== 'steps';

function pointIndex<T>(items: readonly T[], getPt: (item: T) => Vec2) {
  const grid = new Map<string, T[]>();
  for (const item of items) {
    const p = getPt(item);
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    const k = `${gx},${gy}`;
    const list = grid.get(k);
    if (list) list.push(item);
    else grid.set(k, [item]);
  }
  return {
    near(p: Vec2): T[] {
      const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
      const out: T[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = grid.get(`${gx + dx},${gy + dy}`);
          if (cell) for (const item of cell) if (same(getPt(item), p)) out.push(item);
        }
      }
      return out;
    },
    find(p: Vec2): T | undefined {
      const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = grid.get(`${gx + dx},${gy + dy}`);
          if (cell) for (const item of cell) if (same(getPt(item), p)) return item;
        }
      }
      return undefined;
    },
    some(p: Vec2): boolean {
      return this.find(p) !== undefined;
    },
  };
}

const networkCache = new WeakMap<City, Network>();

export function roadNetwork(city: City): Network {
  const cached = networkCache.get(city);
  if (cached) return cached;

  const jIndex = pointIndex(city.junctions, j => j.at);
  const atJunction = (p: Vec2) => jIndex.some(p);
  const rawRoads = joinPieces(city.streets.filter(isRoad), atJunction);
  const roads = smoothRoads(rawRoads, atJunction);

  const armsByJunction = new Map<string, Arm[]>();
  for (const j of city.junctions) armsByJunction.set(j.id, []);

  for (const r of roads) {
    const L = polylineLength(r.path);
    let acc = 0;
    for (let i = 0; i < r.path.length; i++) {
      if (i > 0) acc += dist(r.path[i - 1]!, r.path[i]!);
      const js = jIndex.near(r.path[i]!);
      if (!js.length) continue;
      for (const j of js) {
        const arms = armsByJunction.get(j.id)!;
        const arm = (dir: 1 | -1) => {
          const q = r.path[i + dir]!, d = dist(q, j.at) || 1, u: Vec2 = [(q[0] - j.at[0]) / d, (q[1] - j.at[1]) / d];
          const fwd = dir === 1;
          arms.push({ road: r.id, at: acc, dir, u, half: r.width / 2, walkL: fwd ? r.sidewalk.left : r.sidewalk.right, walkR: fwd ? r.sidewalk.right : r.sidewalk.left });
        };
        if (i < r.path.length - 1 && acc < L - 0.5) arm(1);
        if (i > 0 && acc > 0.5) arm(-1);
      }
    }
  }

  const nodes: NetNode[] = [];
  for (const j of city.junctions) {
    const arms = armsByJunction.get(j.id)!;
    // around the node in order of angle
    arms.sort((a, b) => Math.atan2(a.u[1], a.u[0]) - Math.atan2(b.u[1], b.u[0]));
    if (arms.length >= 2) nodes.push({ id: j.id, at: j.at, arms, signals: j.signals });
  }
  const net: Network = { roads, nodes, runs: chainRuns(roads, nodes, true, 0.61), routes: chainRuns(roads, nodes, false, 0.35) };
  networkCache.set(city, net);
  return net;
}

/** roads chained straight through junctions into runs (turning less than `maxTurn` rad; keeping
    to the same name when `named`) */
function chainRuns(roads: Road[], nodes: NetNode[], named: boolean, maxTurn: number): Run[] {
  const ways = (r: Road) => (r.oneway ? r.lanes : Math.max(1, Math.floor(r.lanes / 2)));
  const fits = (a: Road, b: Road) => (!named || a.name === b.name) && a.kind === b.kind && a.oneway === b.oneway && a.layer === b.layer && (named || (ways(a) > 1) === (ways(b) > 1));
  const byId = new Map(roads.map(r => [r.id, r])), roadLen = new Map(roads.map(r => [r.id, polylineLength(r.path)])), used = new Set<string>(), out: Run[] = [];
  const nodeIndex = pointIndex(nodes, n => n.at);
  /** the road that goes straight on from `road` (entered along `dirIn`) at its end p */
  const next = (road: Road, p: Vec2, dirIn: Vec2): { road: Road; reversed: boolean } | null => {
    const node = nodeIndex.find(p);
    if (!node) return null;
    let best: { road: Road; reversed: boolean; score: number } | null = null;
    for (const a of node.arms) {
      const r = byId.get(a.road)!;
      if (r === road || used.has(r.id) || !fits(road, r)) continue;
      // the arm must leave the node at an end of its road; a one-way road must leave forward
      const L = roadLen.get(r.id)!, fromStart = a.at < 0.5 && a.dir === 1, fromEnd = a.at > L - 0.5 && a.dir === -1;
      if (!fromStart && !(fromEnd && !r.oneway)) continue;
      const turn = Math.acos(Math.max(-1, Math.min(1, a.u[0] * dirIn[0] + a.u[1] * dirIn[1])));
      const score = turn + Math.abs(r.lanes - road.lanes) * 0.05;
      if (turn < maxTurn && (!best || score < best.score)) best = { road: r, reversed: fromEnd, score };
    }
    return best;
  };
  /** the road that arrives straight into the start of `path` (travelled forward into it) */
  const prev = (road: Road, path: Vec2[]): { road: Road; reversed: boolean } | null => {
    const p = path[0]!, node = nodeIndex.find(p);
    if (!node) return null;
    const d = dist(path[0]!, path[1]!) || 1, out: Vec2 = [(path[1]![0] - p[0]) / d, (path[1]![1] - p[1]) / d];
    let best: { road: Road; reversed: boolean; score: number } | null = null;
    for (const a of node.arms) {
      const r = byId.get(a.road)!;
      if (r === road || used.has(r.id) || !fits(road, r)) continue;
      // arriving: its path ends here (travelled forward), or a two-way road starting here (turned round)
      const L = roadLen.get(r.id)!, atEnd = a.at > L - 0.5 && a.dir === -1, atStart = a.at < 0.5 && a.dir === 1;
      if (!atEnd && !(atStart && !r.oneway)) continue;
      const turn = Math.acos(Math.max(-1, Math.min(1, -a.u[0] * out[0] - a.u[1] * out[1])));
      const score = turn + Math.abs(r.lanes - road.lanes) * 0.05;
      if (turn < maxTurn && (!best || score < best.score)) best = { road: r, reversed: !atEnd, score };
    }
    return best;
  };
  const dirAt = (path: Vec2[], end: boolean): Vec2 => {
    const a = end ? path[path.length - 2]! : path[1]!, b = end ? path[path.length - 1]! : path[0]!, d = dist(a, b) || 1;
    return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  };
  const order = named ? roads : [...roads].sort((a, b) => b.lanes - a.lanes || (a.id < b.id ? -1 : 1));
  for (const start of order) {
    if (used.has(start.id)) continue;
    used.add(start.id);
    let chain: { road: Road; reversed: boolean }[] = [{ road: start, reversed: false }];
    const pathOf = (c: { road: Road; reversed: boolean }) => (c.reversed ? [...c.road.path].reverse() : c.road.path);
    // forward from the end, then backward from the start (looking backward along the path)
    for (let c = chain[chain.length - 1]!, n = next(c.road, pathOf(c).at(-1)!, dirAt(pathOf(c), true)); n; c = n, n = next(c.road, pathOf(c).at(-1)!, dirAt(pathOf(c), true))) { used.add(n.road.id); chain.push(n); }
    for (let n = prev(chain[0]!.road, pathOf(chain[0]!)); n; n = prev(chain[0]!.road, pathOf(chain[0]!))) { used.add(n.road.id); chain = [n, ...chain]; }
    let path: Vec2[] = [], acc = 0;
    const parts: Run['parts'] = [];
    for (const c of chain) {
      const p = pathOf(c), L = polylineLength(p);
      path = path.length ? [...path, ...p.slice(1)] : [...p];
      parts.push({ road: c.road.id, from: acc, to: acc + L, reversed: c.reversed });
      acc += L;
    }
    const passes: Run['nodes'] = [];
    let s = 0;
    path.forEach((q, i) => { if (i > 0) s += dist(path[i - 1]!, q); const n = nodeIndex.find(q); if (n) passes.push({ node: n.id, at: s }); });
    out.push({ id: `${named ? 'run' : 'route'}-${start.id}`, name: start.name, kind: start.kind, oneway: start.oneway, layer: start.layer, path, parts, nodes: passes });
  }
  return out;
}

/** pieces that continue each other become one road */
function joinPieces(pieces: Street[], atJunction: (p: Vec2) => boolean): Road[] {
  const left = new Set(pieces);
  const ends = (s: Street) => [s.path[0]!, s.path[s.path.length - 1]!] as const;
  const fits = (a: Street, b: Street) => a.kind === b.kind && a.name === b.name && a.oneway === b.oneway && a.layer === b.layer && Math.abs(a.width - b.width) < 0.5;
  const endGrid = new Map<string, { s: Street; idx: number }[]>();
  pieces.forEach((s, idx) => {
    for (const e of ends(s)) {
      const k = `${Math.floor(e[0])},${Math.floor(e[1])}`;
      const list = endGrid.get(k);
      if (list) list.push({ s, idx });
      else endGrid.set(k, [{ s, idx }]);
    }
  });
  const piecesAt = (p: Vec2): Street[] => {
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    const hits = new Map<Street, number>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = endGrid.get(`${gx + dx},${gy + dy}`);
        if (cell) for (const { s, idx } of cell) if (!hits.has(s) && ends(s).some(e => same(e, p))) hits.set(s, idx);
      }
    }
    return [...hits.entries()].sort((a, b) => a[1] - b[1]).map(([s]) => s);
  };
  const out: Road[] = [];
  for (const start of pieces) {
    if (!left.has(start)) continue;
    left.delete(start);
    let path = [...start.path], ids = [start.id], prof = profileAbs(start, 0);
    // grow forward, then backward
    for (const forward of [true, false]) {
      for (;;) {
        const tip = forward ? path[path.length - 1]! : path[0]!;
        const atTip = piecesAt(tip);
        if (atJunction(tip) || atTip.length !== 2) break;
        const next = atTip.find(s => left.has(s) && fits(start, s));
        if (!next) break;
        const [a, b] = ends(next);
        // a one-way piece must keep the direction of travel; a two-way one may be turned round
        let np: Vec2[];
        if (forward) np = same(a, tip) ? next.path : !next.oneway ? [...next.path].reverse() : [];
        else np = same(b, tip) ? next.path : !next.oneway ? [...next.path].reverse() : [];
        if (!np.length) break;
        left.delete(next);
        if (forward) { prof = [...prof, ...profileAbs(next, polylineLength(path), np !== next.path)]; path = [...path, ...np.slice(1)]; ids = [...ids, next.id]; }
        else { const L = polylineLength(np); prof = [...profileAbs(next, 0, np !== next.path), ...prof.map(([s, z]): [number, number] => [s + L, z])]; path = [...np.slice(0, -1), ...path]; ids = [next.id, ...ids]; }
      }
    }
    out.push({ id: `r-${ids[0]}`, name: start.name, kind: start.kind, path, width: start.width, lanes: start.lanes, oneway: start.oneway, sidewalk: start.sidewalk, layer: start.layer, profile: prof.length ? dedupe(prof) : [], streets: ids });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** a piece's profile shifted to start at `offset` (reversed if the piece was turned round) */
function profileAbs(s: Street, offset: number, reversed = false): [number, number][] {
  if (!s.profile.length) return [];
  const L = polylineLength(s.path), p = reversed ? s.profile.map(([d, z]): [number, number] => [L - d, z]).reverse() : s.profile;
  return p.map(([d, z]) => [d + offset, z]);
}

const dedupe = (p: [number, number][]) => p.filter((q, i) => i === 0 || q[0] - p[i - 1]![0] > 1e-6);

const unitVec = (a: Vec2, b: Vec2): Vec2 => {
  const d = dist(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};

/** Compute shared endpoint tangents across junctions where a street continues smoothly,
    then smooth each road with tangent-guided Hermite/Chaikin subdivision. */
function smoothRoads(roads: Road[], fixed: (p: Vec2) => boolean): Road[] {
  interface EndRef { road: Road; atStart: boolean; pt: Vec2; away: Vec2 }
  const endGrid = new Map<string, EndRef[]>();
  const addEnd = (ref: EndRef) => {
    const k = `${Math.floor(ref.pt[0])},${Math.floor(ref.pt[1])}`;
    const list = endGrid.get(k);
    if (list) list.push(ref);
    else endGrid.set(k, [ref]);
  };
  for (const r of roads) {
    if (r.path.length < 2) continue;
    addEnd({ road: r, atStart: true, pt: r.path[0]!, away: unitVec(r.path[0]!, r.path[1]!) });
    const n = r.path.length;
    addEnd({ road: r, atStart: false, pt: r.path[n - 1]!, away: unitVec(r.path[n - 1]!, r.path[n - 2]!) });
  }
  const nearEnds = (p: Vec2): EndRef[] => {
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    const out: EndRef[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = endGrid.get(`${gx + dx},${gy + dy}`);
        if (cell) for (const ref of cell) if (same(ref.pt, p)) out.push(ref);
      }
    }
    return out;
  };
  const tangentAtEnd = (r: Road, atStart: boolean): Vec2 | null => {
    const pt = atStart ? r.path[0]! : r.path[r.path.length - 1]!;
    // Direction along r's path at this endpoint
    const uSelf = atStart
      ? unitVec(r.path[0]!, r.path[1]!)
      : unitVec(r.path[r.path.length - 2]!, r.path[r.path.length - 1]!);
    let bestTurn = 0.34; // max ~20° turn to preserve route chaining thresholds
    let bestDir: Vec2 | null = null;
    for (const other of nearEnds(pt)) {
      if (other.road === r) continue;
      if (other.road.kind !== r.kind || other.road.name !== r.name || other.road.oneway !== r.oneway || other.road.layer !== r.layer) continue;
      if (Math.abs(other.road.width - r.width) > 1.0) continue;
      if (r.oneway && other.atStart === atStart) continue;
      // Direction of `other` matching `r`'s forward orientation
      const uOther: Vec2 = atStart ? [-other.away[0], -other.away[1]] : other.away;
      const dot = Math.max(-1, Math.min(1, uSelf[0] * uOther[0] + uSelf[1] * uOther[1]));
      const turn = Math.acos(dot);
      if (turn > 0.015 && turn < bestTurn) {
        bestTurn = turn;
        const tx = uSelf[0] + uOther[0], ty = uSelf[1] + uOther[1];
        const tl = Math.hypot(tx, ty) || 1;
        bestDir = [tx / tl, ty / tl];
      }
    }
    return bestDir;
  };
  return roads.map(r => smooth(r, fixed, tangentAtEnd(r, true), tangentAtEnd(r, false)));
}

/** Smooth a road between fixed points (ends and junctions) using tangent-guided Hermite/Chaikin cutting */
function smooth(r: Road, fixed: (p: Vec2) => boolean, startTan: Vec2 | null = null, endTan: Vec2 | null = null): Road {
  const L0 = polylineLength(r.path);
  // Precompute smooth tangents at any interior junction vertices along r.path
  const vertexTan: (Vec2 | null)[] = r.path.map((p, i) => {
    if (i === 0) return startTan;
    if (i === r.path.length - 1) return endTan;
    if (!fixed(p)) return null;
    const u0 = unitVec(r.path[i - 1]!, p), u1 = unitVec(p, r.path[i + 1]!);
    const dot = Math.max(-1, Math.min(1, u0[0] * u1[0] + u0[1] * u1[1]));
    const turn = Math.acos(dot);
    if (turn < 0.015 || turn > 0.75) return null;
    const tx = u0[0] + u1[0], ty = u0[1] + u1[1], tl = Math.hypot(tx, ty) || 1;
    return [tx / tl, ty / tl];
  });

  const out: Vec2[] = [r.path[0]!];
  let seg: Vec2[] = [r.path[0]!];
  let segStartIdx = 0;

  const flush = (segEndIdx: number) => {
    const t0 = vertexTan[segStartIdx] ?? null;
    const t1 = vertexTan[segEndIdx] ?? null;
    let s = seg;

    if (s.length === 2) {
      const a = s[0]!, b = s[1]!, L = dist(a, b);
      if ((t0 || t1) && L >= 3.5) {
        const chord = unitVec(a, b);
        const T0 = t0 ?? chord, T1 = t1 ?? chord;
        const steps = Math.min(8, Math.max(4, Math.ceil(L / 4)));
        const hermite: Vec2[] = [a];
        for (let k = 1; k < steps; k++) {
          const u = k / steps, u2 = u * u, u3 = u2 * u;
          const h00 = 2 * u3 - 3 * u2 + 1;
          const h10 = u3 - 2 * u2 + u;
          const h01 = -2 * u3 + 3 * u2;
          const h11 = u3 - u2;
          hermite.push([
            h00 * a[0] + h10 * T0[0] * L + h01 * b[0] + h11 * T1[0] * L,
            h00 * a[1] + h10 * T0[1] * L + h01 * b[1] + h11 * T1[1] * L,
          ]);
        }
        hermite.push(b);
        out.push(...hermite.slice(1));
        return;
      }
    }

    if (s.length > 2) {
      if (t0) {
        const L = dist(s[0]!, s[1]!);
        if (L >= 4) {
          const d = Math.min(L * 0.28, 5);
          s = [s[0]!, [s[0]![0] + t0[0] * d, s[0]![1] + t0[1] * d], ...s.slice(1)];
        }
      }
      if (t1) {
        const m = s.length - 1, L = dist(s[m - 1]!, s[m]!);
        if (L >= 4) {
          const d = Math.min(L * 0.28, 5);
          s = [...s.slice(0, m), [s[m]![0] - t1[0] * d, s[m]![1] - t1[1] * d], s[m]!];
        }
      }
    }

    for (let pass = 0; pass < 3 && s.length > 2; pass++) {
      const n: Vec2[] = [s[0]!];
      for (let i = 0; i < s.length - 1; i++) {
        const a = s[i]!, b = s[i + 1]!;
        if (i > 0) n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        else if (pass === 0 && dist(a, b) > 4) n.push([a[0] * 0.82 + b[0] * 0.18, a[1] * 0.82 + b[1] * 0.18]);
        if (i < s.length - 2) n.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        else if (pass === 0 && dist(a, b) > 4) n.push([a[0] * 0.18 + b[0] * 0.82, a[1] * 0.18 + b[1] * 0.82]);
      }
      n.push(s[s.length - 1]!);
      s = n;
    }
    // Refine any remaining interior corner >= 0.28 rad (~16°) across all road kinds
    for (let extra = 0; extra < 3 && s.length > 2; extra++) {
      let sharp = false;
      const n: Vec2[] = [s[0]!];
      for (let i = 1; i < s.length - 1; i++) {
        const a = s[i - 1]!, b = s[i]!, c = s[i + 1]!;
        const t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
        if (Math.min(t, 2 * Math.PI - t) >= 0.28) {
          sharp = true;
          n.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
          n.push([b[0] * 0.75 + c[0] * 0.25, b[1] * 0.75 + c[1] * 0.25]);
        } else {
          n.push(b);
        }
      }
      n.push(s[s.length - 1]!);
      s = n;
      if (!sharp) break;
    }
    out.push(...s.slice(1));
  };
  for (let i = 1; i < r.path.length; i++) {
    seg.push(r.path[i]!);
    if (i === r.path.length - 1 || fixed(r.path[i]!)) {
      flush(i);
      seg = [r.path[i]!];
      segStartIdx = i;
    }
  }
  const L1 = polylineLength(out), k = L0 ? L1 / L0 : 1;
  return { ...r, path: out, profile: r.profile.map(([s, z]) => [s * k, z]) };
}
