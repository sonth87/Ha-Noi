# Hướng dẫn sử dụng

> Các mục ghi **(từ Px)** chỉ dùng được khi phase đó xong. Trạng thái hiện tại xem ở [checklist](../plan/checklist.md).

## 1. Mở mô hình (từ P0)

Cần Node.js ≥ 20.19 và pnpm.

```bash
cd "My City"
pnpm install      # lần đầu
pnpm dev          # mở địa chỉ Vite in ra (thường là http://localhost:5173)
```

Sửa code hay dữ liệu thì trang tự cập nhật.

| Muốn | Lệnh | Kết quả |
|---|---|---|
| Bản build để deploy | `pnpm build` rồi `pnpm preview` | Thư mục `dist/` tĩnh, đưa lên host nào cũng được |
| Một file gửi cho người khác (từ P4) | `pnpm build:single` | Một file HTML, mở thẳng bằng trình duyệt |

## 2. Giao diện
- **Thanh bên trái**: chọn figure (Catalog, Street, Crossroads).
- **Góc trên**: đổi màu đèn (palette `city`: Sodium, Tungsten, Neon, Signal, Dusk, Moon) và theme sáng/tối.
- **Góc dưới phải** (readout): trạng thái hiện tại, ví dụ `view S · 23/40 lit · night`.

## 3. Điều khiển

| Phím / thao tác | Tác dụng | Có ở | Từ |
|---|---|---|---|
| Click vào nhà | Bật/tắt đèn căn đó | tất cả | P1 |
| `Q` / `E` | Xoay góc nhìn 90° | tất cả | P1 |
| `←` / `→` | Chọn căn trước / sau | Catalog | P1 |
| `Space` / `Enter` | Bật/tắt đèn căn đang chọn | Catalog | P1 |
| `R` | Sinh căn nhà ngẫu nhiên ở ô đang chọn | Catalog | P1 |
| `X` | Cắt lớp: hạ dãy nhà phía trước xuống tầng 1 | Street, Crossroads | P3 |
| `N` | Ngày ↔ đêm | Street, Crossroads | P3 |
| `T` | Bật/tắt dòng xe | Street, Crossroads | P3 |
| Thêm `?demo` vào URL | Mở ra đã là đêm, đèn sáng, xe chạy | tất cả | P3 |

**Vì sao cần xoay và cắt lớp?** Trong hình isometric chỉ nhìn được hai mặt đứng của mỗi khối. Dãy nhà phía gần người xem quay lưng lại và che mất mặt đường. Xoay góc nhìn để thấy mặt tiền phía kia; cắt lớp để nhìn bao quát ngay.

## 4. Thêm hoặc sửa nhà (từ P1)

### 4.1 Dùng một preset có sẵn
Mở file layout của cảnh (`src/core/layout.ts` hoặc dữ liệu cảnh tương ứng) và thêm một dòng:
```js
{ id: 'TH-21', preset: 'tube-5f-cage', facing: 'S' }
```
Danh sách preset và ý nghĩa từng trường: [house-spec](../architecture/house-spec.md).

### 4.2 Chỉnh một căn
Ghi đè trường cần đổi:
```js
{ id: 'TH-21', preset: 'tube-5f-cage', floors: 6, roof: 'metal1', signText: 'SỬA XE' }
```

### 4.3 Tạo preset mới
Thêm vào `src/core/presets.ts`. TypeScript sẽ báo lỗi ngay nếu sai tên trường hoặc sai giá trị:
```js
'tube-4f-shop-awning': { w: 42, d: 160, floors: 3, ground: 'fold', awning: 'fabric',
                         balcony: 'cage', roofItems: ['tank-h', 'ac'] },
```
Lưu file, trang `pnpm dev` tự cập nhật; xem căn mới trong Catalog. Thêm preset **không cần sửa code vẽ**. Nếu bắt buộc phải sửa code vẽ thì đó là lỗi thiết kế, cần báo lại.

### 4.4 Thử nhanh trong Catalog (từ P2)
Chọn một căn rồi đổi tham số bằng bảng điều khiển: số tầng, mái, ban công, cửa, tầng 1, vật trên mái. Khi đã ưng ý, chép bộ tham số vào `src/core/presets.ts`.

## 5. Kiểm tra
```bash
pnpm test         # chạy test
pnpm typecheck    # kiểm kiểu TypeScript
pnpm lint         # kiểm quy ước code và luật phụ thuộc giữa các tầng
```

## 6. Sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Trang trắng | Lỗi TS/JS sau khi sửa | Xem lớp phủ lỗi của Vite hoặc DevTools → Console; chạy `pnpm typecheck` |
| `pnpm dev` không chạy | Chưa `pnpm install` hoặc Node quá cũ | `pnpm install`; kiểm `node -v` ≥ 20.19 |
| Một căn là khối viền nét đứt | Spec không hợp lệ (ví dụ `w` quá nhỏ, `id` trùng) | Xem Console, đối chiếu luật hợp lệ trong [house-spec](../architecture/house-spec.md) |
| Khối xa đè lên khối gần | Lỗi thứ tự vẽ | Ghi lại góc nhìn (readout) và vị trí rồi báo lỗi |
| Giật khi xe chạy | Quá nhiều phần tử phát sáng | Tắt xe (`T`), báo lại số đo để xử lý |
