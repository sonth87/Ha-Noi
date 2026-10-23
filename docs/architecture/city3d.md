# App 3D (`apps/city3d`)

Vẽ **bất kỳ** mô hình thành phố nào ([city-model](city-model.md)) bằng three.js, theo phong cách iso-glow: mặt phẳng màu không chiếu sáng lấy từ token, nét 1 px, một màu nhấn cho thứ đang sáng (ADR-032, ADR-035). Không có code riêng cho từng tòa nhà, trừ chi tiết của mô hình dựng tay (`model`).

## 1. Cấu trúc

| Thư mục | Chứa | Được dùng | Cấm |
|---|---|---|---|
| `src/render/` | Mô hình thành phố → geometry three.js (`buildCityGeometry`). Không vật liệu, không DOM | core, three | React, DOM, `view/`, `ui/` |
| `src/view/` | `CityView`: điều phối renderer, camera, vật liệu, đèn, ngày/đêm; cùng các mô-đun tách biệt: `constants.ts` (hằng số), `i18n.ts` (đa ngôn ngữ `vi`/`en`), `sdk.ts` (Public SDK, Event Bus & Extension API), `seeThrough.ts` (shader nhìn xuyên ga tàu & tòa nhà), `overlayDom.ts` (nhãn 3D, tooltip, popup), `placeInfo.ts` (tra cứu địa điểm/công trình từ `CityModel`), `urlState.ts` (đồng bộ URL), `quality.ts`, `lights.ts` | mọi thứ | — |
| `src/ui/` | Vỏ React: thanh trên (kèm chuyển ngôn ngữ `VI/EN`), bảng chất lượng, bảng đèn, dòng trạng thái, ghi nguồn | `view/`, `@my-city/*` | three, `render/` |

