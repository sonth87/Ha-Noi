/* Ga đường sắt trên cao Thái Hà (Tuyến 2A Cát Linh – Hà Đông) in isometric SVG (10 units = 1 m).
   Matches the full 3D architecture of metro.ts (ADR-050):
     - Plot 104 × 52 m along Phố Hoàng Cầu: two-carriageway asphalt avenue (b ∈ [96, 424]),
       central planted median strip (b ∈ [236, 284]), raised outer sidewalks (b ∈ [0, 96] and [424, 520])
       with paving joints, street lamps, shade trees, cars and motorbikes;
     - Level 0 (z = 0..58): 5 bays of paired central columns with drainage downpipes and flared
       cantilever Y/T crosshead beams supporting the concourse, plus outer viaduct T-piers;
     - Level 1 (z = 58..100, floor "MS/1"): Concourse hall with under-deck longitudinal ribs,
       projecting floor/ceiling slabs, clickable ribbon windows, horizontal steel sunshade louver
       canopies, open end-loggia portals with glass balustrades, ceiling light strips, and
       projecting station sign boxes;
     - Level 2 (z = 100..148, floors "MS/2" & "MS/3"): Twin elevated viaduct box girders with rails,
       two side platforms with lit platform edge strips ("MS/2"), slanted louver side screens,
       4 corner square blocks with Ga Thái Hà's green-and-white geometric diamond/triangle mosaic,
       and two 4-car Line 2A metro trains ("MS/3") with cab windscreens and night headlights;
     - Roof (z = 148..206): Twin curved C-shell barrel roofs with transverse ribs, central arched
       glass skylight vault with exposed steel arch trusses, under-roof lamps and side name boards;
     - 4 Sidewalk Access Complexes (nw, ne, sw, se): Elevated pedestrian overpass bridges spanning
       across the road carriageways (z = 54..88) to vertical elevator towers & covered stepped-wall
       stair/escalator ramps with curved barrel-vault canopies on the outer sidewalks (b ∈ [18, 96]
       and [424, 502]), completely clear of the road lanes. */
import { kernel, type Kernel } from '@iso/kernel';
import { depthSort } from '@core/depth';
import { rng } from '@core/rng';
import type { Item, ViewK } from '@core/types';
import { localFrame, rotateSpec, type LocalFrame } from '@core/view';
import { LocalDraw, type LV } from '@render/local';
import { parkTree } from '@render/landmarks/garden';
import { car, CAR_LEN, type CarKind } from '@render/parts/car';
import { scooter } from '@render/parts/bike';
import { composeScene } from '@render/scene';
import { f, g } from '@render/svg';

export const MS_SIZE: readonly [number, number] = [1040, 520];

const poly = (D: LocalDraw, pts: readonly LV[], cls: string) => `<path class="${cls}" d="${D.path(pts)}Z"/>`;
const line = (D: LocalDraw, pts: readonly LV[], cls = 'detail') => `<path class="${cls}" d="${D.path(pts)}"/>`;

/** Is a face with outward local normal (na, nb, nz) turned toward the isometric viewer? */
function sees(D: LocalDraw, na: number, nb: number, nz: number): boolean {
  const v = D.L.vec(na, nb, nz);
  return v[0] + v[1] + v[2] > 1e-6;
}

/** Draw a 3D quad if its outward normal faces the viewer. */
function quadVis(D: LocalDraw, pts: readonly [LV, LV, LV, LV], n: readonly [number, number, number], cls: string): string {
  return sees(D, n[0], n[1], n[2]) ? poly(D, pts, cls) : '';
}

/** Order internal sub-parts within a composite Item using core's exact 3D painter's depthSort. */
function joinSorted(D: LocalDraw, parts: readonly { id: string; a: number; b: number; z: number; la: number; lb: number; h: number; svg: string }[]): string {
  const boxed = parts.map(p => ({ id: p.id, box: D.wbox(p.a, p.b, p.z, p.la, p.lb, p.h), svg: p.svg }));
  return depthSort(boxed).order.map(x => x.svg).join('');
}

/** Deterministic window brightness/state variant (' off' | ' dim' | ' hi' | '') matching iso-glow */
function winVar(a: number, b: number, c = 0): string {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 23.4) * 43758.5453;
  const r = x - Math.floor(x);
  return r < 0.12 ? ' off' : r < 0.30 ? ' dim' : r < 0.48 ? ' hi' : '';
}

