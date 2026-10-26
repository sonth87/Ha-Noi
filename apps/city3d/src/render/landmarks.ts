/* The landmark builders of every city behind one interface (rule A16). Each city keeps its bespoke models in
   `landmarks/<country>/<city>/` and exports a `CityLandmarks`; this file only combines them, so the rest of the
   renderer never names a city. A new city adds its module to CITIES. Model ids are unique across cities; the
   first city that knows a model draws it. */
import type * as THREE from 'three';
import type { Building, Feature, Vec2 } from '@my-city/core';
import type { Batch, Surface } from './batch';
import type { Detail } from './buildings';
import type { WavingFlagSpec } from './flags';
import { HA_NOI_LANDMARKS } from './landmarks/vn/ha-noi/index';

export {
  MAX_FLAG_VIEW_SPAN_M, createWavingFlagGroup, getFlagMaterial, isFlagVisibleAtSpan, registerFlagPainter, stepSharedWavingFlags, stepWavingFlag,
  type FlagCountryCode, type WavingFlagInstance, type WavingFlagSpec,
} from './flags';

export interface CityLandmarks {
  /** models whose own geometry replaces the building's extruded parts */
  customMassing: ReadonlySet<string>;
  /** draw a building's bespoke model; false when this city has none for it */
  draw(B: Batch, b: Building, level: Detail): boolean;
  /** materials the model swaps in (stone, bronze, heritage roof…), null when none */
  surfaceMap(model?: string): Partial<Record<Surface, Surface>> | null;
  flagsOf(b: Building): WavingFlagSpec[];
  beaconsOf(b: Building): THREE.Vector3[];
  /** points beyond the footprint the model reaches (for the showcase plate) */
  extraBoundsPts(b: Building): Vec2[];
  /** draw a monument / heritage point feature; false when this city does not handle it */
  drawMonument(B: Batch, f: Feature): boolean;
}

const CITIES: readonly CityLandmarks[] = [HA_NOI_LANDMARKS];

export const CUSTOM_MASSING_MODELS: ReadonlySet<string> = new Set(CITIES.flatMap(c => [...c.customMassing]));
export const drawLandmarkBuilding = (B: Batch, b: Building, level: Detail): boolean => CITIES.some(c => c.draw(B, b, level));
export const landmarkSurfaceMap = (model?: string) => { for (const c of CITIES) { const m = c.surfaceMap(model); if (m) return m; } return null; };
export const landmarkFlagsOf = (b: Building): WavingFlagSpec[] => CITIES.flatMap(c => c.flagsOf(b));
export const landmarkBeaconsOf = (b: Building): THREE.Vector3[] => CITIES.flatMap(c => c.beaconsOf(b));
export const landmarkExtraBoundsPts = (b: Building): Vec2[] => CITIES.flatMap(c => c.extraBoundsPts(b));
export const drawMonumentFeature = (B: Batch, f: Feature): void => { CITIES.some(c => c.drawMonument(B, f)); };
