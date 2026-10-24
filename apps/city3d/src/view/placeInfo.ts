/* Place / Building / Landmark / Park / Monument / Heritage Information System:
   Three display modes ('off', 'popup', 'label'):
     - 'off'   : Không hiện thông tin (hidden);
     - 'popup' : Kiểu Popup — hover shows a compact tooltip/banner, double-click opens a rich detail popup;
     - 'label' : Tên bên trên — floating badge above buildings, parks, lakes, monuments, and heritage
                 sites with the Place Name on top and Address text below; hover highlights/shows banner,
                 and double-click/click pin opens the rich detail popup.
   Pure & data-driven: reads descriptions, districts, station lines, and landmark flags from the City model. */
import { area as ringArea, bbox, buildingHeight, buildingLevels, centroid, polylineLength, type Building, type City } from '@my-city/core';
import {
  BUILDING_KIND_I18N,
  CATEGORY_BADGES_I18N,
  CATEGORY_LABELS_I18N,
  PLACE_INFO_NAMES_I18N,
  getLocale,
  t,
  type Locale,
} from './i18n';

export type PlaceInfoMode = 'off' | 'popup' | 'label';

export const PLACE_INFO_MODES: PlaceInfoMode[] = ['off', 'popup', 'label'];

export const PLACE_INFO_NAMES: Record<PlaceInfoMode, string> = PLACE_INFO_NAMES_I18N.vi;

export type PlaceCategory =
  | 'landmark'
  | 'heritage'
  | 'monument'
  | 'park'
  | 'water'
  | 'station'
  | 'education'
  | 'hospital'
  | 'building';

export const CATEGORY_LABELS: Record<PlaceCategory, string> = CATEGORY_LABELS_I18N.vi;

export const CATEGORY_BADGES: Record<PlaceCategory, string> = CATEGORY_BADGES_I18N.vi;

export interface PlaceMetric {
  label: string;
  value: string;
}

export interface PlaceEntry {
  /** matches owner id in 3D layer (building.id, area.id, feature.id, station.id) */
  id: string;
  source: string;
  name: string;
  address: string;
  category: PlaceCategory;
  categoryLabel: string;
  badge: string;
  /** priority tier for floating labels (1 = major landmark/park/monument/station, 2 = notable, 3 = local named, 4 = regular building) */
  tier: 1 | 2 | 3 | 4;
  minPxPerMetre: number;
  /** 3D anchor [x, y, z] in city metres (top of building/monument or surface of park/lake) */
  world: [number, number, number];
  /** ground center [x, y] for flyTo */
  ground: [number, number];
  /** rich description shown in the popup */
  description: string;
  /** structured key-value specs shown in the popup */
  metrics: PlaceMetric[];
  /** optional showcase id if this place can be opened in the standalone 3D diorama viewer */
  showcaseId?: string;
  /** building id if this place has interactive floor lights */
  buildingId?: string;
  levels?: number;
  /** true for bespoke 3D models, showcase buildings, and primary civic/cultural landmarks */
  isSignatureLandmark?: boolean;
}

export interface ProjectedPlaceLabel {
  entry: PlaceEntry;
  x: number;
  y: number;
  anchorWorld?: [number, number, number];
  offsetY?: number;
}

export interface PlaceCatalog {
  /** all labelable places sorted by importance (tiers 1..3) */
  labels: PlaceEntry[];
  /** fast lookup by 3D owner id (includes all buildings, areas, monuments, and stations) */
  byId: Map<string, PlaceEntry>;
}

function cleanBuildingName(b: Building, locale: Locale): string {
  if (b.name?.trim()) return b.name.trim();
  const k = BUILDING_KIND_I18N[locale][b.kind] ?? (locale === 'en' ? 'Building' : 'Tòa nhà');
  const lv = buildingLevels(b);
  return b.address
    ? `${k} · ${b.address.split(',')[0]}`
    : locale === 'en'
      ? `${k} (${lv} floors)`
      : `${k} (${lv} tầng)`;
}

function classifyBuilding(b: Building, lv: number, areaM2: number): PlaceCategory {
  const n = (b.name ?? '').toLowerCase();
  if (b.subtype === 'heritage' || /^(chùa|đình|đền|miếu|nhà thờ|lăng|kỳ đài|cột cờ|temple|pagoda|church|shrine|mausoleum)\b/i.test(b.name ?? '')) return 'heritage';
  if (b.subtype === 'hospital' || /bệnh viện|phòng khám|y tế|hospital|clinic|medical/i.test(n)) return 'hospital';
  if (b.subtype === 'university' || b.subtype === 'school' || b.kind === 'school' || /đại học|học viện|trường|university|college|academy|school\b/i.test(n)) return 'education';
  if (b.model || b.isSignatureLandmark || lv >= 10 || (lv >= 5 && areaM2 >= 650 && b.name)) return 'landmark';
  return 'building';
}

