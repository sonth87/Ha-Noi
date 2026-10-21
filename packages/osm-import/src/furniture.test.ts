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

  it('keeps everything off the carriageways', () => {
    const atGrade = net.roads.filter(r => r.layer === 0);
    for (const p of f.props) for (const r of atGrade) expect(closestOnPath(p.at, r.path).d, `${p.id} on ${r.id}`).toBeGreaterThan(r.width / 2 - 0.01);
  });

  it('wires only neighbouring poles, and is the same every time', () => {
    const ids = new Set(f.props.map(p => p.id));
    for (const w of f.wires) { expect(ids.has(w.from)).toBe(true); expect(ids.has(w.to)).toBe(true); }
    expect(streetFurniture(city)).toEqual(f);
  });
});
