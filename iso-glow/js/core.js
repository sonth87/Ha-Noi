/* ============================================================
   iso gallery core: kernel, shared api, navigation.
   Figures register with FIGS.push({...}) — see CONTRACT below.
   ============================================================ */
// FIGS is declared inline in the page before the figure scripts

const ISO = (() => {
  const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
  function kernel(OX, OY) {
    const P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];
    const D = (x,y,z) => [(x-y)*C, (x+y)*S - z];
    const plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);
      return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };
    const TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);
    const FRONT = (x,y,z) => plane([x,y,z],[1,0,0],[0,0,-1]);
    const SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);
    const rect = (t,w,h,r=0,cls='face') => `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;
    const rounded = (x,y,z,w,d,h,r,cls) => {
      r = Math.min(r, w/2, d/2);
      const n = 10, z1 = z + h, q = Math.PI/4, H = Math.PI/2, c = cls ? ' ' + cls : '';
      const arc = (cx,cy,a0,a1) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1-a0)*i/n; o.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]); } return o; };
      const ring = [...arc(x+w-r,y+r,-H,0), ...arc(x+w-r,y+d-r,0,H), ...arc(x+r,y+d-r,H,2*H), ...arc(x+r,y+r,2*H,3*H)];
      const vis  = [...arc(x+w-r,y+r,-q,0), ...arc(x+w-r,y+d-r,0,H), ...arc(x+r,y+d-r,H,3*q)];
      const d3 = pts => 'M' + pts.map(p => P(...p).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z';
      const wall = [...vis.map(([a,b]) => [a,b,z]), ...vis.slice().reverse().map(([a,b]) => [a,b,z1])];
      return `<path class="face${c}" d="${d3(wall)}"/><path class="face top${c}" d="${d3(ring.map(([a,b]) => [a,b,z1]))}"/>`;
    };
    const box = (x,y,z,w,d,h,r=0) => r > 0 ? rounded(x,y,z,w,d,h,r,'') :
      rect(SIDE(x+w,y+d,z+h), d,h) + rect(FRONT(x,y+d,z+h), w,h) + rect(TOP(x,y,z+h), w,d,0,'face top');
    const boxc = (x,y,z,w,d,h,r,cls) => r > 0 ? rounded(x,y,z,w,d,h,r,cls) :
      rect(SIDE(x+w,y+d,z+h), d,h,0,'face '+cls) + rect(FRONT(x,y+d,z+h), w,h,0,'face '+cls) + rect(TOP(x,y,z+h), w,d,0,'face top '+cls);
    const path = pts => 'M' + pts.map(p => P(...p).map(n => n.toFixed(2)).join(' ')).join('L');
    return { C, S, P, D, plane, TOP, FRONT, SIDE, rect, box, boxc, path };
  }
  function frame(points, margin = 0.09, aspect = 4 / 3) {
    const d = points.map(([x,y,z]) => [(x-y)*C, (x+y)*S - z]);
    let x0 = Math.min(...d.map(p => p[0])), x1 = Math.max(...d.map(p => p[0]));
    let y0 = Math.min(...d.map(p => p[1])), y1 = Math.max(...d.map(p => p[1]));
    const m = margin * Math.max(x1 - x0, y1 - y0);
    let w = x1 - x0 + 2*m, h = y1 - y0 + 2*m;
    let ox = m - x0, oy = m - y0;
    if (w / h < aspect) { const nw = h * aspect; ox += (nw - w) / 2; w = nw; }
    else { const nh = w / aspect; oy += (nh - h) / 2; h = nh; }
    return { ...kernel(ox, oy), viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`, W: w, H: h };
  }
  const slits = (a0, a1, step, b0, b1, vertical = true, cls = 'detail') => {
    let s = ''; for (let a = a0; a <= a1 + 1e-6; a += step)
      s += vertical ? `<line class="${cls}" x1="${a}" y1="${b0}" x2="${a}" y2="${b1}"/>` : `<line class="${cls}" x1="${b0}" y1="${a}" x2="${b1}" y2="${a}"/>`;
    return s;
  };
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return { kernel, frame, slits, esc };
})();

