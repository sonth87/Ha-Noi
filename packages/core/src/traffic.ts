/* Traffic (M5, ADR-037): the light cycle, the lanes of the road network, and a small car-following
   model. Pure: state in, state out; the view only maps positions to the screen.

   Signals. One cycle, the two directions taking turns, with an all-red between them so the
   junction empties: x green → x yellow → all red → y green → y yellow → all red. 'x' is traffic
   running mostly along x (Tây Sơn), 'y' mostly along y (Thái Hà – Chùa Bộc). Each light also shows
   a countdown (Hà Nội lights do): seconds to the next change of colour.

   Lanes. Every drivable route of the network (streets followed straight through their junctions,
   across a change of name) gets its lanes: one-way routes all along the path; two-way routes half
   each way, the other half running the path backwards. A lane stops at the first signalled node
   of each cluster it meets (a divided road crossing another is a cluster of 4 nodes), a little
   before the crossing road. Routes on a bridge carry cars only.

   Vehicles. Every vehicle drives along its lane at its own cruising speed, in one of three tracks
   (bikes on the edges, cars in the middle). It slows down smoothly for
     - the vehicle ahead in the same lane and track (keeping a gap), and
     - the stop line, while its light is red, or yellow and it decided at the change to stop.
   At the change to yellow, whoever would reach the line within 0.8 s goes on; the rest stop.
   A lane is a loop: leaving its end a vehicle comes back at its start (the view fades it in and out). */
import { dist, polylineLength, type Vec2 } from './geom';
import type { Network, Road } from './network';
import { hash, rng } from './rng';

export type Light = 'go' | 'wait' | 'stop';
export type Group = 'x' | 'y';

export interface Phase { x: Light; y: Light; t: number }

/** seconds; green long enough for a queue to clear, yellow + all red long enough to empty the junction */
export const CYCLE: readonly Phase[] = [
  { x: 'go', y: 'stop', t: 14 },
  { x: 'wait', y: 'stop', t: 3 },
  { x: 'stop', y: 'stop', t: 4 },
  { x: 'stop', y: 'go', t: 11 },
  { x: 'stop', y: 'wait', t: 3 },
  { x: 'stop', y: 'stop', t: 4 },
];
export const CYCLE_T = CYCLE.reduce((s, p) => s + p.t, 0);

export interface Signals {
  x: Light; y: Light;
  /** whole seconds until each direction's light changes colour (yellow counts with green) */
  xLeft: number; yLeft: number;
  phase: number;
}

export function signalsAt(t: number): Signals {
  let u = ((t % CYCLE_T) + CYCLE_T) % CYCLE_T, i = 0;
  while (u >= CYCLE[i]!.t) { u -= CYCLE[i]!.t; i++; }
  const ph = CYCLE[i]!;
  const left = (k: Group) => {
    const now = ph[k] === 'wait' ? 'go' : ph[k];   // yellow counts with green
    let s = ph.t - u;
    for (let j = 1; j < CYCLE.length; j++) {
      const q = CYCLE[(i + j) % CYCLE.length]!, c = q[k] === 'wait' ? 'go' : q[k];
      if (c !== now) break;
      s += q.t;
    }
    return Math.ceil(s);
  };
  return { x: ph.x, y: ph.y, xLeft: left('x'), yLeft: left('y'), phase: i };
}

// ---------- junctions: each cluster of signalled nodes runs its own clock ----------

/** Signalled nodes closer than this belong to one junction (a divided road crossing another is 4 nodes);
    the same distance the lanes (stop lines) and the furniture (signal posts) use. */
export const SIGNAL_CLUSTER_M = 40;

const clusterCache = new WeakMap<Network, Map<string, string>>();

/** node id → id of its junction (the smallest node id of the cluster). Grid by cell, so linear (A25). */
export function signalClusters(net: Network): Map<string, string> {
  const hit = clusterCache.get(net);
  if (hit) return hit;
  const lit = net.nodes.filter(n => n.signals).sort((a, b) => (a.id < b.id ? -1 : 1));
  const parent = new Map(lit.map(n => [n.id, n.id]));
  const root = (id: string): string => { let r = id; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(id, r); return r; };
  const cell = (v: number) => Math.floor(v / SIGNAL_CLUSTER_M);
  const grid = new Map<string, typeof lit>();
  for (const n of lit) {
    const k = `${cell(n.at[0])},${cell(n.at[1])}`, l = grid.get(k);
    if (l) l.push(n); else grid.set(k, [n]);
  }
  for (const n of lit) {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const o of grid.get(`${cell(n.at[0]) + i},${cell(n.at[1]) + j}`) ?? []) {
        if (o.id <= n.id || dist(o.at, n.at) >= SIGNAL_CLUSTER_M) continue;
        const a = root(n.id), b = root(o.id);
        if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
      }
    }
  }
  const out = new Map(lit.map(n => [n.id, root(n.id)]));
  clusterCache.set(net, out);
  return out;
}

