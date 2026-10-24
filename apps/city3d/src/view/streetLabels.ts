/* Street name labels (two display modes + off):
   - 'off': hidden;
   - 'map': Google Maps / OpenStreetMap style — street names placed along the road segments, rotated
            to follow the street direction on screen, de-collided and filtered by zoom level;
   - 'pin': Callout pole style ("Thái Hà / | / o") — a base node 'o' on the road surface, a vertical
            leader line '|', and an info badge on top. Only a few major streets are shown at once for
            the current zoom level, and hovering a pin emits concentric signal pulses around the foot
            of the pole ('o'). */
import { closestOnSegment, dist, polylineLength, streetZ, type City, type Street, type Vec2 } from '@my-city/core';

export type StreetLabelMode = 'off' | 'map' | 'pin';

export const STREET_LABEL_MODES: StreetLabelMode[] = ['pin', 'map', 'off'];

export const STREET_LABEL_NAMES: Record<StreetLabelMode, string> = {
  pin: 'Cột ghim (Callout)',
  map: 'Dọc đường (Bản đồ)',
  off: 'Ẩn',
};

export interface StreetSample {
  /** position [x, y, z] in city metres */
  at: [number, number, number];
  /** unit tangent [ux, uy] along the street at this sample */
  dir: [number, number];
}

export interface StreetEntry {
  id: string;
  name: string;
  shortName: string;
  kindLabel: string;
  info: string;
  kind: Street['kind'];
  tier: 1 | 2 | 3 | 4;
  minPxPerMetre: number;
  stemHeightPx: number;
  totalLength: number;
  lanes: number;
  width: number;
  bridge: boolean;
  /** candidate anchor samples along the street (midpoint of longest segment first, then spaced samples) */
  samples: StreetSample[];
}

export interface ProjectedStreetLabel {
  id: string;
  name: string;
  shortName: string;
  kindLabel: string;
  info: string;
  tier: 1 | 2 | 3 | 4;
  stemHeightPx: number;
  /** city coordinates [x, y] of the chosen sample */
  world: [number, number];
  /** screen coordinates (px from top-left of stage) of the base point on the street */
  x: number;
  y: number;
  /** screen angle in degrees in [-90, 90] for 'map' mode */
  angleDeg: number;
}

const KIND_LABELS: Record<Street['kind'], string> = {
  primary: 'Trục chính',
  secondary: 'Phố lớn',
  tertiary: 'Phố',
  link: 'Nhánh nối',
  residential: 'Phố dân cư',
  service: 'Đường nội bộ',
  alley: 'Ngõ phố',
  footway: 'Lối đi bộ',
  steps: 'Bậc thang',
};

const TIER_1_STREETS = new Set([
  'Phố Thái Hà',
  'Phố Tây Sơn',
  'Phố Chùa Bộc',
  'Phố Láng Hạ',
  'Phố Nguyễn Lương Bằng',
  'Phố Xã Đàn',
  'Phố Tôn Đức Thắng',
  'Phố Khâm Thiên',
  'Phố Hoàng Cầu',
  'Phố Huỳnh Thúc Kháng',
  'Phố Phạm Ngọc Thạch',
  'Phố Tôn Thất Tùng',
  'Đường Trường Chinh',
  'Đường Láng',
  'Phố Giảng Võ',
  'Phố Cát Linh',
  'Cầu vượt Tây Sơn',
  // Quận Ba Đình main arteries
  'Phố Kim Mã',
  'Phố Liễu Giai',
  'Đường Nguyễn Chí Thanh',
  'Phố Đội Cấn',
  'Đường Điện Biên Phủ',
  'Đường Trần Phú',
  'Phố Nguyễn Thái Học',
  'Phố Hoàng Hoa Thám',
  'Phố Phan Đình Phùng',
  'Đường Thanh Niên',
  'Đường Hoàng Diệu',
  'Đường Độc Lập',
  'Đường Hùng Vương',
  'Phố Văn Cao',
  'Đường Bưởi',
  // Khu vực Hoàn Kiếm main arteries
  'Phố Tràng Thi',
  'Phố Tràng Tiền',
  'Phố Hàng Bài',
  'Phố Hàng Đào',
  'Phố Hàng Ngang',
  'Phố Hàng Đường',
  'Phố Hai Bà Trưng',
  'Phố Lý Thường Kiệt',
  'Phố Trần Hưng Đạo',
  'Phố Phan Chu Trinh',
  'Phố Quán Sứ',
  'Phố Lê Thái Tổ',
  'Phố Đinh Tiên Hoàng',
  'Đường Trần Quang Khải',
  'Đường Trần Nhật Duật',
  // Khu vực Tây Hồ main arteries
  'Đường Lạc Long Quân',
  'Đường Âu Cơ',
  'Đường Nghi Tàm',
  'Đường Yên Phụ',
  'Đường Võ Chí Công',
  'Đường Thụy Khuê',
  'Phố Nguyễn Đình Thi',
  'Phố Trích Sài',
  'Đường Xuân Diệu',
  // Khu vực Hai Bà Trưng main arteries
  'Phố Bà Triệu',
  'Phố Huế',
  'Đường Đại Cồ Việt',
  'Đường Giải Phóng',
  'Phố Bạch Mai',
  'Phố Minh Khai',
  'Phố Đại La',
  'Đường Trần Khát Chân',
  'Phố Lò Đúc',
  'Phố Kim Ngưu',
  'Phố Lê Duẩn',
  // Khu vực Thanh Xuân main arteries
  'Đường Nguyễn Trãi',
  'Đường Khuất Duy Tiến',
  'Đường Lê Văn Lương',
  'Phố Vũ Trọng Phụng',
  'Phố Nguyễn Tuân',
  'Đường Hoàng Đạo Thúy',
  'Phố Quan Nhân',
  'Phố Khương Trung',
  'Phố Khương Đình',
]);

