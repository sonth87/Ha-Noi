/* Scene layouts. P1b: the catalog — one lot per house in a row along x, facades on one line
   like a street, each lot with its own sidewalk and a label strip (FR-30). */
import { localFrame } from '@core/view';
import { M, TREE } from '@core/units';
import { rng, type Rng } from '@core/rng';
import { peakZ, randomHouse, resolveSpec } from '@core/spec';
import type { Facing, HouseInput, HouseSpec } from '@core/types';

export interface Lot {
  id: string;
  x: number;
  y: number;
  /** lot frontage and depth, in the lot's own frame (a along the street, b toward it) */
  w: number;
  d: number;
  facing: Facing;
}

export const LOT = {
  W: 80,
  /** facade line (lot-local b) */
  facade: 190,
  sidewalk: 30,
  label: 12,
  gap: 16,
} as const;

export const lotDepth = () => LOT.facade + LOT.sidewalk + LOT.label;

/** a lot wide enough for its house plus room for side-hung parts (AC units, billboard) */
export const lotWidth = (houseW: number) => Math.max(LOT.W, houseW + 40);

/** one lot per house frontage, side by side along x */
export function catalogLots(houseWidths: readonly number[]): Lot[] {
  let x = 0;
  return houseWidths.map((hw, i) => {
    const w = lotWidth(hw), lot = { id: `lot${i}`, x, y: 0, w, d: lotDepth(), facing: 'S' as Facing };
    x += w + LOT.gap;
    return lot;
  });
}

/** centre of the unrotated catalog, the pivot for view rotation */
export function catalogCenter(lots: readonly Lot[]): [number, number] {
  const last = lots[lots.length - 1];
  return [last ? (last.x + last.w) / 2 : 0, lotDepth() / 2];
}

/** place a house in a (possibly rotated) lot: centred along the street, facade on the lot's facade line */
export function placeInLot(lot: Lot, s: HouseSpec): HouseSpec {
  const fp = localFrame(lot).box((lot.w - s.w) / 2, LOT.facade - s.d, 0, s.w, s.d, 0);
  return { ...s, x: fp.x, y: fp.y, facing: lot.facing };
}

// ---------- P3: one straight street (FR-32) ----------
/* Street-local coordinates (view 0): the street runs along +x; the far row faces S (+y) with its
   facades on y = farFacade, the near row faces N with its facades on y = nearFacade; sidewalks,
   then the road in between. Vehicles keep right: the lane nearer the far row runs toward −x. */

/** one lane across a street section: y0 → y1, travel direction along x; `fly` lanes climb onto a flyover */
export interface Lane { y0: number; y1: number; dir: 1 | -1; fly?: boolean }

/** a street's cross-section in street-local y (0 = back of the far row's lots) */
export interface Section {
  farFacade: number;
  sidewalk: number;
  nearFacade: number;
  depth: number;
  /** road between the two sidewalks */
  road: readonly [number, number];
  lanes: readonly Lane[];
  /** raised strip between the directions (Tây Sơn), carrying the flyover's piers */
  median?: readonly [number, number];
  /** track offsets across a lane from its centre line: 0 = one edge, 1 = middle (cars), 2 = other edge */
  tracks: readonly number[];
  /** pole and tree lines on each sidewalk, near the curb */
  far: { pole: number; tree: number };
  near: { pole: number; tree: number };
}

export const STREET: Section & { length: number } = {
  length: 100 * M,
  farFacade: 190,
  sidewalk: 30,
  nearFacade: 330,
  depth: 520,
  road: [220, 300],
  // two 2.8 m lanes: cars in the middle track, motorbikes in the tracks either side
  lanes: [{ y0: 226, y1: 254, dir: -1 }, { y0: 266, y1: 294, dir: 1 }],
  tracks: [-8.5, 0, 8.5],
  far: { pole: 214, tree: 215 },
  near: { pole: 302, tree: 304.5 },
};

