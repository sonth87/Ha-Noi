/* Administrative boundaries & centered labels for Hanoi wards (Phường) and the city as a whole (Hà Nội).
   - At ward-viewing zoom levels (0.26 <= zoom <= 1.45): renders dashed ward boundary lines on the ground
     plane and places each Phường's name centered inside its territory.
   - At far city-wide zoom levels (zoom < 0.26): renders the outer boundary of Hà Nội and places the
     "Hà Nội" title centered in the middle of the map. */
import type { Vec2 } from '@my-city/core';

export type AdminBoundaryMode = 'off' | 'ward' | 'city';

export interface AdminBoundaryDef {
  id: string;
  name: string;
  /** Center point [x, y] in city metres where the label is anchored */
  center: Vec2;
  /** Closed polygon vertices [x, y] in city metres */
  polygon: readonly Vec2[];
}

/** 43 Phường administrative boundaries (official 2025 Hanoi ward arrangement) covering:
    Hoàn Kiếm, Tây Hồ, Ba Đình, Đống Đa, Hai Bà Trưng, Thanh Xuân, Cầu Giấy,
    Nam Từ Liêm, Bắc Từ Liêm, Hà Đông, Hoàng Mai, and Long Biên */
export const WARD_BOUNDARIES: readonly AdminBoundaryDef[] = [
  // ── Khu vực Hoàn Kiếm (2 phường) ──
  {
    id: 'ward:hoan-kiem',
    name: 'Phường Hoàn Kiếm',
    center: [3650, 1650],
    polygon: [
      [2880, 550], [4680, 550], [4680, 2680], [2350, 2680], [2350, 1680], [2880, 1680],
    ],
  },
  {
    id: 'ward:cua-nam',
    name: 'Phường Cửa Nam',
    center: [2615, 1115],
    polygon: [
      [2350, 550], [2880, 550], [2880, 1680], [2350, 1680],
    ],
  },
  // ── Khu vực Tây Hồ (2 phường) ──
  {
    id: 'ward:tay-ho',
    name: 'Phường Tây Hồ',
    center: [4950, -2550],
    polygon: [
      [3550, -4720], [6480, -4720], [6480, -450], [3550, -450],
    ],
  },
  {
    id: 'ward:phu-thuong',
    name: 'Phường Phú Thượng',
    center: [5520, -6250],
    polygon: [
      [3550, -7800], [7500, -7800], [7500, -4720], [3550, -4720],
    ],
  },
  // ── Khu vực Ba Đình (3 phường) ──
  {
    id: 'ward:ba-dinh',
    name: 'Phường Ba Đình',
    center: [3320, -300],
    polygon: [
      [2550, -1150], [4120, -1150], [4120, 550], [2550, 550],
    ],
  },
  {
    id: 'ward:ngoc-ha',
    name: 'Phường Ngọc Hà',
    center: [2820, -1950],
    polygon: [
      [2100, -2800], [3550, -2800], [3550, -1150], [2100, -1150],
    ],
  },
  {
    id: 'ward:giang-vo',
    name: 'Phường Giảng Võ',
    center: [1720, -1650],
    polygon: [
      [1350, -2800], [2100, -2800], [2100, -1150], [2550, -1150], [2550, -650], [1680, -650], [1680, -1150], [1350, -1150],
    ],
  },
  // ── Khu vực Đống Đa (5 phường) ──
  {
    id: 'ward:van-mieu',
    name: 'Phường Văn Miếu – Quốc Tử Giám',
    center: [2100, -50],
    polygon: [
      [1650, -650], [2550, -650], [2550, 550], [1650, 550],
    ],
  },
  {
    id: 'ward:o-cho-dua',
    name: 'Phường Ô Chợ Dừa',
    center: [1085, -270],
    polygon: [
      [520, -720], [1650, -720], [1650, 180], [520, 180],
    ],
  },
  {
    id: 'ward:dong-da',
    name: 'Phường Đống Đa',
    center: [-150, -200],
    polygon: [
      [-820, -720], [520, -720], [520, 320], [-820, 320],
    ],
  },
  {
    id: 'ward:kim-lien',
    name: 'Phường Kim Liên',
    center: [750, 720],
    polygon: [
      [-150, 320], [520, 320], [520, 180], [1650, 180], [1650, 550], [2350, 550], [2350, 1120], [-150, 1120],
    ],
  },
  {
    id: 'ward:lang',
    name: 'Phường Láng',
    center: [250, -1300],
    polygon: [
      [-820, -1860], [1350, -1860], [1350, -1150], [1680, -1150], [1680, -720], [-820, -720],
    ],
  },
  // ── Khu vực Hai Bà Trưng (2 phường) ──
  {
    id: 'ward:hai-ba-trung',
    name: 'Phường Hai Bà Trưng',
    center: [1850, 1850],
    polygon: [
      [-150, 1120], [2350, 1120], [2350, 2680], [3080, 2680], [3080, 3620], [1350, 3620], [1350, 1950], [-150, 1950],
    ],
  },
  {
    id: 'ward:bach-mai',
    name: 'Phường Bạch Mai',
    center: [600, 2780],
    polygon: [
      [-150, 1950], [1350, 1950], [1350, 3620], [-150, 3620],
    ],
  },
  // ── Khu vực Thanh Xuân (2 phường) ──
  {
    id: 'ward:thanh-xuan',
    name: 'Phường Thanh Xuân',
    center: [-1950, -880],
    polygon: [
      [-3080, -1630], [-820, -1630], [-820, -120], [-3080, -120],
    ],
  },
  {
    id: 'ward:khuong-dinh',
    name: 'Phường Khương Đình',
    center: [-1650, 415],
    polygon: [
      [-3080, -120], [-820, -120], [-820, 320], [-150, 320], [-150, 930], [-3080, 930],
    ],
  },
  // ── Khu vực Cầu Giấy (3 phường) ──
  {
    id: 'ward:nghia-do',
    name: 'Phường Nghĩa Đô',
    center: [2320, -3950],
    polygon: [
      [1350, -5200], [3550, -5200], [3550, -2800], [1350, -2800],
    ],
  },
  {
    id: 'ward:cau-giay',
    name: 'Phường Cầu Giấy',
    center: [440, -3550],
    polygon: [
      [-450, -5200], [1350, -5200], [1350, -1860], [-450, -1860],
    ],
  },
  {
    id: 'ward:yen-hoa',
    name: 'Phường Yên Hòa',
    center: [-1050, -3050],
    polygon: [
      [-1650, -4500], [-450, -4500], [-450, -1630], [-1650, -1630],
    ],
  },
  // ── Khu vực Nam Từ Liêm (4 phường) ──
  {
    id: 'ward:tu-liem',
    name: 'Phường Từ Liêm',
    center: [-1520, -5650],
    polygon: [
      [-2600, -6800], [-450, -6800], [-450, -4500], [-2600, -4500],
    ],
  },
  {
    id: 'ward:dai-mo',
    name: 'Phường Đại Mỗ',
    center: [-3120, -3060],
    polygon: [
      [-4600, -4500], [-1650, -4500], [-1650, -1630], [-4600, -1630],
    ],
  },
  {
    id: 'ward:tay-mo',
    name: 'Phường Tây Mỗ',
    center: [-3900, -6050],
    polygon: [
      [-5200, -7600], [-2600, -7600], [-2600, -4500], [-5200, -4500],
    ],
  },
  {
    id: 'ward:xuan-phuong',
    name: 'Phường Xuân Phương',
    center: [-1620, -8150],
    polygon: [
      [-2800, -9500], [-450, -9500], [-450, -6800], [-2800, -6800],
    ],
  },
  // ── Khu vực Bắc Từ Liêm (5 phường) ──
  {
    id: 'ward:xuan-dinh',
    name: 'Phường Xuân Đỉnh',
    center: [2700, -6500],
    polygon: [
      [1850, -7800], [3550, -7800], [3550, -5200], [1850, -5200],
    ],
  },
  {
    id: 'ward:phu-dien',
    name: 'Phường Phú Diễn',
    center: [700, -6700],
    polygon: [
      [-450, -8200], [1850, -8200], [1850, -5200], [-450, -5200],
    ],
  },
  {
    id: 'ward:dong-ngac',
    name: 'Phường Đông Ngạc',
    center: [4020, -9250],
    polygon: [
      [1850, -10800], [6200, -10800], [6200, -7800], [1850, -7800],
    ],
  },
  {
    id: 'ward:tay-tuu',
    name: 'Phường Tây Tựu',
    center: [700, -9650],
    polygon: [
      [-450, -11200], [1850, -11200], [1850, -8200], [-450, -8200],
    ],
  },
  {
    id: 'ward:thuong-cat',
    name: 'Phường Thượng Cát',
    center: [3320, -11700],
    polygon: [
      [1850, -12600], [4800, -12600], [4800, -10800], [1850, -10800],
    ],
  },
  // ── Khu vực Hà Đông (5 phường) ──
  {
    id: 'ward:ha-dong',
    name: 'Phường Hà Đông',
    center: [-4640, -1020],
    polygon: [
      [-6200, -2400], [-3080, -2400], [-3080, 350], [-6200, 350],
    ],
  },
  {
    id: 'ward:duong-noi',
    name: 'Phường Dương Nội',
    center: [-5900, -3950],
    polygon: [
      [-7400, -5600], [-4600, -5600], [-4600, -2400], [-7400, -2400],
    ],
  },
  {
    id: 'ward:yen-nghia',
    name: 'Phường Yên Nghĩa',
    center: [-8000, -3700],
    polygon: [
      [-9800, -5600], [-7400, -5600], [-7400, -2400], [-6200, -2400], [-6200, -1800], [-9800, -1800],
    ],
  },
  {
    id: 'ward:kien-hung',
    name: 'Phường Kiến Hưng',
    center: [-4940, 1100],
    polygon: [
      [-6800, 350], [-3080, 350], [-3080, 1850], [-6800, 1850],
    ],
  },
  {
    id: 'ward:phu-luong',
    name: 'Phường Phú Lương',
    center: [-8300, 25],
    polygon: [
      [-9800, -1800], [-6200, -1800], [-6200, 350], [-6800, 350], [-6800, 1850], [-9800, 1850],
    ],
  },
  // ── Khu vực Hoàng Mai (7 phường) ──
  {
    id: 'ward:dinh-cong',
    name: 'Phường Định Công',
    center: [-1960, 1890],
    polygon: [
      [-3080, 930], [-850, 930], [-850, 2850], [-3080, 2850],
    ],
  },
  {
    id: 'ward:tuong-mai',
    name: 'Phường Tương Mai',
    center: [50, 4150],
    polygon: [
      [-850, 3620], [950, 3620], [950, 4850], [-850, 4850],
    ],
  },
  {
    id: 'ward:vinh-hung',
    name: 'Phường Vĩnh Hưng',
    center: [2015, 4635],
    polygon: [
      [950, 3620], [3080, 3620], [3080, 5650], [950, 5650],
    ],
  },
  {
    id: 'ward:hoang-mai',
    name: 'Phường Hoàng Mai',
    center: [-450, 5500],
    polygon: [
      [-1850, 4850], [950, 4850], [950, 6150], [-1850, 6150],
    ],
  },
  {
    id: 'ward:hoang-liet',
    name: 'Phường Hoàng Liệt',
    center: [-3025, 4500],
    polygon: [
      [-4200, 2850], [-1850, 2850], [-1850, 6150], [-4200, 6150],
    ],
  },
  {
    id: 'ward:yen-so',
    name: 'Phường Yên Sở',
    center: [-725, 6875],
    polygon: [
      [-2400, 6150], [950, 6150], [950, 7600], [-2400, 7600],
    ],
  },
  {
    id: 'ward:linh-nam',
    name: 'Phường Lĩnh Nam',
    center: [2175, 6625],
    polygon: [
      [950, 5650], [3400, 5650], [3400, 7600], [950, 7600],
    ],
  },
  // ── Khu vực Long Biên (4 phường) ──
  {
    id: 'ward:bo-de',
    name: 'Phường Bồ Đề',
    center: [5940, 1100],
    polygon: [
      [4680, -1200], [7200, -1200], [7200, 3400], [4680, 3400],
    ],
  },
  {
    id: 'ward:long-bien',
    name: 'Phường Long Biên',
    center: [5650, 5000],
    polygon: [
      [4100, 3400], [7200, 3400], [7200, 6600], [4100, 6600],
    ],
  },
  {
    id: 'ward:viet-hung',
    name: 'Phường Việt Hưng',
    center: [8300, 1300],
    polygon: [
      [7200, -1200], [9400, -1200], [9400, 3800], [7200, 3800],
    ],
  },
  {
    id: 'ward:phuc-loi',
    name: 'Phường Phúc Lợi',
    center: [8300, 5500],
    polygon: [
      [7200, 3800], [9400, 3800], [9400, 7200], [7200, 7200],
    ],
  },
];

