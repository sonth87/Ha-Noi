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
| `roofShelter` | Mái tôn tam giác 2 dốc (nóc dọc chiều sâu, đầu hồi hở có vì kèo: 2 kèo, giằng ngang, trụ giữa, thanh chống) trên cột mảnh đặt trên tường chắn: `terrace` (tựa tường tum, che sân thượng) hoặc `full` (4 cột, che cả mái, chừa dải sau cho bồn nước). Tấm tôn là một item nằm trên mọi thứ bên dưới; cột là item riêng dừng ngay dưới tấm, đoạn cuối vẽ cùng tấm để không lồng nhau |

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
| **Ô tô** `car.ts` | sedan / hatchback / taxi (hộp đèn trên nóc, sáng đêm) / van: thân + khoang kính, bánh và kính ở sườn nhìn thấy, kính lái hoặc kính hậu ở đầu nhìn thấy | chạy giữa làn; ô tô cùng làn cùng tốc độ, cách đều nên không chồng nhau | Đèn pha + đèn hậu ban đêm |
| **Xe máy** `bike` | Xe tay ga nhìn ngang trên mặt phẳng đứng dọc làn: 2 bánh, thân + yếm, yên, tay lái; người lái (khối + đầu) | làn, tốc độ, chiều, vệt trái/phải | Đèn pha + đèn hậu `accent` ban đêm (không filter vì chạy liên tục); controller trượt theo thời gian, mờ dần ở 2 đầu phố |
| **Đèn giao thông** `junction.ts` | Mỗi góc ngã tư một cột; đầu đèn là hộp 4 mặt: mặt nhìn dọc Tây Sơn báo đèn Tây Sơn, mặt nhìn dọc Thái Hà báo đèn Thái Hà (góc nào cũng thấy cả hai); 3 đèn + **đồng hồ đếm ngược** (như đèn Hà Nội) | chu kỳ `core/traffic.ts`: Tây Sơn xanh 14 s → vàng 3 s → đỏ hết 4 s → Thái Hà xanh 11 s → vàng 3 s → đỏ hết 4 s | Đỏ = `accent`, vàng = `accent-hi`, xanh = `live` (A8); số đếm cùng màu; xe dừng ở vạch khi đỏ |
| **Nút giao** `junction.ts` | Mặt đường, 4 vạch sang đường (vằn), vạch dừng ở nửa phải mỗi hướng tới, 4 góc vỉa hè có bó vỉa sơn sọc | kích thước từ mặt cắt 2 phố | — |
| **Dải phân cách** (Tây Sơn) | Dải nâng cao 0.24 m giữa hai chiều, cắt từng đoạn 5 m, nhường chỗ cho dốc cầu | `Section.median` | — |
| **Cầu vượt Tây Sơn** `flyover.ts` | 2 làn trong của Tây Sơn lên dốc đắp có tường chắn (vạch tầng 1.2 m), qua ngã tư trên mặt cầu cao 6 m tựa trụ ở dải phân cách, xuống dốc bên kia; lan can 2 bên; mỗi đoạn 5 m là một item gồm thân → lan can xa → xe → lan can gần | `Flyover { lanes, r: [r0..r3], H }`: dốc 28 m, mặt cầu từ 12 m trước tới 12 m sau nút giao | Chỉ ô tô (xe máy không được lên cầu), không dừng đèn |

---

## C. Landmark (`src/render/landmarks/`)

