/* Fig 5 — Metro station: an elevated two-track station; dispatch trains that stop, board and leave. */
FIGS.push({
  id: 'metro',
  name: 'Metro station',
  hint: 'Press 1 · 2 or click a platform button',
  aria: 'Isometric elevated metro station on a viaduct over a street: two tracks, an platform with a canopy, a side platform, a departure board for line 3, stairs down to the street and shops under the viaduct. Press 1 or 2, or click a platform button or the board, to send a three-car train into track 1 or 2; it stops, opens its doors, boards riders and departs.',
  css: `
    [data-fig="metro"] .win { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="metro"] .train.hot .win { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="metro"] .train.hot .wins { filter:url(#soft); }
    [data-fig="metro"] .doorway { fill:var(--recess); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="metro"] .train.hot .doorway { fill:var(--accent-hi); }
    [data-fig="metro"] .lamp { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="metro"] .train.run .lamp { fill:var(--accent-hi); }
    [data-fig="metro"] .edge { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; transition:fill .3s; }
    [data-fig="metro"] .edge.hot { fill:var(--accent); stroke:var(--accent-hi); filter:url(#soft); }
    [data-fig="metro"] .edge.hot.blink { animation:metro-blink .5s steps(2) infinite; }
    @keyframes metro-blink { 50% { fill:var(--recess); stroke:var(--detail); } }
    [data-fig="metro"] #metro-board { cursor:pointer; }
    [data-fig="metro"] .board-t { font-family:var(--mono); }
    [data-fig="metro"] .shopsign { fill:var(--accent-hi); font-family:var(--mono); }
    [data-fig="metro"] .rail { fill:var(--deck); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    @media (prefers-reduced-motion: reduce) { [data-fig="metro"] .edge.hot.blink { animation:none; } }
  `,
  mount(stage, api) {
    const K = api.iso.frame([[0,256,0],[400,0,8],[400,256,0],[0,0,8],[-10,190,64],[-10,42,76],[410,42,76],[410,190,64],[70,44,126],[330,44,126]], 0.06);
    const { D, TOP, FRONT, SIDE, box } = K, slits = api.iso.slits;
    const PZ = 8, DZ = 76, PLZ = 82, X0 = -10, X1 = 410;
    const CARW = 66, GAP = 4, TL = 3 * CARW + 2 * GAP, CD = 22, CH = 24;
    const TRK = { 1: { y: 102, dir: 1 }, 2: { y: 139, dir: -1 } };
    const STOP = 200 - TL / 2, OFF_L = X0 - TL - 12, OFF_R = X1 + 12;
    const A = 2600, W = 3200, L = 2300, OPEN0 = 400, OPEN1 = W - 700;

    const plateScrews = [[16,16],[384,16],[16,240],[384,240]];
    let svg = '<defs>';
    for (const n of [1, 2]) {
      const y0 = TRK[n].y - 2, y1 = TRK[n].y + CD + 2, z0 = DZ, z1 = DZ + 1 + CH + 3, w = X1 - X0, d = y1 - y0, h = z1 - z0;
      const r = (t, a, b) => `<rect transform="${t}" width="${a}" height="${b}"/>`;
      svg += `<clipPath id="metro-clip${n}" clipPathUnits="userSpaceOnUse">${r(TOP(X0,y0,z1),w,d)}${r(TOP(X0,y0,z0),w,d)}${r(FRONT(X0,y1,z1),w,h)}${r(FRONT(X0,y0,z1),w,h)}${r(SIDE(X1,y1,z1),d,h)}${r(SIDE(X0,y1,z1),d,h)}</clipPath>`;
    }
    svg += '</defs>';

    svg += box(0, 0, 0, 400, 256, PZ, 14);
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="detail" x="8" y="8" width="384" height="240" rx="10"/>
      ${plateScrews.map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="3"/><line class="detail" x1="${x-1.8}" y1="${y}" x2="${x+1.8}" y2="${y}"/>`).join('')}
      <rect class="face recess" x="22" y="224" width="356" height="20" rx="2"/>
      ${Array.from({length: 13}, (_, i) => `<rect class="detail" x="${30 + i * 24}" y="233.2" width="12" height="1.6"/>`).join('')}
      <line class="detail" x1="22" y1="220" x2="378" y2="220"/>
      ${slits(30, 330, 20, 194, 218)}
      ${Array.from({length: 5}, (_, i) => `<rect class="face" x="${306 + i * 6}" y="225" width="3.4" height="18"/>`).join('')}
    </g>`;

    const PIL = [20, 120, 220, 320];
    PIL.forEach(x => { svg += box(x, 52, PZ, 12, 10, 56, 1.5); });
    const SHOPS = [[36, 'DINER 24', true], [136, 'NOODLE', true], [236, 'KIOSK', false], [336, 'FLORA', true]];
    SHOPS.forEach(([x, name, lit], i) => {
      const w = i === 3 ? 56 : 76, h = 30;
      svg += box(x, 96, PZ, w, 50, h, 2);
      svg += `<g transform="${FRONT(x,146,PZ+h)}">
        <rect class="face recess" x="2" y="2" width="${w-4}" height="5"/>${slits(4, w - 4, 3, 2, 7)}
        <text class="${lit ? 'shopsign' : 'label'}" x="4" y="12" font-size="4.2">${name}</text>
        <rect class="halo${lit ? ' hot' : ''}" x="4" y="14" width="${w-24}" height="13" filter="url(#bloom)"/>
        <rect class="face glass${lit ? ' hot' : ''}" x="4" y="14" width="${w-24}" height="13"/>
        ${slits(4 + (w - 24) / 3, 4 + 2 * (w - 24) / 3 + 0.1, (w - 24) / 3, 14, 27)}
        <rect class="face recess" x="${w-16}" y="12" width="11" height="18"/><line class="detail" x1="${w-10.5}" y1="12" x2="${w-10.5}" y2="30"/>
      </g>`;
    });
    PIL.forEach(x => {
      svg += box(x, 172, PZ, 12, 12, 56, 1.5);
      svg += `<g transform="${FRONT(x,184,64)}">${slits(3, 9, 3, 4, 50)}</g>`;
    });

    svg += box(X0, 42, 64, X1 - X0, 148, 12, 2);
    svg += `<g transform="${FRONT(X0,190,DZ)}">${slits(10, 410, 40, 1, 11)}<line class="detail" x1="0" y1="8" x2="420" y2="8"/></g>`;
    svg += `<g transform="${SIDE(X1,190,DZ)}">${slits(4, 144, 6, 2, 10)}</g>`;
    const track = cy => `<g transform="${TOP(X0,42,DZ)}">
      <rect class="face recess" x="0" y="${cy-42-12}" width="${X1-X0}" height="24"/>
      ${slits(2, X1 - X0 - 2, 4.5, cy - 42 - 10, cy - 42 + 10)}
    </g><g transform="${TOP(X0,42,DZ+1.2)}">
      <rect class="rail" x="0" y="${cy-42-7.5}" width="${X1-X0}" height="1.6"/><rect class="rail" x="0" y="${cy-42+5.9}" width="${X1-X0}" height="1.6"/>
    </g>`;
    svg += track(113) + track(150);

    svg += box(40, 44, DZ, 320, 54, PLZ - DZ, 2);
    svg += `<g transform="${TOP(40,44,PLZ)}">
      <rect id="metro-edge1" class="edge" x="2" y="49" width="316" height="3"/>
      ${slits(10, 310, 12, 4, 45, true)}
    </g>`;
    svg += `<g transform="${FRONT(40,98,PLZ)}">${slits(6, 314, 8, 1.5, 4.5)}</g>`;
    const COLS = [80, 140, 200, 260, 320];
    COLS.forEach(x => { svg += box(x, 50, PLZ, 4, 4, 36, 1); });
    [[104, 64], [224, 64]].forEach(([x, y]) => {
      svg += box(x, y, PLZ, 26, 2, 9, 0.5) + box(x, y + 2, PLZ + 3, 26, 7, 2, 0.5) + box(x + 1, y + 3, PLZ, 2, 5, 3) + box(x + 23, y + 3, PLZ, 2, 5, 3);
    });
    const kiosk = (n, x) => `<g class="press kiosk" data-track="${n}">${box(x, 82, PLZ, 10, 8, 14, 1.5)}
        <g transform="${FRONT(x,90,PLZ+14)}"><rect class="face recess" x="1.5" y="1.5" width="7" height="6" rx="1"/><text class="label" x="3.4" y="6.4" font-size="4.6">${n}</text>${slits(3, 7, 2, 9, 12)}</g>
        <g transform="${TOP(x,82,PLZ+14)}"><circle class="face" cx="5" cy="4" r="2.6"/></g></g>`;
    svg += kiosk(1, 46) + kiosk(2, 58);
    COLS.forEach(x => { svg += box(x, 88, PLZ, 4, 4, 36, 1); });
    svg += box(70, 44, 118, 260, 56, 8, 2);
    svg += `<g transform="${TOP(70,44,126)}">${slits(8, 252, 8, 4, 52)}</g>`;
    svg += `<g transform="${FRONT(70,100,126)}">
      <rect class="halo" id="metro-fhalo" x="4" y="2" width="252" height="4" filter="url(#bloom)"/>
      <rect class="edge" id="metro-fascia" x="4" y="2" width="252" height="4" rx="1"/></g>`;
    svg += `<g transform="${SIDE(330,100,126)}"><text class="label" x="6" y="5.6" font-size="4">LINE 3</text></g>`;
    svg += `<g id="metro-board">${box(166, 100, 106, 68, 2, 16, 1)}
      <g transform="${FRONT(166,102,122)}">
        <rect class="halo hot" x="2" y="1.5" width="64" height="13" filter="url(#bloom)"/>
        <rect class="face glass hot" filter="url(#soft)" x="2" y="1.5" width="64" height="13" rx="1"/>
        <g filter="url(#soft)"><rect class="scr-accent" x="4" y="3" width="15" height="5" rx="0.6"/>
        <text class="board-t" x="5" y="6.8" font-size="3.8" style="fill:var(--panel)">LINE 3</text>
        <text class="board-t scr" x="22" y="6.8" font-size="3.8">NEXT</text>
        <text class="board-t scr" id="metro-b1" x="4.5" y="12.6" font-size="3.8">1 · 4 MIN</text>
        <text class="board-t scr" id="metro-b2" x="35" y="12.6" font-size="3.8">2 · 6 MIN</text></g>
      </g></g>`;

    function train(n) {
      const y = TRK[n].y, z = DZ + 1;
      let s = `<g clip-path="url(#metro-clip${n})"><g id="metro-train${n}" class="train">`;
      for (let c = 0; c < 3; c++) {
        const x = c * (CARW + GAP);
        if (c) s += box(x - GAP, y + 4, z + 3, GAP, CD - 8, CH - 6, 1);
        s += box(x, y, z, CARW, CD, CH, 3);
        s += `<g transform="${FRONT(x,y+CD,z+CH)}">
          <line class="detail" x1="2" y1="3" x2="${CARW-2}" y2="3"/><line class="detail" x1="2" y1="${CH-3}" x2="${CARW-2}" y2="${CH-3}"/>
          <g class="wins">${[4, 10.5, 24, 30.5, 37, 52.5, 59].map(u => `<rect class="win" x="${u}" y="6" width="4.8" height="7" rx="0.8"/>`).join('')}</g>
          ${[16.5, 43.5].map(u => `<rect class="doorway" x="${u}" y="5" width="6" height="${CH-6}"/>
            <rect class="face leaf leafL" x="${u}" y="5" width="3" height="${CH-6}"/><rect class="face leaf leafR" x="${u+3}" y="5" width="3" height="${CH-6}"/>`).join('')}
          <text class="label" x="${CARW-12}" y="${CH-4.6}" font-size="3">3·${n}${c}</text>
        </g>`;
        s += `<g transform="${TOP(x,y,z+CH)}">${slits(6, CARW - 6, 3, 5, CD - 5)}</g>`;
        if (c === 2) s += `<g transform="${SIDE(x+CARW,y+CD,z+CH)}">
          <rect class="face recess" x="3" y="4" width="16" height="8" rx="1.5"/><g class="wins"><rect class="win" x="4" y="5" width="14" height="6" rx="1"/></g>
          <circle class="lamp" cx="5" cy="17" r="1.6"/><circle class="lamp" cx="17" cy="17" r="1.6"/>
          <text class="label" x="9.6" y="19" font-size="3.4">3</text></g>`;
      }
      return s + '</g></g>';
    }
    svg += train(1) + train(2);

    svg += box(40, 166, DZ, 296, 24, PLZ - DZ, 2);
    svg += `<g transform="${TOP(40,166,PLZ)}"><rect id="metro-edge2" class="edge" x="2" y="1" width="292" height="3"/>${slits(10, 286, 12, 6, 18)}</g>`;
    svg += box(X0, 186, DZ, 50, 4, 6, 1) + box(336, 186, DZ, X1 - 336, 4, 6, 1);
    svg += box(40, 188, PLZ, 266, 2, 7, 0.5);
    svg += `<g transform="${FRONT(40,190,PLZ+7)}">${slits(4, 262, 4, 1, 7)}</g>`;
    const N = 10, RUN = 3.4, RISE = (PLZ - PZ) / N;
    for (let i = 0; i < N; i++) svg += box(310, 190 + i * RUN, PZ, 24, RUN, PLZ - (i + 1) * RISE + RISE - PZ, 0.5);
    svg += `<g transform="${SIDE(334,190,PLZ)}"><text class="label" x="2" y="7" font-size="3.6">M · LINE 3</text></g>`;
    for (const x of [310.5, 333.5]) {
      svg += `<path class="wire" d="${K.path([[x,190,PLZ+10],[x,190+N*RUN,PZ+RISE+10],[x,190+N*RUN+3,PZ+RISE+10]])}"/>`;
      svg += `<path class="detail" d="${K.path([[x,190+N*RUN,PZ+RISE],[x,190+N*RUN,PZ+RISE+10]])}"/>`;
    }

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    const q = s => stage.querySelector(s);
    const els = { 1: q('#metro-train1'), 2: q('#metro-train2') };
    const edges = { 1: q('#metro-edge1'), 2: q('#metro-edge2') };
    const leaves = { 1: [...els[1].querySelectorAll('.leaf')], 2: [...els[2].querySelectorAll('.leaf')] };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bt = { 1: q('#metro-b1'), 2: q('#metro-b2') };
    const kiosks = Object.fromEntries([...stage.querySelectorAll('.kiosk')].map(k => [k.dataset.track, k]));
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const st = { riders: 0, out: '', T: { 1: { t0: null, boarded: false, min: rnd(2, 5) }, 2: { t0: null, boarded: false, min: rnd(3, 7) } } };
    const eOut = t => 1 - Math.pow(1 - t, 3), eIn = t => t * t * t;
    let ac = null;
    function chime() {
      if (!ac) return;
      try { const { ctx, out } = ac, t = ctx.currentTime;
        [[660, 0], [494, 0.22]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.08, t + d + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5); o.connect(g); g.connect(out); o.start(t + d); o.stop(t + d + 0.55); });
      } catch (e) {}
    }
    function phase(n, now) {
      const T = st.T[n]; if (T.t0 === null) return { ph: 'idle', x: TRK[n].dir > 0 ? OFF_L : OFF_R };
      const e = now - T.t0, dir = TRK[n].dir, start = dir > 0 ? OFF_L : OFF_R, end = dir > 0 ? OFF_R : OFF_L;
      if (e < A) return { ph: 'arriving', x: start + (STOP - start) * eOut(e / A) };
      if (e < A + W) { const k = e - A, amt = Math.min(1, Math.max(0, (k - OPEN0) / 450), Math.max(0, (A + OPEN1 + 450 - e) / 450));
        return { ph: 'boarding', x: STOP, open: k > OPEN0 && k < OPEN1, amt: reduce ? (k > OPEN0 && k < OPEN1 ? 1 : 0) : amt }; }
      if (e < A + W + L) return { ph: 'departing', x: STOP + (end - STOP) * eIn((e - A - W) / L) };
      T.t0 = null; T.boarded = false; T.min = rnd(2, 8);
      return { ph: 'idle', x: start };
    }
    function frame(now) {
      const parts = []; let active = false;
      for (const n of [1, 2]) {
        const p = phase(n, now), el = els[n], T = st.T[n];
        const [dx, dy] = D(p.x, 0, 0);
        el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
        el.classList.toggle('run', p.ph !== 'idle');
        el.classList.toggle('hot', p.ph === 'boarding');
        el.classList.toggle('open', !!p.open);
        const amt = p.amt || 0;
        if (amt !== T.amt) { T.amt = amt; const o = (3.6 * (amt < .5 ? 2 * amt * amt : 1 - 2 * (1 - amt) ** 2)).toFixed(2);
          leaves[n].forEach(l => l.setAttribute('transform', `translate(${l.classList.contains('leafL') ? -o : o} 0)`)); }
        if (p.open && !T.boarded) { T.boarded = true; st.riders += rnd(14, 52); chime(); }
        edges[n].classList.toggle('hot', p.ph === 'arriving' || p.ph === 'boarding');
        edges[n].classList.toggle('blink', p.ph === 'arriving');
        const label = { idle: `${T.min} MIN`, arriving: 'ARR', boarding: 'BRD', departing: 'DEP' }[p.ph];
        if (bt[n].textContent !== `${n} · ${label}`) bt[n].textContent = `${n} · ${label}`;
        if (p.ph !== 'idle') { active = true; parts.push(`train ${n} ${p.ph}`); }
        if (p.ph === 'boarding') parts.boarding = true;
      }
      q('#metro-fascia').classList.toggle('hot', !!parts.boarding);
      q('#metro-fhalo').classList.toggle('hot', !!parts.boarding);
      const out = ['line 3', ...(parts.length ? parts : ['platform clear']), `${st.riders} riders`].join(' · ');
      if (out !== st.out) { st.out = out; api.readout(out); api.power(active); }
    }
    function dispatch(n, warp = 0) {
      api.flash(kiosks[n]);
      const T = st.T[n]; if (T.t0 !== null) return true;
      T.t0 = performance.now() - warp; T.boarded = false;
      frame(performance.now());
      return true;
    }
    function gesture() { if (!ac) { try { ac = api.audio(); } catch (e) { ac = null; } } }
    stage.addEventListener('click', e => {
      const k = e.target.closest('.kiosk');
      if (k) { gesture(); dispatch(+k.dataset.track); return; }
      if (e.target.closest('#metro-board')) {
        gesture();
        const idle = [1, 2].filter(n => st.T[n].t0 === null).sort((a, b) => st.T[a].min - st.T[b].min);
        if (idle.length) dispatch(idle[0]);
      }
    });
    api.loop(frame);
    frame(performance.now());
    return {
      key(e) { if (e.key !== '1' && e.key !== '2') return false; if (!e.repeat) { gesture(); dispatch(+e.key); } return true; },
      demo() { dispatch(1, A + 900); api.after(250, () => dispatch(2, 1200)); },
    };
  },
});
