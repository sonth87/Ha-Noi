/* Cầu vượt Tây Sơn (user request, photos 2026-10-21): the two inner lanes of Tây Sơn climb an
   embanked ramp between retaining walls, cross the junction on a deck carried by piers in the
   median, and come down the other side. Cars only (no motorbikes on Hà Nội flyovers).

   Each piece (flyPieces: 5 m, cut where the slope changes) is one depth-sorted item holding the
   ramp or deck, the far parapet, the vehicles on it (moved in and out by the controller, lifted to
   the surface height), and the near parapet, in that order. Piers stand in the median under the
   deck, outside the junction. */
import type { Kernel } from '@iso/kernel';
import type { LocalFrame, LocalSide } from '@core/view';
import { flyPieces, flyZ, type StreetLayout } from '@core/layout';
import type { Item } from '@core/types';
import { LocalDraw, type LV } from '@render/local';
import { vehicle, vehicleLen } from '@render/props/street';

const DECK_T = 6, PARAPET = 4.5, VEH_H = 21;

export function renderFlyover(K: Kernel, lay: StreetLayout, L: LocalFrame, id = 'x'): Item[] {
  const fl = lay.flyover;
  if (!fl) return [];
  const D = new LocalDraw(K, L), S = lay.section, items: Item[] = [];
  const lanes = fl.lanes.map(i => S.lanes[i]!);
  const B0 = Math.min(...lanes.map(l => l.y0)) - 2, B1 = Math.max(...lanes.map(l => l.y1)) + 2;
  const [, r1, r2] = fl.r;
  const nearPlus = L.visible('+b');
  const poly = (pts: LV[], cls: string) => `<path class="${cls}" d="${D.path(pts)}Z"/>`;
  const sees = (side: LocalSide) => L.visible(side);
  const pieces = flyPieces(fl);

  // track groups, ordered far → near for this view
  const tracks = fl.lanes.flatMap(i => S.tracks.map((t, k) => ({ key: `${i}:${k}`, b: (S.lanes[i]!.y0 + S.lanes[i]!.y1) / 2 + t })));
  tracks.sort((p, q) => (nearPlus ? p.b - q.b : q.b - p.b));

  pieces.forEach(([x0, x1], k) => {
    const deck = x0 >= r1 - 0.01 && x1 <= r2 + 0.01;
    const z0 = flyZ(fl, x0), z1 = flyZ(fl, x1), top = Math.max(z0, z1);
    const bottom = (z: number) => (deck ? z - DECK_T : 0);
    let s = '';
    // body: the near long side and the visible end, then the surface
    const bn = nearPlus ? B1 : B0, bf = nearPlus ? B0 : B1;
    s += poly([[x0, bn, bottom(z0)], [x1, bn, bottom(z1)], [x1, bn, z1], [x0, bn, z0]], 'face');
    if (sees('+a') && z1 > 0.01) s += poly([[x1, B0, bottom(z1)], [x1, B1, bottom(z1)], [x1, B1, z1], [x1, B0, z1]], 'face');
    if (sees('-a') && z0 > 0.01) s += poly([[x0, B0, bottom(z0)], [x0, B1, bottom(z0)], [x0, B1, z0], [x0, B0, z0]], 'face');
    s += poly([[x0, B0, z0], [x1, B0, z1], [x1, B1, z1], [x0, B1, z0]], 'face top');
    // markings: a double line between the directions, dashed edge lines
    const mid = (B0 + B1) / 2, line = (b: number) => D.path([[x0, b, z0 + 0.05], [x1, b, z1 + 0.05]]);
    s += `<path class="lane-solid" d="${line(mid - 0.8)}${line(mid + 0.8)}"/><path class="lane" d="${line(B0 + 3)}${line(B1 - 3)}"/>`;
    // retaining-wall courses on the ramp's side (every 1.2 m), so the slope reads
    if (!deck) {
      let d = '';
      for (let z = 12; z < top; z += 12) {
        const t0 = z0 > z ? x0 : null, t1 = z1 > z ? x1 : null;
        if (t0 === null && t1 === null) continue;
        const xa = t0 ?? x0 + (x1 - x0) * (z - z0) / (z1 - z0), xb = t1 ?? x0 + (x1 - x0) * (z - z0) / (z1 - z0);
        d += D.path([[xa, bn, z], [xb, bn, z]]);
      }
      if (d) s += `<path class="detail" d="${d}"/>`;
    }
    const parapet = (b: number) => {
      const o = b === B0 ? 0 : -1.2;
      return poly([[x0, b + o, z0], [x1, b + o, z1], [x1, b + o, z1 + PARAPET], [x0, b + o, z0 + PARAPET]], 'face') +
        poly([[x0, b + o, z0 + PARAPET], [x1, b + o, z1 + PARAPET], [x1, b + o + 1.2, z1 + PARAPET], [x0, b + o + 1.2, z0 + PARAPET]], 'face top');
    };
    s += parapet(bf);
    // vehicles that start on this piece
    const groups = tracks.map(t => {
      const [ln, tr] = t.key.split(':').map(Number) as [number, number];
      const body = lay.vehicles.map((v, vi) => {
        const c = v.a0 + vehicleLen(v.kind) / 2;
        if (v.lane !== ln || v.track !== tr || c < x0 || c >= x1) return '';
        return vehicle(D, v.kind, (S.lanes[ln]!.y0 + S.lanes[ln]!.y1) / 2 + S.tracks[tr]!, S.lanes[ln]!.dir, v.a0, v.v, flyZ(fl, c),
          `data-vid="${id}${vi}" data-st="${id}" data-lane="${ln}" data-track="${tr}"`);
      }).join('');
      return `<g data-track="${t.key}">${body}</g>`;
    }).join('');
    s += `<g class="traffic-fly" data-st="${id}" data-piece="${k}">${groups}</g>`;
    s += parapet(bn);
    const zb = Math.min(bottom(z0), bottom(z1));
    items.push({ id: `${id}:fly-${k}`, box: L.box(x0, B0, zb, x1 - x0, B1 - B0, top + VEH_H - zb), svg: s });
  });

  // piers in the median, with a cap under the deck; one each side of the junction and midway
  const gap = lay.gap!, H = fl.H - DECK_T, [m0, m1] = S.median ?? [B0 + 30, B1 - 30];
  const at = [(r1 + gap[0]) / 2, gap[0] - 14, gap[1] + 14, (gap[1] + r2) / 2];
  at.forEach((x, i) => {
    const s = D.box(x - 3.5, m0 + 4, 0, 7, m1 - m0 - 8, H - 6) + D.box(x - 4.5, B0 + 6, H - 6, 9, B1 - B0 - 12, 6);
    items.push({ id: `${id}:pier-${i}`, box: L.box(x - 4.5, B0 + 6, 0, 9, B1 - B0 - 12, H), svg: s });
  });
  return items;
}

