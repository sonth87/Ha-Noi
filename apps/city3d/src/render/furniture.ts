/* Street furniture in 3D (M5, ADR-037, ADR-047), from core's streetFurniture: poles with crossarms, lamp
   posts and lamps on poles (their heads light at night: lamp "street/lamps"), traffic signal posts
   (three lights per head, lamps "signal/<group>/<stop|wait|go>", lit by the view from the signal
   phase), pools of light on the ground under the lamps (shown at night in the dark theme), trees in
   two looks (full: flared root base, tapered trunk, forked 3D limbs and multi-lobed 3-tone shaded
   canopy in three habits with scalloped foliage contours and leaf ticks; simple: multi-pad crown,
   no lines), and the wires between poles as sagging strands. Built per 64 m cell so the view can
   drop far cells (view distance). Pure. */
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { hash, rng, type Furniture, type Prop, type Vec2 } from '@my-city/core';
import { V, Batch, type Surface } from './batch';
import { layerOf, type Layer } from './city';

export interface FurnitureCell {
  id: string;
  center: [number, number];
  /** power poles and the lamps hung on them (shown with the wires) */
  poles: Layer;
  /** lamp posts and signal posts (always shown) */
  fixtures: Layer;
  /** trees, in two looks */
  trees: Layer;
  simpleTrees: Layer;
  /** the wires, for a plain and a dashed (pulse) line material */
  wires: LineSegmentsGeometry;
  /** the pools of light under the lamps: one square on the ground per lamp, uv 0–1 across it */
  pools: THREE.BufferGeometry;
}

export interface FurnitureBucket {
  id: string;
  center: [number, number];
  props: Prop[];
  wires: { a: Prop; b: Prop; strands: number }[];
}

export const STREET_LAMPS = 'street/lamps';
export const signalLamp = (group: 'x' | 'y', light: 'stop' | 'wait' | 'go') => `signal/${group}/${light}`;

const POLE_H = 8.5;

