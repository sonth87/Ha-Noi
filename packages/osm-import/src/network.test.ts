import { describe, expect, it } from 'vitest';
import { SIGNAL_CLUSTER_M, dist, laneAt, polylineLength, roadNetwork, signalClusters, signalsOf, spawnTraffic, stepTraffic, streetFurniture, streetZ, trafficLanes, vehiclePoint } from '@my-city/core';
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
    const roadById = new Map(net.roads.map(x => [x.id, x]));
    for (const n of net.nodes) {
      expect(n.arms.length).toBeGreaterThanOrEqual(2);
      for (const a of n.arms) {
        const r = roadById.get(a.road)!;
        expect(r.path.some(p => dist(p, n.at) < 0.05)).toBe(true);
      }
    }
    expect(net.nodes.filter(n => n.arms.length >= 3).length / net.nodes.length).toBeGreaterThan(0.9);
    expect(net.nodes.filter(n => n.signals).length).toBeGreaterThanOrEqual(4);
  });

  it('smooths corners without moving ends, and keeps one-way roads one way', () => {
    for (const r of net.roads) {
      if (r.kind === 'service' || r.kind === 'alley') continue;
      for (let i = 1; i < r.path.length - 1; i++) {
        const a = r.path[i - 1]!, b = r.path[i]!, c = r.path[i + 1]!;
        const t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
        const turn = Math.min(t, 2 * Math.PI - t);
        // on the main roads no corner sharper than ~50° is left except at a junction (tiny alleys keep a few)
        if (turn >= 0.9 && !net.nodes.some(n => dist(n.at, b) < 0.05)) expect(turn).toBeLessThan(0.9);
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
    // (Cầu Long Biên is a taller river bridge, 9.5 m, Cầu Nhật Tân 15 m; every flyover keeps the usual 6 m)
    const decks = fly.map(l => laneAt(l, l.length / 2).z);
    expect(decks.some(z => Math.abs(z - 6) < 0.05)).toBe(true);
    expect(Math.max(...decks)).toBeLessThanOrEqual(15.05);   // Cầu Nhật Tân 15 m
    expect(spawnTraffic(lanes, 1).length).toBeGreaterThan(100);
  });
});

describe('junction clocks (CS-09: every light of the city used to change at once)', () => {
  const clusters = signalClusters(net);
  it('groups the signalled nodes of one junction (within 40 m) and keeps far junctions apart', () => {
    const lit = net.nodes.filter(n => n.signals);
    expect(clusters.size).toBe(lit.length);
    const byJ = new Map<string, typeof lit>();
    for (const n of lit) { const j = clusters.get(n.id)!; byJ.set(j, [...(byJ.get(j) ?? []), n]); }
    expect(byJ.size).toBeGreaterThan(5);
    expect(byJ.size).toBeLessThan(lit.length);
    for (const n of lit) for (const o of lit) if (n !== o && dist(n.at, o.at) < SIGNAL_CLUSTER_M) expect(clusters.get(n.id)).toBe(clusters.get(o.id));
  });

  it('every stop line and signal post knows its junction, and they agree', () => {
    const lanes = trafficLanes(net);
    const stopJ = new Set(lanes.flatMap(l => l.stops.map(s => s.junction)));
    expect([...stopJ].every(j => j !== undefined && [...clusters.values()].includes(j))).toBe(true);
    const posts = streetFurniture(city, net).props.filter(p => p.kind === 'signal');
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every(p => p.junction && stopJ.has(p.junction))).toBe(true);
  });

  it('junctions run out of step, and each never shows green both ways', () => {
    const js = [...new Set(clusters.values())];
    const phases = new Set(js.map(j => signalsOf(0, j).phase));
    expect(phases.size).toBeGreaterThan(2);
    for (const j of js.slice(0, 10)) for (let t = 0; t < 60; t += 0.5) {
      const s = signalsOf(t, j);
      expect(s.x !== 'stop' && s.y !== 'stop').toBe(false);
    }
  });
});

