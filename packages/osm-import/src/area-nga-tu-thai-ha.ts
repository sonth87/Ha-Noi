/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc: how to import it, and the hand corrections on top of OSM.
   Origin: the middle of the junction under the Tây Sơn flyover. Bearing: Tây Sơn runs 62.5°
   counter-clockwise from east (toward Ô Chợ Dừa), so it lies along +x and Thái Hà goes north (−y).
   Region: the crossroads (±160 m: the four 130 m arms and the junction, ADR-032), all of Phố Thái Hà,
   and Line 2A's viaduct round Thái Hà station (ADR-042). */
import type { AreaConfig } from './import';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

export const NGA_TU_THAI_HA: AreaConfig = {
  area: 'nga-tu-thai-ha',
  name: 'Đống Đa: Thái Hà – Tây Sơn – Chùa Bộc – Láng Hạ – Hoàng Cầu – Ô Chợ Dừa – Xã Đàn – Ngã Tư Sở',
  frame: { origin: [21.0092471, 105.8243958], bearing: 62.5 },
  // Corridors covering the crossroads, Tây Sơn → Ngã Tư Sở, Nguyễn Lương Bằng → Ô Chợ Dừa,
  // Xã Đàn, Chùa Bộc → Phạm Ngọc Thạch, Phố Thái Hà, Metro 2A + Hoàng Cầu + Hồ Hoàng Cầu, and Láng Hạ
  region: [
    { x0: -920, y0: -180, x1: 160, y1: 180 },     // Ngã Tư Sở ← Tây Sơn → Ngã tư Thái Hà
    { x0: 160, y0: -180, x1: 1260, y1: 180 },     // Tây Sơn → Nguyễn Lương Bằng → Ô Chợ Dừa
    { x0: 780, y0: 140, x1: 1240, y1: 720 },      // Phố Xã Đàn (từ Ô Chợ Dừa)
    { x0: -140, y0: 160, x1: 240, y1: 900 },      // Phố Chùa Bộc → nút giao Phạm Ngọc Thạch – Tôn Thất Tùng
    { x0: -110, y0: -560, x1: 240, y1: -160 },    // Phố Thái Hà (đoạn nam)
    { x0: 20, y0: -1250, x1: 330, y1: -560 },     // Phố Thái Hà (đoạn bắc)
    { x0: -250, y0: -770, x1: 600, y1: -600 },    // Tuyến Metro 2A quanh ga Thái Hà
    { x0: 180, y0: -820, x1: 1020, y1: -320 },    // Phố Hoàng Cầu & Hồ Hoàng Cầu
    { x0: 820, y0: -520, x1: 1240, y1: -140 },    // Hoàng Cầu / Ga La Thành nối ra Ô Chợ Dừa
    { x0: -360, y0: -1400, x1: 905, y1: -1100 },  // Phố Láng Hạ & Cầu vượt Láng Hạ – Huỳnh Thúc Kháng
  ],
  overrides: {
    buildings: {
      // Tòa Thái Bình (Việt Tower, 1 Thái Hà; ADR-030 of the old app): 18 storeys. A commercial
      // base of 4 m storeys (the arm and the wedge, 11), the tower above it at 3.6 m.
      'osm:way/136257265': {
        name: 'Tòa Thái Bình (Việt Tower)', kind: 'commercial', model: 'viet-tower',
        parts: {
          'osm:way/845096110': { floors: [...rep(4, 11), ...rep(3.6, 7)] },
          'osm:way/1198548269': { floors: rep(4, 11) },
          'osm:way/1198548270': { floors: rep(4, 11) },
        },
      },
      // Novotel Thái Hà: 27 storeys as the hotel publishes them (OSM says 26): a 4.2 m podium of 5,
      // then 3 m storeys; the curved tower is glass, the two white strips stop at 24, the wing at 5.
      'osm:way/850419282': {
        name: 'Novotel Hanoi Thai Ha', kind: 'hotel', model: 'novotel',
        parts: {
          'osm:way/850419279': { floors: [...rep(4.2, 5), ...rep(3, 22)], facade: 'glass' },
          'osm:way/850419280': { floors: [...rep(4.2, 5), ...rep(3, 19)] },
          'osm:way/850419281': { floors: [...rep(4.2, 5), ...rep(3, 19)] },
          'osm:way/1198548268': { floors: rep(4.2, 5) },
        },
      },
      // Mipec Tower 229 Tây Sơn (5-storey podium + twin 25-storey towers)
      'osm:way/180075246': {
        name: 'MIPEC Tower (229 Tây Sơn)', kind: 'commercial',
        floors: [...rep(4.2, 5), ...rep(3.3, 20)],
      },
      // Oriental Tower 324 Tây Sơn (16 storeys, glass office facade)
      'osm:way/851595051': {
        name: 'Oriental Tower (324 Tây Sơn)', kind: 'office',
        floors: [...rep(4.0, 3), ...rep(3.4, 13)],
      },
      // TTG Tower 174 Thái Hà (13 storeys office)
      'osm:way/1346893415': {
        name: 'TTG Tower (174 Thái Hà)', kind: 'office',
        floors: [...rep(4.0, 2), ...rep(3.4, 11)],
      },
      // Hoàng Cầu Skyline 36 Hoàng Cầu (18 storeys apartment overlooking Hồ Hoàng Cầu)
      'osm:way/839881655': {
        name: 'Hoàng Cầu Skyline (36 Hoàng Cầu)', kind: 'apartment',
        floors: [...rep(4.0, 3), ...rep(3.2, 15)],
      },
    },
  },
};
