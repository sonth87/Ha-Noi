/* Standalone showcase dioramas on an iso-glow base plate: each item is a curated architectural
   landmark, historical monument, bridge, or metro station organized hierarchically by:
     Country (Quốc gia) → City / Province (Thành phố / Tỉnh) → Category (Nhóm công trình) → Landmark
   Every showcase is centred on a dynamically sized plinth with a front street, sidewalk, trees,
   and street lamps, using the same Batch / Layer pipeline as the 3D city map. */
import * as THREE from 'three';
import {
  bbox,
  houseStoreys,
  resolveHouse,
  type Building,
  type City,
  type CityLandmarkCatalogEntry,
  type HouseInput,
  type Prop,
  type Vec2,
} from '@my-city/core';
import { Batch, V } from './batch';
import {
  beaconsOf,
  buildBuildings,
  cityFloors,
  flagpolesOf,
  nationalCinemaRotundaCenter,
  type WavingFlagSpec,
} from './buildings';
import { layerOf, type Layer } from './city';
import { lampPost, parkLamp, poolGeometry, tree } from './furniture';
import { CUSTOM_MASSING_MODELS, landmarkExtraBoundsPts } from './landmarks';
import { orientedBoxOf } from './landmarks/shared';
import { buildMetro } from './metro';

export interface ShowcaseItem {
  id: string;
  /** ISO country code (e.g. 'vn') */
  countryCode: string;
  /** Country display name (e.g. 'Việt Nam') */
  countryName: string;
  /** City / Province ID (e.g. 'vn/ha-noi') */
  cityId: string;
  /** City / Province display name (e.g. 'Hà Nội') */
  cityName: string;
  /** District / Ward / Commune within the city/province (e.g. 'Hoàn Kiếm', 'Ba Đình') */
  district?: string;
  /** Category slug for grouping (e.g. '01-citadels-gates', '14-metro-stations') */
  categoryId: string;
  /** Category display title */
  group: string;
  /** Landmark display name */
  name: string;
  /** Subtitle with address, district, dimensions, and heritage notes */
  subtitle: string;
  /** Number of storeys / levels */
  levels?: number;
  /** Architectural height in metres */
  heightM?: number;
  /** Street address if known */
  address?: string;
  /** True when rendered by a bespoke 3D landmark builder */
  isBespoke?: boolean;
  /** Initial camera zoom for framing the diorama */
  zoom: number;
  /** Half-size of the diorama plate (m), for clamping camera pan */
  radius: number;
}

export interface BuiltShowcase {
  item: ShowcaseItem;
  layer: Layer;
  shellLayer?: Layer;
  pools: THREE.BufferGeometry;
  beacons: THREE.Vector3[];
  flags: WavingFlagSpec[];
  /** metro cars placed on the station showcase (cab, position in city metres, heading) */
  cars: { cab: boolean; at: [number, number, number]; heading: number }[];
  floors: string[];
}

const COUNTRY_NAMES: Record<string, string> = {
  vn: 'Việt Nam',
  jp: 'Nhật Bản',
  fr: 'Pháp',
  us: 'Hoa Kỳ',
  sg: 'Singapore',
  kr: 'Hàn Quốc',
  gb: 'Vương quốc Anh',
};

const CATEGORY_META: Record<string, { id: string; title: string }> = {
  '01-citadels-gates': {
    id: '01-citadels-gates',
    title: '1. Cửa Ô, Cổng Thành & Thành Quách Cổ',
  },
  '02-gov-party-ministries': {
    id: '02-gov-party-ministries',
    title: '2. Tòa nhà Chính phủ, Cơ quan Trung ương Đảng & Nhà khách',
  },
  '03-churches-religious': {
    id: '03-churches-religious',
    title: '3. Hệ thống Nhà thờ (Công giáo, Tin lành) & Công trình Tôn giáo',
  },
  '04-monuments-memorials': {
    id: '04-monuments-memorials',
    title: '4. Đài Tưởng niệm, Tượng đài & Di tích Chiến công',
  },
  '05-hoan-kiem-old-quarter': {
    id: '05-hoan-kiem-old-quarter',
    title: '5. Cụm danh thắng Hồ Hoàn Kiếm, Phố Cổ & Di tích Đô thị',
  },
  '06-tu-tran-temples': {
    id: '06-tu-tran-temples',
    title: '6. Tứ Trấn Thăng Long, Đền, Phủ & Đạo Quán',
  },
  '07-ancient-pagodas': {
    id: '07-ancient-pagodas',
    title: '7. Chùa Cổ, Thiền viện & Quần thể Phật giáo',
  },
  '08-communal-houses-villages': {
    id: '08-communal-houses-villages',
    title: '8. Đình Cổ & Kiến trúc Làng Xã Ngoại thành',
  },
  '09-french-colonial-culture-edu-med': {
    id: '09-french-colonial-culture-edu-med',
    title: '9. Công trình Văn hóa, Giáo dục & Y tế thời Pháp thuộc',
  },
  '10-museums-exhibitions': {
    id: '10-museums-exhibitions',
    title: '10. Bảo tàng & Trung tâm Triển lãm',
  },
  '11-skyscrapers-malls-modern': {
    id: '11-skyscrapers-malls-modern',
    title: '11. Tòa nhà Cao tầng, Trung tâm Thương mại & Tổ hợp Hiện đại',
  },
  '12-luxury-hotels': {
    id: '12-luxury-hotels',
    title: '12. Khách sạn Sang trọng & Nổi tiếng',
  },
  '13-bridges-stadiums-parks': {
    id: '13-bridges-stadiums-parks',
    title: '13. Cầu Lớn, Sân vận động, Công viên & Công trình Biểu tượng',
  },
  '14-metro-stations': {
    id: '14-metro-stations',
    title: '14. Nhà ga Đường sắt Đô thị (Metro) & Giao thông',
  },
};

