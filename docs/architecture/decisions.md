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

### ADR-049 · Tối ưu cảm ứng và tốc độ khung hình trên thiết bị di động (Mobile Touch)
- **Trạng thái**: Đã chốt (2026-10-21, người dùng phản hồi: "sửu dụng trên mobile cảm ứng không mượt lắm")
- **Bối cảnh**: Sau khi mở rộng bản đồ lên 7 khu phố (~180 ô nhà, ~700 xe), trên điện thoại cảm ứng xuất hiện độ trễ và giật khung hình khi vuốt/chụm 2 ngón do: (1) `dampingFactor` mặc định `0.05` làm bản đồ bám ngón tay trễ; (2) `zoomToCursor = true` trên cảm ứng lấy tọa độ ngón đầu tiên làm tâm phóng khiến chụm 2 ngón bị trôi lệch ngang, và `TOUCH.DOLLY_ROTATE` ở chế độ 2D khóa luôn thao tác kéo 2 ngón; (3) `detailStep()` biên dịch ô nhà L2/L3 mới ngay giữa lúc đang vuốt và biên dịch cả các ô ngoài `viewDistance`; (4) `EffectComposer` + `HalfFloatType` MSAA chạy cả ở chế độ Ban ngày khi `bloom` đang tắt; (5) `trafficStep()` biến đổi và đẩy toàn bộ xe ngoài `viewDistance` lên GPU; (6) thiết bị di động mặc định mở ở mức `Cao` (`pixelRatio: 2`, `viewDistance: 0`) và mở sẵn bảng cài đặt chiếm 40% màn hình.
- **Quyết định**:
  - **Cảm ứng `OrbitControls` (`CityView.ts`)**:
    - Tăng `dampingFactor = 0.18`, `zoomSpeed = 1.15` để bản đồ bám sát ngón tay ngay lập tức mà vẫn có quán tính mượt.
    - Chế độ **2D** đặt `touches.TWO = THREE.TOUCH.DOLLY_PAN` (vừa chụm phóng to/thu nhỏ vừa rê 2 ngón); chế độ **3D** đặt `touches.TWO = THREE.TOUCH.DOLLY_ROTATE` (chụm phóng + xoay/nghiêng).
    - Tự tắt `zoomToCursor` khi bắt đầu chạm (`touchstart` / `pointerdown` với `touch`) để chụm 2 ngón phóng quanh tâm nhìn không bị giật lệch ngang, và bật lại khi dùng chuột (`wheel` / `pointerType === 'mouse'`).
    - Hỗ trợ **chạm đúp (double-tap)** (2 lần chạm trong `300 ms`, bán kính `28 px`) để bay tới vị trí trên mặt đất trên điện thoại (trình duyệt di động chặn `dblclick` khi `touch-action: none`), và nới ngưỡng nhận diện chạm đơn lên `10 px` để chạm bật/tắt đèn tầng dễ dàng.
  - **Nhịp khung hình & GPU (`CityView.ts`, `quality.ts`)**:
    - Tạm hoãn biên dịch ô nhà mới (`ensure(near, want)`) trong lúc ngón tay đang chạm/kéo (`interacting` + `140 ms` sau thao tác), và chỉ dựng các ô nằm trong `viewDistance` (`nearTile`). Lúc khởi tạo chỉ dựng trước các ô trong tầm nhìn thay vì dựng toàn bộ 180 ô.
    - Khi `bloom.enabled === false` (mặc định ban ngày hoặc khi tắt glow), vẽ trực tiếp qua `renderer.render(scene, camera)` với phần cứng `antialias: true`, bỏ qua hoàn toàn render target `HalfFloatType` và `OutputPass` của `EffectComposer`.
    - Trong `trafficStep`, gom các xe nằm trong `viewDistance` lên đầu `InstancedMesh` (`o.count = vis`) và chỉ biến đổi/cập nhật buffer nét cạnh cho các xe đang hiển thị (`vehicleLines.geometry.instanceCount = k / 6`).
    - Thiết bị cảm ứng / màn hình nhỏ (`isMobileDevice()`, `VERSION = 3`) mặc định dùng mức **Trung bình** (`pixelRatio: 1.5`, `viewDistance: 250 m`, cây đơn giản, nhà L2) và mặc định đóng bảng cài đặt bên phải khi mới mở trang (`App.tsx`), kèm `overscroll-behavior: none`, `user-select: none` và bố cục thanh công cụ gọn trên màn hình hẹp (`app.css`, `index.html`).
    - Mở rộng mức thu nhỏ tối đa gấp 3 lần (`controls.minZoom = 0.16`, camera near/far `-5000 .. 7000`), tự mở rộng bán kính hiển thị ô nhà theo khung nhìn (`tileRange`) ở mức khối `L0`, và ẩn dần toàn bộ chi tiết nhỏ/xe cộ/cây xanh theo các ngưỡng `FAR` (`furniture`, `details`, `vehicles`, `trees`, `creases`, `silhouette`).

