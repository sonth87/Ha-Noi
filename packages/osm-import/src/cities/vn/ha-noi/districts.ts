/* Administrative district / ward boundaries, region bounding rectangles, and transit station
   metadata for Hanoi (vn/ha-noi, ADR-054, ADR-055). Pure. */
import { pointInRing, type Rect, type Vec2 } from '@my-city/core';
import { HA_NOI_WARD_OUTLINES } from './wards.data';

const WARD_LIST = Object.entries(HA_NOI_WARD_OUTLINES);

const LINE_3_STATIONS = new Set([
  'Cầu Giấy',
  'Chùa Hà',
  'Đại học Quốc gia',
  'Lê Đức Thọ',
  'Cầu Diễn',
  'Phú Diễn',
  'Minh Khai',
  'Nhổn',
]);

/** Resolve city-frame [x, y] into Hanoi's 43 official 2025 Phường (ward) administrative units across
    Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân, Cầu Giấy, Nam Từ Liêm, Bắc Từ Liêm, Hà Đông, Hoàng Mai, and Long Biên */
export const districtOf = (pt: readonly [number, number]): string => {
  // the real OSM outline first; the rectangles below only cover what falls outside every outline
  for (const [name, w] of WARD_LIST) if (pointInRing([pt[0], pt[1]], w.polygon)) return name;
  const [x, y] = pt;
  // 1. Khu vực Long Biên (phía Đông qua Sông Hồng)
  if (x >= 4680 && y >= -1200) {
    if (x >= 7200) return y < 3800 ? 'Phường Việt Hưng' : 'Phường Phúc Lợi';
    return y < 3400 ? 'Phường Bồ Đề' : 'Phường Long Biên';
  }
  if (x >= 4100 && y >= 3400) return 'Phường Long Biên';

  // 2. Khu vực Tây Hồ (Hồ Tây & Phú Thượng / Nhật Tân)
  if (x >= 3550 && y < -450) {
    if (y < -4720 && x <= 7500) {
      return y < -7800 ? 'Phường Đông Ngạc' : 'Phường Phú Thượng';
    }
    return 'Phường Tây Hồ';
  }

  // 3. Khu vực Bắc Từ Liêm (Xuân Đỉnh, Phú Diễn, Đông Ngạc, Tây Tựu, Thượng Cát)
  if (y < -5200 && x >= -450) {
    if (y < -10800 && x >= 1850) return 'Phường Thượng Cát';
    if (y < -8200) return x >= 1850 ? 'Phường Đông Ngạc' : 'Phường Tây Tựu';
    if (y < -7800 && x >= 1850) return 'Phường Đông Ngạc';
    return x >= 1850 ? 'Phường Xuân Đỉnh' : 'Phường Phú Diễn';
  }

  // 4. Khu vực Cầu Giấy (Nghĩa Đô, Cầu Giấy, Yên Hòa)
  if (y < -2800 && x >= 1350 && x < 3550) return 'Phường Nghĩa Đô';
  if (y < -1860 && x >= -450 && x < 1350) return 'Phường Cầu Giấy';
  if (y < -1630 && x >= -1650 && x < -450) return 'Phường Yên Hòa';

  // 5. Khu vực Nam Từ Liêm (Từ Liêm / Mỹ Đình, Đại Mỗ / Mễ Trì, Tây Mỗ, Xuân Phương)
  if (y < -1630 && x < -450 && x >= -5200) {
    if (y < -6800) return 'Phường Xuân Phương';
    if (y < -4500) return x < -2600 ? 'Phường Tây Mỗ' : 'Phường Từ Liêm';
    if (x >= -4600 && y >= -2400 && x < -3080) return 'Phường Hà Đông';
    return 'Phường Đại Mỗ';
  }

  // 6. Khu vực Hà Đông (Hà Đông, Dương Nội, Yên Nghĩa, Kiến Hưng, Phú Lương)
  if (x < -3080 && y < 1850) {
    if (x < -6200) {
      if (y < -1800) return x < -7400 ? 'Phường Yên Nghĩa' : 'Phường Dương Nội';
      return 'Phường Phú Lương';
    }
    if (y < -2400) return 'Phường Dương Nội';
    return y >= 350 ? 'Phường Kiến Hưng' : 'Phường Hà Đông';
  }

  // 7. Khu vực Hoàng Mai (Định Công, Tương Mai, Vĩnh Hưng, Hoàng Mai, Hoàng Liệt, Yên Sở, Lĩnh Nam)
  if (y >= 3620 || (y >= 930 && x < -150)) {
    if (y < 2850 && x < -850) return 'Phường Định Công';
    if (y >= 2850 && x < -1850) return 'Phường Hoàng Liệt';
    if (y >= 6150) return x >= 950 ? 'Phường Lĩnh Nam' : 'Phường Yên Sở';
    if (x >= 950) return y >= 5650 ? 'Phường Lĩnh Nam' : 'Phường Vĩnh Hưng';
    return y >= 4850 ? 'Phường Hoàng Mai' : 'Phường Tương Mai';
  }

  // 8. Khu vực Hoàn Kiếm (Hồ Gươm, Phố cổ, Cửa Nam)
  if (x >= 2350 && y >= 550 && y < 2680) {
    return x < 2880 && y < 1680 ? 'Phường Cửa Nam' : 'Phường Hoàn Kiếm';
  }
  // 9. Khu vực Hai Bà Trưng (Công viên Thống Nhất, Bà Triệu, Bách Khoa, Bạch Mai)
  if (y >= 1120 && x >= -150) {
    return y >= 1950 && x < 1350 ? 'Phường Bạch Mai' : 'Phường Hai Bà Trưng';
  }
  // 10. Khu vực Thanh Xuân (Ngã Tư Sở, Royal City, Nguyễn Trãi, Khương Đình)
  if (x < -820 || (x < -350 && y >= 320)) {
    return y >= -120 ? 'Phường Khương Đình' : 'Phường Thanh Xuân';
  }
  // 11. Khu vực Ba Đình (Lăng Bác, Hoàng Thành, Ngọc Hà, Đội Cấn, Liễu Giai, Giảng Võ)
  if (x >= 1680 && y < 550) {
    if (x >= 2550 && y >= -1150) return 'Phường Ba Đình';
    if (y < -1150 && x >= 2100) return 'Phường Ngọc Hà';
    if (y < -650) return 'Phường Giảng Võ';
  }
  if (x >= 650 && y < -1150) {
    return x >= 1350 ? 'Phường Giảng Võ' : 'Phường Láng';
  }
  // 12. Khu vực Đống Đa (Văn Miếu – Quốc Tử Giám, Ô Chợ Dừa, Đống Đa, Kim Liên, Láng)
  if (x >= 1650 && y >= -650 && y < 550) return 'Phường Văn Miếu – Quốc Tử Giám';
  if (y < -720) return 'Phường Láng';
  if (x >= 520 && y < 180) return 'Phường Ô Chợ Dừa';
  if (y >= 320) return 'Phường Kim Liên';
  return 'Phường Đống Đa';
};

