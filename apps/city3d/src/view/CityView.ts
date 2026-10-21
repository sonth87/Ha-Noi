/* CityView: owns the three.js scene of a City in the browser (M3). React only reads its snapshot
   (useSyncExternalStore) and calls its methods; the snapshot changes on meaningful events and at
   most twice a second for the fps, never per frame.

   Camera (ADR-032): one orthographic camera, two modes.
     2D  — true isometric (elevation asin(1/√3) ≈ 35.26°), locked to the 4 views 45° + 90°·k, which
           are the old SVG app's views; Q / E turn 90°; zoom and pan only.
     3D  — free orbit (OrbitControls), zoom, pan. Back to 2D snaps to the nearest view.
   Colours are the theme tokens read from CSS; lit windows are the accent and glow (bloom) in the
   dark theme only. Lifecycle: mount(host) / unmount() pair cleanly (React StrictMode mounts twice). */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { hash, type City } from '@my-city/core';
import { buildCityGeometry, type CityGeometry } from '@render/city';
import type { Surface } from '@render/batch';
import { loadQuality, saveQuality, type Quality } from './quality';

export type Mode = '2d' | '3d';
export type Theme = 'dark' | 'light';

export interface Snapshot {
  mode: Mode;
  /** nearest of the 4 isometric views */
  view: 0 | 1 | 2 | 3;
  /** camera heading, degrees (0 = view 0) */
  heading: number;
  theme: Theme;
  night: boolean;
  quality: Quality;
  fps: number;
  lit: number;
  floors: number;
  stats: CityGeometry['stats'];
}

const ISO_EL = Math.asin(1 / Math.sqrt(3));
const FRUSTUM = 300;   // metres tall at zoom 1
const azOf = (k: number) => Math.PI / 4 - (k * Math.PI) / 2;

const SURFACE_TOKEN: Record<Surface, string> = {
  ground: '--body', wall: '--body', roof: '--deck', glass: '--glass', road: '--recess', walk: '--deck',
  marking: '--line', grass: '--panel', water: '--glass', pitch: '--recess', plaza: '--deck',
};