/** Outer boundary of Hanoi enclosing the 12 urban districts (43 Phường) */
export const HANOI_OUTER_BOUNDARY: AdminBoundaryDef = {
  id: 'city:ha-noi',
  name: 'Hà Nội',
  center: [500, -1800],
  polygon: [
    [-9800, -5600],
    [-7400, -5600],
    [-5200, -5600],
    [-5200, -7600],
    [-2800, -7600],
    [-2800, -9500],
    [-450, -9500],
    [-450, -11200],
    [1850, -11200],
    [1850, -12600],
    [4800, -12600],
    [4800, -10800],
    [6200, -10800],
    [6200, -7800],
    [7500, -7800],
    [7500, -4720],
    [6480, -4720],
    [6480, -1200],
    [9400, -1200],
    [9400, 7200],
    [7200, 7200],
    [7200, 6600],
    [4100, 6600],
    [3400, 7600],
    [-2400, 7600],
    [-2400, 6150],
    [-4200, 6150],
    [-4200, 2850],
    [-3080, 2850],
    [-3080, 1850],
    [-9800, 1850],
  ],
};

/** Progressive Google Maps-style semantic zoom stages as the user zooms out:
    - 'full' (zoom >= 0.65): All neighborhood houses, landmarks, alleys, sidewalks, trees, furniture, and traffic in viewport.
    - 'landmarks' (0.22 <= zoom < 0.65): Normal houses hidden; only major landmarks, iconic buildings, tall towers, Metro, and major streets.
    - 'streets' (0.048 <= zoom < 0.22): All buildings hidden; only major streets/avenues, lakes/parks, and ward (Phường) boundaries & names.
    - 'city' (zoom < 0.048, down to minZoom = 0.015): Streets and buildings hidden; only base geography (ground, lakes, major parks) and Hanoi outer boundary & name. */
