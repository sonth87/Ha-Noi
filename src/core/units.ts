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
  small: { trunkB: 25.5, ra: 6, rb: 4.5, rz: 7, zc: 24 },
  medium: { trunkB: 25.5, ra: 11, rb: 5.5, rz: 12, zc: 40 },
  // a big street tree: 3.6 m of crown along the street, ~4 m tall, still under the wires (~7 m)
  large: { trunkB: 27, ra: 18, rb: 7, rz: 19, zc: 47 },
} as const;
