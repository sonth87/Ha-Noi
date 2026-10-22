import { describe, expect, it } from 'vitest';
import { CYCLE, CYCLE_T, signalsAt, spawnTraffic, stepTraffic, trafficLanes, type Lane, type Signals } from './traffic';
import type { Network } from './network';

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

describe('trafficLanes', () => {
  it('places two-way directions on opposite sides of the road and aligns with per-segment lane centers', () => {
    const net: Network = {
      roads: [
        {
          id: 'r1', name: 'Phố Chùa Bộc', kind: 'secondary',
          path: [[0, 0], [100, 0]], width: 7, lanes: 2, oneway: false,
          layer: 0, sidewalk: { left: 3, right: 3 }, profile: [[0, 0], [100, 0]], streets: ['s1'],
        },
      ],
      nodes: [],
      runs: [],
      routes: [
        {
          id: 'route-0', name: 'Phố Chùa Bộc', kind: 'secondary', oneway: false, layer: 0,
          parts: [{ road: 'r1', from: 0, to: 100, reversed: false }],
          nodes: [],
          path: [[0, 0], [100, 0]],
        },
      ],
    };
    const built = trafficLanes(net);
    expect(built).toHaveLength(2);
    const [fwd, back] = built;
    // In city coordinates (+x = east, +y = south), right-hand side of +x is y = +1.75, and right-hand side of -x is y = -1.75
    expect(fwd!.path[0]![1]).toBeCloseTo(1.75, 5);
    expect(back!.path[0]![1]).toBeCloseTo(-1.75, 5);
  });
});

describe('traffic model', () => {
  // two 200 m lanes: one along x stopping at 95 m for light x, one along y stopping at 90 m for light y
  const lane = (id: string, path: [number, number][], stop: number, group: 'x' | 'y'): Lane => ({ id, route: id, path, length: 200, profile: [], stops: [{ s: stop, group }], carsOnly: false, bikesOnly: false, width: 3.25 });
  const lanes = [lane('ax', [[0, 0], [200, 0]], 95, 'x'), lane('ay', [[100, -100], [100, 100]], 90, 'y')];

  it('spawns evenly, by density, none on top of another', () => {
    expect(spawnTraffic(lanes, 0)).toEqual([]);
    const full = spawnTraffic(lanes, 1), half = spawnTraffic(lanes, 0.5);
    expect(full.length).toBeGreaterThan(half.length);
    expect(spawnTraffic(lanes, 1)).toEqual(full);
  });

  it('never runs a red light, never runs into the one ahead, keeps everything moving', () => {
    const cars = spawnTraffic(lanes, 1), dt = 1 / 30, moved = new Map(cars.map(c => [c, 0]));
    let prev: Signals | null = null, t = 0;
    for (let step = 0; step < 30 * 150; step++) {
      t += dt;
      const sig = signalsAt(t), before = cars.map(c => c.s);
      stepTraffic(cars, lanes, sig, prev, dt);
      cars.forEach((c, i) => {
        const ln = lanes[c.lane]!, stop = ln.stops[0]!, f0 = before[i]! + c.len, f1 = c.s + c.len;
        // crossing the line this step on red is only allowed when it decided to go on at yellow
        if (f0 < stop.s && f1 >= stop.s && sig[stop.group] === 'stop') expect(c.commit, `${c.id} t=${t.toFixed(2)}`).toBe(true);
        moved.set(c, moved.get(c)! + ((c.s - before[i]! + 200) % 200));
      });
      prev = sig;
      if (step % 15 === 0) {
        const byLane = new Map<number, typeof cars>();
        for (const c of cars) byLane.set(c.lane, [...(byLane.get(c.lane) ?? []), c]);
        for (const g of byLane.values()) for (const p of g) for (const q of g) if (p !== q) {
          if (p.track !== q.track && p.kind === 'bike' && q.kind === 'bike') continue;
          const d = (((q.s - p.s) % 200) + 200) % 200;
          if (d > 0 && d < 100) expect(d).toBeGreaterThanOrEqual(p.len - 0.05);
        }
      }
    }
    for (const [c, m] of moved) expect(m, c.id).toBeGreaterThan(150);
  }, 20_000);   // 150 s of traffic: ~1 s alone, more when every package tests at once
});
