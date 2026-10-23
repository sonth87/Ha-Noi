/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc: how to import it, and the hand corrections on top of OSM.
   Origin: the middle of the junction under the Tây Sơn flyover. Bearing: Tây Sơn runs 62.5°
   counter-clockwise from east (toward Ô Chợ Dừa), so it lies along +x and Thái Hà goes north (−y).
   Region: the crossroads (±160 m: the four 130 m arms and the junction, ADR-032), all of Phố Thái Hà,
   and Line 2A's viaduct round Thái Hà station (ADR-042). */
import type { AreaConfig } from './import';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

const LINE_3_STATIONS = new Set(['Cầu Giấy', 'Chùa Hà', 'Đại học Quốc gia', 'Lê Đức Thọ', 'Cầu Diễn', 'Phú Diễn', 'Minh Khai', 'Nhổn']);

const districtOf = (pt: readonly [number, number]): string =>
  pt[0] >= 1680 || (pt[0] >= 650 && pt[1] < -1150) ? 'Quận Ba Đình' : 'Quận Đống Đa';

export const NGA_TU_THAI_HA: AreaConfig = {
  area: 'nga-tu-thai-ha',
  name: 'Hà Nội: Quận Đống Đa & Quận Ba Đình (Thái Hà – Láng Hạ – Cát Linh – Giảng Võ – Kim Mã – Liễu Giai – Lăng Bác – Hoàng Thành)',
  cityName: 'Hà Nội',
  frame: { origin: [21.0092471, 105.8243958], bearing: 62.5 },
  // Full Đống Đa + Ba Đình districts extract
  region: [
    { x0: -1060, y0: -1880, x1: 1880, y1: 1120 },
    { x0: 650, y0: -2820, x1: 3960, y1: 380 },
  ],
  districtOf,
  areaNameOverrides: {
    'osm:way/840074806': 'Hồ Đắc Di',
    'Hố Đống Đa': 'Hồ Hoàng Cầu (Hồ Đống Đa)',
    'Gò Đống Đa': 'Công viên Văn hóa Đống Đa (Gò Đống Đa)',
  },
  heritageNotes: {
    'Tượng đài Quang Trung': 'Tượng đài Hoàng đế Quang Trung – Nguyễn Huệ uy nghi trên đỉnh Gò Đống Đa, kỷ niệm chiến thắng Ngọc Hồi – Đống Đa mùa xuân năm Kỷ Dậu (1789).',
    'Miếu Trung Liệt': 'Di tích lịch sử trên khu vực Gò Đống Đa thờ các vị trung liệt, tướng sĩ Tây Sơn và các danh tướng có công giữ nước.',
    'Đàn Xã Tắc': 'Di chỉ khảo cổ học Quốc gia được lập từ năm 1048 thời vua Lý Thái Tông tại Ô Chợ Dừa – nơi tế Trời Đất và cầu mưa thuận gió hòa của kinh thành Thăng Long.',
    'Gò Đống Đa': 'Công viên văn hóa – Di tích Quốc gia đặc biệt gắn liền với chiến thắng Đống Đa lịch sử năm 1789 của nghĩa quân Tây Sơn.',
    'Công viên Văn hóa Đống Đa (Gò Đống Đa)': 'Công viên văn hóa – Di tích Quốc gia đặc biệt gắn liền với chiến thắng Đống Đa lịch sử năm 1789 của nghĩa quân Tây Sơn.',
    'Đền thờ Quang Trung': 'Ngôi đền thờ Hoàng đế Quang Trung cùng các nghĩa sĩ Tây Sơn trong quần thể di tích Gò Đống Đa.',
    'Chùa Bộc': 'Di tích lịch sử Quốc gia (Sùng Phúc Tự) trên phố Chùa Bộc, xây dựng từ thời Hậu Lê và gắn liền với chiến thắng Đống Đa năm 1789.',
    'Chùa Phúc Khánh': 'Ngôi cổ tự nổi tiếng (Chùa Sở) gần Ngã Tư Sở được xây dựng từ thời Hậu Lê, điểm sinh hoạt văn hóa tâm linh lớn của Hà Nội.',
    'Nhà thờ Thái Hà': 'Giáo xứ Thái Hà cùng Tu viện Dòng Chúa Cứu Thế trên phố Nguyễn Lương Bằng, công trình kiến trúc tôn giáo tiêu biểu tại quận Đống Đa.',
    'Lăng mộ Hoàng Cao Khải': 'Quần thể di tích kiến trúc đá cổ tại khu vực Ấp Thái Hà xưa (ngõ 252 Tây Sơn), một di tích điêu khắc đá độc đáo cuối thế kỷ XIX.',
    'Lăng mộ Hoàng Trọng Phu': 'Di tích lăng đá trong quần thể khu lăng Hoàng Cao Khải tại phường Trung Liệt, quận Đống Đa.',
    'Chùa Đồng Quang': 'Ngôi chùa cổ đối diện Gò Đống Đa trên phố Tây Sơn, lưu giữ nhiều hiện vật lịch sử quý giá.',
    'Chùa Xã Đàn': 'Kim Yên Tự – ngôi chùa cổ tại khu vực Xã Đàn 2, phường Nam Đồng, quận Đống Đa.',
    'Văn Miếu - Quốc Tử Giám': 'Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám, trường đại học đầu tiên của Việt Nam được xây dựng từ năm 1070 thời vua Lý Thánh Tông.',
    'Hoàng thành Thăng Long': 'Di sản Văn hóa Thế giới UNESCO – trung tâm quyền lực chính trị của Đại Việt suốt hơn 1000 năm lịch sử tại quận Ba Đình.',
    'Lăng Chủ tịch Hồ Chí Minh': 'Công trình lịch sử – văn hóa đặc biệt tại Quảng trường Ba Đình, nơi an nghỉ của Chủ tịch Hồ Chí Minh.',
    'Chùa Một Cột': 'Diên Hựu Tự – ngôi chùa có kiến trúc độc đáo hình hoa sen nở trên mặt nước, xây dựng năm 1049 thời vua Lý Thái Tông tại Ba Đình.',
    'Đền Quán Thánh': 'Trấn Vũ Quán – một trong Thăng Long Tứ Trấn thờ Huyền Thiên Trấn Vũ bên hồ Tây và đường Thanh Niên, quận Ba Đình.',
    'Cột cờ Hà Nội (Kỳ đài)': 'Kỳ đài Hà Nội xây dựng năm 1812 trên đường Điện Biên Phủ, biểu tượng lịch sử kiêu hãnh của Thủ đô trong quần thể Hoàng thành Thăng Long.',
  },
  stationMeta: (rawName, at) => {
    const clean = rawName.replace(/^Ga\s+/i, '').trim() || 'Thái Hà';
    const isLine3 = LINE_3_STATIONS.has(clean);
    const lineTag = isLine3 ? 'Metro 3' : 'Metro 2A';
    const lineName = isLine3 ? 'Tuyến số 3 Nhổn – Ga Hà Nội' : 'Tuyến số 2A Cát Linh – Hà Đông';
    const address = /Thái Hà/i.test(clean)
      ? 'Phố Hoàng Cầu – Thái Hà, Đống Đa'
      : /La Thành/i.test(clean)
        ? 'Phố Hoàng Cầu – Đê La Thành, Đống Đa'
        : /Cát Linh/i.test(clean)
          ? 'Phố Cát Linh – Hào Nam, Đống Đa'
          : /Cầu Giấy/i.test(clean)
            ? 'Nút giao Cầu Giấy – Kim Mã, Ba Đình'
            : isLine3
              ? 'Trục Cầu Giấy – Hồ Tùng Mậu – Nhổn, Hà Nội'
              : 'Trục đường Láng – Nguyễn Trãi – Quang Trung, Hà Nội';
    return { lineTag, lineName, address, district: districtOf(at) };
  },
  places: [
    { id: 'home', name: 'Ngã tư Thái Hà – Tây Sơn', group: 'Quận Đống Đa', at: [0, 0] },
    { id: 'vpbank-lang-ha', name: 'VPBank Tower (89 Láng Hạ – Cuối Thái Hà)', group: 'Quận Đống Đa', at: [223, -1206] },
    { id: 'rap-chieu-phim-quoc-gia', name: 'Rạp Chiếu phim Quốc gia (87 Láng Hạ)', group: 'Quận Đống Đa', at: [310, -1148] },
    { id: 'thai-thinh', name: 'Phố Thái Thịnh – Yên Lãng', group: 'Quận Đống Đa', at: [-260, -560] },
    { id: 'nga-tu-so', name: 'Ngã Tư Sở', group: 'Quận Đống Đa', at: [-785, -36] },
    { id: 'chua-boc', name: 'Chùa Bộc – Học viện Ngân hàng', group: 'Quận Đống Đa', at: [50, 560] },
    { id: 'pham-ngoc-thach', name: 'Phạm Ngọc Thạch – Kim Liên', group: 'Quận Đống Đa', at: [420, 880] },
    { id: 'ho-dac-di', name: 'Hồ Đắc Di – Nam Đồng', group: 'Quận Đống Đa', at: [520, 480] },
    { id: 'nguyen-luong-bang', name: 'Nguyễn Lương Bằng – Gò Đống Đa', group: 'Quận Đống Đa', at: [420, -20] },
    { id: 'o-cho-dua', name: 'Ô Chợ Dừa', group: 'Quận Đống Đa', at: [1142, 50] },
    { id: 'xa-dan', name: 'Phố Xã Đàn', group: 'Quận Đống Đa', at: [986, 500] },
    { id: 'kham-thien', name: 'Phố Khâm Thiên', group: 'Quận Đống Đa', at: [1420, 210] },
    { id: 'ton-duc-thang', name: 'Tôn Đức Thắng – Văn Miếu Quốc Tử Giám', group: 'Quận Đống Đa', at: [1520, -720] },
    { id: 'hoang-cau', name: 'Hồ Hoàng Cầu', group: 'Quận Đống Đa', at: [750, -520] },
    { id: 'hao-nam', name: 'Phố Hào Nam – Cát Linh', group: 'Quận Đống Đa', at: [980, -820] },
    { id: 'thanh-cong', name: 'Hồ Thành Công – Huỳnh Thúc Kháng', group: 'Quận Ba Đình', at: [210, -1420] },
    { id: 'giang-vo', name: 'Hồ Giảng Võ – Triển lãm Giảng Võ', group: 'Quận Ba Đình', at: [520, -1820] },
    { id: 'kim-ma', name: 'Trục Kim Mã – Núi Trúc', group: 'Quận Ba Đình', at: [720, -2100] },
    { id: 'lotte-lieu-giai', name: 'Lotte Center – Liễu Giai – Đào Tấn', group: 'Quận Ba Đình', at: [-80, -2420] },
    { id: 'ngoc-khanh', name: 'Hồ Thủ Lệ – Ngọc Khánh', group: 'Quận Ba Đình', at: [-420, -2180] },
    { id: 'lang-bac', name: 'Quảng trường Ba Đình – Lăng Chủ tịch Hồ Chí Minh', group: 'Quận Ba Đình', at: [2150, -2380] },
    { id: 'hoang-thanh', name: 'Hoàng thành Thăng Long – Điện Biên Phủ', group: 'Quận Ba Đình', at: [2380, -2120] },
    { id: 'truc-bach', name: 'Hồ Trúc Bạch – Quán Thánh – Phan Đình Phùng', group: 'Quận Ba Đình', at: [2750, -2950] },
    { id: 'doi-can', name: 'Phố Đội Cấn – Ngọc Hà', group: 'Quận Ba Đình', at: [1280, -2480] },
  ],
  overrides: {
    buildings: {
      // Tòa Thái Bình (Việt Tower, 1 Thái Hà; ADR-030 of the old app): 18 storeys. A commercial
      // base of 4 m storeys (the arm and the wedge, 11), the tower above it at 3.6 m.
      'osm:way/136257265': {
        name: 'Tòa Thái Bình (Việt Tower)', kind: 'commercial', model: 'viet-tower', isSignatureLandmark: true,
        description: 'Tòa tháp văn phòng & thương mại 18 tầng biểu tượng tại góc Tây Bắc ngã tư Thái Hà – Tây Sơn với khối đế cong và cột thu phát sóng trên đỉnh.',
        parts: {
          'osm:way/845096110': { floors: [...rep(4, 11), ...rep(3.6, 7)] },
          'osm:way/1198548269': { floors: rep(4, 11) },
          'osm:way/1198548270': { floors: rep(4, 11) },
        },
      },
      // Novotel Thái Hà: 27 storeys as the hotel publishes them (OSM says 26): a 4.2 m podium of 5,
      // then 3 m storeys; the curved tower is glass, the two white strips stop at 24, the wing at 5.
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
      // VPBank Tower 89 Láng Hạ (ngã tư cuối đường Thái Hà – Láng Hạ – Huỳnh Thúc Kháng): 29 storeys glass curtain wall + podium & crown
      'osm:way/677190114': {
        name: 'VPBank Tower (89 Láng Hạ)', kind: 'office', model: 'vpbank-tower', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa tháp văn phòng hạng A cao 29 tầng (102 m) tại ngã tư Thái Hà – Láng Hạ – Huỳnh Thúc Kháng với khối đế ngân hàng, đỉnh tháp kính giật cấp và sân đỗ trực thăng.',
        floors: [...rep(4.2, 4), ...rep(3.1, 25)],
      },
      // Green Diamond 93 Láng Hạ (cạnh VPBank Tower): 28 storeys commercial + luxury apartment
      'osm:way/1368063988': {
        name: 'Green Diamond (93 Láng Hạ)', kind: 'apartment',
        floors: [...rep(4.2, 5), ...rep(3.2, 23)],
      },
      // Trung tâm Chiếu phim Quốc gia 87 Láng Hạ (góc Đông-Bắc ngã tư Thái Hà – Láng Hạ, đối diện VPBank Tower):
      // gộp cả 6 khối nhà rạp (1115247049..1115247054) cùng sảnh vòm tròn góc ngã tư (model: 'national-cinema')
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
      // Petrovietnam Tower 18 Láng Hạ (đối diện cuối đường Thái Hà): 19-storey glass office tower + podium wings
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
      // BRG Tower / Oriental Plaza 16 Láng Hạ (ngay cạnh Petrovietnam Tower, cuối đường Thái Hà)
      'osm:way/926276853': {
        name: 'BRG Tower – Oriental Plaza (16 Láng Hạ)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 18)],
      },
      'osm:way/926276852': {
        name: 'Oriental Plaza – Khối B (16 Láng Hạ)', kind: 'commercial', isSecondaryTwin: true,
        floors: [...rep(4.2, 4), ...rep(3.3, 18)],
      },
      // Tòa nhà TDL 22 Láng Hạ (góc Tây-Nam ngã tư Thái Hà – Láng Hạ – Huỳnh Thúc Kháng)
      'osm:way/1319809023': {
        name: 'Tòa nhà TDL (22 Láng Hạ)', kind: 'office',
        floors: [...rep(4.0, 2), ...rep(3.4, 6)],
      },
      // Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng, ngay đầu ngã tư Thái Hà – Láng Hạ)
      'osm:way/1195546201': {
        name: 'Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng)', kind: 'office',
        floors: [...rep(4.2, 2), ...rep(3.5, 7)],
      },
      // Sông Hồng Park View 165 Thái Hà (tổ hợp 2 tòa tháp 21 tầng + 1 tòa văn phòng 14 tầng trên khối đế 4 tầng)
      'osm:way/1082814006': {
        name: 'Sông Hồng Park View (165 Thái Hà)', kind: 'apartment', isSignatureLandmark: true,
        description: 'Tổ hợp 2 tháp căn hộ 21 tầng và 1 tháp văn phòng 14 tầng trên khối đế thương mại 4 tầng tại số 165 Thái Hà.',
        parts: {
          'osm:way/1365535486': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
          'osm:way/1365535487': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
          'osm:way/1365535488': { floors: [...rep(4.2, 4), ...rep(3.4, 10)], facade: 'glass' },
        },
      },
      // Tòa nhà 131 Thái Hà (chung cư – thương mại 19 tầng trên phố Thái Hà)
      'osm:way/1085065492': {
        name: 'Tòa nhà 131 Thái Hà', kind: 'apartment',
        floors: [...rep(4.2, 3), ...rep(3.2, 16)],
      },
      // Vinaconex Tower 34 Láng Hạ (27 storeys glass office tower)
      'osm:way/526930280': {
        name: 'Vinaconex Tower (34 Láng Hạ)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 23)],
      },
      // Sky City Towers 88 Láng Hạ (2 tháp A & B cao 31 tầng)
      'osm:way/841601171': {
        name: 'Sky City Towers – Tháp A (88 Láng Hạ)', kind: 'apartment',
        floors: [...rep(4.2, 3), ...rep(3.2, 28)],
      },
      'osm:way/841601172': {
        name: 'Sky City Towers – Tháp B (88 Láng Hạ)', kind: 'apartment', isSecondaryTwin: true,
        floors: [...rep(4.2, 3), ...rep(3.2, 28)],
      },
      // Hà Thành Plaza 102 Thái Thịnh (2 tháp 21 tầng trên khối đế thương mại 4 tầng)
      'osm:way/845096117': {
        name: 'Hà Thành Plaza (102 Thái Thịnh)', kind: 'commercial',
      },
      // Mipec Tower 229 Tây Sơn (5-storey podium + twin 25-storey towers)
      'osm:way/180075246': {
        name: 'MIPEC Tower (229 Tây Sơn)', kind: 'commercial', isSignatureLandmark: true,
        description: 'Tổ hợp thương mại – văn phòng – căn hộ cao cấp MIPEC Tower tại số 229 Tây Sơn.',
        floors: [...rep(4.2, 5), ...rep(3.3, 20)],
      },
      // Oriental Tower 324 Tây Sơn (16 storeys, glass office facade)
      'osm:way/851595051': {
        name: 'Oriental Tower (324 Tây Sơn)', kind: 'office', facade: 'glass',
        floors: [...rep(4.0, 3), ...rep(3.4, 13)],
      },
      // TTG Tower 174 Thái Hà (13 storeys office)
      'osm:way/1346893415': {
        name: 'TTG Tower (174 Thái Hà)', kind: 'office', facade: 'glass',
        floors: [...rep(4.0, 2), ...rep(3.4, 11)],
      },
      // Hoàng Cầu Skyline 36 Hoàng Cầu (18 storeys apartment overlooking Hồ Hoàng Cầu)
      'osm:way/839881655': {
        name: 'Hoàng Cầu Skyline (36 Hoàng Cầu)', kind: 'apartment',
        floors: [...rep(4.0, 3), ...rep(3.2, 15)],
      },
      // PeakView Tower 36 Hoàng Cầu (21 storeys glass office tower)
      'osm:way/839881657': {
        name: 'PeakView Tower (36 Hoàng Cầu)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 17)],
      },
      // T&T Capella 2 Phạm Ngọc Thạch (24 storeys commercial & luxury apartment)
      'osm:way/1184245771': {
        name: 'T&T Capella (2 Phạm Ngọc Thạch)', kind: 'apartment',
        floors: [...rep(4.2, 5), ...rep(3.2, 19)],
      },
      // ---------- Quận Ba Đình Landmarks ----------
      // Lotte Center Hanoi (54 Liễu Giai, Ba Đình): 65 storeys iconic glass skyscraper (272 m)
      'osm:way/727570329': {
        name: 'Lotte Center Hanoi (54 Liễu Giai)', kind: 'commercial', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa tháp biểu tượng Lotte Center Hanoi cao 65 tầng (272 m) tại ngã tư Liễu Giai – Đào Tấn (Ba Đình), lấy cảm hứng từ tà áo dài Việt Nam với đài quan sát Sky Walk trên đỉnh.',
        floors: [...rep(4.5, 6), ...rep(3.8, 59)],
      },
      // Vinhomes Metropolis (29 Liễu Giai, Ba Đình): tổ hợp tháp văn phòng Capital Place & căn hộ M1-M2-M3 (41–45 tầng)
      'osm:way/840982441': {
        name: 'Vinhomes Metropolis (29 Liễu Giai)', kind: 'apartment', facade: 'glass', isSignatureLandmark: true,
        description: 'Tổ hợp tháp văn phòng hạng A Capital Place và căn hộ cao cấp Vinhomes Metropolis (41–45 tầng) tại số 29 Liễu Giai, quận Ba Đình.',
        floors: [...rep(4.5, 4), ...rep(3.3, 41)],
      },
      // Khách sạn Hà Nội Daewoo (360 Kim Mã, Ba Đình): 18 storeys hotel & Daeha Business Center
      'osm:way/727578326': {
        name: 'Khách sạn Hà Nội Daewoo (360 Kim Mã)', kind: 'hotel', facade: 'glass', isSignatureLandmark: true,
        description: 'Tổ hợp Khách sạn 5 sao Hà Nội Daewoo và trung tâm thương mại Daeha tại số 360 Kim Mã, đối diện Công viên Thủ Lệ, quận Ba Đình.',
        floors: [...rep(4.2, 3), ...rep(3.4, 15)],
      },
      // Nhà Quốc hội Việt Nam (1 Độc Lập, Quảng trường Ba Đình)
      'osm:way/695966191': {
        name: 'Nhà Quốc hội Việt Nam (Quảng trường Ba Đình)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa nhà Quốc hội Việt Nam bên Quảng trường Ba Đình và Hoàng thành Thăng Long, kiến trúc hiện đại biểu trưng cho hình tượng Trời tròn Đất vuông.',
        floors: rep(6.5, 5),
      },
      // Lăng Chủ tịch Hồ Chí Minh (2 Hùng Vương, Quảng trường Ba Đình)
      'osm:way/37625751': {
        name: 'Lăng Chủ tịch Hồ Chí Minh', kind: 'other', isSignatureLandmark: true,
        description: 'Lăng Chủ tịch Hồ Chí Minh uy nghiêm tại trung tâm Quảng trường Ba Đình lịch sử.',
        floors: rep(5.4, 4),
      },
      // Cột cờ Hà Nội (28A Điện Biên Phủ, Ba Đình)
      'osm:way/184959290': {
        name: 'Cột cờ Hà Nội (Kỳ đài)', kind: 'other', isSignatureLandmark: true,
        description: 'Cột cờ Hà Nội (Kỳ đài) trên đường Điện Biên Phủ, quận Ba Đình.',
        floors: [...rep(4.2, 3), ...rep(3.5, 6)],
      },
    },
  },
};
