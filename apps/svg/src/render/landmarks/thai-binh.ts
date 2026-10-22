/* C1 · Tòa Thái Bình (Việt Tower, 1 Thái Hà; Parkson cũ), góc Thái Hà × Tây Sơn phía Ngã Tư Sở.
   Footprints are OpenStreetMap's (way 136257265 and its parts 845096110, 1198548269, 1198548270),
   turned so Tây Sơn runs along a and Thái Hà along b, 10 units/m; checked against the user's
   top-down and 3D massing views 2026-10-21. By massing only (no name, no logo — A9):
     - an eleven-storey base on the whole lot: a long arm with a round end up Thái Hà, and a wedge
       tapering to a round tip toward Tây Sơn;
     - the eighteen-storey tower between them on the Thái Hà side, its round end facing the wedge;
     - every floor one continuous ribbon window; a plant room and a lattice mast with a blinking
       aircraft light on the tower roof;
     - trees in the forecourt on Tây Sơn.
   The base and the tower are stacked items (z 0–11 floors, 11–18), so neither needs a convex plan.
   Plot-local a, b; the junction is at (w, d). Floors "TB/n". */
import type { Kernel } from '@iso/kernel';
import type { LocalFrame } from '@core/view';
import type { Item } from '@core/types';
import { rng } from '@core/rng';
import { LocalDraw, type LV } from '@render/local';
import { bounds, extrude, type Pt } from '@render/landmarks/shapes';
import { parkTree } from '@render/landmarks/garden';
import { f } from '@render/svg';

export const TB = { base: 11, baseH: 40, tower: 7, towerH: 36 } as const;

/** the whole building, floors 1–11 (plot 540 × 1175: Thái Hà side 3 m in, the wedge tip 6 m off Tây Sơn) */
const BASE: Pt[] = [[481, 153], [478, 463], [476, 788], [438, 819], [112, 1098], [89, 1110], [70, 1115], [55, 1115], [39, 1096], [40, 1056], [48, 1023], [242, 424], [342, 439], [385, 67], [409, 38], [450, 30], [483, 44], [510, 73], [510, 118], [500, 139]];
/** the tower, floors 12–18 */
const TOWER: Pt[] = [[242, 424], [342, 439], [478, 463], [476, 788], [438, 819], [383, 841], [338, 850], [296, 842], [257, 811], [241, 786], [219, 746], [213, 684], [221, 592], [230, 528]];

/** the plans, for other renderers (the 3D lab) */
export const TB_PLAN = { base: BASE, tower: TOWER } as const;

export function renderThaiBinh(K: Kernel, L: LocalFrame, w: number, d: number, id = 'TB'): { items: Item[]; floors: string[] } {
  const D = new LocalDraw(K, L), items: Item[] = [], floors: string[] = [];
  const add = (iid: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `${id}:${iid}`, box: L.box(a, b, z, la, lb, h), svg });
  const mass = (iid: string, ring: Pt[], z0: number, z1: number, first: number, floorH: number, glass: readonly [number, number]) => {
    const B = bounds(ring);
    add(iid, B.a, B.b, z0, B.la, B.lb, z1 - z0, extrude(D, ring, z0, z1, { bands: () => ({ id, first, floorH, glass }) }));
    for (let i = 0; i < Math.round((z1 - z0) / floorH); i++) floors.push(`${id}/${first + i}`);
  };
  const zB = TB.base * TB.baseH, zT = zB + TB.tower * TB.towerH;

  add('plot', 0, 0, -6, w, d, 6, D.box(0, 0, -6, w, d, 6));
  mass('base', BASE, 0, zB, 1, TB.baseH, [0.24, 0.78]);
  mass('tower', TOWER, zB, zT, TB.base + 1, TB.towerH, [0.3, 0.74]);

  // ---- roof: a plant room at the back, the mast over the round end ----
  add('plant', 290, 470, zT, 120, 90, 16, D.box(290, 470, zT, 120, 90, 16));
  {
    const H = 130, z0 = zT, ca = 350, cb = 745;
    const leg = (sa: number, sb: number) => D.path([[ca + sa * 8, cb + sb * 8, z0], [ca + sa * 1.2, cb + sb * 1.2, z0 + H]]);
    let m = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb]) => leg(sa!, sb!)).join('');
    // cross bracing: zig-zag on the two visible sides
    for (let z = z0; z < z0 + H - 8; z += 13) {
      const half = (t: number) => 8 - (6.8 * (t - z0)) / H, h0 = half(z), h1 = half(z + 13);
      const pts: LV[] = [[ca - h0, cb + h0, z], [ca + h1, cb + h1, z + 13], [ca + h0, cb - h0, z]];
      m += D.path(pts) + D.path([[ca - h0, cb + h0, z], [ca + h0, cb + h0, z], [ca + h0, cb - h0, z]]);
    }
    const top = D.P(ca, cb, z0 + H + 4);
    const svg = `<path class="mast" d="${m}${D.path([[ca, cb, z0 + H], [ca, cb, z0 + H + 6]])}"/>` +
      `<g class="lamp beacon" data-night="1"><circle class="halo" cx="${f(top[0])}" cy="${f(top[1])}" r="7" filter="url(#bloom)"/><circle class="bulb" cx="${f(top[0])}" cy="${f(top[1])}" r="1.8"/></g>`;
    add('mast', ca - 9, cb - 9, z0, 18, 18, H + 8, svg);
  }

  // ---- trees in the forecourt on Tây Sơn (b = d), clear of the wedge tip and the chamfered corner ----
  const r = rng(18), tb = d - 28;
  for (const a of [70, 150, 230, 310, 375]) {
    const t = parkTree(D, a, tb, 'medium', () => r.next());
    add(`tree-${a}`, a - t.ra, tb - t.rb, 0, 2 * t.ra, 2 * t.rb, t.h, t.svg);
  }
  return { items, floors };
}
