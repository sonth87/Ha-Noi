import { describe, expect, it } from 'vitest';
import { lruEvictions } from './tileIndex';

type Item = { id: string; lastUsed: number; at: [number, number] };
const item = (id: string, lastUsed: number, x: number): Item => ({ id, lastUsed, at: [x, 0] });
const run = (built: Item[], max: number, now = 10) =>
  lruEvictions(new Set(built), max, now, { x: 0, z: 0 }, 500, i => i.at, () => 30).map(i => i.id);

describe('lruEvictions', () => {
  it('frees nothing under the cap', () => {
    expect(run([item('a', 1, 2000)], 1)).toEqual([]);
  });
  it('frees the least recently used far ones, as many as over the cap', () => {
    expect(run([item('old', 1, 2000), item('older', 0, 3000), item('newer', 5, 2500), item('near', 0, 100)], 2)).toEqual(['older', 'old']);
  });
  it('never frees what is near the focus or used this tick, even over the cap', () => {
    expect(run([item('near', 0, 100), item('now', 10, 3000)], 0)).toEqual([]);
  });
});
