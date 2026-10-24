/* Bespoke 3D architectural models for Hanoi's iconic historical monuments, heritage complexes,
   temples, pagodas, communal houses, churches, statues, and signature commercial skyscrapers across
   Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, and Thanh Xuân (Rule A16).
   Every builder operates in the building's real footprint frame so it renders identically on the 3D
   city map and inside the standalone 3D Diorama Showcase. Pure. */
import * as THREE from 'three';
import { centroid, floorId, partTop, area as ringArea, type Building, type Feature, type Vec2 } from '@my-city/core';
import { V, type Batch, type Surface } from './batch';
import type { Detail } from './buildings';
import {
  MAX_FLAG_VIEW_SPAN_M,
  createWavingFlagGroup,
  getFlagMaterial,
  isFlagVisibleAtSpan,
  registerFlagPainter,
  stepSharedWavingFlags,
  stepWavingFlag,
  type FlagCountryCode,
  type WavingFlagInstance,
  type WavingFlagSpec,
} from './flags';

export {
  MAX_FLAG_VIEW_SPAN_M,
  createWavingFlagGroup,
  getFlagMaterial,
  isFlagVisibleAtSpan,
  registerFlagPainter,
  stepSharedWavingFlags,
  stepWavingFlag,
  type FlagCountryCode,
  type WavingFlagInstance,
  type WavingFlagSpec,
};

/** Models whose base part prisms are completely replaced by custom 3D architecture */
export const CUSTOM_MASSING_MODELS = new Set<string>([
  'one-pillar-pagoda',
  'nha-san-bac-ho',
  'khue-van-cac',
  'van-mieu-mon',
  'van-mieu-gate',
  'van-mieu-hall',
  'nha-thai-hoc',
  'bac-son-memorial',
  'thap-rua',
  'den-ngoc-son',
  'o-quan-chuong',
  'chua-tran-quoc',
  'den-quan-thanh',
  'phu-tay-ho',
  'den-hai-ba-trung',
  'chua-quan-su',
  'chua-phuc-khanh',
  'traditional-pagoda',
  'traditional-temple',
  'church-hall',
  'traditional-mausoleum',
]);

interface OrientedBox {
  c: Vec2;
  u: Vec2;
  v: Vec2;
  hw: number;
  hd: number;
}

function orientedBoxOf(ring: readonly Vec2[], frontIdx = 0): OrientedBox {
  const n = ring.length;
  // Find longest edge or use frontIdx if valid
  let bestI = frontIdx >= 0 && frontIdx < n ? frontIdx : 0;
  let bestL = 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i]!, q = ring[(i + 1) % n]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L > bestL) { bestL = L; bestI = i; }
  }
  const p0 = ring[bestI]!, p1 = ring[(bestI + 1) % n]!;
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const u: Vec2 = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L];
  const v: Vec2 = [-u[1], u[0]];
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const [x, y] of ring) {
    const du = x * u[0] + y * u[1];
    const dv = x * v[0] + y * v[1];
    if (du < uMin) uMin = du;
    if (du > uMax) uMax = du;
    if (dv < vMin) vMin = dv;
    if (dv > vMax) vMax = dv;
  }
  const cu = (uMin + uMax) / 2, cv = (vMin + vMax) / 2;
  const c: Vec2 = [u[0] * cu + v[0] * cv, u[1] * cu + v[1] * cv];
  return {
    c,
    u,
    v,
    hw: Math.max(1.2, (uMax - uMin) / 2),
    hd: Math.max(1.2, (vMax - vMin) / 2),
  };
}

function localPt(ob: OrientedBox, du: number, dv: number): Vec2 {
  return [
    ob.c[0] + ob.u[0] * du + ob.v[0] * dv,
    ob.c[1] + ob.u[1] * du + ob.v[1] * dv,
  ];
}

function localRect(ob: OrientedBox, u0: number, u1: number, v0: number, v1: number): Vec2[] {
  return [
    localPt(ob, u0, v0),
    localPt(ob, u1, v0),
    localPt(ob, u1, v1),
    localPt(ob, u0, v1),
  ];
}

function scaleRing(ring: readonly Vec2[], c: Vec2, s: number): Vec2[] {
  return ring.map(([x, y]) => [c[0] + (x - c[0]) * s, [c[1] + (y - c[1]) * s][0]!]);
}

function regPoly(c: Vec2, r: number, n: number, rot = 0): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => [
    c[0] + r * Math.cos(rot + (i * 2 * Math.PI) / n),
    c[1] + r * Math.sin(rot + (i * 2 * Math.PI) / n),
  ]);
}

function addBandWindows(B: Batch, ring: readonly Vec2[], z0: number, z1: number, lamp: string, step = 2.4) {
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 1.1) return;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux, off = 0.08;
    const nrm = new THREE.Vector3(nx, 0, ny);
    const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
    const cols = Math.max(1, Math.round(L / step)), pw = (L - 0.5) / cols;
    for (let k = 0; k < cols; k++) {
      const t0 = 0.25 + k * pw + 0.08, t1 = 0.25 + (k + 1) * pw - 0.08;
      if (t1 > t0 + 0.15) B.window(lamp, [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], nrm);
    }
  });
}

/** Traditional Vietnamese curved hipped tiled roof (Mái đao cong truyền thống):
    stepped overhanging eaves, tapered hip tiers, ridge beam (bờ nóc) and upturned corner dragon-tails (đầu đao cong) */
function drawTraditionalCurvedRoof(
  B: Batch,
  ob: OrientedBox,
  hw: number,
  hd: number,
  zBase: number,
  roofH: number,
  ownerId?: string,
  ornate = true,
) {
  const eaveW = hw + 1.15;
  const eaveD = hd + 1.15;
  // Lower wide eave tier (diềm mái ngói mũi hài đua rộng)
  B.solid(localRect(ob, -eaveW, eaveW, -eaveD, eaveD), zBase, zBase + roofH * 0.26, () => 'roof', 'roof', ownerId);
  // Middle hipped slope tier
  B.solid(localRect(ob, -hw * 0.86, hw * 0.86, -hd * 0.82, hd * 0.82), zBase + roofH * 0.26, zBase + roofH * 0.58, () => 'roof', 'roof', ownerId);
  // Upper hipped slope tier
  B.solid(localRect(ob, -hw * 0.66, hw * 0.66, -hd * 0.52, hd * 0.52), zBase + roofH * 0.58, zBase + roofH * 0.86, () => 'roof', 'roof', ownerId);
  // Top ridge beam (bờ nóc) along the primary axis
  const ridgeW = Math.max(0.8, hw * 0.54);
  const ridgeD = Math.min(0.42, hd * 0.24);
  B.solid(localRect(ob, -ridgeW, ridgeW, -ridgeD, ridgeD), zBase + roofH * 0.86, zBase + roofH + 0.28, () => 'metal', 'metal', ownerId);

  if (!ornate) return;
  // End ridge finials (kìm nóc / đầu đao bờ nóc) & central lunar/flaming pearl (lưỡng long chầu nguyệt)
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * (ridgeW - 0.22), su * (ridgeW + 0.18), -ridgeD * 1.1, ridgeD * 1.1), zBase + roofH + 0.28, zBase + roofH + 0.72, () => 'metal', 'metal', ownerId);
  }
  B.solid(regPoly(ob.c, Math.min(0.45, ridgeD * 1.25), 8), zBase + roofH + 0.28, zBase + roofH + 0.82, () => 'metal', 'metal', ownerId);

  // 4 upturned corner dragon-tail eaves (4 đầu đao cong vút ở 4 góc mái)
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const pCorner = localPt(ob, su * eaveW, sv * eaveD);
      const pTip = localPt(ob, su * (eaveW + 0.85), sv * (eaveD + 0.85));
      const pMid = localPt(ob, su * (hw * 0.66), sv * (hd * 0.52));
      B.line(V(pMid[0], pMid[1], zBase + roofH * 0.84), V(pCorner[0], pCorner[1], zBase + roofH * 0.26), 'crease');
      B.line(V(pCorner[0], pCorner[1], zBase + roofH * 0.26), V(pTip[0], pTip[1], zBase + roofH * 0.62), 'crease');
      B.solid(regPoly(pTip, 0.24, 6), zBase + roofH * 0.22, zBase + roofH * 0.65, () => 'metal', 'metal', ownerId);
    }
  }
}

/** Geographic East unit vector in the Hanoi city coordinate frame (bearing = 62.5° CCW from East) */
const EAST_CITY_DIR: Vec2 = [Math.cos((62.5 * Math.PI) / 180), Math.sin((62.5 * Math.PI) / 180)];

/** Ensure `-ob.v` points toward Geographic East (into Quảng trường Ba Đình, toward đường Hùng Vương & Nhà Quốc hội) */
function orientBoxTowardEast(ob: OrientedBox): OrientedBox {
  const dot = -ob.v[0] * EAST_CITY_DIR[0] + -ob.v[1] * EAST_CITY_DIR[1];
  if (dot >= 0) return ob;
  return {
    ...ob,
    u: [-ob.u[0], -ob.u[1]],
    v: [-ob.v[0], -ob.v[1]],
  };
}

/** Waving national & traditional festival flags for key monuments and temples */
export function landmarkFlagsOf(b: Building): WavingFlagSpec[] {
  switch (b.model) {
    case 'ho-chi-minh-mausoleum': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      const flagPos = localPt(ob, 0, -ob.hd - 20);
      return [
        {
          id: `${b.id}:flag:ba-dinh`,
          polePos: flagPos,
          z0: 24.8,
          z1: 29.0,
          width: 6.3,
          dir: ob.u,
          phase: 0,
          country: 'vn',
        },
      ];
    }
    case 'national-assembly': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      return [
        {
          id: `${b.id}:flag:roof`,
          polePos: ob.c,
          z0: 49.8,
          z1: 54.0,
          width: 6.3,
          dir: ob.u,
          phase: 1.8,
          country: 'vn',
        },
      ];
    }
    case 'hanoi-flag-tower': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      const tallest = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
      const tc = centroid(tallest.footprint);
      const topZ = Math.max(33.4, partTop(tallest));
      return [
        {
          id: `${b.id}:flag:ky-dai`,
          polePos: tc,
          z0: topZ + 8.0,
          z1: topZ + 12.2,
          width: 6.3,
          dir: ob.u,
          phase: 3.5,
          country: 'vn',
        },
      ];
    }
    case 'hanoi-opera-house': {
      const ob = orientedBoxOf(b.footprint, b.front);
      const top = Math.max(24.0, ...b.parts.map(partTop));
      const frontPole = localPt(ob, 0, -ob.hd * 0.55);
      return [
        {
          id: `${b.id}:flag:opera`,
          polePos: frontPole,
          z0: top + 9.2,
          z1: top + 12.0,
          width: 4.2,
          dir: ob.u,
          phase: 1.1,
          country: 'vn',
        },
      ];
    }
    case 'den-ngoc-son':
    case 'phu-tay-ho':
    case 'den-quan-thanh':
    case 'den-hai-ba-trung': {
      const ob = orientedBoxOf(b.footprint, b.front);
      const flagPos = localPt(ob, -ob.hw - 2.2, -ob.hd - 2.2);
      return [
        {
          id: `${b.id}:flag:festive`,
          polePos: flagPos,
          z0: 6.2,
          z1: 9.0,
          width: 3.2,
          dir: ob.u,
          phase: 2.4,
          country: 'festive',
        },
      ];
    }
    default:
      return [];
  }
}

/** Additional aircraft warning beacons for skyscraper & monument landmarks */
export function landmarkBeaconsOf(b: Building): THREE.Vector3[] {
  const c = centroid(b.footprint);
  switch (b.model) {
    case 'lotte-center': {
      const tower = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
      const tc = centroid(tower.footprint), top = partTop(tower);
      return [V(tc[0] - 8, tc[1], top + 12.5), V(tc[0] + 8, tc[1], top + 12.5)];
    }
    case 'vinhomes-metropolis':
    case 'capital-place':
    case 'vincom-nct':
    case 'vincom-ba-trieu':
    case 'royal-city': {
      return b.parts
        .filter(p => p.floors.length >= 20)
        .map(p => {
          const pc = centroid(p.footprint);
          return V(pc[0], pc[1], partTop(p) + 6.5);
        });
    }
    case 'daewoo-hotel': {
      const tallest = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
      const tc = centroid(tallest.footprint);
      return [V(tc[0], tc[1], partTop(tallest) + 9.5)];
    }
    case 'hanoi-flag-tower': {
      const tallest = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
      const tc = centroid(tallest.footprint);
      return [V(tc[0], tc[1], Math.max(33.4, partTop(tallest)) + 12.8)];
    }
    case 'national-assembly': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      return [V(ob.c[0], ob.c[1], 54.6)];
    }
    default:
      void c;
      return [];
  }
}

/** Extra bounding points for showcase dioramas (e.g. Chùa Một Cột pond, Khuê Văn Các stelae gardens, Cột cờ Ba Đình, Cầu Thê Húc) */
export function landmarkExtraBoundsPts(b: Building): Vec2[] {
  const c = centroid(b.footprint);
  switch (b.model) {
    case 'ho-chi-minh-mausoleum': {
      const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
      return [
        localPt(ob, -8, -ob.hd - 25),
        localPt(ob, 8, -ob.hd - 25),
      ];
    }
    case 'one-pillar-pagoda':
      return [[c[0] - 12, c[1] - 12], [c[0] + 12, c[1] + 12]];
    case 'khue-van-cac':
      return [[c[0] - 24, c[1] - 24], [c[0] + 24, c[1] + 24]];
    case 'van-mieu-mon':
      return [[c[0] - 14, c[1] - 10], [c[0] + 14, c[1] + 10]];
    case 'nha-san-bac-ho':
      return [[c[0] - 10, c[1] - 9], [c[0] + 10, c[1] + 9]];
    case 'thap-rua':
      return [[c[0] - 18, c[1] - 18], [c[0] + 18, c[1] + 18]];
    case 'den-ngoc-son':
      return [[c[0] - 28, c[1] - 28], [c[0] + 28, c[1] + 28]];
    case 'chua-tran-quoc':
      return [[c[0] - 22, c[1] - 22], [c[0] + 22, c[1] + 22]];
    default:
      return [];
  }
}

export function drawLandmarkBuilding(B: Batch, b: Building, level: Detail): boolean {
  switch (b.model) {
    case 'one-pillar-pagoda':
      drawOnePillarPagoda(B, b, level);
      return true;
    case 'nha-san-bac-ho':
      drawNhaSanBacHo(B, b, level);
      return true;
    case 'khue-van-cac':
      drawKhueVanCac(B, b, level);
      return true;
    case 'van-mieu-mon':
      drawVanMieuMon(B, b, level);
      return true;
    case 'van-mieu-gate':
      drawVanMieuGate(B, b, level);
      return true;
    case 'van-mieu-hall':
      drawVanMieuHall(B, b, level);
      return true;
    case 'nha-thai-hoc':
      drawNhaThaiHoc(B, b, level);
      return true;
    case 'ho-chi-minh-mausoleum':
      drawHoChiMinhMausoleum(B, b, level);
      return true;
    case 'hanoi-flag-tower':
      drawHanoiFlagTower(B, b, level);
      return true;
    case 'doan-mon':
      drawDoanMon(B, b, level);
      return true;
    case 'national-assembly':
      drawNationalAssembly(B, b, level);
      return true;
    case 'ho-chi-minh-museum':
      drawHoChiMinhMuseum(B, b, level);
      return true;
    case 'presidential-palace':
      drawPresidentialPalace(B, b, level);
      return true;
    case 'bac-son-memorial':
      drawBacSonMemorial(B, b, level);
      return true;
    case 'lotte-center':
      drawLotteCenter(B, b, level);
      return true;
    case 'vinhomes-metropolis':
      drawVinhomesMetropolis(B, b, level);
      return true;
    case 'capital-place':
      drawCapitalPlace(B, b, level);
      return true;
    case 'daewoo-hotel':
      drawDaewooHotel(B, b, level);
      return true;
    case 'hanoi-centre':
      drawHanoiCentre(B, b, level);
      return true;
    case 'vincom-pnt':
    case 'vincom-nct':
    case 'vincom-ba-trieu':
    case 'pullman-hanoi':
      drawCommercialLandmarkCrown(B, b, level);
      return true;
    case 'thap-rua':
      drawThapRua(B, b, level);
      return true;
    case 'den-ngoc-son':
      drawDenNgocSon(B, b, level);
      return true;
    case 'hanoi-opera-house':
      drawHanoiOperaHouse(B, b, level);
      return true;
    case 'st-joseph-cathedral':
      drawStJosephCathedral(B, b, level);
      return true;
    case 'trang-tien-plaza':
      drawTrangTienPlaza(B, b, level);
      return true;
    case 'o-quan-chuong':
      drawOQuanChuong(B, b, level);
      return true;
    case 'cho-dong-xuan':
      drawChoDongXuan(B, b, level);
      return true;
    case 'hoa-lo-prison':
      drawHoaLoPrison(B, b, level);
      return true;
    case 'national-history-museum':
      drawNationalHistoryMuseum(B, b, level);
      return true;
    case 'chua-quan-su':
    case 'chua-phuc-khanh':
    case 'traditional-pagoda':
      drawTraditionalPagodaComplex(B, b, level);
      return true;
    case 'chua-tran-quoc':
      drawChuaTranQuoc(B, b, level);
      return true;
    case 'den-quan-thanh':
    case 'phu-tay-ho':
    case 'den-hai-ba-trung':
    case 'traditional-temple':
      drawTraditionalTempleComplex(B, b, level);
      return true;
    case 'royal-city':
      drawRoyalCity(B, b, level);
      return true;
    case 'church-hall':
      drawChurchHall(B, b, level);
      return true;
    case 'traditional-mausoleum':
      drawTraditionalMausoleum(B, b, level);
      return true;
    default:
      return false;
  }
}

