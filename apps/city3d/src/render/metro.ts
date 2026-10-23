/* The elevated metro (ADR-042): Line 2A's viaduct, Thái Hà station and its trains.
     viaduct  under each track a box girder (the deck) with a low parapet on its outer side and the
              two rails; T-shaped piers every 30 m between the two tracks, not under the station;
     station  after Line 2A's elevated stations (three levels: entrances on the ground, the concourse
              above the street at about 6–10 m, two side platforms at track level), the iso-glow
              metro figure lending the furniture:
                - piers under the station, the concourse box with a band of windows (lit at night),
                - a side platform each side of the tracks, a lit edge strip (lit while a train
                  stands there), a railing on its outer edge,
                - a curved (barrel) roof over both platforms and tracks on columns,
                - departure boards hanging from the roof (screens always lit), name boards, benches,
                  bins, lamps under the roof (lit at night),
                - a covered stair from the concourse down to the ground at each side;
     trains   4 cars (Line 2A's sets), each a long rounded box with a window band and two doors a
              side, the end cars with a windscreen and head lamps; built in the car's own frame
              (nose +x) for the view to place along the track.
   Lamps: "station/<id>" (concourse and roof lamps, with the street lamps), "station/<id>/edge"
   (platform edges, while a train stops), "station/<id>/board" (screens). Pure. */
import * as THREE from 'three';
import { METRO, closestOnSegment, dist, normalizeRing, polylineLength, type City, type Rail, type Station, type Vec2 } from '@my-city/core';
import { V, Batch, type Surface } from './batch';

export const stationLamp = (st: Station, part: '' | 'edge' | 'board' = '') => `station/${st.id}${part ? `/${part}` : ''}`;

const DECK = 1.8;          // girder depth under the rails (m)
const PLATFORM = 1.05;     // platform top above the rail top
const CONCOURSE: [number, number] = [6, 10];

/** the two tracks of a line run as a pair: for each metro rail, the other one beside it */
function pairOf(rail: Rail, rails: Rail[]): Rail | undefined {
  return rails.find(o => o !== rail && o.kind === rail.kind && o.elevated && rail.path.some(p => nearest(o.path, p).d < 8));
}

export function buildMetro(B: Batch, city: City, shellB: Batch = B, railB?: Batch) {
  const rails = city.rails.filter(r => r.kind === 'metro' && r.elevated);
  const stations = city.stations.filter(s => s.kind === 'metro');
  const inStation = (p: Vec2) => stations.some(s => dist(s.at, p) < stationLength(s) / 2 + 8);
  for (const r of rails) {
    const other = pairOf(r, rails), h = r.height, S = resample(r.path, 12);
    // the outer side: away from the other track, judged half-way along (right of the path is (−dy, dx))
    const m = Math.floor(S.length / 2), p = S[m]!, q = S[Math.min(m + 1, S.length - 1)] ?? p, dd = dist(p, q) || 1;
    const right: Vec2 = [-(q[1] - p[1]) / dd, (q[0] - p[0]) / dd], o = other ? nearest(other.path, p).at : null;
    const side = o && (o[0] - p[0]) * right[0] + (o[1] - p[1]) * right[1] > 0 ? -1 : 1;
    // deck: a box girder 4.4 m wide under the track with a stepped lower soffit rib
    B.solid(strip(S, -1.75, 1.75), h - DECK, h - 1.15, () => 'wall', 'roof');
    B.solid(strip(S, -2.25, 2.25), h - 1.15, h - 0.22, () => 'wall', 'roof');
    // the parapet / noise barrier on the outer edge, 1.05 m high with top rail
    B.solid(strip(S, side * 2.02, side * 2.26), h - 0.22, h + 0.92, () => 'wall', 'roof');
    B.flatSolid(strip(S, side * 1.98, side * 2.3), h + 0.92, h + 1.06, 'metal');
    // Base lightweight rail guide lines (always present even in Low/Medium quality)
    for (const g of [-0.72, 0.72]) {
      const line = offset(S, g);
      for (let i = 1; i < line.length; i++) B.line(V(line[i - 1]![0], line[i - 1]![1], h), V(line[i]![0], line[i]![1], h), 'detail');
    }

    // Full 3D railway track assembly (05-metro.js lines 77-83): visible in High/Ultra detail and all POV modes
    if (railB) {
      // 1. Dark recessed track bed (`face recess` -> 'road' surface)
      railB.solid(strip(S, -1.26, 1.26), h - 0.22, h - 0.14, () => 'road', 'road');
      // 2. Inner cable trough / third-rail conduit along the inner edge of the deck
      const troughMid = -side * 1.62;
      railB.solid(strip(S, troughMid - 0.16, troughMid + 0.16), h - 0.22, h - 0.04, () => 'metal', 'roof');
      // 3. Transverse concrete sleepers (tà vẹt) & sleeper slits every 1.1 m along the track bed
      const trackLen = polylineLength(r.path);
      for (let s = 0.6; s < trackLen; s += 1.1) {
        const { p: sp, h: sh } = at(r.path, s);
        const ux = Math.cos(sh), uy = Math.sin(sh), vx = -uy, vy = ux;
        const hw = 1.08, hl = 0.13;
        const p0: Vec2 = [sp[0] - ux * hl - vx * hw, sp[1] - uy * hl - vy * hw];
        const p1: Vec2 = [sp[0] + ux * hl - vx * hw, sp[1] + uy * hl - vy * hw];
        const p2: Vec2 = [sp[0] + ux * hl + vx * hw, sp[1] + uy * hl + vy * hw];
        const p3: Vec2 = [sp[0] - ux * hl + vx * hw, sp[1] - uy * hl + vy * hw];
        railB.flatSolid([p0, p1, p2, p3], h - 0.14, h - 0.07, 'wall');
        railB.line(
          V(sp[0] - vx * hw, sp[1] - vy * hw, h - 0.065),
          V(sp[0] + vx * hw, sp[1] + vy * hw, h - 0.065),
          'crease',
        );
      }
      // 4. Twin raised 3D steel rails (`.rail` at standard gauge ±0.72 m) with crisp crease edges
      for (const g of [-0.72, 0.72]) {
        railB.solid(strip(S, g - 0.09, g + 0.09), h - 0.09, h + 0.05, () => 'metal', 'metal');
        const line = offset(S, g);
        for (let i = 1; i < line.length; i++) {
          railB.line(V(line[i - 1]![0], line[i - 1]![1], h + 0.055), V(line[i]![0], line[i]![1], h + 0.055), 'crease');
        }
      }
    }
    // piers between the pair (drawn once: from the rail with the smaller id), none in a station
    if (other && r.id < other.id) {
      const L = polylineLength(r.path);
      for (let s = 15; s < L; s += 30) {
        const p = at(r.path, s), o = nearest(other.path, p.p).at, m: Vec2 = [(p.p[0] + o[0]) / 2, (p.p[1] - 0 + o[1]) / 2];
        if (inStation(m)) continue;
        const u: Vec2 = [Math.cos(p.h), Math.sin(p.h)], v: Vec2 = [-u[1], u[0]];
        const P2 = (a: number, b: number): Vec2 => [m[0] + u[0] * a + v[0] * b, m[1] + u[1] * a + v[1] * b];
        const rect = (a: number, b: number): Vec2[] => [P2(-a, -b), P2(a, -b), P2(a, b), P2(-a, b)];
        const octPier = (rx: number, ry: number, c: number): Vec2[] => [
          P2(-rx + c, -ry), P2(rx - c, -ry), P2(rx, -ry + c), P2(rx, ry - c),
          P2(rx - c, ry), P2(-rx + c, ry), P2(-rx, ry - c), P2(-rx, -ry + c),
        ];
        const zCap0 = h - DECK - 1.55, zCapMid = h - DECK - 0.42, zCapTop = h - DECK - 0.1;
        // median curb island + planted greenery bed around the pier base (as in Photo 1)
        B.flatSolid(octPier(11.5, 1.85, 0.8), 0, 0.32, 'walk');
        B.flatSolid(octPier(10.8, 1.45, 0.6), 0.32, 0.72, 'plant');
        // stepped pier footing + chamfered concrete shaft
        B.flatSolid(octPier(1.35, 1.45, 0.35), 0, 0.55, 'wall');
        B.solid(octPier(1.02, 1.12, 0.28), 0.55, zCap0, () => 'wall', 'roof');
        // flared trapezoidal hammerhead pier cap (vát nghiêng chữ T như ảnh 1 & 2)
        for (let k = 0; k < 3; k++) {
          const t0 = k / 3, t1 = (k + 1) / 3;
          const b0 = 1.15 + (4.85 - 1.15) * t0, b1 = 1.15 + (4.85 - 1.15) * t1;
          const a0 = 1.05 - 0.12 * t0, a1 = 1.05 - 0.12 * t1;
          const zk0 = zCap0 + (zCapMid - zCap0) * t0, zk1 = zCap0 + (zCapMid - zCap0) * t1;
          B.flatSolid(rect((a0 + a1) / 2, (b0 + b1) / 2), zk0, zk1, 'wall');
        }
        B.solid(rect(0.96, 4.95), zCapMid, zCapTop, () => 'wall', 'roof');
        // bearing pads under the two track box girders
        for (const sg of [-1, 1]) {
          for (const db of [-0.95, 0.95]) {
            const by = sg * 2.1 + db;
            B.flatSolid([P2(-0.55, by - 0.32), P2(0.55, by - 0.32), P2(0.55, by + 0.32), P2(-0.55, by + 0.32)], zCapTop, h - DECK, 'metal');
          }
        }
      }
    }
  }
  for (const st of stations) station(B, st, rails, city, shellB);
}