function formatRegion(district: string | undefined, cityName: string): string {
  if (!district) return cityName;
  return cityName ? `${district}, ${cityName}` : district;
}

function formatAddress(rawAddress: string | undefined, district: string | undefined, cityName: string): string {
  const shortDist = district ? district.replace(/^(Quận|Huyện|Thị xã)\s+/i, '') : '';
  if (rawAddress) {
    return shortDist && !rawAddress.includes(shortDist) ? `${rawAddress}, ${shortDist}` : rawAddress;
  }
  return formatRegion(district, cityName);
}

export function buildPlaceCatalog(
  city: City,
  showcaseIds: ReadonlySet<string>,
  locale: Locale = getLocale(),
): PlaceCatalog {
  const byId = new Map<string, PlaceEntry>();
  const labels: PlaceEntry[] = [];
  const cityName = city.cityName ?? city.name.split(':')[0]?.trim() ?? '';
  const catLabels = CATEGORY_LABELS_I18N[locale];
  const catBadges = CATEGORY_BADGES_I18N[locale];
  const bldgKinds = BUILDING_KIND_I18N[locale];

  // 1. Point Monuments & Archaeological / Heritage Sites (Features)
  for (const f of city.features) {
    if ((f.kind !== 'monument' && f.kind !== 'heritage') || !f.name) continue;
    const cat: PlaceCategory = f.kind === 'monument' ? 'monument' : 'heritage';
    const region = formatRegion(f.district, cityName);
    const address = f.address ?? region;
    const zTop = f.kind === 'monument' ? 9.2 : 3.4;
    const categoryLabel = f.subtitle ?? catLabels[cat];
    const defaultDesc = locale === 'en'
      ? `${categoryLabel} located at ${address}.`
      : `${categoryLabel} tại ${address}.`;
    const entry: PlaceEntry = {
      id: f.id,
      source: f.source,
      name: f.name,
      address,
      category: cat,
      categoryLabel,
      badge: catBadges[cat],
      tier: 1,
      minPxPerMetre: 0,
      world: [f.at[0], f.at[1], zTop],
      ground: [f.at[0], f.at[1]],
      description: f.description ?? defaultDesc,
      metrics: [
        { label: t('metric.category', undefined, locale), value: categoryLabel },
        { label: t('metric.address', undefined, locale), value: address },
        { label: t('metric.areaRegion', undefined, locale), value: region },
        { label: t('metric.source', undefined, locale), value: f.source },
      ],
      isSignatureLandmark: true,
    };
    byId.set(f.id, entry);
    labels.push(entry);
  }

  // 2. Parks, Gardens, Lakes & Heritage Courtyards (Areas)
  for (const a of city.areas) {
    const name = a.name?.trim();
    if (!name) continue;

    const c = centroid(a.polygon);
    const areaM2 = Math.round(Math.abs(ringArea(a.polygon)));
    const perimM = Math.round(polylineLength([...a.polygon, a.polygon[0]!]));
    const cat: PlaceCategory = /^(chùa|đình|đền|miếu|nhà thờ|lăng|hoàng thành|văn miếu|temple|pagoda|citadel)\b/i.test(name) || (a.subtype === 'heritage' && !/công viên|vườn hoa|park/i.test(name))
      ? 'heritage'
      : a.kind === 'water' || a.kind === 'pool'
        ? 'water'
        : 'park';
    const address = formatAddress(a.address, a.district, cityName);
    const areaText = areaM2 >= 10000
      ? `${(areaM2 / 10000).toFixed(2).replace('.', locale === 'vi' ? ',' : '.')} ha`
      : `${areaM2.toLocaleString(locale)} m²`;
    const isMajor = areaM2 >= 4500 || cat === 'heritage' || Boolean(a.description);
    const tier: 1 | 2 | 3 = isMajor ? 1 : areaM2 >= 1200 ? 2 : 3;
    const minPxPerMetre = tier === 1 ? 0 : tier === 2 ? 1.35 : 2.6;

    const fallbackDesc = locale === 'en'
      ? cat === 'water'
        ? `Urban lake and ecological waterfront covering ${areaText} at ${address}.`
        : cat === 'park'
          ? `Public green park and community recreation space covering ${areaText} at ${address}.`
          : `Historical and cultural heritage complex at ${address}.`
      : cat === 'water'
        ? `Hồ điều hòa và cảnh quan sinh thái rộng ${areaText} tại khu vực ${address}.`
        : cat === 'park'
          ? `Không gian cây xanh, công viên sinh hoạt cộng đồng rộng ${areaText} tại ${address}.`
          : `Quần thể di tích văn hóa – tín ngưỡng truyền thống tại ${address}.`;

    const entry: PlaceEntry = {
      id: a.id,
      source: a.source,
      name,
      address,
      category: cat,
      categoryLabel: catLabels[cat],
      badge: catBadges[cat],
      tier,
      minPxPerMetre,
      world: [c[0], c[1], 1.8],
      ground: [c[0], c[1]],
      description: a.description ?? fallbackDesc,
      metrics: [
        { label: t('metric.type', undefined, locale), value: catLabels[cat] },
        { label: t('metric.areaSize', undefined, locale), value: areaText },
        { label: t('metric.perimeter', undefined, locale), value: `${perimM.toLocaleString(locale)} m` },
        { label: t('metric.location', undefined, locale), value: address },
      ],
    };
    byId.set(a.id, entry);
    labels.push(entry);
  }

  // 3. Elevated Metro Stations
  for (const st of city.stations) {
    const rawName = st.name?.trim() || 'Station';
    const prefix = locale === 'en' ? 'Station' : 'Ga';
    const name = /^(Ga|Station)\s+/i.test(rawName) ? rawName : `${prefix} ${rawName}`;
    const lineTag = st.lineTag ?? 'Metro';
    const lineFull = st.lineName ?? lineTag;
    const address = st.address ?? formatRegion(st.district, cityName);
    const showcaseId = showcaseIds.has(`station:${st.id}`) ? `station:${st.id}` : undefined;
    const desc = locale === 'en'
      ? `Elevated metro station on ${lineFull}, featuring a 3-level structure with concourse, dual side platforms, and pedestrian skybridges.`
      : `Nhà ga trên cao thuộc ${lineFull}, kết cấu 3 tầng gồm tầng trung chuyển, 2 ke ga bên và cầu bộ hành vượt đường kết nối vỉa hè hai bên.`;
    const entry: PlaceEntry = {
      id: st.id,
      source: st.source,
      name: `${name} (${lineTag})`,
      address,
      category: 'station',
      categoryLabel: catLabels.station,
      badge: catBadges.station,
      tier: 1,
      minPxPerMetre: 0,
      world: [st.at[0], st.at[1], 20.5],
      ground: [st.at[0], st.at[1]],
      description: desc,
      metrics: [
        { label: t('metric.line', undefined, locale), value: lineFull },
        { label: t('metric.structure', undefined, locale), value: t('metric.stationStructureVal', undefined, locale) },
        { label: t('metric.location', undefined, locale), value: address },
        { label: t('metric.train', undefined, locale), value: t('metric.stationTrainVal', undefined, locale) },
      ],
      isSignatureLandmark: true,
      ...(showcaseId ? { showcaseId } : {}),
    };
    byId.set(st.id, entry);
    labels.push(entry);
  }

  // 4. Buildings & Landmarks (all buildings indexed in byId; named buildings added to labels)
  const seenLabelNames = new Set<string>(labels.map(l => l.name.toLowerCase()));
  const sortedBuildings = [...city.buildings].sort((a, b) => buildingHeight(b) - buildingHeight(a));

  for (const b of sortedBuildings) {
    const c = centroid(b.footprint);
    const lv = buildingLevels(b);
    const h = Math.round(buildingHeight(b));
    const areaM2 = Math.round(Math.abs(ringArea(b.footprint)));
    const cat = classifyBuilding(b, lv, areaM2);
    const name = cleanBuildingName(b, locale);
    const address = formatAddress(b.address, b.district, cityName);
    const glass = b.parts.some(p => p.facade === 'glass');
    const showcaseId = showcaseIds.has(`bldg:${b.id}`) ? `bldg:${b.id}` : undefined;
    const box = bbox(b.footprint), span = Math.hypot(box.x1 - box.x0, box.y1 - box.y0);
    const isSignature = Boolean(b.model || b.isSignatureLandmark || showcaseId);
    const isSecondaryTwin = Boolean(b.isSecondaryTwin);

    let tier: 1 | 2 | 3 | 4 = 4;
    if (!isSecondaryTwin && (isSignature || cat === 'heritage' || (lv >= 22 && b.name) || (cat === 'education' && span >= 35) || (cat === 'hospital' && span >= 30))) {
      tier = 1;
    } else if (b.name && (isSecondaryTwin || lv >= 8 || span >= 30 || cat === 'education' || cat === 'hospital')) {
      tier = 2;
    } else if (b.name && b.name.length > 2) {
      tier = 3;
    }

    const minPxPerMetre = tier === 1 ? 0 : tier === 2 ? (isSecondaryTwin ? 2.4 : 1.55) : tier === 3 ? 3.2 : 99;
    const facadeText = glass
      ? t('metric.facadeGlass', undefined, locale)
      : b.house
        ? t('metric.facadeTube', undefined, locale)
        : t('metric.facadeWall', undefined, locale);
    const kindLabel = cat === 'heritage' || cat === 'hospital' || cat === 'education'
      ? catLabels[cat]
      : bldgKinds[b.kind] ?? catLabels.building;

    const fallbackDesc = locale === 'en'
      ? `${kindLabel} with ${lv} floors (~${h} m tall) and a footprint of ~${areaM2.toLocaleString('en')} m² at ${address}.`
      : `${kindLabel} cao ${lv} tầng (~${h} m), diện tích mặt bằng khoảng ${areaM2.toLocaleString('vi')} m² tại ${address}.`;
    const desc = b.description ?? fallbackDesc;

    const customZ =
      b.model === 'hanoi-flag-tower' ? 48 :
      b.model === 'national-assembly' ? 55 :
      b.model === 'ho-chi-minh-mausoleum' ? 23.5 :
      b.model === 'doan-mon' ? 16.5 :
      b.model === 'bac-son-memorial' ? 16.5 :
      b.model === 'khue-van-cac' ? 11.2 :
      b.model === 'van-mieu-mon' ? 10.2 :
      b.model === 'one-pillar-pagoda' ? 9.8 :
      b.model === 'nha-san-bac-ho' ? 9.2 :
      h + (b.model === 'vpbank-tower' || b.model === 'lotte-center' ? 10 : b.model === 'national-cinema' ? 6 : 2.2);

    const entry: PlaceEntry = {
      id: b.id,
      source: b.source,
      name,
      address,
      category: cat,
      categoryLabel: kindLabel,
      badge: catBadges[cat],
      tier,
      minPxPerMetre,
      world: [c[0], c[1], customZ],
      ground: [c[0], c[1]],
      description: desc,
      metrics: [
        { label: t('metric.category', undefined, locale), value: kindLabel },
        { label: t('metric.scale', undefined, locale), value: t('metric.scaleVal', { levels: lv, height: h }, locale) },
        { label: t('metric.footprintArea', undefined, locale), value: t('metric.footprintVal', { area: areaM2.toLocaleString(locale), parts: b.parts.length }, locale) },
        { label: t('metric.facade', undefined, locale), value: facadeText },
        { label: t('metric.address', undefined, locale), value: address },
      ],
      buildingId: b.id,
      levels: lv,
      ...(isSignature ? { isSignatureLandmark: true } : {}),
      ...(showcaseId ? { showcaseId } : {}),
    };
    byId.set(b.id, entry);

    if (b.name && tier <= 3) {
      const key = `${name.toLowerCase()}|${Math.round(c[0] / 90)},${Math.round(c[1] / 90)}`;
      if (!seenLabelNames.has(key) && (tier === 1 || !seenLabelNames.has(name.toLowerCase()))) {
        seenLabelNames.add(key);
        seenLabelNames.add(name.toLowerCase());
        labels.push(entry);
      }
    }
  }

  labels.sort((a, b) => a.tier - b.tier || (b.isSignatureLandmark ? 1 : 0) - (a.isSignatureLandmark ? 1 : 0) || (b.levels ?? 10) - (a.levels ?? 10) || a.name.localeCompare(b.name, 'vi'));
  return { labels, byId };
}

