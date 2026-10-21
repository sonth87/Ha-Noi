# Roadmap (monorepo, app 3D mới)

Roadmap P0–P5 của app SVG cũ ở [apps/svg/docs/plan/roadmap.md](../../apps/svg/docs/plan/roadmap.md) (đóng băng). Roadmap này là cho monorepo và app `city3d` (ADR-032). Mỗi bước chỉ được đánh dấu xong khi mọi DoD đạt và người dùng đồng ý. Việc chi tiết ở [checklist](checklist.md).

```
M1 Tách monorepo ──► M2 Các gói chung ──► M3 Khung city3d ──► M4 Nhà 3D nhiều mức chi tiết ──► M5 Đồ phố, giao thông, tầm nhìn
   (app cũ đóng băng)   core · osm · theme    2D ↔ 3D, OSM       + nhiều kiểu nhà                  + cơ chế chất lượng đầy đủ
```

Phạm vi dữ liệu: khu ngã tư Thái Hà – Tây Sơn – Chùa Bộc (mỗi nhánh 130 m). Mở rộng khu vực là sau M5.

---

## M1 · Tách monorepo
**Mục tiêu**: chuyển sang pnpm workspace; app SVG chuyển nguyên trạng vào `apps/svg` và đóng băng.
**Bàn giao**: `pnpm-workspace.yaml`, `package.json` gốc với script `dev:svg`, `build:svg`, `test:svg`, `lint:svg`, `typecheck:svg`, và các lệnh chạy mọi gói; `apps/svg/` (code, test, tài liệu); `docs/` mới ở gốc; ADR-032.
**DoD**:
- [x] `pnpm typecheck:svg && pnpm lint:svg && pnpm test:svg && pnpm build:svg` sạch từ thư mục gốc.
- [x] Code app cũ không đổi gì ngoài đường dẫn test bắt buộc (ADR-032).
- [x] Người dùng cho đi tiếp (2026-10-21).

## M2 · Các gói chung
**Mục tiêu**: có bộ khung dữ liệu và mô hình thành phố mà app mới dựa vào.
**Bàn giao**:
- `packages/theme`: token CSS + bảng màu nhấn (chép từ app cũ).
- `packages/osm-data`: bản trích OSM khu ngã tư (JSON) + script tải lại + ghi nguồn, ngày, giấy phép.
- `packages/core`: mô hình thành phố (phố là polyline + mặt cắt, nút giao, tòa nhà là đa giác + các phần theo tầng, lô, đồ phố), generator nhà + preset chuyển từ app cũ, rng, giao thông, lớp sửa tay theo id OSM.
- `packages/osm-import`: đọc OSM → mô hình thành phố: đổi toạ độ, đọc tag, suy ra phần thiếu bằng luật (bề rộng đường từ số làn, số tầng nhà ống từ mặt bằng…).
**DoD**:
- [x] Từ dữ liệu OSM của khu ngã tư, `osm-import` ra một mô hình thành phố đủ: các phố chính và ngõ, nút giao, cầu vượt, 2 vườn hoa, mọi tòa nhà, Việt Tower và Novotel đúng mặt bằng và số tầng.
- [x] Mỗi tòa có số tầng (từ OSM, sửa tay, hoặc luật) và kiểu nhà; cùng dữ liệu thì ra cùng kết quả.
- [x] Test cho mọi hàm thuần; luật phụ thuộc giữa các gói cưỡng chế bằng ESLint.
- [x] Đặc tả mô hình thành phố và đặc tả nhà có trong `docs/`.
- [ ] Người dùng duyệt.

## M3 · Khung city3d
**Mục tiêu**: app mới vẽ được khu ngã tư từ mô hình thành phố, ở cả 2D và 3D.
**Bàn giao**: `apps/city3d` (Vite + React vỏ + three.js); bộ vẽ tòa nhà, đường, vỉa hè, nút giao, cầu vượt, vườn; camera 2D (iso khóa 4 góc, xoay 90°) ↔ 3D (xoay tự do); bật đèn từng tầng / từng nhà, ngày/đêm; theme sáng/tối; khung bảng chất lượng (chỉ vài tùy chọn đầu); fps; dòng "© OpenStreetMap contributors".
**DoD**:
- [x] Mọi thứ trong mô hình thành phố đều được vẽ, không cần code riêng cho từng tòa (trừ công trình dựng tay).
- [x] Ở chế độ 2D, hình gần như trùng app SVG ở cùng góc (2 tòa tháp).
- [x] Người dùng duyệt phong cách và độ mượt (2026-10-21).

## M4 · Nhà 3D nhiều mức chi tiết + nhiều kiểu nhà
**Mục tiêu**: generator nhà dựng nhà 3D ở các mức L0–L3, đủ kiểu để dựng hàng loạt.
**Bàn giao**: bộ phận nhà 3D (tầng trệt, cửa, ban công, mái, biển, phụ kiện mái…) theo mức chi tiết; kiểu nhà mới (nhà ống, nhà cấp 4, nhà phố có sân, biệt thự, tập thể, chung cư thấp…); LOD theo khoảng cách; gộp hình học / instancing.
**DoD**:
- [x] Mỗi kiểu nhà có preset, dựng được ở 4 mức chi tiết.
- [x] Đổi mức chi tiết trong bảng chất lượng có hiệu lực ngay.
- [ ] Cả khu ngã tư ở mức Cao vẫn mượt trên máy người dùng (số fps ghi vào checklist).

## M5 · Đồ phố, giao thông, tầm nhìn + cơ chế chất lượng đầy đủ
**Mục tiêu**: phố sống như app cũ, và chỉnh được nặng/nhẹ.
**Bàn giao**: cột điện, dây điện (xung sáng), đèn đường, cây, đèn tín hiệu, xe (theo mô hình giao thông của core); tùy chọn mật độ xe, bật/tắt cột và dây điện, cây (tắt / đơn giản / đầy đủ), đèn đêm và glow, các lớp nét, khử răng cưa, độ phân giải; tầm nhìn xa (chia ô, mờ ở rìa); mức chung Thấp → Rất cao; tự hạ chất lượng khi fps thấp; cài đặt nhớ theo máy.
**DoD**:
- [x] Mỗi tùy chọn có hiệu lực ngay, không phải tải lại trang.
- [ ] Mức Thấp chạy mượt trên máy yếu; mức Rất cao đầy đủ chi tiết như app cũ.
- [ ] Người dùng duyệt.

---

## Rủi ro

| # | Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|---|
| R1 | Dữ liệu OSM thiếu (số tầng, vỉa hè, bề rộng đường) làm khu phố trông giả | Cao | Trung bình | Luật suy ra + lớp sửa tay theo id OSM; người dùng đối chiếu bằng ảnh |
| R2 | Hình học nút giao (nhiều đường gộp) khó dựng tự động | Trung bình | Trung bình | Bắt đầu bằng đa giác hợp đơn giản; nút phức tạp dùng sửa tay |
| R3 | Chi tiết vẽ tay của app cũ (tán cây, biển chữ, xung dây điện) khó giữ phong cách ở 3D | Trung bình | Trung bình | Làm thử từng loại, người dùng duyệt từng loại |
| R4 | Nhiều draw call làm tụt fps | Trung bình | Cao | Gộp hình học, instancing, LOD, chia ô từ đầu |
| R5 | Mặt bằng nhà nhỏ trong OSM thô (4 điểm), hở hoặc chồng nhau | Cao | Thấp | Luật làm sạch trong `osm-import` (gộp, nắn mép chung) |
