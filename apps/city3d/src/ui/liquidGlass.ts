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
  transparency: 65,
  lensScale: 110,
};

export function loadUiGlassSettings(): UiGlassSettings {
  let mode: UiGlassMode = DEFAULT_UI_GLASS_SETTINGS.mode;
  let transparency = DEFAULT_UI_GLASS_SETTINGS.transparency;
  let lensScale = DEFAULT_UI_GLASS_SETTINGS.lensScale;
  try {
    const rawMode = localStorage.getItem(STORAGE_KEYS.UI_GLASS_MODE);
    if (rawMode === 'off' || rawMode === 'tint' || rawMode === 'glass') mode = rawMode;
    const rawTrans = Number(localStorage.getItem(STORAGE_KEYS.UI_OPACITY));
    if (Number.isFinite(rawTrans) && rawTrans >= 10 && rawTrans <= 90 && rawTrans !== 55 && rawTrans !== 76) {
      transparency = rawTrans;
    }
    const rawScale = Number(localStorage.getItem(STORAGE_KEYS.UI_LENS_SCALE));
    if (Number.isFinite(rawScale) && rawScale >= 0 && rawScale <= 180 && rawScale !== 112 && rawScale !== 120) {
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
const XLINK_NS = 'http://www.w3.org/1999/xlink';

let cachedSvgBackdropSupport: boolean | null = null;

/**
 * Detect whether the browser supports `backdrop-filter: url(#svgFilterId)` (Chromium desktop & Android).
 * Matches `checkLiquidGlassSupport()` in `sonth87/liquid-glass` and `Ns()` in `pmp-mindmap.vercel.app`.
 */
export function supportsSvgBackdropFilter(): boolean {
  if (cachedSvgBackdropSupport !== null) return cachedSvgBackdropSupport;
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const isChromium =
    ((window as { chrome?: unknown }).chrome !== undefined ||
      navigator.vendor === 'Google Inc.' ||
      /Chrome|Chromium|Edg|Arc|Brave/i.test(ua)) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  if (
    (!isChromium && /Safari/i.test(ua)) ||
    isFirefox ||
    typeof CSS === 'undefined' ||
    typeof CSS.supports !== 'function' ||
    !CSS.supports('backdrop-filter', 'url(#test)')
  ) {
    cachedSvgBackdropSupport = false;
    return false;
  }
  try {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    c.getContext('2d')?.getImageData(0, 0, 1, 1);
    cachedSvgBackdropSupport = true;
  } catch {
    cachedSvgBackdropSupport = false;
  }
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
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function resolveSurfaceRadius(el: HTMLElement, w: number, h: number): number {
  const minDim = Math.min(w, h);
  const computed = getComputedStyle(el);
  const raw = computed.borderTopLeftRadius || '18px';
  const v = parseFloat(raw) || 0;
  const px = raw.trim().endsWith('%') ? (v / 100) * minDim : v;
  return Math.max(2, Math.min(Math.round(px), Math.floor(minDim / 2)));
}

const displacementUrlCache = new Map<string, string>();

/**
 * Generates the exact 2D normal-map displacement data URL from `sonth87/liquid-glass`
 * (`src/core/liquidGlassRefraction.ts` & `pmp-mindmap.vercel.app`):
 * - Step 1: X-axis Red linear gradient `rgb(0,0,0)` -> `rgb(255,0,0)`
 * - Step 2: Y-axis Blue linear gradient `rgb(0,0,0)` -> `rgb(0,0,255)` with `difference` composite
 * - Step 3: Blurred center plateau `rgba(128, 128, 128, 0.93)` creating a flat crystal center + curved lens bezel
 */
export function generateLensDisplacementDataUrl(
  width: number,
  height: number,
  radius: number,
  border = 0.07,
  mapBlur?: number,
): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w <= 0 || h <= 0) return '';
  const minDim = Math.min(w, h);
  const r = Math.max(2, Math.min(Math.round(radius), Math.floor(minDim / 2)));
  // Scale mapBlur proportionally on compact pill bars (e.g. 36px height on mobile) so the Gaussian kernel
  // does not wash out the center 128 gray plateau, while using the full 12px blur on panels/popovers.
  const resolvedBlur = mapBlur ?? Math.min(12, Math.max(2.5, Math.round(minDim * 0.12 * 10) / 10));
  const key = `${w}x${h}:${r}:${border.toFixed(3)}:${resolvedBlur.toFixed(1)}`;
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
  gx.addColorStop(0, 'rgb(0, 0, 0)');
  gx.addColorStop(1, 'rgb(255, 0, 0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, w, h);

  // 2. Y-axis Blue gradient (0..255 in B, keeping R independent via 'difference')
  const gy = ctx.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgb(0, 0, 0)');
  gy.addColorStop(1, 'rgb(0, 0, 255)');
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, w, h);

  // 3. Center neutral gray 128 plateau (0.93 alpha retains 7% convex curvature across the lens interior)
  ctx.globalCompositeOperation = 'source-over';
  const inset = Math.min(minDim * 0.22, Math.max(2.5, border * minDim));
  ctx.filter = `blur(${Math.max(1, resolvedBlur)}px)`;
  ctx.fillStyle = 'rgba(128, 128, 128, 0.93)';
  const innerRadius = Math.max(r - inset, 2);
  drawRoundedRectPath(
    ctx,
    inset,
    inset,
    Math.max(1, w - inset * 2),
    Math.max(1, h - inset * 2),
    innerRadius,
  );
  ctx.fill();
  ctx.filter = 'none';

  const url = canvas.toDataURL();
  if (displacementUrlCache.size > 80) {
    const oldest = displacementUrlCache.keys().next().value;
    if (oldest) displacementUrlCache.delete(oldest);
  }
  displacementUrlCache.set(key, url);
  return url;
}

/**
 * Ensures a renderable `<svg width="0" height="0"><defs>` exists in `document.body`.
 * Exact match to `ensureDefs` in `sonth87/liquid-glass/src/core/liquidGlassRefraction.ts`:
 * No `display:none`, `z-index:-1`, or `overflow:hidden` so mobile Chromium always rasterizes `<feImage>`.
 */
function ensureSharedSvgDefs(): SVGDefsElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  let svg = document.getElementById('city3d-liquid-glass-defs') as SVGSVGElement | null;
  if (!svg || !svg.isConnected) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'city3d-liquid-glass-defs';
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.style.pointerEvents = 'none';
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }
  return svg.querySelector('defs');
}

