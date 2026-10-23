import { describe, expect, it } from 'vitest';
import { loadCity, loadCityAsync } from '@my-city/osm-import';
import { tilesOf } from '@render/city';
import { isHouseLamp, windowRank, windowShade } from '@render/lights';
import { DEFAULT_AREA_ID, SEE_THROUGH } from './constants';
import { setGlobalLocale, t } from './i18n';
import { lightOn } from './lights';
import { buildPlaceCatalog, selectVisiblePlaceLabels } from './placeInfo';
import { detailFor, farness, lowerLevel, quality, withOption } from './quality';
import { CityEventBus } from './sdk';
import { buildBuildingBoundsIndex, computeForegroundCut } from './seeThrough';
import { buildStreetCatalog, selectVisibleStreetLabels } from './streetLabels';
import { formatUrlState, parseUrlState } from './urlState';

describe('quality', () => {
  it('starts with 30 % traffic', () => {
    expect(quality('high').traffic).toBe(0.3);
    expect(quality('medium').traffic).toBe(0.3);
  });

  it('goes back to a named level when the options match it again', () => {
    const q = withOption(quality('high'), { bloom: false });
    expect(q.level).toBe('custom');
    expect(withOption(q, { bloom: true }).level).toBe('high');
  });

  it('lowers the detail when zoomed out, up to the chosen most', () => {
    const q = quality('high');
    expect(detailFor(1.5, q)).toBe(0);   // very far out: pure building blocks (no windows)
    expect(detailFor(3.6, q)).toBe(1);   // the user's screenshot, 2026-10-21: blocks and windows only
    expect(detailFor(6, q)).toBe(2);
    expect(detailFor(10, q)).toBe(3);
    expect(detailFor(10, quality('medium'))).toBe(2);
    expect(detailFor(0.5, quality('ultra'))).toBe(3);   // no automatic lowering
  });
});

describe('stepping down by itself', () => {
  it('goes one level down at a time and stops at low', () => {
    expect(lowerLevel(quality('high'))!.level).toBe('medium');
    expect(lowerLevel(quality('medium'))!.level).toBe('low');
    expect(lowerLevel(quality('low'))).toBeNull();
  });
});

describe('lived-in windows', () => {
  it('lights a floor unevenly, the same way every time, and street lamps evenly', () => {
    const shades = Array.from({ length: 400 }, (_, k) => windowShade('w1/3', k));
    const n = (s: string) => shades.filter(x => x === s).length;
    expect(n('off')).toBeGreaterThan(10); expect(n('dim')).toBeGreaterThan(40); expect(n('hi')).toBeGreaterThan(40); expect(n('on')).toBeGreaterThan(150);
    expect(windowShade('w1/3', 7)).toBe(windowShade('w1/3', 7));
    expect(new Set(Array.from({ length: 50 }, (_, k) => windowShade('street/lamps', k)))).toEqual(new Set(['on']));
  });
});

describe('light settings', () => {
  it('lights a share of the windows evenly over every building, adding windows as it grows', () => {
    const lit = (lamp: string, n: number, share: number) => Array.from({ length: n }, (_, k) => windowRank(lamp, k) < share).filter(Boolean).length;
    // two buildings, 400 windows each: both near 20 %, and the 20 % set grows into the 50 % set
    for (const b of ['novotel/5', 'viet-tower/5']) {
      expect(lit(b, 400, 0.2)).toBeGreaterThan(55); expect(lit(b, 400, 0.2)).toBeLessThan(105);
      for (let k = 0; k < 400; k++) if (windowRank(b, k) < 0.2) expect(windowRank(b, k) < 0.5).toBe(true);
    }
    expect([lightOn('auto', true), lightOn('auto', false), lightOn('on', false), lightOn('off', true)]).toEqual([true, false, true, false]);
    expect(isHouseLamp('street/lamps') || isHouseLamp('signal/x/go')).toBe(false);
  });
});

describe('zoomed out', () => {
  it('fades from 8 px a metre down to 2.5, and not at all without automatic detail', () => {
    expect(farness(9, quality('high'))).toBe(0);
    expect(farness(2, quality('high'))).toBe(1);
    expect(farness(5.25, quality('high'))).toBeCloseTo(0.5, 6);
    expect(farness(3.6, quality('high'))).toBeGreaterThan(0.75);
    expect(farness(1, quality('ultra'))).toBe(0);
  });
});

