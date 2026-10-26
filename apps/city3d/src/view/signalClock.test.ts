import { describe, expect, it } from 'vitest';
import { roadNetwork, signalsAt } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { SignalClock } from './signalClock';

const net = roadNetwork(loadCity('nga-tu-thai-ha').city);

describe('SignalClock (CS-09)', () => {
  const clock = new SignalClock(net);
  it('keeps the plain cycle at the main crossroads (what the status line shows)', () => {
    expect(clock.main).not.toBeNull();
    for (let t = 0; t < 40; t += 3) expect(clock.at(t, clock.main!)).toEqual(signalsAt(t));
  });
  it('switches the lamps of junctions around the view only, and only when their phase changes', () => {
    const first = clock.lampChanges(0, 0, 0, 300);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length % 6).toBe(0);
    expect(first.every(([id]) => id.startsWith('signal/'))).toBe(true);
    expect(clock.lampChanges(0.1, 0, 0, 300)).toEqual([]);
    const far = clock.lampChanges(0, 0, 0, 5000);
    expect(far.length).toBeGreaterThan(0);
  });
});
