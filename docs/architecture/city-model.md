# Mô hình thành phố (City model)

`packages/core/src/city.ts`. Đây là **mọi thứ một bộ vẽ cần** để vẽ một khu: phố, nút giao, tòa nhà, vùng, các điểm. Mô hình không biết dữ liệu đến từ đâu: OpenStreetMap (qua [osm-import](osm-import.md)) hay dựng tay đều ra cùng một kiểu `City`. Bộ vẽ vẽ được mọi `City`, nên **thêm phố, thêm nhà là thêm dữ liệu**, không sửa bộ vẽ (ADR-032).

Mọi bảng dưới đây **phải khớp** với code (luật A3).

## 1. Hệ toạ độ và đơn vị (ADR-033)

- **Mét.** `x` hướng đông theo trục chính của khu (ở khu ngã tư: dọc Tây Sơn, về phía Ô Chợ Dừa), `y` hướng **nam**, `z` lên trên.
- Gốc toạ độ và góc xoay của mỗi khu do cấu hình nhập khu đó quyết định. Khu ngã tư: gốc ở giữa nút giao dưới cầu vượt, Thái Hà đi về phía bắc (`y < 0`), Chùa Bộc phía nam (`y > 0`).
- **Vòng (ring)**: danh sách điểm, không lặp điểm đầu ở cuối, **diện tích shoelace dương** trên `(x, y)`. Vì `y` hướng nam, trên bản đồ hướng bắc lên trên thì vòng đi **theo chiều kim đồng hồ**. `normalizeRing` đưa mọi vòng về dạng này.
- **Pháp tuyến ngoài** của cạnh `i → i+1` của một vòng như vậy: `(dy, −dx)` chuẩn hóa (`edgeNormal`).
- Từ mô hình sang three.js (app mới): `(x, y, z) → (x, z, y)`; camera đặt ở hướng `(1, 1, 1)` nhìn thấy đúng như góc 0 của app SVG cũ.

## 2. Các kiểu

### `City`
| Trường | Ý nghĩa |
|---|---|
| `id`, `name` | Mã khu (trùng mã trong `osm-data`) và tên hiển thị |
| `bounds` | Hình chữ nhật mô hình bao phủ (m) |
| `streets`, `junctions`, `buildings`, `areas`, `features` | Các danh sách, **sắp theo `id`** để cùng dữ liệu luôn ra cùng thứ tự |
| `attribution` | Dòng ghi nguồn app phải hiện (A15), ví dụ `© OpenStreetMap contributors` |

### `Street`
| Trường | Ý nghĩa |
|---|---|
| `kind` | `primary`, `secondary`, `tertiary`, `link` (nhánh rẽ), `residential`, `service`, `alley` (ngõ, ngách, hẻm), `footway`, `steps` |
| `path` | Đường tim; với đường một chiều thì theo chiều xe chạy |
| `width` | Bề rộng lòng đường (m) |
| `lanes`, `oneway` | Số làn, một chiều |
| `sidewalk` | Bề rộng vỉa hè `{ left, right }` (m), nhìn dọc theo `path` |
| `layer` | 0 = mặt đất; ≥ 1 = trên cầu |
| `profile` | Cao độ mặt đường dọc tim: các cặp `[quãng đường từ đầu (m), z (m)]`, quãng đường tăng dần; rỗng = mặt đất. Đọc bằng `streetZ(street, s)` |
| `source` | Nguồn, ví dụ `osm:way/164211345` |

Một đường OSM bị cắt ở biên khu thành nhiều đoạn thì mỗi đoạn là một `Street`, id có hậu tố `-0`, `-1`…, chung `source`.

### `Junction`
Nơi **từ 3 nhánh đường xe chạy trở lên** gặp nhau (hai đoạn của cùng một con đường nối tiếp nhau không tính; lối đi bộ không tạo nút giao). `streets`: id các đoạn qua đó; `signals`: có đèn tín hiệu trong vòng 20 m.

### `Building` và `BuildingPart`
| Trường | Ý nghĩa |
|---|---|
| `kind` | `kiosk`, `tube-house` (nhà ống), `house`, `villa`, `apartment`, `office`, `commercial`, `hotel`, `school`, `other` |
| `footprint` | Mặt bằng cả tòa |
| `parts` | Các khối để vẽ, **ít nhất một**. Tòa có phần nhà thật (OSM `building:part`) thì vẽ các phần, không vẽ mặt bằng tổng |
| `levelsFrom` | Số tầng lấy từ đâu: `osm`, `override` (sửa tay), `rule` (luật đoán) |
| `front` | Chỉ số cạnh `i` (cạnh `i → i+1`) quay ra phố |
| `house` | `{ input, spec }` của generator nhà (nhà ống, nhà nhỏ): chi tiết mặt tiền đặt lên cạnh `front`. Xem [house-spec](house-spec.md) |
| `model` | Mô hình dựng tay bộ vẽ có thể dùng cho chi tiết (`viet-tower`, `novotel`…) |

`BuildingPart`: `footprint`, `z0` (đáy), `floors` (**chiều cao từng tầng**, từ dưới lên, m), `facade` (`wall` hoặc `glass`), `roof` (`flat` hoặc `pitched`). Đỉnh khối = `z0 + tổng floors` (`partTop`). Tầng `n` của mọi phần là cùng một tầng `n` của tòa, id tầng để bật đèn: `floorId(b, n)` = `<id tòa>/<n>`.

