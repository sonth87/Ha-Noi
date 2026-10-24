/* Internationalization (i18n) system for @my-city/city3d.
   Supports Vietnamese ('vi', default) and English ('en'), persisted in localStorage,
   and reactive across both React UI and Three.js DOM overlays. */
import type { Building, Street } from '@my-city/core';
import { STORAGE_KEYS } from './constants';
import type { PlaceCategory, PlaceInfoMode } from './placeInfo';
import type { QualityLevel } from './quality';
import type { StreetLabelMode } from './streetLabels';

export type Locale = 'vi' | 'en';

export const LOCALES: readonly Locale[] = ['vi', 'en'] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: 'VI',
  en: 'EN',
};

const DICT = {
  vi: {
    // Top bar & navigation
    'top.showcases': 'Công trình ({count})',
    'top.showcases.aria': 'Chọn công trình xem riêng trên đế',
    'top.showcases.dialog': 'Danh sách công trình 3D',
    'top.showcases.search': 'Tìm công trình, nhà ga, di tích...',
    'top.showcases.all': 'Tất cả ({count})',
    'top.showcases.mapTitle': 'Bản đồ toàn khu đô thị',
    'top.showcases.mapSub': 'Hiển thị toàn bộ thành phố, giao thông và tàu Metro',
    'top.showcases.mapTag': 'Bản đồ',
    'top.showcases.empty': 'Không tìm thấy công trình phù hợp',
    'top.backToMap': 'Bản đồ',
    'top.backToMap.title': 'Quay lại bản đồ toàn khu',

    'top.places.aria': 'Đi tới khu vực trên bản đồ',
    'top.places.dialog': 'Danh sách khu vực và nhà ga',
    'top.places.search': 'Tìm khu vực, phố, quận, nhà ga...',
    'top.places.all': 'Tất cả ({count})',
    'top.places.empty': 'Không tìm thấy khu vực phù hợp',
    'top.places.metroGroup': 'Nhà ga Metro',
    'top.places.defaultGroup': 'Khu vực',

    'top.streetLabels': 'Tên đường',
    'top.streetLabels.title': 'Kiểu hiển thị tên đường (Phím tắt: L)',
    'top.placeInfo': 'Thông tin',
    'top.placeInfo.title': 'Hiển thị thông tin tòa nhà, công viên, hồ, di tích, tượng đài (Phím tắt: I)',

    'top.home': 'Trung tâm',
    'top.home.title': 'Về vị trí trung tâm bản đồ (H)',
    'top.mode.title': 'Chuyển góc nhìn 2D / 3D (V)',
    'top.seeThrough': 'Nhìn xuyên',
    'top.seeThrough.title': 'Bật/tắt chế độ nhìn xuyên tòa nhà chắn trước mặt khi zoom vào rất sát (X)',
    'top.night.onTitle': 'Đang ở chế độ Đêm · Nhấn để chuyển sang Ngày (N)',
    'top.night.offTitle': 'Đang ở chế độ Ngày · Nhấn để chuyển sang Đêm (N)',
    'top.settings': 'Cài đặt',
    'top.settings.title': 'Bảng điều chỉnh Đèn & Chất lượng hiển thị (G)',
    'top.locale.title': 'Chuyển đổi ngôn ngữ Tiếng Việt / English',

    // Camera pad
    'cam.aria': 'Điều khiển bản đồ và góc nhìn',
    'cam.compass': 'La bàn · Đang hướng {dir} ({deg}°) — Nhấn để xoay lại về đúng hướng Bắc',
    'cam.dir.0': 'Bắc',
    'cam.dir.1': 'Đông',
    'cam.dir.2': 'Nam',
    'cam.dir.3': 'Tây',
    'cam.myLocation': 'Vị trí của bạn',
    'cam.zoomIn': 'Phóng to (+)',
    'cam.zoomOut': 'Thu nhỏ (−)',
    'cam.rot90': 'Xoay góc 90° (Bắc · Đông · Nam · Tây) (E)',
    'cam.rotLeft': 'Xoay trái 90° (Q)',
    'cam.rotRight': 'Xoay phải 90° (E)',
    'cam.tiltUp': 'Nâng cao góc camera (R)',
    'cam.tiltDown': 'Hạ thấp góc camera sát phố (F)',
    'cam.pegman': 'Kéo thả vào bản đồ để xem góc nhìn thực tế (Thả vào đường ray/ga Metro: Lái tàu gần nhất · Thả xuống đường: Lái ô tô)',
    'cam.pegman.dropMetro': 'Lái tàu Metro #{train} · {label}',
    'cam.pegman.dropCar': 'Lái xe ô tô · {label}',
    'cam.pegman.hint': 'Thả vào đường ray / ga Metro hoặc thả xuống lòng đường',

    // Stage & footer
    'stage.aria': 'Bản đồ 3D thành phố, chế độ {mode}. Kéo để di chuyển, cuộn để phóng to vào con trỏ, phím W A S D hoặc mũi tên để đi, nhấp đúp vào cột ghim hoặc công trình để xem thông tin.',
    'footer.hint.2d': 'kéo: di chuyển · click tầng: bật/tắt đèn · nhấp đúp công trình/ghim: xem thông tin · cuộn: phóng',
    'footer.hint.3d': 'kéo: di chuyển · click tầng: bật/tắt đèn · nhấp đúp công trình/ghim: xem thông tin · chuột phải / shift + kéo: xoay, nghiêng · cuộn: phóng',
    'footer.diorama': 'đế mô hình',
    'footer.cityMap': 'Đô thị 3D',
    'footer.angle': 'hướng',
    'footer.litWindows': 'cửa sáng',
    'footer.floors': 'tầng',
    'footer.vehicles': 'xe',
    'footer.signal.go': 'xanh',
    'footer.signal.wait': 'vàng',
    'footer.signal.stop': 'đỏ',

    // Lights panel
    'lights.title': 'Đèn',
    'lights.house': 'Đèn nhà',
    'lights.share': 'Cửa sáng',
    'lights.vehicle': 'Đèn xe',
    'lights.street': 'Đèn đường',
    'lights.glow': 'Độ glow',
    'lights.mode.auto': 'Tự động',
    'lights.mode.on': 'Bật',
    'lights.mode.off': 'Tắt',
    'lights.note': 'Tự động: tối (phím N) thì bật. Cửa sáng: tỉ lệ cửa sổ có đèn, rải đều mọi tòa. Click một tầng để bật / tắt cả tầng đó.',

    // Quality panel
    'quality.title': 'Chất lượng',
    'quality.streetLabels': 'Tên đường',
    'quality.placeInfo': 'Thông tin địa điểm',
    'quality.seeThrough': 'Nhìn xuyên nhà chắn trước khi zoom sát',
    'quality.houseDetail': 'Chi tiết nhà',
    'quality.traffic': 'Mật độ xe',
    'quality.trees': 'Cây',
    'quality.trees.off': 'Không',
    'quality.trees.simple': 'Đơn giản',
    'quality.trees.full': 'Đầy đủ',
    'quality.viewDistance': 'Tầm nhìn xa',
    'quality.viewDistance.all': 'Hết',
    'quality.autoDetail': 'Tự giảm chi tiết khi thu nhỏ',
    'quality.wires': 'Cột và dây điện',
    'quality.autoQuality': 'Tự hạ mức khi chậm',
    'quality.windows': 'Cửa sổ',
    'quality.silhouette': 'Nét viền khối',
    'quality.creases': 'Nét cạnh',
    'quality.details': 'Nét chi tiết',
    'quality.bloom': 'Glow (theme tối)',
    'quality.msaa': 'Khử răng cưa',
    'quality.pixelRatio': 'Độ phân giải',
    'quality.drawing': 'Đang vẽ:',
    'quality.pending': ' · còn {count} ô đang dựng',
    'quality.lowered': 'Máy chạy chậm nên đã tự hạ xuống mức {level}.',
    'quality.stats': '{triangles} tam giác · {windows} cửa · {lines} nét',
    'quality.detail.0': 'L0 · khối',
    'quality.detail.1': 'L1 · cửa sổ',
    'quality.detail.2': 'L2 · nhà',
    'quality.detail.3': 'L3 · mọi chi tiết',

    // Popups & Hover banners
    'popup.floor': 'Tầng {floor}',
    'popup.floorClickHint': 'Tầng {floor} · Nhấp để bật/tắt đèn · Nhấp đúp mở chi tiết',
    'popup.dblClickHint': 'Nhấp đúp để xem thông tin chi tiết',
    'popup.bulbOn': 'Tắt đèn công trình',
    'popup.bulbOff': 'Bật đèn công trình',
    'popup.close': 'Đóng (Esc)',
    'popup.viewShowcase': 'Xem đế 3D',

    // Place / Street metrics
    'metric.category': 'Phân loại',
    'metric.address': 'Địa chỉ',
    'metric.areaRegion': 'Khu vực',
    'metric.source': 'Nguồn dữ liệu',
    'metric.type': 'Loại hình',
    'metric.areaSize': 'Diện tích',
    'metric.perimeter': 'Chu vi',
    'metric.location': 'Vị trí',
    'metric.line': 'Tuyến',
    'metric.structure': 'Kết cấu',
    'metric.train': 'Đoàn tàu',
    'metric.scale': 'Quy mô',
    'metric.footprintArea': 'Diện tích đế',
    'metric.facade': 'Mặt dựng',
    'metric.length': 'Chiều dài',
    'metric.crossSection': 'Mặt cắt',
    'metric.elevation': 'Cao độ',
    'metric.elevatedBridge': 'Cầu vượt / Đường trên cao',
    'metric.groundRoad': 'Đường mặt đất',
    'metric.stationStructureVal': '3 tầng trên cầu cạn (cao ~19 m)',
    'metric.stationTrainVal': '4 toa chạy hai chiều liên tục',
    'metric.scaleVal': '{levels} tầng · cao ~{height} m',
    'metric.footprintVal': '{area} m² ({parts} khối)',
    'metric.facadeGlass': 'Kính Curtain Wall',
    'metric.facadeTube': 'Kiến trúc nhà phố',
    'metric.facadeWall': 'Tường xây hoàn thiện',
    'metric.streetBadge': 'Đường phố',
    'metric.streetLanesVal': '{lanes} làn xe · rộng ~{width} m',

    // POV & Interactive Driving modes
    'pov.button': 'Trải nghiệm POV',
    'pov.button.title': 'Chuyển góc nhìn nhập vai: Lái tàu Metro, Ngồi tàu ngắm phố, hoặc Tự lái ô tô (P)',
    'pov.mode.map': 'Bản đồ 3D',
    'pov.mode.metro-cab': 'Lái tàu Metro',
    'pov.mode.metro-passenger': 'Ngồi tàu Metro',
    'pov.mode.drive-cabin': 'Lái ô tô (Góc nhìn gần)',
    'pov.mode.drive-top': 'Lái ô tô (Trên cao)',
    'pov.sub.metro-cab': 'Góc nhìn buồng lái đoàn tàu 2A trên cầu cạn với đường ray 3D',
    'pov.sub.metro-passenger': 'Ngồi trên tàu nhìn toàn cảnh đường phố & tòa nhà (kéo để nhìn 360°)',
    'pov.sub.drive-cabin': 'Tự cầm lái ô tô trên lòng đường với góc nhìn sát sau xe (W A S D / Mũi tên)',
    'pov.sub.drive-top': 'Tự cầm lái ô tô với góc nhìn đuổi theo từ trên cao (W A S D / Mũi tên)',
    'pov.hud.speed': '{speed} km/h',
    'pov.hud.nextTrain': 'Đổi tàu ({index}/{total})',
    'pov.hud.windowSide': 'Đổi bên cửa sổ',
    'pov.hud.switchDriveCam': 'Đổi góc nhìn xe (V)',
    'pov.hud.resetCar': 'Đặt lại xe ở ngã tư',
    'pov.hud.centerLook': 'Nhìn thẳng (C)',
    'pov.hud.exit': 'Về bản đồ (Esc)',
    'pov.hint.metro': 'Kéo chuột / phím ← → ↑ ↓ để nhìn 360° · C: nhìn thẳng · Tab: đổi tàu · Esc: về bản đồ',
    'pov.hint.drive': 'W/↑: ga · S/↓: phanh/lùi · A/←: rẽ trái · D/→: rẽ phải · Space: phanh tay · V: đổi góc nhìn · Esc: thoát',
    'pov.status.stop': 'Đang dừng đón khách tại ga',
    'pov.status.brake': 'Đang giảm tốc vào ga',
    'pov.status.pull': 'Đang rời ga tăng tốc',
    'pov.status.run': 'Đang chạy trên tuyến 2A',
  },
  en: {
    // Top bar & navigation
    'top.showcases': 'Showcases ({count})',
    'top.showcases.aria': 'Select 3D building diorama showcase',
    'top.showcases.dialog': '3D Building Showcases',
    'top.showcases.search': 'Search buildings, stations, heritage...',
    'top.showcases.all': 'All ({count})',
    'top.showcases.mapTitle': 'Full 3D City Map',
    'top.showcases.mapSub': 'Explore the entire city, traffic, and Metro trains',
    'top.showcases.mapTag': 'Map',
    'top.showcases.empty': 'No matching showcases found',
    'top.backToMap': 'Map',
    'top.backToMap.title': 'Return to full city map',

    'top.places.aria': 'Fly to a location on the map',
    'top.places.dialog': 'Locations and Metro Stations',
    'top.places.search': 'Search areas, streets, districts, stations...',
    'top.places.all': 'All ({count})',
    'top.places.empty': 'No matching locations found',
    'top.places.metroGroup': 'Metro Stations',
    'top.places.defaultGroup': 'Locations',

    'top.streetLabels': 'Streets',
    'top.streetLabels.title': 'Street name display mode (Shortcut: L)',
    'top.placeInfo': 'Places',
    'top.placeInfo.title': 'Building, park, lake & heritage info mode (Shortcut: I)',

    'top.home': 'Center',
    'top.home.title': 'Fly back to city center (H)',
    'top.mode.title': 'Toggle 2D / 3D camera mode (V)',
    'top.seeThrough': 'See-through',
    'top.seeThrough.title': 'Toggle see-through for occluding foreground buildings when zoomed in close (X)',
    'top.night.onTitle': 'Night mode active · Click to switch to Day (N)',
    'top.night.offTitle': 'Day mode active · Click to switch to Night (N)',
    'top.settings': 'Settings',
    'top.settings.title': 'Lighting & Display Quality settings (G)',
    'top.locale.title': 'Switch language Tiếng Việt / English',

    // Camera pad
    'cam.aria': 'Map & camera controls',
    'cam.compass': 'Compass · Facing {dir} ({deg}°) — Click to reset to True North',
    'cam.dir.0': 'North',
    'cam.dir.1': 'East',
    'cam.dir.2': 'South',
    'cam.dir.3': 'West',
    'cam.myLocation': 'Your location',
    'cam.zoomIn': 'Zoom in (+)',
    'cam.zoomOut': 'Zoom out (−)',
    'cam.rot90': 'Rotate 90° (North · East · South · West) (E)',
    'cam.rotLeft': 'Rotate 90° left (Q)',
    'cam.rotRight': 'Rotate 90° right (E)',
    'cam.tiltUp': 'Tilt camera up (R)',
    'cam.tiltDown': 'Tilt camera down to street level (F)',
    'cam.pegman': 'Drag & drop onto map for street/metro view (Drop on Metro line/station: Drive nearest train · Drop on street: Drive car)',
    'cam.pegman.dropMetro': 'Drive Metro Train #{train} · {label}',
    'cam.pegman.dropCar': 'Drive Car · {label}',
    'cam.pegman.hint': 'Drop on a Metro line/station or onto any street',

    // Stage & footer
    'stage.aria': '3D city map in {mode} mode. Drag to pan, scroll to zoom to cursor, W A S D or arrow keys to move, double-click a pin or building for details.',
    'footer.hint.2d': 'drag: pan · click floor: toggle light · double-click building/pin: details · scroll: zoom',
    'footer.hint.3d': 'drag: pan · click floor: toggle light · double-click building/pin: details · right-click / shift + drag: orbit · scroll: zoom',
    'footer.diorama': 'diorama',
    'footer.cityMap': '3D City',
    'footer.angle': 'heading',
    'footer.litWindows': 'lit windows',
    'footer.floors': 'floors',
    'footer.vehicles': 'vehicles',
    'footer.signal.go': 'green',
    'footer.signal.wait': 'amber',
    'footer.signal.stop': 'red',

    // Lights panel
    'lights.title': 'Lighting',
    'lights.house': 'Buildings',
    'lights.share': 'Lit windows',
    'lights.vehicle': 'Vehicles',
    'lights.street': 'Street lamps',
    'lights.glow': 'Bloom glow',
    'lights.mode.auto': 'Auto',
    'lights.mode.on': 'On',
    'lights.mode.off': 'Off',
    'lights.note': 'Auto: turns on at night (N key). Lit windows: share of windows lit across all buildings. Click any floor to toggle its lights.',

    // Quality panel
    'quality.title': 'Quality',
    'quality.streetLabels': 'Street labels',
    'quality.placeInfo': 'Place info',
    'quality.seeThrough': 'See-through occluding buildings when zoomed in',
    'quality.houseDetail': 'Building detail',
    'quality.traffic': 'Traffic density',
    'quality.trees': 'Trees',
    'quality.trees.off': 'Off',
    'quality.trees.simple': 'Simple',
    'quality.trees.full': 'Full',
    'quality.viewDistance': 'View distance',
    'quality.viewDistance.all': 'Unlimited',
    'quality.autoDetail': 'Auto-reduce detail when zoomed out',
    'quality.wires': 'Utility poles & wires',
    'quality.autoQuality': 'Auto-step down quality if FPS drops',
    'quality.windows': 'Windows',
    'quality.silhouette': 'Silhouette outlines',
    'quality.creases': 'Crease lines',
    'quality.details': 'Detail lines',
    'quality.bloom': 'Bloom glow (dark theme)',
    'quality.msaa': 'Anti-aliasing (MSAA)',
    'quality.pixelRatio': 'Pixel ratio',
    'quality.drawing': 'Drawing:',
    'quality.pending': ' · {count} tiles building',
    'quality.lowered': 'Performance was low, automatically stepped down to {level}.',
    'quality.stats': '{triangles} tris · {windows} windows · {lines} lines',
    'quality.detail.0': 'L0 · massing',
    'quality.detail.1': 'L1 · windows',
    'quality.detail.2': 'L2 · architecture',
    'quality.detail.3': 'L3 · full detail',

    // Popups & Hover banners
    'popup.floor': 'Floor {floor}',
    'popup.floorClickHint': 'Floor {floor} · Click to toggle light · Double-click for details',
    'popup.dblClickHint': 'Double-click for full details',
    'popup.bulbOn': 'Turn off building lights',
    'popup.bulbOff': 'Turn on building lights',
    'popup.close': 'Close (Esc)',
    'popup.viewShowcase': 'View 3D Diorama',

    // Place / Street metrics
    'metric.category': 'Category',
    'metric.address': 'Address',
    'metric.areaRegion': 'Area',
    'metric.source': 'Data source',
    'metric.type': 'Type',
    'metric.areaSize': 'Area',
    'metric.perimeter': 'Perimeter',
    'metric.location': 'Location',
    'metric.line': 'Transit line',
    'metric.structure': 'Structure',
    'metric.train': 'Trains',
    'metric.scale': 'Scale',
    'metric.footprintArea': 'Footprint',
    'metric.facade': 'Facade',
    'metric.length': 'Length',
    'metric.crossSection': 'Cross-section',
    'metric.elevation': 'Elevation',
    'metric.elevatedBridge': 'Elevated Flyover / Bridge',
    'metric.groundRoad': 'Surface Street',
    'metric.stationStructureVal': '3-level elevated viaduct (~19 m high)',
    'metric.stationTrainVal': '4-car bi-directional metro trains',
    'metric.scaleVal': '{levels} floors · ~{height} m tall',
    'metric.footprintVal': '{area} m² ({parts} parts)',
    'metric.facadeGlass': 'Glass Curtain Wall',
    'metric.facadeTube': 'Urban Shophouse Facade',
    'metric.facadeWall': 'Finished Masonry Wall',
    'metric.streetBadge': 'Street',
    'metric.streetLanesVal': '{lanes} lanes · ~{width} m wide',

    // POV & Interactive Driving modes
    'pov.button': 'POV View',
    'pov.button.title': 'Switch to immersive POV: Metro Driver Cab, Metro Passenger, or Drive a Car (P)',
    'pov.mode.map': '3D Map',
    'pov.mode.metro-cab': 'Metro Driver Cab',
    'pov.mode.metro-passenger': 'Metro Passenger',
    'pov.mode.drive-cabin': 'Drive Car (Close View)',
    'pov.mode.drive-top': 'Drive Car (Overhead)',
    'pov.sub.metro-cab': 'First-person view from the Line 2A front cab with 3D rails',
    'pov.sub.metro-passenger': 'Elevated panoramic view over city streets & buildings (drag for 360°)',
    'pov.sub.drive-cabin': 'Steer your car along road carriageways with a close follow camera (W A S D / Arrows)',
    'pov.sub.drive-top': 'Steer your car with a high overhead chase camera (W A S D / Arrows)',
    'pov.hud.speed': '{speed} km/h',
    'pov.hud.nextTrain': 'Switch Train ({index}/{total})',
    'pov.hud.windowSide': 'Flip Window Side',
    'pov.hud.switchDriveCam': 'Switch Car Camera (V)',
    'pov.hud.resetCar': 'Reset Car at Junction',
    'pov.hud.centerLook': 'Center Look (C)',
    'pov.hud.exit': 'Exit to Map (Esc)',
    'pov.hint.metro': 'Drag / Arrow keys to look 360° · C: center view · Tab: switch train · Esc: exit to map',
    'pov.hint.drive': 'W/↑: throttle · S/↓: brake/reverse · A/←: steer left · D/→: steer right · Space: handbrake · V: switch view · Esc: exit',
    'pov.status.stop': 'Stopped at station (doors open)',
    'pov.status.brake': 'Braking into station',
    'pov.status.pull': 'Accelerating from station',
    'pov.status.run': 'Cruising on Line 2A',
  },
} as const;

