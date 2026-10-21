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
| `H`, nút **Ngã tư** | Về ngã tư; nút **Ga Thái Hà**: bay tới ga |
| `V` | Đổi **2D** (isometric, 4 góc cố định như app cũ) ↔ **3D** (xoay tự do) |
| `Q` / `E` | Xoay 90° sang trái / phải |
| Click một tòa | Bật / tắt đèn **tầng** được click |
| `Space` | Bật hết / tắt hết |
| `N` | Ngày / đêm |
| `T` | Theme tối / sáng |
| `G` | Mở / đóng bảng **Đèn · chất lượng** |

Trên màn hình cảm ứng: một ngón để di chuyển, hai ngón để phóng to và xoay.

## Khu phố

Khu gồm ngã tư và **cả phố Thái Hà** tới cuối phố. Ở đoạn Thái Hà – Yên Lãng có **tuyến metro 2A trên cao** và **ga Thái Hà**: tàu 4 toa chạy hai chiều, dừng ở ga khoảng 25 giây (cửa toa và mép sân ga sáng lên), đoàn sau cách khoảng 70 giây. Nút **Ga Thái Hà** bay thẳng tới ga. Vườn hoa có đèn vườn (theo cài đặt Đèn đường).

Xe chạy theo đèn tín hiệu ở các nút có đèn: chân trang hiện màu đèn và số giây còn lại của Tây Sơn và Thái Hà. Ô tô lên cầu vượt, xe máy chạy hai mép làn.

## Bảng Đèn

Nút **Đèn · chất lượng** (phím `G`) mở bảng bên phải. Mục **Đèn**:
- **Đèn nhà**: *Tự động* (tối mới bật), *Bật* (sáng cả ban ngày), *Tắt*. **Cửa sáng** 0–100%: tỉ lệ cửa sổ có đèn, rải đều trên mọi tòa (tòa nào cũng lốm đốm); kéo lên thì thêm cửa, kéo xuống thì bớt; 100% là tất cả. Cửa sáng không đều: có cửa rất sáng, cửa mờ. Click một tầng để bật cả tầng đó.
- **Đèn xe**: *Tự động* (tối mới bật), *Bật*, *Tắt*: đèn pha, đèn hậu, hộp đèn taxi và vệt đèn pha trên đường.
- **Đèn đường**: *Tự động* (tối mới bật, mặc định), *Bật*, *Tắt*: bóng đèn và vùng sáng trên mặt đường (vùng sáng chỉ ở theme tối).
- **Độ glow**: quầng sáng quanh thứ đang sáng (chỉ ở theme tối); 0% là không glow.

## Bảng chất lượng

Chọn một mức (Thấp → Rất cao) hoặc chỉnh từng tùy chọn:
- **Chi tiết nhà**: L0 chỉ khối · L1 có cửa sổ · L2 nhà đủ hình (tầng trệt, mái hiên, biển, ban công, mái) · L3 mọi chi tiết nhỏ (chậu cây, cục nóng, bồn nước, ăng-ten…).
- **Tự giảm khi thu nhỏ**: thu nhỏ đến mức chi tiết không còn nhìn ra thì tự vẽ ít đi (dòng trạng thái hiện mức đang vẽ, ví dụ "chi tiết L2"). Phóng to lại là chi tiết hiện dần, mỗi lúc một ô.
- **Mật độ xe** (0–100%), **Cột và dây điện**, **Cây** (không / đơn giản / đầy đủ).
- **Tầm nhìn xa**: chỉ vẽ nhà, đồ phố và xe trong bán kính đã chọn quanh tâm nhìn (đường vẫn vẽ hết).
- **Tự hạ mức khi chậm**: nếu máy chạy dưới 28 fps suốt 3 giây thì tự xuống một mức và báo trong bảng.
- Cửa sổ, nét viền khối, nét cạnh, nét chi tiết (viền cửa), glow, khử răng cưa, độ phân giải.

Máy yếu thì chọn **Thấp**. Lựa chọn được nhớ trên máy. Dòng dưới cùng của bảng cho biết số tam giác, cửa và nét đang vẽ; dòng trạng thái ở chân trang có fps.

## Dữ liệu

Bản đồ (đường, mặt bằng nhà, cầu, vườn) lấy từ OpenStreetMap, © OpenStreetMap contributors. Số tầng của phần lớn nhà là **đoán theo luật** vì OSM không có; muốn sửa nhà nào thì xem [osm-import](../architecture/osm-import.md) §6 và sửa trong `packages/osm-import/src/area-nga-tu-thai-ha.ts`.