/* ---------- shared audio (created on first user gesture) ---------- */
const AUDIO = (() => {
  let ctx = null, out = null, analyser = null;
  return () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createGain(); out.gain.value = 0.5;
      analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
      out.connect(analyser); analyser.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return { ctx, out, analyser };
  };
})();

/* ---------- app ---------- */
(function app() {
  const $ = id => document.getElementById(id);
  const holder = $('stageHolder'), readoutEl = $('readout'), hintEl = $('hint'), numEl = $('fignum'), nameEl = $('figname');
  const nav = $('nav'), selectEl = $('figSelect');
  let active = null, handle = null, timers = [], frames = [], idx = 0;

  const api = {
    iso: ISO,
    readout: s => { readoutEl.textContent = s; },
    hint: s => { hintEl.textContent = s; },
    audio: AUDIO,
    after: (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; },
    every: (ms, fn) => { const t = setInterval(fn, ms); timers.push(t); return t; },
    loop: fn => { let alive = true; const f = ts => { if (!alive) return; fn(ts); requestAnimationFrame(f); };
      requestAnimationFrame(f); const stop = () => { alive = false; }; frames.push(stop); return stop; },
    flash: (el, ms = 160) => { if (!el) return; el.classList.add('down', 'lit'); clearTimeout(el._f1); clearTimeout(el._f2);
      el._f1 = setTimeout(() => el.classList.remove('down'), 110); el._f2 = setTimeout(() => el.classList.remove('lit'), ms); },
    replay: (el, cls = 'go') => { if (!el) return; el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); },
    power: on => { holder.classList.toggle('glow', !!on); },
  };

  function mount(i) {
    if (handle && handle.unmount) handle.unmount();
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    frames.forEach(stop => stop()); frames = [];
    idx = (i + FIGS.length) % FIGS.length; active = FIGS[idx];
    holder.classList.remove('glow');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'stage'); svg.setAttribute('role', 'img'); svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', active.aria || active.name);
    svg.dataset.fig = active.id;
    holder.replaceChildren(svg);
    numEl.textContent = `Fig ${idx + 1}`; nameEl.textContent = active.name;
    hintEl.textContent = active.hint || ''; readoutEl.textContent = '';
    document.title = `Fig ${idx + 1} · ${active.name} · My City iso-glow`;
    [...nav.querySelectorAll('button[data-i]')].forEach(b => b.setAttribute('aria-current', +b.dataset.i === idx ? 'true' : 'false'));
    if (selectEl) selectEl.value = String(idx);
    const cur = nav.querySelector(`button[data-i="${idx}"]`);
    if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2, behavior: 'smooth' });
    if (location.hash.slice(1) !== active.id) history.replaceState(null, '', '#' + active.id);
    handle = active.mount(svg, api) || {};
    if (!/still/.test(location.search) && handle.demo) setTimeout(() => handle.demo(), 120);
  }

  // ---------- glow colour choice ----------
  const ACCENTS = [
    ['Sodium',   '#ff9a2e', '#ffc77a', '#ff9a2e', '#ffc77a'],
    ['Tungsten', '#ffd166', '#ffe7a8', '#ffd166', '#ffe7a8'],
    ['Neon',     '#ff4fa3', '#ff9fcb', '#ff4fa3', '#ff9fcb'],
    ['Signal',   '#3ee8a0', '#a3f5cf', '#3ee8a0', '#a3f5cf'],
    ['Dusk',     '#6f9dff', '#b5ccff', '#6f9dff', '#b5ccff'],
    ['Moon',     '#dfe7f5', '#ffffff', '#273246', '#3d4a61'],
  ];
  const vars = (a, hi, dark) => `--accent:${a}; --accent-hi:${hi}; --accent-dim:color-mix(in srgb, ${a} 10%, transparent);` +
    ` --glass-on:color-mix(in srgb, ${a} ${dark ? 9 : 12}%, ${dark ? '#101112' : '#eef0f0'});`;
  const accentCss = ACCENTS.map(([n, da, dh, la, lh]) => { const k = n.toLowerCase();
    return `:root[data-accent="${k}"] { ${vars(da, dh, true)} }
@media (prefers-color-scheme: light) { :root[data-accent="${k}"]:not([data-theme="dark"]) { ${vars(la, lh, false)} } }
:root[data-accent="${k}"][data-theme="light"] { ${vars(la, lh, false)} }`; }).join('\n');
  const accentStyle = document.createElement('style'); accentStyle.textContent = accentCss; document.head.appendChild(accentStyle);
  const sw = $('swatches');
  sw.innerHTML = ACCENTS.map(([n, da]) => `<button role="radio" data-accent="${n.toLowerCase()}" aria-label="${n}" title="${n}" style="--sw:${da}"><i></i></button>`).join('');
  function setAccent(k) {
    if (!ACCENTS.some(a => a[0].toLowerCase() === k)) k = 'sodium';
    document.documentElement.dataset.accent = k;
    sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', b.dataset.accent === k ? 'true' : 'false'));
    try { localStorage.setItem('iso-cities-accent', k); } catch (e) {}
  }
  let saved = null; try { saved = localStorage.getItem('iso-cities-accent'); } catch (e) {}
  setAccent(saved || 'sodium');
  sw.addEventListener('click', e => { const b = e.target.closest('button[data-accent]'); if (b) { setAccent(b.dataset.accent); const s = $('stage'); if (s) s.focus({ preventScroll: true }); } });

  // per-figure css
  FIGS.forEach(f => { if (f.css) { const st = document.createElement('style'); st.textContent = f.css; document.head.appendChild(st); } });

  // navigation markup
  nav.innerHTML = FIGS.map((f, i) =>
    `<button data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${f.name}</span></button>`).join('');
  if (selectEl) {
    const myCityStart = 10;
    const origOpts = FIGS.slice(0, myCityStart).map((f, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} · ${f.name}</option>`).join('');
    const ourOpts = FIGS.slice(myCityStart).map((f, k) => {
      const i = myCityStart + k;
      return `<option value="${i}">${String(i + 1).padStart(2, '0')} · ${f.name}</option>`;
    }).join('');
    selectEl.innerHTML = ourOpts
      ? `<optgroup label="My City · Hà Nội (11–${FIGS.length})">${ourOpts}</optgroup><optgroup label="iso-glow Cities (01–10)">${origOpts}</optgroup>`
      : origOpts;
  }

  const focusStage = () => { const s = $('stage'); if (s) s.focus({ preventScroll: true }); };
  nav.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { mount(+b.dataset.i); focusStage(); } });
  if (selectEl) selectEl.addEventListener('change', e => { mount(+e.target.value); focusStage(); });
  $('prev').addEventListener('click', () => { mount(idx - 1); focusStage(); });
  $('next').addEventListener('click', () => { mount(idx + 1); focusStage(); });
  window.addEventListener('hashchange', () => { const i = FIGS.findIndex(f => f.id === location.hash.slice(1)); if (i >= 0 && i !== idx) mount(i); });

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('button, select') && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
    if (handle && handle.key && handle.key(e)) { e.preventDefault(); return; }
    if (e.key === 'PageDown') mount(idx + 1);
    if (e.key === 'PageUp') mount(idx - 1);
  });
  window.addEventListener('keyup', e => { if (handle && handle.keyup) handle.keyup(e); });
  window.addEventListener('blur', () => { if (handle && handle.blur) handle.blur(); });

  if (!FIGS.length) {
    holder.innerHTML = '<p style="display:grid;place-items:center;height:100%;margin:0;letter-spacing:.14em;text-transform:uppercase">Buildings under construction · refresh soon</p>';
    numEl.textContent = 'Fig —'; return;
  }
  const start = FIGS.findIndex(f => f.id === location.hash.slice(1));
  // Default to Fig 11 (Ga Metro Thái Hà) if no hash is provided, or Fig 1 if less than 11
  mount(start >= 0 ? start : (FIGS.length > 10 ? 10 : 0));
})();
