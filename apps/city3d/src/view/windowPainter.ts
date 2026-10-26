/* Window and lamp colours written into the layers' colour buffers (ADR-038, ADR-040). Which lamps are on,
   the four window shades of the theme, and the share of house windows lit at night ("ambient").

   Lazy repaint (CS-09): one full repaint of 155 layers took 54 ms and day/night ran it 10 times. A global change
   (theme, ambient) now bumps a version and repaints only what is showing; a streamed layer painted at an older
   version is repainted when it shows again (`freshen`). Split out of CityView; no DOM, tested in Node. */
import * as THREE from 'three';
import type { Layer } from '@render/city';
import { isHouseLamp, windowRank, windowShade, type Shade } from '@render/lights';

const shades = (): Record<Shade, THREE.Color> => ({ off: new THREE.Color(), on: new THREE.Color(), hi: new THREE.Color(), dim: new THREE.Color() });

export class WindowPainter {
  /** lamp ids that are on (a floor `<building>#<n>`, street lamps, a station…) */
  readonly lit = new Set<string>();
  /** window fill and window outline colour of each shade (set from the theme tokens) */
  readonly colors = shades();
  readonly outline = shades();
  /** share 0–1 of house windows lit without their floor being switched on */
  ambient = 0;
  private version = 0;
  private readonly paintedAt = new WeakMap<Layer, number>();
  /** layers of streamed pieces: off screen they may wait for `freshen` */
  private readonly streamed = new WeakSet<Layer>();

  markStreamed(layer: Layer) { this.streamed.add(layer); }

  /** write one lamp's windows (and their outlines) in one layer */
  paint(layer: Layer, id: string) {
    const ranges = layer.lamps.get(id);
    if (!ranges) return;
    const fill = layer.windows.getAttribute('color') as THREE.BufferAttribute, floor = this.lit.has(id), share = isHouseLamp(id) ? this.ambient : 0;
    const shade = (k: number): Shade => { const s = windowShade(id, k); return floor ? s : windowRank(id, k) < share ? (s === 'off' ? 'dim' : s) : 'off'; };
    let k = 0;
    for (const r of ranges) for (let w = r.start; w < r.start + r.count; w += 6, k++) {
      const c = this.colors[shade(k)];
      for (let v = w; v < w + 6; v++) fill.setXYZ(v, c.r, c.g, c.b);
    }
    fill.needsUpdate = true;
    const lines = layer.lampLines.get(id), col = layer.details.attributes.instanceColorStart as THREE.InterleavedBufferAttribute | undefined;
    if (!lines || !col) return;
    const arr = col.data.array as Float32Array;
    k = 0;
    for (const r of lines) for (let s = r.start; s < r.start + r.count; s += 4, k++) {
      const c = this.outline[shade(k)];
      for (let j = s * 6; j < (s + 4) * 6; j += 3) { arr[j] = c.r; arr[j + 1] = c.g; arr[j + 2] = c.b; }
    }
    col.data.needsUpdate = true;
  }

  /** every window of a layer from scratch */
  paintLayer(layer: Layer) {
    const fill = layer.windows.getAttribute('color') as THREE.BufferAttribute, off = this.colors.off;
    for (let v = 0; v < fill.count; v++) fill.setXYZ(v, off.r, off.g, off.b);
    fill.needsUpdate = true;
    const col = layer.details.attributes.instanceColorStart as THREE.InterleavedBufferAttribute | undefined;
    if (col) {
      const arr = col.data.array as Float32Array, d = this.outline.off;
      for (let j = 0; j < arr.length; j += 3) { arr[j] = d.r; arr[j + 1] = d.g; arr[j + 2] = d.b; }
      col.data.needsUpdate = true;
    }
    for (const id of layer.lamps.keys()) if (this.lit.has(id) || (this.ambient > 0 && isHouseLamp(id))) this.paint(layer, id);
    this.paintedAt.set(layer, this.version);
  }

  /** a global change: repaint every layer that is not streamed or is `showing`; the others wait for `freshen` */
  repaint(layers: Iterable<Layer>, showing: ReadonlySet<Layer>) {
    this.version++;
    for (const l of layers) if (!this.streamed.has(l) || showing.has(l)) this.paintLayer(l);
  }

  /** a layer comes on screen: repaint it if a global change happened while it was away */
  freshen(layer: Layer | null | undefined) {
    if (layer && this.paintedAt.get(layer) !== this.version) this.paintLayer(layer);
  }

  /** switch a lamp in every layer; false when it already was in that state */
  setLamp(layers: Iterable<Layer>, id: string, on: boolean): boolean {
    if (on === this.lit.has(id)) return false;
    if (on) this.lit.add(id); else this.lit.delete(id);
    for (const l of layers) this.paint(l, id);
    return true;
  }
}
