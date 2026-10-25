/* Apple Optical Lens Liquid Glass engine ported from https://github.com/sonth87/liquid-glass
   (`src/core/liquidGlassRefraction.ts` & `src/components/OpticalGlass.tsx`).
   Supports 3 UI surface modes (ADR-056):
     - 'off'   (default): 100% opaque solid background (--panel), zero transparency or blur
     - 'tint'           : translucent frosted blur (backdrop-filter: blur + saturate)
     - 'glass'          : 2D Canvas Red/Blue difference normal map + 3-pass R/G/B chromatic aberration
                          SVG feDisplacementMap optical lens refraction with 3D specular rim */
import { STORAGE_KEYS } from '@view/constants';

export type UiGlassMode = 'off' | 'tint' | 'glass';

export interface UiGlassSettings {
  mode: UiGlassMode;
  /** Transparency percentage (10..90) when mode is 'tint' or 'glass'. Ignored in 'off' (always 0% transparent / 100% opaque). */
  transparency: number;
  /** Optical lens refraction displacement scale (0..180, default 120) when mode is 'glass'. */
  lensScale: number;
}

export const DEFAULT_UI_GLASS_SETTINGS: UiGlassSettings = {
  mode: 'tint',
  transparency: 76,
  lensScale: 120,
};

export function loadUiGlassSettings(): UiGlassSettings {
  let mode: UiGlassMode = DEFAULT_UI_GLASS_SETTINGS.mode;
  let transparency = DEFAULT_UI_GLASS_SETTINGS.transparency;
  let lensScale = DEFAULT_UI_GLASS_SETTINGS.lensScale;
  try {
    const rawMode = localStorage.getItem(STORAGE_KEYS.UI_GLASS_MODE);
    if (rawMode === 'off' || rawMode === 'tint' || rawMode === 'glass') mode = rawMode;
    const rawTrans = Number(localStorage.getItem(STORAGE_KEYS.UI_OPACITY));
    if (Number.isFinite(rawTrans) && rawTrans >= 10 && rawTrans <= 90 && rawTrans !== 55) {
      transparency = rawTrans;
    }
    const rawScale = Number(localStorage.getItem(STORAGE_KEYS.UI_LENS_SCALE));
    if (Number.isFinite(rawScale) && rawScale >= 0 && rawScale <= 180 && rawScale !== 112) {
      lensScale = rawScale;
    }
  } catch {
    /* ignore storage errors */
  }
  return { mode, transparency, lensScale };
}

