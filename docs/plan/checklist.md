# Checklist

Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. Cập nhật file này **mỗi khi** một việc đổi trạng thái. Mã trong ngoặc tham chiếu [requirements](../product/requirements.md) và [decisions](../architecture/decisions.md).

**Phase hiện tại: P3 — phố Thái Hà, code xong, chờ người dùng kiểm bằng mắt + đo fps.**

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
- [x] `types.ts`: `HouseSpec`, `HouseInput`, `FloorSpec`, `SignSpec`, `Issue` (đồng bộ [house-spec](../architecture/house-spec.md))
- [x] `presets.ts`: 6 preset — `nha-mau` (dựng lại nhà mẫu), `cap4-metal`, `2f-balcony`, `3f-tank`, `tube-5f-cage`, `tube-6f-photo`
- [x] `spec.ts`: `resolveSpec` (DEFAULTS ⊕ preset ⊕ input, theo từng tầng), luật hợp lệ, `sceneIssues`, `randomHouse` có seed (FR-12, FR-13)
- [x] `view.ts`: xoay điểm/khối/hướng, `rotateSpec`, **hệ tọa độ cục bộ của nhà** (a dọc mặt tiền, b ra phố) cho 4 hướng, `visible(side)` (FR-20)
- [x] `depth.ts`: `depthSort` — kiểm chồng hình bằng 3 trục lục giác (x−y, x−z, y−z), sắp topo, ổn định, phá chu trình + cảnh báo (FR-22)
- [x] `layout.ts`: lô catalog, `placeInLot`
- [x] Test: 38 test lõi (xoay 4 lần = ban đầu; xoay thế giới = tính lại nhà ở mọi hướng × mọi góc; thứ tự vẽ hàng x, hàng y, hai bên phố, chồng tầng, bài học mái hiên → biển treo → sàn ban công; 600 khối nhanh; 200 nhà ngẫu nhiên hợp lệ)
### Renderer (`render/`)
- [x] `local.ts`: vẽ trong hệ cục bộ của nhà (box, face hiển thị, plane, path, trụ nằm)
- [x] `geom.ts`: `cylinderH` (trụ nằm theo trục bất kỳ — bồn nước xoay đúng hướng)
- [x] `parts/`: `windows`, `ground` (+ mái hiên), `signs` (7 kiểu + tờ dán), `balconies` (lan can, chuồng cọp, chậu cây, cục nóng mặt tiền), `walls` (tường hồi, cục nóng treo), `roofs` (mái bằng + tường chắn, phòng tum + sân thượng + dây phơi, mái tôn 2 dốc), `roof-items` (bồn nằm, bồn đứng, ăng-ten, NLMT) — bóc từ nhà mẫu theo [components](../architecture/components.md) mục E
- [x] `house.ts`: `renderHouse` → các item sắp được; `floorIds`; mặt sau có cửa sổ cùng id tầng nên bật đèn được từ mọi hướng
- [x] `scene.ts`: `composeScene` (sắp thứ tự, khung hình, dịch gốc)
- [x] `props/lot.ts`: ô đất + vỉa hè + nhãn + viền chọn
- [x] Test: mọi preset × 4 hướng không có bộ phận lồng nhau, đủ id tầng; 300 nhà ngẫu nhiên × 4 hướng không lồng nhau; snapshot từng preset (NFR-06); catalog 4 góc xoay + 40 lần ngẫu nhiên không cảnh báo thứ tự vẽ; dựng catalog < 100 ms
- [x] Sửa 5 chỗ chồng lấn do test phát hiện (ăng-ten/tường chắn, biển dọc/chuồng cọp, biển tròn/khối đua, NLMT/chậu cây, cục nóng/biển lớn)
### Cảnh
- [x] `scenes/catalog/`: 6 lô; `Q/E` xoay, `←/→` chọn, `Space` đèn căn đang chọn, `R` nhà ngẫu nhiên, `P` về preset, `N` ngày/đêm, click tầng/lô; readout `view S · 3/27 lit · 01 Nhà mẫu…` (FR-20, FR-30, FR-37)
- [x] Đăng ký "Catalog" làm Fig 2
- [x] Cập nhật [house-spec](../architecture/house-spec.md) theo code (A3); tách phần dự kiến P2
- [x] Góp ý người dùng: nhà ống cũng hay có **mái tôn** (che sân thượng trước tum, hoặc che cả mái); có nhà không làm → `roofShelter: 'none' | 'terrace' | 'full'`, luật hợp lệ, random 50% (có tum) / 35% (không tum), preset `tube-5f-cage` (full), `tube-6f-photo` (tum + terrace); test luật + 300 nhà ngẫu nhiên vẫn không lồng nhau
- [x] Góp ý người dùng: mái tôn trên tầng cao là **mái tam giác**, không phải tấm phẳng → đổi sang 2 dốc, đầu hồi hở có vì kèo; gom hàm vẽ 2 dốc dùng chung với mái nhà cấp 4 (snapshot nhà cấp 4 không đổi)
- [x] Góp ý người dùng: mái tôn che sân thượng làm cao hơn trần tum một chút → mép mái cao hơn trần tum 0.3 m, thêm 2 cột sau
- [x] Người dùng kiểm bằng mắt: "trông có vẻ ok" (2026-10-20)
- [x] Đánh dấu DoD P1 → **P1 xong**

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

