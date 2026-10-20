# Checklist

Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Cập nhật file này **mỗi khi** một việc đổi trạng thái. Mã trong ngoặc tham chiếu [requirements](../product/requirements.md) và [decisions](../architecture/decisions.md).

**Phase hiện tại: P1a xong → chuẩn bị P1b (generator + catalog).**

## Lập kế hoạch
- [x] Đánh giá ý tưởng, chốt phạm vi ngã tư Thái Hà – Tây Sơn – Chùa Bộc
- [x] Chọn SVG 2D (ADR-001)
- [x] Copy skill iso-glow vào `.claude/skills/`
- [x] Bộ tài liệu chia theo thư mục `docs/{product,user,architecture,plan,ai}`
- [x] `CLAUDE.md` import `docs/ai/README.md`
- [x] Chọn stack Vite + TypeScript + React, pnpm (ADR-011 → ADR-015)
- [x] Người dùng duyệt tài liệu (2026-10-20)

## P0 · Khung project
### Scaffold
- [x] Scaffold Vite + React + TS. Viết tay `package.json` thay vì `pnpm create vite`, vì thư mục đã có `docs/`, `.claude/`
- [x] `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, alias `@core @render @iso @ui @scenes @hooks @styles`
- [x] `vite.config.ts`: alias khớp tsconfig (dùng `fileURLToPath` vì tên thư mục có dấu cách); Vitest config
- [x] `eslint.config.js`: luật React + luật tầng (`no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties`) (NFR-13, ADR-015)
- [x] Script `package.json`: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `typecheck`
- [x] `.gitignore`, `git init` (chưa commit; chờ người dùng yêu cầu)
- [x] Ghi version vào ADR-011 (TS ghim 6.0 vì typescript-eslint chưa hỗ trợ TS 7)
### Port iso-glow (ADR-012)
- [x] Đọc `.claude/skills/iso-glow/assets/gallery.html`
- [x] `src/iso/kernel.ts`: `P`, `D`, `plane`, `TOP/FRONT/SIDE`, `rect`, `box`, `boxc`, `path`, `slits`, `esc` có kiểu
- [x] `src/iso/frame.ts`: `frame(points, margin, aspect)` → kernel + `viewBox`
- [x] `src/iso/palettes.ts`: `city`, `ember`, `accentCss()`
- [x] `src/iso/tokens.css`: token dark/light + glow kit
- [x] `src/iso/GlowDefs.tsx`: `#glow #soft #bloom`, theme sáng = pass-through
- [x] `src/iso/theme.ts` + `ThemeProvider.tsx`: theme system/dark/light + accent, nhớ lựa chọn (try/catch)
- [x] `src/iso/LICENSE` (MIT, April Zhu + Tolga Cohce); footer "Made with ISO-GLOW ↗"
- [x] `kernel.test.ts`: chạy **kernel gốc** trích từ `gallery.html` và so từng kết quả với bản port (R8)
- [x] Font DM Mono đóng gói bằng `@fontsource` (NFR-01)
### Core & khung cảnh
- [x] `core/types.ts` (bản đầu: `Facing`, `ViewK`, `Box3`, `Item`)
- [x] `core/units.ts`: `M = 10`, `SIZE`
- [x] `core/rng.ts`: mulberry32 + `hash` (FNV-1a) + test
- [x] `scenes/controller.ts`: `SceneController` (subscribe, getSnapshot, update, attach/detach, key, click, demo, after, loop)
- [x] `scenes/SceneSvg.tsx`: gán `innerHTML`, ủy quyền click, `role="img"` + `aria-label` (NFR-10)
- [x] `scenes/SceneView.tsx` + `scenes/registry.ts`
- [x] `hooks/useKeys.ts`, `hooks/useController.ts` (`useSyncExternalStore`)
- [x] `ui/`: `Shell`, `Sidebar`, `PalettePicker`, `ThemeToggle`. Readout nằm trong `SceneView`, không tách component riêng
- [x] `render/hello.ts` + `scenes/hello/`: nhà 4 tầng; click tầng hoặc `1–4`, `Space` cả nhà, `N` cascade, `?demo` (FR-24, FR-37)
### Kiểm tra
- [x] `pnpm build` (74 KB gzip JS), `pnpm typecheck`, `pnpm lint`, `pnpm test` (11/11) sạch
- [x] Thử vi phạm luật tầng bằng file tạm → ESLint báo đủ 7 lỗi (React, import chéo tầng, `document`, `Math.random`)
- [x] `pnpm dev` chạy, trả HTTP 200
- [x] Kiểm bằng mắt (người dùng gửi ảnh theme sáng + tối, 2026-10-20)
- [x] Đánh dấu DoD P0 trong roadmap → **P0 xong**

