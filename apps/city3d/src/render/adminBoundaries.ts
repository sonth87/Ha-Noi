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
  subtitle?: string;
  /** Center point [x, y] in city metres where the label is anchored */
  center: Vec2;
  /** Closed polygon vertices [x, y] in city metres */
  polygon: readonly Vec2[];
}

/** 15 Phường administrative boundaries covering Hoàn Kiếm, Tây Hồ, Ba Đình, Đống Đa, Hai Bà Trưng, and Thanh Xuân */
export const WARD_BOUNDARIES: readonly AdminBoundaryDef[] = [
  // ── Khu vực Hoàn Kiếm ──
  {
    id: 'ward:hoan-kiem',
    name: 'Phường Hoàn Kiếm',
    subtitle: 'Hồ Gươm · Phố cổ · Nhà hát Lớn',
    center: [3650, 1650],
    polygon: [
      [2880, 550], [4680, 550], [4680, 2680], [2350, 2680], [2350, 1680], [2880, 1680],
    ],
  },
  {
    id: 'ward:cua-nam',
    name: 'Phường Cửa Nam',
    subtitle: 'Quán Sứ · Hỏa Lò · Tràng Thi',
    center: [2615, 1115],
    polygon: [
      [2350, 550], [2880, 550], [2880, 1680], [2350, 1680],
    ],
  },
  // ── Khu vực Tây Hồ ──
  {
    id: 'ward:tay-ho',
    name: 'Phường Tây Hồ',
    subtitle: 'Hồ Tây · Chùa Trấn Quốc · Phủ Tây Hồ',
    center: [4950, -2550],
    polygon: [
      [3550, -4720], [6480, -4720], [6480, -450], [3550, -450],
    ],
  },
  // ── Khu vực Ba Đình ──
  {
    id: 'ward:ba-dinh',
    name: 'Phường Ba Đình',
    subtitle: 'Quảng trường Ba Đình · Lăng Bác · Hoàng thành',
    center: [3320, -300],
    polygon: [
      [2550, -1150], [4120, -1150], [4120, 550], [2550, 550],
    ],
  },
  {
    id: 'ward:ngoc-ha',
    name: 'Phường Ngọc Hà',
    subtitle: 'Ngọc Hà · Đội Cấn · Bách Thảo',
    center: [2820, -1950],
    polygon: [
      [2100, -2800], [3550, -2800], [3550, -1150], [2100, -1150],
    ],
  },
  {
    id: 'ward:giang-vo',
    name: 'Phường Giảng Võ',
    subtitle: 'Giảng Võ · Kim Mã · Liễu Giai',
    center: [1720, -1650],
    polygon: [
      [1350, -2800], [2100, -2800], [2100, -1150], [2550, -1150], [2550, -650], [1680, -650], [1680, -1150], [1350, -1150],
    ],
  },
  // ── Khu vực Đống Đa ──
  {
    id: 'ward:van-mieu',
    name: 'Phường Văn Miếu – Quốc Tử Giám',
    subtitle: 'Văn Miếu · Khuê Văn Các · Tôn Đức Thắng',
    center: [2100, -50],
    polygon: [
      [1650, -650], [2550, -650], [2550, 550], [1650, 550],
    ],
  },
  {
    id: 'ward:o-cho-dua',
    name: 'Phường Ô Chợ Dừa',
    subtitle: 'Ô Chợ Dừa · Hoàng Cầu · Hào Nam',
    center: [1085, -270],
    polygon: [
      [520, -720], [1650, -720], [1650, 180], [520, 180],
    ],
  },
  {
    id: 'ward:dong-da',
    name: 'Phường Đống Đa',
    subtitle: 'Ngã tư Thái Hà – Tây Sơn · Gò Đống Đa',
    center: [-150, -200],
    polygon: [
      [-820, -720], [520, -720], [520, 320], [-820, 320],
    ],
  },
  {
    id: 'ward:kim-lien',
    name: 'Phường Kim Liên',
    subtitle: 'Chùa Bộc · Phạm Ngọc Thạch · Phương Mai',
    center: [750, 720],
    polygon: [
      [-150, 320], [520, 320], [520, 180], [1650, 180], [1650, 550], [2350, 550], [2350, 1120], [-150, 1120],
    ],
  },
  {
    id: 'ward:lang',
    name: 'Phường Láng',
    subtitle: 'Láng Hạ · Đường Láng · Nguyễn Chí Thanh',
    center: [250, -1300],
    polygon: [
      [-820, -1860], [1350, -1860], [1350, -1150], [1680, -1150], [1680, -720], [-820, -720],
    ],
  },
  // ── Khu vực Hai Bà Trưng ──
  {
    id: 'ward:hai-ba-trung',
    name: 'Phường Hai Bà Trưng',
    subtitle: 'Công viên Thống Nhất · Bà Triệu · Đền Hai Bà Trưng',
    center: [1850, 1850],
    polygon: [
      [-150, 1120], [2350, 1120], [2350, 2680], [3080, 2680], [3080, 3620], [1350, 3620], [1350, 1950], [-150, 1950],
    ],
  },
  {
    id: 'ward:bach-mai',
    name: 'Phường Bạch Mai',
    subtitle: 'Bạch Mai · Đại học Bách Khoa · Giải Phóng',
    center: [600, 2780],
    polygon: [
      [-150, 1950], [1350, 1950], [1350, 3620], [-150, 3620],
    ],
  },
  // ── Khu vực Thanh Xuân ──
  {
    id: 'ward:thanh-xuan',
    name: 'Phường Thanh Xuân',
    subtitle: 'Nguyễn Trãi · Ngã Tư Sở · Nhân Chính',
    center: [-1950, -880],
    polygon: [
      [-3080, -1630], [-820, -1630], [-820, -120], [-3080, -120],
    ],
  },
  {
    id: 'ward:khuong-dinh',
    name: 'Phường Khương Đình',
    subtitle: 'Royal City · Khương Trung · Khương Hạ',
    center: [-1650, 415],
    polygon: [
      [-3080, -120], [-820, -120], [-820, 320], [-150, 320], [-150, 930], [-3080, 930],
    ],
  },
];

/** Outer boundary of Hanoi enclosing the 6 central districts */
export const HANOI_OUTER_BOUNDARY: AdminBoundaryDef = {
  id: 'city:ha-noi',
  name: 'Hà Nội',
  subtitle: 'Thủ đô ngàn năm văn hiến · Hoàn Kiếm · Tây Hồ · Ba Đình · Đống Đa · Hai Bà Trưng · Thanh Xuân',
  center: [1750, -350],
  polygon: [
    [-3080, -1630],
    [-820, -1630],
    [-820, -1860],
    [1350, -1860],
    [1350, -2800],
    [3550, -2800],
    [3550, -4720],
    [6480, -4720],
    [6480, -450],
    [4120, -450],
    [4120, 550],
    [4680, 550],
    [4680, 2680],
    [3080, 2680],
    [3080, 3620],
    [-150, 3620],
    [-150, 930],
    [-3080, 930],
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
