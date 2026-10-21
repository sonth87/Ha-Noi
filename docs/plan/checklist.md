# Checklist (monorepo, app 3D mới)

Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Cập nhật file này **mỗi khi** một việc đổi trạng thái. Checklist của app SVG cũ (P0–P5) ở [apps/svg/docs/plan/checklist.md](../../apps/svg/docs/plan/checklist.md) (đóng băng).

**Bước hiện tại: M3 xong (người dùng duyệt 2026-10-21). Chờ người dùng cho sang M4.**

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
- [ ] (chia việc khi bắt đầu M4)

## M5 · Đồ phố, giao thông, tầm nhìn, chất lượng đầy đủ
- [ ] (chia việc khi bắt đầu M5)

## Backlog
- Mở rộng khu vực ngoài ngã tư (sau M5)
- Nguồn dữ liệu bổ sung ngoài OSM (ảnh vệ tinh, ảnh người dùng chụp); kiểm bản quyền trước
- Gỡ trang thử 3D khỏi app SVG khi `city3d` thay được (ADR-033)
- Giữ vòng trong (sân trong) của multipolygon thay vì bỏ
- Làm sạch mặt bằng nhà nhỏ chồng / hở nhau (R5)
- Góc giao giữa hai lòng đường còn hở nền (M5)
- Tách dữ liệu OSM khỏi bundle chính (tải sau) nếu trang mở chậm
