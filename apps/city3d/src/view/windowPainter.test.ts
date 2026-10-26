import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadCity } from '@my-city/osm-import';
import { buildTile, tilesOf, type Layer } from '@render/city';
import { isHouseLamp } from '@render/lights';
import { WindowPainter } from './windowPainter';

const { city } = loadCity('nga-tu-thai-ha');
const tiles = tilesOf(city).sort((a, b) => Math.hypot(...a.center) - Math.hypot(...b.center)).slice(0, 2);
const layers: Layer[] = tiles.map(t => buildTile(city, t, 1));
const fillOf = (l: Layer) => l.windows.getAttribute('color') as THREE.BufferAttribute;
const lampOf = (l: Layer) => [...l.lamps.keys()].find(isHouseLamp)!;
/** colour of the first window of a lamp */
const first = (l: Layer, id: string) => { const v = l.lamps.get(id)![0]!.start; const f = fillOf(l); return [f.getX(v), f.getY(v), f.getZ(v)]; };

describe('WindowPainter (CS-09)', () => {
  it('switches a floor on in every layer', () => {
    const p = new WindowPainter();
    p.colors.on.set('#ff0000'); p.colors.hi.set('#ff0000'); p.colors.dim.set('#ff0000');
    for (const l of layers) p.paintLayer(l);
    const id = lampOf(layers[0]!);
    expect(p.setLamp(layers, id, true)).toBe(true);
    expect(p.setLamp(layers, id, true)).toBe(false);
    expect(p.lit.has(id)).toBe(true);
  });

  it('a global repaint skips a streamed layer off screen, and freshen paints it when it shows', () => {
    const p = new WindowPainter();
    const [shown, hidden] = layers as [Layer, Layer];
    p.markStreamed(shown); p.markStreamed(hidden);
    p.colors.off.set('#000000');
    for (const l of layers) p.paintLayer(l);
    const id = lampOf(hidden);
    p.colors.off.set('#00ff00');
    p.repaint(layers, new Set([shown]));
    expect(first(shown, lampOf(shown))).toEqual([0, 1, 0]);
    expect(first(hidden, id)).toEqual([0, 0, 0]);
    p.freshen(hidden);
    expect(first(hidden, id)).toEqual([0, 1, 0]);
  });
});
