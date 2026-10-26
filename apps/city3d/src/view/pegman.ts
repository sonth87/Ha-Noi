/* Where a Pegman dragged over the map would land: the ground and the Metro viaduct deck under the pointer,
   handed to the POV controller to pick a train or a street (ADR-053). Split out of CityView; tested in Node. */
import * as THREE from 'three';
import type { Vec2 } from '@my-city/core';

export interface PegmanDropPreview {
  kind: 'metro' | 'car';
  world: [number, number, number];
  screenX: number;
  screenY: number;
  trainIndex: number;
  label: string;
}

/** height of the viaduct deck a Pegman can land on (m) */
const VIADUCT_DECK_Y = 10.5;

export function pegmanPreview(
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  bounds: { x0: number; y0: number; x1: number; y1: number },
  find: (ground: Vec2, viaduct: Vec2) => { kind: 'metro' | 'car'; world: [number, number, number]; trainIndex: number; label: string },
): PegmanDropPreview | null {
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
  const hitGnd = new THREE.Vector3(), hitVia = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitGnd)) return null;
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -VIADUCT_DECK_Y), hitVia)) hitVia.copy(hitGnd);
  const cx = (v: number) => Math.max(bounds.x0, Math.min(bounds.x1, v)), cz = (v: number) => Math.max(bounds.y0, Math.min(bounds.y1, v));
  const target = find([cx(hitGnd.x), cz(hitGnd.z)], [cx(hitVia.x), cz(hitVia.z)]);
  const proj = new THREE.Vector3(target.world[0], target.world[2], target.world[1]).project(camera);
  return { ...target, screenX: (proj.x * 0.5 + 0.5) * rect.width, screenY: (-proj.y * 0.5 + 0.5) * rect.height };
}
