/* Painter's order for iso boxes (docs/architecture/overview.md §7, ADR-007).

   Two boxes only need ordering when their projected hexagons overlap. An iso hexagon has edges
   along the images of the x, y and z axes, so the separating-axis test needs three ranges:
   x − y, x − z and y − z (screen x = (x − y)·cos30°, and the two edge normals reduce to these).
   For an overlapping pair, A goes first when it lies wholly behind B on some axis
   (A.x1 ≤ B.x0, A.y1 ≤ B.y0 or A.z1 ≤ B.z0). Kahn's algorithm then orders the graph, keeping
   input order among equals; a cycle (only possible for interpenetrating boxes) is broken by
   the smallest x + y + z and reported. */
import type { Box3 } from '@core/types';

const EPS = 1e-6;

function ranges(b: Box3) {
  const x1 = b.x + b.w, y1 = b.y + b.d, z1 = b.z + b.h;
  return { xy: [b.x - y1, x1 - b.y], xz: [b.x - z1, x1 - b.z], yz: [b.y - z1, y1 - b.z] } as const;
}

const apart = (a: readonly [number, number], b: readonly [number, number]) => a[1] <= b[0] + EPS || b[1] <= a[0] + EPS;

/** Do the two boxes' projections overlap with positive area? */
export function screenOverlap(a: Box3, b: Box3): boolean {
  const ra = ranges(a), rb = ranges(b);
  return !(apart(ra.xy, rb.xy) || apart(ra.xz, rb.xz) || apart(ra.yz, rb.yz));
}

/** -1: a first · 1: b first · 0: no strict separation (interpenetrating) */
export function behind(a: Box3, b: Box3): -1 | 0 | 1 {
  if (a.x + a.w <= b.x + EPS || a.y + a.d <= b.y + EPS || a.z + a.h <= b.z + EPS) return -1;
  if (b.x + b.w <= a.x + EPS || b.y + b.d <= a.y + EPS || b.z + b.h <= a.z + EPS) return 1;
  return 0;
}

export interface DepthResult<T> {
  order: T[];
  /** pairs that could not be ordered strictly, and cycles broken */
  warnings: string[];
}

/** Broad phase: bucket every box's screen bounds (sx = x − y, sy = (x + y)/2 − z) into a grid and
    only pair boxes sharing a cell. Pairs come out with i < j, each once; the exact test follows. */
function candidatePairs(items: readonly { box: Box3 }[]): [number, number][] {
  const n = items.length;
  if (n < 64) {
    const all: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) all.push([i, j]);
    return all;
  }
  const CELL = 64, cells = new Map<number, number[]>(), spans: [number, number, number, number][] = [];
  for (const { box: b } of items) {
    const sx0 = b.x - (b.y + b.d), sx1 = b.x + b.w - b.y;
    const sy0 = (b.x + b.y) / 2 - (b.z + b.h), sy1 = (b.x + b.w + b.y + b.d) / 2 - b.z;
    spans.push([Math.floor(sx0 / CELL), Math.floor(sx1 / CELL), Math.floor(sy0 / CELL), Math.floor(sy1 / CELL)]);
  }
  const key = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);
  spans.forEach(([x0, x1, y0, y1], i) => {
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const k = key(cx, cy);
      let c = cells.get(k);
      if (!c) cells.set(k, (c = []));
      c.push(i);
    }
  });
  const out: [number, number][] = [], seen = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const [x0, x1, y0, y1] = spans[i]!;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++)
      for (const j of cells.get(key(cx, cy))!) if (j > i && seen[j] !== i) { seen[j] = i; out.push([i, j]); }
  }
  // same order as the plain double loop, so equal inputs give equal graphs and orders
  return out.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

export function depthSort<T extends { id: string; box: Box3 }>(items: readonly T[]): DepthResult<T> {
  const n = items.length, warnings: string[] = [];
  const after: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  for (const [i, j] of candidatePairs(items)) {
    {
      const a = items[i]!.box, b = items[j]!.box;
      if (!screenOverlap(a, b)) continue;
      let rel = behind(a, b);
      if (rel === 0) {
        warnings.push(`intersecting: ${items[i]!.id} / ${items[j]!.id}`);
        rel = a.x + a.y + a.z <= b.x + b.y + b.z ? -1 : 1;
      }
      if (rel < 0) { after[i]!.push(j); indeg[j]!++; } else { after[j]!.push(i); indeg[i]!++; }
    }
  }
  const order: T[] = [], done = new Array<boolean>(n).fill(false);
  // ready set kept sorted by input index, so equal items keep their input order
  const ready: number[] = [];
  const pushReady = (i: number) => {
    let lo = 0, hi = ready.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ready[mid]! < i) lo = mid + 1; else hi = mid; }
    ready.splice(lo, 0, i);
  };
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
  while (order.length < n) {
    let pick = ready.shift();
    if (pick === undefined) {
      // cycle: take the remaining item nearest the back
      let best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i]) { const b = items[i]!.box, s = b.x + b.y + b.z; if (s < best) { best = s; pick = i; } }
      warnings.push(`cycle broken at ${items[pick!]!.id}`);
      indeg[pick!] = 0;
    }
    const p = pick!;
    done[p] = true;
    order.push(items[p]!);
    for (const j of after[p]!) if (!done[j] && --indeg[j]! === 0) pushReady(j);
  }
  return { order, warnings };
}
