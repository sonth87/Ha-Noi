/* Fig 20 — Ngã tư Thái Hà – Tây Sơn – Chùa Bộc:
   Toàn cảnh nút giao với cầu vượt Tây Sơn, Tòa Thái Bình, Novotel, 2 vườn hoa và 4 nhánh phố. */
FIGS.push({
  id: 'nga-tu',
  name: 'Ngã tư',
  hint: 'Q E xoay · X cắt lớp · N ngày/đêm · T dòng xe · W xung điện · click tầng · cuộn zoom',
  aria: 'Mô hình isometric toàn cảnh ngã tư Thái Hà – Tây Sơn – Chùa Bộc với cầu vượt Tây Sơn, Tòa Thái Bình, khách sạn Novotel, hai vườn hoa ở góc phía nam, bốn nhánh phố nhà ống và dòng xe chạy theo chu kỳ đèn tín hiệu.',
  mount(stage, api) {
    return MY_CITY.mountController(stage, api, new MY_CITY.CrossroadsController(), true);
  },
});
