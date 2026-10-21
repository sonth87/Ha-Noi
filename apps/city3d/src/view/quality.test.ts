import { describe, expect, it } from 'vitest';
import { isHouseLamp, windowRank, windowShade } from '@render/lights';
import { detailFor, lowerLevel, quality, withOption } from './quality';
import { lightOn } from './lights';

describe('quality', () => {
  it('goes back to a named level when the options match it again', () => {
    const q = withOption(quality('high'), { bloom: false });
    expect(q.level).toBe('custom');
    expect(withOption(q, { bloom: true }).level).toBe('high');
  });

  it('lowers the detail when zoomed out, up to the chosen most', () => {
    const q = quality('high');
    expect(detailFor(1, q)).toBe(1);
    expect(detailFor(3, q)).toBe(2);
    expect(detailFor(6, q)).toBe(3);
    expect(detailFor(6, quality('medium'))).toBe(2);
    expect(detailFor(0.5, quality('ultra'))).toBe(3);   // no automatic lowering
  });
});

describe('stepping down by itself', () => {
  it('goes one level down at a time and stops at low', () => {
    expect(lowerLevel(quality('high'))!.level).toBe('medium');
    expect(lowerLevel(quality('medium'))!.level).toBe('low');
    expect(lowerLevel(quality('low'))).toBeNull();
  });
});

describe('lived-in windows', () => {
  it('lights a floor unevenly, the same way every time, and street lamps evenly', () => {
    const shades = Array.from({ length: 400 }, (_, k) => windowShade('w1/3', k));
    const n = (s: string) => shades.filter(x => x === s).length;
    expect(n('off')).toBeGreaterThan(10); expect(n('dim')).toBeGreaterThan(40); expect(n('hi')).toBeGreaterThan(40); expect(n('on')).toBeGreaterThan(150);
    expect(windowShade('w1/3', 7)).toBe(windowShade('w1/3', 7));
    expect(new Set(Array.from({ length: 50 }, (_, k) => windowShade('street/lamps', k)))).toEqual(new Set(['on']));
  });
});

describe('light settings', () => {
  it('lights a share of the windows evenly over every building, adding windows as it grows', () => {
    const lit = (lamp: string, n: number, share: number) => Array.from({ length: n }, (_, k) => windowRank(lamp, k) < share).filter(Boolean).length;
    // two buildings, 400 windows each: both near 20 %, and the 20 % set grows into the 50 % set
    for (const b of ['novotel/5', 'viet-tower/5']) {
      expect(lit(b, 400, 0.2)).toBeGreaterThan(55); expect(lit(b, 400, 0.2)).toBeLessThan(105);
      for (let k = 0; k < 400; k++) if (windowRank(b, k) < 0.2) expect(windowRank(b, k) < 0.5).toBe(true);
    }
    expect([lightOn('auto', true), lightOn('auto', false), lightOn('on', false), lightOn('off', true)]).toEqual([true, false, true, false]);
    expect(isHouseLamp('street/lamps') || isHouseLamp('signal/x/go')).toBe(false);
  });
});