### ADR-050 · Kiến trúc chi tiết nhà ga Metro 2A trên cao theo ảnh thực tế (trụ đôi xà mũ cánh hẫng, cổng sảnh mở, cầu bộ hành, tháp thang máy và cầu thang/thang cuốn mái vòm)
- **Trạng thái**: Đã chốt (2026-10-22, người dùng gửi 3 ảnh thực tế nhà ga tuyến Cát Linh – Hà Đông và góp ý: "cái nhà ga metro đang vẽ không được chi tiết lắm ở phần dưới chân nhà ga, đường đi bộ đi lên")
- **Bối cảnh**: Nhà ga Metro cũ trong `metro.ts` chỉ dựng 8 cột vuông mảnh nằm giữa lòng đường, hộp sảnh kín bốn mặt và hai cầu thang trần đâm thẳng từ hông sảnh xuống giữa lòng đường với một tấm mái phẳng đơn giản.
- **Quyết định**:
  - **Chân cầu cạn và chân nhà ga dưới mặt đường (`metro.ts`)**:
    - Dải phân cách bê tông có gờ bó vỉa (`0 .. 0,34 m`) và bồn cây xanh (`plant`, `0,34 .. 0,78 m`) chạy dọc dưới gầm trụ cầu cạn và gầm nhà ga.
    - Trụ cầu cạn ngoài ga: thân trụ bê tông vát 8 cạnh trên bệ móng, đỉnh trụ là **mũ trụ chữ T loe vát nghiêng 2 cánh** kèm gối cầu (`metal`) đỡ hai dầm hộp.
    - Dưới nhà ga: **5 nhịp trụ đôi bê tông lớn ở dải phân cách giữa đường** (có khe giữa gắn ống thoát nước đứng), đỡ **xà mũ ngang cánh hẫng (`cantilever crosshead`) vát chéo đáy** vươn rộng sang hai mép sảnh cùng **hệ 7 dầm dọc và ô cờ trần tối dưới gầm sàn sảnh**, để hai làn đường bộ lưu thông thoáng bên dưới như thực tế.
  - **Tầng trung chuyển (`z = 6 .. 10 m`), cổng sảnh mở & mái vòm chữ C**:
    - Hai đầu nhà ga có **hành lang sảnh mở (`open loggia portal`)** hai bên dầm đường ray với **lan can kính tay vịn kim loại**, trần sảnh gắn **dãy đèn huỳnh quang phát sáng**, phía trên nhô **hộp bảng tên ga** và **hai khối vuông trang trí họa tiết hình thoi/tam giác xanh-trắng đan chéo** đặc trưng của tuyến 2A.
    - Hai bên hông sảnh có dải cửa sổ kính chia đố và **mái hắt ngang bằng khung lam thép**; tầng sân ga có **vách lam xanh nghiêng** và **hai vỏ mái cong chữ C dày** ôm lên đỉnh nối với **khung kèo vòm thép hở và dải mái kính lấy sáng ở giữa**.
  - **Hệ thống đường đi bộ đi lên từ hai bên vỉa hè (4 cụm lối lên xuống)**:
    - Từ hai bên tầng sảnh (`z = 6 m`), **4 cầu bộ hành trên cao có dầm thép, mái che và lan can kính trong suốt** vươn ngang qua lòng đường ra hai vỉa hè.
    - Tại đầu cầu bộ hành trên vỉa hè: **tháp chiếu nghỉ & thang máy đứng từ mặt đất lên sảnh** (có cửa thang máy inox ở tầng trệt, bảng đèn báo và buồng kính tầng trên).
    - Từ tháp chiếu nghỉ, **cầu thang bộ + thang cuốn dài chạy dọc theo vỉa hè xuống đất**, có **tường chắn hai bên xây bậc giật cấp màu trắng** (nửa trên lộ dầm nghiêng dưới gầm, nửa dưới xây kín có phòng kỹ thuật), **bậc tam cấp và hai bệ tường thấp đón ở chân thang**, **đôi tay vịn thang cuốn chạy dọc độ dốc**, **mái vòm cong nửa trụ bằng tấm lấy sáng trên hệ khung cột thép** uốn dọc theo độ dốc cầu thang và **mái vòm đón cong vươn ra ở cửa lên xuống dưới chân thang** kèm giàn thép chữ X.

