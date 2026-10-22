/* Place / Building / Landmark / Park / Monument / Heritage Information System:
   Three display modes ('off', 'popup', 'label'):
     - 'off'   : Không hiện thông tin (hidden);
     - 'popup' : Kiểu Popup — hover shows a compact tooltip/banner, click opens a rich detail popup;
     - 'label' : Tên bên trên — floating badge above buildings, parks, lakes, monuments, and heritage
                 sites with the Place Name on top and Address text below; hover highlights/shows banner,
                 and click opens the rich detail popup. */
import { area as ringArea, bbox, buildingHeight, buildingLevels, centroid, polylineLength, type Building, type City } from '@my-city/core';

export type PlaceInfoMode = 'off' | 'popup' | 'label';

export const PLACE_INFO_MODES: PlaceInfoMode[] = ['off', 'popup', 'label'];

export const PLACE_INFO_NAMES: Record<PlaceInfoMode, string> = {
  off: 'Không hiện',
  popup: 'Kiểu Popup (Click / Hover)',
  label: 'Tên & địa chỉ bên trên',
};

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

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  landmark: 'Công trình tiêu biểu',
  heritage: 'Di tích lịch sử – văn hóa',
  monument: 'Tượng đài · Di tích',
  park: 'Công viên · Vườn hoa',
  water: 'Hồ nước · Cảnh quan',
  station: 'Ga đường sắt đô thị',
  education: 'Trường học · Học viện',
  hospital: 'Bệnh viện · Y tế',
  building: 'Tòa nhà · Công trình',
};

export const CATEGORY_BADGES: Record<PlaceCategory, string> = {
  landmark: '🏢 Công trình lớn',
  heritage: '⛩ Di tích',
  monument: '🏛 Tượng đài',
  park: '🌳 Công viên',
  water: '🌊 Hồ nước',
  station: '🚇 Ga Metro',
  education: '🎓 Giáo dục',
  hospital: '🏥 Y tế',
  building: '🏠 Tòa nhà',
};

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
}

export interface ProjectedPlaceLabel {
  entry: PlaceEntry;
  x: number;
  y: number;
}

export interface PlaceCatalog {
  /** all labelable places sorted by importance (tiers 1..3) */
  labels: PlaceEntry[];
  /** fast lookup by 3D owner id (includes all 3,900+ buildings, areas, monuments, and stations) */
  byId: Map<string, PlaceEntry>;
}

const KIND_VN: Record<Building['kind'], string> = {
  office: 'Tòa nhà văn phòng',
  commercial: 'Trung tâm thương mại · Dịch vụ',
  hotel: 'Khách sạn',
  apartment: 'Tòa nhà chung cư · Căn hộ',
  school: 'Trường học · Cơ sở đào tạo',
  villa: 'Biệt thự',
  house: 'Nhà ở dân dụng',
  'tube-house': 'Nhà ống mặt phố Hà Nội',
  kiosk: 'Ki-ốt · Cửa hàng nhỏ',
  other: 'Công trình công cộng',
};

