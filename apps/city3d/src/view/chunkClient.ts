/* Main-thread side of `chunkWorker.ts`: `load(key)` resolves with the imported chunk. Without a Worker, or
   once the worker has failed, chunks are imported on the main thread as before (the same function). */
import type { City, Street } from '@my-city/core';
import { loadCityChunkCityAsync } from '@my-city/osm-import';
import type { ChunkReply } from './chunkWorker';

export class ChunkClient {
  private worker: Worker | null = null;
  private readonly waiting = new Map<string, { resolve: (c: City | null) => void; reject: (e: Error) => void }>();

  constructor(private readonly areaId: string, private readonly streets: readonly Street[]) {
    if (typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<ChunkReply>) => {
        const w = this.waiting.get(e.data.key);
        if (!w) return;
        this.waiting.delete(e.data.key);
        if ('error' in e.data) w.reject(new Error(e.data.error)); else w.resolve(e.data.city);
      };
      this.worker.onerror = e => {
        console.warn('[city3d] chunk worker failed, importing on the main thread', e.message);
        this.stopWorker();
      };
      this.worker.postMessage({ init: { areaId, streets: [...streets] } });
    } catch {
      this.worker = null;
    }
  }

  load(key: string): Promise<City | null> {
    if (!this.worker) return loadCityChunkCityAsync(this.areaId, key, this.streets);
    return new Promise((resolve, reject) => {
      this.waiting.set(key, { resolve, reject });
      this.worker!.postMessage({ key });
    });
  }

  /** the worker is gone: what was waiting on it is imported here */
  private stopWorker() {
    this.worker?.terminate();
    this.worker = null;
    for (const [key, w] of this.waiting) loadCityChunkCityAsync(this.areaId, key, this.streets).then(w.resolve, w.reject);
    this.waiting.clear();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}