Luật cưỡng chế bằng ESLint gốc. React chỉ đọc snapshot của `CityView` (`useSyncExternalStore`); snapshot đổi khi có sự kiện (chế độ, góc, đèn, chất lượng, ngôn ngữ) và fps tối đa 2 lần/giây, không theo từng frame. `CityView` xuất bản `view.sdk` (và `window.MyCitySDK`) để tích hợp Extension / Plugin bên ngoài (ADR-052).

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
- **Đồ phố (`furniture.ts`, ADR-037, ADR-047)**: từ `streetFurniture` của core (trên vỉa hè và trong công viên / vườn hoa), theo ô 64 m, tách lớp: cột điện có xà ngang + đèn treo trên cột; cột đèn (đèn sáng ban đêm, lamp `street/lamps`) + cột đèn tín hiệu (3 đèn, lamp `signal/<x|y>/<stop|wait|go>`); **cây đầy đủ** theo 3 dáng (tán vòm đa thùy kiểu sấu/nhội, tán tầng vươn ngang kiểu bàng/xà cừ, tán cụm bất đối xứng kiểu bằng lăng/hoa sữa: đều có bồn cây + gốc rễ bạnh 3D, thân côn thuôn, 4–5 cành chạc 3D + nhánh phụ lộ dưới vòm tán, các cụm lá vòm 3D phân 3 sắc độ sáng-trung-tối từ đỉnh xuống đáy có viền bóng silhouette sạch không vẽ nét tỉa chì) và **cây đơn giản** (thân + 3 đĩa tán lệch 2 sắc độ, không nét); dây điện võng giữa các cột (nét `--line`, ban đêm thêm xung sáng màu nhấn trôi dọc dây).
- **Xe (`vehicles.ts`, ADR-038, ADR-046)**: theo ô tô của iso-glow (`10-diner`, `07-intersection`) và ô tô / xe máy của app cũ: thân bo góc mượt (không có nét dọc ở góc bo), 4 bánh tròn 12 cạnh có đủ viền lốp + mâm xe trong + vòm bánh, cabin đồng màu thân có các ô kính lùi vào trong chừa cột A/B/C và viền từng ô kính, nắp ca-pô / cốp, đường gân hông, khe cửa, tay nắm, gương chiếu hậu, lưới tản nhiệt nan dọc giữa hai đèn pha tròn có viền, đèn hậu + khung biển số + cản trước/sau, hộp đèn taxi đủ nét cạnh; xe máy có chắn bùn trước, phuộc trước, bánh đủ viền + mâm, gân hông, yên bo góc + tay dắt sau, cổ lái + đầu đèn pha + ghi đông + gương, người lái ngồi tự nhiên (thân bo tròn, chân đặt sàn, tay cầm ghi đông, mũ bảo hiểm có kính chắn). Mỗi bộ phận một instanced mesh có màu riêng; viền bóng instancing; nét cạnh của mọi xe nằm trong một bộ nét tính lại mỗi khung hình. Ban đêm: đèn sáng, vệt đèn pha trên mặt đường (theme tối). `placeVehicle`: giữa thân xe dọc làn, đúng vệt, quay theo làn, theo cao độ cầu; thu nhỏ dần ở 8 m đầu / cuối làn.
- **Metro (`metro.ts`, ADR-042, ADR-050)**: cầu cạn (dầm hộp có gờ đáy dưới mỗi đường ray, tường chắn ồn có thanh đỉnh kim loại, ray, dải phân cách trồng cây dưới gầm và trụ bê tông vát 8 cạnh có mũ trụ chữ T loe vát nghiêng + gối cầu mỗi 28 m); **nhà ga tuyến 2A (Thái Hà, La Thành)**: dưới chân ga là dải phân cách trồng cây cùng 5 nhịp trụ đôi bê tông lớn gắn ống thoát nước khe giữa, đỡ xà mũ ngang cánh hẫng (`cantilever crosshead`) vát chéo đáy và hệ 7 dầm dọc dưới gầm sàn sảnh; tầng sảnh (`6–10 m`) có dải kính bên hông kèm mái hắt lam thép, hai đầu ga mở hành lang sảnh có lan can kính, trần gắn dãy đèn huỳnh quang, hộp bảng tên ga và hai khối vuông trang trí họa tiết hình thoi/tam giác xanh-trắng đan chéo; tầng sân ga có mép sáng khi tàu đứng, vách lam xanh nghiêng, hai vỏ mái cong chữ C dày ôm lên đỉnh nối với khung kèo vòm thép hở và mái kính lấy sáng ở giữa; **4 cụm đường đi bộ lên ga từ hai vỉa hè**: cầu bộ hành ngang vượt qua lòng đường (dầm thép, lan can kính, mái che) nối ra tháp chiếu nghỉ & thang máy đứng trên vỉa hè (có cửa thang máy tầng trệt) cùng cầu thang bộ + thang cuốn dài chạy dọc vỉa hè có tường chắn bậc giật cấp trắng, bậc tam cấp đón, đôi tay vịn thang cuốn, mái vòm cong nửa trụ bằng tấm lấy sáng uốn theo độ dốc và mái vòm đón có giàn thép chữ X ở chân thang; **toa tàu** (`carModel`) dựng sẵn, view đặt 4 toa theo `trainAt` mỗi khung, toa cuối quay ngược. Lamp: `station/<id>` (theo đèn đường), `/edge` (tàu đứng), `/board` (luôn sáng).
- **Đèn vườn hoa**: cột 3 m quả cầu sáng 5 mặt, vùng sáng 3,5 m; lamp `street/lamps`.
- **Sân trước (`buildForecourts`)**: khoảng giữa mặt tiền và đường (≤ 15 m) lát như vỉa hè, nối ra mép vỉa hè (ngõ: phẳng ra tới mép đường).
- **Vùng**: tô phẳng theo loại, có viền.
- **Công trình trên đế (`showcase.ts`, ADR-048)**: `showcasesOf(city)` và `buildShowcase(city, id)` dựng từng công trình lớn từ OSM (Việt Tower, Novotel, MIPEC, VPBank, PeakView, Hoàng Cầu Skyline, Oriental Tower, Vincom…, các ga Metro 2A) hoặc 5 mẫu kiến trúc Hà Nội độc lập ở mức L3 đặt giữa đế mô hình vát góc kiểu `iso-glow` (có viền chìm, 4 ốc góc, đoạn đường trước nhà, vỉa hè lát gạch, đèn đường + vùng sáng đêm và cây 3D). Dùng chung pipeline `Batch`/`Layer` nên Ngày/Đêm, cửa sáng và click tầng hoạt động như trên bản đồ.
- **Đèn**: mỗi cửa sổ thuộc một tầng (`<id tòa>/<n>`); bật một tầng là ghi lại đúng đoạn màu của các đỉnh thuộc tầng đó trong buffer `color`, **mỗi cửa một sắc độ** (`render/lights.ts`: rất sáng / sáng / mờ / vẫn tắt theo seed, ADR-038).
- **Click**: tia chiếu trúng tam giác tường/kính/mái → bảng đoạn tam giác theo tòa (tìm nhị phân) → tòa → tầng theo độ cao điểm trúng (`floorAt`).