/** a junction's phase offset in its cycle (s), seeded by its id: neighbouring junctions do not all change at once */
export function signalOffset(cluster: string): number {
  return (hash(`signal:${cluster}`) % 1000) / 1000 * CYCLE_T;
}

/** the lights of one junction at time t (no junction: the plain cycle) */
export function signalsOf(t: number, cluster: string | undefined, base = 0): Signals {
  return signalsAt(t + (cluster ? signalOffset(cluster) - base : 0));
}

// ---------- lanes ----------

export interface Lane {
  id: string;
  route: string;
  /** centre line of the lane, in the direction of travel */
  path: Vec2[];
  length: number;
  /** road height along it: [distance, z]; empty at grade */
  profile: [number, number][];
  /** where to stop, by distance along it, and for which light */
  stops: { s: number; group: Group; junction?: string }[];
  /** on a bridge or inner lane: cars only */
  carsOnly: boolean;
  /** on the outer lane of a multi-lane road: bikes only */
  bikesOnly?: boolean;
  width: number;
  /** junctions it passes (≥ 3 arms): distance along it, and half the width of the roads crossing there */
  nodes?: { node: string; s: number; cross: number }[];
  /** where a vehicle may leave it for another lane, by distance along it (ADR-061) */
  turns?: LaneTurn[];
  /** a bike / a car on it can always get out again (a long lane, or a turn leading on to one): a turn into a
      lane is only taken by a kind that can escape it, so short dead ends do not fill up (ADR-061) */
  escape?: { bike: boolean; car: boolean };
  /** every vehicle leaves it by a turn at its end (so none loops round it): no fading at either end */
  joinedStart?: boolean;
  joinedEnd?: boolean;
}

/** a turn from one lane into another across a junction, along a quadratic Bézier (ADR-061) */
export interface LaneTurn {
  node: string;
  /** index of the lane it leaves (in the list trafficLanes returns) and where along it */
  from: number;
  sOut: number;
  /** index of the lane it joins and where along it */
  to: number;
  sIn: number;
  /** start, control and end of the curve; heights at both ends */
  p0: Vec2; p1: Vec2; p2: Vec2;
  z0: number; z2: number;
  length: number;
  /** the lane ends at this junction: a vehicle there has to take one of these */
  forced: boolean;
  /** a left turn (traffic drives on the right): it gives way to the oncoming lanes in `yieldTo`, at the distance
      along each where it passes the junction */
  left: boolean;
  yieldTo: { lane: number; s: number }[];
}

const DRIVEN = new Set<Road['kind']>(['primary', 'secondary', 'tertiary', 'link', 'residential']);

