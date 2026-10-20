# Thành phần

Mô tả từng thành phần: **dựng từ gì**, **tham số**, **trạng thái sáng**. Kích thước theo đơn vị code (1 m = 10). Quy ước ký hiệu: `box(x,y,z,w,d,h)`; mặt phẳng `F` = mặt tiền, `S` = mặt bên, `T` = mặt trên.

---

## A. Bộ phận nhà (`src/render/parts/`)

### A1. Thân nhà (`house.ts`)
- **Hình**: `box` từ nền đến đỉnh tường; nếu có `overhang`: thân tầng 1 + thân tầng 2+ nhô ra `overhang` về phía phố; nếu `setbackTop`: tầng cuối lùi vào.
- **L / vát**: L = 2 box; vát = thân chính + mặt vát vẽ như một `plane()` xiên (dùng `plane()` của kernel, không vẽ tay đa giác).
- **Chi tiết**: đường gờ ngăn tầng trên mặt tiền (strip mỏng trên plane, **không** dùng `box` — xem lưu ý của skill).
- **Sáng**: không.

### A2. Khung mặt tiền (`facade.ts`)
- Chia mặt tiền theo tầng (`groundH`, `floorH × floors`), mỗi tầng chia `windowsPerFloor` ô.
- Trả về danh sách "khe" `{floor, u0, u1, v0, v1}` để `windows.ts`, `balconies.ts` đặt vào.
- **Sáng**: mỗi tầng là một nhóm `g.fl` → bật đèn cả tầng bằng class `.on`.

### A3. Tầng 1 (`ground.ts`)
| Kiểu | Hình | Trạng thái |
|---|---|---|
| `fold` cửa xếp | Hình chữ nhật recess + các nét dọc dày đặc (một `path`), thanh ray trên | **Mở hàng**: cửa xếp thu về 2 bên (nét gom lại ở mép), lòng nhà `accent` + `halo` hắt ra vỉa hè |
| `roll` cửa cuốn | Recess + nét ngang đều, hộp cuốn trên | **Mở**: cửa kéo lên còn 1/5 trên, lòng nhà sáng |
| `glass` cửa kính | Khung kính chia 3–4 ô, `.glass` | **Mở**: `.glass.hot` |
| `wood` cửa gỗ | Cửa 4 cánh, nét pano | **Mở**: 2 cánh giữa sáng |
| `wall` | Tường kín + cửa đi nhỏ | Cửa đi sáng |

- **Mái hiên** `fabric`: tấm nghiêng nhô 12–15 ra vỉa hè (một `plane()` nghiêng), mép có nét sóng; `metal`: tấm phẳng + nét sóng tôn.
- **Biển hiệu**: xem mục A9 (8 kiểu biển và quảng cáo).

### A4. Cửa sổ (`windows.ts`)
| Kiểu | Hình |
|---|---|
| `tall` | Chữ nhật đứng, 2 cánh, nét giữa |
| `wide` | Chữ nhật ngang, 3 ô |
| `arch` | Chữ nhật + đỉnh vòm (path cung) |
| `glass` | Kính lớn gần hết bề rộng tầng |
| `louver` | Cửa chớp: nhiều nét ngang |

- **Sáng**: ô `.win` → khi tầng `.on`: `fill: --accent`; biến thể seed `off` / `dim` / `hi` (cách office-tower làm).

### A5. Ban công (`balconies.ts`)
| Kiểu | Hình |
|---|---|
| `rail` | Sàn mỏng nhô ra (box mỏng) + lan can = khung + song dọc (path) trên plane đứng song song mặt tiền |
| `solid` | Sàn + lan can đặc (strip cao ~10) |
| `cage` (chuồng cọp) | Lồng sắt nhô 8–12, cao **cả tầng**: khung 3 mặt + lưới song dọc dày; vẽ mặt trước và mặt bên nhìn thấy được |
- **Cây** (`plants`): 1–3 chậu tròn + tán (circle có nét `detail`), rủ xuống mép lan can.
- **Quần áo phơi** (`laundry`): dây ngang + vài hình chữ nhật nhỏ treo.
- **Sáng**: không tự sáng; nhận ánh sáng từ cửa sổ phía sau (cửa sáng thì song chuồng cọp nổi bật thành bóng).

