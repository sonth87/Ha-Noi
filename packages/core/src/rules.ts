/* Rules that fill in what the data does not say (docs/architecture/city-model.md §4): street widths
   and sidewalks, bridge decks, a building's kind and storeys from its footprint, which edge faces the
   street, and the generated house for small buildings. Every random choice is seeded by the
   element's id, so the same data always gives the same city. Pure. */
import { area, closestOnPath, dist, minRect, type Vec2 } from './geom';
import type { BuildingKind, StreetKind } from './city';
import type { HouseInput, HouseSpec } from './house-types';
import { LIMITS, randomHouse, resolveHouse } from './house';
import { hash, rng } from './rng';

// ---------- streets ----------

/** lane width and default lane count per kind (m); Hà Nội primaries run about 3.25 m a lane */
const STREET: Record<StreetKind, { lane: number; lanes: number; walk: number }> = {
  primary: { lane: 3.25, lanes: 2, walk: 3.5 },
  secondary: { lane: 3.25, lanes: 2, walk: 3 },
  tertiary: { lane: 3, lanes: 2, walk: 2.5 },
  link: { lane: 3.5, lanes: 1, walk: 0 },
  residential: { lane: 2.75, lanes: 2, walk: 1.5 },
  service: { lane: 3, lanes: 1, walk: 0 },
  alley: { lane: 3, lanes: 1, walk: 0 },
  footway: { lane: 1.8, lanes: 1, walk: 0 },
  steps: { lane: 1.8, lanes: 1, walk: 0 },
};

/** Width, lanes and sidewalks of a street. A one-way main street is one carriageway of a divided
    road: its sidewalk is on the right only (traffic keeps right, so the right edge is the outer one). */
export function streetShape(kind: StreetKind, lanes: number | undefined, oneway: boolean): { width: number; lanes: number; sidewalk: { left: number; right: number } } {
  const k = STREET[kind], n = Math.max(1, lanes ?? (oneway ? Math.ceil(k.lanes / 2) : k.lanes));
  const main = kind === 'primary' || kind === 'secondary' || kind === 'tertiary' || kind === 'residential';
  const sidewalk = !main ? { left: 0, right: 0 } : oneway ? { left: 0, right: k.walk } : { left: k.walk, right: k.walk };
  return { width: n * k.lane, lanes: n, sidewalk };
}

/** the usual deck height of a road flyover in Hà Nội (m), per bridge layer */
export const DECK_H = 6;
/** a footbridge clears the road below at about 5 m */
export const FOOTBRIDGE_H = 5;

/** Height profile of a bridge way: a road bridge ramps up from grade at both ends to the deck
    (ramps a third of its length, at most 100 m); a footbridge is level, reached by stairs. */
export function bridgeProfile(kind: StreetKind, length: number, layer: number): [number, number][] {
  if (kind === 'footway' || kind === 'steps') return [[0, FOOTBRIDGE_H], [length, FOOTBRIDGE_H]];
  const H = DECK_H * Math.max(1, layer), ramp = Math.min(length / 3, 100);
  return [[0, 0], [ramp, H], [length - ramp, H], [length, 0]];
}

// ---------- buildings ----------

/** storeys to pick from, per kind (seeded) */
const LEVELS: Record<BuildingKind, readonly number[]> = {
  kiosk: [1],
  'tube-house': [2, 3, 3, 4, 4, 4, 5, 5, 6],
  house: [2, 3, 3, 4, 5],
  villa: [2, 3, 3],
  apartment: [5, 6, 7, 8, 9],
  office: [5, 6, 7, 8, 9, 10],
  commercial: [3, 4, 5, 6, 8],
  hotel: [8, 10, 12, 15],
  school: [3, 4, 5],
  other: [2, 3, 4],
};

/** ground and upper storey heights per kind (m) */
const STOREY: Record<BuildingKind, readonly [number, number]> = {
  kiosk: [3, 3], 'tube-house': [3.8, 3.2], house: [3.8, 3.2], villa: [3.6, 3.3],
  apartment: [3.6, 3], office: [4.2, 3.6], commercial: [4.5, 4], hotel: [4.5, 3], school: [3.9, 3.6], other: [3.5, 3.2],
};

