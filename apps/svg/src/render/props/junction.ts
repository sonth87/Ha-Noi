/* The junction of the crossroads (FR-33, FR-35): road surface with zebra crossings and stop lines,
   four corner sidewalks with painted curbs, a traffic light on each corner, and the traffic cells
   the controller moves vehicles through. Drawn in Tây Sơn's frame (Lx): junction-local u = a − gap
   start, w = b − far facade line, so u runs along Tây Sơn and w along Thái Hà – Chùa Bộc.

   Each light head is a four-faced box: the faces looking along Tây Sơn show Tây Sơn's light, the
   faces looking along Thái Hà show theirs, so every view sees both. Lit lamps follow A8: stop =
   accent, yellow = accent-hi, go = live; each face has its countdown under the lamps. */
import type { Kernel } from '@iso/kernel';
import type { LocalFrame, LocalSide } from '@core/view';
import { junctionGrid, type Crossroads } from '@core/crossroads';
import { signalsAt } from '@core/traffic';
import type { Item } from '@core/types';
import { LocalDraw } from '@render/local';
import { f, g } from '@render/svg';

const WALK = 30;           // corner sidewalk size (both sections have 3 m sidewalks)
const POST_H = 46, HEAD = [6, 6, 17] as const;

export function renderJunction(K: Kernel, cr: Crossroads, Lx: LocalFrame): Item[] {
  const D = new LocalDraw(K, Lx), items: Item[] = [], J = cr.junction, SX = cr.x.lay.section;
  const A0 = cr.x.lay.gap![0], B0 = SX.farFacade;               // junction origin in X-local
  const W = J.w, H = J.d;
  const add = (id: string, u: number, w: number, z: number, lu: number, lw: number, h: number, svg: string) =>
    items.push({ id: `junction:${id}`, box: Lx.box(A0 + u, B0 + w, z, lu, lw, h), svg });
  const grid = junctionGrid(cr);

  // ---- slab: road, zebras across all four arms, stop lines ----
  {
    let marks = `<rect class="road" width="${W}" height="${H}"/>`;
    const zebra = (u0: number, w0: number, lu: number, lw: number, alongU: boolean) => {
      // bars run along the traffic: across a crossing that goes over Tây Sơn (along w) they stack in w
      let d = '';
      if (alongU) for (let w = w0 + 2; w < w0 + lw - 2; w += 6) d += `M${f(u0)} ${f(w)}h${f(lu)}v3h${f(-lu)}Z`;
      else for (let u = u0 + 2; u < u0 + lu - 2; u += 6) d += `M${f(u)} ${f(w0)}h3v${f(lw)}h-3Z`;
      return `<path class="zebra" d="${d}"/>`;
    };
    const r0 = SX.road[0] - B0, r1 = SX.road[1] - B0;            // Tây Sơn's road in w
    marks += zebra(5, r0, 20, r1 - r0, true) + zebra(W - 25, r0, 20, r1 - r0, true);
    marks += zebra(WALK, 5, W - 2 * WALK, 20, false) + zebra(WALK, H - 25, W - 2 * WALK, 20, false);
    // stop lines on the right-hand half of each approach (keep right): +x traffic arrives at u = 0 on
    // the near half of Tây Sơn, −x traffic at u = W on the far half; +y traffic (Thái Hà, southbound)
    // at w = 0 on the west half of the junction, −y traffic at w = H on the east half
    const mid = (r0 + r1) / 2;
    marks += `<path class="stop-line" d="M1.5 ${f(mid + 2)}V${f(r1)}M${f(W - 1.5)} ${f(r0)}V${f(mid - 2)}M${WALK} 1.5H${W / 2 - 2}M${W / 2 + 2} ${f(H - 1.5)}H${W - WALK}"/>`;
    add('slab', 0, 0, -6, W, H, 6, D.box(A0, B0, -6, W, H, 6) + g(D.plane([A0, B0, 0], [1, 0, 0], [0, 1, 0]), marks));
  }

  // ---- corner sidewalks with their curbs painted in stripes, and a traffic light on each ----
  const corners: [number, number, string][] = [[0, 0, 'nw'], [W - WALK, 0, 'ne'], [0, H - WALK, 'sw'], [W - WALK, H - WALK, 'se']];
  for (const [u, w, c] of corners) {
    const svg = D.box(A0 + u, B0 + w, 0, WALK, WALK, 2) + curbPaint(D, A0 + u, B0 + w, c);
    add(`corner-${c}`, u, w, 0, WALK, WALK, 2, svg);
    // the post stands at the tile's corner nearest the middle of the junction
    const pu = u + (u === 0 ? WALK - 7 : 4), pw = w + (w === 0 ? WALK - 7 : 4);
    add(`signal-${c}`, pu - 1, pw - 1, 2, HEAD[0] + 2, HEAD[1] + 2, POST_H + HEAD[2], signalPost(D, A0 + pu, B0 + pw));
  }

  // ---- traffic cells (vehicles are moved in and out by the controller) ----
  for (const key of grid.cells) {
    const [i, j] = key.split('-').map(Number) as [number, number];
    const u0 = grid.u[i]!, u1 = grid.u[i + 1]!, w0 = grid.w[j]!, w1 = grid.w[j + 1]!;
    add(`cell-${key}`, u0, w0, 0, u1 - u0, w1 - w0, 21, `<g class="traffic-cell" data-cell="${key}"></g>`);
  }
  return items;
}

