/* renderHouse: a resolved HouseSpec → depth-sortable items (FR-01). Every part works in the
   house's local frame, so the same code draws a house facing any way (FR-20). Floors light by
   data-floor="<id>/<n>" (1 = ground, 2… = upper floors, floors + 2 = roof room), whichever face
   (front or back) is visible. */
import type { Kernel } from '@iso/kernel';
import { rng } from '@core/rng';
import { localFrame } from '@core/view';
import type { HouseSpec, Item } from '@core/types';
import { LocalDraw } from '@render/local';
import { band, type Ctx } from '@render/parts/ctx';
import { backWindow, windowSet, win } from '@render/parts/windows';
import { awning, groundFace } from '@render/parts/ground';
import { SIDEWALK, signItems } from '@render/parts/signs';
import { balcony, facadeAC } from '@render/parts/balconies';
import { endWall, sideACs } from '@render/parts/walls';
import { roof } from '@render/parts/roofs';
import { g, safeId } from '@render/svg';

export function renderHouse(K: Kernel, spec: HouseSpec): Item[] {
  // a semi-basement raises the ground floor: parts measure from the ground floor's top, so they
  // see one taller ground floor (groundH + basement); only the ground face draws the garage band
  const s = spec.basement > 0 ? { ...spec, groundH: spec.groundH + spec.basement } : spec;
  const L = localFrame(s), D = new LocalDraw(K, L), r = rng(s.seed);
  const W = s.w, H = s.groundH, FH = s.floorH, fy = s.d + (s.floors > 0 ? s.overhang : 0);
  const items: Item[] = [];
  const c: Ctx = {
    K, D, s, r, fy, items, base: spec.basement,
    v: () => { const x = r.next(); return x < 0.2 ? ' dim' : x < 0.38 ? ' hi' : ''; },
    topZ: H + s.floors * FH,
    uid: safeId(s.id),
    floorId: n => `${s.id}/${n}`,
    add: (name, a, b, z, la, lb, h, svg) => items.push({ id: `${s.id}:${name}`, box: L.box(a, b, z, la, lb, h), svg }),
  };
  const side = D.endSide();

  // ---- ground floor body ----
  {
    let svg = D.box(0, 0, 0, W, s.d, H);
    const front = D.face(0, 0, 0, W, s.d, H, '+b'), back = D.face(0, 0, 0, W, s.d, H, '-b');
    if (front) { const { lights, extra } = groundFace(c, front.w); svg += band(c.floorId(1), front.t, front.w, H, lights, extra); }
    if (back) svg += band(c.floorId(1), back.t, back.w, H, win(c.v, back.w * 0.55, 10, 9, H - 10.5));
    svg += endWall(c, D.face(0, 0, 0, W, s.d, H, side), side, 4, s.floors === 0);
    c.add('ground', 0, 0, 0, W, s.d, H, svg);
  }

  // ---- upper floors body (one box; overhang included) ----
  if (s.floors > 0) {
    const UH = s.floors * FH;
    let svg = D.box(0, 0, H, W, fy, UH);
    s.upper.forEach((fl, i) => {
      const n = i + 2, z = H + i * FH;
      const front = D.face(0, 0, z, W, fy, FH, '+b'), back = D.face(0, 0, z, W, fy, FH, '-b');
      if (front) svg += band(c.floorId(n), front.t, front.w, FH, bays(c, fl.window, front.w, FH));
      if (back) svg += band(c.floorId(n), back.t, back.w, FH, backWindow(c.v, back.w, FH));
    });
    const front = D.face(0, 0, H, W, fy, UH, '+b');
    if (front && s.floors > 1) svg += g(front.t, `<path class="detail" d="${Array.from({ length: s.floors - 1 }, (_, i) => `M0 ${(i + 1) * FH}H${W}`).join('')}"/>`);
    svg += endWall(c, D.face(0, 0, H, W, fy, UH, side), side, 6 + s.floors * 4, true);
    c.add('upper', 0, 0, H, W, fy, UH, svg);
  }

  // ---- things on and off the facade ----
  if (c.base > 0) entranceSteps(c);
  if (s.awning !== 'none') awning(c);
  signItems(c);
  s.upper.forEach((fl, i) => {
    balcony(c, i + 2, fl);
    if (fl.ac && fl.balcony === 'none') facadeAC(c, i + 2);
  });
  sideACs(c);
  roof(c);
  return items;
}

/** a wide facade is split into bays of about 4 m, each with the floor's window set */
function bays(c: Ctx, kind: Parameters<typeof windowSet>[1], W: number, H: number): string {
  const n = Math.max(1, Math.round(W / 40)), bw = W / n;
  if (n === 1) return windowSet(c.v, kind, W, H);
  return Array.from({ length: n }, (_, i) => `<g transform="translate(${(i * bw).toFixed(2)} 0)">${windowSet(c.v, kind, bw, H)}</g>`).join('');
}

/** steps up to a raised ground floor, beside the garage */
function entranceSteps(c: Ctx): void {
  const { s, D } = c, B = c.base, n = 3, a0 = s.w * 0.64, aw = Math.min(12, s.w * 0.3), depth = 2.6;
  let svg = '';
  const z0 = SIDEWALK, rise = (B - z0) / n;   // from the sidewalk's top up to the raised floor
  for (let k = 0; k < n; k++) svg += D.box(a0, s.d, z0 + k * rise, aw, (n - k) * depth, rise);
  c.add('steps', a0, s.d, z0, aw, n * depth, B - z0, svg);
}

/** every floor id a house exposes (for "all floors" toggles and cascades), ground first */
export function floorIds(s: HouseSpec): string[] {
  const ids = Array.from({ length: s.floors + 1 }, (_, i) => `${s.id}/${i + 1}`);
  if (s.topRoom && s.roof === 'flat' && s.floors > 0) ids.push(`${s.id}/${s.floors + 2}`);
  return ids;
}
