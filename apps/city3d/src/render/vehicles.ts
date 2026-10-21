/* Vehicles in 3D (M5, ADR-037/038), after the iso-glow intersection figure and the old SVG app's cars
   and scooters (approved there). One model per kind, nose toward +x, centred, standing on z = 0,
   drawn as instances; every part is its own geometry so it takes its own colour:
     car     a body with rounded corners, four wheels, a glasshouse with sloped windscreen and rear
             window (side windows split by a pillar), round head lamps, small tail lamps, a lit roof
             sign on the taxi; the van is one tall box with a row of side windows;
     scooter the side profile of the old app (step-through body, rear hump, front shield), two
             wheels, seat, handlebar, the rider (body and head), one head lamp, one tail lamp;
     beams   at night the head lamps throw two pools of light on the road ahead (iso-glow's .beam).
   Lines: the silhouette comes from an instanced shell; the creases are kept as segments in the
   model's own frame for the view to place with each vehicle. `placeVehicle` turns a vehicle of the
   traffic model into an instance matrix. Pure. */
import * as THREE from 'three';
import { TRACKS, laneAt, normalizeRing, type Lane, type Vehicle, type VehicleKind, type Vec2 } from '@my-city/core';
import { V, Batch } from './batch';

export type VehiclePart = 'body' | 'top' | 'glass' | 'wheel' | 'head' | 'tail' | 'sign' | 'beam';

export interface VehicleModel {
  parts: Map<VehiclePart, THREE.BufferGeometry>;
  shell: THREE.BufferGeometry;
  /** crease and detail segments in the model's frame (x, y, z per point, two points a segment) */
  lines: Float32Array;
}

const L_: Record<VehicleKind, number> = { sedan: 4.4, taxi: 4.4, hatch: 3.8, van: 4.8, bike: 1.8 };

export function vehicleModel(kind: VehicleKind): VehicleModel {
  const B = new Batch(), extra = new Map<VehiclePart, number[]>();
  const put = (p: VehiclePart) => { let a = extra.get(p); if (!a) extra.set(p, (a = [])); return a; };
  if (kind === 'bike') scooter(B, put); else car(B, kind, put);
  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
  const parts = new Map<VehiclePart, THREE.BufferGeometry>();
  const map: [VehiclePart, Parameters<Batch['tris']['get']>[0]][] = [['body', 'wall'], ['top', 'roof'], ['glass', 'glass'], ['wheel', 'metal']];
  for (const [p, s] of map) { const t = B.tris.get(s); if (t?.length) parts.set(p, geo(t)); }
  for (const [p, t] of extra) if (t.length) parts.set(p, geo(t));
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(B.shell.pos, 3));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(B.shell.nrm, 3));
  return { parts, shell, lines: new Float32Array([...B.creases, ...B.details]) };
}

/** a horizontal prism: a profile in the (x, z) plane, from y0 to y1 across; face(i) picks the
    surface of the face on profile edge i, caps the two sides */
function across(B: Batch, profile: readonly Vec2[], y0: number, y1: number, face: (i: number) => 'wall' | 'roof' | 'glass' | 'metal', caps: 'wall' | 'glass' | 'metal', creases = true) {
  const P = normalizeRing(profile), n = P.length, all: number[] = [];
  const add = (s: 'wall' | 'roof' | 'glass' | 'metal', q: THREE.Vector3[], nrm: THREE.Vector3) => { B.quad(s, q, nrm); B.quad(s, q, nrm, all); };
  P.forEach((p, i) => {
    const q = P[(i + 1) % n]!;
    // outward normal in (x, z) of a positive-area ring: (dz, −dx); y across stays 0
    const nrm = new THREE.Vector3(q[1] - p[1], -(q[0] - p[0]), 0).normalize();
    add(face(i), [V(p[0], y0, p[1]), V(q[0], y0, q[1]), V(q[0], y1, q[1]), V(p[0], y1, p[1])], new THREE.Vector3(nrm.x, nrm.y, 0));
  });
  for (const [y, s] of [[y0, -1], [y1, 1]] as const) {
    const nrm = new THREE.Vector3(0, 0, s);
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), [])) {
      const t = [V(P[a!]![0], y, P[a!]![1]), V(P[b!]![0], y, P[b!]![1]), V(P[c!]![0], y, P[c!]![1])] as const;
      B.tri(caps, t[0], t[1], t[2], nrm); B.tri(caps, t[0], t[1], t[2], nrm, all);
    }
  }
  if (creases) B.edgesOf(all, 30);
  else {
    // the silhouette shell only (wheels: their outline is enough, their many edges are not)
    const T = new Batch();
    T.edgesOf(all, 30);
    B.shell.pos.push(...T.shell.pos); B.shell.nrm.push(...T.shell.nrm);
  }
}

