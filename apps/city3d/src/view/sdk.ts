/* Public SDK, Typed Event Bus, and Extension / Plugin Architecture for @my-city/city3d.
   Allows external scripts, parent applications, or installable extensions (`CityExtension`)
   to subscribe to scene/UI events, control the camera, query places, add custom 3D layers,
   or inject custom action buttons into building/place popups. */
import type * as THREE from 'three';
import type { City } from '@my-city/core';
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

declare global {
  interface Window {
    MyCitySDK?: CitySDK;
  }
}
