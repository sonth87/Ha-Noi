import { describe, expect, it } from 'vitest';
import { ChunkStreamer, MAX_TRIES } from './chunkStreamer';

const streamer = (keys: string[]) => { const s = new ChunkStreamer(); for (const k of keys) s.available.add(k); return s; };

describe('ChunkStreamer', () => {
  it('asks for at most two, nearest the focus first, and only available ones', () => {
    const s = streamer(['0,0', '1,0', '-1,0', '0,1', '5,5']);
    expect(s.next(900, 500, 0)).toEqual(['0,0', '1,0']);
    expect(s.next(900, 500, 0)).toEqual([]);
    s.markLoaded('0,0');
    expect(s.next(900, 500, 0)).toEqual(['0,1']);
  });

  it('backs off a failed chunk and gives up after MAX_TRIES', () => {
    const s = streamer(['0,0']);
    let now = 0;
    for (let i = 1; i <= MAX_TRIES; i++) {
      expect(s.next(10, 10, now)).toEqual(['0,0']);
      expect(s.markFailed('0,0', now)).toBe(i);
      expect(s.next(10, 10, now + 1)).toEqual([]);
      now += 2000 * 2 ** (i - 1) + 1;
    }
    expect(s.next(10, 10, now + 1e9)).toEqual([]);
  });

  it('is done once every chunk is loaded', () => {
    const s = streamer(['0,0']);
    expect(s.done).toBe(false);
    s.markLoaded('0,0');
    expect(s.done).toBe(true);
    expect(s.next(0, 0, 0)).toEqual([]);
  });
});
