/* Pointer, touch and wheel input on the map, and picking what is under the pointer (split out of
   CityView.mount, city3d.md §8). The handlers are the ones CityView had, reading the view through
   MapInputHost; `attachMapInput` returns the function that removes them. */
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Station } from '@my-city/core';
import type { Surface } from '@render/batch';
import type { Detail, Layer } from '@render/city';
import { stationLamp } from '@render/metro';
import { HOVER_MIN_PX_PER_METRE, HOVER_REGULAR_BLDG_MIN_PX_PER_METRE, HOVER_THROTTLE_MS, MIN_ZOOM_TO_CURSOR_EL } from './constants';
import type { OverlayLabels } from './overlayLabels';
import type { PlaceCatalog, PlaceEntry } from './placeInfo';
import type { PovController } from './povController';
import type { StreetEntry } from './streetLabels';
import type { LocalTileState, TileState } from './tileIndex';

export interface MapInputHost {
  pov: PovController;
  overlays: OverlayLabels;
  snap(): { showcase: string | null; placeInfo: string; mode: '2d' | '3d' };
  placeCatalog(): PlaceCatalog;
  activeCamera(): THREE.Camera;
  elevation(): number;
  pxPerMetre(): number;
  interacting(): boolean;
  visibleTiles(): Iterable<TileState>;
  visibleLocal(): Iterable<LocalTileState>;
  stations(): readonly Station[];
  isLit(lamp: string): boolean;
  hasPopup(): boolean;
  openPopup(entry: PlaceEntry, floor?: string): void;
  openStreetPopup(street: StreetEntry, world: [number, number]): void;
  closePopup(): void;
  showHoverBanner(entry: PlaceEntry, x: number, y: number, floor?: string): void;
  hideHoverBanner(): void;
  flyTo(p: [number, number], exitShowcase?: boolean): void;
  setMode(mode: '2d' | '3d'): void;
  setLamp(id: string, on: boolean): void;
  syncPopupBulb(): void;
}

export interface MapGroups {
  showcaseGroup: THREE.Group; tilesGroup: THREE.Group; landmarkOverviewGroup: THREE.Group; stationShellGroup: THREE.Group;
  localStreetsGroup: THREE.Group; metroBaseGroup: THREE.Group; terrainGroup: THREE.Group; majorStreetsGroup: THREE.Group;
}