### A6. Mái (`roofs.ts`)
| Kiểu | Hình |
|---|---|
| `flat` | Mặt trên + tường chắn mái `parapet` (4 strip trên các mặt nhìn thấy + đỉnh) |
| `metal1` | Một mặt nghiêng (`plane()` nghiêng) + nét sóng tôn song song |
| `metal2` | Hai mặt nghiêng gặp nhau ở nóc dọc theo chiều sâu nhà; đầu hồi tam giác |
| `tile` | Như `metal2` + lưới nét ngói |
| `stairHut` (tum) | Box nhỏ ~ `w × 30`, cao 25, sát phía sau mái, có cửa đi |
| `roofShelter` | Tấm tôn dốc ra phố trên cột mảnh đặt trên tường chắn: `terrace` (tựa tường tum, che sân thượng) hoặc `full` (4 cột, che cả mái, chừa dải sau cho bồn nước). Tấm tôn là một item nằm trên mọi thứ bên dưới; cột là item riêng dừng ngay dưới tấm, đoạn cuối vẽ cùng tấm để không lồng nhau |

### A7. Vật trên mái (`roof-items.ts`)
| Vật | Hình | Sáng |
|---|---|---|
| `tank-h` bồn inox nằm | Trụ nằm (hull của 2 elip) trên 2 chân đỡ | không |
| `tank-v` bồn đứng | Trụ đứng + nắp | không |
| `solar` máy NLMT | Khung nghiêng + dãy ống (nét song song) + bồn nằm phía trên | không |
| `antenna` | Cột mảnh + thanh ngang | đèn đỏ nhỏ trên đỉnh nhấp nháy (chỉ ở nhà cao nhất dãy) |
| `ac` cục nóng | Box nhỏ + lưới tròn quạt | **Quạt quay** (xoay nét) khi tầng bên dưới `.on` |
| `pots` | Chậu + tán | không |

Đặt vật: chia mái trống thành lưới ô 10 × 10, seed chọn ô, không chồng, tránh tum.

### A8. Mặt lưng & tường hồi (`back.ts`)
- **Mặt lưng** (khi `facing` khuất): tường trơn, 1 cửa sổ nhỏ mỗi tầng lệch về một bên, ống thoát nước dọc.
- **Tường hồi** (mặt bên): tường trơn + vệt ố (nét `detail` ngắn ngẫu nhiên) + `sideAC` cục nóng treo + `sideAd` khối chữ trừu tượng.
- Tự nhiên lộ ra khi nhà cao đứng cạnh nhà thấp nhờ thứ tự vẽ — không cần logic riêng.

---

### A9. Biển hiệu & quảng cáo (`signs.ts`)

Danh mục do người dùng mô tả (2026-10-20). Một căn có thể có nhiều biển. Mọi biển "hộp đèn" sáng cùng tầng/cửa hàng của nó; biển nằm ngoài nhóm tầng thì gắn `data-for="<floor id>"`.

