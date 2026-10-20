/* Shop signs and ads (docs/architecture/components.md A9). Lightboxes light with the ground
   floor: inside the floor group via .fl.on, or as separate items with data-for="<ground id>".
   The billboard lights at night (data-night). Lettering is escaped; never a real brand. */
import { esc } from '@iso/kernel';
import type { Ctx } from '@render/parts/ctx';
import { f, g } from '@render/svg';

export const signText = (x: number, y: number, size: number, text: string, extra = '') =>
  `<text class="sign-text" x="${f(x)}" y="${f(y)}" font-size="${f(size)}" text-anchor="middle" ${extra}>${esc(text)}</text>`;

/** letters stacked top to bottom (vertical shop signs) */
export const stacked = (cx: number, top: number, step: number, size: number, text: string) =>
  [...text].map((ch, i) => (ch === ' ' ? '' : signText(cx, top + i * step, size, ch))).join('');

/** A5 paper ad: a pale rectangle with scribbled lines (never readable) */
export const sticker = (x: number, y: number, w = 2.6, h = 3.4) =>
  `<rect class="sticker" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/><path class="sticker-ink" d="M${f(x + 0.5)} ${f(y + 0.9)}h${f(w - 1)}M${f(x + 0.5)} ${f(y + 1.7)}h${f(w - 1.4)}M${f(x + 0.5)} ${f(y + 2.5)}h${f(w - 1)}"/>`;

/** font size that fits `text` across `width` */
const fit = (text: string, width: number, max: number) => Math.min(max, width / (Math.max(1, [...text].length) * 0.72));

/** two vertical lightboxes either side of the door, on the ground face (text "LEFT|RIGHT") */
export function sidePanels(W: number, text: string): string {
  const [l = '', r = l] = text.split('|');
  const panel = (x: number, t: string) => {
    const n = Math.max(1, [...t].length), step = Math.min(5.2, 24 / n);
    return `<rect class="sign-board" x="${f(x)}" y="7" width="6" height="28"/>${stacked(x + 3, 7 + step * 0.95, step, step * 0.78, t)}`;
  };
  return `<g class="sign">${panel(1.5, l)}${panel(W - 7.5, r)}</g>`;
}

/** barber pole on the ground face at x: a capped tube whose stripes spiral while the shop is lit */
export function barberPole(uid: string, x: number): string {
  const id = `barber-${uid}`;
  return `<clipPath id="${id}"><rect x="${f(x)}" y="11" width="2.6" height="17"/></clipPath>` +
    `<rect class="face" x="${f(x)}" y="11" width="2.6" height="17"/>` +
    `<g clip-path="url(#${id})"><g class="barber-stripes">${Array.from({ length: 12 }, (_, i) => `<path class="stripe" d="M${f(x)} ${f(8 + i * 2.4)}l2.6 -2.2"/>`).join('')}</g></g>` +
    `<rect class="face top" x="${f(x - 0.5)}" y="9.6" width="3.6" height="1.6" rx="0.6"/><rect class="face top" x="${f(x - 0.5)}" y="27.8" width="3.6" height="1.6" rx="0.6"/>`;
}

