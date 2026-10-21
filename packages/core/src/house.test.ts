import { describe, expect, it } from 'vitest';
import { DEFAULTS, LIMITS, peakZ, randomHouse, resolveHouse, sceneIssues, topZ } from './house';
import { PRESET_IDS } from './presets';
import { hash, rng } from './rng';

describe('resolveHouse', () => {
  it('fills every field from defaults', () => {
    const { spec, issues } = resolveHouse({ id: 'h1' });
    expect(issues).toEqual([]);
    expect(spec.w).toBe(DEFAULTS.w);
    expect(spec.upper).toHaveLength(DEFAULTS.floors);
    expect(spec.seed).toBe(hash('h1'));
  });

  it('applies preset, then input, per floor too', () => {
    const { spec } = resolveHouse({ id: 'h2', preset: 'nha-mau', upper: [{ plants: 0 }] });
    expect(spec.shopName).toBe('CÀ PHÊ');
    expect(spec.upper[0]).toEqual({ window: 'glass-doors', balcony: 'rail', plants: 0, ac: false, canopy: 'none', laundry: false, balconyWidth: 'full', plantKind: 'mixed' });
    expect(spec.upper[1]!.balcony).toBe('cage');
    expect(spec.upper[2]!.ac).toBe(true);
  });

  it('places balconies on odd floors only when asked', () => {
    const { spec } = resolveHouse({ id: 'h3', floors: 4, balcony: 'rail', balconyFloors: 'odd' });
    expect(spec.upper.map(f => f.balcony)).toEqual(['none', 'rail', 'none', 'rail']);   // floors 2, 3, 4, 5
  });

  it('enforces the consistency rules', () => {
    const a = resolveHouse({ id: 'a', floors: 0, overhang: 0.8, topRoom: true, signs: [{ type: 'projecting-vertical' }] });
    expect(a.spec.overhang).toBe(0);
    expect(a.spec.topRoom).toBe(false);
    expect(a.spec.signs).toEqual([]);
    expect(a.issues.every(i => i.level === 'warn')).toBe(true);

    const b = resolveHouse({ id: 'b', roof: 'metal2', roofItems: ['tank-h', 'antenna'], topRoom: true });
    expect(b.spec.roofItems).toEqual(['antenna']);
    expect(b.spec.topRoom).toBe(false);

    expect(resolveHouse({ id: 'c', w: 1.2 }).issues.some(i => i.level === 'error' && i.field === 'w')).toBe(true);
    expect(resolveHouse({ id: 'd', floors: 20 }).spec.floors).toBe(8);
    expect(resolveHouse({ id: 'e', preset: 'nope' }).issues[0]!.field).toBe('preset');
  });

  it('fits the metal roof shelter to the roof', () => {
    expect(resolveHouse({ id: 's1', floors: 4, topRoom: true, roofShelter: 'full' }).spec.roofShelter).toBe('terrace');
    expect(resolveHouse({ id: 's2', floors: 4, roofShelter: 'terrace' }).spec.roofShelter).toBe('full');
    expect(resolveHouse({ id: 's3', floors: 0, roof: 'metal2', roofShelter: 'full' }).spec.roofShelter).toBe('none');
    const s4 = resolveHouse({ id: 's4', floors: 3, roofShelter: 'full', roofItems: ['tank-h', 'solar'] }).spec;
    expect(s4.roofItems).toEqual(['tank-h']);   // no solar heater under the sheet
  });

  it('resolves every preset without errors', () => {
    for (const p of PRESET_IDS) {
      const { issues } = resolveHouse({ id: p, preset: p });
      expect(issues.filter(i => i.level === 'error'), p).toEqual([]);
    }
  });

  it('reports duplicate ids', () => {
    expect(sceneIssues([{ id: 'x' }, { id: 'y' }, { id: 'x' }])).toHaveLength(1);
  });
});

describe('heights in metres', () => {
  it('stacks a default house to about 13.4 m and keeps roof things above it', () => {
    const { spec } = resolveHouse({ id: 'm' });
    expect(topZ(spec)).toBeCloseTo(3.8 + 3 * 3.2, 6);
    expect(peakZ(spec)).toBeGreaterThan(topZ(spec));
    expect(peakZ(spec) - topZ(spec)).toBeLessThan(4);
  });
});

describe('randomHouse', () => {
  it('keeps the frontage, depth and storeys of a real footprint', () => {
    const r = rng(3);
    for (let i = 0; i < 100; i++) {
      const w = 3 + (i % 9), d = 8 + (i % 7), floors = i % 6;
      const { spec, issues } = resolveHouse(randomHouse(r, `f${i}`, { w, d, floors }));
      expect([spec.w, spec.d, spec.floors]).toEqual([w, d, floors]);
      expect(issues.filter(x => x.level === 'error')).toEqual([]);
    }
  });

  it('stays within the limits in metres', () => {
    const r = rng(11);
    for (let i = 0; i < 200; i++) {
      const { spec } = resolveHouse(randomHouse(r, `l${i}`));
      expect(spec.w).toBeGreaterThanOrEqual(LIMITS.minW);
      expect(spec.w).toBeLessThanOrEqual(LIMITS.maxW);
      expect(spec.d).toBeGreaterThanOrEqual(LIMITS.minD);
      expect(spec.basement === 0 || (spec.basement >= 1 && spec.basement <= 2)).toBe(true);
    }
  });

  it('is reproducible and always valid', () => {
    expect(randomHouse(rng(5), 'r')).toEqual(randomHouse(rng(5), 'r'));
    const r = rng(99);
    for (let i = 0; i < 200; i++) {
      const { issues } = resolveHouse(randomHouse(r, `r${i}`));
      expect(issues.filter(x => x.level === 'error')).toEqual([]);
    }
  });
});
