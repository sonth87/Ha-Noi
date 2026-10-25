/**
 * Bộ dựng 3D chuyên biệt (bespoke 3D builders) cho 13 nhóm công trình biểu tượng,
 * di tích lịch sử - văn hóa, cơ quan Trung ương, nhà thờ, tượng đài, đình chùa cổ,
 * trường/bệnh viện Pháp thuộc, bảo tàng, trung tâm thương mại, khách sạn 5 sao và
 * cầu/nhà thi đấu lớn tại Hà Nội (`vn/ha-noi`).
 */

import * as THREE from 'three';
import { centroid, floorId, partTop, type Building, type Vec2 } from '@my-city/core';
import { V, type Batch } from '@render/batch';
import type { Detail } from '@render/buildings';
import type { WavingFlagSpec } from '@render/flags';
import {
  addBandWindows,
  drawTraditionalCurvedRoof,
  localPt,
  localRect,
  orientBoxTowardEast,
  orientedBoxOf,
  regPoly,
  scaleRing,
  type OrientedBox,
} from '@render/landmarks/shared';

/**
 * Các mô hình trong danh mục Hà Nội thay thế hoàn toàn khối hộp cơ sở bằng kiến trúc 3D riêng.
 */
export const HA_NOI_CATALOG_CUSTOM_MASSING_MODELS = new Set<string>([
  'city-gate-stele',
  'bac-mon',
  'dien-kinh-thien',
  'hau-lau',
  'co-loa-citadel',
  'party-central-hq',
  'bac-bo-phu',
  'ministry-palace',
  'nha-tho-cua-bac',
  'nha-tho-ham-long',
  'al-noor-mosque',
  'statue-monument-plaza',
  'tuong-dai-cam-tu',
  'tuong-dai-quang-trung',
  'b52-huu-tiep-lake',
  'cau-the-huc',
  'thap-but',
  'thap-hoa-phong',
  'thap-nuoc-hang-dau',
  'nha-co-ma-may',
  'traditional-market-hall',
  'mountain-pagoda-complex',
  'ancient-communal-house',
  'ancient-village-gate',
  'ga-ha-noi',
  'french-colonial-university',
  'fine-arts-museum',
  'military-history-museum',
  'national-exhibition-center',
  'modern-mall-complex',
  'metropole-hotel',
  'jw-marriott-hanoi',
  'intercontinental-westlake',
  'pan-pacific-hanoi',
  'cau-chuong-duong',
  'arch-extradosed-bridge',
  'indoor-sports-arena',
]);

/**
 * Cờ Tổ quốc và cờ hội truyền thống cho các công trình trong danh mục Hà Nội.
 */
export function haNoiCatalogLandmarkFlagsOf(b: Building): WavingFlagSpec[] {
  switch (b.model) {
    case 'bac-mon':
    case 'dien-kinh-thien':
    case 'co-loa-citadel':
    case 'party-central-hq':
    case 'bac-bo-phu':
    case 'ministry-palace':
    case 'ga-ha-noi':
    case 'french-colonial-university':
    case 'fine-arts-museum':
    case 'military-history-museum':
    case 'national-exhibition-center':
    case 'indoor-sports-arena': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      const top = Math.max(12, ...b.parts.map(partTop));
      const polePos =
        b.model === 'military-history-museum'
          ? localPt(ob, 0, -ob.hd - 14)
          : localPt(ob, 0, -ob.hd * 0.65);
      const zBase = b.model === 'military-history-museum' ? 43.0 : top + 3.5;
      return [
        {
          id: `${b.id}:flag:vn`,
          polePos,
          z0: zBase,
          z1: zBase + 3.2,
          width: 4.5,
          dir: ob.u,
          phase: 0.9,
          country: 'vn',
        },
      ];
    }
    case 'mountain-pagoda-complex':
    case 'ancient-communal-house':
    case 'ancient-village-gate': {
      const ob = orientedBoxOf(b.footprint, b.front);
      const flagPos = localPt(ob, -ob.hw - 2.0, -ob.hd - 2.0);
      return [
        {
          id: `${b.id}:flag:festive`,
          polePos: flagPos,
          z0: 6.0,
          z1: 8.8,
          width: 3.0,
          dir: ob.u,
          phase: 1.7,
          country: 'festive',
        },
      ];
    }
    default:
      return [];
  }
}

/**
 * Đèn cảnh báo hàng không ban đêm cho các tháp cao và công trình quy mô lớn trong danh mục Hà Nội.
 */
export function haNoiCatalogLandmarkBeaconsOf(b: Building): THREE.Vector3[] {
  switch (b.model) {
    case 'luxury-hotel-tower':
    case 'pan-pacific-hanoi': {
      const tallest = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
      const tc = centroid(tallest.footprint);
      return [V(tc[0], tc[1], partTop(tallest) + 8.0)];
    }
    case 'military-history-museum': {
      const ob = orientedBoxOf(b.footprint, b.front);
      const towerPt = localPt(ob, 0, -ob.hd - 14);
      return [V(towerPt[0], towerPt[1], 46.5)];
    }
    case 'national-exhibition-center': {
      const c = centroid(b.footprint);
      return [V(c[0], c[1], 56.5)];
    }
    default:
      return [];
  }
}

/**
 * Mở rộng vùng biên diorama showcase cho các quần thể có hồ nước, sân đình, tháp tiền cảnh.
 */
export function haNoiCatalogLandmarkExtraBoundsPts(b: Building): Vec2[] {
  const c = centroid(b.footprint);
  switch (b.model) {
    case 'co-loa-citadel':
    case 'mountain-pagoda-complex':
    case 'ancient-communal-house':
    case 'military-history-museum':
    case 'national-exhibition-center':
    case 'jw-marriott-hanoi':
    case 'intercontinental-westlake':
      return [
        [c[0] - 28, c[1] - 28],
        [c[0] + 28, c[1] + 28],
      ];
    case 'statue-monument-plaza':
    case 'tuong-dai-cam-tu':
    case 'tuong-dai-quang-trung':
    case 'cau-the-huc':
    case 'thap-but':
    case 'b52-huu-tiep-lake':
    case 'dien-kinh-thien':
      return [
        [c[0] - 18, c[1] - 18],
        [c[0] + 18, c[1] + 18],
      ];
    default:
      return [];
  }
}

// ============================================================================
// NHÓM 1: CỬA Ô, CỔNG THÀNH & THÀNH QUÁCH CỔ
// ============================================================================

/** 1.1 Bia & Cổng Cửa Ô Thăng Long xưa (Ô Cầu Giấy, Ô Cầu Dền, Ô Chợ Dừa, Ô Đống Mác, Cửa Nam) */
function drawCityGateStele(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(5.5, ob.hw), hd = Math.max(4.2, ob.hd);
  void level;

  // Bệ đá xanh 2 cấp trang trọng
  B.solid(localRect(ob, -hw, hw, -hd, hd), 0, 0.55, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw * 0.82, hw * 0.82, -hd * 0.82, hd * 0.82), 0.55, 1.1, () => 'wall', 'walk', b.id);

  // Hai trụ biểu gạch vồ cổ hai bên lối cửa ô xưa
  for (const su of [-1, 1] as const) {
    const pCol = localPt(ob, su * (hw * 0.68), 0);
    B.solid(regPoly(pCol, 0.95, 4, Math.PI / 4), 1.1, 6.4, () => 'wall', 'roof', b.id);
    B.solid(regPoly(pCol, 1.18, 4, Math.PI / 4), 6.4, 7.1, () => 'roof', 'roof', b.id);
    B.solid(regPoly(pCol, 0.55, 8), 7.1, 8.2, () => 'metal', 'metal', b.id);
  }

  // Nhà bia / Bia đá lớn khắc tên Cửa Ô ở chính giữa với mái đao cong che bia
  const steleOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: 2.4, hd: 1.6 };
  B.solid(localRect(steleOb, -1.6, 1.6, -0.45, 0.45), 1.1, 4.3, () => 'metal', 'metal', b.id);
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      B.solid(regPoly(localPt(steleOb, su * 2.1, sv * 1.35), 0.26, 8), 1.1, 4.6, () => 'roof', 'roof', b.id);
    }
  }
  drawTraditionalCurvedRoof(B, steleOb, 2.5, 1.75, 4.5, 1.85, b.id, true);
}

/** 1.2 Bắc Môn (Chính Bắc Môn Hoàng thành Thăng Long – phố Phan Đình Phùng) */
function drawBacMon(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(11.0, ob.hw), hd = Math.max(8.5, ob.hd);
  const lamp1 = floorId(b, 1);

  // Thân tường thành gạch vồ & chân kè đá xanh hình thang vát chắc khỏe
  for (const [u0, u1] of [[-hw, -hw * 0.24], [hw * 0.24, hw]] as const) {
    B.solid(localRect(ob, u0, u1, -hd, hd), 0, 6.2, () => 'wall', 'roof', b.id);
  }
  // Vòm cổng thành xuyên suốt ở giữa & mặt sàn thượng thành
  B.solid(localRect(ob, -hw * 0.28, hw * 0.28, -hd, hd), 4.4, 6.2, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw * 1.02, hw * 1.02, -hd * 1.02, hd * 1.02), 6.2, 6.95, () => 'metal', 'walk', b.id);

  // Dấu tích 2 vết đạn đại bác Pháp năm 1882 trên mặt tường phía Bắc
  for (const du of [-hw * 0.58, hw * 0.52] as const) {
    const pShot = localPt(ob, du, -hd - 0.12);
    B.solid(regPoly(pShot, 0.65, 8), 3.1, 4.2, () => 'metal', 'metal', b.id);
  }

  // Lầu vọng gác / nơi thờ Tổng đốc Nguyễn Tri Phương & Hoàng Diệu trên đỉnh Bắc Môn
  const pavOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: hw * 0.48, hd: hd * 0.52 };
  const pavRing = localRect(pavOb, -pavOb.hw, pavOb.hw, -pavOb.hd, pavOb.hd);
  B.solid(pavRing, 6.95, 10.2, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, pavRing, 7.5, 9.7, lamp1, 2.2);
  drawTraditionalCurvedRoof(B, pavOb, pavOb.hw + 0.5, pavOb.hd + 0.5, 10.1, 2.35, b.id, true);

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.16, 8), 6.95, 16.0, () => 'metal', 'metal', b.id);
}

/** 1.3 Điện Kính Thiên & Thềm Rồng Đá Kính Thiên (Trung tâm Hoàng thành Thăng Long) */
function drawDienKinhThien(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(22.0, ob.hw), hd = Math.max(14.0, ob.hd);
  const lamp1 = floorId(b, 1);

  // Nền điện Kính Thiên đắp cao bằng đá xanh chạm sen (z = 0 .. 2.4 m)
  B.solid(localRect(ob, -hw, hw, -hd * 0.72, hd), 0, 2.4, () => 'wall', 'walk', b.id);
  // Lan can đá bao quanh nền điện
  B.solid(localRect(ob, -hw, hw, hd - 0.55, hd), 2.4, 3.3, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -hw, -hw + 0.55, -hd * 0.72, hd), 2.4, 3.3, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, hw - 0.55, hw, -hd * 0.72, hd), 2.4, 3.3, () => 'metal', 'metal', b.id);

  // Bậc thềm Điện Kính Thiên (9 bậc đá) và 4 lan can Rồng đá thời Lê Sơ (1467) chia 3 lối Ngự đạo
  for (let st = 0; st < 6; st++) {
    const v0 = -hd - (6 - st) * 0.85;
    B.solid(localRect(ob, -hw * 0.46, hw * 0.46, v0, -hd * 0.72), st * 0.4, (st + 1) * 0.4, () => 'wall', 'walk', b.id);
  }
  for (const uDragon of [-hw * 0.46, -hw * 0.15, hw * 0.15, hw * 0.46]) {
    const pTop = localPt(ob, uDragon, -hd * 0.72);
    const pBot = localPt(ob, uDragon, -hd - 5.2);
    B.solid(localRect(ob, uDragon - 0.38, uDragon + 0.38, -hd - 5.2, -hd * 0.72), 0.2, 1.65, () => 'metal', 'metal', b.id);
    B.line(V(pTop[0], pTop[1], 2.85), V(pBot[0], pBot[1], 0.95), 'crease');
    B.solid(regPoly(pBot, 0.58, 8), 0, 1.45, () => 'metal', 'metal', b.id);
  }

  // Tòa nhà rồng / chính điện bảo tồn trên nền Kính Thiên
  const hallOb: OrientedBox = { c: localPt(ob, 0, hd * 0.15), u: ob.u, v: ob.v, hw: hw * 0.72, hd: hd * 0.55 };
  const hallRing = localRect(hallOb, -hallOb.hw, hallOb.hw, -hallOb.hd, hallOb.hd);
  B.solid(hallRing, 2.4, 8.6, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, hallRing, 3.4, 7.6, lamp1, 2.6);
  drawTraditionalCurvedRoof(B, hallOb, hallOb.hw + 0.8, hallOb.hd + 0.8, 8.5, 3.2, b.id, true);
}

