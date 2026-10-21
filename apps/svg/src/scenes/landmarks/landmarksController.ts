/* "Công trình": the hand-drawn structures one at a time (user request 2026-10-21), unlike the
   workshop's general house. ←/→ pick, Q/E rotate, N day/night, space lights every floor, click a
   floor to light it. The flyover page runs the crossroads' traffic and lights (T stops them);
   vehicles wrap inside the cut-out and fade at its ends. */
import { kernel } from '@iso/kernel';
import { LANDMARKS, type Landmark } from '@core/landmarks';
import { VIEW_LABEL } from '@core/view';
import type { ViewK } from '@core/types';
import { junctionWindow, renderLandmark, sharedCrossroads } from '@render/landmarks/showcase';
import { composeScene } from '@render/scene';
import { SceneController, type SceneSnapshot } from '@scenes/controller';
import { TrafficDriver } from '@scenes/crossroads/trafficDriver';

const K0 = kernel(0, 0);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface LandmarksSnapshot extends SceneSnapshot {
  sel: number;
  landmark: Landmark;
  night: boolean;
  floors: number;
  lit: number;
  view: string;
}

export class LandmarksController extends SceneController<LandmarksSnapshot> {
  private sel = 0;
  private k: ViewK = 0;
  private night = false;
  private traffic = true;
  private driver: TrafficDriver | null = null;
  private last = 0;
  private floors: string[] = [];
  private readonly lit = new Set<string>();

  constructor() {
    super({ svg: '', viewBox: '0 0 4 3', readout: '', power: false, sel: 0, landmark: LANDMARKS[0]!, night: false, floors: 0, lit: 0, view: VIEW_LABEL[0] });
    this.build();
  }

  protected override onAttach(svg: SVGSVGElement): void {
    if (LANDMARKS[this.sel]!.kind === 'flyover') {
      const cr = sharedCrossroads();
      this.driver ??= new TrafficDriver(cr, junctionWindow(cr));
      this.driver.bind(svg, this.k);
      if (!reducedMotion()) {
        this.last = performance.now();
        this.loop(now => {
          const dt = Math.min(0.1, (now - this.last) / 1000);
          this.last = now;
          if (this.traffic && this.driver!.tick(dt)) this.apply();
        });
      }
    }
    this.apply();
  }

  override key(e: KeyboardEvent): boolean {
    const k = e.key.toLowerCase();
    if (k === 'q') { this.rotate(3); return true; }
    if (k === 'e') { this.rotate(1); return true; }
    if (e.key === 'ArrowLeft') { this.select(this.sel - 1); return true; }
    if (e.key === 'ArrowRight') { this.select(this.sel + 1); return true; }
    if (k === ' ' || k === 'enter') { if (!e.repeat) this.toggleAll(); return true; }
    if (k === 'n') { this.toggleNight(); return true; }
    if (k === 't' && this.driver) { this.traffic = !this.traffic; this.apply(); return true; }
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

  select(i: number): void {
    this.sel = ((i % LANDMARKS.length) + LANDMARKS.length) % LANDMARKS.length;
    this.lit.clear();
    this.driver = null;
    this.build();
  }

  rotate(step: number): void {
    this.k = ((this.k + step) % 4) as ViewK;
    this.build();
  }

  toggleAll(): void {
    const all = this.floors.length > 0 && this.floors.every(id => this.lit.has(id));
    if (all) this.lit.clear(); else this.floors.forEach(id => this.lit.add(id));
    this.apply();
  }

  toggleNight(): void {
    this.night = !this.night;
    if (!this.night) { this.lit.clear(); this.apply(); return; }
    this.apply();
    // floors light up from the bottom, a few skipped, like an evening
    this.floors.filter((_, i) => (i * 7) % 10 < 7).forEach((id, i) => this.after(60 + i * 40, () => { if (this.night) { this.lit.add(id); this.apply(); } }));
  }

  private build(): void {
    const lm = LANDMARKS[this.sel]!;
    const sc = renderLandmark(K0, lm, this.k);
    const composed = composeScene(sc.items, 0.06);
    if (composed.warnings.length) console.warn('[landmarks] depth sort:', composed.warnings);
    this.floors = sc.floors;
    this.update({ svg: composed.svg, viewBox: composed.viewBox });
    this.apply();
  }

  private apply(): void {
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll<SVGGElement>('[data-floor]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.floor!)));
      svg.querySelectorAll<SVGGElement>('[data-night]').forEach(el => el.classList.toggle('on', this.night));
      svg.querySelectorAll<SVGGElement>('.traffic-lane, .traffic-fly, .traffic-cell').forEach(el => el.classList.toggle('off', !this.traffic));
    }
    const lm = LANDMARKS[this.sel]!;
    const parts = [`${this.sel + 1}/${LANDMARKS.length} ${lm.id}`, `view ${VIEW_LABEL[this.k]}`, this.night ? 'night' : 'day'];
    if (this.floors.length) parts.push(`${this.lit.size}/${this.floors.length} lit`);
    if (lm.kind === 'flyover' && this.driver) {
      const g = this.driver.signals, light = (l: string) => (l === 'go' ? 'xanh' : l === 'wait' ? 'vàng' : 'đỏ');
      parts.push(this.traffic ? `${this.driver.count} xe · Tây Sơn ${light(g.x)} ${g.xLeft}s · Thái Hà ${light(g.y)} ${g.yLeft}s` : 'no traffic');
    }
    this.update({
      readout: parts.join(' · '), power: this.lit.size > 0 || this.night,
      sel: this.sel, landmark: lm, night: this.night, floors: this.floors.length, lit: this.lit.size, view: VIEW_LABEL[this.k],
    });
  }
}