export function trafficLanes(net: Network): Lane[] {
  const roads = new Map(net.roads.map(r => [r.id, r])), nodes = new Map(net.nodes.map(n => [n.id, n]));
  const clusters = signalClusters(net);
  const out: Lane[] = [];
  for (const route of net.routes) {
    if (!DRIVEN.has(route.kind)) continue;
    const parts = route.parts.map(p => ({ ...p, r: roads.get(p.road)! }));
    const waysOf = (r: Road) => (route.oneway ? r.lanes : Math.max(1, Math.floor(r.lanes / 2)));
    const offOn = (r: Road, k: number) => {
      const n = waysOf(r), j = Math.min(k, n - 1);
      return route.oneway ? -r.width / 2 + ((j + 0.5) * r.width) / n : ((j + 0.5) * (r.width / 2)) / n;
    };
    const minWays = Math.min(...parts.map(p => waysOf(p.r))), maxWays = Math.max(...parts.map(p => waysOf(p.r)));
    // the profile of a bridge route (one road on a bridge carries its own)
    const profile: [number, number][] = route.layer > 0 ? parts.flatMap(p => { const L = p.to - p.from; return (p.reversed ? p.r.profile.map(([s, z]): [number, number] => [L - s, z]).reverse() : p.r.profile).map(([s, z]): [number, number] => [s + p.from, z]); }) : [];
    const L = polylineLength(route.path);
    const mine = new Set(parts.map(p => p.road));

    const emit = (k: number, nWays: number, back: boolean, subParts: typeof parts, idSuffix: string) => {
      const s0 = subParts[0]!.from, s1 = subParts[subParts.length - 1]!.to;
      const basePath = s0 === 0 && s1 === L ? route.path : subParts.reduce<Vec2[]>((acc, p) => {
        const seg = p.reversed ? [...p.r.path].reverse() : p.r.path;
        return acc.length ? [...acc, ...seg.slice(1)] : [...seg];
      }, []);
      const baseLen = polylineLength(basePath);
      if (baseLen < 20) return;
      const sign = back ? -1 : 1;
      const dAt = (s: number) => {
        const gs = s0 + s;
        let idx = subParts.findIndex(p => gs >= p.from && gs <= p.to);
        if (idx < 0) idx = gs < s0 ? 0 : subParts.length - 1;
        const cur = subParts[idx]!, d0 = sign * offOn(cur.r, k);
        // smooth transition over ±4 m across a junction where adjacent parts have different offsets
        if (idx < subParts.length - 1 && cur.to - gs < 4) {
          const d1 = sign * offOn(subParts[idx + 1]!.r, k);
          if (Math.abs(d1 - d0) > 0.05) return d0 + (d1 - d0) * (0.5 * (1 - (cur.to - gs) / 4));
        }
        if (idx > 0 && gs - cur.from < 4) {
          const dPrev = sign * offOn(subParts[idx - 1]!.r, k);
          if (Math.abs(d0 - dPrev) > 0.05) return dPrev + (d0 - dPrev) * (0.5 * (1 + (gs - cur.from) / 4));
        }
        return d0;
      };
      let path = offset(basePath, dAt);
      if (back) path = path.reverse();
      const subProf = profile.filter(([s]) => s >= s0 - 1e-3 && s <= s1 + 1e-3).map(([s, z]): [number, number] => [s - s0, z]);
      const prof = back ? subProf.map(([s, z]): [number, number] => [baseLen - s, z]).reverse() : subProf;
      // stop before the first signalled node of each cluster, the crossing road's half width and 2.5 m short
      const subNodes = route.nodes.filter(n => n.at >= s0 - 0.5 && n.at <= s1 + 0.5);
      const passes = subNodes.map(n => ({ n: nodes.get(n.node)!, s: back ? s1 - n.at : n.at - s0 })).filter(q => q.n.signals).sort((a, b) => a.s - b.s);
      const stops: Lane['stops'] = [];
      let last: Vec2 | null = null;
      for (const { n, s } of passes) {
        if (last && dist(last, n.at) < 40) continue;
        last = n.at;
        const cross = Math.max(0, ...n.arms.filter(a => !mine.has(a.road)).map(a => a.half));
        const at = s - cross - 2.5, dir = headingAt(path, at);
        if (at > 0 && at < baseLen) stops.push({ s: at, group: Math.abs(Math.cos(dir)) >= Math.abs(Math.sin(dir)) ? 'x' : 'y', junction: clusters.get(n.id) ?? n.id });
      }
      const laneNodes: NonNullable<Lane['nodes']> = [];
      for (const n of subNodes) {
        const node = nodes.get(n.node)!;
        if (node.arms.length < 3) continue;
        const cross = Math.max(0, ...node.arms.filter(a => !mine.has(a.road)).map(a => a.half));
        laneNodes.push({ node: n.node, s: Math.max(0, Math.min(baseLen, back ? s1 - n.at : n.at - s0)), cross });
      }
      laneNodes.sort((a, b) => a.s - b.s);
      const laneW = subParts.reduce((sum, p) => sum + p.r.width / (route.oneway ? p.r.lanes : 2 * waysOf(p.r)), 0) / subParts.length;
      const carsOnly = route.layer > 0 || (nWays >= 2 && k === 0);
      const bikesOnly = route.layer === 0 && nWays >= 2 && k === nWays - 1;
      out.push({ id: `${route.id}#${idSuffix}`, route: route.id, path, length: polylineLength(path), profile: prof, stops, carsOnly, bikesOnly, width: laneW, nodes: laneNodes });
    };

    const dirs = route.oneway ? [false] : [false, true];
    let seq = 0;
    for (let k = 0; k < minWays; k++) {
      for (const back of dirs) emit(k, minWays, back, parts, `${seq++}`);
    }
    for (let k = minWays; k < maxWays; k++) {
      let i = 0;
      while (i < parts.length) {
        if (waysOf(parts[i]!.r) <= k) { i++; continue; }
        let j = i;
        while (j + 1 < parts.length && waysOf(parts[j + 1]!.r) > k) j++;
        const sub = parts.slice(i, j + 1);
        if (sub[sub.length - 1]!.to - sub[0]!.from >= 40) {
          for (const back of dirs) emit(k, k + 1, back, sub, `${seq++}`);
        }
        i = j + 1;
      }
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : 1));
  attachTurns(out);
  return out;
}