### ADR-051 · Nhìn xuyên công trình (See-Through), đồng bộ URL kiểu Google Maps và hiển thị hệ thống các tòa nhà trọng điểm (Always-Visible Landmarks)
- **Trạng thái**: Đã chốt (2026-10-23)
- **Bối cảnh**: Người dùng yêu cầu: (1) tàu Metro chạy đúng tốc độ thực tế (~80 km/h tối đa, ≥ 35 km/h trung bình); (2) nhìn xuyên vào bên trong ga tàu khi zoom ≥ 8 và nhìn xuyên qua tòa nhà che khuất bằng hiệu ứng stipple Bayer 4×4 khi zoom ≥ 12 (mặc định bật); (3) nhấp đơn bật/tắt đèn tầng, nhấp đúp mở bảng thông tin tòa nhà (có nút bóng đèn góc trên), chỉ hiện tooltip khi zoom đủ gần; (4) đồng bộ vị trí, góc nhìn, mức zoom và công trình/địa điểm lên URL giống Google Maps (`#@lat,lon,zoom,...`); (5) khắc phục triệt để lỗi một số công trình lớn (Rạp Chiếu Phim Quốc Gia, VPBank Tower…) lúc hiện lúc ẩn do giới hạn `viewDistance` hoặc ngân sách dựng 1 ô/khung hình.
- **Quyết định**:
  - **Tốc độ tàu Metro (`core/rail.ts`)**: Nâng tốc độ hành trình lên `17,5 m/s` (~63 km/h, đạt đỉnh ~75–80 km/h giữa chặng), thời gian dừng ga `18 s`, gia tốc `1,25 m/s²`, đảm bảo tốc độ khai thác trung bình ≥ 38 km/h.
  - **Nhìn xuyên (`view/seeThrough.ts`, `render/metro.ts`)**: Mặc định bật (`seeThrough: true`). Với ga Metro (zoom ≥ 8), chỉ cắt bớt phần mái vòm và vách chắn phía hướng về camera để lộ sảnh, sân ga và đoàn tàu bên trong. Với tòa nhà chắn tầm nhìn (zoom ≥ 12), dùng `discard` theo ma trận Bayer 4×4 trên các tam giác thuộc tòa nhà đang che tâm nhìn để thấy rõ không gian phía sau mà không làm sai lệch chiều sâu.
  - **Đồng bộ URL (`view/urlState.ts`)**: Đọc khi mở trang và cập nhật `history.replaceState` (debounce 280 ms) theo định dạng `#@lat,lon,zoomz,3d,azdeg,eldeg?place=...&bldg=...&night=1` tương thích phong cách Google Maps.
  - **Hiển thị hệ thống các tòa nhà trọng điểm (`CityView.ts`, `render/city.ts`)**: Mọi ô (`tile`) chứa công trình trọng điểm (`model != null`, `height >= 32 m`, hoặc có tên và `height >= 16 m`) được đánh dấu `landmarkTileKeys`, dựng ngay ở `L1` khi khởi tạo, luôn hiển thị bất kể khoảng cách `viewDistance` (không bị cắt bởi sương mù/culling), và được ưu tiên nâng cấp `L2/L3` trước các ô nhà thường trong `detailStep`.

