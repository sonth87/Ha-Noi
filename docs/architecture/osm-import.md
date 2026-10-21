# Nhập dữ liệu OpenStreetMap (osm-data → osm-import → City)

Ba lớp tách nhau (ADR-032):

| Gói | Chứa | Không chứa |
|---|---|---|
| `packages/osm-data` | Bản trích OSM thô theo khu (`data/*.osm.json`, đúng như API trả về), danh sách khu (`data/areas.json`), script tải, kiểu dữ liệu OSM thô | Logic, sửa tay |
| `packages/osm-import` | Bộ chuyển `importArea`, cấu hình và **sửa tay** của từng khu (`src/area-*.ts`) | Bộ vẽ, DOM |
| `packages/core` | Mô hình thành phố, luật điền phần thiếu, cơ chế sửa tay | Bất cứ thứ gì về OSM |

Dùng: `loadCity('nga-tu-thai-ha') → { city, report }`.

## 1. Tải lại dữ liệu

`pnpm fetch:osm nga-tu-thai-ha` ở gốc. Script gọi `https://api.openstreetmap.org/api/0.6/map.json?bbox=…` cho **từng hộp** trong `bboxes` của `areas.json` (API giới hạn diện tích / số node mỗi lần), gộp lại bỏ trùng, thử lại tối đa 4 lần khi bị ngắt kết nối, và nếu API vẫn hỏng thì lấy cùng các hộp từ Overpass. Bản đang dùng: tải ngày 2026-10-21, 4 hộp, 9.635 node, 2.097 way, 118 relation, 2,8 MB. Giấy phép ODbL, ghi "© OpenStreetMap contributors" (A15).

Bẫy: curl qua HTTP/2 từng bị ngắt (lỗi 35) với phản hồi lớn; `--http1.1` thì được. Script dùng `fetch` của Node (HTTP/1.1) nên không gặp. **Không** gửi thông tin cá nhân (email…) trong User-Agent.

## 2. Phép chiếu (`frame.ts`)

lat/lon → mét: `e = Δlon · 111320 · cos(lat₀)`, `n = Δlat · 110574` (phép chiếu chữ nhật đều quanh gốc, đủ chính xác cho vài trăm mét). Rồi xoay theo `bearing` (độ, ngược chiều kim đồng hồ từ hướng đông) để trục chính của khu nằm theo `+x`: `x = e·cosθ + n·sinθ`, `y = e·sinθ − n·cosθ` (`y` hướng nam).

Khu ngã tư: gốc `21.0092471, 105.8243958` (giữa nút giao), `bearing = 62.5°` (hướng Tây Sơn). **Vùng** là hợp các hình chữ nhật (`region`, ADR-042): ngã tư ±160 m, hai dải dọc phố Thái Hà tới cuối phố, một dải dọc tuyến metro 2A quanh ga Thái Hà. Đường cắt theo vùng bằng `clipPathTo`; vùng (công viên…) cắt theo hình chữ nhật chứa tâm của nó.

## 3. Tag OSM → mô hình (`tags.ts`)

