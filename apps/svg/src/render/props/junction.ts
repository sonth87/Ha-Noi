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
import { TREE } from '@core/units';
import { rng } from '@core/rng';
import type { Item } from '@core/types';
import { LocalDraw, type LV } from '@render/local';
import { ccw, prism, type Pt } from '@render/landmarks/shapes';
import { treeArt } from '@render/parts/trees';
import { f, g } from '@render/svg';

const WALK = 30;           // corner sidewalk size (both sections have 3 m sidewalks)
const CHAMFER = 140;       // 14 m corner bevel along each street from the junction facade line
const ISLAND = 56;         // triangular traffic island reach into each arm
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

  // ---- four chamfered corners: diagonal right-turn slip lanes, outer chamfered sidewalks, and
  //      raised triangular traffic islands with curb stripes, traffic signals, and shade trees ----
  const corners: [number, number, -1 | 1, -1 | 1, string, number][] = [
    [0, 0, -1, -1, 'nw', 41],
    [W, 0, 1, -1, 'ne', 42],
    [0, H, -1, 1, 'sw', 43],
    [W, H, 1, 1, 'se', 44],
  ];
  for (const [u0, w0, su, sw, c, seed] of corners) {
    const pt = (du: number, dw: number): Pt => [A0 + u0 + su * du, B0 + w0 + sw * dw];
    const lv = (du: number, dw: number, z: number): LV => [A0 + u0 + su * du, B0 + w0 + sw * dw, z];

    // 1. slip lane road + zebra crossings + outer diagonal sidewalk (z = 0..0 so it sorts above -6..0 slabs and below z > 0 items)
    {
      const roadPoly = [lv(-WALK, -WALK, 0), lv(CHAMFER, -WALK, 0), lv(CHAMFER, 0, 0), lv(0, CHAMFER, 0), lv(-WALK, CHAMFER, 0)];
      let slipSvg = `<path class="road" d="${D.path(roadPoly)}Z"/>`;
      // dashed center line and edge lines along the diagonal slip lane
      const laneD = D.path([lv(-14, 86, 0.05), lv(86, -14, 0.05)]) +
        D.path([lv(-20, 58, 0.05), lv(58, -20, 0.05)]) +
        D.path([lv(-26, 134, 0.05), lv(134, -26, 0.05)]);
      slipSvg += `<path class="lane" d="${laneD}"/>`;
      // zebra crossings across both ends of the slip lane (connecting outer sidewalk to triangular island)
      let zebD = '';
      for (const d of [-38, 38]) {
        for (let s = 42; s <= 98; s += 8) {
          const du0 = (s + d) / 2, dw0 = (s - d) / 2;
          const bar = [lv(du0 - 6, dw0 + 6, 0.05), lv(du0 + 6, dw0 - 6, 0.05), lv(du0 + 8, dw0 - 4, 0.05), lv(du0 - 4, dw0 + 8, 0.05)];
          zebD += `${D.path(bar)}Z`;
        }
      }
      slipSvg += `<path class="zebra" d="${zebD}"/>`;
      // outer diagonal sidewalk connecting the Y sidewalk at dw = CHAMFER to the X sidewalk at du = CHAMFER
      const outerWalk: Pt[] = [pt(-WALK, CHAMFER), pt(0, CHAMFER), pt(CHAMFER, 0), pt(CHAMFER, -WALK)];
      slipSvg += prism(D, ccw(outerWalk), 0, 2);
      let walkDetail = D.path([lv(-WALK / 2, CHAMFER, 2), lv(CHAMFER, -WALK / 2, 2)]);
      const steps = 16;
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        walkDetail += D.path([lv(-WALK + (CHAMFER + WALK) * t, CHAMFER - (CHAMFER + WALK) * t, 2), lv(CHAMFER * t, CHAMFER * (1 - t), 2)]);
      }
      slipSvg += `<path class="detail" d="${walkDetail}"/>`;
      slipSvg += `<path class="curb-paint" d="${curbStripes(D, pt(-WALK, CHAMFER), pt(CHAMFER, -WALK))}"/>`;

      const uMin = Math.min(u0 - su * WALK, u0 + su * CHAMFER), wMin = Math.min(w0 - sw * WALK, w0 + sw * CHAMFER);
      add(`slip-${c}`, uMin, wMin, 0, WALK + CHAMFER, WALK + CHAMFER, 0, slipSvg);
    }

    // 2. raised triangular traffic island (đảo giao thông tam giác)
    {
      const islandRing: Pt[] = [pt(-WALK, -20), pt(-20, -WALK), pt(ISLAND - 6, -WALK), pt(ISLAND, -24), pt(-24, ISLAND), pt(-WALK, ISLAND - 6)];
      let islandSvg = prism(D, ccw(islandRing), 0, 2);
      // sidewalk paving slits across the island top
      let slitsD = '';
      for (let s = -36; s <= 24; s += 10) {
        const a0 = Math.max(-WALK, s - (ISLAND - 6)), b0 = s - a0;
        const b1 = Math.max(-WALK, s - (ISLAND - 6)), a1 = s - b1;
        if (a0 + b0 <= 32 && a1 >= a0) slitsD += D.path([lv(a0, b0, 2), lv(a1, b1, 2)]);
      }
      islandSvg += `<path class="detail" d="${slitsD}"/>`;
      // painted curb stripes on all three road-facing sides of the triangular island
      const curbD = curbStripes(D, pt(-20, -WALK), pt(ISLAND - 6, -WALK)) +
        curbStripes(D, pt(-WALK, -20), pt(-WALK, ISLAND - 6)) +
        curbStripes(D, pt(ISLAND, -24), pt(-24, ISLAND));
      islandSvg += `<path class="curb-paint" d="${curbD}"/>`;

      const uMin = Math.min(u0 - su * WALK, u0 + su * ISLAND), wMin = Math.min(w0 - sw * WALK, w0 + sw * ISLAND);
      add(`corner-${c}`, uMin, wMin, 0, WALK + ISLAND, WALK + ISLAND, 2, islandSvg);
    }

    // 3. traffic signal post near the main-junction corner of the triangular island
    const pu = u0 + su * -16 - HEAD[0] / 2, pw = w0 + sw * -16 - HEAD[1] / 2;
    add(`signal-${c}`, pu - 1, pw - 1, 2, HEAD[0] + 2, HEAD[1] + 2, POST_H + HEAD[2], signalPost(D, A0 + pu, B0 + pw));

    // 4. shade tree in the middle of the triangular island
    const r = rng(seed), tk = TREE.small;
    const tu = u0 + su * 6, tw = w0 + sw * 6;
    add(`tree-${c}`, tu - tk.ra, tw - tk.rb, 2, 2 * tk.ra, 2 * tk.rb, tk.zc + tk.rz, treeArt(D, A0 + tu, B0 + tw, 2, 'small', () => r.next()));
  }

  // ---- traffic cells (vehicles are moved in and out by the controller) ----
  for (const key of grid.cells) {
    const [i, j] = key.split('-').map(Number) as [number, number];
    const u0 = grid.u[i]!, u1 = grid.u[i + 1]!, w0 = grid.w[j]!, w1 = grid.w[j + 1]!;
    add(`cell-${key}`, u0, w0, 0, u1 - u0, w1 - w0, 21, `<g class="traffic-cell" data-cell="${key}"></g>`);
  }
  return items;
}

/** red-and-white curb stripes along an edge from p0 to p1 at height z = 2 */
function curbStripes(D: LocalDraw, p0: Pt, p1: Pt): string {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
  let d = '';
  for (let t = 0; t < len - 0.5; t += 6) {
    const t0 = t / len, t1 = Math.min(len, t + 3) / len;
    d += D.path([
      [p0[0] + dx * t0, p0[1] + dy * t0, 2],
      [p0[0] + dx * t1, p0[1] + dy * t1, 2],
    ]);
  }
  return d;
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
