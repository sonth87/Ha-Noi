# Hướng dẫn dùng app 3D

Hướng dẫn app SVG cũ ở [apps/svg/docs/user/guide.md](../../apps/svg/docs/user/guide.md).

## Chạy

```bash
pnpm install
pnpm dev:3d        # http://localhost:5190
```

## Điều khiển

| Chuột / phím | Việc |
|---|---|
| Kéo chuột trái | **Di chuyển** khung nhìn trên mặt đất |
| Kéo chuột phải, hoặc **Shift + kéo** | Xoay và nghiêng (chế độ 3D) |
| Cuộn | Phóng to / thu nhỏ **vào chỗ con trỏ** |
| **Nhấp đúp** | Bay tới chỗ vừa nhấp |
| `W` `A` `S` `D` / phím mũi tên (giữ) | Đi tới / lùi / sang trái / sang phải |
| `R` / `F` | Nghiêng lên / xuống (3D) |
| `+` / `−` | Phóng to / thu nhỏ |
| `H`, nút **Ngã tư** | Về Ngã tư Thái Hà; menu **Khu vực**: bay nhanh tới Ngã Tư Sở, Chùa Bộc, Nguyễn Lương Bằng, Ô Chợ Dừa, Xã Đàn, Hồ Hoàng Cầu, Láng Hạ, Ga Thái Hà, Ga La Thành |
| Menu **Công trình** | Chọn xem riêng từng công trình lớn từ OSM, nhà ga Metro hoặc mẫu kiến trúc Hà Nội đặt trên **đế mô hình (`iso-glow`)**; chọn **Bản đồ toàn khu** (hoặc nút **← Bản đồ**) để quay lại bản đồ |
| `V` | Đổi **2D** (isometric, 4 góc cố định như app cũ) ↔ **3D** (xoay tự do) |
| `Q` / `E` | Xoay 90° sang trái / phải |
| Click một tòa | Bật / tắt đèn **tầng** được click |
| `Space` | Bật hết / tắt hết |
| `N` hoặc `T`, nút **Ngày / Đêm** | **Ngày** (giao diện sáng, đèn tắt) ↔ **Đêm** (giao diện tối, cửa sổ sáng dần lên, đèn đường và đèn vườn sáng, xung sáng chạy dọc dây điện, xe bật đèn, đèn báo trên ăng-ten Việt Tower nhấp nháy). Mặc định là Ngày; lựa chọn được nhớ. Từng loại đèn vẫn chỉnh riêng ở tab **Ánh sáng** |
| 4 ô màu trên thanh công cụ phải | Đổi nhanh giữa **Đơn sắc** (mặc định `iso-glow`) và **3 tông màu thực tế** (`Màu 1`, `Màu 2`, `Màu 3`) phủ màu cho đường xá, hồ nước, công viên, cây xanh và vật liệu kiến trúc thực tế của các công trình lớn, di tích, đền chùa, nhà thờ, tượng đài |
| `G`, nút **Tùy chỉnh** | Mở / đóng Drawer cài đặt nổi bên phải gồm 3 tab: **Giao diện**, **Ánh sáng**, **Đồ họa** |

Trên màn hình cảm ứng (điện thoại / máy tính bảng): **một ngón** để di chuyển, **hai ngón** ở chế độ 2D để vừa chụm phóng to/thu nhỏ vừa kéo, ở chế độ 3D để chụm phóng và xoay/nghiêng; **chạm đúp** để bay tới vị trí chạm, **chạm đơn** vào tòa nhà để bật/tắt đèn tầng. Trên điện thoại, ứng dụng tự chọn mức chất lượng *Trung bình* và thu gọn bảng cài đặt lúc mở để ưu tiên không gian cảm ứng mượt 60 fps.

## Khu phố & Công trình trên đế

