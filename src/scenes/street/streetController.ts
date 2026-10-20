/* P3 Street: phố Thái Hà, ~100 m, both sides (FR-32). Q/E rotate (FR-20), X cutaway (FR-21),
   N day/night cascade (FR-23), T traffic (FR-35), W sends a pulse along a wire (FR-34), click a
   floor to light it. Motorbikes slide along their lanes from the clock, not frame counts; with
   reduced motion they stand still (NFR-09). React never re-renders per frame (NFR-14). */
import { kernel } from '@iso/kernel';
import { STREET, streetLayout } from '@core/layout';
import { VIEW_LABEL } from '@core/view';
import type { ViewK } from '@core/types';
import { floorIds } from '@render/house';
import { streetFrame } from '@render/props/street';
import { buildStreet } from '@render/street-scene';
import { composeScene } from '@render/scene';
import { SceneController, type SceneSnapshot } from '@scenes/controller';

const K0 = kernel(0, 0);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Bike { el: SVGGElement; a0: number; v: number; dir: number }

export class StreetController extends SceneController<SceneSnapshot> {
  private readonly lay = streetLayout(20261020);
  private k: ViewK = 0;
  private cut = true;
  private night = false;
  private traffic = true;
  private ids: string[] = [];
  private unit: [number, number] = [0, 0];
  private bikes: Bike[] = [];
  private readonly lit = new Set<string>();

  constructor() {
    super({ svg: '', viewBox: '0 0 4 3', readout: '', power: false });
    this.build();
  }

  protected override onAttach(svg: SVGSVGElement): void {
    this.bikes = [...svg.querySelectorAll<SVGGElement>('.bike')].map(el => ({
      el, a0: Number(el.dataset.a0), v: Number(el.dataset.v), dir: Number(el.dataset.dir),
    }));
    this.apply();
    const still = reducedMotion();
    this.placeBikes(still ? 0 : performance.now());
    if (!still) {
      this.loop(now => { if (this.traffic) this.placeBikes(now); });
      this.schedulePulse();
    }
  }

  override key(e: KeyboardEvent): boolean {
    switch (e.key.toLowerCase()) {
      case 'q': this.rotate(3); return true;
      case 'e': this.rotate(1); return true;
      case 'x': this.cut = !this.cut; this.build(); return true;
      case 'n': this.toggleNight(); return true;
      case 't': this.traffic = !this.traffic; this.apply(); return true;
      case 'w': this.firePulse(); return true;
    }
    return false;
  }

  override click(target: Element): void {
    const fl = target.closest<SVGGElement>('[data-floor]');
    if (!fl?.dataset.floor) return;
    const id = fl.dataset.floor;
    if (this.lit.has(id)) this.lit.delete(id); else this.lit.add(id);
    this.apply();
  }

  override demo(): void {
    if (!this.night) this.toggleNight();
  }

  private rotate(step: number): void {
    this.k = ((this.k + step) % 4) as ViewK;
    this.build();
  }

  private toggleNight(): void {
    this.night = !this.night;
    if (!this.night) { this.lit.clear(); this.apply(); return; }
    this.apply();
    // most homes light up, in a scattered order, over a few seconds
    const order = this.ids.filter(() => Math.random() < 0.72).sort(() => Math.random() - 0.5);
    order.forEach((id, i) => this.after(80 + i * 22, () => { if (this.night) { this.lit.add(id); this.apply(); } }));
  }

  private build(): void {
    const t = performance.now();
    const scene = buildStreet(K0, this.lay, this.k, this.cut);
    const composed = composeScene(scene.items, 0.03);
    if (composed.warnings.length) console.warn('[street] depth sort:', composed.warnings);
    this.ids = scene.specs.flatMap(s => floorIds(s.spec));
    const v = streetFrame(this.k).vec(1, 0, 0);
    this.unit = K0.D(v[0], v[1], v[2]);
    this.update({ svg: composed.svg, viewBox: composed.viewBox });
    this.apply();
    if (import.meta.env.DEV) console.debug(`[street] built view ${this.k} in ${(performance.now() - t).toFixed(0)} ms, ${scene.items.length} items`);
  }

  /** slide each bike to its position at time `now`, fading at the street's ends */
  private placeBikes(now: number): void {
    const L = STREET.length, [ux, uy] = this.unit;
    for (const b of this.bikes) {
      const a = (((b.a0 + b.dir * b.v * now / 1000) % L) + L) % L;
      const edge = Math.min(a, L - 18 - a);
      b.el.setAttribute('transform', `translate(${(ux * a).toFixed(2)} ${(uy * a).toFixed(2)})`);
      b.el.style.opacity = edge < 0 ? '0' : edge < 24 ? (edge / 24).toFixed(2) : '';
    }
  }

  private schedulePulse(): void {
    this.after((this.night ? 500 : 1300) + Math.random() * 1400, () => { this.firePulse(); this.schedulePulse(); });
  }

  private firePulse(): void {
    const ps = this.svg?.querySelectorAll<SVGPathElement>('.pulse');
    if (!ps?.length) return;
    const el = ps[Math.floor(Math.random() * ps.length)]!;
    el.classList.remove('go');
    void el.getBoundingClientRect();
    el.classList.add('go');
  }

  private apply(): void {
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll<SVGGElement>('[data-floor]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.floor!)));
      svg.querySelectorAll<SVGGElement>('[data-for]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.for!)));
      svg.querySelectorAll<SVGGElement>('[data-night]').forEach(el => el.classList.toggle('on', this.night));
      svg.querySelectorAll<SVGGElement>('.lane').forEach(el => el.classList.toggle('off', !this.traffic));
    }
    const parts = [`view ${VIEW_LABEL[this.k]}`, this.cut ? 'cutaway' : 'full', this.night ? 'night' : 'day', `${this.lit.size}/${this.ids.length} lit`, this.traffic ? `${this.lay.bikes.length} bikes` : 'no traffic'];
    this.update({ readout: parts.join(' · '), power: this.lit.size > 0 || this.night });
  }
}
