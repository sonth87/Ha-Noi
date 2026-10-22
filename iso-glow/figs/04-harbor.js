/* Fig 4 — Harbor: a gantry crane loads containers from the quay stack onto a moored ship. */
FIGS.push({
  id: 'harbor',
  name: 'Harbor',
  hint: 'Space or click the crane to load · s to sail',
  aria: 'Isometric container port corner: a quay with a stack of containers, a gantry crane and a moored container ship. Press space or click the crane to move one container from the stack onto the ship; when the ship holds eight, press s or click the ship to let it sail and bring in an empty one.',
  css: `
    [data-fig="harbor"] .crane, [data-fig="harbor"] .ship { cursor:pointer; }
    [data-fig="harbor"] .crane:hover .face.top { stroke:var(--ink); }
    [data-fig="harbor"] .water { fill:var(--recess); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="harbor"] .waves { animation:harbor-drift 6s linear infinite; }
    @keyframes harbor-drift { to { transform:translateX(-24px); } }
    [data-fig="harbor"] .ctr.c1 .face { fill:var(--recess); }
    [data-fig="harbor"] .ctr.c1 .face.top { fill:var(--body); }
    [data-fig="harbor"] .held .face { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="harbor"] .held .face.top { fill:var(--accent-hi); }
    [data-fig="harbor"] .held .detail { stroke:var(--accent-hi); }
    [data-fig="harbor"] .held .label { fill:var(--panel); }
    [data-fig="harbor"] .held { filter:url(#glow); }
    [data-fig="harbor"] .spreader.held .face { fill:var(--body); stroke:var(--accent); }
    [data-fig="harbor"] .spreader.held .face.top { fill:var(--deck); }
    [data-fig="harbor"] .cable { fill:none; stroke:var(--ink); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="harbor"] .cable.hot { stroke:var(--accent); }
    [data-fig="harbor"] .win { fill:var(--recess); stroke:var(--detail); stroke-width:.6; vector-effect:non-scaling-stroke; }
    [data-fig="harbor"] .win.on { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="harbor"] .win.hi { fill:var(--accent-hi); stroke:var(--accent-hi); }
    [data-fig="harbor"] .band { fill:var(--accent); stroke:var(--accent-hi); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="harbor"] .band-hi { fill:var(--accent-hi); }
    [data-fig="harbor"] .rope { fill:none; stroke:var(--ink); stroke-width:1; vector-effect:non-scaling-stroke; transition:opacity .3s; }
    [data-fig="harbor"] .sailing .rope { opacity:0; }
    [data-fig="harbor"] .beacon { fill:var(--detail); }
    [data-fig="harbor"] .beacon.hot { fill:var(--accent-hi); filter:url(#glow); animation:blink .5s steps(1) infinite; }
    [data-fig="harbor"] .bhalo { fill:var(--accent); opacity:0; }
    [data-fig="harbor"] .bhalo.hot { opacity:.5; animation:blink .5s steps(1) infinite; }
    @media (prefers-reduced-motion: reduce) { [data-fig="harbor"] .waves, [data-fig="harbor"] .beacon.hot, [data-fig="harbor"] .bhalo.hot { animation:none; } }
  `,
  mount(stage, api) {
    const K = api.iso.frame([[0,240,0],[400,240,0],[400,0,7],[0,0,7],[30,-8,186],[280,-8,186],[280,196,158],[30,196,158]]);
    const { P, D, TOP, FRONT, SIDE, box, path } = K, slits = api.iso.slits;
    const PZ = 7, QZ = 26, DZ = 34, SH = 118, HOME = 60;
    const ROWY = [20, 38, 56], TIERZ = [26, 42, 58];
    const BAYX = [118, 162, 206, 250], BAYY = [124, 144];
    const CAP = 8, DUR = 2500;
    const NAMES = ['ORLA', 'KESTREL', 'MARLOW', 'TERN', 'HALDEN'];
    const f = n => n.toFixed(2);

    const cont = (x, y, z, c) => `<g class="ctr c${c.v}">${box(x, y, z, 40, 16, 16, 1.2)}
      <g transform="${FRONT(x, y + 16, z + 16)}">${slits(22, 37.5, 2.2, 2, 14)}
        <text class="label" x="3" y="9.6" font-size="4.6" letter-spacing=".2">${c.code}</text>
        <line class="detail" x1="3" y1="12" x2="19" y2="12"/></g>
      <g transform="${SIDE(x + 40, y + 16, z + 16)}"><line class="detail" x1="8" y1="1.5" x2="8" y2="14.5"/>
        <line class="detail" x1="4" y1="1.5" x2="4" y2="14.5"/><line class="detail" x1="12" y1="1.5" x2="12" y2="14.5"/></g></g>`;

    let serial = 100;
    const mk = () => { serial += 7; return { code: 'P7·' + String(serial).padStart(4, '0'), v: serial % 3 === 0 ? 1 : 0 }; };
    const freshStack = () => {
      const s = [];
      for (let t = 0; t < 3; t++) for (let r = 0; r < 3; r++) if (!(t === 2 && r === 0)) s.push({ r, t, c: mk() });
      return s;
    };

    let svg = `<defs><clipPath id="harbor-wclip"><rect x="8" y="98" width="384" height="134" rx="6"/></clipPath></defs>`;
    svg += box(0, 0, 0, 400, 240, PZ, 14);
    let waves = '';
    for (let r = 0, y = 106; y < 232; r++, y += 9) for (let x = -24 + (r % 2) * 11; x < 420; x += 22)
      waves += `<line class="detail" x1="${x}" y1="${y}" x2="${x + 8}" y2="${y}"/>`;
    svg += `<g transform="${TOP(0, 0, PZ)}">
      <rect class="detail" x="8" y="8" width="384" height="224" rx="10"/>
      <rect class="water" x="8" y="98" width="384" height="134" rx="6"/>
      <g clip-path="url(#harbor-wclip)"><g class="waves">${waves}</g></g>
      ${[[16,232],[384,232]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y + 2}" r="2.4"/>`).join('')}
    </g>`;
    svg += box(6, 6, PZ, 388, 92, QZ - PZ, 6);
    svg += `<g transform="${FRONT(6, 98, QZ)}">
      ${[30, 90, 150, 210, 270, 330].map(x => `<rect class="face recess" x="${x}" y="4" width="10" height="12" rx="2"/>`).join('')}
      <text class="label" x="352" y="13" font-size="6.5" letter-spacing="1">PIER 7</text>
      ${slits(4, 384, 40, 1.5, 3)}
    </g>`;
    svg += `<g transform="${SIDE(394, 98, QZ)}">${slits(6, 86, 4, 4, 15)}</g>`;
    svg += `<g transform="${TOP(6, 6, QZ)}">
      <line class="detail" x1="6" y1="-1" x2="382" y2="-1"/><line class="detail" x1="6" y1="1" x2="382" y2="1"/>
      <line class="detail" x1="6" y1="76" x2="382" y2="76"/><line class="detail" x1="6" y1="78" x2="382" y2="78"/>
      ${Array.from({ length: 19 }, (_, i) => `<line class="detail" x1="${20 + i * 20}" y1="84" x2="${30 + i * 20}" y2="84"/>`).join('')}
      <rect class="detail" x="30" y="10" width="48" height="60" rx="1"/>
      <text class="label" x="88" y="66" font-size="6" letter-spacing="1">BAY 7A</text>
      <text class="label" x="300" y="30" font-size="6" letter-spacing="1">KEEP CLEAR</text>
      ${slits(296, 360, 8, 36, 44, true)}
    </g>`;
    svg += `<g id="harbor-back"></g><g id="harbor-loadA"></g><g id="harbor-stack"></g>`;
    svg += `<g id="harbor-front"></g>`;
    const BOLL = [100, 180, 260, 330];
    svg += BOLL.map(x => box(x, 89, QZ, 5, 5, 5, 1.5) + box(x - 1, 88, QZ + 5, 7, 7, 1.5, 2)).join('');
    svg += `<g id="harbor-ship" class="ship"><g id="harbor-hull"></g></g>`;
    svg += `<g id="harbor-loadB"></g>`;
    svg += `<g id="harbor-bridgewrap" class="ship"><g id="harbor-bridge"></g></g>`;
    svg += `<g id="harbor-top"></g>`;

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;
    const q = s => stage.querySelector(s);
    const gBack = q('#harbor-back'), gStack = q('#harbor-stack'), gLoadA = q('#harbor-loadA'), gFront = q('#harbor-front');
    gStack.after(gLoadA);
    const gHull = q('#harbor-hull'), gBridge = q('#harbor-bridge'), gLoadB = q('#harbor-loadB'), gTop = q('#harbor-top');
    const gShip = q('#harbor-ship'), gBridgeW = q('#harbor-bridgewrap');

    function hullSVG(name, placed) {
      let s = box(70, 112, PZ, 280, 60, DZ - PZ, 8);
      s += `<g transform="${FRONT(70, 172, DZ)}">
        <rect class="face recess" x="2" y="19" width="276" height="6" rx="2"/>
        <text class="label" x="22" y="12" font-size="7" letter-spacing="1.4">MV ${name}</text>
        ${Array.from({ length: 6 }, (_, i) => `<circle class="detail" cx="${150 + i * 9}" cy="9" r="1.6"/>`).join('')}
        <line class="detail" x1="2" y1="3" x2="278" y2="3"/>
      </g>`;
      s += `<g transform="${SIDE(350, 172, DZ)}">
        <rect class="face recess" x="2" y="19" width="56" height="6" rx="2"/>
        <text class="label" x="8" y="9" font-size="5.5" letter-spacing="1">${name}</text>
        <text class="label" x="8" y="15.5" font-size="4" letter-spacing="1">PIER 7</text>
      </g>`;
      s += `<g transform="${TOP(70, 112, DZ)}">
        <rect class="detail" x="4" y="4" width="272" height="52" rx="6"/>
        ${BAYY.map(by => BAYX.map(bx => `<rect class="detail" x="${bx - 20 - 70 - 1}" y="${by - 112 - 1}" width="42" height="18" rx="1"/>`).join('')).join('')}
      </g>`;
      s += box(74, 116, DZ, 22, 52, 7, 3);
      s += `<g transform="${TOP(74, 116, DZ + 7)}"><circle class="detail" cx="10" cy="14" r="3"/><circle class="detail" cx="10" cy="38" r="3"/></g>`;
      placed.forEach((c, i) => { if (!c) return; s += cont(BAYX[i % 4] - 20, BAYY[Math.floor(i / 4)], DZ, c); });
      s += BOLL.map((x, i) => `<path class="rope" d="${path([[x + 2.5, 91.5, QZ + 6.5], [x + (i < 2 ? 14 : -14), 112, DZ]])}"/>`).join('');
      return s;
    }
    const lit = (i, r, k) => ((i * 7 + r * 5 + k * 3) % 9) < 4;
    function bridgeSVG() {
      let s = box(286, 116, DZ, 52, 52, 40, 3);
      const wins = (w, rows, cols, k) => { let o = ''; for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
        const on = lit(i, r, k), hi = on && (i + r + k) % 4 === 0;
        o += `<rect class="win${on ? ' on' : ''}${hi ? ' hi' : ''}" x="${5 + i * ((w - 10) / cols) + 1}" y="${5 + r * 9}" width="${(w - 10) / cols - 2.4}" height="4.5" rx=".6"/>`; } return o; };
      s += `<g transform="${FRONT(286, 168, DZ + 40)}"><g filter="url(#soft)">${wins(52, 4, 6, 1)}</g></g>`;
      s += `<g transform="${SIDE(338, 168, DZ + 40)}"><g filter="url(#soft)">${wins(52, 4, 6, 2)}</g></g>`;
      s += box(292, 122, DZ + 40, 40, 40, 14, 2);
      s += `<g transform="${FRONT(292, 162, DZ + 54)}"><g filter="url(#soft)">${wins(40, 1, 5, 3)}</g></g>`;
      s += `<g transform="${SIDE(332, 162, DZ + 54)}"><g filter="url(#soft)">${wins(40, 1, 5, 4)}</g></g>`;
      s += box(284, 120, DZ + 54, 56, 46, 14, 2);
      s += `<g transform="${FRONT(284, 166, DZ + 68)}">
        <rect class="halo hot" x="2" y="2" width="52" height="8" filter="url(#bloom)"/>
        <g filter="url(#soft)"><rect class="band" x="4" y="3.5" width="48" height="6" rx="1"/>${slits(10, 46, 6, 3.5, 9.5, true, 'detail')}</g></g>`;
      s += `<g transform="${SIDE(340, 166, DZ + 68)}">
        <rect class="halo hot" x="2" y="2" width="42" height="8" filter="url(#bloom)"/>
        <g filter="url(#soft)"><rect class="band" x="4" y="3.5" width="38" height="6" rx="1"/>${slits(10, 38, 6, 3.5, 9.5, true, 'detail')}</g></g>`;
      s += box(306, 138, DZ + 68, 3, 3, 24, 0);
      s += box(300, 136, DZ + 92, 15, 2, 2, 0);
      s += `<circle class="band-hi" filter="url(#glow)" cx="${f(P(307.5, 139.5, DZ + 96)[0])}" cy="${f(P(307.5, 139.5, DZ + 96)[1])}" r="1.8"/>`;
      s += box(318, 128, DZ + 68, 14, 16, 16, 3);
      s += `<g transform="${FRONT(318, 144, DZ + 84)}"><rect class="face recess" x="0" y="0" width="14" height="4"/></g>`;
      s += `<g transform="${TOP(318, 128, DZ + 84)}"><rect class="face recess" x="3" y="3" width="8" height="10" rx="2"/></g>`;
      return s;
    }

    const leg = (x, y) => box(x - 2, y - 2, QZ, 10, 10, 6, 1.5) + box(x, y, QZ + 6, 6, 6, 110, 0) +
      `<g transform="${FRONT(x, y + 6, 142)}">${slits(10, 100, 9, 0.8, 5.2, false)}</g>`;
    const backSVG = cx => `<g class="crane">${leg(cx - 30, 2)}${leg(cx + 24, 2)}</g>`;
    const frontSVG = cx => `<g class="crane">${leg(cx - 30, 80)}${leg(cx + 24, 80)}</g>`;
    function girder(x) {
      return box(x, -6, 150, 6, 202, 8, 0) + `<g transform="${SIDE(x + 6, 196, 158)}">
        <path class="detail" d="M0 8 ${Array.from({ length: 20 }, (_, i) => `L${5 + i * 10} 0.8 L${10 + i * 10} 7.2`).join(' ')}"/></g>`;
    }
    function topSVG(cx, ty, busy) {
      let s = box(cx - 30, 2, 142, 60, 6, 8, 0) + box(cx - 30, 80, 142, 60, 6, 8, 0);
      s += girder(cx - 30) + girder(cx + 24);
      s += box(cx - 30, -8, 158, 60, 22, 16, 2);
      s += `<g transform="${FRONT(cx - 30, 14, 174)}">${slits(36, 56, 3, 3, 13)}<text class="label" x="4" y="10" font-size="5.5" letter-spacing="1">QC 3</text></g>`;
      s += `<g transform="${SIDE(cx + 30, 14, 174)}">${slits(4, 18, 3, 3, 13)}</g>`;
      s += box(cx - 2, 1, 174, 4, 4, 3, 1);
      const b = P(cx, 3, 179.5);
      s += `<circle class="bhalo${busy ? ' hot' : ''}" filter="url(#bloom)" cx="${f(b[0])}" cy="${f(b[1])}" r="9"/>`;
      s += `<circle class="beacon${busy ? ' hot' : ''}" cx="${f(b[0])}" cy="${f(b[1])}" r="2.6"/>`;
      s += box(cx - 26, ty - 9, 158, 52, 18, 7, 1.5);
      s += `<g transform="${FRONT(cx - 26, ty + 9, 165)}">${slits(4, 48, 4, 1.5, 5.5)}</g>`;
      return `<g class="crane">${s}</g>`;
    }
    function loadSVG(cx, ty, s, held, c) {
      let o = '';
      if (held && c) o += `<g class="held">${cont(cx - 20, ty - 8, s - 16, c)}</g>`;
      o += `<g class="crane">`;
      for (const [dx, dy] of [[-14, -6], [14, -6], [-14, 6], [14, 6]])
        o += `<path class="cable${held ? ' hot' : ''}" d="${path([[cx + dx, ty + dy, 158], [cx + dx, ty + dy, s + 3]])}"/>`;
      o += `<g class="spreader${held ? ' held' : ''}">${box(cx - 21, ty - 8, s, 42, 16, 3, 1)}</g></g>`;
      return o;
    }

    const st = { stack: freshStack(), placed: [], ship: 0, cx: HOME, ty: ROWY[1] + 8, s: SH,
      queue: 0, job: null, held: null, sail: null };

    const order = () => st.stack.slice().sort((a, b) => b.t - a.t || b.r - a.r);
    function renderStack() {
      gStack.innerHTML = st.stack.slice().sort((a, b) => a.t - b.t || a.r - b.r)
        .map(k => cont(HOME - 20, ROWY[k.r], TIERZ[k.t], k.c)).join('');
    }
    function renderShip() { gHull.innerHTML = hullSVG(NAMES[st.ship % NAMES.length], st.placed); }
    function renderCrane() {
      const busy = !!st.job;
      gBack.innerHTML = backSVG(st.cx);
      gFront.innerHTML = frontSVG(st.cx);
      gTop.innerHTML = topSVG(st.cx, st.ty, busy);
      const l = loadSVG(st.cx, st.ty, st.s, !!st.held, st.held);
      if (st.ty < 94) { gLoadA.innerHTML = l; gLoadB.innerHTML = ''; } else { gLoadB.innerHTML = l; gLoadA.innerHTML = ''; }
    }
    function status() {
      const n = st.placed.length;
      let t;
      if (st.sail) t = st.sail.phase === 'out' ? 'ship sailing · next ship inbound' : 'ship berthing · stack restocked';
      else if (n >= CAP && !st.job) t = 'ship full · press s to sail';
      else {
        t = `loading ${n}/${CAP} · crane ${st.job ? 'busy' : 'idle'}`;
        if (st.queue > 1) t += ` · ${st.queue - 1} queued`;
      }
      api.readout(t);
      api.power(!!st.job || !!st.sail);
    }

    const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    const seg = (p, a, b) => sm((p - a) / (b - a));
    const lerp = (a, b, t) => a + (b - a) * t;

    function startJob(warp = 0) {
      const slot = order()[0];
      const bay = st.placed.length;
      st.job = { t0: null, slot, bay, cx0: st.cx, ty0: st.ty, s0: st.s, grabbed: false, released: false, warp,
        bx: BAYX[bay % 4], by: BAYY[Math.floor(bay / 4)] + 8, py: ROWY[slot.r] + 8, ps: TIERZ[slot.t] + 16 };
      status();
    }
    function step(ts) {
      const j = st.job; if (!j) return;
      if (j.t0 == null) j.t0 = ts - (j.warp || 0);
      const p = Math.min(1, (ts - j.t0) / DUR);
      if (p < .54) { const e = seg(p, 0, .22); st.cx = lerp(j.cx0, HOME, e); st.ty = lerp(j.ty0, j.py, e); }
      else { const e = seg(p, .54, .78); st.cx = lerp(HOME, j.bx, e); st.ty = lerp(j.py, j.by, e); }
      if (p < .22) st.s = lerp(j.s0, SH, seg(p, 0, .22));
      else if (p < .36) st.s = lerp(SH, j.ps, seg(p, .22, .36));
      else if (p < .42) st.s = j.ps;
      else if (p < .54) st.s = lerp(j.ps, SH, seg(p, .42, .54));
      else if (p < .78) st.s = SH;
      else if (p < .9) st.s = lerp(SH, DZ + 16, seg(p, .78, .9));
      else st.s = lerp(DZ + 16, SH, seg(p, .9, 1));
      if (p >= .36 && !j.grabbed) {
        j.grabbed = true; st.held = j.slot.c;
        st.stack = st.stack.filter(k => k !== j.slot); renderStack();
      }
      if (p >= .9 && !j.released) {
        j.released = true; st.held = null;
        st.placed[j.bay] = j.slot.c; renderShip();
      }
      if (p >= 1) {
        st.job = null; st.queue--;
        if (st.queue > 0) startJob();
      }
      renderCrane(); status();
    }
    function sailStep(ts) {
      const s = st.sail; if (!s) return;
      if (s.t0 == null) s.t0 = ts;
      const p = Math.min(1, (ts - s.t0) / (s.phase === 'out' ? 1800 : 1400));
      let dx, op;
      if (s.phase === 'out') { const e = p * p; dx = -460 * e; op = 1 - sm((p - .35) / .65); }
      else { const e = 1 - (1 - p) * (1 - p); dx = 260 * (1 - e); op = sm(p / .6); }
      const d = D(dx, 0, 0), tr = `translate(${f(d[0])} ${f(d[1])})`;
      [gShip, gBridgeW].forEach(g => { g.setAttribute('transform', tr); g.style.opacity = op; });
      if (p >= 1) {
        if (s.phase === 'out') {
          st.ship++; st.placed = []; st.stack = freshStack(); renderShip(); renderStack();
          st.sail = { phase: 'in', t0: ts };
        } else {
          st.sail = null; gShip.classList.remove('sailing');
          [gShip, gBridgeW].forEach(g => { g.removeAttribute('transform'); g.style.opacity = ''; });
        }
        status();
      }
    }
    const tick = () => { const ts = performance.now(); step(ts); sailStep(ts); };
    api.loop(tick); api.every(40, () => { if (st.job || st.sail) tick(); });

    function load(warp = 0) {
      if (st.sail) return false;
      const unfinished = st.queue - (st.job && st.job.released ? 1 : 0);
      const room = Math.min(CAP - st.placed.length, st.stack.length + (st.held ? 1 : 0)) - unfinished;
      if (room <= 0) { status(); return false; }
      st.queue++;
      if (!st.job) startJob(warp); else status();
      return true;
    }
    function sail() {
      if (st.sail || st.job || st.placed.length < CAP) return false;
      st.sail = { phase: 'out', t0: null }; gShip.classList.add('sailing');
      status(); return true;
    }

    stage.addEventListener('click', e => {
      if (e.target.closest('.ship')) { if (st.placed.length >= CAP) sail(); else load(); return; }
      if (e.target.closest('.crane')) load();
    });

    gBridge.innerHTML = bridgeSVG();
    renderStack(); renderShip(); renderCrane(); status();

    return {
      key(e) {
        if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) load(); return true; }
        if (e.key === 's' || e.key === 'S') { sail(); return true; }
        return false;
      },
      demo() { load(200); api.after(120, () => load()); },
    };
  },
});
