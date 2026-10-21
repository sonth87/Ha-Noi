# Nhật ký quyết định (ADR)

ADR-001 … ADR-031 là của app SVG, giữ nguyên ở [apps/svg/docs/architecture/decisions.md](../../apps/svg/docs/architecture/decisions.md) (đóng băng). Các ADR mới bắt đầu từ ADR-032 và ghi ở đây. Mẫu ADR: [workflow](../ai/workflow.md).

---

### ADR-032 · Monorepo: app SVG đóng băng, app 3D làm mới trên các gói chung
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "tách thành 2 app riêng và không động vào nữa. vẫn giữ script để chạy chứ không bỏ đi", rồi "ok")
- **Bối cảnh**: Người dùng muốn xoay tự do nhiều góc. Kiến trúc SVG chỉ đúng với bước 90° (ADR-007, ADR-024 của app cũ). Trang thử three.js (ADR-031) cho thấy 3D giữ được phong cách iso-glow ở các khối lớn và mượt hơn. Muốn giữ app cũ nhưng tập trung làm cái mới, và về sau thành phố được **dựng tự động từ dữ liệu** (OSM + sửa tay), thêm phố, thêm nhà không phải sửa bộ vẽ.
- **Quyết định**:
  - **pnpm workspace** với `apps/*` và `packages/*`.
  - **`apps/svg`**: toàn bộ app cũ chuyển nguyên trạng (code, core cũ, test, tài liệu, trang thử 3D). **Đóng băng**: không sửa, không phụ thuộc gói mới (luật A14). Vẫn chạy bằng `pnpm dev:svg` / `test:svg` / `build:svg` ở gốc.
  - **App mới `apps/city3d`** (three.js) có chế độ 2D = camera iso khóa 4 góc và chế độ 3D = xoay tự do; **một bộ vẽ duy nhất**, không duy trì song song hai bộ vẽ.
  - **Các gói chung**: `core` (mô hình thành phố, generator nhà + preset, luật đồ phố, giao thông, rng; không biết OSM), `osm-data` (dữ liệu OSM thô + script tải, tách khỏi core theo yêu cầu người dùng), `osm-import` (OSM → mô hình thành phố), `theme` (token, bảng màu nhấn).
  - App mới **kế thừa** từ app cũ: generator nhà có tham số và preset, 2 tòa tháp theo mặt bằng OSM, các nhà cơ bản cấu hình được; mở rộng thêm nhiều kiểu nhà để dựng hàng loạt.
  - App mới có **cơ chế chất lượng**: mức chung (Thấp / Trung bình / Cao / Rất cao / Tùy chỉnh), mức chi tiết nhà L0–L3, mật độ xe, bật/tắt cột và dây điện, cây, đèn đêm và glow, các lớp nét, tầm nhìn xa (chia ô), LOD theo khoảng cách, tự hạ chất lượng khi fps thấp.
  - Phạm vi dữ liệu ban đầu: **khu ngã tư hiện tại** (mỗi nhánh 130 m); làm tốt khu này rồi mới mở rộng.
  - Tài liệu: `docs/` ở gốc cho monorepo và app mới; tài liệu app cũ ở `apps/svg/docs/` (đóng băng). Nhật ký ADR tiếp tục từ ADR-032 ở đây.
- **Lý do**: Một bộ vẽ thì không bao giờ lệch giữa 2D và 3D; 3D bỏ được cả nhóm lỗi thứ tự vẽ của SVG và mượt hơn. Giữ app cũ tách biệt và đóng băng thì nó chắc chắn không hỏng khi core mới thay đổi. OSM là dữ liệu có giấy phép riêng (ODbL) và có nhịp cập nhật riêng, nên tách thành gói riêng khỏi core.
- **Hệ quả**: Core mới là bản viết lại/tổng quát hóa của core cũ (phố là polyline cong được, nhà là đa giác bất kỳ), app cũ giữ bản core cũ của riêng nó. Lệnh chạy và đường dẫn đổi (xem `docs/ai/README.md` §4). Test kernel của app cũ phải sửa đường dẫn tới skill (`../../../../.claude/…`) vì thư mục sâu thêm 2 cấp; đây là chỗ sửa duy nhất trong code app cũ.

### ADR-033 · Mô hình thành phố tính bằng mét; giữ trang thử 3D cũ để đối chiếu
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "Q1: theo mét. Q2: giữ lại để đối chiếu, để tránh phải tự viết lại, sau đó mới xóa")
- **Quyết định**:
  - Mọi gói mới tính bằng **mét**: `x` đông (dọc trục chính của khu), `y` nam, `z` lên. Đơn vị 1 m = 10 chỉ còn trong `apps/svg`. Generator nhà chuyển sang core thì đổi hết số về mét (kể cả các hằng chiều cao vật trên mái trong `peakZ`, khoảng random trong `randomHouse`).
  - Trang thử 3D (`apps/svg/lab-3d.html`, ADR-031) **giữ lại** trong app cũ để đối chiếu khi viết `city3d`; chỉ xóa (cùng three.js của app cũ) khi `city3d` đã làm được những gì trang thử làm. Việc xóa này là ngoại lệ được người dùng cho phép với luật A14.
