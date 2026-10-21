/* SceneController: owns a scene's simulation state and drives its SVG directly (ADR-013).
   React reads only the snapshot (useSyncExternalStore), which changes on meaningful events,
   never per animation frame (NFR-14).

   Lifecycle: SceneSvg writes snapshot.svg into the <svg>, then calls attach(svg). When the
   snapshot's svg string changes (rotation, cutaway…) or the view unmounts, detach() runs first:
   it stops every timer and loop started through after/every/loop. attach() must therefore
   re-apply state to the fresh DOM and restart anything that should keep running.
   React StrictMode runs attach → detach → attach in dev; the contract above makes that safe. */

export interface SceneSnapshot {
  /** static drawing produced by render/ */
  svg: string;
  viewBox: string;
  /** terse lowercase status, bottom-right (FR-37) */
  readout: string;
  /** warm haze behind the figure while something is lit */
  power: boolean;
}

export abstract class SceneController<S extends SceneSnapshot = SceneSnapshot> {
  private snap: S;
  private readonly listeners = new Set<() => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stops: (() => void)[] = [];
  protected svg: SVGSVGElement | null = null;

  protected constructor(initial: S) {
    this.snap = initial;
  }

  readonly getSnapshot = (): S => this.snap;

  readonly subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  protected update(patch: Partial<S>): void {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach(fn => fn());
  }

  attach(svg: SVGSVGElement): void {
    this.svg = svg;
    this.onAttach(svg);
  }

  detach(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.stops.forEach(stop => stop());
    this.stops = [];
    this.svg = null;
  }

  /** Re-apply state to freshly written DOM. */
  protected onAttach(_svg: SVGSVGElement): void {}

  /** Keyboard input; return true when handled. */
  key(_e: KeyboardEvent): boolean { return false; }

  /** Pointer input, delegated from the <svg>. */
  click(_target: Element): void {}

  /** Short scripted sequence (runs with ?demo) using the same functions as real input. */
  demo(): void {}

  protected after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  /** Calls fn(timestampMs) every animation frame until detach(); animate from the timestamp. */
  protected loop(fn: (now: number) => void): void {
    let alive = true;
    const tick = (now: number) => { if (!alive) return; fn(now); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    this.stops.push(() => { alive = false; });
  }
}
