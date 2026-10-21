# Checklist (monorepo, app 3D mới)

Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Cập nhật file này **mỗi khi** một việc đổi trạng thái. Checklist của app SVG cũ (P0–P5) ở [apps/svg/docs/plan/checklist.md](../../apps/svg/docs/plan/checklist.md) (đóng băng).

**Bước hiện tại: M5 — đường và nút giao, đồ phố, giao thông, chất lượng đầy đủ; code xong, chờ người dùng xem trên `pnpm dev:3d`. (M4 chưa commit.)**

## Chốt phương án (2026-10-21)
- [x] Thử three.js trên trang riêng (ADR-031, `apps/svg/lab-3d.html`)
- [x] Chọn một bộ vẽ 3D, chế độ 2D = camera iso khóa (không duy trì 2 bộ vẽ)
- [x] App SVG đóng băng, vẫn giữ script chạy
- [x] Dữ liệu OSM là gói riêng, tách khỏi core
- [x] Cơ chế chất lượng nhiều mức (ADR-032)
- [x] Phạm vi ban đầu: khu ngã tư hiện tại

## M1 · Tách monorepo
- [x] `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- [x] Chuyển app cũ vào `apps/svg/` bằng `git mv` (giữ lịch sử): `src/`, `index.html`, `lab-3d.html`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `package.json` (đổi tên `@my-city/svg`), `docs/`
- [x] `package.json` gốc: `dev:svg`, `build:svg`, `preview:svg`, `test:svg`, `lint:svg`, `typecheck:svg`; `build`, `test`, `lint`, `typecheck` chạy mọi gói
- [x] Sửa đường dẫn tới skill iso-glow trong `apps/svg/src/iso/kernel.test.ts` (sâu thêm 2 cấp)
- [x] `pnpm install` lại; kiểm kiểu, lint, 189 test, build của app cũ đều sạch từ gốc
- [x] Tài liệu mới ở `docs/`: mục lục, `ai/` (luật A1–A15, thêm A14 đóng băng, A15 ODbL), `architecture/decisions.md` (ADR-032), `plan/` (roadmap M1–M5, checklist này)
- [x] Đánh dấu đóng băng ở đầu tài liệu app cũ; `apps/svg/README.md`
- [x] `README.md` và `CLAUDE.md` ở gốc trỏ sang tài liệu mới
- [x] Người dùng cho đi tiếp ("tiếp đi", 2026-10-21)

## M2 · Các gói chung
- [x] Q1 → mét, Q2 → giữ trang thử 3D để đối chiếu (ADR-033)
- [x] Hạ tầng: `tsconfig.base.json`, ESLint gốc với luật phụ thuộc giữa các gói, công cụ dùng chung ở gốc (ADR-034)
- [x] `packages/theme`: token CSS + bảng màu nhấn (chép từ app cũ), 1 test
- [x] `packages/osm-data`: bản trích khu ngã tư (tải 2026-10-21, ±300 m quanh nút giao), `areas.json`, `pnpm fetch:osm <id>`, README ghi nguồn / giấy phép, kiểu OSM thô, 2 test
- [x] `packages/core`: hình học 2D, mô hình thành phố, generator nhà + 8 preset chuyển sang mét, luật điền phần thiếu (đường, cầu, kiểu nhà, số tầng, mặt tiền, nhà sinh), sửa tay, rng, giao thông (chuyển sang mét); 32 test
- [x] `packages/osm-import`: phép chiếu, bảng tag, `importArea` 7 bước, cấu hình + sửa tay khu ngã tư (Việt Tower 18 tầng, Novotel 27 tầng kính), báo cáo; 9 test
- [x] Tài liệu: [city-model](../architecture/city-model.md), [osm-import](../architecture/osm-import.md), [house-spec](../architecture/house-spec.md) (mét), [glossary](../product/glossary.md), ADR-033, ADR-034
- [x] `pnpm typecheck && pnpm lint && pnpm test` ở gốc: 5 gói, 233 test
- [x] Người dùng duyệt M2 ("ok", 2026-10-21)

## M3 · Khung city3d
- [x] Scaffold `apps/city3d` (Vite + React + three 0.170.0), script `dev:3d` / `build:3d` / `test:3d` / `lint:3d` / `typecheck:3d`, luật phụ thuộc `render/` · `view/` · `ui/` (ADR-035)
- [x] `render/batch.ts`: gom hình theo loại mặt, vỏ viền bóng, nét cạnh, nét chi tiết, cửa sổ màu theo đỉnh, bảng đoạn tam giác để click
- [x] `render/buildings.ts`: phần nhà → lăng trụ; cửa theo tầng (vách kính / dải kính / cửa đục lỗ + mặt tiền cửa hàng), tường giáp nhà bên; cột ăng-ten + đèn báo Việt Tower
- [x] `render/streets.ts`: lòng đường, vỉa hè nâng tự cắt ở chỗ giao, vạch làn, cầu vượt (dốc, lan can, trụ), vùng
- [x] `view/CityView.ts`: camera 2D (iso khóa 4 góc) ↔ 3D (xoay tự do), Q/E, click bật tầng, ngày/đêm, theme, bloom, fps, mất ngữ cảnh WebGL
- [x] `view/quality.ts` + bảng chất lượng: 4 mức + tùy chỉnh, nhớ theo máy
- [x] Ghi nguồn "© OpenStreetMap contributors" (A15)
- [x] 5 test hình học (Node); kiểm kiểu, lint, build sạch
- [x] Tài liệu: [city3d](../architecture/city3d.md), [hướng dẫn](../user/guide.md), ADR-035
- [x] Người dùng xem và duyệt ("trông ổn đấy", 2026-10-21); chưa có số fps cụ thể

## M4 · Nhà 3D nhiều mức chi tiết
- [x] Commit M1–M3 lên nhánh `monorepo-3d` (3 commit)
- [x] Core: 5 preset mới, `presetPool` theo loại / bề rộng / số tầng, `houseStoreys` (chiều cao tầng nhà sinh khớp spec, kể cả nửa hầm)
- [x] Sửa lỗi đổi đơn vị trong `peakZ` (nóc mái tôn `0,3 × w`), có test
- [x] `render/house3d.ts`: nhà sinh ở L2 (tầng trệt + cửa, nửa hầm, mái hiên, biển ngang, 8 kiểu cửa, 4 kiểu ban công, đua ra, mái bằng + tường chắn, phòng tum, tum thang, mái tôn, mái dốc, cửa nhỏ các tường lộ) và L3 (biển chìa, standee, cột xoắn, biển lớn, biển hai bên, ô văng, cục nóng, chậu cây, quần áo, đồ trên mái)
- [x] `render/buildings.ts`: 4 mức L0–L3; mặt tiền theo loại cho khối lớn (ban công, mặt kính cửa hàng, dải kính văn phòng; L3 cục nóng, bồn nước mái)
- [x] `render/city.ts`: lớp nền + ô 64 m (26 ô), dựng theo mức khi cần
- [x] `CityView`: dựng mọi ô ở mức thấp ngay, nâng dần mỗi khung một ô (gần tâm trước); mức chi tiết theo px/m; đèn tầng vẽ lại cho mọi lớp đã dựng
- [x] Bảng chất lượng: chi tiết nhà L0–L3, tự giảm khi thu nhỏ; sửa `withOption` không trở về mức có tên
- [x] Test: mọi preset ở L2/L3, mức càng cao càng nhiều chi tiết, ô, chất lượng (city3d 12 test); số đo ở ADR-036
- [x] Tài liệu: ADR-036, [city3d](../architecture/city3d.md), [house-spec](../architecture/house-spec.md), [hướng dẫn](../user/guide.md)
- [x] Người dùng xem ("trông ổn đấy", 2026-10-21); góp ý đường gấp khúc → sửa ở M5

## M5 · Đường, đồ phố, giao thông, tầm nhìn, chất lượng đầy đủ
- [x] Core `network.ts`: nối đoạn thành đường, làm tròn góc (giữ nút), nút + nhánh, tuyến (cùng tên), lộ trình (qua chỗ đổi tên)
- [x] Vẽ đường theo mạng: dải liền, mặt nút giao + cung bó vỉa, vỉa hè vòng góc, vỉa hè / vạch dừng đúng chỗ (sửa "gấp khúc" người dùng thấy)
- [x] Sửa regex nhận ngõ (`\b` không khớp chữ có dấu), có test
- [x] Core `furniture.ts`: cột điện + dây (vắt qua ngõ), cột đèn / đèn treo, cây, cột đèn tín hiệu theo hướng; không trong nút, không trên lòng đường
- [x] Core `traffic.ts` viết lại theo làn của lộ trình: vạch dừng theo cụm nút, nhóm pha x/y, bám đuôi, quyết lúc vàng, cầu chỉ ô tô
- [x] App 3D: đồ phố theo ô và tách lớp; đèn đường + xung sáng dây + đèn xe ban đêm; đèn tín hiệu theo pha; xe instancing, mờ ở đầu / cuối làn
- [x] Chất lượng: mật độ xe, cột và dây điện, cây (3 kiểu), tầm nhìn xa, tự hạ mức khi fps thấp; chân trang: số xe, màu đèn + giây còn lại
- [x] Test: mạng đường, đồ phố, làn xe (bản đồ thật); mô hình xe; đồ phố / xe 3D; tự hạ mức (core 36, osm-import 18, city3d 17)
- [x] Tài liệu: ADR-037, [city-model](../architecture/city-model.md) §7–8, [city3d](../architecture/city3d.md), [hướng dẫn](../user/guide.md)
- [x] Người dùng xem; góp ý: xe xấu, đèn cửa nên không đều, nhà mặt đường chính là cửa hàng, trước nhà là vỉa hè → ADR-038
- [x] Xe dựng lại theo iso-glow `07-intersection` + app cũ: thân bo góc, bánh, cabin kính, đèn pha / hậu, hộp đèn taxi, vệt đèn pha ban đêm; xe máy tay ga có người lái; nét cạnh động (~1 ms/khung)
- [x] Cửa sổ sáng không đều (rất sáng / sáng / mờ / tắt theo seed)
- [x] Nhà sinh mặt đường chính luôn là cửa hàng có biển; khối nhà lớn mặt đường chính có mặt kính + dải biển tầng 1
- [x] Sân trước lát nối ra vỉa hè
- [x] Góp ý: thêm bảng đèn, độ sáng chưa giống iso-glow → ADR-039: mục Đèn (đèn nhà tự động / bật / tắt + số tầng sáng 0–100%, đèn xe tự động / bật / tắt, độ glow), viền cửa sáng `--accent-hi`, cửa mờ 45% trên nền tường, ngưỡng / cường độ bloom
- [x] Góp ý (ảnh so với iso-glow): quá sáng, 20% mà Novotel sáng trưng / Thái Bình tối → ADR-040: tỉ lệ theo từng ô cửa (rải đều, có test), dải kính chia ô, glow nhẹ
- [x] Góp ý: chưa thấy đèn đường → ADR-041: bóng đèn sáng 5 mặt, vùng sáng trên mặt đường, mục Đèn đường (tự động mặc định)
- [x] Yêu cầu: đèn vườn hoa, kéo dài hết phố Thái Hà, metro 2A trên cao + ga Thái Hà (theo thực tế + đồ ga của `05-metro.js`) → ADR-042: vùng nhiều hình chữ nhật, tải nhiều hộp (thử lại, dự phòng Overpass), `Rail` / `Station`, lịch chạy tàu, cầu cạn, ga, tàu 4 toa, đèn vườn; tăng tốc lăng trụ (L3 ×4), lưới tìm nhà bên, xe thưa hơn, tầm nhìn mặc định 400 m
- [x] Góp ý: điều khiển 3D khó → ADR-043: kiểu bản đồ (kéo trái di chuyển, phải / Shift xoay, cuộn vào con trỏ, WASD, R/F, +/−, nhấp đúp bay tới, nút Ngã tư / Ga Thái Hà, giữ trong vùng)
- [x] Góp ý (ảnh): thu nhỏ thành vệt đen → ADR-044: nét nhạt dần theo px/m, xe bỏ nét / viền / xe máy khi xa, cây đầy đủ → đơn giản; theme mặc định sáng
- [x] Góp ý (ảnh 2): vẫn quá nhiều chi tiết khi xa → nâng các mốc gấp đôi (L2 từ 4,5 px/m, L3 từ 9; nhạt 8 → 2,5; xe 6 / 4 / 2,5; cây 5)
- [x] Góp ý: xe ở xa khó nhận ra / viền thì rối → ADR-045: khối xám + viền ngoài mờ; mật độ xe mặc định 30% (cài đặt cũ bị bỏ một lần); một nút Ngày ↔ Đêm (sáng + tắt đèn / tối + bật đèn)
- [x] Góp ý (ảnh phóng gần): ô tô và xe máy thiếu chi tiết so với `10-diner.js` → ADR-046: ô tô có cabin đồng màu thân + ô kính lùi chừa cột A/B/C có viền, thân bo mượt không nét dọc góc, bánh 12 cạnh đủ viền + mâm + vòm bánh, lưới tản nhiệt nan dọc, đèn pha/hậu có viền, gân hông, khe cửa, tay nắm, gương, nắp ca-pô/cốp, hộp đèn taxi đủ nét; xe máy có chắn bùn, phuộc, cổ lái + đầu đèn + gương, người lái ngồi tự nhiên (thân bo tròn, tay nắm ghi đông, chân đặt sàn, mũ bảo hiểm có kính)
- [x] Góp ý (2 ảnh mẫu cây): cây đơn giản và xấu, bỏ nét tỉa vẽ chì chỉ lấy form dáng tán → ADR-047: cây 3D theo 3 dáng (tán vòm đa thùy như ảnh 1, tán tầng vươn ngang như ảnh 2, tán cụm bất đối xứng), có bồn cây + gốc rễ bạnh 3D, thân côn thuôn, 4–5 cành chạc 3D + nhánh phụ lộ dưới đáy tán, các cụm lá vòm 3D trơn phân 3 sắc độ sáng-trung-tối từ đỉnh xuống đáy kèm viền bóng silhouette sạch (không có nét tỉa bên trong); thêm cây bóng mát trong công viên / vườn hoa
- [x] Yêu cầu: thêm tính năng chọn công trình qua dropdown để hiện riêng trên đế như `iso-glow`, và mở rộng khu vực ra Láng Hạ, Hoàng Cầu, Ô Chợ Dừa, Nguyễn Lương Bằng, Xã Đàn, Chùa Bộc, Ngã Tư Sở → ADR-048: `render/showcase.ts` + dropdown **Công trình** (công trình lớn OSM, ga Metro 2A và 5 mẫu kiến trúc Hà Nội trên đế vát góc có đường, vỉa hè, đèn, cây 3D); mở rộng `nga-tu-thai-ha` bao phủ toàn bộ 7 khu phố mới + dropdown **Khu vực**; tối ưu lưới không gian cho `import.ts`, `core/furniture.ts` và `buildings.ts`
- [ ] Người dùng xem lại: chế độ xem công trình trên đế (dropdown **Công trình**), bản đồ mở rộng (Láng Hạ, Hoàng Cầu, Ô Chợ Dừa, Nguyễn Lương Bằng, Xã Đàn, Chùa Bộc, Ngã Tư Sở), cây mới (3 dáng), xe khi phóng gần và ở xa, nút Ngày / Đêm; fps ở mức Cao

## Backlog
- Mở rộng thêm sang các quận / phường khác của Hà Nội (đã có Thái Hà, Tây Sơn, Ngã Tư Sở, Chùa Bộc, Nguyễn Lương Bằng, Ô Chợ Dừa, Xã Đàn, Hoàng Cầu, Láng Hạ — ADR-048)
- Nguồn dữ liệu bổ sung ngoài OSM (ảnh vệ tinh, ảnh người dùng chụp); kiểm bản quyền trước
- Gỡ trang thử 3D khỏi app SVG khi `city3d` thay được (ADR-033)
- Giữ vòng trong (sân trong) của multipolygon thay vì bỏ
- Làm sạch mặt bằng nhà nhỏ chồng / hở nhau (R5)
- Tách dữ liệu OSM khỏi bundle chính (tải sau) nếu trang mở chậm
- Chữ trên biển hiệu, giấy dán, quảng cáo sơn tường (cần texture chữ)
- Dựng ô ở lúc rảnh (requestIdleCallback) để bớt khựng khi nâng chi tiết
- Xe rẽ ở nút giao (hiện chỉ đi thẳng theo lộ trình); xe ở ngõ
- Vạch sang đường, mũi tên làn rẽ; số đếm ngược trên đèn tín hiệu (cần texture chữ)
- Cây trước nhà theo `trees` của nhà sinh (hiện cây theo luật vỉa hè)
- Vùng sáng dưới đèn đường ban đêm
