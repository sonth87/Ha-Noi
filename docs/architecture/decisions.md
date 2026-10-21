# Nhật ký quyết định (ADR)

ADR-001 … ADR-031 là của app SVG, giữ nguyên ở [apps/svg/docs/architecture/decisions.md](../../apps/svg/docs/architecture/decisions.md) (đóng băng). Các ADR mới bắt đầu từ ADR-032 và ghi ở đây. Mẫu ADR: [workflow](../ai/workflow.md).

---

### ADR-032 · Monorepo: app SVG đóng băng, app 3D làm mới trên các gói chung
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "tách thành 2 app riêng và không động vào nữa. vẫn giữ script để chạy chứ không bỏ đi", rồi "ok")
- **Bối cảnh**: Người dùng muốn xoay tự do nhiều góc. Kiến trúc SVG chỉ đúng với bước 90° (ADR-007, ADR-024 của app cũ). Trang thử three.js (ADR-031) cho thấy 3D giữ được phong cách iso-glow ở các khối lớn và mượt hơn. Muốn giữ app cũ nhưng tập trung làm cái mới, và về sau thành phố được **dựng tự động từ dữ liệu** (OSM + sửa tay), thêm phố, thêm nhà không phải sửa bộ vẽ.
- **Quyết định**:
  - **pnpm workspace** với `apps/*` và `packages/*`.
  - **`apps/svg`**: toàn bộ app cũ chuyển nguyên trạng (code, core cũ, test, tài liệu, trang thử 3D). **Đóng băng**: không sửa, không phụ thuộc gói mới (luật A14). Vẫn chạy bằng `pnpm dev:svg` / `test:svg` / `build:svg` ở gốc.
  - **App mới `apps/city3d`** (three.js) có chế độ 2D = camera iso khóa 4 góc và chế độ 3D = xoay tự do; **một bộ vẽ duy nhất**, không duy trì song song hai bộ vẽ.
  - **Các gói chung**: `core` (mô hình thành phố, generator nhà + preset, luật đồ phố, giao thông, rng; không biết OSM), `osm-data` (dữ liệu OSM thô + script tải, tách khỏi core theo yêu cầu người dùng), `osm-import` (OSM → mô hình thành phố), `theme` (token, bảng màu nhấn).
  - App mới **kế thừa** từ app cũ: generator nhà có tham số và preset, 2 tòa tháp theo mặt bằng OSM, các nhà cơ bản cấu hình được; mở rộng thêm nhiều kiểu nhà để dựng hàng loạt.
  - App mới có **cơ chế chất lượng**: mức chung (Thấp / Trung bình / Cao / Rất cao / Tùy chỉnh), mức chi tiết nhà L0–L3, mật độ xe, bật/tắt cột và dây điện, cây, đèn đêm và glow, các lớp nét, tầm nhìn xa (chia ô), LOD theo khoảng cách, tự hạ chất lượng khi fps thấp.
  - Phạm vi dữ liệu ban đầu: **khu ngã tư hiện tại** (mỗi nhánh 130 m); làm tốt khu này rồi mới mở rộng.
  - Tài liệu: `docs/` ở gốc cho monorepo và app mới; tài liệu app cũ ở `apps/svg/docs/` (đóng băng). Nhật ký ADR tiếp tục từ ADR-032 ở đây.
- **Lý do**: Một bộ vẽ thì không bao giờ lệch giữa 2D và 3D; 3D bỏ được cả nhóm lỗi thứ tự vẽ của SVG và mượt hơn. Giữ app cũ tách biệt và đóng băng thì nó chắc chắn không hỏng khi core mới thay đổi. OSM là dữ liệu có giấy phép riêng (ODbL) và có nhịp cập nhật riêng, nên tách thành gói riêng khỏi core.
- **Hệ quả**: Core mới là bản viết lại/tổng quát hóa của core cũ (phố là polyline cong được, nhà là đa giác bất kỳ), app cũ giữ bản core cũ của riêng nó. Lệnh chạy và đường dẫn đổi (xem `docs/ai/README.md` §4). Test kernel của app cũ phải sửa đường dẫn tới skill (`../../../../.claude/…`) vì thư mục sâu thêm 2 cấp; đây là chỗ sửa duy nhất trong code app cũ.

### ADR-033 · Mô hình thành phố tính bằng mét; giữ trang thử 3D cũ để đối chiếu
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "Q1: theo mét. Q2: giữ lại để đối chiếu, để tránh phải tự viết lại, sau đó mới xóa")
- **Quyết định**:
  - Mọi gói mới tính bằng **mét**: `x` đông (dọc trục chính của khu), `y` nam, `z` lên. Đơn vị 1 m = 10 chỉ còn trong `apps/svg`. Generator nhà chuyển sang core thì đổi hết số về mét (kể cả các hằng chiều cao vật trên mái trong `peakZ`, khoảng random trong `randomHouse`).
  - Trang thử 3D (`apps/svg/lab-3d.html`, ADR-031) **giữ lại** trong app cũ để đối chiếu khi viết `city3d`; chỉ xóa (cùng three.js của app cũ) khi `city3d` đã làm được những gì trang thử làm. Việc xóa này là ngoại lệ được người dùng cho phép với luật A14.
- **Lý do**: OSM vốn là mét, three.js không quan tâm đơn vị; một đơn vị thật thì số trong dữ liệu, tài liệu và sửa tay đọc ra ngay. Trang thử có sẵn cách dựng nét, bloom, camera; giữ để chép lại thay vì viết lại.

