/**
 * Các hàm hình học & cấu kiện kiến trúc dùng chung cho hệ thống dựng công trình biểu tượng 3D
 * theo từng quốc gia / thành phố (`apps/city3d/src/render/landmarks/<country>/<city>/`).
 */

import * as THREE from 'three';
import type { Vec2 } from '@my-city/core';
import { V, type Batch } from '@render/batch';

export interface OrientedBox {
  c: Vec2;
  u: Vec2;
  v: Vec2;
  hw: number;
  hd: number;
}

export function orientedBoxOf(ring: readonly Vec2[], frontIdx = 0): OrientedBox {
  const n = ring.length;
  let bestI = frontIdx >= 0 && frontIdx < n ? frontIdx : 0;
  let bestL = 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i]!, q = ring[(i + 1) % n]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L > bestL) {
      bestL = L;
      bestI = i;
    }
  }
  const p0 = ring[bestI]!, p1 = ring[(bestI + 1) % n]!;
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const u: Vec2 = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L];
  const v: Vec2 = [-u[1], u[0]];
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const [x, y] of ring) {
    const du = x * u[0] + y * u[1];
    const dv = x * v[0] + y * v[1];
    if (du < uMin) uMin = du;
    if (du > uMax) uMax = du;
    if (dv < vMin) vMin = dv;
    if (dv > vMax) vMax = dv;
  }
  const cu = (uMin + uMax) / 2, cv = (vMin + vMax) / 2;
  const c: Vec2 = [u[0] * cu + v[0] * cv, u[1] * cu + v[1] * cv];
  return {
    c,
    u,
    v,
    hw: Math.max(1.2, (uMax - uMin) / 2),
    hd: Math.max(1.2, (vMax - vMin) / 2),
  };
}

export function localPt(ob: OrientedBox, du: number, dv: number): Vec2 {
  return [
    ob.c[0] + ob.u[0] * du + ob.v[0] * dv,
    ob.c[1] + ob.u[1] * du + ob.v[1] * dv,
  ];
}

export function localRect(ob: OrientedBox, u0: number, u1: number, v0: number, v1: number): Vec2[] {
  return [
    localPt(ob, u0, v0),
    localPt(ob, u1, v0),
    localPt(ob, u1, v1),
    localPt(ob, u0, v1),
  ];
}

export function scaleRing(ring: readonly Vec2[], c: Vec2, s: number): Vec2[] {
  return ring.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s]);
}

export function regPoly(c: Vec2, r: number, n: number, rot = 0): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => [
    c[0] + r * Math.cos(rot + (i * 2 * Math.PI) / n),
    c[1] + r * Math.sin(rot + (i * 2 * Math.PI) / n),
  ]);
}

export function addBandWindows(B: Batch, ring: readonly Vec2[], z0: number, z1: number, lamp: string, step = 2.4) {
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!, L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 1.1) return;
    const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, nx = uy, ny = -ux, off = 0.08;
    const nrm = new THREE.Vector3(nx, 0, ny);
    const at = (t: number, z: number) => V(p[0] + ux * t + nx * off, p[1] + uy * t + ny * off, z);
    const cols = Math.max(1, Math.round(L / step)), pw = (L - 0.5) / cols;
    for (let k = 0; k < cols; k++) {
      const t0 = 0.25 + k * pw + 0.08, t1 = 0.25 + (k + 1) * pw - 0.08;
      if (t1 > t0 + 0.15) B.window(lamp, [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], nrm);
    }
  });
}

/**
 * Mái đao cong truyền thống Việt Nam (diềm mái ngói mũi hài đua rộng, bờ nóc, kìm nóc,
 * lưỡng long chầu nguyệt và 4 đầu đao cong vút ở 4 góc mái).
 */
export function drawTraditionalCurvedRoof(
  B: Batch,
  ob: OrientedBox,
  hw: number,
  hd: number,
  zBase: number,
  roofH: number,
  ownerId?: string,
  ornate = true,
) {
  const eaveW = hw + 1.15;
  const eaveD = hd + 1.15;
  B.solid(localRect(ob, -eaveW, eaveW, -eaveD, eaveD), zBase, zBase + roofH * 0.26, () => 'heritage-roof', 'heritage-roof', ownerId);
  B.solid(localRect(ob, -hw * 0.86, hw * 0.86, -hd * 0.82, hd * 0.82), zBase + roofH * 0.26, zBase + roofH * 0.58, () => 'heritage-roof', 'heritage-roof', ownerId);
  B.solid(localRect(ob, -hw * 0.66, hw * 0.66, -hd * 0.52, hd * 0.52), zBase + roofH * 0.58, zBase + roofH * 0.86, () => 'heritage-roof', 'heritage-roof', ownerId);
  const ridgeW = Math.max(0.8, hw * 0.54);
  const ridgeD = Math.min(0.42, hd * 0.24);
  B.solid(localRect(ob, -ridgeW, ridgeW, -ridgeD, ridgeD), zBase + roofH * 0.86, zBase + roofH + 0.28, () => 'bronze', 'bronze', ownerId);

  if (!ornate) return;
  for (const su of [-1, 1] as const) {
    B.solid(localRect(ob, su * (ridgeW - 0.22), su * (ridgeW + 0.18), -ridgeD * 1.1, ridgeD * 1.1), zBase + roofH + 0.28, zBase + roofH + 0.72, () => 'bronze', 'bronze', ownerId);
  }
  B.solid(regPoly(ob.c, Math.min(0.45, ridgeD * 1.25), 8), zBase + roofH + 0.28, zBase + roofH + 0.82, () => 'bronze', 'bronze', ownerId);

  for (const su of [-1, 1] as const) {
    for (const sv of [-1, 1] as const) {
      const pCorner = localPt(ob, su * eaveW, sv * eaveD);
      const pTip = localPt(ob, su * (eaveW + 0.85), sv * (eaveD + 0.85));
      const pMid = localPt(ob, su * (hw * 0.66), sv * (hd * 0.52));
      B.line(V(pMid[0], pMid[1], zBase + roofH * 0.84), V(pCorner[0], pCorner[1], zBase + roofH * 0.26), 'crease');
      B.line(V(pCorner[0], pCorner[1], zBase + roofH * 0.26), V(pTip[0], pTip[1], zBase + roofH * 0.62), 'crease');
      B.solid(regPoly(pTip, 0.24, 6), zBase + roofH * 0.22, zBase + roofH * 0.65, () => 'bronze', 'bronze', ownerId);
    }
  }
}

const EAST_CITY_DIR: Vec2 = [Math.cos((62.5 * Math.PI) / 180), Math.sin((62.5 * Math.PI) / 180)];

export function orientBoxTowardEast(ob: OrientedBox): OrientedBox {
  const dot = -ob.v[0] * EAST_CITY_DIR[0] + -ob.v[1] * EAST_CITY_DIR[1];
  if (dot >= 0) return ob;
  return {
    ...ob,
    u: [-ob.u[0], -ob.u[1]],
    v: [-ob.v[0], -ob.v[1]],
  };
}
