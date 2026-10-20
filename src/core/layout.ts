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

export const STREET = {
  length: 100 * M,
  farFacade: 190,
  sidewalk: 30,
  nearFacade: 330,
  depth: 520,
  /** road between the two sidewalks */
  road: [220, 300] as const,
  // two 2.8 m lanes: cars in the middle track, motorbikes in the tracks either side
  lanes: [{ y0: 226, y1: 254, dir: -1 as const }, { y0: 266, y1: 294, dir: 1 as const }],
  /** track offsets across a lane from its centre line: 0 = one edge, 1 = middle (cars), 2 = other edge */
  tracks: [-8.5, 0, 8.5],
  /** pole and tree lines on each sidewalk, near the curb */
  far: { pole: 214, tree: 215 },
  near: { pole: 302, tree: 304.5 },
} as const;

export interface StreetHouse {
  input: HouseInput;
  row: 'far' | 'near';
}

export interface StreetLayout {
  name: string;
  houses: StreetHouse[];
  poles: { x: number; row: 'far' | 'near' }[];
  alleys: { x0: number; x1: number; row: 'far' | 'near' }[];
  /** traffic: kind, lane, start position along the street, speed (units/s), track (0–2) */
  vehicles: { kind: 'bike' | 'sedan' | 'hatch' | 'taxi' | 'van'; lane: number; a0: number; v: number; track: number }[];
}

export const streetCenter = (): [number, number] => [STREET.length / 2, STREET.depth / 2];

/** the whole street as a pseudo-house, so rotateSpec + localFrame map street-local → world for any view */
export const streetFrameSpec = () => ({ x: 0, y: 0, w: STREET.length, d: STREET.depth, facing: 'S' as Facing });

interface Slot { input: HouseInput; spec: HouseSpec; a: number }

/** one row, left → right as seen from the street; alleys (ngõ) now and then, a low house every few */
function row(r: Rng, prefix: string): { slots: Slot[]; alleys: [number, number][] } {
  const slots: Slot[] = [], alleys: [number, number][] = [];
  let a = 0, sinceAlley = 0, sinceLow = 0, n = 0;
  const recent: (string | undefined)[] = [];
  while (a < STREET.length - 32) {
    if (sinceAlley >= 6 && r.chance(0.16) && a < STREET.length - 80) {
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
    if (a + spec.w > STREET.length) break;
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

export function streetLayout(seed: number, name = 'Thái Hà', prefix = 'TH'): StreetLayout {
  const r = rng(seed);
  const L = STREET.length, houses: StreetHouse[] = [], alleys: StreetLayout['alleys'] = [];

  const far = row(r, `${prefix}-F`);
  for (const s of far.slots) houses.push({ row: 'far', input: { ...s.input, x: s.a, y: STREET.farFacade - s.spec.d, facing: 'S' } });
  for (const [a0, a1] of far.alleys) alleys.push({ x0: a0, x1: a1, row: 'far' });

  // the near row faces N: left → right as seen from the street runs toward −x
  const near = row(r, `${prefix}-N`);
  for (const s of near.slots) houses.push({ row: 'near', input: { ...s.input, x: L - s.a - s.spec.w, y: STREET.nearFacade, facing: 'N' } });
  for (const [a0, a1] of near.alleys) alleys.push({ x0: L - a1, x1: L - a0, row: 'near' });

  const inAlley = (x: number, rw: 'far' | 'near', pad: number) => alleys.some(al => al.row === rw && x > al.x0 - pad && x < al.x1 + pad);
  const poles: StreetLayout['poles'] = [];
  for (const [rw, xs] of [['far', [70, 400, 730]], ['near', [235, 565, 895]]] as const)
    for (let x of xs) { x += r.int(-20, 20); while (inAlley(x, rw, 6)) x += 12; poles.push({ x, row: rw }); }

  // street trees belong to the houses; walking each row along x, keep a tree only if its crown
  // clears the street's ends, every pole (crossarm ± 10, plus a gap), and the crowns already kept
  for (const rw of ['far', 'near'] as const) {
    const kept: [number, number][] = [];   // crown intervals along x
    const rowHouses = houses.filter(h => h.row === rw).map(h => ({ h, sp: resolveSpec(h.input).spec })).sort((p, q) => p.sp.x - q.sp.x);
    for (const { h, sp } of rowHouses) {
      if (sp.trees === 'none') continue;
      const ra = TREE[sp.treeSize].ra;
      const worldX = (a: number) => (rw === 'far' ? sp.x + a : sp.x + sp.w - a);
      const fits = (a: number) => {
        const x = worldX(a), lo = x - ra, hi = x + ra;
        return lo >= 0 && hi <= L && !poles.some(p => p.row === rw && Math.abs(p.x - x) < ra + 11) && !kept.some(([k0, k1]) => lo < k1 + 1 && k0 < hi + 1);
      };
      const want = (sp.trees === 'both' && sp.w - 8 >= 2 * ra) ? [4, sp.w - 4] : sp.trees === 'right' ? [sp.w - 4] : [4];
      const ok = want.filter(a => fits(a) && (kept.push([worldX(a) - ra, worldX(a) + ra]), true));
      const left = ok.includes(4), right = ok.includes(sp.w - 4);
      h.input = { ...h.input, trees: left && right ? 'both' : left ? 'left' : right ? 'right' : 'none' };
    }
  }

  const vehicles: StreetLayout['vehicles'] = [];
  STREET.lanes.forEach((_, lane) => {
    for (let i = 0; i < 8; i++) vehicles.push({ kind: 'bike', lane, a0: r.next() * L, v: r.int(45, 80), track: r.chance(0.5) ? 0 : 2 });
    // cars share one speed per lane and keep even gaps, so they never run into each other
    const n = 3, v = r.int(50, 64), off = r.next() * L;
    for (let i = 0; i < n; i++) vehicles.push({ kind: r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const), lane, a0: (off + (i * L) / n) % L, v, track: 1 });
  });

  return { name, houses, poles, alleys, vehicles };
}