### ADR-034 · Cách tổ chức các gói chung
- **Trạng thái**: Đã chốt (2026-10-21, M2)
- **Quyết định**:
  - Các gói trong `packages/*` **xuất thẳng mã TypeScript** (`exports: "./src/index.ts"`), không có bước build: Vite và Vitest đọc thẳng qua liên kết workspace. Mỗi gói có `typecheck`, `lint`, `test` riêng; gốc chạy tất cả bằng `pnpm -r`.
  - `tsconfig.base.json` ở gốc, các gói kế thừa. **ESLint ở gốc** cho mọi gói mới, cưỡng chế luật phụ thuộc ở conventions §1 (core không import gói nào khác, không React/three, không DOM, không `Math.random`/`Date.now`; osm-import chỉ dùng core và osm-data; osm-data và theme không phụ thuộc gói nào). `apps/svg` giữ config ESLint riêng (đóng băng).
  - Dữ liệu OSM (`.osm.json`) được import trực tiếp như module JSON (kiểm kiểu mất khoảng 4 s với file 1,4 MB, chấp nhận được). `osm-data` được phép import `../data/*` (dữ liệu nằm cạnh `src/`); các chỗ khác vẫn cấm `../`.
  - Script tải dữ liệu viết bằng `.mjs` (Node 20 chưa chạy thẳng TypeScript); danh sách khu ở `data/areas.json` để cả script và mã TS cùng đọc.
  - **Cấu hình và sửa tay của từng khu** nằm trong `osm-import` (`src/area-<id>.ts`), không nằm cạnh dữ liệu thô: `osm-data` chỉ có những gì máy chủ OSM trả về. Cơ chế sửa tay (`applyOverrides`, khóa theo `source`) nằm trong core vì nó không phụ thuộc OSM.
  - Mô hình thành phố đặt **nhà sinh** lên cạnh mặt tiền thật của tòa nhà; `HouseSpec` mới bỏ `x`, `y`, `facing`.
  - Nút giao chỉ tính nơi **từ 3 nhánh đường xe chạy** gặp nhau; lối đi bộ không tạo nút giao.
- **Hệ quả**: Đổi một gói là app mới thấy ngay (không phải build lại). Sửa tay nào không còn khớp dữ liệu (sau khi tải lại) thì test báo ngay.

### ADR-035 · Bộ vẽ của app 3D
- **Trạng thái**: Đã chốt (2026-10-21, M3)
- **Quyết định**:
  - `apps/city3d`: Vite + React (vỏ) + three.js 0.170.0 (cùng bản với trang thử). Ba tầng `render/` (mô hình → geometry, thuần), `view/` (`CityView`, trình duyệt), `ui/` (React), luật phụ thuộc bằng ESLint gốc. Cổng dev 5190.
  - **Gom hình theo loại mặt**: cả khu là vài mesh lớn thay vì mỗi tòa một mesh (rủi ro R4). Đèn từng tầng bằng **màu theo đỉnh** trong một mesh cửa sổ duy nhất. Click → tam giác → tòa (bảng đoạn tam giác) → tầng (theo độ cao).
  - **Vật liệu không chiếu sáng**, màu chỉ từ token CSS (A8); ba lớp nét như skill iso-glow 3D: vỏ viền bóng (đẩy ra 1 px theo pháp tuyến trơn, mặt sau), nét cạnh (`EdgesGeometry` 20°), nét chi tiết (viền cửa). Bloom chỉ ở theme tối.
  - **Camera trực giao**, 2D = isometric thật khóa 4 góc (trùng app cũ), 3D = OrbitControls; chuyển giữa hai chế độ có chuyển động 450 ms.
  - Vỉa hè tự cắt khi cắt ngang lòng đường khác; góc giao giữa hai lòng đường tạm để hở (M5).
  - Mô hình dựng tay chỉ thêm chi tiết (cột ăng-ten Việt Tower), hình khối vẫn từ dữ liệu.
- **Hệ quả**: Thêm tòa / đường vào dữ liệu là app vẽ ngay. Bundle 2 MB (370 KB gzip), phần lớn là dữ liệu OSM và three.js; tách gói tải sau nếu cần.

### ADR-036 · Mức chi tiết và ô (M4)
- **Trạng thái**: Đã chốt (2026-10-21, M4)
- **Quyết định**:
  - **4 mức chi tiết** cho tòa nhà: L0 khối · L1 thêm cửa sổ · L2 nhà sinh dựng đủ theo generator (tầng trệt, mái hiên, biển, 8 kiểu cửa, 4 kiểu ban công, phần đua ra, mái bằng / dốc, phòng tum, mái tôn), các khối lớn có mặt tiền theo loại (ban công chung cư và trường, mặt kính cửa hàng tầng 1, dải kính văn phòng) · L3 thêm mọi chi tiết nhỏ (biển chìa, standee, cột xoắn, biển lớn tường hồi, ô văng, cục nóng, chậu cây, quần áo phơi, đồ trên mái, bồn nước mái khối lớn).
  - Camera trực giao **không có "xa"**: vật chỉ nhỏ đi khi thu nhỏ. Nên mức chi tiết tự động tính theo **số pixel cho 1 m trên màn hình**: < 2 px → L1, 2–4,5 px → L2, ≥ 4,5 px → L3, không vượt mức tối đa người dùng chọn. Tắt "tự giảm" thì luôn dùng mức tối đa.
  - Tòa nhà chia theo **ô 64 m** (khu ngã tư: 26 ô). Mỗi ô dựng riêng theo từng mức, chỉ khi cần, rồi giữ lại. Khi mở trang: mọi ô dựng ngay ở L0–L1 (khoảng 30 ms cả khu); sau đó mỗi khung hình dựng thêm một ô ở mức đang cần, ô gần tâm nhìn trước. Ô cũng là nền cho tầm nhìn xa ở M5.
  - Mức chất lượng: Thấp = tối đa L1, Trung bình = L2, Cao = L3 (đều tự giảm), Rất cao = luôn L3.
  - Core: thêm 5 preset (`tube-7f-narrow`, `cap4-tile`, `biet-thu`, `tap-the`, `nha-pho-rong`) và nhóm preset theo loại công trình / bề rộng / số tầng (`presetPool`); chiều cao tầng của nhà sinh lấy từ spec (`houseStoreys`, kể cả nửa hầm).
