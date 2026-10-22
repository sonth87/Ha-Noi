/* Fig 14 — Vườn hoa tròn: góc Tây Nam Tây Sơn × Chùa Bộc. */
FIGS.push({
  id: 'garden-circle',
  name: 'Vườn hoa tròn',
  hint: 'Q E xoay 4 hướng · N hoặc Space bật đèn vườn ban đêm · cuộn zoom',
  aria: 'Vườn hoa tròn ở góc Tây Nam ngã tư Tây Sơn – Chùa Bộc: quảng trường tròn có bồn hoa 2 tầng ở giữa, lối đi vòng với ghế đá và đèn vườn tỏa sáng ban đêm.',
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'garden-circle');
  },
});
