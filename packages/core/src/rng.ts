/* Seeded randomness: the same seed always gives the same city (ported unchanged from apps/svg). */

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [lo, hi] inclusive */
  int(lo: number, hi: number): number;
  /** one element of a non-empty list */
  pick<T>(list: readonly T[]): T;
  /** true with probability p */
  chance(p: number): boolean;
}

/** mulberry32: small, fast, good enough for visual variation. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: list => {
      if (list.length === 0) throw new Error('rng.pick: empty list');
      return list[Math.floor(next() * list.length)]!;
    },
    chance: p => next() < p,
  };
}

/** FNV-1a: a stable 32-bit seed from a string (e.g. a house id). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