export function furnitureBuckets(f: Furniture, size = 64): FurnitureBucket[] {
  const cellOf = (p: Vec2) => `${Math.floor(p[0] / size)},${Math.floor(p[1] / size)}`;
  const byId = new Map(f.props.map(p => [p.id, p]));
  const cells = new Map<string, FurnitureBucket>();
  const get = (p: Vec2) => {
    const k = cellOf(p);
    let c = cells.get(k);
    if (!c) {
      const [i, j] = k.split(',').map(Number) as [number, number];
      cells.set(k, (c = { id: k, center: [(i + 0.5) * size, (j + 0.5) * size], props: [], wires: [] }));
    }
    return c;
  };
  for (const p of f.props) get(p.at).props.push(p);
  for (const w of f.wires) {
    const a = byId.get(w.from), b = byId.get(w.to);
    if (a && b) get(a.at).wires.push({ a, b, strands: w.strands });
  }
  return [...cells.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function buildFurnitureCell(b: FurnitureBucket): FurnitureCell {
  const poles = new Batch(), fixtures = new Batch(), trees = new Batch(), simple = new Batch();
  const wires: number[] = [], pools: number[] = [];
  for (const p of b.props) {
    switch (p.kind) {
      case 'pole': pole(poles, p); break;
      case 'lamp': lampPost(fixtures, p, pools); break;
      case 'lamp-on-pole': lampHead(poles, p, p.z0 + 6.6, 1.3, pools); break;
      case 'signal': signal(fixtures, p); break;
      case 'tree': tree(trees, p, true); tree(simple, p, false); break;
      case 'park-lamp': parkLamp(fixtures, p, pools); break;
    }
  }
  for (const w of b.wires) wire(wires, w.a, w.b, w.strands);
  return {
    id: b.id,
    center: b.center,
    poles: layerOf(poles),
    fixtures: layerOf(fixtures),
    trees: layerOf(trees),
    simpleTrees: layerOf(simple, false),
    wires: new LineSegmentsGeometry().setPositions(wires.length ? wires : [0, 0, 0, 0, 0, 0]),
    pools: poolGeometry(pools),
  };
}

export function buildFurniture(f: Furniture, size = 64): FurnitureCell[] {
  return furnitureBuckets(f, size).map(buildFurnitureCell);
}

/** a box of half sizes (along heading, across, height) at a point, turned to the heading */
function box(B: Batch, at: Vec2, h: number, along: number, across: number, z0: number, z1: number, surf: 'wall' | 'metal' | 'plant' = 'wall') {
  const u: Vec2 = [Math.cos(h), Math.sin(h)], v: Vec2 = [-u[1], u[0]];
  const ring = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([x, y]): Vec2 => [at[0] + u[0] * x * along + v[0] * y * across, at[1] + u[1] * x * along + v[1] * y * across]);
  B.solid(ring, z0, z1, () => surf, surf === 'wall' ? 'roof' : surf);
}

const ahead = (p: Prop, d: number, side = 0): Vec2 => [p.at[0] + Math.cos(p.heading) * d - Math.sin(p.heading) * side, p.at[1] + Math.sin(p.heading) * d + Math.cos(p.heading) * side];

/** a concrete power pole with a crossarm across the street */
function pole(B: Batch, p: Prop) {
  box(B, p.at, p.heading, 0.12, 0.12, p.z0, p.z0 + POLE_H);
  box(B, ahead(p, 0.2), p.heading, 0.75, 0.06, p.z0 + POLE_H - 0.6, p.z0 + POLE_H - 0.48, 'metal');
}

/** a lamp post: a slim pole, an arm out over the road, the lamp head */
export function lampPost(B: Batch, p: Prop, pools: number[]) {
  box(B, p.at, p.heading, 0.08, 0.08, p.z0, p.z0 + 8);
  lampHead(B, p, p.z0 + 8, 1.6, pools);
}

/** an arm `reach` m long toward the road at height z, and a head: a cover on top, the lamp below
    it lit on every side and underneath, so it shows as a point of light from any view; returns
    the spot under it for the pool of light */
function lampHead(B: Batch, p: Prop, z: number, reach: number, pools?: number[]) {
  box(B, ahead(p, reach / 2), p.heading, reach / 2, 0.04, z - 0.08, z, 'metal');
  const c = ahead(p, reach);
  box(B, c, p.heading, 0.38, 0.17, z - 0.06, z + 0.04, 'metal');
  const u: Vec2 = [Math.cos(p.heading), Math.sin(p.heading)], v: Vec2 = [-u[1], u[0]], z0 = z - 0.26, z1 = z - 0.06, a = 0.3, b = 0.12;
  const pt = (x: number, y: number, zz: number) => V(c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, zz);
  const n3 = (x: number, y: number) => new THREE.Vector3(u[0] * x + v[0] * y, 0, u[1] * x + v[1] * y);
  B.window(STREET_LAMPS, [pt(-a, -b, z0), pt(a, -b, z0), pt(a, b, z0), pt(-a, b, z0)], new THREE.Vector3(0, -1, 0));
  for (const [x0, y0, x1, y1, nx, ny] of [[-a, -b, a, -b, 0, -1], [a, -b, a, b, 1, 0], [a, b, -a, b, 0, 1], [-a, b, -a, -b, -1, 0]] as const)
    B.window(STREET_LAMPS, [pt(x0, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y0, z1)], n3(nx, ny));
  pools?.push(c[0], c[1], z, 5.5);
}

/** a garden lamp: a slim 3 m post and a globe on top, lit on every side and on top; a small pool */
export function parkLamp(B: Batch, p: Prop, pools: number[]) {
  box(B, p.at, 0, 0.05, 0.05, p.z0, p.z0 + 3);
  const z0 = p.z0 + 3, z1 = z0 + 0.36, r = 0.18, pt = (x: number, y: number, z: number) => V(p.at[0] + x, p.at[1] + y, z);
  for (const [x0, y0, x1, y1, nx, ny] of [[-r, -r, r, -r, 0, -1], [r, -r, r, r, 1, 0], [r, r, -r, r, 0, 1], [-r, r, -r, -r, -1, 0]] as const)
    B.window(STREET_LAMPS, [pt(x0, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y0, z1)], new THREE.Vector3(nx, 0, ny));
  B.window(STREET_LAMPS, [pt(-r, -r, z1), pt(r, -r, z1), pt(r, r, z1), pt(-r, r, z1)], new THREE.Vector3(0, 1, 0));
  pools.push(p.at[0], p.at[1], p.z0, 3.5);
}

/** a signal post: a pole, a head facing the drivers, three lights stop / wait / go from the top */
function signal(B: Batch, p: Prop) {
  box(B, p.at, p.heading, 0.08, 0.08, p.z0, p.z0 + 3.4);
  const c = ahead(p, 0.1), z0 = p.z0 + 3.4, z1 = z0 + 1.05;
  box(B, c, p.heading, 0.12, 0.18, z0, z1, 'metal');
  const u: Vec2 = [Math.cos(p.heading), Math.sin(p.heading)], v: Vec2 = [-u[1], u[0]], n = new THREE.Vector3(u[0], 0, u[1]);
  const f: Vec2 = [c[0] + u[0] * 0.13, c[1] + u[1] * 0.13];
  (['stop', 'wait', 'go'] as const).forEach((light, k) => {
    const zc = z1 - 0.18 - k * 0.33, r = 0.11;
    const pt = (y: number, z: number) => V(f[0] + v[0] * y, f[1] + v[1] * y, z);
    B.window(signalLamp(p.group ?? 'x', light), [pt(-r, zc - r), pt(r, zc - r), pt(r, zc + r), pt(-r, r + zc)], n);
  });
}

/** push a triangle and its smooth outward normals to B.shell */
function pushShellTri(B: Batch, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, na: THREE.Vector3, nb: THREE.Vector3, nc: THREE.Vector3) {
  const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).dot(na) >= 0;
  const [p, q, r] = f ? [a, b, c] : [a, c, b], [np, nq, nr] = f ? [na, nb, nc] : [na, nc, nb];
  B.shell.pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
  B.shell.nrm.push(np.x, np.y, np.z, nq.x, nq.y, nq.z, nr.x, nr.y, nr.z);
}