/** 1.4 Hậu Lâu – Tĩnh Bắc Lâu / Lầu Công chúa (Hoàng thành Thăng Long) */
function drawHauLau(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(9.0, ob.hw), hd = Math.max(6.5, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2), lamp3 = floorId(b, 3);

  // Tầng 1: Khối tường gạch dày hình hộp chữ nhật có vòm cuốn
  const r1 = localRect(ob, -hw, hw, -hd, hd);
  B.solid(r1, 0, 4.2, () => 'wall', 'roof', b.id);
  B.solid(scaleRing(r1, ob.c, 1.04), 4.2, 4.65, () => 'metal', 'walk', b.id);

  // Tầng 2: Lầu giữa có hành lang bao quanh và 3 mái đao cong hai đầu
  const r2 = localRect(ob, -hw * 0.78, hw * 0.78, -hd * 0.76, hd * 0.76);
  B.solid(r2, 4.65, 8.4, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, ob, hw * 0.86, hd * 0.84, 8.3, 1.65, b.id, true);

  // Tầng 3: Lầu vọng nguyệt chồng diêm 2 tầng 8 mái cong vút ở trung tâm
  const r3 = localRect(ob, -hw * 0.48, hw * 0.48, -hd * 0.48, hd * 0.48);
  B.solid(r3, 9.8, 12.6, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, ob, hw * 0.54, hd * 0.54, 12.5, 2.05, b.id, true);

  if (level >= 1) {
    addBandWindows(B, r1, 1.1, 3.6, lamp1, 2.4);
    addBandWindows(B, r2, 5.2, 7.8, lamp2, 2.2);
    addBandWindows(B, r3, 10.2, 12.1, lamp3, 1.8);
  }
}

/** 1.5 Khu di tích Thành Cổ Loa & Thành cổ Sơn Tây (Tường thành đá ong, hào nước, cổng thành & kỳ đài) */
function drawCoLoaCitadel(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(20.0, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1);

  // Hào nước bao quanh thành & cầu đá bắc qua hào vào cửa thành
  B.flat('water', localRect(ob, -hw - 4.5, hw + 4.5, -hd - 5.5, -hd - 1.2), 0.08, 'detail', b.id);
  B.solid(localRect(ob, -3.2, 3.2, -hd - 5.8, -hd + 0.5), 0, 0.75, () => 'wall', 'walk', b.id);

  // Tường thành đá ong / đất đắp cổ với cổng vòm chính và 4 vọng lâu góc
  B.solid(localRect(ob, -hw, -3.2, -hd, -hd + 3.2), 0, 5.2, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, 3.2, hw, -hd, -hd + 3.2), 0, 5.2, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -4.5, 4.5, -hd - 0.2, -hd + 3.4), 3.6, 5.5, () => 'wall', 'roof', b.id);
  const gateOb: OrientedBox = { c: localPt(ob, 0, -hd + 1.6), u: ob.u, v: ob.v, hw: 4.6, hd: 2.2 };
  drawTraditionalCurvedRoof(B, gateOb, 4.8, 2.4, 5.4, 2.1, b.id, true);

  // Kỳ đài đá ong & Điện thờ An Dương Vương / Đoan Môn nội thành ở trung tâm
  const flagBase = localPt(ob, -hw * 0.48, 0);
  B.solid(regPoly(flagBase, 3.8, 8), 0, 3.5, () => 'wall', 'roof', b.id);
  B.solid(regPoly(flagBase, 2.2, 8), 3.5, 9.8, () => 'wall', 'roof', b.id);
  B.solid(regPoly(flagBase, 0.22, 8), 9.8, 17.5, () => 'metal', 'metal', b.id);

  const shrineOb: OrientedBox = { c: localPt(ob, hw * 0.15, hd * 0.18), u: ob.u, v: ob.v, hw: hw * 0.52, hd: hd * 0.45 };
  const shrineRing = localRect(shrineOb, -shrineOb.hw, shrineOb.hw, -shrineOb.hd, shrineOb.hd);
  B.solid(shrineRing, 0.6, 5.8, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, shrineRing, 1.5, 4.9, lamp1, 2.4);
  drawTraditionalCurvedRoof(B, shrineOb, shrineOb.hw + 0.6, shrineOb.hd + 0.6, 5.7, 2.5, b.id, true);
}

// ============================================================================
// NHÓM 2: TOÀ NHÀ CHÍNH PHỦ, CƠ QUAN TRUNG ƯƠNG ĐẢNG & NHÀ KHÁCH NHÀ NƯỚC
// ============================================================================

/** 2.1 Trụ sở Trung ương Đảng, Văn phòng Chính phủ, Bộ Quốc phòng, Bộ Công an, Bộ Tài chính, VKSND Tối cao */
function drawPartyCentralHq(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(18.0, ob.hw), hd = Math.max(11.0, ob.hd);
  const top = Math.max(18.0, ...b.parts.map(partTop));
  const floorsN = Math.max(3, b.parts[0]?.floors.length ?? 5);
  const lamp1 = floorId(b, 1), lampTop = floorId(b, floorsN);

  // Bậc tam cấp đá hoa cương đỏ & tiền sảnh nghi lễ
  for (let st = 0; st < 3; st++) {
    B.solid(localRect(ob, -hw * 0.52, hw * 0.52, -hd - (3 - st) * 1.1, -hd), st * 0.4, (st + 1) * 0.4, () => 'wall', 'walk', b.id);
  }

  // Khối chính đối xứng chữ U / chữ H uy nghiêm + hai cánh bên
  const mainRing = localRect(ob, -hw, hw, -hd * 0.85, hd * 0.85);
  B.solid(mainRing, 0, top, () => 'wall', 'roof', b.id);
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * hw * 0.58, su * hw, -hd, hd), 0, top * 0.92, () => 'wall', 'roof', b.id);
  }

  // Hàng cột sảnh chính (Colonnade) cao thông tầng mặt tiền
  for (let k = -4; k <= 4; k++) {
    const cu = k * (hw * 0.11);
    B.solid(regPoly(localPt(ob, cu, -hd * 0.88), 0.52, 8), 1.2, top - 1.5, () => 'metal', 'metal', b.id);
  }

  // Mái ngói đỏ truyền thống kết hợp diềm mái hiện đại & phù điêu Quốc huy / Đảng kỳ ở trán mái
  drawTraditionalCurvedRoof(B, ob, hw * 0.96, hd * 0.82, top - 0.2, 3.4, b.id, false);
  const crestPos = localPt(ob, 0, -hd * 0.88);
  B.solid(regPoly(crestPos, 1.35, 12), top - 1.2, top + 1.5, () => 'metal', 'metal', b.id);

  // Cột cờ Tổ quốc trước sảnh
  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.2, 8), top + 1.5, top + 7.2, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, mainRing, 2.2, top * 0.48, lamp1, 2.6);
    addBandWindows(B, mainRing, top * 0.55, top - 1.8, lampTop, 2.6);
  }
}

/** 2.2 Bắc Bộ Phủ (12 Ngô Quyền), Nhà khách 37 Hùng Vương, TAND Tối cao, Bộ LĐ-TB&XH, UBND & HĐND TP Hà Nội */
function drawBacBoPhu(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(15.0, ob.hw), hd = Math.max(10.0, ob.hd);
  const top = Math.max(15.0, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, Math.max(2, b.parts[0]?.floors.length ?? 3));

  // Hàng rào sắt nghệ thuật Bắc Bộ Phủ & cổng vòm lịch sử phía trước
  B.solid(localRect(ob, -hw, -3.5, -hd - 4.2, -hd - 3.6), 0, 2.1, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, 3.5, hw, -hd - 4.2, -hd - 3.6), 0, 2.1, () => 'metal', 'metal', b.id);
  for (const su of [-1, 1] as const) {
    B.solid(regPoly(localPt(ob, su * 3.5, -hd - 3.9), 0.55, 8), 0, 3.2, () => 'wall', 'roof', b.id);
  }

  // Cầu thang đôi uốn cong dẫn lên sảnh chính tầng 2
  for (let st = 0; st < 5; st++) {
    const w = 6.5 - st * 0.7;
    B.solid(localRect(ob, -w, w, -hd - 2.6 + st * 0.45, -hd + 0.2), st * 0.65, (st + 1) * 0.65, () => 'wall', 'walk', b.id);
  }

  // Khối dinh thự Pháp cổ điển 3 tầng màu vàng kem với gờ chỉ trắng
  const bodyRing = localRect(ob, -hw, hw, -hd, hd);
  B.solid(bodyRing, 0, top, () => 'wall', 'roof', b.id);
  B.solid(scaleRing(bodyRing, ob.c, 1.03), 3.6, 4.1, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(bodyRing, ob.c, 1.035), top - 0.6, top + 0.4, () => 'metal', 'roof', b.id);

  // Mái Mansard Pháp lợp ngói đá đen & 3 tháp mái mặt tiền
  const roofRing = localRect(ob, -hw * 0.88, hw * 0.88, -hd * 0.84, hd * 0.84);
  B.solid(roofRing, top + 0.4, top + 3.4, () => 'roof', 'roof', b.id);
  for (const du of [-hw * 0.68, 0, hw * 0.68]) {
    const rCenter = localPt(ob, du, -hd * 0.45);
    const rRadius = du === 0 ? 3.8 : 2.8;
    B.solid(regPoly(rCenter, rRadius, 8), top + 0.4, top + (du === 0 ? 5.2 : 4.2), () => 'metal', 'metal', b.id);
  }

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.18, 8), top + 3.4, top + 7.2, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, bodyRing, 4.4, 8.2, lamp1, 2.4);
    addBandWindows(B, bodyRing, 9.2, top - 1.2, lamp2, 2.4);
  }
}