### `Area` và `Feature`
- `Area.kind`: `park`, `grass`, `water`, `pitch`, `pool`, `plaza`, `traffic-island`, `bridge` (mặt bằng cầu). Đa giác đã cắt theo biên khu.
- `Feature.kind`: `traffic-signals`, `crossing`, `bus-stop`, `tree`, `street-lamp`, `power-pole`. Đồ phố dữ liệu không có (cây, cột điện, đèn) sẽ do luật rải ở M5.

## 3. Mặt tiền và nhà sinh tự động

- `frontEdge(ring, streets)`: cạnh có **phía ngoài nhìn thẳng ra mép đường gần nhất** (trong vòng 40 m); không có thì cạnh gần đường nhất. Chỉ xét đường xe chạy ở mặt đất.
- `frontage(ring, front)` → `w` = dài cạnh mặt tiền, `d` = sâu nhất tính từ cạnh đó vào trong.
- `houseFor(id, kind, levels, w, d)`: với `tube-house`, `house`, `villa`, khi `2.5 ≤ w ≤ 14` và `d ≥ 6`, sinh nhà bằng `randomHouse` với seed lấy từ id (giữ `w`, `d` thật, `floors = levels − 1`, `d` tối đa 30 m). Ngoài khoảng đó thì không có `house` (bộ vẽ chỉ dựng khối và cửa).

## 4. Luật điền phần dữ liệu thiếu (`rules.ts`)

### Đường
| Loại | Bề rộng làn | Số làn mặc định | Vỉa hè |
|---|---|---|---|
| `primary` | 3.25 | 2 (một chiều: 1) | 3.5 |
| `secondary` | 3.25 | 2 | 3 |
| `tertiary` | 3 | 2 | 2.5 |
| `residential` | 2.75 | 2 | 1.5 |
| `link`, `service`, `alley` | 3.5 / 3 / 3 | 1 | 0 |
| `footway`, `steps` | 1.8 | 1 | 0 |

- Đường chính **một chiều** được coi là một bên của đường đôi: vỉa hè chỉ ở **bên phải** (xe đi bên phải nên mép phải là mép ngoài). Đường hai chiều có vỉa hè hai bên.
- **Cầu** (`bridge` + `layer ≥ 1`): cầu đường bộ dốc từ mặt đất lên mặt cầu cao `6 × layer` m, mỗi dốc dài 1/3 chiều dài, tối đa 100 m; cầu đi bộ phẳng ở 5 m. Đường bị cắt ở biên khu thì profile được cắt theo.

### Tòa nhà
| Trường hợp | Kiểu |
|---|---|
| Tag OSM có loại rõ (`house`, `apartments`, `office`, `commercial`, `hotel`, `school`, `kiosk`…) | Theo tag; `house` mà mặt bằng dạng ống thì thành `tube-house` |
| Mặt bằng < 15 m² | `kiosk` |
| Cạnh ngắn ≤ 7 m và cạnh dài ≥ 1.6 × cạnh ngắn (theo hình chữ nhật bao nhỏ nhất) | `tube-house` |
| ≤ 200 m² | `house` |
| ≤ 800 m² | `apartment` |
| Lớn hơn | `commercial` |

Số tầng (khi dữ liệu không có), chọn theo seed của id:

| Kiểu | Chọn trong | Tầng 1 / tầng trên (m) |
|---|---|---|
| `kiosk` | 1 | 3 / 3 |
| `tube-house` | 2, 3, 3, 4, 4, 4, 5, 5, 6 | 3.8 / 3.2 |
| `house` | 2, 3, 3, 4, 5 | 3.8 / 3.2 |
| `villa` | 2, 3, 3 | 3.6 / 3.3 |
| `apartment` | 5–9 | 3.6 / 3 |
| `office` | 5–10 | 4.2 / 3.6 |
| `commercial` | 3, 4, 5, 6, 8 | 4.5 / 4 |
| `hotel` | 8, 10, 12, 15 | 4.5 / 3 |
| `school` | 3–5 | 3.9 / 3.6 |
| `other` | 2–4 | 3.5 / 3.2 |

## 5. Sửa tay (`overrides.ts`)

Lớp sửa tay đặt lên dữ liệu đã nhập, **khóa theo `source`** của phần tử (ví dụ `osm:way/850419282`), nên tải lại OSM không làm mất. `applyOverrides(city, overrides)` trả về `unused`: những mục không khớp phần tử nào (dữ liệu nguồn đã đổi?), import báo ra để không mục nào bị bỏ quên.

| Cho | Sửa được |
|---|---|
| Tòa nhà | `name`, `kind`, `model`, `levels` hoặc `floors` (tòa không có phần), `facade`, `parts` (theo `source` của phần: `floors`, `facade`, `roof`, `z0`, `remove`), `house` (ghi đè vào nhà sinh), `front`, `remove` |
| Đường | `name`, `width`, `lanes`, `sidewalk`, `profile`, `remove` |

Đổi số tầng của tòa có nhà sinh thì nhà sinh đổi theo (`floors = tầng − 1`). Sửa tay của từng khu nằm cùng cấu hình nhập khu đó (`packages/osm-import/src/area-*.ts`).

## 6. Đọc mô hình

`partTop(p)`, `floorZ(p, i)`, `buildingHeight(b)`, `buildingLevels(b)`, `floorId(b, n)`, `streetZ(st, s)`. Hình học 2D chung ở `geom.ts`: `normalizeRing`, `signedArea`, `area`, `centroid`, `bbox`, `pointInRing`, `polylineLength`, `closestOnSegment`, `closestOnPath`, `minRect`, `hull`, `clipPath`, `clipRing`, `inRect`.