// ============================================================================
// 1. CHÙA MỘT CỘT – DIÊN HỰU TỰ (Liên Hoa Đài trên Hồ Linh Chiểu)
// ============================================================================
function drawOnePillarPagoda(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Hồ Linh Chiểu (Square Lotus Pond + carved brick/stone balustrade wall around the pond)
  const pondR = 9.4;
  B.flat('water', localRect(ob, -pondR, pondR, -pondR, pondR), 0.08, 'detail', b.id);
  // Perimeter stone curb & carved lotus-pond balustrade walls
  const wallOuter = pondR + 0.55;
  B.solid(localRect(ob, -wallOuter, wallOuter, -wallOuter, -pondR), 0, 0.92, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -wallOuter, wallOuter, pondR, wallOuter), 0, 0.92, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -wallOuter, -pondR, -pondR, pondR), 0, 0.92, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, pondR, wallOuter, -pondR, pondR), 0, 0.92, () => 'wall', 'roof', b.id);
  // 4 corner lotus pillar posts on the pond balustrade
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      B.solid(regPoly(localPt(ob, su * (pondR + 0.28), sv * (pondR + 0.28)), 0.45, 8), 0, 1.38, () => 'wall', 'metal', b.id);
    }
  }
  // Floating lotus leaves on Hồ Linh Chiểu
  if (level >= 1) {
    for (const [lu, lv, r] of [[-4.8, -4.2, 0.9], [5.1, -3.8, 0.85], [-4.5, 4.6, 0.95], [4.8, 4.4, 0.8], [-6.2, 0.5, 0.75], [6.0, -0.4, 0.8]] as const) {
      B.flat('grass', regPoly(localPt(ob, lu, lv), r, 8), 0.11, 'detail', b.id);
    }
  }

  // 2. Độc Trụ (Single central cylindrical stone pillar, diameter 1.25 m, rising from the lotus pond)
  B.solid(regPoly(ob.c, 1.35, 12), 0, 0.45, () => 'wall', 'walk', b.id);
  B.solid(regPoly(ob.c, 0.68, 12), 0.45, 4.15, () => 'wall', 'roof', b.id);

  // 3. Hệ con sơn gỗ đỡ đài sen (8 radiating diagonal timber bracket struts from the pillar to the shrine deck)
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pIn = localPt(ob, ca * 0.62, sa * 0.62);
    const pOut = localPt(ob, ca * 2.55, sa * 2.55);
    B.line(V(pIn[0], pIn[1], 1.85), V(pOut[0], pOut[1], 4.05), 'crease');
    B.line(V(pIn[0], pIn[1], 2.55), V(pOut[0], pOut[1], 4.05), 'crease');
    const perpU = -sa * 0.14, perpV = ca * 0.14;
    const beamRing: Vec2[] = [
      localPt(ob, ca * 0.58 - perpU, sa * 0.58 - perpV),
      localPt(ob, ca * 2.65 - perpU, sa * 2.65 - perpV),
      localPt(ob, ca * 2.65 + perpU, sa * 2.65 + perpV),
      localPt(ob, ca * 0.58 + perpU, sa * 0.58 + perpV),
    ];
    B.solid(beamRing, 3.72, 4.05, () => 'roof', 'roof', b.id);
  }

  // 4. Liên Hoa Đài (Square wooden lotus platform, carved wooden railings & inner sanctuary chamber)
  const deckR = 2.85;
  B.solid(localRect(ob, -deckR, deckR, -deckR, deckR), 4.0, 4.35, () => 'wall', 'walk', b.id);
  // Carved wooden perimeter lotus-petal balustrade (lan can gỗ cánh sen)
  const railW = 0.16;
  B.solid(localRect(ob, -deckR, deckR, -deckR, -deckR + railW), 4.35, 5.05, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -deckR, deckR, deckR - railW, deckR), 4.35, 5.05, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -deckR, -deckR + railW, -deckR, deckR), 4.35, 5.05, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, deckR - railW, deckR, -0.85, deckR), 4.35, 5.05, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, deckR - railW, deckR, -deckR, -2.1), 4.35, 5.05, () => 'metal', 'metal', b.id);

  // Inner wooden shrine chamber (z = 4.35 .. 6.45 m)
  const chR = 2.15;
  const chamberRing = localRect(ob, -chR, chR, -chR, chR);
  B.solid(chamberRing, 4.35, 6.45, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, chamberRing, 4.65, 6.05, lamp1, 1.6);
    addBandWindows(B, chamberRing, 6.08, 6.38, lamp2, 1.6);
  }

  // 5. Mái đao cong 4 mái & Lưỡng long chầu nguyệt trên đỉnh Liên Hoa Đài
  drawTraditionalCurvedRoof(B, ob, chR + 0.45, chR + 0.45, 6.38, 2.05, b.id, true);

  // 6. Cầu thang gạch (13 bậc tam cấp có tường lan can rồng mây bắc qua Hồ Linh Chiểu lên Liên Hoa Đài)
  const stSteps = 8;
  const uStart = pondR + 1.4, uEnd = deckR;
  for (let s = 0; s < stSteps; s++) {
    const t0 = s / stSteps, t1 = (s + 1) / stSteps;
    const u0 = uStart + (uEnd - uStart) * t0;
    const u1 = uStart + (uEnd - uStart) * t1;
    const z1 = 0.25 + 3.95 * t1;
    B.solid(localRect(ob, u1, u0, -0.82, 0.82), 0, z1, () => 'wall', 'walk', b.id);
    // Stair cheek balustrades
    B.solid(localRect(ob, u1, u0, -1.02, -0.82), 0, z1 + 0.55, () => 'wall', 'roof', b.id);
    B.solid(localRect(ob, u1, u0, 0.82, 1.02), 0, z1 + 0.55, () => 'wall', 'roof', b.id);
  }
}

// ============================================================================
// 2. NHÀ SÀN BÁC HỒ (Khu Di tích Chủ tịch Hồ Chí Minh tại Phủ Chủ tịch)
// ============================================================================
function drawNhaSanBacHo(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(5.2, ob.hw), hd = Math.max(3.6, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Nền gạch đỏ quanh chân nhà sàn & hàng rào dâm bụt xanh
  B.solid(localRect(ob, -hw - 1.2, hw + 1.2, -hd - 1.2, hd + 1.2), 0, 0.24, () => 'wall', 'walk', b.id);

  // 2. Hệ 12 cột gỗ tròn nâng sàn tầng 2 (tầng 1 để thoáng từ z = 0.24 .. 2.95 m)
  const colUs = [-hw * 0.82, -hw * 0.49, -hw * 0.16, hw * 0.16, hw * 0.49, hw * 0.82];
  const colVs = [-hd * 0.72, 0, hd * 0.72];
  for (const cu of colUs) {
    for (const cv of colVs) {
      B.solid(regPoly(localPt(ob, cu, cv), 0.22, 8), 0.24, 2.98, () => 'wall', 'roof', b.id);
    }
  }

  // 3. Không gian làm việc & tiếp khách tầng 1 (bàn gỗ dài ở giữa và ghế xung quanh)
  B.solid(localRect(ob, -2.4, 2.4, -0.85, 0.85), 0.24, 0.98, () => 'roof', 'roof', b.id);
  for (const sv of [-1.35, 1.35] as const) {
    B.solid(localRect(ob, -2.2, 2.2, sv - 0.22, sv + 0.22), 0.24, 0.65, () => 'wall', 'walk', b.id);
  }
  // Cầu thang gỗ dẫn lên tầng 2 nhà sàn
  for (let s = 0; s < 6; s++) {
    const t0 = s / 6, t1 = (s + 1) / 6;
    const u0 = hw * 0.84 + 1.8 * (1 - t0), u1 = hw * 0.84 + 1.8 * (1 - t1);
    B.solid(localRect(ob, u1, u0, -0.7, 0.7), 0.24 + t0 * 2.4, 0.24 + t1 * 2.75, () => 'roof', 'walk', b.id);
  }

  // 4. Sàn gỗ tầng 2, hành lang bao quanh & 2 phòng làm việc – nghỉ của Bác (z = 2.95 .. 5.65 m)
  B.solid(localRect(ob, -hw, hw, -hd, hd), 2.95, 3.25, () => 'roof', 'walk', b.id);
  // Lan can gỗ hành lang tầng 2
  const rw = 0.14;
  B.solid(localRect(ob, -hw, hw, -hd, -hd + rw), 3.25, 4.05, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -hw, hw, hd - rw, hd), 3.25, 4.05, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -hw, -hw + rw, -hd, hd), 3.25, 4.05, () => 'roof', 'roof', b.id);
  // Khối 2 phòng gỗ tầng 2 (phòng ngủ & phòng làm việc)
  const roomRing = localRect(ob, -hw * 0.76, hw * 0.76, -hd * 0.68, hd * 0.68);
  B.solid(roomRing, 3.25, 5.65, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, roomRing, 3.65, 5.15, lamp2, 2.1);
    // Warm light strip under the ground-floor ceiling
    addBandWindows(B, localRect(ob, -1.8, 1.8, -0.6, 0.6), 2.55, 2.88, lamp1, 1.8);
  }

  // 5. Mái ngói đỏ 4 mái dốc truyền thống trên Nhà sàn Bác Hồ (z = 5.55 .. 7.85 m)
  drawTraditionalCurvedRoof(B, ob, hw + 0.35, hd + 0.35, 5.55, 2.25, b.id, false);
}

// ============================================================================
// 3. KHUÊ VĂN CÁC, GIẾNG THIÊN QUANG & VƯỜN BIA TIẾN SĨ (Biểu tượng Thủ đô Hà Nội)
// ============================================================================
/** Detailed 8-roof chồng diêm roof tier for Khuê Văn Các with tubular tile ribs (ngói ống),
    sweeping upturned dragon-tail corner eaves (đầu đao cong vút), and Lưỡng long chầu nguyệt crown */
function drawKhueVanCacRoofTier(
  B: Batch,
  ob: OrientedBox,
  hw: number,
  hd: number,
  zBase: number,
  roofH: number,
  ownerId: string,
  isUpperTier: boolean,
  level: Detail,
) {
  const eaveW = hw + (isUpperTier ? 1.05 : 1.35);
  const eaveD = hd + (isUpperTier ? 1.05 : 1.35);
  const midW = hw * 0.88, midD = hd * 0.88;
  const topW = isUpperTier ? hw * 0.58 : hw * 0.72;
  const topD = isUpperTier ? hd * 0.36 : hd * 0.72;

  // 1. Wide overhanging curved eave skirt (diềm mái ngói ống & ngói chiếu đua rộng)
  B.solid(localRect(ob, -eaveW, eaveW, -eaveD, eaveD), zBase, zBase + roofH * 0.24, () => 'roof', 'roof', ownerId);
  // 2. Concave middle hipped slope
  B.solid(localRect(ob, -midW, midW, -midD, midD), zBase + roofH * 0.24, zBase + roofH * 0.58, () => 'roof', 'roof', ownerId);
  // 3. Upper steep slope tier
  B.solid(localRect(ob, -topW, topW, -topD, topD), zBase + roofH * 0.58, zBase + roofH * 0.88, () => 'roof', 'roof', ownerId);

  // 4. Tubular tile rib lines (hàng ngói ống chạy dọc 4 mặt mái) & hip ridges (4 bờ chảy)
  if (level >= 1) {
    const ribCount = isUpperTier ? 7 : 9;
    for (let k = -ribCount; k <= ribCount; k++) {
      const t = k / ribCount;
      for (const sv of [-1, 1] as const) {
        const pEave = localPt(ob, t * (eaveW * 0.86), sv * eaveD);
        const pTop = localPt(ob, t * (topW * 0.86), sv * topD);
        B.line(V(pEave[0], pEave[1], zBase + roofH * 0.22), V(pTop[0], pTop[1], zBase + roofH * 0.86), 'crease');
      }
      for (const su of [-1, 1] as const) {
        const pEave = localPt(ob, su * eaveW, t * (eaveD * 0.86));
        const pTop = localPt(ob, su * topW, t * (topD * 0.86));
        B.line(V(pEave[0], pEave[1], zBase + roofH * 0.22), V(pTop[0], pTop[1], zBase + roofH * 0.86), 'crease');
      }
    }
  }

  // 5. Four sculpted upturned corner dragon-tail eaves (4 đầu đao cong vút ở 4 góc mái)
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const pTopCorner = localPt(ob, su * topW, sv * topD);
      const pEaveCorner = localPt(ob, su * eaveW, sv * eaveD);
      const pDragonMid = localPt(ob, su * (eaveW + 0.55), sv * (eaveD + 0.55));
      const pDragonTip = localPt(ob, su * (eaveW + 1.02), sv * (eaveD + 1.02));
      // Hip ridge beam (bờ chảy đắp nổi)
      B.line(V(pTopCorner[0], pTopCorner[1], zBase + roofH * 0.88), V(pEaveCorner[0], pEaveCorner[1], zBase + roofH * 0.24), 'crease');
      B.line(V(pEaveCorner[0], pEaveCorner[1], zBase + roofH * 0.24), V(pDragonMid[0], pDragonMid[1], zBase + roofH * 0.48), 'crease');
      B.line(V(pDragonMid[0], pDragonMid[1], zBase + roofH * 0.48), V(pDragonTip[0], pDragonTip[1], zBase + roofH * 0.86), 'crease');
      // Sculpted upturned terracotta/gilded dragon-tail eave tip (đầu đao chạm vân mây / đuôi rồng)
      B.solid(regPoly(pDragonMid, 0.24, 6), zBase + roofH * 0.2, zBase + roofH * 0.52, () => 'roof', 'roof', ownerId);
      B.solid(regPoly(pDragonTip, 0.2, 6), zBase + roofH * 0.44, zBase + roofH * 0.88, () => 'metal', 'metal', ownerId);
    }
  }

  // 6. Top ridge beam (bờ nóc) & Lưỡng long chầu nguyệt on the upper roof tier
  if (isUpperTier) {
    const ridgeW = Math.max(1.1, hw * 0.62);
    const ridgeD = 0.28;
    const zRidge0 = zBase + roofH * 0.86;
    const zRidge1 = zBase + roofH + 0.36;
    // Stepped open-work terracotta ridge beam (bờ nóc xây gạch hoa chanh)
    B.solid(localRect(ob, -ridgeW, ridgeW, -ridgeD, ridgeD), zRidge0, zRidge1, () => 'wall', 'roof', ownerId);
    B.solid(localRect(ob, -ridgeW * 1.04, ridgeW * 1.04, -ridgeD * 1.15, ridgeD * 1.15), zRidge1, zRidge1 + 0.14, () => 'metal', 'metal', ownerId);
    // Central flaming lunar pearl (Mặt nguyệt tỏa hào quang ở chính giữa bờ nóc)
    B.solid(localRect(ob, -0.36, 0.36, -0.18, 0.18), zRidge1 + 0.14, zRidge1 + 0.42, () => 'metal', 'metal', ownerId);
    B.solid(regPoly(ob.c, 0.42, 12), zRidge1 + 0.38, zRidge1 + 1.05, () => 'metal', 'metal', ownerId);
    // Flanking twin dragons (Lưỡng long chầu nguyệt) & ridge end finials (kìm nóc)
    for (const su of [-1, 1] as const) {
      // Dragon body curving toward the central pearl
      B.solid(
        localRect(ob, su * 0.52, su * (ridgeW * 0.72), -0.18, 0.18),
        zRidge1 + 0.14,
        zRidge1 + 0.56,
        () => 'metal',
        'metal',
        ownerId,
      );
      // Upturned dragon tail / kìm nóc at each end of the ridge beam
      B.solid(
        localRect(ob, su * (ridgeW - 0.24), su * (ridgeW + 0.22), -0.24, 0.24),
        zRidge1 + 0.14,
        zRidge1 + 0.88,
        () => 'metal',
        'metal',
        ownerId,
      );
    }
  }
}

