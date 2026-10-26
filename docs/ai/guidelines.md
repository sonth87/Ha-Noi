# Hướng dẫn kỹ thuật: cách làm để không lặp lại lỗi cũ

File này biến các lỗi đã gặp thành **cách làm cụ thể**. Luật ngắn gọn (A1–A34) ở [README](README.md) §3; nguyên nhân gốc từng sự cố ở [case-studies](../architecture/case-studies.md). Ở đây là phần *làm thế nào*: mỗi mục có **Làm**, **Không làm**, **Rào chắn** (test hoặc công cụ bắt lỗi) và sự cố gốc.

Đọc file này trước khi viết code đụng tới: dữ liệu bản đồ, vòng lặp khung hình, cache/ô, tài nguyên GPU, cài đặt, input từ ngoài, nội dung chữ.

---

## 1. Dữ liệu và bản đồ

### 1.1 Mọi thứ trên bản đồ có gốc OSM (A17, A19)
- **Làm**: phần tử lấy từ OSM, giữ `source` (`osm:way/…`). Hạng mục của một công trình đặt bằng **độ lệch so với một phần tử OSM**, kèm test so với dữ liệu.
- **Không làm**: thêm phần tử id `99…`, hộp tay, toạ độ tuyệt đối trong code vẽ.
- **Rào chắn**: `osm-import/src/geography.test.ts`, `render/hygiene.test.ts`, `render/placement.test.ts`. CS-01, CS-02.

### 1.2 Dữ liệu phụ khớp với OSM bằng id, một mục là một phần tử (A29)
Dữ liệu phụ là catalog công trình, sửa tay (overrides), mô tả.
- **Làm**: ghi `osmSource` cho mọi mục có mô hình riêng. Có `osmSource` thì **chỉ** phần tử đó nhận mô hình. Khớp theo tên chỉ là phương án cuối, và khi đó chỉ một phần tử thắng (`resolveCatalogClaims`).
- **Không làm**: khớp theo tên rồi gán cho mọi phần tử trùng tên. Một quần thể ("Phủ Tây Hồ", "Hoàng thành Thăng Long", bệnh viện) có hàng chục way cùng tên.
- **Rào chắn**: `osm-import/src/catalog.test.ts`:
  - không model riêng nào dùng cho nhiều phần tử hơn số mục khai báo, kiểm cả theo **đường tải thật** (skeleton rồi từng chunk riêng);
  - mọi `osmSource` có trong dữ liệu.
- Sự cố gốc: CS-09.

### 1.3 Thuộc tính của công trình ghép tính trên cả nhóm (A20, A23)
Cầu, đường nhiều đoạn, khuôn viên: cao độ, bề rộng, tên phải liên tục ở chỗ nối. Công trình tuyến dựng theo đường OSM, không theo hộp. CS-03, CS-05.

### 1.4 Thử trên cả dữ liệu tải từng phần
App **stream** chunk. Một quy tắc đúng khi import cả thành phố một lần có thể sai khi import skeleton và từng chunk riêng: trùng lặp giữa các chunk, thiếu láng giềng.
- **Làm**: mọi bất biến dữ liệu (không trùng, đủ tham chiếu) có test chạy theo cả hai đường.

## 2. Streaming, cache và chỉ mục

### 2.1 Mọi chỉ mục dựng từ dữ liệu phải nhận dữ liệu mới (A31)
Khi chunk tới, `ingestCityChunk` là **cửa duy nhất**. Nó phải cập nhật mọi thứ được dựng từ `city`:

| Người tiêu thụ | Cập nhật bằng |
|---|---|
| Ô nhà, `bldgBounds`, tầng | `ingestCityChunk` (dựng lại ô bẩn) |
| Ô đường nội bộ, ô đồ phố | `ingestCityChunk` (theo `chunkSubCity`) |
| Catalog địa điểm, catalog phố | `buildPlaceCatalog`, `buildStreetCatalog` |
| Chỉ mục đường của POV (lái xe, Pegman) | `pov.addStreets` |
| Lớp tổng quan công trình | `scheduleLandmarkOverview` |
| Danh sách xe quanh camera | **chưa**: làn xe chỉ dựng từ mạng đường lúc khởi động (ADR-060) |

