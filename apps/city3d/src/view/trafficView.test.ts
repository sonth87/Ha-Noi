import { describe, expect, it } from 'vitest';
import type { Lane, Vehicle } from '@my-city/core';
import { stepTraffic, signalsAt } from '@my-city/core';
import { TRAFFIC_RADIUS, TrafficArea, placeVisibleVehicles, playerAhead, separateFromTraffic, type PlacedVehicle } from './trafficView';

/** a straight 3 km lane along x */
const lane: Lane = { id: 'l', route: 'r', path: [[0, 0], [3000, 0]], length: 3000, profile: [], stops: [], carsOnly: false, width: 3.25 };
const car = (s: number): Vehicle => ({ id: `c${s}`, kind: 'sedan', lane: 0, track: 1, s, v: 10, len: 4 });

describe('placeVisibleVehicles (CS-09)', () => {
  it('draws a car under the camera even when its lane starts kilometres away', () => {
    const cam = { x: 2900, z: 0 }, far = 300;
    const near = (x: number, z: number) => Math.hypot(x - cam.x, z - cam.z) <= far;
    const slots: number[] = [];
    const n = placeVisibleVehicles([car(10), car(2898), car(1500)], [lane], near, slot => slots.push(slot));
    expect(n).toBe(1);
    expect(slots).toEqual([0]);
  });

  it('hands out consecutive slots to the visible ones only', () => {
    const n = placeVisibleVehicles([car(10), car(20), car(2000), car(30)], [lane], x => x < 100, () => {});
    expect(n).toBe(3);
  });
});

describe('TrafficArea (CS-09: traffic around the camera)', () => {
  const lanes: Lane[] = [
    { ...lane, id: 'near', path: [[-500, 0], [500, 0]], length: 1000 },
    { ...lane, id: 'far', path: [[5000, 5000], [6000, 5000]], length: 1000 },
  ];
  it('puts vehicles only on lanes near the focus, all of them on those lanes', () => {
    const area = new TrafficArea(lanes);
    expect(area.lanesNear(0, 0)).toEqual([0]);
    const v = area.around(0, 0, 0.3, []);
    expect(v.length).toBeGreaterThan(10);
    expect(new Set(v.map(x => x.lane))).toEqual(new Set([0]));
  });
  it('keeps the state of vehicles still in the area when it moves, and asks to move only when far enough', () => {
    const area = new TrafficArea(lanes);
    const first = area.around(0, 0, 0.3, []);
    first[0]!.s = 123.4;
    expect(area.stale(100, 0)).toBe(false);
    expect(area.stale(TRAFFIC_RADIUS, 0)).toBe(true);
    const next = area.around(200, 0, 0.3, first);
    expect(next.find(x => x.id === first[0]!.id)!.s).toBe(123.4);
    expect(area.around(5500, 5000, 0.3, next).every(x => x.lane === 1)).toBe(true);
  });
});

describe('player car and traffic (CS-09)', () => {
  it('a traffic car brakes for the player car in front of it in its lane, not beside or behind', () => {
    const v: PlacedVehicle = { x: 0, z: 0, heading: 0, len: 4.4 };
    expect(playerAhead(v, { x: 10, z: 0.5 })).toBeCloseTo(10 - 2.2 - 2.2 - 1.5);
    expect(playerAhead(v, { x: 10, z: 4 })).toBe(Infinity);
    expect(playerAhead(v, { x: -10, z: 0 })).toBe(Infinity);
  });

  it('stepTraffic stops a vehicle short of an obstacle ahead', () => {
    const v = [car(100)];
    for (let i = 0; i < 300; i++) stepTraffic(v, [lane], signalsAt(0), null, 1 / 30, () => 120 - (v[0]!.s + v[0]!.len));
    expect(v[0]!.s + v[0]!.len).toBeLessThanOrEqual(120.01);
    expect(v[0]!.s).toBeGreaterThan(110);
  });

  it('the player car cannot drive through a traffic car, and loses the speed it had into it', () => {
    const p = { x: -3, y: 0, heading: 0, speed: 10 };
    expect(separateFromTraffic(p, [{ x: 0, z: 0, heading: 0, len: 4.4 }])).toBe(true);
    expect(p.x).toBeCloseTo(-4.4, 5);                 // pushed back to nose touching tail
    expect(Math.abs(p.speed)).toBeLessThan(0.5);
    const q = { x: -20, y: 0, heading: 0, speed: 10 };
    expect(separateFromTraffic(q, [{ x: 0, z: 0, heading: 0, len: 4.4 }])).toBe(false);
  });

  it('cars side by side in neighbouring lanes, or a metre apart nose to tail, do not touch (ADR-064)', () => {
    const car = { x: 0, y: 0, heading: 0, speed: 10 };
    expect(separateFromTraffic(car, [{ x: 0, z: 2.5, heading: 0, len: 4.4 }])).toBe(false);   // 2.5 m between centres, 0.7 m gap
    expect(separateFromTraffic(car, [{ x: 5.4, z: 0, heading: 0, len: 4.4 }])).toBe(false);   // 1 m gap ahead
    expect(separateFromTraffic(car, [{ x: 0, z: 1.4, heading: 0, len: 1.8 }])).toBe(false);   // a motorbike passing close
    expect(car.speed).toBe(10);
    // a car crossing in front at right angles, overlapping by 20 cm: pushed back, sideways speed kept
    const c2 = { x: 0, y: 0, heading: 0.3, speed: 8 };
    expect(separateFromTraffic(c2, [{ x: 2.2 + 0.9 - 0.2, z: 0, heading: Math.PI / 2, len: 4.4 }])).toBe(true);
    expect(Math.abs(c2.speed)).toBeGreaterThan(1);
  });
});
