import { describe, expect, it } from 'vitest';
import { METRO, TRAIN_LEN, metroTracks, trainAt } from './metro';
import type { City } from './city';

const city: City = {
  id: 'm', name: 'm', bounds: { x0: 0, y0: 0, x1: 600, y1: 10 }, region: [{ x0: 0, y0: 0, x1: 600, y1: 10 }],
  streets: [], junctions: [], buildings: [], areas: [], features: [], attribution: [],
  rails: [{ id: 'r1', kind: 'metro', path: [[0, 0], [600, 0]], elevated: true, height: 12.5, source: 'hand:r1' }],
  stations: [{ id: 'st', kind: 'metro', at: [300, 6], platforms: [], source: 'hand:st' }],
};

describe('metro timetable', () => {
  const [tr] = metroTracks(city);
  it('stops each train with its middle at the station, for the dwell time', () => {
    expect(tr!.stops).toHaveLength(1);
    expect(tr!.stops[0]!.s - TRAIN_LEN / 2).toBeCloseTo(300, 6);
    let stopped = 0;
    for (let t = 0; t < tr!.period; t += 0.1) { const a = trainAt(tr!, t - tr!.phase); if (a.phase === 'stop') { stopped += 0.1; expect(a.head).toBeCloseTo(tr!.stops[0]!.s, 6); } }
    expect(stopped).toBeCloseTo(METRO.dwell, 0);
  });

  it('only ever moves forward within a cycle, and is away between trains', () => {
    let last = -Infinity, away = 0;
    for (let t = 0; t < tr!.period; t += 0.05) {
      const a = trainAt(tr!, t - tr!.phase);
      if (a.head === null) { away++; continue; }
      expect(a.head).toBeGreaterThanOrEqual(last - 1e-9);
      last = a.head;
    }
    expect(away).toBeGreaterThan(0);
    expect(last).toBeGreaterThan(600 + TRAIN_LEN - 1);   // the whole train has left the area
  });
});
