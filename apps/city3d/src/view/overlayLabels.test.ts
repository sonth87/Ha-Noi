/* OverlayLabels was moved out of CityView (docs/architecture/city3d.md §8). The step functions need a real
   DOM and camera (checked by eye on the dev server, A7); what can be tested without one is the lifecycle:
   three layers appear on mount, vanish on unmount, and nothing throws while there is no view. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OverlayLabels, type OverlayHost } from './overlayLabels';

type El = { className: string; children: El[]; removed: boolean; style: Record<string, string>; dataset: Record<string, string>; remove(): void; replaceChildren(): void; appendChild(c: El): El };
const el = (): El => ({
  className: '', children: [], removed: false, style: {}, dataset: {},
  remove() { this.removed = true; }, replaceChildren() { this.children = []; }, appendChild(c) { this.children.push(c); return c; },
});

const host = (view: OverlayHost['view']): OverlayHost => ({
  view, snap: () => ({ streetLabels: 'off', placeInfo: 'off', showcase: null }) as never, povActive: () => false, stage: () => 'full',
  activeCamera: () => ({}) as never, pxPerMetre: () => 1, interacting: () => false, streetCatalog: () => [], streetById: () => new Map(),
  placeCatalog: () => ({ byId: new Map() }) as never, activePopup: () => null, popupCard: () => null, povFocus: () => ({ x: 0, z: 0 }), flyTo: () => undefined,
});

describe('OverlayLabels lifecycle', () => {
  const g = globalThis as unknown as { document?: unknown };
  const saved = g.document;
  beforeEach(() => { g.document = { createElement: () => el() }; });
  afterEach(() => { g.document = saved; });

  it('adds its three layers on mount and removes them on unmount', () => {
    const root = el();
    const o = new OverlayLabels(host(() => null));
    o.mount(root as never);
    expect(root.children.map(c => c.className)).toEqual(['street-labels', 'place-labels', 'admin-boundary-labels']);
    o.unmount();
    expect(root.children.every(c => c.removed)).toBe(true);
  });

  it('does nothing, and does not throw, while the view is not mounted', () => {
    const o = new OverlayLabels(host(() => null));
    expect(() => { o.streetLabelsStep(true); o.placeInfoStep(true); o.adminBoundariesStep(true); o.resetPlaces(); o.clearHoveredPin(); o.unmount(); }).not.toThrow();
  });
});