function resolveCityHierarchy(city: City): {
  countryCode: string;
  countryName: string;
  cityId: string;
  cityName: string;
} {
  if (city.id.includes('/')) {
    const [cc = 'vn', slug = 'ha-noi'] = city.id.split('/');
    return {
      countryCode: cc,
      countryName: COUNTRY_NAMES[cc] ?? cc.toUpperCase(),
      cityId: `${cc}/${slug}`,
      cityName: city.cityName ?? city.name,
    };
  }
  return {
    countryCode: 'vn',
    countryName: 'Việt Nam',
    cityId: 'vn/ha-noi',
    cityName: city.cityName ?? 'Hà Nội',
  };
}

function classifyOsmBuildingCategory(b: Building): { id: string; title: string } {
  const m = b.model ?? '';
  const name = b.name ?? '';
  if (m === 'o-quan-chuong' || m === 'hanoi-flag-tower' || m === 'doan-mon' || m === 'bac-mon' || m === 'dien-kinh-thien' || m === 'hau-lau' || m === 'co-loa-citadel' || m === 'city-gate-stele') {
    return CATEGORY_META['01-citadels-gates']!;
  }
  if (m === 'ho-chi-minh-mausoleum' || m === 'nha-san-bac-ho' || m === 'presidential-palace' || m === 'national-assembly' || m === 'party-central-hq' || m === 'bac-bo-phu' || m === 'ministry-palace') {
    return CATEGORY_META['02-gov-party-ministries']!;
  }
  if (m === 'st-joseph-cathedral' || m === 'church-hall' || m === 'nha-tho-cua-bac' || m === 'nha-tho-ham-long' || m === 'al-noor-mosque' || /^(nhà thờ|giáo xứ|thánh đường)\b/iu.test(name)) {
    return CATEGORY_META['03-churches-religious']!;
  }
  if (m === 'bac-son-memorial' || m === 'tuong-dai-hoa-binh' || m === 'traditional-mausoleum' || m === 'statue-monument-plaza' || m === 'tuong-dai-cam-tu' || m === 'tuong-dai-quang-trung' || m === 'b52-huu-tiep-lake') {
    return CATEGORY_META['04-monuments-memorials']!;
  }
  if (m === 'thap-rua' || m === 'den-ngoc-son' || m === 'cau-the-huc' || m === 'thap-but' || m === 'thap-hoa-phong' || m === 'thap-nuoc-hang-dau' || m === 'nha-co-ma-may' || m === 'cho-dong-xuan' || m === 'traditional-market-hall') {
    return CATEGORY_META['05-hoan-kiem-old-quarter']!;
  }
  if (m === 'den-quan-thanh' || m === 'phu-tay-ho' || m === 'den-hai-ba-trung' || m === 'traditional-temple' || /^(đền|phủ|miếu)\b/iu.test(name)) {
    return CATEGORY_META['06-tu-tran-temples']!;
  }
  if (m === 'one-pillar-pagoda' || m === 'chua-tran-quoc' || m === 'chua-quan-su' || m === 'chua-phuc-khanh' || m === 'traditional-pagoda' || m === 'mountain-pagoda-complex' || /^(chùa|tổ đình|thiền viện)\b/iu.test(name)) {
    return CATEGORY_META['07-ancient-pagodas']!;
  }
  if (m === 'lang-lua-van-phuc' || m === 'ancient-communal-house' || m === 'ancient-village-gate' || /^(đình|cổng làng|làng)\b/iu.test(name)) {
    return CATEGORY_META['08-communal-houses-villages']!;
  }
  if (m === 'khue-van-cac' || m === 'van-mieu-mon' || m === 'van-mieu-gate' || m === 'van-mieu-hall' || m === 'nha-thai-hoc' || m === 'hanoi-opera-house' || m === 'hoa-lo-prison' || m === 'ga-ha-noi' || m === 'french-colonial-university' || /Đại học|Học viện|Trường|Bệnh viện|Văn Miếu|Quốc Tử Giám/iu.test(name)) {
    return CATEGORY_META['09-french-colonial-culture-edu-med']!;
  }
  if (m === 'ho-chi-minh-museum' || m === 'national-history-museum' || m === 'bao-tang-dan-toc-hoc' || m === 'bao-tang-ha-noi' || m === 'fine-arts-museum' || m === 'military-history-museum' || m === 'national-exhibition-center' || /^bảo tàng\b/iu.test(name)) {
    return CATEGORY_META['10-museums-exhibitions']!;
  }
  if (m === 'daewoo-hotel' || m === 'pullman-hanoi' || m === 'novotel' || m === 'metropole-hotel' || m === 'jw-marriott-hanoi' || m === 'intercontinental-westlake' || m === 'pan-pacific-hanoi' || /Hotel|Khách sạn|Novotel|Fortuna|Capella|Metropole|Marriott|Sheraton|Hilton|Melia/iu.test(name)) {
    return CATEGORY_META['12-luxury-hotels']!;
  }
  if (m === 'svd-my-dinh' || m === 'tt-hoi-nghi-quoc-gia' || m === 'cau-nhat-tan' || m === 'cau-long-bien' || m === 'cau-chuong-duong' || m === 'arch-extradosed-bridge' || m === 'indoor-sports-arena' || /^(cầu|sân vận động|cung thể thao)\b/iu.test(name)) {
    return CATEGORY_META['13-bridges-stadiums-parks']!;
  }
  return CATEGORY_META['11-skyscrapers-malls-modern']!;
}

