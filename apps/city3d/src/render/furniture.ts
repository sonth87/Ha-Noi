/* Street furniture in 3D (M5, ADR-037), from core's streetFurniture: poles with crossarms, lamp
   posts and lamps on poles (their heads light at night: lamp "street/lamps"), traffic signal posts
   (three lights per head, lamps "signal/<group>/<stop|wait|go>", lit by the view from the signal
   phase), pools of light on the ground under the lamps (shown at night in the dark theme), trees in two looks (full: trunk and a two-tier crown with outlines; simple: one crown,
   no lines), and the wires between poles as sagging strands. Built per 64 m cell so the view can
   drop far cells (view distance). Pure. */
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { hash, type Furniture, type Prop, type Vec2 } from '@my-city/core';
import { V, Batch } from './batch';
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

export const STREET_LAMPS = 'street/lamps';
export const signalLamp = (group: 'x' | 'y', light: 'stop' | 'wait' | 'go') => `signal/${group}/${light}`;

const POLE_H = 8.5;

export function buildFurniture(f: Furniture, size = 64): FurnitureCell[] {
  const cellOf = (p: Vec2) => `${Math.floor(p[0] / size)},${Math.floor(p[1] / size)}`;
  const byId = new Map(f.props.map(p => [p.id, p]));
  const cells = new Map<string, { poles: Batch; fixtures: Batch; trees: Batch; simple: Batch; wires: number[]; pools: number[] }>();
  const cell = (p: Vec2) => { const k = cellOf(p); let c = cells.get(k); if (!c) cells.set(k, (c = { poles: new Batch(), fixtures: new Batch(), trees: new Batch(), simple: new Batch(), wires: [], pools: [] })); return c; };

  for (const p of f.props) {
    const c = cell(p.at);
    switch (p.kind) {
      case 'pole': pole(c.poles, p); break;
      case 'lamp': lampPost(c.fixtures, p, c.pools); break;
      case 'lamp-on-pole': lampHead(c.poles, p, p.z0 + 6.6, 1.3, c.pools); break;
      case 'signal': signal(c.fixtures, p); break;
      case 'tree': tree(c.trees, p, true); tree(c.simple, p, false); break;
      case 'park-lamp': parkLamp(c.fixtures, p, c.pools); break;
    }
  }
  for (const w of f.wires) {
    const a = byId.get(w.from), b = byId.get(w.to);
    if (a && b) wire(cell(a.at).wires, a, b, w.strands);
  }

  return [...cells].map(([k, c]) => {
    const [i, j] = k.split(',').map(Number) as [number, number];
    return {
      id: k, center: [(i + 0.5) * size, (j + 0.5) * size] as [number, number],
      poles: layerOf(c.poles), fixtures: layerOf(c.fixtures), trees: layerOf(c.trees), simpleTrees: layerOf(c.simple, false),
      wires: new LineSegmentsGeometry().setPositions(c.wires.length ? c.wires : [0, 0, 0, 0, 0, 0]),
      pools: poolGeometry(c.pools),
    };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
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
function lampPost(B: Batch, p: Prop, pools: number[]) {
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
function parkLamp(B: Batch, p: Prop, pools: number[]) {
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
    B.window(signalLamp(p.group ?? 'x', light), [pt(-r, zc - r), pt(r, zc - r), pt(r, zc + r), pt(-r, zc + r)], n);
  });
}

/** a street tree: full = a trunk and a two-tier lumpy crown with outlines; simple = one crown */
function tree(B: Batch, p: Prop, full: boolean) {
  const big = p.size === 'large', r = big ? 2.4 : 1.7, base = p.z0 + (big ? 2.4 : 2), h = big ? 3.6 : 2.8;
  const k = hash(p.id) % 5, oct = (rr: number, dx = 0, dy = 0): Vec2[] => Array.from({ length: 8 }, (_, i) => [p.at[0] + dx + rr * Math.cos((i * Math.PI) / 4 + k * 0.2), p.at[1] + dy + rr * Math.sin((i * Math.PI) / 4 + k * 0.2)] as const);
  if (full) {
    box(B, p.at, 0, 0.14, 0.14, p.z0, base + 0.5, 'plant');
    B.solid(oct(r), base, base + h * 0.6, () => 'plant', 'plant');
    B.solid(oct(r * 0.7, (k - 2) * 0.15, (2 - k) * 0.12), base + h * 0.6, base + h, () => 'plant', 'plant');
  } else {
    B.flatSolid(oct(r), base, base + h, 'plant');
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
function poolGeometry(spots: number[]): THREE.BufferGeometry {
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