interface SurfaceFilterParts {
  id: string;
  filter: SVGFilterElement;
  feImage: SVGFEImageElement;
  disps: [SVGFEDisplacementMapElement, SVGFEDisplacementMapElement, SVGFEDisplacementMapElement];
  lastMapKey: string;
  lastScaleKey: string;
}

const CHANNEL_MATRICES = [
  { name: 'red', matrix: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
  { name: 'green', matrix: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
  { name: 'blue', matrix: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' },
] as const;

let nextSurfaceUid = 1;
const surfaceFilters = new WeakMap<HTMLElement, SurfaceFilterParts>();

/**
 * Builds the 3-pass R-G-B chromatic aberration SVG `<filter>` using `document.createElementNS`
 * (`buildFilter` in `sonth87/liquid-glass/src/core/liquidGlassRefraction.ts`).
 */
function ensureSurfaceFilterParts(el: HTMLElement): SurfaceFilterParts | null {
  const defs = ensureSharedSvgDefs();
  if (!defs) return null;

  const existing = surfaceFilters.get(el);
  if (existing && existing.filter.isConnected) {
    return existing;
  }

  const id = existing?.id ?? `optical-glass-filter-${nextSurfaceUid++}`;
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%');
  filter.setAttribute('height', '100%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feImage = document.createElementNS(SVG_NS, 'feImage');
  feImage.setAttribute('x', '0');
  feImage.setAttribute('y', '0');
  feImage.setAttribute('result', 'displacement_map');
  feImage.setAttribute('preserveAspectRatio', 'none');
  filter.appendChild(feImage);

  const disps: SVGFEDisplacementMapElement[] = [];
  for (let i = 0; i < 3; i++) {
    const ch = CHANNEL_MATRICES[i]!;
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'displacement_map');
    disp.setAttribute('scale', '0');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'B');
    disp.setAttribute('result', `disp_${ch.name}`);
    filter.appendChild(disp);
    disps.push(disp);

    const cm = document.createElementNS(SVG_NS, 'feColorMatrix');
    cm.setAttribute('in', `disp_${ch.name}`);
    cm.setAttribute('type', 'matrix');
    cm.setAttribute('values', ch.matrix);
    cm.setAttribute('result', `${ch.name}_only`);
    filter.appendChild(cm);
  }

  const blend1 = document.createElementNS(SVG_NS, 'feBlend');
  blend1.setAttribute('in', 'red_only');
  blend1.setAttribute('in2', 'green_only');
  blend1.setAttribute('mode', 'screen');
  blend1.setAttribute('result', 'blend_rg');
  filter.appendChild(blend1);

  const blend2 = document.createElementNS(SVG_NS, 'feBlend');
  blend2.setAttribute('in', 'blend_rg');
  blend2.setAttribute('in2', 'blue_only');
  blend2.setAttribute('mode', 'screen');
  filter.appendChild(blend2);

  defs.appendChild(filter);
  const parts: SurfaceFilterParts = {
    id,
    filter,
    feImage,
    disps: disps as [SVGFEDisplacementMapElement, SVGFEDisplacementMapElement, SVGFEDisplacementMapElement],
    lastMapKey: '',
    lastScaleKey: '',
  };
  surfaceFilters.set(el, parts);
  return parts;
}

function setBackdropFilterBoth(el: HTMLElement, value: string): void {
  const styleWithWebkit = el.style as CSSStyleDeclaration & { webkitBackdropFilter?: string };
  if (el.style.backdropFilter !== value) {
    el.style.backdropFilter = value;
  }
  if (styleWithWebkit.webkitBackdropFilter !== value) {
    styleWithWebkit.webkitBackdropFilter = value;
    el.style.setProperty('-webkit-backdrop-filter', value);
  }
}

function applyLensToSurfaceElement(el: HTMLElement, settings: UiGlassSettings, canUseSvgLens: boolean): void {
  if (settings.mode === 'off') {
    el.classList.remove('lg-fallback');
    setBackdropFilterBoth(el, 'none');
    return;
  }

  if (settings.mode === 'tint') {
    el.classList.remove('lg-fallback');
    setBackdropFilterBoth(el, 'blur(12px) saturate(1.5)');
    return;
  }

  // mode === 'glass'
  if (!canUseSvgLens) {
    el.classList.add('lg-fallback');
    setBackdropFilterBoth(el, 'blur(16px) saturate(1.8)');
    return;
  }

  const w = el.offsetWidth || Math.round(el.getBoundingClientRect().width);
  const h = el.offsetHeight || Math.round(el.getBoundingClientRect().height);
  if (w < 12 || h < 12) {
    setBackdropFilterBoth(el, 'blur(12px) saturate(1.5)');
    return;
  }

  const parts = ensureSurfaceFilterParts(el);
  if (!parts) {
    el.classList.add('lg-fallback');
    setBackdropFilterBoth(el, 'blur(16px) saturate(1.8)');
    return;
  }

  const r = resolveSurfaceRadius(el, w, h);
  const mapKey = `${w}x${h}:${r}`;
  if (parts.lastMapKey !== mapKey) {
    const mapUrl = generateLensDisplacementDataUrl(w, h, r);
    if (mapUrl) {
      parts.feImage.setAttribute('href', mapUrl);
      parts.feImage.setAttributeNS(XLINK_NS, 'xlink:href', mapUrl);
      parts.feImage.setAttribute('width', String(w));
      parts.feImage.setAttribute('height', String(h));
      parts.lastMapKey = mapKey;
    }
  }

  const scale = -Math.abs(settings.lensScale);
  const chroma = Math.max(5, Math.round(Math.abs(settings.lensScale) * 0.055));
  const scaleKey = `${scale}:${chroma}`;
  if (parts.lastScaleKey !== scaleKey) {
    const scales: [number, number, number] = [scale, scale + chroma, scale + chroma * 2];
    parts.disps[0].setAttribute('scale', String(scales[0]));
    parts.disps[1].setAttribute('scale', String(scales[1]));
    parts.disps[2].setAttribute('scale', String(scales[2]));
    parts.lastScaleKey = scaleKey;
  }

  el.classList.remove('lg-fallback');
  const backdrop = `url(#${parts.id}) blur(4px) saturate(1.5)`;
  setBackdropFilterBoth(el, backdrop);
}

let sharedSurfaceObserver: ResizeObserver | null = null;
let sharedMutationObserver: MutationObserver | null = null;
let observedRootEl: HTMLElement | null = null;
let currentRootEl: HTMLElement | null = null;
let currentSettings: UiGlassSettings = DEFAULT_UI_GLASS_SETTINGS;
let rafRefreshId = 0;

function scheduleSurfaceRefresh(target?: HTMLElement): void {
  const canUseSvgLens =
    currentSettings.mode === 'glass' && supportsSvgBackdropFilter() && currentSettings.lensScale > 0;
  if (target) {
    applyLensToSurfaceElement(target, currentSettings, canUseSvgLens);
    return;
  }
  if (rafRefreshId) cancelAnimationFrame(rafRefreshId);
  rafRefreshId = requestAnimationFrame(() => {
    rafRefreshId = 0;
    if (currentRootEl) {
      applyUiGlassToRoot(currentRootEl, currentSettings);
    }
  });
}

function ensureSurfaceResizeObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null;
  if (!sharedSurfaceObserver) {
    sharedSurfaceObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (target && target.classList?.contains('ui-surface')) {
          scheduleSurfaceRefresh(target);
        }
      }
    });
  }
  return sharedSurfaceObserver;
}

