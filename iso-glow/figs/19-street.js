/* Fig 19 — Phố (~100 m):
   Hai dãy nhà phố, vỉa hè, cây xanh, dây điện, xe máy và ô tô chạy hai chiều. */
FIGS.push({
  id: 'street',
  name: 'Phố',
  hint: 'Q E xoay · X cắt lớp · N ngày/đêm · T dòng xe · W xung điện · cuộn zoom · kéo pan',
  aria: 'Đoạn phố dài khoảng 100 mét với hai dãy nhà phố hai bên, vỉa hè, cột điện, đèn đường, cây xanh và dòng xe máy/ô tô lưu thông hai chiều.',
  mount(stage, api) {
    return MY_CITY.mountController(stage, api, new MY_CITY.StreetController(), true);
  },
});
