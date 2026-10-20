# Quy ước code

## 1. Tầng và phụ thuộc
Xem [overview §1](../architecture/overview.md) và ADR-015. Tóm tắt:

| Thư mục | Chứa | Được dùng | Cấm |
|---|---|---|---|
| `core/` | Kiểu, dữ liệu, hình học thuần | chỉ `core/` | React, DOM, `Math.random`, `Date`, `performance`, chuỗi SVG |
| `render/` | Hàm `(K, spec, opts) → string` | `core/`, `iso/kernel` | React, DOM, state toàn cục, random ngoài `rng` |
| `scenes/` | `*Controller.ts` (TS thuần, có DOM) + `*Scene.tsx` | mọi tầng | Tính hình học trực tiếp (phải gọi `core`/`render`) |
| `ui/`, `hooks/` | Component và hook React | `iso/`, `core/types` | `render/` |
| `iso/` | Port từ iso-glow | — | Logic riêng của dự án |

## 2. TypeScript
- `strict`, `noUncheckedIndexedAccess`. Không dùng `any`; dùng `unknown` rồi thu hẹp kiểu.
- Kiểu dữ liệu chung đặt ở `core/types.ts`. Union string literal cho enum: `type Roof = 'flat' | 'metal1' | 'metal2' | 'tile'`.
- Ưu tiên hàm thuần và object bất biến (`readonly`, `as const`) trong `core/`.
- Export có tên, không `export default` (trừ component trang nếu Vite yêu cầu).
- Import qua alias: `@core/spec`, `@render/house`, `@iso/kernel`…

## 3. React
- Function component + hook. Không class component.
- Component chỉ lo giao diện; logic cảnh nằm trong controller.
- Đọc state cảnh bằng `useController(controller)` (bọc `useSyncExternalStore`). **Không** `setState` trong vòng rAF.
- Một component một file, tên file PascalCase: `Readout.tsx`.
- Không thư viện state hay UI component ngoài khi chưa có ADR.

## 4. Controller
- Mỗi cảnh: `scenes/<scene>/<scene>Controller.ts` kế thừa hoặc tuân `SceneController`.
- Chỉ phát snapshot mới khi thay đổi có ý nghĩa (đèn, góc nhìn, chế độ). Không phát theo frame.
- `unmount()` phải hủy hết rAF và timer (StrictMode gọi mount/unmount hai lần).
- Animation tính theo `performance.now()`, không đếm frame.
- Tôn trọng reduced motion qua cờ do `useReducedMotion` truyền vào.

## 5. Đặt tên
- **Tiếng Anh**. camelCase cho biến và hàm; PascalCase cho kiểu và component; kebab-case cho tên file trong `core/`, `render/` và cho preset id.
- Thuật ngữ Việt ↔ Anh theo [glossary](../product/glossary.md). Thêm thuật ngữ mới vào glossary.
- Thuộc tính dữ liệu trong SVG: `data-house`, `data-floor`, `data-prop`. Không dùng `id` DOM cho phần tử lặp.
- Class CSS dùng chung (`styles/city.css`): `.fl`, `.win`, `.shop`, `.sign`, `.wire`, `.lamp`, `.bike`.

## 6. Đơn vị và số
- Mọi kích thước tính qua `M` (1 m = 10) hoặc hằng số trong `core/units.ts`. Không viết số ma thuật trong `render/parts/`.
- Làm tròn tọa độ khi ghi ra SVG: `toFixed(2)`.
- `w`, `d` của nhà luôn theo **mặt tiền**, không theo trục x/y.

## 7. SVG & CSS
- Mặt phẳng vẽ bằng `FRONT`/`SIDE`/`TOP`/`plane()` của kernel. **Không** tự viết đa giác xiên.
- Nét lặp (song sắt, cửa xếp, ngói) gộp thành **một `<path>`**.
- Màu chỉ dùng token: `--body --deck --line --detail --recess --ink --ink-hi --glass --glass-on --accent --accent-hi --accent-dim --panel`.
- Mọi stroke có `vector-effect: non-scaling-stroke`.
- Glow (`filter: url(#soft|#glow)`) áp qua CSS trên trạng thái `.on`/`.hot`, không đặt cứng trên phần tử tĩnh.
- Animation CSS có nhánh `@media (prefers-reduced-motion: reduce)`.
- Escape mọi chữ trước khi đưa vào chuỗi SVG.

## 8. Test
- Vitest, file `*.test.ts` đặt cạnh file nguồn.
- Mỗi hàm thuần mới trong `core/` có ít nhất 1 test.
- Snapshot `render/`: chỉ cập nhật (`pnpm test -u`) khi **cố ý** đổi hình, và nói rõ lý do trong báo cáo.

## 9. Comment
- Comment giải thích **vì sao**, không lặp lại code.
- Dòng đầu mỗi file: file làm gì, kèm mã yêu cầu liên quan.
- Khuyến khích bảng tọa độ khối ở đầu hàm dựng (giống figure mẫu của iso-glow):
  ```
  /*  boxes        x   y   z   w   d   h
      body         0   0   0  40 150 168
      cage         0 150  38  40  10  32   */
  ```
