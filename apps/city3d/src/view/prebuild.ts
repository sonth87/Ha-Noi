/* Main-thread side of `baseWorker.ts`: start the map in the worker and turn its arrays into layers.
   Anything that goes wrong (no Worker, a worker error, a timeout) resolves to null and the app starts the old
   way on the main thread, so the worker is only ever a speed-up (ADR-058, ADR-059). */
import { primeFurniture, primeRoadNetwork, type City } from '@my-city/core';
import { primeRenderNetwork } from '@render/streets';
import { layersOfBase, type MapBaseBatches } from '@render/city';
import { unpackBatch } from '@render/batchTransfer';
import type { BaseReply } from './baseWorker';

export type PrebuiltBase = ReturnType<typeof layersOfBase>;
export interface WorkerStart { city: City; loadedChunks: string[]; prebuilt: PrebuiltBase }

export function startInWorker(
  areaId: string,
  chunkKeys: string[],
  onImported?: (counts: { buildings: number; streets: number; stations: number }) => void,
  timeoutMs = 60000,
): Promise<WorkerStart | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./baseWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    const finish = (v: WorkerStart | null) => { clearTimeout(timer); worker.terminate(); resolve(v); };
    const timer = setTimeout(() => { console.warn('[city3d] start worker timed out, starting on the main thread'); finish(null); }, timeoutMs);
    worker.onerror = e => { console.warn('[city3d] start worker failed', e.message); finish(null); };
    worker.onmessage = (e: MessageEvent<BaseReply>) => {
      const r = e.data;
      if ('error' in r) { console.warn('[city3d] start worker error', r.error); finish(null); return; }
      if ('progress' in r) { onImported?.(r.counts); return; }
      try {
        const batches: MapBaseBatches = {
          terrain: unpackBatch(r.batches.terrain), major: unpackBatch(r.batches.major), local: unpackBatch(r.batches.local),
          metro: unpackBatch(r.batches.metro), shell: unpackBatch(r.batches.shell), rail: unpackBatch(r.batches.rail),
        };
        const prebuilt = layersOfBase(r.city, batches);
        primeRoadNetwork(r.city, r.network);
        primeRenderNetwork(r.city, r.renderNetwork);
        primeFurniture(r.city, r.furniture);
        finish({ city: r.city, loadedChunks: r.loadedChunks, prebuilt });
      } catch (err) {
        console.warn('[city3d] start worker result unusable', err);
        finish(null);
      }
    };
    worker.postMessage({ areaId, chunkKeys });
  });
}
