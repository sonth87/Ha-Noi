import { describe, expect, it } from 'vitest';
import { CYCLE, CYCLE_T, signalsAt, stepTraffic, type Car, type Signals } from '@core/traffic';
import { crossroadsLayout } from '@core/crossroads';

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
  const cr = crossroadsLayout(20261021);
  const roads = { x: { length: cr.x.lay.length, gap: cr.x.lay.gap! }, y: { length: cr.y.lay.length, gap: cr.y.lay.gap! } };
  const make = (): Car[] => (['x', 'y'] as const).flatMap(st => cr[st].lay.vehicles.map(v => {
    const ln = cr[st].lay.section.lanes[v.lane]!;
    return { st, lane: v.lane, track: v.track, len: v.kind === 'bike' ? 18 : { sedan: 44, hatch: 38, taxi: 44, van: 48 }[v.kind], dir: ln.dir, v: v.v, a: v.a0, signal: !ln.fly };
  }));
  const inJunction = (c: Car) => { const g = roads[c.st].gap; return c.a + c.len > g[0] && c.a < g[1]; };

  it('keeps the junction clear of cross traffic, never lets a vehicle run into the one ahead, keeps everything moving', () => {
    const cars = make(), dt = 1 / 30;
    let prev: Signals | null = null, t = 0;
    const moved = new Map(cars.map(c => [c, 0]));
    for (let step = 0; step < 30 * 150; step++) {
      t += dt;
      const sig = signalsAt(t), before = cars.map(c => c.a);
      stepTraffic(cars, roads, sig, prev, dt);
      prev = sig;
      cars.forEach((c, i) => moved.set(c, moved.get(c)! + Math.abs(c.a - before[i]!) % (roads[c.st].length / 2)));
      // at-grade traffic of both streets is never inside the junction at the same time
      const x = cars.some(c => c.st === 'x' && c.signal && inJunction(c)), y = cars.some(c => c.st === 'y' && inJunction(c));
      expect(x && y, `t = ${t.toFixed(2)} ${sig.x}/${sig.y} ` + JSON.stringify(cars.filter(c => (c.signal || c.st === 'y') && inJunction(c)).map(c => [c.st, c.lane, c.track, c.len, Math.round(c.a), c.v, c.commit]))).toBe(false);
      // a red light is obeyed: nobody enters the junction on red
      for (const c of cars) if (c.signal && sig[c.st] === 'stop') {
        const g = roads[c.st].gap, front = c.dir > 0 ? c.a + c.len : c.a, entering = c.dir > 0 ? front > g[0] && c.a < g[0] - 2 : front < g[1] && c.a + c.len > g[1] + 2;
        if (entering) expect(c.commit, `${c.st}${c.lane} t=${t.toFixed(2)}`).not.toBe(false);
      }
      // no overlaps within a lane and track
      if (step % 15 === 0) {
        const groups = new Map<string, Car[]>();
        for (const c of cars) { const k = `${c.st}${c.lane}${c.track}`; groups.set(k, [...(groups.get(k) ?? []), c]); }
        for (const g of groups.values()) {
          const L = roads[g[0]!.st].length;
          for (const p of g) for (const q of g) if (p !== q) {
            const d = (((q.a - p.a) % L) + L) % L;          // q's tail ahead of p's tail
            if (d > 0 && d < L / 2) expect(d, `${g[0]!.st} lane ${p.lane}`).toBeGreaterThanOrEqual(p.dir > 0 ? p.len - 0.5 : 0);
          }
        }
      }
    }
    for (const [c, m] of moved) expect(m, `${c.st}${c.lane}`).toBeGreaterThan(400);
  });
});
