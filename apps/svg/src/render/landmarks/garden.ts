/* C3 · The two gardens on the Chùa Bộc side of the crossroads (user's photos 2026-10-21):
     circle  a round plaza with a flower bed in the middle, a ring path round it, paths out to
             every side and one to the junction corner, benches and lamps on the ring, trees on
             the lawns between;
     grove   a dense park: trees close together, one winding path from the junction corner, a few
             benches and lamps along it.
   Both have a low hedge round the edge (open where a path leaves). Garden lamps light at night.
   Plot-local a, b; the corner touching the junction is `toward`. Every tree, bench, lamp and
   hedge run is its own item, placed so no two boxes overlap. */
import type { Kernel } from '@iso/kernel';
import type { LocalFrame } from '@core/view';
import type { Item } from '@core/types';
import { TREE } from '@core/units';
import { rng } from '@core/rng';
import { LocalDraw } from '@render/local';
import { treeArt, type Size } from '@render/parts/trees';
import { ellipse, prism, type Pt } from '@render/landmarks/shapes';
import { f, g } from '@render/svg';

const HEDGE = 4, HEDGE_H = 5, CHAMFER = 140;

/** a park tree: drawing plus the half-extents of its box */
export function parkTree(D: LocalDraw, a: number, b: number, size: Size, r: () => number) {
  const k = TREE[size];
  return { svg: treeArt(D, a, b, 0, size, r), ra: k.ra, rb: k.rb, h: k.zc + k.rz };
}

type Seg = [number, number, number, number];   // a0 b0 a1 b1 of a path's centre line
const distSeg = (a: number, b: number, [a0, b0, a1, b1]: Seg) => {
  const da = a1 - a0, db = b1 - b0, t = Math.max(0, Math.min(1, ((a - a0) * da + (b - b0) * db) / (da * da + db * db || 1)));
  return Math.hypot(a - (a0 + da * t), b - (b0 + db * t));
};

