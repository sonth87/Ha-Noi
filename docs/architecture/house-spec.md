# Đặc tả nhà (House spec)

Một căn nhà = một object dữ liệu. Renderer chỉ đọc object này. Đơn vị: **1 m = 10**.

Trong code:
- Kiểu `HouseSpec` (đầy đủ, sau khi gộp) và `HouseInput` (`Partial<HouseSpec>` + `id` bắt buộc + `preset?`) nằm ở `src/core/types.ts`.
- Preset: `PRESETS: Record<PresetId, Partial<HouseSpec>>` trong `src/core/presets.ts`.
- `resolveSpec(input): HouseSpec` và `validateSpec(spec): Issue[]` trong `src/core/spec.ts`.

Mọi bảng dưới đây phải khớp với các kiểu này (luật A3). Đổi một bên thì đổi bên kia trong cùng lần làm.

## 1. Cách gộp

```
spec đầy đủ = DEFAULTS ⊕ PRESETS[raw.preset] ⊕ raw   (bên phải ghi đè bên trái)
```

Sau khi gộp, `resolveSpec()` kiểm tra hợp lệ (mục 4) và điền các giá trị suy ra (`height`, số cửa sổ mỗi tầng…).

## 2. Các trường

### 2.1 Định danh & vị trí
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | string | bắt buộc | Duy nhất trong cảnh, dùng cho id DOM |
| `preset` | string | — | Tên preset ở mục 3 |
| `x`, `y` | number | 0 | Góc footprint nhỏ nhất (hệ dữ liệu, trước xoay) |
| `w` | number | 40 | Bề rộng **mặt tiền** (dọc theo phố) |
| `d` | number | 150 | Chiều sâu (vuông góc với phố) |
| `facing` | `'N'\|'E'\|'S'\|'W'` | `'S'` | Hướng mặt tiền ra phố |
| `seed` | int | hash(`id`) | Seed cho biến thể nhỏ |

> `w`, `d` luôn định nghĩa theo **mặt tiền**, không theo trục x/y. Đổi `facing` không cần đổi `w`, `d`.

### 2.2 Khối & tầng
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `floors` | int 0–9 | 3 | Số tầng **trên** tầng 1. `0` = nhà 1 tầng / cấp 4 |
| `groundH` | number | 38 | Cao tầng 1 |
| `floorH` | number | 32 | Cao mỗi tầng trên |
| `overhang` | number 0–15 | 0 | Tầng 2+ đua ra phía phố (đơn vị code: 10 = 1 m) |
| `setbackTop` | number | 0 | Tầng trên cùng lùi vào so với mặt tiền |
| `shape` | `'rect'\|'L'\|'chamfer'` | `'rect'` | Hình footprint |
| `shapeParam` | object | — | `L`: `{ cutW, cutD, side:'left'\|'right' }`; `chamfer`: `{ size, corner }` |
| `wall` | `'plain'\|'tile'\|'paint-old'` | `'plain'` | Kiểu hoàn thiện tường (khác nhau bằng nét chi tiết) |

### 2.3 Tầng 1
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `ground` | `'fold'\|'roll'\|'glass'\|'wood'\|'wall'` | `'fold'` | Cửa xếp, cửa cuốn, kính, gỗ, tường kín (có cửa đi nhỏ) |
| `shop` | bool | true | Có kinh doanh (mở hàng thì lòng nhà sáng) |
| `awning` | `'none'\|'fabric'\|'metal'` | `'none'` | Mái hiên bạt / mái tôn che |
| `signs` | `SignSpec[]` | `[{ type: 'facade' }]` | Danh sách biển của căn; kiểu và vị trí theo [components](components.md) mục A9 |
| `shopName` | string | ngẫu nhiên từ danh sách | Chữ tự đặt trên biển (CÀ PHÊ, PHOTO, BARBER…), không thương hiệu |
| `stickers` | int 0–4 | 1 | Số tờ quảng cáo A5 dán ở tầng 1 |

`SignSpec = { type: 'facade' | 'side-panels' | 'projecting-vertical' | 'projecting-round' | 'standee' | 'barber-pole' | 'billboard', text?: string }`. Biển `billboard` thường thuộc tường hồi hoặc mái nhà cao, không thuộc tầng 1.

### 2.4 Các tầng trên
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `window` | `'tall'\|'wide'\|'arch'\|'glass'\|'louver'` | `'tall'` | Cửa sổ đứng, ngang, vòm, kính lớn, lá sách |
| `windowsPerFloor` | int | tự tính từ `w` | Số ô cửa / tầng |
| `balcony` | `'none'\|'rail'\|'solid'\|'cage'` | `'rail'` | Không / lan can sắt / lan can đặc / chuồng cọp |
| `balconyFloors` | `'all'\|'odd'\|int[]` | `'all'` | Tầng nào có ban công |
| `balconyDepth` | number | 10 | Độ nhô ban công |
| `plants` | 0–3 | 1 | Mật độ cây ở ban công / sân thượng |
| `laundry` | bool | false | Quần áo phơi |

