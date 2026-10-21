/* Drives the crossroads' vehicles and lights in the DOM from core/traffic.ts, for both the
   Ngã tư scene and the flyover page of "Công trình". Each frame: step the model, then give every
   vehicle element its transform (along its street, lifted onto the flyover) and its parent group
   (the lane piece, flyover piece or junction cell it is in, so it is drawn at the right depth).

   The model outlives the drawing (rotation rebuilds the SVG): cars are keyed by the vehicle id in
   the markup. `win` limits each street to a window [lo, hi] (street-local a): the model runs in
   window coordinates, vehicles wrap inside it and fade at its ends. A vehicle whose group is not in
   the drawing (cut away on the flyover page) is hidden. */
import { kernel } from '@iso/kernel';
import { cellAt, type Crossroads, type JunctionGrid, junctionGrid } from '@core/crossroads';
import { flyPieces, flyZ, lanePieces } from '@core/layout';
import { signalsAt, stepTraffic, type Car, type Signals } from '@core/traffic';
import type { ViewK } from '@core/types';
import { pieceIndex } from '@render/props/street';
import { corridorFrame } from '@render/crossroads-scene';

const K0 = kernel(0, 0);
type St = 'x' | 'y';

interface Vehicle { el: SVGGElement; car: Car; fly: boolean; host: string }

export class TrafficDriver {
  readonly grid: JunctionGrid;
  private readonly cuts: Record<St, [number, number][][]>;
  private readonly fly;
  private readonly cars = new Map<string, Car>();
  private list: Car[] = [];
  private vehicles: Vehicle[] = [];
  private hosts = new Map<string, SVGGElement>();
  private unit: Record<St, [number, number]> = { x: [0, 0], y: [0, 0] };
  private clock = 0;
  private sig: Signals = signalsAt(0);
  private prev: Signals | null = null;
  private shown = '';
  private svg: SVGSVGElement | null = null;

  constructor(private readonly cr: Crossroads, private readonly win: Record<St, readonly [number, number]>) {
    this.grid = junctionGrid(cr);
    this.cuts = { x: cr.x.lay.section.lanes.map((_, i) => lanePieces(cr.x.lay, i)), y: cr.y.lay.section.lanes.map((_, i) => lanePieces(cr.y.lay, i)) };
    this.fly = flyPieces(cr.x.lay.flyover!);
  }

  get signals(): Signals { return this.sig; }
  get count(): number { return this.vehicles.length; }

  /** model roads: window coordinates */
  private roads() {
    const r = (st: St) => { const [lo, hi] = this.win[st], g = this.cr[st].lay.gap!; return { length: hi - lo, gap: [g[0] - lo, g[1] - lo] as const }; };
    return { x: r('x'), y: r('y') };
  }

  /** (re)bind to freshly written DOM for view k */
  bind(svg: SVGSVGElement, k: ViewK): void {
    this.svg = svg;
    for (const st of ['x', 'y'] as const) { const v = corridorFrame(this.cr, st, k).vec(1, 0, 0); this.unit[st] = K0.D(v[0], v[1], v[2]); }
    this.hosts.clear();
    svg.querySelectorAll<SVGGElement>('.traffic-lane[data-piece]').forEach(g => {
      g.querySelectorAll<SVGGElement>(':scope > [data-track]').forEach(t => this.hosts.set(`${g.dataset.st}:${g.dataset.lane}:${g.dataset.piece}:${t.dataset.track}`, t));
    });
    svg.querySelectorAll<SVGGElement>('.traffic-fly[data-piece]').forEach(g => {
      g.querySelectorAll<SVGGElement>(':scope > [data-track]').forEach(t => this.hosts.set(`fly:${g.dataset.piece}:${t.dataset.track}`, t));
    });
    svg.querySelectorAll<SVGGElement>('.traffic-cell').forEach(g => this.hosts.set(`cell:${g.dataset.cell}`, g));

    this.vehicles = [...svg.querySelectorAll<SVGGElement>('.vehicle')].map(el => {
      const st = el.dataset.st as St, lane = Number(el.dataset.lane), track = Number(el.dataset.track);
      const ln = this.cr[st].lay.section.lanes[lane]!, vid = el.dataset.vid!;
      let car = this.cars.get(vid);
      if (!car) {
        car = { st, lane, track, len: Number(el.dataset.len), dir: Number(el.dataset.dir) as 1 | -1, v: Number(el.dataset.v), a: Number(el.dataset.a0) - this.win[st][0], signal: !ln.fly };
        this.cars.set(vid, car);
      }
      return { el, car, fly: !!ln.fly, host: '' };
    });
    this.list = [...this.cars.values()];
    this.shown = '';
    this.showSignals();
    this.place();
  }

  /** advance by dt seconds; true when the lights changed */
  tick(dt: number): boolean {
    this.clock += dt;
    this.prev = this.sig;
    this.sig = signalsAt(this.clock);
    stepTraffic(this.list, this.roads(), this.sig, this.prev, dt);
    this.place();
    return this.showSignals();
  }

  private place(): void {
    const roads = this.roads(), fl = this.cr.x.lay.flyover!;
    for (const vh of this.vehicles) {
      const c = vh.car, [lo] = this.win[c.st], L = roads[c.st].length, [ux, uy] = this.unit[c.st];
      const a = c.a + lo, mid = a + c.len / 2, z = vh.fly ? flyZ(fl, mid) : 0;
      vh.el.setAttribute('transform', `translate(${(ux * a).toFixed(2)} ${(uy * a - z).toFixed(2)})`);
      const edge = Math.min(c.a, L - c.len - c.a);
      const key = this.hostKey(c, vh.fly, Math.min(Math.max(mid, lo), this.win[c.st][1] - 0.01));
      if (key !== vh.host) {
        const host = this.hosts.get(key);
        if (host) { host.appendChild(vh.el); vh.host = key; }
        vh.el.style.display = host ? '' : 'none';
      }
      vh.el.style.opacity = edge < 0 ? '0' : edge < 24 ? (edge / 24).toFixed(2) : '';
    }
  }

  private hostKey(c: Car, fly: boolean, mid: number): string {
    if (fly) {
      const k = pieceIndex(this.fly, mid);
      if (k >= 0) return `fly:${k}:${c.lane}:${c.track}`;
    } else {
      const cell = cellAt(this.cr, this.grid, c.st, c.lane, mid);
      if (cell) return `cell:${cell}`;
    }
    const k = pieceIndex(this.cuts[c.st][c.lane]!, mid);
    return k < 0 ? 'none' : `${c.st}:${c.lane}:${k}:${c.track}`;
  }

  private showSignals(): boolean {
    const s = this.sig, key = `${s.x}${s.y}${s.xLeft}${s.yLeft}`;
    if (key === this.shown || !this.svg) return false;
    this.shown = key;
    this.svg.querySelectorAll<SVGGElement>('.signal').forEach(el => {
      el.classList.remove('go', 'wait', 'stop');
      el.classList.add(s[el.dataset.axis as St]);
    });
    this.svg.querySelectorAll<SVGTextElement>('.sig-count').forEach(el => {
      el.textContent = String(el.dataset.axis === 'x' ? s.xLeft : s.yLeft).padStart(2, '0');
    });
    return true;
  }
}
