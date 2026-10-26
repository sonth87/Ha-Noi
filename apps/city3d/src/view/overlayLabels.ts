/* The three DOM layers laid over the 3D view and kept in step with the camera each frame (moved out of
   CityView.ts, which was 3.9 k lines; see docs/architecture/city3d.md §8):
     - street labels (pins on the map, or names laid along the street);
     - place cards and marker pills (landmarks, parks, lakes…);
     - ward / city boundary names.
   It owns only its own DOM and bookkeeping; everything about the view comes in through `OverlayHost`. */
import * as THREE from 'three';
import type { AdminBoundaryDef } from '@render/adminBoundaries';
import { HANOI_OUTER_BOUNDARY, WARD_BOUNDARIES, adminBoundaryModeForZoom, type MapZoomStage } from '@render/adminBoundaries';
import { createPlaceLabelNode, createStreetLabelNode } from './overlayDom';
import type { Snapshot } from './CityView';
import { selectVisiblePlaceLabels, type PlaceCatalog, type PlaceEntry } from './placeInfo';
import { selectVisibleStreetLabels, type ProjectedStreetLabel, type StreetEntry, type StreetLabelMode } from './streetLabels';

/** the part of the mounted view the overlays read */
export interface OverlayView {
  host: HTMLElement;
  camera: THREE.OrthographicCamera;
  controls: { target: THREE.Vector3 };
  wardBoundaryLines: THREE.Object3D;
  cityBoundaryLines: THREE.Object3D;
}

/** what the overlays need from the view that owns them (read on demand, so it is always current) */
export interface OverlayHost {
  view(): OverlayView | null;
  snap(): Snapshot;
  povActive(): boolean;
  stage(): MapZoomStage;
  activeCamera(): THREE.Camera;
  pxPerMetre(): number;
  interacting(): boolean;
  streetCatalog(): StreetEntry[];
  streetById(): Map<string, StreetEntry>;
  placeCatalog(): PlaceCatalog;
  activePopup(): { entry: PlaceEntry } | null;
  popupCard(): HTMLElement | null;
  /** the point the POV camera looks at */
  povFocus(): { x: number; z: number };
  flyTo(p: [number, number], exitShowcase?: boolean): void;
}

export class OverlayLabels {
  private labelLayer: HTMLDivElement | null = null;
  private labelNodes = new Map<string, HTMLButtonElement>();
  private labelItems = new Map<string, ProjectedStreetLabel>();
  private labelSig = '';
  private lastLabelSelect = 0;
  private placeLayer: HTMLDivElement | null = null;
  private placeNodes = new Map<string, HTMLButtonElement>();
  private placeItems = new Map<string, { entry: PlaceEntry; x: number; y: number; anchorWorld?: [number, number, number]; offsetY?: number }>();
  private placeSig = '';
  private lastPlaceSelect = 0;
  private adminLayer: HTMLDivElement | null = null;
  private adminNodes = new Map<string, HTMLButtonElement>();
  private adminSig = '';
  private hoveredPinKey: string | null = null;

  constructor(private readonly h: OverlayHost) {}

  /** create the three layers inside the view's host element */
  mount(host: HTMLElement) {
    const layer = (cls: string) => { const d = document.createElement('div'); d.className = cls; host.appendChild(d); return d; };
    this.labelLayer = layer('street-labels');
    this.labelNodes.clear(); this.labelItems.clear(); this.labelSig = '';
    this.placeLayer = layer('place-labels');
    this.placeNodes.clear(); this.placeItems.clear(); this.placeSig = '';
    this.adminLayer = layer('admin-boundary-labels');
    this.adminNodes.clear(); this.adminSig = '';
  }

  unmount() {
    this.labelLayer?.remove(); this.labelLayer = null;
    this.labelNodes.clear(); this.labelItems.clear(); this.labelSig = '';
    this.placeLayer?.remove(); this.placeLayer = null;
    this.placeNodes.clear(); this.placeItems.clear(); this.placeSig = '';
    this.adminLayer?.remove(); this.adminLayer = null;
    this.adminNodes.clear(); this.adminSig = '';
  }

  /** forget the place cards (the language changed) so they are drawn again */
  resetPlaces() {
    if (!this.placeLayer) return;
    this.placeLayer.replaceChildren();
    this.placeNodes.clear(); this.placeItems.clear(); this.placeSig = '';
  }

