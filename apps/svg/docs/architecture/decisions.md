# Nhật ký quyết định

> **Đóng băng từ 2026-10-21** (ADR-032 ở `docs/architecture/decisions.md` của repo, luật A14). Tài liệu này mô tả app SVG cũ đúng như lúc đóng băng; tài liệu hiện hành của repo ở `docs/` gốc.

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

### ADR-022 · Thêm lựa chọn; cắt khối dài theo nhà; bộ xếp chỗ trên mái
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "chưa có nhiều option")
- **Quyết định**:
  1. Thêm 14 lựa chọn: `wall`, `bays`, `goods`, `stairHut`, `sideAd`, `sideWindows`; theo tầng `canopy` (ô văng), `laundry`; giá trị mới cho `ground` (`iron`), `awning` (`metal`), `window` (`arch`, `french`, `glass`), `balcony` (`solid`), `roof` (`metal1`, `tile`), `roofItems` (`ac`, `flag`). Tất cả có trong Xưởng nhà và trong nhà ngẫu nhiên.
  2. **Khối dài gây vòng che khuất.** Test phát hiện vòng lặp thứ tự vẽ (A trước B trước … trước A) khi thêm đồ bày vỉa hè. Nguyên nhân: vỉa hè, dây điện và làn xe là khối dài 100 m, vừa đứng trước vừa đứng sau các thứ dọc phố. Cách chữa: vỉa hè cắt **đúng ranh giới từng căn / ngõ**; dây điện cắt **tại tâm từng cột** (mỗi khoảng có xung riêng); làn xe cắt đoạn 5 m, xe máy được chuyển sang nhóm của đoạn kế tiếp khi chạy qua.
  3. **Bộ xếp chỗ trên mái** (`roof-items.ts`): mỗi vật thử vị trí quen (giữ nguyên hình các preset cũ), rồi quét tìm chỗ trống; tính cả tum thang, chậu cây và khoảng dưới mái tôn.
  4. Một vòng che khuất thật (cột cờ – tường chắn – cột đỡ – mái tôn) không có thứ tự vẽ nào thỏa → luật: không cột cờ khi mái tôn che cả mái.
- **Hệ quả**: Test phố tăng lên 6 bố cục × 4 góc × bật/tắt cutaway; tất cả sạch. Snapshot các preset cũ không đổi.

### ADR-023 · Ô tô trên phố; làn 2.8 m chia 3 vệt
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "đường phố thêm ô tô")
- **Quyết định**: Mỗi làn rộng 2.8 m, 3 vệt: xe máy ở 2 mép, ô tô ở giữa. Mỗi đoạn làn (5 m) có 3 nhóm SVG theo vệt, xếp xa → gần theo góc nhìn, nên xe máy ở mép gần luôn vẽ đè lên ô tô và ở mép xa thì nằm sau; khi xe sang đoạn kế tiếp, controller gắn nó vào nhóm cùng vệt. Xe được vẽ sẵn ở vị trí xuất phát (khung hình tĩnh và khung đầu đã đúng chỗ).
- **Bài học**: nhóm xe từng dùng class `lane`, trùng class vạch kẻ đường có `stroke-dasharray`; thuộc tính này **kế thừa** xuống mọi nét con nên xe máy (và ô tô) bị vẽ nét đứt. Đổi thành `traffic-lane`. Phát hiện nhờ tự soát hình.
- **Hệ quả**: Cutaway cắt luôn cây vỉa hè của dãy gần (để nhìn thấy lòng phố).

