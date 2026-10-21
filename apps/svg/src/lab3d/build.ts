/* 3D lab (ADR-031, experiment): the crossroads as three.js meshes, from the same core data as the
   SVG scenes (layout, house specs, the towers' OpenStreetMap plans). Kernel units, x/y/z with z up,
   map to three.js as (x, z, y) / 100 about the crossroads centre, so the camera at (1, 1, 1) sees what
   the SVG view 0 shows. The look is iso-glow's: unlit flat fills from the theme tokens, 1 px lines
   (silhouette shell + crease edges), one accent on what is lit. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Crossroads } from '@core/crossroads';
import { resolveSpec } from '@core/spec';
import { footprint, placeIn } from '@core/view';
import { TB, TB_PLAN } from '@render/landmarks/thai-binh';
import { NV, NV_PLAN } from '@render/landmarks/novotel';

type Pt = readonly [number, number];
export const UNIT = 1 / 100;

export interface Mats {
  wall: THREE.Material; top: THREE.Material; glass: THREE.Material; road: THREE.Material; walk: THREE.Material; ground: THREE.Material;
  winOff: THREE.Material; winOn: THREE.Material; shell: THREE.Material;
  crease: LineMaterial; detail: LineMaterial;
}

/** something that lights: a tower floor or a whole house */
export interface Lamp { id: string; mesh: THREE.Mesh; on: boolean }

export interface Built {
  root: THREE.Group;
  lamps: Map<string, Lamp>;
  /** hit meshes → which lamp a click at height y (three units) lights */
  pick: (obj: THREE.Object3D, y: number) => string | null;
  beacon: THREE.Mesh;
  /** kernel-unit centre of the crossroads */
  center: [number, number];
}

