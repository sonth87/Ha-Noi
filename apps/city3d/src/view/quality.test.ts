import { describe, expect, it } from 'vitest';
import { loadCity } from '@my-city/osm-import';
import { isHouseLamp, windowRank, windowShade } from '@render/lights';
import { detailFor, farness, lowerLevel, quality, withOption } from './quality';
import { lightOn } from './lights';
import { buildStreetCatalog, selectVisibleStreetLabels } from './streetLabels';
import { buildPlaceCatalog, selectVisiblePlaceLabels } from './placeInfo';

describe('quality', () => {
  it('starts with 30 % traffic', () => {
    expect(quality('high').traffic).toBe(0.3);
    expect(quality('medium').traffic).toBe(0.3);
  });

  it('goes back to a named level when the options match it again', () => {
    const q = withOption(quality('high'), { bloom: false });
    expect(q.level).toBe('custom');
    expect(withOption(q, { bloom: true }).level).toBe('high');
  });

  it('lowers the detail when zoomed out, up to the chosen most', () => {
    const q = quality('high');
    expect(detailFor(1.5, q)).toBe(0);   // very far out: pure building blocks (no windows)
    expect(detailFor(3.6, q)).toBe(1);   // the user's screenshot, 2026-10-21: blocks and windows only
    expect(detailFor(6, q)).toBe(2);
    expect(detailFor(10, q)).toBe(3);
    expect(detailFor(10, quality('medium'))).toBe(2);
    expect(detailFor(0.5, quality('ultra'))).toBe(3);   // no automatic lowering
  });
});

describe('stepping down by itself', () => {
  it('goes one level down at a time and stops at low', () => {
    expect(lowerLevel(quality('high'))!.level).toBe('medium');
    expect(lowerLevel(quality('medium'))!.level).toBe('low');
    expect(lowerLevel(quality('low'))).toBeNull();
  });
});

describe('lived-in windows', () => {
  it('lights a floor unevenly, the same way every time, and street lamps evenly', () => {
    const shades = Array.from({ length: 400 }, (_, k) => windowShade('w1/3', k));
    const n = (s: string) => shades.filter(x => x === s).length;
    expect(n('off')).toBeGreaterThan(10); expect(n('dim')).toBeGreaterThan(40); expect(n('hi')).toBeGreaterThan(40); expect(n('on')).toBeGreaterThan(150);
    expect(windowShade('w1/3', 7)).toBe(windowShade('w1/3', 7));
    expect(new Set(Array.from({ length: 50 }, (_, k) => windowShade('street/lamps', k)))).toEqual(new Set(['on']));
  });
});

describe('light settings', () => {
  it('lights a share of the windows evenly over every building, adding windows as it grows', () => {
    const lit = (lamp: string, n: number, share: number) => Array.from({ length: n }, (_, k) => windowRank(lamp, k) < share).filter(Boolean).length;
    // two buildings, 400 windows each: both near 20 %, and the 20 % set grows into the 50 % set
    for (const b of ['novotel/5', 'viet-tower/5']) {
      expect(lit(b, 400, 0.2)).toBeGreaterThan(55); expect(lit(b, 400, 0.2)).toBeLessThan(105);
      for (let k = 0; k < 400; k++) if (windowRank(b, k) < 0.2) expect(windowRank(b, k) < 0.5).toBe(true);
    }
    expect([lightOn('auto', true), lightOn('auto', false), lightOn('on', false), lightOn('off', true)]).toEqual([true, false, true, false]);
    expect(isHouseLamp('street/lamps') || isHouseLamp('signal/x/go')).toBe(false);
  });
});

describe('zoomed out', () => {
  it('fades from 8 px a metre down to 2.5, and not at all without automatic detail', () => {
    expect(farness(9, quality('high'))).toBe(0);
    expect(farness(2, quality('high'))).toBe(1);
    expect(farness(5.25, quality('high'))).toBeCloseTo(0.5, 6);
    expect(farness(3.6, quality('high'))).toBeGreaterThan(0.75);
    expect(farness(1, quality('ultra'))).toBe(0);
  });
});

