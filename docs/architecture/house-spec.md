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
| `w` | number 25–140 | 40 | Bề rộng **mặt tiền** (dọc theo phố). Nhà rộng (≥ 6 m) chia mặt tiền các tầng trên thành nhiều gian ~4 m, mỗi gian một bộ cửa sổ |
| `d` | number | 150 | Chiều sâu tầng 1 (vuông góc với phố, chưa tính phần đua ra) |
| `facing` | `'N'\|'E'\|'S'\|'W'` | `'S'` | Hướng mặt tiền ra phố |
| `seed` | int | `hash(id)` | Seed cho biến thể nhỏ (độ sáng cửa sổ, vệt ố…) |

> `w`, `d` luôn tính theo mặt tiền, không theo trục x/y. Đổi `facing` không cần đổi `w`, `d`.

### 2.2 Khối & tầng
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `floors` | int 0–8 | 3 | Số tầng **trên** tầng 1. `0` = nhà một tầng / cấp 4 |
| `basement` | 0 hoặc 10–20 | 0 | **Nửa hầm để xe**: tầng 1 nâng cao lên đúng bằng chừng này; dưới là cửa cuốn ga-ra (mở nửa khi `shop`), bên cạnh có 3 bậc tam cấp từ vỉa hè lên. Hay gặp ở nhà mặt tiền rộng |
| `groundH` | number | 38 | Cao tầng 1 |
| `floorH` | number | 32 | Cao mỗi tầng trên |
| `overhang` | number 0–12 | 0 | Tầng 2 trở lên đua ra phía phố |
| `wall` | `'plain'\|'tile'\|'paint-old'\|'stone-base'` | `'plain'` | Hoàn thiện mặt tiền: trơn / ốp gạch men (lưới) / sơn cũ loang lổ / ốp đá chân tường tầng 1 |
| `bays` | int 0–6 | 0 | Số gian mặt tiền các tầng trên; 0 = tự động (~4 m một gian) |

### 2.3 Tầng 1 và biển hiệu
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `ground` | `'fold'\|'roll'\|'glass'\|'wood'\|'iron'\|'wall'` | `'fold'` | Cửa xếp, cửa cuốn, kính, gỗ 4 cánh, sắt hoa (lưới quả trám; mở = gập 2 bên), tường kín có cửa đi nhỏ |
| `shop` | bool | true | Đang mở hàng: cửa mở, lòng nhà sáng. `false` thì cửa xếp hoặc cửa cuốn đóng kín |
| `awning` | `'none'\|'fabric'\|'metal'` | `'none'` | Mái hiên bạt có diềm lượn sóng / mái hiên tôn |
| `goods` | `'none'\|'stools'\|'bikes'\|'crates'` | `'none'` | Bày ra vỉa hè: bàn ghế nhựa / xe máy dựng vuông góc lề / két bia, thùng hàng. Chỉ ở 60% mặt tiền bên trái, trong tầm 1.9 m |
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
| `billboard` | Cần `floors ≥ 2` và đỉnh nhà − 3 m ≥ `sideClear`. Gắn trên tường hồi `sideEnd`, cao sát đỉnh nhà, có 3 đèn chiếu |

### 2.4 Các tầng trên
`upper: FloorSpec[]`, một phần tử cho mỗi tầng từ tầng 2 trở lên, theo thứ tự từ dưới lên.

| Trường của `FloorSpec` | Kiểu | Mặc định (lấy từ khuôn) | Ý nghĩa |
|---|---|---|---|
| `window` | `'tall'\|'louver'\|'glass-doors'\|'pair'\|'wide'\|'arch'\|'french'\|'glass'` | `'tall'` | Cửa sổ đứng 2 cánh, cửa chớp, cửa kính ra ban công, cặp cửa nhỏ, cửa ngang 3 ô, cửa vòm, cửa Pháp kèm cánh chớp mở, mảng kính lớn |
| `balcony` | `'none'\|'rail'\|'solid'\|'cage'` | `'rail'` | Không có / lan can sắt / lan can xây / chuồng cọp (cao cả tầng) |
| `canopy` | `'none'\|'concrete'\|'metal'` | `'none'` | Ô văng bê tông hoặc mái tôn nhỏ che cửa sổ (không đi với chuồng cọp) |
| `laundry` | bool | false | Quần áo phơi ở ban công (cần ban công) |
| `plants` | int 0–3 | 1 | Số chậu cây trên ban công |
| `ac` | bool | false | Cục nóng điều hòa treo ngoài mặt tiền. **Chỉ vẽ khi tầng không có ban công** |

Khuôn cho mọi tầng (chỉ có ở `HouseInput`): `window`, `balcony`, `plants`, và `balconyFloors: 'all' | 'odd' | 'even' | 'none'`. Số tầng được đánh từ tầng 1, nên `'odd'` nghĩa là các tầng 3, 5, 7.

