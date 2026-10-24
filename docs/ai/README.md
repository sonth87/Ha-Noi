# Tài liệu cho AI — đọc trước khi làm bất cứ việc gì

File này dành cho trợ lý AI (Claude Code) làm việc trên dự án. Root `CLAUDE.md` import file này.

## 1. Bối cảnh trong 30 giây

- **Dự án**: mô hình tương tác, phong cách iso-glow, của ngã tư **Thái Hà – Tây Sơn – Chùa Bộc** (Hà Nội), mỗi nhánh phố dài 130 m. Bốn góc là tòa Thái Bình (Việt Tower), Novotel, Vườn hoa Thủy Lợi và Vườn hoa Công Đoàn.
- **Monorepo** (pnpm workspace, ADR-032):

  | Thư mục | Là gì | Trạng thái |
  |---|---|---|
  | `apps/svg/` | App cũ: SVG 2D, kernel iso, xoay 4 góc. Có core, tài liệu, test riêng | **Đóng băng** (A14) |
  | `apps/city3d/` | App mới: three.js, chế độ 2D (camera iso khóa) và 3D (xoay tự do) | Có (M3) |
  | `packages/core/` | Mô hình thành phố, generator nhà + preset, luật điền phần thiếu, sửa tay, giao thông, rng | Có (M2) |
  | `packages/osm-data/` | Bản trích OpenStreetMap thô + script tải. Chỉ dữ liệu | Có (M2) |
  | `packages/osm-import/` | Chuyển OSM → mô hình thành phố; cấu hình + sửa tay từng khu | Có (M2) |
  | `packages/theme/` | Token màu, bảng màu nhấn (dùng chung) | Có (M2) |

- **Hướng đi**: dữ liệu (OSM + sửa tay) → mô hình thành phố (core) → bộ vẽ 3D. Thêm phố, thêm nhà là **thêm dữ liệu**, không sửa bộ vẽ. OSM cho khung (đường, vị trí và mặt bằng nhà, cầu, vườn); generator nhà và luật trong core điền phần OSM thiếu (số tầng, vỉa hè, đồ phố, chi tiết mặt tiền); công trình đặc biệt dựng tay, gắn với id OSM.
- **Trọng tâm**: generator nhà có tham số + preset, thêm nhiều kiểu nhà để dựng hàng loạt; cơ chế chất lượng nhiều mức (mức chi tiết, mật độ xe, tắt/bật dây điện, tầm nhìn xa).
- **Stack**: TypeScript (strict), pnpm workspace, Vite, React cho vỏ giao diện, three.js cho app mới (ADR-031).
- **Ngôn ngữ**: tài liệu và trao đổi bằng **tiếng Việt**; tên trong code bằng **tiếng Anh**.
- **Người dùng** muốn mọi thứ **minh bạch, đầy đủ**: kế hoạch, kiến trúc, checklist, quyết định đều được ghi lại và cập nhật. Người dùng hay hỏi trước để chốt phương án; **chỉ làm khi người dùng bảo "ok"**.

## 2. Thứ tự đọc

1. [../plan/checklist.md](../plan/checklist.md): đang ở bước nào, việc nào đang làm.
2. [../plan/roadmap.md](../plan/roadmap.md): mục tiêu và DoD của bước hiện tại.
3. [../architecture/decisions.md](../architecture/decisions.md): đã chốt gì (ADR-032 trở đi; ADR-001…031 ở `apps/svg/docs/architecture/decisions.md`). **Không làm ngược ADR đã chốt** khi chưa hỏi người dùng.
4. [conventions.md](conventions.md) và [workflow.md](workflow.md).
5. Khi đụng tới dữ liệu: [city-model](../architecture/city-model.md), [osm-import](../architecture/osm-import.md), [house-spec](../architecture/house-spec.md). Bộ phận nhà của app cũ (`apps/svg/docs/architecture/components.md`) là cơ sở cho nhà 3D ở M4.
6. `.claude/skills/iso-glow/SKILL.md`: luật thẩm mỹ; phần **3D mode** là nguồn tham khảo cho app mới. Chỉ dùng làm tham khảo; không nhúng template vào app.

## 3. Luật bắt buộc

