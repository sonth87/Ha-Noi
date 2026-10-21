/* P1a · Reference house ("nhà mẫu"): one hand-tuned Hà Nội tube house between two neighbours,
   on a slice of sidewalk and street. It fixes the look before the parametric generator is built;
   each helper below is a future render/parts/* function (docs/plan/roadmap.md, ADR-016).

   Street runs along x; every house faces S (+y), so facades sit on FRONT planes.
   Draw order is hand-set back → front here (depthSort arrives with the generator).

    boxes                     x    y    z    w    d    h
    base slab                24    0   -6  118  225    6
    left neighbour (6 fl.)   24    0    0   36  150  198   photo-copy shop: twin side panels · balconies L2, L4
                                                         · rooftop-style billboard with spotlights on its side wall
    main · ground            60    0    0   40  150   38   café: folded shutter, hanging lightbox, awning, standee,
                                                           projecting vertical sign
    main · upper (overhang)  60    0   38   40  158   96   floors 2–4 jut 0.8 m over the sidewalk; cage on floor 3
    main · roof room         60   30  134   40  100   30   set back; terrace in front with parapet
    right neighbour (cấp 4) 100    0    0   42  150   38   barber: spinning pole, round projecting sign; gable metal roof
    sidewalk                 24  150    0  118   30    2
    pole                    130  172    2    4    4   90   crossarm z 82 · lamp · stickers · wires along y ≈ 174

   Sign types shown (docs/architecture/components.md A9): facade lightbox, twin side panels, projecting
   vertical, projecting round, standee, barber pole, high billboard with spotlights, A5 stickers. */
import { frame } from '@iso/frame';
import { esc, slits, type Vec3 } from '@iso/kernel';
import { rng } from '@core/rng';
import { cylinderX, groundCircle, sagLine } from '@render/geom';

export interface ReferenceDrawing {
  svg: string;
  viewBox: string;
  /** every data-floor id, in drawing order */
  floors: string[];
  /** number of .pulse paths on the wires */
  pulses: number;
}

const f = (n: number) => n.toFixed(2);
const g = (t: string, inner: string) => `<g transform="${t}">${inner}</g>`;

export const MAIN_FLOORS = ['M1', 'M2', 'M3', 'M4', 'M5'] as const;