const HERITAGE_NOTES: Record<string, string> = {
  'Tượng đài Quang Trung': 'Tượng đài Hoàng đế Quang Trung – Nguyễn Huệ uy nghi trên đỉnh Gò Đống Đa, kỷ niệm chiến thắng Ngọc Hồi – Đống Đa mùa xuân năm Kỷ Dậu (1789).',
  'Miếu Trung Liệt': 'Di tích lịch sử trên khu vực Gò Đống Đa thờ các vị trung liệt, tướng sĩ Tây Sơn và các danh tướng có công giữ nước.',
  'Đàn Xã Tắc': 'Di chỉ khảo cổ học Quốc gia được lập từ năm 1048 thời vua Lý Thái Tông tại Ô Chợ Dừa – nơi tế Trời Đất và cầu mưa thuận gió hòa của kinh thành Thăng Long.',
  'Gò Đống Đa': 'Công viên văn hóa – Di tích Quốc gia đặc biệt gắn liền với chiến thắng Đống Đa lịch sử năm 1789 của nghĩa quân Tây Sơn.',
  'Đền thờ Quang Trung': 'Ngôi đền thờ Hoàng đế Quang Trung cùng các nghĩa sĩ Tây Sơn trong quần thể di tích Gò Đống Đa.',
  'Chùa Bộc': 'Di tích lịch sử Quốc gia (Sùng Phúc Tự) trên phố Chùa Bộc, xây dựng từ thời Hậu Lê và gắn liền với chiến thắng Đống Đa năm 1789.',
  'Chùa Phúc Khánh': 'Ngôi cổ tự nổi tiếng (Chùa Sở) gần Ngã Tư Sở được xây dựng từ thời Hậu Lê, điểm sinh hoạt văn hóa tâm linh lớn của Hà Nội.',
  'Nhà thờ Thái Hà': 'Giáo xứ Thái Hà cùng Tu viện Dòng Chúa Cứu Thế trên phố Nguyễn Lương Bằng, công trình kiến trúc tôn giáo tiêu biểu tại quận Đống Đa.',
  'Lăng mộ Hoàng Cao Khải': 'Quần thể di tích kiến trúc đá cổ tại khu vực Ấp Thái Hà xưa (ngõ 252 Tây Sơn), một di tích điêu khắc đá độc đáo cuối thế kỷ XIX.',
  'Lăng mộ Hoàng Trọng Phu': 'Di tích lăng đá trong quần thể khu lăng Hoàng Cao Khải tại phường Trung Liệt, quận Đống Đa.',
  'Chùa Đồng Quang': 'Ngôi chùa cổ đối diện Gò Đống Đa trên phố Tây Sơn, lưu giữ nhiều hiện vật lịch sử quý giá.',
  'Chùa Xã Đàn': 'Kim Yên Tự – ngôi chùa cổ tại khu vực Xã Đàn 2, phường Nam Đồng, quận Đống Đa.',
};

const LANDMARK_NOTES: Record<string, string> = {
  'osm:way/136257265': 'Tòa tháp văn phòng & thương mại 18 tầng biểu tượng tại góc Tây Bắc ngã tư Thái Hà – Tây Sơn với khối đế cong và cột thu phát sóng trên đỉnh.',
  'osm:way/850419282': 'Khách sạn 5 sao quốc tế 27 tầng tại góc Đông Bắc ngã tư Thái Hà – Tây Sơn với mặt dựng kính uốn cong và khối đế thương mại 5 tầng.',
  'osm:way/677190114': 'Tòa tháp văn phòng hạng A cao 29 tầng (102 m) tại ngã tư Thái Hà – Láng Hạ – Huỳnh Thúc Kháng với khối đế ngân hàng, đỉnh tháp kính giật cấp và sân đỗ trực thăng.',
  'osm:way/1115247053': 'Tổ hợp điện ảnh – văn hóa lớn tại góc ngã tư Thái Hà – Láng Hạ (87 Láng Hạ) nổi bật với quảng trường tiền sảnh, hàng cột tròn, sảnh kính rotunda 3 tầng và mái vòm.',
  'osm:way/1217754319': 'Trụ sở Tập đoàn Dầu khí Việt Nam (Petrovietnam) cao 19 tầng tại số 18 Láng Hạ, đối diện điểm cuối phố Thái Hà.',
  'osm:way/180075246': 'Tổ hợp thương mại – văn phòng – căn hộ cao cấp MIPEC Tower tại số 229 Tây Sơn.',
  'osm:way/1082814006': 'Tổ hợp 2 tháp căn hộ 21 tầng và 1 tháp văn phòng 14 tầng trên khối đế thương mại 4 tầng tại số 165 Thái Hà.',
};

function cleanBuildingName(b: Building): string {
  if (b.name?.trim()) return b.name.trim();
  const k = KIND_VN[b.kind] ?? 'Tòa nhà';
  return b.address ? `${k} · ${b.address.split(',')[0]}` : `${k} (${buildingLevels(b)} tầng)`;
}