### ADR-024 · Ngã tư = 2 phố thẳng cắt nhau, mỗi phố một khung; 4 lô góc riêng
- **Trạng thái**: Đã chốt (2026-10-21, ảnh người dùng gửi)
- **Bối cảnh**: P4 cần 4 nhánh phố, nút giao, 4 góc. Bản đồ thật (góc chéo, footprint) để P5.
- **Quyết định**: Hai "trục" (`core/crossroads.ts`): **X = Tây Sơn** (trục x, mặt cắt `TAY_SON` rộng 16 m, 4 làn + dải phân cách + cầu vượt), **Y = Thái Hà (bắc) – Chùa Bộc (nam)** (trục y, mặt cắt `STREET`). Mỗi trục là một `StreetLayout` bình thường trong khung riêng (X quay S, Y quay W), có `gap` ở chỗ trục kia cắt qua và `ranges` cho biết đoạn nào có nhà. Mỗi nhánh dài 100 m tính từ mép nút giao. Nhà đặt vào thế giới bằng `placeIn(frame, spec)` rồi xoay theo góc nhìn như mọi thứ khác. Bốn lô góc không thuộc phố nào: tây bắc **Thái Bình**, đông bắc **Novotel**, tây nam **vườn tròn**, đông nam **vườn cây rậm** (theo bảng mô tả đã gửi người dùng).
- **Tổng quát hóa**: `Section` (mặt cắt có tham số) thay hằng `STREET` trong phần vẽ phố; `streetRows()` sinh nhà theo nhiều đoạn; dây điện dừng ở cột cuối trước nút giao. Phố Thái Hà ở P3 giữ nguyên (cùng thứ tự rng, cùng id).
- **Nút giao**: lưới ô làn (`junctionGrid`): mỗi làn đi qua được cắt ở chỗ gặp làn của phố kia; chỗ hai làn giao nhau dùng **chung một ô**, nên không có hai ô nào lồng nhau. Controller chuyển xe vào ô đang chứa nó.
- **Luật cột điện**: cột cuối mỗi đoạn nằm cách cuối đoạn ≤ 4 m + 33 m (trước là 6 m): một nhịp dây 39 m tới cuối phố võng xuống tận tán cây to (test phát hiện).

### ADR-025 · Đèn giao thông và mô hình xe bám đuôi
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "ngã tư có đèn đỏ cũng cần dừng theo đèn")
- **Quyết định**: `core/traffic.ts` thuần (không DOM): chu kỳ cố định 2 pha xen **đỏ toàn phần 4 s**; mỗi xe bám xe trước cùng làn cùng vệt (giữ khoảng 3 hoặc 5), dừng mềm trước vạch khi đỏ (tốc độ = min(v, 2.6 × quãng trống)); lúc chuyển vàng, xe nào tới vạch trong 0.8 s thì đi tiếp, còn lại dừng. Xe trên cầu vượt không theo đèn. Làn là vòng khép kín: ra khỏi đầu này thì vào lại từ đầu kia.
- **Vì sao đỏ toàn phần 4 s**: Tây Sơn rộng 22 m; xe máy chậm nhất (48 đv/s) đi tiếp lúc vàng cần ~6 s để ra khỏi nút giao. Test mô phỏng 150 s phát hiện trường hợp 3 s là thiếu.
- **Màu đèn (A8)**: đỏ = `accent`, vàng = `accent-hi`, xanh = `live`; không thêm màu mới. Có số đếm ngược như đèn Hà Nội.
- **Test**: không bao giờ xanh cả hai hướng; luôn qua đỏ toàn phần; trong 150 s mô phỏng không lúc nào xe hai phố cùng ở trong nút giao, không xe nào vượt đèn đỏ, không xe nào chồng lên xe trước, xe nào cũng di chuyển.

### ADR-026 · Cầu vượt Tây Sơn
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "nếu có thể thì cả cầu vượt nữa")
- **Quyết định**: 2 làn trong của Tây Sơn (`Lane.fly`) đi lên dốc đắp 28 m, mặt cầu cao 6 m vắt qua nút giao (từ 12 m trước tới 12 m sau), trụ ở dải phân cách. Mỗi đoạn 5 m của dốc / mặt cầu là một item gồm thân, lan can xa, xe, lan can gần; xe trên cầu được nâng theo `flyZ`. Chỉ ô tô.
- **Thứ tự vẽ**: dốc nằm giữa làn ngoài (không chồng theo y); mặt cầu trên nút giao cao hơn hộp ô làn (z 54 > 21) nên tách theo z.

### ADR-027 · depthSort: lọc cặp bằng lưới màn hình
- **Trạng thái**: Đã chốt (2026-10-21)
- **Bối cảnh**: Ngã tư có ~2000 item; so mọi cặp là 2 triệu phép.
- **Quyết định**: Bỏ hộp bao màn hình của mỗi item vào lưới 64 đv; chỉ so cặp chung ô; danh sách cặp sắp lại theo (i, j) nên đồ thị và thứ tự vẽ **y hệt** bản O(n²) (snapshot không đổi). Dưới 64 item thì so hết như cũ.
- **Hệ quả**: Dựng cả ngã tư ~170 ms (NFR-04: < 300 ms).