/** 2.3 Trụ sở Bộ Ngoại giao (Lê Hồng Phong & Tôn Thất Thuyết), Ngân hàng Nhà nước, Bộ GTVT, Bộ Công Thương, Bộ Tư pháp */
function drawMinistryPalace(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(16.0, ob.hw), hd = Math.max(11.0, ob.hd);
  const top = Math.max(16.0, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lampTop = floorId(b, Math.max(2, b.parts[0]?.floors.length ?? 4));

  // Khối chính + 4 cánh đối xứng phong cách Đông Dương / Tân cổ điển
  const mainRing = localRect(ob, -hw, hw, -hd * 0.78, hd * 0.78);
  B.solid(mainRing, 0, top, () => 'wall', 'roof', b.id);
  const centerWing = localRect(ob, -hw * 0.36, hw * 0.36, -hd, hd);
  B.solid(centerWing, 0, top + 2.4, () => 'wall', 'roof', b.id);

  // Hệ cột tròn thông tầng ở tiền sảnh và tháp mái ngói 8 mái ở chính giữa (đặc trưng Bộ Ngoại giao 1 Tôn Thất Thuyết)
  for (let k = -3; k <= 3; k++) {
    B.solid(regPoly(localPt(ob, k * (hw * 0.095), -hd - 0.25), 0.48, 10), 0.8, top + 1.8, () => 'metal', 'metal', b.id);
  }
  const towerOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: hw * 0.28, hd: hd * 0.36 };
  B.solid(localRect(towerOb, -towerOb.hw, towerOb.hw, -towerOb.hd, towerOb.hd), top + 2.4, top + 6.2, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, towerOb, towerOb.hw + 0.8, towerOb.hd + 0.8, top + 6.0, 2.8, b.id, true);

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.18, 8), top + 2.4, top + 7.2, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, mainRing, 2.0, top * 0.5, lamp1, 2.5);
    addBandWindows(B, mainRing, top * 0.56, top - 1.2, lampTop, 2.5);
  }
}

// ============================================================================
// NHÓM 3: HỆ THỐNG NHÀ THỜ (CÔNG GIÁO, TIN LÀNH) & CÔNG TRÌNH TÔN GIÁO
// ============================================================================

/** 3.1 Nhà thờ Cửa Bắc (Nhà thờ Đức Mẹ Hà Nội – kiến trúc Đông Dương Ernest Hébrard bất đối xứng) */
function drawNhaThoCuaBac(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(9.5, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Gian chính (Nave) và cánh ngang (Transept) lợp mái ngói dốc Á Đông
  const naveRing = localRect(ob, -hw * 0.58, hw * 0.58, -hd * 0.88, hd * 0.88);
  const transRing = localRect(ob, -hw, hw, -hd * 0.15, hd * 0.35);
  B.solid(naveRing, 0, 12.2, () => 'wall', 'roof', b.id);
  B.solid(transRing, 0, 11.8, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, { c: ob.c, u: ob.u, v: ob.v, hw: hw * 0.62, hd: hd * 0.9 }, hw * 0.62, hd * 0.9, 12.0, 2.8, b.id, false);

  // Mái vòm bát giác ở giao điểm cánh ngang và gian chính
  const domeCenter = localPt(ob, 0, hd * 0.1);
  B.solid(regPoly(domeCenter, 4.2, 8), 12.2, 16.8, () => 'wall', 'roof', b.id);
  B.solid(regPoly(domeCenter, 4.6, 8), 16.8, 19.2, () => 'roof', 'roof', b.id);

  // Tháp chuông cao đặt lệch bên phải mặt tiền (đặc trưng độc bản của Nhà thờ Cửa Bắc)
  const bellCenter = localPt(ob, hw * 0.65, -hd * 0.72);
  const bellOb: OrientedBox = { c: bellCenter, u: ob.u, v: ob.v, hw: 2.8, hd: 2.8 };
  const bellRing = localRect(bellOb, -2.8, 2.8, -2.8, 2.8);
  B.solid(bellRing, 0, 23.5, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, bellOb, 3.1, 3.1, 23.3, 2.6, b.id, true);
  // Thánh giá trên đỉnh tháp chuông
  B.line(V(bellCenter[0], bellCenter[1], 25.9), V(bellCenter[0], bellCenter[1], 28.4), 'crease');
  const cL = localPt(bellOb, -0.8, 0), cR = localPt(bellOb, 0.8, 0);
  B.line(V(cL[0], cL[1], 27.3), V(cR[0], cR[1], 27.3), 'crease');

  if (level >= 1) {
    addBandWindows(B, naveRing, 3.2, 10.5, lamp1, 2.4);
    addBandWindows(B, bellRing, 14.0, 21.8, lamp2, 1.8);
  }
}

/** 3.2 Nhà thờ Hàm Long, Phùng Khoang, Thái Hà, Hà Đông, Làng Tám */
function drawNhaThoHamLong(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(9.0, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Khối thánh đường với các hàng cột vòm bên hông và họa tiết dây thừng Phanxicô
  const naveRing = localRect(ob, -hw * 0.82, hw * 0.82, -hd * 0.88, hd * 0.92);
  B.solid(naveRing, 0, 13.0, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.86, hw * 0.86, -hd * 0.9, hd * 0.92), 13.0, 15.6, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.42, hw * 0.42, -hd * 0.9, hd * 0.92), 15.6, 17.8, () => 'roof', 'roof', b.id);

  // Mặt tiền tam giác cân và tháp chuông trung tâm vươn cao với Thánh giá
  const frontTower = localRect(ob, -hw * 0.36, hw * 0.36, -hd, -hd + 5.2);
  B.solid(frontTower, 0, 22.0, () => 'wall', 'roof', b.id);
  const spireCenter = localPt(ob, 0, -hd + 2.6);
  B.solid(regPoly(spireCenter, 2.6, 8), 22.0, 26.8, () => 'roof', 'roof', b.id);
  B.line(V(spireCenter[0], spireCenter[1], 26.8), V(spireCenter[0], spireCenter[1], 29.6), 'crease');
  const cL = localPt(ob, -0.9, -hd + 2.6), cR = localPt(ob, 0.9, -hd + 2.6);
  B.line(V(cL[0], cL[1], 28.4), V(cR[0], cR[1], 28.4), 'crease');

  if (level >= 1) {
    addBandWindows(B, naveRing, 3.0, 11.2, lamp1, 2.4);
    addBandWindows(B, frontTower, 14.0, 20.5, lamp2, 2.0);
  }
}

/** 3.3 Thánh đường Hồi giáo Al-Noor (12 Hàng Lược – Hoàn Kiếm) */
function drawAlNoorMosque(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(7.5, ob.hw), hd = Math.max(11.0, ob.hd);
  const lamp1 = floorId(b, 1);

  // Thân thánh đường sơn trắng thanh thoát với hàng cửa vòm nhọn Hồi giáo
  const bodyRing = localRect(ob, -hw, hw, -hd, hd);
  B.solid(bodyRing, 0, 9.6, () => 'wall', 'roof', b.id);
  B.solid(scaleRing(bodyRing, ob.c, 1.04), 9.6, 10.4, () => 'metal', 'metal', b.id);

  // Mái vòm củ hành lớn (Onion Dome) ở chính giữa và trăng lưỡi liềm trên đỉnh
  B.solid(regPoly(ob.c, 4.2, 16), 10.4, 13.8, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, 2.6, 16), 13.8, 16.2, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 0.45, 8), 16.2, 18.2, () => 'metal', 'metal', b.id);

  // Hai tháp tiểu giáo đường (Minaret) thanh mảnh ở hai góc mặt tiền
  for (const su of [-1, 1] as const) {
    const mPos = localPt(ob, su * (hw * 0.82), -hd * 0.82);
    B.solid(regPoly(mPos, 0.95, 12), 0, 16.8, () => 'wall', 'roof', b.id);
    B.solid(regPoly(mPos, 1.25, 12), 14.2, 14.9, () => 'metal', 'metal', b.id);
    B.solid(regPoly(mPos, 0.82, 12), 16.8, 19.2, () => 'metal', 'metal', b.id);
  }

  if (level >= 1) addBandWindows(B, bodyRing, 2.2, 8.2, lamp1, 2.2);
}

// ============================================================================
// NHÓM 4: ĐÀI TƯỞNG NIỆM, TƯỢNG ĐÀI & DI TÍCH CHIẾN CÔNG
// ============================================================================

/** 4.1 Quảng trường & Tượng đài Lịch sử (Lý Thái Tổ, Quyết tử, Bác Hồ - Bác Tôn, Lênin, CAND, Lê Thái Tổ, Lý Tự Trọng, Khâm Thiên) */
function drawStatueMonumentPlaza(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(7.5, ob.hw), hd = Math.max(7.5, ob.hd);
  const totalH = Math.max(11.0, ...b.parts.map(partTop));
  void level;

  // Quảng trường bậc đá hoa cương 3 cấp bát giác/chữ nhật
  B.solid(localRect(ob, -hw * 1.15, hw * 1.15, -hd * 1.15, hd * 1.15), 0, 0.55, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw * 0.82, hw * 0.82, -hd * 0.82, hd * 1.02), 0.55, 1.25, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, Math.min(hw, hd) * 0.52, 8), 1.25, 2.2, () => 'wall', 'walk', b.id);

  // Bệ tượng đá cao (Pedestal) và khối tượng đồng điêu khắc rõ nét (chân/vạt áo, bờ vai/tay áo, cánh tay đưa ra trước, đầu & mũ)
  const pedH = totalH * 0.52;
  B.solid(regPoly(ob.c, 2.15, 8), 2.2, pedH, () => 'wall', 'roof', b.id);
  B.solid(regPoly(ob.c, 2.45, 8), pedH - 0.45, pedH + 0.25, () => 'metal', 'metal', b.id);
  // Phần chân & vạt áo bào xòe rộng
  B.solid(regPoly(ob.c, 1.52, 8), pedH + 0.25, pedH + (totalH - pedH) * 0.48, () => 'metal', 'metal', b.id);
  // Phần thân trên & bờ vai mở rộng
  B.solid(localRect(ob, -1.85, 1.85, -0.98, 0.98), pedH + (totalH - pedH) * 0.38, totalH - 1.15, () => 'metal', 'metal', b.id);
  // Cánh tay phải vươn ra phía trước (cầm Chiếu dời đô / vẫy chào / chỉ huy)
  B.solid(localRect(ob, 0.65, 1.65, -1.65, -0.35), pedH + (totalH - pedH) * 0.52, totalH - 0.65, () => 'metal', 'metal', b.id);
  // Đầu tượng & mũ bình thiên
  B.solid(regPoly(ob.c, 0.72, 8), totalH - 1.15, totalH + 0.35, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -0.92, 0.92, -0.62, 0.62), totalH + 0.25, totalH + 0.65, () => 'metal', 'metal', b.id);

  // Bức phù điêu cánh cung bằng đá chạm khắc lịch sử phía sau lưng tượng đài
  for (let k = -2; k <= 2; k++) {
    const u0 = k * (hw * 0.34) - hw * 0.15;
    const u1 = k * (hw * 0.34) + hw * 0.15;
    const vBack = hd * 0.68 - Math.abs(k) * 0.55;
    B.solid(localRect(ob, u0, u1, vBack, vBack + 1.1), 0.55, 5.4 - Math.abs(k) * 0.45, () => 'wall', 'roof', b.id);
  }
}

