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
- **Thanh bên trái**: chọn cảnh (Nhà mẫu, Catalog, Phố Thái Hà, Hello; sau này Ngã tư).
- **Góc trên**: đổi màu đèn (palette `city`: Sodium, Tungsten, Neon, Signal, Dusk, Moon) và theme sáng/tối.
- **Góc dưới phải** (readout): trạng thái hiện tại, ví dụ `view S · 23/40 lit · night`.

## 3. Điều khiển

| Phím / thao tác | Tác dụng | Có ở | Từ |
|---|---|---|---|
| Click vào nhà | Bật/tắt đèn căn đó | tất cả | P1 |
| `Q` / `E` | Xoay góc nhìn 90° | tất cả | P1 |
| `←` / `→` | Chọn căn / công trình trước, sau | Catalog, Công trình | P1 |
| `Space` / `Enter` | Bật/tắt đèn căn đang chọn | Catalog | P1 |
| `R` | Sinh căn nhà ngẫu nhiên ở ô đang chọn | Catalog | P1 |
| `X` | Cắt lớp: hạ dãy nhà phía trước xuống tầng 1 (mặc định **bật** ở cảnh phố) | Phố, Ngã tư | P3 |
| `W` | Bắn một xung sáng dọc dây điện (cũng tự chạy ngẫu nhiên) | Nhà mẫu, Phố, Ngã tư | P1a |
| Con lăn chuột | Phóng to / thu nhỏ quanh con trỏ | tất cả | P3 |
| Kéo chuột (khi đã phóng to) | Di chuyển khung nhìn | tất cả | P3 |
| Nhấp đúp | Về khung nhìn gốc | tất cả | P3 |
| `N` | Ngày ↔ đêm: đèn nhà bật dần, đèn đường, biển hiệu, đèn xe; ở Ngã tư cả 2 tòa nhà, đèn vườn, đèn ăng-ten | Nhà mẫu, Catalog, Phố, Ngã tư | P1a |
| `T` | Bật/tắt dòng xe (ở Ngã tư và trang cầu vượt: dừng cả đèn giao thông) | Phố, Ngã tư, Công trình (cầu vượt) | P3 |
| Thêm `?demo` vào URL | Mở ra đã là đêm, đèn sáng, xe chạy | tất cả | P3 |

**Trang Công trình.** Xem riêng từng công trình được vẽ tay (khác Xưởng nhà là mô hình chung): tòa Thái Bình, Novotel, vườn hoa tròn, vườn cây rậm, cầu vượt Tây Sơn và nút giao. Ô chọn (dropdown) ở bảng bên phải để đổi công trình; bên dưới là mô tả cái đang xem: vị trí, số liệu, đặc điểm khi vẽ. `←`/`→` chọn, `Q`/`E` xoay, `Space` bật mọi tầng, `N` ngày/đêm, click một tầng để bật đèn tầng đó. Ở trang cầu vượt, xe chạy và đèn giao thông đổi pha như ngoài ngã tư (xe vào lại từ đầu bên kia khi ra khỏi khung, mờ dần ở hai đầu); `T` bật/tắt xe.

**Cảnh Ngã tư (P4).** Tây Sơn chạy chéo từ trái lên phải, có cầu vượt ở giữa; Thái Hà ở phía trên, Chùa Bộc phía dưới. Góc trên là tòa Thái Bình (trắng: đế 11 tầng có cánh đầu tròn và khối nêm, tháp 18 tầng đầu tròn, ăng-ten) và Novotel (tháp kính góc cong 27 tầng, hai dải trắng bậc thang, đế 5 tầng có bể bơi); góc dưới là vườn tròn và vườn cây rậm. Đèn giao thông đổi pha có số đếm ngược; xe dừng ở vạch khi đỏ, ô tô trên cầu vượt chạy thẳng. Dòng trạng thái góc dưới hiện màu đèn và số giây còn lại của mỗi phố. Tòa nhà cao che bớt phố phía sau ở một số góc: xoay `Q`/`E` hoặc phóng to.

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

### 4.4 Xưởng nhà (Fig 3)
Một căn nhà ở giữa, bảng bên phải chỉnh mọi tham số: khối (mặt tiền, sâu, số tầng, cao tầng, đua ra, **nửa hầm để xe**), tầng 1 (cửa, mở hàng, mái hiên, tên quán, 7 loại biển, tờ dán), **từng tầng trên** (cửa sổ, ban công, chậu cây, cục nóng), mái (loại, phòng tum, mái tôn, dây phơi, vật trên mái), tường hồi.
- Bảng chia nhóm thu gọn được: *Khối & mặt tiền* (kể cả kiểu tường, số gian), *Tầng 1 & vỉa hè* (cửa sắt hoa, mái hiên tôn, bày bàn ghế / xe máy / két bia), *Biển hiệu* (bật từng loại, sửa chữ từng biển), *Các tầng trên* (cửa vòm, cửa Pháp, kính lớn, lan can xây, ô văng, phơi đồ), *Mái* (tôn 1 dốc, ngói, tum thang, cục nóng, cột cờ), *Tường hồi* (quảng cáo sơn, cửa sổ nhỏ).
- **Preset**: chọn kiểu có sẵn; **Ngẫu nhiên** (hoặc `R`); **Bỏ chỉnh** về preset gốc.
- Ô **Cảnh báo** liệt kê những gì hệ thống tự sửa (ví dụ mái tôn 2 dốc thì không có phòng tum).
- **Chép JSON** rồi dán vào `src/core/presets.ts` (thêm `label`) để thành preset mới.
- `Q`/`E` xoay, `Space` bật đèn cả nhà, `N` ngày/đêm, click tầng để bật đèn.

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
