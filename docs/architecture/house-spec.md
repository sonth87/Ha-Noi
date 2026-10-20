# Đặc tả nhà (House spec)

Một căn nhà là một object dữ liệu. Renderer chỉ đọc object này. Đơn vị: **1 m = 10**.

Trong code:
- `HouseSpec` (đầy đủ, sau khi gộp), `HouseInput` (`id` bắt buộc, mọi trường khác tùy chọn), `FloorSpec`, `SignSpec`, `Issue` nằm trong `src/core/types.ts`.
- Preset: `PRESETS` trong `src/core/presets.ts` (mỗi preset có thêm `label` để hiển thị).
- `resolveSpec(input) → { spec, issues }`, `sceneIssues(inputs)` và `randomHouse(rng, id)` nằm trong `src/core/spec.ts`.
- `renderHouse(K, spec) → Item[]` và `floorIds(spec)` nằm trong `src/render/house.ts`.

Mọi bảng dưới đây **phải khớp** với các kiểu trên (luật A3). Đổi một bên thì đổi bên kia trong cùng lần làm.

## 1. Cách gộp

```
spec đầy đủ = DEFAULTS ⊕ preset ⊕ input            (bên phải ghi đè bên trái)
upper[i]    = mặc định theo tầng ⊕ preset.upper[i] ⊕ input.upper[i]
```

- **Mặc định theo tầng** lấy từ `window`, `balcony`, `balconyFloors`, `plants`. Bốn trường này chỉ có ở `HouseInput`, dùng làm khuôn cho mọi tầng.
- Sau khi gộp, `resolveSpec` áp các luật ở mục 4 và trả về danh sách `issues`, mỗi issue có mức `error` hoặc `warn`.
- `seed` mặc định là `hash(id)`, nên cùng một id luôn cho cùng một căn nhà.

## 2. Các trường (v1, đã có trong code)

### 2.1 Định danh & vị trí
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | string | bắt buộc | Duy nhất trong cảnh. Dùng làm tiền tố cho id tầng `data-floor="<id>/<n>"` |
| `preset` | string | — | Tên preset ở mục 3 |
| `x`, `y` | number | 0 | Góc nhỏ nhất của footprint thân nhà tầng 1 (hệ dữ liệu, trước khi xoay) |
| `w` | number | 40 | Bề rộng **mặt tiền** (dọc theo phố) |
| `d` | number | 150 | Chiều sâu tầng 1 (vuông góc với phố, chưa tính phần đua ra) |
| `facing` | `'N'\|'E'\|'S'\|'W'` | `'S'` | Hướng mặt tiền ra phố |
| `seed` | int | `hash(id)` | Seed cho biến thể nhỏ (độ sáng cửa sổ, vệt ố…) |

> `w`, `d` luôn tính theo mặt tiền, không theo trục x/y. Đổi `facing` không cần đổi `w`, `d`.

### 2.2 Khối & tầng
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `floors` | int 0–8 | 3 | Số tầng **trên** tầng 1. `0` = nhà một tầng / cấp 4 |
| `groundH` | number | 38 | Cao tầng 1 |
| `floorH` | number | 32 | Cao mỗi tầng trên |
| `overhang` | number 0–12 | 0 | Tầng 2 trở lên đua ra phía phố |

### 2.3 Tầng 1 và biển hiệu
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `ground` | `'fold'\|'roll'\|'glass'\|'wood'\|'wall'` | `'fold'` | Cửa xếp, cửa cuốn, kính, gỗ 4 cánh, tường kín có cửa đi nhỏ |
| `shop` | bool | true | Đang mở hàng: cửa mở, lòng nhà sáng. `false` thì cửa xếp hoặc cửa cuốn đóng kín |
| `awning` | `'none'\|'fabric'` | `'none'` | Mái hiên bạt có diềm lượn sóng |
| `shopName` | string | `'TẠP HÓA'` | Chữ mặc định trên biển. Chữ tự đặt, không thương hiệu |
| `signs` | `SignSpec[]` | `[{ type: 'facade' }]` | Danh sách biển, theo [components](components.md) mục A9 |
| `stickers` | int 0–4 | 1 | Số tờ quảng cáo A5 dán ở tầng 1 |

`SignSpec = { type, text? }`. Nếu không có `text`, biển dùng `shopName`.
- `side-panels`: `text` dạng `"TRÁI|PHẢI"`, ví dụ `"PHOTO|IN ẤN"`.
- `billboard`: `text` dạng `"DÒNG 1|DÒNG 2"`; dòng 2 mặc định là số điện thoại.

