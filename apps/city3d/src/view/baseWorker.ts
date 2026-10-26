/* Web Worker: the heavy, pure part of starting the map. It builds the road network, the street
   furniture and the six batches of the map base (ground, major streets and bridges, metro, station
   shells, rails) off the main thread, and sends them back as typed arrays. `prebuild.ts` is the other end. */
import { roadNetwork, streetFurniture, type City } from '@my-city/core';
import { buildMapBaseBatches } from '@render/city';
import { exportRenderNetwork, type RenderNetwork } from '@render/streets';
import { packBatch, type BatchData } from '@render/batchTransfer';

export interface BaseRequest { city: City }
export type BaseReply =
  | { error: string }
  | { batches: Record<'terrain' | 'major' | 'local' | 'metro' | 'shell' | 'rail', BatchData>; furniture: ReturnType<typeof streetFurniture>; network: ReturnType<typeof roadNetwork>; renderNetwork: RenderNetwork };

const scope = self as unknown as {
  onmessage: ((e: { data: BaseRequest }) => void) | null;
  postMessage(msg: BaseReply, transfer?: ArrayBuffer[]): void;
};

scope.onmessage = ({ data }) => {
  try {
    const { city } = data;
    const b = buildMapBaseBatches(city, true);
    const network = roadNetwork(city);
    const furniture = streetFurniture(city, network);
    const transfer: ArrayBuffer[] = [];
    const pack = (B: typeof b.terrain) => { const p = packBatch(B); transfer.push(...p.transfer); return p.data; };
    const batches = { terrain: pack(b.terrain), major: pack(b.major), local: pack(b.local), metro: pack(b.metro), shell: pack(b.shell), rail: pack(b.rail) };
    scope.postMessage({ batches, furniture, network, renderNetwork: exportRenderNetwork(city) }, transfer);
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