- **Sửa kèm**: (1) `peakZ` đổi đơn vị sai ở M2: độ cao nóc mái tôn là `0,3 × w` m, không phải `0,03 × w`. (2) `withOption` so cả trường `level` nên không bao giờ trở về mức có tên; nay chỉ so các tùy chọn.
- **Số đo** (Node, khu ngã tư): nền 85 ms / 13.000 tam giác; L1 19 ms; L2 165 ms / 31.000 tam giác; L3 260 ms / 52.000 tam giác, 89.000 nét; ô nặng nhất 32 ms ở L3.

### ADR-037 · Mạng đường, đồ phố, giao thông (M5)
- **Trạng thái**: Đã chốt (2026-10-21, M5)
- **Bối cảnh**: Người dùng thấy đường "gấp khúc": mỗi đoạn OSM dựng riêng nên chỗ nối có khe; góc cua theo đúng vài điểm OSM; nút giao hở góc; vỉa hè cắt vụn. Đồ phố gần như không có trong OSM khu này. Mô hình giao thông cũ chỉ biết 2 phố thẳng.
- **Quyết định**:
  - **Mạng đường** (`core/network.ts`) suy ra từ `City`, không lưu: các đoạn nối tiếp nhau (đúng 2 đoạn gặp nhau, cùng loại, tên, bề rộng, chiều, lớp) nối thành **đường**; góc cua làm tròn bằng Chaikin 2 lượt giữa các điểm cố định (đầu đường, nút giao); **nút** có các **nhánh** (hướng, nửa bề rộng, vỉa hè hai bên); **tuyến** (run) là một phố đi thẳng qua nút giao (cùng tên, lệch < 35°) cho cột, dây, cây; **lộ trình** (route) là như tuyến nhưng qua được chỗ đổi tên (lệch < 20°: Thái Hà → Chùa Bộc) cho xe.
  - **Nút giao**: giữa hai nhánh kề nhau, lấp nhựa tới cung bó vỉa (bán kính 4 m, 2 m nếu có ngõ / đường nội bộ); hai nhánh cùng có vỉa hè phía đó thì vỉa hè chạy vòng theo cung. Vỉa hè của mỗi đường dừng đúng chỗ cung bắt đầu; vạch làn dừng trước nút.
  - **Đồ phố bằng luật** (`core/furniture.ts`), suy ra từ `City`, có seed: cột điện mỗi 32 m một bên phố (bên ngoài của mỗi làn đường đôi), dây nối các cột (3–6 sợi, vắt qua miệng ngõ, nhịp ≤ 62 m); cột đèn giữa các cột điện ở đường chính, đèn treo trên cột điện ở đường nhỏ; cây mỗi 8–11 m giữa vỉa hè rộng ≥ 2,5 m; cột đèn tín hiệu ở mỗi hướng xe vào nút có đèn (trừ phía trong cụm nút của đường đôi). Không đặt gì trong vùng nút giao hay trên lòng bất kỳ đường nào.
  - **Giao thông** (`core/traffic.ts`, viết lại): làn theo lộ trình (một chiều: cả bề rộng; hai chiều: nửa mỗi chiều); vạch dừng trước nút có đèn đầu tiên của mỗi cụm; nhóm pha `x` / `y` theo hướng làn; xe bám đuôi, quyết đi tiếp hay dừng lúc đèn vàng như app cũ; cầu vượt chỉ ô tô; làn là vòng lặp. Vẽ bằng instancing, xe hiện dần / mờ dần ở 8 m đầu và cuối làn.
  - **App 3D**: đồ phố theo ô 64 m, tách lớp (cột + đèn treo, cột đèn + đèn tín hiệu, cây đầy đủ, cây đơn giản không nét, dây). Ban đêm: đèn đường sáng, xung sáng chạy dọc dây (nét đứt màu nhấn trôi), đèn pha / hậu của xe. Đèn tín hiệu đổi theo pha (một màu nhấn: đèn đang bật sáng, vị trí trên / giữa / dưới cho biết đỏ / vàng / xanh).
  - **Chất lượng** thêm: mật độ xe (0–100%), cột và dây điện, cây (không / đơn giản / đầy đủ), tầm nhìn xa (150 / 250 / 400 m / hết: ẩn ô nhà, ô đồ phố và xe ở xa tâm nhìn; lớp nền giữ nguyên), tự hạ một mức khi fps < 28 suốt 3 giây (không tự nâng lại). Thấp = 30% xe, không dây, cây đơn giản, 150 m; Trung bình = 60%, có dây, cây đơn giản, 250 m; Cao / Rất cao = 100%, đầy đủ, hết.
- **Sửa kèm**: regex nhận "Ngõ/Ngách/Hẻm" dùng `\b`, mà `\b` của JavaScript không coi chữ có dấu là chữ cái, nên mọi tên "Ngõ …" bị bỏ sót (thành `service`). Đổi sang `(\s|$)`, có test.
- **Số đo** (Node): lớp nền 93 ms; mạng đường + đồ phố 79 ms (117 món, 15 nhịp dây, 18 ô); 29 làn, 812 xe ở 100%, mô phỏng 0,16 ms/khung.