function ensureRootMutationObserver(rootEl: HTMLElement): void {
  if (typeof MutationObserver === 'undefined') return;
  if (observedRootEl === rootEl && sharedMutationObserver) return;
  if (sharedMutationObserver) sharedMutationObserver.disconnect();
  observedRootEl = rootEl;
  sharedMutationObserver = new MutationObserver(mutations => {
    let hasNewSurface = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('ui-surface') || node.querySelector('.ui-surface')) {
            hasNewSurface = true;
            break;
          }
        }
      }
      if (hasNewSurface) break;
    }
    if (hasNewSurface) {
      scheduleSurfaceRefresh();
    }
  });
  sharedMutationObserver.observe(rootEl, { childList: true, subtree: true });
}

/**
 * Applies the current `UiGlassSettings` to the root document and all `.ui-surface` elements.
 * Matches `pmp-mindmap.vercel.app` & `sonth87/liquid-glass`:
 * - `mode === 'off'`: 100% opaque `--panel`, no backdrop-filter.
 * - `mode === 'tint'`: high-opacity frosted blur (~88%–90% opaque by default, much more opaque/frosted than `glass`).
 * - `mode === 'glass'`: crystal-clear (~35%–38% opaque by default) Apple Optical Lens SVG refraction on every `.ui-surface`.
 */