### 2.5 Mái
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `roof` | `'flat'\|'metal2'\|'metal1'\|'tile'` | `'flat'` | Mái bằng có tường chắn / tôn 2 dốc / tôn 1 dốc (cao phía sau, thấp ra phố) / mái ngói 2 dốc |
| `topRoom` | bool | false | Phòng tum trên mái bằng, lùi vào so với mặt tiền, phía trước là sân thượng |
| `topSetback` | number | 28 | Khoảng cách từ mặt tiền tầng trên đến tường trước của phòng tum |
| `parapet` | number | 8 | Cao tường chắn mái |
| `stairHut` | bool | false | Tum thang nhỏ ở góc sau mái bằng (khi không có phòng tum) |
| `roofShelter` | `'none'\|'terrace'\|'full'` | `'none'` | **Mái tôn tam giác** (2 dốc, nóc chạy dọc chiều sâu, đầu hồi tam giác hướng ra phố, để hở thấy khung vì kèo) trên cột sắt mảnh. `terrace`: che sân thượng trước phòng tum, **cao hơn trần tum một chút**, 4 cột trên tường chắn hai bên sân thượng. `full`: che toàn bộ mái bằng khi không có tum (4 cột), chừa dải phía sau cho bồn nước/ăng-ten. Nhiều nhà ống có, nhiều nhà không |
| `laundry` | bool | false | Dây phơi quần áo trên sân thượng (cần `topRoom`) |
| `roofPlants` | int 0–3 | 0 | Chậu cây trên sân thượng hoặc mái |
| `roofItems` | `RoofItem[]` | `['tank-h']` | `'tank-h'` bồn inox nằm, `'tank-v'` bồn đứng, `'solar'` máy NLMT, `'antenna'` ăng-ten, `'ac'` cục nóng, `'flag'` cột cờ. Một bộ xếp chỗ đặt từng thứ: thử vị trí quen trước, rồi tìm chỗ trống, hết chỗ thì bỏ. Dưới mái tôn che cả mái chỉ đặt vật thấp hơn mép mái. Có `topRoom` thì vật đặt trên mái phòng tum |

### 2.6 Tường hồi
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `sideAC` | int 0–3 | 1 | Cục nóng treo trên tường hồi `sideEnd`, cao hơn tầng 1 và cao hơn `sideClear`. Bỏ qua vị trí nào trùng chỗ biển quảng cáo lớn |
| `sideEnd` | `'+a'\|'-a'` | `'+a'` | Tường hồi nào lộ ra (bên phải / trái nhìn từ phố). Cục nóng treo và biển `billboard` chỉ gắn ở bên này, **cố định theo dữ liệu**, không đổi khi xoay góc nhìn |
| `sideAd` | string | `''` | Mảng quảng cáo sơn trên tường hồi, `"DÒNG 1|DÒNG 2"` (cần tường lộ đủ cao) |
| `sideWindows` | bool | false | Cửa sổ nhỏ trên tường hồi, chỉ ở các tầng cao hơn nhà bên; sáng cùng tầng |
| `sideClear` | number | 0 | Độ cao mà từ đó trở lên tường hồi `sideEnd` không bị nhà bên che. Bố cục phố tính bằng `peakZ` của nhà bên (cả phòng tum, vật trên mái, mái tôn). `0` = không có nhà bên |

Vệt ố và ống thoát nước tự sinh trên tường hồi, mặt sau có cửa sổ nhỏ ở mỗi tầng; không cần tham số.

## 3. Preset v1

Kích thước ghi theo mét (nhân 10 khi vào code).

