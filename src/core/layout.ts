/* Scene layouts. P1b: the catalog — one lot per house in a row along x, facades on one line
   like a street, each lot with its own sidewalk and a label strip (FR-30). */
import { localFrame } from '@core/view';
import type { Facing, HouseSpec } from '@core/types';

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