  streetLabelsStep(force = false) {
    const m = this.h.view(), layer = this.labelLayer;
    if (!m || !layer) return;
    const rawMode = this.h.snap().streetLabels;
    const povActive = this.h.povActive();
    const stage = this.h.stage();
    if (this.h.snap().showcase || rawMode === 'off' || povActive || stage === 'city') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.labelNodes.clear();
        this.labelItems.clear();
        this.labelSig = 'off';
      }
      return;
    }

    const mode: StreetLabelMode = stage === 'streets' && rawMode === 'pin' ? 'map' : rawMode;
    const w = m.host.clientWidth, h = m.host.clientHeight;
    const activeCam = this.h.activeCamera();
    const focus = m.controls.target;
    const cp = activeCam.position;
    const sig = `${mode}|${stage}|${this.h.snap().povMode}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}|${activeCam.quaternion.y.toFixed(3)}`;
    if (!force && sig === this.labelSig) return;
    this.labelSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.labelNodes.clear();
      this.labelItems.clear();
      this.lastLabelSelect = 0;
    }

    const tmp = new THREE.Vector3();
    const project = (world: [number, number, number]) => {
      tmp.set(world[0], world[2], world[1]).project(activeCam);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    const now = performance.now();
    if (this.h.interacting() && !force && this.labelItems.size > 0 && now - this.lastLabelSelect < 140) {
      for (const [key, item] of this.labelItems) {
        const node = this.labelNodes.get(key);
        if (!node) continue;
        const scr = project([item.world[0], item.world[1], 0.4]);
        node.style.display = scr.visible ? '' : 'none';
        if (!scr.visible) continue;
        item.x = scr.x;
        item.y = scr.y;
        if (mode === 'pin') {
          node.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0)`;
        } else {
          node.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${item.angleDeg}deg)`;
        }
      }
      return;
    }
    this.lastLabelSelect = now;

    const adminMode = adminBoundaryModeForZoom(m.camera.zoom, Boolean(this.h.snap().showcase), povActive);
    const avoidBoxes: { x: number; y: number; halfW: number; halfH: number }[] = [];
    if (adminMode === 'ward') {
      for (const def of WARD_BOUNDARIES) {
        const p = project([def.center[0], def.center[1], 2.5]);
        if (p.visible) {
          avoidBoxes.push({ x: p.x, y: p.y, halfW: stage === 'streets' ? 68 : 88, halfH: stage === 'streets' ? 18 : 26 });
        }
      }
    }

    const visible = selectVisibleStreetLabels(
      this.h.streetCatalog(),
      mode,
      this.h.pxPerMetre(),
      w,
      h,
      [focus.x, focus.z],
      project,
      avoidBoxes,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.id}`;
      keepIds.add(key);
      this.labelItems.set(key, item);
      let btn = this.labelNodes.get(key);
      if (!btn) {
        btn = createStreetLabelNode(item, mode);
        layer.appendChild(btn);
        this.labelNodes.set(key, btn);
      }
      btn.style.display = '';

      if (mode === 'pin') {
        btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0)`;
      } else {
        btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${item.angleDeg}deg)`;
      }
    }

    for (const [key, node] of this.labelNodes) {
      if (!keepIds.has(key)) {
        node.remove();
        this.labelNodes.delete(key);
        this.labelItems.delete(key);
        if (this.hoveredPinKey === key) this.hoveredPinKey = null;
      }
    }
  }

  placeInfoStep(force = false) {
    const m = this.h.view(), layer = this.placeLayer, popupEl = this.h.popupCard();
    if (!m || !layer) return;
    const mode = this.h.snap().placeInfo;

    const w = m.host.clientWidth, h = m.host.clientHeight;
    const activeCam = this.h.activeCamera();
    const povActive = this.h.povActive();
    const stage = this.h.stage();
    const focus = povActive ? this.h.povFocus() : m.controls.target;
    const tmp = new THREE.Vector3();
    const project = (world: [number, number, number]) => {
      tmp.set(world[0], world[2], world[1]).project(activeCam);
      return {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z >= -1 && tmp.z <= 1,
      };
    };

    if (popupEl && this.h.activePopup() && !this.h.snap().showcase && !povActive) {
      const entry = this.h.activePopup()!.entry;
      const scr = project([entry.world[0], entry.world[1], entry.world[2] + 2.5]);
      if (w <= 640) {
        popupEl.dataset.dock = 'mobile';
        popupEl.style.transform = '';
      } else {
        popupEl.dataset.dock = 'anchor';
        const px = Math.max(170, Math.min(w - 170, scr.x));
        const py = Math.max(96, Math.min(h - 46, scr.y));
        popupEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    }

    if (this.h.snap().showcase || mode === 'off' || povActive || stage === 'streets' || stage === 'city') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.placeNodes.clear();
        this.placeItems.clear();
        this.placeSig = 'off';
      }
      return;
    }

    const cp = activeCam.position;
    const sig = `${mode}|${this.h.snap().povMode}|${this.h.snap().locale}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}|${activeCam.quaternion.y.toFixed(3)}|${this.h.activePopup()?.entry.id ?? ''}`;
    if (!force && sig === this.placeSig) return;
    this.placeSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.placeNodes.clear();
      this.placeItems.clear();
      this.lastPlaceSelect = 0;
    }

    const now = performance.now();
    if ((this.h.interacting() || povActive) && !force && this.placeItems.size > 0 && now - this.lastPlaceSelect < 140) {
      for (const [key, item] of this.placeItems) {
        const node = this.placeNodes.get(key);
        if (!node) continue;
        const scr = project(item.anchorWorld ?? item.entry.world);
        node.style.display = scr.visible ? '' : 'none';
        if (!scr.visible) continue;
        item.x = scr.x;
        item.y = scr.y + (item.offsetY ?? 0);
        node.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      return;
    }
    this.lastPlaceSelect = now;

    const visible = selectVisiblePlaceLabels(
      this.h.placeCatalog(),
      mode,
      povActive ? 8.5 : this.h.pxPerMetre(),
      w,
      h,
      [focus.x, focus.z],
      project,
    );

    const keepIds = new Set<string>();
    for (const item of visible) {
      const key = `${mode}:${item.entry.id}`;
      keepIds.add(key);
      this.placeItems.set(key, { entry: item.entry, x: item.x, y: item.y, anchorWorld: item.anchorWorld, offsetY: item.offsetY });
      let btn = this.placeNodes.get(key);
      if (!btn) {
        btn = createPlaceLabelNode(item.entry, mode);
        layer.appendChild(btn);
        this.placeNodes.set(key, btn);
      }
      btn.style.display = '';

      btn.classList.toggle('active', this.h.activePopup()?.entry.id === item.entry.id);
      btn.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }

    for (const [key, node] of this.placeNodes) {
      if (!keepIds.has(key)) {
        node.remove();
        this.placeNodes.delete(key);
        this.placeItems.delete(key);
      }
    }
  }

  private createAdminLabelNode(def: AdminBoundaryDef, mode: 'ward' | 'city'): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-boundary-badge is-${mode}`;
    const title = document.createElement('span');
    title.className = 'admin-boundary-title';
    title.textContent = def.name;
    btn.appendChild(title);
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this.h.flyTo([def.center[0], def.center[1]], false);
      const view = this.h.view();
      if (!view) return;
      if (mode === 'city' && view.camera.zoom < 0.10) {
        view.camera.zoom = 0.12;
        view.camera.updateProjectionMatrix();
      } else if (mode === 'ward' && view.camera.zoom < 0.35) {
        view.camera.zoom = 0.50;
        view.camera.updateProjectionMatrix();
      } else if (mode === 'ward' && view.camera.zoom < 1.1) {
        view.camera.zoom = 1.25;
        view.camera.updateProjectionMatrix();
      }
    });
    return btn;
  }

  adminBoundariesStep(force = false) {
    const m = this.h.view(), layer = this.adminLayer;
    if (!m || !layer) return;
    const povActive = this.h.povActive();
    const mode = adminBoundaryModeForZoom(m.camera.zoom, Boolean(this.h.snap().showcase), povActive);
    const stage = this.h.stage();
    m.wardBoundaryLines.visible = mode === 'ward';
    m.cityBoundaryLines.visible = mode === 'city';

    if (mode === 'off') {
      if (layer.style.display !== 'none') {
        layer.style.display = 'none';
        layer.replaceChildren();
        this.adminNodes.clear();
        this.adminSig = 'off';
      }
      return;
    }

    const w = m.host.clientWidth, h = m.host.clientHeight;
    const activeCam = this.h.activeCamera();
    const focus = m.controls.target;
    const cp = activeCam.position;
    const compact = mode === 'ward' && stage === 'streets' ? '1' : '0';
    const sig = `${mode}|${compact}|${w}x${h}|${m.camera.zoom.toFixed(4)}|${focus.x.toFixed(1)},${focus.z.toFixed(1)}|${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)}`;
    if (!force && sig === this.adminSig) return;
    this.adminSig = sig;

    if (layer.style.display === 'none') layer.style.display = '';
    if (layer.dataset.compact !== compact) layer.dataset.compact = compact;
    if (layer.dataset.mode !== mode) {
      layer.dataset.mode = mode;
      layer.replaceChildren();
      this.adminNodes.clear();
    }

    const defs: readonly AdminBoundaryDef[] = mode === 'city' ? [HANOI_OUTER_BOUNDARY] : WARD_BOUNDARIES;
    const tmp = new THREE.Vector3();
    const keepIds = new Set<string>();
    const padX = mode === 'city' ? 80 : 48;
    const padY = mode === 'city' ? 60 : 38;
    const placed: { x: number; y: number; halfW: number; halfH: number }[] = [];

    for (const def of defs) {
      tmp.set(def.center[0], mode === 'city' ? 6 : 2.5, def.center[1]).project(activeCam);
      let sx = (tmp.x * 0.5 + 0.5) * w;
      let sy = (-tmp.y * 0.5 + 0.5) * h;
      if (mode === 'city' && tmp.z >= -1 && tmp.z <= 1) {
        sx = Math.max(padX, Math.min(w - padX, sx));
        sy = Math.max(padY, Math.min(h - padY, sy));
      }
      const inBounds = tmp.z >= -1 && tmp.z <= 1 && sx >= padX && sx <= w - padX && sy >= padY && sy <= h - padY;
      if (!inBounds) continue;

      if (mode === 'ward') {
        const halfW = Math.max(46, Math.min(92, def.name.length * 3.4 + 14));
        const halfH = compact === '1' ? 14 : 21;
        const collides = placed.some(o => Math.abs(sx - o.x) < halfW + o.halfW && Math.abs(sy - o.y) < halfH + o.halfH);
        if (collides) {
          if (!placed.some(o => Math.abs(sx - o.x) < halfW + o.halfW && Math.abs((sy + 26) - o.y) < halfH + o.halfH) && sy + 26 <= h - padY) {
            sy += 26;
          } else if (!placed.some(o => Math.abs(sx - o.x) < halfW + o.halfW && Math.abs((sy - 26) - o.y) < halfH + o.halfH) && sy - 26 >= padY) {
            sy -= 26;
          } else {
            continue;
          }
        }
        placed.push({ x: sx, y: sy, halfW, halfH });
      }

      keepIds.add(def.id);
      let node = this.adminNodes.get(def.id);
      if (!node) {
        node = this.createAdminLabelNode(def, mode);
        layer.appendChild(node);
        this.adminNodes.set(def.id, node);
      }
      node.style.display = '';
      node.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }

    for (const [id, node] of this.adminNodes) {
      if (!keepIds.has(id)) {
        node.remove();
        this.adminNodes.delete(id);
      }
    }
  }

  /** Hit-test visible place or street pins at client coordinates without blocking map drag (`pointer-events: none`) */
  hitLabelAtClient(clientX: number, clientY: number):
    | { kind: 'place'; key: string; entry: PlaceEntry; x: number; y: number }
    | { kind: 'street'; key: string; street: StreetEntry; item: ProjectedStreetLabel; x: number; y: number }
    | null {
    const m = this.h.view();
    if (!m || this.h.snap().showcase) return null;
    const rect = m.host.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (this.h.snap().placeInfo !== 'off') {
      const isCard = this.h.snap().placeInfo === 'label';
      for (const [key, item] of this.placeItems) {
        const halfW = isCard ? 78 : 54;
        const h = isCard ? 46 : 26;
        if (x >= item.x - halfW && x <= item.x + halfW && y >= item.y - h && y <= item.y + 4) {
          return { kind: 'place', key, entry: item.entry, x: item.x, y: item.y - h };
        }
      }
    }

    if (this.h.snap().streetLabels !== 'off') {
      const isPin = this.labelLayer?.dataset.mode === 'pin';
      for (const [key, item] of this.labelItems) {
        const baseId = item.id.replace(/:\d+$/, '');
        if (isPin) {
          const totalH = item.stemHeightPx + 32;
          const halfW = Math.max(36, Math.min(72, item.shortName.length * 4 + 16));
          const hitCard = x >= item.x - halfW && x <= item.x + halfW && y >= item.y - totalH - 6 && y <= item.y - item.stemHeightPx + 8;
          const hitBase = Math.hypot(x - item.x, y - item.y) <= 14;
          if (hitCard || hitBase) {
            const street = this.h.streetById().get(baseId);
            if (street) return { kind: 'street', key, street, item, x: item.x, y: item.y - totalH };
          }
        } else {
          const halfW = Math.max(36, Math.min(75, item.name.length * 3.8 + 14));
          if (x >= item.x - halfW && x <= item.x + halfW && y >= item.y - 14 && y <= item.y + 14) {
            const street = this.h.streetById().get(baseId);
            if (street) return { kind: 'street', key, street, item, x: item.x, y: item.y - 14 };
          }
        }
      }
    }

    return null;
  }

  setHoveredPin(key: string | null) {
    if (this.hoveredPinKey === key) return;
    if (this.hoveredPinKey) {
      this.labelNodes.get(this.hoveredPinKey)?.classList.remove('is-hover');
    }
    this.hoveredPinKey = key;
    if (key) {
      this.labelNodes.get(key)?.classList.add('is-hover');
    }
  }

  clearHoveredPin() {
    this.setHoveredPin(null);
  }
}
