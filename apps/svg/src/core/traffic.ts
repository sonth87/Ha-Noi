/* Traffic at the crossroads (FR-35, FR-36): the light cycle and a small car-following model.
   Pure: state in, state out; the controller only maps positions to the DOM.

   Signals. One cycle, the two streets taking turns, with an all-red between them so the
   junction empties: X green → X yellow → all red → Y green → Y yellow → all red.
   Each light also shows a countdown (Hà Nội lights do): seconds to the next change of colour.

   Vehicles. Every vehicle drives along its lane at its own cruising speed, in one of three tracks
   (bikes on the edges, cars in the middle). It slows down smoothly for
     - the vehicle ahead in the same lane and track (keeping a gap), and
     - the stop line, while its light is red, or yellow and it decided at the change to stop.
   At the change to yellow, whoever would reach the line within 0.8 s goes on; the rest stop.
   Flyover lanes have no light. A lane is a loop: leaving one end you come back at the other. */

export type Light = 'go' | 'wait' | 'stop';

export interface Phase { x: Light; y: Light; t: number }

/** seconds; green long enough for a queue to clear, yellow + all red long enough to empty the junction:
    the slowest motorbike (48 units/s) that goes on at yellow needs ~6 s to clear Tây Sơn's 22 m */
export const CYCLE: readonly Phase[] = [
  { x: 'go', y: 'stop', t: 14 },
  { x: 'wait', y: 'stop', t: 3 },
  { x: 'stop', y: 'stop', t: 4 },
  { x: 'stop', y: 'go', t: 11 },
  { x: 'stop', y: 'wait', t: 3 },
  { x: 'stop', y: 'stop', t: 4 },
];
export const CYCLE_T = CYCLE.reduce((s, p) => s + p.t, 0);

export interface Signals {
  x: Light; y: Light;
  /** whole seconds until each street's light changes colour (yellow counts with green) */
  xLeft: number; yLeft: number;
  phase: number;
}

export function signalsAt(t: number): Signals {
  let u = ((t % CYCLE_T) + CYCLE_T) % CYCLE_T, i = 0;
  while (u >= CYCLE[i]!.t) { u -= CYCLE[i]!.t; i++; }
  const ph = CYCLE[i]!;
  // time until axis `k` turns from its current colour into the next one
  const left = (k: 'x' | 'y') => {
    const now = ph[k] === 'wait' ? 'go' : ph[k];   // yellow counts with green
    let s = ph.t - u;
    for (let j = 1; j < CYCLE.length; j++) {
      const q = CYCLE[(i + j) % CYCLE.length]!, c = q[k] === 'wait' ? 'go' : q[k];
      if (c !== now) break;
      s += q.t;
    }
    return Math.ceil(s);
  };
  return { x: ph.x, y: ph.y, xLeft: left('x'), yLeft: left('y'), phase: i };
}

export interface Car {
  /** which street ('x' | 'y'), lane, track (0–2) */
  st: 'x' | 'y';
  lane: number;
  track: number;
  len: number;
  dir: 1 | -1;
  /** cruising speed, units/s */
  v: number;
  /** tail position along the street (street-local x) */
  a: number;
  /** obeys the light (false on the flyover) */
  signal: boolean;
  /** decided at the start of yellow to go on */
  commit?: boolean;
}

export interface Road {
  length: number;
  /** the junction along this street */
  gap: readonly [number, number];
}

const GAP = { bike: 3, car: 5 } as const;
const STOP_AHEAD = 1;       // stop with the front this far before the junction
const EASE = 2.6;           // 1/s: how fast speed follows the free distance ahead

/** progress of the front along the direction of travel, in [0, L) */
const front = (c: Car, L: number) => (c.dir > 0 ? c.a + c.len : L - c.a);
const line = (c: Car, r: Road) => (c.dir > 0 ? r.gap[0] - STOP_AHEAD : r.length - r.gap[1] - STOP_AHEAD);

/** Advance every vehicle by dt seconds. `prev` is the signal state of the previous step (for the
    yellow decision). Mutates and returns `cars`. */
export function stepTraffic(cars: Car[], roads: Record<'x' | 'y', Road>, sig: Signals, prev: Signals | null, dt: number): Car[] {
  // group per lane and track, ordered by progress
  const groups = new Map<string, Car[]>();
  for (const c of cars) {
    const k = `${c.st}:${c.lane}:${c.track}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(c);
  }
  const speed = new Map<Car, number>();
  for (const g of groups.values()) {
    const rd = roads[g[0]!.st], L = rd.length;
    g.sort((p, q) => front(p, L) - front(q, L));
    g.forEach((c, i) => {
      const s = front(c, L);
      let free = Infinity;
      if (g.length > 1) {
        const ahead = g[(i + 1) % g.length]!;
        const room = ((front(ahead, L) - ahead.len - s) % L + L) % L;
        free = room - (c.len < 30 ? GAP.bike : GAP.car);
      }
      if (c.signal) {
        const light = sig[c.st], was = prev?.[c.st], ln = line(c, rd), toLine = ln - s;
        const before = toLine >= -0.01 && toLine < 420;
        if (light === 'go') c.commit = true;
        else if (light === 'wait' && was !== 'wait') c.commit = before ? toLine < c.v * 0.8 : undefined;
        else if (light === 'stop' && was !== 'stop') c.commit = before ? false : undefined;
        if (!before) c.commit = undefined;
        else if (light !== 'go' && c.commit !== true) free = Math.min(free, toLine);
      }
      speed.set(c, Math.min(c.v, Math.max(0, free) * EASE));
    });
  }
  for (const c of cars) {
    const L = roads[c.st].length, ds = speed.get(c)! * dt;
    c.a = (((c.a + c.dir * ds) % L) + L) % L;
  }
  return cars;
}
