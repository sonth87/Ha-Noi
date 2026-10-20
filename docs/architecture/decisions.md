# Nhật ký quyết định

Mỗi quyết định ghi: **bối cảnh → quyết định → lý do → hệ quả**. Trạng thái: *Đã chốt*, *Mặc định (có thể đổi)*, *Thay thế bởi ADR-xxx*. Không xóa quyết định cũ; nếu đổi thì thêm ADR mới và đánh dấu cái cũ.

---

### ADR-001 · Renderer SVG 2D (kernel iso-glow `cities`)
- **Trạng thái**: Đã chốt (2026-10-20)
- **Bối cảnh**: Có hai lựa chọn: SVG 2D (như `cities/`) hoặc three.js (chế độ 3D của skill). Ban đầu nghiêng về 3D vì cần góc phố thật và footprint méo. Sau đó phạm vi đổi: bản đồ thật để sau, MVP chấp nhận phố thẳng và nhà tương đối.
- **Quyết định**: Dùng SVG 2D.
- **Lý do**: đúng chất `cities`; chi tiết mặt tiền (cửa xếp, chuồng cọp, biển) vẽ gọn trên mặt phẳng; phố thẳng thì thứ tự vẽ quản lý được.
- **Hệ quả**: Phải tự lo thứ tự vẽ (ADR-007) và mặt khuất (ADR-004). Nếu sau này cần bản đồ thật với góc xiên + hàng trăm căn, có thể phải làm bản 3D; dữ liệu giữ nguyên (ADR-002).

### ADR-002 · Tách dữ liệu khỏi renderer
- **Trạng thái**: Đã chốt
- **Quyết định**: Nhà là *spec* dữ liệu thuần; renderer đọc spec và sinh SVG.
- **Lý do**: thêm kiểu nhà bằng dữ liệu; test được; giữ đường lùi sang 3D.
- **Hệ quả**: Cần `resolveSpec()` và luật hợp lệ; renderer không được chứa "số ma thuật" riêng cho từng preset.

### ADR-003 · Đơn vị 1 m = 10
- **Trạng thái**: Mặc định (có thể đổi)
- **Lý do**: số tròn, dễ đọc, khớp tỉ lệ các figure `cities` hiện có (tầng ~26–33 đơn vị).
- **Hệ quả**: Đổi sau chỉ cần sửa `M` trong `core/units.ts` nếu mọi kích thước đều dùng hằng số ở đó.

### ADR-004 · Xử lý mặt khuất bằng xoay góc nhìn + cutaway
- **Trạng thái**: Mặc định (có thể đổi) — làm cả hai
- **Bối cảnh**: Isometric chỉ thấy mặt +x, +y. Dãy nhà phía gần người xem chỉ lộ lưng và che mặt đường.
- **Quyết định**: (1) Xoay 4 hướng `Q`/`E`, dựng lại SVG từ dữ liệu; (2) cutaway `X` hạ dãy gần xuống tầng 1.
- **Lý do**: Xoay cho phép xem mọi mặt tiền; cutaway cho cái nhìn tổng thể ngay mà không phải xoay.
- **Hệ quả**: `facing` là trường bắt buộc; mọi bộ phận nhô ra tính trong hệ cục bộ của nhà; cần bản vẽ mặt lưng.

### ADR-005 · Một file HTML, build bằng Python
- **Trạng thái**: ~~Đã chốt~~ → **Thay thế bởi ADR-011** (2026-10-20)
- **Lý do (lúc đó)**: Template iso-glow là một file tự chứa; chạy từ `file://`; không cần npm.
- **Hệ quả (lúc đó)**: Mã nguồn chia nhiều file trong `src/`, `build.py` nối theo thứ tự cố định. Không dùng ES module.

### ADR-006 · Namespace toàn cục `MC` + test bằng `node:vm`
- **Trạng thái**: ~~Đã chốt~~ → **Thay thế bởi ADR-011, ADR-014** (2026-10-20)
- **Lý do (lúc đó)**: Khớp ADR-005 (script thường); test chạy được bằng Node trơn, không package.

