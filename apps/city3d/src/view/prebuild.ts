/* Main-thread side of `baseWorker.ts`: ask the worker for the map base and turn its arrays into layers.
   Anything that goes wrong (no Worker, a city that cannot be cloned, a worker error, a timeout) resolves
   to null and `CityView` builds the base itself, exactly as before, so the worker is only ever a speed-up. */
import { primeFurniture, primeRoadNetwork, type City } from '@my-city/core';
import { primeRenderNetwork } from '@render/streets';
import { layersOfBase, type MapBaseBatches } from '@render/city';
import { unpackBatch } from '@render/batchTransfer';
import type { BaseReply } from './baseWorker';

export type PrebuiltBase = ReturnType<typeof layersOfBase>;

export function prebuildBase(city: City, timeoutMs = 45000): Promise<PrebuiltBase | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./baseWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    const finish = (v: PrebuiltBase | null) => { clearTimeout(timer); worker.terminate(); resolve(v); };
    const timer = setTimeout(() => { console.warn('[city3d] base worker timed out, building on the main thread'); finish(null); }, timeoutMs);
    worker.onerror = e => { console.warn('[city3d] base worker failed', e.message); finish(null); };
    worker.onmessage = (e: MessageEvent<BaseReply>) => {
      const r = e.data;
      if ('error' in r) { console.warn('[city3d] base worker error', r.error); finish(null); return; }
      try {
        const batches: MapBaseBatches = {
          terrain: unpackBatch(r.batches.terrain), major: unpackBatch(r.batches.major), local: unpackBatch(r.batches.local),
          metro: unpackBatch(r.batches.metro), shell: unpackBatch(r.batches.shell), rail: unpackBatch(r.batches.rail),
        };
        const layers = layersOfBase(city, batches);
        primeRoadNetwork(city, r.network);
        primeRenderNetwork(city, r.renderNetwork);
        primeFurniture(city, r.furniture);
        finish(layers);
      } catch (err) {
        console.warn('[city3d] base worker result unusable', err);
        finish(null);
      }
    };
    try { worker.postMessage({ city }); } catch (err) { console.warn('[city3d] city not cloneable', err); finish(null); }
  });
}
