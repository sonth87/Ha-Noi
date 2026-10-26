# Bài học từ sự cố (case study)

Mục đích: mỗi lần một lỗi "đã sửa mà lại hỏng ở chỗ khác" xảy ra, ghi lại **vì sao nó lặp lại** và biến nó thành **luật cụ thể có test cưỡng chế**, để lần sau không phải sửa từng chỗ. Luật nằm ở [docs/ai/README.md](../ai/README.md) mục 3 (A17–A24). Mỗi case ghi: triệu chứng → nguyên nhân gốc → vì sao lặp lại → cách sửa → luật → rào chắn (test).

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
