import { describe, expect, it } from 'vitest';
import { AREAS, loadArea } from './index';

describe('osm-data', () => {
  it('loads the crossroads extract with its licence', () => {
    const { area, data } = loadArea('nga-tu-thai-ha');
    expect(area.bbox).toHaveLength(4);
    expect(data.license).toContain('odbl');
    expect(data.elements.filter(e => e.type === 'way').length).toBeGreaterThan(500);
    // the two towers are in it
    expect(data.elements.some(e => e.type === 'way' && e.id === 136257265)).toBe(true);
    expect(data.elements.some(e => e.type === 'way' && e.id === 850419282)).toBe(true);
  });

  it('lists every area and rejects unknown ones', () => {
    expect(Object.keys(AREAS)).toContain('nga-tu-thai-ha');
    expect(() => loadArea('nowhere')).toThrow();
  });
});
