/* Light settings (ADR-039), apart from the quality levels: what lights and how much.
     house   — 'auto': windows light at night; 'on': lit day and night; 'off': dark (a click
               still lights one floor). `share` is how many windows light, 0–100 %, picked one
               window at a time and evenly over every building (render/lights windowRank): moving
               the slider only adds or removes windows, never reshuffles them (ADR-040).
     vehicle — 'auto': head and tail lamps (and the beams) at night; 'on'; 'off'.
     street  — 'auto': street lamps (and their pools of light) at night; 'on'; 'off'.
     glow    — strength of the glow round lit things, 0–200 % (dark theme only).
   Remembered per viewer in localStorage (a convenience: everything works without it). */
export type LightMode = 'auto' | 'on' | 'off';

export interface LightSettings { house: LightMode; share: number; vehicle: LightMode; street: LightMode; glow: number }

export const LIGHTS_DEFAULT: LightSettings = { house: 'auto', share: 0.35, vehicle: 'auto', street: 'auto', glow: 1 };

/** is a light with this mode on, given day or night */
export const lightOn = (mode: LightMode, night: boolean) => mode === 'on' || (mode === 'auto' && night);

const KEY = 'city3d-lights';

export function loadLights(): LightSettings {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...LIGHTS_DEFAULT, ...(JSON.parse(raw) as Partial<LightSettings>) }; } catch { /* default */ }
  return { ...LIGHTS_DEFAULT };
}

export function saveLights(l: LightSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* not remembered, still applied */ }
}
