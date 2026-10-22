/* Fig 21 — Shop-house 4 tầng (Hello):
   Click một tầng hoặc bấm phím 1–4 để bật đèn, Space bật toàn bộ, N chạy hiệu ứng sáng dần từ dưới lên. */
FIGS.push({
  id: 'hello',
  name: 'Shop-house 4 tầng',
  hint: 'Click tầng · 1–4 · Space tất cả · N sáng dần từng tầng',
  aria: 'Nhà phố thương mại 4 tầng trên đế trưng bày. Click vào tầng hoặc bấm phím 1 đến 4 để bật/tắt đèn tầng đó; Space bật/tắt cả ngôi nhà; N bật sáng lần lượt từ tầng 1 lên tầng 4.',
  mount(stage, api) {
    return MY_CITY.mountController(stage, api, new MY_CITY.HelloController(), true);
  },
});
