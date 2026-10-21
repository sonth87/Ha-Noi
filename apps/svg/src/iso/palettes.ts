/* Accent palettes, ported from iso-glow (MIT). Each entry: [name, darkAccent, darkHi, lightAccent, lightHi].
   Near-white accents (Moon, Ice) get a dark light-theme variant so they stay visible on a pale panel. */

export type Accent = readonly [name: string, darkAccent: string, darkHi: string, lightAccent: string, lightHi: string];

export const PALETTES = {
  city: [
    ['Sodium', '#ff9a2e', '#ffc77a', '#ff9a2e', '#ffc77a'],
    ['Tungsten', '#ffd166', '#ffe7a8', '#ffd166', '#ffe7a8'],
    ['Neon', '#ff4fa3', '#ff9fcb', '#ff4fa3', '#ff9fcb'],
    ['Signal', '#3ee8a0', '#a3f5cf', '#3ee8a0', '#a3f5cf'],
    ['Dusk', '#6f9dff', '#b5ccff', '#6f9dff', '#b5ccff'],
    ['Moon', '#dfe7f5', '#ffffff', '#273246', '#3d4a61'],
  ],
  ember: [
    ['Ember', '#ff7a1a', '#ffb070', '#ff7a1a', '#ffb070'],
    ['Cyan', '#22d3ee', '#9beefa', '#22d3ee', '#9beefa'],
    ['Lime', '#a3e635', '#d6f79f', '#a3e635', '#d6f79f'],
    ['Violet', '#a78bfa', '#d6caff', '#a78bfa', '#d6caff'],
    ['Rose', '#fb7185', '#fdb8c2', '#fb7185', '#fdb8c2'],
    ['Ice', '#dfe9ef', '#ffffff', '#1f2937', '#3b4656'],
  ],
} as const satisfies Record<string, readonly Accent[]>;

export type PaletteName = keyof typeof PALETTES;

export const accentKey = (a: Accent) => a[0].toLowerCase();

const vars = (a: string, hi: string, dark: boolean) =>
  `--accent:${a}; --accent-hi:${hi}; --accent-dim:color-mix(in srgb, ${a} 10%, transparent);` +
  ` --glass-on:color-mix(in srgb, ${a} ${dark ? 9 : 12}%, ${dark ? '#101112' : '#eef0f0'});`;

/** CSS that sets the accent tokens for every `:root[data-accent="…"]`, in both themes. */
export function accentCss(accents: readonly Accent[]): string {
  return accents.map(([n, da, dh, la, lh]) => {
    const k = n.toLowerCase();
    return `:root[data-accent="${k}"] { ${vars(da, dh, true)} }
@media (prefers-color-scheme: light) { :root[data-accent="${k}"]:not([data-theme="dark"]) { ${vars(la, lh, false)} } }
:root[data-accent="${k}"][data-theme="light"] { ${vars(la, lh, false)} }`;
  }).join('\n');
}