### ADR-052 · Tái cấu trúc mô-đun hóa, tách biệt dữ liệu đa thành phố, tách hằng số (`constants`), đa ngôn ngữ (`i18n`) và hệ thống Extension / SDK
- **Trạng thái**: Đã chốt (2026-10-23, người dùng yêu cầu: "source code hiện tại có vẻ chưa đảm bảo convention, scaleable, maintainable. ok làm tất cả đi. nhớ tách riêng constant nào có thể tách riêng nữa. language nữa nhé. nếu sau bổ sung thêm những tính năng như kiểu extension để cài cắm hay api hoặc sdk tích hợp thì cần chuẩn bị trước gì thì tính dần nhé.")
- **Bối cảnh**: Trước khi tái cấu trúc, `CityView.ts` dài hơn 2.600 dòng chứa cả hằng số, chuỗi tiếng Việt, DOM popup, shader nhìn xuyên và điều khiển camera; đồng thời `import.ts`, `showcase.ts` và `placeInfo.ts` còn gắn cứng các ID `osm:way/...` và tên quận của riêng khu Thái Hà – Hà Nội, cản trở việc mở rộng sang nhiều khu vực/thành phố khác hoặc tích hợp plugin bên ngoài.
- **Quyết định**:
  - **Mô hình dữ liệu đa thành phố (`packages/core`, `packages/osm-import`, `packages/osm-data`)**:
    - Bổ sung các trường siêu dữ liệu tổng quát vào `Building`, `Station`, `Feature`, `CityModel` (`district`, `description`, `isSignatureLandmark`, `isSecondaryTwin`, `lineTag`, `lineName`, `cityName`, `places?: CityPlace[]`).
    - Toàn bộ dữ liệu đặc thù của khu vực Thái Hà (tên quận, thuyết minh lịch sử, tuyến tàu, danh sách địa điểm bay tới) được chuyển về `area-nga-tu-thai-ha.ts`. `import.ts` và `showcase.ts` hoạt động hoàn toàn dựa trên dữ liệu cấu hình (`AreaConfig`), không còn bất kỳ ID `osm:way/...` gắn cứng nào.
    - Bổ sung API nạp bất đồng bộ (`loadAreaAsync`, `loadCityAsync`, `registerAreaConfig`) để sẵn sàng tải động dữ liệu từng khu vực/thành phố theo yêu cầu.
  - **Tách mô-đun trong `apps/city3d/src/view/`**:
    - [`constants.ts`](../../apps/city3d/src/view/constants.ts): Tập trung toàn bộ hằng số camera, góc nhìn, ngưỡng zoom, tốc độ phím, thời gian bay, ngưỡng tương tác cảm ứng, màu đèn hiệu, khóa `localStorage`, và ngưỡng nhìn xuyên.
    - [`i18n.ts`](../../apps/city3d/src/view/i18n.ts): Hệ thống đa ngôn ngữ nhẹ có kiểu tĩnh (`Locale = 'vi' | 'en'`), hỗ trợ dịch giao diện (`t()`), dịch thông tin địa điểm (`localizePlaceText`), lưu trữ ngôn ngữ trong `localStorage` và chuyển đổi trực tiếp trên thanh công cụ (`VI / EN`).
    - [`seeThrough.ts`](../../apps/city3d/src/view/seeThrough.ts): Tách riêng bộ quản lý shader cắt mặt phẳng ga tàu và Bayer 4×4 stipple cho tòa nhà (`SeeThroughController`).
    - [`overlayDom.ts`](../../apps/city3d/src/view/overlayDom.ts): Tách riêng việc khởi tạo và cập nhật DOM cho biển tên 3D, tooltip khi di chuột và bảng thông tin chi tiết công trình (hỗ trợ cả các nút hành động mở rộng từ Extension).
  - **Kiến trúc SDK & Extension / Plugin (`apps/city3d/src/view/sdk.ts`)**:
    - Cung cấp `CitySDK` (`view.sdk` và `window.MyCitySDK`) làm giao diện lập trình công khai ổn định: điều khiển camera (`flyToWorld`, `flyToGeo`, `flyToBuilding`, `flyToPlace`, `setViewMode`, `setShowcase`, `setPovMode`), trạng thái giao diện (`setNightMode`, `setSeeThrough`, `setQualityPreset`, `setLocale`), truy vấn mô hình (`getCity`, `getBuildingById`, `getBuildings`, `getPlaces`), hệ thống sự kiện có kiểu (`on('camera:change' | 'building:hover' | 'building:select' | 'place:select' | 'theme:change' | 'locale:change' | 'pov:change' | 'tick', ...)`), lớp cảnh 3D riêng cho plugin (`getExtensionSceneGroup()`), và đăng ký nút hành động tùy chỉnh trong popup công trình (`registerPopupAction`).
    - Hỗ trợ cài cắm `CityExtension` (`registerExtension`, `unregisterExtension`, `getExtensions`) với vòng đời `onMount(sdk)` / `onTick(dt, sdk)`.

