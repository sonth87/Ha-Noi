# Quy trình một đầu việc

## Trước khi làm
1. Đọc [checklist](../plan/checklist.md): việc này thuộc phase nào, có nằm trong phase hiện tại không. Nếu không thì hỏi người dùng hoặc ghi vào backlog.
2. Đọc DoD của phase trong [roadmap](../plan/roadmap.md) và mã yêu cầu (FR/NFR) liên quan trong [requirements](../product/requirements.md).
3. Kiểm [decisions](../architecture/decisions.md): có ADR nào ràng buộc việc này không, có câu hỏi mở nào chặn không.
4. Đánh dấu việc `[~]` trong checklist.

## Trong khi làm
- Làm đúng phạm vi việc; thấy việc khác cần làm thì ghi lại, không làm luôn.
- Gặp lựa chọn kỹ thuật không hiển nhiên thì chọn phương án hợp lý và **ghi ADR**. Nếu lựa chọn ảnh hưởng đến trải nghiệm hoặc phạm vi thì **hỏi người dùng** trước.
- Đổi cấu trúc dữ liệu thì sửa [house-spec](../architecture/house-spec.md) ngay.
- Thêm hoặc đổi bộ phận thì sửa [components](../architecture/components.md) ngay.

## Sau khi làm (Definition of Done cho một việc)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` sạch (hoặc báo rõ lỗi nào và vì sao).
- [ ] `pnpm build` không lỗi (khi việc chạm tới cấu hình build hoặc trước khi đóng phase).
- [ ] Đã nhờ người dùng xem trên `pnpm dev` (A7: không tự động hóa trình duyệt), kèm hướng dẫn phím và click cần thử.
- [ ] Checklist: `[~]` → `[x]`.
- [ ] Tài liệu liên quan đã cập nhật (A3).
- [ ] Đủ DoD phase thì đánh dấu trong roadmap và báo người dùng.

## Báo cáo cho người dùng
- Bằng tiếng Việt, ngắn gọn: **đã làm gì → cách kiểm (phím, click) → thứ gì chưa kiểm hoặc còn thiếu → việc tiếp theo đề xuất**.
- Dẫn link file dạng markdown, đường dẫn tương đối.
- Không nói "đã xong" khi chưa build và chưa test.

## Khi thêm ADR
```markdown
### ADR-0NN · Tiêu đề ngắn
- **Trạng thái**: Đã chốt | Mặc định (có thể đổi) | Thay thế bởi ADR-xxx  (ngày YYYY-MM-DD)
- **Bối cảnh**: …
- **Quyết định**: …
- **Lý do**: …
- **Hệ quả**: …
```

## Khi kết thúc một phase
1. Rà mọi ô DoD của phase trong roadmap.
2. Ghi số đo (nếu có) vào bảng đo đạc trong decisions.
3. Viết tóm tắt cho người dùng: đã đạt gì, chưa đạt gì, rủi ro mới.
4. Chờ người dùng đồng ý rồi mới sang phase tiếp theo.
