/* Street furniture for one straight street (FR-32, FR-34, FR-35): base slab with the road and
   lane markings (and the lamps' light pools, so they lie under everything), two sidewalks, poles
   with lamps, trees, sagging wires with pulses, and the two traffic lanes with their motorbikes.
   Everything is drawn in street-local coordinates through the street's own frame, so it turns
   with the view like the houses do. Each prop is a depth-sorted item; the bounding boxes are
   chosen so no two items interpenetrate (wires pass in front of the poles, lamps above wires). */
import type { Kernel } from '@iso/kernel';
import { slits } from '@iso/kernel';
import { localFrame, rotateSpec, type LocalSide } from '@core/view';
import { STREET, streetCenter, streetFrameSpec, type StreetLayout } from '@core/layout';
import type { Item, ViewK } from '@core/types';
import { LocalDraw, type LV } from '@render/local';
import { sagLine } from '@render/geom';
import { sticker } from '@render/parts/signs';
import { f, g } from '@render/svg';

const POLE_H = 92, ARM_Z = 84;

export function streetFrame(k: ViewK) {
  const [cx, cy] = streetCenter();
  return localFrame(rotateSpec(streetFrameSpec(), k, cx, cy));
}

export function renderStreet(K: Kernel, lay: StreetLayout, k: ViewK): Item[] {
  const L = streetFrame(k), D = new LocalDraw(K, L), items: Item[] = [];
  const add = (id: string, a: number, b: number, z: number, la: number, lb: number, h: number, svg: string) =>
    items.push({ id: `street:${id}`, box: L.box(a, b, z, la, lb, h), svg });
  const len = STREET.length, [r0, r1] = STREET.road;

  // ---- slab, road, markings, light pools ----
  {
    let svg = D.box(0, 0, -6, len, STREET.depth, 6);
    const mid = (r0 + r1) / 2;
    svg += g(D.plane([0, r0, 0], [1, 0, 0], [0, 1, 0]),
      `<rect class="road" width="${len}" height="${r1 - r0}"/>` +
      `<path class="lane-solid" d="M0 ${f(mid - r0 - 0.8)}H${len}M0 ${f(mid - r0 + 0.8)}H${len}"/>` +
      `<path class="lane" d="M0 3H${len}M0 ${r1 - r0 - 3}H${len}"/>`);
    for (const p of lay.poles) {
      const b = p.row === 'far' ? STREET.far.pole + 24 : STREET.near.pole - 20;
      svg += `<g class="lamp-pool" data-night="1">${g(D.plane([p.x, b, 0.1], [1, 0, 0], [0, 1, 0]), `<circle class="halo" r="20" filter="url(#bloom)"/>`)}</g>`;
    }
    add('slab', 0, 0, -6, len, STREET.depth, 6, svg);
  }

  // ---- sidewalks ----
  for (const [name, b0] of [['walk-far', STREET.farFacade], ['walk-near', r1]] as const) {
    const w = STREET.sidewalk;
    const svg = D.box(0, b0, 0, len, w, 2) +
      g(D.plane([0, b0, 2], [1, 0, 0], [0, 1, 0]), `${slits(10, len - 10, 10, 0, w)}<line class="detail" x1="0" y1="${w / 2}" x2="${len}" y2="${w / 2}"/>`);
    add(name, 0, b0, 0, len, w, 2, svg);
  }

  // ---- poles (with a tangle of cable and A5 stickers) and lamps ----
  lay.poles.forEach((p, i) => {
    const b = p.row === 'far' ? STREET.far.pole : STREET.near.pole, toRoad: LocalSide = p.row === 'far' ? '+b' : '-b';
    let svg = D.box(p.x - 2, b, 2, 4, 4, POLE_H) + D.box(p.x - 10, b + 1, ARM_Z - 2, 20, 2, 2);
    for (const z of [72, 74.5, 77]) svg += g(D.plane([p.x, b + 2, z], [1, 0, 0], [0, 1, 0]), `<ellipse class="wire" cx="0" cy="0" rx="6.5" ry="6"/>`);
    const face = D.face(p.x - 2, b, 2, 4, 4, 34, toRoad);
    if (face) svg += g(face.t, sticker(0.6, 0) + sticker(0.8, 6.5, 2.4, 3));
    add(`pole-${i}`, p.x - 10, b, 2, 20, 4, POLE_H, svg);

    // lamp: an arm reaching over the road
    const s = p.row === 'far' ? 1 : -1, b0 = p.row === 'far' ? b + 4 : b, bb = (d: number) => b0 + s * d;
    const bulb = D.P(p.x, bb(16), 88.6);
    const lamp = `<path class="mast" d="${D.path([[p.x, b0, ARM_Z + 4], [p.x, bb(12), ARM_Z + 8], [p.x, bb(16), ARM_Z + 6]])}"/>` +
      `<g class="lamp" data-night="1"><circle class="halo" cx="${f(bulb[0])}" cy="${f(bulb[1])}" r="8" filter="url(#bloom)"/><circle class="bulb" cx="${f(bulb[0])}" cy="${f(bulb[1])}" r="2"/></g>`;
    add(`lamp-${i}`, p.x - 1, Math.min(b0, bb(17)), ARM_Z + 2, 2, 17, 8, lamp);
  });

  // ---- trees ----
  lay.trees.forEach((t, i) => {
    const b = t.row === 'far' ? STREET.far.tree : STREET.near.tree, R = 5.5;
    const c1 = D.P(t.x, b, 36), c2 = D.P(t.x + 1.5, b - 1, 40);
    const svg = D.box(t.x - 2.5, b - 2.5, 2, 5, 5, 0.6) + `<path class="mast" d="${D.path([[t.x, b, 2.6], [t.x, b, 32]])}"/>` +
      `<circle class="face plant" cx="${f(c1[0])}" cy="${f(c1[1])}" r="${R}"/><circle class="face plant" cx="${f(c2[0])}" cy="${f(c2[1])}" r="${R * 0.75}"/>` +
      `<circle class="detail" cx="${f(c1[0] - 1.6)}" cy="${f(c1[1] - 1)}" r="${R * 0.5}"/>`;
    add(`tree-${i}`, t.x - R, b - R, 2, 2 * R, 2 * R, 44, svg);
  });

  // ---- wires: through every crossarm on a side, sagging between poles; a few carry pulses ----
  for (const rw of ['far', 'near'] as const) {
    const ps = lay.poles.filter(p => p.row === rw).sort((a, b) => a.x - b.x);
    const b0 = rw === 'far' ? STREET.far.pole + 4.3 : STREET.near.pole - 1.8;
    let svg = '', zMin = ARM_Z;
    for (let i = 0; i < 4; i++) {
      const b = b0 + i * 0.5;
      const anchors: LV[] = [[0, b, ARM_Z - 4 - i], ...ps.map(p => [p.x - 9 + i * 6, b, ARM_Z] as LV), [len, b, ARM_Z - 3 - i]];
      const pts: LV[] = [];
      for (let j = 0; j < anchors.length - 1; j++) {
        const A = anchors[j]!, B = anchors[j + 1]!, span = B[0] - A[0];
        const seg = sagLine(A, B, 4 + span / 60 + i, Math.max(6, Math.round(span / 20)));
        pts.push(...(j ? seg.slice(1) : seg));
      }
      for (const p of pts) zMin = Math.min(zMin, p[2]);
      const d = D.path(pts);
      svg += `<path class="wire" d="${d}"/>`;
      if (i % 2 === 0) svg += `<path class="pulse" pathLength="1000" d="${d}"/>`;
    }
    add(`wires-${rw}`, 0, b0, zMin, len, 1.6, ARM_Z - zMin, svg);
  }

  // ---- lanes with their motorbikes (moved by the controller along the lane) ----
  STREET.lanes.forEach((ln, i) => {
    const mid = (ln.y0 + ln.y1) / 2;
    const bikes = lay.bikes.filter(b => b.lane === i).map(bk => bike(D, mid + bk.track, ln.dir, bk.a0, bk.v)).join('');
    add(`lane-${i}`, 0, ln.y0, 0, len, ln.y1 - ln.y0, 17, `<g class="lane" data-lane="${i}">${bikes}</g>`);
  });

  return items;
}

/** a motorbike with rider at a = 0…16 along the lane (front toward dir); the controller slides it to a(t) */
function bike(D: LocalDraw, b: number, dir: 1 | -1, a0: number, v: number): string {
  const front = dir > 0 ? 15.4 : 0.6, back = dir > 0 ? 1.2 : 14.8;
  const head = D.P(7.4, b, 15.6), hl = D.P(front, b, 6.2), tl = D.P(back, b, 6.2);
  return `<g class="bike" data-a0="${f(a0)}" data-v="${v}" data-dir="${dir}">` +
    D.box(1, b - 1.6, 1.4, 14.5, 3.2, 5, 1.2) + D.box(5, b - 1.5, 6.4, 4.8, 3, 7.2, 1.2) +
    `<circle class="face" cx="${f(head[0])}" cy="${f(head[1])}" r="1.7"/>` +
    `<g class="lamp" data-night="1"><circle class="bulb" cx="${f(hl[0])}" cy="${f(hl[1])}" r="0.9"/><circle class="bulb tail" cx="${f(tl[0])}" cy="${f(tl[1])}" r="0.6"/></g>` +
    `</g>`;
}