### ADR-038 · Xe theo iso-glow, cửa sổ sáng không đều, mặt đường chính là cửa hàng, sân trước lát vỉa hè
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "sao ô tô xe máy nhìn xấu thế? … các đèn của ngôi nhà sẽ có thể sáng không đồng đều … các nhà ở ngoài mặt đường chính sẽ luôn là các cửa hàng … và trước sẽ là vỉa hè")
- **Quyết định**:
  - **Xe** dựng theo hình ô tô của figure `07-intersection` (iso-glow) và ô tô / xe máy của app SVG cũ (đã duyệt): ô tô có thân bo góc, 4 bánh, cabin hình thang (kính trước / sau xiên, kính hông chia cột), đèn pha tròn, đèn hậu nhỏ, taxi có hộp đèn nóc; van là một khối cao có hàng kính hông; xe máy theo đúng biên dạng nhìn ngang của app cũ (thân tay ga, gù sau, yếm trước), 2 bánh, yên, ghi đông, người lái. Mỗi bộ phận một màu (thân `--body`, nóc `--deck`, kính `--glass`, bánh `--recess`). Ban đêm: đèn pha `--accent-hi`, đèn hậu và hộp đèn taxi `--accent`, **vệt đèn pha trên mặt đường** (hai vùng sáng phía trước, như `.beam` của iso-glow, chỉ ở theme tối). Nét: viền bóng instancing + nét cạnh tính lại mỗi khung hình (bánh xe và đầu người lái chỉ có viền bóng); mật độ 100% khoảng 48.000 đoạn, khoảng 1 ms/khung.
  - **Cửa sổ sáng không đều** ("lived-in" của iso-glow): khi một tầng bật, mỗi cửa có sắc độ cố định theo seed (lamp + thứ tự cửa): khoảng 2/10 rất sáng (`--accent-hi`), 5/10 sáng (`--accent`), 2/10 mờ (`--accent` pha 55% về `--recess`), 1/10 vẫn tắt. Đèn đường, đèn tín hiệu sáng đều.
  - **Nhà mặt đường chính** (cạnh mặt tiền nhìn ra đường primary / secondary / tertiary trong vòng 25 m): nhà sinh **luôn là cửa hàng đang mở** (cửa xếp / cuốn / kính), không lấy các kiểu nhà ở thuần (`3f-tank`, `cap4-tile`, `biet-thu`, `tap-the`), có thể thêm mái hiên, biển hai bên cửa, standee. Nhà trong ngõ phần lớn là nhà ở, khoảng 1/3 có bán hàng. Khối nhà lớn (không phải nhà sinh, không phải công trình dựng tay) quay ra đường chính: tầng 1 phía đó có mặt kính cửa hàng và một dải biển sáng (từ L2).
  - **Sân trước**: khoảng đất giữa mặt tiền và đường (≤ 15 m) được lát nối ra mép vỉa hè, nâng ngang vỉa hè; đường không có vỉa hè (ngõ) thì lát phẳng ra tới mép đường. Cửa hàng mở thẳng ra vỉa hè như phố Hà Nội.
- **Hệ quả**: Core: `houseFor(…, on)` với `on = 'main' | 'minor'`, `presetPool(…, on)`, `frontStreet(ring, front, streets)`. App 3D: `render/lights.ts`, `buildForecourts`.

### ADR-039 · Bảng Đèn; màu cửa sáng và glow theo iso-glow
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "nên thêm vào cái bảng để cho người dùng chọn: auto/bật/tắt đèn xe … đèn của nhà cũng thế … bật đèn theo kiểu tất cả, ngẫu nhiên ít/nhiều (thanh trượt 0-100). độ sáng đèn hình như không tương đồng với iso-glow")
- **Quyết định**:
  - Mục **Đèn** riêng (không thuộc mức chất lượng), nhớ theo máy: **đèn nhà** tự động / bật / tắt + **số tầng sáng** 0–100% (thứ tự cố định theo seed: kéo thanh chỉ thêm / bớt tầng, không xáo lại; 100% = tất cả); **đèn xe** tự động / bật / tắt (đèn pha, đèn hậu, hộp đèn taxi, vệt đèn pha); **độ glow** 0–200%. Tự động = bật khi tối (`N`). Click một tầng vẫn bật / tắt riêng tầng đó. Đèn đường và đèn tín hiệu theo ngày / đêm như cũ. Mặc định: tự động, 70%, tự động, 100%.
  - **Màu cửa sáng như iso-glow** (`.fl.on .win`): cửa sáng tô `--accent`, **viền `--accent-hi`**; cửa rất sáng `--accent-hi`; cửa mờ là cửa sáng ở **độ mờ 45% trên nền tường** (pha 55% về `--body`, không phải về `--recess`); cửa tắt `--recess`, viền `--detail`. Viền cửa tô theo từng đoạn (màu theo đỉnh của nét).
  - **Glow**: ngưỡng bloom 0,35 (chỉ màu nhấn vượt qua, nét `--line` không), cường độ 0,9 × độ glow, bán kính 0,4; tắt hẳn khi độ glow = 0 và ở theme sáng.
- **Hệ quả**: `view/lights.ts` (`LightSettings`, `litFloors`, `lightOn`), `ui/LightsPanel.tsx`; nút "Đèn · chất lượng" (`G`).

### ADR-040 · Tỉ lệ cửa sáng theo từng ô cửa; dải kính chia ô; glow nhẹ như iso-glow
- **Trạng thái**: Đã chốt (2026-10-21, người dùng gửi ảnh so với iso-glow: "đèn các ngôi nhà quá sáng … để 20% nhưng Novotel sáng trưng rất nhiều tầng, còn Thái Bình không sáng tầng nào")
- **Bối cảnh**: ADR-039 chọn tỉ lệ theo **tầng**, xếp theo seed trên cả thành phố, nên tòa trúng nhiều tầng, tòa không tầng nào. Novotel / Việt Tower mỗi tầng là một dải kính liền, bật lên là cả dải sáng, bloom làm lóa. iso-glow rải đèn theo **ô cửa**: tòa nào cũng lốm đốm, cửa gần như không có quầng.
- **Quyết định**:
  - Thanh trượt đổi thành **"Cửa sáng" 0–100%**: mỗi ô cửa của nhà có một vị trí cố định trong [0, 1) (`windowRank`, băm FNV-1a rồi trộn bằng bộ trộn cuối của murmur3, vì bit cao của FNV gần như không đổi giữa các chuỗi chỉ khác ký tự cuối); cửa có vị trí dưới tỉ lệ thì sáng. Đều ở mọi tòa (test: hai tòa tháp ở 20% đều trong 15–25%). Kéo thanh chỉ thêm / bớt cửa. Bật đèn (tự động lúc tối) thì tỉ lệ tăng dần trong 0,5 s. Click một tầng vẫn bật **cả tầng** (mỗi cửa một sắc độ); chân trang: "cửa sáng X% + N tầng bật tay". Mặc định 35%.
  - Dải kính chia thành **ô**: vách kính ô khoảng 1,6 m, dải Việt Tower khoảng 2 m, khung 12 cm giữa các ô.
  - Glow mặc định nhẹ: cường độ 0,45 × độ glow, bán kính 0,3, ngưỡng 0,55 (cửa `--accent` hầu như không tỏa; cửa rất sáng, đèn đường, đèn tín hiệu tỏa nhẹ).
