/* ADR-063: how the user gets into an immersive view or a 3D model. A single key must not start driving (it did:
   P jumped into a train, often by accident); every building's popup leads to its own 3D model. */
import { describe, expect, it } from 'vitest';
import { loadCity } from '@my-city/osm-import';
import { buildShowcase } from '@render/showcase';
import { CityView } from './CityView';
import { buildPlaceCatalog } from './placeInfo';

const { city } = loadCity('nga-tu-thai-ha');
const press = (key: string) => ({ key, metaKey: false, ctrlKey: false, altKey: false, preventDefault() {} }) as unknown as KeyboardEvent;

describe('entry points (ADR-063)', () => {
  it('no single key starts an immersive view', () => {
    const view = new CityView(city);
    // N and T switch day / night, which reads the theme colours from the DOM (not in Node); they touch no view mode
    for (const k of 'abcdefghijklmopqrsuvwxyz0123456789'.split('').concat([' ', 'Tab', 'Enter'])) {
      view.key(press(k));
      expect(view.getSnapshot().povMode, `key ${k}`).toBe('map');
    }
  }, 120_000);

  it('every building popup offers a 3D model, and an ordinary house opens on its own plate', () => {
    const catalog = buildPlaceCatalog(city, new Set(), 'vi');
    const buildings = city.buildings.slice(0, 400);
    expect(buildings.every(b => catalog.byId.get(b.id)?.showcaseId)).toBe(true);
    const house = city.buildings.find(b => b.house && !b.model)!;
    const built = buildShowcase(city, `bldg:${house.id}`);
    expect(built).not.toBeNull();
    expect(built!.item.at).toBeDefined();
    expect(built!.layer.stats.triangles).toBeGreaterThan(100);
  }, 120_000);
});
