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
function across(B: Batch, profile: readonly Vec2[], y0: number, y1: number, face: (i: number) => 'wall' | 'roof' | 'glass' | 'metal', caps: 'wall' | 'roof' | 'glass' | 'metal', creases = true, angle = 28) {
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
  if (creases) B.edgesOf(all, angle);
  else {
    const T = new Batch();
    T.edgesOf(all, angle);
    B.shell.pos.push(...T.shell.pos); B.shell.nrm.push(...T.shell.nrm);
  }
}

const discXZ = (cx: number, cz: number, r: number, n = 12): Vec2[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n + Math.PI / n), cz + r * Math.sin((i * 2 * Math.PI) / n + Math.PI / n)] as const);

/** a rounded rectangle in plan: seg = 5 keeps adjacent facet normals within 18° (< 20°), so
    Batch.solid draws smooth top/bottom loops with no vertical facet lines on the corners */
function roundRect(x0: number, x1: number, y0: number, y1: number, r: number, seg = 5): Vec2[] {
  const ring: Vec2[] = [];
  for (const [cx, cy, a0] of [[x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI], [x1 - r, y0 + r, 1.5 * Math.PI]] as const)
    for (let k = 0; k <= seg; k++) { const a = a0 + (k / seg) * (Math.PI / 2); ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return ring;
}

/** a wheel at (cx, cz) with full circular tire outline and inner hubcap disc + ring (10-diner.js) */
function wheelAt(B: Batch, cx: number, cz: number, r: number, y0: number, y1: number, sides: readonly (-1 | 1)[]) {
  const rim = discXZ(cx, cz, r, 12), hub = discXZ(cx, cz, r * 0.42, 10);
  across(B, rim, y0, y1, () => 'metal', 'metal', false);
  for (const s of sides) {
    const yf = (s > 0 ? y1 : y0) + s * 0.012, nrm = new THREE.Vector3(0, 0, s);
    B.loop(rim.map(([x, z]) => V(x, yf, z)), 'crease');
    for (let i = 1; i + 1 < hub.length; i++) B.tri('wall', V(hub[0]![0], yf, hub[0]![1]), V(hub[i]![0], yf, hub[i]![1]), V(hub[i + 1]![0], yf, hub[i + 1]![1]), nrm);
    B.loop(hub.map(([x, z]) => V(x, yf + s * 0.004, z)), 'detail');
  }
}

/** a flat lamp facing ±x (nx), with a crisp outline loop around it */
function lampAt(B: Batch, out: number[], x: number, y: number, z: number, ry: number, rz: number, round: boolean, nx: 1 | -1) {
  const pts = round
    ? Array.from({ length: 10 }, (_, i) => [y + ry * Math.cos((i * Math.PI) / 5), z + rz * Math.sin((i * Math.PI) / 5)] as const)
    : ([[y - ry, z - rz], [y + ry, z - rz], [y + ry, z + rz], [y - ry, z + rz]] as const);
  const n = new THREE.Vector3(nx, 0, 0);
  for (let i = 1; i + 1 < pts.length; i++) B.tri('wall', V(x, pts[0]![0], pts[0]![1]), V(x, pts[i]![0], pts[i]![1]), V(x, pts[i + 1]![0], pts[i + 1]![1]), n, out);
  B.loop(pts.map(([py, pz]) => V(x + nx * 0.005, py, pz)), 'crease');
}

function car(B: Batch, kind: Exclude<VehicleKind, 'bike'>, put: (p: VehiclePart) => number[]) {
  const L = L_[kind], W = kind === 'van' ? 1.88 : 1.74, hw = W / 2, z0 = 0.26, bodyH = kind === 'van' ? 0.64 : 0.62, zt = z0 + bodyH;
  // lower body with smooth rounded corners (no internal corner vertical lines)
  B.solid(roundRect(-L / 2, L / 2, -hw, hw, 0.28, 5), z0, zt, () => 'wall', 'roof');
  // wheels with full outline and inner hubcap (10-diner.js lines 176–177)
  const wxF = L / 2 - 0.82, wxR = -L / 2 + 0.82, wr = 0.30, wz = 0.30;
  for (const x of [wxF, wxR]) for (const s of [-1, 1] as const) {
    wheelAt(B, x, wz, wr, s > 0 ? hw - 0.20 : -hw - 0.04, s > 0 ? hw + 0.04 : -hw + 0.20, [s]);
    // wheel arch crease on the lower body above the tire
    const arch = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI;
      return V(x + (wr + 0.06) * Math.cos(a), s * (hw + 0.01), Math.max(z0 + 0.02, wz + (wr + 0.05) * Math.sin(a)));
    });
    for (let i = 1; i < arch.length; i++) B.line(arch[i - 1]!, arch[i]!, 'detail');
  }

  if (kind === 'van') {
    // upper cabin of the van: sloped front windscreen, vertical back, 3 rear windows + 1 sloped cab window per side
    const c0 = -L / 2 + 0.08, c1 = L / 2 - 0.28, rf = 0.38, ch = 0.80, cw = hw - 0.06;
    const prof: Vec2[] = [[c0, zt], [c1, zt], [c1 - rf, zt + ch], [c0 + 0.06, zt + ch]];
    across(B, prof, -cw, cw, i => { const P = normalizeRing(prof), p = P[i]!, q = P[(i + 1) % P.length]!; return Math.abs(p[1] - q[1]) < 1e-6 ? 'roof' : 'wall'; }, 'wall');
    // inset roof detail panel
    B.loop([V(c0 + 0.22, -cw + 0.14, zt + ch + 0.01), V(c1 - rf - 0.16, -cw + 0.14, zt + ch + 0.01), V(c1 - rf - 0.16, cw - 0.14, zt + ch + 0.01), V(c0 + 0.22, cw - 0.14, zt + ch + 0.01)], 'detail');
    // sloped front windscreen with A-pillars
    const fn = new THREE.Vector3(ch, rf, 0).normalize();
    const fw0 = c1 - rf * 0.13, fw1 = c1 - rf * 0.87, fz0 = zt + ch * 0.13, fz1 = zt + ch * 0.87, wy = cw - 0.14;
    const fQuad = [V(fw0 + 0.015, -wy, fz0), V(fw0 + 0.015, wy, fz0), V(fw1 + 0.015, wy, fz1), V(fw1 + 0.015, -wy, fz1)];
    B.quad('glass', fQuad, fn); B.loop(fQuad, 'crease');
    // rear window + double-door centre seam
    const bx = c0 + 0.03 - 0.015, rQuad = [V(bx, -wy, zt + 0.12), V(bx, wy, zt + 0.12), V(bx, wy, zt + ch - 0.12), V(bx, -wy, zt + ch - 0.12)];
    B.quad('glass', rQuad, new THREE.Vector3(-1, 0, 0)); B.loop(rQuad, 'crease');
    B.line(V(bx - 0.005, 0, z0 + 0.08), V(bx - 0.005, 0, zt + ch - 0.06), 'detail');
    // side windows + sliding door seam, cab door seam, mirrors & beltline
    const bPil = c1 - rf - 0.72, span = (bPil - 0.06 - (c0 + 0.18)) / 3, zb0 = zt + 0.10, zb1 = zt + ch - 0.12;
    const xfBot = c1 - rf * (0.10 / ch) - 0.13, xfTop = c1 - rf * ((ch - 0.12) / ch) - 0.13;
    for (const s of [-1, 1]) {
      const y = s * (cw + 0.012), yn = new THREE.Vector3(0, 0, s);
      for (let i = 0; i < 3; i++) {
        const x0 = c0 + 0.18 + i * span + 0.04, x1 = x0 + span - 0.10;
        const wq = [V(x0, y, zb0), V(x1, y, zb0), V(x1, y, zb1), V(x0, y, zb1)];
        B.quad('glass', wq, yn); B.loop(wq, 'crease');
      }
      const cabWin = [V(bPil + 0.06, y, zb0), V(xfBot, y, zb0), V(xfTop, y, zb1), V(bPil + 0.06, y, zb1)];
      B.quad('glass', cabWin, yn); B.loop(cabWin, 'crease');
      const yb = s * (hw + 0.01);
      B.line(V(-L / 2 + 0.26, yb, zt - 0.16), V(L / 2 - 0.26, yb, zt - 0.16), 'detail');
      for (const dx of [c0 + 0.18 + span, bPil, c1 - 0.08]) B.line(V(dx, yb, z0 + 0.08), V(dx, yb, zt), 'detail');
      const mx0 = c1 - 0.20, mx1 = c1 - 0.08, my0 = s * hw, my1 = s * (hw + 0.12);
      B.solid([[mx0, Math.min(my0, my1)], [mx1, Math.min(my0, my1)], [mx1, Math.max(my0, my1)], [mx0, Math.max(my0, my1)]], zt + 0.04, zt + 0.16, () => 'wall', 'roof');
    }
  } else {
    // 10-diner.js style body-coloured cabin (greenhouse) with inset glass panes and A/B/C pillars
    const [c0, c1] = kind === 'hatch' ? [-L / 2 + 0.36, L / 2 - 0.98] : [-L / 2 + 0.86, L / 2 - 1.04];
    const rb = kind === 'hatch' ? 0.20 : 0.30, rf = 0.44, ch = 0.54, cw = hw - 0.15;
    const prof: Vec2[] = [[c0, zt], [c1, zt], [c1 - rf, zt + ch], [c0 + rb, zt + ch]];
    across(B, prof, -cw, cw, i => { const P = normalizeRing(prof), p = P[i]!, q = P[(i + 1) % P.length]!; return Math.abs(p[1] - q[1]) < 1e-6 ? 'roof' : 'wall'; }, 'wall');
    // inset roof detail panel
    B.loop([V(c0 + rb + 0.12, -cw + 0.12, zt + ch + 0.01), V(c1 - rf - 0.12, -cw + 0.12, zt + ch + 0.01), V(c1 - rf - 0.12, cw - 0.12, zt + ch + 0.01), V(c0 + rb + 0.12, cw - 0.12, zt + ch + 0.01)], 'detail');
    // sloped front windscreen (inset inside the A-pillars, header & cowl)
    const wy = cw - 0.12, f0 = 0.13, f1 = 0.87;
    const fx0 = c1 - rf * f0 + 0.015, fx1 = c1 - rf * f1 + 0.015, fz0 = zt + ch * f0, fz1 = zt + ch * f1;
    const fScreen = [V(fx0, -wy, fz0), V(fx0, wy, fz0), V(fx1, wy, fz1), V(fx1, -wy, fz1)];
    B.quad('glass', fScreen, new THREE.Vector3(ch, rf, 0).normalize()); B.loop(fScreen, 'crease');
    // sloped rear window (inset inside the C-pillars)
    const rx0 = c0 + rb * f0 - 0.015, rx1 = c0 + rb * f1 - 0.015;
    const rScreen = [V(rx0, wy, fz0), V(rx0, -wy, fz0), V(rx1, -wy, fz1), V(rx1, wy, fz1)];
    B.quad('glass', rScreen, new THREE.Vector3(-ch, rb, 0).normalize()); B.loop(rScreen, 'crease');
    // two inset side windows per side split by the B-pillar (10-diner.js lines 170–171)
    const pil = (c0 + rb + c1 - rf) / 2 - 0.04, pilHalf = 0.065;
    const xFrontBot = (h: number) => c1 - rf * h - 0.13, xRearBot = (h: number) => c0 + rb * h + 0.14;
    const zPane = (h: number) => zt + ch * h, h0 = 0.14, h1 = 0.85;
    for (const s of [-1, 1]) {
      const y = s * (cw + 0.012), yn = new THREE.Vector3(0, 0, s);
      const rearPane = [V(xRearBot(h0), y, zPane(h0)), V(pil - pilHalf, y, zPane(h0)), V(pil - pilHalf, y, zPane(h1)), V(xRearBot(h1), y, zPane(h1))];
      const frontPane = [V(pil + pilHalf, y, zPane(h0)), V(xFrontBot(h0), y, zPane(h0)), V(xFrontBot(h1), y, zPane(h1)), V(pil + pilHalf, y, zPane(h1))];
      B.quad('glass', rearPane, yn); B.loop(rearPane, 'crease');
      B.quad('glass', frontPane, yn); B.loop(frontPane, 'crease');
      // side body details: beltline trim, vertical door seams, door handles, lower sill (10-diner.js lines 174–175)
      const yb = s * (hw + 0.01);
      B.line(V(-L / 2 + 0.24, yb, zt - 0.17), V(L / 2 - 0.24, yb, zt - 0.17), 'detail');
      B.line(V(wxR + wr + 0.10, yb, z0 + 0.08), V(wxF - wr - 0.10, yb, z0 + 0.08), 'detail');
      for (const dx of [c0 + 0.16, pil, c1 - 0.10]) B.line(V(dx, yb, z0 + 0.08), V(dx, yb, zt - 0.03), 'detail');
      // door handles
      for (const hx of [pil - 0.28, pil + 0.22]) B.line(V(hx, yb, zt - 0.11), V(hx + 0.14, yb, zt - 0.11), 'crease');
      // wing mirror near the base of the A-pillar
      const mx0 = c1 - 0.22, mx1 = c1 - 0.10, my0 = s * hw, my1 = s * (hw + 0.12);
      B.solid([[mx0, Math.min(my0, my1)], [mx1, Math.min(my0, my1)], [mx1, Math.max(my0, my1)], [mx0, Math.max(my0, my1)]], zt + 0.02, zt + 0.11, () => 'wall', 'roof');
    }
    // hood (bonnet) and trunk (boot) deck panel lines on top of the lower body
    const hy = hw - 0.22;
    B.loop([V(c1 + 0.06, -hy, zt + 0.01), V(L / 2 - 0.20, -hy, zt + 0.01), V(L / 2 - 0.20, hy, zt + 0.01), V(c1 + 0.06, hy, zt + 0.01)], 'detail');
    if (kind !== 'hatch') B.loop([V(-L / 2 + 0.18, -hy, zt + 0.01), V(c0 - 0.05, -hy, zt + 0.01), V(c0 - 0.05, hy, zt + 0.01), V(-L / 2 + 0.18, hy, zt + 0.01)], 'detail');

    if (kind === 'taxi') {
      const sign = put('sign'), m = (c0 + rb + c1 - rf) / 2, zs = zt + ch;
      // mounting plinth + lit sign box with full creases and shell
      B.solid([[m - 0.34, -0.26], [m + 0.34, -0.26], [m + 0.34, 0.26], [m - 0.34, 0.26]], zs, zs + 0.04, () => 'metal', 'metal');
      const SB = new Batch();
      SB.solid([[m - 0.28, -0.20], [m + 0.28, -0.20], [m + 0.28, 0.20], [m - 0.28, 0.20]], zs + 0.04, zs + 0.22, () => 'wall', 'wall');
      sign.push(...(SB.tris.get('wall') ?? []));
      B.creases.push(...SB.creases);
      B.shell.pos.push(...SB.shell.pos); B.shell.nrm.push(...SB.shell.nrm);
    }
  }

  // front nose & rear tail details: headlamps + grille slits (10-diner.js line 172), taillamps + plate + bumpers
  const zl = z0 + 0.34, fx = L / 2 + 0.015, bx = -L / 2 - 0.015;
  for (const y of [-hw + 0.32, hw - 0.32]) {
    lampAt(B, put('head'), fx, y, zl, 0.12, 0.11, true, 1);
    lampAt(B, put('tail'), bx, y, zl, 0.15, 0.07, false, -1);
  }
  // front radiator grille frame + vertical slits between the headlamps
  const gy = hw - 0.54;
  B.loop([V(fx, -gy, zl - 0.08), V(fx, gy, zl - 0.08), V(fx, gy, zl + 0.07), V(fx, -gy, zl + 0.07)], 'detail');
  for (let y = -gy + 0.11; y <= gy - 0.10; y += 0.11) B.line(V(fx, y, zl - 0.07), V(fx, y, zl + 0.06), 'detail');
  // front and rear bumper lines + rear number-plate frame
  B.line(V(fx, -hw + 0.18, z0 + 0.12), V(fx, hw - 0.18, z0 + 0.12), 'crease');
  B.line(V(bx, -hw + 0.18, z0 + 0.12), V(bx, hw - 0.18, z0 + 0.12), 'crease');
  B.loop([V(bx, -0.22, zl - 0.06), V(bx, 0.22, zl - 0.06), V(bx, 0.22, zl + 0.06), V(bx, -0.22, zl + 0.06)], 'detail');
  beam(put('beam'), L / 2, 1);
}