/** Legacy standalone archetypes kept only for backward-compatible direct `buildShowcase(city, 'house:...')` calls in tests */
interface ArchetypeDef {
  id: string;
  name: string;
  subtitle: string;
  zoom: number;
  kind: 'house' | 'apartment';
  w: number;
  d: number;
  house?: HouseInput;
}

const LEGACY_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'house:shop',
    name: 'Nhà ống mặt phố · Quán cà phê (4 tầng)',
    subtitle: 'Mặt tiền 4,5 m · mái hiên vải · biển hiệu dọc & standee · phòng tum, giàn phơi & bồn nước',
    zoom: 9.2,
    kind: 'house',
    w: 4.5,
    d: 15,
    house: { id: 'house:shop', preset: 'nha-mau', seed: 101, w: 4.5, d: 15 },
  },
  {
    id: 'house:cafe',
    name: 'Nhà phố 3 gian · Thời trang (4 tầng)',
    subtitle: 'Mặt tiền 9,0 m · cửa kính lớn · ban công kính · mái che sân thượng & thái dương năng',
    zoom: 7.5,
    kind: 'house',
    w: 9,
    d: 15,
    house: { id: 'house:cafe', preset: 'nha-pho-rong', seed: 204, w: 9, d: 15 },
  },
  {
    id: 'house:modern',
    name: 'Nhà rộng có bán hầm gara (5 tầng)',
    subtitle: 'Mặt tiền 10 m · tầng bán hầm · mặt tiền nhà hàng · giàn mái sân thượng & cây cảnh',
    zoom: 7.0,
    kind: 'house',
    w: 10,
    d: 16,
    house: { id: 'house:modern', preset: 'wide-basement', seed: 309, w: 10, d: 16 },
  },
  {
    id: 'house:tin',
    name: 'Nhà ống 5 tầng chuồng cọp · Phở bò',
    subtitle: 'Mặt tiền 4,0 m · tầng 1 quán phở · lồng sắt chuồng cọp · mái tôn chống nóng',
    zoom: 8.5,
    kind: 'house',
    w: 4.0,
    d: 16,
    house: { id: 'house:tin', preset: 'tube-5f-cage', seed: 412, w: 4.0, d: 16 },
  },
  {
    id: 'block:tap-the',
    name: 'Nhà tập thể cũ Hà Nội (5 tầng)',
    subtitle: 'Khối tập thể 5 tầng · chuồng cọp đua ra phố · tường sơn cũ · bồn nước & mái tôn',
    zoom: 6.2,
    kind: 'house',
    w: 12,
    d: 12,
    house: { id: 'block:tap-the', preset: 'tap-the', seed: 515, w: 12, d: 12 },
  },
];

function buildingBoundsPts(b: Building): Vec2[] {
  const pts = [b.footprint, ...b.parts.map(p => p.footprint), landmarkExtraBoundsPts(b)].flat();
  if (b.model === 'national-cinema') {
    const rc = nationalCinemaRotundaCenter(b);
    pts.push([rc[0] - 22, rc[1] - 20], [rc[0] + 22, rc[1] + 18]);
  }
  return pts;
}

/**
 * Hierarchically organized architectural landmarks and stations for the city:
 * Country (Quốc gia) → City/Province (Thành phố/Tỉnh) → Category (Nhóm công trình) → Landmark.
 */