| Kiểu (`type`) | Mô tả thực tế | Hình | Vị trí | Sáng | Có trong nhà mẫu |
|---|---|---|---|---|---|
| `facade` | Biển ngang phía trên cửa chính | Hộp đèn chữ nhật trên plane mặt tiền | Trên cửa tầng 1. **Nếu tầng 2 đua ra thì treo ngay dưới mép khối đua ra** (nếu gắn sát tường sẽ bị khối đua che khi nhìn từ trên) | Nền accent, chữ màu panel | ✅ CÀ PHÊ, BARBER |
| `side-panels` | Hai biển dọc ốp hai bên cửa | 2 hộp đèn đứng, chữ xếp dọc | Hai bên cửa tầng 1 | như trên | ✅ PHOTO / COPY |
| `projecting-vertical` | Biển dọc chìa ra phố | Tấm trên plane `x = const` (SIDE), giá đỡ 2 thanh | Mép phải mặt tiền, tầng 2–3 | như trên | ✅ CAFE |
| `projecting-round` | Biển tròn chìa ra phố | Đĩa tròn trên plane SIDE (thành elip) | Cạnh cửa tầng 1 | như trên | ✅ ✂ |
| `standee` | Biển đứng chữ A trên vỉa hè (quán cà phê) | Tấm nghiêng `plane()` + chân | Vỉa hè trước cửa | như trên | ✅ MENU |
| `barber-pole` | Ống xoắn xoay trước tiệm cắt tóc | Ống có nắp, sọc chéo trong clipPath | Cạnh cửa | Sọc accent và **chạy xoắn** (animation) khi tiệm sáng; tắt khi reduced motion | ✅ |
| `billboard` | Biển quảng cáo lớn trên cao, có đèn chiếu | Tấm mỏng gắn tường hồi hoặc trên mái, 2–3 đèn chiếu trên cần | Tường hồi cao, mái nhà, khoảng thoáng | Ban đêm: mặt biển `glass-on` + viền accent, đèn chiếu sáng | ✅ CHO THUÊ |
| `sticker` | Tờ quảng cáo dán cỡ A5 (khoan cắt bê tông, rút hầm cầu…) | Chữ nhật nhỏ màu nhạt + vài nét chữ nguệch ngoạc (không đọc được) | **Chỉ ở tầm tầng 1**: tường, trụ cửa, cột điện | Không sáng | ✅ |

Ghi chú:
- Biển lớn có chữ đọc được chỉ dùng chữ tự đặt, không thương hiệu (C-04).
- Font DM Mono thiếu nhiều chữ tiếng Việt có dấu (Ở, Ả, Ắ, Ể…). Xem câu hỏi Q5 trong [decisions](decisions.md).

## B. Đồ phố (`src/render/props/`)

| Thành phần | Hình | Tham số | Sáng / động |
|---|---|---|---|
| **Vỉa hè** `sidewalk` | Dải cao 1.5 dọc dãy nhà, mép bó vỉa, lát gạch (lưới nét) | rộng (mặc định 30) | — |
| **Lòng đường** | Mặt phẳng + vạch kẻ làn (nét đứt), vạch dừng, vạch sang đường ở ngã tư | số làn | — |
| **Cột điện** `pole` | Cột bê tông vuông thon + xà ngang + sứ; cách nhau ~30–40 m | cao 80–90 | — |
| **Dây điện** `wires` | 3–6 dây/khoảng, võng (catenary xấp xỉ bằng bezier bậc 2), thêm **bó dây rối** (cuộn tròn) ở vài cột | độ võng, số dây | **Xung sáng** chạy dọc dây (`.pulse.go`), ngẫu nhiên theo thời gian; đêm thì nhiều hơn |
| **Đèn đường** `lamp` | Cột + cần cong + chao | khoảng cách | Đêm: bóng `accent-hi` + `halo` bloom hắt xuống vỉa hè |
| **Cây** `tree` | Bồn gốc + thân + tán (circle chồng) — như office-tower | cỡ tán | — |
| **Xe máy** `bike` | Hình rất đơn giản: thân + người (2–3 box nhỏ) | làn, tốc độ, chiều | Đèn pha (trước) + đèn hậu là chấm `accent`; chạy bằng `api.loop` |
| **Đèn giao thông** `traffic-light` | Cột + hộp 3 đèn (mặt nhìn thấy) | chu kỳ (xanh 20 s / vàng 3 s / đỏ 23 s, tua nhanh ×4) | Đèn đang bật `accent` + glow; xe dừng ở vạch khi đỏ |

---

## C. Landmark (`src/render/landmarks/`)

Mục tiêu: **nhận ra được qua hình khối và tỉ lệ**, không cần logo hay chữ. Hình khối dưới đây là **phác thảo ban đầu**; sẽ chỉnh theo ảnh thực tế khi có (xem [decisions](decisions.md), câu hỏi mở Q2).