/** a tapered 3D tube segment (for trunks, root flares and main limbs) with smooth silhouette shell */
function taperedTube(B: Batch, c0: [number, number, number], r0: number, c1: [number, number, number], r1: number, sides = 8, flare = 0, surf: Surface = 'wall') {
  const ring = (c: [number, number, number], r: number, fl: number) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i * 2 * Math.PI) / sides, k = fl ? 1 + fl * (i % 2 ? -0.16 : 0.20) : 1;
      const dx = Math.cos(a) * r * k, dy = Math.sin(a) * r * k;
      return { pt: V(c[0] + dx, c[1] + dy, c[2]), nrm: new THREE.Vector3(Math.cos(a), 0.12, Math.sin(a)).normalize() };
    });
  const A = ring(c0, r0, flare), C = ring(c1, r1, 0);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, a0 = A[i]!, a1 = A[j]!, b0 = C[i]!, b1 = C[j]!;
    const nrm = new THREE.Vector3().addVectors(a0.nrm, a1.nrm).normalize();
    B.quad(surf, [a0.pt, a1.pt, b1.pt, b0.pt], nrm);
    pushShellTri(B, a0.pt, a1.pt, b1.pt, a0.nrm, a1.nrm, b1.nrm);
    pushShellTri(B, a0.pt, b1.pt, b0.pt, a0.nrm, b1.nrm, b0.nrm);
  }
}

/** One smooth 3D foliage cushion/lobe with zero internal sketch lines:
    - 3-tone vertical shading: dark shaded underside ('road'), mid-tone side belt ('wall'), bright
      sunlit upper dome ('plant');
    - smooth convex ellipsoid normals in B.shell so overlapping lobes merge into a clean outer
      silhouette without pencil-like line clutter. */
