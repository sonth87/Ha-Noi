# My City

Biến ngã tư **Thái Hà – Tây Sơn – Chùa Bộc** (Đống Đa, Hà Nội) thành một mô hình tương tác theo phong cách **iso-glow**: nét mảnh, mặt phẳng màu, thứ gì đang "sống" (cửa sổ sáng, biển hiệu, đèn đường, dây điện, xe) thì phát sáng.

> **Trạng thái:** monorepo (ADR-032). App SVG cũ đóng băng. Các gói chung đã có (M2): dữ liệu OpenStreetMap của khu ngã tư được nhập thành mô hình thành phố. App 3D mới làm ở M3–M5. Tiến độ: [docs/plan/checklist.md](docs/plan/checklist.md).

## Cấu trúc

| Thư mục | Là gì |
|---|---|
| [apps/svg/](apps/svg/README.md) | App cũ: SVG 2D isometric, xoay 4 góc. **Đóng băng**, vẫn chạy được |
| `apps/city3d/` | App mới: three.js, chế độ 2D và 3D, cơ chế chất lượng nhiều mức (M3) |
| [packages/core/](docs/architecture/city-model.md) | Mô hình thành phố, generator nhà + preset, luật điền phần thiếu, sửa tay, giao thông |
| [packages/osm-data/, packages/osm-import/](docs/architecture/osm-import.md) | Dữ liệu OpenStreetMap và bộ chuyển đổi |
| `packages/theme/` | Token màu, bảng màu nhấn |
| [docs/](docs/README.md) | Tài liệu repo và app mới |

## Chạy

```bash
pnpm install
pnpm dev:svg                                 # app cũ
pnpm typecheck && pnpm lint && pnpm test     # mọi gói
pnpm build                                   # mọi app
```

Dữ liệu bản đồ: © OpenStreetMap contributors (ODbL).