| `type` | Điều kiện |
|---|---|
| `facade` | Nếu `overhang > 0` thì biển treo dưới mép phần đua ra; nếu không thì gắn sát tường |
| `side-panels` | Cần `w ≥ 34`. Cửa tầng 1 tự thu hẹp để nhường chỗ cho hai biển |
| `projecting-vertical` | Cần `floors ≥ 1`. Nếu tầng 2 là chuồng cọp thì biển dịch ra ngoài chuồng |
| `projecting-round` | Nếu có mái hiên thì biển nằm trên mái hiên |
| `standee` | Đứng trên vỉa hè, cách mép phần đua ra 0.8 m |
| `barber-pole` | Trên mặt tiền tầng 1, cạnh cửa |
| `billboard` | Cần `floors ≥ 2`. Gắn trên tường hồi ở phía nhìn thấy, cao sát đỉnh nhà, có 3 đèn chiếu |

### 2.4 Các tầng trên
`upper: FloorSpec[]`, một phần tử cho mỗi tầng từ tầng 2 trở lên, theo thứ tự từ dưới lên.

| Trường của `FloorSpec` | Kiểu | Mặc định (lấy từ khuôn) | Ý nghĩa |
|---|---|---|---|
| `window` | `'tall'\|'louver'\|'glass-doors'\|'pair'\|'wide'` | `'tall'` | Cửa sổ đứng 2 cánh, cửa chớp, cửa kính 2 cánh ra ban công, cặp cửa nhỏ, cửa ngang 3 ô |
| `balcony` | `'none'\|'rail'\|'cage'` | `'rail'` | Không có / lan can sắt / chuồng cọp (cao cả tầng) |
| `plants` | int 0–3 | 1 | Số chậu cây trên ban công |
| `ac` | bool | false | Cục nóng điều hòa treo ngoài mặt tiền. **Chỉ vẽ khi tầng không có ban công** |

Khuôn cho mọi tầng (chỉ có ở `HouseInput`): `window`, `balcony`, `plants`, và `balconyFloors: 'all' | 'odd' | 'even' | 'none'`. Số tầng được đánh từ tầng 1, nên `'odd'` nghĩa là các tầng 3, 5, 7.

### 2.5 Mái
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `roof` | `'flat'\|'metal2'` | `'flat'` | Mái bằng có tường chắn / mái tôn 2 dốc (nóc chạy dọc chiều sâu) |
| `topRoom` | bool | false | Phòng tum trên mái bằng, lùi vào so với mặt tiền, phía trước là sân thượng |
| `topSetback` | number | 28 | Khoảng cách từ mặt tiền tầng trên đến tường trước của phòng tum |
| `parapet` | number | 8 | Cao tường chắn mái |
| `laundry` | bool | false | Dây phơi quần áo trên sân thượng (cần `topRoom`) |
| `roofPlants` | int 0–3 | 0 | Chậu cây trên sân thượng hoặc mái |
| `roofItems` | `RoofItem[]` | `['tank-h']` | `'tank-h'` bồn inox nằm, `'tank-v'` bồn đứng, `'solar'` máy nước nóng năng lượng mặt trời, `'antenna'` ăng-ten. Vị trí cố định từ sau ra trước nên không chồng nhau. Có `topRoom` thì vật đặt trên mái phòng tum |

### 2.6 Tường hồi
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `sideAC` | int 0–3 | 1 | Cục nóng treo trên tường hồi ở phía nhìn thấy, cao hơn tầng 1. Bỏ qua vị trí nào trùng chỗ biển quảng cáo lớn |

Vệt ố và ống thoát nước tự sinh trên tường hồi, mặt sau có cửa sổ nhỏ ở mỗi tầng; không cần tham số.

## 3. Preset v1

Kích thước ghi theo mét (nhân 10 khi vào code).

