# Quy ước code (monorepo)

Quy ước cũ của app SVG giữ ở `apps/svg/docs/ai/conventions.md` (đóng băng). File này là quy ước cho các gói mới; những mục còn để ngỏ sẽ được chốt khi tạo gói tương ứng (M2, M3) và ghi ADR.

## 1. Gói và phụ thuộc

| Gói | Chứa | Được dùng | Cấm |
|---|---|---|---|
| `packages/osm-data` | File dữ liệu OSM thô (JSON) + script tải | — | Logic dựng hình |
| `packages/osm-import` | Chuyển OSM → mô hình thành phố | `core`, `osm-data` | three.js, DOM, React |
| `packages/core` | Mô hình thành phố, generator, luật, giao thông, rng | chỉ chính nó | OSM, three.js, DOM, React, `Math.random`, `Date`, `performance` |
| `packages/theme` | Token màu (CSS), bảng màu nhấn | — | Logic cảnh |
| `apps/city3d` | Bộ vẽ three.js, điều khiển, giao diện | mọi gói trên | Tính luật thành phố trực tiếp (phải gọi `core`) |
| `apps/svg` | App cũ, đóng băng (A14) | chỉ chính nó | Import từ gói mới |

- `core` **không biết OSM**: thành phố có thể đến từ OSM hoặc dựng tay, đều qua cùng một mô hình.
- `apps/svg` không phụ thuộc gói mới, để không bao giờ hỏng theo khi core đổi.
- Luật phụ thuộc cưỡng chế bằng ESLint (như ADR-015 của app cũ).

## 2. TypeScript
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Không dùng `any`; dùng `unknown` rồi thu hẹp kiểu.
- Union string literal cho enum. Hàm thuần và dữ liệu bất biến (`readonly`, `as const`) trong `core`.
- Export có tên, không `export default`.
- Import giữa các gói bằng tên gói (`@my-city/core`…); trong một gói dùng alias, không dùng `../`.

## 3. Đặt tên
- **Tiếng Anh**. camelCase cho biến và hàm; PascalCase cho kiểu và component; kebab-case cho tên file và preset id.
- Tên gói: `@my-city/<tên>`.
- Thuật ngữ Việt ↔ Anh theo [glossary](../product/glossary.md). Thêm thuật ngữ mới vào đó.

## 4. Đơn vị
- Mọi gói mới tính bằng **mét** (ADR-033): `x` đông, `y` nam, `z` lên. Đơn vị của app cũ (1 m = 10) chỉ còn trong `apps/svg`. Chi tiết toạ độ, vòng, pháp tuyến: [city-model](../architecture/city-model.md) §1.

## 5. Test
- Vitest, file `*.test.ts` đặt cạnh file nguồn. Mỗi hàm thuần mới trong `core` / `osm-import` có ít nhất 1 test.
- Bộ vẽ 3D: test hình học bằng Node (không cần WebGL): không NaN, đủ id, đúng số tầng, chọn đúng tầng khi click.

## 6. Comment
- Comment giải thích **vì sao**, không lặp lại code. Dòng đầu mỗi file: file làm gì, kèm mã yêu cầu hoặc ADR liên quan.
- Dữ liệu lấy từ OSM ghi id way / relation trong dữ liệu hoặc chú thích.
