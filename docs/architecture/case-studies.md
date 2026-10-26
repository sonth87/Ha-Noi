# Bài học từ sự cố (case study)

Mục đích: mỗi lần một lỗi "đã sửa mà lại hỏng ở chỗ khác" xảy ra, ghi lại **vì sao nó lặp lại** và biến nó thành **luật cụ thể có test cưỡng chế**, để lần sau không phải sửa từng chỗ. Luật nằm ở [docs/ai/README.md](../ai/README.md) mục 3 (A17–A37); cách làm cụ thể ở [guidelines](../ai/guidelines.md). Mỗi case ghi: triệu chứng → nguyên nhân gốc → vì sao lặp lại → cách sửa → luật → rào chắn (test).

Mẫu để thêm case mới ở cuối file. Một sự cố chỉ được coi là xong khi có **luật và rào chắn**, không chỉ bản sửa.

---

## CS-01 · Dữ liệu bịa trong dữ liệu gốc (2026-10-26, ADR-058)
- **Triệu chứng**: đường Nguyễn Văn Cừ nằm giữa sông; Hồ Tây "tràn"; Cầu Long Biên lệch ~500 m; các địa điểm và công trình ở sai chỗ 0,5–2,5 km.
- **Nguyên nhân gốc**: `skeleton.osm.json` chứa 85 phần tử id `99…` do tay thêm với toạ độ ước chừng: "Sông Hồng" là đa giác 14 điểm rộng 17,5 km², đường trục chính 3–5 điểm, hồ/công viên hộp 4 điểm, 37 "công trình" hộp nhỏ. Cả `places.ts` và ranh giới phường (hộp chữ nhật) cũng viết tay.
- **Vì sao lặp lại**: mỗi lần thấy lỗi người ta chỉnh toạ độ hoặc code vẽ cho khớp (ADR-057 sửa "Sông Hồng" bằng cách chỉnh lại toạ độ bịa), trong khi dữ liệu sai vẫn nằm đó và gây lỗi ở chỗ khác. Dữ liệu bịa còn *che* thứ thiếu thật: sông Hồng thật bị bỏ qua vì đã có "sông" bịa.
- **Sửa**: xoá hết, thay bằng OSM thật (Overpass); công trình không có trong OSM thì xoá (không có dữ liệu còn hơn dữ liệu sai); địa điểm lấy theo phần tử OSM; phường dùng đa giác OSM.
- **Luật**: A17 (nguồn gốc dữ liệu), A18 (không "sửa cho khớp").
- **Rào chắn**: `osm-import/src/geography.test.ts` (không còn id `99…`, sông là nước thật, Nguyễn Văn Cừ ven bờ, mọi địa điểm gần phần tử có tên thật, quận theo đa giác thật).

## CS-02 · Toạ độ tuyệt đối trong code vẽ (ADR-058)
- **Triệu chứng**: Tháp Bút và Cầu Thê Húc "bay ra giữa hồ" dù đã được yêu cầu sửa.
- **Nguyên nhân gốc**: `drawDenNgocSon` dùng toạ độ tuyệt đối (3813, 1494) của hệ toạ độ cũ. Khi gốc bản đồ đổi, điều kiện `onRealMap` sai âm thầm và code rơi sang nhánh diorama.
- **Vì sao lặp lại**: không có lỗi nào được báo, chỉ có hình sai; người sửa không biết hằng số đó nằm ở đâu.
- **Sửa**: vị trí các hạng mục là độ lệch so với tâm đền (`NGOC_SON_MAP_CENTRE`), đo từ OSM.
- **Luật**: A19 (neo theo phần tử, không theo toạ độ tuyệt đối).
- **Rào chắn**: `render/hygiene.test.ts` (quét mã nguồn, chỉ file trong danh sách cho phép mới có cặp `[x, y]` 3–5 chữ số), `render/placement.test.ts` (mỏ neo khớp dữ liệu).

