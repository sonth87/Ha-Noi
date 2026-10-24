import { describe, expect, it } from 'vitest';
import {
  AREAS,
  getCityManifest,
  listCities,
  listCountries,
  loadArea,
  loadCityChunk,
  loadCitySkeleton,
  resolveCityId,
} from './index';

describe('osm-data', () => {
  it('loads the full assembled extract with its licence via legacy or canonical ID', () => {
    const { area, data } = loadArea('nga-tu-thai-ha');
    expect(area.bboxes.length).toBeGreaterThan(0);
    for (const b of area.bboxes) expect(b).toHaveLength(4);
    expect(data.license).toContain('odbl');
    expect(data.elements.filter(e => e.type === 'way').length).toBeGreaterThan(500);
    // the two towers are in it
    expect(data.elements.some(e => e.type === 'way' && e.id === 136257265)).toBe(true);
    expect(data.elements.some(e => e.type === 'way' && e.id === 850419282)).toBe(true);
  });

  it('supports hierarchical multi-country / multi-city manifest and 2-tier skeleton + spatial chunk loading', () => {
    expect(resolveCityId('nga-tu-thai-ha')).toBe('vn/ha-noi');
    expect(resolveCityId('ha-noi')).toBe('vn/ha-noi');
    expect(resolveCityId('vn/ha-noi')).toBe('vn/ha-noi');

    const countries = listCountries();
    expect(countries.some(c => c.code === 'vn')).toBe(true);
    const vnCities = listCities('vn');
    expect(vnCities.some(c => c.id === 'vn/ha-noi')).toBe(true);

    const manifest = getCityManifest('vn/ha-noi');
    expect(manifest.chunkSizeMeters).toBe(1024);
    expect(manifest.chunks.length).toBeGreaterThan(30);

    const { data: skeleton } = loadCitySkeleton('vn/ha-noi');
    expect(skeleton.elements.length).toBe(manifest.skeletonElements);
    // Both Mipec & Viet Tower are major landmarks in Tier 0 skeleton
    expect(skeleton.elements.some(e => e.type === 'way' && e.id === 136257265)).toBe(true);
    expect(skeleton.elements.some(e => e.type === 'way' && e.id === 850419282)).toBe(true);

    const centerChunk = loadCityChunk('vn/ha-noi', '0,0');
    expect(centerChunk).not.toBeNull();
    expect(centerChunk!.elements.length).toBeGreaterThan(1000);

    // Non-existent far chunk returns null gracefully
    expect(loadCityChunk('vn/ha-noi', '99,99')).toBeNull();
  });

  it('lists every area and rejects unknown ones', () => {
    expect(Object.keys(AREAS)).toContain('nga-tu-thai-ha');
    expect(Object.keys(AREAS)).toContain('vn/ha-noi');
    expect(() => loadArea('nowhere')).toThrow();
  });
});
