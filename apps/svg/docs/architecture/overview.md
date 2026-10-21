# Kiến trúc tổng quan

> Stack: **Vite + TypeScript + React**, quản lý gói bằng **pnpm** ([ADR-011](decisions.md)). Phong cách và kernel isometric lấy từ skill **iso-glow** và được port sang TypeScript ([ADR-012](decisions.md)).

## 1. Các tầng

```
┌─ core/ ───────── dữ liệu & hình học thuần (TS, không React, không DOM) ─────────┐
│  types · units · rng · spec (resolve + validate) · presets · view · depth · layout │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │ HouseSpec[], Prop[], ViewState
┌─ render/ ─────── spec → chuỗi SVG (TS thuần, dùng kernel iso) ──────────────────┐
│  house · parts/* · props/* · landmarks/*                                          │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │ { svg: string, items, ids }
┌─ scenes/ ─────── mỗi cảnh = Controller (TS) + Scene component (React) ──────────┐
│  Controller: state mô phỏng, đèn, xe, rAF loop, thao tác DOM trực tiếp            │
│  Scene: gắn <svg>, nối phím/click/UI với Controller                               │
└───────────────────────────────┬─────────────────────────────────────────────────┘
┌─ ui/ + iso/ ──── vỏ ứng dụng React ─────────────────────────────────────────────┐
│  Shell (sidebar, header) · Readout · PalettePicker · ThemeToggle · ParamPanel     │
│  iso/: kernel, tokens.css, GlowDefs, ThemeProvider (port từ iso-glow)             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Luật phụ thuộc** (một chiều, ESLint `no-restricted-imports` cưỡng chế):

| Thư mục | Được import | Không được import |
|---|---|---|
| `core/` | không gì cả (trừ nội bộ `core/`) | `react`, `render/`, `scenes/`, `ui/`, DOM API |
| `render/` | `core/`, `iso/kernel` | `react`, `scenes/`, `ui/`, DOM API |
| `scenes/` | `core/`, `render/`, `iso/`, `ui/`, `hooks/` | — |
| `ui/`, `hooks/` | `iso/`, `core/types` | `render/` |

`core/` là phần sống lâu nhất: giữ nguyên nếu sau này đổi renderer (ví dụ sang 3D).

## 2. Cấu trúc thư mục

```
My City/
├── CLAUDE.md · README.md
├── package.json · pnpm-lock.yaml
├── index.html · vite.config.ts · tsconfig.json · eslint.config.js
├── docs/
├── .claude/skills/iso-glow/          # skill gốc (tham khảo, không import trực tiếp)
└── src/
    ├── main.tsx · App.tsx
    ├── iso/                          # port từ iso-glow (MIT, giữ ghi công)
    │   ├── kernel.ts                 # P, D, plane, TOP/FRONT/SIDE, rect, box, boxc, path, slits
    │   ├── frame.ts                  # frame(points, pad) → { K, viewBox }
    │   ├── palettes.ts               # palette 'city', 'ember'
    │   ├── tokens.css                # token màu dark/light + glow kit (.face .detail .glass .halo .wire .pulse …)
    │   ├── GlowDefs.tsx              # <defs> filter #glow #soft #bloom (userSpaceOnUse; light theme = pass-through)
    │   ├── theme.ts                  # ThemeContext, useTheme, storage an toàn (try/catch)
    │   ├── ThemeProvider.tsx         # theme + accent → <html data-theme data-accent>, CSS accent theo palette
    │   ├── kernel.test.ts            # so bản port với kernel gốc trong gallery.html của skill
    │   └── LICENSE                   # MIT notice của iso-figure / iso-glow
    ├── core/
    │   ├── types.ts                  # HouseSpec, Facing, Box3, Item, ViewState…
    │   ├── units.ts                  # M = 10 + kích thước mặc định
    │   ├── rng.ts                    # PRNG có seed, hash(str)
    │   ├── spec.ts                   # DEFAULTS, resolveSpec, validateSpec
    │   ├── presets.ts                # PRESETS: Record<string, Partial<HouseSpec>>
    │   ├── view.ts                   # rotate, facing, visibleFace
    │   ├── depth.ts                  # depthSort
    │   ├── layout.ts                 # Section, streetRows, streetLayout, flyover
    │   ├── crossroads.ts             # crossroadsLayout, junctionGrid
    │   └── traffic.ts                # đèn giao thông, mô hình xe
    ├── render/
    │   ├── hello.ts                  # P0: một căn nhà hộp để kiểm pipeline (thay bằng house.ts ở P1)
    │   ├── house.ts                  # renderHouse(K, spec) → Item[] · floorIds(spec)
    │   ├── local.ts                  # LocalDraw: vẽ trong hệ cục bộ của nhà (a dọc mặt tiền, b ra phố) cho mọi hướng
    │   ├── scene.ts                  # composeScene: depthSort + khung hình
    │   ├── geom.ts · svg.ts          # trụ nằm, vòng tròn mặt đất, dây võng · helper chuỗi SVG
    │   ├── reference-house.ts        # P1a: nhà mẫu vẽ tay (giữ làm hình tham chiếu)
    │   ├── parts/                    # ctx · windows · ground · signs · balconies · walls · roofs · roof-items
    │   ├── props/                    # lot · street (vỉa hè, cột, dây, đèn, làn xe) · junction (nút giao, đèn giao thông) · flyover
    │   ├── street-scene.ts · crossroads-scene.ts  # ghép cảnh phố / ngã tư
    │   └── landmarks/                # shapes · thai-binh · novotel · garden · showcase (trang Công trình)
    ├── scenes/
    │   ├── SceneSvg.tsx              # host <svg>: innerHTML từ render, ủy quyền click, aria
    │   ├── SceneView.tsx             # khung figure: caption, stage, hint, readout; giữ controller; ?demo
    │   ├── controller.ts             # lớp cơ sở SceneController (subscribe/getSnapshot, attach/detach, after/loop)
    │   ├── registry.ts               # danh sách cảnh trong sidebar
    │   ├── hello/                    # P0
    │   ├── catalog/                  # catalogController.ts (dùng SceneView chung)
    │   ├── reference/                # P1a: referenceController.ts
    │   ├── street/
    │   └── crossroads/
    ├── ui/                           # Shell · Sidebar · Readout · PalettePicker · ThemeToggle · ParamPanel · KeyHints
    ├── hooks/                        # useKeys · useReducedMotion · useController
    └── styles/
        ├── app.css                   # bố cục vỏ ứng dụng (port từ gallery shell của iso-glow)
        └── city.css                  # class dùng chung của cảnh: .fl .win .shop .sign .wire .lamp .bike
