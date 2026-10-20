/* Potted plants on balconies, terraces and roofs: taller than the railing and of several kinds
   (user feedback: "small and ugly, a blob"). Drawn in screen space above the projected pot, so
   they read the same from every view; the kind comes from the house's seed unless given.
     bush        cây bụi            a leafy clump
     money       kim tiền           three stems, each ending in a fan of glossy leaves
     bamboo      trúc               tall thin canes with small leaves along them
     palm        cau cảnh           arching fronds with leaflets
     bougain     hoa giấy           a mass of leaves and flowers spilling forward over the rail
     flower      bụi hoa            a clump dotted with flowers                                  */
import type { Ctx } from '@render/parts/ctx';
import { f } from '@render/svg';
import { blade, clump } from '@render/parts/foliage';

export type PlantKind = 'bush' | 'money' | 'bamboo' | 'palm' | 'bougain' | 'flower';
const KINDS: PlantKind[] = ['bush', 'money', 'bamboo', 'palm', 'bougain', 'flower'];

/** tallest a potted plant gets above its pot's foot (keep balconies' item boxes above this) */
export const PLANT_MAX_H = 16;

export function plant(c: Ctx, a: number, b: number, z: number, size: number, kind?: PlantKind): string {
  const r = () => c.r.next();
  const k = kind ?? KINDS[Math.floor(r() * KINDS.length)]!;
  const [x, y] = c.D.P(a, b, z + 4), s = size;   // pot rim
  let out = '';
  switch (k) {
    case 'bush':
      out += clump(x, y - s * 1.1, s * 1.25, s * 1.05, r, 'plant');
      break;
    case 'flower': {
      out += clump(x, y - s * 1.0, s * 1.2, s * 0.95, r, 'plant');
      for (let i = 0; i < 7; i++) out += `<circle class="flower" cx="${f(x + (r() - 0.5) * s * 1.9)}" cy="${f(y - s * (0.4 + r() * 1.3))}" r="${f(s * 0.14 + 0.15)}"/>`;
      break;
    }
    case 'money': {
      // kim tiền: three stems fanning out, each with paired glossy leaves up its top half
      for (let i = -1; i <= 1; i++) {
        const tx = x + i * s * 0.9, ty = y - s * (2.8 + (i === 0 ? 0.7 : 0) + r() * 0.3);
        out += `<path class="stem" d="M${f(x + i * 0.4)} ${f(y)}Q${f(x + i * s * 0.3)} ${f((y + ty) / 2)} ${f(tx)} ${f(ty)}"/>`;
        for (let j = 0; j < 4; j++) {
          const py = ty + j * s * 0.45, px = tx - i * j * s * 0.08;
          out += blade(px, py, s * 0.9, -150 + i * 12) + blade(px, py, s * 0.9, -30 + i * 12);
        }
        out += blade(tx, ty, s * 0.8, -90);
      }
      break;
    }
    case 'bamboo': {
      for (let i = 0; i < 5; i++) {
        const sx = x + (i - 2) * s * 0.32, h = s * (3 + r() * 1.1), lean = (i - 2) * s * 0.18;
        out += `<path class="stem" d="M${f(sx)} ${f(y)}L${f(sx + lean)} ${f(y - h)}"/>`;
        for (let j = 1; j <= 4; j++) {
          const t = j / 4.6, px = sx + lean * t, py = y - h * t;
          out += blade(px, py, s * 0.55, j % 2 ? -25 : -155, 0.25);
        }
      }
      break;
    }
    case 'palm': {
      // cau cảnh: arching fronds from the pot, leaflets along each
      for (let i = 0; i < 6; i++) {
        const ang = -160 + i * 28 + (r() - 0.5) * 8, len = s * (2.6 + r() * 0.8), t = (ang * Math.PI) / 180;
        const ex = x + Math.cos(t) * len, ey = y - s * 1.2 + Math.sin(t) * len * 0.8;
        const cx = x + Math.cos(t) * len * 0.5, cy = y - s * 3.2;
        out += `<path class="stem" d="M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}"/>`;
        for (let j = 1; j <= 4; j++) {
          const u = j / 5, px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex, py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ey;
          out += blade(px, py, s * 0.5, ang + 60, 0.22) + blade(px, py, s * 0.5, ang - 60 + 180, 0.22);
        }
      }
      break;
    }
    case 'bougain': {
      // hoa giấy: a leafy mass leaning forward and down over the rail, flowers on it
      out += clump(x + s * 0.4, y - s * 0.9, s * 1.5, s * 1.1, r, 'plant');
      out += clump(x + s * 1.2, y + s * 0.5, s * 0.9, s * 1.2, r, 'plant');
      for (let i = 0; i < 10; i++) out += `<circle class="flower" cx="${f(x + s * (r() * 2.4 - 0.6))}" cy="${f(y + s * (r() * 2 - 1.6))}" r="${f(s * 0.13 + 0.15)}"/>`;
      break;
    }
  }
  return out;
}

/** a pot with its plant, standing at (a, b, z); taller plants get a bigger pot */
export function pot(c: Ctx, a: number, b: number, z: number, size: number, kind?: PlantKind): string {
  return c.D.box(a - 2, b - 2, z, 4, 4, 4, 1) + plant(c, a, b, z, size, kind);
}