## CS-03 · Cầu: mỗi đoạn OSM một mặt cắt riêng (ADR-058)
- **Triệu chứng**: cầu nhấp nhô, đầu cầu "cụt", vòng xuyến lộn xộn, to nhỏ tuỳ tiện.
- **Nguyên nhân gốc**: một cây cầu OSM gồm nhiều đoạn; importer gán *từng đoạn* mặt cắt 0 → 6 m → 0 (tụt xuống đất ở mọi chỗ nối) và bề rộng riêng (3,25 / 6,5 / 9,75 / 13 m) theo thẻ `lanes` (thường thiếu hoặc sai), nên chỗ nối nhảy bề rộng và lan can đoạn này cắt qua mặt cầu đoạn kia.
- **Vì sao lặp lại**: lần trước chỉ sửa cầu cụ thể (Long Biên) bằng một mô hình riêng; mọi cầu khác vẫn dùng cách tính sai.
- **Sửa**: độ cao tính **trên cả mạng cầu** (`solveBridgeProfiles`), bề rộng thống nhất tại nút (`markBridgeEnds`), lan can mở ở chỗ nối, cầu đường chính tối thiểu 2 làn. **Vòng 2** (ảnh vòng xoay): sau khi sửa độ cao và bề rộng, nơi một nhánh rẽ ra hoặc nhập vào, lan can *bên trong* của hai mặt cầu vẫn chạy song song rồi chụm lại thành chữ Y. Quy tắc chung: lan can nằm trên mặt đường của mặt cầu khác (cùng độ cao) thì bỏ (`onOtherDeck`), hai mặt cầu chồng nhau đọc thành một mặt cầu rộng hơn. Bài học: sau mỗi lần sửa một lớp lỗi, **liệt kê các tương tác còn lại giữa hai phần tử** (nối đầu-đầu, rẽ nhánh, nhập, chồng lên, vượt qua) và kiểm từng loại.
- **Luật**: A20 (thuộc tính của một công trình ghép từ nhiều phần tử OSM phải tính trên cả nhóm, không theo từng phần tử), A21 (sửa ở chỗ chung, không vá riêng).
- **Rào chắn**: `geography.test.ts › bridge heights` (liên tục tại nút, bề rộng chênh ≤ 2,1 lần, Long Biên 9,5 m); `network.test.ts` (cầu vượt 6 m); `render/bridges.test.ts` (lan can không đứng trên mặt cầu khác: nhánh rẽ, chồng lên, vượt qua ở độ cao khác).

## CS-04 · Việc dựng đồng bộ lớn trên luồng chính (ADR-058)
- **Triệu chứng**: `RangeError: Array buffer allocation failed`; khựng khi zoom ra hoặc chuyển cảnh trên tablet.
- **Nguyên nhân gốc**: lớp tổng quan công trình dựng 1.243 công trình ở mức chi tiết cao (33 triệu số) đồng bộ ở lần zoom ra đầu tiên; dựng ô theo số lượng thay vì thời gian.
- **Vì sao lặp lại**: chỉ đo trên máy mạnh; không có ngân sách bộ nhớ hay thời gian ghi ở đâu.
- **Sửa**: lớp tổng quan ở L0, dựng sớm lúc rảnh và dựng lại khi chunk mới tới; ngân sách thời gian mỗi khung; nhớ kết quả tính nặng.
- **Luật**: A22 (ngân sách: mọi việc dựng lớn phải có trần bộ nhớ/thời gian và không chạy lần đầu trong thao tác người dùng).
- **Rào chắn**: chưa có số đo thật (cần đo trên tablet); `city.test.ts` đo số tam giác/nét theo mức.

## CS-05 · Hộp mô hình đặt thay cho hình thật (ADR-058)
- **Triệu chứng**: Cầu Long Biên là tấm phẳng xám 110 m × 56 m + khối be ở đầu.
- **Nguyên nhân gốc**: công trình dài/cong (cầu, đê, tường) bị gán một hộp xoay-thẳng; không có chuyện cầu 1,7 km là hình chữ nhật.
- **Sửa**: mặt cầu mặc định đi theo đường OSM; chi tiết (giàn thép) dựng *dọc đường*.
- **Luật**: A23 (công trình tuyến dựng theo đường, không theo hộp).
- **Rào chắn**: không còn id `99…`; `render/long-bridges.test.ts` (5 trụ tháp Nhật Tân đặt theo đường, giữa hai mặt cầu, đúng 300 m, chỉ ở đoạn qua sông; có test trên dữ liệu thật). Cầu Nhật Tân bị cắt ở rìa vùng bản đồ từng làm trụ không hiện được: **dữ liệu phải phủ đủ công trình tuyến** (thêm vùng hành lang), và đoạn cầu bị cắt giữ độ cao ở đầu cắt.

