/* From latitude / longitude to the city model's metres (docs/architecture/osm-import.md §2):
   an equirectangular projection about the area's origin (plenty for a few hundred metres), then a
   turn so the area's main street runs along +x. y points south, as in the city model. */
import type { Vec2 } from '@my-city/core';

export interface Frame {
  /** latitude, longitude of the model's (0, 0) */
  origin: readonly [number, number];
  /** direction of +x, in degrees counter-clockwise from east */
  bearing: number;
}

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON_EQ = 111320;

export function projector(f: Frame): (lat: number, lon: number) => Vec2 {
  const [lat0, lon0] = f.origin, k = M_PER_DEG_LON_EQ * Math.cos((lat0 * Math.PI) / 180);
  const c = Math.cos((f.bearing * Math.PI) / 180), s = Math.sin((f.bearing * Math.PI) / 180);
  return (lat, lon) => {
    const e = (lon - lon0) * k, n = (lat - lat0) * M_PER_DEG_LAT;   // metres east, north
    return [e * c + n * s, e * s - n * c];
  };
}