### 2.5 Mái
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `roof` | `'flat'\|'metal1'\|'metal2'\|'tile'` | `'flat'` | Bằng / tôn 1 dốc / tôn 2 dốc / ngói |
| `stairHut` | bool | false | Tum thang trên mái bằng |
| `parapet` | number | 10 | Cao tường chắn mái (mái bằng) |
| `roofShelter` | bool | false | Mái tôn che tạm một phần sân thượng |
| `roofItems` | array | `['tank-h']` | Xem dưới |

`roofItems` phần tử: `'tank-h'` (bồn inox nằm), `'tank-v'` (bồn đứng), `'solar'` (máy NLMT), `'antenna'`, `'ac'` (cục nóng, có thể nhiều), `'pots'` (chậu cây). Vị trí do seed quyết định trong vùng mái trống, tránh chồng nhau.

### 2.6 Phía mặt bên & sau
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `sideAC` | int 0–4 | 1 | Cục nóng treo tường hồi |
| `sideAd` | bool | false | Mảng quảng cáo sơn trên tường hồi (khối chữ trừu tượng) |
| `backWindows` | bool | true | Cửa sổ nhỏ mặt sau |

### 2.7 Ánh sáng (trạng thái, không phải hình)
| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `lit` | number 0–1 | 0.6 | Tỉ lệ cửa sổ sáng khi "đêm" |
| `nightOrder` | number | ngẫu nhiên | Thứ tự bật đèn trong cascade |

## 3. Preset v1

Kích thước theo m cho dễ đọc (×10 khi vào code).

| Preset | Mô tả | w × d | floors | ground | balcony | roof | roofItems | khác |
|---|---|---|---|---|---|---|---|---|
| `cap4-tile` | Nhà cấp 4 mái ngói | 5 × 12 | 0 | wood | — | tile | — | `shop:false` |
| `cap4-metal` | Cấp 4 mái tôn, bán hàng | 4.5 × 10 | 0 | fold | — | metal2 | — | `awning:'fabric'` |
| `1f-flat` | 1 tầng mái bằng | 4 × 12 | 0 | roll | — | flat | tank-h | `parapet:6` |
| `2f-balcony` | 2 tầng có ban công | 4 × 14 | 1 | fold | rail | flat | tank-h, pots | |
| `3f-tank` | 3 tầng, bồn nước | 4 × 15 | 2 | roll | rail | flat | tank-h, solar | |
| `4f-shop` | 4 tầng, tầng 1 cửa kính | 4.5 × 16 | 3 | glass | solid | flat | tank-v, ac | `signs:[{type:'facade'},{type:'projecting-vertical'}]` |
| `tube-5f-cage` | Nhà ống 5 tầng chuồng cọp | 3.8 × 18 | 4 | fold | cage | flat | tank-h, ac, antenna | `overhang:8` |
| `tube-6f-hut` | Nhà ống 6 tầng có tum | 4 × 18 | 5 | roll | rail | flat | tank-v, solar | `stairHut:true` |
| `tube-narrow-7f` | Nhà siêu mỏng 7 tầng | 3 × 15 | 6 | glass | rail | flat | tank-v | `windowsPerFloor:1`, `sideAd:true` |
| `corner-L` | Nhà góc chữ L | 7 × 12 | 3 | glass | solid | flat | tank-h ×2, ac | `shape:'L'` |
| `corner-chamfer` | Nhà góc vát | 6 × 6 | 4 | glass | rail | flat | tank-h | `shape:'chamfer'`, `signs:[{type:'projecting-round'}]` |
| `old-villa` | Biệt thự / nhà cũ kiểu Pháp | 9 × 12 | 1 | wood | solid | tile | — | `window:'arch'`, `shop:false`, `wall:'paint-old'` |

Mục tiêu dài hạn: 20–50 preset. Thêm preset **không được** đòi sửa renderer (tiêu chí S3).

## 4. Ràng buộc hợp lệ

| Luật | Xử lý khi vi phạm |
|---|---|
| `w ≥ 25` (2.5 m) | Báo lỗi |
| `floors ≤ 9` | Kẹp về 9, cảnh báo |
| `roof !== 'flat'` → không có `stairHut`, `roofItems` chỉ còn `antenna` | Tự loại, cảnh báo |
| `floors === 0` → `balcony = 'none'`, `overhang = 0` | Tự sửa |
| `overhang + balconyDepth ≤ 20` | Kẹp |
| `shape:'L'` cần `shapeParam.cutW < w`, `cutD < d` | Báo lỗi |
| `id` trùng trong cảnh | Báo lỗi |

"Báo lỗi" = throw khi build/test; trên trang thì vẽ khối placeholder có viền nét đứt và `console.error`.

## 5. Ví dụ

```js
// dùng preset nguyên bản
{ id: 'TH-03', preset: 'tube-5f-cage', x: 120, y: 0, facing: 'S' }

// preset + ghi đè
{ id: 'TH-04', preset: 'tube-5f-cage', x: 158, y: 0, facing: 'S',
  floors: 6, roof: 'metal1', roofItems: ['tank-h', 'ac', 'ac'], shopName: 'SỬA XE' }

// không preset, tự khai báo
{ id: 'CB-11', x: 0, y: 300, w: 45, d: 140, facing: 'E',
  floors: 2, ground: 'wood', shop: false, balcony: 'solid', roof: 'tile' }
```
