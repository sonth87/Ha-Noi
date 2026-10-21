# Thuật ngữ

Chuyển từ app SVG cũ (ADR-032); thêm thuật ngữ của mô hình thành phố và dữ liệu OSM ở cuối. Thuật ngữ chỉ có ở app cũ được đánh dấu *(app cũ)*.

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
| Phòng tum, khoảng lùi | `topRoom`, `topSetback` | Phòng trên mái bằng, lùi vào so với mặt tiền |
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
| Mái tôn che sân thượng / chống nóng | `roofShelter: 'terrace' \| 'full'` | Tấm tôn trên khung cột mảnh trên mái bằng nhà ống: che sân thượng trước tum, hoặc che cả mái |
| Bồn nước inox nằm / đứng | `'tank-h'` / `'tank-v'` | |
| Máy nước nóng NLMT | `'solar'` | Năng lượng mặt trời: dàn ống nghiêng + bồn |
| Cục nóng điều hòa | `'ac'` | Dàn nóng máy lạnh |
| Nửa hầm / tầng hầm để xe | `basement` | Tầng 1 nâng cao, dưới là ga-ra; lên bằng bậc tam cấp |
| Gian (khoang mặt tiền) | bay | Nhà rộng chia mặt tiền thành các gian ~4 m |
| Tầm với ra vỉa hè | `REACH` | Đồ của nhà nhô ra vỉa hè tối đa 1.9 m |
| Ô văng | `canopy: 'concrete'` | Tấm bê tông mỏng che trên cửa sổ |
| Cửa sắt hoa | `ground: 'iron'` | Cửa sắt nhiều cánh có hoa văn |
| Lan can xây | `balcony: 'solid'` | Lan can ban công xây đặc |
| Cửa vòm / cửa Pháp | `window: 'arch'` / `'french'` | Cửa đầu tròn / cửa kính cao có cánh chớp |
| Mái ngói / tôn 1 dốc | `roof: 'tile'` / `'metal1'` | |
| Tum thang | `stairHut` | Khối nhỏ trên mái che cầu thang (khác phòng tum) |
| Cột cờ | `roofItems: 'flag'` | |
| Quảng cáo sơn tường | `sideAd` | Chữ sơn trên tường hồi |
| Cây trước nhà | `trees`, `treeSize` | Cây ở mép vỉa hè trước mỗi nhà: trái / phải / hai bên, nhỏ / vừa / to |
| Ban công ngắn | `balconyWidth: 'short'` | Ban công chỉ rộng hơn ô cửa một chút |
| Loại cây chậu | `plantKind` | Bụi lá, kim tiền, trúc, cau cảnh, hoa giấy, bụi hoa |
| Tường hồi | `side wall` | Tường bên của nhà, lộ ra khi cạnh nhà thấp hơn |
| Mặt tiền | `facade` | Mặt nhà quay ra phố |
| Vỉa hè / bó vỉa | `sidewalk` / `curb` | |
| Cột điện / dây điện | `pole` / `wires` | |
| Vườn hoa | `garden` | Công viên nhỏ ở góc ngã tư |
| Cắt lớp | `cutaway` | *(app cũ)* Chế độ hạ dãy nhà gần người xem xuống tầng 1 |
| Thứ tự vẽ | `depth sort` / painter's order | *(app cũ)* Vẽ xa trước, gần sau, vì kernel SVG không có z-buffer |
| Kernel | `K` | *(app cũ)* Bộ hàm chiếu isometric của iso-glow (`P`, `D`, `FRONT`, `SIDE`, `TOP`, `box`…) |
| Spec nhà | `HouseSpec` | Object dữ liệu mô tả một căn nhà ([house-spec](../architecture/house-spec.md)) |
| Preset | `PRESETS[id]` | Bộ tham số đặt tên, dùng lại |
| Seed | `seed` | Số khởi tạo random — cùng seed thì cùng kết quả |
| Lived-in | biến thể `off/dim/hi` | Cửa sổ sáng không đều cho giống có người ở |
| Mô hình thành phố | `City` | Mọi thứ bộ vẽ cần để vẽ một khu ([city-model](../architecture/city-model.md)) |
| Đoạn đường | `Street` | Một đường (hoặc một đoạn đường bị cắt ở biên khu): đường tim, bề rộng, làn, vỉa hè, cao độ |
| Đường tim | `path` | Đường chạy giữa lòng đường |
| Lòng đường | carriageway, `width` | Phần xe chạy, không gồm vỉa hè |
| Đường đôi | divided road | Hai chiều xe tách bằng dải phân cách; OSM vẽ thành hai đường một chiều |
| Nhánh rẽ | `link` | Đường nối giữa hai đường chính |
| Ngõ, ngách, hẻm | `alley` | Đường nhỏ rẽ từ phố vào khu dân cư |
| Cầu vượt | bridge, `layer`, `profile` | Đường trên cao; `profile` là cao độ dọc đường tim |
| Nút giao | `Junction` | Nơi từ 3 nhánh đường xe chạy gặp nhau |
| Tòa nhà / phần nhà | `Building` / `BuildingPart` | Một tòa; các khối của nó, mỗi khối có số tầng và chiều cao tầng riêng |
| Mặt bằng | footprint | Hình tòa nhà nhìn từ trên xuống |
| Cạnh mặt tiền | `front` | Cạnh mặt bằng quay ra phố |
| Nhà sinh | `house` (`houseFor`) | Nhà do generator dựng trên mặt bằng thật |
| Mô hình dựng tay | `model` | Công trình đặc biệt có chi tiết riêng (Việt Tower, Novotel…) |
| Vùng | `Area` | Vườn hoa, cỏ, mặt nước, sân thể thao, đảo giao thông, mặt bằng cầu |
| Sửa tay | override | Chỉnh dữ liệu theo id nguồn, không mất khi tải lại OSM |
| Nguồn | `source` | Id gốc của phần tử, ví dụ `osm:way/136257265` |
| Bản trích OSM | extract | File dữ liệu OSM thô của một khu (`osm-data`) |
| Khu | area | Một vùng bản đồ được nhập, có gốc toạ độ, góc xoay và biên riêng |
