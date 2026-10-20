import { describe, expect, it } from 'vitest';
import { WorkshopController } from '@scenes/workshop/workshopController';

describe('workshop controller', () => {
  it('starts from the reference preset and draws it', () => {
    const c = new WorkshopController(), s = c.getSnapshot();
    expect(s.input.preset).toBe('nha-mau');
    expect(s.spec.shopName).toBe('CÀ PHÊ');
    expect(s.svg).toContain('data-floor="xuong/1"');
    expect(s.svg).not.toMatch(/NaN|undefined/);
  });

  it('overrides a field and removes the override again', () => {
    const c = new WorkshopController();
    c.patch({ floors: 6 });
    expect(c.getSnapshot().spec.floors).toBe(6);
    expect(c.getSnapshot().spec.upper).toHaveLength(6);
    c.patch({ floors: undefined });
    expect(c.getSnapshot().spec.floors).toBe(3);
    expect('floors' in c.getSnapshot().input).toBe(false);
  });

  it('edits one floor without changing the others', () => {
    const c = new WorkshopController(), before = c.getSnapshot().spec.upper;
    c.patchFloor(1, { balcony: 'rail', window: 'pair' });
    const after = c.getSnapshot().spec.upper;
    expect(after[1]).toMatchObject({ balcony: 'rail', window: 'pair' });
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
  });

  it('builds a wide house with a basement garage and steps', () => {
    const c = new WorkshopController();
    c.patch({ w: 110, basement: 14 });
    const s = c.getSnapshot();
    expect(s.spec.w).toBe(110);
    expect(s.svg).toMatch(/<g class="fl" data-floor="xuong\/1">/);
    expect(s.issues.filter(i => i.level === 'error')).toEqual([]);
  });

  it('reports what it had to fix', () => {
    const c = new WorkshopController();
    c.patch({ roof: 'metal2' });   // the preset has a roof room, a tank, a solar heater
    const fields = c.getSnapshot().issues.map(i => i.field);
    expect(fields).toContain('topRoom');
    expect(fields).toContain('roofItems');
  });

  it('draws every new option', () => {
    const c = new WorkshopController();
    c.setPreset('');
    c.patch({ wall: 'tile', goods: 'bikes', ground: 'iron', awning: 'metal', stairHut: true, roofItems: ['tank-h', 'ac', 'flag'], sideAd: 'SƠN NƯỚC|0903', sideWindows: true, w: 70 });
    c.patchFloor(0, { window: 'arch', balcony: 'solid', canopy: 'concrete', laundry: true });
    c.patchFloor(1, { window: 'french', canopy: 'metal' });
    c.patchFloor(2, { window: 'glass' });
    const { svg, issues } = c.getSnapshot();
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
    for (const mark of ['class="finish"', 'class="face cloth"', 'class="face flag"', 'class="ad-paint"', 'class="wheel"', 'A7.00 7.00']) expect(svg).toContain(mark);
    expect(svg).not.toMatch(/NaN|undefined/);
    c.patch({ roof: 'tile' });
    expect(c.getSnapshot().issues.map(i => i.field)).toContain('stairHut');
    c.patch({ roof: 'metal1' });
    expect(c.getSnapshot().svg).not.toMatch(/NaN|undefined/);
  });

  it('switches preset and makes random houses', () => {
    const c = new WorkshopController();
    c.setPreset('cap4-metal');
    expect(c.getSnapshot().spec.floors).toBe(0);
    c.setPreset('');
    expect(c.getSnapshot().input).toEqual({ id: 'xuong' });
    c.random();
    expect(c.getSnapshot().input.seed).toBeDefined();
    expect(c.getSnapshot().svg).not.toMatch(/NaN|undefined/);
  });
});
