# Dữ liệu OpenStreetMap

Bản trích thô từ OpenStreetMap API 0.6 (`/map.json`), đúng như máy chủ trả về, không sửa tay. Mọi chỉnh sửa (số tầng, kiểu nhà, công trình dựng tay) nằm ở `packages/osm-import/src/area-*.ts`, không ở đây.

| Khu | File | bbox (lon, lat) | Ngày tải |
|---|---|---|---|
| Ngã tư Thái Hà – Tây Sơn – Chùa Bộc và phố Thái Hà | `nga-tu-thai-ha.osm.json` | 4 hộp (ngã tư, Thái Hà nam, Thái Hà bắc, tuyến metro 2A), gộp lại, xem `areas.json` | xem `areas.json` |

Tải lại (cần mạng): `pnpm fetch:osm nga-tu-thai-ha` ở thư mục gốc. Script tải từng hộp trong `bboxes` (API giới hạn diện tích và số node mỗi lần), gộp lại bỏ trùng, ghi đè file và cập nhật ngày trong `areas.json`.

**Giấy phép:** © OpenStreetMap contributors, dữ liệu theo [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). App dùng dữ liệu này phải ghi "© OpenStreetMap contributors" (luật A15).

## Hà Nội: skeleton đã được vá bằng dữ liệu OSM thật (2026-10-26, ADR-058)

`vn/ha-noi/skeleton.osm.json` từng có 49 phần tử toạ độ ước chừng (id `99000000010–30`, `99000001000–27`). Chúng đã bị xoá và thay bằng đường trục chính, cầu, mảng nước sông, hồ và công viên tải từ Overpass (cùng giấy phép ODbL). Các hộp công trình id `99…` cũng đã xoá hoặc thay bằng đa giác OSM thật; không còn id `99…` nào. Đa giác phường (`packages/osm-import/src/cities/vn/ha-noi/wards.data.ts`) tạo từ Overpass: `rel["boundary"="administrative"]["admin_level"="6"]["name"~"^Phường "](20.93,105.70,21.13,105.95);out geom;`, chiếu vào hệ toạ độ thành phố và đơn giản hoá 5 m. Đừng thêm phần tử id `99…` mới cho đường hay mặt nước: lấy từ OSM.