## CS-06 · Sửa xong nhưng không kiểm bằng dữ liệu (chung)
- **Triệu chứng**: "đã sửa rồi" nhưng người dùng thấy lại.
- **Nguyên nhân gốc**: chỉ kiểm bằng mắt trên máy người dùng (A7 cấm trình duyệt tự động) nên không có gì phát hiện hồi quy.
- **Sửa/Luật**: A24 — mọi lỗi vị trí/hình học phải có **test trên dữ liệu thật** (không cần WebGL) và **ảnh mặt bằng SVG** (`qlmanage -t`) để tự kiểm trước khi nhờ người dùng.
- **Rào chắn**: toàn bộ bộ test ở trên.

## CS-07 · Khởi động chậm: đo trước, đoán sau (2026-10-26, ADR-058)
- **Triệu chứng**: mở trang chờ lâu, kể cả trên máy tính.
- **Đo** (laptop, đường khởi động đồng bộ): `streetFurniture` 2,8 s, dựng nền đường 2,9 s, `roadNetwork` 0,4 s, import 0,4 s; tổng ~6,5 s trên luồng chính, chưa kể mạng.
- **Nguyên nhân gốc** (V8 profiler, không phải ước đoán): (1) mỗi cây công viên thử với *mọi* mặt nước, kể cả đa giác sông và Hồ Tây hàng nghìn điểm, và so khoảng cách với mọi cây đã đặt (O(n²)); (2) `onRoad` duyệt toàn bộ đường của ô lưới thay vì từng đoạn; (3) mặt cầu lấy mẫu 2 m cho cả đoạn thẳng 1,7 km rồi chạy `EdgesGeometry`; (4) skeleton tải xong mới bắt đầu tải chunk (nối tiếp), cộng độ trễ giả 180 ms ở cuối.
- **Vì sao lặp lại**: dữ liệu lớn dần (thêm sông thật, nhiều đường) làm các thuật toán bình phương lộ ra; trước đó không ai đo.
- **Sửa**: bbox + lọc nước theo công viên, lưới ô cho khoảng cách cây, lưới đoạn đường, lấy mẫu cầu thưa theo đường thẳng, tải skeleton và chunk song song. Kết quả: `streetFurniture` 0,29 s, nền đường 1,45 s; tổng tính toán ~2,4 s.
- **Luật**: A22 (ngân sách) + A25 (đo bằng profiler trước khi tối ưu; ghi số trước/sau vào case study).
- **Cách đo lại** (không cần trình duyệt): trong một file `*.test.ts` tạm, dùng `node:inspector` `Profiler.start/stop` quanh `streetFurniture(city)` và `buildMapBaseLayers(city)`, cộng thời gian tự thân theo hàm; xoá file sau khi đo.
- **Còn lại**: ~2,4 s vẫn chạy đồng bộ trên luồng chính; muốn mượt hẳn cần Web Worker (dựng nền + furniture); mạng: skeleton 4,9 MB (0,9 MB nén) + 4 chunk.

## CS-08 · Lỗi chép nhầm nằm trong hàm quá dài (2026-10-26)
- **Triệu chứng**: không có triệu chứng thấy được; điểm đặc trưng (feature) quanh chunk mới tải gần như không bao giờ vào thành phố con dùng để dựng đồ phố và ô đường.
- **Nguyên nhân gốc**: trong `ingestCityChunk` (186 dòng) bốn bộ lọc "gần chunk" được chép dán; bộ lọc `features` có `f.at[1] >= cy1 + 64` thay vì `<=`, nên chỉ giữ điểm nằm *phía nam* chunk.
- **Vì sao tồn tại**: hàm lớn, không test, bốn bộ lọc giống nhau viết tay. Lỗi chỉ lộ ra khi tách hàm thuần ra và viết test cho từng cạnh.
- **Sửa**: `chunkSubCity` dùng **một** hàm `within(x, y, margin)` cho cả bốn bộ lọc; test kiểm cả bốn phía.
- **Luật**: A26 (bộ lọc/tính toán lặp lại dùng một hàm chung, không chép dán) và lợi ích phụ của việc tách hàm: tách phần thuần ra *để viết test*, không chỉ để giảm dòng.
- **Rào chắn**: `view/chunkMerge.test.ts`.

## CS-09 · Code viết cho một ngã tư chạy trên cả Hà Nội (2026-10-26, đánh giá toàn diện, ADR-059)
- **Triệu chứng** (9 lỗi, tìm thấy khi đánh giá, phần lớn chưa ai báo):
  - xe biến mất trên tuyến dài;
  - rò bộ nhớ GPU khi "Nhìn xuyên";
  - mô hình Phủ Tây Hồ vẽ trên 8 tòa, Khuê Văn Các trên 3, Chùa Quán Sứ trên 4;
  - POV không lái được trên đường của chunk tải sau;
  - tùy chọn MSAA không có tác dụng;
  - phím tắt chết sau khi bấm một nút;
  - một ký tự `%` lẻ trong link làm app không khởi động;
  - bảng chất lượng trong tài liệu lệch code.