### ADR-028 · Dáng ô tô: cabin dài, kính xiên
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "ô tô đang chạy ngược thì phải")
- **Bối cảnh**: Chiều chạy trong code đúng (đèn pha, kính lái ở đầu xe). Nhưng cabin ngắn nằm sát đuôi, phía trước là phần phẳng dài, nên trông như xe bán tải đi lùi.
- **Quyết định**: Cabin là lăng trụ hình thang (kính lái và kính hậu xiên), dài gần nửa xe, hơi lùi sau giữa xe; mũi xe dài hơn cốp; hatchback mui kéo gần tới đuôi. Chỉ vẽ mặt quay về người xem.

### ADR-029 · Trang "Công trình" cho các công trình vẽ riêng
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "1 page nữa để view các tòa nhà / công trình đặc biệt … không giống như cái xưởng nhà là mô hình chung chung")
- **Quyết định**: Trang thứ 4 trong thanh bên, đặt ngay sau Xưởng nhà. Mỗi lần xem một công trình, kèm bảng thông tin. Dữ liệu mô tả để ở `core` (thuần), phần vẽ dùng lại đúng các hàm của cảnh ngã tư, nên trang luôn khớp với cảnh. Cầu vượt không vẽ lại riêng mà cắt ra từ cảnh ngã tư.
- **Xe trên trang cầu vượt** (người dùng: "cho xe chạy đi"): phần điều khiển xe tách thành `scenes/crossroads/trafficDriver.ts`, dùng chung cho cảnh Ngã tư và trang này. Trang cầu vượt chạy mô hình trong một **cửa sổ** ±42 m quanh nút giao: xe cuộn vòng trong cửa sổ và mờ dần ở hai đầu; xe nào không có nhóm vẽ (đoạn đã cắt bỏ) thì ẩn.
- **Hệ quả**: Mặt đường mỗi nhánh chia đoạn 15 m thay vì một khối dài 100 m (để cắt). Test: 5 công trình × 4 hướng sạch thứ tự vẽ; tầng tòa nhà có id duy nhất.
- **Sửa kèm**: lối vườn dùng đầu nét bo tròn nên thò ra ngoài mép lô; đổi sang đầu cắt thẳng, chỉ bo ở khúc nối bên trong.

### ADR-030 · Mặt bằng 2 tòa tháp lấy từ OpenStreetMap
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "2 tòa nhà thái bình (viet tower) và novotel vẽ chưa giống", gửi ảnh khối nhìn từ trên xuống / 4 phía và bản đồ 3D f4map)
- **Bối cảnh**: Bản trước dựng theo ảnh chụp, đoán mặt bằng (viên thuốc, elip) trong lô 44 × 42 m và 48 × 44 m. Thực tế Việt Tower dài ≈ 108 m dọc Thái Hà, Novotel ≈ 84 m; f4map vẽ từ dữ liệu OSM, trong đó cả 2 tòa có mặt bằng và số tầng từng phần.
- **Quyết định**: Lấy toạ độ OSM (API `map.json`, 2026-10-21), xoay 62.5° để Tây Sơn nằm theo trục x, Thái Hà theo trục y, đổi ra 10 đơn vị/m, đặt sát mép Thái Hà của lô; ghi cứng vào `thai-binh.ts` / `novotel.ts`. Giữ **đúng tỉ lệ thật**: lô tây bắc 54 × 117.5 m, đông bắc 46 × 96.5 m; **nhánh phố tăng từ 100 m lên 130 m** (`ARM`) để phía sau tòa tháp vẫn còn vài căn nhà. Mặt bằng lõm vẽ bằng `extrude` (tường xếp thứ tự trong một item), các phần cao thấp khác nhau là item chồng theo z, nên hộp bao không cắt nhau.
- **Hệ quả**: Ngã tư rộng hơn, nhiều nhà hơn. Bỏ các chi tiết đoán từ ảnh không khớp mặt bằng thật (mái 3 bậc tròn, gân xoắn, mái sảnh, 2 tháp trắng cửa pixel). Góc thật giữa 2 phố ≈ 94°, vẫn vẽ vuông (P5).
- **Thành luật** (người dùng: "nên ghi vào tài liệu là lấy thông tin từ OpenStreetMap cho các tòa nhà để vẽ cho đúng"): mọi tòa nhà thật đều làm như vậy. Xem luật A13 và cách làm ở `docs/ai/README.md` §6.
- **Sửa kèm**: xe ban đầu chạm mép gần của nút giao bị dời ngược vào trong nút giao (độ lệch âm); nhánh dài hơn làm lộ lỗi này.

