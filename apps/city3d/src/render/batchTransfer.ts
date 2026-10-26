/* A Batch as plain typed arrays, to cross the Web Worker boundary (structured clone with transfer) and be
   turned back into a Batch on the main thread. Pure; no DOM. */
import { Batch, type LampRange, type Surface } from './batch';

export interface BatchData {
  tris: [Surface, Float32Array][];
  shellPos: Float32Array;
  shellNrm: Float32Array;
  creases: Float32Array;
  details: Float32Array;
  win: Float32Array;
  lamps: [string, LampRange[]][];
  lampLines: [string, LampRange[]][];
  owners: { surface: Surface; start: number; end: number; owner: string }[];
}

const f32 = (a: readonly number[]) => Float32Array.from(a);

export function packBatch(B: Batch): { data: BatchData; transfer: ArrayBuffer[] } {
  const data: BatchData = {
    tris: [...B.tris].filter(([, l]) => l.length).map(([s, l]) => [s, f32(l)]),
    shellPos: f32(B.shell.pos), shellNrm: f32(B.shell.nrm),
    creases: f32(B.creases), details: f32(B.details), win: f32(B.win),
    lamps: [...B.lamps], lampLines: [...B.lampLines], owners: B.owners,
  };
  const transfer = [...data.tris.map(([, a]) => a.buffer), data.shellPos.buffer, data.shellNrm.buffer, data.creases.buffer, data.details.buffer, data.win.buffer] as ArrayBuffer[];
  return { data, transfer };
}

/** The arrays stay typed (`layerOf` only reads their length and hands them to three.js, which accepts both), so
    no per-number copy is made; the casts are the price of Batch declaring `number[]`. */
export function unpackBatch(d: BatchData): Batch {
  const B = new Batch();
  for (const [s, a] of d.tris) B.tris.set(s, a as unknown as number[]);
  (B.shell as { pos: unknown }).pos = d.shellPos;
  (B.shell as { nrm: unknown }).nrm = d.shellNrm;
  for (const [k, v] of [['creases', d.creases], ['details', d.details], ['win', d.win]] as const) (B as unknown as Record<string, unknown>)[k] = v;
  for (const [k, v] of d.lamps) B.lamps.set(k, v);
  for (const [k, v] of d.lampLines) B.lampLines.set(k, v);
  B.owners.push(...d.owners);
  return B;
}
