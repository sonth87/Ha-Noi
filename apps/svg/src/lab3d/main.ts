/* 3D lab page (ADR-031, experiment): free orbit over the crossroads in three.js, beside the SVG
   drawing of the two towers at the nearest of the four SVG views, to judge whether the iso-glow
   look survives. Standalone page (lab-3d.html); the app does not import it. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import '@fontsource/dm-mono/400.css';
import '@iso/tokens.css';
import '@styles/city.css';
import { PALETTES, accentCss } from '@iso/palettes';
import { kernel } from '@iso/kernel';
import { crossroadsLayout } from '@core/crossroads';
import type { ViewK } from '@core/types';
import { buildCrossroads } from '@render/crossroads-scene';
import { composeScene } from '@render/scene';
import { buildCity, type Mats } from './build';

const root = document.documentElement;
root.dataset.accent = 'sodium';
let theme: 'dark' | 'light' = (() => { try { return localStorage.getItem('lab3d-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } })();
root.dataset.theme = theme;
document.head.insertAdjacentHTML('beforeend', `<style>${accentCss(PALETTES.city)}</style>`);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const view3d = $('view3d'), panel = $('svgpanel'), readout = $('readout');

// ---------- renderer, camera, controls ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view3d.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
const FRUSTUM = 36;                                   // three units tall at zoom 1 (= 360 m)
const target = new THREE.Vector3(0, 1.5, 0);
const ISO = new THREE.Vector3(1, 1, 1).normalize();   // true isometric, the SVG view 0
camera.position.copy(target).addScaledVector(ISO, 120);
camera.zoom = 1.6;
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minZoom = 0.6;
controls.maxZoom = 14;

const res = () => renderer.getDrawingBufferSize(new THREE.Vector2());
const lineOpts = { linewidth: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 };
const flat = (o: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide, ...o });
const shell = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color() }, res: { value: res() } },
  vertexShader: `uniform vec2 res;
    void main() {
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec4 n = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
      vec2 d = length(n.xy) > 1e-5 ? normalize(n.xy) : vec2(0.0);
      p.xy += d * 2.0 / res * p.w;
      gl_Position = p;
    }`,
  fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
  side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 24,
});
const M: Mats = {
  wall: flat(), top: flat(), glass: flat(), road: flat(), walk: flat(), ground: flat(),
  winOff: flat({ polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), winOn: flat({ polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
  shell, crease: new LineMaterial({ ...lineOpts, resolution: res() }), detail: new LineMaterial({ ...lineOpts, resolution: res() }),
};
const beaconOn = flat();

const cr = crossroadsLayout(20261021);
const city = buildCity(cr, M);
scene.add(city.root);

// ---------- theme: every colour is a token read from CSS ----------
const token = (name: string) => new THREE.Color(getComputedStyle(root).getPropertyValue(name).trim() || '#ff00ff');
function applyTheme() {
  root.dataset.theme = theme;
  scene.background = token('--bg');
  (M.wall as THREE.MeshBasicMaterial).color = token('--body');
  (M.top as THREE.MeshBasicMaterial).color = token('--deck');
  (M.glass as THREE.MeshBasicMaterial).color = token('--glass');
  (M.road as THREE.MeshBasicMaterial).color = token('--recess');
  (M.walk as THREE.MeshBasicMaterial).color = token('--deck');
  (M.winOff as THREE.MeshBasicMaterial).color = token('--recess');
  (M.winOn as THREE.MeshBasicMaterial).color = token('--accent');
  beaconOn.color = token('--accent-hi');
  shell.uniforms.color!.value = token('--line');
  M.crease.color = token('--line');
  M.detail.color = token('--detail');
  bloom.enabled = theme === 'dark';
  try { localStorage.setItem('lab3d-theme', theme); } catch { /* private mode */ }
  drawSvg(true);
}

// ---------- post: bloom only on what is lit (dark theme) ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.35, 0.5);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = view3d.clientWidth, h = view3d.clientHeight, a = w / h;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.left = (-FRUSTUM * a) / 2; camera.right = (FRUSTUM * a) / 2; camera.top = FRUSTUM / 2; camera.bottom = -FRUSTUM / 2;
  camera.updateProjectionMatrix();
  const r = res();
  M.crease.resolution.copy(r); M.detail.resolution.copy(r);
  shell.uniforms.res!.value = r;
}
new ResizeObserver(resize).observe(view3d);