function drawKhueVanCac(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(3.6, ob.hw), hd = Math.max(3.6, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Nền đài vuông lát gạch Bát Tràng & bó vỉa đá xanh chạm sập (z = 0 .. 0.88 m)
  const baseOuterW = hw + 1.45, baseOuterD = hd + 1.45;
  const baseInnerW = hw + 0.72, baseInnerD = hd + 0.72;
  B.solid(localRect(ob, -baseOuterW, baseOuterW, -baseOuterD, baseOuterD), 0, 0.42, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -baseInnerW, baseInnerW, -baseInnerD, baseInnerD), 0.42, 0.84, () => 'wall', 'walk', b.id);
  // Warm Bát Tràng red-brick floor surface on the upper terrace + stone curb molding
  B.flat('roof', localRect(ob, -baseInnerW + 0.18, baseInnerW - 0.18, -baseInnerD + 0.18, baseInnerD - 0.18), 0.86, 'detail', b.id);
  // Central 3-step stone stairs (Bậc tam cấp đá xanh chạm mây) on front and back faces
  for (const sv of [-1, 1] as const) {
    for (let st = 0; st < 3; st++) {
      const v0 = sv * (baseInnerD + st * 0.28);
      const v1 = sv * (baseInnerD + (st + 1) * 0.28);
      const vMin = Math.min(v0, v1), vMax = Math.max(v0, v1);
      B.solid(localRect(ob, -1.15, 1.15, vMin, vMax), 0, 0.84 - st * 0.24, () => 'wall', 'walk', b.id);
    }
  }

  // 2. Bốn trụ biểu vuông bằng đá chạm trổ tứ linh ở tầng dưới (z = 0.84 .. 3.78 m)
  const pOffU = hw * 0.72, pOffV = hd * 0.72, pHalf = 0.56;
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const pu = su * pOffU, pv = sv * pOffV;
      // Stepped carved stone pedestal base (Chân tảng đá cổ bồng)
      B.solid(localRect(ob, pu - pHalf - 0.18, pu + pHalf + 0.18, pv - pHalf - 0.18, pv + pHalf + 0.18), 0.84, 1.12, () => 'wall', 'walk', b.id);
      B.solid(localRect(ob, pu - pHalf - 0.08, pu + pHalf + 0.08, pv - pHalf - 0.08, pv + pHalf + 0.08), 1.12, 1.32, () => 'metal', 'walk', b.id);
      // Square stone pillar shaft (Thân trụ đá vuông chạm nổi hoa văn)
      const pillarRing = localRect(ob, pu - pHalf, pu + pHalf, pv - pHalf, pv + pHalf);
      B.solid(pillarRing, 1.32, 3.52, () => 'wall', 'roof', b.id);
      // Stone capital molding (Đầu trụ đá đỡ hệ xà gỗ)
      B.solid(localRect(ob, pu - pHalf - 0.1, pu + pHalf + 0.1, pv - pHalf - 0.1, pv + pHalf + 0.1), 3.52, 3.78, () => 'metal', 'roof', b.id);
      // Recessed vertical carved relief panel lines on all 4 faces of each stone pillar
      if (level >= 1) {
        for (let side = 0; side < 4; side++) {
          const a = pillarRing[side]!, c = pillarRing[(side + 1) % 4]!;
          const p0: Vec2 = [a[0] * 0.75 + c[0] * 0.25, a[1] * 0.75 + c[1] * 0.25];
          const p1: Vec2 = [a[0] * 0.25 + c[0] * 0.75, a[1] * 0.25 + c[1] * 0.75];
          B.loop([V(p0[0], p0[1], 1.52), V(p1[0], p1[1], 1.52), V(p1[0], p1[1], 3.36), V(p0[0], p0[1], 3.36)], 'crease');
        }
      }
    }
  }
  // Red-lacquered wooden tie-beams & carved spandrel brackets (Hệ xà nách, kẻ bẩy gỗ sơn đỏ dưới gầm sàn)
  for (const s of [-1, 1] as const) {
    B.solid(localRect(ob, -pOffU, pOffU, s * pOffV - 0.22, s * pOffV + 0.22), 3.32, 3.78, () => 'roof', 'roof', b.id);
    B.solid(localRect(ob, s * pOffU - 0.22, s * pOffU + 0.22, -pOffV, pOffV), 3.32, 3.78, () => 'roof', 'roof', b.id);
  }

  // 3. Diềm sàn gỗ chạm nổi & Lan can gỗ con tiện 4 mặt lầu Khuê Văn Các (z = 3.78 .. 4.92 m)
  const deckW = hw + 0.42, deckD = hd + 0.42;
  // Projecting wooden floor deck & gold-trimmed carved fascia frieze (Diềm sàn gỗ chạm hoa văn)
  B.solid(localRect(ob, -deckW, deckW, -deckD, deckD), 3.78, 4.14, () => 'roof', 'walk', b.id);
  B.solid(localRect(ob, -deckW - 0.06, deckW + 0.06, -deckD - 0.06, deckD + 0.06), 3.92, 4.08, () => 'metal', 'metal', b.id);

  // Perimeter wooden balustrade (Lan can gỗ con tiện 4 mặt): lower carved rail, vertical spindles, top handrail & lotus-bud posts
  const rOutU = hw + 0.3, rOutV = hd + 0.3, rw = 0.14;
  // Lower solid rail panel (Ván bưng chân lan can)
  B.solid(localRect(ob, -rOutU, rOutU, -rOutV, -rOutV + rw), 4.14, 4.38, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -rOutU, rOutU, rOutV - rw, rOutV), 4.14, 4.38, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -rOutU, -rOutU + rw, -rOutV, rOutV), 4.14, 4.38, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, rOutU - rw, rOutU, -rOutV, rOutV), 4.14, 4.38, () => 'roof', 'roof', b.id);
  // Top wooden handrail (Tay vịn lan can gỗ)
  B.solid(localRect(ob, -rOutU - 0.04, rOutU + 0.04, -rOutV - 0.02, -rOutV + rw + 0.02), 4.74, 4.88, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -rOutU - 0.04, rOutU + 0.04, rOutV - rw - 0.02, rOutV + 0.02), 4.74, 4.88, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -rOutU - 0.02, -rOutU + rw + 0.02, -rOutV - 0.04, rOutV + 0.04), 4.74, 4.88, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, rOutU - rw - 0.02, rOutU + 0.02, -rOutV - 0.04, rOutV + 0.04), 4.74, 4.88, () => 'metal', 'metal', b.id);
  // Balustrade corner & intermediate posts with lotus-bud finials (Trụ lan can đầu búp sen & hàng con tiện gỗ)
  const postSteps = [-1, -0.35, 0.35, 1] as const;
  for (const su of postSteps) {
    for (const sv of [-1, 1] as const) {
      const pPost = localPt(ob, su * (rOutU - rw * 0.5), sv * (rOutV - rw * 0.5));
      B.solid(regPoly(pPost, 0.12, 6), 4.14, 5.04, () => 'metal', 'metal', b.id);
    }
  }
  for (const sv of [-0.35, 0.35] as const) {
    for (const su of [-1, 1] as const) {
      const pPost = localPt(ob, su * (rOutU - rw * 0.5), sv * (rOutV - rw * 0.5));
      B.solid(regPoly(pPost, 0.12, 6), 4.14, 5.04, () => 'metal', 'metal', b.id);
    }
  }
  if (level >= 1) {
    const spindleN = 12;
    for (let k = -spindleN; k <= spindleN; k++) {
      const t = (k / spindleN) * (rOutU - 0.22);
      for (const sv of [-1, 1] as const) {
        const sp = localPt(ob, t, sv * (rOutV - rw * 0.5));
        B.line(V(sp[0], sp[1], 4.38), V(sp[0], sp[1], 4.74), 'crease');
      }
      for (const su of [-1, 1] as const) {
        const sp = localPt(ob, su * (rOutU - rw * 0.5), t);
        B.line(V(sp[0], sp[1], 4.38), V(sp[0], sp[1], 4.74), 'crease');
      }
    }
  }

  // 4. Thân lầu gỗ tầng trên sơn son thếp vàng & Cửa sổ tròn Sao Khuê 8 đôi tia sáng (z = 4.14 .. 6.42 m)
  const pavU = hw * 0.78, pavV = hd * 0.78;
  const pavRing = localRect(ob, -pavU, pavU, -pavV, pavV);
  // Rich vermilion-red wooden pavilion body
  B.solid(pavRing, 4.14, 6.42, () => 'roof', 'roof', b.id);
  // 4 corner wooden pilasters & stepped timber corbel brackets (Hệ con sơn chồng rường đỡ mái ở 4 góc lầu)
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      B.solid(localRect(ob, su * pavU - 0.18, su * pavU + 0.18, sv * pavV - 0.18, sv * pavV + 0.18), 4.14, 6.42, () => 'metal', 'metal', b.id);
      // Corbel bracket arm projecting diagonally under the lower roof eave
      B.solid(localRect(ob, su * pavU - 0.28, su * (pavU + 0.42), sv * pavV - 0.28, sv * (pavV + 0.42)), 5.95, 6.38, () => 'metal', 'metal', b.id);
    }
  }
  // Suspended ceremonial lantern / gilded bell hanging in the center of the upper pavilion (visible through the circular windows)
  B.solid(regPoly(ob.c, 0.36, 8), 5.02, 5.68, () => 'metal', 'metal', b.id);

  // Ornate "Sao Khuê" circular window with double concentric rings, 8 pairs of radiating sunbeams,
  // horizontal lacquered plaque (Hoành phi "Khuê Văn Các") and vertical parallel couplets (Đối liên) on all 4 faces!
  const zSun = 5.26;
  const rOuter = 0.88;
  const rInner = 0.74;
  const frameHalfW = Math.min(1.42, pavU * 0.56);
  const frameZ0 = 4.32, frameZ1 = 6.2;

  for (let side = 0; side < 4; side++) {
    const pA = pavRing[side]!, pB = pavRing[(side + 1) % 4]!;
    const L = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) || 1;
    const tx = (pB[0] - pA[0]) / L, ty = (pB[1] - pA[1]) / L;
    const nx = ty, ny = -tx;
    const cx = (pA[0] + pB[0]) / 2, cy = (pA[1] + pB[1]) / 2;
    const nrm = new THREE.Vector3(nx, 0, ny);
    const facePt = (du: number, dz: number, out = 0.06) =>
      V(cx + tx * du + nx * out, cy + ty * du + ny * out, dz);

    // Outer square wooden window frame & flanking vertical couplet panels (Đôi câu đối dọc sơn son thếp vàng)
    B.loop(
      [
        facePt(-frameHalfW, frameZ0),
        facePt(frameHalfW, frameZ0),
        facePt(frameHalfW, frameZ1),
        facePt(-frameHalfW, frameZ1),
      ],
      'crease',
    );
    // Horizontal lacquered plaque above the window (Bức hoành phi "Khuê Văn Các" phía trên cửa tròn)
    const plaquePts: Vec2[] = [
      [cx - tx * 1.05 + nx * 0.04, cy - ty * 1.05 + ny * 0.04],
      [cx + tx * 1.05 + nx * 0.04, cy + ty * 1.05 + ny * 0.04],
      [cx + tx * 1.05 + nx * 0.14, cy + ty * 1.05 + ny * 0.14],
      [cx - tx * 1.05 + nx * 0.14, cy - ty * 1.05 + ny * 0.14],
    ];
    B.solid(plaquePts, 6.04, 6.34, () => 'metal', 'metal', b.id);
    // Vertical couplet boards (Đối liên) on left & right of the Sao Khuê window
    for (const sSide of [-1, 1] as const) {
      const uBoard = sSide * (frameHalfW + 0.28);
      const boardPts: Vec2[] = [
        [cx + tx * (uBoard - 0.12) + nx * 0.03, cy + ty * (uBoard - 0.12) + ny * 0.03],
        [cx + tx * (uBoard + 0.12) + nx * 0.03, cy + ty * (uBoard + 0.12) + ny * 0.03],
        [cx + tx * (uBoard + 0.12) + nx * 0.11, cy + ty * (uBoard + 0.12) + ny * 0.11],
        [cx + tx * (uBoard - 0.12) + nx * 0.11, cy + ty * (uBoard - 0.12) + ny * 0.11],
      ];
      B.solid(boardPts, 4.38, 6.02, () => 'metal', 'metal', b.id);
    }

    // Glowing octagonal-rounded window aperture inside the Sao Khuê ring
    const winR = rInner * 0.74;
    B.window(
      lamp2,
      [
        facePt(-winR, zSun - winR, 0.08),
        facePt(winR, zSun - winR, 0.08),
        facePt(winR, zSun + winR, 0.08),
        facePt(-winR, zSun + winR, 0.08),
      ],
      nrm,
    );

    // Double concentric circular Sao Khuê rings (2 vòng tròn đồng tâm chạm hoa văn)
    const segs = 20;
    const outerCircle = Array.from({ length: segs }, (_, k) => {
      const a = (k * 2 * Math.PI) / segs;
      return facePt(Math.cos(a) * rOuter, zSun + Math.sin(a) * rOuter, 0.09);
    });
    const innerCircle = Array.from({ length: segs }, (_, k) => {
      const a = (k * 2 * Math.PI) / segs;
      return facePt(Math.cos(a) * rInner, zSun + Math.sin(a) * rInner, 0.09);
    });
    B.loop(outerCircle, 'crease');
    B.loop(innerCircle, 'crease');

    // 8 pairs of radiating carved sunbeams (8 đôi tia sáng kép nối từ vòng tròn Sao Khuê ra khung vuông)
    for (let ray = 0; ray < 8; ray++) {
      const baseAng = (ray * Math.PI) / 4;
      const ca = Math.cos(baseAng), sa = Math.sin(baseAng);
      // Ray distance to the outer square window frame
      const maxAbs = Math.max(Math.abs(ca), Math.abs(sa)) || 1;
      const rFrame = Math.min(frameHalfW, (frameZ1 - frameZ0) * 0.5) / maxAbs;
      for (const dAng of [-0.055, 0.055] as const) {
        const a1 = baseAng + dAng;
        const pStart = facePt(Math.cos(a1) * rOuter, zSun + Math.sin(a1) * rOuter, 0.09);
        const pEnd = facePt(
          Math.max(-frameHalfW, Math.min(frameHalfW, Math.cos(a1) * rFrame)),
          Math.max(frameZ0, Math.min(frameZ1, zSun + Math.sin(a1) * rFrame)),
          0.09,
        );
        B.line(pStart, pEnd, 'crease');
      }
    }
  }
  if (level >= 1) {
    addBandWindows(B, localRect(ob, -1.2, 1.2, -1.2, 1.2), 3.38, 3.74, lamp1, 1.5);
  }

  // 5. Hệ mái chồng diêm 2 tầng 8 mái ngói ống & Lưỡng long chầu nguyệt trên đỉnh (z = 6.28 .. 10.65 m)
  // Tầng mái dưới (4 mái đao cong đua rộng)
  drawKhueVanCacRoofTier(B, ob, hw + 0.48, hd + 0.48, 6.28, 1.56, b.id, false, level);
  // Cổ diềm giữa 2 tầng mái (chạm ô hộc sơn son thếp vàng)
  const collarW = hw * 0.68, collarD = hd * 0.68;
  B.solid(localRect(ob, -collarW, collarW, -collarD, collarD), 7.68, 8.26, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -collarW - 0.05, collarW + 0.05, -collarD - 0.05, collarD + 0.05), 7.92, 8.08, () => 'metal', 'metal', b.id);
  // Tầng mái trên (4 mái đao cong + bờ nóc Lưỡng long chầu nguyệt)
  drawKhueVanCacRoofTier(B, ob, hw * 0.74, hd * 0.74, 8.22, 1.62, b.id, true, level);

  // 6. Hai khu Vườn Bia Tiến Sĩ (82 Bia Tiến sĩ đặt trên lưng rùa đá dưới nhà bia hai bên Giếng Thiên Quang)
  if (level >= 1) {
    for (const sideV of [-1, 1] as const) {
      const vCenter = sideV * 18.5;
      // Stepped stone foundation for the Doctor Stelae Pavilion
      B.solid(localRect(ob, 6.5, 24.5, vCenter - 4.2, vCenter + 4.2), 0, 0.35, () => 'wall', 'walk', b.id);
      // 2 rows of 6 stone turtles carrying upright stone stelae (Rùa đá đội Bia Tiến Sĩ)
      for (let col = 0; col < 6; col++) {
        const su = 8.2 + col * 2.9;
        for (const rowOff of [-1.8, 1.8] as const) {
          const sv = vCenter + rowOff;
          // Stone turtle body (Rùa đá)
          B.solid(localRect(ob, su - 0.55, su + 0.55, sv - 0.42, sv + 0.42), 0.35, 0.78, () => 'wall', 'roof', b.id);
          // Stone turtle head facing inward
          B.solid(regPoly(localPt(ob, su, sv - Math.sign(sideV) * 0.58), 0.22, 6), 0.42, 0.72, () => 'wall', 'roof', b.id);
          // Upright Doctor Stele slab with arched top (Bia đá Tiến sĩ)
          B.solid(localRect(ob, su - 0.42, su + 0.42, sv - 0.12, sv + 0.12), 0.78, 2.35, () => 'wall', 'metal', b.id);
        }
      }
      // Protective tiled stelae pavilion roof overhead
      const stelaeOb: OrientedBox = { c: localPt(ob, 15.5, vCenter), u: ob.u, v: ob.v, hw: 9.2, hd: 4.2 };
      drawTraditionalCurvedRoof(B, stelaeOb, 9.2, 4.2, 3.1, 1.55, b.id, false);
      for (const cu of [7.2, 15.5, 23.8] as const) {
        for (const cv of [vCenter - 3.6, vCenter + 3.6] as const) {
          B.solid(regPoly(localPt(ob, cu, cv), 0.22, 8), 0.35, 3.15, () => 'wall', 'roof', b.id);
        }
      }
    }
  }
}