| Thứ | Tag OSM | Thành |
|---|---|---|
| Đường | `highway=primary/trunk` · `secondary` · `tertiary` · `*_link` · `residential/unclassified/living_street` · `service/track` · `footway/path/pedestrian/cycleway` · `steps` | `primary` · `secondary` · `tertiary` · `link` · `residential` · `service` · `footway` · `steps`; `residential`/`service` có tên bắt đầu bằng "Ngõ/Ngách/Hẻm/Kiệt" thành `alley` |
| | `oneway`, `lanes`, `bridge` + `layer` | `oneway`, `lanes`, `layer` + `profile` (luật cầu) |
| Tòa nhà | way kín hoặc multipolygon có `building` | `Building` (giữ nếu tâm nằm trong biên) |
| Phần nhà | `building:part` | `BuildingPart` của tòa nhỏ nhất chứa tâm phần đó |
| Số tầng | `building:levels`, hoặc `height ÷ 3.2` | `floors` theo kiểu nhà |
| Gợi ý kiểu | `building=house/apartments/office/commercial/hotel/school/kiosk/…`, `tourism=hotel` | `kind` (xem city-model §4) |
| Vùng | `leisure=park` · `leisure=garden`, `landuse=grass` · `leisure=pitch` · `leisure=swimming_pool` · `natural=water` · `area:highway=traffic_island` · `place=square` · `man_made=bridge` | `park` · `grass` · `pitch` · `pool` · `water` · `traffic-island` · `plaza` · `bridge` (cắt theo biên) |
| Điểm | `highway=traffic_signals` · `crossing` · `bus_stop` · `natural=tree` · `highway=street_lamp` · `power=pole` | `Feature` |
| Đường sắt | `railway=subway/light_rail/monorail` · `rail/narrow_gauge` · `tram` (không lấy `construction`); `bridge` hoặc `layer` > 0 = trên cao | `Rail` (`metro` · `rail` · `tram`), cắt theo vùng |
| Ga | node `railway=station` / `public_transport=station` (`station=subway` → metro) trong vùng hoặc sát đường ray; `railway=platform` trong 120 m | `Station` + sân ga |

Không có trong bảng thì bỏ qua. Vòng trong của multipolygon (sân trong) hiện bị bỏ và được đếm trong báo cáo.

## 4. Các bước của `importArea`

1. Chiếu mọi node.
2. Đường: phân loại, áp luật bề rộng / vỉa hè / cầu, cắt theo biên (mỗi đoạn một `Street`).
3. Tòa nhà và phần nhà; số tầng từ OSM, nếu không có thì theo luật.
4. Vùng (way kín và multipolygon), cắt theo biên.
5. Điểm; nút giao = node nơi **từ 3 nhánh đường xe chạy** trở lên gặp nhau (đầu way tính 1, node giữa way tính 2); có đèn nếu trong vòng 20 m có `traffic_signals`.
6. Cạnh mặt tiền của mỗi tòa, nhà sinh cho tòa nhỏ.
7. Sửa tay của khu.

Mọi danh sách sắp theo id, nên **cùng dữ liệu luôn ra cùng thành phố** (có test). Nhập khu ngã tư mất khoảng 60 ms.

## 5. Báo cáo (`ImportReport`)

| Trường | Ý nghĩa |
|---|---|
| `counts` | Số đường, nút giao, tòa, phần nhà, nhà sinh, vùng, điểm |
| `unusedOverrides` | Mục sửa tay không khớp gì: phải xem lại sau mỗi lần tải dữ liệu mới |
| `orphanParts` | Phần nhà không nằm trong tòa nào |
| `droppedHoles` | Số vòng trong bị bỏ |
| `noStreet` | Tòa có mặt tiền không gần đường nào |

Khu (2026-10-21, gồm cả phố Thái Hà và metro): 434 đoạn đường, 261 nút giao, 612 tòa (403 nhà sinh), 619 phần nhà, 44 vùng, 106 điểm, 2 đường ray metro, 1 ga (Thái Hà, 2 sân ga); 0 sửa tay thừa, 0 phần nhà lạc. Nhập mất khoảng 0,25–0,4 s.

## 6. Thêm một khu mới

1. Thêm khu vào `packages/osm-data/data/areas.json` (`bboxes`: một hoặc nhiều hộp, rộng hơn vùng một chút để đủ tòa nhà hai bên phố), rồi `pnpm fetch:osm <id>`.
2. Thêm file vào `EXTRACTS` trong `packages/osm-data/src/index.ts`.
3. Tạo `packages/osm-import/src/area-<id>.ts`: gốc, `bearing`, vùng (`region`: các hình chữ nhật), sửa tay; đăng ký trong `AREA_CONFIGS`.
4. Chạy test, đọc báo cáo, đối chiếu với ảnh hoặc f4map (A13).