/** Draw one 4-car Line 2A metro train set along `a` from `a0`, centred on `bc`, rail top at `zRail`. */
function drawTrainSet(
  D: LocalDraw, a0: number, bc: number, zRail: number, dir: 1 | -1, floorId: string,
): string {
  const cars = 4, carL = 138, gap = 6, hw = 13.5, z0 = zRail + 2, z1 = zRail + 34, h = z1 - z0;
  const sub: { id: string; a: number; b: number; z: number; la: number; lb: number; h: number; svg: string }[] = [];
  const nearB = D.L.visible('+b') ? 1 : -1;
  const bVis = bc + nearB * (hw + 0.15);

  for (let c = 0; c < cars; c++) {
    const ca = a0 + c * (carL + gap);
    const isFrontCab = (dir > 0 && c === cars - 1) || (dir < 0 && c === 0);
    const isRearCab = (dir > 0 && c === 0) || (dir < 0 && c === cars - 1);
    let s = D.box(ca, bc - hw, z0, carL, hw * 2, h, 3);
    // roof AC pods & longitudinal green/accent livery stripe along the visible side
    s += D.boxc(ca + 22, bc - hw * 0.55, z1, 36, hw * 1.1, 2.2, 'metal');
    s += D.boxc(ca + carL - 58, bc - hw * 0.55, z1, 36, hw * 1.1, 2.2, 'metal');
    s += line(D, [[ca + 4, bVis, z0 + 11], [ca + carL - 4, bVis, z0 + 11]], 'canopy-line');
    s += line(D, [[ca + 4, bVis, z1 - 4.5], [ca + carL - 4, bVis, z1 - 4.5]], 'detail');

    // sliding doors (2 per car side) & lit passenger windows on the visible long side
    const doors = [ca + carL * 0.27, ca + carL * 0.73], dw = 13;
    for (const da of doors) {
      s += poly(D, [[da - dw / 2, bVis, z0 + 2], [da + dw / 2, bVis, z0 + 2], [da + dw / 2, bVis, z1 - 5.5], [da - dw / 2, bVis, z1 - 5.5]], 'face metal');
      s += line(D, [[da, bVis, z0 + 2], [da, bVis, z1 - 5.5]], 'detail');
    }
    const winSpans: [number, number][] = [
      [ca + 10, doors[0]! - dw / 2 - 4],
      [doors[0]! + dw / 2 + 4, doors[1]! - dw / 2 - 4],
      [doors[1]! + dw / 2 + 4, ca + carL - 10],
    ];
    let wins = '';
    winSpans.forEach(([w0, w1], sIdx) => {
      const nw = Math.max(1, Math.round((w1 - w0) / 14)), step = (w1 - w0) / nw;
      for (let i = 0; i < nw; i++) {
        const x0 = w0 + i * step + 1.2, x1 = x0 + step - 2.4;
        const v = winVar(c + (dir > 0 ? 10 : 0), sIdx, i);
        wins += poly(D, [[x0, bVis, z0 + 13], [x1, bVis, z0 + 13], [x1, bVis, z1 - 7.5], [x0, bVis, z1 - 7.5]], `win${v}`);
      }
    });
    s += `<g class="fl" data-floor="${floorId}"><g class="lights">${wins}</g></g>`;

    // cab windscreen & headlights/taillights at the outer ends of the 4-car set
    for (const [isCab, endSign] of [[isFrontCab, dir], [isRearCab, -dir]] as const) {
      if (!isCab) continue;
      const aEnd = endSign > 0 ? ca + carL + 0.2 : ca - 0.2;
      if (sees(D, endSign, 0, 0)) {
        s += poly(D, [[aEnd, bc - hw + 3, z0 + 14], [aEnd, bc + hw - 3, z0 + 14], [aEnd, bc + hw - 3, z1 - 4], [aEnd, bc - hw + 3, z1 - 4]], 'car-glass');
      }
      const cls = endSign === dir ? 'bulb' : 'bulb tail';
      const r = endSign === dir ? 1.4 : 1.0;
      const pL = D.P(aEnd, bc - hw + 4.5, z0 + 7.5), pR = D.P(aEnd, bc + hw - 4.5, z0 + 7.5);
      s += `<g class="lamp" data-night="1"><circle class="${cls}" cx="${f(pL[0])}" cy="${f(pL[1])}" r="${r}"/><circle class="${cls}" cx="${f(pR[0])}" cy="${f(pR[1])}" r="${r}"/></g>`;
    }

    sub.push({ id: `car-${c}`, a: ca, b: bc - hw, z: z0, la: carL, lb: hw * 2, h: h + 2.5, svg: s });
    if (c < cars - 1) {
      const ga = ca + carL;
      sub.push({ id: `gang-${c}`, a: ga, b: bc - hw + 2.5, z: z0 + 2, la: gap, lb: (hw - 2.5) * 2, h: h - 4, svg: D.boxc(ga, bc - hw + 2.5, z0 + 2, gap, (hw - 2.5) * 2, h - 4, 'recess') });
    }
  }
  return joinSorted(D, sub);
}

/** Draw one outer-sidewalk access complex (landing, vertical elevator tower, stepped-wall stair &
    escalator ramp, arched barrel-vault polycarbonate canopy & entrance hood) inside
    a ∈ [aBr - 150, aBr + 150], b ∈ [bLo, bHi], z ∈ [0, 94]. */