| # | Luật |
|---|---|
| A1 | Mỗi việc làm xong đều **cập nhật [checklist](../plan/checklist.md)**. Đủ DoD của bước thì đánh dấu trong [roadmap](../plan/roadmap.md). |
| A2 | Mọi lựa chọn kỹ thuật không hiển nhiên (thêm thư viện, đổi cấu trúc, đổi luật) đều **thêm một ADR** vào [decisions](../architecture/decisions.md). Đổi quyết định cũ thì thêm ADR mới, không xóa ADR cũ. |
| A3 | Code đổi thì tài liệu liên quan đổi **trong cùng lần làm**. Tài liệu không được lệch khỏi code. |
| A4 | Không làm việc ngoài bước hiện tại. Ý mới ghi vào backlog trong checklist. |
| A5 | Không thêm dependency khi chưa có ADR. |
| A6 | Trước khi báo xong: `pnpm typecheck && pnpm lint && pnpm test` ở thư mục gốc (chạy mọi gói). Lỗi thì báo nguyên văn, không giấu. |
| A7 | **Không dùng tự động hóa trình duyệt** (Playwright, Puppeteer, Chrome headless). Chạy dev server và nhờ người dùng kiểm bằng mắt. App SVG: được tự soát hình bằng SVG độc lập + `qlmanage` (xem `apps/svg/docs/ai/README.md`). App 3D: kiểm hình học bằng test Node (three.js chạy được không cần WebGL), còn hình ảnh thì nhờ người dùng. |
| A8 | Giữ luật thẩm mỹ iso-glow: một màu nhấn chỉ trên thứ đang sống; màu chỉ qua token; nét 1 px ở mọi mức zoom; theme sáng không glow. |
| A9 | Không logo, không chữ thương hiệu thật. |
| A10 | Tôn trọng luật phụ thuộc giữa các gói và tầng (ghi trong [conventions](conventions.md)). Không tắt luật ESLint để lách. |
| A11 | Báo cáo trung thực: thứ gì chưa kiểm bằng mắt thì nói rõ là chưa kiểm. |
| A12 | Không commit hay push khi người dùng chưa yêu cầu. |
| A13 | **Tòa nhà thật lấy mặt bằng và số tầng từ OpenStreetMap**, không đoán từ ảnh. Giữ đúng tỉ lệ thật. Ảnh của người dùng chỉ để đối chiếu và bổ sung chi tiết. Cách làm ở §5. Ghi id OSM vào dữ liệu và chú thích (ADR-030). |
| A14 | **`apps/svg` đóng băng** (ADR-032): không sửa, không thêm tính năng. Chỉ được sửa khi người dùng yêu cầu rõ, hoặc khi đổi cấu trúc repo làm nó không chạy được nữa (sửa tối thiểu để chạy lại, và ghi vào checklist). Script chạy app cũ luôn được giữ. |
| A15 | Dữ liệu OSM theo giấy phép **ODbL**: app hiển thị "© OpenStreetMap contributors"; gói `osm-data` ghi rõ nguồn và ngày tải. |
| A16 | **Tổ chức thư mục riêng theo Quốc gia / Thành phố & Quy trình Rà soát 13 Nhóm Công trình Bắt buộc khi mở rộng vùng mới (ADR-054, ADR-055)**: (1) Mỗi quốc gia và thành phố **bắt buộc có thư mục lưu trữ riêng** cho dữ liệu di tích/công trình (`packages/osm-import/src/cities/<country>/<city>/`) và bộ dựng 3D chuyên biệt (`apps/city3d/src/render/landmarks/<country>/<city>/`). (2) **Mỗi khi thêm bất kỳ vùng, địa danh, tỉnh, thành phố, quận, huyện, phường, xã mới nào**, bắt buộc phải đi rà soát toàn bộ khu vực đó theo **13 nhóm công trình chuẩn** (Cửa ô/cổng thành/thành cổ, Cơ quan Trung ương Đảng/Chính phủ/Bộ ngành/Nhà khách, Nhà thờ & tôn giáo, Đài tưởng niệm & tượng đài, Danh thắng đô thị/phố cổ/chợ cổ, Đền/phủ/đạo quán, Chùa cổ & thiền viện, Đình cổ & cổng làng, Công trình văn hóa/giáo dục/y tế thời kỳ trước, Bảo tàng & trung tâm triển lãm, Cao ốc & trung tâm thương mại, Khách sạn lớn, Cầu lớn & công trình thể thao/hội nghị) để lập dữ liệu và vẽ 3D riêng cẩn thận cho từng công trình — tuyệt đối không để sót hoặc vẽ thành khối hộp sơ sài. |

## 4. Lệnh (ở thư mục gốc)

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test   # mọi gói
pnpm build                                 # mọi app

pnpm fetch:osm nga-tu-thai-ha               # tải lại dữ liệu OSM (cần mạng)

# app SVG cũ (đóng băng)
pnpm dev:svg        # http://localhost:5173 (trang thử 3D cũ: /lab-3d.html)
pnpm test:svg | pnpm build:svg | pnpm lint:svg | pnpm typecheck:svg
```

```bash
# app 3D mới
pnpm dev:3d         # http://localhost:5190
pnpm test:3d | pnpm build:3d | pnpm lint:3d | pnpm typecheck:3d
```

## 5. Lấy hình khối từ OpenStreetMap & Quy trình Rà soát 13 Nhóm Công trình (luật A13, A16)

Bản đồ 3D f4map (`demo.f4map.com/#lat=21.0096812&lon=105.8237414&zoom=20`) vẽ từ chính dữ liệu OSM, nên dùng nó để xem nhanh, dùng OSM để lấy số. Từ M2 việc này đã thành code: dữ liệu ở `packages/osm-data`, chuyển đổi và sửa tay ở `packages/osm-import`, chi tiết ở [osm-import](../architecture/osm-import.md). Quy trình dưới đây là nguyên tắc; **sửa số tầng, kiểu nhà thì sửa trong `packages/osm-import/src/cities/<country>/<city>/`, không sửa file dữ liệu**.

