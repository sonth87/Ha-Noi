/* Public SDK, Typed Event Bus, and Extension / Plugin Architecture for @my-city/city3d.
   Allows external scripts, parent applications, or installable extensions (`CityExtension`)
   to subscribe to scene/UI events, control the camera, query places, add custom 3D layers,
   or inject custom action buttons into building/place popups. */
import type * as THREE from 'three';
import type { City } from '@my-city/core';
import type { PovMode } from './constants';
import type { Locale } from './i18n';
import type { PlaceEntry } from './placeInfo';
import type { Mode, Snapshot, Theme } from './CityView';

export interface CityEventMap {
  ready: { city: City };
  tick: { dt: number; now: number };
  'camera:change': { x: number; z: number; zoom: number; heading: number; tilt: number; mode: Mode };
  'place:select': { entry: PlaceEntry | null; floor?: string };
  'place:hover': { entry: PlaceEntry | null; floor?: string };
  'building:lightToggle': { id: string; on: boolean };
  'mode:change': { mode: Mode };
  'pov:change': { povMode: PovMode };
  'theme:change': { theme: Theme; night: boolean };
  'showcase:change': { showcase: string | null };
  'locale:change': { locale: Locale };
}

export type CityEventHandler<K extends keyof CityEventMap> = (payload: CityEventMap[K]) => void;

export class CityEventBus {
  private readonly handlers = new Map<keyof CityEventMap, Set<CityEventHandler<never>>>();