function drawSidewalkAccess(
  D: LocalDraw, aBr: number, sDir: 1 | -1, side: -1 | 1, bLo: number, bHi: number, cz0: number, floorId: string,
): string {
  const brW = 28, bMid = (bLo + bHi) / 2, lb = bHi - bLo;
  const sub: { id: string; a: number; b: number; z: number; la: number; lb: number; h: number; svg: string }[] = [];

  // 1. Elevator tower on the -sDir side of the landing (z = 0..94)
  const aElev0 = aBr - sDir * (brW / 2 + 2), aElev1 = aBr - sDir * (brW / 2 + 28);
  const eLo = Math.min(aElev0, aElev1), eHi = Math.max(aElev0, aElev1), eLa = eHi - eLo;
  {
    let s = D.box(eLo, bLo + 2, 0, eLa, lb - 4, cz0 + 1) +
      D.box(eLo + 1, bLo + 2.5, cz0 + 1, eLa - 2, lb - 5, 30) +
      D.boxc(eLo - 1, bLo + 1, cz0 + 31, eLa + 2, lb - 2, 3, 'metal');
    // ground-level elevator door & lit indicator panel on the -sDir end
    const aDoor = sDir > 0 ? eLo - 0.2 : eHi + 0.2;
    s += quadVis(D, [[aDoor, bMid - 6.5, 2.5], [aDoor, bMid + 6.5, 2.5], [aDoor, bMid + 6.5, 23], [aDoor, bMid - 6.5, 23]], [-sDir, 0, 0], 'face metal');
    s += line(D, [[aDoor, bMid, 2.5], [aDoor, bMid, 23]], 'detail');
    // upper glass elevator cabin windows on the visible long side (clickable with concourse floorId)
    const bWin = D.L.visible('+b') ? bHi - 2.3 : bLo + 2.3;
    const nWin = D.L.visible('+b') ? 1 : -1;
    const winQuad = quadVis(D, [[eLo + 4, bWin, cz0 + 8], [eHi - 4, bWin, cz0 + 8], [eHi - 4, bWin, cz0 + 26], [eLo + 4, bWin, cz0 + 26]], [0, nWin, 0], `win${winVar(aBr, side, 1)}`);
    if (winQuad) s += `<g class="fl" data-floor="${floorId}"><g class="lights">${winQuad}</g></g>`;
    sub.push({ id: 'elev', a: eLo - 1, b: bLo + 1, z: 0, la: eLa + 2, lb: lb - 2, h: cz0 + 34, svg: s });
  }

  // 2. Landing platform at z = cz0 & twin support columns under it
  const lLoA = aBr - brW / 2 - 2, lHiA = aBr + brW / 2 + 2;
  {
    const colW = 5;
    let s = D.box(lLoA + 3, bLo + 3, 0, colW, colW, cz0 - 5) +
      D.box(lHiA - 3 - colW, bLo + 3, 0, colW, colW, cz0 - 5) +
      D.box(lLoA + 3, bHi - 3 - colW, 0, colW, colW, cz0 - 5) +
      D.box(lHiA - 3 - colW, bHi - 3 - colW, 0, colW, colW, cz0 - 5) +
      D.box(lLoA, bLo, cz0 - 5, lHiA - lLoA, lb, 6);
    // outer glass railing on the landing
    const bOuter = side > 0 ? bHi - 0.5 : bLo + 0.5;
    s += poly(D, [[lLoA, bOuter, cz0 + 1], [lHiA, bOuter, cz0 + 1], [lHiA, bOuter, cz0 + 12], [lLoA, bOuter, cz0 + 12]], 'glass-panel');
    s += line(D, [[lLoA, bOuter, cz0 + 12], [lHiA, bOuter, cz0 + 12]], 'rail');
    sub.push({ id: 'landing', a: lLoA, b: bLo, z: 0, la: lHiA - lLoA, lb, h: cz0 + 13, svg: s });
  }

  // 3. 6-tier stepped white side walls, stair treads, escalator channel & barrel-vault canopy
  //    split into 6 non-overlapping longitudinal slices along `a` so painter's order is exact!
  const aStart = aBr + sDir * (brW / 2 + 2);
  const stairLen = 114, tiers = 6;
  const swLo = bLo + 1.5, swHi = bHi - 1.5, swMid = (swLo + swHi) / 2;
  const archSegs = 6, archSpan = (swHi - swLo) / 2 + 2.5, archRise = 10.5;
  const archPt = (x: number, zBase: number, k: number): LV => {
    const ang = (k / archSegs) * Math.PI;
    return [x, swMid - Math.cos(ang) * archSpan, zBase + Math.sin(ang) * archRise];
  };

  for (let t = 0; t < tiers; t++) {
    const u0 = t / tiers, u1 = (t + 1) / tiers;
    const x0 = aStart + sDir * (u0 * stairLen), x1 = aStart + sDir * (u1 * stairLen);
    const tx0 = Math.min(x0, x1), tx1 = Math.max(x0, x1), tla = tx1 - tx0;
    const zTopTier = cz0 + 10.5 - u0 * (cz0 - 4.5);
    const zBotTier = t < 3 ? Math.max(2.5, cz0 - 13.5 - u1 * (cz0 - 11)) : 2.5;
    let s = '';

    // under-stair solid core (lower 3 tiers) or sloped spine beam (upper 3 tiers)
    if (t >= 3) {
      s += D.box(tx0, swLo + 2.2, 2.5, tla, swHi - swLo - 4.4, Math.max(3, zTopTier - 8.5));
    } else {
      s += D.box(tx0, swLo + 2.2, zBotTier, tla, swHi - swLo - 4.4, 6.5);
    }

    // 3 stair steps & escalator channel per tier
    for (let stp = 0; stp < 3; stp++) {
      const su0 = u0 + (stp / 3) * (1 / tiers), su1 = u0 + ((stp + 1) / 3) * (1 / tiers);
      const sx0 = Math.min(aStart + sDir * (su0 * stairLen), aStart + sDir * (su1 * stairLen));
      const sx1 = Math.max(aStart + sDir * (su0 * stairLen), aStart + sDir * (su1 * stairLen));
      const sz = cz0 - su0 * (cz0 - 3.5);
      s += D.box(sx0, swLo + 2.2, sz - 3.5, sx1 - sx0, swMid - swLo - 2.6, 3.5);
      s += D.boxc(sx0, swMid + 0.4, sz - 3.8, sx1 - sx0, swHi - swMid - 2.6, 3.2, 'metal');
    }

    // stepped white side parapet walls on both sides (swLo and swHi)
    s += D.box(tx0, swLo, zBotTier, tla, 2.2, zTopTier - zBotTier);
    s += D.box(tx0, swHi - 2.2, zBotTier, tla, 2.2, zTopTier - zBotTier);

    // inclined escalator handrail segment
    const zH0 = cz0 + 6.5 - u0 * (cz0 - 9.5), zH1 = cz0 + 6.5 - u1 * (cz0 - 9.5);
    for (const yH of [swMid + 0.2, swHi - 2.5]) {
      s += line(D, [[x0, yH, zH0], [x1, yH, zH1]], 'canopy-line');
    }

    // steel canopy posts & arched barrel-vault polycarbonate roof over this tier
    const zArch0 = zTopTier + 15.5, zArch1 = (cz0 + 10.5 - u1 * (cz0 - 4.5)) + 15.5;
    for (const yPost of [swLo + 1.0, swHi - 1.0]) {
      s += line(D, [[x0, yPost, zTopTier], [x0, yPost, zArch0]], 'mast');
      if (t === tiers - 1) s += line(D, [[x1, yPost, zTopTier - 6], [x1, yPost, zArch1]], 'mast');
    }
    for (let k = 0; k < archSegs; k++) {
      const p00 = archPt(x0, zArch0, k), p10 = archPt(x1, zArch1, k);
      const p11 = archPt(x1, zArch1, k + 1), p01 = archPt(x0, zArch0, k + 1);
      s += poly(D, [p00, p10, p11, p01], 'glass-panel');
      s += line(D, [p00, p01], 'rail');
      if (t === tiers - 1) s += line(D, [p10, p11], 'rail');
      s += line(D, [p01, p11], 'detail');
    }
    // under-canopy night lamp at the crown of alternate tiers
    if (t % 2 === 1) {
      const pLamp = D.P((x0 + x1) / 2, swMid, (zArch0 + zArch1) / 2 + archRise - 1.5);
      s += `<g class="lamp" data-night="1"><circle class="halo" cx="${f(pLamp[0])}" cy="${f(pLamp[1])}" r="7" filter="url(#bloom)"/><circle class="bulb" cx="${f(pLamp[0])}" cy="${f(pLamp[1])}" r="1.5"/></g>`;
    }

    sub.push({
      id: `tier-${t}`,
      a: tx0, b: bLo, z: 2.5, la: tla, lb, h: Math.max(zArch0, zArch1) + archRise - 2.5,
      svg: s,
    });
  }

  // 4. Bottom 3-step entrance podium & cantilevered arched entrance hood with X-braced steel truss
  const aBot0 = aStart + sDir * stairLen, aBot1 = aBot0 + sDir * 20;
  const bx0 = Math.min(aBot0, aBot1), bx1 = Math.max(aBot0, aBot1), bla = bx1 - bx0;
  {
    let s = D.box(bx0, swLo - 1, 2.5, bla, swHi - swLo + 2, 3.2) +
      D.box(bx0, swLo, 2.5, bla, 2.2, 11.5) +
      D.box(bx0, swHi - 2.2, 2.5, bla, 2.2, 11.5);
    const zHood = 27.5, hoodSpan = archSpan + 2.0, hoodRise = 9.0;
    const hoodPt = (x: number, k: number): LV => {
      const ang = (k / archSegs) * Math.PI;
      return [x, swMid - Math.cos(ang) * hoodSpan, zHood + Math.sin(ang) * hoodRise];
    };
    for (const yCol of [swLo + 0.8, swHi - 0.8]) {
      s += line(D, [[aBot0 + sDir * 3, yCol, 14], [aBot0 + sDir * 3, yCol, zHood]], 'mast');
      s += line(D, [[aBot0, yCol, zHood - 3.5], [aBot1, yCol, zHood]], 'detail');
      s += line(D, [[aBot0, yCol, zHood], [aBot1, yCol, zHood - 3.5]], 'detail');
    }
    for (let k = 0; k < archSegs; k++) {
      s += poly(D, [hoodPt(aBot0, k), hoodPt(aBot1, k), hoodPt(aBot1, k + 1), hoodPt(aBot0, k + 1)], 'face awning');
      s += line(D, [hoodPt(aBot0, k), hoodPt(aBot0, k + 1)], 'rail');
      s += line(D, [hoodPt(aBot1, k), hoodPt(aBot1, k + 1)], 'rail');
    }
    sub.push({ id: 'hood', a: bx0, b: bLo, z: 2.5, la: bla, lb, h: zHood + hoodRise - 2.5, svg: s });
  }

  return joinSorted(D, sub);
}

