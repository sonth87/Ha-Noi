/* See-through (`Nhìn xuyên`) geometry index and foreground occlusion computation:
   1. For Metro Stations (`ga tàu`): hides the outer roof/shell (`stationShellGroup`) when zoomed in
      (`zoom >= 8.0` or `6.5` at low tilt) so the viewer looks inside the station concourse, platforms, and stopping train.
   2. For Buildings (`tòa nhà`): when zoomed in very close (`zoom >= 19.0` or `15.0` at low tilt),
      hides the entire foreground occluding building `A` in the camera's center sightline (`camera -> A -> B`)
      so the viewer sees completely through `A` to the buildings/scene `B` behind it. */
import { centroid, floorZ, pointInRing, type City, type Vec2 } from '@my-city/core';
import type { Tile } from '@render/city';
import { SEE_THROUGH } from './constants';

export interface BldgBounds {
  id: string;
  tileIdx: number;
  cx: number;
  cy: number;
  r: number;
  topZ: number;
  footprint: readonly Vec2[];
}

export function buildBuildingBoundsIndex(tiles: readonly { tile: Tile }[]): BldgBounds[] {
  const out: BldgBounds[] = [];
  tiles.forEach((ts, tileIdx) => {
    for (const b of ts.tile.buildings) {
      const c = centroid(b.footprint);
      let r = 4;
      for (const p of b.footprint) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1]));
      let topZ = 4;
      for (const part of b.parts) topZ = Math.max(topZ, floorZ(part, part.floors.length));
      out.push({ id: b.id, tileIdx, cx: c[0], cy: c[1], r, topZ, footprint: b.footprint });
    }
  });
  return out;
}

export interface ForegroundCutInput {
  city: City;
  bldgBounds: readonly BldgBounds[];
  zoom: number;
  elevation: number;
  targetX: number;
  targetZ: number;
  cameraX: number;
  cameraZ: number;
}

export interface ForegroundCutResult {
  nearStation: boolean;
  hiddenByTile: Map<number, string[]>;
}

export function computeForegroundCut(input: ForegroundCutInput): ForegroundCutResult {
  const { city, bldgBounds, zoom, elevation, targetX: tx, targetZ: tz, cameraX, cameraZ } = input;
  const el = Math.max(0.08, elevation);
  const hiddenByTile = new Map<number, string[]>();

  // 1. Metro station interior view when zoomed in to a metro station
  const minStationZoom = el < SEE_THROUGH.LOW_EL_THRESHOLD
    ? SEE_THROUGH.STATION_MIN_ZOOM_LOW_EL
    : SEE_THROUGH.STATION_MIN_ZOOM_NORMAL;
  const nearStation =
    zoom >= minStationZoom &&
    city.stations.some(s => Math.hypot(s.at[0] - tx, s.at[1] - tz) < SEE_THROUGH.STATION_RADIUS_M);

  // 2. Full-building see-through only when zoomed in very close to buildings
  const minZoomForBldg = el < SEE_THROUGH.LOW_EL_THRESHOLD
    ? SEE_THROUGH.BUILDING_MIN_ZOOM_LOW_EL
    : SEE_THROUGH.BUILDING_MIN_ZOOM_NORMAL;
  if (zoom < minZoomForBldg) {
    return { nearStation, hiddenByTile };
  }

  const fx = tx - cameraX;
  const fz = tz - cameraZ;
  const len = Math.hypot(fx, fz);
  if (len < 1e-3) {
    return { nearStation, hiddenByTile };
  }
  const nx = fx / len, nz = fz / len;
  const tanEl = Math.tan(el);
  const corridorW = Math.max(2.2, 14 / zoom);

  for (const b of bldgBounds) {
    const dx = b.cx - tx, dz = b.cy - tz;
    const along = dx * nx + dz * nz;
    if (along < -52 || along > b.r + 4) continue;
    const cross = Math.abs(-dx * nz + dz * nx);
    if (cross > b.r + corridorW) continue;

    // Sample point along the view ray closest to this building's depth
    const sampleAlong = Math.min(2.5, Math.max(-48, along));
    const sx = tx + nx * sampleAlong, sz = tz + nz * sampleAlong;
    const inFootprint = pointInRing([sx, sz], b.footprint) || cross <= b.r * 0.78 + 1.5;
    if (!inFootprint) continue;

    const isBlockingInFront =
      along < -Math.max(4.0, b.r * 0.65) &&
      !pointInRing([tx, tz], b.footprint) &&
      b.topZ >= Math.max(3.5, (-along - b.r) * tanEl * 0.68);
    const isRightInFace =
      Math.abs(along) <= b.r + 3.0 &&
      (zoom >= SEE_THROUGH.BUILDING_FACE_MIN_ZOOM_NORMAL ||
        (el < SEE_THROUGH.LOW_EL_THRESHOLD && zoom >= SEE_THROUGH.BUILDING_FACE_MIN_ZOOM_LOW_EL));
    if (isBlockingInFront || isRightInFace) {
      let list = hiddenByTile.get(b.tileIdx);
      if (!list) {
        list = [];
        hiddenByTile.set(b.tileIdx, list);
      }
      list.push(b.id);
    }
  }

  return { nearStation, hiddenByTile };
}
