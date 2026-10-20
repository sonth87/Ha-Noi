/* Drawing in a house's local frame (a along the facade, b toward the street, z up), for any
   facing. Wraps the iso kernel: boxes, faces, planes and paths are mapped to world space first,
   and a face is returned only when it is one of the two visible vertical faces (+x or +y).
   Face-local u always runs left → right as seen from outside that face (kernel FRONT/SIDE). */
import type { Kernel, Vec2 } from '@iso/kernel';
import type { LocalFrame, LocalSide, Vec3 } from '@core/view';
import type { Box3 } from '@core/types';
import { cylinderH } from '@render/geom';

export interface Face {
  /** SVG transform of the face plane (origin at its top-left as seen from outside) */
  t: string;
  /** width along the face, height */
  w: number;
  h: number;
}

export type LV = readonly [number, number, number];

export class LocalDraw {
  constructor(readonly K: Kernel, readonly L: LocalFrame) {}

  wbox(a: number, b: number, z: number, la: number, lb: number, h: number): Box3 {
    return this.L.box(a, b, z, la, lb, h);
  }

  box(a: number, b: number, z: number, la: number, lb: number, h: number, r = 0): string {
    const B = this.L.box(a, b, z, la, lb, h);
    return this.K.box(B.x, B.y, B.z, B.w, B.d, B.h, r);
  }

  boxc(a: number, b: number, z: number, la: number, lb: number, h: number, cls: string): string {
    const B = this.L.box(a, b, z, la, lb, h);
    return this.K.boxc(B.x, B.y, B.z, B.w, B.d, B.h, 0, cls);
  }

  /** The given side of a local box, if it is visible. */
  face(a: number, b: number, z: number, la: number, lb: number, h: number, side: LocalSide): Face | null {
    if (!this.L.visible(side)) return null;
    const B = this.L.box(a, b, z, la, lb, h);
    const [, ny] = this.L.normal(side);
    return ny > 0
      ? { t: this.K.FRONT(B.x, B.y + B.d, B.z + B.h), w: B.w, h: B.h }
      : { t: this.K.SIDE(B.x + B.w, B.y + B.d, B.z + B.h), w: B.d, h: B.h };
  }

  /** whichever end (−a / +a) is visible; ends are opposite, so exactly one is */
  endSide(): LocalSide {
    return this.L.visible('+a') ? '+a' : '-a';
  }

  plane(o: LV, u: LV, v: LV): string {
    return this.K.plane(this.L.pt(...o), this.L.vec(...u), this.L.vec(...v));
  }

  path(pts: readonly LV[]): string {
    return this.K.path(pts.map(p => this.L.pt(...p)));
  }

  P(a: number, b: number, z: number): Vec2 {
    return this.K.P(...this.L.pt(a, b, z));
  }

  /** a cylinder lying along local a */
  cylinderA(a0: number, a1: number, b: number, zc: number, R: number, bands = 2): string {
    return cylinderH(this.K, this.L.pt(a0, b, zc) as Vec3, this.L.pt(a1, b, zc) as Vec3, R, bands);
  }
}