- **Nguyên nhân gốc chung**: các giả định của phạm vi 130 m (một ngã tư, 123 tòa, dữ liệu nạp một lần) không còn đúng khi dữ liệu lên 16.835 tòa, 5.130 làn (dài tới 5,5 km) và được **stream** theo chunk:
  1. Lọc xe theo **điểm đầu làn** (`lane.path[0]`): đúng khi làn dài 100 m, sai khi làn dài 5 km.
  2. **Khớp catalog theo tên**: đúng khi mỗi tên là một tòa, sai khi một quần thể có nhiều way cùng tên.
  3. **Chỉ mục dựng một lần** trong constructor (đường của POV): đúng khi dữ liệu nạp một lần, sai khi stream.
  4. **Gỡ layer khỏi danh sách mà không giải phóng** (ô cắt của "Nhìn xuyên"): không ai thấy, vì rò từ từ.
  5. **Tùy chọn chỉ đặt được lúc tạo tài nguyên** (`antialias`), nhưng giao diện cho đổi lúc chạy.
  6. **Input ngoài không được bảo vệ** (`decodeURIComponent` trong constructor).
  7. **Phím tắt bị chặn trên mọi `button`**, trong khi Chrome giữ focus ở nút sau khi bấm.
  8. **Tài liệu ghi số liệu bằng tay**, code đổi sau đó.
- **Vì sao lặp lại**: không có test nào chạy trên đúng hình dạng dữ liệu thật (làn dài, tên trùng, dữ liệu tới sau, input hỏng). Lỗi hình ảnh chỉ được phát hiện bằng mắt (A7) nên lỗi hiếm hoặc chậm (rò rỉ) không ai thấy.
- **Sửa**:
  - `view/trafficView.ts` lọc theo vị trí xe;
  - `dropTileCut` giải phóng ô cắt, dựng tối đa 1 ô cắt mỗi khung;
  - `resolveCatalogClaims` (import.ts): mục có `osmSource` chỉ gán cho đúng phần tử đó, không có thì một phần tử lớn nhất, còn lại dùng mô hình chung;
  - `PovController.addStreets` + lưới ô 64 m cho đường;
  - `setQuality` dựng lại renderer khi đổi MSAA;
  - phím tắt chỉ bị chặn trong ô nhập liệu;
  - `parseUrlState` không ném lỗi;
  - bảng chất lượng sinh lại và có test.
- **Luật**: A27 (lọc theo vị trí thật), A28 (vòng đời GPU), A29 (khớp bằng id, một mục một phần tử), A30 (tùy chọn có hiệu lực thật), A31 (dữ liệu stream tới mọi chỉ mục), A32 (việc mỗi khung theo phần nhìn thấy), A33 (input ngoài), A35 (tài liệu có test). Cách làm chi tiết: [guidelines](../ai/guidelines.md).
- **Rào chắn**:
  - `view/trafficView.test.ts` (làn 3 km, camera ở cuối);
  - `osm-import/src/catalog.test.ts` (không mô hình riêng nào bị nhân bản, kiểm cả đường stream; mọi `osmSource` có trong dữ liệu);
  - `view/povController.test.ts` (đường tới sau lái được);
  - `view/urlState.test.ts` (link hỏng);
  - `render/hygiene.test.ts` (`this.layers.delete` chỉ trong `disposeLayerObj`);
  - `view/quality.test.ts › docs follow the code`.

## CS-10 · Chữ do máy sinh lẫn vào nội dung (2026-10-26)
- **Triệu chứng**:
  - mô tả TAND Tối cao kết thúc bằng "đối칭" (chữ Hàn);
  - "Khách sạn精品 Silk Path" (chữ Hán);
  - chú thích code có "спиral" (chữ Kirin).
- **Nguyên nhân gốc**: ~3.000 dòng mô tả trong catalog được viết nhanh bằng công cụ sinh văn bản, dán thẳng vào code, không qua kiểm.
- **Vì sao nguy hiểm**: người xem đọc thấy chữ rác. Cùng nguồn đó có thể có lỗi sự kiện (năm, địa chỉ) mà không test nào bắt được.
- **Sửa**: thay 3 chỗ; thêm test quét ký tự.
- **Luật**: A34. Nội dung sự kiện cần nguồn ([guidelines](../ai/guidelines.md) §8).
- **Rào chắn**:
  - `render/hygiene.test.ts › clean text` (mã nguồn app + `core`, `osm-import`, `theme`);
  - `osm-import/src/catalog.test.ts` (tên, alias, địa chỉ, mô tả của catalog).
