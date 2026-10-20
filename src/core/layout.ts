/* Scene layouts. P1b: the catalog — one lot per house in a row along x, facades on one line
   like a street, each lot with its own sidewalk and a label strip (FR-30). */
import { localFrame } from '@core/view';
import { M } from '@core/units';
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

export function catalogLots(count: number): Lot[] {
  return Array.from({ length: count }, (_, i) => ({ id: `lot${i}`, x: i * (LOT.W + LOT.gap), y: 0, w: LOT.W, d: lotDepth(), facing: 'S' as Facing }));
}

/** centre of the unrotated catalog, the pivot for view rotation */
export function catalogCenter(count: number): [number, number] {
  return [(count * (LOT.W + LOT.gap) - LOT.gap) / 2, lotDepth() / 2];
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
  lanes: [{ y0: 230, y1: 246, dir: -1 as const }, { y0: 274, y1: 290, dir: 1 as const }],
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
  trees: { x: number; row: 'far' | 'near' }[];
  alleys: { x0: number; x1: number; row: 'far' | 'near' }[];
  bikes: { lane: number; a0: number; v: number; track: number }[];
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

  const trees: StreetLayout['trees'] = [];
  for (const rw of ['far', 'near'] as const) {
    for (let x = 30 + r.int(0, 40); x < L - 20; x += r.int(80, 140)) {
      if (poles.some(p => p.row === rw && Math.abs(p.x - x) < 24) || inAlley(x, rw, 8)) continue;
      trees.push({ x, row: rw });
    }
  }

  const bikes: StreetLayout['bikes'] = [];
  STREET.lanes.forEach((_, lane) => {
    for (let i = 0; i < 7; i++) bikes.push({ lane, a0: r.next() * L, v: r.int(45, 80), track: r.chance(0.5) ? -3.5 : 3.5 });
  });

  return { name, houses, poles, trees, alleys, bikes };
}