### ADR-053 · Góc nhìn nhập vai phối cảnh (`povCamera`), tự cầm lái ô tô (Cabin & Trên cao), tối ưu Frustum-Cone Culling và định hướng kiến trúc Theme vs. Vernacular Profile
- **Trạng thái**: Đã chốt (2026-10-23, người dùng yêu cầu: "đồng ý vụ povcamera. nếu lái ô tô thì có thể tự điều khiển xe để đi (view trong cabin và view từ trên xuống). ngồi xe ô tô 2 tầng để nó tự chạy và ngồi trên có thể ngắm được toàn cảnh xung quanh (cái này có thể để sau, khi mở rộng thêm bản đồ). nhưng tất cả những cái này sẽ phải tính đến vấn đề hiệu năng và làm sao để tối ưu. sau này tôi sẽ muốn có thêm dạng theme cho thành phố này, cái này sẽ ghi vào lộ trình phát triển sau, ví dụ về theme thì có thể là thay đổi màu sắc, nhưng cũng có thể thay đổi phong cách, kết cấu các tòa nhà... hoặc mở rộng 1 cái khác nữa là, ví dụ sau làm các thành phố ở các nước khác, thì các nhà cơ bản, tòa nhà sẽ có hình dạng đặc thù của đất nước đó (cái này là 1 tính năng khác với theme nhé)")
- **Bối cảnh**: Chế độ bản đồ mặc định dùng `OrthographicCamera` chiếu song song nên không thể đặt camera vào bên trong toa tàu hay ghế lái ô tô. Khi bổ sung `PerspectiveCamera` ở tầm mắt người và chế độ tự lái xe, góc nhìn ngang nhìn xuyên dọc đại lộ có thể kéo nhiều ô nhà vào khung hình, đòi hỏi cơ chế cắt tỉa (culling) và phân tầng mức chi tiết (LOD) chặt chẽ để giữ vững 60 FPS. Đồng thời, cần phân tách rõ trong kiến trúc dữ liệu giữa **Theme phong cách/kết cấu (Style Theme)** và **Hình thái kiến trúc đặc thù theo quốc gia (Vernacular Architecture Profile)**.
- **Quyết định**:
  - **Bộ điều khiển POV & Lái xe tương tác (`apps/city3d/src/view/povController.ts`)**:
    - Dùng `THREE.PerspectiveCamera` độc lập song song với `OrthographicCamera` của bản đồ, chuyển đổi tức thì qua `activeCamera()` và đồng bộ với `RenderPass` của `EffectComposer`.
    - **4 chế độ POV hiện có** (chọn từ menu **Trải nghiệm POV (P)** trên thanh công cụ hoặc phím `P`):
      1. `metro-cab` (**Lái tàu Metro**): Ngồi tại buồng lái đầu đoàn tàu 2A (`FOV = 62°`), tự động ẩn vỏ toa đầu của đoàn tàu đang ngồi để không cản tầm nhìn, liên tục bám theo vị trí và hướng tiếp tuyến đường ray (`trainAt` có tự động cuộn qua pha nghỉ cuối chu kỳ để trải nghiệm không bị ngắt quãng), hỗ trợ đổi đoàn tàu (`Tab`) và kéo chuột/cảm ứng để quan sát xung quanh (`C` để nhìn thẳng lại).
      2. `metro-passenger` (**Ngồi tàu Metro**): Ngồi ghế hành khách cạnh cửa sổ toa 2 (`FOV = 68°`), nhìn ngang xuống phố phường và các tòa cao ốc, hỗ trợ đổi bên cửa sổ trái/phải và xoay đầu quan sát.
      3. `drive-cabin` (**Lái ô tô - Cabin**): Tự cầm lái ô tô từ ghế tài xế (`FOV = 65°`, cao `1,28 m`).
      4. `drive-top` (**Lái ô tô - Trên cao**): Tự cầm lái ô tô với góc nhìn đuổi theo từ trên cao phía sau xe (`FOV = 54°`), hiển thị mô hình 3D xe sedan của người chơi (có đèn pha chiếu sáng ban đêm) và camera tự trôi mượt theo góc cua của xe (`V` để đổi nhanh giữa Cabin ↔ Trên cao).
    - **Vật lý lái xe & nội suy cao độ cầu vượt**: Mô hình lái xe đạp (`bicycle steering model`) với chân ga/phanh mượt (`W/S` hoặc `↑/↓`), đánh lái trả vô-lăng tự động (`A/D` hoặc `←/→`), phanh tay (`Space`), cùng bàn phím cảm ứng (Steer/Throttle/Brake) ngay trên màn hình cho thiết bị di động. Xe tự động bắt vào làn đường chính gần tâm bản đồ nhất khi khởi tạo và tự động leo lên/xuống mặt cầu vượt (`layer > 0`) nhờ nội suy cao độ & góc chúi (`pitch`) trên các đoạn cầu (`sampleRoadElevation`).
  - **Tối ưu hiệu năng cho góc nhìn phối cảnh (`povController.ts`, `CityView.ts`)**:
    - **Frustum-Cone Culling 2D trên mặt phẳng đất (0 cấp phát bộ nhớ/frame)**: Mọi ô nhà (`64×64 m`), ô đồ phố (cây cối, cột điện, dây điện), xe cộ giao thông và nhãn chữ 3D nằm phía sau lưng camera hoặc nằm ngoài hình nón trường nhìn (`cos(angle) < -0.15`) đều bị ẩn ngay lập tức (`visible = false`), giảm ~65–75% số lệnh vẽ khi nhìn dọc phố.
    - **Phân tầng mức chi tiết theo khoảng cách tới camera (`tileDetailInPov`)**: Trong chế độ POV, chỉ các ô nhà cách camera `≤ 135 m` mới giữ chi tiết `L3`, từ `135–260 m` dùng `L2`, và `> 260 m` dùng `L1` (vẫn giữ trọn vẹn khối dáng và cửa sổ sáng ban đêm nhưng bỏ các chi tiết nhỏ ở xa mắt), kết hợp giới hạn bán kính đồ phố (`220 m`), xe cộ (`240 m`) và biển tên (`220 m`).
  - **Tách biệt kiến trúc giữa Theme và Vernacular Profile (`packages/core/src/city.ts`) & Lộ trình phát triển**:
    - Định nghĩa rõ hai khái niệm độc lập trong `@my-city/core`:
      1. `CityStyleThemeId` (**Theme phong cách & kết cấu — "Cách vẽ / Chất liệu"**): Áp dụng cho bất kỳ thành phố nào để thay đổi bảng màu, hiệu ứng kết cấu bề mặt (gạch, bê tông, kính neon, bản vẽ kỹ thuật, mô hình đất sét) và kiểu nét vẽ (`iso-glow`, `cyberpunk-neon`, `retro-heritage`, `blueprint-wire`, `clay-maquette`).
      2. `VernacularProfileId` (**Kiến trúc bản địa theo quốc gia — "Cấu trúc hình học cơ sở"**): Gắn với từng thành phố (`city.vernacularProfile`) để bộ sinh nhà cơ bản (`house.ts` / `buildings.ts`) tạo ra đúng hình thái kiến trúc đặc trưng của quốc gia đó (`vn-tube-shophouse` cho nhà ống Việt Nam, `jp-machiya-lowrise` cho nhà phố Nhật Bản, `eu-perimeter-mansard` cho khối nhà mái Mansard châu Âu, `us-brownstone-row` cho nhà liền kề bậc thềm Bắc Mỹ).
    - Ghi nhận tính năng **Xe buýt 2 tầng tham quan tự hành (`tour-bus`)** vào lộ trình phát triển khi mở rộng bản đồ sang nhiều khu phố hơn.

