/* Shared, multi-country 3D waving flag module (apps/city3d/src/render/flags.ts).
   - Flagpoles are drawn by each building/landmark according to its own architecture, while the
     waving flag cloth geometry and procedural flag textures are centralized and shared here.
   - Performance optimization:
     1. All flags share a small pool of unit-space cloth BufferGeometries (3 phase buckets) so even
        dozens of flags across the city only update at most 3 tiny vertex buffers once per frame.
     2. Visibility is gated to zoom views under 250 m (`MAX_FLAG_VIEW_SPAN_M = 250`): when zoomed out
        beyond 250 m, flag groups are hidden (`visible = false`) and cloth wave simulation is
        completely skipped (0 CPU vertex work, 0 GPU draw calls).
   - Multi-country & festival extensibility: supports `'vn'` (Vietnam national flag), `'festive'`
     (Vietnamese traditional 5-colour temple/pagoda festival flag), `'asean'`, `'fr'`, `'jp'`, `'kr'`,
     `'us'`, `'ru'`, and custom flags via `registerFlagPainter`. Pure (no DOM globals). */
import * as THREE from 'three';
import type { Vec2 } from '@my-city/core';

/** Maximum visible ground span (in metres) at which waving flags are shown and animated */
export const MAX_FLAG_VIEW_SPAN_M = 250;

export type FlagCountryCode =
  | 'vn'
  | 'festive'
  | 'asean'
  | 'fr'
  | 'jp'
  | 'kr'
  | 'us'
  | 'ru'
  | (string & {});

export type FlagPixelPainter = (
  u: number,
  v: number,
  px: number,
  py: number,
  W: number,
  H: number,
) => readonly [number, number, number];

export interface WavingFlagSpec {
  id: string;
  /** Hoist pole position [x, y] in city metres */
  polePos: Vec2;
  /** Bottom z (m) of the flag cloth on the pole */
  z0: number;
  /** Top z (m) of the flag cloth on the pole */
  z1: number;
  /** Width of the flag cloth along the wind direction (m) */
  width: number;
  /** Unit vector [ux, uy] in city (x, y) along which the flag flies */
  dir: Vec2;
  /** Phase offset (radians) for wave animation */
  phase: number;
  /** Flag country or traditional flag style (defaults to `'vn'`) */
  country?: FlagCountryCode;
}

export interface WavingFlagInstance {
  spec: WavingFlagSpec;
  group: THREE.Group;
  clothGeo: THREE.BufferGeometry;
  phaseBucket: number;
}

const FLAG_SEG_U = 20;
const FLAG_SEG_V = 12;
const PHASE_BUCKET_COUNT = 3;
const PHASE_OFFSETS = [0, 2.094, 4.188] as const;

const materialCache = new Map<string, THREE.MeshBasicMaterial>();
const customPainters = new Map<string, FlagPixelPainter>();
let sharedClothGeos: THREE.BufferGeometry[] | null = null;
let sharedFinialGeo: THREE.SphereGeometry | null = null;
let sharedGoldFinialMat: THREE.MeshBasicMaterial | null = null;
let lastSteppedTimeSec = -1;

/** Check whether a flag should be visible for a given camera ground span or distance (in metres) */
export function isFlagVisibleAtSpan(viewSpanM: number): boolean {
  return viewSpanM <= MAX_FLAG_VIEW_SPAN_M;
}

/** Register a custom procedural flag painter so new countries or emblems can be added dynamically */
export function registerFlagPainter(code: FlagCountryCode, painter: FlagPixelPainter): void {
  customPainters.set(code, painter);
  materialCache.delete(code);
}

