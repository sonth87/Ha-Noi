/* Ngã tư Thái Hà – Tây Sơn – Chùa Bộc: how to import it, and the hand corrections on top of OSM.
   Origin: the middle of the junction under the Tây Sơn flyover. Bearing: Tây Sơn runs 62.5°
   counter-clockwise from east (toward Ô Chợ Dừa), so it lies along +x and Thái Hà goes north (−y).
   Region: the crossroads (±160 m: the four 130 m arms and the junction, ADR-032), all of Phố Thái Hà,
   and Line 2A's viaduct round Thái Hà station (ADR-042). */
import type { AreaConfig } from './import';

const rep = (h: number, n: number) => Array.from({ length: n }, () => h);

export const NGA_TU_THAI_HA: AreaConfig = {
  area: 'nga-tu-thai-ha',
  name: 'Ngã tư Thái Hà – Tây Sơn – Chùa Bộc và phố Thái Hà',
  frame: { origin: [21.0092471, 105.8243958], bearing: 62.5 },
  // the crossroads (±160 m), Phố Thái Hà to its northern end in two strips (it drifts east going
  // north), and a strip along metro Line 2A round Thái Hà station (ADR-042)
  region: [
    { x0: -160, y0: -160, x1: 160, y1: 160 },
    { x0: -110, y0: -560, x1: 240, y1: -160 },
    { x0: 20, y0: -1250, x1: 330, y1: -560 },
    { x0: -250, y0: -770, x1: 600, y1: -600 },
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
    },
  },
};
