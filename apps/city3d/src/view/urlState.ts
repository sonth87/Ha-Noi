/* Google Maps–style URL state synchronization (`/@lat,lon,157m,0h,35.3t,2d?...`).
   Encodes and decodes camera position (WGS84 lat/lon ↔ city metres), zoom/scale in metres (`157m`),
   camera heading (`0h..360h`), elevation/tilt (`35.3t`), 2D/3D mode (`2d`/`3d`), and active view
   options (night theme, see-through, street labels, place info, showcase, or open place popup). */
import { AREA_CONFIGS, projector, unprojector, type Frame } from '@my-city/osm-import';
import { STREET_LABEL_MODES, type StreetLabelMode } from './streetLabels';
import { PLACE_INFO_MODES, type PlaceInfoMode } from './placeInfo';

const DEFAULT_FRAME: Frame = AREA_CONFIGS['nga-tu-thai-ha']?.frame ?? {
  origin: [21.0092471, 105.8243958],
  bearing: 62.5,
};

const FRUSTUM = 300;
const ISO_EL_DEG = (Math.asin(1 / Math.sqrt(3)) * 180) / Math.PI; // ~35.264°

export interface UrlViewState {
  /** target ground position in city metres [x, z] */
  x: number;
  z: number;
  /** camera zoom (FRUSTUM / metres) */
  zoom: number;
  /** camera heading in degrees (0 = default view 0, clockwise) */
  heading: number;
  /** camera elevation angle above ground in degrees (~35.3 in 2D) */
  tilt: number;
  /** '2d' or '3d' */
  mode: '2d' | '3d';
  /** optional overrides parsed from query or state */
  night?: boolean;
  seeThrough?: boolean;
  streetLabels?: StreetLabelMode;
  placeInfo?: PlaceInfoMode;
  showcase?: string | null;
  place?: string | null;
}

export function frameForCity(cityId: string): Frame {
  return AREA_CONFIGS[cityId]?.frame ?? DEFAULT_FRAME;
}

/** Format the current view state into a Google Maps–style URL path + query string */
export function formatUrlState(state: UrlViewState, frame: Frame = DEFAULT_FRAME): string {
  const toLatLon = unprojector(frame);
  const [lat, lon] = toLatLon(state.x, state.z);
  const latStr = lat.toFixed(7);
  const lonStr = lon.toFixed(7);

  const metres = Math.max(5, Math.min(2500, FRUSTUM / Math.max(0.14, state.zoom)));
  const metresStr = metres < 50 ? `${ Number(metres.toFixed(1)) }m` : `${ Math.round(metres) }m`;

  const headingNorm = ((((Math.round(state.heading * 10) / 10) % 360) + 360) % 360);
  const headingStr = `${ Number(headingNorm.toFixed(1)) }h`;

  const tiltNum = Number(Math.max(3, Math.min(85, state.tilt)).toFixed(1));
  const tiltStr = `${ tiltNum }t`;

  const atPart = `/@${ latStr },${ lonStr },${ metresStr },${ headingStr },${ tiltStr },${ state.mode }`;

  const params = new URLSearchParams();
  if (state.night) params.set('theme', 'night');
  if (state.seeThrough === false) params.set('xray', '0');
  if (state.streetLabels && state.streetLabels !== 'pin') params.set('labels', state.streetLabels);
  if (state.placeInfo && state.placeInfo !== 'popup') params.set('info', state.placeInfo);
  if (state.showcase) params.set('showcase', state.showcase);
  else if (state.place) params.set('place', state.place);

  const qs = params.toString();
  return qs ? `${ atPart }?${ qs }` : atPart;
}