describe('street labels (pin callout & map modes)', () => {
  it('filters by zoom level, keeps callout pins sparse, and aligns map labels along streets', () => {
    const { city } = loadCity(DEFAULT_AREA_ID);
    const catalog = buildStreetCatalog(city);
    expect(catalog.some(e => e.name === 'Phố Thái Hà' && e.shortName === 'Thái Hà')).toBe(true);

    const project = ([x, y]: [number, number, number]) => ({ x: 600 + x * 0.6, y: 450 + y * 0.6, visible: true });
    expect(selectVisibleStreetLabels(catalog, 'off', 4, 1200, 900, [0, 0], project)).toEqual([]);

    const pinsFar = selectVisibleStreetLabels(catalog, 'pin', 1.0, 1200, 900, [0, 0], project);
    expect(pinsFar.length).toBeGreaterThan(0);
    expect(pinsFar.length).toBeLessThanOrEqual(7);
    expect(pinsFar.every(p => p.tier === 1 && p.stemHeightPx > 0 && (p.info.includes('làn') || p.info.includes('km') || p.info.includes('m')))).toBe(true);

    const pinsNear = selectVisibleStreetLabels(catalog, 'pin', 7.0, 1200, 900, [0, 0], project);
    expect(pinsNear.length).toBeGreaterThan(pinsFar.length);

    const mapLabels = selectVisibleStreetLabels(catalog, 'map', 4.0, 1200, 900, [0, 0], project);
    expect(mapLabels.length).toBeGreaterThan(0);
    expect(mapLabels.every(l => l.angleDeg >= -90 && l.angleDeg <= 90)).toBe(true);
  });
});

describe('place info catalog & labels (off, popup, label modes)', () => {
  it('indexes buildings, parks, lakes, monuments, heritage sites, and stations with names, addresses, and metrics', () => {
    const { city } = loadCity(DEFAULT_AREA_ID);
    const catalog = buildPlaceCatalog(city, new Set(['bldg:w677190114', 'bldg:w1115247053']));

    const vpbank = catalog.byId.get('w677190114');
    expect(vpbank?.name).toContain('VPBank');
    expect(vpbank?.address).toContain('89');
    expect(vpbank?.metrics.length).toBeGreaterThanOrEqual(3);

    const hasPark = catalog.labels.some(e => e.category === 'park' && (e.name.includes('Gò Đống Đa') || e.name.includes('Indira Gandhi')));
    const hasLake = catalog.labels.some(e => e.category === 'water' && e.name.includes('Hoàng Cầu'));
    const hasMonument = catalog.labels.some(e => e.category === 'monument' && e.name.includes('Tượng đài Quang Trung'));
    const hasHeritage = catalog.labels.some(e => e.category === 'heritage' && (e.name.includes('Đàn Xã Tắc') || e.name.includes('Chùa')));
    expect(hasPark).toBe(true);
    expect(hasLake).toBe(true);
    expect(hasMonument).toBe(true);
    expect(hasHeritage).toBe(true);

    const project = ([x, y]: [number, number, number]) => ({ x: 600 + x * 0.5, y: 450 + y * 0.5, visible: true });
    expect(selectVisiblePlaceLabels(catalog, 'off', 4, 1200, 900, [0, 0], project)).toEqual([]);

    const popupMarkers = selectVisiblePlaceLabels(catalog, 'popup', 3.5, 1200, 900, [0, 0], project);
    expect(popupMarkers.length).toBeGreaterThan(0);

    const topLabels = selectVisiblePlaceLabels(catalog, 'label', 4.5, 1200, 900, [0, 0], project);
    expect(topLabels.length).toBeGreaterThan(0);
    expect(topLabels.every(l => l.entry.name.length > 0 && l.entry.address.length > 0)).toBe(true);

    // Ensure both Trung tâm Chiếu phim Quốc gia (w1115247053) and VPBank Tower (w677190114) remain visible
    // across all zoom levels and 360° camera rotation angles around the Thái Hà – Láng Hạ intersection
    const target: [number, number] = [265, -1175];
    const el = Math.asin(1 / Math.sqrt(3));
    for (const pxPerM of [1.2, 2.0, 3.5, 5.5, 8.0]) {
      for (let deg = 0; deg < 360; deg += 45) {
        const az = (deg * Math.PI) / 180;
        const projIso = ([wx, wy, wz]: [number, number, number]) => {
          const dx = wx - target[0], dz = wy - target[1];
          const rx = -dx * Math.sin(az) + dz * Math.cos(az);
          const ry = (dx * Math.cos(az) + dz * Math.sin(az)) * Math.sin(el) - wz * Math.cos(el);
          return {
            x: 600 + rx * pxPerM,
            y: 450 + ry * pxPerM,
            visible: true,
          };
        };
        const vis = selectVisiblePlaceLabels(catalog, 'label', pxPerM, 1200, 900, target, projIso);
        const ids = new Set(vis.map(v => v.entry.id));
        expect(ids.has('w1115247053')).toBe(true);
        expect(ids.has('w677190114')).toBe(true);
      }
    }
  });
});

