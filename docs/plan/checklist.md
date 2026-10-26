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
- [x] Góp ý: sử dụng trên mobile cảm ứng không mượt; cho zoom out xa hơn gấp 3 lần và ẩn chi tiết/xe cộ khi ở xa → ADR-049: giảm độ trễ bám ngón (`dampingFactor = 0.18`), tách cử chỉ 2 ngón theo chế độ (`DOLLY_PAN` ở 2D, `DOLLY_ROTATE` ở 3D), tắt `zoomToCursor` trên cảm ứng để chụm 2 ngón không trôi lệch ngang, hỗ trợ chạm đúp bay tới, hoãn biên dịch ô nhà mới khi đang vuốt/chụm, vẽ trực tiếp không qua `EffectComposer` khi tắt bloom, gom xe trong tầm nhìn (`o.count = vis`), mặc định mức `Trung bình` và đóng sẵn bảng cài đặt trên màn hình di động; tăng tầm zoom out gấp 3 (`minZoom = 0.16`) và ẩn dần toàn bộ chi tiết nhỏ/xe cộ/cây xanh ở xa
- [x] Góp ý (3 ảnh nhà ga Metro 2A): nhà ga metro chưa chi tiết ở phần dưới chân nhà ga và đường đi bộ đi lên → ADR-050: dựng đúng kiến trúc tuyến Cát Linh – Hà Đông: dải phân cách trồng cây dưới gầm, trụ cầu cạn có mũ chữ T loe vát + gối cầu, 5 nhịp trụ đôi dưới ga kèm xà mũ cánh hẫng vát đáy và hệ dầm dọc đỡ sàn sảnh, cổng sảnh mở 2 đầu ga có lan can kính + đèn trần + bảng tên ga + khối vuông họa tiết hình thoi xanh-trắng, mái vòm chữ C + kèo thép lấy sáng, và 4 cụm cầu bộ hành lan can kính vượt qua đường nối ra tháp thang máy cùng cầu thang bộ/thang cuốn có tường bậc giật cấp trắng và mái vòm cong nửa trụ xuống vỉa hè
- [x] Góp ý: tốc độ tàu chạy, nhìn xuyên ga tàu (zoom ≥ 8) & tòa nhà (zoom ≥ 12, mặc định bật), nhấp đúp mở popup (nút bóng đèn ở góc), đồng bộ URL kiểu Google Maps, và lỗi công trình lớn (Rạp Chiếu Phim Quốc Gia, VPBank Tower) lúc hiện lúc không → ADR-051: tăng tốc độ tàu 80 km/h tối đa / ≥ 35 km/h trung bình; shader nhìn xuyên mặt cắt ga + Bayer 4×4 tòa nhà; URL hash `#@lat,lon,zoom...`; đánh dấu `landmarkTileKeys` luôn hiển thị và ưu tiên dựng ngay từ đầu không bị giới hạn bởi `viewDistance`
- [x] Yêu cầu: tái cấu trúc mã nguồn đảm bảo convention, scalable, maintainable; tách riêng constants, đa ngôn ngữ (`i18n`), và chuẩn bị sẵn kiến trúc Extension / SDK tích hợp → ADR-052: chuyển toàn bộ siêu dữ liệu đặc thù khu vực về tầng dữ liệu (`core`, `osm-import`, `osm-data` kèm `loadCityAsync`); tách `CityView.ts` thành `constants.ts`, `i18n.ts` (`vi`/`en` + nút chuyển trên thanh công cụ), `sdk.ts` (`CitySDK`, Event Bus, `CityExtension`, custom 3D layer & popup actions), `seeThrough.ts`, `overlayDom.ts`
- [x] Yêu cầu: quy chuẩn bắt buộc vẽ riêng tử tế mọi di tích, đền chùa, tượng đài, công trình biểu tượng (Rule A16); hệ thống lá cờ dùng chung đa quốc gia chỉ hiện khi zoom `< 250 m` và tối ưu hiệu năng; tái thiết kế Khuê Văn Các chi tiết chuẩn biểu tượng Hà Nội; hiện đường nét đứt địa giới các Phường + tên Phường ở giữa và địa giới Hà Nội + tên Hà Nội ở giữa khi zoom xa; mở rộng bản đồ sang Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân; và tối ưu chống lag + ẩn dần đối tượng theo 4 cấp độ zoom out kiểu Google Maps (nhà thường → công trình biểu tượng → đường phố → địa giới thành phố) → ADR-054: `Rule A16` trong `docs/ai/README.md` + tự động dựng kiến trúc truyền thống/tôn giáo trong `import.ts`; `render/flags.ts` chia sẻ hình học sóng cờ 3 pha & chất liệu đa quốc gia (`vn`, `festive`, `asean`, `fr`, `jp`, `kr`, `us`, `ru`), tắt hoàn toàn khi `> 250 m`; tái thiết kế `drawKhueVanCac`; `render/adminBoundaries.ts` vẽ đường nét đứt địa giới 15 Phường + địa giới Hà Nội kèm nhãn tên căn giữa và phân 4 tầng zoom (`mapZoomStage`: `full` `zoom >= 0.72`, `landmarks` `0.38..0.72`, `streets` `0.20..0.38`, `city` `< 0.20`); tách lớp nền `buildMapBaseLayers` + `buildLandmarkOverviewLayer` và chỉ dựng/vẽ các ô `64 m` nằm trong khung nhìn hiện tại
- [x] Yêu cầu: tổ chức thư mục lưu trữ riêng theo từng quốc gia / thành phố cho dữ liệu và bộ dựng 3D các công trình biểu tượng; cập nhật quy tắc bắt buộc rà soát toàn diện 13 nhóm công trình mỗi khi thêm bất kỳ vùng, địa danh, tỉnh, thành phố, quận, huyện, phường, xã mới nào; và lập danh mục + mô hình 3D riêng cho toàn bộ 208 công trình thuộc 13 nhóm tại Hà Nội → ADR-055: tách `packages/osm-import/src/cities/vn/ha-noi/` (`districts.ts`, `places.ts`, `heritage-notes.ts`, `overrides.ts`, `catalog-part1.ts`, `catalog-part2.ts`, `landmarks-catalog.ts`, `index.ts`) và `apps/city3d/src/render/landmarks/vn/ha-noi/` (`catalog-builders.ts`, `index.ts` + `landmarks/shared.ts`); bổ sung 34 bộ dựng 3D chuyên biệt mới cùng toàn bộ 208 công trình thuộc 13 nhóm vào `HA_NOI_LANDMARKS_CATALOG` và 3D Diorama Showcase (`showcase.ts`); cập nhật `Rule A16` trong `docs/ai/README.md`
- [ ] Người dùng xem lại: Khuê Văn Các mới, hệ thống cờ `< 250 m`, đường nét đứt địa giới Phường & Hà Nội, và danh mục 208 công trình biểu tượng 13 nhóm trên bản đồ & trong 3D Diorama Showcase
- [x] Yêu cầu: thêm chức năng chọn tông màu bản đồ (Đơn sắc + các tông màu thực tế cho đường xá, hồ nước, công viên, cây xanh, công trình lớn, di tích, đền chùa, miếu mạo, tượng đài — chọn trực tiếp bằng ô màu không đặt tên hoa mỹ) và thiết kế lại toàn bộ UI theo Mẫu 1 (thanh nổi tràn viền + Drawer cài đặt phân tab) tích hợp hiệu ứng Liquid Glass Apple Optical Lens (`sonth87/liquid-glass`) với cấu hình độ trong suốt `Off (mặc định không trong suốt) → Tint → Glass` → ADR-056
- [x] Góp ý & yêu cầu: bổ sung bắt buộc các cây cầu biểu tượng (Cầu Thê Húc, Cầu Long Biên, Cầu Rồng Đà Nẵng…) vào quy tắc vẽ 3D riêng; sửa lỗi Hồ Tây và các hồ tràn vùng xanh ra khu dân cư khi để `Màu 1` + khoét đúng đảo trong hồ; thể hiện rõ màu cỏ xanh & rừng cây 3D cho Công viên Bách Thảo và toàn bộ công viên/vườn hoa; sửa vị trí/hướng Cầu Thê Húc và Tháp Bút tại Đền Ngọc Sơn; sửa Tượng đài Cảm tử (trước bị vẽ là ngôi nhà) và Tượng đài Quang Trung (trước chỉ như cái cọc) cùng toàn bộ tượng đài khác thành cụm điêu khắc 3D chi tiết → ADR-057

