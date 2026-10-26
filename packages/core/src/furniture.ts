/* Street furniture by rule (docs/architecture/city-model.md §8, ADR-037): what OSM rarely maps here
   (poles, wires, lamps, trees) placed along the sidewalks of the road network, and a signal post on
   every approach of a junction with traffic lights. Seeded by road ids: the same city always gets
   the same furniture. Data the map does have (OSM trees, lamps, poles) comes in as Features and is
   kept as is.
   All along runs (whole streets followed through their junctions, network.ts).
     - power poles: every 32 m on one side of a street (the outer side of each one-way carriageway),
       0.4 m in from the kerb; wires between neighbouring poles (3–6 strands), across an alley mouth
       too (a span of up to 62 m, one pole skipped);
     - street lamps: on main roads a lamp post half-way between poles; elsewhere a lamp on each pole;
     - trees: every 8–11 m (one in ten left out) in the middle of sidewalks 2.5 m wide or more,
       1.5 m clear of poles and lamps; large on sidewalks of 3.5 m and up;
     - signals: one post per approach of a signalled junction, on the drivers' right, facing them,
       in phase group 'x' (along x) or 'y'. Approaches inside a cluster of signalled nodes (a divided
       road crossing another) get none: their lights are the cluster's outer ones.
     - park lamps: a low post with a globe every 14 m along the paths of each park (or a ring 3 m in
       from its edge when no path is mapped), lit with the street lamps.
   Nothing stands within reach of a junction (the corner fillets and crossings), nor on any road's
   carriageway (where two carriageways converge, one's kerb is inside the other). Pure. */
import type { City } from './city';
import { closestOnPath, dist, pointInRing, polylineLength, type Vec2 } from './geom';
import { roadNetwork, type Network } from './network';
import { hash, rng } from './rng';
import { signalClusters } from './traffic';

export type PropKind = 'pole' | 'lamp' | 'lamp-on-pole' | 'tree' | 'signal' | 'park-lamp';

export interface Prop {
  id: string;
  kind: PropKind;
  at: Vec2;
  /** ground height under it (sidewalk top) */
  z0: number;
  /** direction it faces (radians, atan2 in x/y): toward the road for lamps, toward traffic for signals */
  heading: number;
  size?: 'small' | 'medium' | 'large';
  /** signals: which phase group, and which junction's clock (signalClusters) */
  group?: 'x' | 'y';
  junction?: string;
  road: string;
}

export interface Wire { id: string; from: string; to: string; strands: number }

export interface Furniture { props: Prop[]; wires: Wire[] }

const WALK_Z = 0.25;
const MAIN = new Set(['primary', 'secondary', 'tertiary']);

const furnitureCache = new WeakMap<City, Furniture>();

/** hand over a result worked out elsewhere (a Web Worker) so `streetFurniture(city)` returns it at once */
export function primeFurniture(city: City, f: Furniture) { furnitureCache.set(city, f); }

