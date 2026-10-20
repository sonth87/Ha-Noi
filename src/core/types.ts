/* Shared data types. P0 holds only the geometry basics; HouseSpec arrives in P1
   (docs/architecture/house-spec.md). */

/** Street-facing direction in data space: N = −y, S = +y, E = +x, W = −x. */
export type Facing = 'N' | 'E' | 'S' | 'W';

/** View rotation: the world turned k × 90° (docs/architecture/overview.md §6). */
export type ViewK = 0 | 1 | 2 | 3;

/** Axis-aligned 3D box: corner + size, in code units (1 m = 10). */
export interface Box3 {
  x: number; y: number; z: number;
  w: number; d: number; h: number;
}

/** Anything the depth sort orders: a box plus the SVG drawn for it. */
export interface Item {
  id: string;
  box: Box3;
  svg: string;
}
