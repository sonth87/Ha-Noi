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
