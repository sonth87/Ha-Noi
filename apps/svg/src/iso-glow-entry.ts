/* Standalone iso-glow runtime bridge: exposes My City's isometric SVG renderers and scene
   controllers on window.MY_CITY so individual iso-glow/figs/*.js files can mount them directly
   from file:// without any dev server or module bundler at runtime. */
import { kernel } from '@iso/kernel';
import { LANDMARKS } from '@core/landmarks';
import { localFrame, rotateSpec, VIEW_LABEL } from '@core/view';
import type { ViewK } from '@core/types';
import { MS_SIZE, renderMetroStation } from '@building/metro-station';
import { junctionWindow, renderLandmark, sharedCrossroads } from '@render/landmarks/showcase';
import { composeScene } from '@render/scene';
import type { SceneController } from '@scenes/controller';
import { TrafficDriver } from '@scenes/crossroads/trafficDriver';
import { HelloController } from '@scenes/hello/helloController';
import { ReferenceController } from '@scenes/reference/referenceController';
import { CatalogController } from '@scenes/catalog/catalogController';
import { StreetController } from '@scenes/street/streetController';
import { CrossroadsController } from '@scenes/crossroads/crossroadsController';

export interface IsoGlowApi {
  readout(s: string): void;
  hint(s: string): void;
  power(on: boolean): void;
  after(ms: number, fn: () => void): ReturnType<typeof setTimeout>;
  every(ms: number, fn: () => void): ReturnType<typeof setInterval>;
  loop(fn: (ts: number) => void): () => void;
  flash(el: Element | null, ms?: number): void;
  replay(el: Element | null, cls?: string): void;
  audio(): { ctx: AudioContext; out: GainNode };
}

/** Attach wheel-zoom, drag-pan, and double-click reset to an <svg> stage. */
export function attachZoomPan(stage: SVGSVGElement, getBaseViewBox: () => string): { reset(): void; consumedClick(): boolean } {
  let box: [number, number, number, number] | null = null;
  let drag: { x: number; y: number; moved: boolean; box: [number, number, number, number] } | null = null;
  let SuppressClick = false;

  const parse = (vb: string): [number, number, number, number] => {
    const p = vb.trim().split(/\s+/).map(Number);
    return [p[0] || 0, p[1] || 0, p[2] || 400, p[3] || 300];
  };
  const apply = (b: [number, number, number, number]) => {
    box = b;
    stage.setAttribute('viewBox', b.map(n => n.toFixed(1)).join(' '));
  };
  const reset = () => {
    box = null;
    stage.setAttribute('viewBox', getBaseViewBox());
  };

  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const base = parse(getBaseViewBox());
    const cur = box ?? base;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ux = (e.clientX - rect.left) / rect.width;
    const uy = (e.clientY - rect.top) / rect.height;
    const factor = Math.exp(Math.sign(e.deltaY) * 0.14);
    const nw = Math.max(base[2] * 0.18, Math.min(base[2] * 2.5, cur[2] * factor));
    const nh = (nw / base[2]) * base[3];
    const nx = cur[0] + (cur[2] - nw) * ux;
    const ny = cur[1] + (cur[3] - nh) * uy;
    apply([nx, ny, nw, nh]);
  }, { passive: false });

  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const cur = box ?? parse(getBaseViewBox());
    drag = { x: e.clientX, y: e.clientY, moved: false, box: [...cur] };
  });

  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 4) {
      drag.moved = true;
      SuppressClick = true;
    }
    if (!drag.moved) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const [x0, y0, w, h] = drag.box;
    apply([x0 - (dx / rect.width) * w, y0 - (dy / rect.height) * h, w, h]);
  });

  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('dblclick', () => reset());

  return {
    reset,
    consumedClick() {
      if (!SuppressClick) return false;
      SuppressClick = false;
      return true;
    },
  };
}

/** Bridge a SceneController (Hello, Reference, Catalog, Street, Crossroads) into iso-glow's mount(stage, api). */
export function mountController(stage: SVGSVGElement, api: IsoGlowApi, ctrl: SceneController, enableZoom = false) {
  let prevSvg = '';
  let prevVb = '';
  const zp = enableZoom ? attachZoomPan(stage, () => ctrl.getSnapshot().viewBox) : null;

  const sync = () => {
    const snap = ctrl.getSnapshot();
    if (snap.viewBox !== prevVb) {
      prevVb = snap.viewBox;
      if (zp) zp.reset(); else stage.setAttribute('viewBox', snap.viewBox);
    }
    if (snap.svg !== prevSvg) {
      prevSvg = snap.svg;
      ctrl.detach();
      stage.innerHTML = snap.svg;
      ctrl.attach(stage);
    }
    api.readout(snap.readout);
    api.power(snap.power);
  };

  const unsub = ctrl.subscribe(sync);
  sync();

  stage.addEventListener('click', e => {
    if (zp?.consumedClick()) return;
    ctrl.click(e.target as Element);
  });

  return {
    key: (e: KeyboardEvent) => ctrl.key(e),
    demo: () => ctrl.demo(),
    unmount: () => {
      unsub();
      ctrl.detach();
    },
  };
}