const TURN_MIN = (30 * Math.PI) / 180, TURN_MAX = (150 * Math.PI) / 180;
/** a lane at least this long may have no way out: looping round it, as before ADR-061, reads as through traffic */
const OPEN_LANE_M = 150;

/** Join lanes of different routes at the junctions they share (ADR-061). Lanes passing a node are found
    through a map by node, so this is linear in the number of lane × node passes (A25). */
export function attachTurns(lanes: Lane[]): void {
  const atNode = new Map<string, { i: number; s: number; cross: number }[]>();
  lanes.forEach((ln, i) => {
    for (const n of ln.nodes ?? []) {
      const l = atNode.get(n.node);
      if (l) l.push({ i, s: n.s, cross: n.cross }); else atNode.set(n.node, [{ i, s: n.s, cross: n.cross }]);
    }
  });
  for (const ln of lanes) { ln.turns = []; ln.joinedStart = false; ln.joinedEnd = false; }
  for (const [node, passes] of atNode) {
    for (const a of passes) {
      const L = lanes[a.i]!;
      const sOut = a.s - Math.max(3, a.cross);
      if (sOut < 5) continue;
      const forced = L.length - a.s < 8;
      const hL = laneAt(L, Math.max(0, sOut)).heading;
      for (const b of passes) {
        const M = lanes[b.i]!;
        if (M.route === L.route) continue;
        const sIn = b.s + Math.max(3, b.cross);
        if (M.length - sIn < 15) continue;
        const hM = laneAt(M, sIn).heading;
        let d = Math.abs(hM - hL) % (2 * Math.PI);
        if (d > Math.PI) d = 2 * Math.PI - d;
        if (d > TURN_MAX || (d < TURN_MIN && !forced)) continue;
        const A = laneAt(L, sOut), B = laneAt(M, sIn);
        if (Math.abs(A.z - B.z) > 0.6) continue;
        const p1 = tangentMeet(A.p, A.heading, B.p, B.heading);
        const length = bezierLength(A.p, p1, B.p);
        // x east, y south: a heading that grows turns clockwise on the map, i.e. right; less is a left turn
        let turnBy = hM - hL;
        while (turnBy > Math.PI) turnBy -= 2 * Math.PI;
        while (turnBy < -Math.PI) turnBy += 2 * Math.PI;
        const left = turnBy < 0;
        // oncoming: the other lanes of the same road that reach this junction head on
        const yieldTo = left
          ? passes.filter(o => o.i !== a.i && lanes[o.i]!.route === L.route && o.s > 10 && ang(laneAt(lanes[o.i]!, Math.max(0, o.s - 1)).heading, A.heading) > TURN_MAX).map(o => ({ lane: o.i, s: o.s }))
          : [];
        L.turns!.push({ node, from: a.i, sOut, to: b.i, sIn, p0: A.p, p1, p2: B.p, z0: A.z, z2: B.z, length, forced, left, yieldTo });
      }
    }
  }
  // never into a trap: a short lane with no way out would fill up with the vehicles turning into it (a 38 m dead
  // end took 17 in two minutes). Dropping a turn can leave another lane without its way out, so until stable.
  for (let pass = 0; pass < 8; pass++) {
    let dropped = false;
    for (const ln of lanes) {
      const keep = ln.turns!.filter(t => { const m = lanes[t.to]!; return m.turns!.length > 0 || m.length >= OPEN_LANE_M; });
      if (keep.length !== ln.turns!.length) { ln.turns = keep; dropped = true; }
    }
    if (!dropped) break;
  }
  // who can get out of each lane again, by kind: long lanes, then backwards along the turns until stable
  for (const ln of lanes) ln.escape = { bike: ln.length >= OPEN_LANE_M, car: ln.length >= OPEN_LANE_M };
  for (let changed = true; changed;) {
    changed = false;
    for (const ln of lanes) {
      const e = ln.escape!;
      if (!e.bike && ln.turns!.some(t => !lanes[t.to]!.carsOnly && lanes[t.to]!.escape!.bike)) { e.bike = true; changed = true; }
      if (!e.car && ln.turns!.some(t => !lanes[t.to]!.bikesOnly && lanes[t.to]!.escape!.car)) { e.car = true; changed = true; }
    }
  }
  for (const ln of lanes) {
    ln.turns!.sort((a, b) => a.sOut - b.sOut || a.to - b.to);
    // its end is joined only if every kind that drives on it can leave there into a lane it can escape
    const forced = ln.turns!.filter(t => t.forced).map(t => lanes[t.to]!);
    const bikesOk = ln.carsOnly || forced.some(m => !m.carsOnly && m.escape!.bike), carsOk = ln.bikesOnly || forced.some(m => !m.bikesOnly && m.escape!.car);
    ln.joinedEnd = forced.length > 0 && bikesOk && carsOk;
    // nothing loops round a lane whose end is joined, so nothing pops up at its start either: no fade there
    ln.joinedStart = ln.joinedEnd;
  }
}