/** 4.1b Tượng đài Cảm tử cho Tổ quốc quyết sinh (Khu vực Đền Bà Kiệu – Đền Ngọc Sơn, bờ Đông Hồ Hoàn Kiếm) */
function drawTuongDaiCamTu(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(7.2, ob.hw), hd = Math.max(5.5, ob.hd);
  void level;

  // Thềm quảng trường đá hoa cương đỏ/xám 3 cấp trang nghiêm
  B.solid(localRect(ob, -hw * 1.18, hw * 1.18, -hd * 1.18, hd * 1.18), 0, 0.55, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw * 0.9, hw * 0.9, -hd * 0.88, hd * 0.88), 0.55, 1.2, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw * 0.62, hw * 0.62, -hd * 0.62, hd * 0.62), 1.2, 1.85, () => 'wall', 'walk', b.id);

  // Trụ biểu đá dựng đứng (Bia "Cảm tử cho Tổ quốc quyết sinh" cao 9.8 m) làm hậu cảnh ở trung tâm
  B.solid(localRect(ob, -1.65, 1.65, -0.55, 1.35), 1.85, 10.6, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -1.85, 1.85, -0.7, 1.5), 10.2, 11.1, () => 'roof', 'roof', b.id);

  // Hai bức phù điêu đá khắc họa chiến lũy Hà Nội mùa đông 1946 mở rộng hai bên
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * 1.65, su * 4.8, 0.15, 1.45), 1.2, 6.2, () => 'wall', 'roof', b.id);
    B.solid(localRect(ob, su * 4.4, su * 6.8, 0.45, 1.65), 0.55, 4.4, () => 'wall', 'roof', b.id);
  }

  // Cụm tượng đồng 2 nhân vật ở tiền cảnh: Chiến sĩ Vệ quốc đoàn lao mình ôm bom ba càng & thiếu nữ Tự vệ Thủ đô
  B.solid(localRect(ob, -2.1, 2.1, -2.15, 0.25), 1.85, 3.6, () => 'wall', 'roof', b.id);
  // Chiến sĩ cảm tử quân vươn người về phía trước cùng quả bom ba càng
  B.solid(localRect(ob, -1.15, 0.65, -1.95, -0.25), 3.6, 7.6, () => 'metal', 'metal', b.id);
  B.solid(regPoly(localPt(ob, -0.25, -1.15), 0.58, 8), 7.6, 8.75, () => 'metal', 'metal', b.id);
  // Cánh tay & bom ba càng lao ra phía trước
  B.solid(localRect(ob, -0.75, 0.35, -3.15, -1.55), 6.1, 7.35, () => 'metal', 'metal', b.id);
  B.solid(regPoly(localPt(ob, -0.2, -3.35), 0.72, 6), 6.25, 7.55, () => 'metal', 'metal', b.id);
  // Thiếu nữ tự vệ sát cánh bên phải
  B.solid(localRect(ob, 0.45, 1.75, -1.45, -0.15), 3.6, 7.1, () => 'metal', 'metal', b.id);
  B.solid(regPoly(localPt(ob, 1.1, -0.8), 0.52, 8), 7.1, 8.15, () => 'metal', 'metal', b.id);
}

/** 4.1c Tượng đài Hoàng đế Quang Trung (Gò Đống Đa) — quảng trường lễ hội, bức phù điêu cánh cung lớn & tượng Vua Quang Trung áo bào tung bay vung kiếm */
function drawTuongDaiQuangTrung(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(13.0, ob.hw), hd = Math.max(11.0, ob.hd);
  void level;

  // Quảng trường lễ hội Gò Đống Đa 3 cấp đá hoa cương
  B.solid(regPoly(ob.c, Math.max(hw, hd) * 1.05, 12), 0, 0.65, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, Math.max(hw, hd) * 0.8, 12), 0.65, 1.45, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, Math.max(hw, hd) * 0.55, 12), 1.45, 2.35, () => 'wall', 'walk', b.id);

  // Hai bức phù điêu cánh cung đồ sộ phía sau khắc họa thần tốc đại phá quân Thanh
  for (let k = -5; k <= 5; k++) {
    if (k === 0) continue;
    const ang = k * 0.2;
    const pRel = localPt(ob, Math.sin(ang) * (hw * 0.78), Math.cos(ang) * (hd * 0.45) + hd * 0.22);
    const hRel = 8.6 - Math.abs(k) * 0.55;
    B.solid(regPoly(pRel, 1.45, 6, ang), 1.45, hRel, () => 'wall', 'roof', b.id);
    B.solid(regPoly(pRel, 1.6, 6, ang), hRel - 0.35, hRel + 0.18, () => 'roof', 'roof', b.id);
  }

  // Bệ đá hoa cương nguyên khối và vành diềm đồng
  B.solid(localRect(ob, -2.6, 2.6, -2.4, 2.4), 2.35, 3.25, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -1.95, 1.95, -1.85, 1.85), 3.25, 7.8, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -2.25, 2.25, -2.1, 2.1), 7.35, 8.05, () => 'metal', 'metal', b.id);

  // Tượng Hoàng đế Quang Trung: thân giáp trụ, tà áo bào tung bay rộng ra sau, đầu đội mũ chiến bào & tay phải vung kiếm chỉ huy
  B.solid(localRect(ob, -1.45, 1.45, -1.15, 1.15), 8.05, 10.2, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -2.55, 2.55, 0.05, 1.85), 8.15, 11.8, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -2.1, 2.1, -0.95, 1.05), 9.9, 12.3, () => 'metal', 'metal', b.id);
  // Đầu & mũ chiến bào
  B.solid(regPoly(localPt(ob, 0, -0.15), 0.82, 8), 12.3, 13.7, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -0.6, 0.6, -0.6, 0.45), 13.5, 14.2, () => 'metal', 'metal', b.id);
  // Tay phải giơ cao đốc kiếm & thanh kiếm lệnh
  B.solid(localRect(ob, 0.9, 1.75, -1.35, -0.25), 11.5, 13.8, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, 1.1, 1.5, -1.9, -0.6), 13.6, 15.6, () => 'metal', 'metal', b.id);
  // Tay trái nắm đai giáp
  B.solid(localRect(ob, -1.95, -1.0, -1.2, -0.15), 10.4, 11.9, () => 'metal', 'metal', b.id);
}

/** 4.2 Di tích Hồ Hữu Tiệp – Xác máy bay B-52 rơi tại làng hoa Ngọc Hà */
function drawB52HuuTiepLake(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(12.0, ob.hw), hd = Math.max(9.0, ob.hd);
  void level;

  // Lòng hồ Hữu Tiệp & kè đá lan can xung quanh hồ
  B.flat('water', localRect(ob, -hw, hw, -hd, hd), 0.1, 'detail', b.id);
  const wOut = hw + 0.7, dOut = hd + 0.7;
  B.solid(localRect(ob, -wOut, wOut, -dOut, -hd), 0, 0.85, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -wOut, wOut, hd, dOut), 0, 0.85, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -wOut, -hw, -hd, hd), 0, 0.85, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, hw, wOut, -hd, hd), 0, 0.85, () => 'wall', 'walk', b.id);

  // Khối thân và mảnh cánh pháo đài bay B-52 nhô lên giữa mặt hồ nước
  const wreckOb: OrientedBox = {
    c: ob.c,
    u: [ob.u[0] * 0.86 - ob.v[0] * 0.5, ob.u[1] * 0.86 - ob.v[1] * 0.5],
    v: [ob.u[0] * 0.5 + ob.v[0] * 0.86, ob.u[1] * 0.5 + ob.v[1] * 0.86],
    hw: 4.8,
    hd: 1.8,
  };
  B.solid(localRect(wreckOb, -4.5, 4.5, -1.2, 1.2), 0.12, 2.35, () => 'metal', 'metal', b.id);
  B.solid(localRect(wreckOb, -1.8, 2.4, -4.2, 4.2), 0.12, 1.45, () => 'metal', 'metal', b.id);
  B.solid(regPoly(localPt(wreckOb, -3.2, 0), 0.95, 6), 2.35, 4.1, () => 'metal', 'metal', b.id);

  // Phù điêu & bia kỷ niệm chiến thắng Điện Biên Phủ trên không bên bờ hồ
  B.solid(localRect(ob, -4.5, 4.5, hd, hd + 1.2), 0.85, 4.2, () => 'wall', 'roof', b.id);
}

// ============================================================================
// NHÓM 5: CỤM DANH THẮNG HỒ HOÀN KIẾM, PHỐ CỔ & DI TÍCH ĐÔ THỊ
// ============================================================================

/** 5.0a Cầu Thê Húc (Cầu gỗ sơn son thếp vàng 15 nhịp cong như con tôm dẫn vào Đền Ngọc Sơn) */
function drawCauTheHuc(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(19.5, ob.hw), hd = Math.max(6.5, ob.hd);
  const lamp1 = floorId(b, 1);

  // Mặt hồ Hoàn Kiếm bên dưới nhịp cầu Thê Húc
  B.flat('water', localRect(ob, -hw * 1.15, hw * 1.15, -hd * 1.6, hd * 1.6), 0.08, 'detail', b.id);

  // Đầu Tây: Mố đảo Ngọc & Lầu Đắc Nguyệt 2 tầng 8 mái cổ kính
  B.solid(localRect(ob, -hw * 1.15, -hw * 0.72, -hd * 1.1, hd * 1.1), 0, 0.75, () => 'wall', 'walk', b.id);
  const gateOb: OrientedBox = { c: localPt(ob, -hw * 0.9, 0), u: ob.v, v: [-ob.u[0], -ob.u[1]], hw: 3.1, hd: 2.4 };
  B.solid(localRect(gateOb, -3.0, 3.0, -2.2, 2.2), 0.75, 4.2, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, gateOb, 3.1, 2.3, 4.05, 1.35, b.id, true);
  B.solid(localRect(gateOb, -2.1, 2.1, -1.55, 1.55), 5.2, 7.6, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, localRect(gateOb, -2.1, 2.1, -1.55, 1.55), 5.6, 7.1, lamp1, 1.8);
  drawTraditionalCurvedRoof(B, gateOb, 2.35, 1.75, 7.45, 1.45, b.id, true);

  // Nhịp cầu gỗ sơn đỏ 15 khoang uốn vòm cong trên 16 hàng cọc tròn
  const segs = 12;
  const uStart = -hw * 0.74, uEnd = hw * 0.74;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs, tm = (t0 + t1) * 0.5;
    const u0 = uStart + (uEnd - uStart) * t0;
    const u1 = uStart + (uEnd - uStart) * t1;
    const archZ = 0.8 + Math.sin(tm * Math.PI) * 1.55;
    B.solid(localRect(ob, u0, u1, -2.2, 2.2), archZ, archZ + 0.36, () => 'roof', 'roof', b.id);
    B.solid(localRect(ob, u0, u1, -2.28, -1.9), archZ + 0.36, archZ + 1.32, () => 'roof', 'roof', b.id);
    B.solid(localRect(ob, u0, u1, 1.9, 2.28), archZ + 0.36, archZ + 1.32, () => 'roof', 'roof', b.id);
    for (const sv of [-1.6, 1.6] as const) {
      B.solid(regPoly(localPt(ob, (u0 + u1) * 0.5, sv), 0.22, 8), 0, archZ, () => 'roof', 'roof', b.id);
    }
  }

  // Đầu Đông: Mố bờ hồ & Cổng Đài Nghiên (3 trái đào đội nghiên mực đá)
  B.solid(localRect(ob, hw * 0.72, hw * 1.12, -hd * 0.95, hd * 0.95), 0, 0.7, () => 'wall', 'walk', b.id);
  for (const sv of [-2.4, 2.4] as const) {
    const pCol = localPt(ob, hw * 0.84, sv);
    B.solid(regPoly(pCol, 0.56, 4, Math.PI / 4), 0.7, 5.2, () => 'wall', 'roof', b.id);
    B.solid(regPoly(pCol, 0.38, 8), 5.2, 6.1, () => 'metal', 'metal', b.id);
  }
  B.solid(localRect(ob, hw * 0.76, hw * 0.92, -2.1, 2.1), 0.7, 3.8, () => 'wall', 'roof', b.id);
  B.solid(regPoly(localPt(ob, hw * 0.84, 0), 0.75, 10), 3.8, 4.75, () => 'metal', 'metal', b.id);
}

