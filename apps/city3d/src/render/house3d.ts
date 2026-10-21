/* A generated house in 3D (M4, docs/architecture/house-spec.md), on its real footprint, the facade
   on the footprint's front edge. Two detail levels here (L0–L1 are plain massing, buildings.ts):
     L2  the house: ground floor (shop opening and its shutter, semi-basement garage and steps),
         awning, facade sign, windows of every kind, balconies of every kind, upper floors jutting
         out (overhang), flat roof with parapet, roof room, stair hut, metal roof shelter, pitched roofs;
     L3  everything small: projecting signs, standee, barber pole, billboard, side panels, window
         canopies, AC units (facade and exposed side wall), balcony pots and plants, laundry, roof
         items (tanks, solar heater, antenna, AC, flag).
   Local frame: a along the facade (0 → w, from the front edge's first vertex), s outward toward
   the street (negative = into the house), z up. Windows light by floor: ground = <id>/1, upper
   floor k (0-based) = <id>/(k + 2), the roof room = <id>/(storeys + 1). Pure. */
import * as THREE from 'three';
import { edgeNormal, floorId, type Building, type FloorSpec, type HouseSpec, type Vec2 } from '@my-city/core';
import { V, type Batch, type Surface } from './batch';

/** what may stand on the sidewalk or stick out of the facade (house-spec: REACH) */
const REACH = 1.9;

export interface HouseCtx {
  /** height of the neighbour standing against the given end wall (−1 = the a = 0 end, +1 = a = w) */
  neighbourAt: (end: -1 | 1) => number;
  /** height of whatever other building stands at a point (0 = open) */
  heightAt?: (p: Vec2) => number;
}

