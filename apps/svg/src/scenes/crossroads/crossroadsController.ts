/* P4 Crossroads: Thái Hà – Tây Sơn – Chùa Bộc (FR-33, FR-35, FR-36). Q/E rotate (FR-20),
   X cutaway (FR-21), N day/night cascade (FR-23), T traffic (FR-35), W a pulse along a wire,
   click a floor (houses and both towers) to light it.

   Traffic and lights run in TrafficDriver (core/traffic.ts underneath): vehicles queue at the stop
   line on red and go on green; flyover cars never stop. With reduced motion nothing moves
   (NFR-09). React never re-renders per frame. */
import { kernel } from '@iso/kernel';
import { crossroadsLayout, type Crossroads } from '@core/crossroads';
import { VIEW_LABEL } from '@core/view';
import type { ViewK } from '@core/types';
import { floorIds } from '@render/house';
import { buildCrossroads } from '@render/crossroads-scene';
import { composeScene } from '@render/scene';
import { SceneController, type SceneSnapshot } from '@scenes/controller';
import { TrafficDriver } from '@scenes/crossroads/trafficDriver';

const K0 = kernel(0, 0);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class CrossroadsController extends SceneController<SceneSnapshot> {
  private readonly cr: Crossroads = crossroadsLayout(20261021);
  private readonly driver = new TrafficDriver(this.cr, { x: [0, this.cr.x.lay.length], y: [0, this.cr.y.lay.length] });
  private k: ViewK = 0;
  private cut = true;
  private night = false;
  private traffic = true;
  private ids: string[] = [];
  private last = 0;
  private readonly lit = new Set<string>();

  constructor() {
    super({ svg: '', viewBox: '0 0 4 3', readout: '', power: false });
    this.build();
  }

  protected override onAttach(svg: SVGSVGElement): void {
    this.driver.bind(svg, this.k);
    this.apply();
    if (!reducedMotion()) {
      this.last = performance.now();
      this.loop(now => {
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        if (this.traffic && this.driver.tick(dt)) this.readout();
      });
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
    const order = this.ids.filter(() => Math.random() < 0.72).sort(() => Math.random() - 0.5);
    order.forEach((id, i) => this.after(80 + i * 12, () => { if (this.night) { this.lit.add(id); this.apply(); } }));
  }

  /** rebuild the drawing; the traffic model keeps going where it was (onAttach re-binds it) */
  private build(): void {
    const t = performance.now();
    const scene = buildCrossroads(K0, this.cr, this.k, this.cut);
    // the drawing places vehicles at their layout start; the model's positions follow on attach
    const composed = composeScene(scene.items, 0.03);
    if (composed.warnings.length) console.warn('[crossroads] depth sort:', composed.warnings);
    this.ids = [...scene.specs.flatMap(s => floorIds(s.spec)), ...scene.towerFloors];
    this.update({ svg: composed.svg, viewBox: composed.viewBox });
    this.apply();
    if (import.meta.env.DEV) console.debug(`[crossroads] built view ${this.k} in ${(performance.now() - t).toFixed(0)} ms, ${scene.items.length} items`);
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
      svg.querySelectorAll<SVGGElement>('.traffic-lane, .traffic-fly, .traffic-cell').forEach(el => el.classList.toggle('off', !this.traffic));
    }
    this.readout();
  }

  private readout(): void {
    const s = this.driver.signals;
    const light = (l: string) => (l === 'go' ? 'xanh' : l === 'wait' ? 'vàng' : 'đỏ');
    const parts = [`view ${VIEW_LABEL[this.k]}`, this.cut ? 'cutaway' : 'full', this.night ? 'night' : 'day', `${this.lit.size}/${this.ids.length} lit`,
      this.traffic ? `${this.driver.count} xe · Tây Sơn ${light(s.x)} ${s.xLeft}s · Thái Hà ${light(s.y)} ${s.yLeft}s` : 'no traffic'];
    this.update({ readout: parts.join(' · '), power: this.lit.size > 0 || this.night });
  }
}