## 3. Camera (`CityView`)

Một camera trực giao, hai chế độ (phím `V`):
- **2D**: isometric thật (góc nâng `asin(1/√3)` ≈ 35,26°), khóa ở 4 góc `45° + 90°·k`, **trùng 4 góc của app SVG cũ**. `Q`/`E` xoay 90° có chuyển động. Chỉ dời và phóng to.
- **3D**: xoay tự do (OrbitControls), góc nâng 3°–83°. Về 2D thì trôi về góc iso gần nhất.
- **Điều khiển kiểu bản đồ & cảm ứng** (ADR-043, ADR-048, ADR-049): kéo trái (hoặc 1 ngón) di chuyển trên mặt đất, kéo phải / Shift + kéo xoay và nghiêng, cuộn phóng vào con trỏ; trên cảm ứng, 2 ngón ở 2D vừa chụm phóng vừa kéo (`DOLLY_PAN`), ở 3D vừa chụm phóng vừa xoay/nghiêng (`DOLLY_ROTATE`), chạm đúp bay tới chỗ chạm; W A S D / mũi tên, R / F, + / −, H; dropdown **Công trình** để xem riêng từng tòa nhà trên đế hoặc quay về bản đồ toàn khu; dropdown **Khu vực** để bay nhanh tới Ngã tư Thái Hà, Ngã Tư Sở, Chùa Bộc, Nguyễn Lương Bằng, Ô Chợ Dừa, Xã Đàn, Hồ Hoàng Cầu, Láng Hạ và các ga Metro; tâm nhìn giữ trong vùng (hoặc trong phạm vi đế mô hình).

## 4. Mức chi tiết theo zoom (ADR-036, ADR-049)

Camera trực giao không có "xa", vật chỉ nhỏ đi khi thu nhỏ. `detailFor(px/m)`: dưới 4,5 px cho 1 m → L1, 4,5–9 px → L2, từ 9 px → L3, không vượt "Chi tiết nhà" người dùng chọn (ADR-044). Nét, xe, cây giảm theo các mốc `FAR` (nhạt dần từ 8 tới 2,5 px/m). Mở trang: các ô trong tầm nhìn dựng ngay ở mức thấp; sau đó mỗi khung hình (khi người dùng không đang kéo/chụm cảm ứng) dựng thêm một ô trong tầm nhìn ở mức cần, ô gần tâm nhìn trước (bảng chất lượng báo số ô còn chờ). Ô đã dựng được giữ lại, đổi qua lại không phải dựng lại.

## 5. Đèn (ADR-039)

Nút **Ngày / Đêm** (phím N hoặc T) đổi cùng lúc giao diện sáng ↔ tối và bật / tắt đèn (ADR-045). Mục **Đèn** trong bảng bên phải: đèn đường (tự động / bật / tắt; bóng đèn sáng 5 mặt, vùng sáng 11 m trên mặt đường ở theme tối, ADR-041), đèn nhà (tự động / bật / tắt, **cửa sáng 0–100%**: chọn theo từng ô cửa, rải đều mọi tòa, ADR-040), đèn xe (tự động / bật / tắt), độ glow (0–200%). Tự động nghĩa là bật khi tối. Click một tầng bật cả tầng. Dải kính chia ô 1,6–2 m. Màu cửa: sáng `--accent` viền `--accent-hi`, rất sáng `--accent-hi`, mờ = sáng ở 45% trên nền tường, tắt `--recess` viền `--detail`.

## 5b. Giao thông và đèn tín hiệu

Mỗi khung hình: thời gian mô phỏng tăng, `signalsAt` cho pha; đổi pha thì bật / tắt các lamp đèn tín hiệu; `stepTraffic` cho mọi xe đi; chỉ các xe nằm trong tầm nhìn mới được gom vào đầu `InstancedMesh` (`o.count = vis`) và biến đổi nét cạnh (`instanceCount`). Chân trang hiện màu đèn và số giây còn lại của Tây Sơn (`x`) và Thái Hà (`y`).

