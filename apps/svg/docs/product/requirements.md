# Yêu cầu

Mỗi yêu cầu có mã để checklist và roadmap tham chiếu. Mức ưu tiên: **M** = bắt buộc, **S** = nên có, **C** = có thì tốt.

## 1. Yêu cầu chức năng (FR)

### 1.1 Generator nhà
| Mã | Yêu cầu | Ưu tiên | Phase |
|---|---|---|---|
| FR-01 | Hàm `house(K, spec)` trả về SVG của một căn nhà từ một *house spec* ([house-spec](../architecture/house-spec.md)) | M | P1 |
| FR-02 | Hỗ trợ số tầng 0 (nhà cấp 4) → 9; tầng 1 cao khác các tầng trên | M | P1 |
| FR-03 | Kiểu mái: bằng, tôn 1 dốc, tôn 2 dốc, ngói; tùy chọn tum thang | M | P1–P2 |
| FR-04 | Tầng 1: cửa xếp, cửa cuốn, cửa kính, cửa gỗ; trạng thái mở / đóng hàng | M | P1–P2 |
| FR-05 | Cửa sổ: ít nhất 4 kiểu | M | P2 |
| FR-06 | Ban công: không, lan can sắt, lan can đặc, chuồng cọp; có/không cây | M | P2 |
| FR-07 | Đua ra (tầng 2+ nhô ra vỉa hè), tầng thượng lùi vào | S | P2 |
| FR-08 | Vật trên mái: bồn nước nằm, bồn nước đứng, máy NLMT, ăng-ten, cục nóng, chậu cây | M | P2 |
| FR-09 | Mái hiên bạt, biển hiệu (chữ tự đặt, không logo) | S | P2 |
| FR-10 | Nhà không vuông: chữ L, vát góc (ghép nhiều khối) | S | P2 |
| FR-11 | Mặt lưng và tường hồi có bản vẽ đơn giản riêng | M | P2 |
| FR-12 | Biến thể theo `seed`: cùng preset, mỗi căn lệch nhẹ (cửa sổ sáng/tối, vị trí cục nóng, cây) | M | P1 |
| FR-13 | Preset: spec có thể chỉ ghi `preset` + vài trường ghi đè | M | P1 |

### 1.2 Góc nhìn & hiển thị
| Mã | Yêu cầu | Ưu tiên | Phase |
|---|---|---|---|
| FR-20 | Xoay góc nhìn 4 hướng (90°/bước); mặt tiền luôn vẽ đúng mặt | M | P1 |
| FR-21 | Chế độ cutaway: dãy nhà gần người xem chỉ còn tầng 1 (hoặc nét mờ) | M | P3 |
| FR-22 | Thứ tự vẽ đúng (không có khối xa đè khối gần) ở mọi hướng xoay | M | P1–P4 |
| FR-23 | Chuyển ngày / đêm: đêm thì đèn bật dần (cascade), ngày thì tắt | S | P3 |
| FR-24 | Theme sáng/tối và palette màu đèn (port từ iso-glow) | M | P0 |

### 1.3 Các figure (màn hình)
| Mã | Yêu cầu | Ưu tiên | Phase |
|---|---|---|---|
| FR-30 | **Fig 01 · Catalog**: lưới các preset, mỗi căn trên ô đất riêng; click bật/tắt đèn; `R` sinh nhà ngẫu nhiên | M | P1 |
| FR-31 | Catalog có bảng chỉnh tham số (đổi số tầng, mái, ban công… cho căn đang chọn) | S | P2 |
| FR-32 | **Fig 02 · Street**: một nhánh phố thẳng ~100 m, 2 bên nhà, vỉa hè, cột điện, dây điện, đèn đường, cây, xe máy | M | P3 |
| FR-33 | **Fig 03 · Crossroads**: 4 nhánh, 2 landmark, 2 vườn hoa, đèn giao thông | M | P4 |
| FR-34 | Dây điện có xung sáng chạy giữa các cột | M | P3 |
| FR-35 | Xe máy chạy 2 chiều; ở ngã tư dừng khi đèn đỏ | M | P3–P4 |
| FR-36 | Mỗi figure có `demo()` mở ra là đã sáng | S | P3–P4 |
| FR-37 | Readout góc dưới phải: trạng thái ngắn gọn (`view S · 23/40 lit · night`) | M | P1 |

