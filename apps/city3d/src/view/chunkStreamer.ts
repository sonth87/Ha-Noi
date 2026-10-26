/* Which 1024 m map chunks to fetch next, and their load state (split out of CityView, city3d.md §8). At most two
   in flight, nearest the focus first, from the 3 × 3 chunks around it; a failed chunk is retried after 2 s, 4 s,
   8 s and given up after MAX_TRIES (ADR-058). No three.js, no DOM: tested in Node. */

export const CHUNK_SIZE = 1024;
export const MAX_TRIES = 4;
const MAX_IN_FLIGHT = 2;

export class ChunkStreamer {
  readonly available = new Set<string>();
  readonly loaded = new Set<string>();
  readonly loading = new Set<string>();
  private readonly failures = new Map<string, { tries: number; retryAt: number }>();

  get done(): boolean { return this.available.size === 0 || this.loaded.size >= this.available.size; }

  /** chunk keys to start fetching now around (fx, fz), nearest first; marks them loading */
  next(fx: number, fz: number, now: number): string[] {
    if (this.done || this.loading.size >= MAX_IN_FLIGHT) return [];
    const cx = Math.floor(fx / CHUNK_SIZE), cy = Math.floor(fz / CHUNK_SIZE);
    const candidates: { key: string; d2: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        if (!this.available.has(key) || this.loaded.has(key) || this.loading.has(key)) continue;
        const failed = this.failures.get(key);
        if (failed && (failed.tries >= MAX_TRIES || now < failed.retryAt)) continue;
        const d2 = ((cx + dx + 0.5) * CHUNK_SIZE - fx) ** 2 + ((cy + dy + 0.5) * CHUNK_SIZE - fz) ** 2;
        candidates.push({ key, d2 });
      }
    }
    const keys = candidates.sort((a, b) => a.d2 - b.d2).slice(0, MAX_IN_FLIGHT - this.loading.size).map(c => c.key);
    for (const k of keys) this.loading.add(k);
    return keys;
  }

  /** the chunk arrived (or has no data) */
  markLoaded(key: string) {
    this.loaded.add(key);
    this.loading.delete(key);
  }

  /** the fetch failed: back off; returns the number of tries so far */
  markFailed(key: string, now: number): number {
    this.loading.delete(key);
    const tries = (this.failures.get(key)?.tries ?? 0) + 1;
    this.failures.set(key, { tries, retryAt: now + 2000 * 2 ** (tries - 1) });
    return tries;
  }
}
