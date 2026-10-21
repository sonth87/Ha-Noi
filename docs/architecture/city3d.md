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

- **Lăng trụ** (`Batch.solid`): nét (vòng đáy, vòng đỉnh, cạnh đứng ở góc gấp > 20°) và pháp tuyến viền bóng tính trực tiếp, không qua `EdgesGeometry` / `mergeVertices` (nhanh gấp ~4 với nhiều khối nhỏ, ADR-042).
- **Gom hình (`batch.ts`)**: mỗi lớp gom vào **một buffer cho mỗi loại mặt** (`ground`, `wall`, `roof`, `glass`, `road`, `walk`, `marking`, `grass`, `water`, `pitch`, `plaza`, `metal`, `awning`, `plant`), một vỏ viền bóng, một bộ nét cạnh, một bộ nét chi tiết và một mesh cửa sổ. Số đo ở ADR-036 (L3 cả khu: khoảng 65.000 tam giác cùng lớp nền).
- **Toạ độ**: mét của mô hình `(x, y, z)` → three.js `(x, z, y)`.
- **Lớp và ô (`city.ts`, ADR-036)**: lớp nền (mặt đất, vùng, đường, cầu) dựng một lần; tòa nhà chia theo ô 64 m, mỗi ô dựng riêng theo từng **mức chi tiết** L0–L3 khi cần.
- **Tòa nhà (`buildings.ts`)** theo mức:

  | Mức | Vẽ gì |
  |---|---|
  | L0 | Mỗi phần nhà là một lăng trụ trên mặt bằng bất kỳ |
  | L1 | + cửa sổ theo tầng trên mọi tường quay ra ngoài (tường giáp nhà bên chỉ có cửa ở tầng cao hơn nhà bên). Mặt kính → vách kính; Việt Tower → dải kính liền; còn lại → cửa đục lỗ khoảng 2,6 m một ô, mặt tiền cửa hàng ở tầng 1 phía phố của nhà sinh |
  | L2 | Nhà sinh dựng đủ bằng `house3d.ts`; khối lớn có mặt tiền theo loại: ban công so le (chung cư, trường), mặt kính cửa hàng tầng 1 (thương mại, ki-ốt), dải kính (văn phòng) |
  | L3 | Nhà sinh thêm mọi chi tiết nhỏ; khối chung cư có cục nóng, mái khối lớn có bồn nước |

  Việt Tower có cột ăng-ten khung và đèn báo ở mọi mức.
