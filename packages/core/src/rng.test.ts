import { describe, expect, it } from 'vitest';
import { hash, rng } from './rng';

describe('rng', () => {
  it('repeats exactly for the same seed', () => {
    const a = rng(42), b = rng(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    expect(rng(1).next()).not.toBe(rng(2).next());
  });

  it('stays in range', () => {
    const r = rng(7);
    for (let i = 0; i < 1000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('picks from the list and rejects an empty one', () => {
    const r = rng(9);
    for (let i = 0; i < 100; i++) expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
    expect(() => r.pick([])).toThrow();
  });
});

describe('hash', () => {
  it('is stable and spreads nearby ids', () => {
    expect(hash('TH-01')).toBe(hash('TH-01'));
    expect(hash('TH-01')).not.toBe(hash('TH-02'));
    expect(hash('')).toBe(0x811c9dc5);
  });
});