- **Thay thế** phần "số tầng sáng" của ADR-039.

### ADR-041 · Đèn đường nhìn thấy được, vùng sáng trên mặt đường, cài đặt đèn đường
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "chưa có đèn đường à? tối thì mặc định đèn đường được bật")
- **Bối cảnh**: Đèn đường có từ M5 và được bật ban đêm, nhưng phần sáng chỉ là một mặt **úp xuống** dưới chụp đèn: camera nhìn từ trên nên chỉ thấy mặt sau (bị bỏ khi vẽ), không thấy gì.
- **Quyết định**: Bóng đèn sáng ở **4 mặt bên và mặt dưới**, dưới một nắp tối, nên nhìn từ góc nào cũng thấy một chấm sáng (có glow nhẹ). Mỗi đèn có một **vùng sáng tròn** đường kính 11 m trên mặt đường (màu nhấn mờ dần từ tâm, cộng sáng, như light pool của iso-glow), chỉ ở theme tối. Bảng Đèn thêm **Đèn đường**: tự động (tối thì bật, mặc định) / bật / tắt.

### ADR-042 · Kéo dài hết phố Thái Hà; metro 2A trên cao, ga Thái Hà, tàu; đèn vườn hoa
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "cho thêm đèn ở công viên/vườn hoa … vẽ kéo dài hết đường Thái Hà đi. ở đoạn Thái Hà - Yên Lãng có tàu metro trên cao … xem lại ga tàu thực tế thế nào để vẽ lại … trong ga tàu cũng có những cái như biển bảng, thùng rác … giống như ở 05-metro.js")
- **Dữ liệu**: Khu `nga-tu-thai-ha` giờ là **hợp 4 hình chữ nhật** trong hệ toạ độ của khu: ngã tư (±160 m), phố Thái Hà tới cuối phố (hai dải, phố lệch dần sang đông khi lên bắc, tới y ≈ −1.250 m), và một dải dọc tuyến **2A Cát Linh – Hà Đông** quanh **ga Thái Hà** (OSM: cầu cạn `railway=subway`, `bridge=viaduct`, `layer=2`, hai đường ray là hai way; ga `railway=station` "Thái Hà" ở x ≈ 285, y ≈ −725, 2 sân ga `railway=platform`). `osm-data` tải **nhiều hộp** rồi gộp bỏ trùng (`bboxes`), thử lại khi API ngắt kết nối, dự phòng Overpass. Khu mới: 612 tòa (403 nhà sinh), 434 đoạn đường, 2 đường ray metro, 1 ga.
- **Mô hình**: `City.region` (danh sách hình chữ nhật; `bounds` là hộp bao), `City.rails` (`Rail`: loại metro / rail / tram, đường tâm, trên cao không, cao độ đỉnh ray), `City.stations` (`Station`: tên, vị trí, các sân ga). `clipPathTo` cắt đường theo vùng bất kỳ (chia bước, tìm biên bằng chia đôi). Metro trên cao: đỉnh ray 12,5 m (`railHeight`, ước lượng).
- **Ga Thái Hà** (tìm hiểu: ga trên cao 3 tầng: tầng trệt lối vào, tầng 1 sảnh có bán vé / cửa soát vé / khu thương mại, tầng 2 sân ga; 2 đường ray, 2 **sân ga hai bên**; các ga của tuyến có **mái cong**; mở 6/11/2021). Kích thước cụ thể và hình mái chính xác **không tìm thấy, là ước lượng**: sảnh 6–10 m trên phố, sân ga ở đỉnh ray + 1,05 m, mái vòm cong phủ hai sân ga và hai đường ray, dài theo sân ga OSM (khoảng 100 m). Đồ trong ga theo `05-metro.js` của iso-glow: bảng giờ tàu treo dưới mái (màn hình luôn sáng), mép sân ga sáng khi tàu đang đứng, ghế chờ, thùng rác, lan can, biển tên ga, đèn dưới mái, cầu thang có mái từ sảnh xuống đất hai bên.
- **Cầu cạn**: dầm hộp 4,6 m dưới mỗi đường ray, lan can phía ngoài, ray; trụ chữ T giữa hai đường ray mỗi 30 m (không trong ga).
- **Tàu**: mỗi đường ray một đoàn 4 toa (19 m / toa), lịch chạy là hàm của thời gian (`core/metro.ts`): vào khu ở 13 m/s, phanh 1 m/s² dừng với giữa tàu ở giữa ga, đỗ 25 s, tăng tốc rời đi, ra khỏi khu, 70 s sau đoàn sau. Toa: hộp bo góc, dải cửa sổ, 2 cửa mỗi bên, toa đầu / cuối có kính lái và đèn pha; ban đêm cửa sổ sáng, cửa sáng khi tàu đứng ở ga.
- **Đèn vườn hoa**: cột 3 m quả cầu sáng mỗi 14 m dọc lối đi trong công viên (không có lối thì vòng quanh cách mép 3 m), vùng sáng nhỏ 3,5 m; theo cài đặt Đèn đường. Đèn trong ga cũng theo cài đặt đó.
- **Hiệu năng** (khu lớn gấp ~5): nét và viền bóng của lăng trụ tính trực tiếp thay vì `EdgesGeometry` + `mergeVertices` (L3 cả khu 2,7 s → 0,64 s, ô nặng nhất 229 → 35 ms); tìm nhà bên cạnh theo lưới 25 m; mật độ xe 100% thưa hơn (xe máy 15 m, ô tô 32 m: 2.380 xe); mức Cao mặc định tầm nhìn 400 m (Rất cao: hết); camera mở ở ngã tư.
- **Nguồn**: [Thái Hà station (Wikipedia)](https://en.wikipedia.org/wiki/Th%C3%A1i_H%C3%A0_station), [Hanoi Metro Line 2A](https://en.wikipedia.org/wiki/Hanoi_Metro_Line_2A), [Cát Linh station](https://en.wikipedia.org/wiki/C%C3%A1t_Linh_station), [Báo Văn Hóa: thay mái che ga](https://baovanhoa.vn/doi-song/ha-noi-metro-neu-tien-do-va-mai-nha-ga-tau-cat-linh-ha-dong-139867.html).

### ADR-043 · Điều khiển kiểu bản đồ
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "điều khiển dạng 3D hơi khó")
- **Bối cảnh**: OrbitControls mặc định: kéo trái là xoay, di chuyển phải kéo chuột phải (khó trên trackpad), phóng to vào tâm màn hình, không có cách đi nhanh trong khu giờ đã dài hơn 1 km.
- **Quyết định**: Kéo trái = **di chuyển** trên mặt đất; kéo phải hoặc Shift + kéo = xoay và nghiêng (3D); cuộn = phóng **vào con trỏ**; cảm ứng: 1 ngón di chuyển, 2 ngón phóng / xoay. Phím: W A S D / mũi tên đi (giữ phím, khoảng nửa màn hình mỗi giây, theo hướng đang nhìn), R / F nghiêng lên / xuống (3D), + / − phóng, H về ngã tư. Nhấp đúp = bay tới chỗ đó. Nút trên thanh: **Ngã tư**, **Ga Thái Hà** (mọi ga trong dữ liệu). Tâm nhìn không ra quá vùng 60 m. Thả hết phím khi cửa sổ mất focus.