/** platform length from the data (the platforms' extent), 100 m when none is mapped */
function stationLength(st: Station): number {
  const pts = st.platforms.flat();
  if (pts.length < 2) return 100;
  let best = 0;
  for (const a of pts) for (const b of pts) best = Math.max(best, dist(a, b));
  return Math.min(140, Math.max(60, best));
}

function station(B: Batch, st: Station, rails: Rail[], city: City, shellB: Batch = B) {
  // the station's frame: middle between its two tracks, u along them, v across
  const near = rails.map(r => ({ r, n: nearest(r.path, st.at) })).filter(x => x.n.d < 40).sort((a, b) => a.n.d - b.n.d).slice(0, 2);
  if (!near.length) return;
  const c: Vec2 = near.length === 2 ? [(near[0]!.n.at[0] + near[1]!.n.at[0]) / 2, (near[0]!.n.at[1] + near[1]!.n.at[1]) / 2] : near[0]!.n.at;
  const a0 = at(near[0]!.r.path, near[0]!.n.s), u: Vec2 = [Math.cos(a0.h), Math.sin(a0.h)], v: Vec2 = [-u[1], u[0]];
  const t = near.length === 2 ? dist(near[0]!.n.at, near[1]!.n.at) / 2 : 2, h = near[0]!.r.height;
  const L = stationLength(st), hl = L / 2, pw = 4.2, W = t + 1.6 + pw;   // half widths: track, platform, whole
  const P = (a: number, b: number, z: number) => V(c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, z);
  const P2 = (a: number, b: number): Vec2 => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b];
  const ring = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [P2(x0, y0), P2(x1, y0), P2(x1, y1), P2(x0, y1)];
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, s: Surface = 'wall', top?: Surface) =>
    B.solid(ring(x0, x1, y0, y1), z0, z1, () => s, top ?? (s === 'wall' ? 'roof' : s), st.id);
  const boxS = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, s: Surface = 'wall', top?: Surface) =>
    shellB.solid(ring(x0, x1, y0, y1), z0, z1, () => s, top ?? (s === 'wall' ? 'roof' : s), st.id);
  const lamp = stationLamp(st), edge = stationLamp(st, 'edge'), board = stationLamp(st, 'board');
  const nU = (s: number) => new THREE.Vector3(u[0] * s, 0, u[1] * s), nV = (s: number) => new THREE.Vector3(v[0] * s, 0, v[1] * s), up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);

  const cl = hl * 0.78, [cz0, cz1] = CONCOURSE;

  // ---- 1. Ground median strip & twin central piers + flared Y/T crosshead beams under the station ----
  // continuous raised concrete median curb + planted greenery strip in the center of the road
  box(-hl - 4, hl + 4, -2.45, 2.45, 0, 0.34, 'wall', 'walk');
  box(-hl - 3.2, hl + 3.2, -1.95, 1.95, 0.34, 0.78, 'plant', 'plant');
  // 5 bays of paired central columns + flared cantilever crossheads (trụ đôi + xà mũ cánh hẫng như ảnh 1, 2, 3)
  const pierBays = [-cl + 2.5, -cl * 0.48, 0, cl * 0.48, cl - 2.5];
  for (const a of pierBays) {
    // stepped plinth + twin central columns with chamfered corners
    box(a - 1.15, a + 1.15, -2.25, 2.25, 0, 0.55, 'wall', 'roof');
    for (const sb of [-1, 1]) {
      const bMid = sb * 1.32;
      box(a - 0.82, a + 0.82, bMid - 0.68, bMid + 0.68, 0.55, 3.85, 'wall', 'roof');
    }
    // central shear web between the twin columns + drainage downpipe in the slot (ống thoát nước giữa 2 trụ)
    box(a - 0.38, a + 0.38, -0.68, 0.68, 0.55, 3.85, 'road', 'road');
    for (const sa of [-1, 1]) {
      const px = a + sa * 0.85;
      box(px - 0.08, px + 0.08, -0.1, 0.1, 0.4, 4.15, 'metal', 'metal');
    }
    // flared cantilever crosshead beam tapering from z = 3.85 at the twin piers out to z = 5.3 at |b| = W + 0.85
    const bRoot = 2.05, bTip = W + 0.85, zRoot = 3.85, zTip = 5.25, zTop = cz0 - 0.35;
    box(a - 0.88, a + 0.88, -bRoot, bRoot, zRoot, zTop, 'wall', 'roof');
    const segs = 5;
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs;
      const y0 = bRoot + (bTip - bRoot) * t0, y1 = bRoot + (bTip - bRoot) * t1;
      const zk0 = zRoot + (zTip - zRoot) * (t0 * t0 * 0.35 + t0 * 0.65);
      const zk1 = zRoot + (zTip - zRoot) * (t1 * t1 * 0.35 + t1 * 0.65);
      for (const sb of [-1, 1]) {
        const lo = sb > 0 ? y0 : -y1, hi = sb > 0 ? y1 : -y0;
        box(a - 0.82, a + 0.82, lo, hi, (zk0 + zk1) / 2, zTop, 'wall', 'roof');
      }
    }
    // upper crosshead cap beam spanning full width
    box(a - 0.92, a + 0.92, -bTip - 0.1, bTip + 0.1, zTop, cz0, 'wall', 'roof');
  }
  // longitudinal under-deck girders & dark recessed coffered soffit under the concourse floor
  box(-cl, cl, -W - 0.55, W + 0.55, cz0 - 0.38, cz0, 'road', 'road');
  for (const bRib of [-W - 0.65, -W * 0.66, -W * 0.33, 0, W * 0.33, W * 0.66, W + 0.65]) {
    box(-cl - 0.2, cl + 0.2, bRib - 0.24, bRib + 0.24, cz0 - 0.62, cz0, 'wall', 'roof');
  }

  // ---- 2. Concourse level (tầng trung chuyển z = 6.0 .. 10.0 m) & Open End Portals ----
  // projecting white floor slab band around the entire concourse (kept in B so interior floor is visible in see-through)
  box(-cl - 0.45, cl + 0.45, -W - 0.92, W + 0.92, cz0 - 0.08, cz0 + 0.42, 'wall', 'walk');
  // enclosed middle concourse outer hall shell (routed to shellB so see-through reveals the concourse interior)
  const clIn = cl - 3.6;
  boxS(-clIn, clIn, -W - 0.55, W + 0.55, cz0 + 0.42, cz1 - 0.35, 'wall', 'roof');
  // central track support spine running full station length
  box(-hl, hl, -t - 1.35, t + 1.35, cz0 + 0.42, h - DECK, 'wall', 'roof');
  // concourse ceiling slab + upper fascia band (routed to shellB)
  boxS(-cl - 0.45, cl + 0.45, -W - 0.92, W + 0.92, cz1 - 0.35, cz1 + 0.15, 'wall', 'roof');

  // Interior concourse furniture on the concourse floor (visible when looking inside via see-through):
  // ticket booths, automatic fare-gate turnstiles, and internal stairs from concourse up to both platforms
  const zConcFloor = cz0 + 0.42;
  for (const sb of [-1, 1]) {
    const bMid = sb * (t + 1.5 + pw * 0.48);
    // Ticket office & customer service booth near the center of the concourse
    box(-4.2, 4.2, bMid - 1.1, bMid + 1.1, zConcFloor, zConcFloor + 2.45, 'wall', 'roof');
    B.window(board, [P(-3.6, bMid - sb * 1.12, zConcFloor + 0.95), P(3.6, bMid - sb * 1.12, zConcFloor + 0.95), P(3.6, bMid - sb * 1.12, zConcFloor + 2.05), P(-3.6, bMid - sb * 1.12, zConcFloor + 2.05)], nV(-sb));
    // Two arrays of stainless automatic fare-gate turnstiles (cổng soát vé tự động)
    for (const aGate of [-clIn * 0.52, clIn * 0.52]) {
      for (let g = -2; g <= 2; g++) {
        const bg = bMid + g * 0.72;
        box(aGate - 0.55, aGate + 0.55, bg - 0.12, bg + 0.12, zConcFloor, zConcFloor + 1.02, 'metal', 'metal');
        B.window(edge, [P(aGate - 0.35, bg - 0.08, zConcFloor + 1.03), P(aGate + 0.35, bg - 0.08, zConcFloor + 1.03), P(aGate + 0.35, bg + 0.08, zConcFloor + 1.03), P(aGate - 0.35, bg + 0.08, zConcFloor + 1.03)], up);
      }
    }
    // Internal stairs leading from concourse floor up to the side platform (cầu thang nội bộ lên sân ga)
    for (const dir of [-1, 1]) {
      const aSt0 = dir * (clIn * 0.24), aSt1 = dir * (clIn * 0.42);
      const stSteps = 8, zTopSt = h + PLATFORM;
      for (let k = 0; k < stSteps; k++) {
        const u0 = k / stSteps, u1 = (k + 1) / stSteps;
        const x0 = aSt0 + (aSt1 - aSt0) * u0, x1 = aSt0 + (aSt1 - aSt0) * u1;
        const z0 = zConcFloor + (zTopSt - zConcFloor) * u0, z1 = zConcFloor + (zTopSt - zConcFloor) * u1;
        box(Math.min(x0, x1), Math.max(x0, x1), bMid - 0.85, bMid + 0.85, z0, z1, 'wall', 'walk');
      }
    }
  }

  // open end-loggia balconies at both ends (a = -cl and a = +cl) with glass balustrades, ceiling light strips,
  // "GA THÁI HÀ" sign fascia, and green-white diamond mosaic end-blocks (như ảnh 1, 2, 3)
  for (const sa of [-1, 1]) {
    const aOut = sa * (cl + 0.35), aIn = sa * clIn;
    const xLo = Math.min(aOut, aIn), xHi = Math.max(aOut, aIn);
    // corner pilasters at outer edges
    for (const sb of [-1, 1]) {
      const bEdge = sb * (W + 0.68);
      boxS(xLo, xHi, bEdge - 0.24, bEdge + 0.24, cz0 + 0.42, cz1 - 0.35, 'wall', 'roof');
      // glass balustrade across the open end portal (lan can kính mặt trước sảnh)
      const b0 = sb > 0 ? t + 1.4 : -W - 0.42, b1 = sb > 0 ? W + 0.42 : -t - 1.4;
      const aRail = sa * (cl + 0.28);
      B.panel('glass', [P(aRail, b0, cz0 + 0.45), P(aRail, b1, cz0 + 0.45), P(aRail, b1, cz0 + 1.52), P(aRail, b0, cz0 + 1.52)], nU(sa));
      box(aRail - 0.06, aRail + 0.06, b0, b1, cz0 + 1.5, cz0 + 1.6, 'metal');
      for (let bp = b0; bp <= b1 + 0.05; bp += 1.45) {
        box(aRail - 0.04, aRail + 0.04, bp - 0.04, bp + 0.04, cz0 + 0.42, cz0 + 1.55, 'metal');
      }
      // recessed ceiling light tubes inside the open portal loggia (dãy đèn huỳnh quang trần sảnh như ảnh 1 & 2)
      for (const aLamp of [sa * (cl - 0.9), sa * (cl - 2.2)]) {
        for (let bl = b0 + 0.65; bl + 1.1 <= b1 - 0.4; bl += 1.55) {
          shellB.window(lamp, [P(aLamp - 0.12, bl, cz1 - 0.37), P(aLamp + 0.12, bl, cz1 - 0.37), P(aLamp + 0.12, bl + 1.05, cz1 - 0.37), P(aLamp - 0.12, bl + 1.05, cz1 - 0.37)], down);
        }
      }
      // projecting white lintel / sign box over each end portal ("GA THÁI HÀ" / "GA LA THÀNH")
      const aSign0 = sa * (cl + 0.15), aSign1 = sa * (cl + 0.72);
      boxS(Math.min(aSign0, aSign1), Math.max(aSign0, aSign1), b0 - 0.25, b1 + 0.25, cz1 - 1.05, cz1 + 0.35, 'wall', 'roof');
      const aFace = sa * (cl + 0.74);
      const bMid = (b0 + b1) / 2, sw = (b1 - b0) * 0.38;
      // dark signboard backing + glowing station name strips
      shellB.quad('glass', [P(aFace, bMid - sw, cz1 - 0.82), P(aFace, bMid + sw, cz1 - 0.82), P(aFace, bMid + sw, cz1 + 0.12), P(aFace, bMid - sw, cz1 + 0.12)], nU(sa));
      shellB.window(board, [P(aFace + sa * 0.01, bMid - sw * 0.82, cz1 - 0.32), P(aFace + sa * 0.01, bMid + sw * 0.82, cz1 - 0.32), P(aFace + sa * 0.01, bMid + sw * 0.82, cz1 - 0.02), P(aFace + sa * 0.01, bMid - sw * 0.82, cz1 - 0.02)], nU(sa));
      shellB.window(lamp, [P(aFace + sa * 0.01, bMid - sw * 0.65, cz1 - 0.68), P(aFace + sa * 0.01, bMid + sw * 0.65, cz1 - 0.68), P(aFace + sa * 0.01, bMid + sw * 0.65, cz1 - 0.46), P(aFace + sa * 0.01, bMid - sw * 0.65, cz1 - 0.46)], nU(sa));

      // iconic square end-wall block with green-and-white geometric diamond/triangle mosaic (khối vuông họa tiết hình thoi/tam giác xanh-trắng ở 2 đầu ga)
      const mLo = Math.min(sa * (cl - 1.6), sa * (cl + 0.45)), mHi = Math.max(sa * (cl - 1.6), sa * (cl + 0.45));
      const mb0 = sb > 0 ? t + 1.55 : -W + 0.05, mb1 = sb > 0 ? W - 0.05 : -t - 1.55;
      const mz0 = cz1 + 0.35, mz1 = h + PLATFORM + 3.85;
      boxS(mLo, mHi, mb0, mb1, mz0, mz1, 'wall', 'roof');
      const mFace = sa * (cl + 0.47);
      const cols = 4, rows = 4, cw = (mb1 - mb0) / cols, rh = (mz1 - mz0) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c2 = 0; c2 < cols; c2++) {
          const yA = mb0 + c2 * cw, yB = yA + cw, zA = mz0 + r * rh, zB = zA + rh;
          const yM = (yA + yB) / 2, zM = (zA + zB) / 2;
          // diagonal diamond/triangle facets in green ('plant') on the white block face
          if ((r + c2) % 2 === 0) {
            shellB.quad('plant', [P(mFace, yM, zA), P(mFace, yB, zM), P(mFace, yM, zB), P(mFace, yA, zM)], nU(sa));
          } else {
            shellB.quad('plant', [P(mFace, yA, zA), P(mFace, yB, zA), P(mFace, yM, zM), P(mFace, yA, zA)], nU(sa));
            shellB.quad('plant', [P(mFace, yB, zB), P(mFace, yA, zB), P(mFace, yM, zM), P(mFace, yB, zB)], nU(sa));
          }
          shellB.line(P(mFace, yA, zA), P(mFace, yB, zB), 'detail');
          shellB.line(P(mFace, yA, zB), P(mFace, yB, zA), 'detail');
        }
      }
    }
  }

  // concourse long sides: ribbon windows, louver bands & horizontal steel sunshade canopies (mái hắt ngang bên hông)
  for (const s of [-1, 1]) {
    const b = s * (W + 0.58), n = Math.round((2 * clIn - 2) / 2.2), pw2 = (2 * clIn - 2) / n;
    for (let i = 0; i < n; i++) {
      const x0 = -clIn + 1 + i * pw2 + 0.08, x1 = x0 + pw2 - 0.16;
      shellB.window(lamp, [P(x0, b, cz0 + 1.15), P(x1, b, cz0 + 1.15), P(x1, b, cz1 - 0.85), P(x0, b, cz1 - 0.85)], nV(s));
    }
    // projecting horizontal sunshade louver hoods near the ends of the side facade
    for (const aHood of [-cl + 4.5, cl - 4.5]) {
      const b0 = s > 0 ? W + 0.55 : -W - 1.65, b1 = s > 0 ? W + 1.65 : -W - 0.55;
      boxS(aHood - 3.2, aHood + 3.2, b0, b1, cz1 - 0.55, cz1 - 0.38, 'metal', 'metal');
      for (let r = 0; r < 4; r++) {
        const br = b0 + ((b1 - b0) * (r + 0.5)) / 4;
        shellB.line(P(aHood - 3.2, br, cz1 - 0.37), P(aHood + 3.2, br, cz1 - 0.37), 'detail');
      }
    }
  }

  // ---- 3. Side platforms & slanted green louvered side screens ----
  const zp = h + PLATFORM;
  for (const s of [-1, 1]) {
    const b0 = s * (t + 1.6), b1 = s * W, lo = Math.min(b0, b1), hi = Math.max(b0, b1);
    box(-hl, hl, lo, hi, h - DECK, zp);
    // the lit edge strip along the track side
    const e0 = b0 + s * 0.15, e1 = b0 + s * 0.45;
    B.window(edge, [P(-hl + 1, e0, zp + 0.01), P(hl - 1, e0, zp + 0.01), P(hl - 1, e1, zp + 0.01), P(-hl + 1, e1, zp + 0.01)], up);
    // outer parapet (in B) + slanted green louver screen (in shellB so see-through opens the side view into the platforms)
    const bOuter = s * W, bLouverTop = s * (W + 0.55);
    box(-hl, hl, s > 0 ? hi - 0.12 : lo, s > 0 ? hi : lo + 0.12, zp, zp + 1.15, 'wall', 'roof');
    shellB.panel('plant', [P(-hl + 2, bOuter, zp + 1.15), P(hl - 2, bOuter, zp + 1.15), P(hl - 2, bLouverTop, zp + 3.45), P(-hl + 2, bLouverTop, zp + 3.45)], nV(s));
    for (let zL = zp + 1.45; zL <= zp + 3.3; zL += 0.38) {
      const tL = (zL - (zp + 1.15)) / 2.3;
      const bL = bOuter + (bLouverTop - bOuter) * tL;
      shellB.line(P(-hl + 2, bL, zL), P(hl - 2, bL, zL), 'detail');
    }
    // benches & bins along the platform
    for (const a of [-hl + 12, -hl + 26, hl - 26, hl - 12]) {
      const bm = s * (W - 1.2);
      box(a - 0.9, a + 0.9, bm - 0.25, bm + 0.25, zp, zp + 0.45, 'metal');
      box(a - 0.9, a + 0.9, s > 0 ? bm + 0.2 : bm - 0.25, s > 0 ? bm + 0.25 : bm - 0.2, zp + 0.45, zp + 0.9, 'metal');
      const bb = P2(a + 3, bm);
      B.solid(Array.from({ length: 8 }, (_, k): Vec2 => [bb[0] + 0.25 * Math.cos((k * Math.PI) / 4), bb[1] + 0.25 * Math.sin((k * Math.PI) / 4)]), zp, zp + 0.85, () => 'metal', 'metal');
    }
  }

  // ---- 4. Twin C-shell vaulted roof & central skylight steel arch trusses (như ảnh 1, 2, 3) ----
  const zr = zp + 5.2, rise = 2.35, R = W + 0.95, ra = hl + 2.2;
  // C-shaped curved side shells wrapping from the side louver top around and over the platforms (routed to shellB)
  for (const s of [-1, 1]) {
    const cPts: [number, number][] = [
      [s * (W + 0.55), zp + 3.45],
      [s * (R + 0.38), zp + 4.45],
      [s * (R + 0.45), zr + 0.35],
      [s * (R + 0.05), zr + 1.25],
      [s * (W - 0.65), zr + 1.85],
      [s * (t + 1.35), zr + 2.18],
    ];
    for (let k = 0; k < cPts.length - 1; k++) {
      const [b0, z0] = cPts[k]!, [b1, z1] = cPts[k + 1]!;
      shellB.panel('roof', [P(-ra, b0, z0), P(ra, b0, z0), P(ra, b1, z1), P(-ra, b1, z1)], k < 2 ? nV(s) : up);
      shellB.line(P(-ra, b1, z1), P(ra, b1, z1), 'detail');
    }
    // thick C-arch end rims at -ra and +ra + transverse panel ribs along the shell
    for (const aRim of [-ra, ra]) {
      for (let k = 0; k < cPts.length - 1; k++) {
        const [b0, z0] = cPts[k]!, [b1, z1] = cPts[k + 1]!;
        shellB.line(P(aRim, b0, z0), P(aRim, b1, z1), 'crease');
      }
    }
    for (let aRib = -hl + 4; aRib <= hl - 4; aRib += 6) {
      for (let k = 1; k < cPts.length - 1; k++) {
        const [b0, z0] = cPts[k]!, [b1, z1] = cPts[k + 1]!;
        shellB.line(P(aRib, b0, z0), P(aRib, b1, z1), 'detail');
      }
    }
  }
  // central skylight vault with exposed steel arch trusses & purlins over the tracks (routed to shellB)
  const skyW = t + 1.35, skyN = 6;
  const skyArc = (k: number): [number, number] => {
    const b = -skyW + (2 * skyW * k) / skyN;
    return [b, zr + 2.18 + (rise - 2.18 + 0.25) * (1 - (b / skyW) ** 2)];
  };
  for (let k = 0; k < skyN; k++) {
    const [b0, z0] = skyArc(k), [b1, z1] = skyArc(k + 1);
    shellB.panel('glass', [P(-ra + 0.8, b0, z0), P(ra - 0.8, b0, z0), P(ra - 0.8, b1, z1), P(-ra + 0.8, b1, z1)], up);
    shellB.line(P(-ra, b1, z1), P(ra, b1, z1), 'detail');
  }
  // steel arch ribs spanning across the roof every 6 m
  for (let aRib = -ra; aRib <= ra + 0.1; aRib += 6) {
    boxS(aRib - 0.12, aRib + 0.12, -skyW - 0.4, skyW + 0.4, zr + 1.95, zr + 2.22, 'metal', 'metal');
  }
  // structural steel columns supporting the roof along both platforms (kept in B)
  for (let a = -hl + 4; a <= hl - 4; a += 12) for (const s of [-1, 1]) {
    const bCol = s * (W - 0.35);
    box(a - 0.18, a + 0.18, bCol - 0.18, bCol + 0.18, zp, zr + 1.2, 'metal', 'metal');
  }
  // lamps under the roof, a row over each platform
  for (const s of [-1, 1]) for (let a = -hl + 6; a <= hl - 6; a += 8) {
    const b = s * (t + 1.6 + pw / 2), zl = zr - 0.4;
    box(a - 0.5, a + 0.5, b - 0.1, b + 0.1, zl, zl + 0.1, 'metal');
    B.window(lamp, [P(a - 0.45, b - 0.08, zl - 0.01), P(a + 0.45, b - 0.08, zl - 0.01), P(a + 0.45, b + 0.08, zl - 0.01), P(a - 0.45, b + 0.08, zl - 0.01)], down);
  }
  // departure boards hanging over each platform, facing along it both ways (screens: always lit, kept in B)
  for (const s of [-1, 1]) for (const a of [-hl / 3, hl / 3]) {
    const b = s * (t + 1.6 + pw / 2), z0 = zp + 2.8, z1 = z0 + 0.7;
    box(a - 0.06, a + 0.06, b - 1.2, b + 1.2, z0, z1, 'metal');
    for (const f of [-1, 1]) B.window(board, [P(a + f * 0.07, b - 1.1, z0 + 0.08), P(a + f * 0.07, b + 1.1, z0 + 0.08), P(a + f * 0.07, b + 1.1, z1 - 0.08), P(a + f * 0.07, b - 1.1, z1 - 0.08)], nU(f));
    B.line(P(a, b - 1, z1), P(a, b - 1, zr - 0.2), 'detail'); B.line(P(a, b + 1, z1), P(a, b + 1, zr - 0.2), 'detail');
  }
  // the name board on each long side, under the roof edge (routed to shellB)
  for (const s of [-1, 1]) {
    const b = s * (R + 0.42);
    boxS(-8, 8, Math.min(b, b + s * 0.15), Math.max(b, b + s * 0.15), zr - 0.8, zr + 0.2, 'metal');
    shellB.window(lamp, [P(-7.6, b + s * 0.16, zr - 0.7), P(7.6, b + s * 0.16, zr - 0.7), P(7.6, b + s * 0.16, zr + 0.1), P(-7.6, b + s * 0.16, zr + 0.1)], nV(s));
  }

  // ---- 5. Pedestrian Overpass Bridges, Elevator Towers & Covered Escalator/Stair Ramps (như ảnh 1 & 2) ----
  // Measure the parallel road carriageways and intersecting side streets in the station's (a, b) frame
  // so every bridge spans completely across the road and lands on the outer sidewalk clear of traffic.
  const toAB = (q: Vec2): Vec2 => [(q[0] - c[0]) * u[0] + (q[1] - c[1]) * u[1], (q[0] - c[0]) * v[0] + (q[1] - c[1]) * v[1]];
  const roadSegs: { a: Vec2; b: Vec2; width: number }[] = [];
  for (const stRoad of city.streets) {
    if (stRoad.layer !== 0 || stRoad.kind === 'footway' || stRoad.kind === 'steps') continue;
    const pts = stRoad.path.map(toAB);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]!, p1 = pts[i]!;
      if (Math.min(Math.abs(p0[0]), Math.abs(p1[0])) > hl + 35 && p0[0] * p1[0] > 0) continue;
      if (Math.min(Math.abs(p0[1]), Math.abs(p1[1])) > 35 && p0[1] * p1[1] > 0) continue;
      roadSegs.push({ a: p0, b: p1, width: stRoad.width });
    }
  }

  for (const s of [-1, 1] as const) {
    // Find the outer curb of the parallel road carriageway(s) on side `s`
    let roadOuter = W + 4.8; // fallback when no streets are present (e.g. standalone showcase plate)
    for (const seg of roadSegs) {
      const [a0, b0] = seg.a, [a1, b1] = seg.b;
      const da = a1 - a0, db = b1 - b0, len = Math.hypot(da, db) || 1;
      if (Math.abs(da) / len < 0.65) continue;
      for (let k = 0; k <= 8; k++) {
        const ak = a0 + (da * k) / 8, bk = b0 + (db * k) / 8;
        if (Math.abs(ak) <= hl - 2 && bk * s > 0 && Math.abs(bk) < 22) {
          roadOuter = Math.max(roadOuter, Math.abs(bk) + seg.width / 2);
        }
      }
    }
    const bInner = s * (W + 0.65);
    const bLand0 = s * (roadOuter + 0.65), bLand1 = s * (roadOuter + 3.65);
    const bLo = Math.min(bInner, bLand0), bHi = Math.max(bInner, bLand0);
    const lLo = Math.min(bLand0, bLand1), lHi = Math.max(bLand0, bLand1);
    const hitsRoad = (aMin: number, aMax: number) => {
      for (let ak = aMin - 0.8; ak <= aMax + 0.8; ak += 1.5) {
        for (const yb of [bLand0, (bLand0 + bLand1) / 2, bLand1]) {
          if (roadSegs.some(seg => closestOnSegment([ak, yb], seg.a, seg.b).d < seg.width / 2 + 0.35)) return true;
        }
      }
      return false;
    };

    for (const dir of [-1, 1] as const) {
      const brW = 2.8;
      // Pick bridge position `aBr` and stair descent direction `sDir` so the stair & elevator never block a side street
      const cands: [number, 1 | -1][] = [
        [dir * (cl * 0.44), dir],
        [dir * (cl * 0.58), dir],
        [dir * (cl * 0.44), (-dir) as 1 | -1],
        [dir * (cl * 0.62), (-dir) as 1 | -1],
      ];
      let aBr = cands[0]![0], sDir: 1 | -1 = cands[0]![1];
      for (const [candA, candDir] of cands) {
        const a0 = candA - candDir * (brW / 2 + 2.6), a1 = candA + candDir * (brW / 2 + 16.2);
        if (!hitsRoad(Math.min(a0, a1), Math.max(a0, a1))) {
          aBr = candA;
          sDir = candDir;
          break;
        }
      }

      // (a) Elevated pedestrian overpass footbridge crossing over the street lanes (cầu bộ hành có lan can kính)
      box(aBr - brW / 2, aBr + brW / 2, bLo, bHi, cz0 - 0.52, cz0 + 0.08, 'wall', 'walk');
      // steel side web beams under the footbridge + haunches at both ends
      for (const da of [-brW / 2 + 0.08, brW / 2 - 0.08]) {
        box(aBr + da - 0.08, aBr + da + 0.08, bLo, bHi, cz0 - 0.72, cz0 - 0.48, 'metal', 'metal');
      }
      // glass balustrades + stainless posts & handrails on both sides of the footbridge
      const nPosts = Math.max(4, Math.round((bHi - bLo) / 1.8));
      for (const sa of [-1, 1]) {
        const aRail = aBr + sa * (brW / 2 - 0.06);
        B.panel('glass', [P(aRail, bLo, cz0 + 0.08), P(aRail, bHi, cz0 + 0.08), P(aRail, bHi, cz0 + 1.18), P(aRail, bLo, cz0 + 1.18)], nU(sa));
        box(aRail - 0.05, aRail + 0.05, bLo, bHi, cz0 + 1.16, cz0 + 1.24, 'metal', 'metal');
        for (let k = 0; k <= nPosts; k++) {
          const bk = bLo + ((bHi - bLo) * k) / nPosts;
          box(aRail - 0.04, aRail + 0.04, bk - 0.04, bk + 0.04, cz0 + 0.08, cz0 + 1.22, 'metal', 'metal');
          // slim steel canopy posts + light bridge roof
          if (k > 0 && k < nPosts && k % 2 === 1) {
            box(aRail - 0.05, aRail + 0.05, bk - 0.05, bk + 0.05, cz0 + 1.22, cz0 + 2.65, 'metal', 'metal');
          }
        }
      }
      box(aBr - brW / 2 - 0.2, aBr + brW / 2 + 0.2, bLo, bHi, cz0 + 2.65, cz0 + 2.8, 'metal', 'roof');

      // (b) Sidewalk Landing Platform & Vertical Elevator Tower (tháp thang máy & chiếu nghỉ trên vỉa hè như ảnh 1 & 2)
      const aLand0 = aBr - brW / 2 - 0.4, aLand1 = aBr + brW / 2 + 0.4;
      // landing deck at z = cz0
      box(aLand0, aLand1, lLo, lHi, cz0 - 0.55, cz0 + 0.08, 'wall', 'walk');
      // elevator shaft rising on the inner side of the landing (from ground z = 0 up to cz0 + 3.4 m)
      const aElev0 = aBr - sDir * 0.25, aElev1 = aBr - sDir * (brW / 2 + 2.45);
      const eLo = Math.min(aElev0, aElev1), eHi = Math.max(aElev0, aElev1);
      // ground-to-concourse concrete elevator & support tower
      box(eLo, eHi, lLo + 0.15, lHi - 0.15, 0, cz0 + 0.08, 'wall', 'roof');
      // support columns under the stair landing half
      for (const yb of [lLo + 0.35, lHi - 0.35]) {
        const xCol = aBr + sDir * (brW / 2 - 0.1);
        box(xCol - 0.32, xCol + 0.32, yb - 0.32, yb + 0.32, 0, cz0 - 0.55, 'wall', 'roof');
      }
      // ground-floor elevator door + lit indicator panel facing along the sidewalk
      const aDoorFace = sDir > 0 ? eLo - 0.02 : eHi + 0.02;
      const bElevMid = (lLo + lHi) / 2;
      B.quad('metal', [P(aDoorFace, bElevMid - 0.65, 0.25), P(aDoorFace, bElevMid + 0.65, 0.25), P(aDoorFace, bElevMid + 0.65, 2.3), P(aDoorFace, bElevMid - 0.65, 2.3)], nU(-sDir));
      B.line(P(aDoorFace, bElevMid, 0.25), P(aDoorFace, bElevMid, 2.3), 'detail');
      B.window(lamp, [P(aDoorFace - sDir * 0.01, bElevMid - 0.55, 2.38), P(aDoorFace - sDir * 0.01, bElevMid + 0.55, 2.38), P(aDoorFace - sDir * 0.01, bElevMid + 0.55, 2.65), P(aDoorFace - sDir * 0.01, bElevMid - 0.55, 2.65)], nU(-sDir));
      // upper elevator cabin above the landing (z = cz0 .. cz0 + 3.25) with glass windows & flat cap roof
      box(eLo + 0.1, eHi - 0.1, lLo + 0.2, lHi - 0.2, cz0 + 0.08, cz0 + 3.15, 'wall', 'roof');
      box(eLo - 0.08, eHi + 0.08, lLo + 0.05, lHi - 0.05, cz0 + 3.15, cz0 + 3.42, 'wall', 'roof');
      for (const sb of [-1, 1]) {
        const bWin = sb > 0 ? lHi - 0.18 : lLo + 0.18;
        B.window(lamp, [P(eLo + 0.45, bWin, cz0 + 0.95), P(eHi - 0.45, bWin, cz0 + 0.95), P(eHi - 0.45, bWin, cz0 + 2.55), P(eLo + 0.45, bWin, cz0 + 2.55)], nV(sb));
      }
      // glass railing around the landing platform
      const bOuterEdge = s > 0 ? lHi - 0.06 : lLo + 0.06;
      B.panel('glass', [P(aLand0, bOuterEdge, cz0 + 0.08), P(aLand1, bOuterEdge, cz0 + 0.08), P(aLand1, bOuterEdge, cz0 + 1.18), P(aLand0, bOuterEdge, cz0 + 1.18)], nV(s));
      box(aLand0, aLand1, bOuterEdge - 0.05, bOuterEdge + 0.05, cz0 + 1.16, cz0 + 1.24, 'metal', 'metal');

      // (c) Covered Stair & Escalator Ramp descending along the sidewalk (cầu thang bộ + thang cuốn có tường bậc giật cấp & mái vòm cong nửa trụ như bên phải ảnh 2)
      const aStairStart = aBr + sDir * (brW / 2 + 0.35);
      const stairLen = 13.2, steps = 18, stepRun = stairLen / steps, stepRise = (cz0 - 0.36) / steps;
      const swLo = lLo + 0.18, swHi = lHi - 0.18, swMid = (swLo + swHi) / 2;

      // continuous paved sidewalk terrace under the elevator, landing & stair entrance (flush with WALK_Z = 0.25)
      const aBot0 = aStairStart + sDir * stairLen, aBot1 = aBot0 + sDir * 1.45;
      const padX0 = Math.min(aElev1 - sDir * 0.6, aBot1 + sDir * 0.9);
      const padX1 = Math.max(aElev1 - sDir * 0.6, aBot1 + sDir * 0.9);
      const padY0 = Math.min(s * roadOuter, bLand1 + s * 0.35), padY1 = Math.max(s * roadOuter, bLand1 + s * 0.35);
      box(padX0, padX1, padY0, padY1, 0, 0.25, 'walk', 'walk');

      // 3-step bottom entrance podium on the sidewalk (bậc tam cấp ở chân cầu thang như góc phải dưới ảnh 2)
      for (let stp = 0; stp < 3; stp++) {
        const x0 = aBot0 + sDir * (stp * 0.45), x1 = aBot1;
        box(Math.min(x0, x1), Math.max(x0, x1), swLo - 0.1, swHi + 0.1, 0.22, 0.48 - stp * 0.08, 'wall', 'walk');
      }

      // stepped white side parapet walls (tường chắn hai bên xây bậc giật cấp trắng như ảnh 2)
      const wallTiers = 6;
      for (let tIdx = 0; tIdx < wallTiers; tIdx++) {
        const u0 = tIdx / wallTiers, u1 = (tIdx + 1) / wallTiers;
        const x0 = aStairStart + sDir * (u0 * stairLen), x1 = aStairStart + sDir * (u1 * stairLen);
        const wx0 = Math.min(x0, x1), wx1 = Math.max(x0, x1);
        const zTopTier = cz0 + 1.05 - u0 * (cz0 - 0.45);
        // upper half has an angled soffit supported on a central pier; lower half is enclosed down to the ground
        const zBotTier = tIdx < 3 ? Math.max(0.25, cz0 - 1.35 - u1 * (cz0 - 1.1)) : 0.25;
        for (const yWall of [swLo, swHi - 0.22]) {
          box(wx0, wx1, yWall, yWall + 0.22, zBotTier, zTopTier, 'wall', 'roof');
        }
        // enclosed under-stair core under the lower tiers + utility room door
        if (tIdx >= 3) {
          box(wx0, wx1, swLo + 0.22, swHi - 0.22, 0.25, Math.max(0.5, zTopTier - 0.85), 'wall', 'walk');
        } else {
          // sloped structural spine beam under the upper stair flight (dầm nghiêng dưới gầm cầu thang như bên trái ảnh 2)
          box(wx0, wx1, swLo + 0.22, swHi - 0.22, zBotTier, zBotTier + 0.65, 'wall', 'walk');
        }
      }
      // low white entrance cheek-walls extending past the bottom steps (hai bệ tường thấp đón ở chân thang)
      for (const yWall of [swLo - 0.06, swHi - 0.18]) {
        box(Math.min(aBot0, aBot1 + sDir * 0.35), Math.max(aBot0, aBot1 + sDir * 0.35), yWall, yWall + 0.24, 0.25, 1.25, 'wall', 'roof');
      }

      // individual stair treads + escalator channel & dark inclined handrails (bậc thang + máng thang cuốn & tay vịn)
      for (let i = 0; i < steps; i++) {
        const x0 = aStairStart + sDir * (i * stepRun), x1 = x0 + sDir * stepRun;
        const zStep = cz0 - i * stepRise;
        // walking stair half
        box(Math.min(x0, x1), Math.max(x0, x1), swLo + 0.22, swMid - 0.08, zStep - stepRise - 0.15, zStep, 'wall', 'walk');
        // escalator channel half + central divider balustrade
        box(Math.min(x0, x1), Math.max(x0, x1), swMid + 0.08, swHi - 0.22, zStep - stepRise - 0.15, zStep - 0.04, 'metal', 'metal');
      }
      // inclined escalator handrails (đôi tay vịn thang cuốn màu tối chạy dọc độ dốc)
      for (const yHand of [swMid - 0.02, swHi - 0.26]) {
        const xTop = aStairStart, xBot = aBot0;
        B.panel('metal', [
          P(xTop, yHand, cz0 + 0.72), P(xBot, yHand, 1.08),
          P(xBot, yHand, 0.86), P(xTop, yHand, cz0 + 0.5),
        ], nV(1));
      }

      // curved arched barrel-vault polycarbonate canopy over the entire stair & escalator flight
      // (mái vòm cong nửa trụ bằng tấm lấy sáng xanh uốn dọc theo độ dốc cầu thang + khung cột thép như bên phải ảnh 2)
      const archSegs = 6, archSpan = (swHi - swLo) / 2 + 0.28, archRise = 1.05;
      const archPt = (x: number, zBase: number, k: number) => {
        const ang = (k / archSegs) * Math.PI;
        const b = swMid - Math.cos(ang) * archSpan;
        const z = zBase + Math.sin(ang) * archRise;
        return P(x, b, z);
      };
      const canopyFrames = 6;
      for (let f = 0; f <= canopyFrames; f++) {
        const uF = f / canopyFrames;
        const xF = aStairStart + sDir * (uF * (stairLen + 0.6));
        const zWall = cz0 + 1.0 - uF * (cz0 - 0.42);
        const zArchBase = zWall + 1.65;
        // steel support posts on both stepped walls up to the arch springline
        for (const yPost of [swLo + 0.08, swHi - 0.08]) {
          box(xF - 0.06, xF + 0.06, yPost - 0.06, yPost + 0.06, zWall, zArchBase, 'metal', 'metal');
        }
        // transverse steel arch rib
        for (let k = 0; k < archSegs; k++) {
          B.line(archPt(xF, zArchBase, k), archPt(xF, zArchBase, k + 1), 'crease');
        }
        if (f < canopyFrames) {
          const uNext = (f + 1) / canopyFrames;
          const xNext = aStairStart + sDir * (uNext * (stairLen + 0.6));
          const zNextBase = cz0 + 1.0 - uNext * (cz0 - 0.42) + 1.65;
          for (let k = 0; k < archSegs; k++) {
            const p00 = archPt(xF, zArchBase, k), p10 = archPt(xNext, zNextBase, k);
            const p11 = archPt(xNext, zNextBase, k + 1), p01 = archPt(xF, zArchBase, k + 1);
            B.panel('glass', [p00, p10, p11, p01], up);
            B.line(p01, p11, 'detail');
          }
          // under-canopy lighting strip along the crown of the stair vault
          const xMidF = (xF + xNext) / 2, zMidCrown = (zArchBase + zNextBase) / 2 + archRise - 0.12;
          B.window(lamp, [P(xMidF - 0.35, swMid - 0.12, zMidCrown), P(xMidF + 0.35, swMid - 0.12, zMidCrown), P(xMidF + 0.35, swMid + 0.12, zMidCrown), P(xMidF - 0.35, swMid + 0.12, zMidCrown)], down);
        }
      }

      // cantilevered arched entrance hood at the bottom of the stair (mái vòm đón màu xanh + giàn thép chữ X ở cửa lên xuống chân thang như ảnh 2)
      const xHood0 = aStairStart + sDir * (stairLen + 0.3), xHood1 = xHood0 + sDir * 2.35;
      const zHoodBase = 2.75, hoodSpan = archSpan + 0.22, hoodRise = 0.95;
      const hoodPt = (x: number, k: number) => {
        const ang = (k / archSegs) * Math.PI;
        return P(x, swMid - Math.cos(ang) * hoodSpan, zHoodBase + Math.sin(ang) * hoodRise);
      };
      // front steel portal columns & X-braced truss supporting the entrance hood
      for (const yCol of [swLo + 0.04, swHi - 0.04]) {
        const xCol = aBot0 + sDir * 0.25;
        box(xCol - 0.07, xCol + 0.07, yCol - 0.07, yCol + 0.07, 1.15, zHoodBase, 'metal', 'metal');
        B.line(P(xHood0, yCol, zHoodBase - 0.35), P(xHood1, yCol, zHoodBase), 'detail');
        B.line(P(xHood0, yCol, zHoodBase), P(xHood1, yCol, zHoodBase - 0.35), 'detail');
      }
      for (let k = 0; k < archSegs; k++) {
        B.panel('awning', [hoodPt(xHood0, k), hoodPt(xHood1, k), hoodPt(xHood1, k + 1), hoodPt(xHood0, k + 1)], up);
        B.line(hoodPt(xHood0, k), hoodPt(xHood0, k + 1), 'crease');
        B.line(hoodPt(xHood1, k), hoodPt(xHood1, k + 1), 'crease');
        B.line(hoodPt(xHood0, k + 1), hoodPt(xHood1, k + 1), 'detail');
      }
    }
  }
}

