/* buildCityGeometry: a City → the geometry the view puts on screen (M3). No materials here: the
   view makes those from the theme tokens. Everything is merged per surface (a few draw calls for
   the whole area), windows carry a colour attribute so a floor lights by rewriting its slice, and
   a lookup turns a clicked triangle back into a building and a floor. Pure. */
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { floorId, floorZ, pointInRing, type Building, type City } from '@my-city/core';
import { Batch, type LampRange, type Surface } from './batch';
import { buildBuildings } from './buildings';
import { buildAreas, buildGround, buildStreets } from './streets';

export interface CityGeometry {
  surfaces: Map<Surface, THREE.BufferGeometry>;
  shell: THREE.BufferGeometry;
  creases: LineSegmentsGeometry;
  details: LineSegmentsGeometry;
  /** window quads, with a `color` attribute the view rewrites per lamp */
  windows: THREE.BufferGeometry;
  /** lamp id → the window vertices it lights */
  lamps: Map<string, LampRange[]>;
  floors: string[];
  beacons: THREE.Vector3[];
  /** clicked triangle of a surface mesh → building id */
  ownerOf: (surface: Surface, face: number) => string | undefined;
  /** building + clicked point (three.js) → floor id */
  floorAt: (building: string, point: THREE.Vector3) => string | undefined;
  stats: { triangles: number; lines: number; windows: number };
}

export function buildCityGeometry(city: City): CityGeometry {
  const B = new Batch();
  buildGround(B, city);
  buildAreas(B, city);
  buildStreets(B, city);
  const { floors, beacons } = buildBuildings(B, city);

  const geo = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
  const surfaces = new Map<Surface, THREE.BufferGeometry>();
  for (const [s, pos] of B.tris) surfaces.set(s, geo(pos));

  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(B.shell.pos, 3));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(B.shell.nrm, 3));
  const lines = (pos: number[]) => new LineSegmentsGeometry().setPositions(pos.length ? pos : [0, 0, 0, 0, 0, 0]);

  const windows = geo(B.win);
  windows.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(B.win.length), 3));

  // picking: triangle ranges per surface, sorted, searched by bisection
  const ranges = new Map<Surface, { start: number; end: number; owner: string }[]>();
  for (const o of B.owners) { const l = ranges.get(o.surface) ?? []; l.push(o); ranges.set(o.surface, l); }
  for (const l of ranges.values()) l.sort((a, b) => a.start - b.start);
  const ownerOf = (s: Surface, face: number) => {
    const l = ranges.get(s);
    if (!l) return undefined;
    let lo = 0, hi = l.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1, r = l[m]!; if (face < r.start) hi = m - 1; else if (face >= r.end) lo = m + 1; else return r.owner; }
    return undefined;
  };
  const byId = new Map<string, Building>(city.buildings.map(b => [b.id, b]));
  const floorAt = (id: string, p: THREE.Vector3) => {
    const b = byId.get(id);
    if (!b) return undefined;
    const xy: [number, number] = [p.x, p.z], z = p.y;
    const part = b.parts.find(q => pointInRing(xy, q.footprint)) ?? b.parts.reduce((a, q) => (q.floors.length > a.floors.length ? q : a));
    let k = 0;
    while (k + 1 < part.floors.length && z >= floorZ(part, k + 1)) k++;
    return floorId(b, k + 1);
  };

  const triangles = [...B.tris.values()].reduce((s, l) => s + l.length / 9, 0);
  return {
    surfaces, shell, creases: lines(B.creases), details: lines(B.details), windows, lamps: B.lamps, floors, beacons, ownerOf, floorAt,
    stats: { triangles, lines: (B.creases.length + B.details.length) / 6, windows: B.win.length / 18 },
  };
}
