/* Fig 16 — Cầu vượt Tây Sơn & Nút giao Thái Hà – Chùa Bộc:
   Xe chạy qua cầu vượt và dừng/đi theo đèn tín hiệu đếm ngược 4 pha. */
FIGS.push({
  id: 'flyover',
  name: 'Cầu vượt Tây Sơn',
  hint: 'Q E xoay 4 hướng · N ngày/đêm · T bật/tắt dòng xe · cuộn zoom',
  aria: 'Cầu vượt Tây Sơn vắt qua nút giao Thái Hà – Chùa Bộc: hai làn ô tô giữa lên cầu vượt cao 6 m, các làn bên dưới dừng chờ đèn tín hiệu 4 pha có đồng hồ đếm ngược ở 4 góc ngã tư.',
  mount(stage, api) {
    return MY_CITY.mountLandmark(stage, api, 'flyover');
  },
});