function foliageLobe(
  B: Batch, cx: number, cy: number, cz: number, rx: number, ry: number, rzTop: number, rzBot: number, rot = 0,
) {
  const N = 14, ca = Math.cos(rot), sa = Math.sin(rot);
  const bands: { z: number; r: number; nz: number }[] = [
    { z: cz - rzBot * 0.72, r: 0.62, nz: -0.78 },
    { z: cz - rzBot * 0.16, r: 0.96, nz: -0.24 },
    { z: cz + rzTop * 0.22, r: 1.00, nz: 0.20 },
    { z: cz + rzTop * 0.62, r: 0.78, nz: 0.58 },
    { z: cz + rzTop * 0.88, r: 0.44, nz: 0.86 },
  ];
  const rings = bands.map(b =>
    Array.from({ length: N }, (_, i) => {
      const a = (i * 2 * Math.PI) / N;
      const lx = Math.cos(a) * rx * b.r, ly = Math.sin(a) * ry * b.r;
      const x = cx + lx * ca - ly * sa, y = cy + lx * sa + ly * ca;
      const nx = (Math.cos(a) * ca - Math.sin(a) * sa) / Math.max(0.3, rx);
      const ny = (Math.cos(a) * sa + Math.sin(a) * ca) / Math.max(0.3, ry);
      const nrm = new THREE.Vector3(nx, b.nz, ny).normalize();
      return { pt: V(x, y, b.z), nrm };
    }),
  );
  // underside cap ('road' = --recess, deep shade under the canopy)
  const botCenter = V(cx, cy, cz - rzBot), botNrm = new THREE.Vector3(0, -1, 0), R0 = rings[0]!;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    B.tri('road', botCenter, R0[j]!.pt, R0[i]!.pt, botNrm);
    pushShellTri(B, botCenter, R0[j]!.pt, R0[i]!.pt, botNrm, R0[j]!.nrm, R0[i]!.nrm);
  }
  // 4 elevation belts: underside ('road'), lower rim ('wall'), upper dome ('plant', 'plant')
  const beltSurf: [Surface, Surface, Surface, Surface] = ['road', 'wall', 'plant', 'plant'];
  for (let b = 0; b < 4; b++) {
    const A = rings[b]!, C = rings[b + 1]!, s = beltSurf[b]!;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, a0 = A[i]!, a1 = A[j]!, c0 = C[i]!, c1 = C[j]!;
      const nrm = new THREE.Vector3().addVectors(a0.nrm, c1.nrm).normalize();
      B.quad(s, [a0.pt, a1.pt, c1.pt, c0.pt], nrm);
      pushShellTri(B, a0.pt, a1.pt, c1.pt, a0.nrm, a1.nrm, c1.nrm);
      pushShellTri(B, a0.pt, c1.pt, c0.pt, a0.nrm, c1.nrm, c0.nrm);
    }
  }
  // top dome cap ('plant' = --panel, sunlit crown)
  const topCenter = V(cx, cy, cz + rzTop), topNrm = new THREE.Vector3(0, 1, 0), R4 = rings[4]!;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    B.tri('plant', topCenter, R4[i]!.pt, R4[j]!.pt, topNrm);
    pushShellTri(B, topCenter, R4[i]!.pt, R4[j]!.pt, topNrm, R4[i]!.nrm, R4[j]!.nrm);
  }
}

/** A street tree in one of three natural habits (seeded by id):
      0 — Rounded multi-lobed dome with deep shaded under-canopy & forked trunk (Image 1: sấu, nhội)
      1 — Wide spreading horizontal layered boughs with root buttresses & open fork bay (Image 2: bàng, xà cừ)
      2 — Asymmetric multi-cluster crown on staggered ascending limbs (bằng lăng, hoa sữa)
    `full = false` builds a multi-pad crown with zero lines for far views. */