/** red-and-white curb stripes along the two road edges of a corner tile (drawn in two greys) */
function curbPaint(D: LocalDraw, a: number, b: number, c: string): string {
  const out: string[] = [];
  const east = c === 'ne' || c === 'se', south = c === 'sw' || c === 'se';
  // the tile's edges facing the roads: toward the junction's middle in u and in w
  const eu = east ? a : a + WALK, ew = south ? b : b + WALK;
  const stripes = (p: (t: number) => [number, number]) => {
    let d = '';
    for (let t = 0; t < WALK - 0.1; t += 5) { const [x0, y0] = p(t), [x1, y1] = p(Math.min(WALK, t + 2.5)); d += D.path([[x0, y0, 2], [x1, y1, 2]]); }
    return d;
  };
  out.push(stripes(t => [eu, b + t]), stripes(t => [a + t, ew]));
  return `<path class="curb-paint" d="${out.join('')}"/>`;
}

/** a pole with a four-faced light head and countdowns */
function signalPost(D: LocalDraw, a: number, b: number): string {
  const [hw, hd, hh] = HEAD, z0 = POST_H;
  let s = D.box(a + hw / 2 - 0.8, b + hd / 2 - 0.8, 2, 1.6, 1.6, POST_H) + D.box(a, b, z0, hw, hd, hh, 0.6);
  const sides: [LocalSide, 'x' | 'y'][] = [['+a', 'x'], ['-a', 'x'], ['+b', 'y'], ['-b', 'y']];
  for (const [side, axis] of sides) {
    const fc = D.face(a, b, z0, hw, hd, hh, side);
    if (!fc) continue;
    const cx = fc.w / 2;
    const sig = signalsAt(0), st = sig[axis], left = String(axis === 'x' ? sig.xLeft : sig.yLeft).padStart(2, '0');
    s += g(fc.t, `<g class="signal ${st}" data-axis="${axis}">` +
      `<circle class="sig-lamp stop" cx="${f(cx)}" cy="2.6" r="1.5"/><circle class="sig-lamp wait" cx="${f(cx)}" cy="6.3" r="1.5"/><circle class="sig-lamp go" cx="${f(cx)}" cy="10" r="1.5"/>` +
      `<rect class="sig-screen" x="${f(cx - 2.3)}" y="12.3" width="4.6" height="3.6" rx="0.4"/>` +
      `<text class="sig-count" data-axis="${axis}" x="${f(cx)}" y="15.1" font-size="2.9" text-anchor="middle">${left}</text></g>`);
  }
  return s;
}