Mục tiêu: **nhận ra được qua hình khối và tỉ lệ**, không logo hay chữ (A9). **Tòa nhà thật lấy mặt bằng và số tầng từ OpenStreetMap** (luật A13, cách làm ở [ai/README §6](../ai/README.md)). Dựng theo ảnh người dùng gửi ngày 2026-10-21 (ảnh trên cao ngã tư, ảnh vệ tinh, ảnh 2 tòa nhà); **mặt bằng 2 tòa tháp lấy đúng từ OpenStreetMap** (ADR-030). Khối chung ở `shapes.ts`: lăng trụ trên đa giác lồi bất kỳ (elip, tròn, viên thuốc, chữ nhật bo góc), chỉ vẽ mặt quay về người xem; **`extrude`** cho mặt bằng bất kỳ (lõm cũng được): tường xếp thứ tự vẽ trong một item, mỗi tường có dải cửa theo tầng, rồi mái; dải cửa sổ liền một vòng theo tầng (`ribbons`), cửa so le kiểu pixel (`pixelWindows`), hàng cửa thường (`windowRows`). Mỗi tầng là một nhóm `.fl` như nhà: click bật đèn, `N` bật dần.

Vị trí 4 góc (ADR-024): **Tây Sơn** chạy theo trục x, **Thái Hà** ở nhánh bắc, **Chùa Bộc** ở nhánh nam.

| Góc | Lô (x × y) | Công trình |
|---|---|---|
| Tây bắc | 54 × 117.5 m | Tòa Thái Bình |
| Đông bắc | 46 × 96.5 m | Novotel |
| Tây nam | 40 × 38 m | Vườn hoa tròn |
| Đông nam | 40 × 38 m | Vườn cây rậm |

