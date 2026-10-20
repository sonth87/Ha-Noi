/* Potted plants with visible leaves (user feedback: "a blob, no plant"). Foliage is drawn in screen
   space around the projected top of the pot, so it reads the same from every view. Four kinds,
   picked by the house's seed: a leafy bush, upright blades (lưỡi hổ), a vine trailing down over
   the balcony edge (hoa giấy), and a bush in flower. */
import type { Ctx } from '@render/parts/ctx';
import { f } from '@render/svg';

type Kind = 'bush' | 'spiky' | 'vine' | 'flower';

const leaf = (x: number, y: number, rx: number, ry: number, deg: number) =>
  `<ellipse class="leaf" cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(deg)} ${f(x)} ${f(y)})"/>`;

function bush(x: number, y: number, s: number, r: () => number): string {
  let out = '';
  // a dome of leaves pointing outward, back row first
  for (let i = 0; i < 9; i++) {
    const t = -Math.PI * (0.08 + 0.84 * i / 8), rad = s * (0.75 + r() * 0.3);
    const lx = x + Math.cos(t) * rad * 0.9, ly = y - s * 0.6 + Math.sin(t) * rad * 0.75;
    out += leaf(lx, ly, s * 0.55, s * 0.26, (t * 180) / Math.PI);
  }
  out += leaf(x - s * 0.25, y - s * 0.75, s * 0.5, s * 0.25, -60) + leaf(x + s * 0.3, y - s * 0.7, s * 0.5, s * 0.25, -120);
  return out;
}

export function plant(c: Ctx, a: number, b: number, z: number, size: number, kind?: Kind): string {
  const [x, y] = c.D.P(a, b, z + 3), r = () => c.r.next();
  const k: Kind = kind ?? (['bush', 'spiky', 'vine', 'flower'] as const)[Math.floor(r() * 4)]!;
  const s = size;
  let out = '';
  if (k === 'spiky') {
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * s * 0.28, h = s * (1.7 + r() * 0.8), lean = dx * 0.6;
      out += `<path class="leaf" d="M${f(x + dx - 0.35)} ${f(y)}Q${f(x + dx + lean - 0.6)} ${f(y - h * 0.6)} ${f(x + dx + lean)} ${f(y - h)}Q${f(x + dx + lean + 0.6)} ${f(y - h * 0.6)} ${f(x + dx + 0.35)} ${f(y)}Z"/>`;
    }
  } else {
    out += bush(x, y, s, r);
    if (k === 'flower') for (let i = 0; i < 5; i++) out += `<circle class="flower" cx="${f(x + (r() - 0.5) * s * 1.5)}" cy="${f(y - s * (0.5 + r() * 0.7))}" r="${f(s * 0.16)}"/>`;
    if (k === 'vine') {
      // trails falling forward over the edge, small leaves along them
      for (let i = 0; i < 3; i++) {
        const sx = x + (i - 1) * s * 0.6, len = s * (2.2 + r() * 1.6);
        out += `<path class="vine" d="M${f(sx)} ${f(y - s * 0.2)}q${f(s * 0.4)} ${f(len * 0.5)} ${f((r() - 0.5) * s * 0.6)} ${f(len)}"/>`;
        for (let j = 1; j <= 3; j++) out += leaf(sx + (j % 2 ? 0.5 : -0.5) * s * 0.3, y - s * 0.2 + len * j / 3.4, s * 0.3, s * 0.15, j % 2 ? 30 : 150);
      }
    }
  }
  return out;
}

/** a pot with its plant, standing at (a, b, z) */
export function pot(c: Ctx, a: number, b: number, z: number, size: number, kind?: Kind): string {
  return c.D.box(a - 1.6, b - 1.6, z, 3.2, 3.2, 3, 0.8) + plant(c, a, b, z, size, kind);
}