/** 5.0b Tháp Bút & Đài Nghiên (Tháp đá 5 tầng khắc "Tả Thanh Thiên" trên núi Ngọc Bội bên Hồ Hoàn Kiếm) */
function drawThapBut(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  void level;

  // Bậc thềm đá xanh & Gò núi đá tai mèo Độc Tôn (Núi Ngọc Bội cao 4 m)
  B.solid(regPoly(ob.c, 8.8, 12), 0, 0.55, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, 6.2, 10), 0.55, 1.65, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, 4.6, 9, 0.2), 1.65, 3.0, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, 3.3, 8, 0.4), 3.0, 4.1, () => 'wall', 'walk', b.id);

  // 5 tầng Tháp Bút bằng đá vuông thu dần lên cao + ngòi bút lông vươn thẳng lên trời xanh
  const tiers: [number, number, number][] = [
    [1.65, 4.1, 6.0],
    [1.42, 6.0, 7.7],
    [1.22, 7.7, 9.2],
    [1.04, 9.2, 10.6],
    [0.86, 10.6, 11.9],
  ];
  for (const [r, z0, z1] of tiers) {
    B.solid(localRect(ob, -r, r, -r, r), z0, z1, () => 'wall', 'roof', b.id);
    B.solid(localRect(ob, -r - 0.24, r + 0.24, -r - 0.24, r + 0.24), z1 - 0.24, z1 + 0.08, () => 'roof', 'roof', b.id);
  }
  // Cán bút và ngòi bút đá (4.2 m trên đỉnh tầng 5)
  B.solid(regPoly(ob.c, 0.56, 8), 11.9, 13.4, () => 'wall', 'roof', b.id);
  B.solid(regPoly(ob.c, 0.72, 10), 13.4, 14.9, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 0.36, 8), 14.9, 16.2, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 0.14, 8), 16.2, 17.0, () => 'metal', 'metal', b.id);
}

/** 5.1 Tháp Hòa Phong (Di tích chùa Báo Ân cổ bên bờ Đông Hồ Hoàn Kiếm) */
function drawThapHoaPhong(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  void level;

  // Tầng 1: 4 trụ gạch trần tạo 4 vòm cửa thông suốt 4 hướng (Đông - Tây - Nam - Bắc)
  const r1 = 2.6;
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      B.solid(localRect(ob, su * 1.15 - 0.75, su * 1.15 + 0.75, sv * 1.15 - 0.75, sv * 1.15 + 0.75), 0, 2.8, () => 'wall', 'roof', b.id);
    }
  }
  B.solid(localRect(ob, -r1, r1, -r1, r1), 2.4, 3.3, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -r1 - 0.35, r1 + 0.35, -r1 - 0.35, r1 + 0.35), 3.3, 3.65, () => 'roof', 'roof', b.id);

  // Tầng 2: Thân tháp gạch thu nhỏ + 4 đầu đao cong
  const r2 = 1.85;
  B.solid(localRect(ob, -r2, r2, -r2, r2), 3.65, 5.8, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, ob, r2 + 0.2, r2 + 0.2, 5.7, 1.15, b.id, true);

  // Tầng 3 & đỉnh hồ lô bát quái
  const r3 = 1.25;
  B.solid(localRect(ob, -r3, r3, -r3, r3), 6.75, 8.3, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, ob, r3 + 0.15, r3 + 0.15, 8.2, 0.95, b.id, true);
  B.solid(regPoly(ob.c, 0.45, 8), 9.1, 10.2, () => 'metal', 'metal', b.id);
}

/** 5.2 Tháp nước Hàng Đậu (Bốt Hàng Đậu – ngã sáu Phan Đình Phùng / Hàng Đậu) */
function drawThapNuocHangDau(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const r = Math.max(9.2, Math.min(ob.hw, ob.hd));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Thân tháp hình trụ tròn xây bằng đá hộc kiên cố cao 21 m
  const drumRing = regPoly(ob.c, r, 20);
  B.solid(regPoly(ob.c, r + 0.45, 20), 0, 1.4, () => 'wall', 'walk', b.id);
  B.solid(drumRing, 1.4, 15.8, () => 'wall', 'roof', b.id);
  // Các gờ đá phân tầng & đài nước thép phía trên
  B.solid(regPoly(ob.c, r + 0.3, 20), 7.2, 7.7, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, r + 0.4, 20), 15.8, 20.5, () => 'wall', 'roof', b.id);

  // Mái chóp nón 20 múi và cột thu lôi ở tâm đỉnh tháp
  B.solid(regPoly(ob.c, r + 0.9, 20), 20.5, 22.2, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.58, 20), 22.2, 24.4, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.25, 16), 24.4, 26.2, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, 0.32, 8), 26.2, 28.8, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, drumRing, 3.0, 6.2, lamp1, 3.0);
    addBandWindows(B, drumRing, 9.0, 13.8, lamp2, 3.0);
  }
}

/** 5.3 Nhà cổ 87 Mã Mây & các Đình Tổ nghề Phố Cổ (Đình Kim Ngân, Đồng Lạc, Mã Mây, Tú Thị, Đền Quán Đế) */
function drawNhaCoMaMay(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(4.5, ob.hw), hd = Math.max(10.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Lớp nhà mặt tiền 2 tầng (tầng 1 cửa gỗ bức bàn, tầng 2 ban công gỗ & mái ngói ta dốc)
  const frontOb: OrientedBox = { c: localPt(ob, 0, -hd * 0.52), u: ob.u, v: ob.v, hw, hd: hd * 0.42 };
  const frontRing = localRect(frontOb, -hw, hw, -frontOb.hd, frontOb.hd);
  B.solid(frontRing, 0, 6.4, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, frontOb, hw + 0.3, frontOb.hd + 0.3, 6.3, 1.75, b.id, true);

  // Sân thiên tỉnh (giếng trời đón nắng mưa ở giữa) & hành lang nối
  B.solid(localRect(ob, -hw, -hw * 0.55, -hd * 0.1, hd * 0.12), 0, 5.8, () => 'wall', 'roof', b.id);

  // Lớp nhà hậu đường / điện thờ tổ nghề phía sau
  const backOb: OrientedBox = { c: localPt(ob, 0, hd * 0.52), u: ob.u, v: ob.v, hw, hd: hd * 0.42 };
  const backRing = localRect(backOb, -hw, hw, -backOb.hd, backOb.hd);
  B.solid(backRing, 0, 6.8, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, backOb, hw + 0.35, backOb.hd + 0.35, 6.7, 1.9, b.id, true);

  if (level >= 1) {
    addBandWindows(B, frontRing, 1.0, 3.0, lamp1, 1.8);
    addBandWindows(B, frontRing, 3.8, 5.8, lamp2, 1.8);
  }
}

/** 5.4 Chợ truyền thống lớn (Chợ Hôm – Đức Viên, Chợ Hàng Bè, Chợ Mơ) */
function drawTraditionalMarketHall(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(18.0, ob.hw), hd = Math.max(14.0, ob.hd);
  const top = Math.max(12.0, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Khối nhà lồng chợ nhiều gian kết hợp mặt tiền cổng vòm lịch sử
  const bodyRing = localRect(ob, -hw, hw, -hd, hd);
  B.solid(bodyRing, 0, top, () => 'wall', 'roof', b.id);

  // 3 nếp mái vòm / tam giác nhà lồng chợ đặc trưng dọc mặt tiền
  for (const k of [-1, 0, 1] as const) {
    const bayU = k * (hw * 0.62);
    const bayW = hw * 0.28;
    B.solid(localRect(ob, bayU - bayW, bayU + bayW, -hd - 0.5, hd * 0.88), top, top + 2.8, () => 'roof', 'roof', b.id);
    B.solid(regPoly(localPt(ob, bayU, -hd - 0.35), bayW * 0.65, 8), top + 0.4, top + 3.6, () => 'metal', 'metal', b.id);
  }

  if (level >= 1) {
    addBandWindows(B, bodyRing, 1.5, top * 0.45, lamp1, 2.6);
    addBandWindows(B, bodyRing, top * 0.55, top - 1.2, lamp2, 2.6);
  }
}

// ============================================================================
// NHÓM 7: CHÙA CỔ, THIỀN VIỆN & QUẦN THỂ PHẬT GIÁO
// ============================================================================

/** 7.1 Đại danh lam cổ tự (Chùa Láng, Chùa Kim Liên, Chùa Hòe Nhai, Chùa Hương, Chùa Thầy, Chùa Tây Phương, Chùa Mía, Chùa Trầm, Chùa Trăm Gian, Chùa Bối Khê, Chùa Đậu) */
function drawMountainPagodaComplex(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(14.0, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Cổng Tam Quan / Nhà Bát giác & Thủy đình phía trước
  const gateOb: OrientedBox = { c: localPt(ob, 0, -hd * 0.82), u: ob.u, v: ob.v, hw: hw * 0.52, hd: 2.2 };
  for (const su of [-1, -0.35, 0.35, 1]) {
    B.solid(regPoly(localPt(gateOb, su * gateOb.hw * 0.85, 0), 0.52, 8), 0, 4.2, () => 'wall', 'roof', b.id);
  }
  drawTraditionalCurvedRoof(B, gateOb, gateOb.hw + 0.5, 2.4, 4.1, 1.85, b.id, true);
  drawTraditionalCurvedRoof(B, gateOb, gateOb.hw * 0.62, 1.8, 5.8, 1.65, b.id, true);

  // 2. Ba nếp chùa cổ (Tiền đường – Thiêu hương – Thượng điện) kiểu "nội công ngoại quốc" / "chữ Tam"
  for (const [vOff, wScale, zRoof, roofH] of [
    [-hd * 0.25, 0.78, 4.6, 2.1],
    [hd * 0.15, 0.62, 5.0, 2.2],
    [hd * 0.58, 0.82, 5.6, 2.5],
  ] as const) {
    const hallOb: OrientedBox = { c: localPt(ob, 0, vOff), u: ob.u, v: ob.v, hw: hw * wScale, hd: 3.2 };
    const ring = localRect(hallOb, -hallOb.hw, hallOb.hw, -hallOb.hd, hallOb.hd);
    B.solid(ring, 0.5, zRoof, () => 'wall', 'roof', b.id);
    if (level >= 1) addBandWindows(B, ring, 1.3, zRoof - 0.6, lamp1, 2.2);
    drawTraditionalCurvedRoof(B, hallOb, hallOb.hw + 0.5, hallOb.hd + 0.5, zRoof - 0.1, roofH, b.id, true);
  }

  // 3. Gác chuông 2 tầng 8 mái đao cong & Bảo tháp cổ bên sân chùa
  const bellOb: OrientedBox = { c: localPt(ob, hw * 0.72, -hd * 0.32), u: ob.u, v: ob.v, hw: 2.8, hd: 2.8 };
  B.solid(localRect(bellOb, -2.5, 2.5, -2.5, 2.5), 0.5, 4.5, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, bellOb, 3.0, 3.0, 4.4, 1.5, b.id, true);
  B.solid(localRect(bellOb, -1.9, 1.9, -1.9, 1.9), 5.8, 8.2, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, localRect(bellOb, -1.9, 1.9, -1.9, 1.9), 6.2, 7.8, lamp2, 1.6);
  drawTraditionalCurvedRoof(B, bellOb, 2.3, 2.3, 8.1, 1.6, b.id, true);

  // Bảo tháp gạch bên trái sân chùa
  const stupaPos = localPt(ob, -hw * 0.72, -hd * 0.32);
  for (let t = 0; t < 5; t++) {
    const z0 = 0.5 + t * 1.65;
    const r = 1.6 - t * 0.18;
    B.solid(regPoly(stupaPos, r, 6), z0, z0 + 1.4, () => 'wall', 'roof', b.id);
    B.solid(regPoly(stupaPos, r + 0.25, 6), z0 + 1.4, z0 + 1.65, () => 'roof', 'roof', b.id);
  }
  B.solid(regPoly(stupaPos, 0.35, 8), 8.75, 10.2, () => 'metal', 'metal', b.id);

  // Cột cờ hội
  const fPos = localPt(ob, -hw - 2.0, -hd - 2.0);
  B.solid(regPoly(fPos, 0.15, 8), 0, 9.0, () => 'metal', 'metal', b.id);
}

// ============================================================================
// NHÓM 8: ĐÌNH CỔ & KIẾN TRÚC LÀNG XÃ NGOẠI THÀNH
// ============================================================================

/** 8.1 Đình Cổ Xứ Đoài (Đình Tây Đằng, Đình Chu Quyến, Đình So, Đình Mông Phụ, Đình Đại Phùng, Đình Tường Phiêu) */
function drawAncientCommunalHouse(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(13.0, ob.hw), hd = Math.max(9.5, ob.hd);
  const lamp1 = floorId(b, 1);

  // 1. Nghi môn 4 trụ biểu đỉnh nghê chầu & hồ bán nguyệt trước sân đình
  B.flat('water', localRect(ob, -hw * 0.65, hw * 0.65, -hd - 7.5, -hd - 2.8), 0.08, 'detail', b.id);
  for (const uCol of [-hw * 0.72, -hw * 0.26, hw * 0.26, hw * 0.72]) {
    const pCol = localPt(ob, uCol, -hd - 1.5);
    const colH = Math.abs(uCol) < hw * 0.5 ? 6.8 : 5.4;
    B.solid(regPoly(pCol, 0.52, 4, Math.PI / 4), 0, colH, () => 'wall', 'roof', b.id);
    B.solid(regPoly(pCol, 0.38, 8), colH, colH + 0.95, () => 'metal', 'metal', b.id);
  }

  // 2. Hai dải Tả vu – Hữu vu hai bên sân đình gạch Bát Tràng
  for (const su of [-1, 1] as const) {
    const wingOb: OrientedBox = { c: localPt(ob, su * (hw * 0.82), -hd * 0.32), u: ob.v, v: ob.u, hw: hd * 0.38, hd: 2.2 };
    B.solid(localRect(wingOb, -wingOb.hw, wingOb.hw, -wingOb.hd, wingOb.hd), 0.35, 3.8, () => 'wall', 'roof', b.id);
    drawTraditionalCurvedRoof(B, wingOb, wingOb.hw + 0.35, wingOb.hd + 0.35, 3.7, 1.45, b.id, false);
  }

  // 3. Tòa Đại bái 5 gian 2 chái đồ sộ dựng trên hệ cột gỗ lim và bộ mái đao cong chiếm 2/3 chiều cao
  const hallOb: OrientedBox = { c: localPt(ob, 0, hd * 0.22), u: ob.u, v: ob.v, hw: hw * 0.88, hd: hd * 0.56 };
  B.solid(localRect(hallOb, -hallOb.hw - 0.8, hallOb.hw + 0.8, -hallOb.hd - 0.8, hallOb.hd + 0.8), 0, 0.75, () => 'wall', 'walk', b.id);
  const hallRing = localRect(hallOb, -hallOb.hw, hallOb.hw, -hallOb.hd, hallOb.hd);
  B.solid(hallRing, 0.75, 4.8, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, hallRing, 1.4, 4.2, lamp1, 2.2);
  drawTraditionalCurvedRoof(B, hallOb, hallOb.hw + 1.1, hallOb.hd + 1.1, 4.6, 3.4, b.id, true);

  const fPos = localPt(ob, -hw - 2.0, -hd - 2.0);
  B.solid(regPoly(fPos, 0.15, 8), 0, 9.0, () => 'metal', 'metal', b.id);
}

/** 8.2 Cổng Làng Cổ (Cổng làng Mông Phụ Đường Lâm, Cổng làng Đông Ngạc, Cổng làng Nhị Khê) */
function drawAncientVillageGate(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(5.5, ob.hw), hd = Math.max(4.0, ob.hd);
  void level;

  // Khối cổng vòm đá ong / gạch cổ cùng cây đa – bến nước bên cổng làng
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * hw * 0.32, su * hw, -hd * 0.65, hd * 0.65), 0, 4.4, () => 'wall', 'roof', b.id);
  }
  B.solid(localRect(ob, -hw, hw, -hd * 0.68, hd * 0.68), 3.2, 4.6, () => 'wall', 'roof', b.id);

  // Vọng lâu gác cổng và bộ mái đao cong rêu phong
  const pavOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: hw * 0.78, hd: hd * 0.58 };
  B.solid(localRect(pavOb, -pavOb.hw, pavOb.hw, -pavOb.hd, pavOb.hd), 4.6, 6.8, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, pavOb, pavOb.hw + 0.6, pavOb.hd + 0.6, 6.7, 2.0, b.id, true);

  const fPos = localPt(ob, -hw - 2.0, -hd - 2.0);
  B.solid(regPoly(fPos, 0.15, 8), 0, 9.0, () => 'metal', 'metal', b.id);
}

