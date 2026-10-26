import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdleQueue } from './idleQueue';

describe('IdleQueue (A22)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('waits while busy, then runs one job per slot and calls afterAll', () => {
    let busy = true;
    const done: number[] = [];
    const after = vi.fn();
    const q = new IdleQueue(() => busy, after);
    q.push(() => done.push(1));
    q.push(() => done.push(2));
    vi.advanceTimersByTime(1000);
    expect(done).toEqual([]);
    busy = false;
    vi.advanceTimersToNextTimer();
    expect(done).toEqual([1]);
    vi.advanceTimersToNextTimer();
    expect(done).toEqual([1, 2]);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('flush runs what is left at once', () => {
    const done: number[] = [];
    const q = new IdleQueue(() => true);
    q.push(() => done.push(1));
    q.flush();
    expect(done).toEqual([1]);
    expect(q.pending).toBe(0);
  });
});
