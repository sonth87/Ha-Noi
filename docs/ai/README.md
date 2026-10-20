# Tài liệu cho AI — đọc trước khi làm bất cứ việc gì

File này dành cho trợ lý AI (Claude Code) làm việc trên dự án. Root `CLAUDE.md` import file này.

## 1. Bối cảnh trong 30 giây

- **Dự án**: mô hình isometric tương tác, phong cách iso-glow, của ngã tư **Thái Hà – Tây Sơn – Chùa Bộc** (Hà Nội). Mỗi nhánh phố khoảng 100 m. Bốn góc là tòa Thái Bình (Parkson cũ), tòa Novotel và 2 vườn hoa.
- **Trọng tâm**: ý tưởng cốt lõi và các thành phần cốt lõi, tức **generator nhà có tham số + preset**. Landmark chỉ cần nhận ra được qua hình khối.
- **Chưa làm**: đúng bản đồ thật, logo/thương hiệu, 3D. Những việc này thuộc P5.
- **Stack**: Vite + TypeScript (strict) + React, pnpm. Cảnh vẽ bằng SVG 2D với kernel isometric port từ skill iso-glow (`src/iso/`).
- **Kiến trúc**: `core/` (dữ liệu, thuần) → `render/` (chuỗi SVG) → `scenes/` (Controller + React) → `ui/`. React **không** quản lý từng phần tử SVG.
- **Ngôn ngữ**: tài liệu và trao đổi bằng **tiếng Việt**; tên trong code bằng **tiếng Anh**.
- **Người dùng** muốn mọi thứ **minh bạch, đầy đủ**: kế hoạch, kiến trúc, checklist, quyết định đều được ghi lại và cập nhật.

## 2. Thứ tự đọc

1. [../plan/checklist.md](../plan/checklist.md): đang ở phase nào, việc nào đang làm.
2. [../plan/roadmap.md](../plan/roadmap.md): DoD của phase hiện tại.
3. [../architecture/overview.md](../architecture/overview.md): các tầng, React ↔ SVG, thuật toán lõi.
4. [../architecture/house-spec.md](../architecture/house-spec.md) và [../architecture/components.md](../architecture/components.md): khi đụng vào nhà hoặc bộ phận.
5. [../architecture/decisions.md](../architecture/decisions.md): đã chốt gì, câu hỏi nào còn mở. **Không làm ngược ADR đã chốt** khi chưa hỏi người dùng.
6. [conventions.md](conventions.md) và [workflow.md](workflow.md).
7. `.claude/skills/iso-glow/SKILL.md`: luật thẩm mỹ, kernel, glow kit. Chỉ dùng làm **nguồn tham khảo để port**; không nhúng template vào app.

## 3. Luật bắt buộc

| # | Luật |
|---|---|
| A1 | Mỗi việc làm xong đều **cập nhật [checklist](../plan/checklist.md)**. Đủ DoD của phase thì đánh dấu trong [roadmap](../plan/roadmap.md). |
| A2 | Mọi lựa chọn kỹ thuật không hiển nhiên (thêm thư viện, đổi cấu trúc, đổi luật) đều **thêm một ADR** vào [decisions](../architecture/decisions.md). Đổi quyết định cũ thì thêm ADR mới, không xóa ADR cũ. |
| A3 | Code đổi thì tài liệu liên quan đổi **trong cùng lần làm**. Tài liệu không được lệch khỏi code. |
| A4 | Không làm việc ngoài phase hiện tại. Ý mới ghi vào backlog P5 trong checklist. |
| A5 | Không thêm dependency khi chưa có ADR (trừ những gói đã nêu trong ADR-011, ADR-014). |
| A6 | Trước khi báo xong: `pnpm typecheck && pnpm lint && pnpm test`. Lỗi thì báo nguyên văn, không giấu. |
| A7 | **Không dùng tự động hóa trình duyệt** (Playwright, Puppeteer, headless). Chạy `pnpm dev` và nhờ người dùng kiểm bằng mắt. |
| A8 | Giữ luật thẩm mỹ iso-glow: một màu nhấn chỉ trên thứ đang sống; màu chỉ qua token; mọi nét `vector-effect: non-scaling-stroke`; theme sáng không glow. |
| A9 | Không logo, không chữ thương hiệu thật. |
| A10 | Tôn trọng luật phụ thuộc giữa các tầng (ADR-015). Không tắt luật ESLint để lách. |
| A11 | Báo cáo trung thực: thứ gì chưa kiểm bằng mắt thì nói rõ là chưa kiểm. |
| A12 | Không commit hay push khi người dùng chưa yêu cầu. |

## 4. Lệnh

```bash
pnpm dev          # dev server
pnpm build        # kiểm kiểu + build → dist/
pnpm build:single # một file HTML (từ P4)
pnpm test         # Vitest
pnpm lint         # ESLint (kèm luật tầng)
pnpm typecheck    # tsc --noEmit
```

## 5. Bẫy đã biết

- **Kernel không có z-buffer.** Thứ tự vẽ là tất cả; xem `depthSort` trong overview §7.
- **Isometric chỉ thấy mặt +x (`SIDE`) và +y (`FRONT`).** Mặt tiền hướng N hoặc W thì khuất, nên phải vẽ mặt lưng.
- `box()` luôn vẽ mặt trên đặc. Gờ, dải trang trí, ban công sát tường thì vẽ thành strip trên plane, **không** dùng `box`.
- Filter trên đường thẳng tuyệt đối có thể biến mất nếu không dùng `filterUnits="userSpaceOnUse"`. Dùng filter trong `GlowDefs`, không tự tạo filter mới.
- **React StrictMode** chạy effect hai lần ở dev. Controller phải `unmount()` sạch (hủy rAF, timer), nếu không sẽ có hai vòng loop.
- Gán `innerHTML` xóa mọi class đã toggle. Controller phải áp lại trạng thái đèn sau mỗi lần dựng lại.
- Chữ đưa vào chuỗi SVG (`signText`…) phải được escape.