/** every sign that is its own depth-sorted item */
export function signItems(c: Ctx): void {
  const { s, D } = c, W = s.w, H = s.groundH, gid = c.floorId(1), front = D.L.visible('+b');
  const hang = s.overhang > 0 && s.floors > 0;
  const hasFacade = s.signs.some(x => x.type === 'facade');
  const lightbox = (inner: string) => `<g class="sign lightbox" data-for="${gid}">${inner}</g>`;

  for (const sign of s.signs) {
    const text = sign.text ?? s.shopName;
    switch (sign.type) {
      case 'facade': {
        // under an overhang it must hang from the overhang's edge, or the overhang hides it (P1a lesson)
        const b0 = hang ? c.fy : s.d, z0 = hang ? H - 7.6 : H - 8.4;
        const face = D.face(1, b0, z0, W - 2, 0.6, 7.6, '+b');
        const svg = D.boxc(1, b0, z0, W - 2, 0.6, 7.6, 'sign-board') +
          (face ? g(face.t, signText((W - 2) / 2, 5.8, fit(text, W - 6, 5.4), text, 'letter-spacing=".8"')) : '');
        c.add('sign-facade', 1, b0, z0, W - 2, 0.6, 7.6, lightbox(svg));
        break;
      }
      case 'projecting-vertical': {
        // clear of a floor-2 cage, which reaches the facade's edges: brackets then start at the cage's front
        const cage = s.upper[0]?.balcony === 'cage', bm = cage ? c.fy + 11.2 : c.fy;
        const a0 = W - 1.6, b0 = c.fy + (cage ? 12 : 1.5), z0 = H + 6, side = D.endSide();
        const face = D.face(a0, b0, z0, 0.6, 12, 24, side);
        const n = Math.max(1, [...text].length), step = Math.min(4.4, 21 / n);
        const brackets = `<path class="mast" d="${D.path([[a0 + 0.3, bm, H + 28], [a0 + 0.3, b0, H + 28]])}${D.path([[a0 + 0.3, bm, H + 8], [a0 + 0.3, b0, H + 8]])}"/>`;
        const svg = brackets + lightbox(D.boxc(a0, b0, z0, 0.6, 12, 24, 'sign-board') +
          (face ? g(face.t, stacked(6, 1.5 + step * 0.9, step, step * 0.82, text)) : ''));
        c.add('sign-vertical', a0, bm, z0, 0.6, b0 + 12 - bm, 24, svg);
        break;
      }
      case 'projecting-round': {
        const a0 = W * 0.62, b0 = s.d + (hasFacade && !hang ? 0.8 : 0), b1 = hang ? Math.min(s.d + 7.2, c.fy - 0.2) : s.d + 8.5;
        // above an awning (top at H − 9) and below the floor above (z = H), bracket included
        const len = b1 - b0, z0 = s.awning !== 'none' ? H - 8.8 : H - 11, side = D.endSide();
        const face = D.face(a0, b0, z0, 0.4, len, 8, side);
        const r = Math.min(3.9, len / 2 - 0.2);
        const svg = `<path class="mast" d="${D.path([[a0 + 0.2, b0, z0 + 8.5], [a0 + 0.2, b1, z0 + 8.5]])}"/>` +
          (face ? lightbox(g(face.t, `<circle class="sign-board" cx="${f(face.w / 2)}" cy="4" r="${f(r)}"/>${signText(face.w / 2, 5.3, r * 0.95, text)}`)) : '');
        c.add('sign-round', a0, b0, z0, 0.4, len, 8.5, svg);
        break;
      }
      case 'standee': {
        const a0 = W - 8, b0 = c.fy + 8, z0 = SIDEWALK;
        const board = `<rect class="sign-board" width="7" height="12"/>` +
          (front ? signText(3.5, 4, fit(text, 6, 2.4), text) + `<path class="sign-ink" d="M1.4 6.2h4.2M1.4 7.8h3.4M1.4 9.4h4.2"/>` : '');
        const svg = D.box(a0, b0, z0, 7, 3, 0.6) + lightbox(g(D.plane([a0, b0, z0 + 12], [1, 0, 0], [0, 3 / 12, -1]), board));
        c.add('standee', a0, b0, z0, 7, 3, 12, svg);
        break;
      }
      case 'billboard': {
        // on the exposed end wall, and only if that wall is clear of the neighbour where the board goes
        if (s.floors < 2 || c.topZ - 30 < s.sideClear + 2) break;
        const side = s.sideEnd, out = side === '+a' ? 1 : -1;
        const a0 = side === '+a' ? W : -1.6, BH = 24, BZ = c.topZ - 30;
        const BD = Math.min(74, c.fy * 0.5), b0 = Math.max(4, c.fy * 0.33);
        const face = D.face(a0, b0, BZ, 1.6, BD, BH, side);
        let svg = D.box(a0, b0, BZ, 1.6, BD, BH);
        let lamps = '';
        const ae = side === '+a' ? W + 1.6 : -1.6, at = ae + out * 4.4;
        for (const bb of [b0 + 12, b0 + BD / 2, b0 + BD - 12]) {
          const p = D.P(at, bb, BZ + BH + 5);
          lamps += `<path class="mast" d="${D.path([[ae, bb, BZ + BH], [at, bb, BZ + BH + 5]])}"/>` +
            `<g class="lamp" data-night="1"><circle class="halo" cx="${f(p[0])}" cy="${f(p[1])}" r="5" filter="url(#bloom)"/><circle class="bulb" cx="${f(p[0])}" cy="${f(p[1])}" r="1.3"/></g>`;
        }
        if (face) {
          const [l1 = text, l2 = '0912 345 678'] = text.split('|');
          svg += `<g class="billboard" data-night="1">${g(face.t, `<rect class="bb-face" x="1.5" y="1.5" width="${f(face.w - 3)}" height="${BH - 3}"/>` +
            `<text class="bb-text" x="${f(face.w / 2)}" y="12" font-size="${f(fit(l1, face.w - 8, 7))}" text-anchor="middle" letter-spacing=".6">${esc(l1)}</text>` +
            `<text class="bb-text" x="${f(face.w / 2)}" y="19" font-size="4.4" text-anchor="middle" letter-spacing="1">${esc(l2)}</text>`)}</g>`;
        }
        const aMin = Math.min(a0, at - 1.4), aMax = Math.max(a0 + 1.6, at + 1.4);
        c.add('billboard', aMin, b0, BZ, aMax - aMin, BD, BH + 7, svg + lamps);
        break;
      }
      case 'side-panels':
      case 'barber-pole':
        break;   // drawn on the ground face (ground.ts)
    }
  }
}

/** sidewalk top height the standee stands on (matches props/sidewalk) */
export const SIDEWALK = 2;