| Preset | Nhãn | w × d | floors | Nét chính |
|---|---|---|---|---|
| `nha-mau` | Nhà mẫu · cà phê | 4 × 15 | 3 | Dựng lại nhà mẫu P1a: đua ra 0.8 m, cửa xếp, mái hiên, biển treo + biển dọc + standee, tầng 2 cửa kính và ban công, tầng 3 chuồng cọp, tầng 4 cửa chớp và cục nóng, phòng tum, dây phơi, bồn nằm + ăng-ten + NLMT, 2 cục nóng trên tường hồi |
| `cap4-metal` | Cấp 4 mái tôn · cắt tóc | 4.2 × 15 | 0 | Cửa kính, biển CẮT TÓC, cột xoắn barber, biển tròn ✂, mái tôn 2 dốc |
| `2f-balcony` | 2 tầng ban công | 4 × 14 | 1 | Cửa cuốn, biển TẠP HÓA, cửa kính và ban công có 2 chậu cây, bồn nằm |
| `3f-tank` | 3 tầng bồn nước | 4 × 15 | 2 | Nhà ở, không bán hàng (cửa cuốn đóng), ban công tầng lẻ, bồn nằm + NLMT, 2 tờ dán |
| `tube-5f-cage` | Nhà ống 5 tầng chuồng cọp | 3.8 × 18 | 4 | Đua ra, quán PHỞ BÒ có mái hiên + standee. Tầng 2 lan can 3 chậu, tầng 3 chuồng cọp, tầng 4 chuồng cọp + cửa chớp, tầng 5 cặp cửa nhỏ, có ăng-ten |
| `tube-6f-photo` | Nhà ống 6 tầng · photo | 3.6 × 15 | 5 | Cửa cuốn, 2 biển dọc PHOTO / IN ẤN hai bên cửa, ban công tầng lẻ, biển quảng cáo lớn CHO THUÊ BIỂN trên tường hồi, bồn đứng |

Thêm preset **không được** đòi sửa renderer (tiêu chí S3). Mục tiêu P2 là ≥ 12 preset, dài hạn 20–50.

## 4. Luật hợp lệ (đã cài trong `resolveSpec`)

| Luật | Xử lý |
|---|---|
| `w ≥ 25` (2.5 m), `d ≥ 60` | `error` |
| `preset` không tồn tại | `error` |
| `floors` ngoài khoảng 0–8 hoặc không nguyên; `stickers`, `roofPlants`, `sideAC` ngoài khoảng | Kẹp lại, `warn` |
| `floors === 0` → `overhang = 0`, `topRoom = false`, bỏ biển `projecting-vertical` và `billboard` | Tự sửa, `warn` |
| `overhang > 12` | Kẹp, `warn` |
| `roof !== 'flat'` → không `topRoom`, `roofItems` chỉ giữ `antenna`, không chậu cây và dây phơi | Tự sửa, `warn` |
| `topRoom` và `topSetback < 15` | Nâng lên 15, `warn` |
| `side-panels` và `w < 34` | Bỏ biển, `warn` |
| `id` trùng trong cảnh | `error` (do `sceneIssues`) |

Cảnh ghi `error` ra console. Vẽ khối placeholder cho nhà lỗi để dành cho P3, khi dữ liệu phố được nhập tay.

**Bất biến được test** (`render/house.test.ts`): với mọi preset, 4 hướng và 300 nhà ngẫu nhiên, không có hai bộ phận nào của cùng một căn nhà lồng vào nhau. Chạm nhau thì được. Đây là điều kiện để `depthSort` luôn đúng.

## 5. Dự kiến P2 (chưa có trong code)

| Trường / giá trị | Ý nghĩa |
|---|---|
| `window`: `'arch'`, `'glass'` (kính lớn) | Cửa vòm, mảng kính lớn |
| `balcony`: `'solid'` | Lan can xây đặc |
| `awning`: `'metal'` | Mái tôn che trước cửa |
| `roof`: `'metal1'`, `'tile'`, `roofShelter`, `stairHut` | Tôn 1 dốc, mái ngói, mái tôn che tạm, tum thang nhỏ (không phải phòng) |
| `shape`: `'L'`, `'chamfer'` + `shapeParam` | Nhà góc chữ L, nhà vát góc |
| `wall`: `'plain'\|'tile'\|'paint-old'` | Kiểu hoàn thiện tường |
| `sideAd` | Mảng quảng cáo sơn trên tường hồi |
| Preset: `cap4-tile`, `1f-flat`, `4f-shop`, `tube-narrow-7f`, `corner-L`, `corner-chamfer`, `old-villa` | Bổ sung để đủ 12+ preset |

## 6. Ví dụ

```ts
// dùng preset nguyên bản
{ id: 'TH-03', preset: 'tube-5f-cage', facing: 'S' }

// preset + ghi đè (tầng 3 đổi thành cửa chớp, không chuồng cọp)
{ id: 'TH-04', preset: 'tube-5f-cage', floors: 5, shopName: 'SỬA XE',
  upper: [{}, { window: 'louver', balcony: 'none', ac: true }] }

// không preset, tự khai báo
{ id: 'CB-11', w: 45, d: 140, facing: 'E', floors: 2, ground: 'wood', shop: false,
  window: 'pair', balcony: 'rail', balconyFloors: 'even', roofItems: ['tank-v', 'antenna'] }
```
