# Thuật ngữ

| Tiếng Việt | Trong code | Giải thích |
|---|---|---|
| Nhà ống | `tube` (tên preset) | Nhà mặt tiền hẹp (3–5 m), sâu, nhiều tầng — kiểu nhà phổ biến nhất phố Hà Nội |
| Nhà cấp 4 | `cap4` (tên preset) | Nhà một tầng, thường mái ngói hoặc mái tôn |
| Cửa xếp | `ground: 'fold'` | Cửa sắt kéo ngang gập lại |
| Cửa cuốn | `ground: 'roll'` | Cửa kéo lên cuộn vào hộp phía trên |
| Mái hiên bạt | `awning: 'fabric'` | Tấm bạt che trước cửa hàng |
| Chuồng cọp | `balcony: 'cage'` | Lồng sắt cơi nới ra ngoài ban công/cửa sổ |
| Lan can | `balcony: 'rail' \| 'solid'` | Rào ban công (song sắt / xây đặc) |
| Đua ra | `overhang` | Tầng 2 trở lên nhô ra phía vỉa hè |
| Tầng lùi | `setbackTop` | Tầng trên cùng lùi vào so với mặt tiền |
| Biển hộp đèn | `signs: [{ type: 'facade' }]` | Biển ngang trên cửa, sáng về đêm |
| Biển dọc / biển tròn chìa ra | `'projecting-vertical'` / `'projecting-round'` | Biển gắn vuông góc mặt tiền, chìa ra phố |
| Biển đứng chữ A | `'standee'` | Biển đặt trên vỉa hè trước quán |
| Cột xoắn tiệm cắt tóc | `'barber-pole'` | Ống sọc xoắn xoay trước tiệm cắt tóc |
| Biển quảng cáo lớn | `'billboard'` | Biển trên cao (tường hồi, mái), có đèn chiếu |
| Tờ quảng cáo dán (A5) | `stickers` | Giấy dán ở tầm tầng 1, cột điện (khoan cắt bê tông…) |
| Tum (tum thang) | `stairHut` | Khối nhỏ trên sân thượng che cầu thang lên mái |
| Tường chắn mái | `parapet` | Tường thấp quanh mép mái bằng |
| Mái tôn 1 dốc / 2 dốc | `roof: 'metal1' \| 'metal2'` | |
| Mái ngói | `roof: 'tile'` | |
| Bồn nước inox nằm / đứng | `'tank-h'` / `'tank-v'` | |
| Máy nước nóng NLMT | `'solar'` | Năng lượng mặt trời: dàn ống nghiêng + bồn |
| Cục nóng điều hòa | `'ac'` | Dàn nóng máy lạnh |
| Tường hồi | `side wall` (`back.ts`) | Tường bên của nhà, lộ ra khi cạnh nhà thấp hơn |
| Mặt tiền | `facade` | Mặt nhà quay ra phố |
| Vỉa hè / bó vỉa | `sidewalk` / `curb` | |
| Cột điện / dây điện | `pole` / `wires` | |
| Vườn hoa | `garden` | Công viên nhỏ ở góc ngã tư |
| Cắt lớp | `cutaway` | Chế độ hạ dãy nhà gần người xem xuống tầng 1 |
| Thứ tự vẽ | `depth sort` / painter's order | Vẽ xa trước, gần sau, vì kernel không có z-buffer |
| Kernel | `K` | Bộ hàm chiếu isometric của iso-glow (`P`, `D`, `FRONT`, `SIDE`, `TOP`, `box`…) |
| Spec nhà | `HouseSpec` | Object dữ liệu mô tả một căn nhà ([house-spec](../architecture/house-spec.md)) |
| Preset | `PRESETS[id]` | Bộ tham số đặt tên, dùng lại |
| Seed | `seed` | Số khởi tạo random — cùng seed thì cùng kết quả |
| Lived-in | biến thể `off/dim/hi` | Cửa sổ sáng không đều cho giống có người ở |