export function applyUiGlassToRoot(rootEl: HTMLElement | null, settings: UiGlassSettings): void {
  if (typeof document === 'undefined') return;
  currentRootEl = rootEl;
  currentSettings = settings;

  const docEl = document.documentElement;
  docEl.dataset.uiGlass = settings.mode;

  // In 'glass' mode, default transparency=65 -> 0.35 base opacity (matching pmp-mindmap.vercel.app's 0.35 / 0.38).
  // In 'tint' mode, 'tint' is ALWAYS much more frosted/opaque than 'glass' (default transparency=65 -> 0.89 opacity,
  // matching pmp-mindmap.vercel.app's 0.88 light / 0.90 dark).
  const glassOpacity = Math.max(0.10, Math.min(0.85, (100 - settings.transparency) / 100));
  const tintOpacity = Math.max(0.74, Math.min(0.95, 0.98 - (settings.transparency / 100) * 0.14));
  const activeAlpha = settings.mode === 'off' ? 1 : settings.mode === 'tint' ? tintOpacity : glassOpacity;

  docEl.style.setProperty('--ui-glass-alpha', glassOpacity.toFixed(2));
  docEl.style.setProperty('--ui-tint-alpha', tintOpacity.toFixed(2));
  docEl.style.setProperty('--ui-fill-alpha', `${Math.round(activeAlpha * 100)}%`);

  if (!rootEl) return;
  ensureRootMutationObserver(rootEl);

  const surfaces = rootEl.querySelectorAll<HTMLElement>('.ui-surface');
  const canUseSvgLens = settings.mode === 'glass' && supportsSvgBackdropFilter() && settings.lensScale > 0;
  const ro = ensureSurfaceResizeObserver();

  surfaces.forEach(el => {
    if (ro) ro.observe(el);
    applyLensToSurfaceElement(el, settings, canUseSvgLens);
  });
}

export function refreshActiveUiGlass(): void {
  if (currentRootEl) {
    applyUiGlassToRoot(currentRootEl, currentSettings);
  }
}