/** Tây Sơn: 16 m of road, two lanes each way; the inner pair climbs the flyover, a median between them */
export const TAY_SON: Section = {
  farFacade: 190,
  sidewalk: 30,
  nearFacade: 410,
  depth: 600,
  road: [220, 380],
  lanes: [{ y0: 226, y1: 254, dir: -1 }, { y0: 258, y1: 286, dir: -1, fly: true }, { y0: 314, y1: 342, dir: 1, fly: true }, { y0: 346, y1: 374, dir: 1 }],
  median: [288, 312],
  tracks: [-8.5, 0, 8.5],
  far: { pole: 214, tree: 215 },
  near: { pole: 382, tree: 384.5 },
};

/** A flyover along a street (cầu vượt Tây Sơn): its lanes rise from r0 to r1, run level at H to
    r2, and come down by r3 (street-local x). */
export interface Flyover { lanes: number[]; r: readonly [number, number, number, number]; H: number }

/** height of a flyover lane's surface at x */
export function flyZ(fl: Flyover, x: number): number {
  const [r0, r1, r2, r3] = fl.r;
  if (x <= r0 || x >= r3) return 0;
  if (x < r1) return fl.H * (x - r0) / (r1 - r0);
  if (x <= r2) return fl.H;
  return fl.H * (r3 - x) / (r3 - r2);
}

/** depth-sort pieces of the flyover (ramps and deck), cut every LANE_PIECE and where the slope changes */
export function flyPieces(fl: Flyover): [number, number][] {
  const out: [number, number][] = [], [r0, r1, r2, r3] = fl.r;
  for (const [s0, s1] of [[r0, r1], [r1, r2], [r2, r3]] as const)
    for (let x = s0; x < s1 - 0.01; x += LANE_PIECE) out.push([x, Math.min(x + LANE_PIECE, s1)]);
  return out;
}

export interface StreetHouse {
  input: HouseInput;
  row: Row;
}

export type Row = 'far' | 'near';
export type VehicleKind = 'bike' | 'sedan' | 'hatch' | 'taxi' | 'van';

/** a stretch of one row that holds houses (street-local x0 → x1) */
export interface RowRange { row: Row; x0: number; x1: number }

export interface StreetLayout {
  name: string;
  /** street-local length along x */
  length: number;
  section: Section;
  flyover?: Flyover;
  /** where each row has houses (and the lots under them); elsewhere only road and sidewalks */
  ranges: RowRange[];
  /** a stretch the street leaves to someone else (the junction of a crossroads), drawn by them */
  gap?: [number, number];
  houses: StreetHouse[];
  poles: { x: number; row: Row }[];
  alleys: { x0: number; x1: number; row: Row }[];
  /** traffic: kind, lane, start position (tail) along the street, speed (units/s), track (0–2) */
  vehicles: { kind: VehicleKind; lane: number; a0: number; v: number; track: number }[];
}

export const streetCenter = (): [number, number] => [STREET.length / 2, STREET.depth / 2];

/** the whole street as a pseudo-house, so rotateSpec + localFrame map street-local → world for any view */
export const streetFrameSpec = () => ({ x: 0, y: 0, w: STREET.length, d: STREET.depth, facing: 'S' as Facing });

interface Slot { input: HouseInput; spec: HouseSpec; a: number }