/** Draw an elevated pedestrian overpass footbridge crossing over the street carriageway. */
function drawOverpassBridge(
  D: LocalDraw, aBr: number, bLo: number, bHi: number, cz0: number,
): string {
  const brW = 28, a0 = aBr - brW / 2, lb = bHi - bLo;
  let s = D.boxc(a0 + 1, bLo, cz0 - 7, brW - 2, lb, 2.2, 'metal') +
    D.box(a0, bLo, cz0 - 5, brW, lb, 6);
  // glass balustrades + stainless posts on both sides of the bridge
  for (const sa of [-1, 1] as const) {
    const aRail = aBr + sa * (brW / 2 - 0.8);
    s += poly(D, [[aRail, bLo, cz0 + 1], [aRail, bHi, cz0 + 1], [aRail, bHi, cz0 + 12], [aRail, bLo, cz0 + 12]], 'glass-panel');
    s += line(D, [[aRail, bLo, cz0 + 12], [aRail, bHi, cz0 + 12]], 'rail');
    const posts = 4;
    for (let k = 0; k <= posts; k++) {
      const bk = bLo + (lb * k) / posts;
      s += line(D, [[aRail, bk, cz0 + 1], [aRail, bk, cz0 + 12.2]], 'rail');
      if (k === 1 || k === posts - 1) {
        s += line(D, [[aRail, bk, cz0 + 12.2], [aRail, bk, cz0 + 26.5]], 'mast');
      }
    }
  }
  // slim canopy roof over the bridge
  s += D.boxc(a0 - 1.5, bLo, cz0 + 26.5, brW + 3, lb, 1.8, 'metal');
  return s;
}

