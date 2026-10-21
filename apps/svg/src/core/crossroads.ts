/* P4: the Thái Hà – Tây Sơn – Chùa Bộc crossroads (docs/architecture/overview.md §9, ADR-024).

   Two straight streets ("corridors") cross at right angles:
     X  Tây Sơn, along world +x (west = toward Ngã Tư Sở, east = toward Ô Chợ Dừa), section TAY_SON,
        with the flyover over the junction;
     Y  Thái Hà (north, a < junction) – Chùa Bộc (south), along world +y, section STREET.
   Each corridor is an ordinary street layout in its own frame (X: facing S at (0, ARM − 190);
   Y: facing W at (ARM − 190, 0), so its a runs north → south and its far row is the east side).
   Each leaves a gap where the other crosses; the junction (road, zebra crossings, corner sidewalks,
   traffic lights) fills it. The four corner plots belong to neither street:
     NW  tòa Thái Bình (Parkson cũ)   NE  Novotel
     SW  vườn hoa (circle plaza)      SE  vườn hoa (dense trees)
   The two towers use their real (OpenStreetMap) footprints, turned to the axes; the real
   street angles (≈ 94°) are P5. */
import { M } from '@core/units';
import { rng, type Rng } from '@core/rng';
import { STREET, TAY_SON, streetRows, type Flyover, type RowRange, type Section, type StreetLayout, type VehicleKind } from '@core/layout';
import type { Facing } from '@core/types';

/** street length on each side of the junction, junction edge → end of the arm; 130 m so the real
    Việt Tower (≈ 110 m along Thái Hà) fits with a few houses beyond it */
export const ARM = 130 * M;

export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export type PlotKind = 'thai-binh' | 'novotel' | 'garden-circle' | 'garden-grove';

export interface Plot {
  corner: Corner;
  kind: PlotKind;
  /** world rectangle, square to the axes */
  x: number; y: number; w: number; d: number;
  /** which local corner of the plot touches the junction (a = x − plot.x, b = y − plot.y) */
  toward: [-1 | 1, -1 | 1];
}

export interface FrameSpec { x: number; y: number; w: number; d: number; facing: Facing }

export interface Corridor {
  id: 'x' | 'y';
  /** world placement of the corridor's street-local frame */
  frame: FrameSpec;
  lay: StreetLayout;
}

export interface Crossroads {
  x: Corridor;
  y: Corridor;
  /** the junction in world space: x0, y0, size (w along x = Y's facade-to-facade width, d along y) */
  junction: { x: number; y: number; w: number; d: number };
  plots: Plot[];
  /** world size and centre (the pivot for view rotation) */
  size: [number, number];
  center: [number, number];
}

const band = (s: Section) => s.nearFacade - s.farFacade;

/** plot sizes [along x, along y]; deep enough to cover each street's lot strip (190). The two
    towers' plots fit their OpenStreetMap footprints (render/landmarks/thai-binh.ts, novotel.ts). */
export const PLOTS: Record<Corner, { kind: PlotKind; size: [number, number] }> = {
  nw: { kind: 'thai-binh', size: [540, 1175] },
  ne: { kind: 'novotel', size: [460, 965] },
  sw: { kind: 'garden-circle', size: [400, 380] },
  se: { kind: 'garden-grove', size: [400, 380] },
};

export function crossroadsLayout(seed: number): Crossroads {
  const r = rng(seed);
  const SX = TAY_SON, SY = STREET;
  const jw = band(SY), jd = band(SX);               // junction 140 × 220
  const CX = 2 * ARM + jw, CY = 2 * ARM + jd;
  const off = ARM - SX.farFacade;                    // = ARM − 190 for both sections
  const jx = ARM, jy = ARM;

  const P = (c: Corner) => PLOTS[c].size;
  const plots: Plot[] = (['nw', 'ne', 'sw', 'se'] as const).map(c => {
    const [pw, pd] = P(c), east = c === 'ne' || c === 'se', south = c === 'sw' || c === 'se';
    return {
      corner: c, kind: PLOTS[c].kind, w: pw, d: pd,
      x: east ? jx + jw : jx - pw,
      y: south ? jy + jd : jy - pd,
      toward: [east ? -1 : 1, south ? -1 : 1],
    };
  });

  // X (Tây Sơn): far row = north side, near row = south side; west arm a < ARM, east arm a > ARM + jw
  const xRanges: RowRange[] = [
    { row: 'far', x0: 0, x1: ARM - P('nw')[0] }, { row: 'far', x0: ARM + jw + P('ne')[0], x1: CX },
    { row: 'near', x0: 0, x1: ARM - P('sw')[0] }, { row: 'near', x0: ARM + jw + P('se')[0], x1: CX },
  ];
  // Y (Thái Hà – Chùa Bộc), facing W: far row = east side, near row = west side; north arm a < ARM
  const yRanges: RowRange[] = [
    { row: 'far', x0: 0, x1: ARM - P('ne')[1] }, { row: 'far', x0: ARM + jd + P('se')[1], x1: CY },
    { row: 'near', x0: 0, x1: ARM - P('nw')[1] }, { row: 'near', x0: ARM + jd + P('sw')[1], x1: CY },
  ];

  // the flyover: ramps 28 m, deck from 12 m before the junction to 12 m past it, 6 m up
  const flyover: Flyover = { lanes: [1, 2], r: [ARM - 400, ARM - 120, ARM + jw + 120, ARM + jw + 400], H: 60 };

  const xLay: StreetLayout = { name: 'Tây Sơn', length: CX, section: SX, ranges: xRanges, gap: [ARM, ARM + jw], flyover, ...streetRows(r, xRanges, 'TS', SX), vehicles: [] };
  const yLay: StreetLayout = { name: 'Thái Hà – Chùa Bộc', length: CY, section: SY, ranges: yRanges, gap: [ARM, ARM + jd], ...streetRows(r, yRanges, 'TH', SY), vehicles: [] };
  xLay.vehicles = traffic(r, xLay);
  yLay.vehicles = traffic(r, yLay);

  return {
    x: { id: 'x', frame: { x: 0, y: off, w: CX, d: SX.depth, facing: 'S' }, lay: xLay },
    y: { id: 'y', frame: { x: off, y: 0, w: CY, d: SY.depth, facing: 'W' }, lay: yLay },
    junction: { x: jx, y: jy, w: jw, d: jd },
    plots,
    size: [CX, CY],
    center: [CX / 2, CY / 2],
  };
}

