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
  MAP_PALETTE: 'city3d-map-palette',
  ACCENT: 'city3d-accent',
  UI_GLASS_MODE: 'city3d-ui-glass-mode',
  UI_OPACITY: 'city3d-ui-opacity',
  UI_LENS_SCALE: 'city3d-ui-lens-scale',
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
export type PovMode = 'map' | 'metro-cab' | 'metro-passenger' | 'drive-cabin' | 'drive-inside';

export const POV_MODES: readonly PovMode[] = [
  'map',
  'metro-cab',
  'metro-passenger',
  'drive-cabin',
  'drive-inside',
] as const;

/** Perspective POV & interactive driving physics / culling constants */
export const POV_CONFIG = {
  FOV_CAB: 62,
  FOV_PASSENGER: 65,
  FOV_DRIVE_CABIN: 60,
  /** inside the car: wide, as a driver sees the street through the windscreen */
  FOV_DRIVE_INSIDE: 74,
  NEAR: 0.35,
  FAR: 1600,
  METRO_CAB_OFFSET_FWD: 8.8,
  METRO_CAB_HEIGHT: 2.45,
  METRO_PASSENGER_HEIGHT: 2.45,
  METRO_PASSENGER_SIDE_OFFSET: 1.15,
  DRIVE_CLOSE_DISTANCE: 8.2,
  DRIVE_CLOSE_HEIGHT: 3.1,
  DRIVE_MAX_SPEED: 14.5,
  DRIVE_REVERSE_MAX_SPEED: 6.0,
  DRIVE_ACCEL: 8.5,
  DRIVE_BRAKE: 16.5,
  DRIVE_DRAG: 3.2,
  DRIVE_STEER_RATE: 2.2,
  CULL_MAX_DIST: 440,
  /** landmarks stay on the skyline out to here (was unbounded: entering POV built every tall tile of the city, CS-09) */
  CULL_LANDMARK_DIST: 3000,
  CULL_FURN_DIST: 240,
  CULL_VEHICLE_DIST: 250,
  LOD_L3_DIST: 110,
  LOD_L2_DIST: 230,
} as const;

/** Bearing (degrees East of True Geographic North) of the local city X-axis (`frame.ts`) */
export const CITY_BEARING_DEG = 62.5;

/** Camera azimuth angle (radians) at which the camera looks due Geographic North (North-up on screen).
 *  In `frame.ts`, Geographic North `(e = 0, n = 1)` maps to `(x = sin(bearing), z = -cos(bearing))`.
 *  For camera horizontal forward `(-cos(az), -sin(az))` to equal `(sin(bearing), -cos(bearing))`,
 *  `az = Math.PI / 2 + (bearing * Math.PI) / 180` (~152.5°). */
export const NORTH_AZ = Math.PI / 2 + (CITY_BEARING_DEG * Math.PI) / 180;

/** Azimuth for the 4 cardinal 90° views: k=0 (North 0°), k=1 (East 90°), k=2 (South 180°), k=3 (West 270°) */
export const azOf = (k: number, northAz = NORTH_AZ): number => northAz - (k * Math.PI) / 2;

/** Convert camera azimuth (radians) to compass heading in degrees [0, 360) (0° = North, 90° = East, 180° = South, 270° = West) */
export const headingFromAz = (az: number, northAz = NORTH_AZ): number =>
  ((((northAz - az) * 180) / Math.PI) % 360 + 360) % 360;

/** Convert compass heading in degrees [0, 360) to camera azimuth (radians) */
export const azFromHeading = (headingDeg: number, northAz = NORTH_AZ): number =>
  northAz - (headingDeg * Math.PI) / 180;

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
  ground: '--surf-ground',
  wall: '--surf-wall',
  roof: '--surf-roof',
  glass: '--surf-glass',
  road: '--surf-road',
  walk: '--surf-walk',
  marking: '--surf-marking',
  grass: '--surf-grass',
  water: '--surf-water',
  pitch: '--surf-pitch',
  plaza: '--surf-plaza',
  metal: '--surf-metal',
  awning: '--surf-awning',
  plant: '--surf-plant',
  'plant-mid': '--surf-plant-mid',
  'plant-dark': '--surf-plant-dark',
  'tree-trunk': '--surf-tree-trunk',
  'heritage-roof': '--surf-heritage-roof',
  'heritage-wall': '--surf-heritage-wall',
  wood: '--surf-wood',
  stone: '--surf-stone',
  bronze: '--surf-bronze',
  'tower-glass': '--surf-tower-glass',
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