export function renderMetroStation(
  K: Kernel, L: LocalFrame, w = MS_SIZE[0], d = MS_SIZE[1], id = 'MS',
): { items: Item[]; floors: string[] } {
  const D = new LocalDraw(K, L), items: Item[] = [];
  const floors = [`${id}/1`, `${id}/2`, `${id}/3`];
  const add = (iid: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `${id}:${iid}`, box: L.box(a, b, z, la, lb, h), svg });

  const midB = d / 2; // 260
  const roadN0 = 96, roadS1 = d - 96; // road carriageways inside [96, 424], sidewalks outside
  const stB0 = 166, stB1 = 354, stW = stB1 - stB0; // station central envelope width = 188 (18.8 m)
  const cz0 = 60, cz1 = 100, zp = 135, zr = 186;

  // ---- 1. Base plot: Phố Hoàng Cầu dual carriageway, lane markings, raised sidewalks & central median ----
  {
    const ground = (inner: string) => g(D.plane([0, 0, 0.1], [1, 0, 0], [0, 1, 0]), inner);
    let roadArt = `<rect class="road" x="0" y="${roadN0}" width="${w}" height="${roadS1 - roadN0}"/>`;
    // road edge lines & dashed lane markings along both carriageways
    roadArt += `<path class="lane-solid" d="M0 ${roadN0 + 3}L${w} ${roadN0 + 3}M0 ${midB - 26}L${w} ${midB - 26}M0 ${midB + 26}L${w} ${midB + 26}M0 ${roadS1 - 3}L${w} ${roadS1 - 3}"/>`;
    for (const ly of [(roadN0 + (midB - 24)) / 2, (midB + 24 + roadS1) / 2]) {
      roadArt += `<path class="lane" d="M12 ${f(ly)}L${w - 12} ${f(ly)}"/>`;
    }
    let s = D.box(0, 0, -8, w, d, 8) + ground(roadArt);
    // raised outer sidewalks (z = 0..2.5) + paving joint lines
    s += D.box(0, 0, 0, w, roadN0, 2.5) + D.box(0, roadS1, 0, w, d - roadS1, 2.5);
    let joints = '';
    for (let a = 40; a < w; a += 40) {
      joints += D.path([[a, 2, 2.6], [a, roadN0 - 2, 2.6]]) + D.path([[a, roadS1 + 2, 2.6], [a, d - 2, 2.6]]);
    }
    s += `<path class="paving" d="${joints}"/>`;
    // central planted median strip along the avenue (b ∈ [236, 284])
    s += D.box(50, midB - 24, 0, w - 100, 48, 3.4) +
      D.boxc(58, midB - 19, 3.4, w - 116, 38, 3.8, 'plant');
    add('plot', 0, 0, -8, w, d, 8, s);
  }

  // ---- 2. Level 0 (z = 0..58): 5 twin central pier bays + flared Y/T crossheads, plus 2 viaduct end piers ----
  const pierBays = [220, 370, 520, 670, 820];
  pierBays.forEach((ac, idx) => {
    // stepped plinth + twin central columns with central slot & drainage downpipe (strictly inside median b ∈ [238, 282])
    const plinth = D.box(ac - 12, midB - 22, 0, 24, 44, 5.5);
    const colN = D.box(ac - 8.5, midB - 20, 5.5, 17, 13.5, 33);
    const colCore = D.boxc(ac - 4, midB - 6.5, 5.5, 8, 13, 33, 'recess');
    const colS = D.box(ac - 8.5, midB + 6.5, 5.5, 17, 13.5, 33);
    const pipes = line(D, [[ac - 9, midB, 5.5], [ac - 9, midB, 38.5]], 'pipe') +
      line(D, [[ac + 9, midB, 5.5], [ac + 9, midB, 38.5]], 'pipe');
    add(`pier-col-${idx}`, ac - 12, midB - 22, 0, 24, 44, 38.5, plinth + colN + colCore + colS + pipes);

    // flared cantilever Y/T crosshead beam (z = 38.5..58, high above all road traffic z = 0..22)
    let crossSvg = '';
    const steps = 4;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps;
      const halfB = 22 + (stW / 2 - 26) * t1;
      const z0 = 38.5 + 15.5 * t0, z1 = 38.5 + 15.5 * t1;
      crossSvg += D.box(ac - 8.5, midB - halfB, z0, 17, halfB * 2, z1 - z0);
    }
    crossSvg += D.box(ac - 9.5, stB0 + 3, 54, 19, stW - 6, 4);
    add(`pier-cap-${idx}`, ac - 9.5, stB0 + 3, 38.5, 19, stW - 6, 19.5, crossSvg);
  });

  // 2 outer T-piers under the viaduct approaches (a = 80 and a = 960, z = 0..100)
  for (const [vIdx, ac] of [[0, 80], [1, 960]] as const) {
    const s = D.box(ac - 11, midB - 14, 0, 22, 28, 5.5) +
      D.box(ac - 8, midB - 10, 5.5, 16, 20, 78.5) +
      D.box(ac - 9.5, midB - 32, 84, 19, 64, 9) +
      D.box(ac - 10.5, midB - 44, 93, 21, 88, 7);
    add(`vpier-${vIdx}`, ac - 12, midB - 45, 0, 24, 90, 100, s);
  }

  // ---- 3. Level 1 (z = 58..100, floor "MS/1"): Concourse hall, open end portals & sunshade hoods ----
  {
    const cA0 = 164, cA1 = 876, cLa = cA1 - cA0;
    const hA0 = 200, hA1 = 840, hLa = hA1 - hA0;
    let s = '';
    // longitudinal under-deck ribs & projecting white floor slab
    s += D.boxc(cA0 + 4, stB0 + 6, 58, cLa - 8, stW - 12, 2, 'metal');
    s += D.box(cA0, stB0, cz0, cLa, stW, 4.2);
    // enclosed middle concourse hall (z = 64.2 .. 96) with clickable ribbon windows
    s += D.box(hA0, stB0 + 5, cz0 + 4.2, hLa, stW - 10, cz1 - cz0 - 7.7);

    const nearSide = D.L.visible('+b') ? '+b' : '-b';
    const bWin = nearSide === '+b' ? stB1 - 4.8 : stB0 + 4.8;
    const nWin = nearSide === '+b' ? 1 : -1;
    let wins = '';
    const winCount = 24, winStep = (hLa - 24) / winCount;
    for (let i = 0; i < winCount; i++) {
      const x0 = hA0 + 12 + i * winStep + 2, x1 = x0 + winStep - 4;
      wins += quadVis(D, [[x0, bWin, cz0 + 11.5], [x1, bWin, cz0 + 11.5], [x1, bWin, cz1 - 8.5], [x0, bWin, cz1 - 8.5]], [0, nWin, 0], `win${winVar(1, i, nearSide === '+b' ? 1 : 2)}`);
    }
    s += `<g class="fl" data-floor="${id}/1"><g class="lights">${wins}</g></g>`;

    // horizontal steel sunshade louver canopies near the ends of the visible long facade
    for (const aHood of [cA0 + 46, cA1 - 110]) {
      const hb0 = nearSide === '+b' ? stB1 - 5 : stB0 - 6;
      s += D.boxc(aHood, hb0, cz1 - 6.5, 64, 11, 2, 'metal');
    }

    // open end-loggia portals at both ends (a ∈ [cA0, hA0] and [hA1, cA1]) with glass balustrades & ceiling lamps
    for (const sa of [-1, 1] as const) {
      const aPortal = sa > 0 ? cA1 - 2 : cA0 + 2;
      for (const [b0, b1] of [[stB0 + 6, midB - 30], [midB + 30, stB1 - 6]] as const) {
        s += poly(D, [[aPortal, b0, cz0 + 4.2], [aPortal, b1, cz0 + 4.2], [aPortal, b1, cz0 + 15.2], [aPortal, b0, cz0 + 15.2]], 'glass-panel');
        s += line(D, [[aPortal, b0, cz0 + 15.2], [aPortal, b1, cz0 + 15.2]], 'rail');
        const pLamp = D.P(aPortal - sa * 12, (b0 + b1) / 2, cz1 - 4);
        s += `<g class="lamp" data-night="1"><circle class="halo" cx="${f(pLamp[0])}" cy="${f(pLamp[1])}" r="9" filter="url(#bloom)"/><circle class="bulb" cx="${f(pLamp[0])}" cy="${f(pLamp[1])}" r="1.8"/></g>`;
      }
    }

    // projecting upper concourse ceiling slab & end sign lintels
    s += D.box(cA0, stB0, cz1 - 3.5, cLa, stW, 3.5);
    add('concourse', cA0, stB0, 58, cLa, stW, 42, s);
  }

  // ---- 4. Level 2 (z = 100..148, floors "MS/2" & "MS/3"): Viaduct girders, platforms, diamond mosaic & 4-car trains ----
  {
    const sub: { id: string; a: number; b: number; z: number; la: number; lb: number; h: number; svg: string }[] = [];
    const pA0 = 136, pA1 = 904, pLa = pA1 - pA0;

    // (a) Twin elevated viaduct track girders running full length (a = 20..1020, b = midB ± 21)
    for (const [tIdx, tb] of [[0, midB - 21], [1, midB + 21]] as const) {
      let vSvg = D.box(20, tb - 20, 100, w - 40, 40, 22) +
        D.boxc(20, tb < midB ? tb - 21 : tb + 18.5, 122, w - 40, 2.5, 9, 'wall');
      for (const gOff of [-7, 7]) {
        vSvg += line(D, [[20, tb + gOff, 122.2], [w - 20, tb + gOff, 122.2]], 'detail');
      }
      sub.push({ id: `viaduct-${tIdx}`, a: 20, b: tb - 21, z: 100, la: w - 40, lb: 42, h: 31, svg: vSvg });
    }

    // (b) Two 4-car Line 2A metro trains on the two tracks (floor "MS/3")
    sub.push({
      id: 'train-n', a: 230, b: midB - 35, z: 122, la: 572, lb: 28, h: 25,
      svg: `<g class="ms-train" data-train="1" data-dir="-1">${drawTrainSet(D, 230, midB - 21, 122, -1, `${id}/3`)}</g>`,
    });
    sub.push({
      id: 'train-s', a: 238, b: midB + 7, z: 122, la: 572, lb: 28, h: 25,
      svg: `<g class="ms-train" data-train="2" data-dir="1">${drawTrainSet(D, 238, midB + 21, 122, 1, `${id}/3`)}</g>`,
    });

    // (c) Two side platforms (b ∈ [stB0, midB-42] and [midB+42, stB1]) with lit edge strips ("MS/2"),
    //     slanted green/white louver screens, and the 4 corner geometric diamond mosaic blocks
    for (const [sIdx, sb] of [[0, -1], [1, 1]] as const) {
      const b0 = sb < 0 ? stB0 : midB + 42, b1 = sb < 0 ? midB - 42 : stB1, plb = b1 - b0;
      const bOuter = sb < 0 ? b0 : b1, bInner = sb < 0 ? b1 : b0;
      let pSvg = D.box(pA0, b0, 107, pLa, plb, zp - 107);

      // glowing platform safety edge strip segmented into individual light bars (clickable floor "MS/2")
      const e0 = sb < 0 ? bInner - 4.5 : bInner + 1.5, e1 = sb < 0 ? bInner - 1.5 : bInner + 4.5;
      let edgeLights = '';
      const edgeSegs = 18, edgeSpan = (pA1 - pA0 - 20) / edgeSegs;
      for (let k = 0; k < edgeSegs; k++) {
        const ea0 = pA0 + 10 + k * edgeSpan + 1.5, ea1 = ea0 + edgeSpan - 3;
        edgeLights += poly(D, [[ea0, e0, zp + 0.2], [ea1, e0, zp + 0.2], [ea1, e1, zp + 0.2], [ea0, e1, zp + 0.2]], `win${winVar(2, sIdx, k)}`);
      }
      pSvg += `<g class="fl ms-edge" data-edge="${sIdx + 1}" data-floor="${id}/2"><g class="lights">${edgeLights}</g></g>`;

      // outer parapet wall + slanted louver screen along the platform exterior
      const bLouverTop = bOuter + sb * 5.5;
      pSvg += D.box(pA0, sb < 0 ? b0 : b1 - 2, zp, pLa, 2, 11);
      if (sees(D, 0, sb, 0)) {
        pSvg += poly(D, [[pA0 + 28, bOuter, zp + 11], [pA1 - 28, bOuter, zp + 11], [pA1 - 28, bLouverTop, zp + 13], [pA0 + 28, bLouverTop, zp + 13]], 'face plant');
      }

      // 2 iconic square end-wall blocks per side with green-and-white geometric diamond/triangle mosaic
      let mosaicLights = '';
      for (const sa of [-1, 1] as const) {
        const mLo = sa < 0 ? 164 : 848, mHi = sa < 0 ? 192 : 876;
        const mb0 = b0 + 1, mb1 = b1 - 1;
        const mz0 = 100, mz1 = 148;
        pSvg += D.box(mLo, mb0, mz0, mHi - mLo, mb1 - mb0, mz1 - mz0);
        const mFace = sa > 0 ? mHi + 0.2 : mLo - 0.2;
        if (sees(D, sa, 0, 0)) {
          const cols = 3, rows = 3, cw = (mb1 - mb0) / cols, rh = (mz1 - mz0 - 4) / rows;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const yA = mb0 + c * cw, yB = yA + cw, yM = (yA + yB) / 2;
              const zA = mz0 + 2 + r * rh, zB = zA + rh, zM = (zA + zB) / 2;
              mosaicLights += poly(D, [[mFace, yM, zA], [mFace, yB, zM], [mFace, yM, zB], [mFace, yA, zM]], `win${winVar(sa + 5, r + sIdx * 3, c)}`);
              pSvg += line(D, [[mFace, yA, zA], [mFace, yB, zB]], 'detail');
              pSvg += line(D, [[mFace, yA, zB], [mFace, yB, zA]], 'detail');
            }
          }
        }
        const bSideFace = sb > 0 ? mb1 + 0.2 : mb0 - 0.2;
        if (sees(D, 0, sb, 0)) {
          const cols = 3, rows = 3, cw = (mHi - mLo) / cols, rh = (mz1 - mz0 - 4) / rows;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const xA = mLo + c * cw, xB = xA + cw, xM = (xA + xB) / 2;
              const zA = mz0 + 2 + r * rh, zB = zA + rh, zM = (zA + zB) / 2;
              mosaicLights += poly(D, [[xM, bSideFace, zA], [xB, bSideFace, zM], [xM, bSideFace, zB], [xA, bSideFace, zM]], `win${winVar(sa + 9, r + sIdx * 3, c)}`);
              pSvg += line(D, [[xA, bSideFace, zA], [xB, bSideFace, zB]], 'detail');
              pSvg += line(D, [[xA, bSideFace, zB], [xB, bSideFace, zA]], 'detail');
            }
          }
        }
      }
      if (mosaicLights) pSvg += `<g class="fl" data-floor="${id}/2"><g class="lights">${mosaicLights}</g></g>`;

      sub.push({ id: `plat-${sIdx}`, a: pA0, b: b0, z: 100, la: pLa, lb: plb, h: 48, svg: pSvg });
    }

    add('platforms', 20, stB0, 100, w - 40, stW, 48, joinSorted(D, sub));
  }

  // ---- 5. Roof Level (z = 148..206): Twin C-shell barrel roof + central skylight steel arch trusses ----
  {
    const rA0 = 124, rA1 = 916, rLa = rA1 - rA0;
    let s = '';
    // structural steel roof columns along both platforms
    for (let a = rA0 + 36; a <= rA1 - 36; a += 110) {
      for (const bCol of [stB0 + 6, stB1 - 6]) {
        s += line(D, [[a, bCol, 148], [a, bCol, zr - 4]], 'mast');
      }
    }

    // Twin curved C-shell side roofs wrapping from the platform louvers up and over the platforms
    const skyHalf = 36;
    for (const sb of [-1, 1] as const) {
      const cPts: [number, number][] = [
        [midB + sb * (stW / 2 + 5.5), 148],
        [midB + sb * (stW / 2 + 12.5), 162],
        [midB + sb * (stW / 2 + 13.5), zr + 2],
        [midB + sb * (stW / 2 + 6), zr + 11],
        [midB + sb * (stW / 2 - 8), zr + 16.5],
        [midB + sb * skyHalf, zr + 19],
      ];
      for (let k = 0; k < cPts.length - 1; k++) {
        const [b0, z0] = cPts[k]!, [b1, z1] = cPts[k + 1]!;
        const cls = k < 2 ? 'face' : 'face top';
        if (k >= 2 || sees(D, 0, sb, 0.3)) {
          s += poly(D, [[rA0, b0, z0], [rA1, b0, z0], [rA1, b1, z1], [rA0, b1, z1]], cls);
          s += line(D, [[rA0, b1, z1], [rA1, b1, z1]], 'detail');
        }
      }
      // thick C-arch end rims + transverse roof ribs every 60 units (6 m)
      for (const aRim of [rA0, rA1]) {
        s += line(D, cPts.map(([b, z]): LV => [aRim, b, z]), 'canopy-line');
      }
      for (let aRib = rA0 + 60; aRib < rA1; aRib += 60) {
        s += line(D, cPts.slice(1).map(([b, z]): LV => [aRib, b, z]), 'detail');
      }
    }

    // Central arched glass skylight vault + exposed steel arch trusses over the tracks
    const skySegs = 6;
    const skyPt = (a: number, k: number): LV => {
      const b = -skyHalf + (2 * skyHalf * k) / skySegs;
      const z = zr + 19 + 5.5 * (1 - (b / skyHalf) ** 2);
      return [a, midB + b, z];
    };
    for (let k = 0; k < skySegs; k++) {
      s += poly(D, [skyPt(rA0 + 8, k), skyPt(rA1 - 8, k), skyPt(rA1 - 8, k + 1), skyPt(rA0 + 8, k + 1)], 'glass-panel');
      s += line(D, [skyPt(rA0, k + 1), skyPt(rA1, k + 1)], 'detail');
    }
    for (let aRib = rA0; aRib <= rA1; aRib += 60) {
      const arch = Array.from({ length: skySegs + 1 }, (_, k) => skyPt(aRib, k));
      s += line(D, arch, 'rail');
    }

    // under-roof night lamps along the platforms + exterior station name board on the visible long side
    for (const sb of [-1, 1] as const) {
      for (let a = rA0 + 80; a <= rA1 - 80; a += 120) {
        const pL = D.P(a, midB + sb * 66, zr - 2);
        s += `<g class="lamp" data-night="1"><circle class="halo" cx="${f(pL[0])}" cy="${f(pL[1])}" r="8" filter="url(#bloom)"/><circle class="bulb" cx="${f(pL[0])}" cy="${f(pL[1])}" r="1.6"/></g>`;
      }
    }
    const nearSb = D.L.visible('+b') ? 1 : -1;
    const bSign = midB + nearSb * (stW / 2 + 13.8);
    s += `<g class="lightbox" data-night="1">${poly(D, [[midB * 2 - 78, bSign, zr - 6], [midB * 2 + 78, bSign, zr - 6], [midB * 2 + 78, bSign, zr + 2], [midB * 2 - 78, bSign, zr + 2]], 'sign-board')}</g>`;

    add('roof', rA0, stB0, 148, rLa, stW, 58, s);
  }

  // ---- 6. 4 Overpass Footbridges (z = 54..88) & 4 Outer-Sidewalk Stair/Elevator Complexes ----
  const bridges: { key: string; aBr: number; sDir: 1 | -1; side: -1 | 1 }[] = [
    { key: 'nw', aBr: 290, sDir: -1, side: -1 },
    { key: 'ne', aBr: 750, sDir: 1, side: -1 },
    { key: 'sw', aBr: 290, sDir: -1, side: 1 },
    { key: 'se', aBr: 750, sDir: 1, side: 1 },
  ];

  for (const br of bridges) {
    const brB0 = br.side < 0 ? roadN0 : stB1;
    const brB1 = br.side < 0 ? stB0 : roadS1;
    add(`bridge-${br.key}`, br.aBr - 16, brB0, 54, 32, brB1 - brB0, 34, drawOverpassBridge(D, br.aBr, brB0, brB1, cz0));

    const accB0 = br.side < 0 ? 18 : roadS1 + 2;
    const accB1 = br.side < 0 ? roadN0 - 2 : d - 18;
    const accA0 = br.sDir < 0 ? br.aBr - 150 : br.aBr - 44;
    const accA1 = br.sDir < 0 ? br.aBr + 44 : br.aBr + 150;
    add(
      `access-${br.key}`,
      accA0, accB0, 0, accA1 - accA0, accB1 - accB0, 94,
      drawSidewalkAccess(D, br.aBr, br.sDir, br.side, accB0, accB1, cz0, `${id}/1`),
    );
  }

  // ---- 7. Street Furniture (trees & lamps on the outer sidewalks, clear of the stairs) ----
  const r = rng(20261022), rnd = () => r.next();
  const treeSpots = [56, 420, 620, 984];
  const lampSpots = [104, 520, 936];
  for (const [sTag, bTree, bLamp] of [['n', 46, roadN0 - 12], ['s', d - 46, roadS1 + 12]] as const) {
    for (const a of treeSpots) {
      const t = parkTree(D, a, bTree, 'medium', rnd);
      add(`tree-${sTag}-${a}`, a - t.ra, bTree - t.rb, 2.5, 2 * t.ra, 2 * t.rb, t.h, t.svg);
    }
    for (const a of lampSpots) {
      const zL = 34, p = D.P(a, bLamp, zL + 2);
      const s = D.box(a - 0.8, bLamp - 0.8, 2.5, 1.6, 1.6, zL - 2.5) +
        `<g class="lamp" data-night="1"><circle class="halo" cx="${f(p[0])}" cy="${f(p[1])}" r="9" filter="url(#bloom)"/><circle class="bulb" cx="${f(p[0])}" cy="${f(p[1])}" r="2.2"/></g>`;
      add(`lamp-${sTag}-${a}`, a - 2.5, bLamp - 2.5, 2.5, 5, 5, zL + 2, s);
    }
  }

  // ---- 8. Vehicles driving along the two asphalt carriageways (strictly in the road lanes, z = 0..24 < 54) ----
  const carsSpec: { id: string; kind: CarKind; a: number; b: number; dir: 1 | -1 }[] = [
    { id: 'car-n1', kind: 'sedan', a: 140, b: 126, dir: -1 },
    { id: 'car-n2', kind: 'taxi', a: 540, b: 196, dir: -1 },
    { id: 'car-n3', kind: 'hatch', a: 840, b: 132, dir: -1 },
    { id: 'car-s1', kind: 'sedan', a: 160, b: 392, dir: 1 },
    { id: 'car-s2', kind: 'van', a: 450, b: 326, dir: 1 },
    { id: 'car-s3', kind: 'taxi', a: 810, b: 388, dir: 1 },
  ];
  for (const c of carsSpec) {
    const Lc = CAR_LEN[c.kind];
    const Lcar: LocalFrame = {
      ...L,
      pt: (a, b, z) => L.pt(c.a + a, b, z),
      box: (a, b, z, la, lb, h) => L.box(c.a + a, b, z, la, lb, h),
    };
    const Dcar = new LocalDraw(K, Lcar);
    add(c.id, c.a, c.b - 9, 0, Lc, 18, 22, car(Dcar, c.kind, c.b, c.dir));
  }

  const bikesSpec: { id: string; a: number; b: number; dir: 1 | -1 }[] = [
    { id: 'bike-n1', a: 360, b: 142, dir: -1 },
    { id: 'bike-n2', a: 690, b: 182, dir: -1 },
    { id: 'bike-s1', a: 310, b: 374, dir: 1 },
    { id: 'bike-s2', a: 640, b: 342, dir: 1 },
  ];
  for (const bk of bikesSpec) {
    add(bk.id, bk.a, bk.b - 4, 0, 18, 8, 21, scooter(D, 'a', bk.a, bk.b, bk.dir, 0, true));
  }

  return { items, floors };
}

