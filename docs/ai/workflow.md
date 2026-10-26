# Quy trình một đầu việc

## Trước khi làm
1. Đọc [checklist](../plan/checklist.md): việc này thuộc bước nào, có nằm trong bước hiện tại không. Nếu không thì hỏi người dùng hoặc ghi vào backlog.
2. Đọc mục tiêu và DoD của bước trong [roadmap](../plan/roadmap.md).
3. Kiểm [decisions](../architecture/decisions.md): có ADR nào ràng buộc việc này không, có câu hỏi mở nào chặn không.
4. Người dùng đang hỏi để chốt phương án thì **chỉ trả lời**, chờ "ok" rồi mới làm.
5. Đánh dấu việc `[~]` trong checklist.

## Trong khi làm
- Làm đúng phạm vi việc; thấy việc khác cần làm thì ghi lại, không làm luôn.
- Không chạm `apps/svg` (A14).
- Gặp lựa chọn kỹ thuật không hiển nhiên thì chọn phương án hợp lý và **ghi ADR**. Nếu lựa chọn ảnh hưởng đến trải nghiệm hoặc phạm vi thì **hỏi người dùng** trước.
- Đổi mô hình dữ liệu thì sửa tài liệu đặc tả của gói đó ngay.

## Sau khi làm (Definition of Done cho một việc)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` ở gốc sạch (hoặc báo rõ lỗi nào và vì sao).
- [ ] Đã đi qua [danh sách kiểm](guidelines.md#danh-sách-kiểm-trước-khi-báo-xong-bổ-sung-cho-workflow) 10 câu ở cuối guidelines.
- [ ] `pnpm build` không lỗi (khi việc chạm tới cấu hình build hoặc trước khi đóng bước).
- [ ] Đã nhờ người dùng xem trên dev server (A7), kèm hướng dẫn phím và click cần thử.
- [ ] Checklist: `[~]` → `[x]`.
- [ ] Tài liệu liên quan đã cập nhật (A3).
- [ ] Đủ DoD của bước thì đánh dấu trong roadmap và báo người dùng.

## Báo cáo cho người dùng
- Bằng tiếng Việt, ngắn gọn: **đã làm gì → cách kiểm (lệnh, phím, click) → thứ gì chưa kiểm hoặc còn thiếu → việc tiếp theo đề xuất**.
- Dẫn link file dạng markdown, đường dẫn tương đối.
- Không nói "đã xong" khi chưa build và chưa test.

## Khi thêm ADR
```markdown
### ADR-0NN · Tiêu đề ngắn
- **Trạng thái**: Đã chốt | Mặc định (có thể đổi) | Thử nghiệm | Thay thế bởi ADR-xxx  (ngày YYYY-MM-DD)
- **Bối cảnh**: …
- **Quyết định**: …
- **Lý do**: …
- **Hệ quả**: …
```

## Khi kết thúc một bước
1. Rà mọi ô DoD của bước trong roadmap.
2. Viết tóm tắt cho người dùng: đã đạt gì, chưa đạt gì, rủi ro mới.
3. Chờ người dùng đồng ý rồi mới sang bước tiếp theo.
