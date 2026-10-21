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
  /** signals: which phase group */
  group?: 'x' | 'y';
  road: string;
}

export interface Wire { id: string; from: string; to: string; strands: number }

export interface Furniture { props: Prop[]; wires: Wire[] }

const WALK_Z = 0.25;
const MAIN = new Set(['primary', 'secondary', 'tertiary']);

export function streetFurniture(city: City, net: Network = roadNetwork(city)): Furniture {
  const props: Prop[] = [], wires: Wire[] = [];
  const atGrade = net.roads.filter(r => r.layer === 0);
  const onRoad = (p: Vec2) => atGrade.some(r => closestOnPath(p, r.path).d < r.width / 2 + 0.3);

  const roadOf = new Map(net.roads.map(r => [r.id, r])), nodeOf = new Map(net.nodes.map(n => [n.id, n]));
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
          if (onRoad(p)) continue;
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
        if (onRoad(p)) continue;
        props.push({ id: `L-${run.id}-${side}-${Math.round(s)}`, kind: 'lamp', at: p, z0: WALK_Z, heading: h - side * Math.PI / 2, road: k.r.id });
        taken.push(s);
      }
      // trees in the middle of wide sidewalks
      for (let s = 4 + R.next() * 5; s < L - 2; s += 8 + R.next() * 3) {
        const k = shape(s);
        // a tree stands mid-sidewalk, a pole at the kerb: they only need 1.5 m along the street
        if (k.w < 2.5 || !free(s) || taken.some(t => Math.abs(t - s) < 1.5) || R.chance(0.1)) continue;
        const { p } = at(s, k.mid);
        if (onRoad(p)) continue;
        props.push({ id: `t-${run.id}-${side}-${Math.round(s)}`, kind: 'tree', at: p, z0: WALK_Z, heading: 0, size: k.w >= 3.5 ? 'large' : 'medium', road: k.r.id });
      }
    }
  }

  // park lamps: a low lamp post every 14 m along the paths inside parks and gardens, sides
  // alternating; a park with no mapped path gets a ring of them 3 m in from its edge
  const parks = city.areas.filter(a => a.kind === 'park');
  const paths = city.streets.filter(s => (s.kind === 'footway' || s.kind === 'steps') && s.layer === 0);
  for (const park of parks) {
    let n = 0;
    for (const fw of paths) {
      const L = polylineLength(fw.path), at = sampler(fw.path);
      for (let s = 3; s < L - 2; s += 14) {
        const side = n % 2 ? 1 : -1, { p } = at(s, side * (fw.width / 2 + 0.6));
        if (!pointInRing(p, park.polygon) || onRoad(p)) continue;
        props.push({ id: `g-${park.id}-${fw.id}-${Math.round(s)}`, kind: 'park-lamp', at: p, z0: 0.05, heading: 0, road: fw.id });
        n++;
      }
    }
    if (n > 0) continue;
    const ring = park.polygon, L = polylineLength([...ring, ring[0]!]), at = sampler([...ring, ring[0]!]);
    for (let s = 5; s < L; s += 15) {
      // 3 m inside: try either side of the edge, keep the one in the park
      const a = at(s, 3).p, b = at(s, -3).p, p = pointInRing(a, ring) ? a : b;
      if (!pointInRing(p, ring) || onRoad(p)) continue;
      props.push({ id: `g-${park.id}-ring-${Math.round(s)}`, kind: 'park-lamp', at: p, z0: 0.05, heading: 0, road: park.id });
    }
  }

  // signals: one post per approach, outside the cluster of signalled nodes
  const lit = net.nodes.filter(n => n.signals);
  for (const n of lit) for (const a of n.arms) {
    const r = net.roads.find(x => x.id === a.road)!;
    if (r.layer > 0 || a.half < 2.5) continue;
    if (r.oneway && a.dir > 0) continue;   // traffic leaves the node along this arm
    const inside = lit.some(o => o !== n && dist(o.at, n.at) < 40 && ((o.at[0] - n.at[0]) * a.u[0] + (o.at[1] - n.at[1]) * a.u[1]) / (dist(o.at, n.at) || 1) > 0.8);
    if (inside) continue;
    // on the drivers' right: they come toward the node, i.e. along −u, so their right is the arm's left
    const back = Math.max(0, ...n.arms.filter(o => o.road !== a.road).map(o => o.half)) + 3, off = a.half + 0.6;
    const left: Vec2 = [a.u[1], -a.u[0]];
    const p: Vec2 = [n.at[0] + a.u[0] * back + left[0] * off, n.at[1] + a.u[1] * back + left[1] * off];
    if (onRoad(p)) continue;
    props.push({ id: `s-${n.id}-${a.road}-${a.dir}`, kind: 'signal', at: p, z0: WALK_Z, heading: Math.atan2(a.u[1], a.u[0]), group: Math.abs(a.u[0]) >= Math.abs(a.u[1]) ? 'x' : 'y', road: r.id });
  }

  return { props: props.sort((a, b) => (a.id < b.id ? -1 : 1)), wires: wires.sort((a, b) => (a.id < b.id ? -1 : 1)) };
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
