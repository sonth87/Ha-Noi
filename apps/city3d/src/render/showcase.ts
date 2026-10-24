/* Standalone showcase dioramas on an iso-glow base plate: each item in the dropdown is either a
   major landmark building / station from the OpenStreetMap city model (centred at (0, 0) on a
   bespoke plinth with a front street, sidewalk, trees and street lamps) or an iconic Hanoi building
   archetype built at L3 detail. Every showcase uses the same Batch / Layer pipeline as the map, so
   day/night, bloom, window lighting and clicking a floor to toggle its lights all work unchanged. */
import * as THREE from 'three';
import { bbox, floorId, houseStoreys, resolveHouse, type Building, type City, type CityLandmarkCatalogEntry, type HouseInput, type Prop, type Vec2 } from '@my-city/core';
import { Batch, V } from './batch';
import { beaconsOf, buildBuildings, cityFloors, flagpolesOf, nationalCinemaRotundaCenter, type WavingFlagSpec } from './buildings';
import { layerOf, type Layer } from './city';
import { lampPost, parkLamp, poolGeometry, tree } from './furniture';
import { landmarkExtraBoundsPts } from './landmarks';
import { buildMetro } from './metro';

export interface ShowcaseItem {
  id: string;
  group: string;
  name: string;
  subtitle: string;
  /** initial camera zoom for framing the diorama */
  zoom: number;
  /** half-size of the diorama plate (m), for clamping camera pan */
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

const GROUP_LANDMARK = 'Công trình lớn (từ bản đồ OSM)';
const GROUP_ARCHETYPE = 'Mẫu kiến trúc Hà Nội (trên đế)';

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

const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'house:shop',
    name: 'Nhà ống mặt phố · Quán cà phê (4 tầng)',
    subtitle: 'Mặt tiền 4,5 m · mái hiên vải · biển hiệu dọc & standee · phòng tum, giàn phơi & bồn nước',
    zoom: 9.2, kind: 'house', w: 4.5, d: 15,
    house: { id: 'house:shop', preset: 'nha-mau', seed: 101, w: 4.5, d: 15 },
  },
  {
    id: 'house:cafe',
    name: 'Nhà phố 3 gian · Thời trang (4 tầng)',
    subtitle: 'Mặt tiền 9,0 m · cửa kính lớn · ban công kính · mái che sân thượng & thái dương năng',
    zoom: 7.5, kind: 'house', w: 9, d: 15,
    house: { id: 'house:cafe', preset: 'nha-pho-rong', seed: 204, w: 9, d: 15 },
  },
  {
    id: 'house:modern',
    name: 'Nhà rộng có bán hầm gara (5 tầng)',
    subtitle: 'Mặt tiền 10 m · tầng bán hầm · mặt tiền nhà hàng · giàn mái sân thượng & cây cảnh',
    zoom: 7.0, kind: 'house', w: 10, d: 16,
    house: { id: 'house:modern', preset: 'wide-basement', seed: 309, w: 10, d: 16 },
  },
  {
    id: 'house:tin',
    name: 'Nhà ống 5 tầng chuồng cọp · Phở bò',
    subtitle: 'Mặt tiền 4,0 m · tầng 1 quán phở · lồng sắt chuồng cọp · mái tôn chống nóng',
    zoom: 8.5, kind: 'house', w: 4.0, d: 16,
    house: { id: 'house:tin', preset: 'tube-5f-cage', seed: 412, w: 4.0, d: 16 },
  },
  {
    id: 'block:tap-the',
    name: 'Nhà tập thể cũ Hà Nội (5 tầng)',
    subtitle: 'Khối tập thể 5 tầng · chuồng cọp đua ra phố · tường sơn cũ · bồn nước & mái tôn',
    zoom: 6.2, kind: 'house', w: 12, d: 12,
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

/** Curated + automatically discovered landmark buildings from the OSM city model, plus stations and archetypes. */
export function showcasesOf(city: City): ShowcaseItem[] {
  const out: ShowcaseItem[] = [];

  // 1. Featured OSM landmarks (bespoke 3D models first, then signature landmarks, then tall towers)
  const bespokeModelPriority: Record<string, number> = {
    'khue-van-cac': 0,
    'ho-chi-minh-mausoleum': 1,
    'one-pillar-pagoda': 2,
    'nha-san-bac-ho': 3,
    'thap-rua': 4,
    'den-ngoc-son': 5,
    'hanoi-opera-house': 6,
    'st-joseph-cathedral': 7,
    'trang-tien-plaza': 8,
    'o-quan-chuong': 9,
    'chua-tran-quoc': 10,
    'den-quan-thanh': 11,
    'phu-tay-ho': 12,
    'den-hai-ba-trung': 13,
    'chua-quan-su': 14,
    'chua-phuc-khanh': 15,
    'van-mieu-mon': 16,
    'van-mieu-hall': 17,
    'nha-thai-hoc': 18,
    'hanoi-flag-tower': 19,
    'doan-mon': 20,
    'national-assembly': 21,
    'ho-chi-minh-museum': 22,
    'presidential-palace': 23,
    'bac-son-memorial': 24,
    'national-history-museum': 25,
    'hoa-lo-prison': 26,
    'cho-dong-xuan': 27,
    'lotte-center': 28,
    'vinhomes-metropolis': 29,
    'capital-place': 30,
    'daewoo-hotel': 31,
    'hanoi-centre': 32,
    'vincom-ba-trieu': 33,
    'royal-city': 34,
    'vincom-pnt': 35,
    'vincom-nct': 36,
    'pullman-hanoi': 37,
    'viet-tower': 38,
    novotel: 39,
    'vpbank-tower': 40,
    'national-cinema': 41,
    'van-mieu-gate': 42,
    'keangnam-landmark72': 43,
    'svd-my-dinh': 44,
    'bao-tang-ha-noi': 45,
    'tt-hoi-nghi-quoc-gia': 46,
    'bao-tang-dan-toc-hoc': 47,
    'cau-nhat-tan': 48,
    'cau-long-bien': 49,
    'tuong-dai-hoa-binh': 50,
    'lang-lua-van-phuc': 51,
    'times-city': 52,
    'traditional-temple': 60,
    'traditional-pagoda': 61,
    'church-hall': 62,
    'traditional-mausoleum': 63,
  };
  const maxLevels = (b: Building) => Math.max(...b.parts.map(p => p.floors.length));
  const maxHeight = (b: Building) => Math.max(...b.parts.map(p => p.z0 + p.floors.reduce((a, h) => a + h, 0)));

  const landmarks = city.buildings.filter(b => {
    if (!b.name) return false;
    const lv = maxLevels(b), box = bbox(buildingBoundsPts(b)), span = Math.hypot(box.x1 - box.x0, box.y1 - box.y0);
    return Boolean(b.model || b.isSignatureLandmark) || lv >= 8 || (lv >= 4 && span >= 32 && /Tower|Plaza|Vincom|MIPEC|Novotel|Thái Bình|Sky|VPBank|Chiếu phim|Diamond|Peak|Fortuna|CONINCO|Eurowindow|Capella|Geleximco|Ngân hàng|Đại học|Học viện/i.test(b.name));
  });

  landmarks.sort((a, b) => {
    const pa = a.model !== undefined ? (bespokeModelPriority[a.model] ?? 10) : 99;
    const pb = b.model !== undefined ? (bespokeModelPriority[b.model] ?? 10) : 99;
    if (pa !== pb) return pa - pb;
    return maxHeight(b) - maxHeight(a) || a.name!.localeCompare(b.name!, 'vi');
  });

  const seenNames = new Set<string>();
  let insertedStations = false;
  const bespokeCount = landmarks.filter(b => b.model !== undefined).length;
  let seenBespoke = 0;

  const insertMetroStations = () => {
    if (insertedStations) return;
    insertedStations = true;
    for (const st of city.stations.filter(s => s.kind === 'metro')) {
      const tag = st.lineTag ?? 'Metro 2A';
      const lineDesc = st.lineName ?? 'Tuyến 2A Cát Linh – Hà Đông';
      out.push({
        id: `station:${st.id}`,
        group: GROUP_LANDMARK,
        name: `Ga đường sắt trên cao ${st.name} (${tag})`,
        subtitle: `Ga ${st.name} · ${lineDesc} · 3 tầng, cầu cạn & đoàn tàu 4 toa`,
        zoom: 3.4,
        radius: 46,
      });
    }
  };

  for (const b of landmarks) {
    if (b.model !== undefined) seenBespoke++;
    const name = b.name!.trim();
    if (!seenNames.has(name)) {
      seenNames.add(name);
      const lv = maxLevels(b), h = Math.round(maxHeight(b));
      const box = bbox(buildingBoundsPts(b)), span = Math.max(box.x1 - box.x0, box.y1 - box.y0);
      const radius = Math.max(24, Math.round(span * 0.72 + 14));
      const zoom = Math.max(2.2, Math.min(7.5, 220 / Math.max(span * 1.15, h * 1.25)));
      out.push({
        id: `bldg:${b.id}`,
        group: GROUP_LANDMARK,
        name: `${name} (${lv} tầng)`,
        subtitle: `${name} · ${lv} tầng (${h} m) · dữ liệu mặt bằng OpenStreetMap`,
        zoom: Number(zoom.toFixed(2)),
        radius,
      });
    }
    // insert Metro stations right after the bespoke 3D model landmarks
    if (seenBespoke >= bespokeCount) insertMetroStations();
  }
  insertMetroStations();

  // 2. Standalone Hanoi architectural archetypes
  for (const a of ARCHETYPES) {
    out.push({
      id: a.id,
      group: GROUP_ARCHETYPE,
      name: a.name,
      subtitle: a.subtitle,
      zoom: a.zoom,
      radius: Math.max(18, Math.round(Math.max(a.w, a.d) * 0.9 + 10)),
    });
  }

  // 3. Full 13-Category City Landmarks Catalog (208 iconic Hanoi relics, citadels, ministries, churches, pagodas, bridges...)
  if (city.landmarksCatalog) {
    for (const entry of city.landmarksCatalog) {
      const [w, d] = entry.footprintSize;
      const lv = entry.floors.length;
      const h = Math.round(entry.floors.reduce((s, f) => s + f, 0));
      const span = Math.max(w, d);
      const radius = Math.max(24, Math.round(span * 0.72 + 14));
      const zoom = Math.max(2.2, Math.min(7.5, 220 / Math.max(span * 1.15, h * 1.25)));
      out.push({
        id: `catalog:${entry.id}`,
        group: entry.categoryTitle,
        name: `${entry.name} (${lv} tầng)`,
        subtitle: `${entry.address ? `${entry.address} · ` : ''}${entry.district} · ${entry.description}`,
        zoom: Number(zoom.toFixed(2)),
        radius,
      });
    }
  }

  return out;
}

function buildingFromCatalogEntry(city: City, entry: CityLandmarkCatalogEntry): Building {
  const norm = (s: string) => s.trim().toLowerCase();
  const targetNames = new Set<string>([norm(entry.name), ...(entry.aliases ?? []).map(norm)]);
  const matched = city.buildings.find(
    b =>
      (entry.osmSource && b.source === entry.osmSource) ||
      (b.name && targetNames.has(norm(b.name))),
  );
  if (matched) {
    return {
      ...matched,
      model: matched.model ?? entry.model,
      isSignatureLandmark: true,
      description: matched.description ?? entry.description,
    };
  }
  const [w, d] = entry.footprintSize;
  const hw = w / 2, hd = d / 2;
  const fp: Vec2[] = [
    [-hw, hd],
    [hw, hd],
    [hw, -hd],
    [-hw, -hd],
  ];
  return {
    id: `cat_${entry.id}`,
    name: entry.name,
    kind: entry.kind,
    footprint: fp,
    front: 0,
    levelsFrom: 'osm',
    model: entry.model,
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

/** Draw an iso-glow style architectural diorama base plate from [-hx, -hy] to [hx, hy]:
    - chamfered/stepped base slab (z = -1.8 .. 0) with inset detail border and 4 corner bolts;
    - front street strip along +y with dashed lane markings, raised curb, paved sidewalk slits,
      working street lamps (with night light pools) and 3D street trees. */
function drawPlate(
  B: Batch, hx: number, hy: number, roadY0: number, roadY1: number, pools: number[], seedKey: string,
) {
  const chamfer = (w: number, d: number, c: number): Vec2[] => [
    [-w + c, -d], [w - c, -d], [w, -d + c], [w, d - c], [w - c, d], [-w + c, d], [-w, d - c], [-w, -d + c],
  ];
  // lower stepped plinth lip + main diorama plate
  B.solid(chamfer(hx + 0.6, hy + 0.6, 1.4), -1.85, -1.35, () => 'roof', 'roof');
  B.solid(chamfer(hx, hy, 1.2), -1.35, 0, () => 'wall', 'walk');

  // inset border line on the plate top + 4 corner recess bolts (as in iso-glow 10-diner.js)
  const m = 1.2, c = 0.9;
  B.loop(chamfer(hx - m, hy - m, c).map(([x, y]) => V(x, y, 0.02)), 'detail');
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const bx = sx * (hx - 2.2), by = sy * (hy - 2.2), br = 0.45;
    const oct = Array.from({ length: 8 }, (_, i): Vec2 => [bx + br * Math.cos((i * Math.PI) / 4), by + br * Math.sin((i * Math.PI) / 4)]);
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
      const p: Prop = { id: `${seedKey}:lamp:${i}`, kind: 'lamp', at: [lx, curbY], z0: 0.16, heading: Math.PI / 2, road: 's-front' };
      lampPost(B, p, pools);
    });
    const treeXs = hx >= 26
      ? [-hx + 4.2, -hx * 0.32, hx * 0.32, hx - 4.2]
      : [-hx + 3.6, hx - 3.6];
    treeXs.forEach((tx, i) => {
      const p: Prop = { id: `${seedKey}:tree:${i}`, kind: 'tree', at: [tx, curbY - 0.2], z0: 0.16, heading: 0, size: i % 2 === 0 ? 'large' : 'small', road: 's-front' };
      tree(B, p, true);
    });
  }
}

