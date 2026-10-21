/* Units (ADR-033): the city model is in metres, x east (along Tây Sơn toward Ô Chợ Dừa), y south,
   z up. Default storey heights for houses come from the old app (apps/svg, where 1 m = 10). */

export const SIZE = {
  /** ground-floor height of a house (taller than upper floors) */
  groundH: 3.8,
  /** upper-floor height of a house */
  floorH: 3.2,
  /** typical tube-house frontage and depth */
  tubeW: 4,
  tubeD: 15,
} as const;
