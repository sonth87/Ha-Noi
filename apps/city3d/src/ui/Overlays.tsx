/* What floats over the map besides the menus (ADR-063): the camera dock with Pegman, the bar of a 3D model, the
   immersive-view bar with its driving pads, and the status line with the OpenStreetMap credit (A15). */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CityView, PegmanDropPreview, ShowcaseItem, Snapshot } from '@view/CityView';
import { cleanName } from '@view/explore';
import { t, type Locale, type TranslationKey } from '@view/i18n';
import { lightOn } from '@view/lights';
import type { DriveControlKey } from '@view/povController';
import { CompassNeedle, Icon, Pegman } from './icons';
import { POV_LABEL } from './Menus';

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

/* ---------- camera dock ---------- */

export function MapDock({ v, s, host, onHint }: { v: CityView; s: Snapshot; host: RefObject<HTMLDivElement | null>; onHint: (text: string) => void }) {
  const loc = s.locale;
  const [drag, setDrag] = useState<{ x: number; y: number; preview: PegmanDropPreview | null } | null>(null);
  const dir = t(`cam.dir.${s.view}` as TranslationKey, undefined, loc);
  const compass = t('cam.compass', { dir, deg: s.heading }, loc);

  /** Pegman enters a view only when it is dragged and dropped on the map: a tap explains how (it used to drop
      Pegman in the middle of the screen and start driving, often by accident) */
  const startPegman = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return;
      moved = true;
      setDrag({ x: ev.clientX, y: ev.clientY, preview: v.previewPegmanDrop(ev.clientX, ev.clientY) });
    };
    const onEnd = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      setDrag(null);
      if (!moved || ev.type === 'pointercancel') { onHint(t('pegman.tapHint', undefined, loc)); return; }
      const r = host.current?.getBoundingClientRect();
      const overMap = r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      if (overMap) v.dropPegmanAt(ev.clientX, ev.clientY);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  return (
    <>
      {drag?.preview && (
        <div className="pegman-drop-target" data-kind={drag.preview.kind} style={{ transform: `translate3d(${drag.preview.screenX.toFixed(1)}px, ${drag.preview.screenY.toFixed(1)}px, 0)` }}>
          <span className="pegman-target-ring" /><span className="pegman-target-core" />
        </div>
      )}
      {drag && (
        <div className="pegman-drag-ghost" data-kind={drag.preview?.kind ?? 'car'} style={{ transform: `translate3d(${drag.x.toFixed(1)}px, ${drag.y.toFixed(1)}px, 0)` }}>
          <div className="pegman-ghost-figure"><Pegman size={26} /></div>
        </div>
      )}
      <div className="map-dock" role="group" aria-label={t('cam.aria', undefined, loc)} onPointerDown={stop} onDoubleClick={stop}>
        <button type="button" className="dock-btn ui-surface compass-btn" onClick={() => v.resetNorth()} title={compass} aria-label={compass}>
          <CompassNeedle heading={s.heading} />
        </button>
        <button type="button" className="dock-btn ui-surface" onClick={e => v.rotate(e.shiftKey ? -1 : 1)} title={t('cam.rot90', undefined, loc)} aria-label={t('cam.rot90', undefined, loc)}>
          <Icon name="rotate" />
        </button>
        {!s.showcase && (
          <button type="button" className="dock-btn ui-surface" onClick={() => v.goToMyLocation()} title={t('cam.myLocation', undefined, loc)} aria-label={t('cam.myLocation', undefined, loc)}>
            <Icon name="target" />
          </button>
        )}
        <div className="dock-zoom ui-surface">
          <button type="button" onClick={() => v.zoom(1.28)} title={t('cam.zoomIn', undefined, loc)} aria-label={t('cam.zoomIn', undefined, loc)}><Icon name="plus" /></button>
          <button type="button" onClick={() => v.zoom(1 / 1.28)} title={t('cam.zoomOut', undefined, loc)} aria-label={t('cam.zoomOut', undefined, loc)}><Icon name="minus" /></button>
        </div>
        <button type="button" className="dock-btn ui-surface mode-btn" onClick={() => v.toggleMode()} aria-pressed={s.mode === '3d'} title={t('top.mode.title', undefined, loc)}>
          {s.mode === '2d' ? '2D' : '3D'}
        </button>
        {!s.showcase && (
          <button type="button" className={`dock-btn ui-surface pegman-btn${drag ? ' is-dragging' : ''}`} title={t('cam.pegman', undefined, loc)} aria-label={t('cam.pegman', undefined, loc)} onPointerDown={startPegman}>
            <Pegman />
          </button>
        )}
      </div>
    </>
  );
}