/** 12 Hanoi urban districts (43 official 2025 wards) bounding rectangles in city frame (m) */
export const HA_NOI_REGION: Rect[] = [
  // Đống Đa
  { x0: -1060, y0: -1880, x1: 2550, y1: 1120 },
  // Ba Đình
  { x0: 650, y0: -2820, x1: 4150, y1: 600 },
  // Hoàn Kiếm (Hồ Gươm, Phố cổ, Nhà hát Lớn, Nhà thờ Lớn, Chợ Đồng Xuân, Cầu Long Biên)
  { x0: 2300, y0: 550, x1: 4700, y1: 2700 },
  // Tây Hồ (Phường Tây Hồ & Phường Phú Thượng – Hồ Tây, Chùa Trấn Quốc, Phủ Tây Hồ, Cầu Nhật Tân)
  { x0: 3400, y0: -7850, x1: 7550, y1: -450 },
  // Hai Bà Trưng (Công viên Thống Nhất, Hồ Bảy Mẫu, Bà Triệu, Đền Hai Bà Trưng, ĐH Bách Khoa, Bạch Mai)
  { x0: -150, y0: 1050, x1: 3100, y1: 3650 },
  // Thanh Xuân (Royal City, Ngã Tư Sở, Nguyễn Trãi, Khuất Duy Tiến, Khương Đình, Khương Hạ)
  { x0: -3100, y0: -1650, x1: -650, y1: 950 },
  // Cầu Giấy (Phường Nghĩa Đô, Phường Cầu Giấy, Phường Yên Hòa)
  { x0: -1700, y0: -5250, x1: 3580, y1: -1620 },
  // Nam Từ Liêm (Phường Từ Liêm, Phường Đại Mỗ, Phường Tây Mỗ, Phường Xuân Phương)
  { x0: -5250, y0: -9550, x1: -420, y1: -1620 },
  // Bắc Từ Liêm (Phường Xuân Đỉnh, Phường Phú Diễn, Phường Đông Ngạc, Phường Tây Tựu, Phường Thượng Cát)
  { x0: -480, y0: -12650, x1: 6250, y1: -5180 },
  // Hà Đông (Phường Hà Đông, Phường Dương Nội, Phường Yên Nghĩa, Phường Kiến Hưng, Phường Phú Lương)
  { x0: -9850, y0: -5650, x1: -3050, y1: 1900 },
  // Hoàng Mai (Phường Định Công, Phường Tương Mai, Phường Vĩnh Hưng, Phường Hoàng Mai, Phường Hoàng Liệt, Phường Yên Sở, Phường Lĩnh Nam)
  { x0: -4250, y0: 920, x1: 3450, y1: 7650 },
  // Long Biên (Phường Bồ Đề, Phường Long Biên, Phường Việt Hưng, Phường Phúc Lợi)
  { x0: 4050, y0: -1250, x1: 9450, y1: 7250 },
];

export const haNoiStationMeta = (rawName: string, at: Vec2) => {
  const clean = rawName.replace(/^Ga\s+/i, '').trim() || 'Thái Hà';
  const isLine3 = LINE_3_STATIONS.has(clean);
  const lineTag = isLine3 ? 'Metro 3' : 'Metro 2A';
  const lineName = isLine3 ? 'Tuyến số 3 Nhổn – Ga Hà Nội' : 'Tuyến số 2A Cát Linh – Hà Đông';
  const address = /Thái Hà/i.test(clean)
    ? 'Phố Hoàng Cầu – Thái Hà, Phường Ô Chợ Dừa'
    : /La Thành/i.test(clean)
      ? 'Phố Hoàng Cầu – Đê La Thành, Phường Ô Chợ Dừa'
      : /Cát Linh/i.test(clean)
        ? 'Phố Cát Linh – Hào Nam, Phường Ô Chợ Dừa'
        : /Cầu Giấy/i.test(clean)
          ? 'Nút giao Cầu Giấy – Kim Mã, Phường Ngọc Hà'
          : isLine3
            ? 'Trục Cầu Giấy – Hồ Tùng Mậu – Nhổn, Hà Nội'
            : 'Trục đường Láng – Nguyễn Trãi – Quang Trung, Hà Nội';
  return { lineTag, lineName, address, district: districtOf(at) };
};
