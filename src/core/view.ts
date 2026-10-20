/* View rotation and the house-local frame (docs/architecture/overview.md §5–6).

   House-local coordinates: a runs along the facade, left → right as seen from the street;
   b runs from the back wall (0) to the facade (d) and beyond (overhang, balconies); z is up.
   localToWorld maps them into data space for each facing; rotating the world by k × 90°
   is the same as re-deriving x, y and facing (tested in view.test.ts). */
import type { Box3, Facing, HouseSpec, ViewK } from '@core/types';

export type Vec3 = readonly [number, number, number];
export type LocalSide = '+a' | '-a' | '+b' | '-b';

const ORDER: Facing[] = ['E', 'S', 'W', 'N'];   // one 90° step turns E → S → W → N

export function rotateFacing(f: Facing, k: number): Facing {
  return ORDER[(ORDER.indexOf(f) + k) % 4]!;
}

/** one 90° step about (cx, cy): +x ↦ +y, +y ↦ −x */
export function rotatePoint(x: number, y: number, k: number, cx: number, cy: number): [number, number] {
  let px = x, py = y;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [px, py] = [cx - (py - cy), cy + (px - cx)];
  return [px, py];
}

export function rotateBox(b: Box3, k: number, cx: number, cy: number): Box3 {
  const [x0, y0] = rotatePoint(b.x, b.y, k, cx, cy);
  const [x1, y1] = rotatePoint(b.x + b.w, b.y + b.d, k, cx, cy);
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), z: b.z, w: Math.abs(x1 - x0), d: Math.abs(y1 - y0), h: b.h };
}

/** The house body's world footprint (ground floor; overhangs not included). */
export function footprint(s: Pick<HouseSpec, 'x' | 'y' | 'w' | 'd' | 'facing'>): Box3 {
  const across = s.facing === 'S' || s.facing === 'N';
  return { x: s.x, y: s.y, z: 0, w: across ? s.w : s.d, d: across ? s.d : s.w, h: 0 };
}

/** Rotate a house about (cx, cy): new footprint corner and new facing. */
export function rotateSpec<T extends Pick<HouseSpec, 'x' | 'y' | 'w' | 'd' | 'facing'>>(s: T, k: ViewK, cx: number, cy: number): T {
  const fp = rotateBox(footprint(s), k, cx, cy);
  return { ...s, x: fp.x, y: fp.y, facing: rotateFacing(s.facing, k) };
}

export interface LocalFrame {
  pt(a: number, b: number, z: number): Vec3;
  vec(da: number, db: number, dz: number): Vec3;
  box(a: number, b: number, z: number, la: number, lb: number, h: number): Box3;
  /** world outward normal of a local side, as a unit vector in x/y */
  normal(side: LocalSide): [number, number];
  /** a vertical face is drawn only when its normal is +x (SIDE) or +y (FRONT) */
  visible(side: LocalSide): boolean;
}

export function localFrame(s: Pick<HouseSpec, 'x' | 'y' | 'w' | 'd' | 'facing'>): LocalFrame {
  const { x: X, y: Y, w, d, facing } = s;
  const pt = (a: number, b: number, z: number): Vec3 => {
    switch (facing) {
      case 'S': return [X + a, Y + b, z];
      case 'E': return [X + b, Y + w - a, z];
      case 'N': return [X + w - a, Y + d - b, z];
      case 'W': return [X + d - b, Y + a, z];
    }
  };
  const vec = (da: number, db: number, dz: number): Vec3 => {
    switch (facing) {
      case 'S': return [da, db, dz];
      case 'E': return [db, -da, dz];
      case 'N': return [-da, -db, dz];
      case 'W': return [-db, da, dz];
    }
  };
  const normal = (side: LocalSide): [number, number] => {
    const v = side === '+a' ? vec(1, 0, 0) : side === '-a' ? vec(-1, 0, 0) : side === '+b' ? vec(0, 1, 0) : vec(0, -1, 0);
    return [v[0] + 0, v[1] + 0];   // + 0 turns −0 into 0
  };
  return {
    pt, vec, normal,
    box(a, b, z, la, lb, h) {
      const p = pt(a, b, z), q = pt(a + la, b + lb, z);
      return { x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), z, w: Math.abs(q[0] - p[0]), d: Math.abs(q[1] - p[1]), h };
    },
    visible(side) {
      const [nx, ny] = normal(side);
      return nx > 0 || ny > 0;
    },
  };
}

/** Readout label for a view: which way the camera looks along the street. */
export const VIEW_LABEL = ['S', 'W', 'N', 'E'] as const;