export function showcasesOf(city: City): ShowcaseItem[] {
  const out: ShowcaseItem[] = [];
  const loc = resolveCityHierarchy(city);
  const norm = (s: string) => s.trim().toLowerCase();
  const catalogCoveredNames = new Set<string>();

  // 1. Curated 13-Category City Landmarks Catalog (208 iconic Hanoi relics, citadels, ministries, churches, pagodas, bridges...)
  if (city.landmarksCatalog) {
    for (const entry of city.landmarksCatalog) {
      catalogCoveredNames.add(norm(entry.name));

      const [w, d] = entry.footprintSize;
      const lv = entry.floors.length;
      const h = Math.round(entry.floors.reduce((s, f) => s + f, 0));
      const span = Math.max(w, d);
      const radius = Math.max(24, Math.round(span * 0.72 + 14));
      const zoom = Math.max(2.2, Math.min(7.5, 220 / Math.max(span * 1.15, h * 1.25)));
      const aliasSuffix =
        entry.id === 'vincom-royal-city' && !entry.name.includes('Vinhomes Royal City')
          ? ' (Vinhomes Royal City)'
          : '';
      out.push({
        id: `catalog:${entry.id}`,
        countryCode: loc.countryCode,
        countryName: loc.countryName,
        cityId: loc.cityId,
        cityName: loc.cityName,
        district: entry.district,
        categoryId: entry.category,
        group: entry.categoryTitle,
        name: `${entry.name}${aliasSuffix} (${lv} tầng)`,
        subtitle: `${entry.address ? `${entry.address} · ` : ''}${entry.district} · ${entry.description}`,
        levels: lv,
        heightM: h,
        address: entry.address,
        isBespoke: true,
        zoom: Number(zoom.toFixed(2)),
        radius,
      });
    }
  }

  // 2. Additional bespoke/major OSM landmarks not already represented by exact name in `landmarksCatalog`
  //    (e.g. Khuê Văn Các, Nhà sàn Bác Hồ, Văn Miếu Môn, Điện Đại Thành, Nhà Thái Học, VPBank Tower, Trung tâm Chiếu phim Quốc gia...)
  const maxLevels = (b: Building) => Math.max(...b.parts.map(p => p.floors.length));
  const maxHeight = (b: Building) => Math.max(...b.parts.map(p => p.z0 + p.floors.reduce((a, h) => a + h, 0)));

  const osmLandmarks = city.buildings.filter(b => {
    if (!b.name) return false;
    const lv = maxLevels(b);
    const box = bbox(buildingBoundsPts(b));
    const span = Math.hypot(box.x1 - box.x0, box.y1 - box.y0);
    return (
      Boolean(b.model || b.isSignatureLandmark) ||
      lv >= 8 ||
      (lv >= 4 &&
        span >= 32 &&
        /Tower|Plaza|Vincom|MIPEC|Novotel|Thái Bình|Sky|VPBank|Chiếu phim|Diamond|Peak|Fortuna|CONINCO|Eurowindow|Capella|Geleximco|Ngân hàng|Đại học|Học viện/i.test(
          b.name,
        ))
    );
  });

  osmLandmarks.sort((a, b) => {
    const ba = b.model !== undefined ? 1 : 0;
    const aa = a.model !== undefined ? 1 : 0;
    if (aa !== ba) return ba - aa;
    return maxHeight(b) - maxHeight(a) || a.name!.localeCompare(b.name!, 'vi');
  });

  const seenNames = new Set<string>(catalogCoveredNames);
  for (const b of osmLandmarks) {
    const name = b.name!.trim();
    const nKey = norm(name);
    if (seenNames.has(nKey)) continue;
    seenNames.add(nKey);

    const lv = maxLevels(b);
    const h = Math.round(maxHeight(b));
    const box = bbox(buildingBoundsPts(b));
    const span = Math.max(box.x1 - box.x0, box.y1 - box.y0);
    const radius = Math.max(24, Math.round(span * 0.72 + 14));
    const zoom = Math.max(2.2, Math.min(7.5, 220 / Math.max(span * 1.15, h * 1.25)));
    const cat = classifyOsmBuildingCategory(b);
    out.push({
      id: `bldg:${b.id}`,
      countryCode: loc.countryCode,
      countryName: loc.countryName,
      cityId: loc.cityId,
      cityName: loc.cityName,
      district: b.district ?? 'Hà Nội',
      categoryId: cat.id,
      group: cat.title,
      name: `${name} (${lv} tầng)`,
      subtitle: `${b.address ? `${b.address} · ` : ''}${b.district ? `${b.district} · ` : ''}${b.description ?? `${lv} tầng (${h} m) · dữ liệu mặt bằng OpenStreetMap`}`,
      levels: lv,
      heightM: h,
      address: b.address,
      isBespoke: Boolean(b.model),
      zoom: Number(zoom.toFixed(2)),
      radius,
    });
  }

  // 3. Elevated Metro Stations (Tuyến 2A Cát Linh – Hà Đông & Tuyến 3 Nhổn – Ga Hà Nội)
  const metroCat = CATEGORY_META['14-metro-stations']!;
  for (const st of city.stations.filter(s => s.kind === 'metro')) {
    const tag = st.lineTag ?? 'Metro 2A';
    const lineDesc = st.lineName ?? 'Tuyến 2A Cát Linh – Hà Đông';
    out.push({
      id: `station:${st.id}`,
      countryCode: loc.countryCode,
      countryName: loc.countryName,
      cityId: loc.cityId,
      cityName: loc.cityName,
      district: st.district ?? 'Hà Nội',
      categoryId: metroCat.id,
      group: metroCat.title,
      name: `Ga đường sắt trên cao ${st.name} (${tag})`,
      subtitle: `${st.address ? `${st.address} · ` : ''}Ga ${st.name} · ${lineDesc} · 3 tầng, cầu cạn & đoàn tàu 4 toa`,
      levels: 3,
      heightM: 18,
      address: st.address,
      isBespoke: true,
      zoom: 3.4,
      radius: 46,
    });
  }

  // Sort items cleanly by Category ID so all items in the same architectural group are contiguous
  out.sort((a, b) => a.categoryId.localeCompare(b.categoryId));

  return out;
}

/**
 * Create a positive-area (counter-clockwise) axis-aligned rectangle `[-hw..hw] × [-hd..hd]`
 * whose Edge 0 (`[hw, hd] -> [-hw, hd]`) sits at `y = +hd` with outward normal `[0, +1]` facing
 * the diorama's front street.
 */
function makeShowcaseRect(hw: number, hd: number): Vec2[] {
  return [
    [hw, hd],
    [-hw, hd],
    [-hw, -hd],
    [hw, -hd],
  ];
}

