/* P1b Catalog: every preset on its own lot (FR-30). Q/E rotate the view (FR-20), ←/→ pick a lot,
   space lights the picked house, R swaps it for a random house, P restores its preset, N day/night,
   click a floor to light it or a lot to pick it. Lights survive rotation and rebuilds (ADR-013). */
import { kernel } from '@iso/kernel';
import { catalogCenter, catalogLots, placeInLot } from '@core/layout';
import { PRESETS, PRESET_IDS } from '@core/presets';
import { rng } from '@core/rng';
import { isPreset, randomHouse, resolveSpec } from '@core/spec';
import { rotateSpec, VIEW_LABEL } from '@core/view';
import type { HouseInput, HouseSpec, Item, ViewK } from '@core/types';
import { floorIds, renderHouse } from '@render/house';
import { renderLot } from '@render/props/lot';
import { composeScene } from '@render/scene';
import { SceneController, type SceneSnapshot } from '@scenes/controller';

const K0 = kernel(0, 0);

export class CatalogController extends SceneController<SceneSnapshot> {
  private inputs: HouseInput[] = PRESET_IDS.map((p, i) => ({ id: `lot${i}`, preset: p }));
  private specs: HouseSpec[] = [];
  private k: ViewK = 0;
  private sel = 0;
  private night = false;
  private rolls = 0;
  private readonly lit = new Set<string>();

  constructor() {
    super({ svg: '', viewBox: '0 0 4 3', readout: '', power: false });
    this.build();
  }

  protected override onAttach(): void {
    this.apply();
  }

  override key(e: KeyboardEvent): boolean {
    const k = e.key.toLowerCase();
    if (k === 'q') { this.rotate(3); return true; }
    if (k === 'e') { this.rotate(1); return true; }
    if (e.key === 'ArrowLeft') { this.select(this.sel - 1); return true; }
    if (e.key === 'ArrowRight') { this.select(this.sel + 1); return true; }
    if (k === ' ' || k === 'enter') { if (!e.repeat) this.toggleHouse(this.sel); return true; }
    if (k === 'r') { this.reroll(); return true; }
    if (k === 'p') { this.restore(); return true; }
    if (k === 'n') { this.toggleNight(); return true; }
    return false;
  }

  override click(target: Element): void {
    const fl = target.closest<SVGGElement>('[data-floor]');
    if (fl?.dataset.floor) {
      const id = fl.dataset.floor;
      this.set(id, !this.lit.has(id));
      const i = this.specs.findIndex(s => id.startsWith(`${s.id}/`));
      if (i >= 0) this.sel = i;
      this.apply();
      return;
    }
    const lot = target.closest<SVGGElement>('[data-lot]');
    if (lot?.dataset.lot) this.select(Number(lot.dataset.lot));
  }

  override demo(): void {
    if (!this.night) this.toggleNight();
  }

  // ---------- state changes ----------

  private rotate(step: number): void {
    this.k = ((this.k + step) % 4) as ViewK;
    this.build();
  }

  private select(i: number): void {
    this.sel = (i + this.specs.length) % this.specs.length;
    this.apply();
  }

  private toggleHouse(i: number): void {
    const ids = floorIds(this.specs[i]!), on = !ids.some(id => this.lit.has(id));
    ids.forEach(id => this.set(id, on));
    this.apply();
  }

  private reroll(): void {
    const r = rng(9973 * ++this.rolls + this.sel);
    this.inputs[this.sel] = randomHouse(r, `lot${this.sel}`);
    this.build();
  }

  private restore(): void {
    this.inputs[this.sel] = { id: `lot${this.sel}`, preset: PRESET_IDS[this.sel % PRESET_IDS.length] };
    this.build();
  }

  private toggleNight(): void {
    this.night = !this.night;
    if (!this.night) { this.lit.clear(); this.apply(); return; }
    this.apply();
    // each house lights ground first, upward; houses start a little apart
    this.specs.forEach((s, h) => floorIds(s).forEach((id, n) => {
      this.after(100 + h * 160 + n * 110, () => { if (this.night) { this.set(id, true); this.apply(); } });
    }));
  }

  private set(id: string, on: boolean): void {
    if (on) this.lit.add(id); else this.lit.delete(id);
  }

  // ---------- drawing ----------

  private build(): void {
    const lots = catalogLots(this.inputs.length), [cx, cy] = catalogCenter(lots.length);
    const items: Item[] = [];
    this.specs = this.inputs.map((input, i) => {
      const { spec, issues } = resolveSpec(input);
      for (const is of issues) if (is.level === 'error') console.error(`[catalog] ${input.id}: ${is.field} — ${is.message}`);
      const lot = rotateSpec(lots[i]!, this.k, cx, cy);
      const placed = placeInLot(lot, spec);
      items.push(...renderLot(K0, lot, i, this.label(placed)), ...renderHouse(K0, placed));
      return placed;
    });
    const scene = composeScene(items, 0.04);
    if (scene.warnings.length) console.warn('[catalog] depth sort:', scene.warnings);
    this.update({ svg: scene.svg, viewBox: scene.viewBox });
    this.apply();
  }

  private label(s: HouseSpec): string {
    const base = isPreset(s.preset) ? PRESETS[s.preset].label : 'Nhà';
    return this.inputs.find(x => x.id === s.id)?.seed !== undefined ? `${base} · ngẫu nhiên` : base;
  }

  private apply(): void {
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll<SVGGElement>('[data-floor]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.floor!)));
      svg.querySelectorAll<SVGGElement>('[data-for]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.for!)));
      svg.querySelectorAll<SVGGElement>('[data-night]').forEach(el => el.classList.toggle('on', this.night));
      svg.querySelectorAll<SVGGElement>('[data-lot]').forEach(el => el.classList.toggle('sel', Number(el.dataset.lot) === this.sel));
    }
    const total = this.specs.reduce((n, s) => n + floorIds(s).length, 0);
    const cur = this.specs[this.sel];
    this.update({
      readout: `view ${VIEW_LABEL[this.k]} · ${this.lit.size}/${total} lit · ${String(this.sel + 1).padStart(2, '0')} ${cur ? this.label(cur) : ''}`,
      power: this.lit.size > 0 || this.night,
    });
  }
}
