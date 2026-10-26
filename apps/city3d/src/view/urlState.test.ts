import { describe, expect, it } from 'vitest';
import { formatUrlState, parseUrlState } from './urlState';

const loc = (url: string) => {
  const u = new URL(url, 'https://example.test');
  return { pathname: u.pathname, search: u.search, hash: u.hash };
};

describe('URL state', () => {
  it('round-trips position, zoom, heading, tilt, mode and options', () => {
    const url = formatUrlState({ x: 120.5, z: -340.2, zoom: 2, heading: 30, tilt: 50, mode: '3d', night: true, seeThrough: false, place: 'b:w123' });
    const p = parseUrlState(loc(url))!;
    expect(p.x).toBeCloseTo(120.5, 0);
    expect(p.z).toBeCloseTo(-340.2, 0);
    expect(p.zoom).toBeCloseTo(2, 2);
    expect(p.heading).toBeCloseTo(30, 1);
    expect(p.tilt).toBeCloseTo(50, 1);
    expect(p).toMatchObject({ mode: '3d', night: true, seeThrough: false, place: 'b:w123' });
  });

  it('does not throw on a malformed link (a stray %), and still reads what it can', () => {
    expect(() => parseUrlState(loc('/@21.0092471,105.8243958,%E0%A4%A,2d'))).not.toThrow();
    const p = parseUrlState({ pathname: '/@21.0092471,105.8243958,%,2d', search: '?theme=night', hash: '' });
    expect(p?.night).toBe(true);
  });

  it('ignores impossible coordinates and unknown option values', () => {
    const p = parseUrlState(loc('/@123,500,200m?labels=nope&info=nope'));
    expect(p?.x).toBeUndefined();
    expect(p?.streetLabels).toBeUndefined();
    expect(p?.placeInfo).toBeUndefined();
  });
});