  on<K extends keyof CityEventMap>(event: K, handler: CityEventHandler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as CityEventHandler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof CityEventMap>(event: K, handler: CityEventHandler<K>): void {
    this.handlers.get(event)?.delete(handler as CityEventHandler<never>);
  }

  emit<K extends keyof CityEventMap>(event: K, payload: CityEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as CityEventHandler<K>)(payload);
      } catch {
        /* isolate extension handler errors so the main render loop never crashes */
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Custom action button that an extension can inject into the place/building popup card */
export interface PopupActionDescriptor {
  id: string;
  label: string | ((entry: PlaceEntry, locale: Locale) => string);
  iconHtml?: string;
  shouldShow?: (entry: PlaceEntry) => boolean;
  onClick: (entry: PlaceEntry, sdk: CitySDK) => void;
}

/** Installable plugin / extension contract */
export interface CityExtension {
  id: string;
  name: string;
  version?: string;
  popupActions?: PopupActionDescriptor[];
  onMount?: (sdk: CitySDK) => void | (() => void);
  onTick?: (dt: number, sdk: CitySDK) => void;
  onUnmount?: (sdk: CitySDK) => void;
}

/** Public SDK / API interface exposed on `view.sdk` and `window.MyCitySDK` */
export interface CitySDK {
  readonly events: CityEventBus;
  getCity(): City;
  getSnapshot(): Snapshot;
  getLocale(): Locale;
  setLocale(locale: Locale): void;
  flyTo(pt: [number, number]): void;
  setZoom(zoom: number): void;
  setMode(mode: Mode): void;
  getPovMode(): PovMode;
  setPovMode(mode: PovMode): void;
  setNight(night: boolean): void;
  setSeeThrough(on: boolean): void;
  setShowcase(id: string | null): void;
  openPlace(id: string): boolean;
  closePopup(): void;
  getPlace(id: string): PlaceEntry | undefined;
  searchPlaces(query: string): PlaceEntry[];
  setLamp(id: string, on: boolean): void;
  addCustomLayer(id: string, object: THREE.Object3D): void;
  removeCustomLayer(id: string): void;
  registerPopupAction(action: PopupActionDescriptor): () => void;
  getPopupActions(): readonly PopupActionDescriptor[];
  use(extension: CityExtension): () => void;
  unuse(extensionId: string): void;
  getExtensions(): readonly CityExtension[];
  on<K extends keyof CityEventMap>(event: K, handler: CityEventHandler<K>): () => void;
  off<K extends keyof CityEventMap>(event: K, handler: CityEventHandler<K>): void;
}

/** what the SDK facade reads and calls on the view that owns it */
export interface SdkHost {
  readonly city: City;
  readonly events: CityEventBus;
  readonly customLayers: Map<string, THREE.Object3D>;
  readonly popupActions: Map<string, PopupActionDescriptor>;
  readonly extensions: Map<string, { ext: CityExtension; cleanup?: () => void }>;
  snap(): Snapshot;
  mounted(): { camera: THREE.OrthographicCamera; controls: { minZoom: number; maxZoom: number }; extensionGroup: THREE.Group } | null;
  placeCatalog(): { byId: Map<string, PlaceEntry>; labels: readonly PlaceEntry[] };
  activePopup(): unknown;
  setLocale(locale: Locale): void;
  flyTo(pt: [number, number]): void;
  setMode(mode: Mode): void;
  setPovMode(mode: PovMode): void;
  setNight(night: boolean): void;
  setTheme(theme: Theme): void;
  setSeeThrough(on: boolean): void;
  setShowcase(id: string | null): void;
  openPopup(entry: PlaceEntry): void;
  closePopup(): void;
  setLamp(id: string, on: boolean): void;
  renderPopupContent(): void;
}

/** The public SDK as a facade over the view (moved out of CityView.ts). */
export function createCitySDK(h: SdkHost): CitySDK {
    const sdk: CitySDK = {
      events: h.events,
      getCity: () => h.city,
      getSnapshot: () => h.snap(),
      getLocale: () => h.snap().locale,
      setLocale: locale => h.setLocale(locale),
      flyTo: pt => h.flyTo(pt),
      setZoom: zoom => {
        const m = h.mounted();
        if (!m) return;
        m.camera.zoom = Math.max(m.controls.minZoom, Math.min(m.controls.maxZoom, zoom));
        m.camera.updateProjectionMatrix();
      },
      setMode: mode => h.setMode(mode),
      getPovMode: () => h.snap().povMode,
      setPovMode: mode => h.setPovMode(mode),
      setNight: night => {
        h.setNight(night);
        h.setTheme(night ? 'dark' : 'light');
      },
      setSeeThrough: on => h.setSeeThrough(on),
      setShowcase: id => h.setShowcase(id),
      openPlace: id => {
        const entry = h.placeCatalog().byId.get(id);
        if (!entry) return false;
        h.openPopup(entry);
        return true;
      },
      closePopup: () => h.closePopup(),
      getPlace: id => h.placeCatalog().byId.get(id),
      searchPlaces: query => {
        const q = query.trim().toLowerCase();
        if (!q) return [...h.placeCatalog().labels];
        const out: PlaceEntry[] = [];
        for (const entry of h.placeCatalog().byId.values()) {
          if (entry.name.toLowerCase().includes(q) || entry.address.toLowerCase().includes(q)) {
            out.push(entry);
          }
        }
        return out;
      },
      setLamp: (id, on) => h.setLamp(id, on),
      addCustomLayer: (id, object) => {
        const m = h.mounted(), prev = h.customLayers.get(id);
        if (prev) m?.extensionGroup.remove(prev);
        h.customLayers.set(id, object);
        m?.extensionGroup.add(object);
      },
      removeCustomLayer: id => {
        const obj = h.customLayers.get(id);
        if (!obj) return;
        h.customLayers.delete(id);
        h.mounted()?.extensionGroup.remove(obj);
      },
      registerPopupAction: action => {
        h.popupActions.set(action.id, action);
        if (h.activePopup()) h.renderPopupContent();
        return () => {
          h.popupActions.delete(action.id);
          if (h.activePopup()) h.renderPopupContent();
        };
      },
      getPopupActions: () => Array.from(h.popupActions.values()),
      use: extension => {
        if (h.extensions.has(extension.id)) sdk.unuse(extension.id);
        if (extension.popupActions) {
          for (const act of extension.popupActions) h.popupActions.set(act.id, act);
        }
        const cleanup = h.mounted() && extension.onMount ? (extension.onMount(sdk) ?? undefined) : undefined;
        h.extensions.set(extension.id, { ext: extension, ...(cleanup ? { cleanup } : {}) });
        if (h.activePopup()) h.renderPopupContent();
        return () => sdk.unuse(extension.id);
      },
      unuse: extensionId => {
        const rec = h.extensions.get(extensionId);
        if (!rec) return;
        h.extensions.delete(extensionId);
        if (rec.ext.popupActions) {
          for (const act of rec.ext.popupActions) h.popupActions.delete(act.id);
        }
        try { rec.cleanup?.(); } catch { /* ignore */ }
        try { rec.ext.onUnmount?.(sdk); } catch { /* ignore */ }
        if (h.activePopup()) h.renderPopupContent();
      },
      getExtensions: () => Array.from(h.extensions.values(), r => r.ext),
      on: (event, handler) => h.events.on(event, handler),
      off: (event, handler) => h.events.off(event, handler),
    };
    return sdk;
}

declare global {
  interface Window {
    MyCitySDK?: CitySDK;
  }
}