/**
 * Rigidly rotate an OSM building around its oriented bounding box centre so its primary axis
 * aligns with the showcase plate (`u = [-1, 0], v = [0, -1]`, front `-v = [0, +1]` facing `+y`).
 */
function orientBuildingForShowcase(b: Building): Building {
  if (b.model === 'national-cinema') {
    return { ...b, house: undefined };
  }
  const ob = orientedBoxOf(b.footprint, b.front);
  const rotateRing = (ring: readonly Vec2[]): Vec2[] =>
    ring.map(([x, y]): Vec2 => {
      const dx = x - ob.c[0], dy = y - ob.c[1];
      const du = dx * ob.u[0] + dy * ob.u[1];
      const dv = dx * ob.v[0] + dy * ob.v[1];
      return [-du, -dv];
    });
  return {
    ...b,
    house: b.model || b.isSignatureLandmark ? undefined : b.house,
    footprint: rotateRing(b.footprint),
    parts: b.parts.map(p => ({
      ...p,
      footprint: rotateRing(p.footprint),
    })),
  };
}

const MULTI_PART_CUSTOM_MODELS = new Set<string>(['van-mieu-hall', 'nha-thai-hoc']);

function buildingFromCatalogEntry(city: City, entry: CityLandmarkCatalogEntry): Building {
  const norm = (s: string) => s.trim().toLowerCase();
  const targetNames = new Set<string>([norm(entry.name), ...(entry.aliases ?? []).map(norm)]);
  const matched = city.buildings.find(
    b =>
      (entry.osmSource && b.source === entry.osmSource) ||
      (b.name && targetNames.has(norm(b.name))),
  );
  const model = matched?.model ?? entry.model;
  // Use the multi-part OSM building when it has multiple 3D parts (e.g. Lăng Bác, Nhà Quốc hội, Lotte Center, Keangnam, Royal City)
  // or when its model builds atop extruded OSM parts; for single-part CUSTOM_MASSING_MODELS, use the exact catalog footprintSize.
  if (
    matched &&
    (!CUSTOM_MASSING_MODELS.has(model) || MULTI_PART_CUSTOM_MODELS.has(model) || matched.parts.length > 1)
  ) {
    return orientBuildingForShowcase({
      ...matched,
      model,
      house: undefined,
      isSignatureLandmark: true,
      description: matched.description ?? entry.description,
    });
  }
  const [w, d] = entry.footprintSize;
  const hw = w / 2, hd = d / 2;
  const fp = makeShowcaseRect(hw, hd);
  return {
    id: matched?.id ?? `cat_${entry.id}`,
    name: entry.name,
    kind: entry.kind,
    footprint: fp,
    front: 0,
    levelsFrom: 'osm',
    model,
    isSignatureLandmark: true,
    address: entry.address,
    district: entry.district,
    description: entry.description,
    parts: [
      {
        id: `cat_${entry.id}_p0`,
        footprint: fp,
        z0: 0,
        floors: [...entry.floors],
        facade: entry.facade ?? 'wall',
        roof: 'flat',
        source: entry.osmSource ?? `catalog:${entry.id}`,
      },
    ],
    source: entry.osmSource ?? `catalog:${entry.id}`,
  };
}

/** Measure exact XY bounding box (in city metres) of all emitted 3D vertices in `B` */
function batchBoundsXY(
  B: Batch,
  flags: readonly WavingFlagSpec[],
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const scan = (arr: readonly number[]) => {
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i]!, y = arr[i + 2]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };
  for (const arr of B.tris.values()) scan(arr);
  scan(B.creases);
  scan(B.details);
  scan(B.win);
  for (const f of flags) {
    const [fx, fy] = f.polePos;
    if (fx - 2 < minX) minX = fx - 2;
    if (fx + 2 > maxX) maxX = fx + 2;
    if (fy - 2 < minY) minY = fy - 2;
    if (fy + 2 > maxY) maxY = fy + 2;
  }
  if (!Number.isFinite(minX)) {
    return { minX: -8, maxX: 8, minY: -8, maxY: 8 };
  }
  return { minX, maxX, minY, maxY };
}

/** Translate all emitted vertices in `B` by `(dx, dy)` in city XY and `dz` in city Z (Three.js Y) */
function translateBatchXYZ(B: Batch, dx: number, dy: number, dz: number) {
  const shift = (arr: number[]) => {
    for (let i = 0; i < arr.length; i += 3) {
      arr[i]! += dx;
      arr[i + 1]! += dz;
      arr[i + 2]! += dy;
    }
  };
  for (const arr of B.tris.values()) shift(arr);
  shift(B.shell.pos);
  shift(B.creases);
  shift(B.details);
  shift(B.win);
}

/** Draw an iso-glow style architectural diorama base plate from [-hx, -hy] to [hx, hy]:
    - chamfered/stepped base slab (z = -1.8 .. 0) with inset detail border and 4 corner bolts;
    - front street strip along +y with dashed lane markings, raised curb, paved sidewalk slits,
      working street lamps (with night light pools) and 3D street trees. */