/** Signed-distance alpha (0..1) for a 5-pointed star centered at (cx, cy) with outer radius R */
function starAlphaAt(px: number, py: number, cx: number, cy: number, outerR: number): number {
  const dx = px + 0.5 - cx;
  const dy = py + 0.5 - cy;
  const r = Math.hypot(dx, dy);
  if (r > outerR + 1.5) return 0;
  const innerR = outerR * (Math.sin(Math.PI / 10) / Math.sin((3 * Math.PI) / 10));
  const sector = (2 * Math.PI) / 5;
  const halfSector = sector / 2;
  const pOuterX = Math.sin(halfSector) * outerR;
  const pOuterY = Math.cos(halfSector) * outerR;
  const edgeDx = pOuterX;
  const edgeDy = pOuterY - innerR;
  const edgeLen = Math.hypot(edgeDx, edgeDy);
  let ang = Math.atan2(dx, dy);
  ang = ((ang % sector) + sector) % sector;
  const dAng = Math.abs(ang - halfSector);
  const qx = Math.sin(dAng) * r;
  const qy = Math.cos(dAng) * r;
  const sd = (edgeDx * (qy - innerR) - edgeDy * qx) / edgeLen;
  return Math.max(0, Math.min(1, 0.5 - sd / 1.15));
}

const BUILTIN_PAINTERS: Record<string, FlagPixelPainter> = {
  // Quốc kỳ Việt Nam (Cờ đỏ sao vàng)
  vn: (_u, _v, px, py, W, H) => {
    const a = starAlphaAt(px, py, W * 0.5, H * 0.5, H * 0.305);
    const isSleeve = px < 5;
    const r0 = isSleeve ? 168 : 218;
    const g0 = isSleeve ? 22 : 37;
    const b0 = isSleeve ? 18 : 29;
    return [
      Math.round(r0 + (255 - r0) * a),
      Math.round(g0 + (221 - g0) * a),
      Math.round(b0 + (0 - b0) * a),
    ];
  },

  // Cờ hội ngũ sắc truyền thống Việt Nam (Đền, Chùa, Đình, Miếu)
  festive: (u, v) => {
    const d = Math.max(Math.abs(u - 0.5) * 1.35, Math.abs(v - 0.5));
    if (d < 0.14) return [220, 38, 30]; // Trung tâm Đỏ
    if (d < 0.24) return [250, 204, 21]; // Vàng
    if (d < 0.34) return [22, 163, 74]; // Xanh lục
    if (d < 0.44) return [37, 99, 235]; // Xanh lam
    return [234, 88, 12]; // Viền cam đỏ
  },

  // Cờ ASEAN
  asean: (_u, _v, px, py, W, H) => {
    const dx = px + 0.5 - W * 0.5;
    const dy = py + 0.5 - H * 0.5;
    const r = Math.hypot(dx, dy);
    const rOuter = H * 0.28;
    if (r <= rOuter * 0.52 && Math.abs(dx) < rOuter * 0.28 && Math.abs(dy) < rOuter * 0.38) {
      return [248, 208, 32];
    }
    if (r <= rOuter * 0.88) return [220, 36, 31];
    if (r <= rOuter) return [250, 250, 252];
    return [0, 56, 147];
  },

  // Quốc kỳ Pháp (Blue - White - Red)
  fr: (u) => {
    if (u < 1 / 3) return [0, 38, 84];
    if (u < 2 / 3) return [248, 249, 252];
    return [237, 41, 57];
  },

  // Quốc kỳ Nhật Bản (Hinomaru)
  jp: (_u, _v, px, py, W, H) => {
    const r = Math.hypot(px + 0.5 - W * 0.5, py + 0.5 - H * 0.5);
    const discR = H * 0.3;
    const t = Math.max(0, Math.min(1, discR + 0.5 - r));
    return [
      Math.round(250 + (188 - 250) * t),
      Math.round(250 + (0 - 250) * t),
      Math.round(252 + (45 - 252) * t),
    ];
  },

  // Quốc kỳ Hàn Quốc (Taegeukgi)
  kr: (_u, _v, px, py, W, H) => {
    const dx = px + 0.5 - W * 0.5;
    const dy = py + 0.5 - H * 0.5;
    const r = Math.hypot(dx, dy);
    const R = H * 0.25;
    if (r <= R) {
      return dy >= 0 ? [205, 46, 58] : [0, 71, 160];
    }
    return [248, 249, 252];
  },

  // Quốc kỳ Hoa Kỳ
  us: (u, v) => {
    if (u < 0.42 && v > 7 / 13) return [10, 49, 97];
    const stripe = Math.floor(v * 13);
    return stripe % 2 === 0 ? [179, 25, 66] : [248, 249, 252];
  },

  // Quốc kỳ Liên bang Nga
  ru: (_u, v) => {
    if (v > 2 / 3) return [248, 249, 252];
    if (v > 1 / 3) return [0, 57, 166];
    return [213, 43, 30];
  },
};

