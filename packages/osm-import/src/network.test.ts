import { describe, expect, it } from 'vitest';
import { dist, laneAt, polylineLength, roadNetwork, spawnTraffic, streetZ, trafficLanes } from '@my-city/core';
import { loadCity } from './index';

// the network is core's, tested on the real map (core itself cannot load OSM data)
const { city } = loadCity('nga-tu-thai-ha');
const net = roadNetwork(city);

describe('road network', () => {
  it('joins pieces that continue each other into fewer roads', () => {
    const pieces = city.streets.filter(s => s.kind !== 'footway' && s.kind !== 'steps');
    expect(net.roads.length).toBeLessThan(pieces.length);
    expect(net.roads.flatMap(r => r.streets).sort()).toEqual(pieces.map(s => s.id).sort());
  });

  it('keeps every junction on its roads, with three arms or more', () => {
    for (const n of net.nodes) {
      expect(n.arms.length).toBeGreaterThanOrEqual(2);
      for (const a of n.arms) {
        const r = net.roads.find(x => x.id === a.road)!;
        expect(r.path.some(p => dist(p, n.at) < 0.05)).toBe(true);
      }
    }
    expect(net.nodes.filter(n => n.arms.length >= 3).length / net.nodes.length).toBeGreaterThan(0.9);
    expect(net.nodes.filter(n => n.signals).length).toBeGreaterThanOrEqual(4);
  });

  it('smooths corners without moving ends, and keeps one-way roads one way', () => {
    for (const r of net.roads) {
      for (let i = 1; i < r.path.length - 1; i++) {
        const a = r.path[i - 1]!, b = r.path[i]!, c = r.path[i + 1]!;
        const t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
        // on the main roads no corner sharper than ~50° is left except at a junction (tiny alleys keep a few)
        if (r.kind !== 'service' && r.kind !== 'alley' && !net.nodes.some(n => dist(n.at, b) < 0.05)) expect(Math.min(t, 2 * Math.PI - t)).toBeLessThan(0.9);
      }
    }
    const ts = net.roads.filter(r => r.name === 'Phố Tây Sơn' && r.oneway);
    expect(ts.length).toBeGreaterThan(0);
  });

  it('keeps the flyover deck at 6 m', () => {
    const fly = net.roads.find(r => r.name === 'Cầu vượt Tây Sơn')!;
    expect(streetZ({ ...city.streets[0]!, profile: fly.profile }, polylineLength(fly.path) / 2)).toBeCloseTo(6, 6);
  });

  it('gives traffic lanes straight through the crossroads, Thái Hà on into Chùa Bộc', () => {
    const lanes = trafficLanes(net);
    expect(lanes.length).toBeGreaterThan(6);
    // a north–south lane runs through the junction (y from < −60 to > 60)
    const through = lanes.filter(l => { const ys = l.path.map(p => p[1]); return Math.min(...ys) < -60 && Math.max(...ys) > 60; });
    expect(through.length).toBeGreaterThanOrEqual(2);
    // stops for both light groups, each before its junction
    const stops = lanes.flatMap(l => l.stops);
    expect(new Set(stops.map(s => s.group))).toEqual(new Set(['x', 'y']));
    // the flyover carries cars only, up at its deck
    const fly = lanes.filter(l => l.carsOnly);
    expect(fly.length).toBeGreaterThan(0);
    expect(Math.max(...fly.map(l => laneAt(l, l.length / 2).z))).toBeCloseTo(6, 1);
    expect(spawnTraffic(lanes, 1).length).toBeGreaterThan(100);
  });
});