export class CityView {
  readonly geo: CityGeometry;
  private snap: Snapshot;
  private readonly listeners = new Set<() => void>();
  private lit = new Set<string>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private mounted: {
    host: HTMLElement; renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.OrthographicCamera; controls: OrbitControls;
    composer: EffectComposer; bloom: UnrealBloomPass; surfaces: Map<Surface, THREE.Mesh>; shell: THREE.Mesh; creases: LineSegments2; details: LineSegments2;
    windows: THREE.Mesh; beacons: THREE.Mesh[]; stop: () => void;
  } | null = null;
  private turn: { a0: number; a1: number; e0: number; e1: number; t0: number } | null = null;
  private readonly mats = {
    surface: new Map<Surface, THREE.MeshBasicMaterial>(),
    shell: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, res: { value: new THREE.Vector2(1, 1) } },
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
    }),
    crease: new LineMaterial({ linewidth: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    detail: new LineMaterial({ linewidth: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    windows: new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    beaconOn: new THREE.MeshBasicMaterial(),
    beaconOff: new THREE.MeshBasicMaterial(),
  };
  private colors = { off: new THREE.Color(), on: new THREE.Color() };

  constructor(readonly city: City) {
    this.geo = buildCityGeometry(city);
    let theme: Theme = 'dark';
    try { if (localStorage.getItem('city3d-theme') === 'light') theme = 'light'; } catch { /* default */ }
    this.snap = { mode: '2d', view: 0, heading: 0, theme, night: false, quality: loadQuality(), fps: 0, lit: 0, floors: this.geo.floors.length, stats: this.geo.stats };
  }

  // ---------- store ----------
  readonly getSnapshot = () => this.snap;
  readonly subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(p: Partial<Snapshot>) { this.snap = { ...this.snap, ...p }; this.listeners.forEach(f => f()); }

  // ---------- lifecycle ----------
  mount(host: HTMLElement) {
    if (this.mounted) this.unmount();
    const q = this.snap.quality;
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    const onLost = (e: Event) => e.preventDefault();   // let the browser restore the context; three re-uploads everything
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
    const { x0, y0, x1, y1 } = this.city.bounds, target = new THREE.Vector3((x0 + x1) / 2, 0, (y0 + y1) / 2);
    camera.zoom = 1.4;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.minZoom = 0.5; controls.maxZoom = 40;
    controls.minPolarAngle = 0.05; controls.maxPolarAngle = 1.45;
    this.place(camera, controls, azOf(this.snap.view), ISO_EL);

    const surfaces = new Map<Surface, THREE.Mesh>();
    for (const [s, g] of this.geo.surfaces) {
      const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      this.mats.surface.set(s, m);
      const mesh = new THREE.Mesh(g, m);
      mesh.userData.surface = s;
      surfaces.set(s, mesh);
      scene.add(mesh);
    }
    const shell = new THREE.Mesh(this.geo.shell, this.mats.shell);
    const creases = new LineSegments2(this.geo.creases, this.mats.crease);
    const details = new LineSegments2(this.geo.details, this.mats.detail);
    const windows = new THREE.Mesh(this.geo.windows, this.mats.windows);
    for (const o of [shell, creases, details, windows]) { o.frustumCulled = false; scene.add(o); }
    const beacons = this.geo.beacons.map(p => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), this.mats.beaconOff); b.position.copy(p); scene.add(b); return b; });

    const composer = new EffectComposer(renderer);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.35, 0.5);

    // input: a click (not a drag) lights or darkens the floor under it
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const pickable = (['wall', 'glass', 'roof'] as Surface[]).map(s => surfaces.get(s)).filter((m): m is THREE.Mesh => !!m);
      const hit = ray.intersectObjects(pickable, false)[0];
      if (!hit || hit.faceIndex == null) return;
      const owner = this.geo.ownerOf(hit.object.userData.surface as Surface, hit.faceIndex);
      const floor = owner && this.geo.floorAt(owner, hit.point);
      if (floor) this.setLamp(floor, !this.lit.has(floor));
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight, a = w / Math.max(1, h);
      renderer.setSize(w, h);
      this.mounted?.composer.setSize(w, h);
      camera.left = (-FRUSTUM * a) / 2; camera.right = (FRUSTUM * a) / 2; camera.top = FRUSTUM / 2; camera.bottom = -FRUSTUM / 2;
      camera.updateProjectionMatrix();
      const res = renderer.getDrawingBufferSize(new THREE.Vector2());
      this.mats.crease.resolution.copy(res); this.mats.detail.resolution.copy(res);
      (this.mats.shell.uniforms.res!.value as THREE.Vector2).copy(res);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0, frames = 0, t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      this.animate(now);
      controls.update();
      const blink = this.snap.night && Math.floor(now / 700) % 2 === 0;
      for (const b of beacons) b.material = blink ? this.mats.beaconOn : this.mats.beaconOff;
      this.mounted?.composer.render();
      frames++;
      if (now - t0 > 500) {
        const fps = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now;
        const az = Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);
        const heading = Math.round((((((Math.PI / 4 - az) * 180) / Math.PI) % 360) + 360) % 360);
        const view = ((Math.round(heading / 90) % 4) + 4) % 4 as Snapshot['view'];
        if (fps !== this.snap.fps || heading !== this.snap.heading || view !== this.snap.view) this.update({ fps, heading, view });
      }
    };
    raf = requestAnimationFrame(tick);

    this.mounted = {
      host, renderer, scene, camera, controls, composer, bloom, surfaces, shell, creases, details, windows, beacons,
      stop: () => {
        cancelAnimationFrame(raf); ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointerup', onUp);
        renderer.domElement.removeEventListener('webglcontextlost', onLost);
      },
    };
    this.applyMode(this.snap.mode, false);
    this.applyQuality(this.snap.quality);
    this.applyTheme(this.snap.theme);
    resize();
  }

  unmount() {
    const m = this.mounted;
    if (!m) return;
    m.stop();
    this.timers.forEach(clearTimeout); this.timers = [];
    m.controls.dispose(); m.composer.dispose(); m.renderer.dispose();
    m.renderer.domElement.remove();
    this.mounted = null;
  }

  // ---------- commands ----------
  setMode(mode: Mode) { this.update({ mode }); this.applyMode(mode, true); }
  toggleMode() { this.setMode(this.snap.mode === '2d' ? '3d' : '2d'); }

  /** turn by 90° (2D) — in 3D, turn too, keeping the tilt */
  rotate(dir: 1 | -1) {
    const m = this.mounted;
    if (!m) return;
    const az = this.azimuth(), k = Math.round((Math.PI / 4 - az) / (Math.PI / 2)) + dir;
    this.startTurn(azOf(k), this.snap.mode === '2d' ? ISO_EL : this.elevation());
  }

  setTheme(theme: Theme) {
    this.update({ theme });
    try { localStorage.setItem('city3d-theme', theme); } catch { /* not remembered */ }
    this.applyTheme(theme);
  }
  toggleTheme() { this.setTheme(this.snap.theme === 'dark' ? 'light' : 'dark'); }

  setQuality(q: Quality) { this.update({ quality: q }); saveQuality(q); this.applyQuality(q); }

  /** night: the city lights up floor by floor (about 7 floors in 10, the same ones every time) */
  setNight(night: boolean) {
    this.timers.forEach(clearTimeout); this.timers = [];
    if (!night) for (const f of this.geo.floors) this.setLamp(f, false, false);
    this.update({ night, lit: this.lit.size });
    if (!night) return;
    // 60 waves, 30 ms apart; one snapshot update per wave
    const waves: string[][] = Array.from({ length: 60 }, () => []);
    this.geo.floors.forEach((f, i) => { if (hash(f) % 10 < 7) waves[i % 60]!.push(f); });
    waves.forEach((wave, k) => this.timers.push(setTimeout(() => { for (const f of wave) this.setLamp(f, true, false); this.update({ lit: this.lit.size }); }, k * 30)));
  }
  toggleNight() { this.setNight(!this.snap.night); }

  /** everything on, or everything off when anything is on */
  toggleAll() {
    const on = this.lit.size === 0;
    for (const f of this.geo.floors) this.setLamp(f, on, false);
    this.update({ lit: this.lit.size });
  }

  key(e: KeyboardEvent): boolean {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    switch (e.key.toLowerCase()) {
      case 'v': this.toggleMode(); return true;
      case 'q': this.rotate(-1); return true;
      case 'e': this.rotate(1); return true;
      case 'n': this.toggleNight(); return true;
      case 't': this.toggleTheme(); return true;
      case ' ': this.toggleAll(); return true;
      default: return false;
    }
  }

  // ---------- internals ----------
  private setLamp(id: string, on: boolean, notify = true) {
    if (on) this.lit.add(id); else this.lit.delete(id);
    this.paint(id);
    if (notify) this.update({ lit: this.lit.size });
  }

  private paint(id: string) {
    const ranges = this.geo.lamps.get(id);
    if (!ranges) return;
    const attr = this.geo.windows.getAttribute('color') as THREE.BufferAttribute, c = this.lit.has(id) ? this.colors.on : this.colors.off;
    for (const r of ranges) for (let v = r.start; v < r.start + r.count; v++) attr.setXYZ(v, c.r, c.g, c.b);
    attr.needsUpdate = true;
  }

  private applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    const css = getComputedStyle(document.documentElement);
    const tok = (n: string) => new THREE.Color(css.getPropertyValue(n).trim() || '#ff00ff');
    for (const [s, m] of this.mats.surface) m.color = tok(SURFACE_TOKEN[s]);
    (this.mats.shell.uniforms.color!.value as THREE.Color).copy(tok('--line'));
    this.mats.crease.color = tok('--line');
    this.mats.detail.color = tok('--detail');
    this.colors.off = tok('--recess');
    this.colors.on = tok('--accent');
    this.mats.beaconOn.color = tok('--accent-hi');
    this.mats.beaconOff.color = tok('--line');
    const attr = this.geo.windows.getAttribute('color') as THREE.BufferAttribute;
    for (let v = 0; v < attr.count; v++) attr.setXYZ(v, this.colors.off.r, this.colors.off.g, this.colors.off.b);
    for (const id of this.lit) this.paint(id);
    attr.needsUpdate = true;
    if (this.mounted) this.mounted.scene.background = tok('--bg');
    this.applyBloom();
  }

  private applyQuality(q: Quality) {
    const m = this.mounted;
    if (!m) return;
    m.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    // the composer's render target carries the multisampling; rebuild it on change
    const w = m.host.clientWidth, h = m.host.clientHeight;
    m.composer.dispose();
    const target = new THREE.WebGLRenderTarget(1, 1, { samples: q.msaa ? 4 : 0, type: THREE.HalfFloatType });
    m.composer = new EffectComposer(m.renderer, target);
    m.composer.addPass(new RenderPass(m.scene, m.camera));
    m.composer.addPass(m.bloom);
    m.composer.addPass(new OutputPass());
    m.composer.setSize(w, h);
    m.shell.visible = q.silhouette;
    m.creases.visible = q.creases;
    m.details.visible = q.details;
    m.windows.visible = q.windows;
    const res = m.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.mats.crease.resolution.copy(res); this.mats.detail.resolution.copy(res);
    (this.mats.shell.uniforms.res!.value as THREE.Vector2).copy(res);
    this.applyBloom();
  }

  private applyBloom() { if (this.mounted) this.mounted.bloom.enabled = this.snap.quality.bloom && this.snap.theme === 'dark'; }

  private applyMode(mode: Mode, animate: boolean) {
    const m = this.mounted;
    if (!m) return;
    m.controls.enableRotate = mode === '3d';
    if (mode === '2d') {
      const k = Math.round((Math.PI / 4 - this.azimuth()) / (Math.PI / 2));
      if (animate) this.startTurn(azOf(k), ISO_EL); else this.place(m.camera, m.controls, azOf(k), ISO_EL);
    }
  }

  private azimuth() { const m = this.mounted!; return Math.atan2(m.camera.position.z - m.controls.target.z, m.camera.position.x - m.controls.target.x); }
  private elevation() { const m = this.mounted!, d = m.camera.position.clone().sub(m.controls.target); return Math.asin(d.y / d.length()); }

  private startTurn(a1: number, e1: number) {
    let a0 = this.azimuth();
    // the short way round
    while (a1 - a0 > Math.PI) a0 += 2 * Math.PI;
    while (a0 - a1 > Math.PI) a0 -= 2 * Math.PI;
    this.turn = { a0, a1, e0: this.elevation(), e1, t0: performance.now() };
  }

  private animate(now: number) {
    const m = this.mounted, t = this.turn;
    if (!m || !t) return;
    const u = Math.min(1, (now - t.t0) / 450), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    this.place(m.camera, m.controls, t.a0 + (t.a1 - t.a0) * e, t.e0 + (t.e1 - t.e0) * e);
    if (u >= 1) this.turn = null;
  }

  private place(camera: THREE.OrthographicCamera, controls: OrbitControls, az: number, el: number) {
    const R = 1000, c = controls.target;
    camera.position.set(c.x + R * Math.cos(el) * Math.cos(az), c.y + R * Math.sin(el), c.z + R * Math.cos(el) * Math.sin(az));
    camera.lookAt(c);
  }
}