// ============================================================================
// 4. VĂN MIẾU MÔN & TỨ TRỤ (Cổng Tam Quan Văn Miếu – Quốc Tử Giám)
// ============================================================================
function drawVanMieuMon(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(4.6, ob.hw), hd = Math.max(3.2, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Bậc tam cấp đá xanh trước cổng Văn Miếu Môn
  B.solid(localRect(ob, -hw - 1.5, hw + 1.5, -hd - 1.5, hd + 1.5), 0, 0.42, () => 'wall', 'walk', b.id);

  // 2. Thân cổng Tam Quan tầng 1 (với 3 vòm cổng: cổng chính ở giữa và 2 cổng tả/hữu)
  for (const [u0, u1] of [[-hw, -hw * 0.58], [-hw * 0.28, -hw * 0.16], [hw * 0.16, hw * 0.28], [hw * 0.58, hw]] as const) {
    B.solid(localRect(ob, u0, u1, -hd, hd), 0.42, 4.1, () => 'wall', 'roof', b.id);
  }
  // Lintel beam over all 3 arched doorways
  B.solid(localRect(ob, -hw, hw, -hd, hd), 3.35, 4.25, () => 'wall', 'roof', b.id);
  // Mái tầng 1 đua rộng hai bên tả/hữu
  drawTraditionalCurvedRoof(B, ob, hw + 0.5, hd + 0.4, 4.2, 1.45, b.id, true);

  // 3. Lầu vọng gác tầng 2 ở chính giữa Văn Miếu Môn (z = 5.4 .. 8.8 m)
  const upU = hw * 0.52, upV = hd * 0.72;
  const upRing = localRect(ob, -upU, upU, -upV, upV);
  B.solid(upRing, 5.35, 7.35, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, upRing, 5.7, 6.95, lamp2, 1.8);
    addBandWindows(B, localRect(ob, -hw * 0.5, hw * 0.5, -hd, hd), 3.45, 4.05, lamp1, 2.0);
  }
  drawTraditionalCurvedRoof(B, ob, upU + 0.5, upV + 0.45, 7.3, 1.65, b.id, true);

  // 4. Tứ Trụ (4 ceremonial stone/brick pillars with Nghê/Phoenix finials in front of Văn Miếu Môn)
  const pillarUs = [-hw * 1.45, -hw * 0.72, hw * 0.72, hw * 1.45];
  pillarUs.forEach((pu, idx) => {
    const isInner = idx === 1 || idx === 2;
    const pH = isInner ? 7.8 : 6.4;
    const pv = -hd - 3.6;
    B.solid(localRect(ob, pu - 0.55, pu + 0.55, pv - 0.55, pv + 0.55), 0, 1.2, () => 'wall', 'walk', b.id);
    B.solid(localRect(ob, pu - 0.36, pu + 0.36, pv - 0.36, pv + 0.36), 1.2, pH, () => 'wall', 'roof', b.id);
    // Lantern box & Nghê/Phoenix finial on top of each pillar
    B.solid(localRect(ob, pu - 0.48, pu + 0.48, pv - 0.48, pv + 0.48), pH, pH + 0.55, () => 'metal', 'metal', b.id);
    B.solid(regPoly(localPt(ob, pu, pv), 0.32, 8), pH + 0.55, pH + 1.35, () => 'metal', 'metal', b.id);
  });
}

// ============================================================================
// 5. ĐẠI TRUNG MÔN & ĐẠI THÀNH MÔN (Cổng 3 gian mái đao cong Văn Miếu)
// ============================================================================
function drawVanMieuGate(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(3.6, ob.hw), hd = Math.max(2.4, ob.hd);
  const lamp1 = floorId(b, 1);

  B.solid(localRect(ob, -hw - 0.8, hw + 0.8, -hd - 0.8, hd + 0.8), 0, 0.36, () => 'wall', 'walk', b.id);
  // Side brick piers + 4 central wooden columns
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * hw - 0.45, su * hw + 0.45, -hd, hd), 0.36, 3.85, () => 'wall', 'roof', b.id);
  }
  for (const cu of [-hw * 0.42, hw * 0.42] as const) {
    for (const cv of [-hd * 0.72, hd * 0.72] as const) {
      B.solid(regPoly(localPt(ob, cu, cv), 0.24, 8), 0.36, 3.85, () => 'wall', 'roof', b.id);
    }
  }
  const coreRing = localRect(ob, -hw * 0.88, hw * 0.88, -0.35, 0.35);
  B.solid(coreRing, 0.36, 3.85, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, coreRing, 2.8, 3.65, lamp1, 1.8);
  drawTraditionalCurvedRoof(B, ob, hw + 0.45, hd + 0.45, 3.8, 1.75, b.id, true);
}

// ============================================================================
// 6. ĐIỆN ĐẠI THÀNH – ĐẠI BÁI ĐƯỜNG, THƯỢNG ĐIỆN & ĐÔNG/TÂY VU (Văn Miếu)
// ============================================================================
function drawVanMieuHall(B: Batch, b: Building, level: Detail) {
  const lamp1 = floorId(b, 1);
  for (const part of b.parts) {
    const ob = orientedBoxOf(part.footprint, 0);
    const h = partTop(part);
    const wallH = Math.max(3.2, h * 0.62);
    const roofH = Math.max(1.8, h * 0.42);
    const isMainHall = h >= 6.0;

    // Stepped stone foundation (nền đá xanh bậc tam cấp)
    B.solid(scaleRing(part.footprint, ob.c, 1.08), 0, 0.48, () => 'wall', 'walk', b.id);
    // Recessed wooden hall wall & perimeter colonnade pillars
    const innerRing = scaleRing(part.footprint, ob.c, 0.86);
    B.solid(innerRing, 0.48, wallH, () => 'wall', 'roof', b.id);
    if (level >= 1) addBandWindows(B, innerRing, 1.3, wallH - 0.45, lamp1, 2.4);

    // Perimeter wooden columns around the veranda
    for (let i = 0; i < 6; i++) {
      const uPos = -ob.hw * 0.88 + (i * (ob.hw * 1.76)) / 5;
      for (const sv of [-1, 1] as const) {
        B.solid(regPoly(localPt(ob, uPos, sv * ob.hd * 0.92), 0.24, 8), 0.48, wallH, () => 'wall', 'roof', b.id);
      }
    }
    // Sweeping curved traditional tiled roof
    drawTraditionalCurvedRoof(B, ob, ob.hw, ob.hd, wallH - 0.1, roofH, b.id, isMainHall);
  }
}

// ============================================================================
// 7. NHÀ THÁI HỌC – ĐỀN KHẢI THÁNH, LẦU TRỐNG & LẦU CHUÔNG (Quốc Tử Giám)
// ============================================================================
function drawNhaThaiHoc(B: Batch, b: Building, level: Detail) {
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);
  for (const part of b.parts) {
    const ob = orientedBoxOf(part.footprint, 0);
    const areaM2 = Math.abs(ringArea(part.footprint));
    const isTwoStoreyMain = part.floors.length >= 2 && areaM2 > 220;
    const isBellOrDrumTower = part.floors.length >= 2 && areaM2 <= 120;

    if (isTwoStoreyMain) {
      // Hậu Đường Nhà Thái Học (2-storey grand imperial academy hall with double curved roofs)
      B.solid(scaleRing(part.footprint, ob.c, 1.08), 0, 0.65, () => 'wall', 'walk', b.id);
      const r1 = scaleRing(part.footprint, ob.c, 0.9);
      B.solid(r1, 0.65, 5.2, () => 'wall', 'roof', b.id);
      if (level >= 1) addBandWindows(B, r1, 1.5, 4.6, lamp1, 2.5);
      // Lower curved roof eave & 2nd floor wooden gallery
      drawTraditionalCurvedRoof(B, ob, ob.hw + 0.4, ob.hd + 0.4, 5.0, 1.85, b.id, true);
      const r2 = localRect(ob, -ob.hw * 0.78, ob.hw * 0.78, -ob.hd * 0.72, ob.hd * 0.72);
      B.solid(r2, 6.4, 9.6, () => 'wall', 'roof', b.id);
      if (level >= 1) addBandWindows(B, r2, 6.8, 9.1, lamp2, 2.4);
      // Upper grand curved roof with ridge ornaments
      drawTraditionalCurvedRoof(B, ob, ob.hw * 0.84, ob.hd * 0.78, 9.5, 2.35, b.id, true);
    } else if (isBellOrDrumTower) {
      // Lầu Trống (Drum Tower) & Lầu Chuông (Bell Tower): 2-storey open pavilion on 4 pillars
      B.solid(localRect(ob, -ob.hw - 0.6, ob.hw + 0.6, -ob.hd - 0.6, ob.hd + 0.6), 0, 0.55, () => 'wall', 'walk', b.id);
      for (const su of [-1, 1] as const) {
        for (const sv of [-1, 1] as const) {
          B.solid(regPoly(localPt(ob, su * ob.hw * 0.72, sv * ob.hd * 0.72), 0.34, 8), 0.55, 3.8, () => 'wall', 'roof', b.id);
        }
      }
      drawTraditionalCurvedRoof(B, ob, ob.hw + 0.35, ob.hd + 0.35, 3.7, 1.35, b.id, true);
      const upR = localRect(ob, -ob.hw * 0.72, ob.hw * 0.72, -ob.hd * 0.72, ob.hd * 0.72);
      B.solid(upR, 4.85, 6.85, () => 'wall', 'roof', b.id);
      // Suspended bronze bell / ceremonial drum inside the upper pavilion
      B.solid(regPoly(ob.c, 0.85, 10), 5.1, 6.4, () => 'metal', 'metal', b.id);
      if (level >= 1) addBandWindows(B, upR, 5.15, 6.5, lamp2, 1.6);
      drawTraditionalCurvedRoof(B, ob, ob.hw * 0.82, ob.hd * 0.82, 6.8, 1.55, b.id, true);
    } else {
      // Tiền Đường, Tả Vu, Hữu Vu & Cửa Thái Học (1-storey traditional curved-roof halls)
      const h = partTop(part);
      const wallH = Math.max(3.1, h * 0.65);
      B.solid(scaleRing(part.footprint, ob.c, 1.06), 0, 0.45, () => 'wall', 'walk', b.id);
      const r1 = scaleRing(part.footprint, ob.c, 0.88);
      B.solid(r1, 0.45, wallH, () => 'wall', 'roof', b.id);
      if (level >= 1) addBandWindows(B, r1, 1.2, wallH - 0.4, lamp1, 2.4);
      drawTraditionalCurvedRoof(B, ob, ob.hw, ob.hd, wallH - 0.1, Math.max(1.65, h * 0.4), b.id, true);
    }
  }
}

// ============================================================================
// 8. LĂNG CHỦ TỊCH HỒ CHÍ MINH (Quảng trường Ba Đình)
// ============================================================================
function drawHoChiMinhMausoleum(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const hw = ob.hw, hd = ob.hd;
  const lamp1 = floorId(b, 1), lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 1));

  // 1. Stepped red-brown granite base podium & ceremonial forecourt on Ba Đình Square
  B.solid(localRect(ob, -hw - 4.5, hw + 4.5, -hd - 4.5, hd + 4.5), 0, 0.55, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw - 2.2, hw + 2.2, -hd - 2.2, hd + 2.2), 0.55, 1.35, () => 'wall', 'walk', b.id);

  // Flanking ceremonial tribune grandstands (Khán đài hai bên cánh Bắc – Nam của Lăng)
  for (const su of [-1, 1] as const) {
    const gU0 = su * (hw + 1.5), gU1 = su * (hw + 16.5);
    const uMin = Math.min(gU0, gU1), uMax = Math.max(gU0, gU1);
    for (let step = 0; step < 4; step++) {
      const v0 = -hd * 0.75 + step * 2.2, v1 = hd * 0.75;
      B.solid(localRect(ob, uMin, uMax, v0, v1), step * 1.15, (step + 1) * 1.15, () => 'wall', 'walk', b.id);
    }
  }

  // 2. Recessed central granite sanctum chamber inside the 20 colonnade pillars (z = 9.4 .. 18.25 m)
  const sanctumRing = localRect(ob, -hw * 0.54, hw * 0.54, -hd * 0.54, hd * 0.54);
  B.solid(sanctumRing, 9.4, 18.25, () => 'wall', 'roof', b.id);

  // 3. Stepped upper granite cornice bands & front inscription frieze ("CHỦ TỊCH HỒ CHÍ MINH", z = 18.25 .. 21.8 m)
  B.solid(localRect(ob, -hw * 0.78, hw * 0.78, -hd * 0.78, hd * 0.78), 18.25, 19.8, () => 'metal', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.7, hw * 0.7, -hd * 0.7, hd * 0.7), 19.8, 20.9, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.62, hw * 0.62, -hd * 0.62, hd * 0.62), 20.9, 21.8, () => 'metal', 'roof', b.id);

  // 4. Grand front entrance portal facing Ba Đình Square + warm architectural colonnade lighting
  B.solid(localRect(ob, -5.8, 5.8, -hd - 2.6, -hd + 0.5), 1.35, 6.8, () => 'metal', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, sanctumRing, 10.6, 17.4, lamp1, 2.8);
    addBandWindows(B, localRect(ob, -hw * 0.72, hw * 0.72, -hd * 0.78, hd * 0.78), 18.55, 19.45, lampTop, 2.2);
    addBandWindows(B, localRect(ob, -3.6, 3.6, -hd - 2.65, -hd - 2.2), 1.6, 5.6, lamp1, 1.8);
  }

  // 5. Cột cờ Quảng trường Ba Đình (Ceremonial Flagpole in front of the Mausoleum; waving 3D flag added via landmarkFlagsOf)
  const flagPos = localPt(ob, 0, -hd - 20);
  // 3-tier octagonal granite & marble ceremonial pedestal (Đài kỳ đài Ba Đình)
  B.solid(regPoly(flagPos, 3.4, 8, Math.PI / 8), 0, 0.65, () => 'wall', 'walk', b.id);
  B.solid(regPoly(flagPos, 2.3, 8, Math.PI / 8), 0.65, 1.45, () => 'wall', 'walk', b.id);
  B.solid(regPoly(flagPos, 1.35, 8, Math.PI / 8), 1.45, 2.45, () => 'metal', 'metal', b.id);
  // 3-stage tapered stainless-steel flagpole mast (z = 2.45 .. 29.3 m)
  B.solid(regPoly(flagPos, 0.36, 8), 2.45, 11.5, () => 'metal', 'metal', b.id);
  B.solid(regPoly(flagPos, 0.26, 8), 11.5, 20.5, () => 'metal', 'metal', b.id);
  B.solid(regPoly(flagPos, 0.18, 8), 20.5, 29.3, () => 'metal', 'metal', b.id);
  B.line(V(flagPos[0], flagPos[1], 2.45), V(flagPos[0], flagPos[1], 29.5), 'crease');
}

