/* Street furniture for one straight street (FR-32, FR-34, FR-35): base slab with the road and
   lane markings (and the lamps' light pools, so they lie under everything), two sidewalks, poles
   with lamps, trees, sagging wires with pulses, and the two traffic lanes with their motorbikes.
   Everything is drawn in street-local coordinates through the street's own frame, so it turns
   with the view like the houses do. Each prop is a depth-sorted item; the bounding boxes are
   chosen so no two items interpenetrate (wires pass in front of the poles, lamps above wires). */
import type { Kernel } from '@iso/kernel';
import { slits } from '@iso/kernel';
import { localFrame, rotateSpec, type LocalFrame, type LocalSide } from '@core/view';
import { lanePieces, streetCenter, streetFrameSpec, type StreetLayout } from '@core/layout';
import { resolveSpec } from '@core/spec';
import { TREE } from '@core/units';
import type { Item, ViewK } from '@core/types';
import { LocalDraw, type LV } from '@render/local';
import { sagLine } from '@render/geom';
import { sticker } from '@render/parts/signs';
import { SCOOTER_LEN, scooter } from '@render/parts/bike';
import { CAR_LEN, car } from '@render/parts/car';
import { f, g } from '@render/svg';

const POLE_H = 92, ARM_Z = 84, SLAB_PIECE = 150;

export function streetFrame(k: ViewK) {
  const [cx, cy] = streetCenter();
  return localFrame(rotateSpec(streetFrameSpec(), k, cx, cy));
}

