# Dữ liệu OpenStreetMap

Bản trích thô từ OpenStreetMap API 0.6 (`/map.json`), đúng như máy chủ trả về, không sửa tay. Mọi chỉnh sửa (số tầng, kiểu nhà, công trình dựng tay) nằm ở `packages/osm-import/src/area-*.ts`, không ở đây.

| Khu | File | bbox (lon, lat) | Ngày tải |
|---|---|---|---|
| Ngã tư Thái Hà – Tây Sơn – Chùa Bộc và phố Thái Hà | `nga-tu-thai-ha.osm.json` | 4 hộp (ngã tư, Thái Hà nam, Thái Hà bắc, tuyến metro 2A), gộp lại, xem `areas.json` | xem `areas.json` |

Tải lại (cần mạng): `pnpm fetch:osm nga-tu-thai-ha` ở thư mục gốc. Script tải từng hộp trong `bboxes` (API giới hạn diện tích và số node mỗi lần), gộp lại bỏ trùng, ghi đè file và cập nhật ngày trong `areas.json`.

**Giấy phép:** © OpenStreetMap contributors, dữ liệu theo [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). App dùng dữ liệu này phải ghi "© OpenStreetMap contributors" (luật A15).
