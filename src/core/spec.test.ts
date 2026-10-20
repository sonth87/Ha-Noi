import { describe, expect, it } from 'vitest';
import { DEFAULTS, randomHouse, resolveSpec, sceneIssues } from '@core/spec';
import { PRESET_IDS } from '@core/presets';
import { hash, rng } from '@core/rng';

describe('resolveSpec', () => {
  it('fills every field from defaults', () => {
    const { spec, issues } = resolveSpec({ id: 'h1' });
    expect(issues).toEqual([]);
    expect(spec.w).toBe(DEFAULTS.w);
    expect(spec.upper).toHaveLength(DEFAULTS.floors);
    expect(spec.seed).toBe(hash('h1'));
  });

  it('applies preset, then input, per floor too', () => {
    const { spec } = resolveSpec({ id: 'h2', preset: 'nha-mau', upper: [{ plants: 0 }] });
    expect(spec.shopName).toBe('CÀ PHÊ');
    expect(spec.upper[0]).toEqual({ window: 'glass-doors', balcony: 'rail', plants: 0, ac: false });
    expect(spec.upper[1]!.balcony).toBe('cage');
    expect(spec.upper[2]!.ac).toBe(true);
  });

  it('places balconies on odd floors only when asked', () => {
    const { spec } = resolveSpec({ id: 'h3', floors: 4, balcony: 'rail', balconyFloors: 'odd' });
    expect(spec.upper.map(f => f.balcony)).toEqual(['none', 'rail', 'none', 'rail']);   // floors 2, 3, 4, 5
  });

  it('enforces the consistency rules', () => {
    const a = resolveSpec({ id: 'a', floors: 0, overhang: 8, topRoom: true, signs: [{ type: 'projecting-vertical' }] });
    expect(a.spec.overhang).toBe(0);
    expect(a.spec.topRoom).toBe(false);
    expect(a.spec.signs).toEqual([]);
    expect(a.issues.every(i => i.level === 'warn')).toBe(true);

    const b = resolveSpec({ id: 'b', roof: 'metal2', roofItems: ['tank-h', 'antenna'], topRoom: true });
    expect(b.spec.roofItems).toEqual(['antenna']);
    expect(b.spec.topRoom).toBe(false);

    expect(resolveSpec({ id: 'c', w: 12 }).issues.some(i => i.level === 'error' && i.field === 'w')).toBe(true);
    expect(resolveSpec({ id: 'd', floors: 20 }).spec.floors).toBe(8);
    expect(resolveSpec({ id: 'e', preset: 'nope' }).issues[0]!.field).toBe('preset');
  });

  it('resolves every preset without errors', () => {
    for (const p of PRESET_IDS) {
      const { issues } = resolveSpec({ id: p, preset: p });
      expect(issues.filter(i => i.level === 'error'), p).toEqual([]);
    }
  });

  it('reports duplicate ids', () => {
    expect(sceneIssues([{ id: 'x' }, { id: 'y' }, { id: 'x' }])).toHaveLength(1);
  });
});

describe('randomHouse', () => {
  it('is reproducible and always valid', () => {
    expect(randomHouse(rng(5), 'r')).toEqual(randomHouse(rng(5), 'r'));
    const r = rng(99);
    for (let i = 0; i < 200; i++) {
      const { issues } = resolveSpec(randomHouse(r, `r${i}`));
      expect(issues.filter(x => x.level === 'error')).toEqual([]);
    }
  });
});
