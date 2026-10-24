/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc & Hà Nội 12 Quận (`vn/ha-noi`):
   Toàn bộ dữ liệu địa danh, di tích, thuyết minh, overrides và danh mục 208 công trình biểu tượng
   được tổ chức tại `./cities/vn/ha-noi/`. File này giữ lại điểm xuất tương thích ngược. */
import type { AreaConfig } from './import';
import {
  districtOf,
  findHaNoiCatalogLandmark,
  HA_NOI_AREA_CONFIG,
  HA_NOI_HERITAGE_NOTES,
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
} from './cities/vn/ha-noi/index';

export const NGA_TU_THAI_HA: AreaConfig = HA_NOI_AREA_CONFIG;

export {
  districtOf,
  findHaNoiCatalogLandmark,
  HA_NOI_AREA_CONFIG,
  HA_NOI_HERITAGE_NOTES,
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
};
