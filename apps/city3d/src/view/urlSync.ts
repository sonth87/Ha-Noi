/* When the address bar follows the view (split out of CityView, city3d.md §8). Writing history on every frame
   is throttled by browsers and costs time, so a change is written once it has settled for 300 ms, or at most
   every 1.2 s while the user drags or a flight runs. Pure: the view hands in the state and the clock, and gets
   back whether to write. Tested in Node. */
import type { UrlViewState } from './urlState';

export class UrlSync {
  private candidate = '';
  private synced = '';
  private dirtyAt = 0;
  private lastWrite = 0;

  /** the state to write now, or null when nothing changed or it is too soon */
  step(state: UrlViewState, now: number, busy: boolean, force = false): UrlViewState | null {
    const sig = [state.x.toFixed(1), state.z.toFixed(1), state.zoom.toFixed(2), state.heading.toFixed(1), state.tilt.toFixed(1), state.mode,
      state.night ? 1 : 0, state.seeThrough ? 1 : 0, state.streetLabels, state.placeInfo, state.showcase ?? '', state.place ?? ''].join('|');
    if (sig !== this.candidate) { this.candidate = sig; this.dirtyAt = now; }
    if (!force) {
      if (sig === this.synced) return null;
      if (busy && now - this.lastWrite < 1200) return null;
      if (!busy && now - this.dirtyAt < 300) return null;
      if (now - this.lastWrite < 280) return null;
    }
    this.synced = sig;
    this.lastWrite = now;
    return state;
  }
}
