/* Ground floor face (FR-04): shutters, glass, wood, wall; side sign panels, barber pole and
   A5 stickers live on this face too. Plus the awning item (FR-09). Ported from the reference house. */
import { slits } from '@iso/kernel';
import type { Ctx } from '@render/parts/ctx';
import { sill, win } from '@render/parts/windows';
import { sidePanels, barberPole, sticker } from '@render/parts/signs';
import { f, g } from '@render/svg';

/** lights + fixed extras for the ground floor's street face, width W */
export function groundFace(c: Ctx, W: number): { lights: string; extra: string } {
  // H: the ground floor proper; a semi-basement band (c.base) sits below it on the same face
  const { s } = c, H = s.groundH - c.base, v = () => c.v();
  const panels = s.signs.find(x => x.type === 'side-panels');
  const x0 = panels ? 8 : 0, x1 = W - x0, ow = x1 - x0, top = 11, bot = H - 0.5;
  let lights = '', extra = '';

  switch (s.ground) {
    case 'fold': {
      if (s.shop) {
        lights = win(v, x0 + 7, top, ow - 14, bot - top);
        extra = `<path class="detail" d="M${f(x0 + 8)} 20H${f(x1 - 8)}M${f(x0 + 8)} 27H${f(x1 - 8)}M${f(x0 + 8)} 33H${f(x0 + ow * 0.45)}"/>` +
          `<rect class="face" x="${f(x0 + ow * 0.5)}" y="29" width="${f(ow * 0.3)}" height="${f(bot - 29)}"/>` +
          `<rect class="face recess" x="${f(x0 + 3)}" y="${top}" width="4" height="${f(bot - top)}"/>${slits(x0 + 3.5, x0 + 6.5, 0.75, top, bot)}` +
          `<rect class="face recess" x="${f(x1 - 7)}" y="${top}" width="4" height="${f(bot - top)}"/>${slits(x1 - 6.5, x1 - 3.5, 0.75, top, bot)}`;
      } else {
        extra = `<rect class="face recess" x="${f(x0 + 3)}" y="${top}" width="${f(ow - 6)}" height="${f(bot - top)}"/>${slits(x0 + 3.5, x1 - 3.5, 0.9, top, bot)}`;
        lights = win(v, x0 + ow * 0.35, 3, ow * 0.3, 5);   // transom: someone is home
      }
      break;
    }
    case 'roll': {
      const dw = Math.min(ow - 4, Math.max(17, ow - 8)), dx = x0 + (ow - dw) / 2, cut = s.shop ? 18 : bot;
      if (s.shop) lights = win(v, dx, cut, dw, bot - cut);
      else lights = win(v, x0 + ow * 0.35, 1.2, ow * 0.3, 1.8);
      extra = `<rect class="face recess" x="${f(dx)}" y="5" width="${f(dw)}" height="${f(cut - 5)}"/>${slits(6.5, cut - 1.5, 1.4, dx, dx + dw, false)}` +
        `<rect class="face" x="${f(dx - 0.5)}" y="3" width="${f(dw + 1)}" height="3"/>`;
      break;
    }
    case 'glass': {
      const dw = ow * 0.36, wx = x0 + ow * 0.64, ww = ow * 0.26;
      lights = win(v, x0 + 4, 9, dw, bot - 9) + win(v, wx, 11, ww, 15);
      extra = `<path class="mull" d="M${f(x0 + 4 + dw / 2)} 9V${f(bot)}M${f(wx)} 18.5H${f(wx + ww)}"/>` + sill(wx, 26.8, ww);
      break;
    }
    case 'wood': {
      const n = 4, gw = (ow - 8) / n;
      for (let i = 0; i < n; i++) lights += win(v, x0 + 4 + i * gw + 0.4, 10, gw - 0.8, 9);
      extra = `<rect class="face" x="${f(x0 + 4)}" y="20" width="${f(ow - 8)}" height="${f(bot - 20)}"/>` +
        `<path class="detail" d="${Array.from({ length: n - 1 }, (_, i) => `M${f(x0 + 4 + (i + 1) * gw)} 20V${f(bot)}`).join('')}M${f(x0 + 4)} 28H${f(x1 - 4)}"/>`;
      break;
    }
    case 'wall': {
      lights = win(v, x0 + ow * 0.6, 12, 9, bot - 12) + win(v, x0 + ow * 0.15, 12, ow * 0.25, 10);
      break;
    }
  }

  if (panels) extra += sidePanels(W, panels.text ?? `${s.shopName}|${s.shopName}`);
  if (s.signs.some(x => x.type === 'barber-pole')) extra += barberPole(c.uid, s.ground === 'glass' ? x0 + ow * 0.52 : x1 - 6);
  const spots: [number, number][] = [[0.3, 19], [W - 2.9, 21], [0.4, 24.5], [W - 2.8, 14.5]];
  for (let i = 0; i < s.stickers; i++) extra += sticker(...spots[i]!);

  // semi-basement garage: a wide roll shutter under the raised floor, half up while the shop is open
  if (c.base > 0) {
    const B = c.base, gx = 3, gw = W * 0.6 - 4, cut = s.shop ? H + B * 0.5 : H + B - 0.3;
    if (s.shop) lights += win(v, gx, cut, gw, H + B - 0.3 - cut);
    extra += `<line class="detail" x1="0" y1="${f(H)}" x2="${f(W)}" y2="${f(H)}"/>` +
      `<rect class="face recess" x="${gx}" y="${f(H + 1.6)}" width="${f(gw)}" height="${f(cut - H - 1.6)}"/>${slits(H + 2.8, cut - 0.8, 1.3, gx, gx + gw, false)}` +
      `<rect class="face" x="${gx - 0.5}" y="${f(H + 0.6)}" width="${f(gw + 1)}" height="1.6"/>`;
  }
  return { lights, extra };
}

/** the street awning: a sloping canvas with a scalloped valance (item) */
export function awning(c: Ctx): void {
  const { s, D } = c, W = s.w, H = s.groundH, z0 = H - 9;
  let svg = g(D.plane([0, s.d, z0], [1, 0, 0], [0, 1, -5 / 14]), `<rect class="face awning" width="${W}" height="14"/>${slits(5, W - 5, 5, 0, 14)}`);
  const val = D.face(0, s.d + 13.99, z0 - 5, W, 0.01, 2.4, '+b');
  const n = Math.max(2, Math.round(W / 5)), step = W / n;
  if (val) svg += g(val.t, `<path class="face awning" d="M0 0H${f(W)}V2.4${Array.from({ length: n }, (_, i) => `Q${f(W - step * (i + 0.5))} 4.6 ${f(W - step * (i + 1))} 2.4`).join('')}Z"/>`);
  c.add('awning', 0, s.d, z0 - 5, W, 14, 5, svg);
}