/** Retrieve or build the shared procedural DataTexture material for a flag country/style code */
export function getFlagMaterial(country: FlagCountryCode = 'vn'): THREE.MeshBasicMaterial {
  const cached = materialCache.get(country);
  if (cached) return cached;

  const painter = customPainters.get(country) ?? BUILTIN_PAINTERS[country] ?? BUILTIN_PAINTERS.vn!;
  const W = 240;
  const H = 160;
  const data = new Uint8Array(W * H * 4);

  for (let py = 0; py < H; py++) {
    const v = (py + 0.5) / H;
    for (let px = 0; px < W; px++) {
      const u = (px + 0.5) / W;
      const [r, g, b] = painter(u, v, px, py, W, H);
      const idx = (py * W + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  materialCache.set(country, mat);
  return mat;
}

function getGoldFinialMaterial(): THREE.MeshBasicMaterial {
  if (!sharedGoldFinialMat) {
    sharedGoldFinialMat = new THREE.MeshBasicMaterial({ color: 0xffd700, toneMapped: false });
  }
  return sharedGoldFinialMat;
}

function getSharedFinialGeometry(): THREE.SphereGeometry {
  if (!sharedFinialGeo) {
    sharedFinialGeo = new THREE.SphereGeometry(0.36, 10, 8);
  }
  return sharedFinialGeo;
}

/** Build a single unit-space subdivided cloth BufferGeometry (u in [0..1], v in [0..1]) */
function buildUnitClothGeometry(): THREE.BufferGeometry {
  const cols = FLAG_SEG_U + 1;
  const rows = FLAG_SEG_V + 1;
  const vertCount = cols * rows;

  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  for (let iv = 0; iv <= FLAG_SEG_V; iv++) {
    const v = iv / FLAG_SEG_V;
    for (let iu = 0; iu <= FLAG_SEG_U; iu++) {
      const u = iu / FLAG_SEG_U;
      const idx = iv * cols + iu;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
      positions[idx * 3] = u;
      positions[idx * 3 + 1] = v;
      positions[idx * 3 + 2] = 0;
      colors[idx * 3] = 1;
      colors[idx * 3 + 1] = 1;
      colors[idx * 3 + 2] = 1;
    }
  }

  for (let iv = 0; iv < FLAG_SEG_V; iv++) {
    for (let iu = 0; iu < FLAG_SEG_U; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

function getSharedClothGeometries(): THREE.BufferGeometry[] {
  if (!sharedClothGeos) {
    sharedClothGeos = Array.from({ length: PHASE_BUCKET_COUNT }, (_, b) => {
      const geo = buildUnitClothGeometry();
      updateUnitClothGeometry(geo, 0, PHASE_OFFSETS[b]!);
      return geo;
    });
  }
  return sharedClothGeos;
}

/** Update a unit-space cloth BufferGeometry in-place for a given time & phase offset */
function updateUnitClothGeometry(geo: THREE.BufferGeometry, timeSec: number, phaseOffset: number): void {
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;
  const cols = FLAG_SEG_U + 1;

  for (let iv = 0; iv <= FLAG_SEG_V; iv++) {
    const v = iv / FLAG_SEG_V;
    for (let iu = 0; iu <= FLAG_SEG_U; iu++) {
      const u = iu / FLAG_SEG_U;
      const idx = iv * cols + iu;

      const env = Math.pow(u, 1.15);
      const phase1 = u * 5.6 - timeSec * 6.8 + phaseOffset;
      const phase2 = u * 11.8 - timeSec * 12.6 + (v - 0.5) * 1.9 + phaseOffset * 1.7;

      // Normalized lateral wave displacement (scaled by flag width in world space)
      const w1 = Math.sin(phase1) * (0.082 * env);
      const w2 = Math.sin(phase2) * (0.025 * u * u);
      const latNorm = w1 + w2;

      // Normalized vertical flutter (scaled by flag height in world space)
      const dyNorm =
        Math.cos(u * 4.4 - timeSec * 5.5 + phaseOffset) * (0.034 * env) -
        0.016 * u * (1 - 0.35 * Math.sin(timeSec * 3.4 + phaseOffset));

      // Slight horizontal pull-back as the cloth bends in waves
      const pull = -0.048 * u * (0.6 + 0.4 * Math.sin(phase1) * Math.sin(phase1));
      const uDist = u + pull;

      posAttr.setXYZ(idx, uDist, v + dyNorm, latNorm);

      // Dynamic cloth ripple shading from wave slope
      const slope = Math.cos(phase1) * u + 0.35 * Math.cos(phase2) * u;
      const shade = Math.max(0.76, Math.min(1.04, 0.92 + 0.12 * slope));
      colAttr.setXYZ(idx, shade, shade, shade);
    }
  }
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
}

/** Build a 3D waving flag instance sharing unit cloth geometry + golden flagpole finial */
export function createWavingFlagGroup(spec: WavingFlagSpec): WavingFlagInstance {
  const geos = getSharedClothGeometries();
  const phaseBucket = Math.abs(Math.round(spec.phase * 10)) % PHASE_BUCKET_COUNT;
  const clothGeo = geos[phaseBucket]!;
  const mat = getFlagMaterial(spec.country ?? 'vn');

  const h = Math.max(0.5, spec.z1 - spec.z0);
  const mesh = new THREE.Mesh(clothGeo, mat);
  mesh.frustumCulled = false;
  // Position at hoist base (x = polePos[0], y = z0, z = polePos[1]) and orient +X along spec.dir
  mesh.position.set(spec.polePos[0], spec.z0, spec.polePos[1]);
  mesh.rotation.y = -Math.atan2(spec.dir[1], spec.dir[0]);
  mesh.scale.set(spec.width, h, spec.width);

  const finial = new THREE.Mesh(getSharedFinialGeometry(), getGoldFinialMaterial());
  finial.position.set(spec.polePos[0], spec.z1 + 0.42, spec.polePos[1]);

  const group = new THREE.Group();
  group.add(mesh, finial);

  return { spec, group, clothGeo, phaseBucket };
}

/** Step a single waving flag instance (updates its shared phase-bucket cloth geometry if time advanced) */
export function stepWavingFlag(inst: WavingFlagInstance, timeSec: number): void {
  updateUnitClothGeometry(inst.clothGeo, timeSec, PHASE_OFFSETS[inst.phaseBucket]!);
}

/** Efficiently update all shared waving flag cloth geometries at most once per frame when visible */
export function stepSharedWavingFlags(timeSec: number): void {
  if (Math.abs(timeSec - lastSteppedTimeSec) < 1e-4) return;
  lastSteppedTimeSec = timeSec;
  const geos = getSharedClothGeometries();
  for (let b = 0; b < PHASE_BUCKET_COUNT; b++) {
    updateUnitClothGeometry(geos[b]!, timeSec, PHASE_OFFSETS[b]!);
  }
}
