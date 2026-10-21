/* How a lit window looks (iso-glow's "lived-in" windows): when a floor is on, its windows are not
   all the same — about 2 in 10 bright, 5 normal, 2 dim and 1 still dark — the same ones every time
   (seeded by the lamp and the window). Street lamps and signals light evenly.
   `windowRank` gives every window of a house a fixed place in [0, 1): the windows lit at a share
   are those ranked below it — scattered evenly over every building, as in iso-glow (ADR-040). Pure. */
import { hash } from '@my-city/core';

export type Shade = 'hi' | 'on' | 'dim' | 'off';

export function windowShade(lamp: string, k: number): Shade {
  if (lamp.startsWith('street/') || lamp.startsWith('signal/')) return 'on';
  const h = hash(`${lamp}#${k}`) % 20;
  return h < 2 ? 'off' : h < 6 ? 'dim' : h < 10 ? 'hi' : 'on';
}

/** is this lamp a building's (not a street lamp or signal) */
export const isHouseLamp = (lamp: string) => !lamp.startsWith('street/') && !lamp.startsWith('signal/');

/** a window's fixed place in [0, 1) for lighting a share of all windows. FNV-1a's high bits hardly
    move between strings that differ in their last characters, so the hash is mixed (murmur3's
    finaliser) before it is scaled. */
export function windowRank(lamp: string, k: number): number {
  let h = hash(`rank:${lamp}#${k}`);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