export function renderReferenceHouse(seed = 11): ReferenceDrawing {
  const K = frame([[24, 0, -6], [142, 0, -6], [24, 225, -6], [142, 225, -6], [24, 0, 216], [60, 0, 216], [95, 40, 198], [132, 174, 96]], 0.05);
  const { TOP, FRONT, SIDE, box, plane, path, P } = K;
  const r = rng(seed);
  // lived-in variation for houses with one or two windows a floor: brightness only, never a dead window
  const v = () => { const x = r.next(); return x < 0.2 ? ' dim' : x < 0.38 ? ' hi' : ''; };
  const floors: string[] = [];

  /** a lightable floor band on a face: halo behind, windows in .lights, then fixed extras */
  const floor = (id: string, t: string, w: number, h: number, lights: string, extra = '') => {
    floors.push(id);
    return `<g class="fl" data-floor="${id}">${g(t, `<rect class="halo" x="-2" y="-1" width="${w + 4}" height="${h + 2}" filter="url(#bloom)"/><g class="lights">${lights}</g>${extra}`)}</g>`;
  };

  // ---------- windows & doors (face-local; v grows downward from the floor top) ----------
  const win = (x: number, y: number, w: number, h: number) => `<rect class="win${v()}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`;
  const sill = (x: number, y: number, w: number) => `<line class="detail" x1="${f(x - 1)}" y1="${f(y)}" x2="${f(x + w + 1)}" y2="${f(y)}"/>`;
  const tallWindow = (x: number, y: number, w: number, h: number) =>
    win(x, y, w, h) + `<line class="mull" x1="${f(x + w / 2)}" y1="${f(y)}" x2="${f(x + w / 2)}" y2="${f(y + h)}"/>` + sill(x, y + h + 0.8, w);
  const louverWindow = (x: number, y: number, w: number, h: number) =>
    win(x, y, w, h) + `<g class="mull">${slits(y + 1.6, y + h - 1, 1.6, x + 0.6, x + w - 0.6, false, 'mull')}</g>` + sill(x, y + h + 0.8, w);
  const glassDoors = (x: number, y: number, w: number, h: number) =>
    win(x, y, w, h) + `<path class="mull" d="M${f(x + w / 2)} ${f(y)}V${f(y + h)}M${f(x)} ${f(y + h * 0.3)}H${f(x + w)}"/>`;

  // ---------- signs ----------
  const signText = (x: number, y: number, size: number, text: string, extra = '') =>
    `<text class="sign-text" x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="middle" ${extra}>${esc(text)}</text>`;
  /** letters stacked top to bottom (vertical shop signs) */
  const stacked = (cx: number, top: number, step: number, size: number, text: string) =>
    [...text].map((ch, i) => signText(cx, top + i * step, size, ch)).join('');
  /** A5 paper ad stuck on a wall or pole: a pale rectangle with scribbled lines */
  const sticker = (x: number, y: number, w = 2.6, h = 3.4) =>
    `<rect class="sticker" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/><path class="sticker-ink" d="M${f(x + 0.5)} ${f(y + 0.9)}h${f(w - 1)}M${f(x + 0.5)} ${f(y + 1.7)}h${f(w - 1.4)}M${f(x + 0.5)} ${f(y + 2.5)}h${f(w - 1)}"/>`;

  // ---------- protruding parts ----------
  const pot = (x: number, y: number, z: number, s: number) => {
    const c = P(x, y, z + 3 + s * 0.8);
    return box(x - 1.6, y - 1.6, z, 3.2, 3.2, 3, 0.8) +
      `<circle class="face plant" cx="${f(c[0])}" cy="${f(c[1])}" r="${f(s)}"/><circle class="detail" cx="${f(c[0] - s * 0.3)}" cy="${f(c[1] - s * 0.25)}" r="${f(s * 0.5)}"/>`;
  };
  /** balcony slab + iron railing along the facade at yFace, sticking out by `out` */
  const railBalcony = (x: number, w: number, yFace: number, z: number, out: number, rh: number, plants: [number, number][] = []) => {
    const bars = (len: number) => `<path class="rail" d="M0 0H${f(len)}M0 ${f(rh)}H${f(len)}${Array.from({ length: Math.floor(len / 2.4) + 1 }, (_, i) => `M${f(Math.min(i * 2.4, len))} 0V${f(rh)}`).join('')}"/>`;
    return box(x, yFace, z, w, out, 2) +
      plants.map(([px, s]) => pot(x + px, yFace + out - 3.5, z + 2, s)).join('') +
      g(SIDE(x + w, yFace + out, z + 2 + rh), bars(out)) +
      g(FRONT(x, yFace + out, z + 2 + rh), bars(w));
  };
  /** chuồng cọp: an iron cage the full height of a floor, with a small cap roof */
  const cage = (x: number, w: number, yFace: number, z: number, out: number, h: number) => {
    const grid = (len: number) => `<path class="rail" d="M0 0H${f(len)}M0 ${f(h * 0.62)}H${f(len)}M0 ${f(h - 2)}H${f(len)}${Array.from({ length: Math.floor(len / 1.8) + 1 }, (_, i) => `M${f(Math.min(i * 1.8, len))} 0V${f(h - 2)}`).join('')}"/>`;
    return box(x, yFace, z, w, out, 2) +
      pot(x + w - 6, yFace + 4, z + 2, 2.4) +
      g(SIDE(x + w, yFace + out, z + h), grid(out)) +
      g(FRONT(x, yFace + out, z + h), grid(w)) +
      box(x - 0.8, yFace, z + h - 1.5, w + 1.6, out + 1.2, 1.5);
  };
  /** outdoor AC unit on a FRONT-facing mount (fan on its front) */
  const acFront = (x: number, y: number, z: number) =>
    box(x, y, z, 10, 5, 7) + g(FRONT(x, y + 5, z + 7), `<circle class="detail" cx="3.6" cy="3.6" r="2.6"/><path class="detail" d="M1 3.6H6.2M3.6 1V6.2"/>${slits(7.2, 9.2, 1, 1, 6)}`);
  /** outdoor AC unit hung on a side wall (sticks out along +x, fan faces the viewer) */
  const acSide = (x: number, y: number, z: number) =>
    box(x, y, z, 6, 9, 7) + g(FRONT(x, y + 9, z + 7), `<circle class="detail" cx="3" cy="3.6" r="2.3"/>`) + g(SIDE(x + 6, y + 9, z + 7), slits(1, 8, 1.2, 1, 6));
  const stains = (len: number, h: number, count: number) => {
    let s = '';
    for (let i = 0; i < count; i++) {
      const u = r.next() * (len - 4) + 2, v0 = r.next() * (h - 14) + 4;
      s += `<path class="stain" d="M${f(u)} ${f(v0)}v${f(4 + r.next() * 9)}"/>`;
    }
    return s;
  };

  let svg = '';

  // ---------- ground: diorama slab, road ----------
  svg += box(24, 0, -6, 118, 225, 6);
  svg += g(TOP(24, 180, 0), `<rect class="road" width="118" height="45"/><line class="lane" x1="0" y1="25" x2="118" y2="25"/>`);

  // ---------- left neighbour: 6-storey photo-copy shop ----------
  {
    const X = 24, W = 36, D = 150, H = 198;
    svg += box(X, 0, 0, W, D, H);
    svg += g(SIDE(X + W, D, H), stains(150, 60, 16));
    svg += g(FRONT(X, D, H), slits(32, H - 38, 32, 0, W, false));   // floor lines at z = 38 + 32k
    // ground: roll shutter half up over a lit counter, a lightbox panel on each side of the door
    const panel = (x: number, text: string) =>
      `<rect class="sign-board" x="${x}" y="7" width="6" height="28"/>${stacked(x + 3, 13, 5.2, 4, text)}`;
    svg += floor('L1', FRONT(X, D, 38), W, 38,
      `<rect class="win${v()}" x="9.5" y="18" width="17" height="19.5"/>`,
      `<rect class="face recess" x="9.5" y="5" width="17" height="13"/>${slits(6.5, 16.5, 1.4, 9.5, 26.5, false)}<rect class="face" x="9" y="3" width="18" height="3"/>` +
      `<g class="sign">${panel(1.5, 'PHOTO')}${panel(28.5, 'IN ẤN')}</g>`);
    for (let n = 2; n <= 6; n++) {
      const zt = 38 + (n - 1) * 32;
      svg += floor(`L${n}`, FRONT(X, D, zt), W, 32, n === 6 ? win(8, 6, 8, 18) + win(20, 6, 8, 18) : tallWindow(10, 5, 16, 20));
    }
    svg += railBalcony(X + 2, W - 4, D, 38, 8, 10, [[6, 2.6], [14, 2]]);
    svg += railBalcony(X + 2, W - 4, D, 102, 8, 10, [[24, 2.8]]);
    svg += g(TOP(X, 0, H), `<rect class="detail" x="2.5" y="2.5" width="${W - 5}" height="${D - 5}"/>`);
    svg += box(X + 6, 20, H, 12, 12, 16, 6);            // upright inox tank
    svg += box(X + 9, 23, H + 16, 6, 6, 2, 3);
    svg += pot(X + 26, 130, H, 3);
  }

  // ---------- main house ----------
  {
    const X = 60, W = 40, D = 150, OV = 8, GH = 38, FH = 32, UZ = GH + 3 * FH; // upper top z = 134
    const FY = D + OV;                                                         // upper facade y = 158

    // ground floor: café with a half-folded shutter, lit inside
    svg += box(X, 0, 0, W, D, GH);
    svg += floor('M1', FRONT(X, D, GH), W, GH,
      `<rect class="win${v()}" x="7" y="11" width="26" height="26.5"/>`,
      `<path class="detail" d="M8 20H32M8 27H32M8 33H18"/><rect class="face" x="20" y="29" width="12" height="8.5"/>` +
      `<rect class="face recess" x="3" y="11" width="4" height="26.5"/>${slits(3.5, 6.5, 0.75, 11, 37.5)}` +
      `<rect class="face recess" x="33" y="11" width="4" height="26.5"/>${slits(33.5, 36.5, 0.75, 11, 37.5)}` +
      sticker(0.3, 19));
    // awning over the shop front (sloping out and down), then the lightbox hung under the overhang edge
    svg += g(plane([X, D, 29], [1, 0, 0], [0, 1, -5 / 14]), `<rect class="face awning" width="${W}" height="14"/>${slits(5, 35, 5, 0, 14)}`);
    svg += g(FRONT(X, D + 14, 24), `<path class="face awning" d="M0 0H${W}V2.4${Array.from({ length: 8 }, (_, i) => `Q${f(37.5 - i * 5)} 4.6 ${f(35 - i * 5)} 2.4`).join('')}Z"/>`);
    svg += `<g class="sign lightbox" data-for="M1">${g(FRONT(X + 1, FY + 0.6, GH), `<rect class="sign-board" width="${W - 2}" height="7.6"/>${signText((W - 2) / 2, 5.8, 5.4, 'CÀ PHÊ', 'letter-spacing="1.2"')}`)}</g>`;

    // floors 2–4 overhang the sidewalk
    svg += box(X, 0, GH, W, FY, 3 * FH);
    svg += g(FRONT(X, FY, UZ), `<path class="detail" d="M0 ${FH}H${W}M0 ${2 * FH}H${W}"/>`);
    svg += floor('M2', FRONT(X, FY, GH + FH), W, FH, glassDoors(9, 3, 22, 27.5));
    svg += floor('M3', FRONT(X, FY, GH + 2 * FH), W, FH, tallWindow(11, 6, 18, 18));
    svg += floor('M4', FRONT(X, FY, UZ), W, FH, louverWindow(5, 5, 12, 20) + louverWindow(23, 5, 12, 20));
    // exposed side wall (tường hồi, x = 100): stains, a drain pipe, hung AC units
    svg += g(SIDE(X + W, FY, UZ), `${stains(FY, 3 * FH, 18)}<path class="pipe" d="M3 0V${3 * FH}"/>`);
    svg += acSide(X + W, 64, 86) + acSide(X + W, 100, 112);
    svg += railBalcony(X + 2, W - 4, FY, GH, 10, 11, [[5, 3], [12, 2.4], [24, 3.2]]);
    // projecting vertical sign at the facade's right edge, past the balcony
    svg += `<path class="mast" d="${path([[X + W - 1, FY, 66], [X + W - 1, FY + 1.5, 66]])}${path([[X + W - 1, FY, 46], [X + W - 1, FY + 1.5, 46]])}"/>`;
    svg += `<g class="sign lightbox" data-for="M1">${g(SIDE(X + W - 1, FY + 13.5, 68), `<rect class="sign-board" width="12" height="24"/>${stacked(6, 5.6, 4.4, 3.6, 'CAFE')}`)}</g>`;
    svg += cage(X + 1, W - 2, FY, GH + FH, 10, 30);
    svg += acFront(X + 3, FY, GH + 2 * FH + 2);

    // roof room, set back; terrace in front
    const RY = 30, RD = 100, RH = 30, RZ = UZ + RH;
    svg += box(X, RY, UZ, W, RD, RH);
    svg += floor('M5', FRONT(X, RY + RD, RZ), W, RH, win(6, 7, 11, 23) + win(23, 8, 12, 11) + sill(23, 19.8, 12));
    svg += g(SIDE(X + W, RY + RD, RZ), stains(RD, RH, 6));
    // terrace: pots, a laundry line, parapets
    svg += pot(X + 7, RY + RD + 9, UZ, 3.4) + pot(X + 14, RY + RD + 17, UZ, 2.6);
    {
      const ly = RY + RD + 9, x0 = X + 22, x1 = X + 36, zt = UZ + 15;
      svg += `<path class="rail" d="${path([[x0, ly, UZ], [x0, ly, zt]])}${path([[x1, ly, UZ], [x1, ly, zt]])}"/>`;
      svg += `<path class="rail" d="${path(sagLine([x0, ly, zt], [x1, ly, zt], 1.2, 8))}"/>`;
      svg += g(FRONT(x0 + 2, ly, zt - 0.6), `<rect class="face cloth" width="4" height="6"/><rect class="face cloth" x="5.5" y="0.3" width="3" height="8"/><rect class="face cloth" x="9.5" y="0.2" width="2.5" height="5"/>`);
    }
    svg += box(X + W - 3, RY + RD, UZ, 3, OV + D - RY - RD - 3, 8);
    svg += box(X, FY - 3, UZ, W, 3, 8);
  }

  // ---------- billboard high on the left neighbour's exposed side wall, lit by spotlights at night ----------
  {
    const BX = 60, BY = 52, BD = 74, BZ = 168, BH = 24;
    svg += box(BX, BY, BZ, 1.6, BD, BH);
    svg += `<g class="billboard" data-night="1">${g(SIDE(BX + 1.6, BY + BD, BZ + BH),
      `<rect class="bb-face" x="1.5" y="1.5" width="${BD - 3}" height="${BH - 3}"/>` +
      `<text class="bb-text" x="${BD / 2}" y="12" font-size="7" text-anchor="middle" letter-spacing=".6">CHO THUÊ BIỂN</text>` +
      `<text class="bb-text" x="${BD / 2}" y="19" font-size="4.4" text-anchor="middle" letter-spacing="1">0912 345 678</text>`)}`;
    for (const y of [BY + 12, BY + BD / 2, BY + BD - 12]) {
      const b = P(BX + 6, y, BZ + BH + 5);
      svg += `<path class="mast" d="${path([[BX + 1.6, y, BZ + BH], [BX + 6, y, BZ + BH + 5]])}"/>` +
        `<g class="lamp" data-night="1"><circle class="halo" cx="${f(b[0])}" cy="${f(b[1])}" r="5" filter="url(#bloom)"/><circle class="bulb" cx="${f(b[0])}" cy="${f(b[1])}" r="1.3"/></g>`;
    }
    svg += `</g>`;
  }

  // ---------- main house roof: inox tank on legs, antenna, solar water heater ----------
  {
    const X = 60, RZ = 164;
    svg += box(X + 9, 44, RZ, 2, 8, 4) + box(X + 25, 44, RZ, 2, 8, 4);
    svg += cylinderX(K, X + 6, X + 30, 48, RZ + 10, 6);
    svg += `<path class="mast" d="${path([[X + 35, 38, RZ], [X + 35, 38, RZ + 32]])}${path([[X + 31, 38, RZ + 26], [X + 39, 38, RZ + 26]])}${path([[X + 32, 38, RZ + 21], [X + 38, 38, RZ + 21]])}"/>`;
    // panel tilted toward the street: top edge at the back, bottom edge at the front; its tank sits behind the top edge
    const sx = X + 6, sw = 28, yb = 104, yt = 90, zb = RZ + 4, zt = RZ + 18;
    svg += cylinderX(K, sx, sx + sw, yt - 4, zt + 2, 3.4, 1);
    svg += `<path class="mast" d="${path([[sx + 2, yt, RZ], [sx + 2, yt, zt]])}${path([[sx + sw - 2, yt, RZ], [sx + sw - 2, yt, zt]])}"/>`;
    svg += g(plane([sx, yt, zt], [1, 0, 0], [0, (yb - yt) / 14, -(zt - zb) / 14]), `<rect class="face solar" width="${sw}" height="14"/>${slits(2, sw - 2, 2, 1, 13)}`);
  }

  // ---------- right neighbour: one-storey barber shop with a gable metal roof ----------
  {
    const X = 100, W = 42, D = 150, H = 38, RZ = H + 14;
    svg += box(X, 0, 0, W, D, H);
    const ribs = slits(2, W / 2 - 1, 2.4, 0, D);
    svg += g(plane([X, 0, H], [1, 0, (RZ - H) / (W / 2)], [0, 1, 0]), `<rect class="face top" width="${W / 2}" height="${D}"/>${ribs}`);
    svg += g(plane([X + W / 2, 0, RZ], [1, 0, -(RZ - H) / (W / 2)], [0, 1, 0]), `<rect class="face" width="${W / 2}" height="${D}"/>${ribs}`);
    svg += `<path class="face" d="${path([[X, D, H], [X + W / 2, D, RZ], [X + W, D, H]])}Z"/>`;
    // barber pole: a capped tube on the facade whose stripes spiral while the shop is lit
    const pole = `<clipPath id="barber-clip"><rect x="21.6" y="11" width="2.6" height="17"/></clipPath>` +
      `<rect class="face" x="21.6" y="11" width="2.6" height="17"/>` +
      `<g clip-path="url(#barber-clip)"><g class="barber-stripes">${Array.from({ length: 12 }, (_, i) => `<path class="stripe" d="M21.6 ${f(8 + i * 2.4)}l2.6 -2.2"/>`).join('')}</g></g>` +
      `<rect class="face top" x="21.1" y="9.6" width="3.6" height="1.6" rx="0.6"/><rect class="face top" x="21.1" y="27.8" width="3.6" height="1.6" rx="0.6"/>`;
    svg += floor('R1', FRONT(X, D, H), W, H,
      `<rect class="win${v()}" x="4" y="9" width="15" height="28.5"/><rect class="win${v()}" x="27" y="11" width="11" height="15"/>`,
      `<path class="mull" d="M11.5 9V37.5M27 18.5H38"/>` + sill(27, 26.8, 11) +
      `<g class="sign"><rect class="sign-board" x="3" y="2" width="17" height="5.4"/>${signText(11.5, 6, 3.4, 'CẮT TÓC', 'letter-spacing=".4"')}</g>` +
      pole + sticker(31, 29.5));
    // round projecting sign beside the door
    svg += `<path class="mast" d="${path([[X + 26, D, 36], [X + 26, D + 8.5, 36]])}"/>`;
    svg += `<g class="sign lightbox" data-for="R1">${g(SIDE(X + 26, D + 8.5, 35), `<circle class="sign-board" cx="4" cy="4" r="3.8"/>${signText(4, 5.4, 3.6, '✂')}`)}</g>`;
  }

  // ---------- sidewalk and street life ----------
  svg += box(24, 150, 0, 118, 30, 2);
  svg += g(TOP(24, 150, 2), `${slits(10, 110, 10, 0, 27.5)}<line class="detail" x1="0" y1="13.5" x2="118" y2="13.5"/><line class="detail" x1="0" y1="27.5" x2="118" y2="27.5"/>`);
  // light spill from the open café and the street lamp's pool
  svg += `<g class="spill" data-for="M1">${g(TOP(64, 150, 2.1), `<rect class="halo" width="32" height="20" rx="8" filter="url(#bloom)"/>`)}</g>`;
  svg += `<g class="lamp-pool" data-night="1">${groundCircle(K, 132, 192, 0.1, 18, 'halo', 'filter="url(#bloom)"')}</g>`;
  // plastic stools and a low table in front of the café
  for (const [x, y] of [[64, 166], [72, 174], [84, 170]] as const) svg += box(x, y, 2, 4, 4, 5, 1);
  svg += box(74, 162, 2, 7, 7, 6, 1);
  // A-frame standee (lit with the café)
  svg += box(92, 166, 2, 7, 3, 0.6);
  svg += `<g class="sign lightbox" data-for="M1">${g(plane([92, 166, 14], [1, 0, 0], [0, 3 / 12, -1]), `<rect class="sign-board" width="7" height="12"/>${signText(3.5, 4, 2.2, 'MENU')}<path class="sign-ink" d="M1.4 6.2h4.2M1.4 7.8h3.4M1.4 9.4h4.2"/>`)}</g>`;
  // a parked motorbike
  {
    const bx = 108, by = 168;
    svg += g(FRONT(bx, by, 7), `<circle class="wheel" cx="3.2" cy="3.6" r="3.2"/><circle class="wheel" cx="15.8" cy="3.6" r="3.2"/>`);
    svg += `<path class="face" d="${path([[bx + 4, by, 4], [bx + 6, by, 9], [bx + 14, by, 9.5], [bx + 16.5, by, 5], [bx + 12, by, 3.5]])}Z"/>`;
    svg += box(bx + 7, by - 1.5, 9.5, 7, 3, 1.6, 0.8);
    svg += `<path class="mast" d="${path([[bx + 3.5, by, 4], [bx + 2.6, by, 13], [bx + 2.6, by - 2.5, 13.5], [bx + 2.6, by + 2.5, 13.5]])}"/>`;
    const hl = P(bx + 2.2, by, 12);
    svg += `<g class="lamp" data-night="1"><circle class="bulb" cx="${f(hl[0])}" cy="${f(hl[1])}" r="0.9"/></g>`;
  }

  // ---------- pole, lamp, wires ----------
  const PX = 132, PY = 174, CZ = 84;
  svg += box(PX - 2, PY - 2, 2, 4, 4, 92);
  svg += g(FRONT(PX - 2, PY + 2, 34), sticker(0.6, 0) + sticker(0.8, 6.5, 2.4, 3));
  svg += box(PX - 10, PY - 1, CZ - 2, 20, 2, 2);
  for (const z of [72, 74.5, 77]) svg += g(TOP(PX, PY, z), `<ellipse class="wire" cx="0" cy="0" rx="6.5" ry="6"/>`);
  {
    const arm = path([[PX, PY + 2, 88], [PX, PY + 12, 92], [PX, PY + 17, 90]]);
    const b = P(PX, PY + 17, 88.6);
    svg += `<path class="mast" d="${arm}"/><g class="lamp" data-night="1"><circle class="halo" cx="${f(b[0])}" cy="${f(b[1])}" r="8" filter="url(#bloom)"/><circle class="bulb" cx="${f(b[0])}" cy="${f(b[1])}" r="2"/></g>`;
  }
  // wires: four along the street through the crossarm, plus a service drop into the main house
  const wires: Vec3[][] = [];
  for (let i = 0; i < 4; i++) {
    const y = PY - 1 + i * 0.7, x = PX - 9 + i * 6, z = CZ;
    wires.push([...sagLine([24, y, z - 2 - i], [x, y, z], 7 + i * 1.5, 22), ...sagLine([x, y, z], [142, y, z - 1], 1.2, 4).slice(1)]);
  }
  wires.push(sagLine([PX - 9, PY, CZ], [96, 158, 76], 4, 14));
  svg += wires.map(w => `<path class="wire" d="${path(w)}"/>`).join('');
  const pulseOn = [0, 2, 4];
  svg += pulseOn.map(i => `<path class="pulse" pathLength="1000" d="${path(wires[i]!)}"/>`).join('');

  return { svg, viewBox: K.viewBox, floors, pulses: pulseOn.length };
}
