/* Fig 11 — Ga đường sắt trên cao Thái Hà (Tuyến 2A Cát Linh – Hà Đông):
   4-direction rotation (Q/E), day/night (N), clickable floor lights (MS/1, MS/2, MS/3),
   and live Line 2A train arrival/boarding/departure on Track 1 & Track 2 (1, 2, T or click a train). */
FIGS.push({
  id: 'metro-thai-ha',
  name: 'Ga Metro Thái Hà (2A)',
  hint: 'Q E xoay 4 hướng · 1 2 hoặc T chạy tàu · N ngày/đêm · Space hoặc click bật đèn tầng · cuộn zoom',
  aria: 'Ga đường sắt trên cao Thái Hà (Tuyến 2A Cát Linh – Hà Đông) trên phố Hoàng Cầu: 5 nhịp trụ đôi ở dải phân cách giữa với xà mũ chữ Y/T, tầng trung chuyển có cửa sổ kính ngang và 2 cổng loggia thoáng, tầng ke ga có 4 mảng tường gạch hình thoi xanh – trắng và 2 đoàn tàu 4 toa, mái vòm đôi chữ C kèm giếng trời vòm thép, và 4 cầu bộ hành vượt qua lòng đường xuống 4 cụm thang máy + thang bộ/thang cuốn trên vỉa hè ngoài.',
  css: `
    [data-fig="metro-thai-ha"] .ms-train { cursor: pointer; transition: opacity .25s; }
    [data-fig="metro-thai-ha"] .ms-edge.blink .win { animation: ms-edge-blink .45s steps(2) infinite; }
    @keyframes ms-edge-blink { 50% { fill: var(--recess); stroke: var(--detail); } }
  `,
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'metro-station');
  },
});