/* ---------- the bar of a 3D model (showcase) ---------- */

export function ShowcaseBar({ v, item, locale: loc }: { v: CityView; item: ShowcaseItem; locale: Locale }) {
  return (
    <div className="showcase-bar ui-surface" onPointerDown={stop} onDoubleClick={stop}>
      <div className="showcase-bar-text">
        <span className="eyebrow">{t('showcase.label', undefined, loc)} · {item.group.replace(/^\d+\.\s*/, '')}</span>
        <b>{cleanName(item.name)}</b>
        <span className="sub">{item.subtitle}</span>
      </div>
      <div className="showcase-bar-actions">
        <button type="button" className="btn" onClick={() => v.setShowcase(null)}><Icon name="arrowLeft" /> {t('showcase.back', undefined, loc)}</button>
        {item.at && <button type="button" className="btn primary" onClick={() => v.showItemOnMap(item.id)}><Icon name="mapPin" /> {t('showcase.onMap', undefined, loc)}</button>}
      </div>
    </div>
  );
}

/* ---------- immersive views ---------- */

const PAD = (v: CityView, key: DriveControlKey, other?: DriveControlKey) => ({
  onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); if (other) v.setDriveTouchControl(other, false); v.setDriveTouchControl(key, true); },
  onPointerUp: () => v.setDriveTouchControl(key, false),
  onPointerCancel: () => v.setDriveTouchControl(key, false),
  onLostPointerCapture: () => v.setDriveTouchControl(key, false),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
});

