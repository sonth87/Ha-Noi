import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { centroid } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { buildTile, tilesOf, type Layer } from '@render/city';
import type { Surface } from '@render/batch';
import { BvhBuilder, buildBvh, needsBvh, withFastRaycast } from './picking';

const { city } = loadCity('nga-tu-thai-ha');
/** the busiest of the tiles near the crossroads */
const tile = tilesOf(city).sort((a, b) => Math.hypot(...a.center) - Math.hypot(...b.center)).slice(0, 30).sort((a, b) => b.buildings.length - a.buildings.length)[0]!;
const layer: Layer = buildTile(city, tile, 2);
const meshes = (fast: boolean) => [...layer.surfaces].map(([s, g]) => {
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  m.userData = { surface: s };
  if (fast) withFastRaycast(m);
  m.updateMatrixWorld();
  return m;
});
/** what a click resolves to: building, floor and the exact triangle */
const pick = (ms: THREE.Mesh[], ray: THREE.Raycaster) => {
  const hit = ray.intersectObjects(ms, false)[0];
  if (!hit || hit.faceIndex == null) return null;
  const owner = layer.ownerOf(hit.object.userData.surface as Surface, hit.faceIndex);
  return { owner, floor: owner ? layer.floorAt(owner, hit.point) : undefined, face: hit.faceIndex, d: +hit.distance.toFixed(3) };
};

describe('BVH picking (ADR-059)', () => {
  it('hits the same triangle, building and floor as a plain raycast', () => {
    const plain = meshes(false);
    for (const g of layer.surfaces.values()) buildBvh(g);
    const fast = meshes(true);
    const ray = new THREE.Raycaster();
    let compared = 0;
    for (const bldg of tile.buildings) {
      const [x, z] = centroid(bldg.footprint);
      ray.set(new THREE.Vector3(x + 300, 250, z + 300), new THREE.Vector3(-300, -246, -300).normalize());
      const a = pick(plain, ray), b = pick(fast, ray);
      expect(b).toEqual(a);
      if (a) compared++;
    }
    expect(compared).toBeGreaterThan(tile.buildings.length / 2);
  });

  it('builds one big geometry per idle step and skips small ones', () => {
    const big = new THREE.PlaneGeometry(1, 1, 200, 60);
    const fake = { surfaces: new Map([['ground', big], ['wall', new THREE.PlaneGeometry()]]) } as unknown as Layer;
    const b = new BvhBuilder(() => [fake], () => false);
    expect(needsBvh(big)).toBe(true);
    expect(b.step()).toBe(true);
    expect(needsBvh(big)).toBe(false);
    expect(b.step()).toBe(false);
    b.stop();
  });
});
