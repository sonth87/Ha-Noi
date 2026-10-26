/* OverlayLabels was moved out of CityView (docs/architecture/city3d.md §8). The step functions need a real
   DOM and camera (checked by eye on the dev server, A7); what can be tested without one is the lifecycle:
   three layers appear on mount, vanish on unmount, and nothing throws while there is no view. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OverlayLabels, type OverlayHost } from './overlayLabels';

type El = { listeners: Record<string, ((e: never) => void)[]>; dispatched: unknown[]; className: string; children: El[]; removed: boolean; style: Record<string, string>; dataset: Record<string, string>; remove(): void; replaceChildren(): void; addEventListener(t: string, f: (e: never) => void): void; dispatchEvent(e: unknown): boolean; querySelector(s: string): El | null; appendChild(c: El): El };
const el = (): El => ({
  listeners: {}, dispatched: [], className: '', children: [], removed: false, style: {}, dataset: {},
  addEventListener(t: string, f: (e: never) => void) { (this.listeners[t] ??= []).push(f); }, dispatchEvent(e: unknown) { this.dispatched.push(e); return true; }, querySelector() { return canvas; },
  remove() { this.removed = true; }, replaceChildren() { this.children = []; }, appendChild(c) { this.children.push(c); return c; },
});

let canvas: El;
const host = (view: OverlayHost['view']): OverlayHost => ({
  view, snap: () => ({ streetLabels: 'off', placeInfo: 'off', showcase: null }) as never, povActive: () => false, stage: () => 'full',
  activeCamera: () => ({}) as never, pxPerMetre: () => 1, interacting: () => false, streetCatalog: () => [], streetById: () => new Map(),
  placeCatalog: () => ({ byId: new Map() }) as never, activePopup: () => null, popupCard: () => null, povFocus: () => ({ x: 0, z: 0 }), flyTo: () => undefined,
});

describe('OverlayLabels lifecycle', () => {
  const g = globalThis as unknown as { document?: unknown };
  const saved = g.document;
  beforeEach(() => { canvas = el(); g.document = { createElement: () => el() }; (globalThis as unknown as { WheelEvent: unknown }).WheelEvent = class { constructor(public type: string, public init: object) {} }; });
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

  it('passes the wheel over a label on to the map canvas, so the map can still be zoomed there', () => {
    const root = el();
    new OverlayLabels(host(() => null)).mount(root as never);
    for (const layer of root.children) {
      let prevented = false;
      layer.listeners.wheel![0]!({ deltaY: 120, deltaX: 0, deltaZ: 0, deltaMode: 0, clientX: 5, clientY: 6, preventDefault: () => { prevented = true; } } as never);
      expect(prevented).toBe(true);
    }
    expect(canvas.dispatched).toHaveLength(3);
    expect((canvas.dispatched[0] as { type: string }).type).toBe('wheel');
  });
});
