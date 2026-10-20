/* What every part needs while drawing one house. */
import type { Kernel } from '@iso/kernel';
import type { Rng } from '@core/rng';
import type { HouseSpec, Item } from '@core/types';
import type { LocalDraw } from '@render/local';

export interface Ctx {
  K: Kernel;
  D: LocalDraw;
  s: HouseSpec;
  r: Rng;
  /** lived-in variation for a lit window: brightness only (never a dead window, see ADR-016 notes) */
  v(): string;
  /** facade b of the upper floors: d + overhang */
  fy: number;
  /** top of the upper floors (= groundH when there are none) */
  topZ: number;
  /** SVG-safe house id, for clip-path ids */
  uid: string;
  floorId(n: number): string;
  /** add a depth-sorted item; the box is in local coordinates */
  add(name: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string): void;
  items: Item[];
}

/** a lightable band on a face: halo behind, windows in .lights, then fixed extras (port of the reference's floor()) */
export function band(id: string, t: string, w: number, h: number, lights: string, extra = ''): string {
  return `<g class="fl" data-floor="${id}"><g transform="${t}"><rect class="halo" x="-2" y="-1" width="${w + 4}" height="${h + 2}" filter="url(#bloom)"/><g class="lights">${lights}</g>${extra}</g></g>`;
}
