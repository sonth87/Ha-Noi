/**
 * Danh mục 13 nhóm công trình biểu tượng, di tích lịch sử - văn hóa, tôn giáo,
 * cơ quan Trung ương, bảo tàng, cao ốc, khách sạn và hạ tầng lớn tại Hà Nội (`vn/ha-noi`).
 */

import type { CityLandmarkCatalogEntry, LandmarkCategoryMeta } from '@my-city/core';

import { HA_NOI_LANDMARKS_PART1 } from './catalog-part1';
import { HA_NOI_LANDMARKS_PART2 } from './catalog-part2';

/**
 * 13 nhóm phân loại chuẩn cho hồ sơ công trình biểu tượng & di tích của mỗi thành phố/khu vực.
 * Khi mở rộng bất kỳ vùng, tỉnh, thành phố, quận, huyện, phường, xã mới nào,
 * bắt buộc rà soát đủ 13 nhóm này để lập dữ liệu vẽ 3D riêng.
 */
export const HA_NOI_LANDMARK_CATEGORIES: readonly LandmarkCategoryMeta[] = [
  {
    id: '1-cua-o-cong-thanh',
    order: 1,
    title: '1. Cửa Ô, Cổng Thành & Thành Quách Cổ',
    description:
      'Các cửa ô Thăng Long xưa, cổng thành, kỳ đài, điện cổ Hoàng thành Thăng Long, thành Cổ Loa và thành cổ Sơn Tây.',
  },
  {
    id: '2-chinh-phu-trung-uong',
    order: 2,
    title: '2. Toà nhà Chính phủ, Cơ quan Trung ương Đảng & Nhà khách Nhà nước',
    description:
      'Lăng Chủ tịch Hồ Chí Minh, Phủ Chủ tịch, Nhà Quốc hội, trụ sở các Ban Trung ương Đảng, Văn phòng Chính phủ, các Bộ, ngành và UBND/HĐND TP Hà Nội.',
  },
  {
    id: '3-nha-tho-ton-giao',
    order: 3,
    title: '3. Hệ thống Nhà thờ (Công giáo, Tin lành) & Công trình Tôn giáo',
    description:
      'Nhà thờ Lớn, Nhà thờ Cửa Bắc, Hàm Long, Thái Hà, Phùng Khoang, các nhà thờ giáo xứ cổ, nhà thờ Tin lành và Thánh đường Hồi giáo Al-Noor.',
  },
  {
    id: '4-tuong-dai-chien-cong',
    order: 4,
    title: '4. Đài Tưởng niệm, Tượng đài & Di tích Chiến công',
    description:
      'Đài tưởng niệm Bắc Sơn, Khâm Thiên, tượng đài các vị vua anh hùng dân tộc, tượng đài Cảm tử, Quyết tử và di tích chiến thắng B-52.',
  },
  {
    id: '5-ho-guom-pho-co',
    order: 5,
    title: '5. Cụm danh thắng Hồ Hoàn Kiếm, Phố Cổ & Di tích Đô thị',
    description:
      'Tháp Rùa, Đền Ngọc Sơn, Cầu Thê Húc, Tháp Bút, Tháp Hòa Phong, Bốt Hàng Đậu, nhà cổ, đình tổ nghề phố cổ và các chợ truyền thống.',
  },
  {
    id: '6-tu-tran-den-phu',
    order: 6,
    title: '6. Tứ Trấn Thăng Long, Đền, Phủ & Đạo Quán',
    description:
      'Tứ Trấn Thăng Long (Bạch Mã, Voi Phục, Quán Thánh, Kim Liên), Phủ Tây Hồ, Đền Hai Bà Trưng, Đền Gióng và các đền linh thiêng.',
  },
  {
    id: '7-chua-co-phat-giao',
    order: 7,
    title: '7. Chùa Cổ, Thiền viện & Quần thể Phật giáo',
    description:
      'Chùa Một Cột, Chùa Trấn Quốc, Chùa Quán Sứ, Chùa Láng, Chùa Kim Liên và các đại danh lam cổ tự xứ Đoài - Kinh Bắc - Sơn Nam.',
  },
  {
    id: '8-dinh-co-lang-xa',
    order: 8,
    title: '8. Đình Cổ & Kiến trúc Làng Xã Ngoại thành',
    description:
      'Các ngôi đình gỗ thế kỷ XVI–XVIII tiêu biểu (Tây Đằng, Chu Quyến, Đình So, Mông Phụ, Đại Phùng, Tường Phiêu) và cổng làng cổ.',
  },
  {
    id: '9-kien-truc-phap-van-hoa-giao-duc-y-te',
    order: 9,
    title: '9. Công trình Văn hóa, Giáo dục & Y tế thời Pháp thuộc',
    description:
      'Văn Miếu - Quốc Tử Giám, Nhà hát Lớn, Ga Hà Nội, các trường trung học/đại học Đông Dương, viện nghiên cứu, bệnh viện cổ và di tích Nhà tù Hỏa Lò.',
  },
  {
    id: '10-bao-tang-trien-lam',
    order: 10,
    title: '10. Bảo tàng & Trung tâm Triển lãm',
    description:
      'Hệ thống bảo tàng quốc gia, bảo tàng chuyên ngành và Trung tâm Triển lãm Quốc gia tại Hà Nội.',
  },
  {
    id: '11-cao-oc-tttm-hien-dai',
    order: 11,
    title: '11. Toà nhà Cao tầng, Trung tâm Thương mại & Tổ hợp Hiện đại',
    description:
      'Các tòa tháp chọc trời biểu tượng (Landmark 72, Lotte Center, TechnoPark), cao ốc tài chính và đại trung tâm thương mại.',
  },
  {
    id: '12-khach-san-sang-trong',
    order: 12,
    title: '12. Khách sạn Sang trọng & Nổi tiếng',
    description:
      'Các khách sạn di sản thế kỷ XX (Metropole) và các tổ hợp khách sạn 5 sao quốc tế mang kiến trúc đặc sắc.',
  },
  {
    id: '13-cau-ha-tang-the-thao',
    order: 13,
    title: '13. Cầu, Hạ tầng, Thể thao & Công trình Văn hoá Quy mô lớn',
    description:
      'Các cây cầu lịch sử và hiện đại vượt sông Hồng, Sân vận động Quốc gia Mỹ Đình, Trung tâm Hội nghị Quốc gia và các cung thể thao, thiếu nhi.',
  },
];