### ADR-054 · Quy chuẩn vẽ riêng di tích/công trình biểu tượng (Rule A16), hệ thống cờ dùng chung đa quốc gia (< 250 m), tái thiết kế Khuê Văn Các, ranh giới hành chính Phường/Hà Nội và mở rộng 6 khu vực nội đô
- **Trạng thái**: Đã chốt (2026-10-24, người dùng yêu cầu: quy tắc bắt buộc đầu tư vẽ riêng tử tế các di tích, tượng đài, chùa, đền, lăng tẩm, công trình biểu tượng khi mở rộng bản đồ; lá cờ dùng chung đa quốc gia, chỉ hiện khi zoom dưới 250 m và tối ưu hiệu năng; vẽ lại Khuê Văn Các chi tiết chuẩn biểu tượng Hà Nội; hiện đường nét đứt địa giới các Phường + tên Phường ở giữa và địa giới Hà Nội + tên Hà Nội ở giữa khi zoom xa; mở rộng thêm Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân theo cấp Phường)
- **Quyết định**:
  1. **Quy tắc bắt buộc đầu tư kiến trúc 3D cho di tích, đền chùa, tượng đài & công trình biểu tượng (`Rule A16` trong `docs/ai/README.md`)**:
     - Mọi đợt mở rộng bản đồ hoặc nâng cấp giao diện đều bắt buộc rà soát và dựng mô hình 3D riêng chuẩn xác cho toàn bộ di tích lịch sử, tượng đài, công trình kiến trúc biểu tượng, đồng thời tự động suy luận mô hình kiến trúc truyền thống/tôn giáo (`traditional-pagoda`, `traditional-temple`, `church-hall`, `traditional-mausoleum`) cho tất cả chùa, đền, đình, miếu, phủ, nhà thờ, lăng tẩm trong dữ liệu OSM.
  2. **Hệ thống lá cờ dùng chung đa quốc gia & tối ưu hiệu năng `< 250 m` (`apps/city3d/src/render/flags.ts`)**:
     - Tách riêng phần cột cờ (vẽ theo từng công trình) và phần vải cờ tung bay dùng chung (`SHARED_CLOTH_GEOS` gồm 3 pha sóng dùng chung cho mọi lá cờ trên toàn bản đồ, cộng với bộ đăng ký chất liệu cờ đa quốc gia `getFlagMaterial` / `registerFlagPainter` hỗ trợ `'vn'`, `'festive'` cờ hội ngũ sắc truyền thống tại đền/chùa, `'asean'`, `'fr'`, `'jp'`, `'kr'`, `'us'`, `'ru'`).
     - Lá cờ chỉ hiển thị khi phạm vi nhìn/khoảng cách `<= 250 m` (`MAX_FLAG_VIEW_SPAN_M = 250`, tương ứng `camera.zoom >= 2.4` trên bản đồ). Khi zoom xa trên `250 m`, toàn bộ lá cờ được ẩn (`visible = false`) và bỏ qua hoàn toàn bước cập nhật đỉnh sóng CPU/GPU (`0` chi phí mỗi khung hình).
  3. **Tái thiết kế chi tiết Khuê Văn Các – Biểu tượng Thủ đô Hà Nội (`drawKhueVanCac` trong `apps/city3d/src/render/landmarks.ts`)**:
     - Dựng chuẩn xác theo 2 ảnh thực tế: nền gạch Bát Tràng 2 cấp có bậc đá tam cấp trước/sau; 4 trụ biểu vuông bằng đá chạm tứ linh ở tầng dưới có chân đế – cổ bồng và ô hộc chạm nổi 4 mặt; sàn gỗ sơn son thếp vàng cùng hệ lan can gỗ con tiện 4 mặt có trụ búp sen; tầng gác gỗ sơn son với cửa sổ tròn **Sao Khuê** 2 vòng đồng tâm và **8 đôi tia sáng kép** tỏa ra bốn phía hướng tâm, bên trong treo đèn lồng/chuông đồng cổ, mặt ngoài treo bức hoành phi *"Khuê Văn Các"*, đôi câu đối và hệ con sơn chồng rường; mái ngói ống 2 tầng 8 mái (`chồng diêm`) có hàng ngói ống nổi, cổ diềm chạm ô hộc, 8 đầu đao cong vút và bờ nóc đắp **Lưỡng long chầu nguyệt**.
  4. **Đường nét đứt địa giới hành chính & nhãn tên căn giữa (`apps/city3d/src/view/adminBoundaries.ts`)**:
     - Ở mức zoom xem các phường (`0.26 <= zoom <= 1.45`): hiển thị đường nét đứt chỉ địa giới của **15 Phường** (`Phường Hoàn Kiếm`, `Phường Cửa Nam`, `Phường Tây Hồ`, `Phường Ba Đình`, `Phường Ngọc Hà`, `Phường Giảng Võ`, `Phường Văn Miếu – Quốc Tử Giám`, `Phường Ô Chợ Dừa`, `Phường Đống Đa`, `Phường Kim Liên`, `Phường Láng`, `Phường Hai Bà Trưng`, `Phường Bạch Mai`, `Phường Thanh Xuân`, `Phường Khương Đình`) và đặt tên Phường nằm chính giữa mỗi phường.
     - Ở mức zoom xa toàn thành phố (`zoom < 0.26`): hiển thị đường nét đứt địa giới bao ngoài của **Hà Nội** và nhãn **"HÀ NỘI"** nằm chính giữa bản đồ.
  5. **Mở rộng bản đồ sang Hoàn Kiếm, Tây Hồ, Hai Bà Trưng, Thanh Xuân (`packages/osm-data`, `packages/osm-import`)**:
     - Tải dữ liệu thực tế từ OpenStreetMap cho toàn bộ 6 khu vực trung tâm Hà Nội và dựng mô hình 3D riêng cho các công trình biểu tượng mới: **Tháp Rùa**, **Đền Ngọc Sơn (Cầu Thê Húc – Tháp Bút)**, **Nhà hát Lớn Hà Nội**, **Nhà thờ Lớn Hà Nội**, **Tràng Tiền Plaza**, **Ô Quan Chưởng**, **Chợ Đồng Xuân**, **Di tích Nhà tù Hỏa Lò**, **Bảo tàng Lịch sử Quốc gia**, **Chùa Quán Sứ**, **Tượng đài Vua Lý Thái Tổ**, **Chùa Trấn Quốc (Bảo tháp Lục độ đài sen)**, **Đền Quán Thánh**, **Phủ Tây Hồ**, **Cụm di tích Đền Hai Bà Trưng**, **Vincom Center Bà Triệu**, **Vinhomes Royal City (R1–R6)**, **Tổ đình Phúc Khánh** và **Đình Khương Hạ**.

---

## Câu hỏi mở

| # | Câu hỏi | Khi nào cần | Đang dùng |
|---|---|---|---|
| ~~Q1~~ | ~~Mét hay 1 m = 10?~~ | — | Đã chốt: mét (ADR-033) |
| ~~Q2~~ | ~~Gỡ trang thử 3D cũ khỏi app SVG?~~ | — | Đã chốt: giữ để đối chiếu, xóa khi `city3d` thay được (ADR-033) |
| ~~Q3~~ | ~~Ga Thái Hà thật: chiều cao các tầng, hình mái, vị trí lối lên?~~ | — | Đã chốt theo 3 ảnh thực tế người dùng gửi (ADR-050) |