/** A street (or a corridor of the crossroads) drawn in its frame L. Item ids start with `id`. */
export function renderStreet(K: Kernel, lay: StreetLayout, L: LocalFrame, id = 'street'): Item[] {
  const D = new LocalDraw(K, L), items: Item[] = [], S = lay.section;
  const add = (iid: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `${id}:${iid}`, box: L.box(a, b, z, la, lb, h), svg });
  const len = lay.length, [r0, r1] = S.road, gap = lay.gap;
  // stretches of the street outside the junction
  const spans: [number, number][] = gap ? [[0, gap[0]], [gap[1], len]] : [[0, len]];
  const inGap = (x: number) => !!gap && x > gap[0] && x < gap[1];

  // ---- slab: the road band in SLAB_PIECE pieces (with markings and the lamps' light pools) and
  //      the lot strips under each range of houses. 15 m is a whole number of lane dashes (8 + 7)
  //      and sidewalk slits (10), so the markings run on across the cuts. ----
  spans.forEach(([s0, s1], si) => {
    for (let x0 = s0, pi = 0; x0 < s1 - 0.01; x0 += SLAB_PIECE, pi++) {
      const x1 = Math.min(x0 + SLAB_PIECE, s1), sl = x1 - x0;
      let svg = D.box(x0, S.farFacade, -6, sl, S.nearFacade - S.farFacade, 6);
      svg += g(D.plane([x0, r0, 0], [1, 0, 0], [0, 1, 0]), `<rect class="road" width="${f(sl)}" height="${r1 - r0}"/>` + roadMarks(lay, sl));
      for (const p of lay.poles) {
        if (p.x < x0 || p.x >= x1) continue;
        const b = p.row === 'far' ? S.far.pole + 24 : S.near.pole - 20;
        svg += `<g class="lamp-pool" data-night="1">${g(D.plane([p.x, b, 0.1], [1, 0, 0], [0, 1, 0]), `<circle class="halo" r="20" filter="url(#bloom)"/>`)}</g>`;
      }
      add(`slab-${si}-${pi}`, x0, S.farFacade, -6, sl, S.nearFacade - S.farFacade, 6, svg);
    }
  });
  lay.ranges.forEach((rg, i) => {
    const b0 = rg.row === 'far' ? 0 : S.nearFacade, bd = rg.row === 'far' ? S.farFacade : S.depth - S.nearFacade;
    add(`lots-${i}`, rg.x0, b0, -6, rg.x1 - rg.x0, bd, 6, D.box(rg.x0, b0, -6, rg.x1 - rg.x0, bd, 6));
  });

  // ---- sidewalks, one piece per house frontage (and per alley mouth): a single 100 m box would sit
  //      both before and after things along the street and close a ring no draw order can satisfy;
  //      cutting exactly at the house boundaries keeps every piece's relations local to its house.
  //      Where there are no houses (in front of a corner plot) it is cut every LANE_PIECE. ----
  for (const [row, b0] of [['far', S.farFacade], ['near', r1]] as const) {
    const w = S.sidewalk, cuts = new Set<number>(spans.flat());
    for (const h of lay.houses) if (h.row === row) { const sp = resolveSpec(h.input).spec; cuts.add(sp.x); cuts.add(sp.x + sp.w); }
    const ranges = lay.ranges.filter(q => q.row === row);
    for (const q of ranges) { cuts.add(q.x0); cuts.add(q.x1); }
    for (const [s0, s1] of spans) for (let x = s0; x < s1; x += 50) if (!ranges.some(q => x > q.x0 && x < q.x1)) cuts.add(x);
    const xs = [...cuts].sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      const x = xs[i]!, pw = xs[i + 1]! - x;
      if (pw <= 0.01 || inGap(x + pw / 2)) continue;
      const svg = D.box(x, b0, 0, pw, w, 2) +
        g(D.plane([x, b0, 2], [1, 0, 0], [0, 1, 0]), `${slits(10 - (x % 10), pw - 0.01, 10, 0, w)}<line class="detail" x1="0" y1="${w / 2}" x2="${pw}" y2="${w / 2}"/>`);
      add(`walk-${row}-${i}`, x, b0, 0, pw, w, 2, svg);
    }
  }

  // ---- median (Tây Sơn): a raised strip, in pieces, wherever the flyover's ramps are not ----
  if (S.median) {
    const [m0, m1] = S.median, fl = lay.flyover;
    for (const [s0, s1] of spans) for (let x = s0; x < s1 - 0.01; x += 50) {
      const x1 = Math.min(x + 50, s1);
      if (fl && x1 > fl.r[0] && x < fl.r[3]) continue;
      add(`median-${Math.round(x)}`, x, m0, 0, x1 - x, m1 - m0, 2.4, D.box(x, m0, 0, x1 - x, m1 - m0, 2.4) +
        g(D.plane([x, m0, 2.4], [1, 0, 0], [0, 1, 0]), slits(10 - (x % 10), x1 - x - 0.01, 10, 0, m1 - m0)));
    }
  }

  // ---- poles (with a tangle of cable and A5 stickers) and lamps ----
  lay.poles.forEach((p, i) => {
    const b = p.row === 'far' ? S.far.pole : S.near.pole, toRoad: LocalSide = p.row === 'far' ? '+b' : '-b';
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

  // ---- wires: through every crossarm on a side, sagging between poles; a few carry pulses. Per
  //      stretch: from the street's end (if the stretch has one) through its poles; a wire stops at
  //      the last pole before the junction ----
  for (const rw of ['far', 'near'] as const) {
    const b0 = rw === 'far' ? S.far.pole + 4.3 : S.near.pole - 1.8;
    spans.forEach(([s0, s1], si) => {
      const ps = lay.poles.filter(p => p.row === rw && p.x > s0 && p.x < s1).sort((a, b) => a.x - b.x);
      const startEnd = s0 === 0, endEnd = s1 === len;
      if (ps.length + (startEnd ? 1 : 0) + (endEnd ? 1 : 0) < 2) return;
      const x0 = startEnd ? 0 : ps[0]!.x - 9, x1 = endEnd ? len : ps[ps.length - 1]!.x + 9;
      // one item per stretch between pole centres and crown edges: a wire stretch running past a
      // pole and through a crown would otherwise close a pole → tree → wire draw-order ring
      const cuts = [...new Set([x0, ...ps.map(p => p.x), ...treeEdges(lay, rw), x1])].filter(x => x >= x0 && x <= x1).sort((p, q) => p - q);
      const wires = Array.from({ length: 4 }, (_, i) => {
        const b = b0 + i * 0.5;
        const anchors: LV[] = [...(startEnd ? [[0, b, ARM_Z - 4 - i] as LV] : []), ...ps.map(p => [p.x - 9 + i * 6, b, ARM_Z] as LV), ...(endEnd ? [[len, b, ARM_Z - 3 - i] as LV] : [])];
        const pts: LV[] = [];
        for (let j = 0; j < anchors.length - 1; j++) {
          const A = anchors[j]!, B = anchors[j + 1]!, span = B[0] - A[0];
          const seg = sagLine(A, B, 4 + span / 60 + i, Math.max(6, Math.round(span / 20)));
          pts.push(...(j ? seg.slice(1) : seg));
        }
        return pts;
      });
      for (let j = 0; j < cuts.length - 1; j++) {
        const c0 = cuts[j]!, c1 = cuts[j + 1]!;
        let svg = '', zMin = ARM_Z;
        wires.forEach((pts, i) => {
          const part = clipX(pts, c0, c1);
          if (part.length < 2) return;
          for (const p of part) zMin = Math.min(zMin, p[2]);
          const d = D.path(part);
          svg += `<path class="wire" d="${d}"/>`;
          if (i % 2 === 0) svg += `<path class="pulse" pathLength="1000" d="${d}"/>`;
        });
        if (svg) add(`wires-${rw}-${spans.length > 1 ? `${si}-` : ''}${j}`, c0, b0, zMin, c1 - c0, 1.6, ARM_Z - zMin, svg);
      }
    });
  }

  // ---- lanes with their vehicles (moved by the controller along the lane) ----
  // in pieces (long boxes close draw-order rings); inside each piece one group per track, ordered
  // far → near for this view, so a bike on the near edge passes in front of a car and one on the
  // far edge behind it. A vehicle starts in the piece holding its middle and the controller moves it
  // into the next piece's group for the same track as it drives on. Flyover lanes leave their
  // span to render/props/flyover.ts.
  const nearIsPlusB = L.visible('+b');
  S.lanes.forEach((ln, i) => {
    const mid = (ln.y0 + ln.y1) / 2, pieces = lanePieces(lay, i);
    const byPiece: string[][] = pieces.map(() => ['', '', '']);
    lay.vehicles.forEach((vh, vi) => {
      if (vh.lane !== i) return;
      const k = pieceIndex(pieces, vh.a0 + vehicleLen(vh.kind) / 2);
      if (k >= 0) byPiece[k]![vh.track] += vehicle(D, vh.kind, mid + S.tracks[vh.track]!, ln.dir, vh.a0, vh.v, 0, `data-vid="${id}${vi}" data-st="${id}" data-lane="${i}" data-track="${vh.track}"`);
    });
    const order = nearIsPlusB ? [0, 1, 2] : [2, 1, 0];
    pieces.forEach(([x, x1], k) => {
      const groups = order.map(t => `<g data-track="${t}">${byPiece[k]![t]}</g>`).join('');
      add(`lane-${i}-${k}`, x, ln.y0, 0, x1 - x, ln.y1 - ln.y0, 21, `<g class="traffic-lane" data-st="${id}" data-lane="${i}" data-piece="${k}">${groups}</g>`);
    });
  });

  return items;
}

/** index of the piece holding x, or −1 when x is in none of them */
export function pieceIndex(pieces: readonly [number, number][], x: number): number {
  return pieces.findIndex(([x0, x1]) => x >= x0 && x < x1);
}

export const vehicleLen = (kind: StreetLayout['vehicles'][number]['kind']) => (kind === 'bike' ? SCOOTER_LEN : CAR_LEN[kind]);

/** lane lines: dashed between lanes going the same way, a double line between the two directions
    (unless a median is there), dashed edge lines; in street-local y from the road's edge */
function roadMarks(lay: StreetLayout, len: number): string {
  const L = f(len);
  const S = lay.section, r0 = S.road[0], ls = S.lanes;
  let solid = '', dash = `M0 3H${L}M0 ${S.road[1] - r0 - 3}H${L}`;
  for (let i = 0; i < ls.length - 1; i++) {
    const p = ls[i]!, q = ls[i + 1]!, y = (p.y1 + q.y0) / 2 - r0;
    if (p.dir === q.dir) dash += `M0 ${f(y)}H${L}`;
    else if (!S.median) solid += `M0 ${f(y - 0.8)}H${L}M0 ${f(y + 0.8)}H${L}`;
  }
  return `<path class="lane-solid" d="${solid}"/><path class="lane" d="${dash}"/>`;
}

/** a moving vehicle at a = 0…its length along the lane; the controller slides it to a(t) */
export function vehicle(D: LocalDraw, kind: StreetLayout['vehicles'][number]['kind'], b: number, dir: 1 | -1, a0: number, v: number, z = 0, extra = ''): string {
  const len = vehicleLen(kind);
  const body = kind === 'bike' ? scooter(D, 'a', 0, b, dir, 0, true) : car(D, kind, b, dir);
  // start where it belongs, so a still frame (and the first one) already shows the traffic in place
  const u = D.L.vec(1, 0, 0), [ux, uy] = D.K.D(u[0], u[1], u[2]);
  return `<g class="vehicle${kind === 'bike' ? ' bike' : ' car'}" ${extra} data-a0="${f(a0)}" data-v="${v}" data-dir="${dir}" data-len="${len}" transform="translate(${f(ux * a0)} ${f(uy * a0 - z)})">${body}</g>`;
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
export function treeEdges(lay: StreetLayout, row: 'far' | 'near'): number[] {
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
