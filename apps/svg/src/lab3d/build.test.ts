import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { crossroadsLayout } from '@core/crossroads';
import { buildCity, type Mats } from './build';

describe('3D lab city', () => {
  const m = () => new THREE.MeshBasicMaterial();
  const M: Mats = { wall: m(), top: m(), glass: m(), road: m(), walk: m(), ground: m(), winOff: m(), winOn: m(), shell: m(), crease: new LineMaterial(), detail: new LineMaterial() };
  const cr = crossroadsLayout(20261021);
  const city = buildCity(cr, M);

  it('builds finite geometry', () => {
    let bad = 0, meshes = 0;
    city.root.traverse(o => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g || !(o as THREE.Mesh).isMesh) return;
      meshes++;
      const a = g.getAttribute('position');
      if (a) for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i]!)) bad++;
    });
    expect(meshes).toBeGreaterThan(300);
    expect(bad).toBe(0);
  });

  it('has a lamp for every tower floor and every house', () => {
    const ids = [...city.lamps.keys()];
    expect(ids.filter(id => id.startsWith('TB/'))).toHaveLength(18);
    expect(ids.filter(id => id.startsWith('NV/'))).toHaveLength(27);
    expect(ids.length).toBe(45 + cr.x.lay.houses.length + cr.y.lay.houses.length);
  });

  it('picks the floor under a click on a tower', () => {
    const tb = [...city.lamps.values()].find(l => l.id === 'TB/1')!.mesh;
    expect(city.pick(tb, 0.2)).toBe('TB/1');
    expect(city.pick(tb, 6.8)).toBe('TB/18');
  });
});
