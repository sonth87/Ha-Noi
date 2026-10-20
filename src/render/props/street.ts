/* Street furniture for one straight street (FR-32, FR-34, FR-35): base slab with the road and
   lane markings (and the lamps' light pools, so they lie under everything), two sidewalks, poles
   with lamps, trees, sagging wires with pulses, and the two traffic lanes with their motorbikes.
   Everything is drawn in street-local coordinates through the street's own frame, so it turns
   with the view like the houses do. Each prop is a depth-sorted item; the bounding boxes are
   chosen so no two items interpenetrate (wires pass in front of the poles, lamps above wires). */
import type { Kernel } from '@iso/kernel';
import { slits } from '@iso/kernel';
import { localFrame, rotateSpec, type LocalSide } from '@core/view';
import { STREET, streetCenter, streetFrameSpec, type StreetLayout } from '@core/layout';
import { resolveSpec } from '@core/spec';
import { TREE } from '@core/units';
import type { Item, ViewK } from '@core/types';
import { LocalDraw, type LV } from '@render/local';
import { sagLine } from '@render/geom';
import { sticker } from '@render/parts/signs';
import { scooter } from '@render/parts/bike';
import { f, g } from '@render/svg';

const POLE_H = 92, ARM_Z = 84;
export const LANE_PIECE = 50;

export function streetFrame(k: ViewK) {
  const [cx, cy] = streetCenter();
  return localFrame(rotateSpec(streetFrameSpec(), k, cx, cy));
}

export function renderStreet(K: Kernel, lay: StreetLayout, k: ViewK): Item[] {
  const L = streetFrame(k), D = new LocalDraw(K, L), items: Item[] = [];
  const add = (id: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `street:${id}`, box: L.box(a, b, z, la, lb, h), svg });
  const len = STREET.length, [r0, r1] = STREET.road;

  // ---- slab, road, markings, light pools ----
  {
    let svg = D.box(0, 0, -6, len, STREET.depth, 6);
    const mid = (r0 + r1) / 2;
    svg += g(D.plane([0, r0, 0], [1, 0, 0], [0, 1, 0]),
      `<rect class="road" width="${len}" height="${r1 - r0}"/>` +
      `<path class="lane-solid" d="M0 ${f(mid - r0 - 0.8)}H${len}M0 ${f(mid - r0 + 0.8)}H${len}"/>` +
      `<path class="lane" d="M0 3H${len}M0 ${r1 - r0 - 3}H${len}"/>`);
    for (const p of lay.poles) {
      const b = p.row === 'far' ? STREET.far.pole + 24 : STREET.near.pole - 20;
      svg += `<g class="lamp-pool" data-night="1">${g(D.plane([p.x, b, 0.1], [1, 0, 0], [0, 1, 0]), `<circle class="halo" r="20" filter="url(#bloom)"/>`)}</g>`;
    }
    add('slab', 0, 0, -6, len, STREET.depth, 6, svg);
  }

  // ---- sidewalks, one piece per house frontage (and per alley mouth): a single 100 m box would sit
  //      both before and after things along the street and close a ring no draw order can satisfy;
  //      cutting exactly at the house boundaries keeps every piece's relations local to its house ----
  for (const [row, b0] of [['far', STREET.farFacade], ['near', r1]] as const) {
    const w = STREET.sidewalk, cuts = new Set<number>([0, len]);
    for (const h of lay.houses) if (h.row === row) { const sp = resolveSpec(h.input).spec; cuts.add(sp.x); cuts.add(sp.x + sp.w); }
    const xs = [...cuts].sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      const x = xs[i]!, pw = xs[i + 1]! - x;
      if (pw <= 0.01) continue;
      const svg = D.box(x, b0, 0, pw, w, 2) +
        g(D.plane([x, b0, 2], [1, 0, 0], [0, 1, 0]), `${slits(10 - (x % 10), pw - 0.01, 10, 0, w)}<line class="detail" x1="0" y1="${w / 2}" x2="${pw}" y2="${w / 2}"/>`);
      add(`walk-${row}-${i}`, x, b0, 0, pw, w, 2, svg);
    }
  }

  // ---- poles (with a tangle of cable and A5 stickers) and lamps ----
  lay.poles.forEach((p, i) => {
    const b = p.row === 'far' ? STREET.far.pole : STREET.near.pole, toRoad: LocalSide = p.row === 'far' ? '+b' : '-b';
    let svg = D.box(p.x - 2, b, 2, 4, 4, POLE_H) + D.box(p.x - 10, b + 1, ARM_Z - 2, 20, 2, 2);
    for (const z of [72, 74.5, 77]) svg += g(D.plane([p.x, b + 2, z], [1, 0, 0], [0, 1, 0]), `<ellipse class="wire" cx="0" cy="0" rx="6.5" ry="6"/>`);
    const face = D.face(p.x - 2, b, 2, 4, 4, 34, toRoad);
    if (face) svg += g(face.t, sticker(0.6, 0) + sticker(0.8, 6.5, 2.4, 3));
    add(`pole-${i}`, p.x - 10, b, 2, 20, 4, POLE_H, svg);

    // lamp: an arm reaching over the road
    const s = p.row === 'far' ? 1 : -1, b0 = p.row === 'far' ? b + 4 : b, bb = (d: number) => b0 + s * d;
    const bulb = D.P(p.x, bb(16), 88.6);
    const lamp = `<path class="mast" d="${D.path([[p.x, b0, ARM_Z + 4], [p.x, bb(12), ARM_Z + 8], [p.x, bb(16), ARM_Z + 6]])}"/>` +
      `<g class="lamp" data-night="1"><circle class="halo" cx="${f(bulb[0])}" cy="${f(bulb[1])}" r="8" filter="url(#bloom)"/><circle class="bulb" cx="${f(bulb[0])}" cy="${f(bulb[1])}" r="2"/></g>`;
    add(`lamp-${i}`, p.x - 1, Math.min(b0, bb(17)), ARM_Z + 2, 2, 17, 8, lamp);
  });

  // ---- wires: through every crossarm on a side, sagging between poles; a few carry pulses ----
  for (const rw of ['far', 'near'] as const) {
    const ps = lay.poles.filter(p => p.row === rw).sort((a, b) => a.x - b.x);
    const b0 = rw === 'far' ? STREET.far.pole + 4.3 : STREET.near.pole - 1.8;
    // one item per stretch between pole centres (same reason as the sidewalk pieces): every wire is
    // cut at the same x, so the stretches only touch; each stretch carries its own pulses
    // cut at every pole and at both edges of every tree crown on this side: a wire stretch running
    // past a pole and through a crown would otherwise close a pole → tree → wire draw-order ring
    const cuts = [...new Set([0, ...ps.map(p => p.x), ...treeEdges(lay, rw), len])].filter(x => x >= 0 && x <= len).sort((p, q) => p - q);
    const wires = Array.from({ length: 4 }, (_, i) => {
      const b = b0 + i * 0.5;
      const anchors: LV[] = [[0, b, ARM_Z - 4 - i], ...ps.map(p => [p.x - 9 + i * 6, b, ARM_Z] as LV), [len, b, ARM_Z - 3 - i]];
      const pts: LV[] = [];
      for (let j = 0; j < anchors.length - 1; j++) {
        const A = anchors[j]!, B = anchors[j + 1]!, span = B[0] - A[0];
        const seg = sagLine(A, B, 4 + span / 60 + i, Math.max(6, Math.round(span / 20)));
        pts.push(...(j ? seg.slice(1) : seg));
      }
      return pts;
    });
    for (let j = 0; j < cuts.length - 1; j++) {
      const x0 = cuts[j]!, x1 = cuts[j + 1]!;
      let svg = '', zMin = ARM_Z;
      wires.forEach((pts, i) => {
        const part = clipX(pts, x0, x1);
        if (part.length < 2) return;
        for (const p of part) zMin = Math.min(zMin, p[2]);
        const d = D.path(part);
        svg += `<path class="wire" d="${d}"/>`;
        if (i % 2 === 0) svg += `<path class="pulse" pathLength="1000" d="${d}"/>`;
      });
      add(`wires-${rw}-${j}`, x0, b0, zMin, x1 - x0, 1.6, ARM_Z - zMin, svg);
    }
  }

  // ---- lanes with their motorbikes (moved by the controller along the lane) ----
  // in LANE_PIECE pieces (long boxes close draw-order rings); a bike starts in the piece holding
  // its a0, and the controller moves it into the next piece's group as it rides on
  STREET.lanes.forEach((ln, i) => {
    const mid = (ln.y0 + ln.y1) / 2, pieces = Math.ceil(len / LANE_PIECE);
    const byPiece: string[] = Array.from({ length: pieces }, () => '');
    for (const bk of lay.bikes.filter(b => b.lane === i)) byPiece[Math.min(pieces - 1, Math.floor(bk.a0 / LANE_PIECE))] += bike(D, mid + bk.track, ln.dir, bk.a0, bk.v);
    byPiece.forEach((bikes, k) => {
      const x = k * LANE_PIECE, pw = Math.min(LANE_PIECE, len - x);
      add(`lane-${i}-${k}`, x, ln.y0, 0, pw, ln.y1 - ln.y0, 21, `<g class="lane" data-lane="${i}" data-piece="${k}">${bikes}</g>`);
    });
  });

  return items;
}