function stripPrefix(name: string): string {
  const cleaned = name.replace(/^(Phố|Đường)\s+/u, '').trim();
  return cleaned.length >= 3 ? cleaned : name;
}

function formatLength(m: number): string {
  return m >= 950 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m / 10) * 10} m`;
}

/** Point and unit direction at distance `target` along a polyline */
function samplePolyline(path: readonly Vec2[], target: number): { pt: Vec2; dir: [number, number] } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, segL = dist(a, b);
    if (segL <= 1e-4) continue;
    if (acc + segL >= target || i === path.length - 1) {
      const t = Math.max(0, Math.min(1, (target - acc) / segL));
      return {
        pt: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        dir: [(b[0] - a[0]) / segL, (b[1] - a[1]) / segL],
      };
    }
    acc += segL;
  }
  const a = path[0]!, b = path[path.length - 1]!, d = Math.max(1e-4, dist(a, b));
  return { pt: a, dir: [(b[0] - a[0]) / d, (b[1] - a[1]) / d] };
}

/** Build the catalog of named streets from the City model once */
export function buildStreetCatalog(city: City): StreetEntry[] {
  const byName = new Map<string, Street[]>();
  for (const s of city.streets) {
    const name = s.name?.trim();
    if (!name || s.kind === 'footway' || s.kind === 'steps' || s.kind === 'link') continue;
    const list = byName.get(name);
    if (list) list.push(s);
    else byName.set(name, [s]);
  }

  const rankOf = (k: Street['kind']): number =>
    k === 'primary' ? 5 : k === 'secondary' ? 4 : k === 'tertiary' ? 3 : k === 'residential' ? 2 : k === 'service' ? 1 : 0;

  const entries: StreetEntry[] = [];
  for (const [name, segs] of byName) {
    const totalLength = segs.reduce((sum, s) => sum + polylineLength(s.path), 0);
    if (totalLength < 28) continue;

    const bestSeg = [...segs].sort((a, b) => rankOf(b.kind) - rankOf(a.kind) || polylineLength(b.path) - polylineLength(a.path))[0]!;
    const kind = bestSeg.kind;
    const bridge = segs.some(s => s.layer > 0);
    const lanes = Math.max(...segs.map(s => s.lanes));
    const width = Math.round(Math.max(...segs.map(s => s.width)));

    let tier: 1 | 2 | 3 | 4;
    if (TIER_1_STREETS.has(name) || (kind === 'primary' && totalLength >= 180) || bridge) {
      tier = 1;
    } else if (kind === 'secondary' || (kind === 'tertiary' && totalLength >= 160)) {
      tier = 2;
    } else if (kind !== 'alley') {
      tier = 3;
    } else {
      tier = 4;
    }

    const minPxPerMetre = tier === 1 ? 0 : tier === 2 ? 1.25 : tier === 3 ? 3.2 : 6.0;
    const stemHeightPx = tier === 1 ? 42 : tier === 2 ? 34 : 28;
    const kindLabel = bridge ? 'Cầu vượt' : KIND_LABELS[kind];
    const shortName = bridge ? name : stripPrefix(name);
    // Concise info without verbose "Phố lớn / Trục chính" prefix
    const info = `${formatLength(totalLength)} · ${lanes} làn (${width}m)`;

    const sortedByLen = [...segs].sort((a, b) => polylineLength(b.path) - polylineLength(a.path));
    const samples: StreetSample[] = [];
    const addSample = (s: Street, dAlong: number) => {
      const { pt, dir } = samplePolyline(s.path, dAlong);
      if (samples.some(x => Math.hypot(x.at[0] - pt[0], x.at[1] - pt[1]) < 95)) return;
      const z = Math.max(0.08, streetZ(s, dAlong));
      samples.push({ at: [pt[0], pt[1], z], dir });
    };

    let sumX = 0, sumY = 0, sumW = 0;
    for (const s of segs) {
      const L = polylineLength(s.path);
      const { pt } = samplePolyline(s.path, L / 2);
      sumX += pt[0] * L; sumY += pt[1] * L; sumW += L;
    }
    const centerPt: Vec2 = sumW > 0 ? [sumX / sumW, sumY / sumW] : sortedByLen[0]!.path[0]!;
    let bestCenterSeg = sortedByLen[0]!, bestCenterAlong = polylineLength(bestCenterSeg.path) / 2, bestCenterDist = Infinity;
    for (const s of sortedByLen) {
      const L = polylineLength(s.path);
      if (L < 18) continue;
      let acc = 0;
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1]!, b = s.path[i]!, segL = dist(a, b);
        const c = closestOnSegment(centerPt, a, b);
        if (c.d < bestCenterDist) {
          bestCenterDist = c.d;
          bestCenterSeg = s;
          bestCenterAlong = Math.max(Math.min(18, L * 0.3), Math.min(L - Math.min(18, L * 0.3), acc + c.t * segL));
        }
        acc += segL;
      }
    }
    addSample(bestCenterSeg, bestCenterAlong);

    for (const s of sortedByLen) {
      const L = polylineLength(s.path);
      if (L < 35) continue;
      if (L >= 260) {
        const count = Math.min(5, Math.floor(L / 180));
        for (let k = 1; k <= count; k++) addSample(s, (L * k) / (count + 1));
      } else {
        addSample(s, L * 0.5);
      }
    }

    entries.push({
      id: `lbl:${bestSeg.id}`,
      name,
      shortName,
      kindLabel,
      info,
      kind,
      tier,
      minPxPerMetre,
      stemHeightPx,
      totalLength,
      lanes,
      width,
      bridge,
      samples,
    });
  }

  // Sort by tier (1 first), then by totalLength descending
  return entries.sort((a, b) => a.tier - b.tier || b.totalLength - a.totalLength || a.name.localeCompare(b.name, 'vi'));
}

/** Select and de-collide visible street labels for the current viewport and mode */
export function selectVisibleStreetLabels(
  catalog: readonly StreetEntry[],
  mode: StreetLabelMode,
  pxPerMetre: number,
  widthPx: number,
  heightPx: number,
  targetWorld: [number, number],
  project: (world: [number, number, number]) => { x: number; y: number; visible: boolean },
  avoidBoxes?: readonly { x: number; y: number; halfW: number; halfH: number }[],
): ProjectedStreetLabel[] {
  if (mode === 'off' || widthPx <= 0 || heightPx <= 0) return [];

  const padX = mode === 'pin' ? 62 : 44;
  const padTop = mode === 'pin' ? 78 : 34;
  const padBottom = mode === 'pin' ? 32 : 32;
  const inBounds = (x: number, y: number) =>
    x >= padX && x <= widthPx - padX && y >= padTop && y <= heightPx - padBottom;
  const hitsAvoidBox = (x: number, y: number, halfW: number, halfH: number) =>
    avoidBoxes?.some(b => Math.abs(x - b.x) < halfW + b.halfW && Math.abs(y - b.y) < halfH + b.halfH) ?? false;

  if (mode === 'pin') {
    const maxPins = pxPerMetre < 1.5 ? 7 : pxPerMetre < 3.0 ? 11 : pxPerMetre < 5.5 ? 15 : 19;
    const minDistPx = pxPerMetre < 1.5 ? 140 : pxPerMetre < 3.0 ? 120 : 100;
    const candidates: (ProjectedStreetLabel & { score: number })[] = [];

    for (const e of catalog) {
      if (pxPerMetre < e.minPxPerMetre) continue;
      let bestSample: StreetSample | null = null;
      let bestProj: { x: number; y: number } | null = null;
      let bestDist = Infinity;

      for (const s of e.samples) {
        const p = project(s.at);
        if (!p.visible || !inBounds(p.x, p.y)) continue;
        if (hitsAvoidBox(p.x, p.y - e.stemHeightPx * 0.5, 56, e.stemHeightPx * 0.5 + 16)) continue;
        const d = Math.hypot(s.at[0] - targetWorld[0], s.at[1] - targetWorld[1]);
        if (d < bestDist) {
          bestDist = d;
          bestSample = s;
          bestProj = p;
        }
      }
      if (!bestSample || !bestProj) continue;

      const score = (5 - e.tier) * 10000 + Math.min(3000, e.totalLength) - bestDist * 1.2;
      candidates.push({
        id: e.id,
        name: e.name,
        shortName: e.shortName,
        kindLabel: e.kindLabel,
        info: e.info,
        tier: e.tier,
        stemHeightPx: e.stemHeightPx,
        world: [bestSample.at[0], bestSample.at[1]],
        x: bestProj.x,
        y: bestProj.y,
        angleDeg: 0,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen: ProjectedStreetLabel[] = [];
    for (const c of candidates) {
      if (chosen.length >= maxPins) break;
      const collides = chosen.some(o => {
        const baseClose = Math.hypot(c.x - o.x, c.y - o.y) < minDistPx;
        const badgeClose = Math.abs(c.x - o.x) < 116 && Math.abs((c.y - c.stemHeightPx) - (o.y - o.stemHeightPx)) < 44;
        return baseClose || badgeClose;
      });
      if (!collides) chosen.push(c);
    }
    return chosen;
  }

  // 'map' mode (Google Maps / OpenStreetMap style along the street)
  const maxLabels = pxPerMetre < 0.8 ? 20 : pxPerMetre < 1.5 ? 16 : pxPerMetre < 3.2 ? 26 : 38;
  const chosen: ProjectedStreetLabel[] = [];

  for (const e of catalog) {
    const minPx = e.tier <= 2 ? 0 : e.minPxPerMetre;
    if (pxPerMetre < minPx) continue;
    let placedForStreet = 0;
    const maxPerStreet = e.tier === 1 && pxPerMetre >= 2.2 ? 2 : 1;

    for (let idx = 0; idx < e.samples.length; idx++) {
      if (placedForStreet >= maxPerStreet || chosen.length >= maxLabels) break;
      const s = e.samples[idx]!;
      const p0 = project(s.at);
      if (!p0.visible || !inBounds(p0.x, p0.y)) continue;
      if (hitsAvoidBox(p0.x, p0.y, 48, 20)) continue;

      const p1 = project([s.at[0] + s.dir[0] * 10, s.at[1] + s.dir[1] * 10, s.at[2]]);
      let angleDeg = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      if (angleDeg > 90) angleDeg -= 180;
      if (angleDeg < -90) angleDeg += 180;

      const minGap = placedForStreet > 0 ? 220 : pxPerMetre < 0.5 ? 86 : 102;
      const collides = chosen.some(o => Math.hypot(p0.x - o.x, p0.y - o.y) < (o.name === e.name ? 220 : minGap));
      if (collides) continue;

      chosen.push({
        id: `${e.id}:${idx}`,
        name: e.name,
        shortName: e.shortName,
        kindLabel: e.kindLabel,
        info: e.info,
        tier: e.tier,
        stemHeightPx: 0,
        world: [s.at[0], s.at[1]],
        x: p0.x,
        y: p0.y,
        angleDeg: Math.round(angleDeg * 10) / 10,
      });
      placedForStreet++;
    }
  }

  return chosen;
}

