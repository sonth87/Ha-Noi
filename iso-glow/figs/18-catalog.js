/* Fig 18 — Catalog nhà phố Hà Nội:
   10 mẫu nhà phố trên từng lô đất riêng, Q/E xoay 4 hướng, ←/→ chọn lô, R đổi ngẫu nhiên, P khôi phục. */
FIGS.push({
  id: 'catalog',
  name: 'Catalog nhà phố',
  hint: 'Q E xoay · ← → chọn lô · Space bật đèn · R ngẫu nhiên · P mặc định · N ngày/đêm',
  aria: 'Bộ sưu tập các mẫu nhà ống và nhà phố Hà Nội dọc một dãy phố. Dùng Q/E để xoay góc nhìn, mũi tên trái/phải hoặc click để chọn lô, Space bật đèn, R sinh ngẫu nhiên, P khôi phục mẫu gốc, N chuyển ngày/đêm.',
  mount(stage, api) {
    return MY_CITY.mountController(stage, api, new MY_CITY.CatalogController(), true);
  },
});
