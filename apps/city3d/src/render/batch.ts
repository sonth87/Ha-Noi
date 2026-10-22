/* Batch: gathers the whole city's geometry into a few big buffers, one per material, so the scene
   is a handful of draw calls however many buildings it has (roadmap R4). Also gathers the line tiers
   (silhouette shell, crease edges, detail lines) and the lit things (windows) with per-vertex
   colours, so one floor can be lit by rewriting its slice of the colour buffer.

   Coordinates: the city model's metres (x east, y south, z up) map to three.js as (x, z, y)
   (docs/architecture/city-model.md §1). Pure: builds geometry, touches no DOM. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { normalizeRing, type Vec2 } from '@my-city/core';

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, z, y);

/** surfaces, by what they are; the materials (from theme tokens) are chosen per key */
export type Surface = 'ground' | 'wall' | 'roof' | 'glass' | 'road' | 'walk' | 'marking' | 'grass' | 'water' | 'pitch' | 'plaza' | 'metal' | 'awning' | 'plant';

/** a range of window vertices that light together */
export interface LampRange { start: number; count: number }

export class Batch {
  readonly tris = new Map<Surface, number[]>();
  /** silhouette shell: positions + smooth normals */
  readonly shell: { pos: number[]; nrm: number[] } = { pos: [], nrm: [] };
  readonly creases: number[] = [];
  readonly details: number[] = [];
  /** windows: positions, and the lamp each vertex belongs to */
  readonly win: number[] = [];
  readonly lamps = new Map<string, LampRange[]>();
  /** lamp id → its windows' outline segments in `details` (start, count in segments; 4 a window) */
  readonly lampLines = new Map<string, LampRange[]>();
  /** triangle ranges of the solid surfaces per owner (for picking), in order of `ownerTris` */
  readonly owners: { surface: Surface; start: number; end: number; owner: string }[] = [];

  private list(s: Surface) { let l = this.tris.get(s); if (!l) this.tris.set(s, (l = [])); return l; }

