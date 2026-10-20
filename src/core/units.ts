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
  // the crown starts low (about 1.2–2 m up) and takes most of the tree's height, like a real street tree
  small: { trunkB: 25.5, ra: 8, rb: 4.5, rz: 9, zc: 21 },
  medium: { trunkB: 25.5, ra: 13, rb: 5.5, rz: 15, zc: 33 },
  // a big street tree: 4.4 m of crown along the street, from ~2 m to ~6.8 m, still under the wires (~7 m)
  large: { trunkB: 27, ra: 22, rb: 7, rz: 24, zc: 44 },
} as const;