export function buildShowcase(city: City, id: string): BuiltShowcase | null {
  const items = showcasesOf(city);
  const item = items.find(x => x.id === id);
  if (!item) return null;

  const B = new Batch(), pools: number[] = [];

  // ---- Case 1: Metro station showcase on an elevated viaduct plate ----
  if (id.startsWith('station:')) {
    const stId = id.slice('station:'.length);
    const orig = city.stations.find(s => s.id === stId) ?? city.stations[0];
    const hx = 48, hy = 24;
    // base plate with a 2-carriageway avenue (y ∈ [-12, 12]) and raised sidewalks on both sides (|y| ∈ [12, 22.6])
    drawPlate(B, hx, hy, 0, 0, pools, id);
    const rx0 = -hx + 1.4, rx1 = hx - 1.4, roadEdge = 12.0;
    B.flat('road', [[rx0, -roadEdge], [rx1, -roadEdge], [rx1, roadEdge], [rx0, roadEdge]], 0.02);
    for (const sy of [-1, 1] as const) {
      const w0 = sy > 0 ? roadEdge : -hy + 1.4, w1 = sy > 0 ? hy - 1.4 : -roadEdge;
      B.solid([[rx0, w0], [rx1, w0], [rx1, w1], [rx0, w1]], 0, 0.16, () => 'wall', 'walk');
      // dashed lane markings along each carriageway
      const laneY = sy * 7.2;
      for (let x = rx0 + 1.5; x + 2.8 <= rx1 - 1.5; x += 5.6) {
        B.flat('marking', [[x, laneY - 0.13], [x + 2.8, laneY - 0.13], [x + 2.8, laneY + 0.13], [x, laneY + 0.13]], 0.035);
      }
      // street lamps & trees near the outer ends of both sidewalks (clear of the stair/escalator ramps)
      for (const lx of [-hx + 5.5, hx - 5.5]) {
        lampPost(B, { id: `${id}:lamp:${sy}:${lx}`, kind: 'lamp', at: [lx, sy * (roadEdge + 0.8)], z0: 0.16, heading: sy > 0 ? -Math.PI / 2 : Math.PI / 2, road: 's-front' }, pools);
      }
      for (const tx of [-hx + 4.2, hx - 4.2]) {
        tree(B, { id: `${id}:ftree:${sy}:${tx}`, kind: 'tree', at: [tx, sy * (hy - 3.6)], z0: 0.16, heading: 0, size: 'large', road: 's-front' }, true);
      }
    }
    const h = 12.5;
    const mockCity: City = {
      ...city,
      bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
      buildings: [], streets: [], areas: [], features: [], junctions: [],
      rails: [
        { id: 'r-up', kind: 'metro', path: [[-hx + 1.5, -2.1], [hx - 1.5, -2.1]], height: h, elevated: true, source: 'showcase' },
        { id: 'r-dn', kind: 'metro', path: [[hx - 1.5, 2.1], [-hx + 1.5, 2.1]], height: h, elevated: true, source: 'showcase' },
      ],
      stations: [{
        id: orig?.id ?? 's-showcase',
        name: orig?.name ?? 'Thái Hà',
        kind: 'metro',
        at: [0, 0],
        platforms: [[[-32, -4], [32, -4]], [[-32, 4], [32, 4]]],
        source: 'showcase',
      }],
    };
    const shellB = new Batch();
    buildMetro(B, mockCity, shellB);
    // 4-car train standing at the platform on track 1
    const cars = [-22.5, -7.5, 7.5, 22.5].map((x, k) => ({
      cab: k === 0 || k === 3,
      at: [x, 2.1, h] as [number, number, number],
      heading: k === 3 ? Math.PI : 0,
    }));
    return { item, layer: layerOf(B, true), shellLayer: layerOf(shellB, true), pools: poolGeometry(pools), beacons: [], flags: [], cars, floors: [] };
  }

  // ---- Case 2: OSM Landmark Building or 13-Category Catalog Landmark showcase ----
  if (id.startsWith('bldg:') || id.startsWith('catalog:')) {
    let b: Building | undefined;
    if (id.startsWith('bldg:')) {
      const bId = id.slice('bldg:'.length);
      b = city.buildings.find(x => x.id === bId);
    } else {
      const catId = id.slice('catalog:'.length);
      const entry = city.landmarksCatalog?.find(x => x.id === catId);
      if (entry) b = buildingFromCatalogEntry(city, entry);
    }
    if (!b) return null;

    // bounding box over building footprint, all its parts, and any courtyard rotunda
    const allPts = buildingBoundsPts(b);
    const box = bbox(allPts);
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const bw = box.x1 - box.x0, bd = box.y1 - box.y0;
    const hx = Math.max(16, Math.round(bw / 2 + 10));
    const roadW = 8.5, frontMargin = 4.5, backMargin = 5.5;
    const hy = Math.max(15, Math.round((bd + backMargin + frontMargin + roadW) / 2));
    // shift building so it sits comfortably behind the front sidewalk
    const shiftY = hy - roadW - frontMargin - bd / 2 - cy;
    const shiftX = -cx;
    const moveRing = (r: readonly Vec2[]): Vec2[] => r.map(([x, y]) => [x + shiftX, y + shiftY]);

    const shifted: Building = {
      ...b,
      footprint: moveRing(b.footprint),
      parts: b.parts.map(p => ({ ...p, footprint: moveRing(p.footprint) })),
    };

    const roadY0 = hy - roadW - 1.4, roadY1 = hy - 1.4;
    drawPlate(B, hx, hy, roadY0, roadY1, pools, id);
    // garden lamps at the rear corners of the plaza
    for (const sx of [-1, 1] as const) {
      parkLamp(B, { id: `${id}:plamp:${sx}`, kind: 'park-lamp', at: [sx * (hx - 4), -hy + 4], z0: 0.16, heading: 0, road: 's-front' }, pools);
    }

    const mockCity: City = {
      ...city,
      bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
      buildings: [shifted],
      streets: [{
        id: 's-front', name: 'Đường trước tòa nhà', kind: 'primary',
        path: [[-hx, (roadY0 + roadY1) / 2], [hx, (roadY0 + roadY1) / 2]],
        width: roadW, lanes: 2, oneway: false, sidewalk: { left: 3.5, right: 3.5 }, layer: 0, profile: [], source: 'showcase',
      }],
      areas: [], features: [], junctions: [], rails: [], stations: [],
    };
    buildBuildings(B, mockCity, [shifted], 3);
    return {
      item,
      layer: layerOf(B, true, mockCity),
      pools: poolGeometry(pools),
      beacons: beaconsOf(mockCity),
      flags: flagpolesOf(mockCity),
      cars: [],
      floors: cityFloors(mockCity),
    };
  }

  // ---- Case 3: Standalone Hanoi Architectural Archetypes ----
  const arch = ARCHETYPES.find(a => a.id === id);
  if (!arch) return null;

  const hx = Math.max(12, Math.round(arch.w / 2 + 7.5));
  const roadW = 7.5, frontMargin = 3.8, backMargin = 4.2;
  const hy = Math.max(13, Math.round((arch.d + backMargin + frontMargin + roadW) / 2));
  const roadY0 = hy - roadW - 1.4, roadY1 = hy - 1.4;
  drawPlate(B, hx, hy, roadY0, roadY1, pools, id);

  const yFront = roadY0 - frontMargin, yBack = yFront - arch.d;
  const x0 = -arch.w / 2, x1 = arch.w / 2;
  // footprint with edge 0 = front edge along yFront (from x0 to x1, facing +y toward the street)
  const fp: Vec2[] = [[x0, yFront], [x1, yFront], [x1, yBack], [x0, yBack]];

  let bldg: Building;
  if (arch.kind === 'house' && arch.house) {
    const resolved = resolveHouse(arch.house);
    const floors = houseStoreys(resolved.spec);
    bldg = {
      id: arch.id, name: arch.name, kind: resolved.spec.shop ? 'commercial' : 'tube-house',
      footprint: fp, front: 0, levelsFrom: 'rule',
      parts: [{ id: arch.id, footprint: fp, z0: 0.16, floors, facade: 'wall', roof: 'flat', source: 'showcase' }],
      house: { input: arch.house, spec: resolved.spec },
      source: 'showcase',
    };
  } else {
    // 5-storey Hanoi collective apartment block (khu tập thể)
    const floors = [3.8, 3.2, 3.2, 3.2, 3.2];
    bldg = {
      id: arch.id, name: arch.name, kind: 'apartment',
      footprint: fp, front: 0, levelsFrom: 'rule',
      parts: [{ id: arch.id, footprint: fp, z0: 0.16, floors, facade: 'wall', roof: 'flat', source: 'showcase' }],
      source: 'showcase',
    };
  }

  const mockCity: City = {
    ...city,
    bounds: { x0: -hx, y0: -hy, x1: hx, y1: hy },
    buildings: [bldg],
    streets: [{
      id: 's-front', name: 'Phố', kind: 'primary',
      path: [[-hx, (roadY0 + roadY1) / 2], [hx, (roadY0 + roadY1) / 2]],
      width: roadW, lanes: 2, oneway: false, sidewalk: { left: 3.5, right: 3.5 }, layer: 0, profile: [], source: 'showcase',
    }],
    areas: [], features: [], junctions: [], rails: [], stations: [],
  };
  buildBuildings(B, mockCity, [bldg], 3);
  const floors = cityFloors(mockCity);
  void floorId;
  return {
    item,
    layer: layerOf(B, true, mockCity),
    pools: poolGeometry(pools),
    beacons: [],
    flags: [],
    cars: [],
    floors,
  };
}