export function PovBar({ v, s }: { v: CityView; s: Snapshot }) {
  const loc = s.locale;
  const metro = s.povMode === 'metro-cab' || s.povMode === 'metro-passenger';
  const driving = s.povMode === 'drive-cabin' || s.povMode === 'drive-inside';
  const [more, setMore] = useState(false);
  return (
    <>
      <div className="pov-bar ui-surface" onPointerDown={stop} onDoubleClick={stop}>
        <div className="pov-speed"><strong>{s.povSpeedKmh}</strong><span>km/h</span></div>
        <div className="pov-meta">
          <b>{t(POV_LABEL[s.povMode].label, undefined, loc)}</b>
          <span>
            {metro ? t(`pov.status.${s.povTrainPhase}` as TranslationKey, undefined, loc) : null}
            {s.povLocationName ? `${metro ? ' · ' : ''}${s.povLocationName}` : ''}
          </span>
        </div>
        <button type="button" className="icon-btn-round" aria-expanded={more} onClick={() => setMore(m => !m)} aria-label="…" title="…"><Icon name="sliders" /></button>
        <button type="button" className="btn exit" onClick={() => v.setPovMode('map')}><Icon name="close" size={16} /> {t('pov.exit', undefined, loc)}</button>
        {more && (
          <div className="pov-more">
            <div className="seg-control">
              {(['metro-cab', 'metro-passenger', 'drive-cabin', 'drive-inside'] as const).map(pm => (
                <button key={pm} type="button" aria-pressed={s.povMode === pm} onClick={() => v.setPovMode(pm)} title={t(POV_LABEL[pm].label, undefined, loc)}>
                  <Icon name={POV_LABEL[pm].icon} size={16} />
                </button>
              ))}
            </div>
            <div className="pov-actions">
              {metro && <button type="button" className="btn" onClick={() => v.nextPovTrain()}>{t('pov.hud.nextTrain', { index: s.povTrainIndex + 1, total: s.povTrainTotal }, loc)}</button>}
              {s.povMode === 'metro-passenger' && <button type="button" className="btn" onClick={() => v.togglePovWindowSide()}>{t('pov.hud.windowSide', undefined, loc)}</button>}
              {driving && <button type="button" className="btn" onClick={() => v.toggleDriveCamera()}>{t('pov.hud.switchDriveCam', undefined, loc)}</button>}
              {driving && <button type="button" className="btn" onClick={() => v.resetPovCar()}>{t('pov.hud.resetCar', undefined, loc)}</button>}
              <button type="button" className="btn" onClick={() => v.centerPovLook()}>{t('pov.hud.centerLook', undefined, loc)}</button>
            </div>
            <p className="hint">{t(metro ? 'pov.hint.metro' : 'pov.hint.drive', undefined, loc)}</p>
          </div>
        )}
      </div>
      <div className="pov-minimap" onPointerDown={stop}>
        <canvas ref={el => v.setMiniMapCanvas(el)} className="pov-minimap-canvas" />
      </div>
      {driving && (
        <div className="drive-pads" onPointerDown={stop}>
          <div className="pad-group">
            <button type="button" className="pad" aria-label="Steer left" {...PAD(v, 'left', 'right')}><Icon name="arrowLeft" size={26} /></button>
            <button type="button" className="pad" aria-label="Steer right" {...PAD(v, 'right', 'left')}><span className="flip"><Icon name="arrowLeft" size={26} /></span></button>
          </div>
          <div className="pad-group">
            <button type="button" className="pad brake" aria-label="Brake / reverse" {...PAD(v, 'brake', 'throttle')}>{t('pad.brake', undefined, loc)}</button>
            <button type="button" className="pad throttle" aria-label="Throttle" {...PAD(v, 'throttle', 'brake')}>{t('pad.go', undefined, loc)}</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- inside the car (ADR-064) ---------- */

/** The driver's view: dashboard along the bottom, the two windscreen pillars, and the wheel, turned with the steering
    every frame (read straight from the view, not through React). It takes no pointer events: dragging still looks round. */
export function Cockpit({ v }: { v: CityView }) {
  const wheel = useRef<SVGGElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // the SVG attribute turns round the wheel's own centre (0, 0) in every browser
      if (wheel.current) wheel.current.setAttribute('transform', `rotate(${(v.povSteer() * 110).toFixed(1)})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return (
    <div className="cockpit" aria-hidden="true">
      <svg className="cockpit-pillars" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 0 L7 0 L1.5 100 L0 100 Z" />
        <path d="M100 0 L93 0 L98.5 100 L100 100 Z" />
      </svg>
      <svg className="cockpit-dash" viewBox="0 0 1000 200" preserveAspectRatio="none">
        <path className="dash-body" d="M0 70 C 220 30, 780 30, 1000 70 L1000 200 L0 200 Z" />
        <path className="dash-edge" d="M0 70 C 220 30, 780 30, 1000 70" />
      </svg>
      <svg className="cockpit-wheel" viewBox="-110 -110 220 220">
        <g ref={wheel} className="wheel">
          <circle r="96" className="wheel-rim" />
          <circle r="22" className="wheel-hub" />
          <path d="M-22 4 L-92 18 M22 4 L92 18 M0 22 L0 94" className="wheel-spoke" />
          <path d="M-10 -95 L10 -95" className="wheel-mark" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- status line (OpenStreetMap credit, A15) ---------- */

export function StatusBar({ v, s, item }: { v: CityView; s: Snapshot; item: ShowcaseItem | null }) {
  const loc = s.locale;
  const sig = { go: t('footer.signal.go', undefined, loc), wait: t('footer.signal.wait', undefined, loc), stop: t('footer.signal.stop', undefined, loc) } as const;
  const where = item ? `${t('footer.diorama', undefined, loc)} · ${cleanName(item.name)}` : v.city.cityName ?? t('footer.cityMap', undefined, loc);
  const view = s.povMode !== 'map' ? `${t(POV_LABEL[s.povMode].label, undefined, loc)} · ${s.povSpeedKmh} km/h` : `${s.mode.toUpperCase()} · ${t(`cam.dir.${s.view}` as TranslationKey, undefined, loc)} ${s.heading}°`;
  const lit = `${t('footer.litWindows', undefined, loc)} ${lightOn(s.lights.house, s.night) ? Math.round(s.lights.share * 100) : 0}%${s.lit ? ` + ${s.lit} ${t('footer.floors', undefined, loc)}` : ''}`;
  const traffic = item ? '' : ` · ${s.vehicles} ${t('footer.vehicles', undefined, loc)} · X ${sig[s.signals.x]} ${s.signals.xLeft}s · Y ${sig[s.signals.y]} ${s.signals.yLeft}s`;
  return (
    <footer className="status-bar ui-surface" onPointerDown={stop}>
      <span className="fps-badge">{s.fps} fps</span>
      <span className="read">{where} · {view} · L{s.detail} · {lit}{traffic}</span>
      <span className="credit">© OpenStreetMap contributors</span>
    </footer>
  );
}
