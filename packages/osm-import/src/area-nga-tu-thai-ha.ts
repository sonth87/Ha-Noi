/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc: how to import it, and the hand corrections on top of OSM.
   Origin: the middle of the junction under the Tây Sơn flyover. Bearing: Tây Sơn runs 62.5°
   counter-clockwise from east (toward Ô Chợ Dừa), so it lies along +x and Thái Hà goes north (−y).
   Region: the crossroads (±160 m: the four 130 m arms and the junction, ADR-032), all of Phố Thái Hà,
   and Line 2A's viaduct round Thái Hà station (ADR-042). */
import type { AreaConfig } from './import';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

export const NGA_TU_THAI_HA: AreaConfig = {
  area: 'nga-tu-thai-ha',
  name: 'Quận Đống Đa: Thái Hà – Tây Sơn – Chùa Bộc – Láng Hạ – Hoàng Cầu – Ô Chợ Dừa – Xã Đàn – Khâm Thiên – Ngã Tư Sở',
  frame: { origin: [21.0092471, 105.8243958], bearing: 62.5 },
  // Full Đống Đa district extract covering Thái Hà, Tây Sơn, Chùa Bộc, Láng Hạ, Thái Thịnh, Yên Lãng,
  // Hoàng Cầu, Hào Nam, Cát Linh, Giảng Võ, Huỳnh Thúc Kháng, Thành Công, Nguyễn Lương Bằng, Ô Chợ Dừa,
  // Tôn Đức Thắng, Khâm Thiên, Xã Đàn, Nam Đồng, Hồ Đắc Di, Phạm Ngọc Thạch, Phương Mai, Kim Liên, Tôn Thất Tùng, Ngã Tư Sở
  region: [
    { x0: -1060, y0: -1880, x1: 1680, y1: 1120 },
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
      // VPBank Tower 89 Láng Hạ (ngã tư cuối đường Thái Hà – Láng Hạ – Huỳnh Thúc Kháng): 29 storeys glass curtain wall + podium & crown
      'osm:way/677190114': {
        name: 'VPBank Tower (89 Láng Hạ)', kind: 'office', model: 'vpbank-tower', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.1, 25)],
      },
      // Green Diamond 93 Láng Hạ (cạnh VPBank Tower): 28 storeys commercial + luxury apartment
      'osm:way/1368063988': {
        name: 'Green Diamond (93 Láng Hạ)', kind: 'apartment',
        floors: [...rep(4.2, 5), ...rep(3.2, 23)],
      },
      // Trung tâm Chiếu phim Quốc gia 87 Láng Hạ (góc Đông-Bắc ngã tư Thái Hà – Láng Hạ, đối diện VPBank Tower):
      // gộp cả 6 khối nhà rạp (1115247049..1115247054) cùng sảnh vòm tròn góc ngã tư (model: 'national-cinema')
      'osm:way/1115247053': {
        name: 'Trung tâm Chiếu phim Quốc gia (87 Láng Hạ)', kind: 'commercial', model: 'national-cinema',
        parts: {
          'osm:way/1115247053': { floors: [...rep(4.8, 3), ...rep(4.2, 2)] },
          'osm:way/1115247052': { floors: [...rep(4.8, 3), ...rep(4.2, 2)], facade: 'glass' },
          'osm:way/1115247054': { floors: [...rep(4.8, 3), ...rep(4.2, 2)] },
          'osm:way/1115247051': { floors: rep(4.5, 4) },
          'osm:way/1115247050': { floors: rep(4.5, 4) },
          'osm:way/1115247049': { floors: rep(4.2, 3) },
        },
      },
      // Petrovietnam Tower 18 Láng Hạ (đối diện cuối đường Thái Hà): 19-storey glass office tower + podium wings
      'osm:way/1217754319': {
        name: 'Petrovietnam Tower (18 Láng Hạ)', kind: 'office',
        parts: {
          'osm:way/841374814': { floors: [...rep(4.2, 4), ...rep(3.5, 15)], facade: 'glass' },
          'osm:way/1217754316': { floors: rep(4.0, 6) },
          'osm:way/1217754317': { floors: rep(4.0, 6) },
          'osm:way/1217754318': { floors: rep(4.0, 4) },
        },
      },
      // BRG Tower / Oriental Plaza 16 Láng Hạ (ngay cạnh Petrovietnam Tower, cuối đường Thái Hà)
      'osm:way/926276853': {
        name: 'BRG Tower – Oriental Plaza (16 Láng Hạ)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 18)],
      },
      'osm:way/926276852': {
        name: 'Oriental Plaza – Khối B (16 Láng Hạ)', kind: 'commercial',
        floors: [...rep(4.2, 4), ...rep(3.3, 18)],
      },
      // Tòa nhà TDL 22 Láng Hạ (góc Tây-Nam ngã tư Thái Hà – Láng Hạ – Huỳnh Thúc Kháng)
      'osm:way/1319809023': {
        name: 'Tòa nhà TDL (22 Láng Hạ)', kind: 'office',
        floors: [...rep(4.0, 2), ...rep(3.4, 6)],
      },
      // Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng, ngay đầu ngã tư Thái Hà – Láng Hạ)
      'osm:way/1195546201': {
        name: 'Đài Phát thanh – Truyền hình Hà Nội (3–5 Huỳnh Thúc Kháng)', kind: 'office',
        floors: [...rep(4.2, 2), ...rep(3.5, 7)],
      },
      // Sông Hồng Park View 165 Thái Hà (tổ hợp 2 tòa tháp 21 tầng + 1 tòa văn phòng 14 tầng trên khối đế 4 tầng)
      'osm:way/1082814006': {
        name: 'Sông Hồng Park View (165 Thái Hà)', kind: 'apartment',
        parts: {
          'osm:way/1365535486': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
          'osm:way/1365535487': { floors: [...rep(4.2, 4), ...rep(3.2, 17)] },
          'osm:way/1365535488': { floors: [...rep(4.2, 4), ...rep(3.4, 10)], facade: 'glass' },
        },
      },
      // Tòa nhà 131 Thái Hà (chung cư – thương mại 19 tầng trên phố Thái Hà)
      'osm:way/1085065492': {
        name: 'Tòa nhà 131 Thái Hà', kind: 'apartment',
        floors: [...rep(4.2, 3), ...rep(3.2, 16)],
      },
      // Vinaconex Tower 34 Láng Hạ (27 storeys glass office tower)
      'osm:way/526930280': {
        name: 'Vinaconex Tower (34 Láng Hạ)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 23)],
      },
      // Sky City Towers 88 Láng Hạ (2 tháp A & B cao 31 tầng)
      'osm:way/841601171': {
        name: 'Sky City Towers – Tháp A (88 Láng Hạ)', kind: 'apartment',
        floors: [...rep(4.2, 3), ...rep(3.2, 28)],
      },
      'osm:way/841601172': {
        name: 'Sky City Towers – Tháp B (88 Láng Hạ)', kind: 'apartment',
        floors: [...rep(4.2, 3), ...rep(3.2, 28)],
      },
      // Hà Thành Plaza 102 Thái Thịnh (2 tháp 21 tầng trên khối đế thương mại 4 tầng)
      'osm:way/845096117': {
        name: 'Hà Thành Plaza (102 Thái Thịnh)', kind: 'commercial',
      },
      // Mipec Tower 229 Tây Sơn (5-storey podium + twin 25-storey towers)
      'osm:way/180075246': {
        name: 'MIPEC Tower (229 Tây Sơn)', kind: 'commercial',
        floors: [...rep(4.2, 5), ...rep(3.3, 20)],
      },
      // Oriental Tower 324 Tây Sơn (16 storeys, glass office facade)
      'osm:way/851595051': {
        name: 'Oriental Tower (324 Tây Sơn)', kind: 'office', facade: 'glass',
        floors: [...rep(4.0, 3), ...rep(3.4, 13)],
      },
      // TTG Tower 174 Thái Hà (13 storeys office)
      'osm:way/1346893415': {
        name: 'TTG Tower (174 Thái Hà)', kind: 'office', facade: 'glass',
        floors: [...rep(4.0, 2), ...rep(3.4, 11)],
      },
      // Hoàng Cầu Skyline 36 Hoàng Cầu (18 storeys apartment overlooking Hồ Hoàng Cầu)
      'osm:way/839881655': {
        name: 'Hoàng Cầu Skyline (36 Hoàng Cầu)', kind: 'apartment',
        floors: [...rep(4.0, 3), ...rep(3.2, 15)],
      },
      // PeakView Tower 36 Hoàng Cầu (21 storeys glass office tower)
      'osm:way/839881657': {
        name: 'PeakView Tower (36 Hoàng Cầu)', kind: 'office', facade: 'glass',
        floors: [...rep(4.2, 4), ...rep(3.4, 17)],
      },
      // T&T Capella 2 Phạm Ngọc Thạch (24 storeys commercial & luxury apartment)
      'osm:way/1184245771': {
        name: 'T&T Capella (2 Phạm Ngọc Thạch)', kind: 'apartment',
        floors: [...rep(4.2, 5), ...rep(3.2, 19)],
      },
    },
  },
};
