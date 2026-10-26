import { describe, expect, it } from 'vitest';
import { loadCityStreamingInitAsync } from '@my-city/osm-import';
import { ChunkClient } from './chunkClient';

describe('ChunkClient', () => {
  /** Node has no Worker: the same import runs here, which is also the fallback when the worker fails */
  it('imports a chunk without a worker', async () => {
    const { city } = await loadCityStreamingInitAsync('vn/ha-noi', ['0,0']);
    const client = new ChunkClient('vn/ha-noi', city.streets);
    const chunk = await client.load('2,0');
    expect(chunk?.buildings.length).toBeGreaterThan(100);
    client.dispose();
  }, 120_000);
});
