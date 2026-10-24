/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc: how to import it, and the hand corrections on top of OSM.
   Origin: the middle of the junction under the Tây Sơn flyover. Bearing: Tây Sơn runs 62.5°
   counter-clockwise from east (toward Ô Chợ Dừa), so it lies along +x and Thái Hà goes north (−y).
   Region: the crossroads (±160 m: the four 130 m arms and the junction, ADR-032), all of Phố Thái Hà,
   and Line 2A's viaduct round Thái Hà station (ADR-042). */
import type { AreaConfig } from './import';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

const LINE_3_STATIONS = new Set(['Cầu Giấy', 'Chùa Hà', 'Đại học Quốc gia', 'Lê Đức Thọ', 'Cầu Diễn', 'Phú Diễn', 'Minh Khai', 'Nhổn']);

/** Resolve city-frame [x, y] into Hanoi's new Phường (ward) administrative units across
    Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, and Thanh Xuân */
export const districtOf = (pt: readonly [number, number]): string => {
  const [x, y] = pt;
  // 1. Khu vực Tây Hồ (phía Bắc / Đông Bắc Hồ Tây)
  if (x >= 3550 && y < -450) return 'Phường Tây Hồ';
  // 2. Khu vực Hoàn Kiếm (Hồ Gươm, Phố cổ, Cửa Nam)
  if (x >= 2350 && y >= 550) {
    return x < 2880 && y < 1680 ? 'Phường Cửa Nam' : 'Phường Hoàn Kiếm';
  }
  // 3. Khu vực Hai Bà Trưng (phía Đông Nam: Công viên Thống Nhất, Bà Triệu, Bách Khoa, Bạch Mai)
  if (y >= 1120 && x >= -150) {
    return y >= 1950 && x < 1350 ? 'Phường Bạch Mai' : 'Phường Hai Bà Trưng';
  }
  // 4. Khu vực Thanh Xuân (phía Tây Nam: Ngã Tư Sở, Royal City, Nguyễn Trãi, Khương Đình)
  if (x < -820 || (x < -350 && y >= 320)) {
    return y >= -120 ? 'Phường Khương Đình' : 'Phường Thanh Xuân';
  }
  // 5. Khu vực Ba Đình (Lăng Bác, Hoàng Thành, Ngọc Hà, Đội Cấn, Liễu Giai, Giảng Võ)
  if (x >= 1680 && y < 550) {
    if (x >= 2550 && y >= -1150) return 'Phường Ba Đình';
    if (y < -1150 && x >= 2100) return 'Phường Ngọc Hà';
    if (y < -650) return 'Phường Giảng Võ';
  }
  if (x >= 650 && y < -1150) {
    return x >= 1350 ? 'Phường Giảng Võ' : 'Phường Láng';
  }
  // 6. Khu vực Đống Đa (Văn Miếu – Quốc Tử Giám, Ô Chợ Dừa, Đống Đa, Kim Liên, Láng)
  if (x >= 1650 && y >= -650 && y < 550) return 'Phường Văn Miếu – Quốc Tử Giám';
  if (y < -720) return 'Phường Láng';
  if (x >= 520 && y < 180) return 'Phường Ô Chợ Dừa';
  if (y >= 320) return 'Phường Kim Liên';
  return 'Phường Đống Đa';
};