### ADR-044 · Thu nhỏ thì bớt nét và vật nhỏ; giao diện mặc định sáng
- **Trạng thái**: Đã chốt (2026-10-21, người dùng gửi ảnh: "khi zoom xa thì … giảm chi tiết … đỡ bị thành những vệt đen xì … dòng xe cộ ở xa trông đen thui … mấy cái nhà có nhiều ban công cũng thế, hoặc là cho giảm độ đậm xuống khi zoom xa"; "giao diện mặc định cũng cho màu sáng")
- **Quyết định** (khi bật "Tự giảm chi tiết khi thu nhỏ"; các mốc **nâng gấp đôi** sau ảnh thứ hai của người dùng: "vẫn đang chưa đủ … xa tầm đấy rồi thì chẳng nhìn thấy được mấy thứ đó đâu", ở ~3,6 px/m app còn vẽ L2): nhà L3 từ 9 px/m, L2 từ 4,5 px/m, dưới đó L1 (khối + cửa). Độ xa `farness` = 0 ở ≥ 8 px/m tới 1 ở ≤ 2,5 px/m. Nét cạnh mờ tới 45%, nét chi tiết (viền cửa, lan can, ban công) tới 15%, dây điện tới 40%. Xe: dưới 6 px/m bỏ nét cạnh, dưới 4 bỏ viền bóng, dưới 2,5 ẩn xe máy. Cây "đầy đủ" thành "đơn giản" dưới 5 px/m. Các mốc ở `FAR` (`view/quality.ts`). Áp lại khi độ xa đổi một bậc 5% hoặc vượt một ngưỡng. Mức "Rất cao" (không tự giảm) vẫn vẽ đủ.
- **Theme mặc định: sáng.** Lựa chọn bằng phím `T` vẫn được nhớ theo máy.

### ADR-045 · Xe ở xa là khối xám có viền mờ; mật độ xe mặc định 30%; một nút Ngày ↔ Đêm
- **Trạng thái**: Đã chốt (2026-10-21, người dùng: "xe chỉ còn khối màu thì trông hơi khó nhìn ra là xe nhưng để viền thì lại thành hơi rối … mật độ giao thông mặc định 30% … bỏ cái nút sáng tối hoặc ngày đêm đi, để 1 trong 2 nút thôi, và 1 nút ý thực thi cho cả 2 tính năng")
- **Quyết định**:
  - **Xe ở xa** (ADR-044 đã bỏ nét bên trong): thay vì bỏ cả viền, giữ **viền ngoài mờ dần** (màu viền pha về màu mặt đường tới 60% khi xa nhất) và **thân xe xám đậm hơn mặt đường** (pha 45% về `--line`). Nhận ra là xe nhưng không có nét chồng nhau. Viền xe là vật liệu riêng (bản sao của viền tòa nhà) nên làm mờ xe không làm mờ nhà. Xe máy vẫn ẩn dưới 2,5 px/m.
  - **Mật độ xe mặc định 30%**: Thấp 15%, Trung bình 30%, Cao 30% (mặc định), Rất cao 60%. Cài đặt chất lượng đã lưu từ trước bị bỏ một lần (thêm số phiên bản vào bản lưu), để máy người dùng thấy mặc định mới.