describe('multi-language (i18n) & data-driven catalog', () => {
  it('translates UI strings and builds localized place catalogs in Vietnamese and English', async () => {
    const { city } = await loadCityAsync(DEFAULT_AREA_ID);
    expect(city.cityName).toBe('Hà Nội');
    expect(city.places?.length).toBeGreaterThan(10);

    setGlobalLocale('en');
    expect(t('top.seeThrough')).toBe('See-through');
    const enCatalog = buildPlaceCatalog(city, new Set(), 'en');
    const enVp = enCatalog.byId.get('w677190114');
    expect(enVp?.badge).toBe('Landmark');
    expect(enVp?.metrics[0]?.label).toBe('Category');

    setGlobalLocale('vi');
    expect(t('top.seeThrough')).toBe('Nhìn xuyên');
    const viCatalog = buildPlaceCatalog(city, new Set(), 'vi');
    const viVp = viCatalog.byId.get('w677190114');
    expect(viVp?.badge).toBe('Công trình lớn');
    expect(viVp?.metrics[0]?.label).toBe('Phân loại');
  });
});

describe('SDK event bus & see-through foreground cut', () => {
  it('emits and unsubscribes events cleanly and computes metro station / building see-through cuts', () => {
    const bus = new CityEventBus();
    const events: string[] = [];
    const off = bus.on('mode:change', ({ mode }) => events.push(mode));
    bus.emit('mode:change', { mode: '3d' });
    off();
    bus.emit('mode:change', { mode: '2d' });
    expect(events).toEqual(['3d']);

    const { city } = loadCity(DEFAULT_AREA_ID);
    const tiles = tilesOf(city).map(tile => ({ tile }));
    const bldgBounds = buildBuildingBoundsIndex(tiles);
    expect(bldgBounds.length).toBe(city.buildings.length);

    const st = city.stations[0]!;
    const cutAtStation = computeForegroundCut({
      city,
      bldgBounds,
      zoom: SEE_THROUGH.STATION_MIN_ZOOM_NORMAL + 0.5,
      elevation: 0.6,
      targetX: st.at[0],
      targetZ: st.at[1],
      cameraX: st.at[0] + 500,
      cameraZ: st.at[1] + 500,
    });
    expect(cutAtStation.nearStation).toBe(true);
  });
});

describe('Google Maps–style URL state (@lat,lon,157m,0h,35.3t,2d)', () => {
  it('formats and round-trips coordinates, zoom metres, heading, tilt, mode, and query options', () => {
    const url = formatUrlState({
      x: 255,
      z: -1165,
      zoom: 300 / 157,
      heading: 135,
      tilt: 24.5,
      mode: '3d',
      night: true,
      seeThrough: false,
      streetLabels: 'map',
      placeInfo: 'label',
      place: 'w677190114',
    });
    expect(url).toMatch(/^\/@21\.\d{7},105\.\d{7},157m,135h,24\.5t,3d\?/);
    expect(url).toContain('theme=night');
    expect(url).toContain('xray=0');
    expect(url).toContain('labels=map');
    expect(url).toContain('info=label');
    expect(url).toContain('place=w677190114');

    const [pathname, search] = url.split('?');
    const parsed = parseUrlState({ pathname: pathname!, search: `?${search!}`, hash: '' });
    expect(parsed).not.toBeNull();
    expect(parsed!.x).toBeCloseTo(255, 1);
    expect(parsed!.z).toBeCloseTo(-1165, 1);
    expect(parsed!.zoom).toBeCloseTo(300 / 157, 2);
    expect(parsed!.heading).toBe(135);
    expect(parsed!.tilt).toBe(24.5);
    expect(parsed!.mode).toBe('3d');
    expect(parsed!.night).toBe(true);
    expect(parsed!.seeThrough).toBe(false);
    expect(parsed!.streetLabels).toBe('map');
    expect(parsed!.placeInfo).toBe('label');
    expect(parsed!.place).toBe('w677190114');

    // Also parses a direct Google Maps path like `/@21.0093489,105.8243039,157m/data=!3m1!1e3`
    const gmap = parseUrlState({
      pathname: '/@21.0093489,105.8243039,157m/data=!3m1!1e3!5m1!1e2',
      search: '?entry=ttu',
      hash: '',
    });
    expect(gmap).not.toBeNull();
    expect(Math.hypot(gmap!.x!, gmap!.z!)).toBeLessThan(20);
    expect(gmap!.zoom).toBeCloseTo(300 / 157, 2);
  });
});