- [x] Đánh giá toàn diện `city3d` + lỗi người dùng báo (đường giữa sông, Cầu Long Biên, Tháp Bút / Thê Húc, Hồ Tây, giật trên tablet, `RangeError`) → ADR-058: xoá dữ liệu bịa, dùng OSM thật; neo Ngọc Sơn theo tâm đền; lớp tổng quan L0; ngân sách thời gian dựng ô; ErrorBoundary; CI
- [x] Góp ý (ảnh): đầu Cầu Long Biên / Chương Dương cụt, cầu nhấp nhô, vòng xuyến lộn xộn → ADR-058 mục 2: cao độ cầu theo cả mạng cầu
- [x] Yêu cầu: biến sự cố thành case study, bài học và luật cụ thể có rào chắn → `docs/architecture/case-studies.md`, luật A17–A24, `hygiene.test.ts`
- [x] Góp ý (ảnh vòng xoay Chương Dương): bề rộng mặt cầu nhảy và lan can cắt nhau ở chỗ nối → bề rộng thống nhất tại nút, lan can mở, cầu đường chính ≥ 2 làn
- [x] Góp ý (ảnh vòng xoay lần 2): lan can bên trong đan thành chữ Y ở chỗ nhánh rẽ/nhập → bỏ lan can nằm trên mặt cầu khác (`onOtherDeck`), test `bridges.test.ts`
- [x] Góp ý: tải trang đầu lâu kể cả trên máy tính → CS-07: đo bằng profiler, sửa 4 điểm nghẽn, tính toán khởi động ~6,5 s → ~2,4 s
- [x] Dọn nốt: Web Worker (có đường lùi), cầu Nhật Tân theo đường, vùng hành lang Đông Anh, đoạn cầu cắt ở rìa vùng, viền Hà Nội theo phường thật, chốt chặn kích thước `CityView` (ADR-058 mục 9)
- [x] Tách `CityView.ts` bước 1–2: `OverlayLabels`, `createCitySDK` (3.913 → 3.386 dòng)
- [ ] Người dùng xem trên dev server: nhãn phố / địa điểm / phường, bấm nhãn bay tới, đổi ngôn ngữ, `window.MyCitySDK`
- [x] Góp ý UI: tên phường / thành phố rõ hơn, bỏ khung vàng nền trắng, cuộn chuột trên nhãn vẫn zoom bản đồ, chữ màu nhấn đọc được trên theme sáng (`--accent-ink`, test tương phản) → ADR-058 mục 10
- [x] Tách `CityView.ts` bước 3: `chunkMerge.ts` (sửa lỗi lọc feature, CS-08)
- [ ] Tách `CityView.ts` bước 4+: chunk + cache ô, `mount()` (city3d.md §8)
- [ ] Người dùng xem lại ADR-058 trên tablet: hết `RangeError`, đường Nguyễn Văn Cừ ven bờ Đông, Cầu Long Biên đúng trục và đủ nhịp, cụm Ngọc Sơn đúng chỗ, mức giật khi zoom

