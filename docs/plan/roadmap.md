# Roadmap

Mỗi phase có: **mục tiêu**, **bàn giao**, **tiêu chí hoàn thành (DoD)**, **phụ thuộc**. Một phase chỉ được đánh dấu xong khi mọi DoD đạt. Việc chi tiết nằm ở [checklist](checklist.md).

```
P0 Khung ──► P1 Nhà cơ bản + Catalog ──► P2 Thư viện chi tiết ──► P3 Một nhánh phố ──► P4 Ngã tư ──► P5 Hoàn thiện
   nhỏ          ⭐ lõi                       ⭐ lõi                    sống động           landmark       sau MVP
```

**MVP = P0 → P4.** P5 là mở rộng.

---

## P0 · Khung project

| | |
|---|---|
| **Mục tiêu** | Dựng khung Vite + TS + React, port nền tảng iso-glow, có một cảnh tối thiểu chạy đầu đến cuối |
| **Bàn giao** | Scaffold (`package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`); `src/iso/*` (kernel, frame, palettes, tokens.css, GlowDefs, ThemeProvider, LICENSE); `src/core/{types,units,rng}.ts`; `src/scenes/{SceneSvg.tsx,controller.ts}`, `scenes/hello/`; `src/ui/` (Shell, Sidebar, Readout, PalettePicker, ThemeToggle); `hooks/useKeys`; test đầu tiên |
| **Phụ thuộc** | Skill iso-glow (đã có) |
| **Yêu cầu** | FR-24, FR-37, NFR-01, NFR-11, NFR-12, NFR-13, NFR-14 |

**DoD**
- [x] `pnpm dev` chạy; `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` đều sạch.
- [x] Trang có vỏ ứng dụng: sidebar (1 mục "Hello"), palette picker `city`, nút theme sáng/tối, readout.
- [x] Cảnh Hello: một khối nhà hộp vẽ bằng kernel đã port; click (hoặc `Space`) bật đèn cửa sổ, glow hiện rõ ở theme tối, thành accent phẳng ở theme sáng. *(người dùng xác nhận bằng ảnh chụp 2 theme, 2026-10-20)*
- [x] Nét và glow nhìn giống figure gốc của iso-glow.

**P0 hoàn thành 2026-10-20.** Nhận xét của người dùng khi duyệt: căn nhà Hello trông như "tòa nhà" chứ không phải "nhà phố", dẫn tới bước P1a bên dưới (ADR-016).
- [x] Test: `rng` tái tạo được; kernel port khớp kernel gốc (test chạy chính mã gốc trong `gallery.html`).
- [x] Luật phụ thuộc ESLint bắt được lỗi khi thử import `react` trong `core/`.
- [x] Ghi version Vite / React / TS vào ADR-011.

---

## P1 · Nhà cơ bản + Catalog ⭐

### P1a · Nhà mẫu (chốt ngoại hình trước khi làm generator)

| | |
|---|---|
| **Mục tiêu** | Vẽ tay một căn nhà ống "đúng chất Hà Nội" để người dùng duyệt ngoại hình; sau đó bóc thành các bộ phận có tham số (ADR-016) |
| **Bàn giao** | `render/reference-house.ts`, `render/geom.ts` (trụ nằm, vòng tròn mặt đất, dây võng), `scenes/reference/`, bổ sung `styles/city.css` |
| **Phụ thuộc** | P0 |

**DoD**
- [x] Nhà chính 4 m × 15 m: tầng 1 quán cà phê (cửa xếp gập 2 bên, biển hộp đèn, mái hiên bạt), tầng 2 đua ra + ban công sắt có chậu cây, tầng 3 chuồng cọp, tầng 4 cửa chớp + cục nóng, phòng tum lùi vào + sân thượng (chậu cây, dây phơi, lan can), trên mái bồn inox nằm + ăng-ten + máy NLMT.
- [x] Hàng xóm trái cao hơn (lộ tường hồi có quảng cáo sơn), hàng xóm phải thấp mái tôn (lộ tường hồi nhà chính có vệt ố, ống nước, cục nóng).
- [x] Vỉa hè có ghế nhựa, xe máy; cột điện, đèn đường, dây điện võng + dây vào nhà + bó dây rối; xung sáng chạy dọc dây.
- [x] Tương tác: click tầng, `1–5`, `Space`, `N` ngày/đêm, `W` xung điện; `?demo`.
- [x] **Người dùng duyệt ngoại hình** sau 2 vòng góp ý (2026-10-20).
- [x] Liệt kê bộ phận bóc thành `render/parts/*` và tham số ([components](../architecture/components.md) mục E).

