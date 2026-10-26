import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
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

describe('driving from the driver seat (ADR-064)', () => {
  it('puts the camera inside the car, on the left seat at eye height, looking ahead', () => {
    const road = street('1', 'Phố Thẳng', [[0, 0], [400, 0]]);
    const pov = new PovController({ streets: [road], stations: [], rails: [] } as unknown as City, { x0: -5000, y0: -5000, x1: 5000, y1: 5000 });
    pov.spawnCarAtDrop(100, 0, 0);
    pov.setMode('drive-inside', [], { x: 100, z: 0 }, 0, true);
    pov.step(1 / 60, 0, [], false);
    const cam = pov.camera.position;
    // three.js: x = city x, z = city y, y = height
    expect(cam.y).toBeGreaterThan(1);
    expect(cam.y).toBeLessThan(1.6);
    expect(Math.hypot(cam.x - 100, cam.z - 2)).toBeLessThan(2.5);   // within the car, not metres behind it
    const look = new THREE.Vector3();
    pov.camera.getWorldDirection(look);
    expect(look.x).toBeGreaterThan(0.9);                               // along the car's heading (east)
  });
});
