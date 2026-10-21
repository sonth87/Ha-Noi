/* Hand corrections on top of imported data (docs/architecture/city-model.md §5), keyed by the
   element's source id ("osm:way/…"), so they survive a fresh download of the data. Applying them
   reports every key that matched nothing, so a stale correction never goes unnoticed. Pure. */
import type { Building, BuildingKind, BuildingPart, City, SourceId, Street } from './city';
import type { HouseInput } from './house-types';
import { resolveHouse } from './house';
import { storeyHeights } from './rules';

export interface PartOverride {
  /** storey heights, bottom to top (m) */
  floors?: number[];
  facade?: BuildingPart['facade'];
  roof?: BuildingPart['roof'];
  z0?: number;
  remove?: boolean;
}

export interface BuildingOverride {
  name?: string;
  kind?: BuildingKind;
  model?: string;
  /** storeys, for a building without parts (heights from its kind) */
  levels?: number;
  /** storey heights, for a building without parts */
  floors?: number[];
  facade?: BuildingPart['facade'];
  /** per part, by the part's source id */
  parts?: Record<SourceId, PartOverride>;
  /** changes to the generated house */
  house?: Partial<HouseInput>;
  front?: number;
  remove?: boolean;
}

export interface StreetOverride {
  name?: string;
  width?: number;
  lanes?: number;
  sidewalk?: Street['sidewalk'];
  profile?: Street['profile'];
  remove?: boolean;
}

export interface Overrides {
  buildings?: Record<SourceId, BuildingOverride>;
  streets?: Record<SourceId, StreetOverride>;
}

export function applyOverrides(city: City, o: Overrides): { city: City; unused: string[] } {
  const used = new Set<string>();
  const buildings: Building[] = [];
  for (const b of city.buildings) {
    const ov = o.buildings?.[b.source];
    if (!ov) { buildings.push(b); continue; }
    used.add(`buildings:${b.source}`);
    if (ov.remove) continue;
    buildings.push(applyBuilding(b, ov, used));
  }
  const streets: Street[] = [];
  for (const s of city.streets) {
    const ov = o.streets?.[s.source];
    if (!ov) { streets.push(s); continue; }
    used.add(`streets:${s.source}`);
    if (ov.remove) continue;
    const { remove: _r, ...rest } = ov;
    streets.push({ ...s, ...rest });
  }
  const unused = [
    ...Object.keys(o.buildings ?? {}).filter(k => !used.has(`buildings:${k}`)).map(k => `buildings:${k}`),
    ...Object.keys(o.streets ?? {}).filter(k => !used.has(`streets:${k}`)).map(k => `streets:${k}`),
    ...Object.entries(o.buildings ?? {}).flatMap(([k, b]) => Object.keys(b.parts ?? {}).filter(p => !used.has(`part:${k}:${p}`)).map(p => `part:${k}:${p}`)),
  ];
  return { city: { ...city, buildings, streets }, unused };
}

function applyBuilding(b: Building, ov: BuildingOverride, used: Set<string>): Building {
  const kind = ov.kind ?? b.kind;
  let parts = b.parts, levelsFrom = b.levelsFrom;
  if (ov.parts) {
    parts = parts.flatMap(p => {
      const po = ov.parts![p.source];
      if (!po) return [p];
      used.add(`part:${b.source}:${p.source}`);
      if (po.remove) return [];
      levelsFrom = po.floors ? 'override' : levelsFrom;
      return [{ ...p, floors: po.floors ?? p.floors, facade: po.facade ?? p.facade, roof: po.roof ?? p.roof, z0: po.z0 ?? p.z0 }];
    });
  }
  const floors = ov.floors ?? (ov.levels !== undefined ? storeyHeights(kind, ov.levels) : undefined);
  if (floors && parts.length === 1) { parts = [{ ...parts[0]!, floors }]; levelsFrom = 'override'; }
  if (ov.facade) parts = parts.map(p => ({ ...p, facade: ov.facade! }));
  let house = b.house;
  if (house && (ov.house || floors)) {
    const input: HouseInput = { ...house.input, ...(floors ? { floors: floors.length - 1 } : {}), ...ov.house };
    house = { input, spec: resolveHouse(input).spec };
  }
  return { ...b, kind, parts, levelsFrom, house, name: ov.name ?? b.name, model: ov.model ?? b.model, front: ov.front ?? b.front };
}