describe('turning at junctions (ADR-061)', () => {
  const lanes = trafficLanes(net);
  const turns = lanes.flatMap(l => l.turns ?? []);
  const ang = (a: number, b: number) => { let d = Math.abs(a - b) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; return d; };

  it('joins lanes of different routes, without U-turns, starting and ending on the lanes', () => {
    expect(turns.length).toBeGreaterThan(100);
    for (const t of turns) {
      const L = lanes[t.from]!, M = lanes[t.to]!;
      expect(L.route).not.toBe(M.route);
      expect(dist(laneAt(L, t.sOut).p, t.p0)).toBeLessThan(0.01);
      expect(dist(laneAt(M, t.sIn).p, t.p2)).toBeLessThan(0.01);
      expect(ang(laneAt(L, t.sOut).heading, laneAt(M, t.sIn).heading)).toBeLessThanOrEqual((150 * Math.PI) / 180 + 1e-6);
      expect(t.length).toBeLessThan(dist(t.p0, t.p2) * 2 + 10);
      if (t.forced) expect(L.length - t.sOut).toBeLessThan(40);
    }
    expect(turns.some(t => t.forced)).toBe(true);
  });

  it('two minutes of traffic around the crossroads: vehicles turn, give way when turning left, never jump, never pile up, never overlap', () => {
    const near = lanes.map((l, i) => [l, i] as const).filter(([l]) => l.path.some(p => Math.hypot(p[0], p[1]) < 600)).map(([, i]) => i);
    const sub = spawnTraffic(near.map(i => lanes[i]!), 0.3).map(v => ({ ...v, lane: near[v.lane]! }));
    const firstLane = new Map(sub.map(v => [v.id, v.lane]));
    const travelled = new Map(sub.map(v => [v.id, 0]));
    const dt = 1 / 20;
    let jumps = 0, cutOff = 0;
    for (let step = 0; step < 20 * 120; step++) {
      const before = sub.map(v => ({ ...vehiclePoint(v, lanes), wrapped: false, s: v.s, lane: v.lane, turning: Boolean(v.turn) }));
      stepTraffic(sub, lanes, t => signalsOf(step * dt, t), null, dt);
      sub.forEach((v, i) => {
        const b = before[i]!;
        const L = lanes[v.lane]!, midNow = (v.s + v.len / 2) % L.length, midBefore = (b.s + v.len / 2) % L.length;
        // looping round a lane that ends nowhere (no turn there) is the old behaviour, faded in and out by the view
        if (!v.turn && !b.turning && v.lane === b.lane && !L.joinedEnd && midNow < midBefore - 1) return;
        // a left turn starting now: nobody going straight on may be inside the junction the other way
        if (v.turn && !b.turning && v.turn.t.left) {
          for (const y of v.turn.t.yieldTo) for (const q of sub) {
            if (q.turn || q.lane !== y.lane || (q.plan && q.plan.turn >= 0)) continue;
            const toNode = y.s - (q.s + q.len);
            if (toNode < 4 && toNode > -6) cutOff++;
          }
        }
        const d = dist(vehiclePoint(v, lanes).p, b.p);
        if (d > v.v * dt + 1.0) jumps++;
        travelled.set(v.id, travelled.get(v.id)! + d);
      });
    }
    expect(jumps).toBe(0);
    expect(cutOff).toBe(0);
    expect(lanes.some(l => (l.turns ?? []).some(t => t.left && t.yieldTo.length > 0))).toBe(true);
    expect(sub.filter(v => v.lane !== firstLane.get(v.id) || v.turn).length).toBeGreaterThan(sub.length * 0.1);
    // never overlap, never more than a lane holds, and everyone keeps going (a queue at a junction clears)
    const byLane = new Map<number, typeof sub>();
    for (const v of sub) if (!v.turn) byLane.set(v.lane, [...(byLane.get(v.lane) ?? []), v]);
    for (const [l, g] of byLane) {
      const L = lanes[l]!.length;
      for (const p of g) for (const q of g) if (p !== q && (p.track === q.track || p.track === 1 || q.track === 1)) {
        const d = (((q.s - p.s) % L) + L) % L;
        if (d > 0 && d < L / 2) expect(d, `${p.id} / ${q.id} on ${lanes[l]!.id}`).toBeGreaterThanOrEqual(p.len - 0.05);
      }
      const used = g.reduce((sum, v) => sum + (v.kind === 'bike' ? (v.len + 0.3) / 2 : v.len + 0.5), 0);
      expect(used, lanes[l]!.id).toBeLessThanOrEqual(L + 5);
    }
    for (const v of sub) expect(travelled.get(v.id)!, v.id).toBeGreaterThan(30);
  }, 120_000);
});
