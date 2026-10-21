/* P1a Reference house scene: click a floor (or 1–5 for the main house) to light it, space toggles
   the main house, n switches day/night (cascade), w sends a pulse down a wire. */
import { MAIN_FLOORS, renderReferenceHouse } from '@render/reference-house';
import { SceneController, type SceneSnapshot } from '@scenes/controller';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class ReferenceController extends SceneController<SceneSnapshot> {
  private readonly floors: string[];
  private lit = new Set<string>();
  private night = false;

  constructor() {
    const d = renderReferenceHouse();
    super({ svg: d.svg, viewBox: d.viewBox, readout: '', power: false });
    this.floors = d.floors;
    this.refresh();
  }

  protected override onAttach(): void {
    this.apply();
    if (!reducedMotion()) this.schedulePulse();
  }

  override key(e: KeyboardEvent): boolean {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter') {
      if (!e.repeat) { const on = !MAIN_FLOORS.some(f => this.lit.has(f)); MAIN_FLOORS.forEach(f => this.set(f, on)); this.apply(); }
      return true;
    }
    if (k === 'n') { this.toggleNight(); return true; }
    if (k === 'w') { this.firePulse(); return true; }
    const n = Number(k);
    if (Number.isInteger(n) && n >= 1 && n <= MAIN_FLOORS.length) { this.toggle(MAIN_FLOORS[n - 1]!); return true; }
    return false;
  }

  override click(target: Element): void {
    const fl = target.closest<SVGGElement>('[data-floor]');
    if (fl?.dataset.floor) this.toggle(fl.dataset.floor);
  }

  override demo(): void {
    if (!this.night) this.toggleNight();
  }

  private set(id: string, on: boolean): void {
    if (on) this.lit.add(id); else this.lit.delete(id);
  }

  private toggle(id: string): void {
    this.set(id, !this.lit.has(id));
    this.apply();
  }

  /** night: the main house lights floor by floor, neighbours join in a scattered order; day: all off */
  private toggleNight(): void {
    this.night = !this.night;
    if (!this.night) { this.lit.clear(); this.apply(); return; }
    const main = this.floors.filter(f => f.startsWith('M'));
    const others = this.floors.filter(f => !f.startsWith('M')).sort(() => Math.random() - 0.5).filter(() => Math.random() < 0.75);
    this.apply();
    [...main, ...others].forEach((id, i) => this.after(120 + i * 110, () => { if (this.night) { this.set(id, true); this.apply(); } }));
  }

  private schedulePulse(): void {
    const ms = (this.night ? 600 : 1500) + Math.random() * 1400;
    this.after(ms, () => { this.firePulse(); this.schedulePulse(); });
  }

  private firePulse(): void {
    const pulses = this.svg?.querySelectorAll<SVGPathElement>('.pulse');
    if (!pulses?.length) return;
    const el = pulses[Math.floor(Math.random() * pulses.length)]!;
    el.classList.remove('go');
    void el.getBoundingClientRect();   // restart the one-shot animation
    el.classList.add('go');
  }

  private apply(): void {
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll<SVGGElement>('[data-floor]').forEach(g => g.classList.toggle('on', this.lit.has(g.dataset.floor!)));
      svg.querySelectorAll<SVGGElement>('[data-for]').forEach(g => g.classList.toggle('on', this.lit.has(g.dataset.for!)));
      svg.querySelectorAll<SVGGElement>('[data-night]').forEach(g => g.classList.toggle('on', this.night));
    }
    this.refresh();
  }

  private refresh(): void {
    const n = this.lit.size;
    this.update({ readout: `${this.night ? 'night' : 'day'} · ${n}/${this.floors.length} lit`, power: n > 0 || this.night });
  }
}