### C1. Tòa Thái Bình (Parkson cũ)
- **Bố cục giả định**: khối đế thương mại rộng (nhiều tầng, mặt kính lớn) + tháp văn phòng phía trên.
- **Đặc điểm cần xác nhận từ ảnh**: số tầng đế, số tầng tháp, tháp đặt giữa hay lệch, góc tòa nhà vát/bo, vị trí sảnh.
- **Sáng / tương tác**: khối đế sáng theo tầng (như mall mở cửa); tháp bật đèn từng tầng (tái dùng ý tưởng office-tower: click tầng, cascade `N`); biển trên đỉnh là **một khối sáng trơn**, không chữ thương hiệu.

### C2. Tòa Novotel
- **Bố cục giả định**: tháp khách sạn cao, mặt bằng gọn, lưới cửa sổ phòng đều, khối đế/sảnh thấp có mái sảnh (canopy) cho xe đón.
- **Đặc điểm cần xác nhận từ ảnh**: số tầng, hình mặt bằng, mái (phẳng / có khối kỹ thuật), dải sáng đặc trưng nếu có.
- **Sáng / tương tác**: cửa sổ phòng sáng rải rác kiểu lived-in (seed), sảnh sáng, mái sảnh hắt sáng; xe ra vào sảnh (tùy chọn).

### C3. Vườn hoa (`garden.ts`, dùng cho cả 2 góc)
- **Hình**: nền thấp có bó viền, lối đi (2 đường chéo hoặc vòng cung), bãi cỏ (lưới chấm thưa), 6–12 cây, ghế đá, 3–6 đèn vườn, hàng rào thấp tùy chọn.
- **Tham số**: kích thước, kiểu lối đi (`cross` / `ring`), số cây, seed.
- **Sáng**: đêm thì đèn vườn bật + quầng sáng tròn trên mặt đất; đây là **khoảng tối – thấp** cân với hai tòa cao.

---

## D. Bảng tổng hợp: thứ gì phát sáng

| Đối tượng | Kích hoạt | Hiệu ứng |
|---|---|---|
| Cửa sổ | Click nhà, cascade `N` | `.on` → accent + `#soft` |
| Cửa hàng tầng 1 | Theo `shop` + đêm | Cửa mở, lòng nhà sáng, halo vỉa hè |
| Biển hiệu | Đêm | Accent, nhấp nháy nhẹ |
| Dây điện | Liên tục | Xung chạy dọc dây |
| Đèn đường / đèn vườn | Đêm | Bóng sáng + bloom xuống đất |
| Xe máy | `T` | Chấm đèn pha / hậu di chuyển |
| Đèn giao thông | Liên tục | Đổi pha |
| Landmark | Click tầng, `N` | Sáng theo tầng, khối biển đỉnh |
| Ăng-ten nhà cao nhất | Đêm | Đèn đỏ chớp |
| Cục nóng | Tầng dưới `.on` | Quạt quay |

---

## E. Bóc tách từ nhà mẫu → `render/parts/*` (đầu vào cho P1b)

Mỗi hàm trong `src/render/reference-house.ts` (nhà mẫu đã được duyệt, ADR-016) chuyển thành một bộ phận có tham số. Khi bóc **không được đổi ngoại hình**: nhà mẫu được dựng lại bằng generator phải trông như bản vẽ tay (so bằng snapshot và bằng mắt).