function drawPlate(
  B: Batch,
  hx: number,
  hy: number,
  roadY0: number,
  roadY1: number,
  pools: number[],
  seedKey: string,
) {
  const chamfer = (w: number, d: number, c: number): Vec2[] => [
    [-w + c, -d],
    [w - c, -d],
    [w, -d + c],
    [w, d - c],
    [w - c, d],
    [-w + c, d],
    [-w, d - c],
    [-w, -d + c],
  ];
  // lower stepped plinth lip + main diorama plate
  B.solid(chamfer(hx + 0.6, hy + 0.6, 1.4), -1.85, -1.35, () => 'roof', 'roof');
  B.solid(chamfer(hx, hy, 1.2), -1.35, 0, () => 'wall', 'walk');

  // inset border line on the plate top + 4 corner recess bolts (as in iso-glow 10-diner.js)
  const m = 1.2, c = 0.9;
  B.loop(chamfer(hx - m, hy - m, c).map(([x, y]) => V(x, y, 0.02)), 'detail');
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const bx = sx * (hx - 2.2), by = sy * (hy - 2.2), br = 0.45;
    const oct = Array.from({ length: 8 }, (_, i): Vec2 => [
      bx + br * Math.cos((i * Math.PI) / 4),
      by + br * Math.sin((i * Math.PI) / 4),
    ]);
    B.flat('road', oct, 0.025, 'detail');
    B.line(V(bx - br * 0.6, by, 0.03), V(bx + br * 0.6, by, 0.03), 'detail');
  }

  // front street strip along [roadY0, roadY1]
  const rx0 = -hx + 1.4, rx1 = hx - 1.4;
  if (roadY1 > roadY0 + 2) {
    B.flat('road', [[rx0, roadY0], [rx1, roadY0], [rx1, roadY1], [rx0, roadY1]], 0.02);
    // raised sidewalk between the building lot and the road curb
    const walkY0 = -hy + 1.4, walkY1 = roadY0;
    B.solid([[rx0, walkY0], [rx1, walkY0], [rx1, walkY1], [rx0, walkY1]], 0, 0.16, () => 'wall', 'walk');
    // sidewalk paving joint lines along the front curb walk
    const curbWalk0 = Math.max(walkY0, roadY0 - 3.6);
    B.line(V(rx0, curbWalk0, 0.17), V(rx1, curbWalk0, 0.17), 'detail');
    for (let x = Math.ceil(rx0 / 2.5) * 2.5; x <= rx1 - 0.5; x += 2.5) {
      B.line(V(x, curbWalk0, 0.17), V(x, roadY0, 0.17), 'detail');
    }
    // road edge lines + center dashed markings
    for (const ey of [roadY0 + 0.35, roadY1 - 0.35]) {
      B.line(V(rx0 + 0.4, ey, 0.035), V(rx1 - 0.4, ey, 0.035), 'detail');
    }
    const midY = (roadY0 + roadY1) / 2;
    for (let x = rx0 + 1.2; x + 2.6 <= rx1 - 1.0; x += 5.2) {
      B.flat('marking', [[x, midY - 0.14], [x + 2.6, midY - 0.14], [x + 2.6, midY + 0.14], [x, midY + 0.14]], 0.035);
    }

    // street lamps & trees along the curb
    const curbY = roadY0 - 0.65;
    const lampXs = hx >= 24 ? [-hx * 0.55, hx * 0.55] : [-hx * 0.48];
    lampXs.forEach((lx, i) => {
      const p: Prop = {
        id: `${seedKey}:lamp:${i}`,
        kind: 'lamp',
        at: [lx, curbY],
        z0: 0.16,
        heading: Math.PI / 2,
        road: 's-front',
      };
      lampPost(B, p, pools);
    });
    const treeXs =
      hx >= 26
        ? [-hx + 4.2, -hx * 0.32, hx * 0.32, hx - 4.2]
        : [-hx + 3.6, hx - 3.6];
    treeXs.forEach((tx, i) => {
      const p: Prop = {
        id: `${seedKey}:tree:${i}`,
        kind: 'tree',
        at: [tx, curbY - 0.2],
        z0: 0.16,
        heading: 0,
        size: i % 2 === 0 ? 'large' : 'small',
        road: 's-front',
      };
      tree(B, p, true);
    });
  }
}

