# Tài liệu My City

Tài liệu chia theo **người đọc** và **mục đích**. Mỗi thư mục trả lời một nhóm câu hỏi.

```
docs/
├── product/        Làm cái gì, vì sao, phải đạt gì         ← đọc đầu tiên
├── user/           Dùng sản phẩm thế nào                  ← người xem / người chỉnh dữ liệu
├── architecture/   Bên trong được xây ra sao              ← người viết code
├── plan/           Làm theo thứ tự nào, đang ở đâu         ← theo dõi tiến độ
└── ai/             Quy tắc cho trợ lý AI làm việc trên dự án ← Claude đọc trước khi làm
```

## product/ — Sản phẩm
| File | Nội dung |
|---|---|
| [vision.md](product/vision.md) | Ý tưởng, động lực, mục tiêu, non-goals, phạm vi, nguyên tắc, tiêu chí thành công |
| [requirements.md](product/requirements.md) | Yêu cầu chức năng (FR), phi chức năng (NFR), ràng buộc (C), bảng phím |
| [glossary.md](product/glossary.md) | Thuật ngữ Việt ↔ tên trong code |

## user/ — Người dùng
| File | Nội dung |
|---|---|
| [guide.md](user/guide.md) | Cách chạy, điều khiển, thêm/sửa nhà và preset, xử lý sự cố |

## architecture/ — Kiến trúc
| File | Nội dung |
|---|---|
| [overview.md](architecture/overview.md) | Các tầng, thư mục, module, build, tọa độ, xoay, thứ tự vẽ, cutaway, ánh sáng, test, hiệu năng |
| [house-spec.md](architecture/house-spec.md) | Đặc tả dữ liệu một căn nhà, preset v1, luật hợp lệ |
| [components.md](architecture/components.md) | Bộ phận nhà, đồ phố, landmark: hình học và trạng thái sáng |
| [decisions.md](architecture/decisions.md) | Nhật ký quyết định (ADR), câu hỏi mở, nhật ký đo đạc |

## plan/ — Kế hoạch
| File | Nội dung |
|---|---|
| [roadmap.md](plan/roadmap.md) | Phase P0–P5: bàn giao, phụ thuộc, tiêu chí hoàn thành (DoD), rủi ro |
| [checklist.md](plan/checklist.md) | Việc cụ thể từng phase, trạng thái hiện tại |

## ai/ — Cho trợ lý AI
| File | Nội dung |
|---|---|
| [README.md](ai/README.md) | Bối cảnh nhanh, thứ tự đọc, luật bắt buộc |
| [conventions.md](ai/conventions.md) | Quy ước code, đặt tên, CSS, SVG |
| [workflow.md](ai/workflow.md) | Quy trình một đầu việc: trước – trong – sau, cập nhật tài liệu |

## Lộ trình đọc gợi ý
- **Người mới**: `product/vision` → `plan/roadmap` → `plan/checklist`.
- **Viết code**: thêm `architecture/overview` → `architecture/house-spec` → `ai/conventions`.
- **Chỉ muốn thêm nhà**: `user/guide` → `architecture/house-spec`.