/** Select and de-collide visible place labels for the current viewport and mode */
export function selectVisiblePlaceLabels(
  catalog: PlaceCatalog,
  mode: PlaceInfoMode,
  pxPerMetre: number,
  widthPx: number,
  heightPx: number,
  targetWorld: [number, number],
  project: (world: [number, number, number]) => { x: number; y: number; visible: boolean },
): ProjectedPlaceLabel[] {
  if (mode === 'off' || widthPx <= 0 || heightPx <= 0) return [];

  const isMobile = widthPx < 700;
  // In 'popup' mode, we only show subtle interactive badges on Tier 1 parks, lakes, monuments, and heritage sites
  // so flat ground/water features are easy to spot and click/hover; buildings themselves are 3D meshes.
  if (mode === 'popup') {
    const maxMarkers = isMobile ? 6 : 12;
    const out: ProjectedPlaceLabel[] = [];
    for (const e of catalog.labels) {
      if (out.length >= maxMarkers) break;
      if (e.category !== 'monument' && e.category !== 'heritage' && e.category !== 'park' && e.category !== 'water') continue;
      if (pxPerMetre < e.minPxPerMetre) continue;
      const p = project(e.world);
      if (!p.visible || p.x < 36 || p.x > widthPx - 36 || p.y < 52 || p.y > heightPx - 36) continue;
      if (out.some(o => Math.hypot(p.x - o.x, p.y - o.y) < (isMobile ? 95 : 110))) continue;
      out.push({ entry: e, x: p.x, y: p.y, anchorWorld: e.world, offsetY: 0 });
    }
    return out;
  }

  // 'label' mode: show Name + Address badge above buildings, landmarks, parks, lakes, monuments, heritage sites, stations
  const maxLabels = isMobile
    ? (pxPerMetre < 1.5 ? 10 : pxPerMetre < 3.0 ? 14 : 18)
    : (pxPerMetre < 1.5 ? 18 : pxPerMetre < 3.0 ? 24 : pxPerMetre < 5.5 ? 30 : 36);
  const padX = isMobile ? 42 : 56;
  const padTop = isMobile ? 50 : 60;
  const padBottom = isMobile ? 38 : 38;
  const minW = isMobile ? 104 : 118;
  const minH = isMobile ? 32 : 36;

  // When zoomed in, tall skyscrapers (e.g., VPBank 100 m, Lotte 272 m) have their rooftop above the top edge of the screen
  // while their body/podium is right in the middle of the viewport. Dynamically clamp the anchor height so the label stays on-screen.
  const viewHeightM = heightPx / Math.max(0.4, pxPerMetre);
  const maxAnchorZ = Math.max(16, viewHeightM * 0.44);
  const cxScreen = widthPx * 0.5;
  const cyScreen = heightPx * 0.5;

  const candidates: (ProjectedPlaceLabel & { score: number })[] = [];
  for (const e of catalog.labels) {
    if (pxPerMetre < e.minPxPerMetre) continue;
    let anchorZ = Math.min(e.world[2], maxAnchorZ);
    let anchorWorld: [number, number, number] = [e.world[0], e.world[1], anchorZ];
    let p = project(anchorWorld);
    // If the clamped top still projects above padTop while the building base is on screen, step down toward podium height
    if (p.visible && p.y < padTop && anchorZ > 12) {
      anchorZ = Math.min(anchorZ, 12);
      anchorWorld = [e.world[0], e.world[1], anchorZ];
      p = project(anchorWorld);
    }
    if (!p.visible || p.x < padX || p.x > widthPx - padX || p.y < padTop || p.y > heightPx - padBottom) continue;
    const d = Math.hypot(e.ground[0] - targetWorld[0], e.ground[1] - targetWorld[1]);
    const screenDist = Math.hypot(p.x - cxScreen, p.y - cyScreen);
    const catBonus = e.category === 'monument' || e.category === 'heritage' ? 2200 : e.category === 'landmark' || e.category === 'station' ? 1800 : e.category === 'park' || e.category === 'water' ? 1400 : 0;
    const sigBonus = e.isSignatureLandmark ? (e.showcaseId ? 5500 : 4200) : 0;
    const levelBonus = Math.min(25, e.levels ?? 4) * 20;
    const score = (5 - e.tier) * 10000 + catBonus + sigBonus + levelBonus - screenDist * 2.5 - d * 1.4;
    candidates.push({ entry: e, x: p.x, y: p.y, anchorWorld, offsetY: 0, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const chosen: ProjectedPlaceLabel[] = [];
  for (const c of candidates) {
    if (chosen.length >= maxLabels) break;
    const collidesAt = (yTest: number) => chosen.some(o => Math.abs(c.x - o.x) < minW && Math.abs(yTest - o.y) < minH);
    if (!collidesAt(c.y)) {
      chosen.push({ entry: c.entry, x: c.x, y: c.y, anchorWorld: c.anchorWorld, offsetY: 0 });
      continue;
    }
    // For signature landmarks (e.g. Rạp Chiếu phim Quốc gia & VPBank Tower, or Lăng Bác & Chùa Một Cột),
    // if rotating the camera aligns them vertically on screen, nudge vertically by ±38 px so both stay visible!
    if (c.entry.isSignatureLandmark) {
      for (const dy of [38, -38, 74, -74]) {
        const ny = c.y + dy;
        if (ny >= padTop && ny <= heightPx - padBottom && !collidesAt(ny)) {
          chosen.push({ entry: c.entry, x: c.x, y: ny, anchorWorld: c.anchorWorld, offsetY: dy });
          break;
        }
      }
    }
  }
  return chosen;
}