### ADR-007 · Thứ tự vẽ bằng sắp xếp topo trên hộp bao
- **Trạng thái**: Đã chốt
- **Lý do**: Sắp theo `x+y` đơn giản bị sai khi khối khác kích thước, nhà nhô ra, nhà L. Sắp topo theo luật "nằm hẳn phía sau trên một trục" là đúng với hộp không giao nhau.
- **Hệ quả**: O(n²); chấp nhận ở quy mô ~1000 item, có phương án chia lưới nếu chậm.

### ADR-008 · Landmark nhận diện bằng hình khối, không logo
- **Trạng thái**: Đã chốt (theo yêu cầu người dùng)
- **Quyết định**: Tòa Thái Bình, Novotel vẽ đúng tỉ lệ và hình khối đặc trưng; biển đỉnh là khối sáng trơn; không chữ thương hiệu.
- **Lý do**: Ưu tiên ý tưởng cốt lõi và thành phần cốt lõi; skill iso-glow cũng không vẽ logo thật.

### ADR-009 · Tên trong code bằng tiếng Anh, tài liệu bằng tiếng Việt
- **Trạng thái**: Đã chốt
- **Lý do**: Code nhất quán, không dấu; tài liệu dễ đọc cho người làm. Bảng tra trong [glossary](../product/glossary.md).

### ADR-010 · Palette `city`
- **Trạng thái**: Mặc định (có thể đổi)
- **Lý do**: Có sẵn Sodium (đèn đường), Tungsten, Neon… hợp cảnh phố đêm.

### ADR-011 · Vite + TypeScript + React, pnpm
- **Trạng thái**: Đã chốt (2026-10-20, theo lựa chọn của người dùng). Thay thế ADR-005, ADR-006.
- **Bối cảnh**: Đã cân nhắc giữa JS thuần một file, Next.js, React, và Vite + TS không framework. Next.js bị loại vì dự án không cần render phía server, backend hay SEO.
- **Quyết định**: Vite (dev server, build), TypeScript strict, React cho vỏ ứng dụng. Dùng pnpm vì người dùng đang dùng pnpm ở các project khác.
- **Lý do**: Kiểu dữ liệu chặt cho `HouseSpec` và preset; hot reload khi chỉnh nhà; React hợp với phần giao diện sẽ lớn dần (catalog, bảng chỉnh tham số, nhiều cảnh); dễ deploy thành site tĩnh.
- **Hệ quả**:
  - Không còn chạy thẳng từ `file://` bằng bản build mặc định. Muốn gửi một file thì dùng `pnpm build:single` (vite-plugin-singlefile).
  - Phải port nền tảng iso-glow sang TS/React (ADR-012).
  - React không được quản lý từng phần tử SVG của cảnh (ADR-013).
  - Version lúc scaffold (2026-10-20): **Vite 8.3.4**, **React 19.3.1**, **TypeScript 6.0.3**, **Vitest 5.0.5**, **ESLint 10.13** + typescript-eslint 8.72, `@vitejs/plugin-react` 6.1.2. Node 20.19.1, pnpm 10.21.
  - TypeScript bị ghim ở nhánh **6.0** (`~6.0`): bản 7.0 (viết lại bằng Go) chưa được typescript-eslint hỗ trợ (yêu cầu `< 6.1`). Nâng lên khi typescript-eslint hỗ trợ.
  - Font **DM Mono** đóng gói qua `@fontsource/dm-mono` thay vì tải từ Google Fonts như template gốc, để không phụ thuộc mạng lúc chạy (NFR-01).

### ADR-012 · Port nền tảng iso-glow sang TypeScript, không nhúng template
- **Trạng thái**: Đã chốt
- **Bối cảnh**: Template `gallery.html` của skill là trang JS thuần có vòng đời figure riêng (`FIGS.push`, sidebar, picker). Nhúng nguyên trang đó vào React sẽ tạo ra hai hệ thống giao diện chồng nhau.
- **Quyết định**: Port **phần nền** sang `src/iso/`: kernel (`P`, `D`, `plane`, `TOP/FRONT/SIDE`, `box`, `boxc`, `rect`, `path`, `slits`), `frame()`, token màu dark/light, CSS glow kit, filter `#glow/#soft/#bloom`, palette `city`/`ember`, logic theme. Vỏ ứng dụng (sidebar, picker, readout) viết lại bằng React. Không port `FIGS.push` hay vòng đời figure.
- **Lý do**: Giữ nguyên thẩm mỹ và hình học; chỉ một hệ thống UI.
- **Hệ quả**: Phải đọc các phần cần port trong `gallery.html` (một lần, ở P0). Giữ ghi công MIT (iso-figure của Tolga Cohce, iso-glow) trong `src/iso/LICENSE` và footer "Made with ISO-GLOW". Có snapshot test cho kernel để bảo đảm port khớp bản gốc.