- **Làm**: thêm chỉ mục mới thì **thêm một dòng vào bảng này** và gọi nó trong `ingestCityChunk`, kèm test "dữ liệu tới sau vẫn dùng được" (mẫu: `view/povController.test.ts`).
- **Không làm**: dựng chỉ mục một lần trong constructor rồi quên.
- Sự cố gốc: CS-09 (POV không lái được trên đường của chunk tải sau).

### 2.2 Cắt và lọc theo vị trí thật của đối tượng (A27)
- **Làm**: lọc theo **vị trí hiện tại của chính đối tượng** (xe sau khi đặt lên làn) hoặc theo bbox đầy đủ của nó.
- **Không làm**: lọc theo một điểm đại diện (điểm đầu làn, tâm nhóm) khi đối tượng dài hoặc rộng. Làn xe dài tới 5,5 km.
- **Rào chắn**: test với đối tượng dài và camera ở xa điểm đại diện (mẫu: `view/trafficView.test.ts`). Sự cố gốc: CS-09.

## 3. Tài nguyên GPU và vòng đời (A28)

- **Một chủ, một đường giải phóng**: mỗi `Layer` hay geometry có một chỗ sở hữu. Bỏ nó khỏi cảnh thì **phải** qua `disposeLayerObj` (hoặc hàm tương đương của loại đó, như `dropTileCut`).
- **Không làm**: `this.layers.delete(x)` hay `group.remove(x)` mà không `dispose()`. Đối tượng mất tham chiếu nhưng buffer GPU vẫn còn.
- **Thay thế = giải phóng cái cũ trước**: mọi chỗ "dựng lại" (ô bẩn, ô cắt, lớp tổng quan) gọi hàm giải phóng của cái cũ.
- **Rào chắn**: `hygiene.test.ts`: `this.layers.delete(` chỉ xuất hiện trong `disposeLayerObj`. Sự cố gốc: CS-09 (rò rỉ khi "Nhìn xuyên").
- Khi thêm một loại tài nguyên mới, thêm luật tương tự vào `hygiene.test.ts`.

## 4. Hiệu năng và quy mô (A22, A25, A32)

### 4.1 Ngân sách
Việc dựng có ngân sách thời gian mỗi khung: 6 ms trên di động, 10 ms trên máy tính. Việc lớn **không** chạy đồng bộ lần đầu trong thao tác người dùng. Mỗi lớp không quá ~5 triệu số. CS-04.

### 4.2 Việc chạy mỗi khung hình tỉ lệ theo phần nhìn thấy, không theo cả thành phố (A32)
Bản đồ đã từ 123 tòa lên 16.835 tòa, 4.378 ô và 5.130 làn.
- **Làm**: tra **lưới không gian** (`view/spatialGrid.ts`, ô 64 m cho đường POV) để lấy phần tử quanh tầm nhìn. Vòng lặp trên toàn bộ chỉ được chạy lúc khởi tạo, lúc rảnh, hoặc khi dữ liệu đổi.
- **Không làm**: `for (const t of this.tiles)` trong `tick`, `.filter().sort()` trên toàn bộ mỗi khung.
- **Kiểm khi review**: mỗi vòng lặp mới trong đường gọi của `tick` phải trả lời được "nó duyệt bao nhiêu phần tử khi cả Hà Nội đã tải?".

### 4.3 Đổi trạng thái hình ảnh không ghi lại cả buffer
- **Làm**: hiệu ứng toàn cục (đèn nhà theo tỉ lệ, ngày/đêm, mờ dần) đưa vào **uniform của shader** hoặc chỉ ghi đúng đoạn buffer bị đổi.
- **Không làm**: lặp `paintLayer` trên mọi layer nhiều lần cho một hiệu ứng chuyển.