- **Bản đồ mở rộng**: bao phủ 6 khu vực trung tâm Hà Nội (**Đống Đa, Ba Đình, Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân**) với danh mục 208 công trình biểu tượng thuộc 13 nhóm. Dọc trục Hoàng Cầu – Hào Nam có **tuyến metro 2A trên cao** cùng **ga Thái Hà** và **ga La Thành**: tàu 4 toa chạy hai chiều, dừng ở ga khoảng 25 giây (cửa toa và mép sân ga sáng lên).
- **Công trình trên đế (`iso-glow`)**: chọn một mục trong dropdown **Công trình** ở thanh nổi phía trên trái để đặt riêng công trình đó lên đế mô hình vát góc có đường trước nhà, vỉa hè, cột đèn và cây xanh (vẫn xoay 2D/3D, đổi bảng màu, đổi Ngày/Đêm và click bật đèn từng tầng).

Xe chạy theo đèn tín hiệu ở các nút có đèn: viên thuốc trạng thái góc dưới trái hiện fps, màu đèn và số giây còn lại của Tây Sơn và Thái Hà. Ô tô lên cầu vượt, xe máy chạy hai mép làn.

## Bảng Tùy chỉnh (3 Tab: Giao diện · Ánh sáng · Đồ họa)

Nút **Tùy chỉnh** (phím `G`) mở Drawer nổi bên phải:

### 1. Tab Giao diện
- **Nền thanh công cụ (UI)**:
  - **Tắt (Đặc)** *(Mặc định)*: nền thanh công cụ đặc 100%, hoàn toàn không trong suốt.
  - **Mờ (Tint)**: nền kính mờ trong suốt, có thanh trượt chỉnh **Độ trong suốt (10%–90%)**.
  - **Kính (Lens)**: hiệu ứng kính khúc xạ thấu kính quang học Apple Optical Lens (`sonth87/liquid-glass`), có thanh trượt chỉnh **Độ trong suốt (10%–90%)** và **Khúc xạ thấu kính (0–180)**.
- **Màu bản đồ**: chọn trực tiếp bằng 4 thẻ ô màu trực quan (**Đơn sắc**, **Màu 1**, **Màu 2**, **Màu 3**).
- **Màu đèn nhấn**: chọn 6 tông màu đèn nhấn ban đêm (`Sodium`, `Tungsten`, `Neon`, `Signal`, `Dusk`, `Moon`).
- **Hiển thị trên bản đồ**: chỉnh kiểu **Tên đường**, **Thông tin địa điểm**, và công tắc bật/tắt **Nhìn xuyên (`X`)**.

### 2. Tab Ánh sáng
- **Đèn nhà**: *Tự động* (tối mới bật), *Bật* (sáng cả ban ngày), *Tắt*. **Cửa sáng** 0–100%: tỉ lệ cửa sổ có đèn, rải đều trên mọi tòa (tòa nào cũng lốm đốm); kéo lên thì thêm cửa, kéo xuống thì bớt; 100% là tất cả. Cửa sáng không đều: có cửa rất sáng, cửa mờ. Click một tầng để bật cả tầng đó.
- **Đèn xe**: *Tự động* (tối mới bật), *Bật*, *Tắt*: đèn pha, đèn hậu, hộp đèn taxi và vệt đèn pha trên đường.
- **Đèn đường**: *Tự động* (tối mới bật, mặc định), *Bật*, *Tắt*: bóng đèn và vùng sáng trên mặt đường (vùng sáng chỉ ở theme tối).
- **Độ glow**: quầng sáng quanh thứ đang sáng (chỉ ở theme tối); 0% là không glow.

### 3. Tab Đồ họa