/** one row, left → right as seen from the street; alleys (ngõ) now and then, a low house every few */
function row(r: Rng, prefix: string, len: number): { slots: Slot[]; alleys: [number, number][] } {
  const slots: Slot[] = [], alleys: [number, number][] = [];
  let a = 0, sinceAlley = 0, sinceLow = 0, n = 0;
  const recent: (string | undefined)[] = [];
  while (a < len - 32) {
    if (sinceAlley >= 6 && r.chance(0.16) && a < len - 80) {
      const gw = r.int(22, 30);
      alleys.push([a, a + gw]); a += gw; sinceAlley = 0;
      continue;
    }
    let input: HouseInput;
    for (let tries = 0; ; tries++) {
      input = randomHouse(r, `${prefix}${String(++n).padStart(2, '0')}`);
      // rhythm: a low house every 4–6; never three of a kind in a row
      if (sinceLow >= 4 + r.int(0, 2)) input = { ...input, floors: r.int(0, 1), topRoom: false, roofShelter: 'none', signs: input.signs?.filter(s => s.type !== 'billboard' && s.type !== 'projecting-vertical') };
      const same = recent.length >= 2 && recent.every(p => p === input.preset);
      if (!same || tries > 4) break;
      n--;
    }
    const spec = resolveSpec(input).spec;
    if (a + spec.w > len) break;
    slots.push({ input, spec, a });
    recent.push(input.preset); if (recent.length > 2) recent.shift();
    sinceLow = spec.floors <= 1 ? 0 : sinceLow + 1;
    a += spec.w; sinceAlley++;
  }
  // exposed end walls: the side whose neighbour is lower (or missing), above that neighbour
  slots.forEach((s, i) => {
    const left = slots[i - 1], right = slots[i + 1];
    const touchL = left && left.a + left.spec.w === s.a, touchR = right && s.a + s.spec.w === right.a;
    const clearL = touchL ? peakZ(left.spec) : 0, clearR = touchR ? peakZ(right.spec) : 0;
    const sideEnd = clearR <= clearL ? '+a' : '-a';
    s.input = { ...s.input, sideEnd, sideClear: sideEnd === '+a' ? clearR : clearL };
  });

  return { slots, alleys };
}

/** Houses, alleys, poles and street trees for every range of a street (no traffic). Rows are
    filled range by range, far rows first; the near row faces N, so left → right as seen from the
    street runs toward −x. */
export function streetRows(r: Rng, ranges: readonly RowRange[], prefix: string, sec: Section = STREET): Pick<StreetLayout, 'houses' | 'poles' | 'alleys'> {
  const houses: StreetHouse[] = [], alleys: StreetLayout['alleys'] = [];
  const multi = ranges.filter(g => g.row === 'far').length > 1 || ranges.filter(g => g.row === 'near').length > 1;
  const ordered = [...ranges.filter(g => g.row === 'far'), ...ranges.filter(g => g.row === 'near')];
  ordered.forEach((g, gi) => {
    const tag = `${prefix}-${g.row === 'far' ? 'F' : 'N'}${multi ? String.fromCharCode(97 + gi) : ''}`;
    const { slots, alleys: al } = row(r, tag, g.x1 - g.x0);
    if (g.row === 'far') {
      for (const s of slots) houses.push({ row: 'far', input: { ...s.input, x: g.x0 + s.a, y: sec.farFacade - s.spec.d, facing: 'S' } });
      for (const [a0, a1] of al) alleys.push({ x0: g.x0 + a0, x1: g.x0 + a1, row: 'far' });
    } else {
      for (const s of slots) houses.push({ row: 'near', input: { ...s.input, x: g.x1 - s.a - s.spec.w, y: sec.nearFacade, facing: 'N' } });
      for (const [a0, a1] of al) alleys.push({ x0: g.x1 - a1, x1: g.x1 - a0, row: 'near' });
    }
  });

  const inAlley = (x: number, rw: Row, pad: number) => alleys.some(al => al.row === rw && x > al.x0 - pad && x < al.x1 + pad);
  const poles: StreetLayout['poles'] = [];
  for (const rw of ['far', 'near'] as const)
    for (const g of ranges.filter(q => q.row === rw))
      // every ~33 m, the last one close enough to the range's end that no wire span sags into a crown
      for (let x0 = g.x0 + (rw === 'far' ? 70 : 235); x0 < g.x1 - 20; x0 += 330) {
        let x = x0 + r.int(-20, 20);
        while (inAlley(x, rw, 6)) x += 12;
        if (x < g.x1 - 12) poles.push({ x, row: rw });
      }

  // street trees belong to the houses; walking each row along x, keep a tree only if its crown
  // stays inside the house's range, clears every pole (crossarm ± 10, plus a gap), and the crowns already kept
  for (const rw of ['far', 'near'] as const) {
    const kept: [number, number][] = [];   // crown intervals along x
    const rowHouses = houses.filter(h => h.row === rw).map(h => ({ h, sp: resolveSpec(h.input).spec })).sort((p, q) => p.sp.x - q.sp.x);
    for (const { h, sp } of rowHouses) {
      if (sp.trees === 'none') continue;
      const g = ranges.find(q => q.row === rw && sp.x >= q.x0 && sp.x + sp.w <= q.x1)!;
      const ra = TREE[sp.treeSize].ra;
      const worldX = (a: number) => (rw === 'far' ? sp.x + a : sp.x + sp.w - a);
      const fits = (a: number) => {
        const x = worldX(a), lo = x - ra, hi = x + ra;
        return lo >= g.x0 && hi <= g.x1 && !poles.some(p => p.row === rw && Math.abs(p.x - x) < ra + 11) && !kept.some(([k0, k1]) => lo < k1 + 1 && k0 < hi + 1);
      };
      const want = (sp.trees === 'both' && sp.w - 8 >= 2 * ra) ? [4, sp.w - 4] : sp.trees === 'right' ? [sp.w - 4] : [4];
      const ok = want.filter(a => fits(a) && (kept.push([worldX(a) - ra, worldX(a) + ra]), true));
      const left = ok.includes(4), right = ok.includes(sp.w - 4);
      h.input = { ...h.input, trees: left && right ? 'both' : left ? 'left' : right ? 'right' : 'none' };
    }
  }
  return { houses, poles, alleys };
}