- **Nhà sinh (`house3d.ts`)**: dựng trên mặt bằng thật, mặt tiền trên cạnh `front` (khung toạ độ: `a` dọc mặt tiền, `s` ra phố, `z` lên). Theo [house-spec](house-spec.md): khối tầng trệt + các tầng trên đua ra; tầng trệt (cửa xếp / cuốn / kính / gỗ / sắt hoa / tường kín, cửa đóng khi không bán hàng), nửa hầm có cửa ga-ra và 3 bậc; mái hiên; biển ngang (dưới mép phần đua ra nếu có); 8 kiểu cửa sổ theo gian; 4 kiểu ban công (dài hoặc ngắn, sâu tối đa sao cho tổng ra vỉa hè ≤ 1,9 m); mái bằng có tường chắn, phòng tum (có cửa sáng riêng), tum thang, mái tôn 2 dốc che sân thượng hoặc cả mái; mái tôn 2 dốc / 1 dốc / ngói. Các tường khác có một cửa nhỏ mỗi tầng ở chỗ không bị nhà bên che. L3 thêm biển chìa dọc / tròn, standee, cột xoắn, biển lớn trên tường hồi, biển hai bên cửa, ô văng, cục nóng (mặt tiền và tường hồi trên nhà bên), chậu cây, quần áo phơi, đồ trên mái (bồn nằm, bồn đứng, máy NLMT, ăng-ten, cục nóng, cờ). **Chưa có**: chữ trên biển, giấy dán, quảng cáo sơn tường, cây trước nhà (M5 cùng đồ phố).
- **Đường (`streets.ts`, ADR-037)**: vẽ theo **mạng đường** của core: mỗi đường (các đoạn OSM nối lại, góc cua đã làm tròn) là một dải liền; ở mỗi nút giao, góc giữa hai nhánh kề nhau lấp nhựa tới cung bó vỉa (4 m, 2 m với ngõ), vỉa hè chạy vòng theo cung khi hai nhánh cùng có vỉa hè; vỉa hè nâng 15 cm dừng đúng chỗ cung bắt đầu; vạch làn nét đứt 3 m cách 3 m, dừng trước nút. Cầu (`layer ≥ 1` có profile): mặt cầu theo cao độ, lan can 0,9 m, đáy dày 1 m, gần mặt đất thì xây kín thành tường dốc, trụ mỗi 25 m.
- **Đồ phố (`furniture.ts`)**: từ `streetFurniture` của core, theo ô 64 m, tách lớp: cột điện có xà ngang + đèn treo trên cột; cột đèn (đèn sáng ban đêm, lamp `street/lamps`) + cột đèn tín hiệu (3 đèn, lamp `signal/<x|y>/<stop|wait|go>`); cây đầy đủ (thân + tán 2 tầng có viền) và cây đơn giản (một tán, không nét); dây điện võng giữa các cột (nét `--line`, ban đêm thêm xung sáng màu nhấn trôi dọc dây).
- **Xe (`vehicles.ts`, ADR-038)**: theo ô tô của iso-glow `07-intersection` và ô tô / xe máy của app cũ: thân bo góc, 4 bánh, cabin kính hình thang, đèn pha tròn, đèn hậu, hộp đèn taxi; xe máy theo biên dạng tay ga, có người lái. Mỗi bộ phận một instanced mesh có màu riêng; viền bóng instancing; nét cạnh của mọi xe nằm trong một bộ nét tính lại mỗi khung hình. Ban đêm: đèn sáng, vệt đèn pha trên mặt đường (theme tối). `placeVehicle`: giữa thân xe dọc làn, đúng vệt, quay theo làn, theo cao độ cầu; thu nhỏ dần ở 8 m đầu / cuối làn.
- **Metro (`metro.ts`, ADR-042)**: cầu cạn (dầm hộp dưới mỗi đường ray, lan can phía ngoài, ray, trụ chữ T giữa hai đường ray mỗi 30 m); **ga Thái Hà**: trụ, sảnh trên phố có dải kính sáng ban đêm, hai sân ga hai bên có mép sáng khi tàu đứng, lan can, mái vòm cong trên cột, đèn dưới mái, bảng giờ tàu treo (luôn sáng), biển tên ga, ghế, thùng rác, cầu thang có mái xuống đất hai bên; **toa tàu** (`carModel`) dựng sẵn, view đặt 4 toa theo `trainAt` mỗi khung, toa cuối quay ngược. Lamp: `station/<id>` (theo đèn đường), `/edge` (tàu đứng), `/board` (luôn sáng).
- **Đèn vườn hoa**: cột 3 m quả cầu sáng 5 mặt, vùng sáng 3,5 m; lamp `street/lamps`.
- **Sân trước (`buildForecourts`)**: khoảng giữa mặt tiền và đường (≤ 15 m) lát như vỉa hè, nối ra mép vỉa hè (ngõ: phẳng ra tới mép đường).
- **Vùng**: tô phẳng theo loại, có viền.
- **Đèn**: mỗi cửa sổ thuộc một tầng (`<id tòa>/<n>`); bật một tầng là ghi lại đúng đoạn màu của các đỉnh thuộc tầng đó trong buffer `color`, **mỗi cửa một sắc độ** (`render/lights.ts`: rất sáng / sáng / mờ / vẫn tắt theo seed, ADR-038).
- **Click**: tia chiếu trúng tam giác tường/kính/mái → bảng đoạn tam giác theo tòa (tìm nhị phân) → tòa → tầng theo độ cao điểm trúng (`floorAt`).

## 3. Camera (`CityView`)

Một camera trực giao, hai chế độ (phím `V`):
- **2D**: isometric thật (góc nâng `asin(1/√3)` ≈ 35,26°), khóa ở 4 góc `45° + 90°·k`, **trùng 4 góc của app SVG cũ**. `Q`/`E` xoay 90° có chuyển động. Chỉ dời và phóng to.
- **3D**: xoay tự do (OrbitControls), góc nâng 3°–83°. Về 2D thì trôi về góc iso gần nhất.
- **Điều khiển kiểu bản đồ** (ADR-043): kéo trái di chuyển trên mặt đất, kéo phải / Shift + kéo xoay và nghiêng, cuộn phóng vào con trỏ; W A S D / mũi tên, R / F, + / −, H; nhấp đúp bay tới; nút Ngã tư / Ga Thái Hà; tâm nhìn giữ trong vùng.

## 4. Mức chi tiết theo zoom (ADR-036)

Camera trực giao không có "xa", vật chỉ nhỏ đi khi thu nhỏ. `detailFor(px/m)`: dưới 2 px cho 1 m → L1, 2–4,5 px → L2, từ 4,5 px → L3, không vượt "Chi tiết nhà" người dùng chọn. Mở trang: mọi ô dựng ngay ở mức thấp; sau đó mỗi khung hình dựng thêm một ô ở mức cần, ô gần tâm nhìn trước (bảng chất lượng báo số ô còn chờ). Ô đã dựng được giữ lại, đổi qua lại không phải dựng lại.

## 5. Đèn (ADR-039)

