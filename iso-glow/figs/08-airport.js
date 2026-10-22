/* Fig 8 — Airport: clear a plane to land; approach lights chase, runway lights up, plane lands and taxis in. */
FIGS.push({
  id: 'airport',
  name: 'Airport',
  hint: 'Space or click the tower to clear a landing · L runway lights',
  aria: 'Isometric regional airport: runway 27 with approach lights, taxiway, control tower, terminal with jet bridges and a hangar. Press space or click the control tower to clear a plane to land; the approach lights chase toward the threshold, the runway lights up and the plane lands and taxis to the terminal. Press L to toggle the runway lights. Extra clearances are queued.',
  css: `
    [data-fig="airport"] #airport-tower { cursor:pointer; }
    [data-fig="airport"] #airport-tower:hover .face.top { stroke:var(--ink); }
    [data-fig="airport"] .asph { fill:var(--recess); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="airport"] .mark { fill:var(--line); }
    [data-fig="airport"] .num { fill:var(--line); font-family:var(--mono); font-weight:500; }
    [data-fig="airport"] .tx { fill:none; stroke:var(--line); stroke-width:1; stroke-dasharray:4 3; vector-effect:non-scaling-stroke; }
    [data-fig="airport"] .edl { fill:var(--detail); }
    [data-fig="airport"] #airport-edges.on .edl { fill:var(--accent-hi); }
    [data-fig="airport"] #airport-edges.on { filter:url(#glow); }
    [data-fig="airport"] .ap .face { transition:none; }
    [data-fig="airport"] .ap.on .bar .face { fill:var(--accent); stroke:var(--accent); }
    [data-fig="airport"] .ap.hot .bar .face { fill:var(--accent-hi); stroke:var(--accent-hi); transition:none; }
    [data-fig="airport"] .ap.on { filter:url(#soft); }
    [data-fig="airport"] .ap.hot { filter:url(#glow); }
    [data-fig="airport"] .halo.hot { opacity:.35; }
    [data-fig="airport"] #airport-tower .glass.hot { fill:var(--accent); stroke:var(--accent-hi); filter:url(#soft); }
    [data-fig="airport"] #airport-tower .glass.hot.top { fill:var(--accent-hi); }
    [data-fig="airport"] .bcn { fill:var(--detail); }
    [data-fig="airport"] .bcn.hot { fill:var(--accent-hi); animation:blink 1s steps(1) infinite; }
    [data-fig="airport"] .bcn-g.hot { filter:url(#glow); }
    [data-fig="airport"] .shadow { fill:var(--line); opacity:.35; }
    [data-fig="airport"] #airport-plane .win { fill:var(--accent-hi); }
    [data-fig="airport"] #airport-plane .lamp { fill:var(--accent-hi); }
    [data-fig="airport"] #airport-plane .lamp-g { filter:url(#glow); }
    [data-fig="airport"] #airport-plane { transition:opacity .5s; }
    [data-fig="airport"] .gate { fill:var(--ink); font-family:var(--mono); }
  `,
  mount(stage, api) {
    /*  layout               x     y    z    w    d    h
        plate                0     0    0  480  290    7
        runway (flat)       70   200    7  382   40       centerline y=220, landing toward +x
        approach lights   8-62   220    7   stalks + light bars, crossbar at x=42
        taxiway (flat)      90   160    7  362   16       centerline y=168, exit connector x=404..420
        hangar              30    40    7   80   80   24 + stepped roof (arch along x, door on x=max)
        terminal           170    60    7  190   55   30   glass facade on y=max, 3 jet bridges
        tower              404    64   15   14   14   90   cab 398..424, z 105..127, antenna to 152      */
    const PZ = 7;
    const K = api.iso.frame([[0,290,0],[480,0,PZ],[480,290,0],[0,0,PZ],[411,71,156],[-70,220,62],[-70,250,20]], 0.07);
    const { D, TOP, FRONT, SIDE, box, boxc } = K, slits = api.iso.slits;
    const RY0 = 200, RY1 = 240, RC = 220, TXC = 168, EX = 412, TD = 128, X0 = -175, Z0 = 98, GX = 286;
    const STA = [10, 18, 26, 34, 42, 50, 58];   // approach light stations (rabbit runs toward x=70)

    let svg = '';
    // ---------- plate ----------
    svg += box(0, 0, 0, 480, 290, PZ, 14);
    svg += `<g transform="${FRONT(0,290,PZ)}">${slits(20, 460, 8, 2, 5)}</g>`;
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="detail" x="8" y="8" width="464" height="274" rx="10"/>
      ${[[14,14],[466,14],[14,276],[466,276]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="2.6"/><line class="detail" x1="${x-1.6}" y1="${y}" x2="${x+1.6}" y2="${y}"/>`).join('')}
    </g>`;

    // ---------- ground: apron, taxiway, connectors, runway ----------
    let g = '';
    g += `<rect class="asph" x="150" y="115" width="230" height="45" rx="2"/>`;              // apron
    g += `<rect class="asph" x="90" y="160" width="362" height="16" rx="2"/>`;               // taxiway
    g += `<rect class="asph" x="100" y="175" width="16" height="26"/><rect class="asph" x="404" y="175" width="16" height="26"/>`;
    g += `<rect class="asph" x="70" y="${RY0}" width="382" height="40" rx="1.5"/>`;           // runway
    // taxiway centreline + exit lead-off curves + hold lines
    g += `<path class="tx" d="M96 ${TXC} H446 M108 ${TXC} V214 M${EX} ${TXC} V214"/>`;
    [100, 404].forEach(x => { g += `<rect class="mark" x="${x+1}" y="190" width="14" height=".8"/><rect class="mark" x="${x+1}" y="192" width="14" height=".8"/>`; });
    // gate lead-in lines + gate numbers
    [203, 258, 313].forEach((x, i) => { g += `<line class="detail" x1="${x}" y1="138" x2="${x}" y2="${TXC}"/><text class="gate" x="${x+3}" y="152" font-size="5">A${i+1}</text>`; });
    // threshold piano keys (both ends)
    const keys = [203, 206.5, 210, 213.5, 224, 227.5, 231, 234.5];
    keys.forEach(y => { g += `<rect class="mark" x="74" y="${y}" width="22" height="2.2"/><rect class="mark" x="426" y="${y}" width="22" height="2.2"/>`; });
    // runway designators: "27" reads from the approach (+x up), "09" from the far end
    g += `<text class="num" font-size="15" text-anchor="middle" transform="translate(110 ${RC}) rotate(90)" y="5">27</text>`;
    g += `<text class="num" font-size="15" text-anchor="middle" transform="translate(412 ${RC}) rotate(-90)" y="5">09</text>`;
    // touchdown zone + aiming point
    [[132, 6], [152, 4], [212, 4], [232, 2]].forEach(([x, n]) => { for (let i = 0; i < n / 2; i++) {
      g += `<rect class="mark" x="${x}" y="${205 + i*3}" width="12" height="1.6"/><rect class="mark" x="${x}" y="${233.4 - i*3}" width="12" height="1.6"/>`; } });
    g += `<rect class="mark" x="174" y="206" width="22" height="4"/><rect class="mark" x="174" y="230" width="22" height="4"/>`;
    // centreline dashes
    for (let x = 128; x < 420; x += 16) g += `<rect class="mark" x="${x}" y="${RC-0.6}" width="9" height="1.2"/>`;
    // painted ground labels
    g += `<text class="label" x="300" y="258" font-size="6" letter-spacing="1.2">RWY 27 / 09 · 1150 m</text>`;
    g += `<text class="label" x="14" y="196" font-size="4.5" letter-spacing=".8">ALS</text>`;
    svg += `<g transform="${TOP(0,0,PZ)}">${g}</g>`;

    // runway light halos + edge / threshold lights
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="halo" id="airport-halo" x="68" y="${RY0-6}" width="386" height="52" rx="10" filter="url(#bloom)"/>
    </g>`;
    let el = '';
    for (let x = 76; x <= 448; x += 17) el += `<circle class="edl" cx="${x}" cy="${RY0+1.6}" r="1.3"/><circle class="edl" cx="${x}" cy="${RY1-1.6}" r="1.3"/>`;
    for (let y = 203; y <= 237; y += 3.4) el += `<circle class="edl" cx="71.5" cy="${y}" r="1"/><circle class="edl" cx="450.5" cy="${y}" r="1"/>`;
    for (let x = 96; x <= 446; x += 20) el += `<circle class="edl" cx="${x}" cy="${TXC-7}" r=".8"/><circle class="edl" cx="${x}" cy="${TXC+7}" r=".8"/>`;
    svg += `<g id="airport-edges" transform="${TOP(0,0,PZ)}">${el}</g>`;

    // plane shadow (on the ground, under everything that stands)
    svg += `<g id="airport-shadow"><g transform="${TOP(0,0,PZ)}"><rect class="shadow" x="-37" y="-4.5" width="75" height="9" rx="4.5"/><path class="shadow" d="M-9 -30 L4.5 -30 L4.5 30 L-9 30 Z M-41 -15 L-33 -15 L-33 15 L-41 15 Z"/></g></g>`;

    // ---------- hangar ----------
    svg += box(30, 40, PZ, 80, 80, 24, 2);
    svg += `<g transform="${FRONT(30,120,PZ+24)}">${slits(6, 74, 6, 6, 10)}<text class="label" x="6" y="19" font-size="5" letter-spacing="1">HANGAR 2</text></g>`;
    svg += `<g transform="${SIDE(110,120,PZ+24)}"><rect class="face recess" x="8" y="5" width="64" height="19"/>${slits(12, 68, 4, 5, 24)}<line class="detail" x1="40" y1="5" x2="40" y2="24"/></g>`;
    [[48, 5, 64], [58, 4, 44], [68, 3, 24]].reduce((z, [y, h, d]) => {
      svg += box(30, y, z, 80, d, h, 1.5);
      svg += `<g transform="${TOP(30,y,z+h)}">${slits(4, 76, 6, 1, d-1)}</g>`;
      return z + h;
    }, PZ + 24);

    // ---------- terminal ----------
    const TX0 = 170, TY0 = 60, TW = 190, TD0 = 55, TH = 30, TZ = PZ + TH;
    svg += box(TX0, TY0, PZ, TW, TD0, TH, 2);
    svg += `<g transform="${FRONT(TX0,TY0+TD0,TZ)}">
      <text class="label" x="6" y="5.4" font-size="4.6" letter-spacing="1.4">TERMINAL A · ARRIVALS</text>
      <rect class="halo hot" x="4" y="8" width="${TW-8}" height="20" filter="url(#bloom)"/>
      <rect class="face glass hot" x="4" y="8" width="${TW-8}" height="20"/>
      ${slits(10, TW-8, 6, 8, 28)}<line class="detail" x1="4" y1="17" x2="${TW-4}" y2="17"/>
    </g>`;
    svg += `<g transform="${SIDE(TX0+TW,TY0+TD0,TZ)}">${[0,1].map(r => slits(6, 50, 4, 6 + r*11, 12 + r*11)).join('')}</g>`;
    svg += `<g transform="${TOP(TX0,TY0,TZ)}">${slits(4, TW-4, 10, 3, 6)}</g>`;
    svg += box(190, 68, TZ, 140, 30, 5, 1.5);
    svg += `<g transform="${FRONT(190,98,TZ+5)}">${slits(4, 136, 3, 1.5, 3.5)}</g>`;
    [[205, 74], [240, 74], [300, 74]].forEach(([x, y]) => { svg += box(x, y, TZ + 5, 12, 12, 5, 1); });
    // jet bridges (stalk, tube, cab), back to front by x
    [200, 255, 310].forEach(x => {
      svg += box(x + 1.5, 131, PZ, 3, 3, 11);
      svg += box(x, TY0 + TD0, PZ + 11, 6, 20, 5, 1);
      svg += `<g transform="${FRONT(x,TY0+TD0+20,PZ+16)}"><rect class="face glass hot" x="1" y="1" width="4" height="3"/></g>`;
      svg += `<g transform="${SIDE(x+6,TY0+TD0+20,PZ+16)}">${slits(3, 17, 3, 1.5, 3.5)}</g>`;
    });

    // ---------- control tower ----------
    let t = '';
    t += box(396, 56, PZ, 30, 30, 8, 2);
    t += `<g transform="${FRONT(396,86,PZ+8)}"><text class="label" x="4" y="6" font-size="4" letter-spacing=".8">ATC</text></g>`;
    t += box(404, 64, PZ + 8, 14, 14, 90, 1.5);
    t += `<g transform="${FRONT(404,78,PZ+98)}">${slits(4, 86, 8, 4, 10, false)}<rect class="face recess" x="5" y="78" width="4" height="12"/></g>`;
    t += `<g transform="${SIDE(418,78,PZ+98)}">${slits(4, 86, 8, 4, 10, false)}</g>`;
    t += box(398, 58, 105, 26, 26, 4, 1.5);                         // cab floor (flare)
    // slanted glass: narrower lower band, wider upper band
    t += `<g transform="${FRONT(400,82,115)}"><rect class="halo" x="-6" y="-12" width="34" height="24" filter="url(#bloom)"/></g>`;
    t += boxc(400, 60, 109, 22, 22, 6, 1, 'glass');
    t += boxc(397, 57, 115, 28, 28, 9, 1, 'glass');
    t += `<g transform="${FRONT(397,85,124)}">${slits(4, 24, 4, 0, 9)}</g><g transform="${SIDE(425,85,124)}">${slits(4, 24, 4, 0, 9)}</g>`;
    t += `<g transform="${FRONT(400,82,115)}">${slits(4, 18, 4.5, 0, 6)}</g><g transform="${SIDE(422,82,115)}">${slits(4, 18, 4.5, 0, 6)}</g>`;
    t += box(395, 55, 124, 32, 32, 3, 1.5);                         // roof
    t += box(410, 70, 127, 1.4, 1.4, 22);                           // antenna
    t += box(409, 78, 127, 6, 1, 6);                                // radar blade
    t += `<g class="bcn-g"><g transform="${TOP(0,0,149)}"><circle class="bcn" cx="410.7" cy="70.7" r="2.4"/></g></g>`;
    svg += `<g id="airport-tower">${t}</g>`;

    // ---------- approach light system (stalks + light bars), back to front by x ----------
    STA.forEach((x, i) => {
      const wide = x === 42, w = wide ? 30 : 12;
      svg += `<g class="ap" data-i="${i}">${box(x - .6, RC - .6, PZ, 1.2, 1.2, 6)}`;
      if (wide) svg += box(x - .6, RC - 13, PZ, 1.2, 1.2, 6) + box(x - .6, RC + 12, PZ, 1.2, 1.2, 6);
      svg += `<g class="bar">${box(x - 1.2, RC - w/2, PZ + 6, 2.4, w, 1.8, .6)}</g></g>`;
    });

    // ---------- airliner (built per heading, drawn last; nothing tall stands in front of its paths) ----------
    const PARTS = {
      gear:  [[6, -1, 0, 2, 2, 3], [-4, -5, 0, 2, 2, 3], [-4, 3, 0, 2, 2, 3]],
      body:  [[-22, -3, 3, 42, 6, 6, 2], [20, -2.3, 3.6, 5, 4.6, 4.6, 1.5], [25, -1.2, 4.5, 2.5, 2.4, 2.8, 1], [-28, -2, 5, 6, 4, 4, 1.5]],
      wing:  b => [-6, b > 0 ? 3 : -20, 4.5, 9, 17, 1.3, .6],
      eng:   b => [0, b > 0 ? 8 : -12, 1.8, 7, 4, 3.4, 1.2],
      stab:  b => [-28, b > 0 ? 2 : -10, 8, 5, 8, 1, .4],
      fin:   [-29, -.6, 9, 7, 1.2, 11, .6],
    };
    const SC = 1.5;
    function planeSVG(fx, fy) {
      const lx = -fy, ly = fx;   // lateral (+b) axis
      const W = (pp, cls) => { const [a, b, z, la, lb, h, r = 0] = pp.map(v => v * SC);
        const xs = [a*fx + b*lx, (a+la)*fx + (b+lb)*lx], ys = [a*fy + b*ly, (a+la)*fy + (b+lb)*ly];
        const x = Math.min(...xs), y = Math.min(...ys), w = Math.abs(xs[1]-xs[0]), d = Math.abs(ys[1]-ys[0]);
        return { s: cls ? boxc(x, y, PZ + z, w, d, h, r, cls) : box(x, y, PZ + z, w, d, h, r), x, y, w, d, z: PZ + z, h };
      };
      const nearB = (lx + ly) > 0 ? 1 : -1, farB = -nearB;
      let s = PARTS.gear.map(p => W(p).s).join('');
      s += W(PARTS.eng(farB)).s + W(PARTS.wing(farB)).s + W(PARTS.stab(farB)).s;
      const body = PARTS.body.map(p => W(p)).sort((p, q) => ((fx + fy) > 0 ? 1 : -1) * 0 + (p.x + p.y) - (q.x + q.y));
      body.forEach(p => { s += p.s; });
      // cabin windows on the visible long face of the fuselage
      const f = body.find(p => p.w > 30 || p.d > 30);
      if (fx) s += `<g transform="${FRONT(f.x, f.y + f.d, f.z + f.h)}">${Array.from({length: 11}, (_, i) => `<rect class="win" x="${(4 + i*3.4)*SC}" y="${1.6*SC}" width="${1.6*SC}" height="${1.2*SC}"/>`).join('')}</g>`;
      else s += `<g transform="${SIDE(f.x + f.w, f.y + f.d, f.z + f.h)}">${Array.from({length: 11}, (_, i) => `<rect class="win" x="${(4 + i*3.4)*SC}" y="${1.6*SC}" width="${1.6*SC}" height="${1.2*SC}"/>`).join('')}</g>`;
      s += W(PARTS.fin).s;
      s += W(PARTS.eng(nearB)).s + W(PARTS.wing(nearB)).s + W(PARTS.stab(nearB)).s;
      // landing lamp at the nose + beacon on the fin
      const nx = 27.5 * SC * fx, ny = 27.5 * SC * fy;
      s += `<g class="lamp-g"><g transform="${TOP(0,0,PZ+6*SC)}"><circle class="lamp" cx="${nx}" cy="${ny}" r="2.2"/></g><g transform="${TOP(0,0,PZ+20*SC)}"><circle class="lamp blink" cx="${-26*SC*fx}" cy="${-26*SC*fy}" r="1.3"/></g></g>`;
      return s;
    }
    const HEAD = { e: [1, 0], n: [0, -1], w: [-1, 0] };
    svg += `<g id="airport-plane" style="display:none">${Object.entries(HEAD).map(([k, [fx, fy]]) => `<g class="hd" data-h="${k}">${planeSVG(fx, fy)}</g>`).join('')}</g>`;

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    // ---------- state ----------
    const q = s => stage.querySelector(s);
    const planeEl = q('#airport-plane'), shadowEl = q('#airport-shadow');
    const heads = [...stage.querySelectorAll('#airport-plane .hd')];
    const aps = [...stage.querySelectorAll('.ap')];
    const glass = [...stage.querySelectorAll('#airport-tower .glass')];
    const st = { count: 0, queue: 0, manual: false, active: null, phase: 'standing by' };
    const T1 = 3300, T2 = 5900, T3 = 6800, T4 = 8700, T5 = 9300;
    const ease = k => k < .5 ? 2*k*k : 1 - 2*(1-k)*(1-k);

    function render() {
      const lit = !!st.active || st.manual;
      q('#airport-edges').classList.toggle('on', lit);
      q('#airport-halo').classList.toggle('hot', lit);
      q('.bcn').classList.toggle('hot', lit); q('.bcn-g').classList.toggle('hot', lit);
      glass.forEach(g => g.classList.toggle('hot', !!st.active));
      q('#airport-tower .halo').classList.toggle('hot', !!st.active);
      if (!st.active) aps.forEach(a => { a.classList.toggle('on', st.manual); a.classList.remove('hot'); });
      api.power(lit);
      const parts = ['rwy 27', st.phase, `${st.count} landed`];
      if (st.queue) parts.push(`${st.queue} queued`);
      if (st.manual) parts.push('lights on');
      api.readout(parts.join(' · '));
    }
    function setPhase(p) { if (st.phase !== p) { st.phase = p; render(); } }
    function place(h, x, y, z, op = 1) {
      heads.forEach(e => { e.style.display = e.dataset.h === h ? '' : 'none'; });
      const [dx, dy] = D(x, y, z);
      planeEl.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      planeEl.style.display = ''; planeEl.style.opacity = op;
      const [sx, sy] = D(x, y, 0);
      shadowEl.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      shadowEl.style.display = h === 'e' && x > -5 && z > 0.5 ? '' : 'none';
    }
    function chime() {
      try { const { ctx, out } = api.audio(); [660, 880].forEach((f, i) => {
        const o = ctx.createOscillator(), gn = ctx.createGain(), t0 = ctx.currentTime + i * .14;
        o.frequency.value = f; o.type = 'sine'; gn.gain.setValueAtTime(0, t0);
        gn.gain.linearRampToValueAtTime(.06, t0 + .02); gn.gain.exponentialRampToValueAtTime(.0001, t0 + .4);
        o.connect(gn); gn.connect(out); o.start(t0); o.stop(t0 + .45); }); } catch (e) {}
    }
    function start() {
      st.active = { t0: performance.now(), counted: false };
      st.phase = 'cleared to land';
      place('e', X0, RC, Z0);
      render();
    }
    function clear() {
      chime(); api.flash(q('#airport-tower .bcn-g'), 200);
      if (st.active) st.queue++; else start();
      render();
    }
    function frame() {
      const a = st.active; if (!a) return; const now = performance.now();
      const t = Math.max(0, now - a.t0);
      if (t < T1) {
        const k = t / T1, x = X0 + (TD - X0) * k, z = Z0 * Math.pow(1 - k, 1.35);
        place('e', x, RC, z);
        const step = Math.floor(t / 70) % (STA.length + 4);
        aps.forEach((e, i) => { e.classList.add('on'); e.classList.toggle('hot', i === step); });
        setPhase(k > .8 ? 'short final' : 'cleared to land');
      } else if (t < T2) {
        const k = (t - T1) / (T2 - T1), e = 1 - (1 - k) * (1 - k);
        place('e', TD + (EX - TD) * e, RC, 0);
        aps.forEach(e2 => { e2.classList.remove('hot'); e2.classList.toggle('on', st.manual); });
        setPhase(k < .2 ? 'touchdown' : 'rolling out');
      } else if (t < T3) {
        const k = ease((t - T2) / (T3 - T2));
        place('n', EX, RC - (RC - TXC) * k, 0);
        setPhase('vacating');
      } else if (t < T4) {
        const k = 1 - Math.pow(1 - (t - T3) / (T4 - T3), 2);
        place('w', EX - (EX - GX) * k, TXC, 0);
        setPhase('taxiing to gate');
      } else if (t < T5) {
        if (!a.counted) { a.counted = true; st.count++; st.phase = 'at gate'; render(); }
        place('w', GX, TXC, 0, 1 - (t - T4) / (T5 - T4));
      } else {
        st.active = null; planeEl.style.display = 'none'; shadowEl.style.display = 'none';
        st.phase = 'standing by';
        if (st.queue > 0) { st.queue--; render(); api.after(500, () => { if (!st.active) start(); }); }
        render();
      }
    }
    api.loop(frame);
    stage.addEventListener('click', e => { if (e.target.closest('#airport-tower')) clear(); });
    render();
    return {
      key(e) {
        if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) clear(); return true; }
        if (e.key === 'l' || e.key === 'L') { st.manual = !st.manual; render(); return true; }
        return false;
      },
      demo() { clear(); api.after(200, () => clear()); },
    };
  },
});