| Hàm trong nhà mẫu | Đích | Tham số rút ra | Ghi chú |
|---|---|---|---|
| `floor()` | `parts/facade.ts` | `id`, mặt (`FRONT`/`SIDE`), rộng, cao, nội dung đèn, phần cố định | Nhóm `.fl` + halo + `.lights`; giữ nguyên cách bật đèn |
| `win`, `tallWindow`, `louverWindow`, `glassDoors`, `sill` | `parts/windows.ts` | `window: 'tall' \| 'louver' \| 'glass-doors' \| 'pair' \| 'wide'`, vị trí trong khe tầng | Biến thể lived-in chỉ `dim`/`hi` (không `off`) khi tầng ≤ 2 cửa |
| Cửa xếp gập 2 bên (M1), cửa cuốn kéo nửa (L1), cửa kính + cửa sổ (R1) | `parts/ground.ts` | `ground: 'fold' \| 'roll' \| 'glass' \| 'wood' \| 'wall'`, `shop`, độ mở | Lòng nhà sáng là `.win`; cửa xếp và cửa cuốn vẽ đè lên |
| Mái hiên bạt + diềm lượn sóng | `parts/ground.ts` | `awning: 'fabric' \| 'metal' \| 'none'`, độ nhô, độ dốc | Vẽ **trước** biển treo dưới mép đua ra |
| `signText`, `stacked`, các biển | `parts/signs.ts` | `signs: SignSpec[]`, `shopName` | 7 kiểu ở mục A9; biển `facade` tự chọn vị trí (sát tường hay dưới mép đua ra) theo `overhang` |
| `sticker` | `parts/signs.ts` | `stickers` | Chỉ ở dải z ≤ tầng 1 |
| `railBalcony`, `cage` | `parts/balconies.ts` | `balcony: 'rail' \| 'solid' \| 'cage'`, `balconyFloors`, `balconyDepth`, cây | Thứ tự: sàn → cây → lan can bên → lan can trước (→ nắp với `cage`) |
| `pot` | `parts/plants.ts` | cỡ, vị trí | Dùng chung cho ban công, sân thượng, mái |
| `acFront`, `acSide` | `parts/ac.ts` | vị trí, mặt gắn | `sideAC` trên tường hồi; cục nóng mặt tiền tùy tầng |
| `stains`, ống nước | `parts/back.ts` | mật độ (seed) | Tường hồi và mặt sau |
| Phòng tum lùi + sân thượng + lan can + dây phơi | `parts/roofs.ts` (+ `parts/terrace.ts`) | `setbackTop`, `stairHut`, `parapet`, `laundry`, `plants` | Thứ tự: phòng → đồ trên sân → lan can bên → lan can trước |
| Mái tôn 2 dốc + đầu hồi | `parts/roofs.ts` | `roof: 'metal2'`, độ dốc | `metal1`, `tile` cùng cách dựng |
| `cylinderX` bồn inox, máy NLMT, ăng-ten, bồn đứng | `parts/roof-items.ts` | `roofItems[]` | Bồn NLMT vẽ **trước** tấm pin (nằm sau mép trên) |
| Biển lớn + đèn chiếu | `parts/signs.ts` (`billboard`) | mặt gắn (tường hồi / mái), kích thước, chữ | Thuộc nhà, nhưng sáng theo **đêm** (`data-night`), không theo tầng |
| Vỉa hè, ghế nhựa, xe máy, standee | `props/sidewalk.ts`, `props/bikes.ts` | độ rộng vỉa hè, mật độ đồ | Xe máy đỗ sẽ thành xe chạy ở P3 |
| Cột điện, đèn đường, dây võng, bó dây rối, dây vào nhà, xung | `props/poles-wires.ts`, `props/lamps.ts` | khoảng cách cột, số dây, độ võng | `sagLine` dùng chung |
| `convexHull`, `cylinderX`, `groundCircle`, `sagLine` | giữ ở `render/geom.ts` | — | Đã có |

**Bài học thứ tự vẽ rút ra từ nhà mẫu** (đưa thành test cho `depthSort` ở P1b):
1. Biển treo dưới mép phần đua ra phải vẽ **sau** mái hiên và **trước** sàn ban công tầng 2.
2. Bộ phận gắn tường hồi (cục nóng) nằm cao hơn mái nhà bên cạnh thì không chồng hình với nhà bên, nên thứ tự nào cũng được.
3. Biển lớn trên tường hồi nhà cao vẽ sau phòng tum của nhà thấp hơn, và trước các vật trên mái của nhà thấp nằm ở x lớn hơn.
