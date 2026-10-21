import { describe, expect, it } from 'vitest';
import { CYCLE, CYCLE_T, signalsAt, stepTraffic, type Car, type Signals } from './traffic';

describe('signals', () => {
  it('never shows green both ways, and always passes through all red', () => {
    for (let t = 0; t < CYCLE_T * 2; t += 0.25) {
      const s = signalsAt(t);
      expect(s.x !== 'stop' && s.y !== 'stop').toBe(false);
    }
    for (let i = 0; i < CYCLE.length; i++) {
      const p = CYCLE[i]!, q = CYCLE[(i + 1) % CYCLE.length]!;
      if (p.x === 'wait') expect(q).toMatchObject({ x: 'stop', y: 'stop' });
      if (p.y === 'wait') expect(q).toMatchObject({ x: 'stop', y: 'stop' });
    }
  });

  it('counts down to the next change of colour', () => {
    expect(signalsAt(0)).toMatchObject({ x: 'go', y: 'stop', xLeft: 17, yLeft: 21 });
    expect(signalsAt(16.5).xLeft).toBe(1);
    expect(signalsAt(17.2)).toMatchObject({ x: 'stop', xLeft: 22 });
  });
});

describe('traffic model', () => {
  // two 200 m streets crossing: X's junction from 100 to 114 m, Y's from 100 to 122 m
  const roads = { x: { length: 200, gap: [100, 114] as const }, y: { length: 200, gap: [100, 122] as const } };
  const make = (): Car[] => {
    const out: Car[] = [];
    for (const st of ['x', 'y'] as const) for (const [lane, dir] of [[0, -1], [1, 1]] as const) for (let i = 0; i < 6; i++) {
      const bike = i % 2 === 0, a = [10, 40, 70, 140, 170, 188][i]! + (st === 'y' ? 7 : 0);   // none starts inside a junction
      out.push({ st, lane, track: bike ? 0 : 1, len: bike ? 1.8 : 4.4, dir, v: bike ? 5 + i * 0.4 : 5.6, a, signal: true });
    }
    return out;
  };
  const inJunction = (c: Car) => { const g = roads[c.st].gap; return c.a + c.len > g[0] && c.a < g[1]; };

  it('keeps the junction clear of cross traffic and never lets a vehicle run into the one ahead', () => {
    const cars = make(), dt = 1 / 30;
    let prev: Signals | null = null, t = 0;
    for (let step = 0; step < 30 * 120; step++) {
      t += dt;
      const sig = signalsAt(t);
      stepTraffic(cars, roads, sig, prev, dt);
      prev = sig;
      const x = cars.some(c => c.st === 'x' && inJunction(c)), y = cars.some(c => c.st === 'y' && inJunction(c));
      expect(x && y, `t = ${t.toFixed(2)}`).toBe(false);
      if (step % 15 === 0) {
        const groups = new Map<string, Car[]>();
        for (const c of cars) { const k = `${c.st}${c.lane}${c.track}`; groups.set(k, [...(groups.get(k) ?? []), c]); }
        for (const g of groups.values()) for (const p of g) for (const q of g) if (p !== q) {
          const d = (((q.a - p.a) % 200) + 200) % 200;
          if (d > 0 && d < 100) expect(d).toBeGreaterThanOrEqual(p.dir > 0 ? p.len - 0.05 : 0);
        }
      }
    }
  });
});