### C1. Tòa Thái Bình (Parkson cũ, nay Việt Tower) · `thai-binh.ts`
- **Số liệu**: 18 tầng, 2 hầm ([Báo Văn Hóa](https://baovanhoa.vn/doi-song/ha-noi-chua-phat-hien-thiet-hai-ve-nguoi-trong-vu-chay-tren-pho-thai-ha-128465.html), [batdongsan](https://batdongsan.com.vn/ban-nha-rieng-viet-tower), [Bizhub](https://bizhub.vietnamnews.vn/parkson-closes-last-trade-centre-in-ha-noi-post282470.html)). Người dùng gọi là "Parkson", tòa màu trắng bo tròn.
- **Mặt bằng**: OSM way 136257265 (cả tòa) và các phần 845096110 (tháp, 18 tầng), 1198548269 (khối nêm, 11 tầng), 1198548270 (cánh, 11 tầng). Dài ≈ 108 m dọc Thái Hà, rộng ≈ 47 m.
- **Hình khối**: **khối đế 11 tầng** (4 m/tầng) phủ cả tòa: **cánh dài đầu tròn** chạy lên phía Thái Hà, **khối nêm** thon dần tới **mũi tròn** hướng ra Tây Sơn; **tháp 18 tầng** (tầng 12–18, 3.6 m/tầng) giữa hai khối, mặt thẳng sát Thái Hà, **đầu tròn quay về phía khối nêm**; **mỗi tầng một dải kính ngang liền**; trên mái tháp có phòng kỹ thuật và **cột ăng-ten khung** 13 m, đèn báo máy bay nhấp nháy ban đêm; cây ở sân trước mặt Tây Sơn. Hai khối là 2 item chồng theo z (0–11 tầng, 11–18 tầng).
- **Sáng**: 18 tầng `TB/1…18`; đèn ăng-ten `.beacon`.

### C2. Novotel · `novotel.ts`
- **Số liệu**: 27 tầng, 343 phòng ([Hotels.com](https://www.hotels.com/ho1080005984), [Expedia](https://www.expedia.com/Hanoi-Hotels-Novotel-Hanoi-Thai-Ha.h33718937.Hotel-Information), [Northstar](https://www.northstarmeetingsgroup.com/Meeting-Event-Venues/Hanoi-Vietnam/Convention-Hotel/Novotel-Hanoi-Thai-Ha-p53183046)). Người dùng: "tòa màu xanh là novotel".
- **Mặt bằng**: OSM way 850419282 (cả tòa) và các phần 850419279 (tháp kính), 850419280 / 850419281 (2 dải trắng), 1198548268 (cánh 5 tầng). OSM ghi tháp 26 tầng, dải trắng 24 tầng; ở đây tháp lên tới tầng 27 cho khớp số liệu khách sạn.
- **Hình khối**: **khối đế 5 tầng** (4.2 m/tầng) trắng: phần trước dưới tháp và **cánh chữ L** phía sau, có **đuôi hẹp** chạy lên phía Thái Hà, **bể bơi trên mái cánh** và ghế nằm; **tháp kính** (3 m/tầng) là hình chữ nhật có **góc về phía ngã tư vuốt cong lớn**; **2 dải trắng** bậc thang ở mép ngoài, kẹp hai đầu mặt cong, tới tầng 24; cây ở sân trước mặt Tây Sơn. Kính là `--glass` (bảng màu không có xanh dương). 3 item chồng theo z (tầng 1–5, 6–24, 25–27).
- **Sáng**: `NV/1…27`.

### C3. Vườn hoa · `garden.ts` (2 kiểu)
- **`circle` (tây nam)**: quảng trường tròn lát gạch ở giữa với **bồn hoa 2 tầng** (chấm hoa), **lối vòng** quanh, 5 lối tỏa ra 4 cạnh và **về góc ngã tư**; 8 chỗ trên lối vòng xen kẽ **đèn vườn** và **ghế đá**; cây to/vừa trên các mảng cỏ.
- **`grove` (đông nam)**: **cây rậm** theo lưới so le, một **lối đi uốn khúc** từ góc ngã tư xuyên vườn + một nhánh, ghế và đèn dọc lối.
- **Chung**: cỏ (`.lawn`) có nét cỏ lấm tấm, lối lát (`.path-paved`), **hàng rào cây thấp** quanh vườn cắt thành đoạn ≤ 6 m, hở ở chỗ lối đi ra; cây dùng chung `treeArt` với cây vỉa hè (tán liền một khối). Vị trí cây theo lưới, hộp bao không chồng nhau.
- **Sáng**: đèn vườn bật về đêm (`data-night`).

---

### Trang "Công trình" (`render/landmarks/showcase.ts`, `scenes/landmarks/`)
- Mỗi lần một công trình, xoay quanh tâm lô của chính nó; dữ liệu mô tả ở `core/landmarks.ts` (`LANDMARKS`: tên, vị trí, số liệu, đặc điểm), dùng cho bảng bên.
- Cầu vượt & nút giao: cắt từ cảnh ngã tư thật, giữ đồ phố, cầu và nút giao có **tâm** nằm trong vùng ±42 m quanh nút giao; bỏ nhà và 4 lô góc. Mặt đường mỗi nhánh chia đoạn 15 m (bội số của nét đứt 8 + 7 và gạch vỉa hè 10) để vết cắt gọn.

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

---

## F. Nửa hầm để xe (`basement`)

| Phần | Hình | Sáng |
|---|---|---|
| Dải ga-ra dưới tầng 1 (trên mặt tiền tầng 1) | Gờ sàn, cửa cuốn rộng ~60% mặt tiền, hộp cuốn; mở nửa khi `shop` | Lòng ga-ra sáng cùng tầng 1 |
| Bậc tam cấp (item) | 3 bậc từ mặt vỉa hè lên sàn tầng 1, ở ~64% mặt tiền, sâu 3 × 0.26 m | — |

---

## G. Lựa chọn bổ sung (ADR-022)

| Bộ phận | Hình | Ghi chú |
|---|---|---|
| Tường `tile` | Lưới gạch men 4.5 × 3 trên mặt tiền tầng trên (dưới cửa sổ) | `finish()` trong `ground.ts` |
| Tường `paint-old` | Mảng loang lổ, bong tróc ngẫu nhiên theo seed (mặt tiền tầng 1 + tầng trên) | |
| Tường `stone-base` | Đá ốp chân tường tầng 1, mạch so le | |
| Cửa `iron` | Khung + song + hoa văn quả trám; mở hàng = 2 cánh gập 2 bên, lòng nhà sáng | |
| Mái hiên `metal` | Tấm tôn dốc nhẹ + mép | |
| Bày vỉa hè `goods` | Bàn ghế nhựa / xe máy dựng vuông góc lề (cùng hình với xe chạy) / két bia xếp chồng | Một item, 60% mặt tiền bên trái, ≤ 1.9 m |
| Cửa sổ `arch` / `french` / `glass` | Vòm đầu tròn / cửa Pháp + 2 cánh chớp mở / mảng kính chia ô | |
| Ban công `solid` | Sàn + 3 tường mỏng (lan can xây) | |
| Ô văng `canopy` | Tấm bê tông mỏng hoặc tôn nhỏ dốc ra, ngay trên cửa sổ, sâu 0.6 m | Item riêng; bỏ khi có chuồng cọp |
| Phơi đồ `laundry` (tầng) | Dây + quần áo treo trên mặt phẳng song song mặt tiền, trong ban công | |
| Mái `metal1` | Một dốc, cao phía sau, 2 tam giác đầu hồi + tường sau | |
| Mái `tile` | Như tôn 2 dốc, thêm lớp ngói ngang | |
| Tum thang `stairHut` | Khối 1.4 × 2 m cao 2.4 m ở góc sau, mái đua, cửa | |
| Mái: `ac`, `flag` | Cục nóng trên mái; cột cờ với lá cờ (ngôi sao vẽ nét) | Qua bộ xếp chỗ |
| Tường hồi `sideAd`, `sideWindows` | Khung + 2 dòng chữ sơn; cửa sổ nhỏ theo tầng (chỉ trên phần lộ) | |

---

## H. Cây (góp ý 2026-10-21)

| Phần | Hình | Ghi chú |
|---|---|---|
| Chậu cây `plants.ts` | Chậu 0.4 m + cây cao vượt lan can, 6 loại theo seed: **bụi lá**, **kim tiền** (3 thân, lá bóng xòe), **trúc** (thân mảnh, lá nhỏ), **cau cảnh** (tàu lá cong), **hoa giấy** (khối lá + hoa rủ qua lan can), **bụi hoa** | Viền lá màu `--ink` để đọc ra cây trên nền tối |
| Cây trước nhà `trees.ts` | Thân thon, chia 3 cành ở **khe giữa đáy tán** (đoạn đầu cành vẽ đè lên tán). **Tán** (`foliage.ts → crown`): các mảng lá treo ở đầu cành — tầng dưới 2 nửa xòe rủ, tầng giữa, đỉnh nhỏ — mỗi mảng vẽ 2 lần (lớp viền dày rồi lớp nền không viền) nên chỉ còn **viền ngoài của hợp các mảng**: một tán liền, có khe lõm, mép răng lá mảnh; vài cung bóng dưới tán và nét lá. 2 dáng: xòe rộng (bàng, xà cừ) / tròn đầy (sấu, nhội) | Item riêng, ở mặt tiền + 2.55 m (to: 2.7 m). Kích thước `core/units.ts → TREE`. Lịch sử 5 lần: đĩa tròn ghép ("chùm bóng bay") → đĩa răng cưa (kẹo mút) → đống cụm mây ("tròn tròn mấy cục") → một viền elip ("cục cơm nắm") → **mảng lá ghép một viền + tán thấp, rộng** |
| Luật trên phố | Đi dọc mỗi dãy, giữ cây chỉ khi tán không chạm tán đã giữ, cách cột điện ≥ tán + 1.1 m, không vượt hai đầu phố; nhà hẹp không đủ chỗ cho 2 tán thì chỉ 1 cây. Dây điện được cắt thêm tại 2 mép mỗi tán (tránh vòng thứ tự vẽ dây – cột – cây) | `core/layout.ts`, `render/props/street.ts` |
| Biển tròn chìa ra | Chỉ 1 ký tự: chữ riêng của biển, không có thì chữ cái đầu tên quán | |