### ADR-046 · Chi tiết ô tô và xe máy khi phóng gần theo `10-diner.js`
- **Trạng thái**: Đã chốt (2026-10-21, người dùng gửi ảnh phóng gần: "zoom gần hết mức thì xe cộ có vẻ lại kém chi tiết nhỉ. trong 10-diner.js tôi thấy ô tô khá đẹp và chi tiết đấy chứ … cả xe máy cũng thế")
- **Bối cảnh**: Ở bản trước, (1) bánh xe chỉ có vỏ viền bóng (`creases = false`, `polygonOffsetFactor: 6`) nên phần trên của bánh nằm dưới thân xe bị thân xe che mất viền, chỉ còn 2 vạch nhỏ thò dưới gầm và không có mâm xe; (2) cả khối cabin ô tô tô một màu kính liền không có khung / cột A–B–C; (3) góc bo thân xe chỉ chia 2 đoạn (45° > 20°) nên `Batch.solid` vẽ 3 nét dọc thô ở mỗi góc mũi xe; (4) thiếu lưới tản nhiệt, đường gân hông, khe cửa, tay nắm, gương, nắp ca-pô / cốp, viền đèn, và hộp đèn taxi thiếu nét cạnh đứng; (5) xe máy có người lái là một khối hộp chữ nhật thẳng đứng cộng hình trụ không nét cho đầu, ghi đông lơ lửng không có cổ lái / phuộc.
- **Quyết định**:
  - **Ô tô (`sedan`, `taxi`, `hatch`, `van`)**: góc bo thân chia 5 đoạn (`18° < 20°`) để vòng đáy / đỉnh mượt mà không sinh nét dọc ở góc bo; cabin đồng màu thân (`wall` / `roof`), các ô kính (`glass`, `polygonOffset -1`) lùi vào trong mỗi mặt chừa cột A / B / C và có viền riêng từng ô; bánh 12 cạnh có đủ vòng viền ngoài + đĩa và vòng mâm xe (`hubcap`) như `10-diner.js` + đường vòm bánh; mũi xe có lưới tản nhiệt nan dọc giữa hai đèn pha tròn có viền + cản trước; đuôi xe có đèn hậu có viền + khung biển số + cản sau; hông xe có đường gân ngang, bệ dưới, khe cửa dọc, tay nắm cửa, gương chiếu hậu; mặt trên có đường ghép nắp ca-pô và cốp; hộp đèn taxi có bệ đỡ và đủ nét cạnh + viền bóng; xe van có cabin kính lái xiên, cửa sổ cab vát theo cột A, 3 cửa sổ khoang sau, khe cửa lùa và cửa hậu đôi.
  - **Xe máy (`bike`)**: 2 bánh 12 cạnh có đủ viền + mâm xe hai bên, chắn bùn trước, phuộc trước nối xuống trục bánh; thân tay ga có đường gân hông; yên bo góc + tay dắt sau; cổ lái nối lên cụm đầu đèn pha có viền + ghi đông + đôi gương chiếu hậu; người lái ngồi tự nhiên: thân trên bo tròn (không có cạnh hộp sắc), hai chân gấp đặt lên sàn để chân, hai tay vươn nắm ghi đông, đầu đội mũ bảo hiểm bo tròn có viền và kính chắn.

### ADR-047 · Cây 3D nhiều múi có gốc loe, cành chạc và 3 dáng tán theo mẫu vẽ
- **Trạng thái**: Đã chốt (2026-10-21, người dùng gửi 2 ảnh mẫu: "các cái cây hiện tại nhìn trông nó khá là đơn giản và xấu, thử mấy kiểu cây thế này xem sao"; góp ý tiếp: bỏ các nét tỉa kiểu vẽ chì, chỉ giữ form dáng tán và khối 3D sạch)
- **Bối cảnh**: Cây cũ trong `furniture.ts` chỉ là 2 khối lăng trụ bát giác xếp chồng trên một que vuông (`Batch.solid(oct(r))`), sinh 8 nét dọc thẳng đứng trên mặt bên như hai chiếc thùng chồng lên nhau, thân cùng màu lá, không có gốc rễ, không có cành chạc dưới tán và không có độ khối sáng/tối.
- **Quyết định**:
  - **Cấu trúc cây đầy đủ (`full`)**:
    1. **Bồn cây & gốc rễ loe 3D**: tấm bồn cây phẳng ở chân (`B.flat` có viền `detail`); phần gốc cây loe cùng 3–4 rễ bạnh 3D (`taperedTube`) thuôn dần lên thân côn hơi nghiêng tự nhiên, tô màu tường (`--body`) và có vỏ viền bóng (`shell`), không vẽ nét vân dọc kiểu phác chì.
    2. **Chạc cành 3D lộ dưới tán (`growLimb`)**: ở độ cao `~1,7–2,2 m`, thân tách thành **4–5 cành chính 3D** thuôn dần vươn xiên ra ngoài và lên trên (mỗi cành là ống 3D có khuỷu gấp và nhánh 3D phụ), nằm trong khoảng vòm tối dưới đáy tán để nhìn rõ cấu trúc cành từ cả 2D và 3D.
    3. **Cụm tán lá 3D 3 sắc độ sạch nét (`foliageLobe`)**: mỗi cụm lá là một khối vòm elip 3D 14 cạnh trơn mượt (không vẽ nét tỉa hay vân lá kiểu vẽ chì bên trong), phân **3 sắc độ theo chiều cao**: mặt đáy và vành dưới cùng tô màu tối (`road` / `--recess`, tạo vùng bóng râm đậm dưới tán làm nổi bật cành chạc), đai giữa tô màu trung gian (`wall` / `--body`), vòm trên đón nắng tô màu sáng (`plant` / `--panel`). Các cụm lá đẩy pháp tuyến cầu mượt vào `B.shell` nên shader viền bóng chỉ vẽ đường bao silhouette sạch sẽ quanh các múi tán.
  - **3 dáng cây (`habit`, chọn cố định theo `hash(p.id)`)**:
    - **Dáng 0 (theo form ảnh mẫu 1 — sấu, nhội)**: 4 cành chạc đỡ 5 múi tán vòng dưới và 3 khối vòm lớn lệch nhau ở đỉnh tạo dáng tán vòm đa thùy tròn đầy, hở khoảng tối có cành chạc ở dưới.
    - **Dáng 1 (theo form ảnh mẫu 2 — bàng, xà cừ)**: 4 rễ bạnh rộng, 5 cành vươn xa đỡ 3 tầng tán dẹt xếp lớp theo chiều ngang (5 đệm lá tầng dưới, 3 đệm tầng giữa, 2 đệm đỉnh).
    - **Dáng 2 (bằng lăng, hoa sữa)**: thân hơi nghiêng tách 4 cành cao thấp lệch nhau, mỗi cành mang một chùm tán tròn tạo dáng bất đối xứng tự nhiên.
  - **Cây trong công viên / vườn hoa (`core/furniture.ts`)**: đặt thêm cây bóng mát dọc lối đi (đối diện đèn vườn) và dọc vành đai trong công viên (cách đường và lối đi).
  - **Cây đơn giản (`simple`, khi thu nhỏ xa)**: thân + 3 đĩa tán tròn 10 cạnh xếp lệch 2 sắc độ (đáy tối, đỉnh sáng), vẫn giữ 0 nét.