// ============================================================================
// NHÓM 9: CÔNG TRÌNH VĂN HÓA, GIÁO DỤC & Y TẾ THỜI PHÁP THUỘC
// ============================================================================

/** 9.1 Ga Hà Nội – Ga Hàng Cỏ (120 Lê Duẩn) */
function drawGaHaNoi(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(32.0, ob.hw), hd = Math.max(12.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Sảnh trung tâm hiện đại hóa (xây dựng lại năm 1976 sau bom B-52 năm 1972) với mặt dựng nan đứng & đồng hồ lớn
  const centerRing = localRect(ob, -hw * 0.32, hw * 0.32, -hd, hd * 0.85);
  B.solid(centerRing, 0, 14.5, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.34, hw * 0.34, -hd - 1.8, -hd + 0.5), 3.8, 4.8, () => 'metal', 'walk', b.id);
  const clockPos = localPt(ob, 0, -hd - 0.15);
  B.solid(regPoly(clockPos, 1.65, 12), 11.2, 14.2, () => 'metal', 'metal', b.id);

  // Hai cánh kiến trúc Pháp cổ năm 1902 còn nguyên vẹn ở hai bên với mái dốc Mansard
  for (const su of [-1, 1] as const) {
    const u0 = su < 0 ? -hw : hw * 0.32;
    const u1 = su < 0 ? -hw * 0.32 : hw;
    const wingRing = localRect(ob, u0, u1, -hd * 0.88, hd * 0.85);
    B.solid(wingRing, 0, 11.8, () => 'wall', 'roof', b.id);
    B.solid(localRect(ob, u0 + 1.0, u1 - 1.0, -hd * 0.78, hd * 0.75), 11.8, 14.6, () => 'roof', 'roof', b.id);
    // Đầu hồi Pháp cổ ở hai đầu nhà ga
    const endU = su * (hw * 0.86);
    B.solid(localRect(ob, endU - 4.2, endU + 4.2, -hd * 0.96, hd * 0.92), 0, 13.2, () => 'wall', 'roof', b.id);
    B.solid(localRect(ob, endU - 3.6, endU + 3.6, -hd * 0.86, hd * 0.82), 13.2, 16.4, () => 'roof', 'roof', b.id);
    if (level >= 1) {
      addBandWindows(B, wingRing, 1.8, 5.5, lamp1, 2.6);
      addBandWindows(B, wingRing, 6.8, 10.5, lamp2, 2.6);
    }
  }

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.18, 8), 14.5, 18.8, () => 'metal', 'metal', b.id);
}

/** 9.2 Trường Đại học / THPT / Viện nghiên cứu & Bệnh viện thời Pháp thuộc (ĐH Đông Dương 19 Lê Thánh Tông, ĐH Dược, Chu Văn An, Phan Đình Phùng, Trần Phú, Việt Đức, Viện Vệ sinh Dịch tễ, BV 108, Bạch Mai, Việt Đức) */
function drawFrenchColonialUniversity(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(18.0, ob.hw), hd = Math.max(10.0, ob.hd);
  const top = Math.max(14.5, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, Math.max(2, b.parts[0]?.floors.length ?? 3));

  // Thân nhà chính dài đối xứng với dãy hành lang vòm cuốn Pháp - Đông Dương
  const bodyRing = localRect(ob, -hw, hw, -hd * 0.78, hd * 0.78);
  B.solid(bodyRing, 0, top, () => 'wall', 'roof', b.id);
  for (const su of [-1, 0, 1] as const) {
    const w = su === 0 ? hw * 0.24 : hw * 0.18;
    const uCenter = su * (hw * 0.76);
    B.solid(localRect(ob, uCenter - w, uCenter + w, -hd, hd), 0, top + (su === 0 ? 1.8 : 0.8), () => 'wall', 'roof', b.id);
  }

  // Mái ngói dốc dọc toàn khối và tháp mái vòm trung tâm (đặc trưng Đại học Đông Dương Ernest Hébrard)
  B.solid(localRect(ob, -hw * 0.96, hw * 0.96, -hd * 0.65, hd * 0.65), top, top + 2.6, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(hw * 0.22, hd * 0.48), 12), top + 1.8, top + 6.4, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(hw * 0.1, hd * 0.22), 12), top + 6.4, top + 8.5, () => 'metal', 'metal', b.id);

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.16, 8), top + 1.8, top + 6.8, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, bodyRing, 1.8, top * 0.45, lamp1, 2.4);
    addBandWindows(B, bodyRing, top * 0.55, top - 1.2, lamp2, 2.4);
  }
}

// ============================================================================
// NHÓM 10: BẢO TÀNG & TRUNG TÂM TRIỂN LÃM
// ============================================================================

/** 10.1 Bảo tàng Mỹ thuật Việt Nam & các Bảo tàng chuyên ngành (Phụ nữ, Không quân, Thiên nhiên, CAND, B-52) */
function drawFineArtsMuseum(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(16.0, ob.hw), hd = Math.max(11.0, ob.hd);
  const top = Math.max(14.5, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  const bodyRing = localRect(ob, -hw, hw, -hd * 0.82, hd * 0.82);
  B.solid(bodyRing, 0, top, () => 'wall', 'roof', b.id);
  // Sảnh đón kết hợp bộ mái đao cong 2 tầng kiểu Đông Dương (Bảo tàng Mỹ thuật 66 Nguyễn Thái Học)
  const porchOb: OrientedBox = { c: localPt(ob, 0, -hd * 0.45), u: ob.u, v: ob.v, hw: hw * 0.36, hd: hd * 0.52 };
  B.solid(localRect(porchOb, -porchOb.hw, porchOb.hw, -porchOb.hd, porchOb.hd), 0, top + 1.5, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, ob, hw * 0.95, hd * 0.78, top - 0.1, 2.6, b.id, true);
  drawTraditionalCurvedRoof(B, porchOb, porchOb.hw + 0.5, porchOb.hd + 0.5, top + 1.4, 2.2, b.id, true);

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.16, 8), top + 1.5, top + 6.5, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, bodyRing, 2.0, top * 0.46, lamp1, 2.5);
    addBandWindows(B, bodyRing, top * 0.55, top - 1.2, lamp2, 2.5);
  }
}

/** 10.2 Bảo tàng Lịch sử Quân sự Việt Nam mới (Đại lộ Thăng Long – Nam Từ Liêm) với Tháp Chiến Thắng 45m */
function drawMilitaryHistoryMuseum(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(34.0, ob.hw), hd = Math.max(18.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Quảng trường lớn & bậc thềm nghi lễ
  B.solid(localRect(ob, -hw * 1.05, hw * 1.05, -hd - 18.0, hd + 3.0), 0, 1.2, () => 'wall', 'walk', b.id);

  // Tòa nhà chính 4 tầng hiện đại với mái đua hình cánh cung vươn rộng
  const bodyRing = localRect(ob, -hw * 0.92, hw * 0.92, -hd * 0.78, hd * 0.85);
  B.solid(bodyRing, 1.2, 21.5, () => 'glass', 'roof', b.id);
  B.solid(localRect(ob, -hw, hw, -hd * 0.92, hd * 0.92), 21.5, 24.8, () => 'metal', 'roof', b.id);
  for (let k = -6; k <= 6; k++) {
    B.solid(regPoly(localPt(ob, k * (hw * 0.14), -hd * 0.84), 0.55, 8), 1.2, 21.5, () => 'metal', 'metal', b.id);
  }

  // Tháp Chiến Thắng cao 45 m hình ngôi sao 5 cánh xếp chồng ở quảng trường phía trước
  const towerPt = localPt(ob, 0, -hd - 14.0);
  for (let tier = 0; tier < 5; tier++) {
    const z0 = 1.2 + tier * 8.2;
    const r = 4.6 - tier * 0.58;
    B.solid(regPoly(towerPt, r, 5, -Math.PI / 2 + tier * 0.06), z0, z0 + 8.4, () => 'metal', 'metal', b.id);
  }
  B.solid(regPoly(towerPt, 0.25, 8), 42.2, 46.5, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, bodyRing, 3.0, 10.5, lamp1, 3.2);
    addBandWindows(B, bodyRing, 12.0, 19.8, lamp2, 3.2);
  }
}