// ---------- trains ----------

export interface CarModel { parts: Map<'body' | 'top' | 'glass' | 'door' | 'win' | 'head', THREE.BufferGeometry>; shell: THREE.BufferGeometry; lines: Float32Array }

/** One car, nose toward +x, centred, its floor 0.25 m above the rail top: a long box with rounded
    corners, bogie wheel trucks, inter-car gangway bellows, rooftop HVAC pods & transverse louver
    slits (matching 05-metro.js), upper/lower belt trim lines, double-leaf sliding doors with vision
    windows, and on the end car (`cab`) a framed windscreen, destination header, coupler skirt and
    twin head lamps on its +x end. */
export function carModel(cab: boolean): CarModel {
  const B = new Batch(), L = METRO.carLen - 0.4, hw = 1.42, z0 = 0.28, z1 = 3.86, r = 0.36;
  const rect = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const ringPts: Vec2[] = [];
  for (const [cx, cy, a] of [[L / 2 - r, hw - r, 0], [-L / 2 + r, hw - r, Math.PI / 2], [-L / 2 + r, -hw + r, Math.PI], [L / 2 - r, -hw + r, 1.5 * Math.PI]] as const)
    for (let k = 0; k <= 2; k++) { const t = a + (k / 2) * (Math.PI / 2); ringPts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  B.solid(ringPts, z0, z1, () => 'wall', 'roof');

  // 1. Underframe bogie trucks & equipment boxes (z = 0.04 .. z0)
  for (const bx of [-L * 0.32, L * 0.32]) {
    B.solid(rect(bx - 1.35, bx + 1.35, -hw + 0.26, hw - 0.26), 0.05, z0, () => 'roof', 'roof');
    for (const ax of [bx - 0.85, bx + 0.85]) {
      for (const s of [-1, 1]) {
        const yw = s * (hw - 0.22);
        B.loop([V(ax - 0.34, yw, 0.04), V(ax + 0.34, yw, 0.04), V(ax + 0.34, yw, z0 - 0.02), V(ax - 0.34, yw, z0 - 0.02)], 'detail');
      }
    }
  }
  B.solid(rect(-L * 0.14, L * 0.14, -hw + 0.38, hw - 0.38), 0.1, z0, () => 'roof', 'roof');

  // 2. Inter-car accordion gangway bellows (05-metro.js: box(x - GAP, y + 4, z + 3, GAP, CD - 8, CH - 6))
  const gHalf = METRO.gap / 2 + 0.22, gy = hw - 0.36, gz0 = z0 + 0.22, gz1 = z1 - 0.34;
  B.solid(rect(-L / 2 - gHalf, -L / 2 + 0.05, -gy, gy), gz0, gz1, () => 'roof', 'roof');
  for (const xm of [-L / 2 - gHalf * 0.66, -L / 2 - gHalf * 0.33]) {
    B.loop([V(xm, -gy, gz0), V(xm, gy, gz0), V(xm, gy, gz1), V(xm, -gy, gz1)], 'detail');
  }
  if (!cab) {
    B.solid(rect(L / 2 - 0.05, L / 2 + gHalf, -gy, gy), gz0, gz1, () => 'roof', 'roof');
    for (const xm of [L / 2 + gHalf * 0.33, L / 2 + gHalf * 0.66]) {
      B.loop([V(xm, -gy, gz0), V(xm, gy, gz0), V(xm, gy, gz1), V(xm, -gy, gz1)], 'detail');
    }
  }

  // 3. Rooftop HVAC pods & transverse roof louver slits (05-metro.js: slits(6, CARW - 6, 3, 5, CD - 5))
  for (const hx of [-L * 0.24, L * 0.24]) {
    B.solid(rect(hx - 1.9, hx + 1.9, -hw * 0.56, hw * 0.56), z1, z1 + 0.22, () => 'roof', 'roof');
    for (let sx = hx - 1.5; sx <= hx + 1.5; sx += 0.5) {
      B.line(V(sx, -hw * 0.48, z1 + 0.23), V(sx, hw * 0.48, z1 + 0.23), 'detail');
    }
  }
  for (let sx = -L / 2 + 1.2; sx <= L / 2 - 1.2; sx += 0.75) {
    if (Math.abs(Math.abs(sx) - L * 0.24) < 2.05) continue;
    B.line(V(sx, -hw + 0.42, z1 + 0.01), V(sx, hw - 0.42, z1 + 0.01), 'detail');
  }

  // 4. Side walls: belt lines, double-leaf sliding doors with door vision glass, and passenger windows
  const win: number[] = [], door: number[] = [], head: number[] = [], glass: number[] = [];
  const quad = (out: number[], p: THREE.Vector3[], n: THREE.Vector3) => B.quad('wall', p, n, out);
  for (const s of [-1, 1]) {
    const y = s * (hw + 0.01), y2 = s * (hw + 0.016), n = new THREE.Vector3(0, 0, s);
    // Upper and lower longitudinal belt trim lines (05-metro.js lines 126) + mid livery stripe
    B.line(V(-L / 2 + 0.35, y, z1 - 0.34), V(L / 2 - 0.35, y, z1 - 0.34), 'detail');
    B.line(V(-L / 2 + 0.35, y, z0 + 0.32), V(L / 2 - 0.35, y, z0 + 0.32), 'detail');
    B.line(V(-L / 2 + 0.35, y, z0 + 1.16), V(L / 2 - (cab ? 1.4 : 0.35), y, z0 + 1.16), 'crease');

    // Double-leaf sliding doors at ±L/4 (leafL & leafR + vision glass panes)
    const doors = [-L / 4, L / 4], dw = 1.38;
    for (const d of doors) {
      const dx0 = d - dw / 2, dx1 = d + dw / 2, dz0 = z0 + 0.12, dz1 = z1 - 0.52;
      quad(door, [V(dx0, y, dz0), V(dx1, y, dz0), V(dx1, y, dz1), V(dx0, y, dz1)], n);
      B.loop([V(dx0, y2, dz0), V(dx1, y2, dz0), V(dx1, y2, dz1), V(dx0, y2, dz1)], 'crease');
      // Center seam between left and right sliding door leaves
      B.line(V(d, y2, dz0), V(d, y2, dz1), 'crease');
      // Door header indicator bar
      B.line(V(dx0 + 0.08, y2, dz1 + 0.09), V(dx1 - 0.08, y2, dz1 + 0.09), 'detail');
      // Vision glass window in each door leaf (leafL & leafR)
      for (const [lx0, lx1] of [[dx0 + 0.14, d - 0.09], [d + 0.09, dx1 - 0.14]] as const) {
        quad(win, [V(lx0, y2, z0 + 1.34), V(lx1, y2, z0 + 1.34), V(lx1, y2, z1 - 0.86), V(lx0, y2, z1 - 0.86)], n);
        B.loop([V(lx0, y2, z0 + 1.34), V(lx1, y2, z0 + 1.34), V(lx1, y2, z1 - 0.86), V(lx0, y2, z1 - 0.86)], 'detail');
      }
    }

    // Passenger windows between and beyond the doorways
    const spans: [number, number][] = [
      [-L / 2 + 1.05, -L / 4 - dw / 2 - 0.35],
      [-L / 4 + dw / 2 + 0.35, L / 4 - dw / 2 - 0.35],
      [L / 4 + dw / 2 + 0.35, L / 2 - (cab ? 2.25 : 1.05)],
    ];
    for (const [a, b] of spans) {
      const n2 = Math.max(1, Math.round((b - a) / 1.55)), w2 = (b - a) / n2;
      for (let i = 0; i < n2; i++) {
        const x0 = a + i * w2 + 0.09, x1 = x0 + w2 - 0.18, wz0 = z0 + 1.28, wz1 = z1 - 0.82;
        quad(win, [V(x0, y, wz0), V(x1, y, wz0), V(x1, y, wz1), V(x0, y, wz1)], n);
        B.loop([V(x0, y2, wz0), V(x1, y2, wz0), V(x1, y2, wz1), V(x0, y2, wz1)], 'detail');
        // Upper transom bar inside each passenger window
        B.line(V(x0, y2, wz1 - 0.24), V(x1, y2, wz1 - 0.24), 'detail');
      }
    }

    // Side cab driver window near +x end on cab cars
    if (cab) {
      const cx0 = L / 2 - 1.95, cx1 = L / 2 - 0.72, cz0 = z0 + 1.38, cz1 = z1 - 0.82;
      quad(win, [V(cx0, y, cz0), V(cx1, y, cz0), V(cx1, y, cz1), V(cx0, y, cz1)], n);
      B.loop([V(cx0, y2, cz0), V(cx1, y2, cz0), V(cx1, y2, cz1), V(cx0, y2, cz1)], 'detail');
    }
  }

  // 5. Cab front nose (+x end): coupler skirt, recessed windscreen frame, lit destination header & twin headlamps
  if (cab) {
    const x = L / 2 + 0.01, x2 = L / 2 + 0.018, n = new THREE.Vector3(1, 0, 0);
    // Lower front anti-climber / coupler skirt
    B.solid(rect(L / 2 - 0.18, L / 2 + 0.16, -hw + 0.28, hw - 0.28), 0.1, z0 + 0.24, () => 'roof', 'roof');
    // Outer windscreen surround bezel
    B.loop([V(x2, -hw + 0.22, z0 + 1.42), V(x2, hw - 0.22, z0 + 1.42), V(x2, hw - 0.22, z1 - 0.34), V(x2, -hw + 0.22, z1 - 0.34)], 'crease');
    // Main driver windscreen glass
    quad(glass, [V(x, -hw + 0.28, z0 + 1.48), V(x, hw - 0.28, z0 + 1.48), V(x, hw - 0.28, z1 - 0.68), V(x, -hw + 0.28, z1 - 0.68)], n);
    // Glowing LED destination / line-number header band at top of windscreen
    quad(win, [V(x2, -hw + 0.42, z1 - 0.64), V(x2, hw - 0.42, z1 - 0.64), V(x2, hw - 0.42, z1 - 0.40), V(x2, -hw + 0.42, z1 - 0.40)], n);
    B.loop([V(x2, -hw + 0.28, z0 + 1.48), V(x2, hw - 0.28, z0 + 1.48), V(x2, hw - 0.28, z1 - 0.68), V(x2, -hw + 0.28, z1 - 0.68)], 'detail');
    // Twin windscreen wipers
    B.line(V(x2, -0.45, z0 + 1.5), V(x2, -0.12, z0 + 2.05), 'detail');
    B.line(V(x2, 0.45, z0 + 1.5), V(x2, 0.12, z0 + 2.05), 'detail');
    // Twin headlight clusters + center route badge
    for (const y of [-hw + 0.46, hw - 0.46]) {
      quad(head, [V(x, y - 0.22, z0 + 0.56), V(x, y + 0.22, z0 + 0.56), V(x, y + 0.22, z0 + 0.88), V(x, y - 0.22, z0 + 0.88)], n);
      B.loop([V(x2, y - 0.25, z0 + 0.53), V(x2, y + 0.25, z0 + 0.53), V(x2, y + 0.25, z0 + 0.91), V(x2, y - 0.25, z0 + 0.91)], 'detail');
    }
    B.loop([V(x2, -0.28, z0 + 0.6), V(x2, 0.28, z0 + 0.6), V(x2, 0.28, z0 + 0.86), V(x2, -0.28, z0 + 0.86)], 'detail');
  }

  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
  const parts = new Map<'body' | 'top' | 'glass' | 'door' | 'win' | 'head', THREE.BufferGeometry>([
    ['body', geo(B.tris.get('wall') ?? [])], ['top', geo(B.tris.get('roof') ?? [])], ['glass', geo(glass)], ['door', geo(door)], ['win', geo(win)], ['head', geo(head)],
  ]);
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(B.shell.pos, 3));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(B.shell.nrm, 3));
  return { parts, shell, lines: new Float32Array([...B.creases, ...B.details]) };
}

