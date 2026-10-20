// Checks the TypeScript port against the original kernel in the iso-glow skill's gallery.html (R8).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { esc, kernel, slits } from '@iso/kernel';
import { frame } from '@iso/frame';
import type { Vec3 } from '@iso/kernel';

type Original = {
  kernel: (ox: number, oy: number) => Record<string, (...a: never[]) => unknown>;
  frame: (pts: Vec3[], m?: number, a?: number) => Record<string, unknown> & { viewBox: string };
  slits: (...a: unknown[]) => string;
  esc: (s: unknown) => string;
};

function loadOriginal(): Original {
  const html = readFileSync(fileURLToPath(new URL('../../.claude/skills/iso-glow/assets/gallery.html', import.meta.url)), 'utf8');
  const start = html.indexOf('const ISO = (() => {');
  const end = html.indexOf('})();', start);
  if (start < 0 || end < 0) throw new Error('ISO kernel not found in gallery.html');
  return new Function(`${html.slice(start, end + 5)}; return ISO;`)() as Original;
}

const ORIG = loadOriginal();
const call = (k: Record<string, (...a: never[]) => unknown>, name: string, ...args: unknown[]) =>
  (k[name] as (...a: unknown[]) => unknown)(...args);

describe('iso kernel port', () => {
  const ours = kernel(123.4, 56.7);
  const theirs = ORIG.kernel(123.4, 56.7);

  it('projects points and directions identically', () => {
    for (const p of [[0, 0, 0], [10, 0, 0], [0, 10, 0], [3, 7, 11], [-40, 25, 9.5]] as Vec3[]) {
      expect(ours.P(...p)).toEqual(call(theirs, 'P', ...p));
      expect(ours.D(...p)).toEqual(call(theirs, 'D', ...p));
    }
  });

  it('builds the same plane transforms', () => {
    for (const name of ['TOP', 'FRONT', 'SIDE'] as const)
      expect(ours[name](12, 34, 56)).toBe(call(theirs, name, 12, 34, 56));
  });

  it('draws the same boxes, flat and rounded', () => {
    const cases: [number, number, number, number, number, number, number][] = [
      [0, 0, 0, 200, 160, 8, 0], [0, 0, 0, 200, 160, 8, 12], [70, 50, 8, 60, 60, 90, 6], [5, 5, 5, 4, 4, 4, 9],
    ];
    for (const c of cases) {
      expect(ours.box(...c)).toBe(call(theirs, 'box', ...c));
      expect(ours.boxc(...c, 'lit')).toBe(call(theirs, 'boxc', ...c, 'lit'));
    }
  });

  it('draws the same rects and paths', () => {
    expect(ours.rect(ours.FRONT(1, 2, 3), 10, 4, 2, 'detail')).toBe(call(theirs, 'rect', call(theirs, 'FRONT', 1, 2, 3), 10, 4, 2, 'detail'));
    const pts: Vec3[] = [[0, 0, 0], [10, 0, 5], [10, 20, 5]];
    expect(ours.path(pts)).toBe(call(theirs, 'path', pts));
  });

  it('frames scenes identically', () => {
    const pts: Vec3[] = [[0, 180, 0], [210, 0, 7], [210, 180, 0], [0, 0, 7], [104, 72, 340]];
    const a = frame(pts, 0.06), b = ORIG.frame(pts, 0.06);
    expect(a.viewBox).toBe(b.viewBox);
    expect(a.W).toBe(b.W);
    expect(a.P(10, 20, 30)).toEqual((b.P as (...n: number[]) => unknown)(10, 20, 30));
  });

  it('matches slits and esc', () => {
    expect(slits(2, 20, 3, 0, 9)).toBe(ORIG.slits(2, 20, 3, 0, 9));
    expect(slits(1, 5, 1.8, 3, 40, false, 'x')).toBe(ORIG.slits(1, 5, 1.8, 3, 40, false, 'x'));
    expect(esc('<PHỞ & CƠM>')).toBe(ORIG.esc('<PHỞ & CƠM>'));
  });
});