// ============================================================================
// 9. CỘT CỜ HÀ NỘI – KỲ ĐÀI (28A Điện Biên Phủ)
// ============================================================================
function drawHanoiFlagTower(B: Batch, b: Building, level: Detail) {
  const tallest = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
  const tc = centroid(tallest.footprint);
  const topZ = Math.max(33.4, partTop(tallest));
  const lamp1 = floorId(b, 1), lampTop = floorId(b, Math.max(1, tallest.floors.length));

  // 1. Parapet battlements & arched entrance portals on the 3 stepped square brick terraces (z = 3.1, 6.8, 11.9 m)
  for (const part of b.parts) {
    const pz = partTop(part);
    const pc = centroid(part.footprint);
    if (pz <= 13.0) {
      B.solid(scaleRing(part.footprint, pc, 1.02), pz, pz + 0.65, () => 'metal', 'walk', b.id);
      if (level >= 1 && pz <= 8.0) {
        addBandWindows(B, scaleRing(part.footprint, pc, 1.01), pz - 2.6, pz - 0.5, lamp1, 6.5);
      }
    }
  }

  // 2. Octagonal brick shaft (z = 11.9 .. 30.1 m) & Octagonal Vọng Lâu watchtower pavilion (z = 30.1 .. 33.4 m)
  const shaftRing = regPoly(tc, 4.4, 8, Math.PI / 8);
  B.solid(shaftRing, 11.9, 30.1, () => 'wall', 'roof', b.id);
  const watchRing = regPoly(tc, 4.9, 8, Math.PI / 8);
  B.solid(regPoly(tc, 5.4, 8, Math.PI / 8), 29.8, 30.35, () => 'metal', 'walk', b.id);
  B.solid(watchRing, 30.35, 33.4, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, watchRing, 30.8, 32.8, lampTop, 1.6);
  }
  // Octagonal pyramidal tiled roof over Vọng Lâu (z = 33.4 .. 35.6 m)
  B.solid(regPoly(tc, 5.5, 8, Math.PI / 8), 33.4, 34.3, () => 'roof', 'roof', b.id);
  B.solid(regPoly(tc, 3.2, 8, Math.PI / 8), 34.3, 35.4, () => 'roof', 'roof', b.id);

  // 3. Tapered flagpole mast on top of Cột cờ Hà Nội (z = 35.4 .. 47.8 m; waving 3D flag added via landmarkFlagsOf)
  B.solid(regPoly(tc, 0.42, 8), topZ, topZ + 6.5, () => 'metal', 'metal', b.id);
  B.solid(regPoly(tc, 0.26, 8), topZ + 6.5, topZ + 12.5, () => 'metal', 'metal', b.id);
  B.line(V(tc[0], tc[1], topZ), V(tc[0], tc[1], topZ + 12.7), 'crease');
}

// ============================================================================
// 10. HOÀNG THÀNH THĂNG LONG – ĐOAN MÔN (5 cổng vòm cuốn đá & lầu Ngũ Môn)
// ============================================================================
function drawDoanMon(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = ob.hw, hd = Math.min(ob.hd, 14);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, Math.max(1, b.parts.length));

  // 1. Stone balustrade battlements along the 6 m citadel rampart deck
  B.solid(localRect(ob, -hw, hw, -hd, -hd + 0.65), 6.0, 6.85, () => 'wall', 'metal', b.id);
  B.solid(localRect(ob, -hw, hw, hd - 0.65, hd), 6.0, 6.85, () => 'wall', 'metal', b.id);

  // 2. Five arched stone gateways (5 cổng thành vòm cuốn đá xanh: 1 cổng ngự đạo chính giữa + 4 cổng phụ)
  const archOffsets = [-hw * 0.68, -hw * 0.36, 0, hw * 0.36, hw * 0.68];
  archOffsets.forEach((au, idx) => {
    const isRoyal = idx === 2;
    const aw = isRoyal ? 2.4 : 1.75;
    const ah = isRoyal ? 4.4 : 3.6;
    for (const sv of [-1, 1] as const) {
      const vFace = sv * (hd + 0.12);
      // Stone arch surround pilasters & keystone arch lintel
      B.solid(localRect(ob, au - aw - 0.45, au - aw, vFace - 0.35, vFace + 0.35), 0, ah, () => 'metal', 'metal', b.id);
      B.solid(localRect(ob, au + aw, au + aw + 0.45, vFace - 0.35, vFace + 0.35), 0, ah, () => 'metal', 'metal', b.id);
      B.solid(localRect(ob, au - aw - 0.5, au + aw + 0.5, vFace - 0.4, vFace + 0.4), ah, ah + 0.65, () => 'metal', 'metal', b.id);
      if (level >= 1) {
        const nrm = new THREE.Vector3(ob.v[0] * sv, 0, ob.v[1] * sv);
        const p0 = localPt(ob, au - aw * 0.85, vFace + sv * 0.15);
        const p1 = localPt(ob, au + aw * 0.85, vFace + sv * 0.15);
        B.window(lamp1, [V(p0[0], p0[1], 0.2), V(p1[0], p1[1], 0.2), V(p1[0], p1[1], ah - 0.15), V(p0[0], p0[1], ah - 0.15)], nrm);
      }
    }
  });

  // 3. Lầu Ngũ Môn (Upper 2-tiered curved roof pavilion over the central gate, z = 6.0 .. 15.2 m)
  const pavOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: 8.5, hd: 6.2 };
  const pavRing = localRect(pavOb, -8.2, 8.2, -5.8, 5.8);
  B.solid(pavRing, 6.0, 9.8, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, pavRing, 6.6, 9.1, lamp2, 2.2);
  drawTraditionalCurvedRoof(B, pavOb, 8.8, 6.4, 9.7, 2.2, b.id, true);
  B.solid(localRect(pavOb, -5.6, 5.6, -3.8, 3.8), 11.7, 13.1, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, pavOb, 6.2, 4.2, 13.0, 1.95, b.id, true);
}

// ============================================================================
// 11. NHÀ QUỐC HỘI VIỆT NAM ("Trời tròn – Đất vuông", Quảng trường Ba Đình)
// ============================================================================
function drawNationalAssembly(B: Batch, b: Building, level: Detail) {
  const ob = orientBoxTowardEast(orientedBoxOf(b.footprint, b.front));
  const top = Math.max(29.2, ...b.parts.map(partTop));
  const lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 5));

  // 1. Projecting square cornice & golden vertical colonnade fins around the "Đất vuông" base
  B.solid(scaleRing(b.footprint, ob.c, 1.03), 18.8, 19.9, () => 'metal', 'roof', b.id);
  B.solid(scaleRing(b.footprint, ob.c, 1.02), 28.5, 29.6, () => 'metal', 'roof', b.id);

  // 2. Central "Trời tròn" Circular Diên Hồng Dome & stepped circular drum on top (z = 29.2 .. 40.8 m)
  const drum1 = regPoly(ob.c, 26, 20);
  const drum2 = regPoly(ob.c, 21, 20);
  const dome1 = regPoly(ob.c, 16.5, 20);
  const dome2 = regPoly(ob.c, 11.0, 16);
  const dome3 = regPoly(ob.c, 5.6, 16);
  B.solid(drum1, 29.2, 33.2, () => 'glass', 'roof', b.id);
  B.solid(regPoly(ob.c, 26.8, 20), 33.2, 33.8, () => 'metal', 'metal', b.id);
  B.solid(drum2, 33.8, 36.6, () => 'glass', 'roof', b.id);
  B.solid(dome1, 36.6, 38.4, () => 'metal', 'roof', b.id);
  B.solid(dome2, 38.4, 39.8, () => 'metal', 'metal', b.id);
  B.solid(dome3, 39.8, 40.8, () => 'metal', 'metal', b.id);
  if (level >= 1) {
    addBandWindows(B, drum1, 29.8, 32.7, lampTop, 2.8);
    addBandWindows(B, drum2, 34.2, 36.2, lampTop, 2.8);
  }

  // 3. Cột cờ trên nóc Nhà Quốc hội Việt Nam (Rooftop Ceremonial Flagpole above the Diên Hồng Dome; waving 3D flag added via landmarkFlagsOf)
  B.solid(regPoly(ob.c, 1.8, 8, Math.PI / 8), 40.8, 41.8, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 0.34, 8), 41.8, 48.0, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 0.22, 8), 48.0, 54.3, () => 'metal', 'metal', b.id);
  B.line(V(ob.c[0], ob.c[1], 41.8), V(ob.c[0], ob.c[1], 54.5), 'crease');
  void top;
}

// ============================================================================
// 12. BẢO TÀNG HỒ CHÍ MINH (Kiến trúc bông sen trắng 19 Ngọc Hà)
// ============================================================================
function drawHoChiMinhMuseum(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(19.0, ...b.parts.map(partTop));
  const lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 3));

  // Stepped cantilevered octagonal "white lotus" upper gallery tiers & central lotus skylight crown
  const lotus1 = regPoly(ob.c, Math.min(ob.hw, ob.hd) * 0.92, 8, Math.PI / 8);
  const lotus2 = regPoly(ob.c, Math.min(ob.hw, ob.hd) * 0.64, 8, 0);
  const skylight = regPoly(ob.c, 11.5, 8, Math.PI / 8);
  B.solid(lotus1, top - 1.2, top + 0.8, () => 'metal', 'roof', b.id);
  B.solid(lotus2, top + 0.8, top + 2.8, () => 'wall', 'roof', b.id);
  B.solid(skylight, top + 2.8, top + 4.8, () => 'glass', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, skylight, top + 3.1, top + 4.5, lampTop, 2.2);
  }
}

// ============================================================================
// 13. PHỦ CHỦ TỊCH (Kiến trúc cổ điển Pháp – 2 Hùng Vương)
// ============================================================================
function drawPresidentialPalace(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = partTop(b.parts[0]!);
  const lampTop = floorId(b, b.parts[0]!.floors.length);

  // Classical French Beaux-Arts cornice, central pediment & twin corner mansard domes
  B.solid(scaleRing(b.footprint, ob.c, 1.04), top - 0.5, top + 0.45, () => 'metal', 'roof', b.id);
  // Central classical pavilion & roof
  const centerOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: ob.hw * 0.36, hd: ob.hd * 0.72 };
  B.solid(localRect(centerOb, -centerOb.hw, centerOb.hw, -centerOb.hd, centerOb.hd), top + 0.45, top + 3.2, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, centerOb, centerOb.hw, centerOb.hd, top + 3.1, 2.2, b.id, false);
  B.line(V(ob.c[0], ob.c[1], top + 5.3), V(ob.c[0], ob.c[1], top + 10.5), 'crease');

  // Twin corner mansard pavilion domes
  for (const su of [-1, 1] as const) {
    const pCorner = localPt(ob, su * ob.hw * 0.74, 0);
    const cornerOb: OrientedBox = { c: pCorner, u: ob.u, v: ob.v, hw: ob.hw * 0.22, hd: ob.hd * 0.82 };
    B.solid(localRect(cornerOb, -cornerOb.hw, cornerOb.hw, -cornerOb.hd, cornerOb.hd), top + 0.45, top + 2.8, () => 'wall', 'roof', b.id);
    drawTraditionalCurvedRoof(B, cornerOb, cornerOb.hw, cornerOb.hd, top + 2.75, 1.95, b.id, false);
  }
  // Grand front ceremonial double staircase
  B.solid(localRect(ob, -6.5, 6.5, -ob.hd - 3.8, -ob.hd), 0, 2.4, () => 'wall', 'walk', b.id);
  if (level >= 1) {
    addBandWindows(B, localRect(centerOb, -centerOb.hw, centerOb.hw, -centerOb.hd, centerOb.hd), top + 0.85, top + 2.7, lampTop, 2.0);
  }
}

// ============================================================================
// 14. ĐÀI TƯỞNG NIỆM CÁC ANH HÙNG LIỆT SĨ BẮC SƠN
// ============================================================================
function drawBacSonMemorial(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.min(9.5, Math.max(6.2, ob.hw * 0.65));
  const hd = Math.min(9.5, Math.max(6.2, ob.hd * 0.65));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Stepped square granite terrace platform (z = 0 .. 1.85 m)
  B.solid(localRect(ob, -hw - 4.5, hw + 4.5, -hd - 4.5, hd + 4.5), 0, 0.6, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw - 2.2, hw + 2.2, -hd - 2.2, hd + 2.2), 0.6, 1.25, () => 'wall', 'walk', b.id);
  B.solid(localRect(ob, -hw - 0.6, hw + 0.6, -hd - 0.6, hd + 0.6), 1.25, 1.85, () => 'wall', 'walk', b.id);

  // 2. Four massive L-shaped corner stone piers forming 4 open temple portals (z = 1.85 .. 11.4 m)
  const pOut = hw * 0.86, pW = hw * 0.28;
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const u0 = su > 0 ? pOut - pW : -pOut, u1 = su > 0 ? pOut : -pOut + pW;
      const v0 = sv > 0 ? pOut - pW : -pOut, v1 = sv > 0 ? pOut : -pOut + pW;
      B.solid(localRect(ob, u0, u1, v0, v1), 1.85, 11.4, () => 'wall', 'roof', b.id);
    }
  }
  // Upper entablature frieze connecting the 4 corner piers (z = 9.6 .. 11.8 m)
  const entRing = localRect(ob, -pOut, pOut, -pOut, pOut);
  B.solid(entRing, 9.6, 11.8, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, entRing, 9.95, 11.35, lamp2, 2.0);
  }

  // 3. Central bronze censer & eternal flame altar inside the open monument cube
  B.solid(regPoly(ob.c, 1.8, 8), 1.85, 2.65, () => 'metal', 'metal', b.id);
  B.solid(regPoly(ob.c, 1.1, 8), 2.65, 4.4, () => 'metal', 'metal', b.id);
  if (level >= 1) {
    addBandWindows(B, regPoly(ob.c, 1.15, 8), 3.1, 4.1, lamp1, 1.2);
  }

  // 4. Traditional stepped temple cornice roof (z = 11.8 .. 15.2 m)
  drawTraditionalCurvedRoof(B, ob, pOut + 0.4, pOut + 0.4, 11.75, 3.1, b.id, true);
}

// ============================================================================
// 15. LOTTE CENTER HANOI (54 Liễu Giai – 65 tầng, 272 m, Sky Walk & Áo dài V-cut)
// ============================================================================
function drawLotteCenter(B: Batch, b: Building, level: Detail) {
  const tower = b.parts.reduce((a, p) => (partTop(p) > partTop(a) ? p : a));
  const ob = orientedBoxOf(tower.footprint, 0);
  const top = partTop(tower);
  const topLamp = floorId(b, tower.floors.length);
  const lobbyLamp = floorId(b, 1);

  // 1. Podium cornice & rooftop garden terrace on the 6-storey Lotte Department Store podium (z = 33 m)
  for (const p of b.parts) {
    if (p === tower) continue;
    const pz = partTop(p), pc = centroid(p.footprint);
    B.solid(scaleRing(p.footprint, pc, 1.025), pz - 0.5, pz + 0.45, () => 'metal', 'roof', b.id);
  }

  // 2. Sky-lobby refuge belt courses along the 65-storey skyscraper shaft + central "Áo dài" vertical V-slot seam
  for (const zBelt of [33.0, 92.0, 152.0, 212.0, top - 16.0]) {
    if (zBelt < top - 4) {
      B.solid(scaleRing(tower.footprint, ob.c, 1.022), zBelt, zBelt + 0.9, () => 'metal', 'metal', b.id);
    }
  }
  for (const sv of [-1, 1] as const) {
    // Vertical "Áo dài" split reveal down the center of the broad faces, widening near the top crown
    const slotW = 1.65;
    B.solid(localRect(ob, -slotW, slotW, sv * (ob.hd - 0.2), sv * (ob.hd + 0.55)), 33.5, top, () => 'metal', 'metal', b.id);
  }

  // 3. Iconic Cantilevered Glass "Sky Walk" Observation Deck at Floor 65 (z = top - 8.5 .. top)
  const skyWalkRing = localRect(ob, -ob.hw * 1.06, ob.hw * 1.06, -ob.hd * 1.04, ob.hd * 1.04);
  B.solid(skyWalkRing, top - 8.2, top + 0.4, () => 'glass', 'roof', b.id);
  B.solid(scaleRing(skyWalkRing, ob.c, 1.02), top + 0.4, top + 1.3, () => 'metal', 'metal', b.id);

  // 4. Stepped architectural crown, helipad & twin communications masts (z = top + 1.3 .. top + 12.5 m)
  const crown = scaleRing(tower.footprint, ob.c, 0.74);
  B.solid(crown, top + 1.3, top + 6.2, () => 'glass', 'roof', b.id);
  B.solid(scaleRing(crown, ob.c, 1.03), top + 6.2, top + 6.8, () => 'metal', 'roof', b.id);
  B.solid(regPoly(ob.c, 6.8, 12), top + 6.8, top + 7.4, () => 'metal', 'walk', b.id);
  for (const su of [-1, 1] as const) {
    const m = localPt(ob, su * 8.0, 0);
    B.solid(regPoly(m, 0.65, 6), top + 6.8, top + 9.2, () => 'metal', 'metal', b.id);
    B.line(V(m[0], m[1], top + 9.2), V(m[0], m[1], top + 12.5), 'crease');
  }

  if (level >= 1) {
    addBandWindows(B, skyWalkRing, top - 7.6, top - 0.4, topLamp, 2.2);
    addBandWindows(B, crown, top + 1.8, top + 5.7, topLamp, 2.2);
    // Grand entrance marquee canopy on Liễu Giai – Đào Tấn
    const canRing = localRect(ob, -14, 14, -ob.hd - 6.5, -ob.hd + 1.0);
    B.solid(canRing, 5.2, 6.2, () => 'metal', 'metal', b.id);
    addBandWindows(B, canRing, 5.35, 6.05, lobbyLamp, 2.4);
  }
}

