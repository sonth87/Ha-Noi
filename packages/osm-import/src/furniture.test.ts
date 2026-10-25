import { describe, expect, it } from 'vitest';
import { closestOnPath, roadNetwork, streetFurniture } from '@my-city/core';
import { loadCity } from './index';

// core's furniture rules on the real map
const { city } = loadCity('nga-tu-thai-ha');
const net = roadNetwork(city), f = streetFurniture(city, net);

describe('street furniture', () => {
  it('places poles with wires, lamps, trees and signals', () => {
    const count = (k: string) => f.props.filter(p => p.kind === k).length;
    expect(count('pole')).toBeGreaterThan(20);
    expect(count('lamp') + count('lamp-on-pole')).toBeGreaterThan(20);
    expect(count('tree')).toBeGreaterThan(30);
    expect(f.wires.length).toBeGreaterThan(10);
    const sig = f.props.filter(p => p.kind === 'signal');
    expect(sig.length).toBeGreaterThanOrEqual(4);
    expect(new Set(sig.map(s => s.group))).toEqual(new Set(['x', 'y']));
  });

  it('keeps everything off the carriageways', { timeout: 20000 }, () => {
    const atGrade = net.roads.filter(r => r.layer === 0).map(r => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of r.path) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      const pad = r.width / 2;
      return { r, x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
    });
    for (const p of f.props) for (const { r, x0, y0, x1, y1 } of atGrade) {
      if (p.at[0] < x0 || p.at[0] > x1 || p.at[1] < y0 || p.at[1] > y1) continue;
      expect(closestOnPath(p.at, r.path).d, `${p.id} on ${r.id}`).toBeGreaterThan(r.width / 2 - 0.01);
    }
  });

  it('wires only neighbouring poles, and is the same every time', () => {
    const ids = new Set(f.props.map(p => p.id));
    for (const w of f.wires) { expect(ids.has(w.from)).toBe(true); expect(ids.has(w.to)).toBe(true); }
    expect(streetFurniture(city)).toEqual(f);
  });
});