  /** push a triangle facing along n */
  tri(s: Surface, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3, out = this.list(s)) {
    const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).dot(n) >= 0;
    const [p, q, r] = f ? [a, b, c] : [a, c, b];
    out.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
  }

  quad(s: Surface, p: THREE.Vector3[], n: THREE.Vector3, out = this.list(s)) { this.tri(s, p[0]!, p[1]!, p[2]!, n, out); this.tri(s, p[0]!, p[2]!, p[3]!, n, out); }

  /** a flat polygon at height z, facing up */
  flat(s: Surface, ring: readonly Vec2[], z: number, outline?: 'crease' | 'detail', owner?: string) {
    const R = normalizeRing(ring);
    if (R.length < 3) return;
    const up = new THREE.Vector3(0, 1, 0);
    const start = this.list(s).length / 9;
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(R.map(p => new THREE.Vector2(p[0], p[1])), [])) this.tri(s, V(...R[a!]!, z), V(...R[b!]!, z), V(...R[c!]!, z), up);
    if (owner) this.owners.push({ surface: s, start, end: this.list(s).length / 9, owner });
    if (outline) this.loop(R.map(p => V(p[0], p[1], z + 0.01)), outline);
  }

  /** Walls and top of a prism over any simple ring; with its silhouette shell and crease lines.
      `wall(i)` picks each wall's surface (edge i → i+1). `owner` tags it for picking.
      The lines and shell are worked out directly (what EdgesGeometry and mergeVertices would give
      for a prism, ADR-042): the bottom and top loops, an upright edge at every corner turning more
      than 20°, and per-corner normals averaged over the faces meeting there. Thousands of small
      boxes (balconies, pots, tanks) stay cheap. */
  solid(ring: readonly Vec2[], z0: number, z1: number, wall: (i: number) => Surface = () => 'wall', top: Surface = 'roof', owner?: string) {
    const R = normalizeRing(ring), n = R.length;
    if (n < 3 || z1 <= z0) return;
    const mark = (s: Surface, fn: () => void) => {
      const start = this.list(s).length / 9;
      fn();
      if (owner) this.owners.push({ surface: s, start, end: this.list(s).length / 9, owner });
    };
    const nrm = R.map((p, i) => { const q = R[(i + 1) % n]!; return new THREE.Vector3(q[1] - p[1], 0, -(q[0] - p[0])).normalize(); });
    const up = new THREE.Vector3(0, 1, 0);
    // corner normals: the two walls (and the top, for the top corners)
    const corner = (i: number, withTop: boolean) => { const v = nrm[i]!.clone().add(nrm[(i - 1 + n) % n]!); if (withTop) v.add(up); return v.normalize(); };
    const sh = this.shell;
    const pushShell = (pts: THREE.Vector3[], ns: THREE.Vector3[]) => { for (let k = 0; k < 3; k++) { sh.pos.push(pts[k]!.x, pts[k]!.y, pts[k]!.z); sh.nrm.push(ns[k]!.x, ns[k]!.y, ns[k]!.z); } };
    R.forEach((p, i) => {
      const j = (i + 1) % n, q = R[j]!;
      const pts = [V(p[0], p[1], z0), V(q[0], q[1], z0), V(q[0], q[1], z1), V(p[0], p[1], z1)];
      const s = wall(i);
      mark(s, () => this.quad(s, pts, nrm[i]!));
      const ns = [corner(i, false), corner(j, false), corner(j, true), corner(i, true)];
      pushShell([pts[0]!, pts[1]!, pts[2]!], [ns[0]!, ns[1]!, ns[2]!]);
      pushShell([pts[0]!, pts[2]!, pts[3]!], [ns[0]!, ns[2]!, ns[3]!]);
      // bottom and top edges, and the upright at this corner when it turns
      this.creases.push(pts[0]!.x, pts[0]!.y, pts[0]!.z, pts[1]!.x, pts[1]!.y, pts[1]!.z, pts[3]!.x, pts[3]!.y, pts[3]!.z, pts[2]!.x, pts[2]!.y, pts[2]!.z);
      if (nrm[i]!.dot(nrm[(i - 1 + n) % n]!) < Math.cos((20 * Math.PI) / 180)) this.creases.push(pts[0]!.x, pts[0]!.y, pts[0]!.z, pts[3]!.x, pts[3]!.y, pts[3]!.z);
    });
    mark(top, () => {
      for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(R.map(p => new THREE.Vector2(p[0], p[1])), [])) {
        const t = [V(...R[a!]!, z1), V(...R[b!]!, z1), V(...R[c!]!, z1)];
        this.tri(top, t[0]!, t[1]!, t[2]!, up);
        pushShell(t, [corner(a!, true), corner(b!, true), corner(c!, true)]);
      }
    });
  }

  /** a prism with no lines at all (simple trees, far things) */
  flatSolid(ring: readonly Vec2[], z0: number, z1: number, s: Surface) {
    const R = normalizeRing(ring), n = R.length;
    if (n < 3 || z1 <= z0) return;
    R.forEach((p, i) => {
      const q = R[(i + 1) % n]!, nrm = new THREE.Vector3(q[1] - p[1], 0, -(q[0] - p[0])).normalize();
      this.quad(s, [V(p[0], p[1], z0), V(q[0], q[1], z0), V(q[0], q[1], z1), V(p[0], p[1], z1)], nrm);
    });
    const up = new THREE.Vector3(0, 1, 0);
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(R.map(p => new THREE.Vector2(p[0], p[1])), [])) this.tri(s, V(...R[a!]!, z1), V(...R[b!]!, z1), V(...R[c!]!, z1), up);
  }

  /** a solid made from any triangles: crease lines and silhouette from the same triangles */
  edgesOf(pos: number[], angle = 20) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const e = new THREE.EdgesGeometry(g, angle).attributes.position!.array;
    for (let i = 0; i < e.length; i++) this.creases.push(e[i]!);
    const m = mergeVertices(g, 1e-4);
    m.computeVertexNormals();
    const flatG = m.toNonIndexed(), P = flatG.attributes.position!.array, N = flatG.attributes.normal!.array;
    for (let i = 0; i < P.length; i++) { this.shell.pos.push(P[i]!); this.shell.nrm.push(N[i]!); }
  }

  /** a thin panel (awning, glass rail, roof sheet): one quad, seen from both sides, outlined */
  panel(s: Surface, p: THREE.Vector3[], n: THREE.Vector3) {
    this.quad(s, p, n);
    this.loop(p, 'crease');
  }

  /** a line segment in a tier */
  line(a: THREE.Vector3, b: THREE.Vector3, tier: 'crease' | 'detail' = 'detail') {
    (tier === 'crease' ? this.creases : this.details).push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  /** a closed loop of line segments */
  loop(pts: THREE.Vector3[], tier: 'crease' | 'detail') {
    const out = tier === 'crease' ? this.creases : this.details;
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]!; out.push(a.x, a.y, a.z, b.x, b.y, b.z); });
  }

  /** a window quad (4 corners, facing n) that lights with `lamp`; its outline as a detail line */
  window(lamp: string, p: THREE.Vector3[], n: THREE.Vector3) {
    const start = this.win.length / 3;
    const tmp: number[] = [];
    this.quad('wall', p, n, tmp);
    this.win.push(...tmp);
    const r = this.lamps.get(lamp) ?? [];
    const last = r[r.length - 1];
    if (last && last.start + last.count === start) last.count += 6; else r.push({ start, count: 6 });
    this.lamps.set(lamp, r);
    const s0 = this.details.length / 6, rl = this.lampLines.get(lamp) ?? [], ll = rl[rl.length - 1];
    this.loop(p, 'detail');
    if (ll && ll.start + ll.count === s0) ll.count += 4; else rl.push({ start: s0, count: 4 });
    this.lampLines.set(lamp, rl);
  }
}