// ============================================================================
// 16. VINHOMES METROPOLIS (29 Liễu Giai – 3 tháp M1, M2, M3 & Vườn nổi tầng 4)
// ============================================================================
function drawVinhomesMetropolis(B: Batch, b: Building, level: Detail) {
  const towers = b.parts.filter(p => p.floors.length >= 35);
  const podiums = b.parts.filter(p => p.floors.length < 10);

  // 1. Floating Sky-Garden & swimming pool on top of the 4-storey Vincom podium (z = 18 m)
  for (const pod of podiums) {
    const pz = partTop(pod), pc = centroid(pod.footprint);
    B.solid(scaleRing(pod.footprint, pc, 1.02), pz - 0.35, pz + 0.35, () => 'metal', 'walk', b.id);
    if (Math.abs(ringArea(pod.footprint)) > 1500) {
      B.flat('grass', scaleRing(pod.footprint, pc, 0.82), pz + 0.38, 'detail', b.id);
      B.flat('water', regPoly(pc, 9.5, 8), pz + 0.42, 'detail', b.id);
    }
  }

  // 2. Illuminated architectural crowns & rooftop fins on towers M1 (41F), M2 (45F), M3 (45F)
  for (const t of towers) {
    const tc = centroid(t.footprint), top = partTop(t);
    const topLamp = floorId(b, t.floors.length);
    B.solid(scaleRing(t.footprint, tc, 1.03), top - 0.5, top + 0.4, () => 'metal', 'roof', b.id);
    const crown1 = scaleRing(t.footprint, tc, 0.82);
    const crown2 = scaleRing(t.footprint, tc, 0.62);
    B.solid(crown1, top + 0.4, top + 4.2, () => 'glass', 'roof', b.id);
    B.solid(scaleRing(crown1, tc, 1.03), top + 4.2, top + 4.7, () => 'metal', 'metal', b.id);
    B.solid(crown2, top + 4.7, top + 6.8, () => 'metal', 'roof', b.id);
    B.line(V(tc[0], tc[1], top + 6.8), V(tc[0], tc[1], top + 10.5), 'crease');
    if (level >= 1) addBandWindows(B, crown1, top + 0.85, top + 3.7, topLamp, 2.2);
  }
}

// ============================================================================
// 17. CAPITAL PLACE (29 Liễu Giai – 2 tháp văn phòng hạng A 37 tầng mặt dựng vẩy rồng)
// ============================================================================
function drawCapitalPlace(B: Batch, b: Building, level: Detail) {
  const towers = b.parts.filter(p => p.floors.length >= 25);
  for (const t of towers) {
    const tc = centroid(t.footprint), top = partTop(t);
    const topLamp = floorId(b, t.floors.length);
    // Diagonal illuminated wave belt courses & sculpted glass crown
    for (const zBelt of [36, 68, 100, top - 0.6]) {
      if (zBelt <= top) B.solid(scaleRing(t.footprint, tc, 1.03), zBelt, zBelt + 0.65, () => 'metal', 'metal', b.id);
    }
    const crown = scaleRing(t.footprint, tc, 0.84);
    B.solid(crown, top + 0.1, top + 5.6, () => 'glass', 'roof', b.id);
    B.solid(scaleRing(crown, tc, 1.03), top + 5.6, top + 6.3, () => 'metal', 'roof', b.id);
    if (level >= 1) addBandWindows(B, crown, top + 0.6, top + 5.1, topLamp, 2.0);
  }
}

// ============================================================================
// 18. KHÁCH SẠN HÀ NỘI DAEWOO & DAEHA BUSINESS CENTER (360 Kim Mã)
// ============================================================================
function drawDaewooHotel(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  for (const p of b.parts) {
    const pc = centroid(p.footprint), top = partTop(p);
    B.solid(scaleRing(p.footprint, pc, 1.03), top - 0.45, top + 0.4, () => 'metal', 'roof', b.id);
    if (p.floors.length >= 12) {
      const topLamp = floorId(b, p.floors.length);
      const crown = scaleRing(p.footprint, pc, 0.76);
      B.solid(crown, top + 0.4, top + 4.2, () => 'glass', 'roof', b.id);
      B.solid(scaleRing(crown, pc, 0.68), top + 4.2, top + 6.6, () => 'metal', 'roof', b.id);
      B.line(V(pc[0], pc[1], top + 6.6), V(pc[0], pc[1], top + 10.2), 'crease');
      if (level >= 1) addBandWindows(B, crown, top + 0.8, top + 3.7, topLamp, 2.2);
    }
  }
  // Oasis courtyard swimming pool & garden terrace between Daewoo Hotel and Serviced Apartments
  const poolCenter = localPt(ob, 16, -24);
  B.flat('grass', regPoly(poolCenter, 18, 12), 0.18, 'detail', b.id);
  B.flat('water', regPoly(poolCenter, 12.5, 12), 0.24, 'detail', b.id);
}

// ============================================================================
// 19. HANOI CENTRE & HYATT CENTRIC HANOI CENTRE (175 Nguyễn Thái Học)
// ============================================================================
function drawHanoiCentre(B: Batch, b: Building, level: Detail) {
  const lobbyLamp = floorId(b, 1);
  // Stepped commercial cornice bands, rooftop lounge pavilions & glass skybridges across the 3 blocks
  for (const p of b.parts) {
    const pc = centroid(p.footprint), top = partTop(p);
    const topLamp = floorId(b, p.floors.length);
    B.solid(scaleRing(p.footprint, pc, 1.028), 13.5, 14.2, () => 'metal', 'metal', b.id);
    B.solid(scaleRing(p.footprint, pc, 1.035), top - 0.5, top + 0.45, () => 'metal', 'roof', b.id);
    const crown = scaleRing(p.footprint, pc, 0.75);
    B.solid(crown, top + 0.45, top + 3.8, () => 'glass', 'roof', b.id);
    B.solid(scaleRing(crown, pc, 1.03), top + 3.8, top + 4.35, () => 'metal', 'roof', b.id);
    if (level >= 1) addBandWindows(B, crown, top + 0.85, top + 3.4, topLamp, 2.4);
  }
  // Elevated glass atrium skybridge connecting Tòa Nam & Tòa Bắc
  if (b.parts.length >= 2) {
    const c0 = centroid(b.parts[0]!.footprint), c1 = centroid(b.parts[1]!.footprint);
    const mid: Vec2 = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
    const bridgeRing = regPoly(mid, 11.5, 8);
    B.solid(bridgeRing, 9.2, 22.5, () => 'glass', 'roof', b.id);
    if (level >= 1) addBandWindows(B, bridgeRing, 10.0, 21.5, lobbyLamp, 2.2);
  }
}

// ============================================================================
// 20. VINCOM PHẠM NGỌC THẠCH, VINCOM NGUYỄN CHÍ THANH & PULLMAN HANOI
// ============================================================================
function drawCommercialLandmarkCrown(B: Batch, b: Building, level: Detail) {
  for (const p of b.parts) {
    const pc = centroid(p.footprint), top = partTop(p);
    const topLamp = floorId(b, p.floors.length);
    B.solid(scaleRing(p.footprint, pc, 1.03), top - 0.45, top + 0.45, () => 'metal', 'roof', b.id);
    if (p.floors.length >= 8) {
      const crown = scaleRing(p.footprint, pc, 0.78);
      B.solid(crown, top + 0.45, top + 3.9, () => 'glass', 'roof', b.id);
      B.solid(scaleRing(crown, pc, 1.03), top + 3.9, top + 4.45, () => 'metal', 'roof', b.id);
      if (level >= 1) addBandWindows(B, crown, top + 0.9, top + 3.45, topLamp, 2.2);
    }
  }
}

// ============================================================================
// 21. THÁP RÙA HỒ GƯƠM (Biểu tượng lịch sử giữa lòng Hồ Hoàn Kiếm)
// ============================================================================
function drawThapRua(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(3.14, ob.hw), hd = Math.max(2.14, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2), lamp3 = floorId(b, 3);

  // 1. Gò Rùa (Emerald grassy Turtle Mound island rising from Hồ Hoàn Kiếm water + stone embankment)
  B.flat('water', regPoly(ob.c, 16.5, 16), 0.05, 'detail', b.id);
  B.solid(regPoly(ob.c, 12.2, 14), 0, 0.48, () => 'wall', 'walk', b.id);
  B.flat('grass', regPoly(ob.c, 11.6, 14), 0.52, 'detail', b.id);
  B.solid(localRect(ob, -hw - 0.85, hw + 0.85, -hd - 0.85, hd + 0.85), 0.48, 0.92, () => 'wall', 'walk', b.id);

  // 2. Tầng 1 Tháp Rùa (z = 0.92 .. 4.15 m): 3 Gothic pointed arches on long sides, 2 on short sides + ornate parapet
  const r1 = localRect(ob, -hw, hw, -hd, hd);
  B.solid(r1, 0.92, 4.15, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw - 0.22, hw + 0.22, -hd - 0.22, hd + 0.22), 4.15, 4.65, () => 'metal', 'walk', b.id);
  if (level >= 1) {
    addBandWindows(B, r1, 1.35, 3.75, lamp1, 2.0);
  }

  // 3. Tầng 2 Tháp Rùa (z = 4.65 .. 7.35 m): tapered rectangular tier + perimeter balustrade
  const w2 = hw * 0.76, d2 = hd * 0.76;
  const r2 = localRect(ob, -w2, w2, -d2, d2);
  B.solid(r2, 4.65, 7.35, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -w2 - 0.2, w2 + 0.2, -d2 - 0.2, d2 + 0.2), 7.35, 7.8, () => 'metal', 'walk', b.id);
  if (level >= 1) {
    addBandWindows(B, r2, 5.05, 6.95, lamp2, 1.8);
  }

  // 4. Tầng 3 Vọng Lâu & Mái đao cong 5 ngôi sao trên đỉnh Tháp Rùa (z = 7.8 .. 10.6 m)
  const w3 = hw * 0.52, d3 = hd * 0.52;
  const r3 = localRect(ob, -w3, w3, -d3, d3);
  B.solid(r3, 7.8, 9.35, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, r3, 8.05, 9.05, lamp3, 1.4);
  }
  drawTraditionalCurvedRoof(B, ob, w3 + 0.25, d3 + 0.25, 9.3, 1.25, b.id, true);
}

// ============================================================================
// 22. ĐỀN NGỌC SƠN, CẦU THÊ HÚC, ĐẮC NGUYỆT LÂU, THÁP BÚT & ĐÌNH TRẤN BA (Hồ Gươm)
// ============================================================================
function drawDenNgocSon(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(7.5, ob.hw), hd = Math.max(9.5, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Đảo Ngọc (Jade Island stone embankment on Hồ Hoàn Kiếm)
  B.solid(localRect(ob, -hw - 3.5, hw + 3.5, -hd - 3.5, hd + 3.5), 0, 0.55, () => 'wall', 'walk', b.id);

  // 2. Cầu Thê Húc ("Nơi đậu ánh mặt trời ban mai" — Iconic arched vermilion wooden bridge spanning 22 m East)
  const bridgeDirU = 1;
  const bridgeSegments = 9;
  for (let i = 0; i < bridgeSegments; i++) {
    const t0 = i / bridgeSegments, t1 = (i + 1) / bridgeSegments;
    const u0 = (hw + 2.5) + t0 * 21.0, u1 = (hw + 2.5) + t1 * 21.0;
    const arch0 = Math.sin(t0 * Math.PI) * 1.45;
    const arch1 = Math.sin(t1 * Math.PI) * 1.45;
    const zDeck = 0.65 + (arch0 + arch1) * 0.5;
    // Vermilion bridge deck & side railings
    B.solid(localRect(ob, bridgeDirU * u0, bridgeDirU * u1, -1.65, 1.65), zDeck - 0.22, zDeck, () => 'roof', 'walk', b.id);
    B.solid(localRect(ob, bridgeDirU * u0, bridgeDirU * u1, -1.78, -1.52), zDeck, zDeck + 0.88, () => 'roof', 'roof', b.id);
    B.solid(localRect(ob, bridgeDirU * u0, bridgeDirU * u1, 1.52, 1.78), zDeck, zDeck + 0.88, () => 'roof', 'roof', b.id);
    // Double wooden bridge piles in the lake water
    const uMid = (u0 + u1) * 0.5;
    for (const sv of [-1.25, 1.25] as const) {
      B.solid(regPoly(localPt(ob, uMid, sv), 0.18, 6), 0, zDeck - 0.15, () => 'roof', 'roof', b.id);
    }
  }

  // 3. Tháp Bút ("Tả Thanh Thiên" — 5-storey stone brush tower on Núi Ngọc Bội at the bridge entrance)
  const thapButPos = localPt(ob, hw + 25.5, 0);
  B.solid(regPoly(thapButPos, 3.8, 8), 0, 1.85, () => 'wall', 'walk', b.id);
  B.solid(regPoly(thapButPos, 2.4, 8), 1.85, 3.2, () => 'wall', 'walk', b.id);
  for (let st = 0; st < 5; st++) {
    const z0 = 3.2 + st * 1.45;
    const r = 1.15 - st * 0.1;
    B.solid(localRect({ c: thapButPos, u: ob.u, v: ob.v, hw: r, hd: r }, -r, r, -r, r), z0, z0 + 1.25, () => 'wall', 'roof', b.id);
    B.solid(localRect({ c: thapButPos, u: ob.u, v: ob.v, hw: r, hd: r }, -r - 0.16, r + 0.16, -r - 0.16, r + 0.16), z0 + 1.25, z0 + 1.45, () => 'metal', 'metal', b.id);
  }
  // Stone brush tip finial (Ngọn bút lông đá vươn lên trời xanh)
  B.solid(regPoly(thapButPos, 0.52, 8), 10.45, 11.4, () => 'metal', 'metal', b.id);
  B.solid(regPoly(thapButPos, 0.22, 8), 11.4, 12.35, () => 'metal', 'metal', b.id);

  // 4. Đắc Nguyệt Lâu (2-storey Moon-Gazing Gate Pavilion at the island end of Cầu Thê Húc)
  const gateOb: OrientedBox = { c: localPt(ob, hw + 0.8, 0), u: ob.v, v: ob.u, hw: 2.8, hd: 2.2 };
  B.solid(localRect(gateOb, -2.6, 2.6, -2.0, 2.0), 0.55, 3.85, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, gateOb, 2.8, 2.2, 3.8, 1.35, b.id, true);
  B.solid(localRect(gateOb, -1.9, 1.9, -1.5, 1.5), 5.0, 6.85, () => 'wall', 'roof', b.id);
  drawTraditionalCurvedRoof(B, gateOb, 2.1, 1.7, 6.8, 1.45, b.id, true);

  // 5. Điện thờ Chính Đền Ngọc Sơn (Tiền tế – Trung đường – Hậu cung)
  const hallW = hw * 0.78, hallD = hd * 0.58;
  const hallRing = localRect(ob, -hallW, hallW, -hallD, hallD);
  B.solid(hallRing, 0.55, 4.65, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, hallRing, 1.35, 4.15, lamp1, 2.2);
  }
  drawTraditionalCurvedRoof(B, ob, hallW + 0.45, hallD + 0.45, 4.55, 2.25, b.id, true);

  // 6. Đình Trấn Ba (Square 8-roof wave-calming pavilion looking south toward Tháp Rùa)
  const tranBaOb: OrientedBox = { c: localPt(ob, 0, hd * 0.82), u: ob.u, v: ob.v, hw: 3.2, hd: 3.2 };
  B.solid(localRect(tranBaOb, -3.4, 3.4, -3.4, 3.4), 0.55, 0.95, () => 'wall', 'walk', b.id);
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      B.solid(regPoly(localPt(tranBaOb, su * 2.4, sv * 2.4), 0.26, 8), 0.95, 3.75, () => 'roof', 'roof', b.id);
    }
  }
  if (level >= 1) {
    addBandWindows(B, localRect(tranBaOb, -1.8, 1.8, -1.8, 1.8), 3.2, 3.7, lamp2, 1.6);
  }
  drawTraditionalCurvedRoof(B, tranBaOb, 3.2, 3.2, 3.7, 1.35, b.id, true);
  drawTraditionalCurvedRoof(B, tranBaOb, 2.2, 2.2, 4.95, 1.35, b.id, true);

  // Festive flagpole mast at Đền Ngọc Sơn courtyard
  const fPos = localPt(ob, -hw - 2.2, -hd - 2.2);
  B.solid(regPoly(fPos, 0.65, 8), 0, 0.85, () => 'wall', 'walk', b.id);
  B.solid(regPoly(fPos, 0.16, 8), 0.85, 9.2, () => 'metal', 'metal', b.id);
}