/** Kind of a building: the data's hint when it has one, else from the footprint. A tube house is
    narrow (≤ 7 m) and at least 1.6 times as deep as it is wide. */
export function guessKind(footprint: readonly Vec2[], hint?: BuildingKind): BuildingKind {
  const A = area(footprint), { short, long } = minRect(footprint);
  const tube = short <= 7 && long >= 1.6 * short;
  if (hint === 'house' && tube) return 'tube-house';
  if (hint) return hint;
  if (A < 15) return 'kiosk';
  if (tube) return 'tube-house';
  if (A <= 200) return 'house';
  if (A <= 800) return 'apartment';
  return 'commercial';
}

/** storeys for a building of this kind, seeded by its id */
export function guessLevels(kind: BuildingKind, id: string): number {
  return rng(hash(`levels:${id}`)).pick(LEVELS[kind]);
}

/** storey heights, bottom to top */
export function storeyHeights(kind: BuildingKind, levels: number): number[] {
  const [g, u] = STOREY[kind];
  return Array.from({ length: Math.max(1, levels) }, (_, i) => (i === 0 ? g : u));
}

/** outward normal of edge i of a positive-area ring */
export function edgeNormal(ring: readonly Vec2[], i: number): Vec2 {
  const p = ring[i]!, q = ring[(i + 1) % ring.length]!, L = dist(p, q) || 1;
  return [(q[1] - p[1]) / L, -(q[0] - p[0]) / L];
}

/** Which edge faces the street: the one whose outward side looks at the nearest street edge.
    Falls back to the edge nearest any street, then to edge 0. */
export function frontEdge(ring: readonly Vec2[], streets: readonly { path: readonly Vec2[]; width: number }[]): number {
  let best = { i: 0, s: Infinity }, near = { i: 0, s: Infinity };
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!, mid: Vec2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = edgeNormal(ring, i);
    for (const st of streets) {
      const c = closestOnPath(mid, st.path), s = c.d - st.width / 2;
      if (s < near.s) near = { i, s };
      const v: Vec2 = [c.at[0] - mid[0], c.at[1] - mid[1]];
      if ((v[0] * n[0] + v[1] * n[1]) / (c.d || 1) > 0.5 && s < best.s) best = { i, s };
    }
  });
  return best.s < 40 ? best.i : near.s < Infinity ? near.i : 0;
}

/** frontage length and depth behind edge `front` */
export function frontage(ring: readonly Vec2[], front: number): { w: number; d: number } {
  const p = ring[front]!, q = ring[(front + 1) % ring.length]!, n = edgeNormal(ring, front);
  let d = 0;
  for (const r of ring) d = Math.max(d, -((r[0] - p[0]) * n[0] + (r[1] - p[1]) * n[1]));
  return { w: dist(p, q), d };
}

/** kinds the house generator builds the facade of */
export const HOUSE_KINDS: readonly BuildingKind[] = ['tube-house', 'house', 'villa'];

/** The generated house for a small building: seeded by its id, on its real frontage and depth,
    with its storeys. None when the frontage or depth is outside what the generator builds. */
export function houseFor(id: string, kind: BuildingKind, levels: number, w: number, d: number, extra: Partial<HouseInput> = {}): { input: HouseInput; spec: HouseSpec } | undefined {
  if (!HOUSE_KINDS.includes(kind) || w < LIMITS.minW || w > LIMITS.maxW || d < LIMITS.minD) return undefined;
  const floors = Math.min(LIMITS.maxFloors, Math.max(0, levels - 1));
  const input: HouseInput = { ...randomHouse(rng(hash(`house:${id}`)), id, { w: round(w), d: round(Math.min(d, 30)), floors }), ...extra };
  return { input, spec: resolveHouse(input).spec };
}

const round = (v: number) => Math.round(v * 10) / 10;
