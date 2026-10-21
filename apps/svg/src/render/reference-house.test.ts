import { describe, expect, it } from 'vitest';
import { MAIN_FLOORS, renderReferenceHouse } from '@render/reference-house';

describe('reference house', () => {
  const d = renderReferenceHouse();

  it('produces finite geometry', () => {
    expect(d.svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(d.viewBox).toMatch(/^0 0 \d+(\.\d)? \d+(\.\d)?$/);
  });

  it('exposes every lightable floor once, main house first', () => {
    expect(new Set(d.floors).size).toBe(d.floors.length);
    for (const f of MAIN_FLOORS) expect(d.floors).toContain(f);
    expect(d.floors).toHaveLength(12);   // L1–L6, M1–M5, R1
    for (const f of d.floors) expect(d.svg).toContain(`data-floor="${f}"`);
  });

  it('is reproducible for the same seed (NFR-06) and varies with another', () => {
    expect(renderReferenceHouse(11).svg).toBe(d.svg);
    expect(renderReferenceHouse(12).svg).not.toBe(d.svg);
  });

  it('has pulses on the wires', () => {
    expect(d.pulses).toBeGreaterThan(0);
    expect(d.svg.match(/class="pulse"/g)).toHaveLength(d.pulses);
  });
});