const octagonXZ = (cx: number, cz: number, r: number): Vec2[] => Array.from({ length: 8 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 4 + Math.PI / 8), cz + r * Math.sin((i * Math.PI) / 4 + Math.PI / 8)] as const);

/** a flat lamp facing ±x (n) or a disc, on the plane x = const */
function lampAt(out: number[], x: number, y: number, z: number, ry: number, rz: number, round: boolean, nx: 1 | -1) {
  const pts = round ? Array.from({ length: 8 }, (_, i) => [y + ry * Math.cos((i * Math.PI) / 4), z + rz * Math.sin((i * Math.PI) / 4)] as const) : [[y - ry, z - rz], [y + ry, z - rz], [y + ry, z + rz], [y - ry, z + rz]] as const;
  const B = new Batch(), n = new THREE.Vector3(nx, 0, 0);
  for (let i = 1; i + 1 < pts.length; i++) B.tri('wall', V(x, pts[0]![0], pts[0]![1]), V(x, pts[i]![0], pts[i]![1]), V(x, pts[i + 1]![0], pts[i + 1]![1]), n, out);
}

function car(B: Batch, kind: Exclude<VehicleKind, 'bike'>, put: (p: VehiclePart) => number[]) {
  const L = L_[kind], W = kind === 'van' ? 1.9 : 1.7, hw = W / 2, z0 = 0.28, bodyH = kind === 'van' ? 1.45 : 0.62, zt = z0 + bodyH;
  // body: rounded corners in plan
  const r = 0.28, seg = 2, ring: Vec2[] = [];
  for (const [cx, cy, a0] of [[L / 2 - r, hw - r, 0], [-L / 2 + r, hw - r, Math.PI / 2], [-L / 2 + r, -hw + r, Math.PI], [L / 2 - r, -hw + r, 1.5 * Math.PI]] as const)
    for (let k = 0; k <= seg; k++) { const a = a0 + (k / seg) * (Math.PI / 2); ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  B.solid(ring, z0, zt, () => 'wall', 'roof');
  // wheels: under the body at both sides, a little in from the ends
  for (const x of [L / 2 - 0.8, -L / 2 + 0.8]) for (const s of [-1, 1]) across(B, octagonXZ(x, 0.32, 0.32), s * (hw - 0.22), s * (hw + 0.02), () => 'metal', 'metal', false);
  if (kind === 'van') {
    // a row of side windows high up, the windscreen at the front
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x0 = -L / 2 + 0.4 + (i * (L - 0.8)) / 4, x1 = x0 + (L - 0.8) / 4 - 0.12, y = s * (hw + 0.01), z1 = zt - 0.15, z2 = zt - 0.6;
      B.quad('glass', [V(x0, y, z2), V(x1, y, z2), V(x1, y, z1), V(x0, y, z1)], new THREE.Vector3(0, 0, s));
      B.loop([V(x0, y, z2), V(x1, y, z2), V(x1, y, z1), V(x0, y, z1)], 'detail');
    }
    const x = L / 2 + 0.01;
    B.quad('glass', [V(x, -hw + 0.15, zt - 0.6), V(x, hw - 0.15, zt - 0.6), V(x, hw - 0.15, zt - 0.12), V(x, -hw + 0.15, zt - 0.12)], new THREE.Vector3(1, 0, 0));
  } else {
    // the glasshouse: base from c0 to c1 (from the back), roof pulled in at the windscreen and the rear
    const [c0, c1] = kind === 'hatch' ? [-L / 2 + 0.4, L / 2 - 1.3] : [-L / 2 + 0.9, L / 2 - 1.3];
    const rb = kind === 'hatch' ? 0.1 : 0.35, rf = 0.55, ch = 0.58, cw = hw - 0.14;
    const prof: Vec2[] = [[c0, zt], [c1, zt], [c1 - rf, zt + ch], [c0 + rb, zt + ch]];
    // profile edges after normalising: bottom, windscreen, roof, rear window
    across(B, prof, -cw, cw, i => { const P = normalizeRing(prof), p = P[i]!, q = P[(i + 1) % P.length]!; return Math.abs(p[1] - q[1]) < 1e-6 ? 'roof' : 'glass'; }, 'glass');
    // the pillar between the side windows
    const xm = (c0 + c1) / 2 - 0.1;
    for (const s of [-1, 1]) B.line(V(xm, s * (cw + 0.01), zt), V(xm, s * (cw + 0.01), zt + ch), 'detail');
    if (kind === 'taxi') {
      const sign = put('sign'), m = (c0 + rb + c1 - rf) / 2, zs = zt + ch;
      const SB = new Batch();
      SB.solid([[m - 0.3, -0.22], [m + 0.3, -0.22], [m + 0.3, 0.22], [m - 0.3, 0.22]], zs, zs + 0.2, () => 'wall', 'wall');
      sign.push(...(SB.tris.get('wall') ?? []));
      B.loop([V(m - 0.3, -0.22, zs + 0.2), V(m + 0.3, -0.22, zs + 0.2), V(m + 0.3, 0.22, zs + 0.2), V(m - 0.3, 0.22, zs + 0.2)], 'crease');
    }
  }
  // lamps: two round heads at the nose, two small tails at the back
  const zl = z0 + Math.min(0.4, bodyH * 0.55);
  for (const y of [-hw + 0.32, hw - 0.32]) {
    lampAt(put('head'), L / 2 + 0.02, y, zl, 0.13, 0.11, true, 1);
    lampAt(put('tail'), -L / 2 - 0.02, y, zl, 0.13, 0.06, false, -1);
  }
  beam(put('beam'), L / 2, 1);
}