function classifyBuilding(b: Building, lv: number, areaM2: number): PlaceCategory {
  const n = (b.name ?? '').toLowerCase();
  if (b.subtype === 'heritage' || /^(chùa|đình|đền|miếu|nhà thờ|lăng)\b/i.test(b.name ?? '')) return 'heritage';
  if (b.subtype === 'hospital' || /bệnh viện|phòng khám|y tế/i.test(n)) return 'hospital';
  if (b.subtype === 'university' || b.subtype === 'school' || b.kind === 'school' || /đại học|học viện|trường\b/i.test(n)) return 'education';
  if (b.model || lv >= 10 || (lv >= 5 && areaM2 >= 650 && b.name)) return 'landmark';
  return 'building';
}

export function buildPlaceCatalog(city: City, showcaseIds: ReadonlySet<string>): PlaceCatalog {
  const byId = new Map<string, PlaceEntry>();
  const labels: PlaceEntry[] = [];

  // 1. Point Monuments & Archaeological / Heritage Sites (Features)
  for (const f of city.features) {
    if ((f.kind !== 'monument' && f.kind !== 'heritage') || !f.name) continue;
    const cat: PlaceCategory = f.kind === 'monument' ? 'monument' : 'heritage';
    const address = f.address ?? 'Quận Đống Đa, Hà Nội';
    const zTop = f.kind === 'monument' ? 9.2 : 3.4;
    const entry: PlaceEntry = {
      id: f.id,
      source: f.source,
      name: f.name,
      address,
      category: cat,
      categoryLabel: f.subtitle ?? CATEGORY_LABELS[cat],
      badge: CATEGORY_BADGES[cat],
      tier: 1,
      minPxPerMetre: 0,
      world: [f.at[0], f.at[1], zTop],
      ground: [f.at[0], f.at[1]],
      description: HERITAGE_NOTES[f.name] ?? `${f.subtitle ?? CATEGORY_LABELS[cat]} tại ${address}, Quận Đống Đa, Hà Nội.`,
      metrics: [
        { label: 'Phân loại', value: f.subtitle ?? CATEGORY_LABELS[cat] },
        { label: 'Địa chỉ', value: address },
        { label: 'Khu vực', value: 'Quận Đống Đa, Hà Nội' },
        { label: 'Nguồn dữ liệu', value: f.source },
      ],
    };
    byId.set(f.id, entry);
    labels.push(entry);
  }

  // 2. Parks, Gardens, Lakes & Heritage Courtyards (Areas)
  for (const a of city.areas) {
    let name = a.name?.trim();
    if (name === 'Hố Đống Đa') name = 'Hồ Hoàng Cầu (Hồ Đống Đa)';
    if (name === 'Gò Đống Đa') name = 'Công viên Văn hóa Đống Đa (Gò Đống Đa)';
    if (!name && a.source === 'osm:way/840074806') name = 'Hồ Đắc Di';
    if (!name) continue;

    const c = centroid(a.polygon);
    const areaM2 = Math.round(Math.abs(ringArea(a.polygon)));
    const perimM = Math.round(polylineLength([...a.polygon, a.polygon[0]!]));
    const cat: PlaceCategory = /^(chùa|đình|đền|miếu|nhà thờ|lăng)\b/i.test(name) || (a.subtype === 'heritage' && !/công viên|vườn hoa/i.test(name))
      ? 'heritage'
      : a.kind === 'water' || a.kind === 'pool'
        ? 'water'
        : 'park';
    const address = a.address ? `${a.address}, Đống Đa` : 'Quận Đống Đa, Hà Nội';
    const areaText = areaM2 >= 10000 ? `${(areaM2 / 10000).toFixed(2).replace('.', ',')} ha` : `${areaM2.toLocaleString('vi')} m²`;
    const isMajor = areaM2 >= 4500 || cat === 'heritage' || /Gò Đống Đa|Indira Gandhi|Hoàng Cầu|Đắc Di|Thành Công|Xã Đàn|Công đoàn|Thuỷ lợi/i.test(name);
    const tier: 1 | 2 | 3 = isMajor ? 1 : areaM2 >= 1200 ? 2 : 3;
    const minPxPerMetre = tier === 1 ? 0 : tier === 2 ? 1.35 : 2.6;

    const entry: PlaceEntry = {
      id: a.id,
      source: a.source,
      name,
      address,
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat],
      badge: CATEGORY_BADGES[cat],
      tier,
      minPxPerMetre,
      world: [c[0], c[1], 1.8],
      ground: [c[0], c[1]],
      description: HERITAGE_NOTES[name] ?? (
        cat === 'water'
          ? `Hồ điều hòa và cảnh quan sinh thái rộng ${areaText} tại khu vực ${address}.`
          : cat === 'park'
            ? `Không gian cây xanh, công viên sinh hoạt cộng đồng rộng ${areaText} tại ${address}.`
            : `Quần thể di tích văn hóa – tín ngưỡng truyền thống tại ${address}.`
      ),
      metrics: [
        { label: 'Loại hình', value: CATEGORY_LABELS[cat] },
        { label: 'Diện tích', value: areaText },
        { label: 'Chu vi', value: `${perimM.toLocaleString('vi')} m` },
        { label: 'Vị trí', value: address },
      ],
    };
    byId.set(a.id, entry);
    labels.push(entry);
  }

  // 3. Elevated Metro Stations (Line 2A Cát Linh – Hà Đông)
  for (const st of city.stations) {
    const rawName = st.name?.trim() || 'Thái Hà';
    const name = rawName.startsWith('Ga ') ? rawName : `Ga ${rawName}`;
    const address = /Thái Hà/i.test(rawName)
      ? 'Phố Hoàng Cầu – Thái Hà, Đống Đa'
      : /La Thành/i.test(rawName)
        ? 'Phố Hoàng Cầu – Đê La Thành, Đống Đa'
        : /Cát Linh/i.test(rawName)
          ? 'Phố Cát Linh – Hào Nam, Đống Đa'
          : 'Đường Láng, Đống Đa';
    const showcaseId = showcaseIds.has(`station:${st.id}`) ? `station:${st.id}` : undefined;
    const entry: PlaceEntry = {
      id: st.id,
      source: st.source,
      name: `${name} (Metro 2A)`,
      address,
      category: 'station',
      categoryLabel: 'Ga đường sắt đô thị trên cao',
      badge: CATEGORY_BADGES.station,
      tier: 1,
      minPxPerMetre: 0,
      world: [st.at[0], st.at[1], 20.5],
      ground: [st.at[0], st.at[1]],
      description: `Nhà ga trên cao thuộc Tuyến đường sắt đô thị số 2A Cát Linh – Hà Đông, kết cấu 3 tầng gồm tầng trung chuyển, 2 ke ga bên và cầu bộ hành vượt đường kết nối vỉa hè hai bên.`,
      metrics: [
        { label: 'Tuyến', value: 'Metro 2A Cát Linh – Hà Đông' },
        { label: 'Kết cấu', value: '3 tầng trên cầu cạn (cao ~19 m)' },
        { label: 'Vị trí', value: address },
        { label: 'Đoàn tàu', value: '4 toa tiêu chuẩn' },
      ],
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
    const name = cleanBuildingName(b);
    const address = b.address ? `${b.address}, Đống Đa` : 'Quận Đống Đa, Hà Nội';
    const glass = b.parts.some(p => p.facade === 'glass');
    const showcaseId = showcaseIds.has(`bldg:${b.id}`) ? `bldg:${b.id}` : undefined;
    const box = bbox(b.footprint), span = Math.hypot(box.x1 - box.x0, box.y1 - box.y0);

    let tier: 1 | 2 | 3 | 4 = 4;
    if (b.model || cat === 'heritage' || (lv >= 16 && b.name) || (cat === 'education' && span >= 35) || (cat === 'hospital' && span >= 30)) {
      tier = 1;
    } else if (b.name && (lv >= 8 || span >= 30 || cat === 'education' || cat === 'hospital')) {
      tier = 2;
    } else if (b.name && b.name.length > 2) {
      tier = 3;
    }

    const minPxPerMetre = tier === 1 ? 0 : tier === 2 ? 1.55 : tier === 3 ? 3.2 : 99;
    const facadeText = glass ? 'Kính Curtain Wall' : b.house ? 'Kiến trúc nhà phố Hà Nội' : 'Tường xây hoàn thiện';
    const kindLabel = cat === 'heritage'
      ? 'Di tích lịch sử – tôn giáo'
      : cat === 'hospital'
        ? 'Bệnh viện · Cơ sở y tế'
        : cat === 'education'
          ? 'Trường học · Cơ sở giáo dục'
          : KIND_VN[b.kind] ?? 'Công trình';

    const desc = LANDMARK_NOTES[b.source]
      ?? HERITAGE_NOTES[name]
      ?? `${kindLabel} cao ${lv} tầng (~${h} m), diện tích mặt bằng khoảng ${areaM2.toLocaleString('vi')} m² tại ${address}.`;

    const entry: PlaceEntry = {
      id: b.id,
      source: b.source,
      name,
      address,
      category: cat,
      categoryLabel: kindLabel,
      badge: CATEGORY_BADGES[cat],
      tier,
      minPxPerMetre,
      world: [c[0], c[1], h + (b.model === 'vpbank-tower' ? 8 : b.model === 'national-cinema' ? 6 : 2.2)],
      ground: [c[0], c[1]],
      description: desc,
      metrics: [
        { label: 'Phân loại', value: kindLabel },
        { label: 'Quy mô', value: `${lv} tầng · cao ~${h} m` },
        { label: 'Diện tích đế', value: `${areaM2.toLocaleString('vi')} m² (${b.parts.length} khối)` },
        { label: 'Mặt dựng', value: facadeText },
        { label: 'Địa chỉ', value: address },
      ],
      buildingId: b.id,
      levels: lv,
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

  labels.sort((a, b) => a.tier - b.tier || (b.levels ?? 10) - (a.levels ?? 10) || a.name.localeCompare(b.name, 'vi'));
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
      out.push({ entry: e, x: p.x, y: p.y });
    }
    return out;
  }

  // 'label' mode: show Name + Address badge above buildings, landmarks, parks, lakes, monuments, heritage sites, stations
  const maxLabels = isMobile
    ? (pxPerMetre < 1.5 ? 6 : pxPerMetre < 3.0 ? 9 : 13)
    : (pxPerMetre < 1.5 ? 10 : pxPerMetre < 3.0 ? 16 : pxPerMetre < 5.5 ? 22 : 28);
  const padX = isMobile ? 48 : 68;
  const padTop = isMobile ? 54 : 68;
  const padBottom = isMobile ? 44 : 42;
  const minW = isMobile ? 124 : 148;
  const minH = isMobile ? 42 : 48;

  const candidates: (ProjectedPlaceLabel & { score: number })[] = [];
  for (const e of catalog.labels) {
    if (pxPerMetre < e.minPxPerMetre) continue;
    const p = project(e.world);
    if (!p.visible || p.x < padX || p.x > widthPx - padX || p.y < padTop || p.y > heightPx - padBottom) continue;
    const d = Math.hypot(e.ground[0] - targetWorld[0], e.ground[1] - targetWorld[1]);
    const catBonus = e.category === 'monument' || e.category === 'heritage' ? 2200 : e.category === 'landmark' || e.category === 'station' ? 1800 : e.category === 'park' || e.category === 'water' ? 1400 : 0;
    const score = (5 - e.tier) * 10000 + catBonus + (e.levels ?? 4) * 35 - d * 1.3;
    candidates.push({ entry: e, x: p.x, y: p.y, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const chosen: ProjectedPlaceLabel[] = [];
  for (const c of candidates) {
    if (chosen.length >= maxLabels) break;
    const collides = chosen.some(o => Math.abs(c.x - o.x) < minW && Math.abs(c.y - o.y) < minH);
    if (!collides) chosen.push({ entry: c.entry, x: c.x, y: c.y });
  }
  return chosen;
}