export function saveUiGlassSettings(s: UiGlassSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UI_GLASS_MODE, s.mode);
    localStorage.setItem(STORAGE_KEYS.UI_OPACITY, String(s.transparency));
    localStorage.setItem(STORAGE_KEYS.UI_LENS_SCALE, String(s.lensScale));
  } catch {
    /* ignore storage errors */
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

let cachedSvgBackdropSupport: boolean | null = null;

/** Detect whether the browser supports `backdrop-filter: url(#svgFilterId)` (Chromium). */
export function supportsSvgBackdropFilter(): boolean {
  if (cachedSvgBackdropSupport !== null) return cachedSvgBackdropSupport;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg|Brave/i.test(ua) && !/Firefox/i.test(ua);
  const isWebKitOnly = /Safari/i.test(ua) && !isChromium;
  if (isWebKitOnly) {
    cachedSvgBackdropSupport = false;
    return false;
  }
  const hasCss =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    (CSS.supports('backdrop-filter', 'url(#a)') || CSS.supports('-webkit-backdrop-filter', 'url(#a)'));
  cachedSvgBackdropSupport = Boolean(isChromium && hasCss);
  return cachedSvgBackdropSupport;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const displacementUrlCache = new Map<string, string>();

/**
 * Generates the exact 2D normal-map displacement data URL from `sonth87/liquid-glass`
 * (`src/core/liquidGlassRefraction.ts`):
 * - Step 1: X-axis Red linear gradient `rgb(0,0,0)` -> `rgb(255,0,0)`
 * - Step 2: Y-axis Blue linear gradient `rgb(0,0,0)` -> `rgb(0,0,255)` with `difference` composite
 * - Step 3: Blurred center plateau `rgba(128, 128, 128, 0.93)` creating a convex lens center + strong curved bezel
 */
export function generateLensDisplacementDataUrl(
  width: number,
  height: number,
  radius: number,
  border?: number,
  mapBlur?: number,
): string {
  const w = Math.max(16, Math.round(width));
  const h = Math.max(16, Math.round(height));
  const minDim = Math.min(w, h);
  const r = Math.max(2, Math.min(Math.round(radius), Math.floor(minDim / 2)));
  const resolvedBorder = border ?? (minDim <= 64 ? 0.16 : 0.085);
  const resolvedBlur = mapBlur ?? (minDim <= 64 ? 9 : 13);
  const key = `${w}x${h}:${r}:${resolvedBorder.toFixed(3)}:${resolvedBlur.toFixed(1)}`;
  const hit = displacementUrlCache.get(key);
  if (hit) return hit;

  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. X-axis Red gradient (0..255 in R)
  const gx = ctx.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgb(0,0,0)');
  gx.addColorStop(1, 'rgb(255,0,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);

  // 2. Y-axis Blue gradient (0..255 in B, keeping R independent via 'difference')
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgb(0,0,0)');
  gy.addColorStop(1, 'rgb(0,0,255)');
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);

  // 3. Center neutral gray 128 plateau (0.93 alpha retains 7% convex curvature across the lens interior)
  ctx.globalCompositeOperation = 'source-over';
  const inset = resolvedBorder * minDim;
  ctx.filter = `blur(${Math.max(1, resolvedBlur)}px)`;
  ctx.fillStyle = 'rgba(128, 128, 128, 0.93)';
  drawRoundedRectPath(
    ctx,
    inset,
    inset,
    Math.max(1, w - inset * 2),
    Math.max(1, h - inset * 2),
    Math.max(r - inset, 2),
  );
  ctx.fill();
  ctx.filter = 'none';

  const url = canvas.toDataURL();
  if (displacementUrlCache.size > 64) {
    const oldest = displacementUrlCache.keys().next().value;
    if (oldest) displacementUrlCache.delete(oldest);
  }
  displacementUrlCache.set(key, url);
  return url;
}

function ensureSharedSvgDefs(): SVGDefsElement | null {
  if (typeof document === 'undefined') return null;
  let svg = document.getElementById('city3d-liquid-glass-defs') as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'city3d-liquid-glass-defs';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;overflow:hidden;z-index:-1;';
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }
  return svg.querySelector('defs');
}

function buildFilterSvg(
  id: string,
  w: number,
  h: number,
  mapUri: string,
  scale: number,
  chroma: number,
): string {
  const scaleR = scale;
  const scaleG = scale + chroma;
  const scaleB = scale + chroma * 2;
  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feImage x="0" y="0" width="${w}" height="${h}" href="${mapUri}" preserveAspectRatio="none" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scaleR}" xChannelSelector="R" yChannelSelector="B" result="dispRed" />
    <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scaleG}" xChannelSelector="R" yChannelSelector="B" result="dispGreen" />
    <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale="${scaleB}" xChannelSelector="R" yChannelSelector="B" result="dispBlue" />
    <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
    <feBlend in="red" in2="green" mode="screen" result="rg" />
    <feBlend in="rg" in2="blue" mode="screen" result="output" />
  </filter>`;
}

const lastFilterSig = new Map<string, string>();

function upsertOpticalLensFilter(
  filterId: string,
  width: number,
  height: number,
  radius: number,
  lensScale: number,
): boolean {
  const defs = ensureSharedSvgDefs();
  if (!defs) return false;
  const w = Math.max(16, Math.round(width));
  const h = Math.max(16, Math.round(height));
  const r = Math.round(radius);
  const scale = -Math.abs(lensScale);
  const chroma = Math.max(6, Math.round(Math.abs(lensScale) * 0.07));
  const sig = `${w}x${h}:${r}:${scale}:${chroma}`;
  if (lastFilterSig.get(filterId) === sig && document.getElementById(filterId)) {
    return false;
  }

  const dataUrl = generateLensDisplacementDataUrl(w, h, r);
  if (!dataUrl) return false;

  const existing = document.getElementById(filterId);
  if (existing) existing.remove();

  const temp = document.createElementNS(SVG_NS, 'svg');
  temp.innerHTML = buildFilterSvg(filterId, w, h, dataUrl, scale, chroma);
  const newFilter = temp.firstElementChild as SVGFilterElement | null;
  if (newFilter) {
    defs.appendChild(newFilter);
    lastFilterSig.set(filterId, sig);
    return true;
  }
  return false;
}

let nextSurfaceUid = 1;
const surfaceIds = new WeakMap<HTMLElement, string>();
let sharedSurfaceObserver: ResizeObserver | null = null;
let currentRootEl: HTMLElement | null = null;
let currentSettings: UiGlassSettings = DEFAULT_UI_GLASS_SETTINGS;

function getSurfaceFilterId(el: HTMLElement): string {
  let id = surfaceIds.get(el);
  if (!id) {
    id = `lg-lens-filter-${nextSurfaceUid++}`;
    surfaceIds.set(el, id);
  }
  return id;
}

function applyLensToSurfaceElement(el: HTMLElement, settings: UiGlassSettings, canUseSvgLens: boolean): void {
  if (!canUseSvgLens) {
    el.style.backdropFilter = '';
    el.style.setProperty('-webkit-backdrop-filter', '');
    return;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 16 || rect.height < 16) return;
  const cs = getComputedStyle(el);
  const radius = parseFloat(cs.borderTopLeftRadius) || 16;
  const filterId = getSurfaceFilterId(el);
  const changed = upsertOpticalLensFilter(filterId, rect.width, rect.height, radius, settings.lensScale);
  const bf = `url(#${filterId}) blur(3px) saturate(1.65)`;
  if (changed || el.style.backdropFilter !== bf) {
    // Force Chromium compositor to re-bind the updated SVG filter graph
    el.style.backdropFilter = 'none';
    el.style.setProperty('-webkit-backdrop-filter', 'none');
    void el.offsetWidth;
    el.style.backdropFilter = bf;
    el.style.setProperty('-webkit-backdrop-filter', bf);
  }
}

function ensureSurfaceResizeObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null;
  if (!sharedSurfaceObserver) {
    sharedSurfaceObserver = new ResizeObserver(entries => {
      const canUseSvgLens =
        currentSettings.mode === 'glass' && supportsSvgBackdropFilter() && currentSettings.lensScale > 0;
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (target && target.classList?.contains('ui-surface')) {
          applyLensToSurfaceElement(target, currentSettings, canUseSvgLens);
        }
      }
    });
  }
  return sharedSurfaceObserver;
}

/**
 * Applies the current `UiGlassSettings` to the root document and all `.ui-surface` elements.
 * - `mode === 'off'` (Default): 100% opaque `--panel`, no backdrop-filter.
 * - `mode === 'tint'`: translucent frosted blur.
 * - `mode === 'glass'`: Apple Optical Lens SVG refraction on every `.ui-surface` element.
 */
export function applyUiGlassToRoot(rootEl: HTMLElement | null, settings: UiGlassSettings): void {
  if (typeof document === 'undefined') return;
  currentRootEl = rootEl;
  currentSettings = settings;

  const docEl = document.documentElement;
  docEl.dataset.uiGlass = settings.mode;
  // Convert user's "transparency %" (10..90) into surface fill opacity (90%..10%)
  const fillAlpha = settings.mode === 'off' ? 100 : Math.max(8, Math.min(90, 100 - settings.transparency));
  docEl.style.setProperty('--ui-fill-alpha', `${fillAlpha}%`);

  if (!rootEl) return;
  const surfaces = rootEl.querySelectorAll<HTMLElement>('.ui-surface');
  const canUseSvgLens = settings.mode === 'glass' && supportsSvgBackdropFilter() && settings.lensScale > 0;
  const ro = ensureSurfaceResizeObserver();

  surfaces.forEach(el => {
    if (ro && canUseSvgLens) ro.observe(el);
    applyLensToSurfaceElement(el, settings, canUseSvgLens);
  });
}

export function refreshActiveUiGlass(): void {
  if (currentRootEl) {
    applyUiGlassToRoot(currentRootEl, currentSettings);
  }
}