export function buildHouse(B: Batch, b: Building, spec: HouseSpec, level: 2 | 3, ctx: HouseCtx) {
  const R = b.footprint, n = R.length, f = b.front;
  const p0 = R[f]!, p1 = R[(f + 1) % n]!, nrm = edgeNormal(R, f);
  const w = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / w, uy = (p1[1] - p0[1]) / w;
  const P = (a: number, s: number, z: number) => V(p0[0] + ux * a + nrm[0] * s, p0[1] + uy * a + nrm[1] * s, z);
  const out = new THREE.Vector3(nrm[0], 0, nrm[1]), side = new THREE.Vector3(ux, 0, uy), up = new THREE.Vector3(0, 1, 0);
  const at2 = (a: number, s: number): Vec2 => [p0[0] + ux * a + nrm[0] * s, p0[1] + uy * a + nrm[1] * s];
  /** a box in the local frame */
  const box = (a0: number, a1: number, s0: number, s1: number, z0: number, z1: number, surf: Surface = 'wall', top: Surface = surf) =>
    B.solid([at2(a0, s0), at2(a1, s0), at2(a1, s1), at2(a0, s1)], z0, z1, () => surf, top, b.id);
  /** a lit rectangle on a plane facing the street at s */
  const win = (lamp: string, a0: number, a1: number, z0: number, z1: number, s: number) => B.window(lamp, [P(a0, s, z0), P(a1, s, z0), P(a1, s, z1), P(a0, s, z1)], out);
  const line = (a0: number, s0: number, z0: number, a1: number, s1: number, z1: number) => B.line(P(a0, s0, z0), P(a1, s1, z1));
  const panel = (surf: Surface, pts: [number, number, number][], n3: THREE.Vector3) => B.panel(surf, pts.map(([a, s, z]) => P(a, s, z)), n3);

  const zG = spec.basement + spec.groundH, top = zG + spec.floors * spec.floorH, oh = spec.overhang, d = spec.d;
  const levels = 1 + spec.floors, L1 = floorId(b, 1);

  // ---------- massing: ground floor on the footprint, upper floors jutting out over the sidewalk ----------
  B.solid(R, 0, zG, () => 'wall', 'roof', b.id);
  if (spec.floors > 0) {
    const upper = R.map((p, i): Vec2 => (i === f || i === (f + 1) % n ? [p[0] + nrm[0] * oh, p[1] + nrm[1] * oh] : p));
    B.solid(upper, zG, top, () => 'wall', 'roof', b.id);
  }

  // ---------- the other walls: a small window per storey wherever the wall is open ----------
  const storeys = [spec.basement + spec.groundH, ...spec.upper.map(() => spec.floorH)];
  R.forEach((p, i) => {
    if (i === f) return;
    const q = R[(i + 1) % n]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 2) return;
    const en = edgeNormal(R, i), e3 = new THREE.Vector3(en[0], 0, en[1]), tx = (q[0] - p[0]) / L, ty = (q[1] - p[1]) / L;
    const blocked = ctx.heightAt?.([(p[0] + q[0]) / 2 + en[0] * 0.6, (p[1] + q[1]) / 2 + en[1] * 0.6]) ?? 0;
    const ww = Math.min(1, L * 0.3), m = L / 2, Q = (t: number, z: number) => V(p[0] + tx * t + en[0] * 0.06, p[1] + ty * t + en[1] * 0.06, z);
    let z = 0;
    storeys.forEach((h, k) => {
      if (z + h > blocked + 0.5) B.window(floorId(b, k + 1), [Q(m - ww / 2, z + h * 0.35), Q(m + ww / 2, z + h * 0.35), Q(m + ww / 2, z + h * 0.75), Q(m - ww / 2, z + h * 0.75)], e3);
      z += h;
    });
  });

  // ---------- ground floor ----------
  const panels = spec.signs.some(x => x.type === 'side-panels');
  const ow = w * (panels ? 0.6 : 0.84), oa = (w - ow) / 2, oz0 = spec.basement + 0.1, oz1 = zG - 0.55;
  if (spec.ground === 'wall') {
    // a closed wall with a small door and a window
    win(L1, w * 0.12, w * 0.12 + 1, spec.basement + 0.05, spec.basement + 2.2, 0.05);
    win(L1, w * 0.45, w * 0.8, spec.basement + 1, spec.basement + 2.2, 0.05);
  } else {
    win(L1, oa, oa + ow, oz0, oz1, 0.05);
    const closed = !spec.shop && (spec.ground === 'fold' || spec.ground === 'roll' || spec.ground === 'iron');
    if (closed) {
      // the shutter pulled across the opening hides the light behind it
      panel('metal', [[oa, 0.1, oz0], [oa + ow, 0.1, oz0], [oa + ow, 0.1, oz1], [oa, 0.1, oz1]], out);
      const step = spec.ground === 'roll' ? 0.22 : 0.3;
      if (spec.ground === 'roll') for (let z = oz0 + step; z < oz1; z += step) line(oa, 0.11, z, oa + ow, 0.11, z);
      else for (let a = oa + step; a < oa + ow; a += step) line(a, 0.11, oz0, a, 0.11, oz1);
    } else if (spec.ground === 'roll') box(oa, oa + ow, 0, 0.3, oz1 - 0.05, oz1 + 0.25, 'metal');   // rolled up in its box
    else if (spec.ground === 'fold' || spec.ground === 'iron') { box(oa, oa + 0.18, 0, 0.12, oz0, oz1, 'metal'); box(oa + ow - 0.18, oa + ow, 0, 0.12, oz0, oz1, 'metal'); }
    else if (spec.ground === 'glass') for (let k = 1; k < Math.round(ow / 1.3); k++) line(oa + (k * ow) / Math.round(ow / 1.3), 0.06, oz0, oa + (k * ow) / Math.round(ow / 1.3), 0.06, oz1);
    else if (spec.ground === 'wood') for (let k = 1; k < 4; k++) line(oa + (k * ow) / 4, 0.06, oz0, oa + (k * ow) / 4, 0.06, oz1);
  }
  if (spec.basement > 0) {
    // garage door under the raised floor, three steps up beside it
    panel('metal', [[w * 0.1, 0.04, 0], [w * 0.62, 0.04, 0], [w * 0.62, 0.04, spec.basement - 0.05], [w * 0.1, 0.04, spec.basement - 0.05]], out);
    for (let k = 0; k < 3; k++) box(w * 0.68, w * 0.68 + 1.2, 0, 0.9 - k * 0.3, 0, ((k + 1) * spec.basement) / 3);
  }

  // ---------- awning and facade sign ----------
  if (spec.awning !== 'none') {
    const z0 = zG - 0.35, z1 = zG - 1.0, s1 = Math.min(1.4, REACH);
    panel('awning', [[oa - 0.2, 0, z0], [oa + ow + 0.2, 0, z0], [oa + ow + 0.2, s1, z1], [oa - 0.2, s1, z1]], up);
    if (spec.awning === 'fabric') panel('awning', [[oa - 0.2, s1, z1], [oa + ow + 0.2, s1, z1], [oa + ow + 0.2, s1, z1 - 0.25], [oa - 0.2, s1, z1 - 0.25]], out);
  }
  if (spec.signs.some(x => x.type === 'facade')) {
    // under the overhang's edge when there is one, else flat on the wall above the opening
    const s0 = oh > 0 ? oh - 0.2 : 0, z1 = oh > 0 ? zG - 0.05 : zG - 0.05, z0 = z1 - 0.5;
    box(w * 0.06, w * 0.94, s0, s0 + 0.18, z0, z1, 'metal');
    win(L1, w * 0.08, w * 0.92, z0 + 0.06, z1 - 0.06, s0 + 0.19);
  }

  // ---------- upper floors ----------
  const bays = spec.bays || Math.max(1, Math.round(w / 4)), bw = w / bays;
  spec.upper.forEach((fl, k) => {
    const z = zG + k * spec.floorH, h = spec.floorH, lamp = floorId(b, k + 2), s = oh + 0.05;
    for (let i = 0; i < bays; i++) windowOf(fl, i * bw, bw, z, h, lamp, s);
    if (fl.balcony !== 'none') balcony(fl, z, h, k);
    else if (level === 3 && fl.ac) for (let i = 0; i < bays; i++) box(i * bw + bw * 0.62, i * bw + bw * 0.62 + 0.8, oh, oh + 0.35, z + 0.15, z + 0.7, 'metal');
  });

  function windowOf(fl: FloorSpec, a: number, bw: number, z: number, h: number, lamp: string, s: number) {
    const c = a + bw / 2, W = (fr: number) => [c - (bw * fr) / 2, c + (bw * fr) / 2] as const;
    switch (fl.window) {
      case 'pair': for (const o of [-0.17, 0.17]) win(lamp, c + o * bw - bw * 0.11, c + o * bw + bw * 0.11, z + h * 0.3, z + h * 0.75, s); break;
      case 'wide': { const [a0, a1] = W(0.7); win(lamp, a0, a1, z + h * 0.35, z + h * 0.75, s); line(c - bw * 0.12, s + 0.01, z + h * 0.35, c - bw * 0.12, s + 0.01, z + h * 0.75); line(c + bw * 0.12, s + 0.01, z + h * 0.35, c + bw * 0.12, s + 0.01, z + h * 0.75); break; }
      case 'glass-doors': { const [a0, a1] = W(0.6); win(lamp, a0, a1, z + 0.05, z + h * 0.85, s); line(c, s + 0.01, z + 0.05, c, s + 0.01, z + h * 0.85); break; }
      case 'glass': { const [a0, a1] = W(0.86); win(lamp, a0, a1, z + h * 0.08, z + h * 0.92, s); break; }
      case 'french': {
        const [a0, a1] = W(0.36);
        win(lamp, a0, a1, z + h * 0.1, z + h * 0.85, s); line(c, s + 0.01, z + h * 0.1, c, s + 0.01, z + h * 0.85);
        // the shutters, open against the wall
        for (const [b0, b1] of [[a0 - bw * 0.18, a0], [a1, a1 + bw * 0.18]] as const) panel('metal', [[b0, s + 0.02, z + h * 0.1], [b1, s + 0.02, z + h * 0.1], [b1, s + 0.02, z + h * 0.85], [b0, s + 0.02, z + h * 0.85]], out);
        break;
      }
      case 'arch': {
        const [a0, a1] = W(0.4), zt = z + h * 0.72;
        win(lamp, a0, a1, z + h * 0.15, zt, s);
        // the round head as a fan of lines
        const r = (a1 - a0) / 2;
        for (let t = 0; t < 8; t++) { const q0 = (Math.PI * t) / 8, q1 = (Math.PI * (t + 1)) / 8; line(c - Math.cos(q0) * r, s + 0.01, zt + Math.sin(q0) * r, c - Math.cos(q1) * r, s + 0.01, zt + Math.sin(q1) * r); }
        break;
      }
      case 'louver': {
        const [a0, a1] = W(0.42);
        win(lamp, a0, a1, z + h * 0.18, z + h * 0.82, s);
        for (let t = z + h * 0.24; t < z + h * 0.8; t += 0.12) line(a0, s + 0.01, t, a1, s + 0.01, t);
        break;
      }
      default: { const [a0, a1] = W(0.42); win(lamp, a0, a1, z + h * 0.18, z + h * 0.82, s); line(c, s + 0.01, z + h * 0.18, c, s + 0.01, z + h * 0.82); }
    }
    if (level === 3 && fl.canopy !== 'none' && fl.balcony !== 'cage') {
      const [a0, a1] = [c - bw * 0.3, c + bw * 0.3], zc = z + h * 0.88;
      if (fl.canopy === 'concrete') box(a0, a1, oh, oh + 0.5, zc, zc + 0.08, 'wall');
      else panel('metal', [[a0, oh, zc + 0.2], [a1, oh, zc + 0.2], [a1, oh + 0.55, zc - 0.1], [a0, oh + 0.55, zc - 0.1]], up);
    }
  }

  function balcony(fl: FloorSpec, z: number, h: number, k: number) {
    const depth = Math.min(1, REACH - oh), s0 = oh, s1 = oh + depth;
    const spans: [number, number][] = fl.balconyWidth === 'short'
      ? Array.from({ length: bays }, (_, i) => [i * bw + bw * 0.18, (i + 1) * bw - bw * 0.18])
      : [[0.08, w - 0.08]];
    for (const [a0, a1] of spans) {
      box(a0, a1, s0, s1, z, z + 0.12);   // slab
      const zr = z + 1.05;
      switch (fl.balcony) {
        case 'solid':
          box(a0, a1, s1 - 0.12, s1, z + 0.12, zr);
          box(a0, a0 + 0.12, s0, s1 - 0.12, z + 0.12, zr); box(a1 - 0.12, a1, s0, s1 - 0.12, z + 0.12, zr);
          break;
        case 'glass':
          panel('glass', [[a0, s1 - 0.05, z + 0.12], [a1, s1 - 0.05, z + 0.12], [a1, s1 - 0.05, zr], [a0, s1 - 0.05, zr]], out);
          for (const a of [a0 + 0.03, a1 - 0.03]) panel('glass', [[a, s0, z + 0.12], [a, s1 - 0.05, z + 0.12], [a, s1 - 0.05, zr], [a, s0, zr]], side);
          box(a0, a1, s1 - 0.08, s1, zr, zr + 0.05, 'metal');
          break;
        case 'cage': {
          // the tiger cage: a frame up to the floor above, bars, a cap
          const zt = z + h - 0.05;
          box(a0, a1, s0, s1 + 0.05, zt - 0.08, zt, 'metal');
          for (let a = a0; a <= a1 + 1e-6; a += Math.max(0.25, (a1 - a0) / Math.round((a1 - a0) / 0.25))) line(a, s1, z + 0.12, a, s1, zt - 0.08);
          for (const zz of [z + 0.12 + (zt - z) / 3, z + 0.12 + (2 * (zt - z)) / 3]) line(a0, s1, zz, a1, s1, zz);
          for (const a of [a0, a1]) for (let s = s0; s <= s1; s += depth / 3) line(a, s, z + 0.12, a, s, zt - 0.08);
          break;
        }
        default: {
          // rail: a handrail on posts, thin bars between
          box(a0, a1, s1 - 0.05, s1, zr - 0.05, zr, 'metal');
          for (const a of [a0, a1]) box(a - 0.025, a + 0.025, s0, s1, zr - 0.05, zr, 'metal');
          for (let a = a0; a <= a1 + 1e-6; a += Math.max(0.15, (a1 - a0) / Math.round((a1 - a0) / 0.15))) line(a, s1 - 0.025, z + 0.12, a, s1 - 0.025, zr - 0.05);
        }
      }
      if (level === 3) {
        // pots along the front, plants a little taller than the rail
        const pots = fl.plants;
        for (let i = 0; i < pots; i++) {
          const a = a0 + ((i + 1) * (a1 - a0)) / (pots + 1), hgt = 0.6 + ((k + i) % 3) * 0.25;
          box(a - 0.15, a + 0.15, s1 - 0.4, s1 - 0.12, z + 0.12, z + 0.42, 'metal');
          B.solid(octagon(at2(a, s1 - 0.26), 0.28), z + 0.42, z + 0.42 + hgt, () => 'plant', 'plant');
        }
        if (fl.laundry) {
          const zl = z + 1.75;
          line(a0 + 0.2, s0 + depth / 2, zl, a1 - 0.2, s0 + depth / 2, zl);
          for (let i = 0; i < 3; i++) { const a = a0 + 0.4 + i * ((a1 - a0 - 0.8) / 3); panel('awning', [[a, s0 + depth / 2, zl], [a + 0.45, s0 + depth / 2, zl], [a + 0.45, s0 + depth / 2, zl - 0.6], [a, s0 + depth / 2, zl - 0.6]], out); }
        }
      }
    }
  }

  // ---------- roof ----------
  const back = -d;   // the back of the house, in s
  if (spec.roof === 'flat') {
    // parapet: a thin wall along every edge of the roof
    const upper = R.map((p, i): Vec2 => (spec.floors > 0 && (i === f || i === (f + 1) % n) ? [p[0] + nrm[0] * oh, p[1] + nrm[1] * oh] : p));
    upper.forEach((p, i) => {
      const q = upper[(i + 1) % upper.length]!, en = edgeNormal(upper, i), t = 0.15;
      B.solid([p, q, [q[0] - en[0] * t, q[1] - en[1] * t], [p[0] - en[0] * t, p[1] - en[1] * t]], top, top + spec.parapet, () => 'wall', 'roof');
    });
    let base = top;
    if (spec.topRoom) {
      const s0 = -spec.topSetback, s1 = Math.max(back + 0.6, s0 - Math.max(3, d * 0.5));
      box(0.3, w - 0.3, s1, s0, top, top + spec.floorH);
      win(floorId(b, levels + 1), w * 0.3, w * 0.7, top + 0.1, top + spec.floorH * 0.8, s0 + 0.05);
      base = top + spec.floorH;
    } else if (spec.stairHut) box(w - 1.8, w - 0.3, back + 0.3, back + 2.5, top, top + 2.4);
    if (spec.roofShelter !== 'none') {
      // a metal gable on thin posts, ridge running back from the street, open gables
      const terrace = spec.roofShelter === 'terrace', s0 = oh, s1 = terrace ? -spec.topSetback : back + 1.5;
      const eave = terrace ? top + spec.floorH + 0.1 : top + 2.4, ridge = eave + w * 0.3;
      panel('metal', [[-0.1, s0, eave], [w / 2, s0, ridge], [w / 2, s1, ridge], [-0.1, s1, eave]], up);
      panel('metal', [[w + 0.1, s0, eave], [w / 2, s0, ridge], [w / 2, s1, ridge], [w + 0.1, s1, eave]], up);
      for (const s of [s0, s1]) { line(0.1, s, eave, w - 0.1, s, eave); line(w / 2, s, eave, w / 2, s, ridge); }
      for (const [a, s] of [[0.1, s0], [w - 0.1, s0], [0.1, s1], [w - 0.1, s1]] as const) box(a - 0.04, a + 0.04, s - 0.04, s + 0.04, top + spec.parapet, eave, 'metal');
    }
    if (level === 3) roofItems(base, spec.topRoom ? -spec.topSetback - 0.3 : oh - 0.3, spec.topRoom ? Math.max(back + 0.6, -spec.topSetback - Math.max(3, d * 0.5)) + 0.3 : back + 0.4);
  } else {
    // pitched: a gable with its triangle to the street (metal2, tile), or one slope falling to the street (metal1)
    const s0 = oh + 0.3, s1 = back - 0.3, rise = spec.roof === 'metal1' ? 1.2 : Math.max(1.2, w * 0.3), surf: Surface = spec.roof === 'tile' ? 'roof' : 'metal';
    if (spec.roof === 'metal1') {
      panel(surf, [[-0.2, s0, top + 0.2], [w + 0.2, s0, top + 0.2], [w + 0.2, s1, top + rise], [-0.2, s1, top + rise]], up);
    } else {
      panel(surf, [[-0.2, s0, top], [w / 2, s0, top + rise], [w / 2, s1, top + rise], [-0.2, s1, top]], up);
      panel(surf, [[w + 0.2, s0, top], [w / 2, s0, top + rise], [w / 2, s1, top + rise], [w + 0.2, s1, top]], up);
      for (const s of [s0 - 0.25, s1 + 0.25]) B.panel('wall', [P(0, s, top), P(w, s, top), P(w / 2, s, top + rise - 0.1), P(w / 2, s, top + rise - 0.1)], out);
      if (level === 3 && spec.roofItems.includes('antenna')) antenna(w * 0.7, back * 0.6, top + rise * 0.6);
    }
  }

  // ---------- L3: the exposed end wall, the shop's things on the sidewalk ----------
  if (level === 3) {
    const end: -1 | 1 = spec.sideEnd === '+a' ? 1 : -1, clear = Math.max(zG + 0.3, ctx.neighbourAt(end) + 0.3);
    const aw = end > 0 ? w : 0;
    for (let i = 0; i < spec.sideAC; i++) {
      const zz = clear + i * spec.floorH, ss = -2 - i * 2.5;
      if (zz + 0.6 > top || ss < back + 1) break;
      const a0 = end > 0 ? aw : aw - 0.35;
      box(a0, a0 + 0.35, ss - 0.8, ss, zz, zz + 0.6, 'metal');
    }
    for (const sg of spec.signs) {
      if (sg.type === 'projecting-vertical' && spec.floors > 0) {
        const a = w - 0.25, zt = zG + Math.min(2, spec.floors) * spec.floorH - 0.3, s1 = Math.min(oh + 0.8, REACH);
        box(a - 0.08, a + 0.08, oh + 0.1, s1, zG + 0.3, zt, 'metal');
        for (const sd of [-1, 1]) B.window(L1, [P(a + sd * 0.09, oh + 0.15, zG + 0.4), P(a + sd * 0.09, s1 - 0.05, zG + 0.4), P(a + sd * 0.09, s1 - 0.05, zt - 0.1), P(a + sd * 0.09, oh + 0.15, zt - 0.1)], side.clone().multiplyScalar(sd));
      } else if (sg.type === 'projecting-round') {
        const a = w - 0.45, zc = spec.awning !== 'none' ? zG - 0.1 : zG - 0.9;
        box(a - 0.05, a + 0.05, 0.2, 0.8, zc - 0.3, zc + 0.3, 'metal');
        for (const sd of [-1, 1]) B.window(L1, [P(a + sd * 0.06, 0.25, zc - 0.25), P(a + sd * 0.06, 0.75, zc - 0.25), P(a + sd * 0.06, 0.75, zc + 0.25), P(a + sd * 0.06, 0.25, zc + 0.25)], side.clone().multiplyScalar(sd));
      } else if (sg.type === 'standee') {
        const a = w * 0.2;
        box(a, a + 0.55, 1.2, 1.5, 0, 1.0, 'metal');
        win(L1, a + 0.05, a + 0.5, 0.15, 0.9, 1.51);
      } else if (sg.type === 'barber-pole') {
        box(0.15, 0.3, 0, 0.15, spec.basement + 1, spec.basement + 2.2, 'metal');
        for (let t = 0; t < 4; t++) line(0.15, 0.16, spec.basement + 1 + t * 0.3, 0.3, 0.16, spec.basement + 1.3 + t * 0.3);
      } else if (sg.type === 'billboard' && spec.floors >= 2) {
        const a0 = end > 0 ? w + 0.05 : -0.05, z1 = top - 0.4, z0 = Math.max(z1 - 3, clear);
        if (z1 - z0 > 1.2) B.window(floorId(b, levels), [P(a0, -1, z0), P(a0, -Math.min(d - 1, 7), z0), P(a0, -Math.min(d - 1, 7), z1), P(a0, -1, z1)], side.clone().multiplyScalar(end));
      } else if (sg.type === 'side-panels') {
        for (const [a0, a1] of [[0.1, oa - 0.1], [oa + ow + 0.1, w - 0.1]] as const) {
          box(a0, a1, 0, 0.12, spec.basement + 0.3, zG - 0.6, 'metal');
          win(L1, a0 + 0.04, a1 - 0.04, spec.basement + 0.4, zG - 0.7, 0.13);
        }
      }
    }
  }

  /** roof items in a row across the back of the free roof, between s0 (front) and s1 (back) */
  function roofItems(z: number, s0: number, s1: number) {
    const low = spec.roofShelter === 'full';
    let a = 0.5;
    const sb = s1 + 0.1;   // along the back edge of the free roof
    if (s0 - sb < 1.5) return;
    for (const it of spec.roofItems) {
      if (low && it !== 'tank-h' && it !== 'ac') continue;
      if (a > w - 0.6) break;
      switch (it) {
        case 'tank-h': if (a + 1.5 > w - 0.3) break; box(a, a + 1.5, sb, sb + 0.8, z + 0.3, z + 1.1, 'metal'); box(a + 0.2, a + 1.3, sb + 0.1, sb + 0.7, z, z + 0.3, 'metal'); a += 1.8; break;
        case 'tank-v': B.solid(octagon(at2(a + 0.45, sb + 0.45), 0.45), z + 0.3, z + 1.5, () => 'metal', 'metal'); box(a + 0.15, a + 0.75, sb + 0.15, sb + 0.75, z, z + 0.3, 'metal'); a += 1.1; break;
        case 'solar': {
          if (a + 1.2 > w - 0.3) break;
          panel('glass', [[a, sb + 1.4, z + 0.3], [a + 1.2, sb + 1.4, z + 0.3], [a + 1.2, sb, z + 1.2], [a, sb, z + 1.2]], up);
          box(a, a + 1.2, sb - 0.35, sb, z + 1.1, z + 1.45, 'metal');
          a += 1.5; break;
        }
        case 'antenna': antenna(a + 0.2, sb + 0.4, z); a += 0.7; break;
        case 'ac': box(a, a + 0.8, sb, sb + 0.35, z, z + 0.6, 'metal'); a += 1.1; break;
        case 'flag': {
          line(a + 0.1, sb + 0.2, z, a + 0.1, sb + 0.2, z + 3);
          panel('awning', [[a + 0.1, sb + 0.2, z + 3], [a + 0.1, sb + 0.2, z + 2.4], [a + 1.0, sb + 0.2, z + 2.4], [a + 1.0, sb + 0.2, z + 3]], out);
          a += 1.2; break;
        }
      }
    }
  }

  function antenna(a: number, s: number, z: number) {
    line(a, s, z, a, s, z + 3.2);
    for (let t = 0; t < 3; t++) { const zz = z + 2 + t * 0.4, hw = 0.5 - t * 0.12; line(a - hw, s, zz, a + hw, s, zz); }
  }
}

/** a small octagonal prism ring (pots, tanks, plant crowns) */
function octagon(c: Vec2, r: number): Vec2[] {
  return Array.from({ length: 8 }, (_, i) => [c[0] + r * Math.cos((i * Math.PI) / 4), c[1] + r * Math.sin((i * Math.PI) / 4)] as const);
}