/** angle between two headings, 0…π */
function ang(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

/** where the line from p along heading a meets the line into q along heading b (behind q); midpoint if they do not */
function tangentMeet(p: Vec2, a: number, q: Vec2, b: number): Vec2 {
  const ux = Math.cos(a), uy = Math.sin(a), vx = Math.cos(b), vy = Math.sin(b);
  const den = ux * vy - uy * vx, mid: Vec2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  if (Math.abs(den) < 1e-3) return mid;
  const t = ((q[0] - p[0]) * vy - (q[1] - p[1]) * vx) / den;
  const m: Vec2 = [p[0] + ux * t, p[1] + uy * t];
  return t > 0 && dist(m, mid) < 2 * dist(p, q) + 5 ? m : mid;
}

export function bezierAt(p0: Vec2, p1: Vec2, p2: Vec2, t: number): { p: Vec2; heading: number } {
  const u = 1 - t;
  const p: Vec2 = [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { p, heading: Math.atan2(dy, dx) };
}

function bezierLength(p0: Vec2, p1: Vec2, p2: Vec2): number {
  let L = 0, prev = p0;
  for (let k = 1; k <= 12; k++) { const { p } = bezierAt(p0, p1, p2, k / 12); L += dist(prev, p); prev = p; }
  return Math.max(0.5, L);
}

/** the line `d` m to the right of a path (x east, y south: right of (dx, dy) is (−dy, dx)) */
function offset(path: readonly Vec2[], d: number | ((s: number) => number)): Vec2[] {
  const r = (a: Vec2, b: Vec2): Vec2 => { const L = dist(a, b) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
  let s = 0;
  return path.map((p, i) => {
    if (i > 0) s += dist(path[i - 1]!, p);
    const di = typeof d === 'function' ? d(s) : d;
    const n0 = i > 0 ? r(path[i - 1]!, p) : r(p, path[i + 1]!), n1 = i < path.length - 1 ? r(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(3, 1 / Math.max(0.33, mx * n0[0] + my * n0[1]));
    return [p[0] + mx * di * k, p[1] + my * di * k];
  });
}

/** where a lane is at distance s: point, heading (radians) and height */
export function laneAt(lane: Lane, s: number): { p: Vec2; heading: number; z: number } {
  const path = lane.path;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    if (acc + L >= s || i === path.length - 1) {
      const t = L ? Math.max(0, Math.min(1, (s - acc) / L)) : 0;
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], heading: Math.atan2(b[1] - a[1], b[0] - a[0]), z: zOf(lane.profile, s) };
    }
    acc += L;
  }
  return { p: path[0]!, heading: 0, z: 0 };
}

const headingAt = (path: Vec2[], s: number) => laneAt({ path, profile: [] } as unknown as Lane, s).heading;

function zOf(p: [number, number][], s: number): number {
  if (!p.length) return 0;
  if (s <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) { const [a, za] = p[i - 1]!, [b, zb] = p[i]!; if (s <= b) return b === a ? zb : za + ((zb - za) * (s - a)) / (b - a); }
  return p[p.length - 1]![1];
}

// ---------- vehicles ----------

export type VehicleKind = 'bike' | 'sedan' | 'hatch' | 'taxi' | 'van';
export const VEHICLE_LEN: Record<VehicleKind, number> = { bike: 1.8, sedan: 4.4, hatch: 3.8, taxi: 4.4, van: 4.8 };
/** lateral offset of each track inside a lane (m): bikes on the two sub-tracks, cars in the middle */
export const TRACKS = [-0.55, 0, 0.55] as const;

export interface Vehicle {
  id: string;
  kind: VehicleKind;
  lane: number;
  track: 0 | 1 | 2;
  /** distance of the tail along the lane */
  s: number;
  /** cruising speed, m/s */
  v: number;
  len: number;
  /** decided at the start of yellow to go on */
  commit?: boolean;
  /** crossing a junction from one lane into another: the turn and how far along its curve the middle of the vehicle is */
  turn?: { t: LaneTurn; u: number };
  /** what it decided at the next junction ahead: leave at sOut by turn `turn` of its lane, −1 straight on,
      −2 not decided yet (the junction is still more than LOOK ahead: nothing to look up until then) */
  plan?: { sOut: number; turn: number };
  /** how many such decisions it has made (seeds the next one) */
  decisions?: number;
}

/** Starting traffic, `density` 0–1 of the full amount: per lane and track, evenly spaced, none
    on top of another. Seeded by the lane ids. */
export function spawnTraffic(lanes: readonly Lane[], density: number): Vehicle[] {
  const out: Vehicle[] = [];
  lanes.forEach((ln, i) => {
    // a lane that ends at a junction is left by turning there: nothing starts past that point (ADR-061)
    const exit = ln.joinedEnd ? Math.min(...(ln.turns ?? []).filter(t => t.forced).map(t => t.sOut)) - 1 : Infinity;
    const start = out.length;
    const r = rng(hash(`traffic:${ln.id}`));
    if (ln.carsOnly) {
      const n = Math.floor((ln.length / 26) * density), off = r.next() * ln.length;
      for (let k = 0; k < n; k++) {
        const kind: VehicleKind = r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const);
        const s = ((off + (k * ln.length) / n + (r.next() - 0.5) * 1.5) % ln.length + ln.length) % ln.length;
        out.push({ id: `${ln.id}/1/${k}`, kind, lane: i, track: 1, s, v: 5.2 + r.next() * 1.4, len: VEHICLE_LEN[kind] });
      }
    } else if (ln.bikesOnly) {
      for (const track of [0, 2] as const) {
        const n = Math.floor((ln.length / 15) * density), off = r.next() * ln.length;
        for (let k = 0; k < n; k++) {
          const s = ((off + (k * ln.length) / n + (r.next() - 0.5) * 1.5) % ln.length + ln.length) % ln.length;
          out.push({ id: `${ln.id}/${track}/${k}`, kind: 'bike', lane: i, track, s, v: 4.8 + r.next() * 3, len: VEHICLE_LEN.bike });
        }
      }
    } else {
      // Mixed lane: cars (track 1) and pairs of bikes (tracks 0 & 2) placed in alternating slots so no bike starts inside a car
      const n = Math.floor((ln.length / 15) * density), off = r.next() * ln.length;
      for (let k = 0; k < n; k++) {
        const base = off + (k * ln.length) / n;
        if (k % 3 === 0) {
          const kind: VehicleKind = r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const);
          const s = ((base + (r.next() - 0.5) * 1.2) % ln.length + ln.length) % ln.length;
          out.push({ id: `${ln.id}/1/${k}`, kind, lane: i, track: 1, s, v: 5.2 + r.next() * 1.4, len: VEHICLE_LEN[kind] });
        } else {
          for (const track of [0, 2] as const) {
            const s = ((base + (r.next() - 0.5) * 1.5) % ln.length + ln.length) % ln.length;
            out.push({ id: `${ln.id}/${track}/${k}`, kind: 'bike', lane: i, track, s, v: 4.8 + r.next() * 3, len: VEHICLE_LEN.bike });
          }
        }
      }
    }
    if (exit < Infinity) for (let k = out.length - 1; k >= start; k--) if (out[k]!.s + out[k]!.len / 2 > exit) out.splice(k, 1);
  });
  return out;
}

