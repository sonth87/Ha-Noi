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
  stops: { s: number; group: Group }[];
  /** on a bridge: cars only */
  carsOnly: boolean;
  width: number;
}

const DRIVEN = new Set<Road['kind']>(['primary', 'secondary', 'tertiary', 'link', 'residential']);

export function trafficLanes(net: Network): Lane[] {
  const roads = new Map(net.roads.map(r => [r.id, r])), nodes = new Map(net.nodes.map(n => [n.id, n]));
  const out: Lane[] = [];
  for (const route of net.routes) {
    if (!DRIVEN.has(route.kind)) continue;
    const parts = route.parts.map(p => roads.get(p.road)!), first = parts[0]!;
    const width = parts.reduce((s, r) => s + r.width, 0) / parts.length, lanes = first.lanes;
    // the profile of a bridge route (one road on a bridge carries its own)
    const profile: [number, number][] = route.layer > 0 ? route.parts.flatMap(p => { const r = roads.get(p.road)!, L = p.to - p.from; return (p.reversed ? r.profile.map(([s, z]): [number, number] => [L - s, z]).reverse() : r.profile).map(([s, z]): [number, number] => [s + p.from, z]); }) : [];
    const L = polylineLength(route.path);
    const ways: { off: number; back: boolean }[] = [];
    if (route.oneway) for (let k = 0; k < lanes; k++) ways.push({ off: -width / 2 + ((k + 0.5) * width) / lanes, back: false });
    else {
      const half = Math.max(1, Math.floor(lanes / 2));
      for (let k = 0; k < half; k++) { const off = ((k + 0.5) * width) / 2 / half; ways.push({ off, back: false }, { off, back: true }); }
    }
    ways.forEach(({ off, back }, k) => {
      let path = offset(route.path, off);
      if (back) path = path.reverse();
      const prof = back ? profile.map(([s, z]): [number, number] => [L - s, z]).reverse() : profile;
      // stop before the first signalled node of each cluster, the crossing road's half width and 2.5 m short
      const passes = route.nodes.map(n => ({ n: nodes.get(n.node)!, s: back ? L - n.at : n.at })).filter(q => q.n.signals).sort((a, b) => a.s - b.s);
      const stops: Lane['stops'] = [];
      let last: Vec2 | null = null;
      for (const { n, s } of passes) {
        if (last && dist(last, n.at) < 40) continue;
        last = n.at;
        const mine = new Set(route.parts.map(p => p.road)), cross = Math.max(0, ...n.arms.filter(a => !mine.has(a.road)).map(a => a.half));
        const at = s - cross - 2.5, dir = headingAt(path, at);
        if (at > 0) stops.push({ s: at, group: Math.abs(Math.cos(dir)) >= Math.abs(Math.sin(dir)) ? 'x' : 'y' });
      }
      out.push({ id: `${route.id}#${k}`, route: route.id, path, length: polylineLength(path), profile: prof, stops, carsOnly: route.layer > 0, width: width / Math.max(1, route.oneway ? lanes : ways.length / 2) });
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** the line `d` m to the right of a path (x east, y south: right of (dx, dy) is (−dy, dx)) */
function offset(path: readonly Vec2[], d: number): Vec2[] {
  const r = (a: Vec2, b: Vec2): Vec2 => { const L = dist(a, b) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
  return path.map((p, i) => {
    const n0 = i > 0 ? r(path[i - 1]!, p) : r(p, path[i + 1]!), n1 = i < path.length - 1 ? r(p, path[i + 1]!) : n0;
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const L = Math.hypot(mx, my) || 1; mx /= L; my /= L;
    const k = Math.min(3, 1 / Math.max(0.33, mx * n0[0] + my * n0[1]));
    return [p[0] + mx * d * k, p[1] + my * d * k];
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
/** lateral offset of each track inside a lane (m): bikes on the edges, cars in the middle */
export const TRACKS = [-0.95, 0, 0.95] as const;

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
}

/** Starting traffic, `density` 0–1 of the full amount: per lane and track, evenly spaced, none
    inside a stop zone. Seeded by the lane ids. */
export function spawnTraffic(lanes: readonly Lane[], density: number): Vehicle[] {
  const out: Vehicle[] = [];
  lanes.forEach((ln, i) => {
    const r = rng(hash(`traffic:${ln.id}`));
    // spacing at full density: a bike every 15 m on each edge track, a car every 32 m in the middle
    const tracks: [0 | 1 | 2, number, boolean][] = ln.carsOnly ? [[1, 32, false]] : [[0, 15, true], [2, 15, true], [1, 32, false]];
    for (const [track, spacing, bikes] of tracks) {
      const n = Math.floor((ln.length / spacing) * density);
      const off = r.next() * ln.length;
      for (let k = 0; k < n; k++) {
        const kind: VehicleKind = bikes ? 'bike' : r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const);
        const s = (off + (k * ln.length) / n + (r.next() - 0.5) * 2) % ln.length;
        out.push({ id: `${ln.id}/${track}/${k}`, kind, lane: i, track, s, v: bikes ? 4.8 + r.next() * 3 : 5.2 + r.next() * 1.4, len: VEHICLE_LEN[kind] });
      }
    }
  });
  return out;
}

const GAP = { bike: 0.3, car: 0.5 } as const;   // m
const STOP_AHEAD = 0.1;                         // m: the front stops this far before the line
const EASE = 2.6;                               // 1/s: how fast speed follows the free distance ahead
const LOOK = 42;                                // m: how far ahead a stop line is minded

/** Advance every vehicle by dt seconds. `prev` is the signal state of the previous step (for the
    yellow decision). Mutates and returns `vehicles`. */
export function stepTraffic(vehicles: Vehicle[], lanes: readonly Lane[], sig: Signals, prev: Signals | null, dt: number): Vehicle[] {
  const groups = new Map<string, Vehicle[]>();
  for (const c of vehicles) {
    const k = `${c.lane}:${c.track}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(c);
  }
  const speed = new Map<Vehicle, number>();
  for (const g of groups.values()) {
    const ln = lanes[g[0]!.lane]!, L = ln.length;
    g.sort((a, b) => a.s - b.s);
    g.forEach((c, i) => {
      const front = c.s + c.len;
      let free = Infinity;
      if (g.length > 1) {
        const ahead = g[(i + 1) % g.length]!;
        free = ((ahead.s - front) % L + L) % L - (c.len < 3 ? GAP.bike : GAP.car);
      }
      // the next stop line ahead, and its light
      const stop = ln.stops.find(st => st.s - STOP_AHEAD - front >= -0.01 && st.s - front < LOOK);
      if (stop) {
        const light = sig[stop.group], was = prev?.[stop.group], toLine = stop.s - STOP_AHEAD - front;
        if (light === 'go') c.commit = true;
        else if (light === 'wait' && was !== 'wait') c.commit = toLine < c.v * 0.8;
        else if (light === 'stop' && was !== 'stop') c.commit = false;
        if (light !== 'go' && c.commit !== true) free = Math.min(free, toLine);
      } else c.commit = undefined;
      speed.set(c, Math.min(c.v, Math.max(0, free) * EASE));
    });
  }
  for (const c of vehicles) c.s = (c.s + speed.get(c)! * dt) % lanes[c.lane]!.length;
  return vehicles;
}