```

Test đặt cạnh mã: `core/*.test.ts`, `render/*.test.ts` (snapshot).

## 3. React và SVG phối hợp thế nào

Một cảnh có thể lên tới vài nghìn phần tử SVG và có xe chạy theo từng frame. Vì vậy **React không quản lý từng phần tử SVG** ([ADR-013](decisions.md)).

| Việc | Ai làm | Cách |
|---|---|---|
| Hình học tĩnh (nhà, đường, cây) | `render/` | Sinh **chuỗi SVG**; `SceneSvg` gán `innerHTML` khi dữ liệu / góc nhìn / cutaway đổi (`useMemo` + `useLayoutEffect`) |
| Bật/tắt đèn, mở cửa hàng | Controller | `classList.toggle` trên phần tử có `data-id`; không dựng lại SVG |
| Xe, xung điện, đèn giao thông | Controller | `requestAnimationFrame`, đặt `transform` trực tiếp, tính vị trí theo thời gian |
| Readout, sidebar, panel, palette | React | Đọc snapshot của controller qua `useSyncExternalStore` |
| Phím tắt | `useKeys` → controller | Một bản đồ phím chung, cảnh khai báo phím riêng |
| Click vào nhà | `SceneSvg` | Ủy quyền sự kiện: `e.target.closest('[data-house]')` → `controller.toggleHouse(id)` |

### SceneController (hợp đồng, `src/scenes/controller.ts`)
```ts
interface SceneSnapshot { svg: string; viewBox: string; readout: string; power: boolean }

abstract class SceneController<S extends SceneSnapshot> {
  getSnapshot(): S;                         // state bất biến cho React (readout, glow nền…)
  subscribe(fn: () => void): () => void;    // cho useSyncExternalStore
  attach(svg: SVGSVGElement): void;         // gọi sau khi SceneSvg gán innerHTML → onAttach() áp lại state
  detach(): void;                           // hủy mọi timer/loop tạo qua after()/loop()
  key(e: KeyboardEvent): boolean;           // true = đã xử lý
  click(target: Element): void;             // ủy quyền từ <svg>
  demo(): void;                             // chạy khi URL có ?demo
  protected update(patch: Partial<S>): void;  // phát snapshot mới
  protected after(ms, fn); protected loop(fn: (now) => void);
}
```
- Snapshot chỉ đổi khi có thay đổi ý nghĩa (không đổi theo mỗi frame), để React không re-render 60 lần/giây.
- Khi controller cần dựng lại hình (xoay, cutaway), nó gọi `update({ svg })`. `SceneSvg` thấy chuỗi đổi thì `detach()`, gán `innerHTML` mới, rồi `attach()`; controller áp lại trạng thái đèn và khởi động lại các loop cần chạy tiếp.
- React StrictMode ở dev chạy `attach → detach → attach`; hợp đồng trên bảo đảm việc này an toàn.
- Mỗi cảnh khai báo trong `src/scenes/registry.ts` (`id`, `name`, `hint`, `aria`, `create()`); `SceneView` giữ controller suốt vòng đời cảnh (`key={id}`).

## 4. Build & công cụ

| Lệnh | Tác dụng |
|---|---|
| `pnpm dev` | Dev server Vite, hot reload |
| `pnpm build` | `tsc -b` (kiểm kiểu) + `vite build` → `dist/` tĩnh |
| `pnpm preview` | Chạy bản build |
| `pnpm build:single` | (tùy chọn) Gộp thành **một file HTML** bằng `vite-plugin-singlefile` để gửi cho người khác |
| `pnpm test` | Vitest (unit + snapshot) |
| `pnpm lint` | ESLint (kèm luật phụ thuộc giữa các tầng) |
| `pnpm typecheck` | `tsc --noEmit` |

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Alias đường dẫn: `@core/*`, `@render/*`, `@iso/*`, `@ui/*`, `@scenes/*`, `@hooks/*`, `@styles/*`. Import đi lên thư mục cha (`../`) bị ESLint cấm, để luật phân tầng luôn nhìn thấy import.
- Không thư viện state ngoài (Redux, Zustand…): controller + `useSyncExternalStore` là đủ.
- Không thư viện UI component. CSS thuần dùng token iso-glow.
- Version cụ thể của Vite / React / TS ghi lại trong ADR khi scaffold (P0).

## 5. Hệ tọa độ & đơn vị

- Kernel iso-glow: **+x** chéo xuống-phải, **+y** chéo xuống-trái, **+z** lên.
- `P(x,y,z) = ((x−y)·cos30°, (x+y)·sin30° − z)`.
- **1 m = 10 đơn vị** (`M = 10` trong `core/units.ts`). Nhà ống rộng 4 m → `w = 40`; tầng 3.3 m → `33`.
- Hướng trong dữ liệu (MVP, chưa khớp bản đồ thật): **N = −y, S = +y, E = +x, W = −x**.
- Mặt **nhìn thấy được**: trên (TOP), **S** → `FRONT`, **E** → `SIDE`. Mặt N và W không bao giờ được vẽ.

### Hướng vẽ trong mặt phẳng
- `FRONT(x, y+d, z+h)`: u chạy theo +x, v chạy xuống.
- `SIDE(x+w, y+d, z+h)`: u chạy theo −y, v chạy xuống.
- Trên màn hình cả hai đều là **trái → phải**, nên một hàm vẽ mặt tiền `facade(w, h)` (tọa độ cục bộ, gốc trên-trái) dùng được cho cả hai mặt mà không cần lật.

## 6. Xoay góc nhìn

Góc nhìn `k ∈ {0,1,2,3}` = xoay thế giới `k × 90°` quanh tâm cảnh `(cx, cy)`.

```
rot1(x, y) = ( cx − (y − cy),  cy + (x − cx) )      // một bước 90°
rotk       = rot1 áp dụng k lần
facing     : E → S → W → N → E                       // +x ↦ +y, +y ↦ −x, …
```

Với một khối có footprint `(x, y, w, d)`:
1. Xoay 4 góc, lấy min/max → footprint mới; khi `k` lẻ thì đổi `w ↔ d`.
2. `facing` xoay `k` bước theo vòng trên.
3. Sau xoay: `facing == 'S'` → mặt tiền vẽ trên `FRONT`; `'E'` → trên `SIDE`; `'N'`/`'W'` → mặt tiền khuất, `FRONT`/`SIDE` nhận bản vẽ **mặt lưng/tường hồi**.
4. Chi tiết nhô ra mặt tiền (ban công, đua ra, mái hiên) được tính trong hệ cục bộ của căn nhà (u dọc mặt tiền, n hướng ra phố) rồi mới chuyển sang tọa độ thế giới. Nhờ vậy xoay không làm sai vị trí.

Xoay xong thì **dựng lại toàn bộ chuỗi SVG** (không dùng CSS transform). Mục tiêu ≤ 300 ms (NFR-04). Có test: 4 bước về lại ban đầu.

## 7. Thứ tự vẽ (depth sort)

Kernel không có z-buffer: phần tử vẽ sau đè phần tử vẽ trước. Mỗi thứ cần vẽ là một **item** có hộp bao `(x0,y0,z0)–(x1,y1,z1)`.

### Quy tắc
Item **A phải vẽ trước B** nếu hình chiếu của chúng chồng nhau *và* A nằm hẳn phía sau B theo ít nhất một trục:
- `A.x1 ≤ B.x0`, hoặc `A.y1 ≤ B.y0`, hoặc `A.z1 ≤ B.z0`.

### Thuật toán (`core/depth.ts → depthSort`)
1. Lọc cặp có hình chiếu 2D chồng nhau (so hộp bao trên màn hình).
2. Dựng đồ thị "vẽ trước", **sắp xếp topo** (Kahn).
3. Nếu có chu trình (không xảy ra với hộp không giao nhau): phá bằng khóa `x0 + y0 + z0`, trả kèm danh sách cảnh báo.
4. Lọc cặp bằng **lưới màn hình** (ô 64 đv, ADR-027): chỉ so cặp có hộp bao chung ô; kết quả y hệt so mọi cặp. Ngã tư ~2000 item dựng trong ~170 ms.

### Đơn vị sắp xếp
- Mỗi căn nhà **thường là 1 item** (vẽ trọn từ thân → mái).
- Nhà có phần nhô ra (đua ra, ban công) hoặc nhà chữ L: tách thành nhiều item.
- Đồ phố (cột điện, cây, đèn) là item riêng.
- Xe máy: nằm trong **lớp làn đường**, vẽ sau dãy xa và trước dãy gần, nên không cần sắp lại mỗi frame. Dây điện vẽ ở lớp cao nhất.

### Thứ tự trong một căn
`thân → mặt tiền tầng 1 → các tầng → ban công/đua ra → mái → tum → vật trên mái (sắp theo x+y)`.

## 8. Cutaway

- Tính trong hệ góc nhìn hiện tại: dãy nhà nằm **giữa đường và người xem** (mặt tiền quay về N hoặc W sau xoay) là "dãy gần".
- Khi bật: dãy gần vẽ với `floors = 0` (chỉ tầng 1, cắt ở cao độ `groundH`), mặt cắt trên đỉnh có nét `detail`.
- Cutaway không đổi dữ liệu, chỉ đổi `opts` truyền vào `renderHouse()`.

## 9. Ánh sáng & trạng thái

- Mỗi căn có `data-house="<id>"`; mỗi tầng `data-floor="<n>"`. Bật đèn = toggle class `.on`, **không dựng lại SVG**.
- Cửa sổ có biến thể lived-in theo seed: `off` (tắt hẳn), `dim`, `hi`.
- Glow filter chỉ áp lên nhóm đang `.on` (qua CSS) để giữ hiệu năng (NFR-03).
- Xung điện trên dây: `path` với `pathLength="1000"` + class `.pulse.go`, phát lại bằng cách gỡ rồi gắn lại class.
- Xe máy: controller dịch chuyển bằng `transform`, vị trí tính theo `performance.now()`, không đếm frame.
- Theme sáng: không glow (filter pass-through, `.halo` ẩn); thứ đang sáng là màu accent phẳng (luật iso-glow).

## 9b. Ngã tư (P4)

- **Bố cục** (`core/crossroads.ts`, ADR-024): 2 phố thẳng cắt nhau, mỗi phố một khung riêng (X = Tây Sơn quay S, Y = Thái Hà – Chùa Bộc quay W); phố chừa `gap` ở nút giao, `ranges` là các đoạn có nhà; 4 lô góc riêng. `placeIn(frame, spec)` đưa nhà từ tọa độ phố vào thế giới; sau đó xoay theo góc nhìn như mọi thứ khác (tâm xoay = tâm ngã tư).
- **Mặt cắt** (`Section`): vị trí mặt tiền, vỉa hè, lòng đường, làn (`Lane.fly` cho làn lên cầu), dải phân cách, cột/cây. `STREET` (8 m, 2 làn) và `TAY_SON` (16 m, 4 làn + dải giữa).
- **Dựng cảnh** (`render/crossroads-scene.ts`): 2 phố (`renderStreet` nhận khung bất kỳ), cầu vượt (`flyover.ts`), nút giao (`junction.ts`), 4 lô (`landmarks/*`), rồi các nhà.
- **Xe**: mỗi xe có `data-vid` cố định; mô hình (`core/traffic.ts`, ADR-025) sống qua các lần dựng lại (xoay, cutaway). Mỗi frame controller bước mô hình rồi đặt `transform` (dọc phố, nâng theo `flyZ` nếu trên cầu) và chuyển xe vào nhóm đang chứa nó: đoạn làn 5 m, đoạn cầu, hoặc ô làn trong nút giao.
- **Đèn**: `.signal.go|wait|stop` + số đếm `.sig-count`, chỉ ghi DOM khi trạng thái đổi.

## 10. Kiểm thử

| Loại | Công cụ | Nội dung |
|---|---|---|
| Unit | Vitest | `rng` tái tạo được; `resolveSpec`/`validateSpec`; `view.rotate` 4 lần về ban đầu; facing đúng; `depthSort` trên các ca mẫu (hàng ngang, hàng dọc, nhà cao cạnh nhà thấp, nhà L, ô lưới) |
| Snapshot | Vitest `toMatchSnapshot` | `renderHouse(K, spec)` với spec cố định → chuỗi SVG không đổi (NFR-06) |
| Kiểu | `tsc` | Trong `pnpm build` và `pnpm typecheck` |
| Kiến trúc | ESLint | Luật phụ thuộc giữa các tầng (mục 1) |
| Thị giác | Trình duyệt thật | Danh sách kiểm trong checklist từng phase; không tự động hóa trình duyệt |

## 11. Hiệu năng

- Mặt khuất không vẽ chi tiết; mặt lưng chỉ vài nét.
- Gộp nét lặp (song cửa, chuồng cọp) thành **một `path`**.
- Filter glow chỉ áp lên nhóm `.on`; không đặt filter lên từng cửa sổ.
- React không re-render theo frame (mục 3).
- Nếu vẫn dưới 50 fps: tách lớp xe máy sang `<canvas>` phủ lên, hoặc giảm số xe. Làm thì ghi ADR.