### ADR-048 · Chế độ xem công trình riêng trên đế (`iso-glow` diorama) và mở rộng bản đồ 7 khu phố
- **Trạng thái**: Đã chốt (2026-10-21, người dùng yêu cầu: "đưa thêm 1 tính năng và hiện danh sách các công trình và cho nó lên đế như iso-glow. cái này sau chắc nhiều đấy, nên là để dropdown để select cho dễ thay vì trải dài hết ra. sau đó thì hãy mở rộng khu vực hiện tại ra Láng Hạ, Hoàng Cầu, Ô Chợ Dừa, Nguyễn Lương Bằng, Xã Đàn, Chùa Bộc, Ngã Tư Sở đi.")
- **Bối cảnh**: Người dùng muốn xem từng công trình lớn hoặc mẫu kiến trúc độc lập trên một chiếc đế mô hình (`plate`) giống các bản vẽ đơn lẻ trong `iso-glow` (`10-diner.js`), chọn gọn qua `<select>` dropdown; đồng thời mở rộng vùng bản đồ 3D từ trục Thái Hà – Tây Sơn ra toàn bộ các trục phố lân cận.
- **Quyết định**:
  - **Chế độ Công trình trên đế (`render/showcase.ts`, `CityView.setShowcase`)**:
    - `showcasesOf(city)` trích xuất danh sách công trình từ mô hình thành phố chia thành 2 nhóm `<optgroup>` trong dropdown **Công trình**:
      1. **Công trình lớn (từ bản đồ OSM)**: Việt Tower, Novotel Thái Hà, các nhà ga Metro 2A trên cao (Ga Thái Hà, Ga La Thành), cùng toàn bộ các cao ốc có tên nổi bật trên bản đồ (VPBank Tower, Green Diamond, Tòa nhà 101 Láng Hạ, Vinaconex Tower, MIPEC Tower, T&T Capella, D'Le Pont D'or, PeakView Tower, Hoàng Cầu Skyline, Oriental Tower, TTG Tower, Vincom Phạm Ngọc Thạch, OCD Plaza…).
      2. **Mẫu kiến trúc Hà Nội (trên đế)**: 5 mẫu đặc trưng dựng ở mức chi tiết cao nhất `L3` (nhà ống mặt phố kinh doanh 4 tầng, quán cà phê phố cổ điển 3 tầng, nhà ống hiện đại lệch tầng 5 tầng, nhà phố mái tôn chống nóng 3 tầng, nhà tập thể cũ Hà Nội 5 tầng).
    - `buildShowcase(city, id)` dịch chuyển mặt bằng công trình về tâm `(0, 0)` ở mức `L3` và đặt lên đế mô hình vát góc 2 tầng kiểu `iso-glow` (`drawPlate`: viền chỉ chìm `detail`, 4 ốc vặn 8 cạnh ở 4 góc đế, đoạn đường nhựa phía trước có vạch phân làn nét đứt, vỉa hè lát gạch nổi 16 cm, cột đèn đường + đèn vườn có vùng sáng ban đêm và hàng cây 3D). Với nhà ga Metro, dựng đoạn cầu cạn, nhà ga 3 tầng và đoàn tàu 4 toa đỗ tại sân ga.
    - Dùng chung toàn bộ pipeline `Batch` / `Layer` với bản đồ nên đổi Ngày/Đêm, glow, tỉ lệ cửa sáng và click từng tầng bật/tắt đèn đều hoạt động nguyên vẹn.
  - **Mở rộng vùng dữ liệu OSM (`nga-tu-thai-ha`)**:
    - Mở rộng `packages/osm-data/data/areas.json` (5 hộp tọa độ chồng lấp tải về 1 tệp `nga-tu-thai-ha.osm.json`, 51.530 node, 11.605 way, 235 relation) và `packages/osm-import/src/area-nga-tu-thai-ha.ts` (10 hình chữ nhật hành lang) bao phủ: **Ngã Tư Sở**, **Tây Sơn – Nguyễn Lương Bằng**, **Ô Chợ Dừa**, **Xã Đàn**, **Chùa Bộc – Phạm Ngọc Thạch**, **Thái Hà – Huỳnh Thúc Kháng**, **Hoàng Cầu – Hồ Hoàng Cầu**, và **Láng Hạ**.
    - Thêm dropdown **Khu vực** trên thanh công cụ để bay nhanh tới từng khu phố và nhà ga trên bản đồ.
    - Tối ưu tốc độ nạp và dựng cho bản đồ lớn: lưới không gian 64 m cho đường mặt tiền (`import.ts`, `buildings.ts`), lọc hộp bao trước khi kiểm tra `building:part` (`import.ts`), và lưới 32 m cho kiểm tra lòng đường (`core/furniture.ts`).

---

## Câu hỏi mở

| # | Câu hỏi | Khi nào cần | Đang dùng |
|---|---|---|---|
| ~~Q1~~ | ~~Mét hay 1 m = 10?~~ | — | Đã chốt: mét (ADR-033) |
| ~~Q2~~ | ~~Gỡ trang thử 3D cũ khỏi app SVG?~~ | — | Đã chốt: giữ để đối chiếu, xóa khi `city3d` thay được (ADR-033) |
| Q3 | Ga Thái Hà thật: chiều cao các tầng, hình mái, vị trí lối lên? | Khi có ảnh | Đang ước lượng (ADR-042); người dùng gửi ảnh để chỉnh |