### ADR-013 · React lo vỏ, Controller lo cảnh SVG
- **Trạng thái**: Đã chốt
- **Bối cảnh**: Một cảnh có vài nghìn phần tử SVG, xe chạy theo từng frame, bật đèn hàng loạt. Nếu React quản lý từng phần tử thì mỗi lần thay đổi phải đối chiếu lại cả cây, chậm và khó đạt 50 fps.
- **Quyết định**: `render/` sinh **chuỗi SVG** và gán qua `innerHTML`. Mỗi cảnh có một **SceneController** (TS thuần) giữ state mô phỏng, thao tác DOM trực tiếp (class, transform) và chạy vòng rAF. React chỉ đọc snapshot qua `useSyncExternalStore` để vẽ readout và panel.
- **Lý do**: Hiệu năng; renderer test được bằng chuỗi; giữ đúng mô hình đã chứng minh hiệu quả của iso-glow.
- **Hệ quả**: Trạng thái đèn phải áp lại sau mỗi lần dựng lại SVG (controller lo). Chuỗi SVG chỉ được chứa nội dung sinh từ dữ liệu của dự án, và chữ (như `signText`) phải được escape.

### ADR-014 · Kiểm thử bằng Vitest, test đặt cạnh mã
- **Trạng thái**: Đã chốt. Thay thế phần test của ADR-006.
- **Quyết định**: Vitest cho unit test (`core/`) và snapshot test (`render/`). File `*.test.ts` đặt cạnh file nguồn. Chưa cần test component React ở MVP.
- **Lý do**: Đi kèm Vite, cấu hình gần như bằng không, hỗ trợ TS sẵn.

### ADR-015 · Luật phụ thuộc giữa các tầng, cưỡng chế bằng ESLint
- **Trạng thái**: Đã chốt
- **Quyết định**: `core/` không import gì ngoài chính nó; `render/` chỉ import `core/` và `iso/kernel`; chỉ `scenes/`, `ui/`, `hooks/`, `iso/*.tsx` được dùng React. Cưỡng chế bằng `no-restricted-imports` theo thư mục.
- **Lý do**: Giữ dữ liệu và hình học độc lập framework, giữ đường lùi sang renderer khác (ADR-002).

### ADR-016 · Vẽ tay một "nhà mẫu" trước khi viết generator
- **Trạng thái**: Đã chốt (2026-10-20, người dùng đồng ý)
- **Bối cảnh**: Khi duyệt P0, người dùng nhận xét căn nhà Hello "vuông vức kiểu tòa nhà, không phải nhà nhỏ". Nhà phố Hà Nội có chất nhờ tỷ lệ hẹp và sâu, mặt tiền mỗi tầng một kiểu, tường hồi trơn, và rất nhiều chi tiết lộn xộn (ban công, chuồng cọp, mái hiên, bồn nước, cục nóng, dây điện).
- **Quyết định**: Chia P1 thành P1a (vẽ tay một căn nhà mẫu giữa 2 hàng xóm, người dùng duyệt ngoại hình) và P1b (bóc các bộ phận của nhà mẫu thành `render/parts/*` có tham số, rồi mới làm generator và catalog).
- **Lý do**: Làm generator trước dễ ra nhiều kiểu nhà cùng sai chất. Chốt ngoại hình trên một căn rồi mới nhân lên thì rẻ hơn.
- **Hệ quả**: `render/reference-house.ts` viết mỗi bộ phận thành một hàm để bóc ra dễ. Thứ tự vẽ tạm thời đặt tay (depthSort đến ở P1b). File này giữ lại làm hình tham chiếu sau khi có generator.

