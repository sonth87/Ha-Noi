/* Bridge decks (docs/architecture/case-studies.md CS-03): where two decks meet, split or run over each other,
   no railing may stand on the other deck's road surface (that is what drew a Y of parapets). */
import { describe, expect, it } from 'vitest';
import type { Vec2 } from '@my-city/core';
import { onOtherDeck } from './streets';

const flat = (path: Vec2[], width: number, z = 6) => ({ path, width, profile: [[0, z], [1000, z]] as [number, number][] });

describe('a railing on another deck', () => {
  // a 7 m deck along +x, and a branch that leaves it at ~6° (a Y)
  const main = flat([[0, 0], [200, 0]], 7);
  const branch = flat([[0, 0], [200, 21]], 7);

  it('is detected where the two decks overlap (the inner railings of the Y)', () => {
    // 30 m from the split the branch centre line is at y ≈ 3.15: its inner railing (3.9 m from it) falls on the
    // main deck, and the main deck's inner railing (y = 3.9) falls on the branch
    expect(onOtherDeck([30, 3.15 - 3.9], 6, [main])).toBe(true);
    expect(onOtherDeck([30, 3.9], 6, [branch])).toBe(true);
  });

  it('is kept once the decks have parted, on the outside, and for a deck passing over at another height', () => {
    expect(onOtherDeck([190, 20 - 3.9], 6, [main])).toBe(false);    // far down the branch
    expect(onOtherDeck([30, -3.9], 6, [main])).toBe(false);          // outer railing of the main deck's far side is its own
    expect(onOtherDeck([30, 0], 12, [main])).toBe(false);            // a deck crossing 6 m above
  });
});