export function renderGarden(K: Kernel, L: LocalFrame, kind: 'circle' | 'grove', w: number, d: number, toward: [-1 | 1, -1 | 1], id: string, seed: number): { items: Item[]; lamps: number } {
  const D = new LocalDraw(K, L), items: Item[] = [], r = rng(seed), rnd = () => r.next();
  const add = (iid: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `${id}:${iid}`, box: L.box(a, b, z, la, lb, h), svg });
  const corner: [number, number] = [toward[0] > 0 ? w : 0, toward[1] > 0 ? d : 0];
  const cornerEntry: [number, number] = [corner[0] - toward[0] * (CHAMFER / 2), corner[1] - toward[1] * (CHAMFER / 2)];
  const du = (a: number) => (toward[0] > 0 ? w - a : a);
  const dw = (b: number) => (toward[1] > 0 ? d - b : b);
  const inChamfer = (a: number, b: number, pad = 0) => du(a) + dw(b) < CHAMFER + pad;

  const ring: Pt[] = [];
  for (const [a, b] of [[0, 0], [w, 0], [w, d], [0, d]] as const) {
    if (a === corner[0] && b === corner[1]) {
      if ((a === 0 && b === 0) || (a === w && b === d)) ring.push([a, b - toward[1] * CHAMFER], [a - toward[0] * CHAMFER, b]);
      else ring.push([a - toward[0] * CHAMFER, b], [a, b - toward[1] * CHAMFER]);
    } else ring.push([a, b]);
  }
  const ground = (inner: string) => g(D.plane([0, 0, 0.05], [1, 0, 0], [0, 1, 0]), inner);

  // ---- layout of paths ----
  const ca = w / 2, cb = d / 2, R0 = 54, R1 = 96, R2 = 112, PW = 14;
  const segs: Seg[] = kind === 'circle'
    ? [[ca, cb, ca, 0], [ca, cb, ca, d], [ca, cb, 0, cb], [ca, cb, w, cb], [ca, cb, cornerEntry[0], cornerEntry[1]]]
    : winding(w, d, corner, cornerEntry);
  const onPath = (a: number, b: number, pad: number) =>
    segs.some(s => distSeg(a, b, s) < PW / 2 + pad) || (kind === 'circle' && Math.hypot(a - ca, b - cb) < R2 + pad);

  // ---- slab: chamfered lawn, paths, plaza ----
  {
    const pts = ring.map(p => `${f(p[0])},${f(p[1])}`).join(' ');
    let art = `<polygon class="lawn" points="${pts}"/>`;
    // butt ends, so a path stops flush with the plot's edge; round joints only inside the plot
    art += `<path class="path-paved" stroke-width="${PW}" d="${segs.map(s => `M${f(s[0])} ${f(s[1])}L${f(s[2])} ${f(s[3])}`).join('')}"/>`;
    const inside = (a: number, b: number) => a > 0.5 && a < w - 0.5 && b > 0.5 && b < d - 0.5 && !inChamfer(a, b, 2);
    for (const sg of segs) for (const [a, b] of [[sg[0], sg[1]], [sg[2], sg[3]]] as const) if (inside(a, b)) art += `<circle class="path-fill" cx="${f(a)}" cy="${f(b)}" r="${PW / 2}"/>`;
    if (kind === 'circle') {
      art += `<circle class="path-fill" cx="${ca}" cy="${cb}" r="${R2}"/><circle class="lawn" cx="${ca}" cy="${cb}" r="${R1}"/>`;
      art += `<circle class="path-fill" cx="${ca}" cy="${cb}" r="${R0}"/>`;
      // spokes cross the inner lawn ring to the plaza
      art += `<path class="path-paved" stroke-width="${PW}" d="${segs.map(s => { const dx = s[2] - s[0], dy = s[3] - s[1], n = Math.hypot(dx, dy); return `M${f(ca + dx / n * (R0 - 2))} ${f(cb + dy / n * (R0 - 2))}L${f(ca + dx / n * (R2 + 2))} ${f(cb + dy / n * (R2 + 2))}`; }).join('')}"/>`;
      art += `<circle class="path-edge" cx="${ca}" cy="${cb}" r="${R0}"/><circle class="path-edge" cx="${ca}" cy="${cb}" r="${R1}"/><circle class="path-edge" cx="${ca}" cy="${cb}" r="${R2}"/>`;
    }
    // grass texture: short strokes scattered on the lawn
    let tufts = '';
    for (let i = 0; i < (w * d) / 260; i++) {
      const a = rnd() * w, b = rnd() * d;
      if (!onPath(a, b, 2) && !inChamfer(a, b, 4)) tufts += `M${f(a)} ${f(b)}l1.2 -2.2M${f(a + 1.6)} ${f(b)}l.6 -2`;
    }
    art += `<path class="tuft" d="${tufts}"/>`;
    add('slab', 0, 0, -6, w, d, 6, D.box(0, 0, -6, w, d, 6) + ground(art));
  }

  // ---- hedge round the edge, cut into runs, open where a path leaves or at the chamfered corner ----
  const edges: [number, number, number, number][] = [[0, 0, w, 0], [0, d - HEDGE, w, d - HEDGE], [0, HEDGE, 0, d - HEDGE], [w - HEDGE, HEDGE, w - HEDGE, d - HEDGE]];
  edges.forEach(([a0, b0, a1, b1], ei) => {
    const along = a1 > a0, len = along ? a1 - a0 : b1 - b0;
    let start: number | null = null, n = 0;
    const flush = (end: number) => {
      if (start === null || end - start < 6) { start = null; return; }
      const [a, b, la, lb] = along ? [a0 + start, b0, end - start, HEDGE] : [a0, b0 + start, HEDGE, end - start];
      add(`hedge-${ei}-${n++}`, a, b, 0, la, lb, HEDGE_H, D.box(a, b, 0, la, lb, HEDGE_H, 1.5));
      start = null;
    };
    for (let t = 0; t <= len; t += 2) {
      const [a, b] = along ? [a0 + t, b0 + HEDGE / 2] : [a0 + HEDGE / 2, b0 + t];
      if (onPath(a, b, 3) || inChamfer(a, b, 2)) { flush(t); continue; }
      if (start === null) start = t;
      else if (t - start >= 60) { flush(t); start = t; }
    }
    flush(len);
  });

  // ---- centre of the circle: a raised flower bed in two tiers ----
  if (kind === 'circle') {
    const outer = ellipse(ca, cb, 30, 30, 36), inner = ellipse(ca, cb, 17, 17, 28);
    let s = prism(D, outer, 0, 4) + prism(D, inner, 4, 9);
    let dots = '';
    for (let i = 0; i < 70; i++) {
      const t = rnd() * 2 * Math.PI, rr = (i < 40 ? 19 + rnd() * 9 : rnd() * 14);
      const p = D.P(ca + rr * Math.cos(t), cb + rr * Math.sin(t), i < 40 ? 4.6 : 9.6);
      dots += `<circle class="flower" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(0.8 + rnd() * 0.6)}"/>`;
    }
    s += dots;
    add('bed', ca - 30, cb - 30, 0, 60, 60, 9.6, s);
  }

  // ---- benches and lamps: on the ring (circle) or beside the path (grove) ----
  const spots: [number, number][] = [];
  if (kind === 'circle') {
    for (let k = 0; k < 8; k++) { const t = (k + 0.5) * Math.PI / 4; spots.push([ca + (R1 + R2) / 2 * Math.cos(t), cb + (R1 + R2) / 2 * Math.sin(t)]); }
  } else {
    for (const s of segs) for (const t of [0.3, 0.75]) spots.push([s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t]);
  }
  let lamps = 0;
  spots.forEach(([a, b], i) => {
    if (inChamfer(a, b, 10)) return;
    if (i % 2 === 0) {
      // lamp: a slim post and a globe
      const z = 30, p = D.P(a, b, z + 2.2);
      const s = D.box(a - 0.7, b - 0.7, 0, 1.4, 1.4, z) +
        `<g class="lamp" data-night="1"><circle class="halo" cx="${f(p[0])}" cy="${f(p[1])}" r="9" filter="url(#bloom)"/><circle class="bulb" cx="${f(p[0])}" cy="${f(p[1])}" r="2.2"/></g>`;
      add(`lamp-${i}`, a - 2.2, b - 2.2, 0, 4.4, 4.4, z + 4.4, s);
      lamps++;
    } else {
      // bench: seat on two legs, a back rail
      const s = D.box(a - 6, b - 2, 0, 1, 4, 2.6) + D.box(a + 5, b - 2, 0, 1, 4, 2.6) + D.box(a - 6, b - 2, 2.6, 12, 4, 1) + D.box(a - 6, b - 2.4, 3.6, 12, 0.8, 3);
      add(`bench-${i}`, a - 6, b - 2.4, 0, 12, 4.4, 6.6, s);
    }
  });

  // ---- trees: a jittered grid over the lawns, off the paths and clear of the hedge and chamfer ----
  const sizes: Size[] = kind === 'circle' ? ['large', 'medium', 'large'] : ['large', 'large', 'medium'];
  const big = TREE.large;
  const stepA = 2 * big.ra + 4, stepB = kind === 'circle' ? 34 : 24;
  const kept: [number, number, number, number][] = [];
  let n = 0;
  for (let b = big.rb + HEDGE + 4; b < d - big.rb - HEDGE - 4; b += stepB) {
    const shift = (Math.round(b / stepB) % 2) * stepA / 2;
    for (let a = big.ra + HEDGE + 4 + shift; a < w - big.ra - HEDGE - 4; a += stepA) {
      const size = sizes[Math.floor(rnd() * sizes.length)]!, k = TREE[size];
      const ta = a + (rnd() - 0.5) * 6, tb = b + (rnd() - 0.5) * 4;
      if (kind === 'circle' && rnd() < 0.18) continue;
      if (onPath(ta, tb, k.ra * 0.8 + 4) || inChamfer(ta, tb, k.ra + k.rb + 6)) continue;
      const box: [number, number, number, number] = [ta - k.ra, tb - k.rb, ta + k.ra, tb + k.rb];
      if (kept.some(q => box[0] < q[2] && q[0] < box[2] && box[1] < q[3] && q[1] < box[3])) continue;
      kept.push(box);
      const t = parkTree(D, ta, tb, size, rnd);
      add(`tree-${n++}`, box[0], box[1], 0, 2 * k.ra, 2 * k.rb, t.h, t.svg);
    }
  }
  return { items, lamps };
}

/** the grove's path: from the chamfered junction corner, bending through the park to the far side */
function winding(w: number, d: number, corner: [number, number], entry: [number, number]): Seg[] {
  const sa = corner[0] === 0 ? 1 : -1, sb = corner[1] === 0 ? 1 : -1;
  const P = (u: number, v: number): [number, number] => [corner[0] + sa * u * w, corner[1] + sb * v * d];
  const pts = [entry, P(0.32, 0.36), P(0.5, 0.42), P(0.7, 0.66), P(1, 0.74)];
  const branch = [P(0.5, 0.42), P(0.36, 1)];
  const out: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push([...pts[i]!, ...pts[i + 1]!]);
  out.push([...branch[0]!, ...branch[1]!]);
  return out;
}
