/* Fig 15 — Vườn cây rậm: góc Đông Nam Tây Sơn × Chùa Bộc. */
FIGS.push({
  id: 'garden-grove',
  name: 'Vườn cây rậm',
  hint: 'Q E xoay 4 hướng · N hoặc Space bật đèn vườn ban đêm · cuộn zoom',
  aria: 'Vườn cây rậm ở góc Đông Nam ngã tư Tây Sơn – Chùa Bộc: tán cây dày đan xen, lối đi uốn khúc xuyên vườn với ghế nghỉ và đèn vườn ban đêm.',
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'garden-grove');
  },
});