### 1.4 Điều khiển (bàn phím thống nhất cho mọi figure)
| Phím | Hành động | Figure |
|---|---|---|
| `Q` / `E` | Xoay góc nhìn trái / phải | tất cả |
| `X` | Bật/tắt cutaway | Street, Crossroads |
| `N` | Ngày ↔ đêm | Street, Crossroads |
| `R` | Sinh nhà ngẫu nhiên (seed mới) | Catalog |
| `←` `→` | Chọn căn trước / sau | Catalog |
| `Space` / `Enter` | Bật/tắt đèn căn đang chọn | Catalog |
| `T` | Bật/tắt dòng xe | Street, Crossroads |
| Click vào nhà | Bật/tắt đèn căn đó | tất cả |

## 2. Yêu cầu phi chức năng (NFR)

| Mã | Yêu cầu | Ngưỡng |
|---|---|---|
| NFR-01 | Build ra **site tĩnh** (`dist/`), không cần backend; chạy offline sau khi tải; không tải script từ CDN lúc chạy | bắt buộc |
| NFR-02 | Có lệnh build ra **một file HTML** duy nhất để gửi cho người khác (`pnpm build:single`) | nên có |
| NFR-03 | Hiệu năng Street / Crossroads | ≥ 50 fps khi xe chạy trên laptop (Apple M-series) |
| NFR-04 | Thời gian dựng lại khi xoay góc nhìn | ≤ 300 ms cho Crossroads |
| NFR-05 | Tổng kích thước `dist/` (JS + CSS + HTML, gzip) | ≤ 400 KB |
| NFR-06 | Tái tạo được: cùng dữ liệu + seed → SVG giống hệt | bắt buộc, có test |
| NFR-07 | Màu chỉ qua token của template (`--accent`, `--line`…), không mã màu cứng | bắt buộc |
| NFR-08 | Mọi nét có `vector-effect: non-scaling-stroke` | bắt buộc |
| NFR-09 | Tôn trọng `prefers-reduced-motion`: tắt nhấp nháy, xe đứng yên hoặc chạy chậm | nên có |
| NFR-10 | SVG có `role="img"` + `aria-label` mô tả cách điều khiển | bắt buộc |
| NFR-11 | `pnpm test` (Vitest) phủ toàn bộ `core/` và snapshot `render/` | bắt buộc |
| NFR-12 | TypeScript `strict`; `pnpm typecheck` và `pnpm lint` sạch lỗi | bắt buộc |
| NFR-13 | Luật phụ thuộc giữa các tầng (`core` ← `render` ← `scenes`/`ui`) được ESLint cưỡng chế | bắt buộc |
| NFR-14 | React không re-render theo từng frame animation | bắt buộc |

## 3. Ràng buộc

- **C-01** Dựa trên skill iso-glow: port kernel, token màu, glow kit, filter, palette sang `src/iso/` (ADR-012) và giữ đúng các luật thẩm mỹ của skill. Không dùng figure contract `FIGS.push`.
- **C-06** Stack: Vite + TypeScript + React, pnpm (ADR-011). Không Next.js, không thư viện state hay UI component ngoài khi chưa có ADR.
- **C-02** Kernel không có z-buffer → thứ tự vẽ do code tự đảm bảo.
- **C-03** Isometric chỉ thấy 3 mặt: trên, `FRONT` (+y), `SIDE` (+x).
- **C-04** Không logo / thương hiệu thật; landmark nhận diện bằng hình khối.
- **C-05** Không công cụ tự động hóa trình duyệt (Playwright, Puppeteer…) — kiểm tra bằng mắt trên trình duyệt thật.