function scooter(B: Batch, put: (p: VehiclePart) => number[]) {
  // the old app's side profile (units of 10 cm from the tail, z up from the ground), at half width 0.16
  const prof: Vec2[] = ([[1.5, 3.4], [2.5, 6.8], [7.5, 7.6], [9, 4.8], [12, 4.4], [14.5, 9.6], [15.6, 9.4], [16.2, 4.2], [13.2, 2.4], [4, 2.4]] as const)
    .map(([u, z]) => [u / 10 - 0.9, z / 10] as const);
  across(B, prof, -0.16, 0.16, () => 'wall', 'wall');
  for (const x of [3.4 / 10 - 0.9, 15 / 10 - 0.9]) across(B, octagonXZ(x, 0.3, 0.3), -0.06, 0.06, () => 'metal', 'metal', false);
  // seat, handlebar
  B.solid([[-0.5, -0.17], [0.05, -0.17], [0.05, 0.17], [-0.5, 0.17]], 0.76, 0.86, () => 'roof', 'roof');
  B.solid([[0.58, -0.3], [0.64, -0.3], [0.64, 0.3], [0.58, 0.3]], 1.0, 1.04, () => 'metal', 'metal');
  // the rider: body and head
  B.solid([[-0.42, -0.17], [-0.06, -0.17], [-0.06, 0.17], [-0.42, 0.17]], 0.86, 1.52, () => 'wall', 'roof');
  B.flatSolid(Array.from({ length: 8 }, (_, i): Vec2 => [-0.2 + 0.13 * Math.cos((i * Math.PI) / 4), 0.13 * Math.sin((i * Math.PI) / 4)]), 1.55, 1.8, 'roof');
  lampAt(put('head'), 0.9 + 0.02, 0, 0.74, 0.07, 0.07, true, 1);
  lampAt(put('tail'), -0.9 - 0.02, 0, 0.68, 0.06, 0.04, false, -1);
  beam(put('beam'), 0.9, 0.55);
}

/** two pools of light on the road ahead of the nose, the inner one shorter and brighter */
function beam(out: number[], nose: number, k: number) {
  const up = new THREE.Vector3(0, 1, 0), B = new Batch(), z = 0.06;
  const quad = (x0: number, x1: number, w0: number, w1: number) => B.quad('wall', [V(nose + x0, -w0, z), V(nose + x1, -w1, z), V(nose + x1, w1, z), V(nose + x0, w0, z)], up, out);
  quad(0.1, 6.4 * k, 0.45 * k, 1.7 * k);
  quad(0.1, 3.6 * k, 0.35 * k, 0.8 * k);
}

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

/** the instance matrix of a vehicle: at the middle of its length along the lane, on its track,
    turned to the lane; scaled in over the first and out over the last 8 m of the lane */
export function placeVehicle(c: Vehicle, lane: Lane, out: THREE.Matrix4 = m4): THREE.Matrix4 {
  const mid = c.s + c.len / 2, at = laneAt(lane, mid % lane.length), off = TRACKS[c.track]!;
  const x = at.p[0] - Math.sin(at.heading) * off, y = at.p[1] + Math.cos(at.heading) * off;
  const fade = Math.max(0, Math.min(1, mid / 8, (lane.length - mid) / 8));
  pos.copy(V(x, y, at.z + 0.12));
  // model nose is +x; three.js turns about +y, and the city's y is three's z, so the angle flips
  q.setFromAxisAngle(Y, -at.heading);
  scl.setScalar(fade);
  return out.compose(pos, q, scl);
}