### 4.4 Việc nặng một lần: đưa vào worker, có đường lùi
Tải và import dữ liệu, dựng mạng đường, dựng nền đều chạy trong worker (`baseWorker`, `chunkWorker`). Mỗi worker có **đường lùi** về luồng chính, cùng một hàm, có test chạy trong Node. Trước khi tính sẵn thứ gì lúc build, đo kích thước sau tính (mô hình thành phố 12 MB > OSM 6 MB, ADR-060).

### 4.5 Đo trước, sửa sau (A25)
Dùng profiler (cách đo không cần trình duyệt ở CS-07). Ghi số trước và sau vào case study.

## 5. Cài đặt và chất lượng (A30)

- **Mỗi tùy chọn phải có hiệu lực thật.** Nếu tùy chọn chỉ đặt được lúc tạo tài nguyên (như `antialias` của WebGL), thì đổi nó phải **tạo lại** tài nguyên đó (`setQuality` dựng lại renderer khi đổi MSAA), hoặc giao diện phải nói rõ "cần tải lại".
- Việc tự hạ mức (`autoQuality`) không được gây khựng thêm: tránh dựng lại tài nguyên nặng.
- **Rào chắn**: khi thêm tùy chọn, viết test thể hiện tác dụng của nó (`view/quality.test.ts`).

## 6. Input từ ngoài không được làm sập app (A33)

URL, `localStorage`, dữ liệu mạng, extension đều là input không tin được.
- **Làm**: parse trong `try/catch`, kiểm khoảng giá trị, rơi về mặc định. `decodeURIComponent`, `JSON.parse`, `new URL` đều có thể ném lỗi.
- HTML từ ngoài chỉ qua `textContent`. Icon của extension qua `safeIconSvg`.
- **Rào chắn**: mỗi bộ parse có test với input hỏng (`view/urlState.test.ts`). Sự cố gốc: CS-09.

## 7. Giao diện và thao tác

- **Phím tắt**: chỉ ô nhập liệu (`input`, `select`, `textarea`, `contenteditable`) được nuốt phím tắt. Nút đang có focus chỉ giữ `Space`/`Enter`. Sự cố gốc: CS-09 (WASD chết sau khi bấm nút).
- **Điều khiển kiểu game** (ADR-062):
  - không có trợ lực nào tranh quyền với người chơi (tự lái, tự xoay);
  - va chạm thì trượt chứ không giật;
  - các con số cảm giác (bán kính quay, 0–50 km/h, quãng phanh) là hằng số có tên, kèm test;
  - đổi cảm giác lái thì chỉnh hằng số và test, rồi nhờ người dùng chạy thử.
- **Thay đổi lớn cần thao tác chủ ý** (A37, CS-12):
  - vào chế độ nhập vai, đổi cả màn hình, xoá dữ liệu… chỉ từ một mục menu có tên rõ, hoặc một thao tác kéo-thả;
  - không bao giờ từ một phím đơn hay một chạm có thể nhầm.
- **Vùng bấm**: ≥ 40 px, 44 px trên màn cảm ứng (`--tap`). Nút đóng luôn ở góc trên phải, cùng một kiểu.
- **Menu và bảng là `Sheet`**: tiêu đề, nút đóng, Esc, chạm ra ngoài; bottom sheet trên điện thoại; sự kiện không lọt xuống bản đồ. Không viết popover riêng.
- **Danh sách mở rộng được**:
  - phạm vi chọn bằng select, không bằng một hàng nút cho mỗi giá trị;
  - phân trang;
  - tìm không dấu;
  - mỗi mục có lối tới cả bản đồ lẫn chi tiết.
- **Không đổi chế độ ngầm**: một cử chỉ không nên tự đổi 2D ↔ 3D hay đóng bảng mà người dùng không thấy lý do. Nếu cần thì có phản hồi trên màn hình.
- **Snapshot cho React**: chỉ đổi khi giá trị người dùng thấy đổi. Giá trị đổi liên tục (heading khi xoay, fps) phải được hạn tần suất.
- Mỗi thay đổi giao diện cần **người dùng xem** trên `pnpm dev:3d` (A7, A11). Báo rõ thứ gì chưa xem.