Mục **Đèn** trong bảng bên phải: đèn đường (tự động / bật / tắt; bóng đèn sáng 5 mặt, vùng sáng 11 m trên mặt đường ở theme tối, ADR-041), đèn nhà (tự động / bật / tắt, **cửa sáng 0–100%**: chọn theo từng ô cửa, rải đều mọi tòa, ADR-040), đèn xe (tự động / bật / tắt), độ glow (0–200%). Tự động nghĩa là bật khi tối. Click một tầng bật cả tầng. Dải kính chia ô 1,6–2 m. Màu cửa: sáng `--accent` viền `--accent-hi`, rất sáng `--accent-hi`, mờ = sáng ở 45% trên nền tường, tắt `--recess` viền `--detail`.

## 5b. Giao thông và đèn tín hiệu

Mỗi khung hình: thời gian mô phỏng tăng, `signalsAt` cho pha; đổi pha thì bật / tắt các lamp đèn tín hiệu; `stepTraffic` cho mọi xe đi; ma trận instance cập nhật (xe ngoài tầm nhìn xa thì thu về 0). Chân trang hiện màu đèn và số giây còn lại của Tây Sơn (`x`) và Thái Hà (`y`).

## 6. Màu và chất lượng

- Màu chỉ từ token CSS của `@my-city/theme` (đọc lại khi đổi theme): nền `--bg`; mặt đất và tường `--body`; mái, vỉa hè, tôn/sắt, bạt `--deck`; kính và nước `--glass`; lòng đường `--recess`; vạch `--line`; cỏ và cây chậu `--panel`; nét viền và cạnh `--line`; nét chi tiết `--detail`; cửa tắt `--recess`, cửa sáng `--accent`; đèn báo `--accent-hi`.
- Glow (bloom) chỉ ở theme tối và khi bật trong chất lượng; ngưỡng sáng 0,5 nên chỉ màu nhấn mới tỏa.
- Chất lượng (`view/quality.ts`): 4 mức **Thấp / Trung bình / Cao / Rất cao**; chỉnh tay một tùy chọn thì thành **Tùy chỉnh**, chỉnh về đúng bộ của một mức thì trở lại tên mức đó. Có: chi tiết nhà tối đa (L0–L3), tự giảm khi thu nhỏ, độ phân giải (×1–×3), khử răng cưa (MSAA 4×), glow, cửa sổ, 3 lớp nét. Nhớ theo máy (localStorage; không có vẫn chạy).

| Mức | Chi tiết nhà | Tự giảm | Xe | Cột + dây | Cây | Tầm nhìn | Tự hạ mức | Độ phân giải | MSAA | Glow | Nét chi tiết |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Thấp | L1 | có | 30% | — | đơn giản | 150 m | có | ×1 | — | — | — |
| Trung bình | L2 | có | 60% | có | đơn giản | 250 m | có | ×1,5 | có | có | — |
| Cao (mặc định) | L3 | có | 100% | có | đầy đủ | hết | có | ×2 | có | có | có |
| Rất cao | L3 | không | 100% | có | đầy đủ | hết | không | ×3 | có | có | có |

**Tự hạ mức**: fps dưới 28 suốt 3 giây (không tính lúc đang dựng ô hoặc tab bị ẩn) thì xuống một mức; bảng chất lượng báo đã tự hạ. Không tự nâng lại. **Tầm nhìn xa**: ẩn ô nhà, ô đồ phố và xe xa tâm nhìn hơn khoảng đã chọn; lớp nền (đường, vùng) vẫn vẽ hết.

## 7. Kiểm thử

Test Node (không cần WebGL): `render/city.test.ts`: hình học hữu hạn, đủ đèn cho mọi tầng (Việt Tower 18, Novotel 27), click ra đúng tầng, tòa nào cũng click được, mặt cầu cao 6 m, đèn báo trên 80 m, hướng phải của đường; mức càng cao càng nhiều chi tiết; L2/L3 trên 85% số tầng có cửa; mỗi tòa đúng một ô; **mọi preset dựng được ở L2 và L3**, hữu hạn, tầng nào (cả phòng tum) cũng có cửa; mọi nhà sinh của bản đồ thật dựng được ở L3. `render/street-life.test.ts`: mọi ô đồ phố hữu hạn, có lamp đèn đường và đủ 6 lamp đèn tín hiệu, cây đơn giản không nét; mọi loại xe dựng được, xe đặt đúng làn và mờ ở đầu làn. `view/quality.test.ts`: trở về mức có tên, mức chi tiết theo zoom, tự hạ từng mức một. Ở core / osm-import: mạng đường (nối đoạn, nút giữ nguyên vị trí, góc đã tròn, cầu 6 m), đồ phố (đủ loại, không trên lòng đường, cùng kết quả), làn xe (xuyên Thái Hà → Chùa Bộc, vạch dừng 2 nhóm, cầu chỉ ô tô), mô hình xe (không vượt đèn đỏ khi chưa quyết đi, không đâm xe trước, xe nào cũng chạy). Hình ảnh thì người dùng kiểm bằng mắt (A7).