// ============================================================================
// 23. NHÀ HÁT LỚN HÀ NỘI (Quảng trường Cách mạng Tháng Tám – Số 1 Tràng Tiền)
// ============================================================================
function drawHanoiOperaHouse(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(22.0, ...b.parts.map(partTop));
  const lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 4));
  const lamp1 = floorId(b, 1);

  // 1. Grand ceremonial stone staircase & forecourt facing Quảng trường Cách mạng Tháng Tám
  for (let st = 0; st < 4; st++) {
    const v0 = -ob.hd - (4 - st) * 1.35;
    B.solid(localRect(ob, -ob.hw * 0.62, ob.hw * 0.62, v0, -ob.hd), st * 0.48, (st + 1) * 0.48, () => 'wall', 'walk', b.id);
  }

  // 2. Classical French Neoclassical Ionic colonnade portico & entablature cornice
  B.solid(scaleRing(b.footprint, ob.c, 1.035), top - 1.2, top + 0.45, () => 'metal', 'roof', b.id);
  for (let i = -3; i <= 3; i++) {
    const cu = i * (ob.hw * 0.16);
    B.solid(regPoly(localPt(ob, cu, -ob.hd - 0.35), 0.48, 10), 1.9, top - 1.2, () => 'metal', 'metal', b.id);
  }

  // 3. Central Baroque/Beaux-Arts stepped auditorium dome & rooftop Vietnamese flagpole
  const domeOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: ob.hw * 0.42, hd: ob.hd * 0.38 };
  B.solid(localRect(domeOb, -domeOb.hw, domeOb.hw, -domeOb.hd, domeOb.hd), top + 0.45, top + 4.2, () => 'wall', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(ob.hw, ob.hd) * 0.36, 12), top + 4.2, top + 7.6, () => 'roof', 'roof', b.id);
  B.solid(regPoly(ob.c, Math.min(ob.hw, ob.hd) * 0.2, 12), top + 7.6, top + 9.8, () => 'metal', 'metal', b.id);

  // 4. Twin flanking French slate Mansard pavilion roofs
  for (const su of [-1, 1] as const) {
    const pWing = localPt(ob, su * ob.hw * 0.68, -ob.hd * 0.35);
    const wingOb: OrientedBox = { c: pWing, u: ob.u, v: ob.v, hw: ob.hw * 0.24, hd: ob.hd * 0.32 };
    B.solid(localRect(wingOb, -wingOb.hw, wingOb.hw, -wingOb.hd, wingOb.hd), top + 0.45, top + 3.4, () => 'roof', 'roof', b.id);
    B.solid(localRect(wingOb, -wingOb.hw * 0.65, wingOb.hw * 0.65, -wingOb.hd * 0.65, wingOb.hd * 0.65), top + 3.4, top + 5.2, () => 'metal', 'metal', b.id);
  }

  // Front rooftop flagpole mast
  const frontPole = localPt(ob, 0, -ob.hd * 0.55);
  B.solid(regPoly(frontPole, 0.22, 8), top + 4.2, top + 12.2, () => 'metal', 'metal', b.id);

  if (level >= 1) {
    addBandWindows(B, localRect(domeOb, -domeOb.hw, domeOb.hw, -domeOb.hd, domeOb.hd), top + 0.9, top + 3.7, lampTop, 2.2);
    addBandWindows(B, localRect(ob, -ob.hw * 0.55, ob.hw * 0.55, -ob.hd - 0.4, -ob.hd + 0.4), 2.5, top - 2.0, lamp1, 2.6);
  }
}

// ============================================================================
// 24. NHÀ THỜ LỚN HÀ NỘI – ST. JOSEPH'S CATHEDRAL (40 Nhà Chung)
// ============================================================================
function drawStJosephCathedral(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(8.5, ob.hw), hd = Math.max(18.0, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 2));

  // 1. Pitched Gothic nave roof along the length of the cathedral (z = 14.5 .. 20.5 m)
  const naveOb: OrientedBox = { c: ob.c, u: ob.u, v: ob.v, hw: hw * 0.78, hd: hd * 0.88 };
  B.solid(localRect(naveOb, -naveOb.hw, naveOb.hw, -naveOb.hd, naveOb.hd), 14.0, 16.8, () => 'roof', 'roof', b.id);
  B.solid(localRect(naveOb, -naveOb.hw * 0.52, naveOb.hw * 0.52, -naveOb.hd * 0.92, naveOb.hd * 0.92), 16.8, 19.6, () => 'roof', 'roof', b.id);

  // 2. Twin Neo-Gothic square bell towers on the front facade (2 tháp chuông cao 31.5 m)
  const towerW = hw * 0.34;
  for (const su of [-1, 1] as const) {
    const tu0 = su > 0 ? hw - towerW * 2 : -hw;
    const tu1 = su > 0 ? hw : -hw + towerW * 2;
    const tRing = localRect(ob, tu0, tu1, -hd, -hd + towerW * 2.1);
    B.solid(tRing, 0, 29.5, () => 'wall', 'roof', b.id);
    // Cre-nelated Gothic battlements & corner pinnacles at the top of each bell tower (z = 29.5 .. 32.2 m)
    const tc = centroid(tRing);
    B.solid(scaleRing(tRing, tc, 1.05), 29.5, 31.2, () => 'metal', 'metal', b.id);
    for (const cu of [tu0, tu1] as const) {
      for (const cv of [-hd, -hd + towerW * 2.1] as const) {
        B.solid(regPoly(localPt(ob, cu, cv), 0.45, 6), 31.2, 33.4, () => 'metal', 'metal', b.id);
      }
    }
    if (level >= 1) {
      addBandWindows(B, tRing, 16.0, 27.5, lamp2, 2.2);
    }
  }

  // 3. Central gable facade between the twin towers, Gothic Rose Window & Cross finial at the apex
  const centerGable = localRect(ob, -hw + towerW * 2, hw - towerW * 2, -hd, -hd + towerW * 1.5);
  B.solid(centerGable, 0, 22.8, () => 'wall', 'roof', b.id);
  const frontApex = localPt(ob, 0, -hd + 0.6);
  B.solid(regPoly(frontApex, 0.55, 8), 22.8, 25.4, () => 'metal', 'metal', b.id);
  // Cross at the central gable apex
  B.line(V(frontApex[0], frontApex[1], 25.4), V(frontApex[0], frontApex[1], 28.6), 'crease');
  const crossL = localPt(ob, -0.95, -hd + 0.6), crossR = localPt(ob, 0.95, -hd + 0.6);
  B.line(V(crossL[0], crossL[1], 27.3), V(crossR[0], crossR[1], 27.3), 'crease');

  // Circular Gothic Rose Window on the front facade
  const roseCenter = localPt(ob, 0, -hd - 0.12);
  const rosePts = Array.from({ length: 16 }, (_, k) => {
    const a = (k * 2 * Math.PI) / 16;
    const p = localPt(ob, Math.cos(a) * 2.4, -hd - 0.12);
    return V(p[0], p[1], 14.8 + Math.sin(a) * 2.4);
  });
  B.loop(rosePts, 'crease');
  if (level >= 1) {
    addBandWindows(B, centerGable, 12.5, 17.2, lamp1, 2.0);
  }
  void roseCenter;
}

// ============================================================================
// 25. TRÀNG TIỀN PLAZA (Góc Hàng Bài – Tràng Tiền – Hồ Hoàn Kiếm)
// ============================================================================
function drawTrangTienPlaza(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(22.0, ...b.parts.map(partTop));
  const lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 6));

  // French Neoclassical cornice moldings, corner rotunda Mansard dome & golden balustrade
  B.solid(scaleRing(b.footprint, ob.c, 1.025), 5.2, 5.9, () => 'metal', 'metal', b.id);
  B.solid(scaleRing(b.footprint, ob.c, 1.03), top - 0.6, top + 0.55, () => 'metal', 'roof', b.id);
  // Corner Mansard domes
  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const cPt = localPt(ob, su * ob.hw * 0.78, sv * ob.hd * 0.78);
      B.solid(regPoly(cPt, 5.4, 10), top + 0.55, top + 3.8, () => 'roof', 'roof', b.id);
      B.solid(regPoly(cPt, 3.2, 10), top + 3.8, top + 5.6, () => 'metal', 'metal', b.id);
      if (level >= 1) addBandWindows(B, regPoly(cPt, 5.5, 10), top + 1.0, top + 3.3, lampTop, 2.0);
    }
  }
}

// ============================================================================
// 26. Ô QUAN CHƯỞNG – ĐÔNG HÀ MÔN (Cửa ô cổ duy nhất còn lại của kinh thành Thăng Long)
// ============================================================================
function drawOQuanChuong(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(6.2, ob.hw), hd = Math.max(3.8, ob.hd);
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Massive ancient brick rampart wall with central arched carriageway & 2 side pedestrian arches (z = 0 .. 4.4 m)
  for (const [u0, u1] of [[-hw, -hw * 0.64], [-hw * 0.34, -hw * 0.18], [hw * 0.18, hw * 0.34], [hw * 0.64, hw]] as const) {
    B.solid(localRect(ob, u0, u1, -hd, hd), 0, 4.4, () => 'wall', 'roof', b.id);
  }
  B.solid(localRect(ob, -hw, hw, -hd, hd), 3.2, 4.5, () => 'wall', 'walk', b.id);
  // Perforated brick parapet around the upper terrace deck
  B.solid(localRect(ob, -hw, hw, -hd, -hd + 0.35), 4.5, 5.25, () => 'metal', 'metal', b.id);
  B.solid(localRect(ob, -hw, hw, hd - 0.35, hd), 4.5, 5.25, () => 'metal', 'metal', b.id);

  // 2. Vọng lâu 4 mái đao cong trên đỉnh Ô Quan Chưởng (z = 4.5 .. 8.2 m)
  const pavRing = localRect(ob, -hw * 0.48, hw * 0.48, -hd * 0.68, hd * 0.68);
  B.solid(pavRing, 4.5, 6.65, () => 'wall', 'roof', b.id);
  if (level >= 1) {
    addBandWindows(B, pavRing, 4.85, 6.25, lamp2, 1.6);
    addBandWindows(B, localRect(ob, -hw * 0.5, hw * 0.5, -hd, hd), 3.35, 4.15, lamp1, 2.0);
  }
  drawTraditionalCurvedRoof(B, ob, hw * 0.52, hd * 0.72, 6.6, 1.65, b.id, true);
}

// ============================================================================
// 27. CHỢ ĐỒNG XUÂN (5 nếp mái vòm tam giác lịch sử tại Phố cổ Hoàn Kiếm)
// ============================================================================
function drawChoDongXuan(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(13.5, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1);

  // 5 iconic triangular pediment gables along the front facade of Chợ Đồng Xuân
  const gables = 5;
  const spanU = (ob.hw * 1.88) / gables;
  for (let g = 0; g < gables; g++) {
    const u0 = -ob.hw * 0.94 + g * spanU + 0.35;
    const u1 = -ob.hw * 0.94 + (g + 1) * spanU - 0.35;
    const uMid = (u0 + u1) * 0.5;
    const gableOb: OrientedBox = { c: localPt(ob, uMid, 0), u: ob.u, v: ob.v, hw: (u1 - u0) * 0.5, hd: ob.hd * 0.95 };
    B.solid(localRect(gableOb, -gableOb.hw, gableOb.hw, -gableOb.hd, gableOb.hd), top, top + 1.85, () => 'roof', 'roof', b.id);
    B.solid(localRect(gableOb, -gableOb.hw * 0.58, gableOb.hw * 0.58, -gableOb.hd, gableOb.hd), top + 1.85, top + 3.45, () => 'roof', 'roof', b.id);
    // Circular clock/medallion ornament on each front gable pediment
    const medPos = localPt(ob, uMid, -ob.hd - 0.15);
    B.solid(regPoly(medPos, 0.95, 10), top + 0.65, top + 2.15, () => 'metal', 'metal', b.id);
  }
  if (level >= 1) {
    addBandWindows(B, scaleRing(b.footprint, ob.c, 1.01), top - 3.6, top - 0.5, lamp1, 3.0);
  }
}

// ============================================================================
// 28. DI TÍCH LỊCH SỬ NHÀ TÙ HỎA LÒ (Số 1 Hỏa Lò, Hoàn Kiếm)
// ============================================================================
function drawHoaLoPrison(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(7.6, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1);

  // Historic arched "Maison Centrale" entrance gatehouse, pitched tile roof & corner watchtowers
  drawTraditionalCurvedRoof(B, ob, ob.hw * 0.95, ob.hd * 0.95, top - 0.1, 2.4, b.id, false);
  for (const su of [-1, 1] as const) {
    const wt = localPt(ob, su * ob.hw * 0.88, -ob.hd * 0.82);
    B.solid(regPoly(wt, 2.1, 8), 0, top + 3.8, () => 'wall', 'roof', b.id);
    B.solid(regPoly(wt, 2.4, 8), top + 3.8, top + 5.2, () => 'roof', 'roof', b.id);
  }
  if (level >= 1) {
    addBandWindows(B, scaleRing(b.footprint, ob.c, 1.01), 1.6, top - 0.8, lamp1, 2.8);
  }
}

// ============================================================================
// 29. BẢO TÀNG LỊCH SỬ QUỐC GIA VIỆT NAM (Kiến trúc Đông Dương – Số 1 Tràng Tiền)
// ============================================================================
function drawNationalHistoryMuseum(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const top = Math.max(12.5, ...b.parts.map(partTop));
  const lampTop = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 3));

  // Signature Ernest Hébrard Indochine octagonal 3-tiered curved roof tower over the central rotunda
  for (let tier = 0; tier < 3; tier++) {
    const r = Math.min(ob.hw, ob.hd) * (0.68 - tier * 0.16);
    const z0 = top + tier * 2.85;
    const octRing = regPoly(ob.c, r, 8, Math.PI / 8);
    B.solid(octRing, z0, z0 + 1.65, () => 'wall', 'roof', b.id);
    B.solid(regPoly(ob.c, r + 1.35, 8, Math.PI / 8), z0 + 1.65, z0 + 2.85, () => 'roof', 'roof', b.id);
    if (level >= 1) addBandWindows(B, octRing, z0 + 0.3, z0 + 1.35, lampTop, 2.0);
  }
  B.solid(regPoly(ob.c, 1.2, 8), top + 8.55, top + 11.2, () => 'metal', 'metal', b.id);
}

// ============================================================================
// 30. CHÙA TRẤN QUỐC & BẢO THÁP LỤC ĐỘ ĐÀI SEN 11 TẦNG (Đường Thanh Niên – Hồ Tây)
// ============================================================================
function drawChuaTranQuoc(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(4.5, ob.hw), hd = Math.max(4.5, ob.hd);
  const lamp1 = floorId(b, 1);
  const isStupaOnly = Math.max(ob.hw, ob.hd) <= 6.5;

  // 1. Bảo tháp Lục Độ Đài Sen (11-storey hexagonal red-brick lotus stupa, 15 m tall, crowned with 9-tier gemstone lotus finial)
  const stupaCenter = isStupaOnly ? ob.c : localPt(ob, -hw * 0.55, -hd - 6.5);
  B.solid(regPoly(stupaCenter, 4.2, 6), 0, 0.75, () => 'wall', 'walk', b.id);
  B.solid(regPoly(stupaCenter, 3.1, 6), 0.75, 1.45, () => 'wall', 'walk', b.id);
  for (let st = 0; st < 11; st++) {
    const z0 = 1.45 + st * 1.12;
    const rShaft = Math.max(0.75, 2.15 - st * 0.11);
    const rEave = rShaft + 0.52;
    const shaftRing = regPoly(stupaCenter, rShaft, 6);
    B.solid(shaftRing, z0, z0 + 0.82, () => 'wall', 'roof', b.id);
    // White stone Amitabha statue niche on each hexagonal face
    B.solid(regPoly(stupaCenter, rEave, 6), z0 + 0.82, z0 + 1.12, () => 'roof', 'roof', b.id);
    if (level >= 1 && st % 2 === 0) {
      addBandWindows(B, shaftRing, z0 + 0.18, z0 + 0.68, lamp1, 1.4);
    }
  }
  // Cửu phẩm liên hoa (Nine-tier lotus spire on top of Bảo tháp Lục Độ Đài Sen, z = 13.8 .. 16.8 m)
  B.solid(regPoly(stupaCenter, 0.58, 8), 13.77, 15.6, () => 'metal', 'metal', b.id);
  B.solid(regPoly(stupaCenter, 0.24, 8), 15.6, 16.8, () => 'metal', 'metal', b.id);

  if (!isStupaOnly) {
    // 2. Thượng Điện – Tiền Đường – Nhà Tổ Chùa Trấn Quốc với mái đao cong truyền thống trên đảo Cá Vàng Hồ Tây
    B.solid(localRect(ob, -hw - 1.2, hw + 1.2, -hd - 1.2, hd + 1.2), 0, 0.52, () => 'wall', 'walk', b.id);
    const hallRing = localRect(ob, -hw * 0.86, hw * 0.86, -hd * 0.86, hd * 0.86);
    B.solid(hallRing, 0.52, 4.4, () => 'wall', 'roof', b.id);
    if (level >= 1) addBandWindows(B, hallRing, 1.2, 3.9, lamp1, 2.2);
    drawTraditionalCurvedRoof(B, ob, hw, hd, 4.3, 2.2, b.id, true);
  }
}