export function streetFurniture(city: City, net: Network = roadNetwork(city)): Furniture {
  const cached = furnitureCache.get(city);
  if (cached) return cached;
  const props: Prop[] = [], wires: Wire[] = [];
  const atGrade = net.roads.filter(r => r.layer === 0);
  // a grid of road *segments* (not whole roads): a query used to walk the full path of every road in its cell
  type Seg = { ax: number; ay: number; bx: number; by: number; lim2: number };
  const roadGrid = new Map<string, Seg[]>();
  for (const r of atGrade) {
    const pad = r.width / 2 + 1, lim = r.width / 2 + 0.3;
    for (let k = 1; k < r.path.length; k++) {
      const [ax, ay] = r.path[k - 1]!, [bx, by] = r.path[k]!;
      const seg: Seg = { ax, ay, bx, by, lim2: lim * lim };
      const gx0 = Math.floor((Math.min(ax, bx) - pad) / 32), gx1 = Math.floor((Math.max(ax, bx) + pad) / 32);
      const gy0 = Math.floor((Math.min(ay, by) - pad) / 32), gy1 = Math.floor((Math.max(ay, by) + pad) / 32);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const key = `${gx},${gy}`;
        const cell = roadGrid.get(key);
        if (cell) cell.push(seg); else roadGrid.set(key, [seg]);
      }
    }
  }
  const onRoad = (p: Vec2) => {
    const cell = roadGrid.get(`${Math.floor(p[0] / 32)},${Math.floor(p[1] / 32)}`);
    if (!cell) return false;
    for (const g of cell) {
      const dx = g.bx - g.ax, dy = g.by - g.ay, L2 = dx * dx + dy * dy;
      const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((p[0] - g.ax) * dx + (p[1] - g.ay) * dy) / L2)) : 0;
      const ex = p[0] - g.ax - dx * t, ey = p[1] - g.ay - dy * t;
      if (ex * ex + ey * ey < g.lim2) return true;
    }
    return false;
  };

  const roadOf = new Map(net.roads.map(r => [r.id, r])), nodeOf = new Map(net.nodes.map(n => [n.id, n]));
  const metroStations = city.stations.filter(st => st.kind === 'metro');
  const nearMetroStation = (p: Vec2) => metroStations.some(st => dist(p, st.at) < 48);
  // along whole streets (runs), so poles and wires carry on across the alleys that cut them
  for (const run of net.runs) {
    if (run.layer > 0) continue;
    const L = polylineLength(run.path), at = sampler(run.path), mine = new Set(run.parts.map(p => p.road));
    /** the road under distance s, with its sidewalks as seen along the run */
    const here = (s: number) => {
      const part = run.parts.find(p => s >= p.from && s <= p.to) ?? run.parts[run.parts.length - 1]!, r = roadOf.get(part.road)!;
      return { r, right: part.reversed ? r.sidewalk.left : r.sidewalk.right, left: part.reversed ? r.sidewalk.right : r.sidewalk.left };
    };
    // stay clear of every junction on the run: the crossing roads' half widths, the kerb fillet (4 m,
    // 2 m for an alley or service road) and a metre
    const clear = run.nodes.map(({ node, at: s }) => {
      const others = nodeOf.get(node)!.arms.filter(o => !mine.has(o.road));
      const minor = others.every(o => { const k = roadOf.get(o.road)!.kind; return k === 'alley' || k === 'service'; });
      return { s, d: Math.max(0, ...others.map(o => o.half)) + (minor ? 2 : 4) + 1 };
    });
    const free = (s: number) => s > 2 && s < L - 2 && clear.every(c => Math.abs(s - c.s) > c.d);
    /** the first free spot at or a little after s (up to 10 m), or −1 */
    const spot = (s: number) => { for (let t = s; t < s + 10 && t < L - 2; t += 0.5) if (free(t)) return t; return -1; };
    const R = rng(hash(`furniture:${run.id}`));
    const poleSide: 1 | -1 = run.oneway ? 1 : R.chance(0.5) ? 1 : -1;
    for (const side of [1, -1] as const) {
      const taken: number[] = [];
      const shape = (s: number) => { const h = here(s), w = side > 0 ? h.right : h.left; return { r: h.r, w, kerb: side * (h.r.width / 2 + 0.4), mid: side * (h.r.width / 2 + w / 2) }; };
      // poles and their wires, on one side only
      if (side === poleSide) {
        let prev: Prop | null = null;
        for (let s0 = 8 + R.next() * 6; s0 < L - 2; s0 += 32) {
          const s = spot(s0);
          if (s < 0) continue;
          const k = shape(s);
          if (k.w < 1.5) continue;
          const { p, h } = at(s, k.kerb);
          if (onRoad(p) || nearMetroStation(p)) continue;
          const pole: Prop = { id: `p-${run.id}-${side}-${Math.round(s)}`, kind: 'pole', at: p, z0: WALK_Z, heading: h - side * Math.PI / 2, road: k.r.id };
          props.push(pole); taken.push(s);
          if (!MAIN.has(run.kind)) props.push({ ...pole, id: `l-${pole.id}`, kind: 'lamp-on-pole' });
          if (prev && dist(prev.at, pole.at) < 62) wires.push({ id: `w-${prev.id}`, from: prev.id, to: pole.id, strands: 3 + (hash(pole.id) % 4) });
          prev = pole;
        }
      }
      // lamp posts on main streets, half-way between pole positions, both sides
      if (MAIN.has(run.kind)) for (let s0 = 24; s0 < L - 2; s0 += 32) {
        const s = spot(s0);
        if (s < 0 || taken.some(t => Math.abs(t - s) < 4)) continue;
        const k = shape(s);
        if (k.w < 1.5) continue;
        const { p, h } = at(s, k.kerb);
        if (onRoad(p) || nearMetroStation(p)) continue;
        props.push({ id: `L-${run.id}-${side}-${Math.round(s)}`, kind: 'lamp', at: p, z0: WALK_Z, heading: h - side * Math.PI / 2, road: k.r.id });
        taken.push(s);
      }
      // trees in the middle of wide sidewalks
      for (let s = 4 + R.next() * 5; s < L - 2; s += 8 + R.next() * 3) {
        const k = shape(s);
        // a tree stands mid-sidewalk, a pole at the kerb: they only need 1.5 m along the street
        if (k.w < 2.5 || !free(s) || taken.some(t => Math.abs(t - s) < 1.5) || R.chance(0.1)) continue;
        const { p } = at(s, k.mid);
        if (onRoad(p) || nearMetroStation(p)) continue;
        props.push({ id: `t-${run.id}-${side}-${Math.round(s)}`, kind: 'tree', at: p, z0: WALK_Z, heading: 0, size: k.w >= 3.5 ? 'large' : 'medium', road: k.r.id });
      }
    }
  }

  // park lamps and shade trees inside parks and gardens
  const parks = city.areas.filter(a => a.kind === 'park');
  const paths = city.streets.filter(s => (s.kind === 'footway' || s.kind === 'steps') && s.layer === 0).map(fw => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of fw.path) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { fw, x0: x0 - 4, y0: y0 - 4, x1: x1 + 4, y1: y1 + 4 };
  });
  const waterBoxes = city.areas.filter(a => a.kind === 'water' || a.kind === 'pool').map(area => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of area.polygon) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { area, x0, y0, x1, y1 };
  });
  for (const park of parks) {
    let px0 = Infinity, py0 = Infinity, px1 = -Infinity, py1 = -Infinity;
    for (const [x, y] of park.polygon) { if (x < px0) px0 = x; if (y < py0) py0 = y; if (x > px1) px1 = x; if (y > py1) py1 = y; }
    const parkPaths = paths.filter(b => b.x1 >= px0 && b.x0 <= px1 && b.y1 >= py0 && b.y0 <= py1);
    const onPath = (p: Vec2) => parkPaths.some(b =>
      p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1 &&
      closestOnPath(p, b.fw.path).d < b.fw.width / 2 + 1.2,
    );
    let n = 0;
    const treeGrid = new Map<string, Vec2[]>();   // 7 m cells: spacing test without comparing with every tree
    const tooClose = (p: Vec2) => {
      const gx = Math.floor(p[0] / 7), gy = Math.floor(p[1] / 7);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (treeGrid.get(`${gx + dx},${gy + dy}`)?.some(q => dist(p, q) < 7)) return true;
      return false;
    };
    const addParkTree = (id: string, p: Vec2, large: boolean) => {
      if (p[0] < px0 || p[0] > px1 || p[1] < py0 || p[1] > py1) return;
      if (!pointInRing(p, park.polygon) || onRoad(p) || onPath(p) || tooClose(p)) return;
      const cell = `${Math.floor(p[0] / 7)},${Math.floor(p[1] / 7)}`;
      treeGrid.set(cell, [...(treeGrid.get(cell) ?? []), p]);
      props.push({ id, kind: 'tree', at: p, z0: 0.03, heading: 0, size: large ? 'large' : 'medium', road: park.id });
    };
    for (const { fw } of parkPaths) {
      const L = polylineLength(fw.path), at = sampler(fw.path);
      for (let s = 3; s < L - 2; s += 14) {
        const side = n % 2 ? 1 : -1, { p } = at(s, side * (fw.width / 2 + 0.6));
        if (p[0] < px0 || p[0] > px1 || p[1] < py0 || p[1] > py1 || !pointInRing(p, park.polygon) || onRoad(p)) continue;
        props.push({ id: `g-${park.id}-${fw.id}-${Math.round(s)}`, kind: 'park-lamp', at: p, z0: 0.05, heading: 0, road: fw.id });
        addParkTree(`pt-${park.id}-${fw.id}-${Math.round(s)}`, at(s, -side * (fw.width / 2 + 2.8)).p, n % 3 !== 0);
        n++;
      }
    }
    const ring = park.polygon, L = polylineLength([...ring, ring[0]!]), at = sampler([...ring, ring[0]!]);
    // only the water that touches this park, and a bounding-box test before each point-in-polygon: the
    // river and Hồ Tây have thousands of points and used to be tried for every tree of every park
    const parkWater = waterBoxes.filter(w => w.x1 >= px0 && w.x0 <= px1 && w.y1 >= py0 && w.y0 <= py1);
    const inHoleOrWater = (p: Vec2) => {
      if (park.holes?.some(h => pointInRing(p, h))) return true;
      return parkWater.some(w => p[0] >= w.x0 && p[0] <= w.x1 && p[1] >= w.y0 && p[1] <= w.y1 && pointInRing(p, w.area.polygon) && !(w.area.holes?.some(h => pointInRing(p, h))));
    };
    for (let s = 5; s < L; s += 15) {
      // 3 m inside for lamps (when no paths), 4.8 m inside for park perimeter shade trees
      if (n === 0) {
        const a = at(s, 3).p, b = at(s, -3).p, p = pointInRing(a, ring) ? a : b;
        if (pointInRing(p, ring) && !inHoleOrWater(p) && !onRoad(p)) props.push({ id: `g-${park.id}-ring-${Math.round(s)}`, kind: 'park-lamp', at: p, z0: 0.05, heading: 0, road: park.id });
      }
      const ta = at(s + 4, 4.8).p, tb = at(s + 4, -4.8).p, tp = pointInRing(ta, ring) ? ta : tb;
      if (!inHoleOrWater(tp)) addParkTree(`pt-${park.id}-ring-${Math.round(s)}`, tp, true);
    }
    const pw = px1 - px0, pd = py1 - py0;
    if (pw >= 24 && pd >= 24) {
      const step = pw * pd > 180000 ? 22 : pw * pd > 40000 ? 18 : 14;
      const PR = rng(hash(`park-grove:${park.id}`));
      let groveIdx = 0;
      for (let gx = px0 + step * 0.6; gx < px1 - step * 0.4; gx += step) {
        for (let gy = py0 + step * 0.6; gy < py1 - step * 0.4; gy += step) {
          const jx = (PR.next() - 0.5) * step * 0.65;
          const jy = (PR.next() - 0.5) * step * 0.65;
          if (PR.chance(0.18)) continue;
          const pt: Vec2 = [Math.round((gx + jx) * 10) / 10, Math.round((gy + jy) * 10) / 10];
          if (!inHoleOrWater(pt)) addParkTree(`pt-${park.id}-grove-${groveIdx++}`, pt, PR.chance(0.62));
        }
      }
    }
  }

  // signals: one post per approach, outside the cluster of signalled nodes
  const lit = net.nodes.filter(n => n.signals);
  const junctionOf = signalClusters(net);
  for (const n of lit) for (const a of n.arms) {
    const r = roadOf.get(a.road)!;
    if (r.layer > 0 || a.half < 2.5) continue;
    if (r.oneway && a.dir > 0) continue;   // traffic leaves the node along this arm
    const inside = lit.some(o => o !== n && dist(o.at, n.at) < 40 && ((o.at[0] - n.at[0]) * a.u[0] + (o.at[1] - n.at[1]) * a.u[1]) / (dist(o.at, n.at) || 1) > 0.8);
    if (inside) continue;
    // on the drivers' right: they come toward the node, i.e. along −u, so their right is the arm's left
    const back = Math.max(0, ...n.arms.filter(o => o.road !== a.road).map(o => o.half)) + 3, off = a.half + 0.6;
    const left: Vec2 = [a.u[1], -a.u[0]];
    const p: Vec2 = [n.at[0] + a.u[0] * back + left[0] * off, n.at[1] + a.u[1] * back + left[1] * off];
    if (onRoad(p)) continue;
    props.push({ id: `s-${n.id}-${a.road}-${a.dir}`, kind: 'signal', at: p, z0: WALK_Z, heading: Math.atan2(a.u[1], a.u[0]), group: Math.abs(a.u[0]) >= Math.abs(a.u[1]) ? 'x' : 'y', junction: junctionOf.get(n.id) ?? n.id, road: r.id });
  }

  const res: Furniture = { props: props.sort((a, b) => (a.id < b.id ? -1 : 1)), wires: wires.sort((a, b) => (a.id < b.id ? -1 : 1)) };
  furnitureCache.set(city, res);
  return res;
}

/** point at distance s along a path, `off` metres to its right, and the path's heading there */
function sampler(path: readonly Vec2[]) {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1]! + dist(path[i - 1]!, path[i]!));
  return (s: number, off: number): { p: Vec2; h: number } => {
    let i = 1;
    while (i < path.length - 1 && cum[i]! < s) i++;
    const a = path[i - 1]!, b = path[i]!, L = cum[i]! - cum[i - 1]! || 1, t = (s - cum[i - 1]!) / L;
    const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
    return { p: [a[0] + (b[0] - a[0]) * t - dy * off, a[1] + (b[1] - a[1]) * t + dx * off], h: Math.atan2(dy, dx) };
  };
}