export const NGA_TU_THAI_HA: AreaConfig = {
  area: 'nga-tu-thai-ha',
  name: 'Hà Nội: Đống Đa – Ba Đình – Hoàn Kiếm – Tây Hồ – Hai Bà Trưng – Thanh Xuân',
  cityName: 'Hà Nội',
  frame: { origin: [21.0092471, 105.8243958], bearing: 62.5 },
  // 6 central Hanoi areas: Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân
  region: [
    // Đống Đa
    { x0: -1060, y0: -1880, x1: 2550, y1: 1120 },
    // Ba Đình
    { x0: 650, y0: -2820, x1: 4150, y1: 600 },
    // Hoàn Kiếm (Hồ Gươm, Phố cổ, Nhà hát Lớn, Nhà thờ Lớn, Chợ Đồng Xuân, Cầu Long Biên)
    { x0: 2300, y0: 550, x1: 4700, y1: 2700 },
    // Tây Hồ (Hồ Tây, Chùa Trấn Quốc, Phủ Tây Hồ, Chùa Kim Liên, Nghi Tàm, Quảng An)
    { x0: 3400, y0: -4750, x1: 6500, y1: -450 },
    // Hai Bà Trưng (Công viên Thống Nhất, Hồ Bảy Mẫu, Bà Triệu, Đền Hai Bà Trưng, ĐH Bách Khoa, Bạch Mai)
    { x0: -150, y0: 1050, x1: 3100, y1: 3650 },
    // Thanh Xuân (Royal City, Ngã Tư Sở, Nguyễn Trãi, Khuất Duy Tiến, Khương Đình, Khương Hạ)
    { x0: -3100, y0: -1650, x1: -650, y1: 950 },
  ],
  districtOf,
  areaNameOverrides: {
    'osm:way/840074806': 'Hồ Đắc Di',
    'Hố Đống Đa': 'Hồ Hoàng Cầu (Hồ Đống Đa)',
    'Gò Đống Đa': 'Công viên Văn hóa Đống Đa (Gò Đống Đa)',
    'Thiên Quang tỉnh': 'Giếng Thiên Quang (Văn Miếu)',
  },
  heritageNotes: {
    'Tượng đài Quang Trung': 'Tượng đài Hoàng đế Quang Trung – Nguyễn Huệ uy nghi trên đỉnh Gò Đống Đa, kỷ niệm chiến thắng Ngọc Hồi – Đống Đa mùa xuân năm Kỷ Dậu (1789).',
    'Miếu Trung Liệt': 'Di tích lịch sử trên khu vực Gò Đống Đa thờ các vị trung liệt, tướng sĩ Tây Sơn và các danh tướng có công giữ nước.',
    'Đàn Xã Tắc': 'Di chỉ khảo cổ học Quốc gia được lập từ năm 1048 thời vua Lý Thái Tông tại Ô Chợ Dừa – nơi tế Trời Đất và cầu mưa thuận gió hòa của kinh thành Thăng Long.',
    'Gò Đống Đa': 'Công viên văn hóa – Di tích Quốc gia đặc biệt gắn liền với chiến thắng Đống Đa lịch sử năm 1789 của nghĩa quân Tây Sơn.',
    'Công viên Văn hóa Đống Đa (Gò Đống Đa)': 'Công viên văn hóa – Di tích Quốc gia đặc biệt gắn liền với chiến thắng Đống Đa lịch sử năm 1789 của nghĩa quân Tây Sơn.',
    'Đền thờ Quang Trung': 'Ngôi đền thờ Hoàng đế Quang Trung cùng các nghĩa sĩ Tây Sơn trong quần thể di tích Gò Đống Đa.',
    'Chùa Bộc': 'Di tích lịch sử Quốc gia (Sùng Phúc Tự) trên phố Chùa Bộc, xây dựng từ thời Hậu Lê và gắn liền với chiến thắng Đống Đa năm 1789.',
    'Chùa Phúc Khánh': 'Ngôi cổ tự nổi tiếng (Tổ đình Phúc Khánh – Chùa Sở) gần Ngã Tư Sở được xây dựng từ thời Hậu Lê, điểm sinh hoạt văn hóa tâm linh lớn của Hà Nội.',
    'Nhà thờ Thái Hà': 'Giáo xứ Thái Hà cùng Tu viện Dòng Chúa Cứu Thế trên phố Nguyễn Lương Bằng, công trình kiến trúc tôn giáo tiêu biểu tại Đống Đa.',
    'Lăng mộ Hoàng Cao Khải': 'Quần thể di tích kiến trúc đá cổ tại khu vực Ấp Thái Hà xưa (ngõ 252 Tây Sơn), một di tích điêu khắc đá độc đáo cuối thế kỷ XIX.',
    'Lăng mộ Hoàng Trọng Phu': 'Di tích lăng đá trong quần thể khu lăng Hoàng Cao Khải tại phường Đống Đa.',
    'Chùa Đồng Quang': 'Ngôi chùa cổ đối diện Gò Đống Đa trên phố Tây Sơn, lưu giữ nhiều hiện vật lịch sử quý giá.',
    'Chùa Xã Đàn': 'Kim Yên Tự – ngôi chùa cổ tại khu vực Xã Đàn 2, Hà Nội.',
    'Văn Miếu - Quốc Tử Giám': 'Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám, trường đại học đầu tiên của Việt Nam được xây dựng từ năm 1070 thời vua Lý Thánh Tông.',
    'Giếng Thiên Quang (Văn Miếu)': 'Giếng Thiên Quang (Thiên Quang Tỉnh) hình vuông bên dưới Khuê Văn Các tượng trưng cho mặt đất thu nhận tinh hoa bầu trời.',
    'Hoàng thành Thăng Long': 'Di sản Văn hóa Thế giới UNESCO – trung tâm quyền lực chính trị của Đại Việt suốt hơn 1000 năm lịch sử tại Ba Đình.',
    'Lăng Chủ tịch Hồ Chí Minh': 'Công trình lịch sử – văn hóa đặc biệt tại Quảng trường Ba Đình, nơi an nghỉ của Chủ tịch Hồ Chí Minh.',
    'Chùa Một Cột': 'Diên Hựu Tự (Liên Hoa Đài) – ngôi chùa có kiến trúc độc đáo hình hoa sen nở trên mặt nước Hồ Linh Chiểu, xây dựng năm 1049 thời vua Lý Thái Tông tại Ba Đình.',
    'Diện tích Chùa Một Cột': 'Quần thể di tích Chùa Một Cột – Diên Hựu Tự tại phố Chùa Một Cột, Ba Đình.',
    'Nhà sàn Bác Hồ': 'Di tích Nhà sàn gỗ 2 tầng bên Ao cá Bác Hồ trong Khu Di tích Phủ Chủ tịch – nơi Chủ tịch Hồ Chí Minh sống và làm việc từ năm 1958 đến năm 1969.',
    'Đền Quán Thánh': 'Trấn Vũ Quán – một trong Thăng Long Tứ Trấn thờ Huyền Thiên Trấn Vũ bên hồ Tây và đường Thanh Niên.',
    'Cột cờ Hà Nội (Kỳ đài)': 'Kỳ đài Hà Nội xây dựng năm 1812 trên đường Điện Biên Phủ, biểu tượng lịch sử kiêu hãnh của Thủ đô trong quần thể Hoàng thành Thăng Long.',
    'V.I. Lê-nin': 'Tượng đài V.I. Lê-nin bằng đồng đặt tại Công viên Lê-nin đối diện Cột cờ Hà Nội trên đường Điện Biên Phủ.',
    'Tượng đài Lý Tự Trọng': 'Tượng đài anh hùng liệt sĩ Lý Tự Trọng tại vườn hoa Lý Tự Trọng bên đường Thanh Niên – Quán Thánh.',
    'Tượng Chu Văn An': 'Tượng danh nhân văn hóa – người thầy mẫu mực Chu Văn An tại khuôn viên trường THPT Chu Văn An bên Hồ Tây.',
    'Tượng đồng Chủ tịch Hồ Chí Minh': 'Tượng đồng Chủ tịch Hồ Chí Minh đặt tại không gian trang trọng của Bảo tàng Hồ Chí Minh.',
    'Trống đồng Đông Sơn': 'Biểu tượng văn hiến Trống đồng Đông Sơn trưng bày tại khuôn viên Bảo tàng Hồ Chí Minh.',
    'Xác máy bay B52': 'Di tích lịch sử Xác máy bay B-52 tại hồ Hữu Tiệp (ngõ 55 Hoàng Hoa Thám, Ngọc Hà), minh chứng chiến thắng Điện Biên Phủ trên không tháng 12/1972.',
    'Rồng đá': 'Đôi rồng đá thềm Điện Kính Thiên thời Lê Sơ (thế kỷ XV) – Bảo vật Quốc gia tại trung tâm Hoàng thành Thăng Long.',
    'Hồ Hoàn Kiếm': 'Hồ Hoàn Kiếm (Hồ Gươm) – trái tim lịch sử và văn hóa ngàn năm của Thủ đô Hà Nội, gắn liền với truyền thuyết vua Lê Thái Tổ trả gươm báu Thuận Thiên.',
    'Tháp Rùa': 'Tháp Rùa cổ kính trên gò đảo Rùa giữa lòng Hồ Hoàn Kiếm – biểu tượng thiêng liêng của Thủ đô Hà Nội được xây dựng năm 1886 với 3 tầng vòm cuốn và mái cong.',
    'Đền Ngọc Sơn': 'Quần thể Di tích Quốc gia đặc biệt Đền Ngọc Sơn – Cầu Thê Húc – Tháp Bút – Đài Nghiên – Đắc Nguyệt Lâu – Đình Trấn Ba trên đảo Ngọc giữa Hồ Hoàn Kiếm.',
    'Tượng đài Lý Thái Tổ': 'Tượng đài vua Lý Thái Tổ uy nghiêm cầm Chiếu dời đô năm 1010 khai sáng kinh thành Thăng Long, đặt tại Vườn hoa Lý Thái Tổ bên bờ Hồ Hoàn Kiếm.',
    'Nhà hát Lớn Hà Nội': 'Nhà hát Lớn Hà Nội (khởi công năm 1901, hoàn thành năm 1911) tại Quảng trường Cách mạng Tháng Tám – kiệt tác kiến trúc Tân cổ điển Pháp tại trung tâm Thủ đô.',
    'Nhà thờ Lớn Hà Nội': 'Nhà thờ Chính tòa Thánh Giuse (khánh thành năm 1886) tại số 40 Nhà Chung với kiến trúc Tân Gothic châu Âu và hai tháp chuông cao 31,5 m.',
    'Ô Quan Chưởng': 'Ô Quan Chưởng (Đông Hà Môn, xây dựng năm 1749) – cửa ô cổ duy nhất còn nguyên vẹn của kinh thành Thăng Long xưa tại khu Phố cổ Hoàn Kiếm.',
    'Chợ Đồng Xuân': 'Chợ Đồng Xuân lịch sử (xây dựng năm 1889) với 5 nếp mái vòm tam giác đặc trưng – trung tâm giao thương sầm uất bậc nhất khu Phố cổ Hà Nội.',
    'Nhà tù Hỏa Lò': 'Di tích lịch sử Nhà tù Hỏa Lò tại số 1 phố Hỏa Lò – biểu tượng tinh thần kiên trung bất khuất của các chiến sĩ cách mạng yêu nước Việt Nam.',
    'Chùa Quán Sứ': 'Chùa Quán Sứ (xây dựng từ thế kỷ XV tại số 73 Quán Sứ) – Trụ sở Trung ương Giáo hội Phật giáo Việt Nam.',
    'Bảo tàng Lịch sử Quốc gia Việt Nam': 'Bảo tàng Lịch sử Quốc gia tại số 1 Tràng Tiền – công trình tiêu biểu nhất của phong cách kiến trúc Đông Dương (Indochine) do kiến trúc sư Ernest Hébrard thiết kế.',
    'Hồ Tây': 'Hồ Tây (Dâm Đàm – Lãng Bạc) rộng hơn 500 ha – hồ nước tự nhiên lớn nhất và thắng cảnh thơ mộng bậc nhất của Thủ đô Hà Nội.',
    'Chùa Trấn Quốc': 'Chùa Trấn Quốc (Khai Quốc Tự) có lịch sử gần 1.500 năm từ thời vua Lý Nam Đế bên bờ Hồ Tây, nổi bật với Bảo tháp Lục Độ Đài Sen 11 tầng uy nghiêm.',
    'Phủ Tây Hồ': 'Phủ Tây Hồ trên bán đảo Nghi Tàm – Quảng An nhô ra giữa Hồ Tây, chốn linh thiêng bậc nhất Hà Nội thờ Thánh Mẫu Liễu Hạnh (một trong Tứ Bất Tử của Việt Nam).',
    'Chùa Kim Liên': 'Chùa Kim Liên (Đại Bi Tự) trên bán đảo Nghi Tàm bên Hồ Tây – kiệt tác kiến trúc gỗ cổ truyền thời Tây Sơn với tam quan và ba nếp chùa chồng diêm.',
    'Đền Kim Liên': 'Đền Kim Liên (Cao Sơn Đại Vương Từ) – trấn phương Nam trong Thăng Long Tứ Trấn tại phường Kim Liên.',
    'Đền Hai Bà Trưng': 'Quần thể Di tích Quốc gia đặc biệt Đền – Chùa – Đình Hai Bà Trưng (Đền Đồng Nhân, lập năm 1142 thời vua Lý Anh Tông) bên hồ Hai Bà Trưng thờ Nhị vị Vua Bà Trưng Trắc – Trưng Nhị.',
    'Công viên Thống Nhất': 'Công viên Thống Nhất và Hồ Bảy Mẫu – lá phổi xanh rộng hơn 50 ha giữa trung tâm Hà Nội.',
    'Đình Khương Hạ': 'Cụm di tích Đình – Chùa Khương Hạ cổ kính bên hồ Khương Hạ tại khu vực Thanh Xuân.',
  },
  stationMeta: (rawName, at) => {
    const clean = rawName.replace(/^Ga\s+/i, '').trim() || 'Thái Hà';
    const isLine3 = LINE_3_STATIONS.has(clean);
    const lineTag = isLine3 ? 'Metro 3' : 'Metro 2A';
    const lineName = isLine3 ? 'Tuyến số 3 Nhổn – Ga Hà Nội' : 'Tuyến số 2A Cát Linh – Hà Đông';
    const address = /Thái Hà/i.test(clean)
      ? 'Phố Hoàng Cầu – Thái Hà, Phường Ô Chợ Dừa'
      : /La Thành/i.test(clean)
        ? 'Phố Hoàng Cầu – Đê La Thành, Phường Ô Chợ Dừa'
        : /Cát Linh/i.test(clean)
          ? 'Phố Cát Linh – Hào Nam, Phường Ô Chợ Dừa'
          : /Cầu Giấy/i.test(clean)
            ? 'Nút giao Cầu Giấy – Kim Mã, Phường Ngọc Hà'
            : isLine3
              ? 'Trục Cầu Giấy – Hồ Tùng Mậu – Nhổn, Hà Nội'
              : 'Trục đường Láng – Nguyễn Trãi – Quang Trung, Hà Nội';
    return { lineTag, lineName, address, district: districtOf(at) };
  },
  places: [
    // Khu vực Đống Đa
    { id: 'home', name: 'Ngã tư Thái Hà – Tây Sơn', group: 'Phường Đống Đa', at: [0, 0] },
    { id: 'go-dong-da', name: 'Gò Đống Đa – Tượng đài Quang Trung', group: 'Phường Đống Đa', at: [330, -220] },
    { id: 'vpbank-lang-ha', name: 'VPBank Tower & Rạp Chiếu phim Quốc gia (Láng Hạ)', group: 'Phường Láng', at: [223, -1206] },
    { id: 'vincom-nguyen-chi-thanh', name: 'Vincom – Vinhomes Nguyễn Chí Thanh (54A Nguyễn Chí Thanh)', group: 'Phường Láng', at: [679, -2117] },
    { id: 'vincom-pham-ngoc-thach', name: 'Vincom Phạm Ngọc Thạch – Chùa Bộc – Đền Kim Liên', group: 'Phường Kim Liên', at: [76, 861] },
    { id: 'van-mieu', name: 'Văn Miếu – Quốc Tử Giám (Khuê Văn Các)', group: 'Phường Văn Miếu – Quốc Tử Giám', at: [2480, 55] },
    { id: 'hanoi-centre', name: 'Hanoi Centre – Pullman (Nguyễn Thái Học – Cát Linh)', group: 'Phường Văn Miếu – Quốc Tử Giám', at: [2430, -520] },
    { id: 'hoang-cau', name: 'Hồ Hoàng Cầu – Ga Thái Hà – Đàn Xã Tắc', group: 'Phường Ô Chợ Dừa', at: [750, -520] },
    // Khu vực Ba Đình
    { id: 'lang-bac', name: 'Quảng trường Ba Đình – Lăng Chủ tịch Hồ Chí Minh', group: 'Phường Ba Đình', at: [3214, -466] },
    { id: 'chua-mot-cot-nha-san', name: 'Chùa Một Cột – Nhà sàn Bác Hồ – Bảo tàng Hồ Chí Minh', group: 'Phường Ba Đình', at: [3120, -560] },
    { id: 'nha-quoc-hoi', name: 'Nhà Quốc hội & Đài tưởng niệm Bắc Sơn', group: 'Phường Ba Đình', at: [3360, -180] },
    { id: 'hoang-thanh', name: 'Hoàng thành Thăng Long – Đoan Môn – Cột cờ Hà Nội', group: 'Phường Ba Đình', at: [3190, 175] },
    { id: 'lotte-lieu-giai', name: 'Lotte Center & Vinhomes Metropolis (Liễu Giai)', group: 'Phường Ngọc Hà', at: [1700, -2260] },
    { id: 'daewoo-kim-ma', name: 'Khách sạn Hà Nội Daewoo (360 Kim Mã – Hồ Thủ Lệ)', group: 'Phường Ngọc Hà', at: [1520, -2263] },
    { id: 'giang-vo', name: 'Hồ Giảng Võ – Hanoi Golden Lake – Hồ Thành Công', group: 'Phường Giảng Võ', at: [1680, -1240] },
    // Khu vực Hoàn Kiếm
    { id: 'ho-guom-thap-rua', name: 'Hồ Hoàn Kiếm (Hồ Gươm) – Tháp Rùa – Tượng đài Lý Thái Tổ', group: 'Phường Hoàn Kiếm', at: [3265, 1558] },
    { id: 'den-ngoc-son', name: 'Đền Ngọc Sơn – Cầu Thê Húc – Tháp Bút', group: 'Phường Hoàn Kiếm', at: [3481, 1516] },
    { id: 'nha-tho-lon', name: 'Nhà thờ Lớn Hà Nội (40 Nhà Chung)', group: 'Phường Hoàn Kiếm', at: [3107, 1254] },
    { id: 'nha-hat-lon', name: 'Nhà hát Lớn Hà Nội – Tràng Tiền Plaza – Bảo tàng Lịch sử', group: 'Phường Hoàn Kiếm', at: [3070, 2292] },
    { id: 'cho-dong-xuan', name: 'Chợ Đồng Xuân – Ô Quan Chưởng (Phố cổ Hà Nội)', group: 'Phường Hoàn Kiếm', at: [4005, 1105] },
    { id: 'hoa-lo-quan-su', name: 'Di tích Nhà tù Hỏa Lò & Chùa Quán Sứ', group: 'Phường Cửa Nam', at: [2550, 1160] },
    // Khu vực Tây Hồ
    { id: 'chua-tran-quoc', name: 'Chùa Trấn Quốc – Đền Quán Thánh – Đường Thanh Niên', group: 'Phường Tây Hồ', at: [4402, -838] },
    { id: 'phu-tay-ho', name: 'Phủ Tây Hồ – Hồ Tây – Chùa Kim Liên', group: 'Phường Tây Hồ', at: [4659, -2636] },
    // Khu vực Hai Bà Trưng
    { id: 'cong-vien-thong-nhat', name: 'Công viên Thống Nhất – Hồ Bảy Mẫu', group: 'Phường Hai Bà Trưng', at: [1483, 1583] },
    { id: 'vincom-ba-trieu', name: 'Vincom Center Bà Triệu – Tòa nhà Gelex', group: 'Phường Hai Bà Trưng', at: [1437, 2193] },
    { id: 'den-hai-ba-trung', name: 'Quần thể Di tích Đền – Chùa – Đình Hai Bà Trưng', group: 'Phường Hai Bà Trưng', at: [1933, 2954] },
    { id: 'dh-bach-khoa', name: 'Đại học Bách Khoa Hà Nội – Bạch Mai', group: 'Phường Bạch Mai', at: [497, 1979] },
    // Khu vực Thanh Xuân
    { id: 'royal-city', name: 'Vinhomes Royal City – Ngã Tư Sở (72A Nguyễn Trãi)', group: 'Phường Thanh Xuân', at: [-1093, -473] },
    { id: 'chua-phuc-khanh', name: 'Tổ đình Phúc Khánh – Đình Khương Hạ', group: 'Phường Khương Đình', at: [-714, -202] },
    { id: 'nut-giao-thanh-xuan', name: 'Nút giao Thanh Xuân – Nguyễn Trãi – Khuất Duy Tiến', group: 'Phường Thanh Xuân', at: [-2450, -950] },
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
        name: 'Hà Thành Plaza (102 Thái Thịnh)', kind: 'commercial', isSignatureLandmark: true,
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
        name: 'PeakView Tower (36 Hoàng Cầu)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
        floors: [...rep(4.2, 4), ...rep(3.4, 17)],
      },
      // Tân Hoàng Minh D'. Le Pont D'or 36 Hoàng Cầu (23 storeys luxury apartment)
      'osm:way/839881661': {
        name: "D'. Le Pont D'or (36 Hoàng Cầu)", kind: 'apartment', isSignatureLandmark: true,
        description: "Tổ hợp căn hộ cao cấp Tân Hoàng Minh D'. Le Pont D'or cao 23 tầng bên công viên và hồ Hoàng Cầu.",
        floors: [...rep(4.2, 4), ...rep(3.2, 19)],
      },
      // Vincom Center Phạm Ngọc Thạch (2 Phạm Ngọc Thạch): 8 storeys curved glass retail mall at the Chùa Bộc – Phạm Ngọc Thạch – Tôn Thất Tùng – Đông Tác crossroads
      'osm:way/136161117': {
        name: 'Vincom Center Phạm Ngọc Thạch (2 Phạm Ngọc Thạch)', kind: 'commercial', model: 'vincom-pnt', facade: 'glass', isSignatureLandmark: true,
        description: 'Trung tâm thương mại Vincom Center Phạm Ngọc Thạch cao 8 tầng với mặt dựng kính cong hiện đại và sảnh thông tầng tại ngã tư Chùa Bộc – Phạm Ngọc Thạch – Tôn Thất Tùng.',
        floors: [...rep(4.8, 3), ...rep(4.5, 5)],
      },
      // T&T Capella 2 Phạm Ngọc Thạch (24 storeys commercial & luxury apartment)
      'osm:way/1184245771': {
        name: 'T&T Capella (2 Phạm Ngọc Thạch)', kind: 'apartment', facade: 'glass', isSignatureLandmark: true,
        description: 'Tổ hợp thương mại và căn hộ cao cấp T&T Capella cao 24 tầng trên phố Phạm Ngọc Thạch.',
        floors: [...rep(4.2, 5), ...rep(3.2, 19)],
      },
      // Eurowindow Multi-Complex 2 Tôn Thất Tùng (17 storeys glass office tower)
      'osm:way/840439592': {
        name: 'Eurowindow Office Building (2 Tôn Thất Tùng)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa tháp văn phòng hạng A Eurowindow cao 17 tầng với hệ mặt dựng kính hộp tại ngã tư Tôn Thất Tùng – Chùa Bộc – Phạm Ngọc Thạch.',
        floors: [...rep(4.2, 3), ...rep(3.4, 14)],
      },
      // CONINCO Tower 4 Tôn Thất Tùng (19 storeys glass office tower)
      'osm:way/840439593': {
        name: 'CONINCO Tower (4 Tôn Thất Tùng)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
        description: 'Trụ sở Tổng công ty Tư vấn Xây dựng Việt Nam (CONINCO Tower) cao 19 tầng tại số 4 Tôn Thất Tùng.',
        floors: [...rep(4.2, 4), ...rep(3.5, 15)],
      },
      // Vincom Center – Vinhomes – ROX Tower Nguyễn Chí Thanh (54A Nguyễn Chí Thanh): 6-storey Vincom mall podium + twin 30-storey towers
      'osm:way/570572191': {
        name: 'Vincom – Vinhomes Nguyễn Chí Thanh (54A Nguyễn Chí Thanh)', kind: 'commercial', model: 'vincom-nct', isSignatureLandmark: true,
        description: 'Tổ hợp Trung tâm thương mại Vincom Center Nguyễn Chí Thanh (6 tầng khối đế), tháp văn phòng hạng A ROX Tower (TNR Tower) và tháp căn hộ Vinhomes Nguyễn Chí Thanh cao 30 tầng tại số 54A Nguyễn Chí Thanh.',
        parts: {
          'osm:way/1231417560': { floors: rep(4.6, 6), facade: 'glass' },
          'osm:way/840562573': { floors: [...rep(4.6, 6), ...rep(3.5, 24)], facade: 'glass' },
          'osm:way/840562572': { floors: [...rep(4.6, 6), ...rep(3.3, 24)] },
        },
      },
      // Hanoi Centre & Hyatt Centric Hanoi Centre (175 Nguyễn Thái Học): 9-storey twin commercial plaza + international hotel wing
      'osm:way/1305255008': {
        name: 'Hanoi Centre – Hyatt Centric (175 Nguyễn Thái Học)', kind: 'commercial', model: 'hanoi-centre', facade: 'glass', isSignatureLandmark: true,
        description: 'Tổ hợp thương mại – văn phòng – khách sạn quốc tế Hanoi Centre & Hyatt Centric Hanoi Centre (Tien Phong Plaza) cao 9 tầng tại số 175 Nguyễn Thái Học.',
        parts: {
          'osm:way/1305255008': { floors: [...rep(4.6, 3), ...rep(3.8, 6)], facade: 'glass' },
          'osm:way/1305255007': { floors: [...rep(4.6, 3), ...rep(3.8, 6)], facade: 'glass' },
          'osm:way/1305255009': { floors: [...rep(4.6, 2), ...rep(3.6, 7)], facade: 'glass' },
        },
      },
      // Khách sạn Pullman Hanoi (40 Cát Linh – Giảng Võ): 14-storey 5-star international hotel
      'osm:way/200543135': {
        name: 'Khách sạn Pullman Hanoi (40 Cát Linh)', kind: 'hotel', model: 'pullman-hanoi', facade: 'glass', isSignatureLandmark: true,
        description: 'Khách sạn 5 sao quốc tế Pullman Hanoi cao 14 tầng tại ngã tư Cát Linh – Giảng Võ – Hào Nam (đối diện Ga Cát Linh).',
        floors: [...rep(4.5, 3), ...rep(3.4, 11)],
      },
      // Grand Terra 36 Cát Linh (tổ hợp thương mại – văn phòng hạng A 8 tầng mặt dựng kính bậc thang)
      'osm:way/1197730144': {
        name: 'Grand Terra (36 Cát Linh)', kind: 'commercial', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa nhà thương mại và văn phòng hạng A Grand Terra tại số 36 Cát Linh với thiết kế mặt dựng kính giật cấp lấy cảm hứng từ ruộng bậc thang.',
        floors: rep(4.4, 8),
      },
      // Khách sạn Grand Mercure Hanoi (9 Cát Linh – Quốc Tử Giám): 12-storey 5-star hotel opposite Văn Miếu
      'osm:way/1197730154': {
        name: 'Khách sạn Grand Mercure Hanoi (9 Cát Linh)', kind: 'hotel', facade: 'glass', isSignatureLandmark: true,
        description: 'Khách sạn 5 sao Grand Mercure Hanoi tại số 9 Cát Linh (gần Văn Miếu – Quốc Tử Giám) với kiến trúc giao thoa đương đại và truyền thống.',
        floors: [...rep(4.5, 2), ...rep(3.5, 10)],
      },

      // ---------- Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám ----------
      // Khuê Văn Các (biểu tượng của Thủ đô Hà Nội và nền văn hiến Việt Nam tại Văn Miếu – Quốc Tử Giám)
      'osm:way/702185155': {
        name: 'Khuê Văn Các (Văn Miếu – Quốc Tử Giám)', kind: 'other', model: 'khue-van-cac', isSignatureLandmark: true,
        description: 'Khuê Văn Các – biểu tượng của Thủ đô Hà Nội được xây dựng năm 1805 trong Văn Miếu – Quốc Tử Giám với kiến trúc lầu vuông 8 mái chồng diêm trên 4 trụ gạch và cửa sổ tròn hình sao Khuê tỏa sáng bên Giếng Thiên Quang cùng 82 Bia Tiến Sĩ.',
        floors: [3.6, 4.2],
      },
      // Văn Miếu Môn (cổng tam quan chính vào Văn Miếu – Quốc Tử Giám)
      'osm:way/702185143': {
        name: 'Văn Miếu Môn (Cổng Văn Miếu – Quốc Tử Giám)', kind: 'other', model: 'van-mieu-mon', isSignatureLandmark: true,
        description: 'Văn Miếu Môn – cổng Tam quan 2 tầng 8 mái đao cong cổ kính dẫn vào Quần thể Di tích Quốc gia đặc biệt Văn Miếu – Quốc Tử Giám cùng Tứ trụ và bia Hạ Mã.',
        floors: [3.8, 3.4],
      },
      // Đại Trung Môn (cổng thứ hai của Văn Miếu dẫn vào khu Khuê Văn Các)
      'osm:way/702185144': {
        name: 'Đại Trung Môn (Văn Miếu)', kind: 'other', model: 'van-mieu-gate',
        description: 'Đại Trung Môn – cổng 3 gian mái ngói mũi hài cổ kính mở vào không gian Nhập Đạo và Khuê Văn Các trong Văn Miếu.',
        floors: [4.6],
      },
      // Đại Thành Môn (cổng dẫn vào khu Điện Đại Thành)
      'osm:way/702185176': {
        name: 'Đại Thành Môn (Văn Miếu)', kind: 'other', model: 'van-mieu-gate',
        description: 'Đại Thành Môn – cổng 3 gian dẫn qua sân Bái Đường vào khu trung tâm thờ tự của Văn Miếu.',
        floors: [4.8],
      },
      // Điện Đại Thành – Đại Bái Đường & Thượng Điện (khu thờ tự chính của Văn Miếu)
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
      // Nhà Thái Học – Đền Khải Thánh, Lầu Trống & Lầu Chuông (khu Quốc Tử Giám)
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
      // Lotte Center Hanoi (54 Liễu Giai, Ba Đình): 65 storeys iconic glass skyscraper (272 m) + 6-storey podium
      'osm:way/727570329': {
        name: 'Lotte Center Hanoi (54 Liễu Giai)', kind: 'commercial', model: 'lotte-center', isSignatureLandmark: true,
        description: 'Tòa tháp biểu tượng Lotte Center Hanoi cao 65 tầng (272 m) tại ngã tư Liễu Giai – Đào Tấn (Ba Đình), lấy cảm hứng từ tà áo dài Việt Nam với đài quan sát Sky Walk ở tầng 65.',
        parts: {
          'osm:way/727570330': { floors: [...rep(4.5, 6), ...rep(4.1, 59)], facade: 'glass' },
          'osm:way/1195985607': { floors: rep(5.5, 6), facade: 'glass' },
          'osm:way/1195985608': { floors: rep(5.5, 6), facade: 'glass' },
        },
      },
      // Vinhomes Metropolis (29 Liễu Giai, Ba Đình): 3 tháp M1 (41F), M2 (45F), M3 (45F) + khối đế Vincom Center Liễu Giai
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
      // Capital Place (29 Liễu Giai, Ba Đình): 2 tháp văn phòng hạng A 37 tầng mặt dựng kính vẩy rồng uốn lượn
      'osm:way/840982447': {
        name: 'Capital Place (29 Liễu Giai)', kind: 'office', model: 'capital-place', isSignatureLandmark: true,
        description: 'Tổ hợp 2 tòa tháp đôi văn phòng hạng A quốc tế Capital Place cao 37 tầng tại số 29 Liễu Giai với mặt dựng kính uốn lượn hình rồng bay trên khối đế thương mại 5 tầng.',
        parts: {
          'osm:way/840982448': { floors: [...rep(4.5, 5), ...rep(3.7, 32)], facade: 'glass' },
          'osm:way/840982449': { floors: [...rep(4.5, 5), ...rep(3.7, 32)], facade: 'glass' },
          'osm:way/1195985613': { floors: rep(4.5, 5), facade: 'glass' },
        },
      },
      // Khách sạn Hà Nội Daewoo & Daeha Business Center (360 Kim Mã, Ba Đình): 18F hotel + 15F office + 13F serviced apt
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
      // Dolce by Wyndham Hanoi Golden Lake (B7 Giảng Võ): 25-storey gold-plated 5-star hotel overlooking Giảng Võ Lake
      'osm:way/874492978': {
        name: 'Dolce by Wyndham Hanoi Golden Lake (B7 Giảng Võ)', kind: 'hotel', isSignatureLandmark: true,
        description: 'Khách sạn 5 sao dát vàng Dolce by Wyndham Hanoi Golden Lake cao 25 tầng bên bờ hồ Giảng Võ, quận Ba Đình.',
        floors: [...rep(4.5, 4), ...rep(3.4, 21)],
      },
      // Khách sạn Hà Nội – Hanoi Hotel (D8 Giảng Võ): 19-storey lakeside international hotel
      'osm:way/727580943': {
        name: 'Khách sạn Hà Nội – Hanoi Hotel (D8 Giảng Võ)', kind: 'hotel', isSignatureLandmark: true,
        description: 'Khách sạn quốc tế Hanoi Hotel cao 19 tầng tọa lạc ngay bên bờ hồ Giảng Võ, quận Ba Đình.',
        floors: [...rep(4.2, 3), ...rep(3.3, 16)],
      },
      // Khách sạn Fortuna Hanoi (6B Láng Hạ): 17-storey 4-star hotel
      'osm:way/199299464': {
        name: 'Khách sạn Fortuna Hanoi (6B Láng Hạ)', kind: 'hotel', isSignatureLandmark: true,
        description: 'Khách sạn quốc tế Fortuna Hanoi cao 17 tầng trên phố Láng Hạ, quận Ba Đình.',
        floors: [...rep(4.5, 3), ...rep(3.4, 14)],
      },
      // The Lancaster Hà Nội (20 Núi Trúc): 27-storey luxury serviced apartment & office tower
      'osm:way/862423870': {
        name: 'The Lancaster Hà Nội (20 Núi Trúc)', kind: 'apartment', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa tháp căn hộ dịch vụ và văn phòng cao cấp The Lancaster Hà Nội cao 27 tầng tại số 20 Núi Trúc, quận Ba Đình.',
        floors: [...rep(4.2, 4), ...rep(3.3, 23)],
      },
      // Lăng Chủ tịch Hồ Chí Minh (2 Hùng Vương, Quảng trường Ba Đình)
      'osm:way/37625751': {
        name: 'Lăng Chủ tịch Hồ Chí Minh', kind: 'other', model: 'ho-chi-minh-mausoleum', isSignatureLandmark: true,
        description: 'Lăng Chủ tịch Hồ Chí Minh tại trung tâm Quảng trường Ba Đình lịch sử – công trình kiến trúc đá hoa cương uy nghiêm gồm khối đế tam cấp, hàng cột vuông bốn mặt và mái tam cấp cùng lễ đài hai bên.',
      },
      // Nhà sàn Bác Hồ (Khu Di tích Chủ tịch Hồ Chí Minh tại Phủ Chủ tịch)
      'osm:way/207178342': {
        name: 'Nhà sàn Bác Hồ (Khu Di tích Phủ Chủ tịch)', kind: 'other', model: 'nha-san-bac-ho', isSignatureLandmark: true,
        description: 'Di tích lịch sử đặc biệt Nhà sàn Bác Hồ bên Ao cá và vườn cây trong Khu Di tích Phủ Chủ tịch – ngôi nhà sàn gỗ 2 tầng giản dị nơi Bác Hồ sống và làm việc từ tháng 5/1958 đến năm 1969.',
        floors: [2.8, 3.0],
      },
      // Chùa Một Cột – Diên Hựu Tự (Phố Chùa Một Cột, Ba Đình)
      'osm:way/697326496': {
        name: 'Chùa Một Cột (Diên Hựu Tự)', kind: 'other', model: 'one-pillar-pagoda', isSignatureLandmark: true,
        description: 'Chùa Một Cột (Diên Hựu Tự – Liên Hoa Đài) khởi dựng năm 1049 thời vua Lý Thái Tông với kiến trúc đài hoa sen gỗ vuông có mái đao cong vươn lên trên một cột đá tròn giữa hồ Linh Chiểu.',
        floors: [4.0, 3.2],
      },
      // Phủ Chủ Tịch (2 Hùng Vương, Ba Đình)
      'osm:way/37629570': {
        name: 'Phủ Chủ Tịch (2 Hùng Vương)', kind: 'office', model: 'presidential-palace', isSignatureLandmark: true,
        description: 'Phủ Chủ tịch Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam – công trình kiến trúc cổ điển Pháp uy nghi với hành lang vòm, hai tháp góc và bậc tam cấp đại sảnh trong khuôn viên Khu Di tích Phủ Chủ tịch.',
        floors: [4.8, 4.6, 4.4, 3.8],
      },
      // Bảo tàng Hồ Chí Minh (19 Ngọc Hà, Ba Đình)
      'osm:way/37629143': {
        name: 'Bảo tàng Hồ Chí Minh (19 Ngọc Hà)', kind: 'other', model: 'ho-chi-minh-museum', isSignatureLandmark: true,
        description: 'Bảo tàng Hồ Chí Minh khánh thành ngày 19/5/1990 với kiến trúc hình bông sen trắng thanh thoát cao gần 20 m nằm trong quần thể Lăng Bác và Chùa Một Cột.',
      },
      // Nhà Quốc hội Việt Nam (1 Độc Lập, Quảng trường Ba Đình)
      'osm:way/695966191': {
        name: 'Nhà Quốc hội Việt Nam (Quảng trường Ba Đình)', kind: 'office', model: 'national-assembly', facade: 'glass', isSignatureLandmark: true,
        description: 'Tòa nhà Quốc hội Việt Nam bên Quảng trường Ba Đình và Hoàng thành Thăng Long, kiến trúc hiện đại cao 39 m biểu trưng cho hình tượng Trời tròn (mái vòm phòng họp Diên Hồng ở trung tâm) – Đất vuông (khối đế vuông vức).',
      },
      // Đài tưởng niệm các Anh hùng liệt sĩ Bắc Sơn (Đường Bắc Sơn – Quảng trường Ba Đình)
      'osm:relation/17877970': {
        name: 'Đài tưởng niệm các Anh hùng liệt sĩ Bắc Sơn', kind: 'other', model: 'bac-son-memorial', isSignatureLandmark: true,
        description: 'Đài tưởng niệm các Anh hùng liệt sĩ trên đường Bắc Sơn (đối diện Lăng Chủ tịch Hồ Chí Minh), kiến trúc khối lập phương 4 cửa vòm thoáng mở như ngôi đền thiêng tưởng nhớ các anh hùng liệt sĩ vì Tổ quốc.',
        floors: [3.2, 6.2, 3.2],
      },
      // Trụ sở Bộ Ngoại giao (1 Tôn Thất Đàm, Ba Đình)
      'osm:way/697572004': {
        name: 'Trụ sở Bộ Ngoại giao (1 Tôn Thất Đàm)', kind: 'office', isSignatureLandmark: true,
        description: 'Tòa nhà lịch sử của Bộ Ngoại giao Việt Nam tại số 1 Tôn Thất Đàm – công trình kiến trúc Đông Dương đặc sắc đối diện Đài tưởng niệm Bắc Sơn và Quảng trường Ba Đình.',
        floors: [4.8, 4.5, 4.2],
      },
      // Cột cờ Hà Nội (28A Điện Biên Phủ, Ba Đình)
      'osm:way/184959290': {
        name: 'Cột cờ Hà Nội (Kỳ đài)', kind: 'other', model: 'hanoi-flag-tower', isSignatureLandmark: true,
        description: 'Cột cờ Hà Nội (Kỳ đài) xây dựng năm 1812 trên đường Điện Biên Phủ gồm 3 tầng đế chóp vuông cụt ốp gạch, thân cột bát giác thuôn dần và vọng lâu 8 cửa trên đỉnh nâng cao lá cờ Tổ quốc.',
      },
      // Đoan Môn – Hoàng thành Thăng Long (19C Hoàng Diệu, Ba Đình)
      'osm:way/696389268': {
        name: 'Hoàng thành Thăng Long – Đoan Môn', kind: 'other', model: 'doan-mon', isSignatureLandmark: true,
        description: 'Đoan Môn – cổng chính phía Nam dẫn vào Cấm thành Thăng Long (Di sản Văn hóa Thế giới UNESCO) với tường thành đá – gạch vồ 5 cổng vòm cuốn và lầu Ngũ Môn 2 tầng 8 mái đao cong phía trên.',
      },
      // Hậu Lâu (Tĩnh Bắc Lâu – Hoàng thành Thăng Long)
      'osm:way/185531692': {
        name: 'Hậu Lâu (Tĩnh Bắc Lâu – Hoàng thành Thăng Long)', kind: 'other', isSignatureLandmark: true,
        description: 'Hậu Lâu (Tĩnh Bắc Lâu) phía sau nền Điện Kính Thiên trong khu di sản Hoàng thành Thăng Long, mang kiến trúc giao thoa Á – Âu độc đáo.',
        floors: [4.2, 4.0, 3.4],
      },
      // ── Phường Hoàn Kiếm & Phường Cửa Nam ──
      // Tháp Rùa – Hồ Hoàn Kiếm
      'osm:way/178995269': {
        name: 'Tháp Rùa (Hồ Hoàn Kiếm)', kind: 'other', model: 'thap-rua', isSignatureLandmark: true,
        description: 'Tháp Rùa cổ kính xây dựng năm 1886 trên gò Rùa giữa lòng Hồ Hoàn Kiếm – biểu tượng lịch sử văn hóa gắn liền với truyền thuyết Vua Lê Thái Tổ hoàn gươm báu Thuận Thiên.',
        floors: [3.2, 2.8, 2.6],
      },
      // Đền Ngọc Sơn – Hồ Hoàn Kiếm
      'osm:way/178995262': {
        name: 'Đền Ngọc Sơn (Đảo Ngọc – Hồ Hoàn Kiếm)', kind: 'other', model: 'den-ngoc-son', isSignatureLandmark: true,
        description: 'Di tích Quốc gia đặc biệt Đền Ngọc Sơn trên đảo Ngọc giữa Hồ Hoàn Kiếm, nối với bờ Đông qua cầu Thê Húc sơn son, Tháp Bút ("Tả Thanh Thiên"), Đài Nghiên và Trấn Ba Đình.',
        floors: [4.6, 3.2],
      },
      // Nhà hát Lớn Hà Nội (1 Tràng Tiền)
      'osm:way/37933050': {
        name: 'Nhà hát Lớn Hà Nội (1 Tràng Tiền)', kind: 'other', model: 'hanoi-opera-house', isSignatureLandmark: true,
        description: 'Nhà hát Lớn Hà Nội tại Quảng trường Cách mạng Tháng Tám (khởi công năm 1901, hoàn thành năm 1911) – kiệt tác kiến trúc Tân cổ điển Pháp với hàng cột thức Corinth, mái vòm đá phiến và sảnh gương tráng lệ.',
        floors: [6.0, 5.5, 5.5, 5.0],
      },
      // Nhà thờ Lớn Hà Nội (40 Nhà Chung)
      'osm:way/28912942': {
        name: 'Nhà thờ Lớn Hà Nội (40 Nhà Chung)', kind: 'other', model: 'st-joseph-cathedral', isSignatureLandmark: true,
        description: 'Nhà thờ Chính tòa Thánh Giuse (Nhà thờ Lớn Hà Nội) khánh thành năm 1886 với kiến trúc Tân Gothic uy nghiêm, hai tháp chuông cao 31,5 m và cửa sổ hoa hồng trung tâm.',
        floors: [14.5],
      },
      // Tràng Tiền Plaza (24 Hai Bà Trưng)
      'osm:relation/21381215': {
        name: 'Tràng Tiền Plaza (24 Hai Bà Trưng)', kind: 'commercial', model: 'trang-tien-plaza', isSignatureLandmark: true,
        description: 'Trung tâm thương mại Tràng Tiền Plaza (khởi nguyên là Bách hóa Tổng hợp Hà Nội / Grands Magasins Réunis từ năm 1901) tại góc phố Tràng Tiền – Hàng Bài bên bờ Hồ Gươm, nổi bật với kiến trúc Pháp cổ điển kem – vàng và mái Mansard.',
        floors: [4.8, 4.2, 4.0, 3.8, 3.6, 3.6],
      },
      // Ô Quan Chưởng (Đông Hà Môn)
      'osm:way/700627452': {
        name: 'Ô Quan Chưởng (Đông Hà Môn)', kind: 'other', model: 'o-quan-chuong', isSignatureLandmark: true,
        description: 'Ô Quan Chưởng (Đông Hà Môn, xây dựng năm 1749, trùng tu năm 1817) – cửa ô duy nhất còn nguyên vẹn của kinh thành Thăng Long xưa với cổng vòm tam quan bằng gạch vồ và vọng lâu 2 tầng trên đỉnh.',
        floors: [4.4, 3.6],
      },
      // Chợ Đồng Xuân
      'osm:way/1255852379': {
        name: 'Chợ Đồng Xuân', kind: 'commercial', model: 'cho-dong-xuan', isSignatureLandmark: true,
        description: 'Chợ Đồng Xuân lịch sử (hình thành từ năm 1889) ở khu Phố cổ Hà Nội với mặt tiền 5 nhịp đầu hồi tam giác cổ điển đặc trưng.',
        floors: [5.0, 4.5, 4.2],
      },
      // Di tích Nhà tù Hỏa Lò (1 Hỏa Lò)
      'osm:way/340128580': {
        name: 'Di tích lịch sử Nhà tù Hỏa Lò (1 Hỏa Lò)', kind: 'other', model: 'hoa-lo-prison', isSignatureLandmark: true,
        description: 'Di tích lịch sử Nhà tù Hỏa Lò – minh chứng lịch sử về tinh thần kiên cường bất khuất của các chiến sĩ cách mạng yêu nước Việt Nam.',
        floors: [4.2, 3.8],
      },
      // Bưu điện Hà Nội (75 Đinh Tiên Hoàng)
      'osm:way/704153620': {
        name: 'Bưu điện Hà Nội (75 Đinh Tiên Hoàng)', kind: 'office', isSignatureLandmark: true,
        description: 'Tòa nhà Bưu điện Hà Nội với tháp đồng hồ lớn nhìn thẳng ra Hồ Hoàn Kiếm – biểu tượng gắn liền với lịch sử Thủ đô.',
        floors: [4.8, 4.2, 4.0, 3.8, 3.8],
      },
      // Nhà hát Hồ Gươm (40 Hàng Bài)
      'osm:way/1189686007': {
        name: 'Nhà hát Hồ Gươm (40 Hàng Bài)', kind: 'other', isSignatureLandmark: true,
        description: 'Nhà hát Hồ Gươm tại số 40 Hàng Bài với hàng cột đá cổ điển châu Âu bề thế và công nghệ âm thanh biểu diễn hiện đại bậc nhất.',
        floors: [5.5, 5.0, 4.5, 4.5],
      },
      // Bảo tàng Lịch sử Quốc gia Việt Nam (1 Tràng Tiền)
      'osm:way/37933255': {
        name: 'Bảo tàng Lịch sử Quốc gia (1 Tràng Tiền)', kind: 'other', model: 'national-history-museum', isSignatureLandmark: true,
        description: 'Bảo tàng Lịch sử Quốc gia Việt Nam (khánh thành năm 1932, do KTS Ernest Hébrard thiết kế) – kiệt tác tiêu biểu của phong cách kiến trúc Đông Dương (Indochine) với tháp bát giác chồng diêm.',
        floors: [5.0, 4.5, 4.0],
      },
      // Chùa Quán Sứ (73 Quán Sứ)
      'osm:way/704134590': {
        name: 'Chùa Quán Sứ (73 Quán Sứ)', kind: 'other', model: 'chua-quan-su', isSignatureLandmark: true,
        description: 'Chùa Quán Sứ (khởi dựng từ thế kỷ XV thời Hậu Lê) tại số 73 Quán Sứ – trụ sở Trung ương Giáo hội Phật giáo Việt Nam với tam quan lầu chuông và chính điện uy nghiêm.',
        floors: [4.8, 4.2],
      },
      // ── Phường Tây Hồ ──
      // Bảo tháp Lục độ đài sen – Chùa Trấn Quốc
      'osm:way/1218673074': {
        name: 'Bảo tháp Lục độ đài sen – Chùa Trấn Quốc', kind: 'other', model: 'chua-tran-quoc', isSignatureLandmark: true,
        description: 'Bảo tháp Lục độ đài sen 11 tầng cao 15 m tại Chùa Trấn Quốc bên bờ Hồ Tây, trên đỉnh tháp có Cửu phẩm liên hoa bằng đá quý.',
        floors: [15.0],
      },
      // Chùa Trấn Quốc (Đường Thanh Niên, Tây Hồ)
      'osm:way/1230498818': {
        name: 'Chùa Trấn Quốc (Đường Thanh Niên – Hồ Tây)', kind: 'other', model: 'chua-tran-quoc', isSignatureLandmark: true,
        description: 'Chùa Trấn Quốc (Khai Quốc Tự) có lịch sử gần 1.500 năm từ thời Lý Nam Đế (năm 541) – ngôi cổ tự lâu đời nhất Thăng Long – Hà Nội nằm trên đảo Kim Ngư giữa Hồ Tây.',
        floors: [4.6, 3.8],
      },
      // Đền Quán Thánh – Trấn Vũ Quán (Đường Thanh Niên)
      'osm:way/207178320': {
        name: 'Đền Quán Thánh (Trấn Vũ Quán)', kind: 'other', model: 'den-quan-thanh', isSignatureLandmark: true,
        description: 'Đền Quán Thánh (Trấn Vũ Quán – Trấn Bắc trong Thăng Long Tứ Trấn) thờ Huyền Thiên Trấn Vũ tại ngã tư đường Thanh Niên – Quán Thánh, nổi tiếng với pho tượng đồng đen Huyền Thiên Trấn Vũ đúc năm 1677.',
        floors: [4.8, 3.6],
      },
      // Phủ Tây Hồ (52 Đặng Thai Mai, Quảng An, Tây Hồ)
      'osm:way/1232838152': {
        name: 'Phủ Tây Hồ (Bán đảo Quảng An)', kind: 'other', model: 'phu-tay-ho', isSignatureLandmark: true,
        description: 'Phủ Tây Hồ trên bán đảo Quảng An vươn ra giữa lòng Hồ Tây – chốn linh thiêng bậc nhất Hà Thành thờ Thánh Mẫu Liễu Hạnh (một trong Tứ Bất Tử của tín ngưỡng dân gian Việt Nam).',
        floors: [4.6, 3.6],
      },
      // ── Phường Hai Bà Trưng & Phường Bạch Mai ──
      // Đền Hai Bà Trưng – Tổ đình Đồng Nhân (12 Hương Viên)
      'osm:relation/19179452': {
        name: 'Cụm di tích Đền Hai Bà Trưng (Hồ Đồng Nhân)', kind: 'other', model: 'den-hai-ba-trung', isSignatureLandmark: true,
        description: 'Di tích Quốc gia đặc biệt Đền – Chùa – Đình Hai Bà Trưng bên bờ hồ Đồng Nhân, tưởng niệm nhị vị Anh hùng dân tộc Trưng Trắc và Trưng Nhị.',
        floors: [4.8, 3.6],
      },
      // Vincom Center Bà Triệu (191 Bà Triệu)
      'osm:way/251584916': {
        name: 'Vincom Center Bà Triệu (191 Bà Triệu)', kind: 'commercial', model: 'vincom-ba-trieu', facade: 'glass', isSignatureLandmark: true,
        description: 'Tổ hợp tháp đôi thương mại – văn phòng Vincom Center Bà Triệu (191 Bà Triệu) cao 21 tầng – trung tâm thương mại hiện đại đầu tiên của Thủ đô Hà Nội.',
        floors: [...rep(4.5, 5), ...rep(3.5, 16)],
      },
      // Tòa nhà Gelex (52 Lê Đại Hành)
      'osm:way/839886261': {
        name: 'Tòa nhà Gelex Tower (52 Lê Đại Hành)', kind: 'office', facade: 'glass', isSignatureLandmark: true,
        description: 'Cao ốc văn phòng hạng A Gelex Tower cao 22 tầng tại ngã tư Lê Đại Hành – Đoàn Trần Nghiệp đối diện Công viên Thống Nhất.',
        floors: [...rep(4.5, 3), ...rep(3.6, 19)],
      },
      // ── Phường Thanh Xuân & Phường Khương Đình ──
      // Vinhomes Royal City (72A Nguyễn Trãi) – 6 tòa R1..R6
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
      // Tổ đình Phúc Khánh (382 Tây Sơn – Ngã Tư Sở)
      'osm:way/1114989167': {
        name: 'Tổ đình Phúc Khánh (Chùa Sở – Ngã Tư Sở)', kind: 'other', model: 'chua-phuc-khanh', isSignatureLandmark: true,
        description: 'Tổ đình Phúc Khánh (Chùa Sở) – ngôi cổ tự danh tiếng từ thời Hậu Lê ngay cạnh cầu vượt Ngã Tư Sở, nơi hàng vạn Phật tử hội tụ cầu bình an mỗi dịp đầu xuân.',
        floors: [4.6, 3.6],
      },
      // Đình Khương Hạ (Phường Khương Đình)
      'osm:way/1316649460': {
        name: 'Đình Khương Hạ (Di tích lịch sử – kiến trúc nghệ thuật)', kind: 'other', model: 'traditional-temple', isSignatureLandmark: true,
        description: 'Cụm di tích Đình – Chùa Khương Hạ cổ kính bên sông Tô Lịch thuộc Phường Khương Đình.',
        floors: [4.5],
      },
    },
  },
};