describe('street labels (pin callout & map modes)', () => {
  it('filters by zoom level, keeps callout pins sparse, and aligns map labels along streets', () => {
    const { city } = loadCity('nga-tu-thai-ha');
    const catalog = buildStreetCatalog(city);
    expect(catalog.some(e => e.name === 'Phố Thái Hà' && e.shortName === 'Thái Hà')).toBe(true);

    const project = ([x, y]: [number, number, number]) => ({ x: 600 + x * 0.6, y: 450 + y * 0.6, visible: true });
    expect(selectVisibleStreetLabels(catalog, 'off', 4, 1200, 900, [0, 0], project)).toEqual([]);

    const pinsFar = selectVisibleStreetLabels(catalog, 'pin', 1.0, 1200, 900, [0, 0], project);
    expect(pinsFar.length).toBeGreaterThan(0);
    expect(pinsFar.length).toBeLessThanOrEqual(7);
    expect(pinsFar.every(p => p.tier === 1 && p.stemHeightPx > 0 && p.info.includes('làn'))).toBe(true);

    const pinsNear = selectVisibleStreetLabels(catalog, 'pin', 7.0, 1200, 900, [0, 0], project);
    expect(pinsNear.length).toBeGreaterThan(pinsFar.length);

    const mapLabels = selectVisibleStreetLabels(catalog, 'map', 4.0, 1200, 900, [0, 0], project);
    expect(mapLabels.length).toBeGreaterThan(0);
    expect(mapLabels.every(l => l.angleDeg >= -90 && l.angleDeg <= 90)).toBe(true);
  });
});

describe('place info catalog & labels (off, popup, label modes)', () => {
  it('indexes buildings, parks, lakes, monuments, heritage sites, and stations with names, addresses, and metrics', () => {
    const { city } = loadCity('nga-tu-thai-ha');
    const catalog = buildPlaceCatalog(city, new Set(['building:w1123438986', 'building:w1123438990']));

    const vpbank = catalog.byId.get('w1123438986');
    expect(vpbank?.name).toContain('VPBank');
    expect(vpbank?.address).toContain('89');
    expect(vpbank?.metrics.length).toBeGreaterThanOrEqual(3);

    const hasPark = catalog.labels.some(e => e.category === 'park' && e.name.includes('Quang Trung'));
    const hasLake = catalog.labels.some(e => e.category === 'water' && e.name.includes('Hoàng Cầu'));
    const hasMonument = catalog.labels.some(e => e.category === 'monument' && e.name.includes('Tượng đài Quang Trung'));
    const hasHeritage = catalog.labels.some(e => e.category === 'heritage' && (e.name.includes('Đàn Xã Tắc') || e.name.includes('Chùa')));
    expect(hasPark).toBe(true);
    expect(hasLake).toBe(true);
    expect(hasMonument).toBe(true);
    expect(hasHeritage).toBe(true);

    const project = ([x, y]: [number, number, number]) => ({ x: 600 + x * 0.5, y: 450 + y * 0.5, visible: true });
    expect(selectVisiblePlaceLabels(catalog, 'off', 4, 1200, 900, [0, 0], project)).toEqual([]);

    const popupMarkers = selectVisiblePlaceLabels(catalog, 'popup', 3.5, 1200, 900, [0, 0], project);
    expect(popupMarkers.length).toBeGreaterThan(0);

    const topLabels = selectVisiblePlaceLabels(catalog, 'label', 4.5, 1200, 900, [0, 0], project);
    expect(topLabels.length).toBeGreaterThan(0);
    expect(topLabels.every(l => l.entry.name.length > 0 && l.entry.address.length > 0)).toBe(true);
  });
});