### ADR-031 · Thử nghiệm 3D bằng three.js (trang riêng)
- **Trạng thái**: **Thử nghiệm** (2026-10-21, người dùng: "làm 1 trang thử riêng đi xem sao"). Chưa thay SVG.
- **Bối cảnh**: Người dùng muốn xoay tự do nhiều góc. Kiến trúc SVG chỉ đúng với bước 90° (`depthSort` theo hộp bao thẳng trục, chỉ thấy mặt +x/+y, chi tiết vẽ trên mặt FRONT/SIDE). Hướng được cân nhắc: chuyển phần hiển thị sang 3D thật, giữ `core/`.
- **Quyết định**: Thêm `three@0.170.0` (+ `@types/three`), **chỉ dùng trong trang `lab-3d.html`** (`src/lab3d/`); app chính không import. Trang dựng cả ngã tư từ đúng dữ liệu `core/` (bố cục, thông số nhà, mặt bằng OSM của 2 tòa tháp qua `TB_PLAN` / `NV_PLAN`). Phong cách theo chế độ 3D của skill iso-glow: camera trực giao, mặt phẳng màu không chiếu sáng lấy từ token CSS, nét 1 px (vỏ viền bóng + cạnh gãy), bloom chỉ ở theme tối, cho thứ đang sáng. Bên cạnh là bản SVG của 2 tòa ở góc gần nhất để so.
- **Còn thiếu so với SVG** (cố ý, để thử cho nhanh): nhà chỉ là khối + cửa mặt tiền (không ban công, mái, biển, cây, cột điện, dây), không cầu vượt, không xe, vườn là tấm phẳng.
- **Hệ quả**: Nếu người dùng chọn đi tiếp, sẽ có ADR mới để chuyển tầng `render/` sang 3D (hoặc giữ cả hai). Nếu không, xóa `src/lab3d/`, `lab-3d.html` và gỡ three.

---

## Câu hỏi mở

| # | Câu hỏi | Cần trước | Mặc định nếu chưa có trả lời |
|---|---|---|---|
| Q1 | Có ảnh nhà ống quanh khu làm mẫu preset không? | P2 | Dựng theo nhà phố Hà Nội phổ biến |
| ~~Q2~~ | ~~Ảnh tòa Thái Bình, Novotel, 2 vườn hoa~~ → **Đã có (2026-10-21)**, dựng theo ảnh: components C1–C3 | — | — |
| ~~Q6~~ | ~~"Tòa Thái Bình" có đúng là Việt Tower?~~ → **Đã chốt**: người dùng gọi là Parkson (tòa trắng bo tròn) | — | — |
| Q3 | Mỗi landmark / vườn hoa ở góc nào cho đúng bản đồ? | P5 | Đang dùng: Thái Bình tây bắc, Novotel đông bắc, 2 vườn phía nam (ADR-024; đổi ở `PLOTS` trong `core/crossroads.ts`) |
| Q4 | Có muốn âm thanh không? | P5 | Không |
| ~~Q5~~ | ~~Font có tiếng Việt cho biển hiệu~~ → **Đã chốt: ADR-017** | — | — |

## Nhật ký đo đạc
*(Điền ở P3–P4: fps, thời gian dựng lại, kích thước file.)*

| Ngày | Figure | Số căn | fps | Dựng lại (ms) | Kích thước | Ghi chú |
|---|---|---|---|---|---|---|
| 2026-10-21 | Ngã tư (view 0, cutaway) | 95 + 2 tòa | *chờ người dùng đo* | ~170 (test, Node) | SVG 5.3 MB | 2016 item; 56 xe máy + 26 ô tô |