Chọn một mức (Thấp → Rất cao) hoặc chỉnh từng tùy chọn:
- **Chi tiết nhà**: L0 chỉ khối · L1 có cửa sổ · L2 nhà đủ hình (tầng trệt, mái hiên, biển, ban công, mái) · L3 mọi chi tiết nhỏ (chậu cây, cục nóng, bồn nước, ăng-ten…).
- **Tự giảm chi tiết khi thu nhỏ**: thu nhỏ đến mức chi tiết không còn nhìn ra thì tự vẽ ít đi (dòng trạng thái hiện mức đang vẽ, ví dụ "chi tiết L2"); nét viền nhạt dần, xe ở xa bỏ nét rồi bỏ viền, xe máy ẩn khi rất xa, cây thành dạng đơn giản, nên ở xa không thành vệt đen. Phóng to lại là chi tiết hiện dần.
- **Mật độ xe** (0–100%, mặc định 30%): xe chạy trên các phố trong khoảng 600 m quanh chỗ đang xem, rẽ ở các ngã tư, đi tới đâu có xe tới đó. **Cột và dây điện**, **Cây** (không / đơn giản / đầy đủ).
- **Tầm nhìn xa**: chỉ vẽ nhà, đồ phố và xe trong bán kính đã chọn quanh tâm nhìn (đường vẫn vẽ hết).
- **Tự hạ mức khi chậm**: nếu máy chạy dưới 28 fps suốt 3 giây thì tự xuống một mức và báo trong bảng.
- Cửa sổ, nét viền khối, nét cạnh, nét chi tiết (viền cửa), glow, khử răng cưa, độ phân giải. Đổi **khử răng cưa** thì khung cảnh được dựng lại (chớp một chút): trình duyệt chỉ cho chọn khử răng cưa lúc tạo vùng vẽ.

Máy yếu thì chọn **Thấp**. Lựa chọn được nhớ trên máy. Dòng dưới cùng của bảng cho biết số tam giác, cửa và nét đang vẽ; dòng trạng thái ở chân trang có fps.

## Dữ liệu

Bản đồ (đường, mặt bằng nhà, cầu, vườn) lấy từ OpenStreetMap, © OpenStreetMap contributors. Số tầng của phần lớn nhà là **đoán theo luật** vì OSM không có; muốn sửa nhà nào thì xem [osm-import](../architecture/osm-import.md) §6 và sửa trong `packages/osm-import/src/area-nga-tu-thai-ha.ts`.

## Lái xe (chế độ POV)

- **W / ↑**: ga · **S / ↓**: phanh, giữ khi đã dừng thì lùi · **A D / ← →**: lái · **Space**: phanh tay (rẽ gắt hơn) · **V**: đổi góc camera gần / cao · **C**: nhìn thẳng lại · kéo chuột: nhìn quanh.
- Xe đi tối đa khoảng 70 km/h, rẽ gọn ở tốc độ thấp. Chạm lề thì xe trượt dọc lề. Xe không tự bẻ lái.

## Giao diện (ADR-063)

- **Thanh trên**: *Khu vực* (bay tới một nơi), *Công trình* (danh sách để mở mô hình 3D hoặc xem trên bản đồ), *Trải nghiệm* (lái tàu, ngồi tàu, lái xe), Ngày/Đêm, *Tùy chỉnh* (màu bản đồ, nhìn xuyên, ngôn ngữ, đèn, đồ họa).
- **Bấm vào một tòa nhà** để mở thẻ thông tin; nút **Mô hình 3D** mở riêng tòa đó trên đế. Trong mô hình có **Về bản đồ** và **Xem vị trí trên bản đồ**.
- **Vào chế độ lái**: chọn trong *Trải nghiệm*, hoặc **kéo** biểu tượng người ở góc phải dưới thả vào một con phố hay đường ray Metro. Chạm vào biểu tượng chỉ hiện hướng dẫn. Thoát bằng nút **Thoát** hoặc Esc.
- **Trên điện thoại**: menu và thẻ thông tin mở từ dưới lên; chạm vùng tối phía trên hoặc nút ✕ để đóng.
- Phím tắt: `G` tùy chỉnh · `P` menu trải nghiệm · `Esc` đóng menu / thẻ / thoát chế độ lái.