export type MapZoomStage = 'full' | 'landmarks' | 'streets' | 'city';

export const ZOOM_STAGE_THRESHOLDS = {
  FULL_MIN_ZOOM: 0.65,
  LANDMARKS_MIN_ZOOM: 0.22,
  STREETS_MIN_ZOOM: 0.048,
  WARD_BOUNDARY_MAX_ZOOM: 1.25,
} as const;

export function mapZoomStage(zoom: number, isShowcase: boolean, isPov: boolean): MapZoomStage {
  if (isShowcase || isPov || zoom >= ZOOM_STAGE_THRESHOLDS.FULL_MIN_ZOOM) return 'full';
  if (zoom >= ZOOM_STAGE_THRESHOLDS.LANDMARKS_MIN_ZOOM) return 'landmarks';
  if (zoom >= ZOOM_STAGE_THRESHOLDS.STREETS_MIN_ZOOM) return 'streets';
  return 'city';
}

/** Determine which administrative boundary layer should be active at a given camera zoom */
export function adminBoundaryModeForZoom(zoom: number, isShowcase: boolean, isPov: boolean): AdminBoundaryMode {
  if (isShowcase || isPov || zoom > ZOOM_STAGE_THRESHOLDS.WARD_BOUNDARY_MAX_ZOOM) return 'off';
  if (zoom >= ZOOM_STAGE_THRESHOLDS.STREETS_MIN_ZOOM) return 'ward';
  return 'city';
}

/** Build deduplicated 3D line-segment positions [x0, z, y0, x1, z, y1, ...] for a list of boundary polygons.
    Long edges are subdivided so dashed line shaders or explicit dash segments render uniformly across the terrain. */
export function buildDashedBoundarySegments(
  defs: readonly AdminBoundaryDef[],
  zHeight = 0.55,
  dashLength = 26,
  gapLength = 16,
): number[] {
  const seenEdges = new Set<string>();
  const out: number[] = [];
  const step = dashLength + gapLength;

  for (const def of defs) {
    const poly = def.polygon;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      const k1 = `${Math.round(a[0])},${Math.round(a[1])}`;
      const k2 = `${Math.round(b[0])},${Math.round(b[1])}`;
      const edgeKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) continue;
      const ux = dx / len;
      const uy = dy / len;

      for (let d = 0; d < len; d += step) {
        const dEnd = Math.min(len, d + dashLength);
        if (dEnd - d < 2) break;
        const x0 = a[0] + ux * d;
        const y0 = a[1] + uy * d;
        const x1 = a[0] + ux * dEnd;
        const y1 = a[1] + uy * dEnd;
        out.push(x0, zHeight, y0, x1, zHeight, y1);
      }
    }
  }
  return out;
}