/** 10.3 Trung tâm Triển lãm Quốc gia (Cổ Loa – Đông Anh) với đại mái vòm Thần Kim Quy */
function drawNationalExhibitionCenter(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const r = Math.max(28.0, Math.min(ob.hw, ob.hd));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Hồ nước & quảng trường tròn bao quanh tổ hợp triển lãm Kim Quy
  B.flat('water', regPoly(ob.c, r + 6.0, 24), 0.08, 'detail', b.id);
  B.solid(regPoly(ob.c, r + 1.5, 24), 0, 1.5, () => 'wall', 'walk', b.id);

  // 8 phân khu triển lãm hình cánh quạt tỏa tròn & đại mái vòm thép - kính Thần Kim Quy ở tâm
  const mainRing = regPoly(ob.c, r * 0.88, 16);
  B.solid(mainRing, 1.5, 18.0, () => 'glass', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.94, 24), 18.0, 22.5, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.68, 24), 22.5, 34.0, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.42, 20), 34.0, 46.0, () => 'glass', 'roof', b.id);
  B.solid(regPoly(ob.c, r * 0.18, 16), 46.0, 56.0, () => 'metal', 'metal', b.id);

  const polePos = localPt(ob, 0, -ob.hd * 0.65);
  B.solid(regPoly(polePos, 0.22, 8), 22.5, 29.0, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, mainRing, 3.0, 9.5, lamp1, 3.6);
    addBandWindows(B, mainRing, 11.0, 16.8, lamp2, 3.6);
  }
}

// ============================================================================
// NHÓM 11: TOÀ NHÀ CAO TẦNG, TRUNG TÂM THƯƠNG MẠI & TỔ HỢP HIỆN ĐẠI
// ============================================================================

/** 11.1 Đại Trung tâm Thương mại (Lotte Mall West Lake, Vincom Smart City, Vincom Ocean Park, AEON Mall Long Biên, AEON Mall Hà Đông) */
function drawModernMallComplex(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(26.0, ob.hw), hd = Math.max(18.0, ob.hd);
  const top = Math.max(22.0, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Khối đại thương mại đa tầng với đường viền ngang hiện đại và sảnh kính Atrium lớn
  const podiumH = Math.min(26.0, top);
  const ring = localRect(ob, -hw, hw, -hd, hd);
  B.solid(ring, 0, podiumH, () => 'wall', 'roof', b.id);
  for (const zBand of [5.5, 11.0, 16.5, podiumH - 0.8]) {
    if (zBand < podiumH) B.solid(scaleRing(ring, ob.c, 1.025), zBand, zBand + 0.65, () => 'metal', 'metal', b.id);
  }

  // Sảnh kính trung tâm và mái vòm giếng trời (Skylight dome)
  const atriumRing = localRect(ob, -hw * 0.35, hw * 0.35, -hd - 1.2, hd * 0.45);
  B.solid(atriumRing, 0, podiumH + 3.2, () => 'glass', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(hw, hd) * 0.38, 16), podiumH, podiumH + 4.8, () => 'glass', 'roof', b.id);

  // Nếu tổ hợp có khối tháp khách sạn/văn phòng vươn cao (như Lotte Mall West Lake)
  if (top > 35) {
    const towerOb: OrientedBox = { c: localPt(ob, hw * 0.45, 0), u: ob.u, v: ob.v, hw: hw * 0.34, hd: hd * 0.58 };
    const tRing = localRect(towerOb, -towerOb.hw, towerOb.hw, -towerOb.hd, towerOb.hd);
    B.solid(tRing, podiumH, top, () => 'glass', 'roof', b.id);
    B.solid(scaleRing(tRing, towerOb.c, 0.85), top, top + 5.5, () => 'metal', 'metal', b.id);
  }

  if (level >= 1) {
    addBandWindows(B, ring, 1.8, 10.2, lamp1, 3.0);
    addBandWindows(B, ring, 12.0, podiumH - 1.5, lamp2, 3.0);
  }
}

// ============================================================================
// NHÓM 12: KHÁCH SẠN SANG TRỌNG & NỔI TIẾNG
// ============================================================================

/** 12.1 Cao ốc Tài chính & Khách sạn 5 sao (TechnoPark, Vietcombank, BIDV, Pacific Place, Geleximco, Grand Plaza, Sheraton, Meliá, Du Parc, Mường Thanh Grand) */
function drawLuxuryHotelTower(B: Batch, b: Building, level: Detail) {
  for (const p of b.parts) {
    const ob = orientedBoxOf(p.footprint, b.front);
    const top = partTop(p);
    const lampTop = floorId(b, Math.max(1, p.floors.length));

    // Khối sảnh đón mái kính (Porte-cochère) ở chân tòa tháp
    B.solid(localRect(ob, -ob.hw * 0.48, ob.hw * 0.48, -ob.hd - 3.2, -ob.hd), 4.2, 5.2, () => 'metal', 'metal', b.id);

    // Các đai chỉ kiến trúc ngang & Vương miện đỉnh tháp sang trọng (Crown + Spire)
    for (const frac of [0.25, 0.5, 0.75, 0.98]) {
      const zBelt = top * frac;
      B.solid(scaleRing(p.footprint, ob.c, 1.028), zBelt, zBelt + 0.75, () => 'metal', 'metal', b.id);
    }
    const crown1 = scaleRing(p.footprint, ob.c, 0.84);
    const crown2 = scaleRing(p.footprint, ob.c, 0.62);
    B.solid(crown1, top, top + 4.8, () => 'glass', 'roof', b.id);
    B.solid(crown2, top + 4.8, top + 8.2, () => 'metal', 'metal', b.id);
    B.solid(regPoly(ob.c, 0.35, 8), top + 8.2, top + 13.5, () => 'metal', 'metal', b.id);

    if (level >= 1) addBandWindows(B, crown1, top + 0.8, top + 4.2, lampTop, 2.4);
  }
}

/** 12.2 Khách sạn Di sản Pháp cổ (Sofitel Legend Metropole, Hilton Hanoi Opera, Apricot, Silk Path, Mövenpick) */
function drawMetropoleHotel(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(18.0, ob.hw), hd = Math.max(12.0, ob.hd);
  const top = Math.max(18.5, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lampTop = floorId(b, Math.max(2, b.parts[0]?.floors.length ?? 5));

  // Khối khách sạn Pháp cổ điển hình chữ L / chữ U bao quanh sân vườn bể bơi trung tâm
  const bodyRing = localRect(ob, -hw, hw, -hd, hd);
  B.solid(bodyRing, 0, top, () => 'wall', 'roof', b.id);
  B.solid(scaleRing(bodyRing, ob.c, 1.03), 4.5, 5.1, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(bodyRing, ob.c, 1.035), top - 0.6, top + 0.4, () => 'metal', 'roof', b.id);

  // Mái Mansard đen đặc trưng Metropole & tháp góc vòm
  B.solid(localRect(ob, -hw * 0.92, hw * 0.92, -hd * 0.9, hd * 0.9), top + 0.4, top + 3.6, () => 'roof', 'roof', b.id);
  for (const su of [-1, 1] as const) {
    const cPos = localPt(ob, su * (hw * 0.82), -hd * 0.78);
    B.solid(regPoly(cPos, 3.4, 10), top + 0.4, top + 5.2, () => 'metal', 'metal', b.id);
  }

  // Mái vòm sắt rèn cổ điển ở lối vào chính
  B.solid(localRect(ob, -4.5, 4.5, -hd - 2.6, -hd), 3.6, 4.3, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, bodyRing, 1.5, top * 0.48, lamp1, 2.2);
    addBandWindows(B, bodyRing, top * 0.55, top - 1.2, lampTop, 2.2);
  }
}

