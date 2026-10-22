/* Fig 17 — Nhà mẫu (Nhà ống Hà Nội):
   Click một tầng hoặc bấm 1–5 để bật đèn, Space bật cả nhà chính, N ngày/đêm, W phóng xung điện. */
FIGS.push({
  id: 'nha-mau',
  name: 'Nhà mẫu Hà Nội',
  hint: 'Click tầng · 1–5 · Space cả nhà · N ngày/đêm · W xung điện · cuộn zoom',
  aria: 'Nhà ống Hà Nội 5 tầng kẹp giữa hai nhà hàng xóm: tầng 1 quán cà phê có mái hiên, ban công cây xanh, chuồng cọp, sân thượng, téc nước Sơn Hà, vỉa hè lát gạch, cột điện và dây điện.',
  mount(stage, api) {
    return MY_CITY.mountController(stage, api, new MY_CITY.ReferenceController(), true);
  },
});
