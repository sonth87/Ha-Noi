/* P0 "Hello" drawing: one plain shop-house on a plate, proving the kernel port, glow kit and
   scene pipeline end to end. Replaced by the house generator in P1 (house.ts). */
import { frame } from '@iso/frame';
import { slits } from '@iso/kernel';
import { M, SIZE } from '@core/units';
import { rng } from '@core/rng';

export const HELLO_FLOORS = 4;

export interface HelloDrawing {
  svg: string;
  viewBox: string;
}

/*  boxes            x    y    z    w    d    h
    plate            0    0    0  200  170    7
    house           60   40    7   60   80  134   -> ground 38 + 3 × 32, roof z = 141
    parapet         on the roof edge, drawn as strips
    water tank      78   58  141   24   12   12   (rounded)                                  */
export function renderHello(seed = 7): HelloDrawing {
  const PZ = SIZE.plateH, X = 6 * M, Y = 4 * M, W = 6 * M, D = 8 * M;
  const GH = SIZE.groundH, FH = SIZE.floorH;
  const H = GH + (HELLO_FLOORS - 1) * FH, RZ = PZ + H;
  const K = frame([[0, 170, 0], [200, 0, PZ], [200, 170, 0], [0, 0, PZ], [X, Y, RZ + 30], [X + W, Y + D, RZ + 12]]);
  const { TOP, FRONT, SIDE, box } = K;
  const r = rng(seed);
  const variant = () => { const v = r.next(); return v < 0.12 ? ' off' : v < 0.3 ? ' dim' : v < 0.42 ? ' hi' : ''; };

  // floor n (1 = ground): its top z and the window band height
  const floorTop = (n: number) => PZ + GH + (n - 1) * FH;

  // one face's windows for floor n, in face-local coords (v measured down from the floor top)
  const windows = (n: number, faceW: number) => {
    if (n === 1) {
      // shop front: one wide glass opening with a door split
      return `<rect class="win${variant()}" x="${4}" y="${8}" width="${faceW - 8}" height="${GH - 10}"/>` +
        `<line class="detail" x1="${faceW / 2}" y1="8" x2="${faceW / 2}" y2="${GH - 2}"/>`;
    }
    const count = Math.max(1, Math.round(faceW / 22)), pitch = faceW / count, ww = pitch * 0.55;
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = i * pitch + (pitch - ww) / 2;
      s += `<rect class="win${variant()}" x="${x.toFixed(2)}" y="${(FH * 0.25).toFixed(2)}" width="${ww.toFixed(2)}" height="${(FH * 0.55).toFixed(2)}"/>`;
    }
    return s;
  };

  let svg = '';
  // ground plate
  svg += box(0, 0, 0, 200, 170, PZ, 12);
  svg += `<g transform="${TOP(0, 0, PZ)}"><rect class="detail" x="7" y="7" width="186" height="156" rx="8"/>${slits(20, 180, 12, 140, 156)}</g>`;

  // house body (clicking the body toggles every floor)
  svg += `<g class="house">${box(X, Y, PZ, W, D, H)}</g>`;

  // floors: one group per floor holding both visible faces, so a floor lights as one band
  for (let n = 1; n <= HELLO_FLOORS; n++) {
    const zt = n === 1 ? PZ + GH : floorTop(n), band = n === 1 ? GH : FH;
    const face = (t: string, w: number) =>
      `<g transform="${t}"><rect class="halo" x="-2" y="-1" width="${w + 4}" height="${band + 2}" filter="url(#bloom)"/>` +
      `<g class="lights">${windows(n, w)}</g></g>`;
    svg += `<g class="fl" data-floor="${n}">${face(FRONT(X, Y + D, zt), W)}${face(SIDE(X + W, Y + D, zt), D)}</g>`;
    // floor line between storeys
    if (n > 1) svg += `<g transform="${FRONT(X, Y + D, zt + 0.01)}"><line class="detail" x1="0" y1="${band}" x2="${W}" y2="${band}"/></g>`;
  }

  // roof: parapet inset line + a water tank
  svg += `<g transform="${TOP(X, Y, RZ)}"><rect class="detail" x="3" y="3" width="${W - 6}" height="${D - 6}"/></g>`;
  svg += box(X + 18, Y + 18, RZ, 24, 12, 12, 6);
  svg += `<g transform="${FRONT(0, 170, PZ)}"><text class="label" x="16" y="5.2" font-size="4" letter-spacing=".6">THÁI HÀ · HELLO</text></g>`;

  return { svg, viewBox: K.viewBox };
}
