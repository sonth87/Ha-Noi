# Tài liệu My City

Monorepo (ADR-032). Tài liệu ở đây là cho **cả repo và app 3D mới**. Tài liệu đầy đủ của app SVG cũ nằm ở [apps/svg/docs/](../apps/svg/docs/README.md) và được **đóng băng** cùng app.

```
docs/
├── product/        Thuật ngữ                                 ← mọi người
├── architecture/   Mô hình thành phố, nhập OSM, đặc tả nhà, ADR ← người viết code
├── plan/           Roadmap M1–M5, checklist                   ← theo dõi tiến độ
└── ai/             Luật cho trợ lý AI, quy ước, quy trình       ← Claude đọc trước khi làm
```

Tầm nhìn và yêu cầu sản phẩm hiện vẫn ở app cũ; sẽ viết lại cho app mới ở M3.

| File | Nội dung |
|---|---|
| [architecture/city-model.md](architecture/city-model.md) | Mô hình thành phố: toạ độ, các kiểu, luật điền phần thiếu, sửa tay |
| [architecture/osm-import.md](architecture/osm-import.md) | Dữ liệu OSM → mô hình: tải, phép chiếu, bảng tag, các bước, báo cáo, thêm khu mới |
| [architecture/house-spec.md](architecture/house-spec.md) | Đặc tả nhà của generator (mét) |
| [architecture/city3d.md](architecture/city3d.md) | App 3D: cấu trúc, dựng hình, camera 2D/3D, màu, chất lượng |
| [user/guide.md](user/guide.md) | Hướng dẫn dùng app 3D: chạy, phím, bảng chất lượng |
| [architecture/case-studies.md](architecture/case-studies.md) | Sự cố đã gặp → nguyên nhân gốc → luật A17–A37 → rào chắn (test) |
| [architecture/decisions.md](architecture/decisions.md) | ADR-032 trở đi, câu hỏi mở |
| [product/glossary.md](product/glossary.md) | Thuật ngữ Việt ↔ code |
| [plan/roadmap.md](plan/roadmap.md) | M1–M5: mục tiêu, bàn giao, DoD, rủi ro |
| [plan/checklist.md](plan/checklist.md) | Việc cụ thể từng bước, trạng thái |
| [ai/README.md](ai/README.md) | Bối cảnh, bản đồ repo, luật A1–A37, lệnh, cách lấy dữ liệu OSM |
| [ai/guidelines.md](ai/guidelines.md) | Hướng dẫn kỹ thuật theo mảng + danh sách kiểm trước khi báo xong (từ các sự cố CS-01…CS-12) |
| [ai/conventions.md](ai/conventions.md) | Phụ thuộc giữa các gói, TypeScript, đặt tên, test |
| [ai/workflow.md](ai/workflow.md) | Quy trình một đầu việc, mẫu ADR |

## Tài liệu app SVG cũ (đóng băng)
| File | Nội dung |
|---|---|
| [vision](../apps/svg/docs/product/vision.md) · [requirements](../apps/svg/docs/product/requirements.md) · [glossary](../apps/svg/docs/product/glossary.md) | Tầm nhìn, yêu cầu, thuật ngữ |
| [house-spec](../apps/svg/docs/architecture/house-spec.md) · [components](../apps/svg/docs/architecture/components.md) | Đặc tả nhà, bộ phận, landmark (cơ sở cho generator mới) |
| [overview](../apps/svg/docs/architecture/overview.md) · [decisions](../apps/svg/docs/architecture/decisions.md) | Kiến trúc SVG, ADR-001…031 |
| [guide](../apps/svg/docs/user/guide.md) | Hướng dẫn dùng app cũ |