export function attachMapInput(h: MapInputHost, renderer: THREE.WebGLRenderer, host: HTMLElement, controls: OrbitControls, groups: MapGroups): () => void {
  const { showcaseGroup, tilesGroup, landmarkOverviewGroup, stationShellGroup, localStreetsGroup, metroBaseGroup, terrainGroup, majorStreetsGroup } = groups;
  // Helper to raycast against buildings, stations, parks, lakes, and monuments
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
  const flyToClient = (clientX: number, clientY: number) => {
    if (h.pov.isActive()) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, h.activeCamera());
    if (ray.ray.intersectPlane(ground, hitPt)) h.flyTo([hitPt.x, hitPt.z], false);
  };
  const pickAtClient = (clientX: number, clientY: number): { owner: string; floor?: string; point: THREE.Vector3 } | null => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, h.activeCamera());
    const pickable: THREE.Object3D[] = [];
    if (h.snap().showcase) {
      showcaseGroup.traverse(o => { if (o.userData.surface && o.visible && o.parent?.visible !== false) pickable.push(o); });
    } else {
      if (tilesGroup.visible) {
        for (const t of h.visibleTiles()) {
          const g = t.cutGroup?.visible ? t.cutGroup : (t.shown >= 0 ? t.layers.get(t.shown as Detail)?.group : null);
          if (g?.visible) for (const o of g.children) if (o.userData.surface) pickable.push(o);
        }
      }
      if (landmarkOverviewGroup.visible) {
        landmarkOverviewGroup.traverse(o => { if (o.userData.surface && o.visible) pickable.push(o); });
      }
      if (stationShellGroup.visible) for (const o of stationShellGroup.children) if (o.userData.surface) pickable.push(o);
      if (localStreetsGroup.visible) {
        for (const lt of h.visibleLocal()) {
          if (lt.group?.visible) for (const o of lt.group.children) if (o.userData.surface) pickable.push(o);
        }
      }
      for (const grp of [metroBaseGroup, terrainGroup, majorStreetsGroup]) {
        if (grp.visible) for (const o of grp.children) if (o.userData.surface) pickable.push(o);
      }
    }
    const hits = ray.intersectObjects(pickable, false);
    for (const hit of hits) {
      if (hit.faceIndex == null) continue;
      const surface = hit.object.userData.surface as Surface;
      const layer = hit.object.userData.layer as Layer;
      const owner = layer.ownerOf(surface, hit.faceIndex);
      if (owner) {
        const floor = layer.floorAt(owner, hit.point);
        return { owner, ...(floor ? { floor } : {}), point: hit.point };
      }
    }
    return null;
  };

  const onDbl = (e: MouseEvent) => {
    const pinHit = h.overlays.hitLabelAtClient(e.clientX, e.clientY);
    if (pinHit) {
      if (pinHit.kind === 'place') {
        h.openPopup(pinHit.entry);
        if (!h.pov.isActive()) h.flyTo(pinHit.entry.ground, false);
      } else {
        h.openStreetPopup(pinHit.street, pinHit.item.world);
      }
      return;
    }
    if (!h.snap().showcase && h.snap().placeInfo !== 'off') {
      const picked = pickAtClient(e.clientX, e.clientY);
      if (picked) {
        const entry = h.placeCatalog().byId.get(picked.owner);
        if (entry) {
          h.openPopup(entry, picked.floor);
          return;
        }
      }
    }
    flyToClient(e.clientX, e.clientY);
  };

  let down: [number, number] | null = null;
  let povDragPrev: [number, number] | null = null;
  let lastTap: { t: number; x: number; y: number } | null = null;
  let touchGesture: { ang0: number; dist0: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    controls.zoomToCursor = false;
    if (e.touches.length === 2) {
      const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
      const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
      touchGesture = { ang0: Math.atan2(dy, dx), dist0: Math.hypot(dx, dy) };
    } else {
      touchGesture = null;
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (h.pov.isActive()) return;
    if (e.touches.length === 2 && touchGesture && h.snap().mode === '2d') {
      const dx = e.touches[1]!.clientX - e.touches[0]!.clientX;
      const dy = e.touches[1]!.clientY - e.touches[0]!.clientY;
      let dAng = Math.atan2(dy, dx) - touchGesture.ang0;
      while (dAng > Math.PI) dAng -= 2 * Math.PI;
      while (dAng < -Math.PI) dAng += 2 * Math.PI;
      if (Math.abs(dAng) > 0.24) {
        h.setMode('3d');
        touchGesture = null;
      }
    }
  };
  const onTouchEnd = () => { touchGesture = null; };
  const onWheel = () => {
    controls.zoomToCursor = h.elevation() >= MIN_ZOOM_TO_CURSOR_EL;
  };
  const onDown = (e: PointerEvent) => {
    controls.zoomToCursor = e.pointerType === 'mouse' && h.elevation() >= MIN_ZOOM_TO_CURSOR_EL;
    down = [e.clientX, e.clientY];
    if (h.pov.isActive()) {
      povDragPrev = [e.clientX, e.clientY];
    }
  };

  let lastHoverTime = 0;
  const onMove = (e: PointerEvent) => {
    if (h.pov.isActive() && povDragPrev && (e.buttons !== 0 || e.pointerType === 'touch')) {
      const dx = e.clientX - povDragPrev[0];
      const dy = e.clientY - povDragPrev[1];
      povDragPrev = [e.clientX, e.clientY];
      h.pov.addLookDelta(dx, dy);
      return;
    }
    if (e.pointerType !== 'mouse' || h.interacting() || (e.buttons & 7) !== 0) return;
    if (h.snap().showcase) {
      h.hideHoverBanner();
      h.overlays.clearHoveredPin();
      return;
    }
    const now = performance.now();
    if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
    lastHoverTime = now;

    const pinHit = h.overlays.hitLabelAtClient(e.clientX, e.clientY);
    if (pinHit) {
      h.overlays.setHoveredPin(pinHit.key);
      renderer.domElement.style.cursor = 'pointer';
      if (pinHit.kind === 'place' && h.snap().placeInfo !== 'off') {
        const r = host.getBoundingClientRect();
        h.showHoverBanner(pinHit.entry, e.clientX - r.left, e.clientY - r.top);
      } else {
        h.hideHoverBanner();
      }
      return;
    }
    h.overlays.clearHoveredPin();

    const px = h.pov.isActive() ? 8 : h.pxPerMetre();
    if (h.snap().placeInfo === 'off' || px < HOVER_MIN_PX_PER_METRE) {
      h.hideHoverBanner();
      renderer.domElement.style.cursor = '';
      return;
    }
    const picked = pickAtClient(e.clientX, e.clientY);
    const entry = picked ? h.placeCatalog().byId.get(picked.owner) : undefined;
    if (!entry || (entry.category === 'building' && entry.tier > 1 && px < HOVER_REGULAR_BLDG_MIN_PX_PER_METRE)) {
      h.hideHoverBanner();
      renderer.domElement.style.cursor = picked?.floor ? 'pointer' : '';
      return;
    }
    renderer.domElement.style.cursor = 'pointer';
    const r = host.getBoundingClientRect();
    h.showHoverBanner(entry, e.clientX - r.left, e.clientY - r.top, picked?.floor);
  };
  const onLeave = () => {
    povDragPrev = null;
    h.hideHoverBanner();
    h.overlays.clearHoveredPin();
    renderer.domElement.style.cursor = '';
  };

  const onUp = (e: PointerEvent) => {
    povDragPrev = null;
    const maxMove = e.pointerType === 'touch' ? 12 : 5;
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > maxMove) return;
    const pinHit = h.overlays.hitLabelAtClient(e.clientX, e.clientY);
    if (e.pointerType === 'touch') {
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        lastTap = null;
        if (pinHit) {
          if (pinHit.kind === 'place') h.openPopup(pinHit.entry);
          else h.openStreetPopup(pinHit.street, pinHit.item.world);
          return;
        }
        if (!h.snap().showcase && h.snap().placeInfo !== 'off') {
          const pickedDbl = pickAtClient(e.clientX, e.clientY);
          if (pickedDbl) {
            const entry = h.placeCatalog().byId.get(pickedDbl.owner);
            if (entry) {
              h.openPopup(entry, pickedDbl.floor);
              return;
            }
          }
        }
        flyToClient(e.clientX, e.clientY);
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    if (pinHit) {
      if (pinHit.kind === 'place') {
        h.openPopup(pinHit.entry);
      } else if (!h.pov.isActive()) {
        h.flyTo(pinHit.item.world, false);
      }
      return;
    }
    const picked = pickAtClient(e.clientX, e.clientY);
    if (!picked) {
      if (h.hasPopup()) h.closePopup();
      return;
    }
    if (picked.floor) {
      h.setLamp(picked.floor, !h.isLit(picked.floor));
      h.syncPopupBulb();
      return;
    }
    const st = h.stations().find(s => s.id === picked.owner);
    if (st) {
      const lid = stationLamp(st);
      h.setLamp(lid, !h.isLit(lid));
      h.syncPopupBulb();
    }
  };
  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
  renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
  renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('dblclick', onDbl);
  return () => {
    renderer.domElement.removeEventListener('touchstart', onTouchStart);
    renderer.domElement.removeEventListener('touchmove', onTouchMove);
    renderer.domElement.removeEventListener('touchend', onTouchEnd);
    renderer.domElement.removeEventListener('wheel', onWheel);
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointermove', onMove);
    renderer.domElement.removeEventListener('pointerleave', onLeave);
    renderer.domElement.removeEventListener('pointerup', onUp);
    renderer.domElement.removeEventListener('dblclick', onDbl);
  };
}