### ADR-017 · Font Be Vietnam Pro cho chữ trên biển hiệu
- **Trạng thái**: Đã chốt (2026-10-20, người dùng đồng ý). Đóng câu hỏi Q5.
- **Bối cảnh**: DM Mono (font giao diện của iso-glow) không có bộ ký tự tiếng Việt đầy đủ; các chữ như Ở, Ả, Ắ, Ể hiện bằng font dự phòng, nên biển hiệu phải né dấu.
- **Quyết định**: Giữ DM Mono cho giao diện và nhãn kỹ thuật. Thêm `@fontsource/be-vietnam-pro` (weight 700) chỉ cho chữ trên biển (`.sign-text`, `.bb-text`, biến CSS `--sign-font`).
- **Lý do**: Có đủ tiếng Việt; là font sans đậm, gần với chữ biển hiệu thật; đóng gói sẵn nên không cần mạng lúc chạy (NFR-01).
- **Hệ quả**: Thêm khoảng vài chục KB font (chỉ tải weight 700). Chữ biển giờ viết được đầy đủ tiếng Việt (CẮT TÓC, IN ẤN, CHO THUÊ BIỂN…).

### ADR-018 · Hệ tọa độ cục bộ cho mỗi căn nhà
- **Trạng thái**: Đã chốt (2026-10-20)
- **Bối cảnh**: Mỗi căn có thể quay mặt tiền về 4 hướng, và góc nhìn xoay được. Nếu vẽ trực tiếp theo trục x/y thì mỗi bộ phận phải viết 4 lần.
- **Quyết định**: Mọi bộ phận vẽ trong hệ cục bộ của căn nhà: `a` dọc mặt tiền (trái → phải nhìn từ phố), `b` từ tường sau ra phố, `z` lên. `core/view.ts → localFrame` ánh xạ sang thế giới cho từng hướng; `render/local.ts → LocalDraw` chỉ trả về mặt đứng khi nó là một trong hai mặt nhìn thấy (+x hoặc +y), với trục u luôn chạy trái → phải nhìn từ ngoài vào.
- **Lý do**: Viết một lần, đúng cho mọi hướng; xoay góc nhìn chỉ là đổi `x, y, facing`. Có test xác nhận "xoay thế giới = tính lại căn nhà" cho mọi hướng × mọi góc.
- **Hệ quả**: Mặt sau có cửa sổ nhỏ cùng id tầng, nên tầng nào cũng bật đèn được dù mặt tiền đang khuất. Mỗi bộ phận là một item có hộp bao riêng; **bất biến**: các item của cùng một căn không được lồng vào nhau (test với 300 nhà ngẫu nhiên × 4 hướng).

### ADR-019 · Catalog xếp một hàng như dãy phố
- **Trạng thái**: Đã chốt (2026-10-20). Thay lưới 3 × 2 trong roadmap.
- **Lý do**: Ở lưới 2 hàng, nhà hàng trước (cao tới 20 m) che mặt tiền nhà hàng sau. Một hàng với mặt tiền thẳng một đường thì không căn nào che căn nào, và trông giống một dãy phố thật.
- **Hệ quả**: Khi lên 12 preset (P2), hàng dài gấp đôi; nếu quá rộng thì chia 2 hàng cách xa nhau hoặc phân trang.

### ADR-020 · Dãy phố: tường hồi cố định theo dữ liệu, khung phố xoay chung, xe theo làn
- **Trạng thái**: Đã chốt (2026-10-20, P3)
- **Bối cảnh**: Ở Catalog, cục nóng treo và biển lớn gắn vào tường hồi đang nhìn thấy (đổi theo góc xoay). Trên phố nhà sát nhau, cách đó làm chúng đâm sang nhà bên ở góc xoay khác.
- **Quyết định**:
  1. `sideEnd` + `sideClear` trong spec: bố cục phố chọn tường hồi có nhà bên thấp hơn và độ cao bắt đầu lộ ra (`peakZ` của nhà bên, tính cả phòng tum, vật trên mái, mái tôn). Bộ phận treo tường chỉ đặt trên `sideClear`.
  2. Đồ phố (nền, đường, vỉa hè, cột, đèn, cây, dây, làn xe) vẽ trong **khung phố** — cả con phố coi như một "căn nhà" giả, xoay bằng `rotateSpec` + `localFrame` như nhà (ADR-018).
  3. Xe máy gom theo **làn**: mỗi làn là một item (khối dọc cả phố, cao 1.7 m) nằm giữa hai vỉa hè, nên tự đứng sau dãy xa và trước dãy gần; controller trượt từng xe bằng `transform` theo thời gian, không cần sắp lại mỗi khung hình.
  4. Dây điện đi **phía trước** cột (phía lòng đường), đèn đường ở **trên** dây, vũng sáng của đèn vẽ trong lớp nền — để không item nào lồng nhau.
  5. Phóng to (con lăn), kéo (khi đã phóng), nhấp đúp để về khung gốc: chỉ đổi `viewBox`, không dựng lại SVG; mức phóng giữ nguyên khi xoay. Kéo không bị tính là click.
  6. Cảnh phố mở ra ở chế độ **cutaway bật** (dãy gần chỉ còn tầng 1), vì nếu không dãy gần che hết lòng phố.
