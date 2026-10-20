import { describe, expect, it } from 'vitest';
import { footprint, localFrame, rotateBox, rotateFacing, rotatePoint, rotateSpec, type LocalSide } from '@core/view';
import type { Facing, ViewK } from '@core/types';

const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];
const KS: ViewK[] = [0, 1, 2, 3];
const house = (facing: Facing) => ({ x: 30, y: 50, w: 40, d: 150, facing });

describe('rotation', () => {
  it('turns +x into +y on one step', () => {
    expect(rotatePoint(1, 0, 1, 0, 0)).toEqual([0, 1]);
    expect(rotatePoint(0, 1, 1, 0, 0)).toEqual([-1, 0]);
  });

  it('returns to the start after four steps', () => {
    const b = { x: 3, y: 7, z: 0, w: 40, d: 150, h: 0 };
    expect(rotateBox(b, 4, 100, 60)).toEqual(b);
    for (const f of FACINGS) expect(rotateFacing(f, 4)).toBe(f);
    expect(rotateFacing('E', 1)).toBe('S');
    expect(rotateFacing('S', 1)).toBe('W');
    expect(rotateFacing('N', 1)).toBe('E');
  });

  it('swaps the footprint sides on odd steps', () => {
    const fp = footprint(rotateSpec(house('S'), 1, 0, 0));
    expect([fp.w, fp.d]).toEqual([150, 40]);
  });
});

describe('local frame', () => {
  it('puts the facade on the street side for every facing', () => {
    const want: Record<Facing, [number, number]> = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
    for (const f of FACINGS) expect(localFrame(house(f)).normal('+b')).toEqual(want[f]);
  });

  it('keeps the body inside its footprint', () => {
    for (const f of FACINGS) {
      const L = localFrame(house(f)), fp = footprint(house(f));
      const b = L.box(0, 0, 0, 40, 150, 10);
      expect([b.x, b.y, b.w, b.d]).toEqual([fp.x, fp.y, fp.w, fp.d]);
    }
  });

  it('shows the facade only when it faces +x or +y', () => {
    expect(localFrame(house('S')).visible('+b')).toBe(true);
    expect(localFrame(house('E')).visible('+b')).toBe(true);
    expect(localFrame(house('N')).visible('+b')).toBe(false);
    expect(localFrame(house('W')).visible('+b')).toBe(false);
    for (const f of FACINGS) {
      const L = localFrame(house(f));
      const shown = (['+a', '-a', '+b', '-b'] as LocalSide[]).filter(s => L.visible(s));
      expect(shown).toHaveLength(2);   // always exactly two vertical faces
    }
  });

  it('rotating the world equals re-deriving the house (any facing, any k)', () => {
    const cx = 120, cy = 80;
    for (const f of FACINGS) for (const k of KS) {
      const h = house(f), L0 = localFrame(h), L1 = localFrame(rotateSpec(h, k, cx, cy));
      for (const [a, b] of [[0, 0], [40, 0], [12, 150], [40, 158], [5, 77]] as const) {
        const p = L0.pt(a, b, 3), [rx, ry] = rotatePoint(p[0], p[1], k, cx, cy), q = L1.pt(a, b, 3);
        expect(q[0]).toBeCloseTo(rx, 9);
        expect(q[1]).toBeCloseTo(ry, 9);
      }
    }
  });
});