// ---------- lights: click a floor / house, N night, space everything ----------
let night = false;
const setLamp = (id: string, on: boolean) => { const l = city.lamps.get(id); if (!l) return; l.on = on; l.mesh.material = on ? M.winOn : M.winOff; };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down: [number, number] | null = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;   // a drag, not a click
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(city.root, true).find(h => (h.object as THREE.Mesh).isMesh && !h.object.userData.outline && !(h.object as { isLineSegments2?: boolean }).isLineSegments2);
  const id = hit && city.pick(hit.object, hit.point.y);
  if (id) setLamp(id, !city.lamps.get(id)!.on);
});
function setNight(on: boolean) {
  night = on;
  const ids = [...city.lamps.keys()];
  ids.forEach((id, i) => {
    const tower = id.startsWith('TB/') || id.startsWith('NV/');
    const want = on && (tower ? (i * 7) % 10 < 8 : (i * 13) % 10 < 6);
    setTimeout(() => setLamp(id, want), on ? (i % 40) * 25 : 0);
  });
}

// ---------- rotation: free orbit, Q/E turn 90°, I snaps to the nearest isometric view ----------
let turn: { from: number; to: number; t0: number } | null = null;
const azimuth = () => Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);
function turnTo(to: number, iso = false) {
  turn = { from: azimuth(), to, t0: performance.now() };
  if (iso) isoPolar = true;
}
let isoPolar = false;
const nearestK = (): ViewK => (((Math.round((Math.PI / 4 - azimuth()) / (Math.PI / 2)) % 4) + 4) % 4) as ViewK;

// ---------- SVG beside it: the two towers at the nearest of the 4 SVG views ----------
let svgK: ViewK | -1 = -1;
const K = kernel(0, 0);
function drawSvg(force = false) {
  if (panel.hidden) return;
  const k = nearestK();
  if (k === svgK && !force) return;
  svgK = k;
  const items = buildCrossroads(K, cr, k, false).items.filter(i => /^(TB|NV):/.test(i.id));
  const c = composeScene(items);
  $('svgfig').innerHTML = `<svg class="stage" viewBox="${c.viewBox}" role="img" aria-label="Bản SVG, góc ${k}">${c.svg}</svg>`;
  $('svgcap').textContent = `SVG · góc ${k} (gần góc 3D nhất)`;
  document.querySelectorAll('#svgfig [data-floor]').forEach(el => el.classList.toggle('on', !!city.lamps.get((el as HTMLElement).dataset.floor!)?.on));
}

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'q') turnTo(azimuth() - Math.PI / 2);
  else if (k === 'e') turnTo(azimuth() + Math.PI / 2);
  else if (k === 'i') turnTo(Math.PI / 4 - nearestK() * (Math.PI / 2), true);
  else if (k === 'n') setNight(!night);
  else if (k === 't') { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); }
  else if (k === 'c') { panel.hidden = !panel.hidden; svgK = -1; drawSvg(); resize(); }
  else if (k === ' ') { const any = [...city.lamps.values()].some(l => l.on); city.lamps.forEach((_, id) => setLamp(id, !any)); }
  else return;
  e.preventDefault();
});
$('b-iso').onclick = () => turnTo(Math.PI / 4 - nearestK() * (Math.PI / 2), true);
$('b-night').onclick = () => setNight(!night);
$('b-theme').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); };
$('b-svg').onclick = () => { panel.hidden = !panel.hidden; svgK = -1; drawSvg(); resize(); };

// ---------- loop ----------
let frames = 0, fpsT = performance.now(), fps = 0;
function tick(now: number) {
  if (turn) {
    const t = Math.min(1, (now - turn.t0) / 450), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    let d = turn.to - turn.from;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const a = turn.from + d * e, off = camera.position.clone().sub(controls.target);
    const flatR = Math.hypot(off.x, off.z);
    let y = off.y, R = flatR;
    if (isoPolar) { const L = off.length(), want = Math.asin(1 / Math.sqrt(3)), cur = Math.asin(off.y / L), el = cur + (want - cur) * e; y = L * Math.sin(el); R = L * Math.cos(el); }
    camera.position.set(controls.target.x + R * Math.cos(a), controls.target.y + y, controls.target.z + R * Math.sin(a));
    if (t >= 1) { turn = null; isoPolar = false; }
  }
  controls.update();
  city.beacon.material = night && Math.floor(now / 700) % 2 === 0 ? beaconOn : M.winOff;
  composer.render();
  frames++;
  if (now - fpsT > 500) { fps = Math.round((frames * 1000) / (now - fpsT)); frames = 0; fpsT = now; }
  const deg = Math.round(((((45 - (azimuth() * 180) / Math.PI) % 360) + 360) % 360));
  const lit = [...city.lamps.values()].filter(l => l.on).length;
  readout.textContent = `xoay ${deg}° · gần góc svg ${nearestK()} · ${lit} đèn · ${fps} fps${night ? ' · đêm' : ''}`;
  drawSvg();
  requestAnimationFrame(tick);
}
resize();
applyTheme();
requestAnimationFrame(tick);
