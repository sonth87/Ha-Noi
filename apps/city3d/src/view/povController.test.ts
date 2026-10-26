import { describe, expect, it } from 'vitest';
import type { City, Street } from '@my-city/core';
import { PovController } from './povController';

const street = (id: string, name: string, path: [number, number][]): Street =>
  ({ id, name, kind: 'secondary', path, width: 10, layer: 0, profile: [], source: `osm:way/${id}` }) as unknown as Street;

describe('PovController road index (CS-09)', () => {
  it('drives on streets of a chunk that arrived after start', () => {
    const start = street('1', 'Phố Đầu', [[0, 0], [200, 0]]);
    const pov = new PovController({ streets: [start] } as unknown as City, { x0: -5000, y0: -5000, x1: 5000, y1: 5000 });
    const later = street('2', 'Phố Sau', [[3000, 3000], [3300, 3000]]);
    pov.addStreets([later]);
    pov.spawnCarAtDrop(3150, 3002);
    expect(pov.getTelemetry().locationName).toBe('Phố Sau');
  });
});
