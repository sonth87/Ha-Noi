/* Work that must not run while the user drags, pinches or flies (A22): queued, then run one job per slot once
   the view is idle. Used for the street tiles and furniture of a streamed chunk (~45 ms each on a laptop, CS-09).
   `flush` runs what is left at once (unmount: the jobs fill caches that outlive the mount). */

export class IdleQueue {
  private readonly jobs: (() => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly busy: () => boolean, private readonly afterAll?: () => void) {}

  get pending(): number { return this.jobs.length; }

  push(job: () => void) {
    this.jobs.push(job);
    if (this.timer === undefined) this.timer = setTimeout(() => this.run(), 0);
  }

  private run() {
    this.timer = undefined;
    if (this.busy()) { this.timer = setTimeout(() => this.run(), 150); return; }
    this.jobs.shift()?.();
    if (this.jobs.length) this.timer = setTimeout(() => this.run(), 16);
    else this.afterAll?.();
  }

  flush() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    while (this.jobs.length) this.jobs.shift()!();
  }
}