**P1a hoàn thành 2026-10-20.**

### P1b · Generator + Catalog

| | |
|---|---|
| **Mục tiêu** | Chứng minh ý tưởng cốt lõi: nhà dựng từ dữ liệu, xoay góc nhìn đúng, bật đèn được |
| **Bàn giao** | `core/{types,spec,presets,view,depth,layout}.ts`; `render/{local,house,scene}.ts`; `render/parts/{ctx,windows,ground,signs,balconies,walls,roofs,roof-items}.ts`; `render/props/lot.ts`; 6 preset; `scenes/catalog/` |
| **Phụ thuộc** | P0 |
| **Yêu cầu** | FR-01, 02, 03 (một phần), 04 (một phần), 12, 13, 20, 22, 30, 37 |

**DoD**
- [ ] Catalog hiển thị 6 preset, mỗi căn trên ô đất riêng (xếp thành 1 hàng như dãy phố, thay cho lưới 3 × 2 để không căn nào che mặt tiền căn khác), nhìn khác nhau rõ rệt. *(code xong, chờ kiểm bằng mắt)*
- [ ] `Q`/`E` xoay 4 hướng: mặt tiền (cửa hàng, cửa sổ) luôn nằm đúng phía; mặt lưng hiện khi mặt tiền khuất.
- [x] Click căn → bật/tắt đèn; `←`/`→` chọn căn; `Space` bật đèn căn đang chọn; `R` sinh căn ngẫu nhiên ở ô đang chọn (thêm `P` về preset, `N` ngày/đêm).
- [x] Readout: `view S · 3/27 lit · 01 Nhà mẫu · cà phê`.
- [x] Test: xoay 4 lần về lại ban đầu; facing đúng ở 4 hướng; `depthSort` đúng các ca mẫu; snapshot SVG ổn định; không bộ phận lồng nhau (77 test).
- [ ] Không lỗi che khuất khi xoay (kiểm bằng mắt, 4 hướng).

---

## P2 · Thư viện chi tiết ⭐

| | |
|---|---|
| **Mục tiêu** | Nhà "ra chất Hà Nội": đủ bộ phận, đủ preset |
| **Bàn giao** | Đầy đủ `render/parts/*` theo [components](../architecture/components.md) mục A; `core/presets.ts` ≥ 12 preset; `ui/ParamPanel` trong catalog |
| **Phụ thuộc** | P1 |
| **Yêu cầu** | FR-03 → FR-11, FR-31 |

**DoD**
- [ ] Có đủ: 4 kiểu tầng 1 + mái hiên + biển hiệu; 5 kiểu cửa sổ; 4 kiểu ban công + cây + quần áo; 4 kiểu mái + tum + mái che; 6 vật trên mái; đua ra; tầng lùi; nhà L; nhà vát.
- [ ] 12 preset trong [house-spec](../architecture/house-spec.md) hiển thị đúng mô tả.
- [ ] Catalog: chọn một căn, đổi được từng tham số chính (tầng, mái, ban công, cửa, tầng 1, vật trên mái) bằng nút hoặc phím, thấy kết quả ngay.
- [ ] Thêm thử một preset thứ 13 **chỉ bằng dữ liệu** → hiển thị đúng (tiêu chí S3).
- [ ] Tự đánh giá S1: nhìn catalog thấy "nhà kiểu này phố mình có".

---

## P3 · Một nhánh phố thẳng

| | |
|---|---|
| **Mục tiêu** | Ghép nhà thành dãy phố sống động |
| **Bàn giao** | `core/layout.ts` (`streetRow`), `render/props/*` (vỉa hè, lòng đường, cột điện + dây, đèn đường, cây, xe máy), `scenes/street/` |
| **Phụ thuộc** | P2 (có thể bắt đầu song song từ giữa P2 với bộ preset hiện có) |
| **Yêu cầu** | FR-21, 23, 32, 34, 35, 36; NFR-03, 04, 09 |

**DoD**
- [ ] ~100 m phố, mỗi bên 20–25 căn sát nhau, cao thấp lệch tự nhiên, xen nhà thấp.
- [ ] Cột điện + dây võng + bó dây rối; xung sáng chạy dọc dây.
- [ ] Xe máy chạy 2 chiều, `T` bật/tắt.
- [ ] `X` cutaway: dãy gần còn tầng 1, thấy rõ mặt đường và dãy đối diện.
- [ ] `N` ngày/đêm: đèn nhà bật dần, đèn đường bật, cửa hàng mở.
- [ ] `Q`/`E` xoay 4 hướng, không lỗi che khuất, dựng lại ≤ 300 ms.
- [ ] ≥ 50 fps khi xe chạy (đo bằng DevTools Performance).
- [ ] `?demo` mở ra đã là đêm, đèn sáng, xe chạy.

