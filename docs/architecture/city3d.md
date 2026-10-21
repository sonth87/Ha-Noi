# App 3D (`apps/city3d`)

Vẽ **bất kỳ** mô hình thành phố nào ([city-model](city-model.md)) bằng three.js, theo phong cách iso-glow: mặt phẳng màu không chiếu sáng lấy từ token, nét 1 px, một màu nhấn cho thứ đang sáng (ADR-032, ADR-035). Không có code riêng cho từng tòa nhà, trừ chi tiết của mô hình dựng tay (`model`).

## 1. Cấu trúc

| Thư mục | Chứa | Được dùng | Cấm |
|---|---|---|---|
| `src/render/` | Mô hình thành phố → geometry three.js (`buildCityGeometry`). Không vật liệu, không DOM | core, three | React, DOM, `view/`, `ui/` |
| `src/view/` | `CityView`: renderer, camera, điều khiển, vật liệu từ token, đèn, ngày/đêm, chất lượng; `quality.ts` | mọi thứ | — |
| `src/ui/` | Vỏ React: thanh trên, bảng chất lượng, dòng trạng thái, ghi nguồn | `view/`, `@my-city/*` | three, `render/` |

Luật cưỡng chế bằng ESLint gốc. React chỉ đọc snapshot của `CityView` (`useSyncExternalStore`); snapshot đổi khi có sự kiện (chế độ, góc, đèn, chất lượng) và fps tối đa 2 lần/giây, không theo từng frame.

## 2. Dựng hình (`render/`)

- **Gom hình (`batch.ts`)**: cả khu gom vào **một buffer cho mỗi loại mặt** (`ground`, `wall`, `roof`, `glass`, `road`, `walk`, `marking`, `grass`, `water`, `pitch`, `plaza`), một vỏ viền bóng, một bộ nét cạnh, một bộ nét chi tiết và một mesh cửa sổ. Khu ngã tư: khoảng 15 lần vẽ, 14.700 tam giác, 40.000 nét, 7.500 cửa sổ; dựng mất khoảng 180 ms (cộng 50 ms nhập OSM).
- **Toạ độ**: mét của mô hình `(x, y, z)` → three.js `(x, z, y)`.
- **Tòa nhà (`buildings.ts`)**: mỗi phần nhà là một lăng trụ trên mặt bằng bất kỳ. Cửa sổ theo tầng trên mọi tường quay ra ngoài; tường giáp nhà bên chỉ có cửa ở các tầng cao hơn nhà bên. Kiểu cửa theo dữ liệu: mặt kính → vách kính mỗi tầng; Việt Tower → một dải kính liền mỗi tầng; còn lại → cửa đục lỗ khoảng 2,6 m một ô, và mặt tiền cửa hàng ở tầng 1 phía phố của nhà sinh. Việt Tower có cột ăng-ten khung và đèn báo trên đầu tròn của tháp. Nhà chi tiết theo generator là M4.
- **Đường (`streets.ts`)**: lòng đường là dải phẳng dọc đường tim; vỉa hè nâng 15 cm, **tự cắt** ở chỗ cắt ngang lòng đường khác (nút giao, miệng ngõ); vạch làn nét đứt 3 m cách 3 m, tránh khỏi lòng đường khác. Cầu (`layer ≥ 1` có profile): mặt cầu theo cao độ, lan can 0,9 m, đáy dày 1 m, gần mặt đất thì xây kín thành tường dốc, trụ mỗi 25 m. **Chưa có**: góc giao giữa hai lòng đường còn hở nền (M5).
- **Vùng**: tô phẳng theo loại, có viền.
- **Đèn**: mỗi cửa sổ thuộc một tầng (`<id tòa>/<n>`); bật một tầng là ghi lại đúng đoạn màu của các đỉnh thuộc tầng đó trong buffer `color`.
- **Click**: tia chiếu trúng tam giác tường/kính/mái → bảng đoạn tam giác theo tòa (tìm nhị phân) → tòa → tầng theo độ cao điểm trúng (`floorAt`).

## 3. Camera (`CityView`)

Một camera trực giao, hai chế độ (phím `V`):
- **2D**: isometric thật (góc nâng `asin(1/√3)` ≈ 35,26°), khóa ở 4 góc `45° + 90°·k`, **trùng 4 góc của app SVG cũ**. `Q`/`E` xoay 90° có chuyển động. Chỉ dời và phóng to.
- **3D**: xoay tự do (OrbitControls), góc nâng 3°–83°. Về 2D thì trôi về góc iso gần nhất.

## 4. Màu và chất lượng

- Màu chỉ từ token CSS của `@my-city/theme` (đọc lại khi đổi theme): nền `--bg`; mặt đất và tường `--body`; mái và vỉa hè `--deck`; kính và nước `--glass`; lòng đường `--recess`; vạch `--line`; cỏ `--panel`; nét viền và cạnh `--line`; nét chi tiết `--detail`; cửa tắt `--recess`, cửa sáng `--accent`; đèn báo `--accent-hi`.
- Glow (bloom) chỉ ở theme tối và khi bật trong chất lượng; ngưỡng sáng 0,5 nên chỉ màu nhấn mới tỏa.
- Chất lượng (`view/quality.ts`): 4 mức **Thấp / Trung bình / Cao / Rất cao**, chỉnh tay một tùy chọn thì thành **Tùy chỉnh**. M3 có: độ phân giải (×1–×3), khử răng cưa (MSAA 4×), glow, cửa sổ, 3 lớp nét. Nhớ theo máy (localStorage; không có vẫn chạy).

| Mức | Độ phân giải tối đa | MSAA | Glow | Nét chi tiết |
|---|---|---|---|---|
| Thấp | ×1 | — | — | — |
| Trung bình | ×1,5 | có | có | — |
| Cao (mặc định) | ×2 | có | có | có |
| Rất cao | ×3 | có | có | có |

## 5. Kiểm thử

Test Node (không cần WebGL, `render/city.test.ts`): hình học hữu hạn, đủ đèn cho mọi tầng (Việt Tower 18, Novotel 27), click ra đúng tầng, tòa nào cũng click được, mặt cầu cao 6 m, đèn báo trên 80 m, hướng phải của đường. Hình ảnh thì người dùng kiểm bằng mắt (A7).