## P1a · Nhà mẫu (ADR-016)
- [x] `render/geom.ts`: `convexHull`, `cylinderX` (bồn inox nằm), `groundCircle`, `sagLine` (dây võng)
- [x] `render/reference-house.ts`: nhà chính + 2 hàng xóm + vỉa hè + cột điện, mọi bộ phận viết thành hàm riêng (sẵn để bóc ra `parts/`)
- [x] `scenes/reference/referenceController.ts`: đèn từng tầng, ngày/đêm cascade, xung điện ngẫu nhiên (tắt khi reduced motion), `?demo`
- [x] `styles/city.css`: lan can, biển hộp đèn, mái hiên, quảng cáo sơn, đường, đèn đường, quầng sáng
- [x] Test: hình hữu hạn (không NaN), đủ 12 tầng có id duy nhất, tái tạo theo seed, có xung trên dây
- [x] Đăng ký cảnh "Nhà mẫu" làm Fig 1 (Hello thành Fig 2)
- [x] Vòng góp ý 1 (2026-10-20):
  - [x] Sửa: biển CÀ PHÊ bị khối đua ra che → treo dưới mép khối đua ra
  - [x] Sửa: tầng sáng nhưng cửa sổ đen (biến thể `off` của tòa văn phòng) → bỏ `off` với nhà ít cửa
  - [x] Sửa: chuồng cọp đặt nhầm tầng 4 → tầng 3
  - [x] Quảng cáo "khoan bê tông" trên cao → tờ dán A5 ở tầm tầng 1 và cột điện; trên cao thay bằng biển lớn có đèn chiếu
  - [x] Thêm 8 kiểu biển theo mô tả của người dùng ([components](../architecture/components.md) A9): hộp đèn mặt tiền, 2 biển dọc hai bên cửa, biển dọc chìa ra, biển tròn chìa ra, standee, cột xoắn barber (xoay), biển lớn có đèn chiếu, tờ dán A5
  - [x] Cập nhật `signs` trong [house-spec](../architecture/house-spec.md), glossary
- [x] Người dùng duyệt vòng 2: "khá hay" (2026-10-20)
- [x] Q5 → ADR-017: font Be Vietnam Pro cho chữ biển; biển dùng tiếng Việt có dấu (CẮT TÓC, IN ẤN, CHO THUÊ BIỂN)
- [x] Chốt danh sách bộ phận + tham số để bóc sang `render/parts/*` ([components](../architecture/components.md) mục E)

## P1b · Generator + Catalog
### Dữ liệu & hình học (`core/`)
- [ ] `types.ts`: `HouseSpec` đầy đủ theo [house-spec](../architecture/house-spec.md)
- [ ] `spec.ts`: `DEFAULTS`, `resolveSpec()` gộp preset ⊕ override (FR-13)
- [ ] `spec.ts`: `validateSpec()` theo luật hợp lệ ([house-spec](../architecture/house-spec.md) mục 4)
- [ ] `view.ts`: `rotate(item, k, center)`, xoay `facing`, `visibleFace(facing)` → `front | side | hidden`
- [ ] `depth.ts`: `depthSort(items)` topo + phá chu trình + cảnh báo (FR-22)
- [ ] Test: `spec`, `view` (4 lần xoay = ban đầu, facing 4 hướng), `depth` (hàng x, hàng y, cao-cạnh-thấp, ô lưới)
### Renderer (`render/`)
- [ ] `house.ts`: khung thân, chia tầng, gọi parts, trả `{ svg, items }`
- [ ] `parts/facade.ts`: chia tầng và khe cửa sổ, nhóm `data-floor`
- [ ] `parts/ground.ts`: `fold`, `roll` (đóng/mở)
- [ ] `parts/windows.ts`: `tall`, `wide` + biến thể seed `off/dim/hi` (FR-12)
- [ ] `parts/roofs.ts`: `flat` (+ parapet), `metal2`, `tile`
- [ ] `parts/back.ts`: mặt lưng tối thiểu
- [ ] Mặt tiền vẽ đúng trên `FRONT` / `SIDE` theo facing; mặt lưng khi khuất (FR-20)
- [ ] `styles/city.css`: `.fl`, `.win`, `.shop`… chỉ dùng token màu (NFR-07, NFR-08)
- [ ] Escape chữ đưa vào SVG (ADR-013)
- [ ] Test snapshot `renderHouse()` (NFR-06)
### Preset & cảnh
- [ ] `core/presets.ts`: 6 preset `cap4-tile`, `1f-flat`, `2f-balcony` (tạm chưa ban công), `3f-tank`, `tube-5f-cage` (tạm), `tube-6f-hut` (tạm)
- [ ] `scenes/catalog/catalogController.ts`: state đèn, căn đang chọn, góc nhìn; áp lại đèn sau khi dựng lại
- [ ] `scenes/catalog/CatalogScene.tsx`: lưới 3 × 2, ô đất, nhãn tên preset (FR-30)
- [ ] Điều khiển: click bật đèn, `←/→` chọn, `Space`, `R`, `Q/E` (FR-20, FR-30)
- [ ] Readout (FR-37), `aria` (NFR-10), `?demo`
- [ ] Kiểm bằng mắt 4 hướng xoay, không lỗi che khuất
- [ ] Đánh dấu DoD P1

