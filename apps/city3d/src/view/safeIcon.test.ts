import { describe, expect, it } from 'vitest';
import { safeIconSvg } from './safeIcon';

const ok = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 6-8 12-8 12"/><circle cx="12" cy="10" r="3"/></svg>';

describe('safeIconSvg', () => {
  it('keeps a plain inline svg icon', () => {
    expect(safeIconSvg(ok)).toBe(ok);
    expect(safeIconSvg('<svg><g><path d="M0 0"/></g></svg>')).toContain('<g>');
  });
  it('drops scripts, handlers, links, styles and foreign tags', () => {
    expect(safeIconSvg('<svg><script>alert(1)</script></svg>')).toBe('');
    expect(safeIconSvg('<svg onload="alert(1)"></svg>')).toBe('');
    expect(safeIconSvg('<svg><path d="M0 0" onclick="x()"/></svg>')).toBe('');
    expect(safeIconSvg('<svg><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>')).toBe('');
    expect(safeIconSvg('<svg><use href="#x"/></svg>')).toBe('');
    expect(safeIconSvg('<svg style="x"></svg>')).toBe('');
    expect(safeIconSvg('<img src=x onerror=alert(1)>')).toBe('');
    expect(safeIconSvg('<svg></svg><img src=x>')).toBe('');
    expect(safeIconSvg('<svg><path d="M0 0"/>text</svg>')).toBe('');
  });
  it('drops unbalanced markup', () => {
    expect(safeIconSvg('<svg><path d="M0 0">')).toBe('');
    expect(safeIconSvg('<svg></svg></svg>')).toBe('');
  });
});
