/**
 * Hồ sơ dữ liệu đô thị và công trình biểu tượng cho Thành phố Hà Nội (`vn/ha-noi`).
 *
 * Cấu trúc thư mục chuẩn theo quốc gia / thành phố:
 * - `districts.ts`: phân vùng hành chính (12 quận / phường nội đô) & ga đường sắt đô thị
 * - `places.ts`: địa danh (places) hiển thị trên bản đồ
 * - `heritage-notes.ts`: thuyết minh di tích & ghi đè tên hiển thị
 * - `overrides.ts`: ghi đè cao tầng, mặt đứng và mô hình 3D theo OSM source ID
 * - `catalog-part1.ts` & `catalog-part2.ts` & `landmarks-catalog.ts`: danh mục 208 công trình biểu tượng (13 nhóm)
 */

import { HA_NOI_REGION, districtOf, haNoiStationMeta } from './districts';
import { HA_NOI_AREA_NAME_OVERRIDES, HA_NOI_BASE_HERITAGE_NOTES } from './heritage-notes';
import {
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
  findHaNoiCatalogLandmark,
} from './landmarks-catalog';
import { HA_NOI_BUILDING_OVERRIDES } from './overrides';
import { HA_NOI_PLACES } from './places';

/**
 * Bảng thuyết minh di tích & công trình nổi tiếng tại Hà Nội, kết hợp giữa
 * bảng thuyết minh gốc và toàn bộ 208 công trình trong `HA_NOI_LANDMARKS_CATALOG`
 * (bao gồm cả tên chính thức và các tên gọi khác / aliases).
 */
export const HA_NOI_HERITAGE_NOTES: Readonly<Record<string, string>> = (() => {
  const merged: Record<string, string> = { ...HA_NOI_BASE_HERITAGE_NOTES };
  for (const entry of HA_NOI_LANDMARKS_CATALOG) {
    if (!merged[entry.name]) {
      merged[entry.name] = entry.description;
    }
    const stripped = entry.name.replace(/\s*\([^)]*\)\s*$/u, '').trim();
    if (stripped && !merged[stripped]) {
      merged[stripped] = entry.description;
    }
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (!merged[alias]) {
          merged[alias] = entry.description;
        }
      }
    }
  }
  return merged;
})();

/**
 * Cấu hình `AreaConfig` cho khu vực trung tâm Hà Nội (`vn/ha-noi`).
 */
export const HA_NOI_AREA_CONFIG = {
  area: 'nga-tu-thai-ha',
  name: 'Hà Nội 12 Quận (43 Phường mới): Đống Đa – Ba Đình – Hoàn Kiếm – Tây Hồ – Hai Bà Trưng – Thanh Xuân – Cầu Giấy – Nam Từ Liêm – Bắc Từ Liêm – Hà Đông – Hoàng Mai – Long Biên',
  cityName: 'Hà Nội',
  frame: { origin: [21.0092471, 105.8243958] as [number, number], bearing: 62.5 },
  region: HA_NOI_REGION,
  districtOf,
  stationMeta: haNoiStationMeta,
  places: HA_NOI_PLACES,
  areaNameOverrides: HA_NOI_AREA_NAME_OVERRIDES,
  heritageNotes: HA_NOI_HERITAGE_NOTES,
  overrides: {
    buildings: HA_NOI_BUILDING_OVERRIDES,
  },
  landmarksCatalog: HA_NOI_LANDMARKS_CATALOG,
  // drawn in full by drawDenNgocSon: the unnamed bridgehead box by Cầu Thê Húc and Đình Trấn Ba
  skipBuildings: ['osm:way/1220021892', 'osm:way/178995271'],
};

export {
  districtOf,
  findHaNoiCatalogLandmark,
  HA_NOI_AREA_NAME_OVERRIDES,
  HA_NOI_BUILDING_OVERRIDES,
  HA_NOI_LANDMARK_CATEGORIES,
  HA_NOI_LANDMARKS_CATALOG,
  HA_NOI_PLACES,
  HA_NOI_REGION,
  haNoiStationMeta,
};