## 8. Nội dung chữ: tên, mô tả, địa chỉ (A34)

Văn bản do người hoặc AI viết đều có thể sai.
- **Làm**:
  - Mô tả ngắn và kiểm chứng được.
  - Thông tin dễ sai (năm, số tầng, địa chỉ, sự kiện) phải có nguồn: OSM tag, trang chính thức, Wikipedia. Ghi nguồn trong chú thích cạnh mục.
  - Không chắc thì bỏ câu đó.
- **Không làm**: dán nguyên văn văn bản sinh tự động.
- **Rào chắn**:
  - `hygiene.test.ts` và `catalog.test.ts` chặn ký tự Hán, Hàn, kana, Kirin lẫn vào (lỗi thật: "đối칭", "Khách sạn精品", "спиral").
  - Người dùng duyệt nội dung theo đợt.
- Sự cố gốc: CS-10.

## 9. Tài liệu đi theo code (A3, A35)

- Bảng số liệu trong tài liệu (mức chất lượng, hằng số, ngưỡng) **phải được kiểm bằng test** hoặc sinh từ code.
  - Mẫu: test "docs follow the code" trong `view/quality.test.ts` so bảng ở `city3d.md` §6 với `LEVELS`.
- Một tuyên bố về hành vi trong tài liệu (như "không cập nhật theo từng khung") cần có test hoặc được ghi là "chưa kiểm".

## 10. Kiểm thử và rào chắn (A24)

| Loại lỗi | Rào chắn tối thiểu |
|---|---|
| Vị trí / hình học | Test trên dữ liệu thật + ảnh mặt bằng SVG (`qlmanage`) |
| Dữ liệu trùng / thiếu | Test bất biến trên cả đường import một lần và đường stream |
| Rò rỉ tài nguyên | Luật quét mã trong `hygiene.test.ts` |
| Quy mô / hiệu năng | Đếm số phần tử bị duyệt hoặc đo thời gian trên dữ liệu thật |
| Input ngoài | Test với input hỏng |
| Tài liệu số liệu | Test so tài liệu với code |
| Nội dung | Test ký tự lạ, ghi nguồn |

Hàm dài khó test thì **tách phần thuần ra** rồi test từng cạnh (A26). Mẫu: `chunkMerge.ts`, `trafficView.ts`.

## 11. Khi đánh giá, báo cáo (A36)

- **Kiểm trước khi kết luận**: một nhận định ("chưa có test cho X", "địa chỉ sai") phải được kiểm lại trên mã và dữ liệu trước khi đưa vào báo cáo.
  - Bài học thật (CS-11): lần đánh giá đầu đã nói nhầm "`urlState` chưa có test" (đã có trong `quality.test.ts`) và "Hai Bà Trưng là quận" (đó là tên phố).
- Phân rõ ba loại: **đã xác minh** (có số liệu, có test), **nghi vấn** (cần kiểm thêm), **chưa kiểm bằng mắt** (A7).

---

## Danh sách kiểm trước khi báo xong (bổ sung cho [workflow](workflow.md))
1. Có vòng lặp mới nào chạy mỗi khung trên toàn bộ dữ liệu không? (§4.2)
2. Có tài nguyên GPU nào bị gỡ mà không `dispose`? (§3)
3. Dữ liệu stream tới có tới được chỉ mục mới không? (§2.1)
4. Có lọc theo điểm đại diện của một đối tượng dài không? (§2.2)
5. Dữ liệu phụ có khớp theo id không? Một mục có thành nhiều phần tử không? (§1.2)
6. Tùy chọn mới có tác dụng ngay không? (§5)
7. Input từ ngoài hỏng thì sao? (§6)
8. Bảng hay số liệu trong tài liệu có test giữ khớp không? (§9)
9. Nội dung chữ mới có nguồn và đã qua kiểm ký tự không? (§8)
10. Đã ghi rõ thứ gì chưa xem bằng mắt chưa? (A11)