export function streetLayout(seed: number, name = 'Thái Hà', prefix = 'TH'): StreetLayout {
  const r = rng(seed), L = STREET.length;
  const ranges: RowRange[] = [{ row: 'far', x0: 0, x1: L }, { row: 'near', x0: 0, x1: L }];
  const { houses, poles, alleys } = streetRows(r, ranges, prefix);

  const vehicles: StreetLayout['vehicles'] = [];
  STREET.lanes.forEach((_, lane) => {
    for (let i = 0; i < 8; i++) vehicles.push({ kind: 'bike', lane, a0: r.next() * L, v: r.int(45, 80), track: r.chance(0.5) ? 0 : 2 });
    // cars share one speed per lane and keep even gaps, so they never run into each other
    const n = 3, v = r.int(50, 64), off = r.next() * L;
    for (let i = 0; i < n; i++) vehicles.push({ kind: r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const), lane, a0: (off + (i * L) / n) % L, v, track: 1 });
  });

  return { name, length: L, section: STREET, ranges, houses, poles, alleys, vehicles };
}

/** cuts of a lane into depth-sort pieces: LANE_PIECE long, none inside the gap (the junction) or,
    for a flyover lane, the flyover's span (its own pieces, flyPieces) */
export function lanePieces(lay: Pick<StreetLayout, 'length' | 'gap' | 'flyover' | 'section'>, lane: number): [number, number][] {
  const out: [number, number][] = [];
  const fl = lay.flyover && lay.flyover.lanes.includes(lane) ? lay.flyover : undefined;
  const hole = fl ? [fl.r[0], fl.r[3]] as const : lay.gap;
  const spans: [number, number][] = hole ? [[0, hole[0]], [hole[1], lay.length]] : [[0, lay.length]];
  for (const [s0, s1] of spans) for (let x = s0; x < s1 - 0.01; x += LANE_PIECE) out.push([x, Math.min(x + LANE_PIECE, s1)]);
  return out;
}

/** index of the lane piece holding street-local x (−1 inside the gap) */
export function pieceAt(pieces: readonly [number, number][], x: number): number {
  for (let i = 0; i < pieces.length; i++) if (x < pieces[i]![1]) return x >= pieces[i]![0] ? i : -1;
  return pieces.length - 1;
}

export const LANE_PIECE = 50;
