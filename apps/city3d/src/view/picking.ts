/* Fast hover and click picking (ADR-059, CS-09). The city-wide base layers hold ~945 k triangles; a plain
   raycast over them took ~45 ms on a laptop, every 45 ms while the mouse moves. A BVH brings it to ~0.07 ms.

   - Only big geometries get one (small tiles are already cheap: their bounding sphere culls them).
   - `indirect: true` keeps the geometry's own triangle order, so a hit's faceIndex is still the index that
     Layer.ownerOf and floorAt look up (the default BVH reorders the index buffer and would break both).
   - Building one costs up to ~100 ms, so it happens one geometry at a time while the user is idle (A22);
     until then a mesh is raycast the plain way (acceleratedRaycast falls back by itself). */
import type * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import type { Layer } from '@render/city';

export const BVH_MIN_TRIANGLES = 20_000;

type BvhGeometry = THREE.BufferGeometry & { boundsTree?: MeshBVH };

export const triangleCount = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

export function needsBvh(g: THREE.BufferGeometry): boolean {
  return !(g as BvhGeometry).boundsTree && triangleCount(g) >= BVH_MIN_TRIANGLES;
}

export function buildBvh(g: THREE.BufferGeometry): void {
  (g as BvhGeometry).boundsTree = new MeshBVH(g, { indirect: true });
}

/** give a pickable mesh the BVH-aware raycast (same result as THREE.Mesh.raycast, faster once a BVH exists) */
export function withFastRaycast(mesh: THREE.Mesh): void {
  mesh.raycast = acceleratedRaycast;
}

/** Builds the missing BVHs of the live layers, one geometry per idle slot; checks again now and then for
    layers that arrived later (the zoomed-out landmark layer, a showcase). */
export class BvhBuilder {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly layers: () => Iterable<Layer>, private readonly busy: () => boolean) {}

  start(delayMs = 1500) {
    this.stop();
    this.timer = setTimeout(() => this.step(), delayMs);
  }

  stop() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  /** build one; returns whether there was one to build */
  step(): boolean {
    this.timer = undefined;
    if (this.busy()) { this.timer = setTimeout(() => this.step(), 400); return false; }
    for (const l of this.layers()) {
      for (const g of l.surfaces.values()) {
        if (!needsBvh(g)) continue;
        buildBvh(g);
        this.timer = setTimeout(() => this.step(), 60);
        return true;
      }
    }
    this.timer = setTimeout(() => this.step(), 2000);
    return false;
  }
}