export function buildShowcase(city: City, id: string): BuiltShowcase | null {
  const items = showcasesOf(city);
  const loc = resolveCityHierarchy(city);
  let item = items.find(x => x.id === id);

  // Backward-compatible fallback for legacy house archetypes if requested directly by ID
  if (!item) {
    const arch = LEGACY_ARCHETYPES.find(a => a.id === id);
    if (arch) {
      item = {
        id: arch.id,
        countryCode: loc.countryCode,
        countryName: loc.countryName,
        cityId: loc.cityId,
        cityName: loc.cityName,
        categoryId: '05-hoan-kiem-old-quarter',
        group: CATEGORY_META['05-hoan-kiem-old-quarter']!.title,
        name: arch.name,
        subtitle: arch.subtitle,
        zoom: arch.zoom,
        radius: Math.max(18, Math.round(Math.max(arch.w, arch.d) * 0.9 + 10)),
      };
    }
  }
  if (!item) return null;

  const B = new Batch(), pools: number[] = [];

  // ---- Case 1: Metro station showcase on an elevated viaduct plate ----
  if (id.startsWith('station:')) {
    const stId = id.slice('station:'.length);
    const orig = city.stations.find(s => s.id === stId) ?? city.stations[0];
    const hx = 48, hy = 24;
    drawPlate(B, hx, hy, 0, 0, pools, id);
    const rx0 = -hx + 1.4, rx1 = hx - 1.4, roadEdge = 12.0;
    B.flat('road', [[rx0, -roadEdge], [rx1, -roadEdge], [rx1, roadEdge], [rx0, roadEdge]], 0.02);
    for (const sy of [-1, 1] as const) {
      const w0 = sy > 0 ? roadEdge : -hy + 1.4, w1 = sy > 0 ? hy - 1.4 : -roadEdge;
      B.solid([[rx0, w0], [rx1, w0], [rx1, w1], [rx0, w1]], 0, 0.16, () => 'wall', 'walk');
      const laneY = sy * 7.2;
      for (let x = rx0 + 1.5; x + 2.8 <= rx1 - 1.5; x += 5.6) {
        B.flat('marking', [[x, laneY - 0.13], [x + 2.8, laneY - 0.13], [x + 2.8, laneY + 0.13], [x, laneY + 0.13]], 0.035);
      }
      for (const lx of [-hx + 5.5, hx - 5.5]) {
        lampPost(
          B,
          {
            id: `${id}:lamp:${sy}:${lx}`,
            kind: 'lamp',
            at: [lx, sy * (roadEdge + 0.8)],
            z0: 0.16,
            heading: sy > 0 ? -Math.PI / 2 : Math.PI / 2,
            road: 's-front',
          },
          pools,
        );
      }
      for (const tx of [-hx + 4.2, hx - 4.2]) {
        tree(
          B,
          {
            id: `${id}:ftree:${sy}:${tx}`,
            kind: 'tree',
            at: [tx, sy * (hy - 3.6)],
            z0: 0.16,
            heading: 0,
            size: 'large',
            road: 's-front',
          },
          true,
        );
      }
    }
    const h = 12.5;
    const mockCity: City = {
      ...city,
      bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
      buildings: [],
      streets: [],
      areas: [],
      features: [],
      junctions: [],
      rails: [
        { id: 'r-up', kind: 'metro', path: [[-hx + 1.5, -2.1], [hx - 1.5, -2.1]], height: h, elevated: true, source: 'showcase' },
        { id: 'r-dn', kind: 'metro', path: [[hx - 1.5, 2.1], [-hx + 1.5, 2.1]], height: h, elevated: true, source: 'showcase' },
      ],
      stations: [
        {
          id: orig?.id ?? 's-showcase',
          name: orig?.name ?? 'Thái Hà',
          kind: 'metro',
          at: [0, 0],
          platforms: [[[-32, -4], [32, -4]], [[-32, 4], [32, 4]]],
          source: 'showcase',
        },
      ],
    };
    const shellB = new Batch();
    buildMetro(B, mockCity, shellB);
    const cars = [-22.5, -7.5, 7.5, 22.5].map((x, k) => ({
      cab: k === 0 || k === 3,
      at: [x, 2.1, h] as [number, number, number],
      heading: k === 3 ? Math.PI : 0,
    }));
    return {
      item,
      layer: layerOf(B, true),
      shellLayer: layerOf(shellB, true),
      pools: poolGeometry(pools),
      beacons: [],
      flags: [],
      cars,
      floors: [],
    };
  }

  // ---- Case 2: OSM Landmark Building or 13-Category Catalog Landmark showcase ----
  if (id.startsWith('bldg:') || id.startsWith('catalog:')) {
    let b: Building | undefined;
    if (id.startsWith('bldg:')) {
      const bId = id.slice('bldg:'.length);
      const found = city.buildings.find(x => x.id === bId);
      if (found) b = orientBuildingForShowcase(found);
    } else {
      const catId = id.slice('catalog:'.length);
      const entry = city.landmarksCatalog?.find(x => x.id === catId);
      if (entry) b = buildingFromCatalogEntry(city, entry);
    }
    if (!b) return null;

    // 1. Build the landmark into `B` first so we can measure the true 3D vertex bounding box
    const preCity: City = {
      ...city,
      bounds: { x0: -250, y0: -250, x1: 250, y1: 250 },
      buildings: [b],
      streets: [
        {
          id: 's-front',
          name: 'Đường trước tòa nhà',
          kind: 'primary',
          path: [[-200, 120], [200, 120]],
          width: 8.5,
          lanes: 2,
          oneway: false,
          sidewalk: { left: 3.5, right: 3.5 },
          layer: 0,
          profile: [],
          source: 'showcase',
        },
      ],
      areas: [],
      features: [],
      junctions: [],
      rails: [],
      stations: [],
    };
    buildBuildings(B, preCity, [b], 3);
    const rawBeacons = beaconsOf(preCity);
    const rawFlags = flagpolesOf(preCity);

    // 2. Measure the true emitted 3D geometry bounds and size/center the diorama base plate around it
    const { minX, maxX, minY, maxY } = batchBoundsXY(B, rawFlags);
    const bw = Math.max(4, maxX - minX);
    const bd = Math.max(4, maxY - minY);
    const roadW = 8.5, frontMargin = 4.5, backMargin = 5.5;
    const hx = Math.max(16, Math.ceil(bw / 2 + 8.5));
    const hy = Math.max(15, Math.ceil((bd + backMargin + frontMargin + roadW) / 2));
    const roadY0 = hy - roadW - 1.4, roadY1 = hy - 1.4;

    const dx = -(minX + maxX) * 0.5;
    const dy = roadY0 - frontMargin - maxY;
    const dz = 0.16;

    // 3. Shift the emitted building vertices, beacons, and waving flags onto the centred plaza slab (z = 0.16)
    translateBatchXYZ(B, dx, dy, dz);
    const beacons = rawBeacons.map(v => new THREE.Vector3(v.x + dx, v.y + dz, v.z + dy));
    const flags: WavingFlagSpec[] = rawFlags.map(f => ({
      ...f,
      polePos: [f.polePos[0] + dx, f.polePos[1] + dy],
      z0: f.z0 + dz,
      z1: f.z1 + dz,
    }));

    // 4. Draw the diorama base plate, front street, sidewalk, trees, street lamps & rear garden lamps
    drawPlate(B, hx, hy, roadY0, roadY1, pools, id);
    for (const sx of [-1, 1] as const) {
      parkLamp(
        B,
        {
          id: `${id}:plamp:${sx}`,
          kind: 'park-lamp',
          at: [sx * (hx - 4), -hy + 4],
          z0: 0.16,
          heading: 0,
          road: 's-front',
        },
        pools,
      );
    }

    const moveRing = (r: readonly Vec2[]): Vec2[] => r.map(([x, y]) => [x + dx, y + dy]);
    const shifted: Building = {
      ...b,
      footprint: moveRing(b.footprint),
      parts: b.parts.map(p => ({ ...p, footprint: moveRing(p.footprint), z0: p.z0 + dz })),
    };
    const mockCity: City = {
      ...preCity,
      bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
      buildings: [shifted],
    };

    const updatedItem: ShowcaseItem = {
      ...item,
      radius: Math.max(24, Math.round(Math.max(hx, hy) * 1.15)),
    };

    return {
      item: updatedItem,
      layer: layerOf(B, true, mockCity),
      pools: poolGeometry(pools),
      beacons,
      flags,
      cars: [],
      floors: cityFloors(mockCity),
    };
  }

  // ---- Case 3: Legacy standalone archetypes (for backward-compatible direct test calls) ----
  const arch = LEGACY_ARCHETYPES.find(a => a.id === id);
  if (!arch) return null;

  const hx = Math.max(12, Math.round(arch.w / 2 + 7.5));
  const roadW = 7.5, frontMargin = 3.8, backMargin = 4.2;
  const hy = Math.max(13, Math.round((arch.d + backMargin + frontMargin + roadW) / 2));
  const roadY0 = hy - roadW - 1.4, roadY1 = hy - 1.4;
  drawPlate(B, hx, hy, roadY0, roadY1, pools, id);

  const yFront = roadY0 - frontMargin, yBack = yFront - arch.d;
  const x0 = -arch.w / 2, x1 = arch.w / 2;
  // Counter-clockwise positive-area footprint with edge 0 = front edge along yFront (from x1 to x0, normal [0, +1])
  const fp: Vec2[] = [
    [x1, yFront],
    [x0, yFront],
    [x0, yBack],
    [x1, yBack],
  ];

  let bldg: Building;
  if (arch.kind === 'house' && arch.house) {
    const resolved = resolveHouse(arch.house);
    const floors = houseStoreys(resolved.spec);
    bldg = {
      id: arch.id,
      name: arch.name,
      kind: resolved.spec.shop ? 'commercial' : 'tube-house',
      footprint: fp,
      front: 0,
      levelsFrom: 'rule',
      parts: [{ id: arch.id, footprint: fp, z0: 0.16, floors, facade: 'wall', roof: 'flat', source: 'showcase' }],
      house: { input: arch.house, spec: resolved.spec },
      source: 'showcase',
    };
  } else {
    const floors = [3.8, 3.2, 3.2, 3.2, 3.2];
    bldg = {
      id: arch.id,
      name: arch.name,
      kind: 'apartment',
      footprint: fp,
      front: 0,
      levelsFrom: 'rule',
      parts: [{ id: arch.id, footprint: fp, z0: 0.16, floors, facade: 'wall', roof: 'flat', source: 'showcase' }],
      source: 'showcase',
    };
  }

  for (const sx of [-1, 1] as const) {
    parkLamp(
      B,
      { id: `${id}:plamp:${sx}`, kind: 'park-lamp', at: [sx * (hx - 3.2), -hy + 3.2], z0: 0.16, heading: 0, road: 's-front' },
      pools,
    );
  }

  const mockCity: City = {
    ...city,
    bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
    buildings: [bldg],
    streets: [
      {
        id: 's-front',
        name: 'Phố mẫu Hà Nội',
        kind: 'primary',
        path: [[-hx, (roadY0 + roadY1) / 2], [hx, (roadY0 + roadY1) / 2]],
        width: roadW,
        lanes: 2,
        oneway: false,
        sidewalk: { left: 3.5, right: 3.5 },
        layer: 0,
        profile: [],
        source: 'showcase',
      },
    ],
    areas: [],
    features: [],
    junctions: [],
    rails: [],
    stations: [],
  };
  buildBuildings(B, mockCity, [bldg], 3);
  return {
    item,
    layer: layerOf(B, true, mockCity),
    pools: poolGeometry(pools),
    beacons: [],
    flags: [],
    cars: [],
    floors: cityFloors(mockCity),
  };
}