## 6. Màu và chất lượng

- Màu chỉ từ token CSS của `@my-city/theme` (đọc lại khi đổi theme): nền `--bg`; mặt đất và tường `--body`; mái, vỉa hè, tôn/sắt, bạt `--deck`; kính và nước `--glass`; lòng đường `--recess`; vạch `--line`; cỏ và cây chậu `--panel`; nét viền và cạnh `--line`; nét chi tiết `--detail`; cửa tắt `--recess`, cửa sáng `--accent`; đèn báo `--accent-hi`.
- Glow (bloom) chỉ ở theme tối và khi bật trong chất lượng; ngưỡng sáng 0,5 nên chỉ màu nhấn mới tỏa. Khi bloom tắt (như ở chế độ Ngày), renderer vẽ trực tiếp không qua `EffectComposer` (ADR-049).
- Chất lượng (`view/quality.ts`): 4 mức **Thấp / Trung bình / Cao / Rất cao** (mặc định **Cao** trên máy tính, **Trung bình** trên điện thoại/cảm ứng); chỉnh tay một tùy chọn thì thành **Tùy chỉnh**, chỉnh về đúng bộ của một mức thì trở lại tên mức đó. Có: chi tiết nhà tối đa (L0–L3), tự giảm khi thu nhỏ, độ phân giải (×1–×3), khử răng cưa (MSAA 4×), glow, cửa sổ, 3 lớp nét. Nhớ theo máy (localStorage; không có vẫn chạy).

| Mức | Chi tiết nhà | Tự giảm | Xe | Cột + dây | Cây | Tầm nhìn | Tự hạ mức | Độ phân giải | MSAA | Glow | Nét chi tiết |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Thấp | L1 | có | 30% | — | đơn giản | 150 m | có | ×1 | — | — | — |
| Trung bình | L2 | có | 60% | có | đơn giản | 250 m | có | ×1,5 | có | có | — |
| Cao (mặc định) | L3 | có | 100% | có | đầy đủ | hết | có | ×2 | có | có | có |
| Rất cao | L3 | không | 100% | có | đầy đủ | hết | không | ×3 | có | có | có |

**Tự hạ mức**: fps dưới 28 suốt 3 giây (không tính lúc đang dựng ô hoặc tab bị ẩn) thì xuống một mức; bảng chất lượng báo đã tự hạ. Không tự nâng lại. **Tầm nhìn xa**: ẩn ô nhà, ô đồ phố và xe xa tâm nhìn hơn khoảng đã chọn; lớp nền (đường, vùng) vẫn vẽ hết.

## 7. Kiểm thử

Test Node (không cần WebGL): `render/city.test.ts`: hình học hữu hạn, đủ đèn cho mọi tầng (Việt Tower 18, Novotel 27), click ra đúng tầng, tòa nào cũng click được, mặt cầu cao 6 m, đèn báo trên 80 m, hướng phải của đường; mức càng cao càng nhiều chi tiết; L2/L3 trên 85% số tầng có cửa; mỗi tòa đúng một ô; **mọi preset dựng được ở L2 và L3**, hữu hạn, tầng nào (cả phòng tum) cũng có cửa; mọi nhà sinh của bản đồ thật dựng được ở L3. `render/street-life.test.ts`: mọi ô đồ phố hữu hạn, có lamp đèn đường và đủ 6 lamp đèn tín hiệu, cây đơn giản không nét; mọi loại xe dựng được, xe đặt đúng làn và mờ ở đầu làn. `view/quality.test.ts`: trở về mức có tên, mức chi tiết theo zoom, tự hạ từng mức một. Ở core / osm-import: mạng đường (nối đoạn, nút giữ nguyên vị trí, góc đã tròn, cầu 6 m), đồ phố (đủ loại, không trên lòng đường, cùng kết quả), làn xe (xuyên Thái Hà → Chùa Bộc, vạch dừng 2 nhóm, cầu chỉ ô tô), mô hình xe (không vượt đèn đỏ khi chưa quyết đi, không đâm xe trước, xe nào cũng chạy). Hình ảnh thì người dùng kiểm bằng mắt (A7).
