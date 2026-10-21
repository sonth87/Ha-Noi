/* A catalog lot: base plate (with selection outline and label) and a sidewalk strip. */
import type { Kernel } from '@iso/kernel';
import { esc, slits } from '@iso/kernel';
import { localFrame } from '@core/view';
import type { Item } from '@core/types';
import { LOT, type Lot } from '@core/layout';
import { LocalDraw } from '@render/local';
import { g } from '@render/svg';

export function renderLot(K: Kernel, lot: Lot, index: number, label: string): Item[] {
  const L = localFrame(lot), D = new LocalDraw(K, L), W = lot.w, Dp = lot.d, SB = LOT.facade;
  // the label reads left → right from whichever end of the lot faces the viewer
  const front = L.visible('+b');
  const strip = front
    ? D.plane([0, SB + LOT.sidewalk, 0], [1, 0, 0], [0, 1, 0])
    : D.plane([W, Dp, 0], [-1, 0, 0], [0, -1, 0]);
  const plate = `<g data-lot="${index}">${D.box(0, 0, -6, W, Dp, 6)}` +
    g(D.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]), `<rect class="lot-sel" x="2" y="2" width="${W - 4}" height="${Dp - 4}" rx="4"/>`) +
    g(strip, `<text class="lot-label" x="${W / 2}" y="7.6" font-size="4" text-anchor="middle" letter-spacing=".4">${String(index + 1).padStart(2, '0')} · ${esc(label)}</text>`) +
    `</g>`;
  const walk = D.box(0, SB, 0, W, LOT.sidewalk, 2) +
    g(D.plane([0, SB, 2], [1, 0, 0], [0, 1, 0]), `${slits(10, W - 10, 10, 0, LOT.sidewalk - 2.5)}<line class="detail" x1="0" y1="${LOT.sidewalk - 2.5}" x2="${W}" y2="${LOT.sidewalk - 2.5}"/>`);
  return [
    { id: `${lot.id}:plate`, box: L.box(0, 0, -6, W, Dp, 6), svg: plate },
    { id: `${lot.id}:sidewalk`, box: L.box(0, SB, 0, W, LOT.sidewalk, 2), svg: walk },
  ];
}
