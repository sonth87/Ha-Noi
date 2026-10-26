/* Each junction runs its own signal clock (core signalClusters / signalsOf), so the lights of the city no
   longer all change at once (CS-09). The junction nearest the map origin (the Thái Hà crossroads) keeps the
   plain cycle, which the status line shows. Lamps are switched only for junctions around the view (A32); one
   that comes back into view is brought up to date then. No GPU objects: tested in Node. */
import { signalClusters, signalOffset, signalsOf, type Network, type Signals } from '@my-city/core';
import { signalLamp } from '@render/furniture';
import { SpatialGrid } from './spatialGrid';

const LIGHTS = ['stop', 'wait', 'go'] as const;

export class SignalClock {
  /** the junction whose lights the status line shows (null: none signalled) */
  readonly main: string | null;
  private readonly base: number;
  private readonly grid = new SpatialGrid<string>(256);
  private readonly phase = new Map<string, number>();

  constructor(net: Network) {
    const clusters = signalClusters(net);
    const at = new Map<string, [number, number, number]>();
    for (const n of net.nodes) {
      const j = clusters.get(n.id);
      if (!j) continue;
      const a = at.get(j) ?? [0, 0, 0];
      at.set(j, [a[0] + n.at[0], a[1] + n.at[1], a[2] + 1]);
    }
    let main: string | null = null, best = Infinity;
    for (const [j, [sx, sy, k]] of at) {
      const x = sx / k, y = sy / k;
      this.grid.insert(j, x, y, 20);
      const d = Math.hypot(x, y);
      if (d < best) { best = d; main = j; }
    }
    this.main = main;
    this.base = main ? signalOffset(main) : 0;
  }

  /** the lights of a junction at time t */
  at(t: number, junction: string | undefined): Signals {
    return signalsOf(t, junction, this.base);
  }

  /** for stepTraffic: every junction's lights at t, each computed once per call */
  source(t: number): (junction: string | undefined) => Signals {
    const memo = new Map<string | undefined, Signals>();
    return j => { let s = memo.get(j); if (!s) memo.set(j, (s = this.at(t, j))); return s; };
  }

  /** the lamps to switch for the junctions within r of (x, z) whose phase changed: [lamp id, on] */
  lampChanges(t: number, x: number, z: number, r: number): [string, boolean][] {
    const out: [string, boolean][] = [];
    for (const j of this.grid.query(x, z, r)) {
      const s = this.at(t, j);
      if (this.phase.get(j) === s.phase) continue;
      this.phase.set(j, s.phase);
      for (const g of ['x', 'y'] as const) for (const l of LIGHTS) out.push([signalLamp(j, g, l), s[g] === l]);
    }
    return out;
  }

  /** after a remount the lamps start dark: switch every junction again when it is in view */
  reset() { this.phase.clear(); }
}
