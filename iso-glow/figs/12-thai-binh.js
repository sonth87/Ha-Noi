/* Fig 12 — Tòa Thái Bình (Việt Tower, Parkson cũ): góc Tây Bắc Thái Hà × Tây Sơn.
   18 tầng bấm sáng, xoay 4 góc (Q/E), chuyển Ngày/Đêm (N), đèn báo máy bay trên đỉnh ăng-ten. */
FIGS.push({
  id: 'thai-binh',
  name: 'Tòa Thái Bình (Việt Tower)',
  hint: 'Q E xoay 4 hướng · click tầng hoặc Space bật đèn · N ngày/đêm · cuộn zoom',
  aria: 'Tòa Thái Bình (Việt Tower, Parkson cũ) 18 tầng ở góc Tây Bắc ngã tư Thái Hà – Tây Sơn: khối đế 11 tầng với cánh dài đầu tròn dọc Thái Hà và khối nêm mũi tròn hướng ra Tây Sơn, tháp 18 tầng ở giữa và cột ăng-ten có đèn báo máy bay ban đêm.',
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'thai-binh');
  },
});