- **Còn lại**: 208 mô tả chưa được kiểm sự kiện từng câu. Việc này cần người dùng duyệt theo đợt (backlog).

## CS-11 · Báo cáo đánh giá có nhận định chưa kiểm (2026-10-26)
- **Triệu chứng**: bản đánh giá đầu tiên nói "`urlState` chưa có test" (thật ra đã có trong `view/quality.test.ts`), và nghi "Tòa án ở Hai Bà Trưng" là sai địa chỉ (thật ra là tên **phố** Hai Bà Trưng: "Số 48 Lý Thường Kiệt & 43 Hai Bà Trưng").
- **Nguyên nhân gốc**: kết luận từ tìm kiếm theo tên file (`urlState.test.ts` không có) và từ đọc lướt, không đối chiếu lại nguồn.
- **Sửa**: phát hiện khi bắt tay sửa; đính chính trong báo cáo.
- **Luật**: A36. Mỗi nhận định trong đánh giá phải được đối chiếu lại; tách "đã xác minh" và "nghi vấn".
- **Rào chắn**: quy trình (guidelines §11). Không có test tự động.

## CS-12 · Vào chế độ lái lúc không muốn (2026-10-26, ADR-063)
- **Triệu chứng**: người dùng "thỉnh thoảng ấn nhầm kiểu gì đó mà nó vào chế độ lái xe".
- **Nguyên nhân gốc**:
  - chạm vào nút Pegman mà ngón tay xê dịch dưới 8 px thì code thả người xuống giữa màn hình và vào chế độ lái;
  - phím `P` chuyển thẳng sang lái tàu.
  Cả hai biến một thao tác nhỏ, dễ nhầm, thành một thay đổi lớn của cả màn hình.
- **Vì sao không ai thấy**: thao tác "chạm không kéo" được viết như một lối tắt có chủ ý, nhưng trên mobile nó trùng với chạm nhầm; không có test nào nói thao tác nào được phép vào chế độ.
- **Sửa**: chỉ vào chế độ nhập vai từ menu hoặc khi kéo-thả Pegman lên bản đồ; chạm thì hiện gợi ý; `P` mở menu.
- **Luật**: guidelines §7 (thay đổi lớn cần thao tác chủ ý; nút ≥ 44 px trên cảm ứng; menu là sheet có nút đóng, Esc, chạm ra ngoài).
- **Rào chắn**: `view/entryPoints.test.ts` (không phím đơn nào đổi `povMode`). Thao tác chạm trên Pegman nằm trong React, chưa có test tự động (A7).

---

## Mẫu case mới
```
## CS-NN · Tên (ngày, ADR)
- Triệu chứng:
- Nguyên nhân gốc:
- Vì sao lặp lại:
- Sửa:
- Luật:
- Rào chắn (test nào, file nào):
```

## Danh sách kiểm trước khi đụng vào dữ liệu bản đồ, công trình, cầu
1. Phần tử này có **id OSM thật** và nằm trong dữ liệu tải từ OSM không? (A17)
2. Mọi vị trí trong code có **neo vào phần tử** hay là toạ độ tuyệt đối? (A19)
3. Thuộc tính này (cao độ, bề rộng, tên, số tầng) có đúng với **cả nhóm phần tử** nối nhau không, hay chỉ đúng với một phần tử? (A20)
4. Lỗi này có thể xảy ra ở **chỗ khác cùng loại** không (cầu khác, hồ khác, công trình khác)? Nếu có, sửa ở chỗ chung. (A21)
5. Việc dựng mới có trần **bộ nhớ và thời gian**, và có chạy lần đầu trong lúc người dùng thao tác không? (A22)
6. Có **test trên dữ liệu thật** và **ảnh mặt bằng** cho trường hợp này chưa? (A24)
7. Thuộc tính / bộ lọc này có còn đúng khi đối tượng **dài**, tên **trùng**, dữ liệu **tới sau** (stream), input **hỏng**? (A27, A29, A31, A33)
8. Gỡ hay thay tài nguyên GPU có **giải phóng** cái cũ không? (A28)
9. Vòng lặp mới có chạy **mỗi khung trên toàn bộ** dữ liệu không? (A32)