| Preset | Nhãn | w × d | floors | Nét chính |
|---|---|---|---|---|
| `nha-mau` | Nhà mẫu · cà phê | 4 × 15 | 3 | Dựng lại nhà mẫu P1a: đua ra 0.8 m, cửa xếp, mái hiên, biển treo + biển dọc + standee, tầng 2 cửa kính và ban công, tầng 3 chuồng cọp, tầng 4 cửa chớp và cục nóng, phòng tum, dây phơi, bồn nằm + ăng-ten + NLMT, 2 cục nóng trên tường hồi |
| `cap4-metal` | Cấp 4 mái tôn · cắt tóc | 4.2 × 15 | 0 | Cửa kính, biển CẮT TÓC, cột xoắn barber, biển tròn ✂, mái tôn 2 dốc |
| `2f-balcony` | 2 tầng ban công | 4 × 14 | 1 | Cửa cuốn, biển TẠP HÓA, cửa kính và ban công có 2 chậu cây, bồn nằm |
| `3f-tank` | 3 tầng bồn nước | 4 × 15 | 2 | Nhà ở, không bán hàng (cửa cuốn đóng), ban công tầng lẻ, bồn nằm + NLMT, 2 tờ dán |
| `tube-5f-cage` | Nhà ống 5 tầng chuồng cọp | 3.8 × 18 | 4 | Đua ra, quán PHỞ BÒ có mái hiên + standee. Tầng 2 lan can 3 chậu, tầng 3 chuồng cọp, tầng 4 chuồng cọp + cửa chớp, tầng 5 cặp cửa nhỏ, có ăng-ten, **mái tôn che toàn bộ mái** |
| `wide-basement` | Nhà rộng · tầng hầm | 10 × 16 | 4 | Tầng 1 nâng cao trên nửa hầm để xe (1.4 m), cửa kính, NHÀ HÀNG + biển dọc QUÁN, 5 gian cửa mỗi tầng, phòng tum + mái tôn che sân thượng, bồn nằm + NLMT |
| `wide-plain` | Nhà rộng · thường | 8 × 14 | 3 | Rộng nhưng kết cấu bình thường: cửa xếp + mái hiên, ĐIỆN MÁY, ban công tầng chẵn, mái tôn che cả mái, 2 bồn + ăng-ten |
| `tube-6f-photo` | Nhà ống 6 tầng · photo | 3.6 × 15 | 5 | Cửa cuốn, 2 biển dọc PHOTO / IN ẤN hai bên cửa, ban công tầng lẻ, biển quảng cáo lớn CHO THUÊ BIỂN trên tường hồi, phòng tum + **mái tôn che sân thượng** + dây phơi, bồn đứng |

Thêm preset **không được** đòi sửa renderer (tiêu chí S3). Mục tiêu P2 là ≥ 12 preset, dài hạn 20–50.

## 4. Luật hợp lệ (đã cài trong `resolveSpec`)

| Luật | Xử lý |
|---|---|
| `25 ≤ w ≤ 140` (2.5–14 m), `d ≥ 60` | `error` |
| `basement` khác 0 mà ngoài 10–20 | Kẹp, `warn` |
| `preset` không tồn tại | `error` |
| `floors` ngoài khoảng 0–8 hoặc không nguyên; `stickers`, `roofPlants`, `sideAC` ngoài khoảng | Kẹp lại, `warn` |
| `floors === 0` → `overhang = 0`, `topRoom = false`, bỏ biển `projecting-vertical` và `billboard` | Tự sửa, `warn` |
| `overhang > 12` | Kẹp, `warn` |
| `roof !== 'flat'` → không `topRoom`, `roofItems` chỉ giữ `antenna`, không chậu cây và dây phơi | Tự sửa, `warn` |
| `topRoom` và `topSetback < 15` | Nâng lên 15, `warn` |
| `roofShelter: 'terrace'` mà không có `topRoom` → đổi thành `'full'`; `'full'` mà có `topRoom` → đổi thành `'terrace'`; mái không bằng → `'none'` | Tự sửa, `warn` |
| `roofShelter: 'full'` → bỏ `solar` (máy NLMT không đặt dưới mái tôn) và `flag` (cột cờ sát mép mái tôn tạo vòng che khuất không vẽ được) | Tự sửa, `warn` |
| `stairHut` với mái dốc hoặc khi đã có `topRoom` | Bỏ, `warn` |
| Tầng có `cage` → bỏ `canopy`; `laundry` mà không có ban công → bỏ | Tự sửa, `warn` |
| `bays` ngoài 0–6 | Kẹp, `warn` |
| `side-panels` và `w < 34` | Bỏ biển, `warn` |
| `id` trùng trong cảnh | `error` (do `sceneIssues`) |

Cảnh ghi `error` ra console. Vẽ khối placeholder cho nhà lỗi để dành cho P3, khi dữ liệu phố được nhập tay.

**Tầm với ra vỉa hè**: mọi thứ của một căn nhô ra vỉa hè tối đa **1.9 m** (`REACH`) tính từ mặt tiền tầng 1 (ban công, chuồng cọp, mái hiên, biển, standee, bậc tam cấp). Phần vỉa hè sát lòng đường dành cho cây, cột điện, dây điện. Biển dọc chìa ra tự rút ngắn, hết chỗ thì bỏ.

**Bất biến được test** (`render/house.test.ts`): với mọi preset, 4 hướng và 300 nhà ngẫu nhiên, không có hai bộ phận nào của cùng một căn nhà lồng vào nhau. Chạm nhau thì được. Đây là điều kiện để `depthSort` luôn đúng.

## 5. Dự kiến P2 (chưa có trong code)

| Trường / giá trị | Ý nghĩa |
|---|---|
| `shape`: `'L'`, `'chamfer'` + `shapeParam` | Nhà góc chữ L, nhà vát góc |
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
