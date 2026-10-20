/* Xưởng nhà (house workshop, FR-31): one house on a lot, every spec field editable from the panel.
   The panel writes a HouseInput through patch()/patchFloor()/setPreset(); the controller resolves
   it, redraws, and publishes input + resolved spec + issues in its snapshot for the panel to read.
   Q/E rotate, space lights the house, N day/night, R random house; click a floor to light it. */
import { kernel } from '@iso/kernel';
import { catalogCenter, catalogLots, placeInLot } from '@core/layout';
import { PRESETS, type PresetId } from '@core/presets';
import { rng } from '@core/rng';
import { isPreset, randomHouse, resolveSpec } from '@core/spec';
import { rotateSpec, VIEW_LABEL } from '@core/view';
import type { FloorSpec, HouseInput, HouseSpec, Issue, ViewK } from '@core/types';
import { floorIds, renderHouse } from '@render/house';
import { renderLot } from '@render/props/lot';
import { composeScene } from '@render/scene';
import { SceneController, type SceneSnapshot } from '@scenes/controller';

const K0 = kernel(0, 0);
const ID = 'xuong';

export interface WorkshopSnapshot extends SceneSnapshot {
  input: HouseInput;
  spec: HouseSpec;
  issues: Issue[];
  view: ViewK;
}

export class WorkshopController extends SceneController<WorkshopSnapshot> {
  private input: HouseInput = { id: ID, preset: 'nha-mau' };
  private k: ViewK = 0;
  private night = false;
  private rolls = 0;
  private readonly lit = new Set<string>();

  constructor() {
    const { spec, issues } = resolveSpec({ id: ID, preset: 'nha-mau' });
    super({ svg: '', viewBox: '0 0 4 3', readout: '', power: false, input: { id: ID, preset: 'nha-mau' }, spec, issues, view: 0 });
    this.build();
  }

  // ---------- edits from the panel ----------

  /** set top-level fields; undefined removes an override so the preset's value shows through */
  patch(p: Partial<HouseInput>): void {
    const next: HouseInput = { ...this.input };
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) delete (next as Record<string, unknown>)[k];
      else (next as Record<string, unknown>)[k] = v;
    }
    this.input = next;
    this.build();
  }

  /** edit one upper floor; the current resolved floors become explicit so the others stay as they look */
  patchFloor(i: number, p: Partial<FloorSpec>): void {
    const upper = this.getSnapshot().spec.upper.map((fl, j) => (j === i ? { ...fl, ...p } : fl));
    this.input = { ...this.input, upper };
    this.build();
  }

  /** start over from a preset ('' = no preset: defaults only) */
  setPreset(id: PresetId | ''): void {
    this.input = id ? { id: ID, preset: id } : { id: ID };
    this.build();
  }

  random(): void {
    this.input = randomHouse(rng(7919 * ++this.rolls), ID);
    this.build();
  }

  // ---------- input ----------

  protected override onAttach(): void {
    this.apply();
  }

  override key(e: KeyboardEvent): boolean {
    switch (e.key.toLowerCase()) {
      case 'q': this.k = ((this.k + 3) % 4) as ViewK; this.build(); return true;
      case 'e': this.k = ((this.k + 1) % 4) as ViewK; this.build(); return true;
      case ' ': case 'enter': {
        if (e.repeat) return true;
        const ids = floorIds(this.getSnapshot().spec), on = !ids.some(id => this.lit.has(id));
        ids.forEach(id => (on ? this.lit.add(id) : this.lit.delete(id)));
        this.apply();
        return true;
      }
      case 'n': this.night = !this.night; this.apply(); return true;
      case 'r': this.random(); return true;
    }
    return false;
  }

  override click(target: Element): void {
    const id = target.closest<SVGGElement>('[data-floor]')?.dataset.floor;
    if (!id) return;
    if (this.lit.has(id)) this.lit.delete(id); else this.lit.add(id);
    this.apply();
  }

  override demo(): void {
    this.night = true;
    floorIds(this.getSnapshot().spec).forEach(id => this.lit.add(id));
    this.apply();
  }

  // ---------- drawing ----------

  private build(): void {
    const { spec, issues } = resolveSpec(this.input);
    const [lot0] = catalogLots([spec.w]), [cx, cy] = catalogCenter([lot0!]);
    const lot = rotateSpec(lot0!, this.k, cx, cy);
    const placed = placeInLot(lot, spec);
    const label = isPreset(this.input.preset) ? PRESETS[this.input.preset].label : 'Nhà tự chỉnh';
    const scene = composeScene([...renderLot(K0, lot, 0, label), ...renderHouse(K0, placed)], 0.06);
    // lights only for floors that still exist
    const ids = new Set(floorIds(spec));
    for (const id of [...this.lit]) if (!ids.has(id)) this.lit.delete(id);
    this.update({ svg: scene.svg, viewBox: scene.viewBox, input: this.input, spec, issues, view: this.k });
    this.apply();
  }

  private apply(): void {
    const svg = this.svg;
    if (svg) {
      svg.querySelectorAll<SVGGElement>('[data-floor]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.floor!)));
      svg.querySelectorAll<SVGGElement>('[data-for]').forEach(el => el.classList.toggle('on', this.lit.has(el.dataset.for!)));
      svg.querySelectorAll<SVGGElement>('[data-night]').forEach(el => el.classList.toggle('on', this.night));
      svg.querySelectorAll<SVGGElement>('[data-lot]').forEach(el => el.classList.add('sel'));
    }
    const { spec, issues } = this.getSnapshot();
    const warn = issues.length ? ` · ${issues.length} ⚠` : '';
    this.update({
      readout: `view ${VIEW_LABEL[this.k]} · ${(spec.w / 10).toFixed(1)} × ${(spec.d / 10).toFixed(1)} m · ${spec.floors + 1} tầng · ${this.lit.size} lit${warn}`,
      power: this.lit.size > 0 || this.night,
    });
  }
}