// ---------- path helpers ----------

export function nearest(path: readonly Vec2[], p: Vec2): { at: Vec2; d: number; s: number } {
  let best = { at: path[0]!, d: Infinity, s: 0 }, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, q = closestOnSegment(p, a, b), L = dist(a, b);
    if (q.d < best.d) best = { at: q.at, d: q.d, s: acc + q.t * L };
    acc += L;
  }
  return best;
}

/** point and heading at distance s along a path */
export function at(path: readonly Vec2[], s: number): { p: Vec2; h: number } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, L = dist(a, b);
    if (acc + L >= s || i === path.length - 1) { const t = L ? Math.max(0, Math.min(1, (s - acc) / L)) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], h: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    acc += L;
  }
  return { p: path[0]!, h: 0 };
}

function resample(path: readonly Vec2[], step: number): Vec2[] {
  const L = polylineLength(path), n = Math.max(1, Math.ceil(L / step));
  return Array.from({ length: n + 1 }, (_, i) => at(path, (i * L) / n).p);
}

function offset(path: readonly Vec2[], d: number): Vec2[] {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)]!, b = path[Math.min(path.length - 1, i + 1)]!, L = dist(a, b) || 1;
    return [p[0] - ((b[1] - a[1]) / L) * d, p[1] + ((b[0] - a[0]) / L) * d] as const;
  });
}

function strip(path: readonly Vec2[], d0: number, d1: number): Vec2[] {
  return normalizeRing([...offset(path, d0), ...offset(path, d1).reverse()]);
}