const STANDALONE_STYLE = `
  :root {
    --bg: #0c0d10;
    --panel: #12141a;
    --recess: #14171f;
    --glass: #181c26;
    --glass-on: #2a2419;
    --body: #1c202b;
    --wall: #252a38;
    --deck: #2f3546;
    --detail: #444c63;
    --line: #6b7594;
    --ink: #9aa4c2;
    --ink-hi: #d0d7ec;
    --accent: #f59e0b;
    --accent-hi: #fde68a;
  }
  svg { background: var(--bg); }
  .face { fill: var(--wall); stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  .face.top { fill: var(--deck); }
  .face.side { fill: var(--body); }
  .face.recess { fill: var(--recess); }
  .face.wall { fill: var(--wall); }
  .face.metal { fill: var(--deck); }
  .face.plant, .face.crown { fill: var(--deck); stroke: var(--ink); stroke-linejoin: round; }
  .face.trunk { fill: var(--body); }
  .detail, .paving { fill: none; stroke: var(--detail); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .rail, .pipe { fill: none; stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linecap: round; }
  .mast { fill: none; stroke: var(--line); stroke-width: 1.2; vector-effect: non-scaling-stroke; stroke-linecap: round; }
  .canopy-line { fill: none; stroke: var(--ink); stroke-width: 2.2; vector-effect: non-scaling-stroke; }
  .glass-panel { fill: var(--glass-on); fill-opacity: .22; stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .win { fill: var(--accent); stroke: var(--accent-hi); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .sign-board { fill: var(--accent); stroke: var(--accent-hi); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .road { fill: var(--recess); }
  .lane { fill: none; stroke: var(--detail); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-dasharray: 8 7; }
  .lane-solid { fill: none; stroke: var(--detail); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .wheel { fill: var(--recess); stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .car-glass { fill: var(--glass); stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .lamp .bulb { fill: var(--accent-hi); }
  .lamp .halo { fill: var(--accent); opacity: .28; }
`;

/** Render a complete standalone <svg> document of Ga đường sắt trên cao Thái Hà (Metro 2A). */
export function renderMetroStationSvg(k: ViewK = 0): string {
  const [w, d] = MS_SIZE;
  const K = kernel(0, 0);
  const L = localFrame(rotateSpec({ x: 0, y: 0, w, d, facing: 'S' }, k, w / 2, d / 2));
  const { items } = renderMetroStation(K, L, w, d);
  const c = composeScene(items, 0.06);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${c.viewBox}">\n<style>${STANDALONE_STYLE}</style>\n${c.svg}\n</svg>\n`;
}