- **Hệ quả**: Test: 3 bố cục × 4 góc × bật/tắt cutaway không có item lồng nhau, không cảnh báo thứ tự vẽ, dựng lại < 300 ms (NFR-04). Ở Catalog, cục nóng/biển lớn giờ cũng cố định bên `+a` (ẩn khi bên đó khuất).

### ADR-021 · Xưởng nhà, nhà rộng có nửa hầm, tầm với ra vỉa hè
- **Trạng thái**: Đã chốt (2026-10-21, theo yêu cầu người dùng)
- **Quyết định**:
  1. **Xưởng nhà** (`scenes/workshop/`): một căn trên một lô, bảng điều khiển React bên phải chỉnh mọi trường của spec. Bảng đọc snapshot của controller (`input`, `spec` đã gộp, `issues`) và ghi qua `patch()` / `patchFloor()` / `setPreset()` / `random()`; hiển thị giá trị đã gộp, mọi thay đổi là một ghi đè. Chép JSON để thêm preset. Cảnh khai báo bảng qua `SceneDef.Panel`. Đây là FR-31 (vốn ở P2) làm sớm.
  2. **Nửa hầm** (`basement`): tầng 1 nâng lên đúng chiều cao hầm. Renderer coi như tầng 1 cao hơn (`groundH + basement`) để mọi bộ phận đo từ đỉnh tầng 1 tự đúng; riêng mặt tiền tầng 1 vẽ thêm dải ga-ra phía dưới, và có item bậc tam cấp. `topZ` / `peakZ` cộng cả hầm.
  3. **Nhà rộng**: `randomHouse` cho 12% nhà rộng 8–12 m (60% trong đó có nửa hầm); mặt tiền tầng trên chia gian ~4 m. Lô ở Catalog rộng theo nhà (`lotWidth`).
  4. **Tầm với ra vỉa hè** `REACH = 1.9 m`: đồ của nhà không vượt quá, để không đụng cây, cột, dây (lỗi do test phát hiện khi nhà có hầm + chuồng cọp đẩy biển dọc ra xa).
  5. **Xe máy** vẽ dáng xe tay ga nhìn ngang (bánh xe, thân, yếm, yên, tay lái, người lái) thay cho 2 khối hộp.
- **Hệ quả**: Phố có ít căn hơn khi gặp nhà rộng (test chấp nhận 16–26 căn/dãy). Biển dọc của nhà mẫu ngắn lại 1.2 → 0.95 m.

---

## Câu hỏi mở

| # | Câu hỏi | Cần trước | Mặc định nếu chưa có trả lời |
|---|---|---|---|
| Q1 | Có ảnh nhà ống quanh khu làm mẫu preset không? | P2 | Dựng theo nhà phố Hà Nội phổ biến |
| Q2 | Ảnh tòa Thái Bình, Novotel, 2 vườn hoa (toàn cảnh + tầng trệt)? | P4 | Phác khối theo [components](components.md) mục C |
| Q3 | Mỗi landmark / vườn hoa ở góc nào? | P4 | Bố trí tạm: 2 tòa phía Tây Sơn bắc, 2 vườn phía nam (đổi được trong `layout.js`) |
| Q4 | Có muốn âm thanh không? | P5 | Không |
| ~~Q5~~ | ~~Font có tiếng Việt cho biển hiệu~~ → **Đã chốt: ADR-017** | — | — |

## Nhật ký đo đạc
*(Điền ở P3–P4: fps, thời gian dựng lại, kích thước file.)*

| Ngày | Figure | Số căn | fps | Dựng lại (ms) | Kích thước | Ghi chú |
|---|---|---|---|---|---|---|
| | | | | | | |