function scooter(B: Batch, put: (p: VehiclePart) => number[]) {
  // step-through scooter body (rear cowling, floorboard, sloped front leg shield)
  const prof: Vec2[] = ([[1.4, 3.6], [2.4, 7.0], [7.8, 7.5], [9.2, 4.4], [12.2, 4.0], [14.5, 9.5], [15.7, 9.3], [16.3, 4.3], [13.4, 2.4], [4.0, 2.4]] as const)
    .map(([u, z]) => [u / 10 - 0.9, z / 10] as const);
  across(B, prof, -0.16, 0.16, () => 'wall', 'wall');
  // front mudguard over the front wheel
  const fender: Vec2[] = [[0.42, 0.46], [0.56, 0.56], [0.73, 0.50], [0.70, 0.43], [0.46, 0.41]];
  across(B, fender, -0.10, 0.10, () => 'wall', 'wall');
  // wheels with full outline and inner hubcap + front fork legs
  for (const x of [-0.56, 0.58]) wheelAt(B, x, 0.26, 0.25, -0.06, 0.06, [-1, 1]);
  for (const s of [-1, 1]) {
    const y = s * 0.168;
    // side trim along the rear engine cowling & front shield crease
    B.line(V(-0.70, y, 0.56), V(-0.12, y, 0.64), 'detail');
    B.line(V(-0.66, y, 0.46), V(-0.16, y, 0.52), 'detail');
    B.line(V(0.46, s * 0.08, 0.54), V(0.58, s * 0.08, 0.26), 'crease');
  }
  // seat + rear grab rail
  B.solid(roundRect(-0.56, 0.04, -0.15, 0.15, 0.05, 3), 0.74, 0.84, () => 'roof', 'roof');
  B.solid([[-0.74, -0.11], [-0.56, -0.11], [-0.56, 0.11], [-0.74, 0.11]], 0.73, 0.77, () => 'metal', 'metal');
  // steering neck, headset headlamp cowling, handlebar grips & rear-view mirrors
  B.solid([[0.44, -0.07], [0.54, -0.07], [0.54, 0.07], [0.44, 0.07]], 0.90, 1.00, () => 'metal', 'metal');
  B.solid(roundRect(0.42, 0.59, -0.13, 0.13, 0.04, 3), 0.98, 1.08, () => 'wall', 'roof');
  B.solid([[0.46, -0.30], [0.52, -0.30], [0.52, 0.30], [0.46, 0.30]], 1.01, 1.05, () => 'metal', 'metal');
  for (const s of [-1, 1]) {
    B.line(V(0.49, s * 0.20, 1.05), V(0.47, s * 0.26, 1.17), 'crease');
    B.loop([V(0.46, s * 0.24, 1.17), V(0.48, s * 0.30, 1.17), V(0.48, s * 0.30, 1.22), V(0.46, s * 0.24, 1.22)], 'crease');
  }
  // seated rider: bent legs on floorboard, rounded torso, arms to handlebars, helmeted head with visor
  for (const s of [-1, 1]) {
    const y0 = s > 0 ? 0.05 : -0.15, y1 = s > 0 ? 0.15 : -0.05;
    const leg: Vec2[] = [[-0.14, 0.76], [0.16, 0.70], [0.22, 0.34], [0.10, 0.34], [0.02, 0.62], [-0.18, 0.66]];
    across(B, leg, y0, y1, () => 'roof', 'roof');
    // arm from shoulder to handlebar grip
    const ay0 = s > 0 ? 0.12 : -0.22, ay1 = s > 0 ? 0.22 : -0.12;
    const arm: Vec2[] = [[-0.14, 1.26], [0.46, 1.05], [0.46, 0.99], [-0.14, 1.16]];
    across(B, arm, ay0, ay1, () => 'wall', 'wall');
  }
  B.solid(roundRect(-0.36, -0.04, -0.15, 0.15, 0.06, 4), 0.84, 1.34, () => 'wall', 'roof');
  // helmeted head (smooth rounded octagon with outline loops and visor crease)
  B.solid(roundRect(-0.30, -0.06, -0.11, 0.11, 0.08, 4), 1.35, 1.56, () => 'roof', 'roof');
  B.loop([V(-0.055, -0.08, 1.41), V(-0.055, 0.08, 1.41), V(-0.055, 0.08, 1.49), V(-0.055, -0.08, 1.49)], 'detail');
  // headlamp on headset + front shield grille slits + rear taillamp
  lampAt(B, put('head'), 0.60, 0, 1.03, 0.065, 0.045, true, 1);
  for (const z of [0.68, 0.73, 0.78]) B.line(V(0.71, -0.07, z), V(0.71, 0.07, z), 'detail');
  lampAt(B, put('tail'), -0.77, 0, 0.66, 0.065, 0.04, false, -1);
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
