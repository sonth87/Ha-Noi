/* Frame a scene: pass its extreme 3D corners (including the tallest point); returns the kernel
   with its origin placed so the drawing sits in a viewBox padded to the given aspect.
   Ported from iso-glow (MIT). */
import { C, S, kernel, type Kernel, type Vec3 } from '@iso/kernel';

export interface Frame extends Kernel {
  readonly viewBox: string;
  readonly W: number;
  readonly H: number;
}

export function frame(points: readonly Vec3[], margin = 0.09, aspect = 4 / 3): Frame {
  const d = points.map(([x, y, z]) => [(x - y) * C, (x + y) * S - z] as const);
  const x0 = Math.min(...d.map(p => p[0])), x1 = Math.max(...d.map(p => p[0]));
  const y0 = Math.min(...d.map(p => p[1])), y1 = Math.max(...d.map(p => p[1]));
  const m = margin * Math.max(x1 - x0, y1 - y0);
  let w = x1 - x0 + 2 * m, h = y1 - y0 + 2 * m;
  let ox = m - x0, oy = m - y0;
  if (w / h < aspect) { const nw = h * aspect; ox += (nw - w) / 2; w = nw; }
  else { const nh = w / aspect; oy += (nh - h) / 2; h = nh; }
  return { ...kernel(ox, oy), viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`, W: w, H: h };
}