/** Mount a single Landmark ('thai-binh' | 'novotel' | 'garden-circle' | 'garden-grove' | 'flyover' | 'metro-station')
    as an interactive iso-glow figure with 4-view rotation (Q/E), day/night (N), floor lights (click / Space),
    and optional live train dispatch for Ga Thái Hà ('metro-station'). */
export function mountLandmark(stage: SVGSVGElement, api: IsoGlowApi, landmarkId: string) {
  const K0 = kernel(0, 0);
  const lm = LANDMARKS.find(l => l.id === landmarkId) ?? LANDMARKS[0]!;
  let k: ViewK = 0;
  let night = false;
  let traffic = true;
  let floors: string[] = [];
  const lit = new Set<string>();
  let driver: TrafficDriver | null = null;
  let last = performance.now();
  let curVb = '0 0 400 300';

  // Train state for metro-station (Track 1 & Track 2)
  const trains: Record<1 | 2, { t0: number | null; boarded: boolean }> = {
    1: { t0: null, boarded: false },
    2: { t0: null, boarded: false },
  };
  let riders = 0;
  let unitA: [number, number] = [0, 0];

  const zp = attachZoomPan(stage, () => curVb);

  function chime() {
    try {
      const { ctx, out } = api.audio();
      const t = ctx.currentTime;
      [[660, 0], [494, 0.22]].forEach(([freq, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq!;
        g.gain.setValueAtTime(0, t + d!);
        g.gain.linearRampToValueAtTime(0.08, t + d! + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d! + 0.5);
        o.connect(g);
        g.connect(out);
        o.start(t + d!);
        o.stop(t + d! + 0.55);
      });
    } catch {
      // ignore audio errors before user gesture
    }
  }

  function apply() {
    stage.querySelectorAll<SVGGElement>('[data-floor]').forEach(el => el.classList.toggle('on', lit.has(el.dataset.floor!)));
    stage.querySelectorAll<SVGGElement>('[data-night]').forEach(el => el.classList.toggle('on', night));
    stage.querySelectorAll<SVGGElement>('.traffic-lane, .traffic-fly, .traffic-cell').forEach(el => el.classList.toggle('off', !traffic));

    const parts = [`view ${VIEW_LABEL[k]}`, night ? 'night' : 'day'];
    if (floors.length) parts.push(`${lit.size}/${floors.length} lit`);
    if (lm.kind === 'flyover' && driver) {
      const g = driver.signals;
      const light = (l: string) => (l === 'go' ? 'xanh' : l === 'wait' ? 'vàng' : 'đỏ');
      parts.push(traffic ? `${driver.count} xe · Tây Sơn ${light(g.x)} ${g.xLeft}s · Thái Hà ${light(g.y)} ${g.yLeft}s` : 'no traffic');
    }
    if (lm.kind === 'metro-station') {
      const activeTrains: string[] = [];
      for (const n of [1, 2] as const) {
        if (trains[n].t0 !== null) activeTrains.push(`tàu ${n} đang chạy`);
      }
      parts.push(activeTrains.length ? activeTrains.join(' · ') : '2 tàu tại ga');
      if (riders > 0) parts.push(`${riders} khách`);
    }
    api.readout(parts.join(' · '));
    api.power(lit.size > 0 || night || trains[1].t0 !== null || trains[2].t0 !== null);
  }

  function build() {
    const sc = renderLandmark(K0, lm, k);
    const composed = composeScene(sc.items, 0.05);
    floors = sc.floors;
    curVb = composed.viewBox;
    zp.reset();
    stage.innerHTML = composed.svg;

    if (lm.kind === 'flyover') {
      const cr = sharedCrossroads();
      driver ??= new TrafficDriver(cr, junctionWindow(cr));
      driver.bind(stage, k);
    } else if (lm.kind === 'metro-station') {
      const [w, d] = MS_SIZE;
      const L = localFrame(rotateSpec({ x: 0, y: 0, w, d, facing: 'S' }, k, w / 2, d / 2));
      const v = L.vec(1, 0, 0);
      unitA = K0.D(v[0], v[1], v[2]);
    }
    apply();
  }

  function dispatchTrain(n: 1 | 2) {
    if (lm.kind !== 'metro-station') return false;
    if (trains[n].t0 !== null) return true;
    trains[n].t0 = performance.now();
    trains[n].boarded = false;
    lit.add('MS/2');
    lit.add('MS/3');
    apply();
    return true;
  }

  function tickTrains(now: number) {
    if (lm.kind !== 'metro-station') return;
    const A = 2200, W = 2400, D = 2000;
    const eOut = (t: number) => 1 - (1 - t) ** 3;
    const eIn = (t: number) => t * t * t;
    let changed = false;

    for (const n of [1, 2] as const) {
      const T = trains[n];
      const el = stage.querySelector<SVGGElement>(`.ms-train[data-train="${n}"]`);
      const edge = stage.querySelector<SVGGElement>(`.ms-edge[data-edge="${n}"]`);
      if (!el) continue;
      if (T.t0 === null) {
        el.removeAttribute('transform');
        el.style.opacity = '';
        edge?.classList.remove('blink');
        continue;
      }
      const dir = n === 1 ? -1 : 1;
      const e = now - T.t0;
      let da: number;
      let op: number;
      if (e < D) {
        // Departing out of the station along track direction
        const p = eIn(e / D);
        da = dir * 420 * p;
        op = Math.max(0, 1 - p * 1.15);
        edge?.classList.remove('blink');
      } else if (e < D + A) {
        // Arriving from the opposite end into the station
        const p = eOut((e - D) / A);
        da = -dir * 420 * (1 - p);
        op = Math.min(1, p * 1.3);
        edge?.classList.add('blink');
      } else if (e < D + A + W) {
        // Boarding at the platform
        da = 0;
        op = 1;
        edge?.classList.remove('blink');
        if (!T.boarded) {
          T.boarded = true;
          riders += 28 + ((n * 17) % 25);
          chime();
          changed = true;
        }
      } else {
        T.t0 = null;
        T.boarded = false;
        el.removeAttribute('transform');
        el.style.opacity = '';
        edge?.classList.remove('blink');
        changed = true;
        continue;
      }
      const dx = unitA[0] * da, dy = unitA[1] * da;
      el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      el.style.opacity = op.toFixed(2);
    }
    if (changed) apply();
  }

  function rotate(step: number) {
    k = ((k + step) % 4) as ViewK;
    build();
  }

  function toggleAll() {
    const all = floors.length > 0 && floors.every(id => lit.has(id));
    if (all) lit.clear(); else floors.forEach(id => lit.add(id));
    apply();
  }

  function toggleNight() {
    night = !night;
    if (!night) {
      lit.clear();
      apply();
      return;
    }
    apply();
    floors.filter((_, i) => (i * 7) % 10 < 8).forEach((id, i) => {
      api.after(60 + i * 40, () => {
        if (night) {
          lit.add(id);
          apply();
        }
      });
    });
  }

  build();

  api.loop(now => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (lm.kind === 'flyover' && driver && traffic) {
      if (driver.tick(dt)) apply();
    }
    if (lm.kind === 'metro-station') {
      tickTrains(now);
    }
  });

  stage.addEventListener('click', e => {
    if (zp.consumedClick()) return;
    const target = e.target as Element;
    const trainEl = target.closest<SVGGElement>('.ms-train');
    if (trainEl?.dataset.train) {
      dispatchTrain(Number(trainEl.dataset.train) as 1 | 2);
      return;
    }
    const fl = target.closest<SVGGElement>('[data-floor]');
    if (fl?.dataset.floor) {
      const id = fl.dataset.floor;
      if (lit.has(id)) lit.delete(id); else lit.add(id);
      apply();
      return;
    }
    if (floors.length === 0 && lm.kind !== 'flyover') {
      toggleNight();
    }
  });

  return {
    key(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (key === 'q') { rotate(3); return true; }
      if (key === 'e') { rotate(1); return true; }
      if (key === 'n') { toggleNight(); return true; }
      if (key === ' ' || key === 'enter') {
        if (!e.repeat) {
          if (floors.length > 0) toggleAll(); else toggleNight();
        }
        return true;
      }
      if (lm.kind === 'flyover' && key === 't') {
        traffic = !traffic;
        apply();
        return true;
      }
      if (lm.kind === 'metro-station') {
        if (key === '1') return dispatchTrain(1);
        if (key === '2') return dispatchTrain(2);
        if (key === 't') { dispatchTrain(1); api.after(350, () => dispatchTrain(2)); return true; }
      }
      return false;
    },
    demo() {
      if (!night) toggleNight();
      if (lm.kind === 'metro-station') {
        api.after(300, () => dispatchTrain(1));
      }
    },
  };
}

export {
  kernel,
  VIEW_LABEL,
  localFrame,
  rotateSpec,
  composeScene,
  LANDMARKS,
  MS_SIZE,
  renderMetroStation,
  renderLandmark,
  sharedCrossroads,
  junctionWindow,
  TrafficDriver,
  HelloController,
  ReferenceController,
  CatalogController,
  StreetController,
  CrossroadsController,
};