export function buildCity(cr: Crossroads, M: Mats): Built {
  const [cx, cy] = cr.center;
  const V = (x: number, y: number, z: number) => new THREE.Vector3((x - cx) * UNIT, z * UNIT, (y - cy) * UNIT);
  const root = new THREE.Group(), lamps = new Map<string, Lamp>();
  const hits = new Map<THREE.Object3D, (y: number) => string | null>();

  // ---------- geometry helpers ----------
  /** push a triangle so it faces along n (three coords), whatever order the points come in */
  const tri = (out: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) => {
    const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).dot(n) >= 0;
    const [p, q, r] = f ? [a, b, c] : [a, c, b];
    out.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
  };
  const quad = (out: number[], p: THREE.Vector3[], n: THREE.Vector3) => { tri(out, p[0]!, p[1]!, p[2]!, n); tri(out, p[0]!, p[2]!, p[3]!, n); };
  const ccw = (ring: readonly Pt[]) => {
    let s = 0;
    ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length]!; s += p[0] * q[1] - q[0] * p[1]; });
    return s > 0 ? [...ring] : [...ring].reverse();
  };
  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
  const lines = (g: THREE.BufferGeometry, mat: LineMaterial, angle = 20) => new LineSegments2(new LineSegmentsGeometry().setPositions(new THREE.EdgesGeometry(g, angle).attributes.position!.array as Float32Array), mat);

  /** one solid: walls (per-edge material) + top, with its silhouette shell and crease lines */
  function solid(ring: readonly Pt[], z0: number, z1: number, wallMat: (p: Pt, q: Pt) => THREE.Material = () => M.wall): THREE.Group {
    const R = ccw(ring), n = R.length, g = new THREE.Group();
    const byMat = new Map<THREE.Material, number[]>(), all: number[] = [];
    R.forEach((p, i) => {
      const q = R[(i + 1) % n]!, nrm = new THREE.Vector3(q[1] - p[1], 0, -(q[0] - p[0])).normalize();
      const m = wallMat(p, q), arr = byMat.get(m) ?? [];
      byMat.set(m, arr);
      const pts = [V(p[0], p[1], z0), V(q[0], q[1], z0), V(q[0], q[1], z1), V(p[0], p[1], z1)];
      quad(arr, pts, nrm);
      quad(all, pts, nrm);
    });
    const top: number[] = [], up = new THREE.Vector3(0, 1, 0);
    const contour = R.map(p => new THREE.Vector2(p[0], p[1]));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) tri(top, V(...R[a!]!, z1), V(...R[b!]!, z1), V(...R[c!]!, z1), up);
    all.push(...top);
    for (const [m, arr] of byMat) g.add(new THREE.Mesh(geo(arr), m));
    g.add(new THREE.Mesh(geo(top), M.top));
    // silhouette: the solid pushed out 1 px along smooth normals, back faces only
    const shellGeo = mergeVertices(geo(all).deleteAttribute('normal'), 1e-4);
    shellGeo.computeVertexNormals();
    const shell = new THREE.Mesh(shellGeo, M.shell);
    shell.userData.outline = true;
    g.add(shell);
    g.add(lines(geo(all), M.crease));
    return g;
  }

  /** one floor's ribbon windows round a ring: a strip per edge, standing just off the wall */
  function bands(ring: readonly Pt[], z: number, floorH: number, glass: readonly [number, number], on?: (p: Pt, q: Pt) => boolean): THREE.BufferGeometry {
    const R = ccw(ring), n = R.length, out: number[] = [];
    const dir = (i: number) => { const p = R[i]!, q = R[(i + 1) % n]!; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
    const sharp = (i: number) => { let t = Math.abs(dir(i) - dir((i - 1 + n) % n)); if (t > Math.PI) t = 2 * Math.PI - t; return t > 0.5; };
    R.forEach((p, i) => {
      const q = R[(i + 1) % n]!;
      if (on && !on(p, q)) return;
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]), ua = (q[0] - p[0]) / len, ub = (q[1] - p[1]) / len, off = 0.4;
      const na = ub * off, nb = -ua * off;   // outward
      const c0 = sharp(i) ? Math.min(1.5, len / 4) : 0, c1 = sharp((i + 1) % n) ? Math.min(1.5, len / 4) : 0;
      const a0 = p[0] + ua * c0 + na, b0 = p[1] + ub * c0 + nb, a1 = q[0] - ua * c1 + na, b1 = q[1] - ub * c1 + nb;
      const za = z + floorH * glass[0], zb = z + floorH * glass[1];
      quad(out, [V(a0, b0, za), V(a1, b1, za), V(a1, b1, zb), V(a0, b0, zb)], new THREE.Vector3(ub, 0, -ua));
    });
    return geo(out);
  }

  function lampMesh(id: string, g: THREE.BufferGeometry, parent: THREE.Object3D) {
    const mesh = new THREE.Mesh(g, M.winOff);
    mesh.add(lines(g, M.detail, 1));
    parent.add(mesh);
    lamps.set(id, { id, mesh, on: false });
  }

  // ---------- ground: lots, sidewalks, roads ----------
  {
    const [CX, CY] = cr.size, g: number[] = [], up = new THREE.Vector3(0, 1, 0);
    quad(g, [V(0, 0, 0), V(CX, 0, 0), V(CX, CY, 0), V(0, CY, 0)], up);
    root.add(new THREE.Mesh(geo(g), M.walk));
    const road: number[] = [];
    const X = cr.x, Y = cr.y;
    // X (Tây Sơn) faces S: local b → world y = frame.y + b
    quad(road, [V(0, X.frame.y + X.lay.section.road[0], 0.2), V(CX, X.frame.y + X.lay.section.road[0], 0.2), V(CX, X.frame.y + X.lay.section.road[1], 0.2), V(0, X.frame.y + X.lay.section.road[1], 0.2)], up);
    // Y (Thái Hà – Chùa Bộc) faces W: local b → world x = frame.x + frame.d − b
    const x0 = Y.frame.x + Y.frame.d - Y.lay.section.road[1], x1 = Y.frame.x + Y.frame.d - Y.lay.section.road[0];
    quad(road, [V(x0, 0, 0.3), V(x1, 0, 0.3), V(x1, CY, 0.3), V(x0, CY, 0.3)], up);
    const rm = new THREE.Mesh(geo(road), M.road);
    root.add(rm);
    // lane lines: dashed centre lines as thin strips
    const dash: number[] = [];
    for (const lane of X.lay.section.lanes.slice(0, -1)) {
      const yy = X.frame.y + lane.y1 + 2;
      for (let x = 0; x < CX; x += 150) if (x + 80 < cr.junction.x || x > cr.junction.x + cr.junction.w) quad(dash, [V(x, yy - 0.8, 0.5), V(x + 80, yy - 0.8, 0.5), V(x + 80, yy + 0.8, 0.5), V(x, yy + 0.8, 0.5)], up);
    }
    {
      const xm = (x0 + x1) / 2;
      for (let y = 0; y < CY; y += 150) if (y + 80 < cr.junction.y || y > cr.junction.y + cr.junction.d) quad(dash, [V(xm - 0.8, y, 0.5), V(xm + 0.8, y, 0.5), V(xm + 0.8, y + 80, 0.5), V(xm - 0.8, y + 80, 0.5)], up);
    }
    root.add(new THREE.Mesh(geo(dash), M.top));
  }

  // ---------- corner plots: the two towers; gardens as plain plates ----------
  for (const p of cr.plots) {
    const at = (r: readonly Pt[]): Pt[] => r.map(([a, b]) => [p.x + a, p.y + b] as const);
    if (p.kind === 'thai-binh') {
      const zB = TB.base * TB.baseH, zT = zB + TB.tower * TB.towerH, g = new THREE.Group();
      const base = solid(at(TB_PLAN.base), 0, zB), tower = solid(at(TB_PLAN.tower), zB, zT);
      g.add(base, tower);
      for (let i = 0; i < TB.base; i++) lampMesh(`TB/${i + 1}`, bands(at(TB_PLAN.base), i * TB.baseH, TB.baseH, [0.24, 0.78]), g);
      for (let i = 0; i < TB.tower; i++) lampMesh(`TB/${TB.base + 1 + i}`, bands(at(TB_PLAN.tower), zB + i * TB.towerH, TB.towerH, [0.3, 0.74]), g);
      const floorAt = (z: number) => (z < zB ? `TB/${Math.floor(z / TB.baseH) + 1}` : `TB/${TB.base + 1 + Math.min(TB.tower - 1, Math.floor((z - zB) / TB.towerH))}`);
      g.traverse(o => { if ((o as THREE.Mesh).isMesh) hits.set(o, y => floorAt(y / UNIT)); });
      root.add(g);
    } else if (p.kind === 'novotel') {
      const zP = NV.podium * NV.podiumH, zM = zP + NV.mid * NV.towerH, zT = zM + NV.top * NV.towerH, g = new THREE.Group();
      const glassy = (q0: Pt, q1: Pt) => NV_PLAN.glassy([q0[0] - p.x, q0[1] - p.y], [q1[0] - p.x, q1[1] - p.y]);
      g.add(solid(at(NV_PLAN.podium), 0, zP), solid(at(NV_PLAN.mid), zP, zM, (a, b) => (glassy(a, b) ? M.glass : M.wall)), solid(at(NV_PLAN.tower), zM, zT, () => M.glass));
      for (let i = 0; i < NV.podium; i++) lampMesh(`NV/${i + 1}`, bands(at(NV_PLAN.podium), i * NV.podiumH, NV.podiumH, [0.22, 0.78]), g);
      for (let i = 0; i < NV.mid; i++) {
        const z = zP + i * NV.towerH, glass = bands(at(NV_PLAN.mid), z, NV.towerH, [0.08, 0.92], glassy), white = bands(at(NV_PLAN.mid), z, NV.towerH, [0.3, 0.7], (a, b) => !glassy(a, b));
        lampMesh(`NV/${NV.podium + 1 + i}`, mergeGeo(glass, white), g);
      }
      for (let i = 0; i < NV.top; i++) lampMesh(`NV/${NV.podium + NV.mid + 1 + i}`, bands(at(NV_PLAN.tower), zM + i * NV.towerH, NV.towerH, [0.08, 0.92]), g);
      const floorAt = (z: number) => `NV/${z < zP ? Math.floor(z / NV.podiumH) + 1 : Math.min(27, NV.podium + 1 + Math.floor((z - zP) / NV.towerH))}`;
      g.traverse(o => { if ((o as THREE.Mesh).isMesh) hits.set(o, y => floorAt(y / UNIT)); });
      root.add(g);
    } else {
      root.add(solid([[p.x + 10, p.y + 10], [p.x + p.w - 10, p.y + 10], [p.x + p.w - 10, p.y + p.d - 10], [p.x + 10, p.y + p.d - 10]], 0, 4));
    }
  }

  // ---------- houses: massing + front windows per floor ----------
  for (const st of ['x', 'y'] as const) {
    const c = cr[st];
    c.lay.houses.forEach((h, i) => {
      const s = placeIn(c.frame, resolveSpec(h.input).spec), fp = footprint(s);
      const zG = s.basement + s.groundH, H = zG + s.floors * s.floorH;
      const g = solid([[fp.x, fp.y], [fp.x + fp.w, fp.y], [fp.x + fp.w, fp.y + fp.d], [fp.x, fp.y + fp.d]], 0, H);
      // the front: facing S → y max, N → y min, E → x max, W → x min
      const fr = s.facing === 'S' ? { o: [fp.x, fp.y + fp.d], u: [1, 0], n: [0, 1], w: fp.w } : s.facing === 'N' ? { o: [fp.x + fp.w, fp.y], u: [-1, 0], n: [0, -1], w: fp.w }
        : s.facing === 'E' ? { o: [fp.x + fp.w, fp.y + fp.d], u: [0, -1], n: [1, 0], w: fp.d } : { o: [fp.x, fp.y], u: [0, 1], n: [-1, 0], w: fp.d };
      const win: number[] = [], nrm = new THREE.Vector3(fr.n[0]!, 0, fr.n[1]!);
      const P = (t: number, z: number) => V(fr.o[0]! + fr.u[0]! * t + fr.n[0]! * 0.4, fr.o[1]! + fr.u[1]! * t + fr.n[1]! * 0.4, z);
      const rect = (t0: number, t1: number, z0: number, z1: number) => quad(win, [P(t0, z0), P(t1, z0), P(t1, z1), P(t0, z1)], nrm);
      rect(fr.w * 0.12, fr.w * 0.88, s.basement + 2, zG - s.groundH * 0.25);   // shop front
      const bays = s.bays || Math.max(1, Math.round(fr.w / 40)), bw = fr.w / bays;
      for (let f = 0; f < s.floors; f++) for (let b = 0; b < bays; b++) rect(b * bw + bw * 0.2, b * bw + bw * 0.8, zG + f * s.floorH + s.floorH * 0.22, zG + f * s.floorH + s.floorH * 0.78);
      const id = `${st}-${i}`;
      lampMesh(id, geo(win), g);
      g.traverse(o => { if ((o as THREE.Mesh).isMesh) hits.set(o, () => id); });
      root.add(g);
    });
  }

  // ---------- the aircraft light on Việt Tower's mast ----------
  const tb = cr.plots.find(p => p.kind === 'thai-binh')!;
  const zMast = TB.base * TB.baseH + TB.tower * TB.towerH;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 1.3, 4, 1, true), M.wall);
  mast.position.copy(V(tb.x + 350, tb.y + 745, zMast + 65));
  mast.add(lines(mast.geometry, M.crease, 1));
  root.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.winOff);
  beacon.position.copy(V(tb.x + 350, tb.y + 745, zMast + 134));
  root.add(beacon);

  const pick = (obj: THREE.Object3D, y: number) => { let o: THREE.Object3D | null = obj; while (o) { const f = hits.get(o); if (f) return f(y); o = o.parent; } return null; };
  return { root, lamps, pick, beacon, center: [cx, cy] };
}

function mergeGeo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const pa = a.getAttribute('position').array, pb = b.getAttribute('position').array, out = new Float32Array(pa.length + pb.length);
  out.set(pa); out.set(pb, pa.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}
