/* Centralized view, camera, interaction, shader, and storage constants for @my-city/city3d. */
import type { VehicleKind } from '@my-city/core';
import type { Surface } from '@render/batch';

export const DEFAULT_AREA_ID = 'nga-tu-thai-ha';

export const STORAGE_KEYS = {
  QUALITY: 'city3d-quality',
  LIGHTS: 'city3d-lights',
  STREET_LABELS: 'city3d-street-labels',
  PLACE_INFO: 'city3d-place-info',
  LOCALE: 'city3d-locale',
} as const;

/** Bumped when quality defaults change in a way a saved setting should not outlive */
export const QUALITY_STORAGE_VERSION = 7;

/** True isometric elevation angle: asin(1 / sqrt(3)) ≈ 35.26° */
export const ISO_EL = Math.asin(1 / Math.sqrt(3));

/** Orthographic frustum height in metres at zoom = 1 */
export const FRUSTUM = 300;

/** Fixed distance (metres) from orthographic camera to controls.target */
export const ORBIT_RADIUS = 1000;

/** Half the diagonal of a 64 m furniture cell */
export const CELL_R = 46;

/** Minimum elevation (radians) for OrbitControls zoomToCursor (above internal 20° tilt limit) */
export const MIN_ZOOM_TO_CURSOR_EL = 0.38;

/** Extra pan margin (metres) outside city bounds */
export const PAN_BOUNDS_MARGIN = 120;

/** Camera transition durations (ms) */
export const FLY_DURATION_MS = 700;
export const TURN_DURATION_MS = 450;

/** Hover interaction thresholds */
export const HOVER_THROTTLE_MS = 45;
export const HOVER_MIN_PX_PER_METRE = 3.2;
export const HOVER_REGULAR_BLDG_MIN_PX_PER_METRE = 5.0;

/** See-through (`Nhìn xuyên`) thresholds for metro stations and foreground occluding buildings */
export const SEE_THROUGH = {
  LOW_EL_THRESHOLD: 0.34,
  SHOWCASE_MIN_ZOOM: 5.5,
  STATION_MIN_ZOOM_LOW_EL: 6.5,
  STATION_MIN_ZOOM_NORMAL: 8.0,
  STATION_RADIUS_M: 65,
  BUILDING_MIN_ZOOM_LOW_EL: 15.0,
  BUILDING_MIN_ZOOM_NORMAL: 19.0,
  BUILDING_FACE_MIN_ZOOM_LOW_EL: 16.5,
  BUILDING_FACE_MIN_ZOOM_NORMAL: 21.0,
} as const;

/** Camera viewpoint modes: standard map ('map') or immersive perspective / driving views */
export type PovMode = 'map' | 'metro-cab' | 'metro-passenger' | 'drive-cabin' | 'drive-top';

export const POV_MODES: readonly PovMode[] = [
  'map',
  'metro-cab',
  'metro-passenger',
  'drive-cabin',
  'drive-top',
] as const;

/** Perspective POV & interactive driving physics / culling constants */
export const POV_CONFIG = {
  FOV_CAB: 64,
  FOV_PASSENGER: 68,
  FOV_DRIVE_CABIN: 68,
  FOV_DRIVE_TOP: 52,
  NEAR: 0.35,
  FAR: 1400,
  METRO_CAB_OFFSET_FWD: 8.6,
  METRO_CAB_HEIGHT: 2.05,
  METRO_PASSENGER_HEIGHT: 1.85,
  METRO_PASSENGER_SIDE_OFFSET: 1.08,
  DRIVE_CABIN_HEIGHT: 1.32,
  DRIVE_CABIN_FWD: 0.25,
  DRIVE_TOP_DISTANCE: 19.0,
  DRIVE_TOP_HEIGHT: 14.0,
  DRIVE_MAX_SPEED: 18.5,
  DRIVE_REVERSE_MAX_SPEED: 6.5,
  DRIVE_ACCEL: 9.8,
  DRIVE_BRAKE: 18.5,
  DRIVE_DRAG: 2.4,
  DRIVE_STEER_RATE: 1.9,
  CULL_MAX_DIST: 360,
  CULL_FURN_DIST: 210,
  CULL_VEHICLE_DIST: 230,
  LOD_L3_DIST: 95,
  LOD_L2_DIST: 200,
} as const;

export const azOf = (k: number): number => Math.PI / 4 - (k * Math.PI) / 2;

export const VEHICLE_KINDS: VehicleKind[] = ['bike', 'sedan', 'hatch', 'taxi', 'van'];

export const MOVE_KEYS: Readonly<Record<string, [number, number]>> = {
  w: [0, 1],
  arrowup: [0, 1],
  s: [0, -1],
  arrowdown: [0, -1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
};

export const SURFACE_TOKEN: Record<Surface, string> = {
  ground: '--body',
  wall: '--body',
  roof: '--deck',
  glass: '--glass',
  road: '--recess',
  walk: '--deck',
  marking: '--line',
  grass: '--panel',
  water: '--glass',
  pitch: '--recess',
  plaza: '--deck',
  metal: '--deck',
  awning: '--deck',
  plant: '--panel',
};

export const SHELL_VERT = `uniform vec2 res;
  void main() {
    vec4 p4 = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p4 = instanceMatrix * p4; n = mat3(instanceMatrix) * n;
    #endif
    vec4 p = projectionMatrix * modelViewMatrix * p4;
    vec4 d4 = projectionMatrix * vec4(normalize(normalMatrix * n), 0.0);
    vec2 d = length(d4.xy) > 1e-5 ? normalize(d4.xy) : vec2(0.0);
    p.xy += d * 2.0 / res * p.w;
    gl_Position = p;
  }`;
