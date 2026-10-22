/* C2 · Novotel Thái Hà (2 Thái Hà), góc Thái Hà × Tây Sơn phía Ô Chợ Dừa. Footprints are
   OpenStreetMap's (way 850419282 and its parts 850419279 tower, 850419280/850419281 side strips,
   1198548268 wing), turned so Tây Sơn runs along a and Thái Hà along b, 10 units/m; checked
   against the user's top-down and 3D massing views 2026-10-21. By massing only (no name, no logo — A9):
     - a five-storey white podium: the front under the tower, and an L-shaped wing behind it,
       with a narrow tail running up Thái Hà; a pool on the wing roof;
     - the glass tower, a rectangle with its corner toward the junction swept round in a big
       curve, up to floor 27;
     - two white strips, stepped at their outer corners, framing the curve at both ends, to floor 24;
     - trees in the forecourt on Tây Sơn.
   Three stacked items (floors 1–5, 6–24, 25–27), so no plan needs to be convex. 27 floors.
   Plot-local a, b; the junction is at (0, d). Floors "NV/n". */
import type { Kernel } from '@iso/kernel';
import type { LocalFrame } from '@core/view';
import type { Item } from '@core/types';
import { rng } from '@core/rng';
import { LocalDraw } from '@render/local';
import { bounds, extrude, type Bands, type Pt } from '@render/landmarks/shapes';
import { parkTree } from '@render/landmarks/garden';

export const NV = { podium: 5, podiumH: 42, mid: 19, top: 3, towerH: 30 } as const;

/** podium, floors 1–5 (plot 460 × 965: Thái Hà side 4 m in, 10 m forecourt on Tây Sơn) */
const PODIUM: Pt[] = [[40, 588], [61, 618], [80, 641], [86, 655], [100, 687], [119, 715], [152, 752], [190, 780], [224, 803], [259, 818], [279, 843], [300, 865], [402, 861], [403, 799], [407, 575], [418, 243], [102, 236], [105, 31], [64, 29], [65, 232], [43, 233], [43, 478]];
/** the glass tower */
const TOWER: Pt[] = [[332, 478], [124, 477], [99, 503], [91, 536], [90, 578], [91, 618], [98, 639], [102, 650], [136, 702], [166, 730], [208, 762], [254, 788], [260, 791], [283, 801], [403, 799], [407, 575], [395, 537], [379, 507], [355, 487]];
/** floors 6–24: the tower with its two white strips (west one stepped toward the curve, south one likewise) */
const MID: Pt[] = [[43, 478], [40, 588], [61, 587], [61, 618], [80, 617], [80, 641], [98, 639], [102, 650], [136, 702], [166, 730], [208, 762], [254, 788], [260, 791], [259, 818], [281, 819], [279, 843], [301, 843], [300, 865], [402, 861], [403, 799], [407, 575], [395, 537], [379, 507], [355, 487], [332, 478], [124, 477]];

/** the plans, for other renderers (the 3D lab) */
export const NV_PLAN = { podium: PODIUM, mid: MID, tower: TOWER, glassy: (p: Pt, q: Pt) => glassy(p, q) } as const;

const onTower = new Set(TOWER.map(p => `${p[0]},${p[1]}`));
const glassy = (p: Pt, q: Pt) => onTower.has(`${p[0]},${p[1]}`) && onTower.has(`${q[0]},${q[1]}`);

export function renderNovotel(K: Kernel, L: LocalFrame, w: number, d: number, id = 'NV'): { items: Item[]; floors: string[] } {
  const D = new LocalDraw(K, L), items: Item[] = [], floors: string[] = [];
  const add = (iid: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `${id}:${iid}`, box: L.box(a, b, z, la, lb, h), svg });
  const zP = NV.podium * NV.podiumH, zM = zP + NV.mid * NV.towerH, zT = zM + NV.top * NV.towerH;
  const curtain = (first: number): Bands => ({ id, first, floorH: NV.towerH, glass: [0.08, 0.92] });
  const strip = (first: number): Bands => ({ id, first, floorH: NV.towerH, glass: [0.3, 0.7] });
  const push = (first: number, n: number) => { for (let i = 0; i < n; i++) floors.push(`${id}/${first + i}`); };

  // ---- plot: paved forecourt with chamfered corner toward the junction ----
  add('plot', 0, 0, -6, w, d, 6, D.box(0, 0, -6, w, d, 6) + `<path class="paving" d="${D.path([[100, d - 40, 0], [w, d - 40, 0]])}"/>`);

  // ---- podium, with the pool and loungers on the wing roof ----
  {
    let s = extrude(D, PODIUM, 0, zP, { bands: () => ({ id, first: 1, floorH: NV.podiumH, glass: [0.22, 0.78] }) });
    const z = zP + 0.1, a0 = 170, a1 = 370, b0 = 290, b1 = 420;
    s += `<path class="pool" d="${D.path([[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]])}Z"/>`;
    s += `<path class="pool-line" d="${[0.33, 0.66].map(t => { const a = a0 + (a1 - a0) * t; return D.path([[a, b0 + 2, z + 0.1], [a, b1 - 2, z + 0.1]]); }).join('')}"/>`;
    for (const sa of [130, 150, 170]) s += D.box(sa, b1 + 14, zP, 10, 4, 2.4);
    const B = bounds(PODIUM);
    add('podium', B.a, B.b, 0, B.la, B.lb, zP, s);
    push(1, NV.podium);
  }

  // ---- floors 6–24: glass tower + white strips; then the tower alone to 27 ----
  {
    const B = bounds(MID);
    add('mid', B.a, B.b, zP, B.la, B.lb, zM - zP, extrude(D, MID, zP, zM, {
      wall: (p, q) => (glassy(p, q) ? ' glass-wall' : ''),
      bands: (p, q) => (glassy(p, q) ? curtain(NV.podium + 1) : strip(NV.podium + 1)),
    }));
    push(NV.podium + 1, NV.mid);
  }
  {
    const B = bounds(TOWER), first = NV.podium + NV.mid + 1;
    add('top', B.a, B.b, zM, B.la, B.lb, zT - zM, extrude(D, TOWER, zM, zT, { wall: () => ' glass-wall', bands: () => curtain(first) }));
    push(first, NV.top);
  }
  add('plant', 150, 520, zT, 180, 120, 24, D.box(150, 520, zT, 180, 120, 24));

  // ---- trees in the forecourt on Tây Sơn, clear of the chamfered corner ----
  const r = rng(27), tb = d - 22;
  for (const a of [165, 230, 295, 360, w - 30]) {
    const t = parkTree(D, a, tb, 'medium', () => r.next());
    add(`tree-${a}`, a - t.ra, tb - t.rb, 0, 2 * t.ra, 2 * t.rb, t.h, t.svg);
  }
  return { items, floors };
}
