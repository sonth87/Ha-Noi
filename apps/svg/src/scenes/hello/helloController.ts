/* P0 Hello scene: click a floor (or 1–4) to light it, space toggles the whole house, n runs a
   night-shift cascade from the ground up. Light state lives here and is re-applied after every
   DOM rebuild (ADR-013). */
import { HELLO_FLOORS, renderHello } from '@render/hello';
import { SceneController, type SceneSnapshot } from '@scenes/controller';

export class HelloController extends SceneController<SceneSnapshot> {
  private lit: boolean[] = new Array(HELLO_FLOORS + 1).fill(false);

  constructor() {
    const { svg, viewBox } = renderHello();
    super({ svg, viewBox, readout: `0/${HELLO_FLOORS} floors lit`, power: false });
  }

  protected override onAttach(): void {
    this.apply();
  }

  override key(e: KeyboardEvent): boolean {
    if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) this.setAll(!this.anyLit()); return true; }
    if (e.key === 'n' || e.key === 'N') { this.cascade(); return true; }
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= HELLO_FLOORS) { this.toggle(n); return true; }
    return false;
  }

  override click(target: Element): void {
    const fl = target.closest<SVGGElement>('[data-floor]');
    if (fl) { this.toggle(Number(fl.dataset.floor)); return; }
    if (target.closest('.house')) this.setAll(!this.anyLit());
  }

  override demo(): void {
    this.cascade();
  }

  private toggle(n: number): void {
    this.lit[n] = !this.lit[n];
    this.apply();
  }

  private setAll(on: boolean): void {
    for (let n = 1; n <= HELLO_FLOORS; n++) this.lit[n] = on;
    this.apply();
  }

  private cascade(): void {
    this.setAll(false);
    for (let n = 1; n <= HELLO_FLOORS; n++) this.after(n * 140, () => { this.lit[n] = true; this.apply(); });
  }

  private anyLit(): boolean {
    return this.lit.some(Boolean);
  }

  private apply(): void {
    this.svg?.querySelectorAll<SVGGElement>('[data-floor]').forEach(g => {
      g.classList.toggle('on', !!this.lit[Number(g.dataset.floor)]);
    });
    const count = this.lit.filter(Boolean).length;
    this.update({ readout: `${count}/${HELLO_FLOORS} floors lit`, power: count > 0 });
  }
}
