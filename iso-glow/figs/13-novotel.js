/* Fig 13 — Novotel Thái Hà (2 Thái Hà): góc Đông Bắc Thái Hà × Tây Sơn.
   27 tầng bấm sáng, bể bơi trên mái khối đế, xoay 4 góc (Q/E), chuyển Ngày/Đêm (N). */
FIGS.push({
  id: 'novotel',
  name: 'Novotel Thái Hà',
  hint: 'Q E xoay 4 hướng · click tầng hoặc Space bật đèn · N ngày/đêm · cuộn zoom',
  aria: 'Khách sạn Novotel Thái Hà 27 tầng ở góc Đông Bắc ngã tư Thái Hà – Tây Sơn: đế 5 tầng trắng chữ L có bể bơi trên mái, tháp kính bo tròn góc về phía ngã tư kẹp giữa hai dải trắng bậc thang.',
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'novotel');
  },
});