- **Lý do**: OSM vốn là mét, three.js không quan tâm đơn vị; một đơn vị thật thì số trong dữ liệu, tài liệu và sửa tay đọc ra ngay. Trang thử có sẵn cách dựng nét, bloom, camera; giữ để chép lại thay vì viết lại.

### ADR-034 · Cách tổ chức các gói chung
- **Trạng thái**: Đã chốt (2026-10-21, M2)
- **Quyết định**:
  - Các gói trong `packages/*` **xuất thẳng mã TypeScript** (`exports: "./src/index.ts"`), không có bước build: Vite và Vitest đọc thẳng qua liên kết workspace. Mỗi gói có `typecheck`, `lint`, `test` riêng; gốc chạy tất cả bằng `pnpm -r`.
  - `tsconfig.base.json` ở gốc, các gói kế thừa. **ESLint ở gốc** cho mọi gói mới, cưỡng chế luật phụ thuộc ở conventions §1 (core không import gói nào khác, không React/three, không DOM, không `Math.random`/`Date.now`; osm-import chỉ dùng core và osm-data; osm-data và theme không phụ thuộc gói nào). `apps/svg` giữ config ESLint riêng (đóng băng).
  - Dữ liệu OSM (`.osm.json`) được import trực tiếp như module JSON (kiểm kiểu mất khoảng 4 s với file 1,4 MB, chấp nhận được). `osm-data` được phép import `../data/*` (dữ liệu nằm cạnh `src/`); các chỗ khác vẫn cấm `../`.
  - Script tải dữ liệu viết bằng `.mjs` (Node 20 chưa chạy thẳng TypeScript); danh sách khu ở `data/areas.json` để cả script và mã TS cùng đọc.
  - **Cấu hình và sửa tay của từng khu** nằm trong `osm-import` (`src/area-<id>.ts`), không nằm cạnh dữ liệu thô: `osm-data` chỉ có những gì máy chủ OSM trả về. Cơ chế sửa tay (`applyOverrides`, khóa theo `source`) nằm trong core vì nó không phụ thuộc OSM.
  - Mô hình thành phố đặt **nhà sinh** lên cạnh mặt tiền thật của tòa nhà; `HouseSpec` mới bỏ `x`, `y`, `facing`.
  - Nút giao chỉ tính nơi **từ 3 nhánh đường xe chạy** gặp nhau; lối đi bộ không tạo nút giao.
- **Hệ quả**: Đổi một gói là app mới thấy ngay (không phải build lại). Sửa tay nào không còn khớp dữ liệu (sau khi tải lại) thì test báo ngay.

### ADR-035 · Bộ vẽ của app 3D
- **Trạng thái**: Đã chốt (2026-10-21, M3)
- **Quyết định**:
  - `apps/city3d`: Vite + React (vỏ) + three.js 0.170.0 (cùng bản với trang thử). Ba tầng `render/` (mô hình → geometry, thuần), `view/` (`CityView`, trình duyệt), `ui/` (React), luật phụ thuộc bằng ESLint gốc. Cổng dev 5190.
  - **Gom hình theo loại mặt**: cả khu là vài mesh lớn thay vì mỗi tòa một mesh (rủi ro R4). Đèn từng tầng bằng **màu theo đỉnh** trong một mesh cửa sổ duy nhất. Click → tam giác → tòa (bảng đoạn tam giác) → tầng (theo độ cao).
  - **Vật liệu không chiếu sáng**, màu chỉ từ token CSS (A8); ba lớp nét như skill iso-glow 3D: vỏ viền bóng (đẩy ra 1 px theo pháp tuyến trơn, mặt sau), nét cạnh (`EdgesGeometry` 20°), nét chi tiết (viền cửa). Bloom chỉ ở theme tối.
  - **Camera trực giao**, 2D = isometric thật khóa 4 góc (trùng app cũ), 3D = OrbitControls; chuyển giữa hai chế độ có chuyển động 450 ms.
  - Vỉa hè tự cắt khi cắt ngang lòng đường khác; góc giao giữa hai lòng đường tạm để hở (M5).
  - Mô hình dựng tay chỉ thêm chi tiết (cột ăng-ten Việt Tower), hình khối vẫn từ dữ liệu.
- **Hệ quả**: Thêm tòa / đường vào dữ liệu là app vẽ ngay. Bundle 2 MB (370 KB gzip), phần lớn là dữ liệu OSM và three.js; tách gói tải sau nếu cần.

---

## Câu hỏi mở

| # | Câu hỏi | Khi nào cần | Đang dùng |
|---|---|---|---|
| ~~Q1~~ | ~~Mét hay 1 m = 10?~~ | — | Đã chốt: mét (ADR-033) |
| ~~Q2~~ | ~~Gỡ trang thử 3D cũ khỏi app SVG?~~ | — | Đã chốt: giữ để đối chiếu, xóa khi `city3d` thay được (ADR-033) |