/** a moving scooter with its rider at a = 0…18 along the lane; the controller slides it to a(t) */
function bike(D: LocalDraw, b: number, dir: 1 | -1, a0: number, v: number): string {
  return `<g class="bike" data-a0="${f(a0)}" data-v="${v}" data-dir="${dir}">${scooter(D, 'a', 0, b, dir, 0, true)}</g>`;
}

/** the part of a polyline (monotone in x) between x0 and x1, with interpolated end points */
function clipX(pts: LV[], x0: number, x1: number): LV[] {
  const out: LV[] = [];
  const at = (p: LV, q: LV, x: number): LV => { const t = (x - p[0]) / (q[0] - p[0]); return [x, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; };
  for (let k = 0; k < pts.length - 1; k++) {
    const p = pts[k]!, q = pts[k + 1]!;
    if (q[0] <= x0 || p[0] >= x1) continue;
    if (!out.length) out.push(p[0] < x0 ? at(p, q, x0) : p);
    out.push(q[0] > x1 ? at(p, q, x1) : q);
  }
  return out;
}

/** x of both crown edges of every street tree on one side (as the houses will draw them) */
function treeEdges(lay: StreetLayout, row: 'far' | 'near'): number[] {
  const xs: number[] = [];
  for (const h of lay.houses) {
    if (h.row !== row) continue;
    const sp = resolveSpec(h.input).spec;
    if (sp.trees === 'none') continue;
    const ra = TREE[sp.treeSize].ra, both = sp.trees === 'both' && sp.w - 8 >= 2 * ra;
    const at = both ? [4, sp.w - 4] : sp.trees === 'right' ? [sp.w - 4] : [4];
    for (const a of at) { const x = row === 'far' ? sp.x + a : sp.x + sp.w - a; xs.push(x - ra, x + ra); }
  }
  return xs;
}
