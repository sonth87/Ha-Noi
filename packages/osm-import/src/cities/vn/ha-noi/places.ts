/* Quick-navigation places across Hanoi's 12 urban districts (vn/ha-noi, ADR-054, ADR-055). Pure. */
import type { CityPlace } from '@my-city/core';

export const HA_NOI_PLACES: CityPlace[] = [
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
  { id: 'cau-nhat-tan', name: 'Cầu Nhật Tân – Đình Phú Gia (Phú Thượng)', group: 'Phường Phú Thượng', at: [5950, -6850] },
  // Khu vực Hai Bà Trưng
  { id: 'cong-vien-thong-nhat', name: 'Công viên Thống Nhất – Hồ Bảy Mẫu', group: 'Phường Hai Bà Trưng', at: [1483, 1583] },
  { id: 'vincom-ba-trieu', name: 'Vincom Center Bà Triệu – Tòa nhà Gelex', group: 'Phường Hai Bà Trưng', at: [1437, 2193] },
  { id: 'den-hai-ba-trung', name: 'Quần thể Di tích Đền – Chùa – Đình Hai Bà Trưng', group: 'Phường Hai Bà Trưng', at: [1933, 2954] },
  { id: 'dh-bach-khoa', name: 'Đại học Bách Khoa Hà Nội – Bạch Mai', group: 'Phường Bạch Mai', at: [497, 1979] },
  // Khu vực Thanh Xuân
  { id: 'royal-city', name: 'Vinhomes Royal City – Ngã Tư Sở (72A Nguyễn Trãi)', group: 'Phường Thanh Xuân', at: [-1093, -473] },
  { id: 'chua-phuc-khanh', name: 'Tổ đình Phúc Khánh – Đình Khương Hạ', group: 'Phường Khương Đình', at: [-714, -202] },
  { id: 'nut-giao-thanh-xuan', name: 'Nút giao Thanh Xuân – Nguyễn Trãi – Khuất Duy Tiến', group: 'Phường Thanh Xuân', at: [-2450, -950] },
  // Khu vực Cầu Giấy
  { id: 'keangnam-landmark72', name: 'Keangnam Hanoi Landmark Tower (72 tầng – Phạm Hùng)', group: 'Phường Yên Hòa', at: [-1480, -2950] },
  { id: 'bao-tang-dan-toc-hoc', name: 'Bảo tàng Dân tộc học Việt Nam & Công viên Nghĩa Đô', group: 'Phường Nghĩa Đô', at: [2180, -4080] },
  { id: 'cong-vien-cau-giay', name: 'Công viên Cầu Giấy – Chùa Hà – Discovery Complex', group: 'Phường Cầu Giấy', at: [620, -3520] },
  // Khu vực Nam Từ Liêm
  { id: 'svd-my-dinh', name: 'Sân vận động Quốc gia Mỹ Đình (Lê Đức Thọ)', group: 'Phường Từ Liêm', at: [-1580, -5620] },
  { id: 'bao-tang-ha-noi', name: 'Bảo tàng Hà Nội & Trung tâm Hội nghị Quốc gia', group: 'Phường Đại Mỗ', at: [-2120, -2720] },
  { id: 'vinhomes-smart-city', name: 'Khu đô thị & Công viên Trung tâm Tây Mỗ', group: 'Phường Tây Mỗ', at: [-3900, -5950] },
  // Khu vực Bắc Từ Liêm
  { id: 'cong-vien-hoa-binh', name: 'Công viên Hòa Bình & Tượng đài Hòa Bình', group: 'Phường Xuân Đỉnh', at: [2650, -6480] },
  { id: 'dinh-dong-ngac', name: 'Đình cổ Đông Ngạc (Đình Vẽ) & Học viện Tài chính', group: 'Phường Đông Ngạc', at: [4120, -9150] },
  // Khu vực Hà Đông
  { id: 'lang-lua-van-phuc', name: 'Làng lụa Vạn Phúc & Hồ Văn Quán (Hà Đông)', group: 'Phường Hà Đông', at: [-4850, -1420] },
  { id: 'cong-vien-thien-van-hoc', name: 'Công viên Thiên văn học Dương Nội & Chùa Bia Bà', group: 'Phường Dương Nội', at: [-5950, -3750] },
  // Khu vực Hoàng Mai
  { id: 'times-city', name: 'Vinhomes Times City – Quảng trường Nhạc nước', group: 'Phường Vĩnh Hưng', at: [2180, 4420] },
  { id: 'ho-linh-dam', name: 'Bán đảo & Hồ Linh Đàm (Hoàng Liệt)', group: 'Phường Hoàng Liệt', at: [-2950, 4450] },
  { id: 'cong-vien-yen-so', name: 'Công viên & Hồ Yên Sở (Hoàng Mai)', group: 'Phường Yên Sở', at: [-680, 6750] },
  // Khu vực Long Biên
  { id: 'cau-long-bien', name: 'Cầu Long Biên lịch sử & Đền Ghềnh (Bồ Đề)', group: 'Phường Bồ Đề', at: [4880, 820] },
  { id: 'aeon-long-bien', name: 'AEON Mall Long Biên & Khu đô thị Việt Hưng', group: 'Phường Long Biên', at: [5720, 4950] },
];
