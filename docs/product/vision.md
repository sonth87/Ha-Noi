# Tầm nhìn & mục tiêu

## 1. Ý tưởng một câu

Một **mô hình phố Hà Nội thu nhỏ, tương tác**, vẽ bằng nét isometric phát sáng: người xem xoay quanh ngã tư Thái Hà – Tây Sơn – Chùa Bộc, bật đèn từng nhà, nhìn xe máy chạy theo đèn giao thông và dòng điện chạy dọc những bó dây điện chằng chịt.

## 2. Vì sao làm

| Động lực | Ý nghĩa |
|---|---|
| **Cá nhân** | Là con phố nơi tác giả sống. Câu chuyện thật hấp dẫn hơn một thành phố chung chung. |
| **Thẩm mỹ** | Phố Hà Nội có sẵn mọi thứ iso-glow cần: khối hộp nhà ống, cửa sổ sáng, biển hiệu, dây điện, dòng xe. |
| **Kỹ thuật** | Xây được một **bộ sinh nhà có tham số** từ đó dựng cả dãy phố bằng dữ liệu thay vì vẽ tay từng căn. |
| **Mở rộng** | Thư viện nhà dùng lại được cho phố khác, khu khác về sau. |

## 3. Mục tiêu

### Mục tiêu chính (bắt buộc)
- **G1 · Thư viện nhà phố Hà Nội.** Một generator dựng nhà từ tham số (số tầng, mái, ban công, cửa, phụ kiện mái…) và ≥ 12 preset nhìn ra ngay là "nhà Hà Nội".
- **G2 · Dãy phố sống.** Một nhánh phố thẳng ~100 m, hai bên nhà, có vỉa hè, cột điện, dây điện glow, đèn đường, xe máy chạy.
- **G3 · Ngã tư.** Bốn nhánh phố gặp nhau, bốn góc là tòa Thái Bình (Parkson cũ), tòa Novotel và hai vườn hoa; đèn giao thông điều khiển dòng xe.
- **G4 · Tương tác.** Mỗi màn hình đều *làm được gì đó*: bật đèn, xoay góc nhìn, cắt lớp, chuyển ngày/đêm.

### Mục tiêu phụ (nên có)
- Chế độ tự chạy (`demo`) mở ra là đã sáng, để chụp ảnh / quay video.
- Hai theme sáng / tối, đổi palette màu đèn.

### Không phải mục tiêu (non-goals) ở giai đoạn này
- ❌ Đúng vị trí, góc phố, kích thước theo bản đồ thật — để **P5**.
- ❌ Logo, biển hiệu, nhận diện thương hiệu thật — landmark chỉ cần **nhận ra được qua hình khối**.
- ❌ Đúng từng căn nhà ngoài đời — nhà chỉ cần **tương đối**, đúng tinh thần.
- ❌ 3D / three.js — có thể cân nhắc sau P4.
- ❌ Mobile-first. Trang phải mở được trên điện thoại nhưng trải nghiệm chính là desktop.

## 4. Phạm vi

```
                  Tây Sơn (~100 m)
                        │
       [Landmark A]     │     [Landmark B]
                        │
  Chùa Bộc (~100 m) ────┼──── Thái Hà (~100 m)
                        │
       [Vườn hoa]       │     [Vườn hoa]
                        │
                  Tây Sơn (~100 m)
```

- 4 nhánh × ~100 m × 2 bên phố ≈ **800 m mặt tiền ≈ 150–200 căn** ở quy mô đầy đủ.
- MVP chấp nhận: phố thẳng, vuông góc; vị trí góc của landmark có thể hoán đổi; số căn có thể ít hơn.

## 5. Nguyên tắc thiết kế

1. **Một màu nhấn, chỉ trên thứ đang sống.** Mọi thứ khác là nét đơn sắc (luật cốt lõi của iso-glow).
2. **Hà Nội qua chi tiết lặp lại**, không qua logo: nhà ống hẹp cao thấp lệch nhau, ban công chuồng cọp, bồn nước inox, cục nóng, tum thang, mái tôn, dây điện.
3. **Dữ liệu trước, bản vẽ sau.** Nhà là dữ liệu; bản vẽ là kết quả của dữ liệu.
4. **Tái tạo được.** Cùng dữ liệu + cùng seed → cùng một bức tranh, mỗi lần mở.
5. **Mọi thứ minh bạch.** Mọi quyết định có ghi lại lý do ([decisions](../architecture/decisions.md)); mọi việc có trong [checklist](../plan/checklist.md).

## 6. Tiêu chí thành công

| # | Tiêu chí | Đo bằng |
|---|---|---|
| S1 | Người Hà Nội nhìn catalog nói được "nhà kiểu này ở phố mình có" | Tự đánh giá + hỏi 2–3 người |
| S2 | Nhìn ngã tư, người quen khu đó đoán ra được vị trí | Hỏi người quen |
| S3 | Thêm một kiểu nhà mới chỉ cần thêm một preset (dữ liệu), không sửa renderer | Thử thêm preset thứ 13 |
| S4 | Mở trang trên laptop, tương tác mượt | ≥ 50 fps khi xe chạy, không giật khi bật đèn |
| S5 | Một người mới đọc `docs/` hiểu được dự án trong 15 phút | Đọc thử |