/**
 * Toàn bộ 208 công trình biểu tượng & di tích của Hà Nội thuộc 13 nhóm phân loại.
 */
export const HA_NOI_LANDMARKS_CATALOG: readonly CityLandmarkCatalogEntry[] = [
  ...HA_NOI_LANDMARKS_PART1,
  ...HA_NOI_LANDMARKS_PART2,
];

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

const BY_NAME_OR_ALIAS = new Map<string, CityLandmarkCatalogEntry>();
const BY_OSM_SOURCE = new Map<string, CityLandmarkCatalogEntry>();

for (const entry of HA_NOI_LANDMARKS_CATALOG) {
  BY_NAME_OR_ALIAS.set(normalizeKey(entry.id), entry);
  BY_NAME_OR_ALIAS.set(normalizeKey(entry.name), entry);
  const stripped = entry.name.replace(/\s*\([^)]*\)\s*$/u, '').trim();
  if (stripped && stripped !== entry.name) {
    BY_NAME_OR_ALIAS.set(normalizeKey(stripped), entry);
  }
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      BY_NAME_OR_ALIAS.set(normalizeKey(alias), entry);
    }
  }
  if (entry.osmSource) {
    BY_OSM_SOURCE.set(entry.osmSource, entry);
  }
}

/**
 * Tra cứu công trình biểu tượng Hà Nội theo OSM source (`way/...`, `relation/...`),
 * tên chính thức hoặc tên gọi khác (alias).
 */
export function findHaNoiCatalogLandmark(
  nameOrAliasOrSource: string,
): CityLandmarkCatalogEntry | undefined {
  const raw = nameOrAliasOrSource.trim();
  return BY_OSM_SOURCE.get(raw) ?? BY_NAME_OR_ALIAS.get(normalizeKey(raw));
}
