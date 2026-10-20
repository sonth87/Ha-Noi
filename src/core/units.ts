/* Units and default sizes (ADR-003). Every size in render/ goes through these; no magic numbers. */

/** 1 metre in code units. */
export const M = 10;

export const SIZE = {
  /** ground-floor height (taller than upper floors) */
  groundH: 3.8 * M,
  /** upper-floor height */
  floorH: 3.2 * M,
  /** typical tube-house frontage */
  tubeW: 4 * M,
  /** typical tube-house depth */
  tubeD: 15 * M,
  /** ground plate under a single figure */
  plateH: 0.7 * M,
} as const;

/** street trees (render/parts/trees.ts): trunk distance from the ground-floor facade, and crown
    half-extents along the street (ra), across it (rb), up (rz) around its centre height zc */
export const TREE = {
  small: { trunkB: 25.5, ra: 4, rb: 4, rz: 4, zc: 22 },
  medium: { trunkB: 25.5, ra: 6, rb: 5.5, rz: 6, zc: 36 },
  large: { trunkB: 27, ra: 12, rb: 7, rz: 10, zc: 52 },
} as const;
