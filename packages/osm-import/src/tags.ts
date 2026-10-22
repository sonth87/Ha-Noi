/* What OSM tags mean for the city model (docs/architecture/osm-import.md §3). One table per kind of
   thing; anything not listed is left out (and counted in the import report). */
import type { AreaKind, BuildingKind, FeatureKind, RailKind, StreetKind } from '@my-city/core';
import type { OsmTags } from '@my-city/osm-data';

// not \b: JavaScript's word boundary does not count accented letters, so "Ngõ 2" would not match
const ALLEY = /^(ngõ|ngách|hẻm|kiệt)(\s|$)/iu;

export function streetKind(t: OsmTags): StreetKind | undefined {
  const h = t.highway;
  if (!h || t.area === 'yes') return undefined;
  const named = (k: StreetKind): StreetKind => (t.name && ALLEY.test(t.name) ? 'alley' : k);
  switch (h) {
    case 'primary': case 'trunk': return named('primary');
    case 'secondary': return named('secondary');
    case 'tertiary': return named('tertiary');
    case 'primary_link': case 'secondary_link': case 'tertiary_link': case 'trunk_link': return named('link');
    case 'residential': case 'unclassified': case 'living_street': return named('residential');
    case 'service': case 'track': return named('service');
    case 'footway': case 'path': case 'pedestrian': case 'cycleway': return named('footway');
    case 'steps': return named('steps');
    default: return undefined;
  }
}

/** a hint for the kind of building; undefined = judge by the footprint */
export function buildingHint(t: OsmTags): BuildingKind | undefined {
  if (t.tourism === 'hotel') return 'hotel';
  const b = t.building === 'construction' ? (t.construction ?? 'commercial') : t.building;
  switch (b) {
    case 'house': case 'detached': case 'semidetached_house': case 'terrace': return 'house';
    case 'apartments': case 'dormitory': case 'residential': return 'apartment';
    case 'office': case 'government': return 'office';
    case 'commercial': case 'retail': case 'supermarket': return 'commercial';
    case 'hotel': return 'hotel';
    case 'school': case 'university': case 'college': case 'kindergarten': return 'school';
    case 'kiosk': case 'hut': case 'shed': case 'garage': case 'garages': case 'roof': case 'toilets': case 'service': return 'kiosk';
    case 'hospital': case 'public': case 'civic': case 'industrial': case 'warehouse': case 'religious': case 'temple': case 'church': return 'other';
    default: return undefined;
  }
}

export function areaKind(t: OsmTags): AreaKind | undefined {
  if (t.man_made === 'bridge') return 'bridge';
  if (t['area:highway'] === 'traffic_island') return 'traffic-island';
  if (t.leisure === 'park' || t.tourism === 'zoo') return 'park';
  if (t.leisure === 'garden' || t.landuse === 'grass' || t.landuse === 'village_green') return 'grass';
  if (t.leisure === 'pitch') return 'pitch';
  if (t.leisure === 'swimming_pool') return 'pool';
  if (t.natural === 'water' || t.water) return 'water';
  if (t.place === 'square' || t.amenity === 'cinema' || t.historic === 'castle' || (t.highway === 'pedestrian' && t.area === 'yes')) return 'plaza';
  if (!t.building && (t.amenity === 'place_of_worship' || t.landuse === 'religious') && t.name) return 'plaza';
  return undefined;
}

export function featureKind(t: OsmTags): FeatureKind | undefined {
  if (t.highway === 'traffic_signals') return 'traffic-signals';
  if (t.highway === 'crossing') return 'crossing';
  if (t.highway === 'bus_stop' || t.public_transport === 'platform') return 'bus-stop';
  if (t.natural === 'tree') return 'tree';
  if (t.highway === 'street_lamp') return 'street-lamp';
  if (t.power === 'pole') return 'power-pole';
  if ((t.historic === 'monument' || t.historic === 'memorial' || t.artwork_type === 'statue') && t.name) return 'monument';
  if ((t.historic === 'archaeological_site' || t.historic === 'ruins') && t.name) return 'heritage';
  return undefined;
}

/** a running line: metro (subway, light rail, monorail), rail or tram; not one being built or gone */
export function railKind(t: OsmTags): RailKind | undefined {
  switch (t.railway) {
    case 'subway': case 'light_rail': case 'monorail': return 'metro';
    case 'rail': case 'narrow_gauge': return 'rail';
    case 'tram': return 'tram';
    default: return undefined;
  }
}

/** storeys from building:levels, else from height at 3.2 m a storey */
export function levelsOf(t: OsmTags): number | undefined {
  const l = Number.parseFloat(t['building:levels'] ?? '');
  if (Number.isFinite(l) && l > 0) return Math.round(l);
  const h = Number.parseFloat(t.height ?? '');
  if (Number.isFinite(h) && h > 0) return Math.max(1, Math.round(h / 3.2));
  return undefined;
}