---

## P4 · Ngã tư

| | |
|---|---|
| **Mục tiêu** | Toàn cảnh ngã tư Thái Hà – Tây Sơn – Chùa Bộc |
| **Bàn giao** | `core/layout.ts` (`crossroads`), `render/landmarks/*`, `render/props/traffic-light.ts`, `scenes/crossroads/` |
| **Phụ thuộc** | P3 |
| **Yêu cầu** | FR-33, 35, 36; NFR-03, 04, 05 |

**DoD**
- [ ] 4 nhánh (mỗi nhánh dùng `streetRow`), mặt đường giao nhau có vạch dừng, vạch sang đường.
- [ ] Tòa Thái Bình và Novotel: hình khối phân biệt rõ với nhau và với nhà ống; bật đèn theo tầng.
- [ ] 2 vườn hoa: lối đi, cây, ghế, đèn vườn sáng về đêm.
- [ ] Đèn giao thông đổi pha; xe dừng ở vạch khi đỏ, chạy khi xanh, rẽ được (tùy chọn).
- [ ] Xoay 4 hướng + cutaway hoạt động; không lỗi che khuất ở 4 góc.
- [ ] Hiệu năng đạt NFR-03, NFR-04; kích thước đạt NFR-05.
- [ ] `pnpm build:single` ra một file HTML chạy được (NFR-02).
- [ ] Tự đánh giá S2: người quen khu đó nhận ra.

---

## P5 · Hoàn thiện (sau MVP)

Không có DoD cứng; chọn việc theo ưu tiên lúc đó.
- Đối chiếu ảnh khảo sát, chỉnh landmark và từng đoạn phố.
- Bản đồ thật: hướng phố, góc giao nhau, footprint từ OpenStreetMap.
- Mở rộng preset lên 20–50.
- Âm thanh phố (còi xe, tiếng mưa) – tùy chọn.
- Thời tiết: mưa (vệt nét rơi, mặt đường phản sáng).
- Bản 3D (three.js) dùng lại dữ liệu nếu SVG chạm giới hạn.

---

## Rủi ro

| # | Rủi ro | Khả năng | Ảnh hưởng | Phòng tránh / xử lý |
|---|---|---|---|---|
| R1 | Dãy nhà gần che dãy xa, chỉ thấy lưng nhà | Chắc chắn | Cao | Xoay góc nhìn (P1) + cutaway (P3), đã nằm trong kiến trúc |
| R2 | Sai thứ tự vẽ với nhà nhô / chữ L / ngã tư | Cao | Cao | `depthSort` topo + test ca mẫu từ P1; tách nhà phức tạp thành nhiều item |
| R3 | SVG chậm với ~200 căn + xe chạy | Trung bình | Cao | Glow chỉ trên nhóm `.on`; gộp nét thành path; mặt khuất không vẽ chi tiết; phương án canvas cho xe |
| R4 | Dãy phố đơn điệu, kiểu copy-paste | Trung bình | Trung bình | Seed biến thể; quy tắc xen nhà thấp; ≥ 12 preset |
| R5 | Landmark không nhận ra được | Trung bình | Trung bình | Lấy ảnh tham khảo trước P4; tập trung vào tỉ lệ & hình khối |
| R6 | Phạm vi phình to (thêm chi tiết mãi) | Cao | Trung bình | DoD rõ cho từng phase; ý mới ghi vào P5, không chen vào phase đang làm |
| R7 | Mâu thuẫn "Hà Nội hỗn loạn" vs "iso-glow tối giản" | Trung bình | Trung bình | Luật: chi tiết lặp lại bằng nét `detail` mờ; chỉ thứ đang sống mới dùng accent |
| R8 | Port iso-glow sang TS/React làm lệch thẩm mỹ (nét, glow khác bản gốc) | Trung bình | Cao | Snapshot test kernel; so cạnh nhau với figure gốc ở DoD P0 |
| R9 | React re-render làm giật khi xe chạy | Trung bình | Cao | ADR-013: controller thao tác DOM trực tiếp, snapshot chỉ đổi khi có thay đổi ý nghĩa (NFR-14) |
| R10 | P0 phình to vì vừa scaffold vừa port | Trung bình | Trung bình | Chỉ port những gì cảnh Hello dùng; phần còn lại port khi cần |
