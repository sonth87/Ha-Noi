/* The SDK facade (moved out of CityView): extensions can register popup actions and custom layers, and
   everything is undone when they are removed. No WebGL needed: the host is a stub. */
import { describe, expect, it } from 'vitest';
import { CityEventBus, createCitySDK, type CityExtension, type SdkHost } from './sdk';

const makeHost = () => {
  const layers: unknown[] = [];
  const group = { add: (o: unknown) => layers.push(o), remove: (o: unknown) => { const i = layers.indexOf(o); if (i >= 0) layers.splice(i, 1); } };
  const calls: string[] = [];
  const host: SdkHost = {
    city: { id: 't' } as never, events: new CityEventBus(), customLayers: new Map(), popupActions: new Map(), extensions: new Map(),
    snap: () => ({ locale: 'vi', povMode: 'off' }) as never,
    mounted: () => ({ camera: { zoom: 1, updateProjectionMatrix: () => calls.push('proj') }, controls: { minZoom: 0.1, maxZoom: 10 }, extensionGroup: group }) as never,
    placeCatalog: () => ({ byId: new Map([['a', { id: 'a', name: 'Chùa Hà', address: 'Cầu Giấy' }]]), labels: [] }) as never,
    activePopup: () => null, setLocale: () => undefined, flyTo: () => undefined, setMode: () => undefined, setPovMode: () => undefined,
    setNight: () => undefined, setTheme: () => undefined, setSeeThrough: () => undefined, setShowcase: () => undefined,
    openPopup: () => calls.push('open'), closePopup: () => undefined, setLamp: () => undefined, renderPopupContent: () => calls.push('render'),
  };
  return { host, layers, calls };
};

describe('createCitySDK', () => {
  it('adds and removes custom layers', () => {
    const { host, layers } = makeHost();
    const sdk = createCitySDK(host);
    const obj = {} as never;
    sdk.addCustomLayer('x', obj);
    expect(layers).toEqual([obj]);
    sdk.removeCustomLayer('x');
    expect(layers).toEqual([]);
  });

  it('searches places by name and address, and opens a known one', () => {
    const { host, calls } = makeHost();
    const sdk = createCitySDK(host);
    expect(sdk.searchPlaces('chùa').map(p => p.id)).toEqual(['a']);
    expect(sdk.searchPlaces('giấy').map(p => p.id)).toEqual(['a']);
    expect(sdk.openPlace('a')).toBe(true);
    expect(sdk.openPlace('zzz')).toBe(false);
    expect(calls).toContain('open');
  });

  it('registers an extension with its popup action and removes both again', () => {
    const { host } = makeHost();
    const sdk = createCitySDK(host);
    const ext: CityExtension = { id: 'e', name: 'e', popupActions: [{ id: 'act', label: 'Go', onClick: () => undefined }] };
    const off = sdk.use(ext);
    expect(sdk.getExtensions()).toHaveLength(1);
    expect(sdk.getPopupActions().map(a => a.id)).toEqual(['act']);
    off();
    expect(sdk.getExtensions()).toHaveLength(0);
    expect(sdk.getPopupActions()).toHaveLength(0);
  });

  it('keeps zoom within the controls limits', () => {
    const { host, calls } = makeHost();
    createCitySDK(host).setZoom(999);
    expect(calls).toContain('proj');
  });
});
