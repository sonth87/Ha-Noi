/* Web Worker that imports streamed map chunks off the main thread (ADR-059): fetch + importArea took 40–180 ms
   per chunk on a laptop, while the user drags. It lives as long as the map; the skeleton streets (that chunk
   buildings face) come once at start, not with every request. `chunkClient.ts` is the other end. */
import type { City, Street } from '@my-city/core';
import { loadCityChunkCityAsync } from '@my-city/osm-import';

export type ChunkRequest = { init: { areaId: string; streets: Street[] } } | { key: string };
export type ChunkReply = { key: string; city: City | null } | { key: string; error: string };

const scope = self as unknown as { onmessage: ((e: { data: ChunkRequest }) => void) | null; postMessage(msg: ChunkReply): void };
let areaId = '';
let streets: Street[] = [];

scope.onmessage = ({ data }) => {
  if ('init' in data) { areaId = data.init.areaId; streets = data.init.streets; return; }
  const { key } = data;
  loadCityChunkCityAsync(areaId, key, streets)
    .then(city => scope.postMessage({ key, city }))
    .catch((err: unknown) => scope.postMessage({ key, error: err instanceof Error ? err.message : String(err) }));
};
