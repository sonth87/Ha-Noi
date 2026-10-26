/* Hand corrections and bespoke model bindings on top of OpenStreetMap elements for Hanoi
   (vn/ha-noi, ADR-030, ADR-054, ADR-055). Keyed by OSM source ID ("osm:way/...", "osm:relation/..."). Pure. */
import type { BuildingOverride, SourceId } from '@my-city/core';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

export const HA_NOI_BUILDING_OVERRIDES: Record<SourceId, BuildingOverride> = {
  // Tòa Thái Bình (Việt Tower, 1 Thái Hà; ADR-030 of the old app): 18 storeys.
  'osm:way/136257265': {
    name: 'Tòa Thái Bình (Việt Tower)', kind: 'commercial', model: 'viet-tower', isSignatureLandmark: true,
    description: 'Tòa tháp văn phòng & thương mại 18 tầng biểu tượng tại góc Tây Bắc ngã tư Thái Hà – Tây Sơn với khối đế cong và cột thu phát sóng trên đỉnh.',
    parts: {
      'osm:way/845096110': { floors: [...rep(4, 11), ...rep(3.6, 7)] },
      'osm:way/1198548269': { floors: rep(4, 11) },
      'osm:way/1198548270': { floors: rep(4, 11) },
    },
  },
  // Novotel Thái Hà: 27 storeys
  'osm:way/850419282': {
    name: 'Novotel Hanoi Thai Ha', kind: 'hotel', model: 'novotel', isSignatureLandmark: true,
    description: 'Khách sạn 5 sao quốc tế 27 tầng tại góc Đông Bắc ngã tư Thái Hà – Tây Sơn với mặt dựng kính uốn cong và khối đế thương mại 5 tầng.',
    parts: {
      'osm:way/850419279': { floors: [...rep(4.2, 5), ...rep(3, 22)], facade: 'glass' },
      'osm:way/850419280': { floors: [...rep(4.2, 5), ...rep(3, 19)] },
      'osm:way/850419281': { floors: [...rep(4.2, 5), ...rep(3, 19)] },
      'osm:way/1198548268': { floors: rep(4.2, 5) },
    },
  },
  // VPBank Tower 89 Láng Hạ: 29 storeys
  'osm:way/677190114': {
    name: 'VPBank Tower (89 Láng Hạ)', kind: 'office', model: 'vpbank-tower', facade: 'glass', isSignatureLandmark: true,
    description: 'Tòa tháp văn phòng hạng A cao 29 tầng (102 m) tại ngã tư Thái Hà – Láng Hạ – Huỳnh Thúc Kháng với khối đế ngân hàng, đỉnh tháp kính giật cấp và sân đỗ trực thăng.',
    floors: [...rep(4.2, 4), ...rep(3.1, 25)],
  },
  // Green Diamond 93 Láng Hạ: 28 storeys
  'osm:way/1368063988': {
    name: 'Green Diamond (93 Láng Hạ)', kind: 'apartment',
    floors: [...rep(4.2, 5), ...rep(3.2, 23)],
  },
  // Trung tâm Chiếu phim Quốc gia 87 Láng Hạ
  'osm:way/1115247053': {
    name: 'Trung tâm Chiếu phim Quốc gia (87 Láng Hạ)', kind: 'commercial', model: 'national-cinema', isSignatureLandmark: true,
    description: 'Tổ hợp điện ảnh – văn hóa lớn tại góc ngã tư Thái Hà – Láng Hạ (87 Láng Hạ) nổi bật với quảng trường tiền sảnh, hàng cột tròn, sảnh kính rotunda 3 tầng và mái vòm.',
    parts: {
      'osm:way/1115247053': { floors: [...rep(4.8, 3), ...rep(4.2, 2)] },
      'osm:way/1115247052': { floors: [...rep(4.8, 3), ...rep(4.2, 2)], facade: 'glass' },
      'osm:way/1115247054': { floors: [...rep(4.8, 3), ...rep(4.2, 2)] },
      'osm:way/1115247051': { floors: rep(4.5, 4) },
      'osm:way/1115247050': { floors: rep(4.5, 4) },
      'osm:way/1115247049': { floors: rep(4.2, 3) },
    },
  },
  // Petrovietnam Tower 18 Láng Hạ
  'osm:way/1217754319': {
    name: 'Petrovietnam Tower (18 Láng Hạ)', kind: 'office', isSignatureLandmark: true,
    description: 'Trụ sở Tập đoàn Dầu khí Việt Nam (Petrovietnam) cao 19 tầng tại số 18 Láng Hạ, đối diện điểm cuối phố Thái Hà.',
    parts: {
      'osm:way/841374814': { floors: [...rep(4.2, 4), ...rep(3.5, 15)], facade: 'glass' },
      'osm:way/1217754316': { floors: rep(4.0, 6) },
      'osm:way/1217754317': { floors: rep(4.0, 6) },
      'osm:way/1217754318': { floors: rep(4.0, 4) },
    },
  },
  // BRG Tower / Oriental Plaza 16 Láng Hạ
  'osm:way/926276853': {
    name: 'BRG Tower – Oriental Plaza (16 Láng Hạ)', kind: 'office', facade: 'glass',
    floors: [...rep(4.2, 4), ...rep(3.4, 18)],
  },
  'osm:way/926276852': {
    name: 'Oriental Plaza – Khối B (16 Láng Hạ)', kind: 'commercial', isSecondaryTwin: true,
    floors: [...rep(4.2, 4), ...rep(3.3, 18)],
  },
  // Tòa nhà TDL 22 Láng Hạ
  'osm:way/1319809023': {
    name: 'Tòa nhà TDL (22 Láng Hạ)', kind: 'office',
    floors: [...rep(4.0, 2), ...rep(3.4, 6)],
  },
  // Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng)
  'osm:way/1195546201': {
    name: 'Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng)', kind: 'office',
    floors: [...rep(4.2, 2), ...rep(3.5, 7)],
  },
  // Sông Hồng Park View 165 Thái Hà
  'osm:way/1082814006': {
    name: 'Sông Hồng Park View (165 Thái Hà)', kind: 'apartment', isSignatureLandmark: true,
    description: 'Tổ hợp 2 tháp căn hộ 21 tầng và 1 tháp văn phòng 14 tầng trên khối đế thương mại 4 tầng tại số 165 Thái Hà.',
    parts: {
      'osm:way/1365535486': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
      'osm:way/1365535487': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
      'osm:way/1365535488': { floors: [...rep(4.2, 4), ...rep(3.4, 10)], facade: 'glass' },
    },
  },
  // Tòa nhà 131 Thái Hà
  'osm:way/1085065492': {
    name: 'Tòa nhà 131 Thái Hà', kind: 'apartment',
    floors: [...rep(4.2, 3), ...rep(3.2, 16)],
  },
  // Vinaconex Tower 34 Láng Hạ
  'osm:way/526930280': {
    name: 'Vinaconex Tower (34 Láng Hạ)', kind: 'office', facade: 'glass',
    floors: [...rep(4.2, 4), ...rep(3.4, 23)],
  },
  // Sky City Towers 88 Láng Hạ
  'osm:way/841601171': {
    name: 'Sky City Towers – Tháp A (88 Láng Hạ)', kind: 'apartment',
    floors: [...rep(4.2, 3), ...rep(3.2, 28)],
  },
  'osm:way/841601172': {
    name: 'Sky City Towers – Tháp B (88 Láng Hạ)', kind: 'apartment', isSecondaryTwin: true,
    floors: [...rep(4.2, 3), ...rep(3.2, 28)],
  },
  // Hà Thành Plaza 102 Thái Thịnh
  'osm:way/845096117': {
    name: 'Hà Thành Plaza (102 Thái Thịnh)', kind: 'commercial', isSignatureLandmark: true,
  },
  // Mipec Tower 229 Tây Sơn
  'osm:way/180075246': {
    name: 'MIPEC Tower (229 Tây Sơn)', kind: 'commercial', isSignatureLandmark: true,
    description: 'Tổ hợp thương mại – văn phòng – căn hộ cao cấp MIPEC Tower tại số 229 Tây Sơn.',
    floors: [...rep(4.2, 5), ...rep(3.3, 20)],
  },
  // Oriental Tower 324 Tây Sơn
  'osm:way/851595051': {
    name: 'Oriental Tower (324 Tây Sơn)', kind: 'office', facade: 'glass',
    floors: [...rep(4.0, 3), ...rep(3.4, 13)],
  },
  // TTG Tower 174 Thái Hà
  'osm:way/1346893415': {
    name: 'TTG Tower (174 Thái Hà)', kind: 'office', facade: 'glass',
    floors: [...rep(4.0, 2), ...rep(3.4, 11)],
  },
  // Hoàng Cầu Skyline 36 Hoàng Cầu
  'osm:way/839881655': {
    name: 'Hoàng Cầu Skyline (36 Hoàng Cầu)', kind: 'apartment',
    floors: [...rep(4.0, 3), ...rep(3.2, 15)],
  },
  // PeakView Tower 36 Hoàng Cầu
  'osm:way/839881657': {
    name: 'PeakView Tower (36 Hoàng Cầu)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
    floors: [...rep(4.2, 4), ...rep(3.4, 17)],
  },
  // Tân Hoàng Minh D'. Le Pont D'or 36 Hoàng Cầu
  'osm:way/839881661': {
    name: "D'. Le Pont D'or (36 Hoàng Cầu)", kind: 'apartment', isSignatureLandmark: true,
    description: "Tổ hợp căn hộ cao cấp Tân Hoàng Minh D'. Le Pont D'or cao 23 tầng bên công viên và hồ Hoàng Cầu.",
    floors: [...rep(4.2, 4), ...rep(3.2, 19)],
  },
  // Vincom Center Phạm Ngọc Thạch (2 Phạm Ngọc Thạch)
  'osm:way/136161117': {
    name: 'Vincom Center Phạm Ngọc Thạch (2 Phạm Ngọc Thạch)', kind: 'commercial', model: 'vincom-pnt', facade: 'glass', isSignatureLandmark: true,
    description: 'Trung tâm thương mại Vincom Center Phạm Ngọc Thạch cao 8 tầng với mặt dựng kính cong hiện đại và sảnh thông tầng tại ngã tư Chùa Bộc – Phạm Ngọc Thạch – Tôn Thất Tùng.',
    floors: [...rep(4.8, 3), ...rep(4.5, 5)],
  },
  // T&T Capella 2 Phạm Ngọc Thạch
  'osm:way/1184245771': {
    name: 'T&T Capella (2 Phạm Ngọc Thạch)', kind: 'apartment', facade: 'glass', isSignatureLandmark: true,
    description: 'Tổ hợp thương mại và căn hộ cao cấp T&T Capella cao 24 tầng trên phố Phạm Ngọc Thạch.',
    floors: [...rep(4.2, 5), ...rep(3.2, 19)],
  },
  // Eurowindow Multi-Complex 2 Tôn Thất Tùng
  'osm:way/840439592': {
    name: 'Eurowindow Office Building (2 Tôn Thất Tùng)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
    description: 'Tòa tháp văn phòng hạng A Eurowindow cao 17 tầng với hệ mặt dựng kính hộp tại ngã tư Tôn Thất Tùng – Chùa Bộc – Phạm Ngọc Thạch.',
    floors: [...rep(4.2, 3), ...rep(3.4, 14)],
  },
  // CONINCO Tower 4 Tôn Thất Tùng
  'osm:way/840439593': {
    name: 'CONINCO Tower (4 Tôn Thất Tùng)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
    description: 'Trụ sở Tổng công ty Tư vấn Xây dựng Việt Nam (CONINCO Tower) cao 19 tầng tại số 4 Tôn Thất Tùng.',
    floors: [...rep(4.2, 4), ...rep(3.5, 15)],
  },
  // Vincom Center – Vinhomes – ROX Tower Nguyễn Chí Thanh (54A Nguyễn Chí Thanh)
  'osm:way/570572191': {
    name: 'Vincom – Vinhomes Nguyễn Chí Thanh (54A Nguyễn Chí Thanh)', kind: 'commercial', model: 'vincom-nct', isSignatureLandmark: true,
    description: 'Tổ hợp Trung tâm thương mại Vincom Center Nguyễn Chí Thanh (6 tầng khối đế), tháp văn phòng hạng A ROX Tower (TNR Tower) và tháp căn hộ Vinhomes Nguyễn Chí Thanh cao 30 tầng tại số 54A Nguyễn Chí Thanh.',
    parts: {
      'osm:way/1231417560': { floors: rep(4.6, 6), facade: 'glass' },
      'osm:way/840562573': { floors: [...rep(4.6, 6), ...rep(3.5, 24)], facade: 'glass' },
      'osm:way/840562572': { floors: [...rep(4.6, 6), ...rep(3.3, 24)] },
    },
  },
  // Hanoi Centre & Hyatt Centric Hanoi Centre (175 Nguyễn Thái Học)
  'osm:way/1305255008': {
    name: 'Hanoi Centre – Hyatt Centric (175 Nguyễn Thái Học)', kind: 'commercial', model: 'hanoi-centre', facade: 'glass', isSignatureLandmark: true,
    description: 'Tổ hợp thương mại – văn phòng – khách sạn quốc tế Hanoi Centre & Hyatt Centric Hanoi Centre (Tien Phong Plaza) cao 9 tầng tại số 175 Nguyễn Thái Học.',
    parts: {
      'osm:way/1305255008': { floors: [...rep(4.6, 3), ...rep(3.8, 6)], facade: 'glass' },
      'osm:way/1305255007': { floors: [...rep(4.6, 3), ...rep(3.8, 6)], facade: 'glass' },
      'osm:way/1305255009': { floors: [...rep(4.6, 2), ...rep(3.6, 7)], facade: 'glass' },
    },
  },
  // Khách sạn Pullman Hanoi (40 Cát Linh – Giảng Võ)
  'osm:way/200543135': {
    name: 'Khách sạn Pullman Hanoi (40 Cát Linh)', kind: 'hotel', model: 'pullman-hanoi', facade: 'glass', isSignatureLandmark: true,
    description: 'Khách sạn 5 sao quốc tế Pullman Hanoi cao 14 tầng tại ngã tư Cát Linh – Giảng Võ – Hào Nam (đối diện Ga Cát Linh).',
    floors: [...rep(4.5, 3), ...rep(3.4, 11)],
  },
  // Grand Terra 36 Cát Linh
  'osm:way/1197730144': {
    name: 'Grand Terra (36 Cát Linh)', kind: 'commercial', facade: 'glass', isSignatureLandmark: true,
    description: 'Tòa nhà thương mại và văn phòng hạng A Grand Terra tại số 36 Cát Linh với thiết kế mặt dựng kính giật cấp lấy cảm hứng từ ruộng bậc thang.',
    floors: rep(4.4, 8),
  },
  // Khách sạn Grand Mercure Hanoi (9 Cát Linh – Quốc Tử Giám)
  'osm:way/1197730154': {
    name: 'Khách sạn Grand Mercure Hanoi (9 Cát Linh)', kind: 'hotel', facade: 'glass', isSignatureLandmark: true,
    description: 'Khách sạn 5 sao Grand Mercure Hanoi tại số 9 Cát Linh (gần Văn Miếu – Quốc Tử Giám) với kiến trúc giao thoa đương đại và truyền thống.',
    floors: [...rep(4.5, 2), ...rep(3.5, 10)],
  },

  // ---------- Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám ----------
  'osm:way/702185155': {
    name: 'Khuê Văn Các (Văn Miếu – Quốc Tử Giám)', kind: 'other', model: 'khue-van-cac', isSignatureLandmark: true,
    description: 'Khuê Văn Các – biểu tượng của Thủ đô Hà Nội được xây dựng năm 1805 trong Văn Miếu – Quốc Tử Giám với kiến trúc lầu vuông 8 mái chồng diêm trên 4 trụ gạch và cửa sổ tròn hình sao Khuê tỏa sáng bên Giếng Thiên Quang cùng 82 Bia Tiến Sĩ.',
    floors: [3.6, 4.2],
  },
  'osm:way/702185143': {
    name: 'Văn Miếu Môn (Cổng Văn Miếu – Quốc Tử Giám)', kind: 'other', model: 'van-mieu-mon', isSignatureLandmark: true,
    description: 'Văn Miếu Môn – cổng Tam quan 2 tầng 8 mái đao cong cổ kính dẫn vào Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám cùng Tứ trụ và bia Hạ Mã.',
    floors: [3.8, 3.4],
  },
  'osm:way/702185144': {
    name: 'Đại Trung Môn (Văn Miếu)', kind: 'other', model: 'van-mieu-gate',
    description: 'Đại Trung Môn – cổng 3 gian mái ngói mũi hài cổ kính mở vào không gian Nhập Đạo và Khuê Văn Các trong Văn Miếu.',
    floors: [4.6],
  },
  'osm:way/702185176': {
    name: 'Đại Thành Môn (Văn Miếu)', kind: 'other', model: 'van-mieu-gate',
    description: 'Đại Thành Môn – cổng 3 gian dẫn qua sân Bái Đường vào khu trung tâm thờ tự của Văn Miếu.',
    floors: [4.8],
  },
  'osm:way/702185189': {
    name: 'Điện Đại Thành – Đại Bái Đường (Văn Miếu)', kind: 'other', model: 'van-mieu-hall', isSignatureLandmark: true,
    description: 'Quần thể Điện Đại Thành gồm tòa Đại Bái Đường 9 gian, Thượng Điện và hai dãy Đông Vu – Tây Vu với kiến trúc gỗ lim sơn son thếp vàng và mái đao cong truyền thống.',
    parts: {
      'osm:way/702185189': { floors: [6.4], roof: 'pitched' },
      'osm:way/702185190': { floors: [7.2], roof: 'pitched' },
      'osm:way/702185187': { floors: [4.5], roof: 'pitched' },
      'osm:way/702185188': { floors: [4.5], roof: 'pitched' },
    },
  },
  'osm:way/702241326': {
    name: 'Nhà Thái Học – Quốc Tử Giám', kind: 'other', model: 'nha-thai-hoc', isSignatureLandmark: true,
    description: 'Khu Nhà Thái Học (Quốc Tử Giám – trường đại học đầu tiên của Việt Nam) gồm Tiền Đường, Hậu Đường 2 tầng 8 mái đao cong uy nghiêm cùng Tả Vu, Hữu Vu, Lầu Trống và Lầu Chuông.',
    parts: {
      'osm:way/702241326': { floors: [5.2], roof: 'pitched' },
      'osm:way/702241323': { floors: [5.2, 5.4], roof: 'pitched' },
      'osm:way/37934138': { floors: [4.8], roof: 'pitched' },
      'osm:way/37934139': { floors: [4.8], roof: 'pitched' },
      'osm:way/702241324': { floors: [3.6, 3.8], roof: 'pitched' },
      'osm:way/702241325': { floors: [3.6, 3.8], roof: 'pitched' },
      'osm:way/702241331': { floors: [4.6], roof: 'pitched' },
    },
  },

  // ---------- Quận Ba Đình Landmarks & Di tích Quốc gia đặc biệt ----------
  'osm:way/727570329': {
    name: 'Lotte Center Hanoi (54 Liễu Giai)', kind: 'commercial', model: 'lotte-center', isSignatureLandmark: true,
    description: 'Tòa tháp biểu tượng Lotte Center Hanoi cao 65 tầng (272 m) tại ngã tư Liễu Giai – Đào Tấn (Ba Đình), lấy cảm hứng từ tà áo dài Việt Nam với đài quan sát Sky Walk ở tầng 65.',
    parts: {
      'osm:way/727570330': { floors: [...rep(4.5, 6), ...rep(4.1, 59)], facade: 'glass' },
      'osm:way/1195985607': { floors: rep(5.5, 6), facade: 'glass' },
      'osm:way/1195985608': { floors: rep(5.5, 6), facade: 'glass' },
    },
  },
  'osm:way/840982441': {
    name: 'Vinhomes Metropolis (29 Liễu Giai)', kind: 'apartment', model: 'vinhomes-metropolis', isSignatureLandmark: true,
    description: 'Tổ hợp 3 tòa tháp căn hộ hạng sang Vinhomes Metropolis (M1 cao 41 tầng, M2 & M3 cao 45 tầng) cùng khối đế thương mại Vincom Center Liễu Giai và vườn nổi tại số 29 Liễu Giai, quận Ba Đình.',
    parts: {
      'osm:way/840982442': { floors: [...rep(4.5, 4), ...rep(3.4, 37)], facade: 'glass' },
      'osm:way/840982443': { floors: [...rep(4.5, 4), ...rep(3.4, 41)], facade: 'glass' },
      'osm:way/840982444': { floors: [...rep(4.5, 4), ...rep(3.4, 41)], facade: 'glass' },
      'osm:way/1280512694': { floors: rep(4.5, 4), facade: 'glass' },
      'osm:way/1280512695': { floors: rep(4.5, 4), facade: 'glass' },
      'osm:way/1280512696': { floors: rep(4.5, 4) },
    },
  },
  'osm:way/840982447': {
    name: 'Capital Place (29 Liễu Giai)', kind: 'office', model: 'capital-place', isSignatureLandmark: true,
    description: 'Tổ hợp 2 tòa tháp đôi văn phòng hạng A quốc tế Capital Place cao 37 tầng tại số 29 Liễu Giai với mặt dựng kính uốn lượn hình rồng bay trên khối đế thương mại 5 tầng.',
    parts: {
      'osm:way/840982448': { floors: [...rep(4.5, 5), ...rep(3.7, 32)], facade: 'glass' },
      'osm:way/840982449': { floors: [...rep(4.5, 5), ...rep(3.7, 32)], facade: 'glass' },
      'osm:way/1195985613': { floors: rep(4.5, 5), facade: 'glass' },
    },
  },
  'osm:way/727578326': {
    name: 'Khách sạn Hà Nội Daewoo & Daeha (360 Kim Mã)', kind: 'hotel', model: 'daewoo-hotel', isSignatureLandmark: true,
    description: 'Tổ hợp Khách sạn 5 sao Hà Nội Daewoo (18 tầng), tòa tháp văn phòng Daeha Business Center (15 tầng) và khu căn hộ dịch vụ Daeha (13 tầng) bao quanh bể bơi ốc đảo tại số 360 Kim Mã, đối diện Công viên Thủ Lệ.',
    parts: {
      'osm:way/727578326': { floors: [...rep(4.5, 3), ...rep(3.4, 15)], facade: 'glass' },
      'osm:way/727573734': { floors: [...rep(4.5, 3), ...rep(3.6, 12)], facade: 'glass' },
      'osm:way/727578328': { floors: [...rep(4.2, 3), ...rep(3.3, 10)] },
      'osm:way/727573733': { floors: rep(4.5, 2) },
      'osm:way/727578327': { floors: rep(4.5, 2) },
    },
  },
  'osm:way/874492978': {
    name: 'Dolce by Wyndham Hanoi Golden Lake (B7 Giảng Võ)', kind: 'hotel', isSignatureLandmark: true,
    description: 'Khách sạn 5 sao dát vàng Dolce by Wyndham Hanoi Golden Lake cao 25 tầng bên bờ hồ Giảng Võ, quận Ba Đình.',
    floors: [...rep(4.5, 4), ...rep(3.4, 21)],
  },
  'osm:way/727580943': {
    name: 'Khách sạn Hà Nội – Hanoi Hotel (D8 Giảng Võ)', kind: 'hotel', isSignatureLandmark: true,
    description: 'Khách sạn quốc tế Hanoi Hotel cao 19 tầng tọa lạc ngay bên bờ hồ Giảng Võ, quận Ba Đình.',
    floors: [...rep(4.2, 3), ...rep(3.3, 16)],
  },
  'osm:way/199299464': {
    name: 'Khách sạn Fortuna Hanoi (6B Láng Hạ)', kind: 'hotel', isSignatureLandmark: true,
    description: 'Khách sạn quốc tế Fortuna Hanoi cao 17 tầng trên phố Láng Hạ, quận Ba Đình.',
    floors: [...rep(4.5, 3), ...rep(3.4, 14)],
  },
  'osm:way/862423870': {
    name: 'The Lancaster Hà Nội (20 Núi Trúc)', kind: 'apartment', facade: 'glass', isSignatureLandmark: true,
    description: 'Tòa tháp căn hộ dịch vụ và văn phòng cao cấp The Lancaster Hà Nội cao 27 tầng tại số 20 Núi Trúc, quận Ba Đình.',
    floors: [...rep(4.2, 4), ...rep(3.3, 23)],
  },
  'osm:way/37625751': {
    name: 'Lăng Chủ tịch Hồ Chí Minh', kind: 'other', model: 'ho-chi-minh-mausoleum', isSignatureLandmark: true,
    description: 'Lăng Chủ tịch Hồ Chí Minh tại trung tâm Quảng trường Ba Đình lịch sử – công trình kiến trúc đá hoa cương uy nghiêm gồm khối đế tam cấp, hàng cột vuông bốn mặt và mái tam cấp cùng lễ đài hai bên.',
  },
  'osm:way/207178342': {
    name: 'Nhà sàn Bác Hồ (Khu Di tích Phủ Chủ tịch)', kind: 'other', model: 'nha-san-bac-ho', isSignatureLandmark: true,
    description: 'Di tích lịch sử đặc biệt Nhà sàn Bác Hồ bên Ao cá và vườn cây trong Khu Di tích Phủ Chủ tịch – ngôi nhà sàn gỗ 2 tầng giản dị nơi Bác Hồ sống và làm việc từ tháng 5/1958 đến năm 1969.',
    floors: [2.8, 3.0],
  },
  'osm:way/697326496': {
    name: 'Chùa Một Cột (Diên Hựu Tự)', kind: 'other', model: 'one-pillar-pagoda', isSignatureLandmark: true,
    description: 'Chùa Một Cột (Diên Hựu Tự – Liên Hoa Đài) khởi dựng năm 1049 thời vua Lý Thái Tông với kiến trúc đài hoa sen gỗ vuông có mái đao cong vươn lên trên một cột đá tròn giữa hồ Linh Chiểu.',
    floors: [4.0, 3.2],
  },
  'osm:way/37629570': {
    name: 'Phủ Chủ Tịch (2 Hùng Vương)', kind: 'office', model: 'presidential-palace', isSignatureLandmark: true,
    description: 'Phủ Chủ tịch Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam – công trình kiến trúc cổ điển Pháp uy nghi với hành lang vòm, hai tháp góc và bậc tam cấp đại sảnh trong khuôn viên Khu Di tích Phủ Chủ tịch.',
    floors: [4.8, 4.6, 4.4, 3.8],
  },
  'osm:way/37629143': {
    name: 'Bảo tàng Hồ Chí Minh (19 Ngọc Hà)', kind: 'other', model: 'ho-chi-minh-museum', isSignatureLandmark: true,
    description: 'Bảo tàng Hồ Chí Minh khánh thành ngày 19/5/1990 với kiến trúc hình bông sen trắng thanh thoát cao gần 20 m nằm trong quần thể Lăng Bác và Chùa Một Cột.',
  },
  'osm:way/695966191': {
    name: 'Nhà Quốc hội Việt Nam (Quảng trường Ba Đình)', kind: 'office', model: 'national-assembly', facade: 'glass', isSignatureLandmark: true,
    description: 'Tòa nhà Quốc hội Việt Nam bên Quảng trường Ba Đình và Hoàng thành Thăng Long, kiến trúc hiện đại cao 39 m biểu trưng cho hình tượng Trời tròn (mái vòm phòng họp Diên Hồng ở trung tâm) – Đất vuông (khối đế vuông vức).',
  },
  'osm:relation/17877970': {
    name: 'Đài tưởng niệm các Anh hùng liệt sĩ Bắc Sơn', kind: 'other', model: 'bac-son-memorial', isSignatureLandmark: true,
    description: 'Đài tưởng niệm các Anh hùng liệt sĩ trên đường Bắc Sơn (đối diện Lăng Chủ tịch Hồ Chí Minh), kiến trúc khối lập phương 4 cửa vòm thoáng mở như ngôi đền thiêng tưởng nhớ các anh hùng liệt sĩ vì Tổ quốc.',
    floors: [3.2, 6.2, 3.2],
  },
  'osm:way/697572004': {
    name: 'Trụ sở Bộ Ngoại giao (1 Tôn Thất Đàm)', kind: 'office', model: 'ministry-palace', isSignatureLandmark: true,
    description: 'Tòa nhà lịch sử của Bộ Ngoại giao Việt Nam tại số 1 Tôn Thất Đàm – công trình kiến trúc Đông Dương đặc sắc có tháp trung tâm đối diện Đài tưởng niệm Bắc Sơn và Quảng trường Ba Đình.',
    floors: [4.8, 4.5, 4.2],
  },
  'osm:way/184959290': {
    name: 'Cột cờ Hà Nội (Kỳ đài)', kind: 'other', model: 'hanoi-flag-tower', isSignatureLandmark: true,
    description: 'Cột cờ Hà Nội (Kỳ đài) xây dựng năm 1812 trên đường Điện Biên Phủ gồm 3 tầng đế chóp vuông cụt ốp gạch, thân cột bát giác thuôn dần và vọng lâu 8 cửa trên đỉnh nâng cao lá cờ Tổ quốc.',
  },
  'osm:way/696389268': {
    name: 'Hoàng thành Thăng Long – Đoan Môn', kind: 'other', model: 'doan-mon', isSignatureLandmark: true,
    description: 'Đoan Môn – cổng chính phía Nam dẫn vào Cấm thành Thăng Long (Di sản Văn hóa Thế giới UNESCO) với tường thành đá – gạch vồ 5 cổng vòm cuốn và lầu Ngũ Môn 2 tầng 8 mái đao cong phía trên.',
  },
  'osm:way/185531692': {
    name: 'Hậu Lâu (Tĩnh Bắc Lâu – Hoàng thành Thăng Long)', kind: 'other', model: 'hau-lau', isSignatureLandmark: true,
    description: 'Hậu Lâu (Tĩnh Bắc Lâu / Lầu Công chúa) phía sau nền Điện Kính Thiên trong khu di sản Hoàng thành Thăng Long, mang kiến trúc giao thoa Á – Âu 3 tầng mái cong độc đáo.',
    floors: [4.2, 4.0, 3.4],
  },
  // ── Phường Hoàn Kiếm & Phường Cửa Nam ──
  'osm:way/178995269': {
    name: 'Tháp Rùa (Hồ Hoàn Kiếm)', kind: 'other', model: 'thap-rua', isSignatureLandmark: true,
    description: 'Tháp Rùa cổ kính xây dựng năm 1886 trên gò Rùa giữa lòng Hồ Hoàn Kiếm – biểu tượng lịch sử văn hóa gắn liền với truyền thuyết Vua Lê Thái Tổ hoàn gươm báu Thuận Thiên.',
    floors: [3.2, 2.8, 2.6],
  },
  'osm:way/178995262': {
    name: 'Đền Ngọc Sơn (Đảo Ngọc – Hồ Hoàn Kiếm)', kind: 'other', model: 'den-ngoc-son', isSignatureLandmark: true,
    description: 'Di tích Quốc gia đặc biệt Đền Ngọc Sơn trên đảo Ngọc giữa Hồ Hoàn Kiếm, nối với bờ Đông qua cầu Thê Húc sơn son, Tháp Bút ("Tả Thanh Thiên"), Đài Nghiên và Trấn Ba Đình.',
    floors: [4.6, 3.2],
  },
  'osm:way/37933050': {
    name: 'Nhà hát Lớn Hà Nội (1 Tràng Tiền)', kind: 'other', model: 'hanoi-opera-house', isSignatureLandmark: true,
    description: 'Nhà hát Lớn Hà Nội tại Quảng trường Cách mạng Tháng Tám (khởi công năm 1901, hoàn thành năm 1911) – kiệt tác kiến trúc Tân cổ điển Pháp với hàng cột thức Corinth, mái vòm đá phiến và sảnh gương tráng lệ.',
    floors: [6.0, 5.5, 5.5, 5.0],
  },
  'osm:way/28912942': {
    name: 'Nhà thờ Lớn Hà Nội (40 Nhà Chung)', kind: 'other', model: 'st-joseph-cathedral', isSignatureLandmark: true,
    description: 'Nhà thờ Chính tòa Thánh Giuse (Nhà thờ Lớn Hà Nội) khánh thành năm 1886 với kiến trúc Tân Gothic uy nghiêm, hai tháp chuông cao 31,5 m và cửa sổ hoa hồng trung tâm.',
    floors: [14.5],
  },
  'osm:relation/21381215': {
    name: 'Tràng Tiền Plaza (24 Hai Bà Trưng)', kind: 'commercial', model: 'trang-tien-plaza', isSignatureLandmark: true,
    description: 'Trung tâm thương mại Tràng Tiền Plaza (khởi nguyên là Bách hóa Tổng hợp Hà Nội / Grands Magasins Réunis từ năm 1901) tại góc phố Tràng Tiền – Hàng Bài bên bờ Hồ Gươm, nổi bật với kiến trúc Pháp cổ điển kem – vàng và mái Mansard.',
    floors: [4.8, 4.2, 4.0, 3.8, 3.6, 3.6],
  },
  'osm:way/700627452': {
    name: 'Ô Quan Chưởng (Đông Hà Môn)', kind: 'other', model: 'o-quan-chuong', isSignatureLandmark: true,
    description: 'Ô Quan Chưởng (Đông Hà Môn, xây dựng năm 1749, trùng tu năm 1817) – cửa ô duy nhất còn nguyên vẹn của kinh thành Thăng Long xưa với cổng vòm tam quan bằng gạch vồ và vọng lâu 2 tầng trên đỉnh.',
    floors: [4.4, 3.6],
  },
  'osm:way/1255852379': {
    name: 'Chợ Đồng Xuân', kind: 'commercial', model: 'cho-dong-xuan', isSignatureLandmark: true,
    description: 'Chợ Đồng Xuân lịch sử (hình thành từ năm 1889) ở khu Phố cổ Hà Nội với mặt tiền 5 nhịp đầu hồi tam giác cổ điển đặc trưng.',
    floors: [5.0, 4.5, 4.2],
  },
  'osm:way/340128580': {
    name: 'Di tích lịch sử Nhà tù Hỏa Lò (1 Hỏa Lò)', kind: 'other', model: 'hoa-lo-prison', isSignatureLandmark: true,
    description: 'Di tích lịch sử Nhà tù Hỏa Lò – minh chứng lịch sử về tinh thần kiên cường bất khuất của các chiến sĩ cách mạng yêu nước Việt Nam.',
    floors: [4.2, 3.8],
  },
  'osm:way/704153620': {
    name: 'Bưu điện Hà Nội (75 Đinh Tiên Hoàng)', kind: 'office', isSignatureLandmark: true,
    description: 'Tòa nhà Bưu điện Hà Nội với tháp đồng hồ lớn nhìn thẳng ra Hồ Hoàn Kiếm – biểu tượng gắn liền với lịch sử Thủ đô.',
    floors: [4.8, 4.2, 4.0, 3.8, 3.8],
  },
  'osm:way/1189686007': {
    name: 'Nhà hát Hồ Gươm (40 Hàng Bài)', kind: 'other', isSignatureLandmark: true,
    description: 'Nhà hát Hồ Gươm tại số 40 Hàng Bài với hàng cột đá cổ điển châu Âu bề thế và công nghệ âm thanh biểu diễn hiện đại bậc nhất.',
    floors: [5.5, 5.0, 4.5, 4.5],
  },
  'osm:way/37933255': {
    name: 'Bảo tàng Lịch sử Quốc gia (1 Tràng Tiền)', kind: 'other', model: 'national-history-museum', isSignatureLandmark: true,
    description: 'Bảo tàng Lịch sử Quốc gia Việt Nam (khánh thành năm 1932, do KTS Ernest Hébrard thiết kế) – kiệt tác tiêu biểu của phong cách kiến trúc Đông Dương (Indochine) với tháp bát giác chồng diêm.',
    floors: [5.0, 4.5, 4.0],
  },
  'osm:way/704134590': {
    name: 'Chùa Quán Sứ (73 Quán Sứ)', kind: 'other', model: 'chua-quan-su', isSignatureLandmark: true,
    description: 'Chùa Quán Sứ (khởi dựng từ thế kỷ XV thời Hậu Lê) tại số 73 Quán Sứ – trụ sở Trung ương Giáo hội Phật giáo Việt Nam với tam quan lầu chuông và chính điện uy nghiêm.',
    floors: [4.8, 4.2],
  },
  // ── Phường Tây Hồ ──
  'osm:way/1218673074': {
    name: 'Bảo tháp Lục độ đài sen – Chùa Trấn Quốc', kind: 'other', model: 'chua-tran-quoc', isSignatureLandmark: true,
    description: 'Bảo tháp Lục độ đài sen 11 tầng cao 15 m tại Chùa Trấn Quốc bên bờ Hồ Tây, trên đỉnh tháp có Cửu phẩm liên hoa bằng đá quý.',
    floors: [15.0],
  },
  'osm:way/1230498818': {
    name: 'Chùa Trấn Quốc (Đường Thanh Niên – Hồ Tây)', kind: 'other', model: 'chua-tran-quoc', isSignatureLandmark: true,
    description: 'Chùa Trấn Quốc (Khai Quốc Tự) có lịch sử gần 1.500 năm từ thời Lý Nam Đế (năm 541) – ngôi cổ tự lâu đời nhất Thăng Long – Hà Nội nằm trên đảo Kim Ngư giữa Hồ Tây.',
    floors: [4.6, 3.8],
  },
  'osm:way/207178320': {
    name: 'Đền Quán Thánh (Trấn Vũ Quán)', kind: 'other', model: 'den-quan-thanh', isSignatureLandmark: true,
    description: 'Đền Quán Thánh (Trấn Vũ Quán – Trấn Bắc trong Thăng Long Tứ Trấn) thờ Huyền Thiên Trấn Vũ tại ngã tư đường Thanh Niên – Quán Thánh, nổi tiếng với pho tượng đồng đen Huyền Thiên Trấn Vũ đúc năm 1677.',
    floors: [4.8, 3.6],
  },
  'osm:way/1232838152': {
    name: 'Phủ Tây Hồ (Bán đảo Quảng An)', kind: 'other', model: 'phu-tay-ho', isSignatureLandmark: true,
    description: 'Phủ Tây Hồ trên bán đảo Quảng An vươn ra giữa lòng Hồ Tây – chốn linh thiêng bậc nhất Hà Thành thờ Thánh Mẫu Liễu Hạnh (một trong Tứ Bất Tử của tín ngưỡng dân gian Việt Nam).',
    floors: [4.6, 3.6],
  },
  // ── Phường Hai Bà Trưng & Phường Bạch Mai ──
  'osm:relation/19179452': {
    name: 'Cụm di tích Đền Hai Bà Trưng (Hồ Đồng Nhân)', kind: 'other', model: 'den-hai-ba-trung', isSignatureLandmark: true,
    description: 'Di tích Quốc gia đặc biệt Đền – Chùa – Đình Hai Bà Trưng bên bờ hồ Đồng Nhân, tưởng niệm nhị vị Anh hùng dân tộc Trưng Trắc và Trưng Nhị.',
    floors: [4.8, 3.6],
  },
  'osm:way/251584916': {
    name: 'Vincom Center Bà Triệu (191 Bà Triệu)', kind: 'commercial', model: 'vincom-ba-trieu', facade: 'glass', isSignatureLandmark: true,
    description: 'Tổ hợp tháp đôi thương mại – văn phòng Vincom Center Bà Triệu (191 Bà Triệu) cao 21 tầng – trung tâm thương mại hiện đại đầu tiên của Thủ đô Hà Nội.',
    floors: [...rep(4.5, 5), ...rep(3.5, 16)],
  },
  'osm:way/839886261': {
    name: 'Tòa nhà Gelex Tower (52 Lê Đại Hành)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
    description: 'Cao ốc văn phòng hạng A Gelex Tower cao 22 tầng tại ngã tư Lê Đại Hành – Đoàn Trần Nghiệp đối diện Công viên Thống Nhất.',
    floors: [...rep(4.5, 3), ...rep(3.6, 19)],
  },
  // ── Phường Thanh Xuân & Phường Khương Đình ──
  'osm:way/892577391': {
    name: 'Vinhomes Royal City – Tòa R1 (72A Nguyễn Trãi)', kind: 'apartment', model: 'royal-city', isSignatureLandmark: true,
    description: 'Khu đô thị phức hợp Vinhomes Royal City (72A Nguyễn Trãi, Ngã Tư Sở) mang kiến trúc tân cổ điển châu Âu sang trọng cùng quảng trường điêu khắc Tứ Mã khải hoàn.',
    floors: [...rep(4.5, 4), ...rep(3.3, 31)],
  },
  'osm:way/892577302': {
    name: 'Vinhomes Royal City – Tòa R2', kind: 'apartment', model: 'royal-city',
    description: 'Tòa căn hộ R2 cao 35 tầng thuộc quần thể Vinhomes Royal City (72A Nguyễn Trãi).',
    floors: [...rep(4.5, 4), ...rep(3.3, 31)],
  },
  'osm:way/892577182': {
    name: 'Vinhomes Royal City – Tòa R3 (Quảng trường trung tâm)', kind: 'apartment', model: 'royal-city', isSignatureLandmark: true,
    description: 'Tòa R3 trung tâm hình chữ V cao 15 tầng ôm trọn Quảng trường Royal City và trung tâm thương mại ngầm Vincom Mega Mall Royal City.',
    floors: [...rep(4.8, 3), ...rep(3.5, 12)],
  },
  'osm:way/892577318': {
    name: 'Vinhomes Royal City – Tòa R4', kind: 'apartment', model: 'royal-city',
    description: 'Tòa căn hộ R4 cao 35 tầng thuộc quần thể Vinhomes Royal City (72A Nguyễn Trãi).',
    floors: [...rep(4.5, 4), ...rep(3.3, 31)],
  },
  'osm:way/892577123': {
    name: 'Vinhomes Royal City – Tòa R5', kind: 'apartment', model: 'royal-city',
    description: 'Tòa căn hộ R5 cao 35 tầng thuộc quần thể Vinhomes Royal City (72A Nguyễn Trãi).',
    floors: [...rep(4.5, 4), ...rep(3.3, 31)],
  },
  'osm:way/892577222': {
    name: 'Vinhomes Royal City – Tòa R6', kind: 'apartment', model: 'royal-city',
    description: 'Tòa căn hộ và văn phòng R6 cao 30 tầng ngay mặt tiền đường Nguyễn Trãi của Vinhomes Royal City.',
    floors: [...rep(4.5, 4), ...rep(3.3, 26)],
  },
  'osm:way/1114989167': {
    name: 'Tổ đình Phúc Khánh (Chùa Sở – Ngã Tư Sở)', kind: 'other', model: 'chua-phuc-khanh', isSignatureLandmark: true,
    description: 'Tổ đình Phúc Khánh (Chùa Sở) – ngôi cổ tự danh tiếng từ thời Hậu Lê ngay cạnh cầu vượt Ngã Tư Sở, nơi hàng vạn Phật tử hội tụ cầu bình an mỗi dịp đầu xuân.',
    floors: [4.6, 3.6],
  },
  'osm:way/1316649460': {
    name: 'Đình Khương Hạ (Di tích lịch sử – kiến trúc nghệ thuật)', kind: 'other', model: 'traditional-temple', isSignatureLandmark: true,
    description: 'Cụm di tích Đình – Chùa Khương Hạ cổ kính bên sông Tô Lịch thuộc Phường Khương Đình.',
    floors: [4.5],
  },
  // ── Khu vực Cầu Giấy ──
  'osm:way/339936730': {
    name: 'Bảo tàng Dân tộc học Việt Nam (Nguyễn Văn Huyên)', kind: 'other', model: 'bao-tang-dan-toc-hoc', isSignatureLandmark: true,
    description: 'Bảo tàng Dân tộc học Việt Nam tại đường Nguyễn Văn Huyên (Phường Nghĩa Đô) với tòa nhà Trống Đồng hình tròn và khu vườn kiến trúc dân gian Nhà Rông Tây Nguyên.',
    floors: [5.5, 5.0, 4.5],
  },
  'osm:way/1118494921': {
    name: 'Chùa Hà – Thánh Đức Tự (Phường Cầu Giấy)', kind: 'other', model: 'traditional-pagoda', isSignatureLandmark: true,
    description: 'Chùa Hà (Thánh Đức Tự) trên phố Chùa Hà (Phường Cầu Giấy) – ngôi cổ tự nổi tiếng linh thiêng của Thủ đô Hà Nội.',
    floors: [4.6, 3.8],
  },
  // ── Khu vực Nam Từ Liêm ──
  'osm:way/533838254': {
    name: 'Sân vận động Quốc gia Mỹ Đình (Phường Từ Liêm)', kind: 'other', model: 'svd-my-dinh', isSignatureLandmark: true,
    description: 'Sân vận động Quốc gia Mỹ Đình sức chứa hơn 40.000 chỗ ngồi tại Phường Từ Liêm với kiến trúc hai mái vòm giàn thép khổng lồ và quảng trường cờ Tổ quốc.',
    floors: [5.0, 4.5, 4.5, 4.0, 4.0],
  },
  'osm:way/208255133': {
    name: 'Bảo tàng Hà Nội – Kim tự tháp ngược (Phường Đại Mỗ)', kind: 'other', model: 'bao-tang-ha-noi', isSignatureLandmark: true,
    description: 'Bảo tàng Hà Nội trên đường Phạm Hùng (Phường Đại Mỗ) với thiết kế Kim tự tháp ngược 4 tầng độc đáo soi bóng xuống hồ nước cảnh quan.',
    floors: [6.5, 6.5, 6.5, 7.0],
  },
  'osm:way/208251764': {
    name: 'Trung tâm Hội nghị Quốc gia (Phường Đại Mỗ)', kind: 'other', model: 'tt-hoi-nghi-quoc-gia', isSignatureLandmark: true,
    description: 'Trung tâm Hội nghị Quốc gia tại ngã tư Đại lộ Thăng Long – Phạm Hùng (Phường Đại Mỗ) với kiến trúc mái lượn sóng Biển Đông.',
    floors: [5.5, 5.0, 4.8, 4.5, 4.5],
  },
  // ── Khu vực Bắc Từ Liêm ──
  // ── Khu vực Tây Hồ – Phường Phú Thượng ──
  // ── Khu vực Long Biên ──
  'osm:way/99000000111': {
    name: 'Cầu Long Biên lịch sử (Phường Bồ Đề – Hoàn Kiếm)', kind: 'other', model: 'cau-long-bien', isSignatureLandmark: true,
    description: 'Cầu Long Biên lịch sử (1899–1902) bắc qua Sông Hồng với kết cấu dầm thép hình rồng lượn – chứng nhân lịch sử hào hùng của Thủ đô Hà Nội.',
    floors: [7.5, 7.5, 7.5],
  },
  // ── Khu vực Hà Đông ──
  // ── Khu vực Hoàng Mai ──
  'osm:way/1446303895': {
    name: 'Chùa Sét – Đền Trương Định (Phường Hoàng Mai)', kind: 'other', model: 'traditional-pagoda', isSignatureLandmark: true,
    description: 'Di tích lịch sử văn hóa Chùa Sét (Đại Bi Tự) và Đền thờ Bình Tây Đại Nguyên Soái Trương Định tại Phường Hoàng Mai.',
    floors: [4.6, 3.8],
  },
};