export type TranslationKey = keyof (typeof DICT)['vi'];

let currentLocale: Locale = loadLocale();

export function loadLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCALE);
    if (raw === 'vi' || raw === 'en') return raw;
  } catch {
    /* ignore storage errors */
  }
  return 'vi';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCALE, locale);
  } catch {
    /* ignore storage errors */
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setGlobalLocale(locale: Locale): void {
  currentLocale = locale;
  saveLocale(locale);
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = currentLocale,
): string {
  let str: string = DICT[locale][key] ?? DICT.vi[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export const PLACE_INFO_NAMES_I18N: Record<Locale, Record<PlaceInfoMode, string>> = {
  vi: {
    off: 'Không hiện',
    popup: 'Kiểu Popup (Click / Hover)',
    label: 'Tên & địa chỉ bên trên',
  },
  en: {
    off: 'Hidden',
    popup: 'Popup Mode (Hover / DblClick)',
    label: 'Floating Name & Address',
  },
};

export const STREET_LABEL_NAMES_I18N: Record<Locale, Record<StreetLabelMode, string>> = {
  vi: {
    pin: 'Cột ghim (Callout)',
    map: 'Dọc đường (Bản đồ)',
    off: 'Ẩn',
  },
  en: {
    pin: 'Callout Pins',
    map: 'Along Street (Map)',
    off: 'Hidden',
  },
};

export const LEVEL_NAMES_I18N: Record<Locale, Record<QualityLevel | 'custom', string>> = {
  vi: { low: 'Thấp', medium: 'Trung bình', high: 'Cao', ultra: 'Rất cao', custom: 'Tùy chỉnh' },
  en: { low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra', custom: 'Custom' },
};

export const CATEGORY_LABELS_I18N: Record<Locale, Record<PlaceCategory, string>> = {
  vi: {
    landmark: 'Công trình tiêu biểu',
    heritage: 'Di tích lịch sử – văn hóa',
    monument: 'Tượng đài · Di tích',
    park: 'Công viên · Vườn hoa',
    water: 'Hồ nước · Cảnh quan',
    station: 'Ga đường sắt đô thị',
    education: 'Trường học · Học viện',
    hospital: 'Bệnh viện · Y tế',
    building: 'Tòa nhà · Công trình',
  },
  en: {
    landmark: 'Featured Landmark',
    heritage: 'Cultural & Historical Heritage',
    monument: 'Monument · Memorial',
    park: 'Park · Public Garden',
    water: 'Lake · Waterfront',
    station: 'Elevated Metro Station',
    education: 'School · University',
    hospital: 'Hospital · Medical Center',
    building: 'Building · Structure',
  },
};

export const CATEGORY_BADGES_I18N: Record<Locale, Record<PlaceCategory, string>> = {
  vi: {
    landmark: 'Công trình lớn',
    heritage: 'Di tích',
    monument: 'Tượng đài',
    park: 'Công viên',
    water: 'Hồ nước',
    station: 'Ga Metro',
    education: 'Giáo dục',
    hospital: 'Y tế',
    building: 'Tòa nhà',
  },
  en: {
    landmark: 'Landmark',
    heritage: 'Heritage',
    monument: 'Monument',
    park: 'Park',
    water: 'Lake',
    station: 'Metro',
    education: 'Education',
    hospital: 'Medical',
    building: 'Building',
  },
};

export const BUILDING_KIND_I18N: Record<Locale, Record<Building['kind'], string>> = {
  vi: {
    office: 'Tòa nhà văn phòng',
    commercial: 'Trung tâm thương mại · Dịch vụ',
    hotel: 'Khách sạn',
    apartment: 'Tòa nhà chung cư · Căn hộ',
    school: 'Trường học · Cơ sở đào tạo',
    villa: 'Biệt thự',
    house: 'Nhà ở dân dụng',
    'tube-house': 'Nhà ống mặt phố',
    kiosk: 'Ki-ốt · Cửa hàng nhỏ',
    other: 'Công trình công cộng',
  },
  en: {
    office: 'Office Tower',
    commercial: 'Commercial & Retail Center',
    hotel: 'Hotel',
    apartment: 'Apartment Building',
    school: 'School · Educational Facility',
    villa: 'Villa',
    house: 'Residential House',
    'tube-house': 'Urban Tube Shophouse',
    kiosk: 'Kiosk · Small Shop',
    other: 'Public Structure',
  },
};

export const STREET_KIND_I18N: Record<Locale, Record<Street['kind'], string>> = {
  vi: {
    primary: 'Trục chính',
    secondary: 'Phố lớn',
    tertiary: 'Phố',
    link: 'Nhánh nối',
    residential: 'Phố dân cư',
    service: 'Đường nội bộ',
    alley: 'Ngõ phố',
    footway: 'Lối đi bộ',
    steps: 'Bậc thang',
  },
  en: {
    primary: 'Primary Artery',
    secondary: 'Major Street',
    tertiary: 'Collector Street',
    link: 'Link Ramp',
    residential: 'Residential Street',
    service: 'Service Road',
    alley: 'Alleyway',
    footway: 'Footpath',
    steps: 'Stairway',
  },
};