## P2 · Thư viện chi tiết
- [ ] `parts/ground.ts`: `glass`, `wood`, `wall`; mái hiên `fabric`/`metal`; biển `board`/`box`/`vertical` (FR-04, FR-09)
- [ ] `parts/windows.ts`: `arch`, `glass`, `louver` (FR-05)
- [ ] `parts/balconies.ts`: `rail`, `solid`, `cage`; `balconyFloors`; cây; quần áo (FR-06)
- [ ] `house.ts`: `overhang`, `setbackTop` (FR-07)
- [ ] `parts/roofs.ts`: `metal1`, `stairHut`, `roofShelter` (FR-03)
- [ ] `parts/roof-items.ts`: `tank-h`, `tank-v`, `solar`, `antenna`, `ac` (quạt quay), `pots`; đặt không chồng (FR-08)
- [ ] `house.ts`: `shape: 'L'`, `'chamfer'` (tách nhiều item) (FR-10)
- [ ] `parts/back.ts`: tường hồi có vệt ố, `sideAC`, `sideAd`, ống nước (FR-11)
- [ ] `core/presets.ts`: đủ 12 preset theo [house-spec](../architecture/house-spec.md)
- [ ] Catalog: lưới 4 × 3; `ui/ParamPanel` chỉnh tham số căn đang chọn (FR-31)
- [ ] Thử thêm preset thứ 13 chỉ bằng dữ liệu (S3)
- [ ] Cập nhật snapshot test
- [ ] Tự đánh giá S1
- [ ] Đánh dấu DoD P2

## P3 · Một nhánh phố
- [ ] `core/layout.ts`: `streetRow({ length, side, seed, mix })`: rải nhà sát nhau, xen nhà thấp, không 3 căn cùng preset liền nhau
- [ ] `render/props/sidewalk.ts`: vỉa hè, bó vỉa, lòng đường, vạch làn
- [ ] `render/props/poles-wires.ts`: cột, dây võng, bó dây rối, xung sáng (FR-34)
- [ ] `render/props/lamps.ts`: đèn đường + halo
- [ ] `render/props/trees.ts`
- [ ] `render/props/bikes.ts` + điều khiển trong controller: xe 2 chiều, `T` (FR-35)
- [ ] Lớp vẽ: dãy xa → đường → xe → dãy gần → dây điện
- [ ] Cutaway `X` (FR-21)
- [ ] Ngày/đêm `N` + cascade (FR-23)
- [ ] `hooks/useReducedMotion` + xử lý trong controller (NFR-09)
- [ ] `scenes/street/` + `?demo` (FR-32, FR-36)
- [ ] Đo fps (NFR-03), thời gian dựng lại (NFR-04), xác nhận không re-render theo frame (NFR-14); ghi vào [decisions](../architecture/decisions.md)
- [ ] Đánh dấu DoD P3

## P4 · Ngã tư
- [ ] Thu thập ảnh tham khảo: tòa Thái Bình, Novotel, 2 vườn hoa (Q2)
- [ ] `core/layout.ts`: `crossroads()` gồm 4 nhánh + nút giao + 4 góc
- [ ] Mặt đường nút giao: vạch dừng, vạch sang đường
- [ ] `render/landmarks/tower-thai-binh.ts`: khối đế + tháp, bật đèn theo tầng
- [ ] `render/landmarks/tower-novotel.ts`: tháp + sảnh + canopy
- [ ] `render/landmarks/garden.ts`: lối đi, cây, ghế, đèn vườn
- [ ] `render/props/traffic-light.ts` + controller: xe dừng/chạy theo đèn
- [ ] `scenes/crossroads/` + `?demo` (FR-33, FR-36)
- [ ] Kiểm thứ tự vẽ 4 hướng ở cả 4 góc
- [ ] `pnpm build:single` (NFR-02)
- [ ] Đo NFR-03, NFR-04, NFR-05
- [ ] Tự đánh giá S2
- [ ] Đánh dấu DoD P4 → **MVP xong**

## P5 · Sau MVP (backlog, chưa sắp xếp)
- [ ] Đối chiếu ảnh khảo sát từng đoạn phố
- [ ] Hướng phố và góc giao thật từ OSM
- [ ] Preset 20–50
- [ ] Mưa
- [ ] Âm thanh
- [ ] Deploy site tĩnh (Vercel / GitHub Pages)
- [ ] Bản 3D