/** Starting traffic: per lane, motorbikes on the edge tracks and cars in the middle, evenly spaced
    per track so nobody starts inside anybody, and none inside the junction. Flyover lanes carry
    cars only (motorbikes are not allowed on Hà Nội flyovers). */
function traffic(r: Rng, lay: StreetLayout): StreetLayout['vehicles'] {
  const out: StreetLayout['vehicles'] = [], L = lay.length, gap = lay.gap!;
  const free = (a: number, len: number) => a + len < gap[0] - 4 || a > gap[1] + 4;
  lay.section.lanes.forEach((ln, lane) => {
    const tracks: [number, number, VehicleKind | 'car'][] = ln.fly ? [[1, 5, 'car']] : [[0, 7, 'bike'], [2, 7, 'bike'], [1, 4, 'car']];
    for (const [track, n, kind] of tracks) {
      const off = r.next() * L, v = kind === 'bike' ? 0 : r.int(52, 66);
      for (let i = 0; i < n; i++) {
        const k: VehicleKind = kind === 'car' ? r.pick(['sedan', 'sedan', 'hatch', 'taxi', 'van'] as const) : 'bike';
        let a = (off + (i * L) / n + r.int(-20, 20) + L) % L;
        const len = k === 'bike' ? 18 : 48;
        if (!ln.fly && !free(a, len)) a = (gap[1] + 6 + Math.max(0, a - gap[0])) % L;   // a car overlapping the near edge would land back inside
        out.push({ kind: k, lane, a0: a, v: kind === 'bike' ? r.int(48, 78) : v, track });
      }
    }
  });
  return out;
}

/** The junction's traffic cells. Junction-local u runs along X (world x − junction.x), w along Y
    (world y − junction.y). Each lane crossing the junction is cut where it meets the other street's
    lanes; where an X lane and a Y lane cross they share one cell, so no two cells interpenetrate.
    Cells are keyed "i-j" (u interval i, w interval j). */
export interface JunctionGrid {
  u: number[];
  w: number[];
  /** X lane → its w interval; Y lane → its u interval (at-grade lanes only) */
  xLane: Map<number, number>;
  yLane: Map<number, number>;
  cells: string[];
}

export function junctionGrid(cr: Crossroads): JunctionGrid {
  const J = cr.junction, SX = cr.x.lay.section, SY = cr.y.lay.section;
  const toW = (b: number) => cr.x.frame.y + b - J.y;
  // Y frame faces W: street-local b maps to world x = frame.x + frame.d − b
  const toU = (b: number) => cr.y.frame.x + cr.y.frame.d - b - J.x;
  const xl = SX.lanes.map((l, i) => ({ i, r: [toW(l.y0), toW(l.y1)] as [number, number] })).filter(({ i }) => !SX.lanes[i]!.fly);
  const yl = SY.lanes.map((l, i) => ({ i, r: [toU(l.y1), toU(l.y0)] as [number, number] }));
  const cuts = (ext: number, rs: [number, number][]) => [...new Set([0, ext, ...rs.flat()])].sort((p, q) => p - q);
  const u = cuts(J.w, yl.map(l => l.r)), w = cuts(J.d, xl.map(l => l.r));
  const xLane = new Map(xl.map(l => [l.i, w.indexOf(l.r[0])])), yLane = new Map(yl.map(l => [l.i, u.indexOf(l.r[0])]));
  const cells = new Set<string>();
  for (const j of xLane.values()) for (let i = 0; i < u.length - 1; i++) cells.add(`${i}-${j}`);
  for (const i of yLane.values()) for (let j = 0; j < w.length - 1; j++) cells.add(`${i}-${j}`);
  return { u, w, xLane, yLane, cells: [...cells] };
}

/** the cell holding a vehicle whose middle is `along` its street (street-local x), or null outside the junction */
export function cellAt(cr: Crossroads, grid: JunctionGrid, st: 'x' | 'y', lane: number, along: number): string | null {
  const gap = cr[st].lay.gap!;
  if (along < gap[0] || along >= gap[1]) return null;
  const t = along - gap[0], cuts = st === 'x' ? grid.u : grid.w;
  let k = 0;
  while (k < cuts.length - 2 && t >= cuts[k + 1]!) k++;
  const fixed = st === 'x' ? grid.xLane.get(lane) : grid.yLane.get(lane);
  if (fixed === undefined) return null;
  return st === 'x' ? `${k}-${fixed}` : `${fixed}-${k}`;
}