/** 12.3 Khách sạn JW Marriott Hà Nội (Kiến trúc "Con rồng huyền thoại bên bờ biển" – Đỗ Đức Dục) */
function drawJwMarriottHanoi(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(28.0, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Mặt hồ nước cảnh quan ôm trọn khối khách sạn
  B.flat('water', localRect(ob, -hw - 5.0, hw + 5.0, -hd - 8.0, -hd + 2.0), 0.08, 'detail', b.id);

  // 5 khối спиral / lượn sóng nối tiếp nhau theo hình dáng rồng cuộn vươn ra mặt hồ
  const segments = 5;
  const segW = (hw * 1.9) / segments;
  for (let i = 0; i < segments; i++) {
    const u0 = -hw * 0.95 + i * segW;
    const u1 = u0 + segW * 0.92;
    const vShift = Math.sin((i / (segments - 1)) * Math.PI) * 3.8;
    const zBase = i === 0 || i === segments - 1 ? 0 : 3.5;
    const zTop = 24.0 + Math.sin((i / (segments - 1)) * Math.PI) * 8.5;
    const segRing = localRect(ob, u0, u1, -hd * 0.72 + vShift, hd * 0.72 + vShift);
    B.solid(segRing, zBase, zTop, () => 'glass', 'roof', b.id);
    B.solid(localRect(ob, u0 - 0.6, u1 + 0.6, -hd * 0.78 + vShift, hd * 0.78 + vShift), zTop, zTop + 2.2, () => 'metal', 'metal', b.id);
    if (level >= 1) {
      addBandWindows(B, segRing, zBase + 2.0, zTop * 0.55, lamp1, 2.8);
      addBandWindows(B, segRing, zTop * 0.6, zTop - 1.2, lamp2, 2.8);
    }
  }
}

/** 12.4 Khách sạn InterContinental Hanoi Westlake (Quần thể đảo nổi trên mặt nước Hồ Tây – Từ Hoa) */
function drawIntercontinentalWestlake(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(24.0, ob.hw), hd = Math.max(16.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Mặt nước Hồ Tây bao quanh toàn bộ tổ hợp
  B.flat('water', localRect(ob, -hw - 6.0, hw + 6.0, -hd - 6.0, hd + 6.0), 0.08, 'detail', b.id);

  // Tòa khách sạn chính bên bờ và 3 Pavilions nổi trên mặt nước nối bằng cầu gỗ
  const mainOb: OrientedBox = { c: localPt(ob, 0, hd * 0.48), u: ob.u, v: ob.v, hw: hw * 0.72, hd: hd * 0.36 };
  const mainRing = localRect(mainOb, -mainOb.hw, mainOb.hw, -mainOb.hd, mainOb.hd);
  B.solid(mainRing, 0.3, 18.5, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, mainOb, mainOb.hw + 0.6, mainOb.hd + 0.6, 18.4, 2.8, b.id, true);

  for (const k of [-1, 0, 1] as const) {
    const pavPos = localPt(ob, k * (hw * 0.62), -hd * 0.38);
    // Cầu gỗ dẫn ra đảo nổi
    B.solid(localRect(ob, k * (hw * 0.62) - 1.1, k * (hw * 0.62) + 1.1, -hd * 0.38, hd * 0.15), 0.2, 0.85, () => 'wall', 'walk', b.id);
    const pavOb: OrientedBox = { c: pavPos, u: ob.u, v: ob.v, hw: 5.8, hd: 5.2 };
    const pavRing = localRect(pavOb, -5.8, 5.8, -5.2, 5.2);
    B.solid(pavRing, 0.3, 9.2, () => 'wall', 'roof', b.id);
    drawTraditionalCurvedRoof(B, pavOb, 6.2, 5.6, 9.1, 2.1, b.id, true);
    if (level >= 1) addBandWindows(B, pavRing, 1.5, 8.0, lamp1, 2.2);
  }
  if (level >= 1) addBandWindows(B, mainRing, 2.0, 16.5, lamp2, 2.6);
}

/** 12.5 Khách sạn Pan Pacific Hà Nội (Số 1 Đường Thanh Niên – giữa Hồ Tây & Hồ Trúc Bạch) */
function drawPanPacificHanoi(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(14.0, ob.hw), hd = Math.max(10.0, ob.hd);
  const top = Math.max(66.0, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lampTop = floorId(b, Math.max(2, b.parts[0]?.floors.length ?? 20));

  // Khối đế 4 tầng & thân tháp kính 20 tầng
  B.solid(localRect(ob, -hw * 1.15, hw * 1.15, -hd * 1.1, hd * 1.1), 0, 14.0, () => 'wall', 'roof', b.id);
  const tRing = localRect(ob, -hw * 0.85, hw * 0.85, -hd * 0.82, hd * 0.82);
  B.solid(tRing, 14.0, top, () => 'glass', 'roof', b.id);

  // Đỉnh tháp vát bậc thang nghiêng (Summit Roof Bar nhìn toàn cảnh Hồ Tây)
  for (let st = 0; st < 4; st++) {
    const u0 = -hw * 0.82 + st * (hw * 0.32);
    B.solid(localRect(ob, u0, hw * 0.82, -hd * 0.78, hd * 0.78), top + st * 2.1, top + (st + 1) * 2.1, () => 'metal', 'metal', b.id);
  }

  if (level >= 1) {
    addBandWindows(B, tRing, 16.0, top * 0.55, lamp1, 2.6);
    addBandWindows(B, tRing, top * 0.6, top - 1.5, lampTop, 2.6);
  }
}

// ============================================================================
// NHÓM 13: CẦU, HẠ TẦNG, THỂ THAO & CÔNG TRÌNH VĂN HOÁ QUY MÔ LỚN
// ============================================================================

/** 13.1 Cầu Chương Dương & Cầu Thăng Long (Cầu giàn thép lớn vượt sông Hồng) */
function drawCauChuongDuong(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(44.0, ob.hw), hd = Math.max(8.5, ob.hd);
  void level;

  // Trụ cầu bê tông trên sông Hồng & bản mặt cầu 2 tầng / 4 làn xe
  for (let k = -2; k <= 2; k++) {
    const uPier = k * (hw * 0.42);
    B.solid(localRect(ob, uPier - 2.0, uPier + 2.0, -hd * 1.05, hd * 1.05), 0, 10.5, () => 'wall', 'walk', b.id);
  }
  B.solid(localRect(ob, -hw, hw, -hd, hd), 10.5, 12.2, () => 'wall', 'walk', b.id);

  // Hệ giàn thép hình thang song song khỏe khoắn chạy dọc nhịp cầu
  const spans = 3;
  const spanW = (hw * 1.9) / spans;
  for (let s = 0; s < spans; s++) {
    const u0 = -hw * 0.95 + s * spanW;
    const u1 = u0 + spanW * 0.96;
    const uTop0 = u0 + spanW * 0.12;
    const uTop1 = u1 - spanW * 0.12;
    for (const sv of [-1, 1] as const) {
      const vTruss = sv * (hd * 0.76);
      B.solid(localRect(ob, uTop0, uTop1, vTruss - 0.35, vTruss + 0.35), 20.2, 21.0, () => 'metal', 'metal', b.id);
      for (let d = 0; d <= 4; d++) {
        const uNode = u0 + (d / 4) * (u1 - u0);
        const uNext = u0 + ((d + 0.5) / 4) * (u1 - u0);
        const pBot = localPt(ob, uNode, vTruss);
        const pTop = localPt(ob, Math.min(uTop1, Math.max(uTop0, uNext)), vTruss);
        B.solid(regPoly(pBot, 0.38, 6), 12.2, 20.5, () => 'metal', 'metal', b.id);
        B.line(V(pBot[0], pBot[1], 12.2), V(pTop[0], pTop[1], 20.5), 'crease');
      }
    }
    // Thanh giằng ngang đỉnh giàn thép
    for (let d = 1; d <= 3; d++) {
      const uBr = u0 + (d / 4) * (u1 - u0);
      B.solid(localRect(ob, uBr - 0.3, uBr + 0.3, -hd * 0.76, hd * 0.76), 20.2, 20.8, () => 'metal', 'metal', b.id);
    }
  }
}

/** 13.2 Cầu Vĩnh Tuy, Cầu Thanh Trì, Cầu Vĩnh Thịnh (Cầu bê tông dự ứng lực & Extradosed vượt sông Hồng) */
function drawArchExtradosedBridge(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(46.0, ob.hw), hd = Math.max(10.5, ob.hd);
  void level;

  // Bản mặt cầu bê tông rộng 6–8 làn xe
  B.solid(localRect(ob, -hw, hw, -hd, hd), 11.5, 14.0, () => 'wall', 'walk', b.id);

  // 3 trụ cầu chính hình chữ V cùng tháp thấp (Extradosed) và cáp văng căng ngang
  for (const k of [-1, 0, 1] as const) {
    const uPylon = k * (hw * 0.55);
    B.solid(localRect(ob, uPylon - 2.8, uPylon + 2.8, -hd * 0.85, hd * 0.85), 0, 11.5, () => 'wall', 'roof', b.id);
    for (const sv of [-1, 1] as const) {
      const pTower = localPt(ob, uPylon, sv * (hd * 0.82));
      B.solid(regPoly(pTower, 1.35, 8), 14.0, 32.0, () => 'wall', 'metal', b.id);
      for (const sDir of [-1, 1] as const) {
        for (let c = 1; c <= 3; c++) {
          const pDeck = localPt(ob, uPylon + sDir * c * (hw * 0.075), sv * (hd * 0.82));
          B.line(V(pTower[0], pTower[1], 22.0 + c * 3.0), V(pDeck[0], pDeck[1], 14.0), 'crease');
        }
      }
    }
  }
}

/** 13.3 Cung Thể thao Quần Ngựa, Cung Điền kinh Hà Nội, Cung Thiếu nhi Hà Nội, Nhà thi đấu Gia Lâm */
function drawIndoorSportsArena(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = Math.max(24.0, ob.hw), hd = Math.max(18.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // Đế bậc thang khán đài & hàng cột nghiêng chịu lực bao quanh nhà thi đấu
  B.solid(localRect(ob, -hw * 1.06, hw * 1.06, -hd * 1.06, hd * 1.06), 0, 1.4, () => 'wall', 'walk', b.id);
  const arenaRing = regPoly(ob.c, Math.min(hw, hd) * 0.92, 20);
  B.solid(arenaRing, 1.4, 15.5, () => 'glass', 'roof', b.id);
  for (let i = 0; i < 16; i++) {
    const ang = (i * 2 * Math.PI) / 16;
    const pCol = localPt(ob, Math.cos(ang) * hw * 0.95, Math.sin(ang) * hd * 0.92);
    B.solid(regPoly(pCol, 0.58, 8), 1.4, 16.5, () => 'metal', 'metal', b.id);
  }

  // Mái vòm không gian khẩu độ lớn (Space-frame dome roof)
  B.solid(regPoly(ob.c, Math.min(hw, hd) * 1.02, 20), 15.5, 19.2, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(hw, hd) * 0.72, 20), 19.2, 23.0, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(hw, hd) * 0.36, 16), 23.0, 25.4, () => 'glass', 'roof', b.id);

  const polePos = localPt(ob, 0, -hd * 0.65);
  B.solid(regPoly(polePos, 0.18, 8), 19.2, 25.0, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, arenaRing, 3.2, 8.5, lamp1, 3.2);
    addBandWindows(B, arenaRing, 9.8, 14.5, lamp2, 3.2);
  }
}

/**
 * Bộ điều phối dựng 3D cho các công trình thuộc danh mục 13 nhóm của Hà Nội.
 */
export function drawHaNoiCatalogLandmarkBuilding(B: Batch, b: Building, level: Detail): boolean {
  switch (b.model) {
    case 'city-gate-stele':
      drawCityGateStele(B, b, level);
      return true;
    case 'bac-mon':
      drawBacMon(B, b, level);
      return true;
    case 'dien-kinh-thien':
      drawDienKinhThien(B, b, level);
      return true;
    case 'hau-lau':
      drawHauLau(B, b, level);
      return true;
    case 'co-loa-citadel':
      drawCoLoaCitadel(B, b, level);
      return true;
    case 'party-central-hq':
      drawPartyCentralHq(B, b, level);
      return true;
    case 'bac-bo-phu':
      drawBacBoPhu(B, b, level);
      return true;
    case 'ministry-palace':
      drawMinistryPalace(B, b, level);
      return true;
    case 'nha-tho-cua-bac':
      drawNhaThoCuaBac(B, b, level);
      return true;
    case 'nha-tho-ham-long':
      drawNhaThoHamLong(B, b, level);
      return true;
    case 'al-noor-mosque':
      drawAlNoorMosque(B, b, level);
      return true;
    case 'statue-monument-plaza':
      drawStatueMonumentPlaza(B, b, level);
      return true;
    case 'tuong-dai-cam-tu':
      drawTuongDaiCamTu(B, b, level);
      return true;
    case 'tuong-dai-quang-trung':
      drawTuongDaiQuangTrung(B, b, level);
      return true;
    case 'b52-huu-tiep-lake':
      drawB52HuuTiepLake(B, b, level);
      return true;
    case 'cau-the-huc':
      drawCauTheHuc(B, b, level);
      return true;
    case 'thap-but':
      drawThapBut(B, b, level);
      return true;
    case 'thap-hoa-phong':
      drawThapHoaPhong(B, b, level);
      return true;
    case 'thap-nuoc-hang-dau':
      drawThapNuocHangDau(B, b, level);
      return true;
    case 'nha-co-ma-may':
      drawNhaCoMaMay(B, b, level);
      return true;
    case 'traditional-market-hall':
      drawTraditionalMarketHall(B, b, level);
      return true;
    case 'mountain-pagoda-complex':
      drawMountainPagodaComplex(B, b, level);
      return true;
    case 'ancient-communal-house':
      drawAncientCommunalHouse(B, b, level);
      return true;
    case 'ancient-village-gate':
      drawAncientVillageGate(B, b, level);
      return true;
    case 'ga-ha-noi':
      drawGaHaNoi(B, b, level);
      return true;
    case 'french-colonial-university':
      drawFrenchColonialUniversity(B, b, level);
      return true;
    case 'fine-arts-museum':
      drawFineArtsMuseum(B, b, level);
      return true;
    case 'military-history-museum':
      drawMilitaryHistoryMuseum(B, b, level);
      return true;
    case 'national-exhibition-center':
      drawNationalExhibitionCenter(B, b, level);
      return true;
    case 'modern-mall-complex':
      drawModernMallComplex(B, b, level);
      return true;
    case 'luxury-hotel-tower':
      drawLuxuryHotelTower(B, b, level);
      return true;
    case 'metropole-hotel':
      drawMetropoleHotel(B, b, level);
      return true;
    case 'jw-marriott-hanoi':
      drawJwMarriottHanoi(B, b, level);
      return true;
    case 'intercontinental-westlake':
      drawIntercontinentalWestlake(B, b, level);
      return true;
    case 'pan-pacific-hanoi':
      drawPanPacificHanoi(B, b, level);
      return true;
    case 'cau-chuong-duong':
      drawCauChuongDuong(B, b, level);
      return true;
    case 'arch-extradosed-bridge':
      drawArchExtradosedBridge(B, b, level);
      return true;
    case 'indoor-sports-arena':
      drawIndoorSportsArena(B, b, level);
      return true;
    default:
      return false;
  }
}