/** Parse a Google Maps–style URL (`/@lat,lon,157m,...`, `#@lat,lon,...`, or query string) into view state */
export function parseUrlState(
  loc: { pathname: string; search: string; hash: string },
  frame: Frame = DEFAULT_FRAME,
): Partial<UrlViewState> | null {
  const toXY = projector(frame);
  let rawAt = '';

  // Support `/@lat,lon,...` in pathname, `#@lat,lon,...` in hash, or `?at=...` in search
  const pathMatch = loc.pathname.match(/\/@([^/]+)/);
  const hashMatch = loc.hash.match(/^#\/?@([^?]+)/);
  if (pathMatch?.[1]) {
    rawAt = decodeURIComponent(pathMatch[1]);
  } else if (hashMatch?.[1]) {
    rawAt = decodeURIComponent(hashMatch[1]);
  }

  let searchStr = loc.search;
  if (!searchStr && loc.hash.includes('?')) {
    searchStr = loc.hash.slice(loc.hash.indexOf('?'));
  }
  const params = new URLSearchParams(searchStr);
  if (!rawAt && params.has('at')) {
    rawAt = params.get('at') ?? '';
  }

  const out: Partial<UrlViewState> = {};
  let hasAny = false;

  if (rawAt) {
    const tokens = rawAt.split(',').map(s => s.trim()).filter(Boolean);
    if (tokens.length >= 2) {
      const lat = Number.parseFloat(tokens[0]!);
      const lon = Number.parseFloat(tokens[1]!);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const [x, z] = toXY(lat, lon);
        out.x = x;
        out.z = z;
        hasAny = true;
      }
    }

    for (let i = 2; i < tokens.length; i++) {
      const tok = tokens[i]!.toLowerCase();
      if (tok === '2d' || tok === '3d') {
        out.mode = tok;
        hasAny = true;
        continue;
      }
      const num = Number.parseFloat(tok);
      if (!Number.isFinite(num)) continue;
      if (tok.endsWith('m')) {
        // Viewport height in metres (e.g. `157m` -> zoom = 300 / 157)
        out.zoom = Math.max(0.14, Math.min(60, FRUSTUM / Math.max(1, num)));
        hasAny = true;
      } else if (tok.endsWith('z')) {
        // Either Google Maps zoom level (12..22) or direct app zoom
        if (num >= 12 && num <= 22) {
          const approxMetres = 156543 * Math.cos((frame.origin[0] * Math.PI) / 180) * 600 / (2 ** num);
          out.zoom = Math.max(0.14, Math.min(60, FRUSTUM / Math.max(5, approxMetres)));
        } else {
          out.zoom = Math.max(0.14, Math.min(60, num));
        }
        hasAny = true;
      } else if (tok.endsWith('h')) {
        out.heading = ((num % 360) + 360) % 360;
        hasAny = true;
      } else if (tok.endsWith('t')) {
        out.tilt = Math.max(3, Math.min(82, num));
        hasAny = true;
      }
    }

    // If heading or tilt requires free orbit and mode wasn't explicitly locked to 2d, enable 3d mode
    if (!out.mode) {
      const nonIsoTilt = out.tilt !== undefined && Math.abs(out.tilt - ISO_EL_DEG) > 1.2;
      const nonIsoHeading = out.heading !== undefined && Math.abs(out.heading - Math.round(out.heading / 90) * 90) > 1.5;
      if (nonIsoTilt || nonIsoHeading) out.mode = '3d';
    }
  }

  const themeParam = params.get('theme');
  if (themeParam === 'night' || themeParam === 'dark') {
    out.night = true;
    hasAny = true;
  } else if (themeParam === 'day' || themeParam === 'light') {
    out.night = false;
    hasAny = true;
  }

  const xrayParam = params.get('xray');
  if (xrayParam === '1' || xrayParam === 'true') {
    out.seeThrough = true;
    hasAny = true;
  } else if (xrayParam === '0' || xrayParam === 'false') {
    out.seeThrough = false;
    hasAny = true;
  }

  const labelsParam = params.get('labels') as StreetLabelMode | null;
  if (labelsParam && STREET_LABEL_MODES.includes(labelsParam)) {
    out.streetLabels = labelsParam;
    hasAny = true;
  }

  const infoParam = params.get('info') as PlaceInfoMode | null;
  if (infoParam && PLACE_INFO_MODES.includes(infoParam)) {
    out.placeInfo = infoParam;
    hasAny = true;
  }

  const showcaseParam = params.get('showcase');
  if (showcaseParam) {
    out.showcase = showcaseParam;
    hasAny = true;
  }

  const placeParam = params.get('place');
  if (placeParam) {
    out.place = placeParam;
    hasAny = true;
  }

  return hasAny ? out : null;
}
