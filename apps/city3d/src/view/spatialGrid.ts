/* A uniform grid over the ground plane (x, z in metres), so that what runs every frame touches only what is
   around the view instead of every tile of the city (rule A32, CS-09). An item is filed in every cell its
   bounding box (centre ± radius) overlaps; a query returns every item whose box meets the query box, i.e. a
   superset of what is within reach, which the caller then tests exactly. Filing an item again (after its
   radius grew) is harmless: queries collect into a Set. */

export class SpatialGrid<T> {
  private readonly cells = new Map<string, T[]>();
  private count = 0;

  constructor(readonly cell: number) {}

  get size(): number { return this.count; }

  insert(item: T, x: number, z: number, radius: number): void {
    const s = this.cell;
    const i0 = Math.floor((x - radius) / s), i1 = Math.floor((x + radius) / s);
    const j0 = Math.floor((z - radius) / s), j1 = Math.floor((z + radius) / s);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = `${i},${j}`, list = this.cells.get(k);
        if (list) list.push(item); else this.cells.set(k, [item]);
      }
    }
    this.count++;
  }

  /** every item whose box meets the square (x ± r, z ± r), added to `out` */
  query(x: number, z: number, r: number, out: Set<T> = new Set()): Set<T> {
    const s = this.cell;
    const i0 = Math.floor((x - r) / s), i1 = Math.floor((x + r) / s);
    const j0 = Math.floor((z - r) / s), j1 = Math.floor((z + r) / s);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const list = this.cells.get(`${i},${j}`);
        if (list) for (const it of list) out.add(it);
      }
    }
    return out;
  }

  clear(): void { this.cells.clear(); this.count = 0; }
}