export function tree(B: Batch, p: Prop, full: boolean) {
  const big = p.size === 'large', R = rng(hash(`tree:${p.id}`));
  const habit = hash(p.id) % 3;
  const rot = R.next() * Math.PI * 2;
  const scale = (big ? 1.18 : 0.88) * (0.92 + R.next() * 0.16);
  const cx = p.at[0], cy = p.at[1], z0 = p.z0;

  if (!full) {
    // simple tree for far views: trunk + 3 overlapping rounded pads (dark underside + bright top), no lines
    const r = (habit === 1 ? 2.3 : 1.9) * scale, zBase = z0 + 2.0 * scale, h = (habit === 1 ? 2.6 : 3.1) * scale;
    const disc = (ox: number, oy: number, rr: number): Vec2[] =>
      Array.from({ length: 10 }, (_, i) => [cx + ox + rr * Math.cos((i * Math.PI) / 5 + rot), cy + oy + rr * Math.sin((i * Math.PI) / 5 + rot)] as const);
    B.flatSolid(disc(0, 0, 0.18 * scale), z0, zBase + 0.3, 'wall');
    B.flatSolid(disc(0, 0, r * 0.96), zBase, zBase + h * 0.45, 'road');
    B.flatSolid(disc(Math.cos(rot) * r * 0.18, Math.sin(rot) * r * 0.18, r * 0.88), zBase + h * 0.35, zBase + h * 0.78, 'plant');
    B.flatSolid(disc(-Math.cos(rot) * r * 0.14, -Math.sin(rot) * r * 0.14, r * 0.62), zBase + h * 0.68, zBase + h, 'plant');
    return;
  }

  // clean curb tree-pit plate at the foot of the trunk (no vertical prism creases)
  const pitR = (habit === 1 ? 0.58 : 0.44) * scale;
  const ringAt = (rr: number, n = 8): Vec2[] => Array.from({ length: n }, (_, i) => [cx + rr * Math.cos((i * 2 * Math.PI) / n + rot), cy + rr * Math.sin((i * 2 * Math.PI) / n + rot)]);
  B.flat('roof', ringAt(pitR, 8), z0 + 0.02, 'detail');

  const trunkR = (habit === 1 ? 0.24 : 0.19) * scale;
  const leanX = Math.cos(rot) * (habit === 2 ? 0.18 : 0.07) * scale;
  const leanY = Math.sin(rot) * (habit === 2 ? 0.18 : 0.07) * scale;
  const zMid = z0 + 0.58 * scale, zFork = z0 + (habit === 1 ? 1.68 : habit === 0 ? 1.92 : 1.82) * scale;
  const forkPt: [number, number, number] = [cx + leanX, cy + leanY, zFork];

  // flared root base -> mid trunk -> fork (clean 3D tubes, no vertical bark lines)
  taperedTube(B, [cx, cy, z0 + 0.02], trunkR * 1.65, [cx + leanX * 0.35, cy + leanY * 0.35, zMid], trunkR, 8, 1);
  taperedTube(B, [cx + leanX * 0.35, cy + leanY * 0.35, zMid], trunkR, forkPt, trunkR * 0.80, 8, 0);

  // 3D root buttresses flaring out at the base for wide spreading trees
  const rootCount = habit === 1 ? 4 : 3;
  for (let i = 0; i < rootCount; i++) {
    const a = rot + (i * 2 * Math.PI) / rootCount + 0.3, rr = trunkR * (habit === 1 ? 2.1 : 1.7);
    taperedTube(B, [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z0 + 0.02], trunkR * 0.28, [cx + Math.cos(a) * trunkR * 0.55, cy + Math.sin(a) * trunkR * 0.55, z0 + 0.42 * scale], trunkR * 0.46, 5, 0);
  }

  /** grow a 3D main limb from the fork out to (lx, ly, lz), with a natural elbow and 3D sub-branch */
  const growLimb = (lx: number, ly: number, lz: number, rBase: number, subDir = 1) => {
    const mx = forkPt[0] + (lx - forkPt[0]) * 0.50, my = forkPt[1] + (ly - forkPt[1]) * 0.50, mz = forkPt[2] + (lz - forkPt[2]) * 0.42;
    taperedTube(B, forkPt, rBase, [mx, my, mz], rBase * 0.72, 6, 0);
    taperedTube(B, [mx, my, mz], rBase * 0.72, [lx, ly, lz], rBase * 0.46, 6, 0);
    // secondary 3D fork branch reaching into the adjacent canopy lobe
    const dx = lx - mx, dy = ly - my;
    const sx = mx + dx * 0.75 - dy * 0.42 * subDir, sy = my + dy * 0.75 + dx * 0.42 * subDir, sz = mz + (lz - mz) * 0.85;
    taperedTube(B, [mx, my, mz], rBase * 0.48, [sx, sy, sz], rBase * 0.26, 5, 0);
  };

  if (habit === 0) {
    // Habit 0 (Image 1): full rounded multi-lobed umbrella dome with 4 forked limbs in the shaded bay underneath
    const R0 = 2.08 * scale, limbZ = zFork + 0.88 * scale;
    const angles = [0, 1.25, 2.50, 3.78, 5.05].map(a => a + rot);
    for (const [i, a] of angles.entries()) {
      const reach = R0 * (i % 2 === 0 ? 0.56 : 0.48);
      const lx = forkPt[0] + Math.cos(a) * reach, ly = forkPt[1] + Math.sin(a) * reach, lz = limbZ + (i % 2) * 0.14 * scale;
      if (i < 4) growLimb(lx, ly, lz, trunkR * 0.48, i % 2 ? 1 : -1);
      foliageLobe(B, lx + Math.cos(a) * 0.18 * scale, ly + Math.sin(a) * 0.18 * scale, lz + 0.16 * scale, R0 * 0.56, R0 * 0.50, 0.66 * scale, 0.34 * scale, a);
    }
    // upper-middle billowy dome masses (twin/triple rounded puffs forming Image 1's silhouette)
    foliageLobe(B, forkPt[0] + Math.cos(rot + 0.35) * R0 * 0.26, forkPt[1] + Math.sin(rot + 0.35) * R0 * 0.26, limbZ + 0.68 * scale, R0 * 0.74, R0 * 0.66, 0.86 * scale, 0.34 * scale, rot + 0.35);
    foliageLobe(B, forkPt[0] - Math.cos(rot + 0.25) * R0 * 0.30, forkPt[1] - Math.sin(rot + 0.25) * R0 * 0.30, limbZ + 0.52 * scale, R0 * 0.64, R0 * 0.58, 0.72 * scale, 0.30 * scale, rot - 0.4);
    foliageLobe(B, forkPt[0] + Math.cos(rot + 2.1) * R0 * 0.22, forkPt[1] + Math.sin(rot + 2.1) * R0 * 0.22, limbZ + 0.58 * scale, R0 * 0.58, R0 * 0.54, 0.68 * scale, 0.28 * scale, rot + 2.1);
  } else if (habit === 1) {
    // Habit 1 (Image 2): wide spreading horizontal layered boughs (bàng / xà cừ) with open central fork vault
    const R0 = 2.50 * scale, limbZ = zFork + 0.74 * scale;
    const angles = [0, 1.22, 2.48, 3.74, 5.02].map(a => a + rot);
    for (const [i, a] of angles.entries()) {
      const reach = R0 * (0.60 + (i % 2) * 0.08);
      const lx = forkPt[0] + Math.cos(a) * reach, ly = forkPt[1] + Math.sin(a) * reach, lz = limbZ + (i % 3) * 0.14 * scale;
      growLimb(lx, ly, lz, trunkR * 0.48, i % 2 ? 1 : -1);
      // wide, flattened horizontal bough pad on each limb tip
      foliageLobe(B, lx + Math.cos(a) * 0.22 * scale, ly + Math.sin(a) * 0.22 * scale, lz + 0.08 * scale, R0 * 0.54, R0 * 0.44, 0.42 * scale, 0.24 * scale, a);
    }
    // middle spreading tier (3 broad horizontal cloud pads stepped inward and upward)
    for (let i = 0; i < 3; i++) {
      const a = rot + 0.55 + (i * 2 * Math.PI) / 3, d = R0 * 0.34;
      foliageLobe(B, forkPt[0] + Math.cos(a) * d, forkPt[1] + Math.sin(a) * d, limbZ + 0.54 * scale, R0 * 0.62, R0 * 0.52, 0.48 * scale, 0.24 * scale, a + 0.3);
    }
    // top horizontal crown pads
    foliageLobe(B, forkPt[0] + Math.cos(rot) * R0 * 0.12, forkPt[1] + Math.sin(rot) * R0 * 0.12, limbZ + 0.96 * scale, R0 * 0.58, R0 * 0.50, 0.48 * scale, 0.22 * scale, rot);
    foliageLobe(B, forkPt[0] - Math.cos(rot) * R0 * 0.18, forkPt[1] - Math.sin(rot) * R0 * 0.18, limbZ + 0.84 * scale, R0 * 0.46, R0 * 0.42, 0.42 * scale, 0.20 * scale, rot + 0.7);
  } else {
    // Habit 2: multi-cluster irregular crown on 4 staggered ascending limbs
    const R0 = 1.98 * scale;
    const branches: [number, number, number, number][] = [
      [0.0, 0.58, 0.70, 0.56],
      [1.62, 0.52, 0.94, 0.54],
      [3.22, 0.56, 0.80, 0.58],
      [4.75, 0.46, 1.12, 0.50],
    ];
    branches.forEach(([da, reachK, hK, rK], i) => {
      const a = rot + da, reach = R0 * reachK;
      const lx = forkPt[0] + Math.cos(a) * reach, ly = forkPt[1] + Math.sin(a) * reach, lz = zFork + hK * scale;
      growLimb(lx, ly, lz, trunkR * 0.46, i % 2 ? 1 : -1);
      foliageLobe(B, lx + Math.cos(a) * 0.16 * scale, ly + Math.sin(a) * 0.16 * scale, lz + 0.14 * scale, R0 * rK, R0 * (rK * 0.88), 0.58 * scale, 0.30 * scale, a);
    });
    foliageLobe(B, forkPt[0], forkPt[1], zFork + 1.44 * scale, R0 * 0.64, R0 * 0.56, 0.68 * scale, 0.28 * scale, rot + 0.8);
  }
}

