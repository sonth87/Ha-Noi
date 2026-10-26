import { describe, expect, it } from 'vitest';
import type { Building, City, Feature, Street } from '@my-city/core';
import { chunkBounds, chunkSubCity, mergeChunk } from './chunkMerge';

const bld = (id: string, x: number, y: number) => ({ id, footprint: [[x, y], [x + 5, y], [x + 5, y + 5]] }) as unknown as Building;
const str = (id: string, x: number, y: number) => ({ id, path: [[x, y], [x + 50, y]] }) as unknown as Street;
const feat = (id: string, x: number, y: number) => ({ id, at: [x, y] }) as unknown as Feature;
const city = (p: Partial<City>) => ({ id: 't', buildings: [], streets: [], features: [], areas: [], ...p }) as unknown as City;

describe('chunkBounds', () => {
  it('is a 1024 m square from the key, negative keys included', () => {
    expect(chunkBounds('1,-2')).toEqual({ x0: 1024, x1: 2048, y0: -2048, y1: -1024 });
  });
});

describe('mergeChunk', () => {
  it('adds only what is new, by id, and remembers it', () => {
    const live = city({ buildings: [bld('a', 0, 0)] });
    const known = { buildings: new Set(['a']), streets: new Set<string>(), features: new Set<string>() };
    const chunk = city({ buildings: [bld('a', 0, 0), bld('b', 9, 9)], streets: [str('s', 0, 0)], features: [feat('f', 1, 1)] });
    const d = mergeChunk(live, chunk, known);
    expect(d.newBuildings.map(b => b.id)).toEqual(['b']);
    expect(d.newStreets.map(s => s.id)).toEqual(['s']);
    expect(d.newFeatures.map(f => f.id)).toEqual(['f']);
    expect(live.buildings.map(b => b.id)).toEqual(['a', 'b']);
    // a second time round nothing is new
    const again = mergeChunk(live, chunk, known);
    expect([again.newBuildings, again.newStreets, again.newFeatures].map(l => l.length)).toEqual([0, 0, 0]);
  });
});

describe('chunkSubCity', () => {
  // chunk "0,0" is x, y in [0, 1024]
  it('keeps what lies in or just around the chunk on every side, and drops the rest', () => {
    const c = city({
      features: [feat('in', 500, 500), feat('south-edge', 500, 1050), feat('north-edge', 500, -50), feat('far-south', 500, 1200), feat('far-north', 500, -200), feat('east', 1080, 500), feat('far-east', 1200, 500)],
      buildings: [bld('inb', 10, 10), bld('farb', 3000, 3000)],
      streets: [str('ins', 10, 10), str('fars', 3000, 3000)],
    });
    const sub = chunkSubCity(c, '0,0');
    // the old filter kept only features south of the chunk (`y >= y1 + 64`), so the ones in and around it were lost
    expect(sub.features.map(f => f.id).sort()).toEqual(['east', 'in', 'north-edge', 'south-edge']);
    expect(sub.buildings.map(b => b.id)).toEqual(['inb']);
    expect(sub.streets.map(s => s.id)).toEqual(['ins']);
  });
});
