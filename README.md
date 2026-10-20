# My City

Biến ngã tư **Thái Hà – Tây Sơn – Chùa Bộc** (Đống Đa, Hà Nội) thành một mô hình isometric tương tác theo phong cách **iso-glow**: bản vẽ nét mảnh trên nền tối, thứ gì đang "sống" (cửa sổ sáng, biển hiệu, đèn đường, dây điện, xe máy) thì phát sáng.

> **Trạng thái:** P1 xong (generator nhà + Catalog). Tiến độ xem ở [docs/plan/checklist.md](docs/plan/checklist.md).

## Tài liệu

Mục lục đầy đủ: [docs/README.md](docs/README.md).

| Thư mục | Dành cho | Nội dung |
|---|---|---|
| [docs/product/](docs/product/) | Mọi người | [Tầm nhìn](docs/product/vision.md) · [Yêu cầu](docs/product/requirements.md) · [Thuật ngữ](docs/product/glossary.md) |
| [docs/user/](docs/user/) | Người xem, người chỉnh dữ liệu | [Hướng dẫn sử dụng](docs/user/guide.md) |
| [docs/architecture/](docs/architecture/) | Người viết code | [Tổng quan](docs/architecture/overview.md) · [Đặc tả nhà](docs/architecture/house-spec.md) · [Thành phần](docs/architecture/components.md) · [Quyết định](docs/architecture/decisions.md) |
| [docs/plan/](docs/plan/) | Theo dõi tiến độ | [Roadmap](docs/plan/roadmap.md) · [Checklist](docs/plan/checklist.md) |
| [docs/ai/](docs/ai/) | Trợ lý AI | [Bối cảnh & luật](docs/ai/README.md) · [Quy ước code](docs/ai/conventions.md) · [Quy trình](docs/ai/workflow.md) |

## Stack

- **Vite + TypeScript + React**, quản lý gói bằng **pnpm**.
- Cảnh vẽ bằng **SVG 2D**, kernel isometric port từ skill **iso-glow** (`.claude/skills/iso-glow/`, MIT).
- Không backend; build ra site tĩnh.

## Chạy (từ P0)

```bash
pnpm install
pnpm dev          # dev server
pnpm test         # Vitest
pnpm build        # build ra dist/
```