const GAP = { bike: 0.3, car: 0.5 } as const;   // m
const STOP_AHEAD = 0.1;                         // m: the front stops this far before the line
const EASE = 2.6;                               // 1/s: how fast speed follows the free distance ahead
const LOOK = 42;                                // m: how far ahead a stop line or a turn is minded
/** share of vehicles that turn at a junction they may also cross (ADR-061) */
export const TURN_SHARE = 0.25;
const TURN_SPEED = { bike: 5, car: 4.5 } as const;   // m/s on the curve

/** the lights a stop line sees: one state for the whole map, or one per junction */
export type SignalSource = Signals | ((junction: string | undefined) => Signals);

const isBike = (c: Vehicle) => c.kind === 'bike';
/** cars hold the middle track and overlap both bike tracks; the two bike tracks pass each other */
const overlaps = (a: Vehicle, b: Vehicle) => a.track === b.track || a.track === 1 || b.track === 1;
/** the lane a vehicle counts on for keeping distance: a turning one is already on the lane it joins */
const laneOf = (c: Vehicle) => (c.turn ? c.turn.t.to : c.lane);
/** its tail along that lane (a turning one: where it will be, minus what is left of the curve) */
const tailOf = (c: Vehicle) => (c.turn ? c.turn.t.sIn - (c.turn.t.length - c.turn.u) - c.len / 2 : c.s);
const fits = (c: Vehicle, ln: Lane) => (isBike(c) ? !ln.carsOnly && ln.escape?.bike !== false : !ln.bikesOnly && ln.escape?.car !== false);

/** the first turn of a lane leaving after distance s (turns are sorted by sOut) */
function nextTurn(turns: readonly LaneTurn[], s: number): LaneTurn | undefined {
  let lo = 0, hi = turns.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (turns[m]!.sOut <= s) lo = m + 1; else hi = m; }
  return turns[lo];
}

