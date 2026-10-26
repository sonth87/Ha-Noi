/**
 * Điểm xuất hợp nhất các bộ dựng 3D cho công trình biểu tượng & di tích của Thành phố Hà Nội (`vn/ha-noi`).
 *
 * Cấu trúc thư mục chuẩn theo quốc gia / thành phố:
 * `apps/city3d/src/render/landmarks/<country>/<city>/`
 */

export {
  drawHaNoiCatalogLandmarkBuilding,
  HA_NOI_CATALOG_CUSTOM_MASSING_MODELS,
  haNoiCatalogLandmarkBeaconsOf,
  haNoiCatalogLandmarkExtraBoundsPts,
  haNoiCatalogLandmarkFlagsOf,
} from './catalog-builders';

import type { CityLandmarks } from '@render/landmarks';
import {
  CUSTOM_MASSING_MODELS, drawLandmarkBuilding, drawMonumentFeature, landmarkBeaconsOf, landmarkExtraBoundsPts, landmarkFlagsOf, landmarkSurfaceMap,
} from './models';

export { NGOC_SON_MAP_CENTRE } from './models';

/** every bespoke model of Hà Nội behind the common interface (render/landmarks.ts) */
export const HA_NOI_LANDMARKS: CityLandmarks = {
  customMassing: CUSTOM_MASSING_MODELS,
  draw: drawLandmarkBuilding,
  surfaceMap: landmarkSurfaceMap,
  flagsOf: landmarkFlagsOf,
  beaconsOf: landmarkBeaconsOf,
  extraBoundsPts: landmarkExtraBoundsPts,
  drawMonument: (B, f) => { drawMonumentFeature(B, f); return true; },
};