## P3 · Một nhánh phố (phố Thái Hà)
- [x] `core/layout.ts` — `streetLayout(seed)`: 2 dãy quay mặt vào nhau (20–26 căn/dãy), ngõ chen giữa, xen nhà thấp mỗi 4–6 căn, không 3 căn cùng preset liền nhau; cột, cây, xe (FR-32)
- [x] Tường hồi lộ ra theo nhà bên: `sideEnd` + `sideClear` (dùng `peakZ`), cục nóng treo/biển lớn chỉ ở phần lộ (ADR-020)
- [x] `core/spec.ts` — `cutaway(spec)`, `topZ`, `peakZ`
- [x] `render/props/street.ts` — nền + lòng đường + vạch kẻ, 2 vỉa hè lát gạch, cột điện + bó dây rối + tờ dán, đèn đường + vũng sáng, cây, dây võng qua các xà + xung sáng (FR-34), 2 làn xe máy (FR-35)
- [x] `render/street-scene.ts` — `buildStreet`: xoay nhà + đồ phố theo khung phố, cắt dãy gần khi cutaway
- [x] Cutaway `X`, mặc định bật (FR-21)
- [x] Ngày/đêm `N` + cascade ngẫu nhiên (FR-23)
- [x] Xe chạy 2 chiều theo thời gian, mờ dần ở 2 đầu phố, `T` bật/tắt; đứng yên khi reduced motion (FR-35, NFR-09)
- [x] Phóng to / kéo / nhấp đúp (dùng chung mọi cảnh) — `hooks/useZoomPan.ts`
- [x] `scenes/street/` + đăng ký "Phố Thái Hà" (Fig 3), `?demo` bật đêm (FR-36)
- [x] Test: 29 test phố — số căn, mặt tiền thẳng hàng, không chồng nhà, tái tạo theo seed; 3 bố cục × 4 góc × cutaway bật/tắt không item lồng nhau, sắp xếp không cảnh báo; dựng lại < 300 ms (NFR-04)
- [x] Người dùng xem: "giống 1 con phố" (2026-10-21); xe máy chưa rõ lắm
- [x] Góp ý: xe máy rõ hơn → vẽ dáng xe tay ga nhìn ngang (bánh, thân, yếm, yên, tay lái, người lái)
- [x] Góp ý: nhà rộng 2–3 lần, có nhà làm **nửa hầm để xe** (tầng 1 cao hơn), có nhà rộng bình thường → `basement`, bậc tam cấp, mặt tiền chia gian, 12% nhà rộng trong random, preset `wide-basement` + `wide-plain`, lô Catalog rộng theo nhà (ADR-021)
- [x] Quy tắc tầm với ra vỉa hè 1.9 m (lỗi biển dọc đâm cây/dây do test phát hiện)
- [x] Yêu cầu: **Xưởng nhà** — trang tự nhào nặn một căn (bảng chỉnh mọi tham số, từng tầng, cảnh báo, chép JSON); làm sớm FR-31 của P2; 6 test controller
- [x] Góp ý: "chưa có nhiều option" → thêm 14 lựa chọn (ADR-022), bảng Xưởng nhà chia nhóm thu gọn + sửa chữ từng biển
- [x] Chữa vòng lặp thứ tự vẽ do khối dài: vỉa hè theo ranh nhà, dây điện theo cột, làn xe theo đoạn 5 m (ADR-022); test phố 6 bố cục
- [x] Góp ý: ban công dài hoặc ngắn (rộng hơn cửa một chút) → `balconyWidth`, mỗi gian một ban công ngắn
- [x] Góp ý: chậu cây chỉ là một cục → vẽ lá thật, 4 dáng (bụi, lá nhọn, dây leo rủ, có hoa)
- [x] Góp ý: Hà Nội nhiều cây, trước nhà có cây nhỏ / to, trái / phải / hai bên → `trees` + `treeSize` theo từng nhà, luật tránh đè nhau và tránh cột; bỏ cây rải đều
- [x] Góp ý: cây ban công "vừa bé vừa xấu" → 6 loại cây, cao vượt lan can, chậu to, viền sáng hơn
- [x] Góp ý: thêm ban công mặt kính → `balcony: 'glass'`
- [x] Góp ý: cây vỉa hè "như chùm bóng bay" → tán là đống cụm lá viền múi mây, thân thon + cành, cây to hơn hẳn; tự soát hình bằng `qlmanage` qua 3 vòng trước khi gửi
- [x] Sửa: biển tròn hiện cả tên quán tràn ra ngoài → 1 ký tự
- [x] Góp ý: cây vỉa hè "tán 1 thể, đừng tròn tròn mấy cục" → `canopy()` một viền liền; cây ban công "ok rồi"
- [x] Góp ý: chọn được loại cây ban công → `plantKind` theo tầng, `roofPlantKind` cho sân thượng / mái; ô chọn trong Xưởng nhà
- [x] Góp ý: tán "như cục cơm nắm" → tán ghép từ mảng lá theo cành, hợp thành một viền (kỹ thuật viền dày + nền đè); tán hạ thấp, to và rộng hơn; khe đáy tán cho thấy chỗ chia cành; tự soát bằng bảng thử cây + ảnh phố
- [x] Yêu cầu: thêm ô tô → `car.ts` (4 kiểu), làn 2.8 m chia 3 vệt, nhóm SVG theo vệt (ADR-023); sửa lỗi nét đứt kế thừa ở xe; cutaway cắt cây dãy gần
- [~] **Người dùng kiểm bằng mắt** + đo fps khi xe chạy (NFR-03) và khi đêm
- [ ] Đánh dấu DoD P3

## P4 · Ngã tư
- [~] Thu thập tham khảo: số tầng 2 tòa nhà đã tìm trên web (components C1, C2); còn ảnh + xác nhận tên tòa (Q6)
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