## Backlog
- Mở rộng thêm sang các phường ngoại thành / quận khác của Hà Nội (đã có trọn vẹn 6 khu vực trung tâm: Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân — ADR-054)
- Nguồn dữ liệu bổ sung ngoài OSM (ảnh vệ tinh, ảnh người dùng chụp); kiểm bản quyền trước
- Gỡ trang thử 3D khỏi app SVG khi `city3d` thay được (ADR-033)
- Giữ vòng trong (sân trong) của multipolygon thay vì bỏ
- Làm sạch mặt bằng nhà nhỏ chồng / hở nhau (R5)
- Tách dữ liệu OSM khỏi bundle chính (tải sau) nếu trang mở chậm (`loadAreaAsync` / `loadCityAsync` đã sẵn sàng — ADR-052)
- Góc nhìn nhập vai phối cảnh (`povCamera`: Lái tàu Metro, Ngồi tàu Metro, Tự lái ô tô Cabin & Trên cao) kèm Frustum-Cone Culling & Distance LOD (đã hoàn thành — ADR-053)
- **Lộ trình mở rộng (ADR-053)**:
  1. **Xe buýt 2 tầng tham quan tự hành (`tour-bus`)**: Ngồi trên tầng 2 mui trần chạy tự động theo tuyến vòng quanh thành phố, ngắm toàn cảnh 360° (triển khai khi mở rộng thêm bản đồ).
  2. **Hệ thống Theme phong cách & kết cấu đô thị (`CityStyleThemeId`)**: Thay đổi không chỉ màu sắc mà cả phong cách thị giác, shader kết cấu bề mặt tòa nhà và kiểu nét vẽ (`iso-glow`, `cyberpunk-neon`, `retro-heritage`, `blueprint-wire`, `clay-maquette`).
  3. **Kiến trúc bản địa đặc thù theo quốc gia / vùng miền (`VernacularProfileId`)**: Tách biệt hoàn toàn với Theme — khi mở rộng sang các thành phố ở quốc gia khác, các nhà cơ bản và tòa nhà tự động mang hình thái kiến trúc đặc trưng của đất nước đó (`vn-tube-shophouse`, `jp-machiya-lowrise`, `eu-perimeter-mansard`, `us-brownstone-row`).
- Chữ trên biển hiệu, giấy dán, quảng cáo sơn tường (cần texture chữ)
- Dựng ô ở lúc rảnh (requestIdleCallback) để bớt khựng khi nâng chi tiết
- Xe rẽ ở nút giao (hiện chỉ đi thẳng theo lộ trình); xe ở ngõ
- Vạch sang đường, mũi tên làn rẽ; số đếm ngược trên đèn tín hiệu (cần texture chữ)
- Cây trước nhà theo `trees` của nhà sinh (hiện cây theo luật vỉa hè)
- Vùng sáng dưới đèn đường ban đêm
