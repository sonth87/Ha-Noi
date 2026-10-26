import { describe, expect, it } from 'vitest';
import { UrlSync } from './urlSync';
import type { UrlViewState } from './urlState';

const st = (x: number): UrlViewState => ({ x, z: 0, zoom: 1, heading: 0, tilt: 35, mode: '2d' });

describe('UrlSync', () => {
  it('writes a change once it has settled, not on every frame', () => {
    const u = new UrlSync();
    expect(u.step(st(1), 0, false, true)).not.toBeNull();
    expect(u.step(st(2), 1000, false)).toBeNull();          // just changed
    expect(u.step(st(2), 1350, false)).not.toBeNull();      // settled 350 ms
    expect(u.step(st(2), 2000, false)).toBeNull();          // nothing new
  });
  it('while dragging, at most every 1.2 s', () => {
    const u = new UrlSync();
    u.step(st(0), 0, false, true);
    expect(u.step(st(1), 500, true)).toBeNull();
    expect(u.step(st(2), 1300, true)).not.toBeNull();
  });
});
