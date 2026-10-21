# @my-city/svg — app SVG cũ (đóng băng)

Mô hình isometric SVG 2D của ngã tư Thái Hà – Tây Sơn – Chùa Bộc: generator nhà + Catalog, Xưởng nhà, phố Thái Hà, Ngã tư (cầu vượt, đèn giao thông, xe), trang Công trình, và trang thử 3D (`/lab-3d.html`, ADR-031).

**Đóng băng từ 2026-10-21 (ADR-032, luật A14):** không sửa, không thêm tính năng; không phụ thuộc các gói mới. Việc mới làm ở `apps/city3d` và `packages/*`.

Chạy từ thư mục gốc của repo:

```bash
pnpm dev:svg | pnpm build:svg | pnpm test:svg | pnpm lint:svg | pnpm typecheck:svg
```

Tài liệu đầy đủ của app này: [docs/README.md](docs/README.md).
