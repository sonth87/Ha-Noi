import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { roadNetwork, spawnTraffic, streetFurniture, trafficLanes } from '@my-city/core';
import { loadCity } from '@my-city/osm-import';
import { STREET_LAMPS, buildFurniture, signalLamp } from './furniture';
import { placeVehicle, vehicleModel } from './vehicles';
import { Batch } from './batch';
import { buildMetro, carModel, stationLamp } from './metro';

const { city: fullCity } = loadCity('nga-tu-thai-ha');
const city = {
  ...fullCity,
  streets: fullCity.streets.filter(s => s.path.some(p => Math.hypot(p[0], p[1]) <= 800)),
  areas: fullCity.areas.filter(a => a.polygon.some(p => Math.hypot(p[0], p[1]) <= 800)),
};
const net = roadNetwork(city), cells = buildFurniture(streetFurniture(city, net));
const finite = (g: THREE.BufferGeometry) => {
  const arr = g.getAttribute('position').array;
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i]!)) return false;
  return true;
};

describe('street furniture in 3D', () => {
  it('builds every cell, finite, with lamps that light', () => {
    expect(cells.length).toBeGreaterThan(10);
    for (const c of cells) for (const l of [c.poles, c.fixtures, c.trees, c.simpleTrees]) for (const g of l.surfaces.values()) expect(finite(g)).toBe(true);
    const lamps = new Set(cells.flatMap(c => [...c.fixtures.lamps.keys(), ...c.poles.lamps.keys()]));
    expect(lamps.has(STREET_LAMPS)).toBe(true);
    for (const g of ['x', 'y'] as const) for (const l of ['stop', 'wait', 'go'] as const) expect(lamps.has(signalLamp(g, l))).toBe(true);
  });

  it('lights every lamp head on five faces and pools light under each', () => {
    const f = streetFurniture(city, net), lamps = f.props.filter(p => p.kind === 'lamp' || p.kind === 'lamp-on-pole' || p.kind === 'park-lamp').length;
    const faces = cells.reduce((n, c) => n + [c.fixtures, c.poles].reduce((m, l) => m + (l.lamps.get(STREET_LAMPS) ?? []).reduce((a, r) => a + r.count / 6, 0), 0), 0);
    const pools = cells.reduce((n, c) => n + c.pools.getAttribute('position').count / 6, 0);
    expect(lamps).toBeGreaterThan(10);
    expect(faces).toBe(lamps * 5);
    expect(pools).toBe(lamps);
  });

  it('keeps simple trees free of lines', () => {
    for (const c of cells) expect(c.simpleTrees.shell.getAttribute('position').count).toBe(0);
  });
});

describe('vehicles in 3D', () => {
  it('builds every kind of vehicle: body, wheels, lamps, beams, outlines', () => {
    for (const k of ['bike', 'sedan', 'hatch', 'taxi', 'van'] as const) {
      const m = vehicleModel(k);
      for (const p of ['body', 'wheel', 'head', 'tail', 'beam'] as const) {
        expect(m.parts.has(p), `${k} ${p}`).toBe(true);
        expect(finite(m.parts.get(p)!), `${k} ${p}`).toBe(true);
      }
      expect(m.lines.length).toBeGreaterThan(30);
      expect(Array.from(m.lines).every(Number.isFinite)).toBe(true);
      expect(m.shell.getAttribute('position').count).toBeGreaterThan(0);
    }
    expect(vehicleModel('sedan').parts.has('glass')).toBe(true);
    expect(vehicleModel('taxi').parts.has('sign')).toBe(true);
  });

  it('places a vehicle on its lane, faded in at the lane ends', () => {
    const lanes = trafficLanes(net), v = spawnTraffic(lanes, 1)[0]!, lane = lanes[v.lane]!;
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    placeVehicle({ ...v, s: lane.length / 2 }, lane, m).decompose(p, q, s);
    expect(s.x).toBeCloseTo(1, 6);
    placeVehicle({ ...v, s: 0 }, lane, m).decompose(p, q, s);
    expect(s.x).toBeLessThan(0.5);
  });
});

describe('the metro in 3D', () => {
  it('builds the viaduct and Thái Hà station with its lamps, boards and platform edges', () => {
    const B = new Batch();
    buildMetro(B, city);
    const st = city.stations.find(s => s.name === 'Thái Hà')!;
    expect(st).toBeDefined();
    for (const part of ['', 'edge', 'board'] as const) expect(B.lamps.has(stationLamp(st, part)), part).toBe(true);
    expect([...B.tris.values()].every(a => a.every(Number.isFinite))).toBe(true);
    // the deck is up at the rails' height
    const roof = B.tris.get('roof')!;
    let top = 0;
    for (let i = 1; i < roof.length; i += 3) top = Math.max(top, roof[i]!);
    expect(top).toBeGreaterThan(12.5);
  });

  it('builds a car with a cab and one without', () => {
    const cab = carModel(true), mid = carModel(false);
    expect(cab.parts.get('glass')!.getAttribute('position').count).toBeGreaterThan(0);
    expect(mid.parts.get('glass')!.getAttribute('position').count).toBe(0);
    for (const m of [cab, mid]) { expect(m.parts.get('win')!.getAttribute('position').count).toBeGreaterThan(30); expect(Array.from(m.lines).every(Number.isFinite)).toBe(true); }
  });
});