// ============================================================================
// 31. KIẾN TRÚC CHÙA TRUYỀN THỐNG VIỆT NAM (Chùa Quán Sứ, Chùa Phúc Khánh, Chùa Bộc, Chùa Kim Liên…)
// ============================================================================
function drawTraditionalPagodaComplex(B: Batch, b: Building, level: Detail) {
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, Math.max(1, b.parts[0]?.floors.length ?? 2));
  for (const part of b.parts) {
    const ob = orientedBoxOf(part.footprint, b.front);
    const hw = Math.max(2.8, ob.hw), hd = Math.max(2.8, ob.hd);
    const baseH = Math.max(4.2, partTop(part));
    const isTwoStorey = part.floors.length >= 2 || baseH >= 7.2;

    // 1. Stepped blue-stone terrace foundation (Nền đá xanh bậc tam cấp)
    B.solid(scaleRing(part.footprint, ob.c, 1.08), 0, 0.52, () => 'wall', 'walk', b.id);
    // 2. Main wooden sanctuary chamber & perimeter veranda columns
    const wallH = isTwoStorey ? 4.4 : Math.max(3.4, baseH * 0.65);
    const innerRing = scaleRing(part.footprint, ob.c, 0.88);
    B.solid(innerRing, 0.52, wallH, () => 'wall', 'roof', b.id);
    if (level >= 1) addBandWindows(B, innerRing, 1.2, wallH - 0.4, lamp1, 2.2);

    // Perimeter wooden columns along front & back verandas
    for (let k = -2; k <= 2; k++) {
      const cu = (k / 2) * (hw * 0.82);
      for (const sv of [-1, 1] as const) {
        B.solid(regPoly(localPt(ob, cu, sv * hd * 0.92), 0.22, 8), 0.52, wallH, () => 'roof', 'roof', b.id);
      }
    }

    // 3. Sweeping curved tiled roof (Mái đao cong truyền thống + Lưỡng long chầu nguyệt)
    drawTraditionalCurvedRoof(B, ob, hw + 0.3, hd + 0.3, wallH - 0.1, 1.95, b.id, true);

    if (isTwoStorey) {
      // Upper bell-tower / Tam bảo pavilion tier (Gác chuông / Cổ diềm 2 tầng 8 mái)
      const upW = hw * 0.68, upD = hd * 0.68;
      const upRing = localRect(ob, -upW, upW, -upD, upD);
      B.solid(upRing, wallH + 1.5, wallH + 3.8, () => 'wall', 'roof', b.id);
      if (level >= 1) addBandWindows(B, upRing, wallH + 1.85, wallH + 3.45, lamp2, 1.8);
      drawTraditionalCurvedRoof(B, ob, upW + 0.35, upD + 0.35, wallH + 3.7, 1.75, b.id, true);
    }

    // 4. Courtyard stone incense burner (Đỉnh hương đá trước sân chùa)
    const censerPos = localPt(ob, 0, -hd - 2.4);
    B.solid(regPoly(censerPos, 0.72, 8), 0, 1.45, () => 'metal', 'metal', b.id);
  }
}

// ============================================================================
// 32. KIẾN TRÚC ĐỀN – ĐÌNH – MIẾU – PHỦ TRUYỀN THỐNG (Đền Quán Thánh, Phủ Tây Hồ, Đền Hai Bà Trưng, Đình Khương Hạ…)
// ============================================================================
function drawTraditionalTempleComplex(B: Batch, b: Building, level: Detail) {
  const lamp1 = floorId(b, 1);
  for (const [idx, part] of b.parts.entries()) {
    const ob = orientedBoxOf(part.footprint, b.front);
    const hw = Math.max(3.0, ob.hw), hd = Math.max(2.8, ob.hd);
    const wallH = Math.max(3.6, Math.min(5.2, partTop(part) * 0.68));

    // 1. Stepped stone podium & red-brick temple courtyard
    B.solid(scaleRing(part.footprint, ob.c, 1.1), 0, 0.56, () => 'wall', 'walk', b.id);
    const innerRing = scaleRing(part.footprint, ob.c, 0.88);
    B.solid(innerRing, 0.56, wallH, () => 'wall', 'roof', b.id);
    if (level >= 1) addBandWindows(B, innerRing, 1.3, wallH - 0.45, lamp1, 2.2);

    // 2. Grand curved tiled temple roof (Mái đình/đền đao cong vút + Lưỡng long chầu nguyệt)
    drawTraditionalCurvedRoof(B, ob, hw + 0.4, hd + 0.4, wallH - 0.1, 2.15, b.id, true);

    // 3. Ceremonial Nghi Môn twin stone pillars (Đôi trụ biểu Nghi môn đắp nghê chầu) in front of the primary hall
    if (idx === 0) {
      for (const su of [-1, 1] as const) {
        const pPos = localPt(ob, su * Math.min(hw * 0.85, 5.5), -hd - 3.2);
        B.solid(localRect({ c: pPos, u: ob.u, v: ob.v, hw: 0.48, hd: 0.48 }, -0.48, 0.48, -0.48, 0.48), 0, 1.1, () => 'wall', 'walk', b.id);
        B.solid(localRect({ c: pPos, u: ob.u, v: ob.v, hw: 0.34, hd: 0.34 }, -0.34, 0.34, -0.34, 0.34), 1.1, 6.2, () => 'wall', 'roof', b.id);
        B.solid(regPoly(pPos, 0.42, 8), 6.2, 7.15, () => 'metal', 'metal', b.id);
      }
      if (b.model === 'den-ngoc-son' || b.model === 'phu-tay-ho' || b.model === 'den-quan-thanh' || b.model === 'den-hai-ba-trung') {
        const fPos = localPt(ob, -hw - 2.2, -hd - 2.2);
        B.solid(regPoly(fPos, 0.55, 8), 0, 0.75, () => 'wall', 'walk', b.id);
        B.solid(regPoly(fPos, 0.15, 8), 0.75, 9.2, () => 'metal', 'metal', b.id);
      }
    }
  }
}

// ============================================================================
// 33. VINHOMES ROYAL CITY & CỔNG KHẢI HOÀN MÔN NGÃ TƯ SỞ (72A Nguyễn Trãi, Thanh Xuân)
// ============================================================================
function drawRoyalCity(B: Batch, b: Building, level: Detail) {
  for (const p of b.parts) {
    const ob = orientedBoxOf(p.footprint, 0);
    const top = partTop(p);
    const topLamp = floorId(b, p.floors.length);
    // European Neoclassical cornice bands, stepped white crown pediment & arched rooftop pavilion
    for (const zBelt of [18, 56, 96, top - 0.6]) {
      if (zBelt <= top) B.solid(scaleRing(p.footprint, ob.c, 1.028), zBelt, zBelt + 0.75, () => 'metal', 'metal', b.id);
    }
    const crown = scaleRing(p.footprint, ob.c, 0.8);
    B.solid(crown, top + 0.15, top + 4.8, () => 'wall', 'roof', b.id);
    B.solid(scaleRing(crown, ob.c, 1.04), top + 4.8, top + 5.6, () => 'metal', 'metal', b.id);
    if (level >= 1) addBandWindows(B, crown, top + 0.8, top + 4.3, topLamp, 2.4);
  }
}

// ============================================================================
// 34. KIẾN TRÚC NHÀ THỜ – GIÁO XỨ (Nhà thờ Thái Hà, Nhà thờ Hàm Long, Nhà thờ Cửa Bắc…)
// ============================================================================
function drawChurchHall(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(4.5, ob.hw), hd = Math.max(7.5, ob.hd);
  const baseH = Math.max(10.5, ...b.parts.map(partTop));
  const lamp1 = floorId(b, 1), lamp2 = floorId(b, 2);

  // 1. Nave body & steep pitched roof
  const naveRing = localRect(ob, -hw * 0.86, hw * 0.86, -hd * 0.9, hd * 0.9);
  B.solid(naveRing, 0, baseH, () => 'wall', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.92, hw * 0.92, -hd * 0.92, hd * 0.92), baseH, baseH + 1.8, () => 'roof', 'roof', b.id);
  B.solid(localRect(ob, -hw * 0.45, hw * 0.45, -hd * 0.9, hd * 0.9), baseH + 1.8, baseH + 3.6, () => 'roof', 'roof', b.id);

  // 2. Front bell tower spire & cross finial
  const spirePos = localPt(ob, 0, -hd * 0.78);
  const spireW = Math.min(3.2, hw * 0.42);
  const spireRing = localRect({ c: spirePos, u: ob.u, v: ob.v, hw: spireW, hd: spireW }, -spireW, spireW, -spireW, spireW);
  B.solid(spireRing, 0, baseH + 8.5, () => 'wall', 'roof', b.id);
  B.solid(regPoly(spirePos, spireW * 0.95, 8), baseH + 8.5, baseH + 12.2, () => 'roof', 'roof', b.id);
  B.solid(regPoly(spirePos, spireW * 0.42, 8), baseH + 12.2, baseH + 15.0, () => 'metal', 'metal', b.id);
  B.line(V(spirePos[0], spirePos[1], baseH + 15.0), V(spirePos[0], spirePos[1], baseH + 17.6), 'crease');

  if (level >= 1) {
    addBandWindows(B, naveRing, 2.2, baseH - 1.2, lamp1, 2.4);
    addBandWindows(B, spireRing, baseH + 1.5, baseH + 7.2, lamp2, 1.8);
  }
}

// ============================================================================
// 35. KIẾN TRÚC LĂNG TẨM CỔ (Lăng Hoàng Cao Khải, Lăng Hoàng Trọng Phu…)
// ============================================================================
function drawTraditionalMausoleum(B: Batch, b: Building, level: Detail) {
  const ob = orientedBoxOf(b.footprint, b.front);
  const hw = Math.max(3.2, ob.hw), hd = Math.max(3.2, ob.hd);
  const lamp1 = floorId(b, 1);

  B.solid(localRect(ob, -hw - 1.2, hw + 1.2, -hd - 1.2, hd + 1.2), 0, 0.65, () => 'wall', 'walk', b.id);
  const tombRing = localRect(ob, -hw * 0.85, hw * 0.85, -hd * 0.85, hd * 0.85);
  B.solid(tombRing, 0.65, 4.2, () => 'wall', 'roof', b.id);
  if (level >= 1) addBandWindows(B, tombRing, 1.4, 3.6, lamp1, 2.2);
  drawTraditionalCurvedRoof(B, ob, hw, hd, 4.1, 2.1, b.id, true);
}

// ============================================================================
// 36. BESPOKE 3D MONUMENT & HERITAGE STATUES (Tượng đài Lý Thái Tổ, Quang Trung, Lê-nin, B52…)
// ============================================================================
export function drawMonumentFeature(B: Batch, f: Feature) {
  const [x, y] = f.at;
  const name = f.name ?? '';
  const oct = (cx: number, cy: number, r: number, n = 8, rot = Math.PI / 8): Vec2[] =>
    Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (i * 2 * Math.PI) / n), cy + r * Math.sin(rot + (i * 2 * Math.PI) / n)]);
  const box = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [
    [x + x0, y + y0],
    [x + x1, y + y0],
    [x + x1, y + y1],
    [x + x0, y + y1],
  ];

  // Case A: Tượng đài Hoàng đế Quang Trung (Gò Đống Đa) — grand stepped plaza, curved heroic relief wall & tall statue
  if (/Quang Trung/i.test(name)) {
    B.solid(oct(x, y, 11.5, 12), 0, 0.65, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 8.6, 12), 0.65, 1.45, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 5.8, 12), 1.45, 2.35, () => 'wall', 'walk', f.id);
    // Curved heroic bas-relief wall (Bức phù điêu chiến thắng Đống Đa) behind the statue
    for (let k = -3; k <= 3; k++) {
      const ang = Math.PI * 0.5 + k * 0.24;
      const rx = x + Math.cos(ang) * 6.8, ry = y + Math.sin(ang) * 6.8;
      B.solid(oct(rx, ry, 1.35, 6), 2.35, 7.6 - Math.abs(k) * 0.45, () => 'wall', 'roof', f.id);
    }
    // Tall granite pedestal & heroic Emperor Quang Trung statue with flowing cloak
    B.solid(box(-2.1, -2.1, 2.1, 2.1), 2.35, 7.4, () => 'wall', 'roof', f.id);
    B.solid(box(-1.5, -1.2, 1.5, 1.2), 7.4, 11.8, () => 'metal', 'metal', f.id);
    B.solid(oct(x, y, 0.72, 8), 11.8, 13.6, () => 'metal', 'metal', f.id);
    return;
  }

  // Case B: Tượng đài Vua Lý Thái Tổ (Vườn hoa Lý Thái Tổ bên Hồ Hoàn Kiếm) — 3-stepped octagonal stone plaza, tall octagonal pedestal & Emperor Lý Thái Tổ holding the Chiếu dời đô scroll
  if (/Lý Thái Tổ/i.test(name)) {
    B.solid(oct(x, y, 9.8, 8), 0, 0.6, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 7.2, 8), 0.6, 1.25, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 4.8, 8), 1.25, 1.95, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 2.2, 8), 1.95, 5.4, () => 'wall', 'roof', f.id);
    B.solid(oct(x, y, 2.45, 8), 5.2, 5.75, () => 'metal', 'metal', f.id);
    // Bronze statue of King Lý Thái Tổ in imperial dragon robe holding the "Chiếu dời đô" scroll (total height ~10.1 m)
    B.solid(oct(x, y, 1.25, 8), 5.75, 9.4, () => 'metal', 'metal', f.id);
    B.solid(box(-1.35, -0.85, 1.35, 0.85), 7.2, 9.8, () => 'metal', 'metal', f.id);
    B.solid(oct(x, y, 0.62, 8), 9.8, 11.2, () => 'metal', 'metal', f.id);
    return;
  }

  // Case C: Xác máy bay B52 (Hồ Hữu Tiệp – Ngọc Hà)
  if (/B52/i.test(name)) {
    B.flat('water', oct(x, y, 6.5, 12), 0.08, 'detail', f.id);
    B.solid(box(-4.2, -0.85, 4.2, 0.85), 0.1, 2.4, () => 'metal', 'metal', f.id);
    B.solid(box(-1.1, -4.8, 1.1, 4.8), 0.1, 1.55, () => 'metal', 'metal', f.id);
    B.solid(box(2.4, -0.35, 3.8, 0.35), 2.4, 4.6, () => 'metal', 'metal', f.id);
    return;
  }

  // Case D: Trống đồng Đông Sơn (Bronze Drum monument)
  if (/Trống đồng/i.test(name)) {
    B.solid(oct(x, y, 4.2, 12), 0, 0.65, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 2.4, 16), 0.65, 3.4, () => 'metal', 'metal', f.id);
    B.solid(oct(x, y, 2.75, 16), 2.6, 3.65, () => 'metal', 'metal', f.id);
    return;
  }

  // Case E: Iconic Bronze Statues (V.I. Lê-nin, Lý Tự Trọng, Chu Văn An, Chủ tịch Hồ Chí Minh, Huyền Thiên Trấn Vũ, Cảm Tử…)
  if (f.kind === 'monument') {
    B.solid(oct(x, y, 6.2, 8), 0, 0.55, () => 'wall', 'walk', f.id);
    B.solid(oct(x, y, 4.4, 8), 0.55, 1.25, () => 'wall', 'walk', f.id);
    B.solid(box(-1.85, -1.85, 1.85, 1.85), 1.25, 2.2, () => 'wall', 'roof', f.id);
    // Tall granite plinth
    B.solid(box(-1.35, -1.35, 1.35, 1.35), 2.2, 5.8, () => 'wall', 'roof', f.id);
    B.solid(box(-1.55, -1.55, 1.55, 1.55), 5.6, 6.05, () => 'metal', 'metal', f.id);
    // Sculpted bronze statue figure (legs/robe, torso/shoulders, head)
    B.solid(oct(x, y, 0.92, 8), 6.05, 8.6, () => 'metal', 'metal', f.id);
    B.solid(box(-1.05, -0.65, 1.05, 0.65), 7.4, 9.2, () => 'metal', 'metal', f.id);
    B.solid(oct(x, y, 0.48, 8), 9.2, 10.1, () => 'metal', 'metal', f.id);
    return;
  }

  // Case F: Heritage / Archaeological Stelae & Ruins (Đàn Xã Tắc, Rồng đá Điện Kính Thiên, Ô Thụy Chương)
  B.solid(oct(x, y, 5.4, 8), 0, 0.55, () => 'wall', 'walk', f.id);
  B.solid(oct(x, y, 3.6, 8), 0.55, 1.35, () => 'wall', 'walk', f.id);
  B.solid(box(-1.6, -0.65, 1.6, 0.65), 1.35, 3.6, () => 'wall', 'roof', f.id);
  B.solid(box(-1.9, -0.95, 1.9, 0.95), 3.6, 4.35, () => 'roof', 'roof', f.id);
}

export type { Surface };