/** where a vehicle is: point, heading and height, on its lane or on the curve of its turn (pure; the view draws it here) */
export function vehiclePoint(c: Vehicle, lanes: readonly Lane[]): { p: Vec2; heading: number; z: number } {
  if (c.turn) {
    const { t, u } = c.turn, k = Math.max(0, Math.min(1, u / t.length)), b = bezierAt(t.p0, t.p1, t.p2, k);
    return { p: b.p, heading: b.heading, z: t.z0 + (t.z2 - t.z0) * k };
  }
  const ln = lanes[c.lane]!;
  return laneAt(ln, (c.s + c.len / 2) % ln.length);
}

/** Advance every vehicle by dt seconds. `prev` is the signal state of the previous step (for the
    yellow decision). Either may be per junction (signalsOf). `obstacleAhead` gives the free distance to
    something outside the model in front of a vehicle (the player's car), Infinity when nothing is.
    Vehicles turn at junctions (ADR-061). Mutates and returns `vehicles`. */
export function stepTraffic(vehicles: Vehicle[], lanes: readonly Lane[], sig: SignalSource, prev: SignalSource | null, dt: number, obstacleAhead?: (c: Vehicle) => number): Vehicle[] {
  const at = (src: SignalSource, j: string | undefined) => (typeof src === 'function' ? src(j) : src);
  // by index, in typed arrays: one Map lookup per vehicle and per question made a step 6× slower (A25)
  const n = vehicles.length, laneIx = new Int32Array(n), tail = new Float64Array(n), slot = new Int32Array(n);
  const byLane = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const c = vehicles[i]!;
    laneIx[i] = laneOf(c);
    tail[i] = tailOf(c);
    const g = byLane.get(laneIx[i]!);
    if (g) g.push(i); else byLane.set(laneIx[i]!, [i]);
  }
  for (const g of byLane.values()) { g.sort((a, b) => tail[a]! - tail[b]!); g.forEach((v, k) => { slot[v] = k; }); }
  const count = (l: number) => byLane.get(l)?.length ?? 0;
  /** an optional turn only into a lane no denser than the one it leaves, and not near full (one per 10 m): a
      short lane cannot soak up the traffic of the long ones it meets (ADR-061) */
  const roomIn = (from: number, to: number) => {
    const Lf = lanes[from]!.length, Lt = lanes[to]!.length;
    return count(to) / Lt <= count(from) / Lf && count(to) + 1 <= Math.max(2, Lt / 10);
  };
  /** free distance ahead of vehicle i on the lane it counts on: the group is sorted by tail, so the nearest one
      ahead in an overlapping track is found by walking forward from it (wrapping round the loop) */
  const freeAhead = (i: number): number => {
    const c = vehicles[i]!, g = byLane.get(laneIx[i]!)!, L = lanes[laneIx[i]!]!.length, i0 = slot[i]!, cTail = tail[i]!;
    for (let k = 1; k < g.length; k++) {
      const j = g[(i0 + k) % g.length]!;
      if (!overlaps(c, vehicles[j]!)) continue;
      const d = ((tail[j]! - cTail) % L + L) % L;
      if (d > 0) return d - c.len - (isBike(c) ? GAP.bike : GAP.car);
    }
    return Infinity;
  };
  /** nothing on lane l near where vehicle i would come in at sIn (binary search into the sorted group) */
  const clearAt = (i: number, l: number, sIn: number) => {
    const g = byLane.get(l);
    if (!g) return true;
    const c = vehicles[i]!, reach = c.len / 2 + 3 + 6;   // the longest vehicle is 4.8 m
    let lo = 0, hi = g.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tail[g[m]!]! < sIn - reach - 6) lo = m + 1; else hi = m; }
    for (let k = lo; k < g.length && tail[g[k]!]! <= sIn + reach; k++) {
      const j = g[k]!, q = vehicles[j]!;
      if (j !== i && overlaps(c, q) && Math.abs(tail[j]! + q.len / 2 - sIn) < (q.len + c.len) / 2 + 3) return false;
    }
    return true;
  };

  /** a left turn waits while a vehicle going straight on comes the other way: 20 m short of the junction to
      8 m past it. One that is itself turning at that junction does not count, so two left turns facing each
      other go together instead of waiting for ever (ADR-061) */
  const oncoming = (t: LaneTurn) => t.yieldTo.some(y => {
    const g = byLane.get(y.lane);
    if (!g) return false;
    let lo = 0, hi = g.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tail[g[m]!]! < y.s - 26) lo = m + 1; else hi = m; }
    for (let k = lo; k < g.length && tail[g[k]!]! <= y.s + 8; k++) {
      const q = vehicles[g[k]!]!;
      if (q.turn || q.lane !== y.lane) continue;
      const turning = q.plan && q.plan.turn >= 0 && lanes[q.lane]!.turns![q.plan.turn]!.node === t.node;
      if (turning) continue;
      const toNode = y.s - (tail[g[k]!]! + q.len);
      if (toNode < 20 && toNode > -8) return true;
    }
    return false;
  });

  const speed = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const c = vehicles[i]!;
    const front = c.s + c.len, mid = c.s + c.len / 2;
    let free: number;
    if (c.turn) {
      free = Math.min(freeAhead(i), (isBike(c) ? TURN_SPEED.bike : TURN_SPEED.car) / EASE);
    } else {
      const ln = lanes[c.lane]!;
      free = freeAhead(i);
      // the next stop line ahead, and its light
      const stop = ln.stops.find(st => st.s - STOP_AHEAD - front >= -0.01 && st.s - front < LOOK);
      if (stop) {
        const light = at(sig, stop.junction)[stop.group], was = prev ? at(prev, stop.junction)[stop.group] : undefined, toLine = stop.s - STOP_AHEAD - front;
        if (light === 'go') c.commit = true;
        else if (light === 'wait' && was !== 'wait') c.commit = toLine < c.v * 0.8;
        else if (light === 'stop' && was !== 'stop') c.commit = false;
        if (light !== 'go' && c.commit !== true) free = Math.min(free, toLine);
      } else c.commit = undefined;
      // the next junction ahead: decide once whether to turn there (ADR-061)
      if (c.plan && (c.plan.sOut < mid - 1 || (c.plan.turn !== -2 && c.plan.sOut - mid > LOOK + 5))) c.plan = undefined;
      if (c.plan?.turn === -2 && c.plan.sOut - mid < LOOK) c.plan = undefined;
      if (!c.plan && ln.turns?.length) {
        const next = nextTurn(ln.turns, mid);
        if (next && next.sOut - mid >= LOOK) c.plan = { sOut: next.sOut, turn: -2 };
        else if (next) {
          const options: { t: LaneTurn; k: number }[] = [];
          ln.turns!.forEach((t, k) => { if (t.node === next.node && fits(c, lanes[t.to]!)) options.push({ t, k }); });
          const r = rng(hash(`turn:${c.id}:${c.decisions ?? 0}`));
          c.decisions = (c.decisions ?? 0) + 1;
          const take = options.length > 0 && (next.forced || r.next() < TURN_SHARE);
          c.plan = { sOut: next.sOut, turn: take ? options[Math.floor(r.next() * options.length)]!.k : -1 };
        }
      }
      if (c.plan && c.plan.turn >= 0) {
        const t = ln.turns![c.plan.turn]!;
        // slow to the curve's speed by the time it leaves the lane
        free = Math.min(free, c.plan.sOut - mid + (isBike(c) ? TURN_SPEED.bike : TURN_SPEED.car) / EASE);
        if (t.left && mid > t.sOut - 3 && oncoming(t)) {
          free = Math.min(free, c.plan.sOut - mid);                 // give way to the oncoming traffic, then turn
        } else if (!clearAt(i, t.to, t.sIn) || (!t.forced && !roomIn(c.lane, t.to))) {
          if (t.forced) free = Math.min(free, c.plan.sOut - mid);   // wait for a gap: the lane ends here
          else c.plan.turn = -1;                                    // go straight on instead
        }
      }
    }
    if (obstacleAhead) free = Math.min(free, obstacleAhead(c));
    speed[i] = Math.min(c.v, Math.max(0, free) * EASE);
  }

  for (let i = 0; i < n; i++) {
    const c = vehicles[i]!, ds = speed[i]! * dt;
    if (c.turn) {
      c.turn.u += ds;
      if (c.turn.u >= c.turn.t.length) {
        const t = c.turn.t;
        c.lane = t.to;
        c.s = t.sIn + (c.turn.u - t.length) - c.len / 2;
        c.turn = undefined;
        c.commit = undefined;
      }
      continue;
    }
    const ln = lanes[c.lane]!;
    const mid = c.s + c.len / 2 + ds;
    if (c.plan && c.plan.turn >= 0 && mid >= c.plan.sOut) {
      c.turn = { t: ln.turns![c.plan.turn]!, u: mid - c.plan.sOut };
      c.plan = undefined;
      continue;
    }
    const next = (c.s + ds) % ln.length;
    if (next < c.s) c.plan = undefined;   // round the loop: the junctions ahead start over
    c.s = next;
  }
  return vehicles;
}
