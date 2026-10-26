/* The base worker (view/baseWorker.ts) builds the map base off the main thread and ships it back as typed
   arrays. The worker itself needs a browser, but everything that crosses its boundary can be tested here:
   the city must be cloneable, and batches, road network, render network and furniture must survive the
   trip and give exactly the layers the main thread would have built. */
import { describe, expect, it } from 'vitest';
import { primeFurniture, primeRoadNetwork, roadNetwork, streetFurniture } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { buildMapBaseBatches, buildMapBaseLayers, layersOfBase, type MapBaseBatches } from './city';
import { packBatch, unpackBatch } from './batchTransfer';
import { exportRenderNetwork, primeRenderNetwork } from './streets';

const { city } = loadCity('nga-tu-thai-ha');

describe('base worker boundary', () => {
  it('the city, the road network, the render network and the furniture are structured-cloneable', () => {
    expect(() => structuredClone(city)).not.toThrow();
    const copy = structuredClone(city);
    expect(() => structuredClone(roadNetwork(copy))).not.toThrow();
    expect(() => structuredClone(exportRenderNetwork(copy))).not.toThrow();
    expect(() => structuredClone(streetFurniture(copy))).not.toThrow();
  }, 60000);

  it('gives the same layers after a round trip as building them directly', () => {
    const direct = buildMapBaseLayers(city, undefined, undefined, true);
    // what the worker does, on a clone of the city
    const inWorker = structuredClone(city);
    const b = buildMapBaseBatches(inWorker, true);
    const net = roadNetwork(inWorker), furniture = streetFurniture(inWorker, net), render = exportRenderNetwork(inWorker);
    const packed = (B: typeof b.terrain) => packBatch(B);
    const parts = { terrain: packed(b.terrain), major: packed(b.major), local: packed(b.local), metro: packed(b.metro), shell: packed(b.shell), rail: packed(b.rail) };
    const transfer = Object.values(parts).flatMap(p => p.transfer);
    const wire = structuredClone({ batches: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.data])), furniture, network: net, render }, { transfer });
    // what the main thread does with the reply
    const batches = Object.fromEntries(Object.entries(wire.batches).map(([k, v]) => [k, unpackBatch(v)])) as unknown as MapBaseBatches;
    const layers = layersOfBase(city, batches);
    primeRoadNetwork(city, wire.network);
    primeRenderNetwork(city, wire.render);
    primeFurniture(city, wire.furniture);
    for (const k of ['terrain', 'majorStreets', 'metro'] as const) expect(layers[k].stats, k).toEqual(direct[k].stats);
    expect(layers.majorStreets.surfaces.size).toBe(direct.majorStreets.surfaces.size);
    expect(streetFurniture(city).props.length).toBe(streetFurniture(structuredClone(city)).props.length);
  }, 120000);
});