/** sagging strands from pole to pole, spread along the crossarm */
function wire(out: number[], a: Prop, b: Prop, strands: number) {
  for (let k = 0; k < strands; k++) {
    const off = -0.6 + (1.2 * k) / Math.max(1, strands - 1), zTop = a.z0 + POLE_H - 0.55 - (k % 2) * 0.25;
    const pa = ahead(a, 0.2 + off), pb = ahead(b, 0.2 + off), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), sag = 0.35 + L * 0.012 + (k % 3) * 0.1;
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, q = V(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, zTop - sag * 4 * t * (1 - t));
      if (prev) out.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
      prev = q;
    }
  }
}

/** a pool of light under each lamp (x, y, z, radius per lamp), just above the ground it lights */
export function poolGeometry(spots: number[]): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < spots.length; i += 4) {
    const x = spots[i]!, y = spots[i + 1]!, z = 0.3, R = spots[i + 3]!;
    const c = [[-R, -R, 0, 0], [R, -R, 1, 0], [R, R, 1, 1], [-R, -R, 0, 0], [R, R, 1, 1], [-R, R, 0, 1]] as const;
    for (const [dx, dy, u, v] of c) { const q = V(x + dx, y + dy, z); pos.push(q.x, q.y, q.z); uv.push(u, v); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}
