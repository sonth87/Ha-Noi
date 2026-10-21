# Hướng dẫn dùng app 3D

Hướng dẫn app SVG cũ ở [apps/svg/docs/user/guide.md](../../apps/svg/docs/user/guide.md).

## Chạy

```bash
pnpm install
pnpm dev:3d        # http://localhost:5190
```

## Điều khiển

| Phím / chuột | Việc |
|---|---|
| `V` | Đổi **2D** (isometric, 4 góc cố định như app cũ) ↔ **3D** (xoay tự do) |
| `Q` / `E` | Xoay 90° sang trái / phải |
| Kéo chuột | 2D: dời khung · 3D: xoay |
| Chuột phải kéo | Dời khung (3D) |
| Cuộn | Phóng to / thu nhỏ |
| Click một tòa | Bật / tắt đèn **tầng** được click |
| `Space` | Bật hết / tắt hết |
| `N` | Ngày / đêm (đêm: khoảng 7/10 số tầng sáng dần lên, đèn báo trên ăng-ten Việt Tower nhấp nháy) |
| `T` | Theme tối / sáng |
| `G` | Mở / đóng bảng **Chất lượng** |

## Bảng chất lượng

Chọn một mức (Thấp → Rất cao) hoặc bật/tắt từng tùy chọn: cửa sổ, nét viền khối, nét cạnh, nét chi tiết (viền cửa), glow, khử răng cưa, độ phân giải. Máy yếu thì chọn **Thấp**. Lựa chọn được nhớ trên máy. Dòng dưới cùng của bảng cho biết số tam giác, cửa và nét đang vẽ; dòng trạng thái ở chân trang có fps.

## Dữ liệu

Bản đồ (đường, mặt bằng nhà, cầu, vườn) lấy từ OpenStreetMap, © OpenStreetMap contributors. Số tầng của phần lớn nhà là **đoán theo luật** vì OSM không có; muốn sửa nhà nào thì xem [osm-import](../architecture/osm-import.md) §6 và sửa trong `packages/osm-import/src/area-nga-tu-thai-ha.ts`.