1. **Tải**: `pnpm fetch:osm <khu>` (API chính `api/0.6/map.json`; các máy chủ Overpass từng trả lỗi 406; curl cần `--http1.1`). Không gửi thông tin cá nhân trong User-Agent.
2. **Tìm**: way có tag `building` là cả tòa; `building:part` là từng phần, có `building:levels`, có khi có `height` / `min_height`. Đường: `highway` (+ `lanes`, `oneway`, `bridge`, `layer`, `turn:lanes`); cầu: `man_made=bridge`; vườn: `leisure=park`, `landuse=grass`; đèn và vạch: `highway=traffic_signals` / `crossing`.
3. **Đổi toạ độ** (`frame.ts`): lat/lon → mét, gốc ở tâm nút giao, **xoay 62.5°** để Tây Sơn nằm theo trục x (đông = Ô Chợ Dừa), Thái Hà theo trục y (bắc âm).
4. **OSM thiếu gì ở khu này** (khảo sát 2026-10-21): 121/123 tòa không có số tầng; đường không có `width`; không có vỉa hè; gần như không có cây, cột điện, đèn đường. Những thứ này do luật và generator trong core sinh ra.
5. **Lô phải chứa đủ tòa thật.** Không thu nhỏ tòa nhà (thu nhỏ làm lệch dáng).
6. **Đối chiếu** với ảnh của người dùng hoặc f4map. Số tầng OSM khác số liệu chính thức thì theo số chính thức và ghi chỗ lệch (ví dụ Novotel: OSM 26 tầng, khách sạn công bố 27).
7. **Cấu trúc thư mục riêng theo Quốc gia / Thành phố & Quy trình Rà soát 13 Nhóm Công trình Bắt buộc (ADR-055)**:
   - Dữ liệu đô thị và danh mục công trình của mỗi thành phố đặt tại `packages/osm-import/src/cities/<country>/<city>/` (`districts.ts`, `places.ts`, `heritage-notes.ts`, `overrides.ts`, `catalog-part1.ts`, `catalog-part2.ts`, `landmarks-catalog.ts`, `index.ts`).
   - Bộ dựng 3D chuyên biệt đặt tại `apps/city3d/src/render/landmarks/<country>/<city>/` (dùng chung helper hình học tại `apps/city3d/src/render/landmarks/shared.ts`).
   - Mỗi khi thêm bất kỳ **vùng, địa danh, tỉnh, thành phố, quận, huyện, phường, xã** mới nào, bắt buộc rà soát và lập hồ sơ dữ liệu + mô hình 3D riêng cho đủ **13 nhóm**:
     1. *Cửa Ô, Cổng Thành & Thành Quách Cổ*
     2. *Toà nhà Chính phủ, Cơ quan Trung ương Đảng & Nhà khách Nhà nước*
     3. *Hệ thống Nhà thờ (Công giáo, Tin lành) & Công trình Tôn giáo*
     4. *Đài Tưởng niệm, Tượng đài & Di tích Chiến công*
     5. *Cụm danh thắng Đô thị, Phố Cổ & Chợ Truyền thống*
     6. *Tứ Trấn, Đền, Phủ & Đạo Quán*
     7. *Chùa Cổ, Thiền viện & Quần thể Phật giáo*
     8. *Đình Cổ & Kiến trúc Làng Xã Ngoại thành (Cổng làng, nhà cổ)*
     9. *Công trình Văn hóa, Giáo dục & Y tế thời kỳ trước (Pháp thuộc / Đông Dương)*
     10. *Bảo tàng & Trung tâm Triển lãm*
     11. *Toà nhà Cao tầng, Trung tâm Thương mại & Tổ hợp Hiện đại*
     12. *Khách sạn Sang trọng & Nổi tiếng*
     13. *Cầu, Hạ tầng, Thể thao & Công trình Văn hoá Quy mô lớn*

## 6. Bẫy đã biết

- Thư mục dự án có **dấu cách** ("My City"): trong config dùng `fileURLToPath`, không dùng `URL.pathname`; trong shell luôn đặt đường dẫn trong ngoặc kép.
- Test của `apps/svg` đọc skill iso-glow theo đường dẫn tương đối (`src/iso/kernel.test.ts`). Chuyển thư mục thì sửa đường dẫn đó.
- Bẫy riêng của SVG (thứ tự vẽ, mặt khuất, `innerHTML`…) ở `apps/svg/docs/ai/README.md` §5.
- three.js: nét dùng `LineMaterial` phải cập nhật `resolution` khi đổi kích thước; mặt và nét trùng nhau phải dùng `polygonOffset` để không nhấp nháy; xử lý mất ngữ cảnh WebGL.
