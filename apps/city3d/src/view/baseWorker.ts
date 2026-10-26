/* Web Worker: the whole heavy start of the map, off the main thread (ADR-058, ADR-059). It downloads the
   skeleton and the first chunks, imports them into a City (~0.4 s on a laptop, several times that on a
   tablet), builds the road network, the street furniture and the six batches of the map base, and sends it
   all back once: the city by structured clone, the batches as transferred typed arrays. `prebuild.ts` is
   the other end; any failure there falls back to the old main-thread start. */
import { roadNetwork, streetFurniture, type City } from '@my-city/core';
import { loadCityStreamingInitAsync } from '@my-city/osm-import';
import { buildMapBaseBatches } from '@render/city';
import { exportRenderNetwork, type RenderNetwork } from '@render/streets';
import { packBatch, type BatchData } from '@render/batchTransfer';

export interface BaseRequest { areaId: string; chunkKeys: string[] }
export type BaseReply =
  | { error: string }
  | { progress: 'imported'; counts: { buildings: number; streets: number; stations: number } }
  | {
    city: City;
    loadedChunks: string[];
    batches: Record<'terrain' | 'major' | 'local' | 'metro' | 'shell' | 'rail', BatchData>;
    furniture: ReturnType<typeof streetFurniture>;
    network: ReturnType<typeof roadNetwork>;
    renderNetwork: RenderNetwork;
  };

const scope = self as unknown as {
  onmessage: ((e: { data: BaseRequest }) => void) | null;
  postMessage(msg: BaseReply, transfer?: ArrayBuffer[]): void;
};

scope.onmessage = ({ data }) => {
  void (async () => {
    try {
      const { city, loadedChunks } = await loadCityStreamingInitAsync(data.areaId, data.chunkKeys);
      scope.postMessage({ progress: 'imported', counts: { buildings: city.buildings.length, streets: city.streets.length, stations: city.stations.length } });
      const b = buildMapBaseBatches(city, true);
      const network = roadNetwork(city);
      const furniture = streetFurniture(city, network);
      const transfer: ArrayBuffer[] = [];
      const pack = (B: typeof b.terrain) => { const p = packBatch(B); transfer.push(...p.transfer); return p.data; };
      const batches = { terrain: pack(b.terrain), major: pack(b.major), local: pack(b.local), metro: pack(b.metro), shell: pack(b.shell), rail: pack(b.rail) };
      scope.postMessage({ city, loadedChunks, batches, furniture, network, renderNetwork: exportRenderNetwork(city) }, transfer);
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
    }
  })();
};
