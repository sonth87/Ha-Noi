/* Metro trains (ADR-042): the tracks of the city's elevated metro and a timetable for one train on
   each. A train is 4 cars (Line 2A runs 4-car sets, about 79 m). It comes in at line speed, brakes
   to stop with its middle at the middle of each station on its track, waits there with its doors
   open, pulls away, runs out of the area, and the next one comes some time later. Where a train is
   is a pure function of time, so every view of it agrees. Pure. */
import type { City, Rail } from './city';
import { closestOnSegment, dist, polylineLength, type Vec2 } from './geom';
import { hash } from './rng';

export const METRO = {
  /** cars and their length, with the gap between cars (m) */
  cars: 4, carLen: 19, gap: 0.8,
  /** line speed (m/s), braking and pulling away (m/s²), the stop (s) and the wait between trains (s) */
  speed: 13, accel: 1, dwell: 25, between: 70,
} as const;

export const TRAIN_LEN = METRO.cars * METRO.carLen + (METRO.cars - 1) * METRO.gap;

export interface Track {
  id: string;
  rail: string;
  name?: string;
  path: Vec2[];
  length: number;
  height: number;
  /** where the head of the train stops for each station on the track (distance along it) */
  stops: { station: string; s: number }[];
  /** the timetable: one cycle of [time, head position] breakpoints, with the motion between them */
  plan: Leg[];
  period: number;
  /** offset of this track's cycle (s) */
  phase: number;
}

type Leg = { t0: number; t1: number; s0: number; s1: number; kind: 'run' | 'brake' | 'pull' | 'stop' | 'away' };

export type TrainPhase = 'away' | 'run' | 'brake' | 'stop' | 'pull';

/** the elevated metro rails of a city as tracks with their stops and timetables */
export function metroTracks(city: City): Track[] {
  return city.rails.filter(r => r.kind === 'metro').map(r => track(r, city)).sort((a, b) => (a.id < b.id ? -1 : 1));
}

function track(r: Rail, city: City): Track {
  const L = polylineLength(r.path);
  const stops = city.stations.filter(st => st.kind === r.kind).flatMap(st => {
    const s = along(r.path, st.at);
    return s.d < 30 && s.s - TRAIN_LEN / 2 > 0 && s.s + TRAIN_LEN / 2 < L ? [{ station: st.id, s: s.s + TRAIN_LEN / 2 }] : [];
  }).sort((a, b) => a.s - b.s);
  const { speed: v, accel: a, dwell, between } = METRO, dA = (v * v) / (2 * a), tA = v / a;
  const plan: Leg[] = [];
  let t = 0, s = 0;
  const run = (to: number) => { if (to > s) { plan.push({ t0: t, t1: t + (to - s) / v, s0: s, s1: to, kind: 'run' }); t += (to - s) / v; s = to; } };
  for (const st of stops) {
    run(st.s - dA);
    plan.push({ t0: t, t1: t + tA, s0: s, s1: st.s, kind: 'brake' }); t += tA; s = st.s;
    plan.push({ t0: t, t1: t + dwell, s0: s, s1: s, kind: 'stop' }); t += dwell;
    plan.push({ t0: t, t1: t + tA, s0: s, s1: s + dA, kind: 'pull' }); t += tA; s += dA;
  }
  run(L + TRAIN_LEN);
  plan.push({ t0: t, t1: t + between, s0: s, s1: s, kind: 'away' }); t += between;
  return { id: `track-${r.id}`, rail: r.id, name: r.name, path: r.path, length: L, height: r.height, stops, plan, period: t, phase: (hash(r.id) % 1000) / 1000 * t };
}

/** where the head of the train on a track is at time t (null while it is away), and what it is doing */
export function trainAt(tr: Track, t: number): { head: number | null; phase: TrainPhase } {
  const u = (((t + tr.phase) % tr.period) + tr.period) % tr.period;
  const leg = tr.plan.find(l => u >= l.t0 && u < l.t1) ?? tr.plan[tr.plan.length - 1]!;
  const k = (u - leg.t0) / (leg.t1 - leg.t0 || 1);
  switch (leg.kind) {
    case 'away': return { head: null, phase: 'away' };
    case 'stop': return { head: leg.s0, phase: 'stop' };
    // braking: distance covered goes as 1 − (1 − k)²; pulling away as k²
    case 'brake': return { head: leg.s0 + (leg.s1 - leg.s0) * (1 - (1 - k) ** 2), phase: 'brake' };
    case 'pull': return { head: leg.s0 + (leg.s1 - leg.s0) * k * k, phase: 'pull' };
    default: return { head: leg.s0 + (leg.s1 - leg.s0) * k, phase: 'run' };
  }
}

/** distance along a path of the point nearest p, and how far p is from it */
function along(path: readonly Vec2[], p: Vec2): { s: number; d: number } {
  let best = { s: 0, d: Infinity }, acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!, c = closestOnSegment(p, a, b), L = dist(a, b);
    if (c.d < best.d) best = { s: acc + c.t * L, d: c.d };
    acc += L;
  }
  return best;
}
