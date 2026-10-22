/* Fig 2 — Apartment block: call the glass elevator; each arrival switches that floor's lights. */
FIGS.push({
  id: 'apartments',
  name: 'Apartment block',
  hint: 'Press 1–7 or the call buttons',
  aria: 'Isometric seven-storey apartment block with a glass elevator on its side and a street call panel with buttons 1 to 7. Press a number key or click a call button to send the car to that floor; arriving at a floor toggles that apartment\'s lights.',
  css: `
    [data-fig="apartments"] .win { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="apartments"] .fl.on .win { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="apartments"] .fl.on .win.hi { fill:var(--accent-hi); }
    [data-fig="apartments"] .fl.on { filter:url(#soft); }
    [data-fig="apartments"] .fhalo { fill:var(--accent); opacity:0; }
    [data-fig="apartments"] .fhalo.on { opacity:.42; }
    [data-fig="apartments"] .car .face { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="apartments"] .car .face.top { fill:var(--accent-hi); }
    [data-fig="apartments"] .car .detail { stroke:var(--accent-hi); }
    [data-fig="apartments"] .sg { fill:var(--glass); fill-opacity:.16; stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="apartments"] .lamp { fill:var(--detail); }
    [data-fig="apartments"] .lamp.on { fill:var(--accent-hi); filter:url(#glow); }
    [data-fig="apartments"] .btn text { fill:var(--ink); pointer-events:none; }
    [data-fig="apartments"] .btn.lit text, [data-fig="apartments"] .btn.latched text { fill:var(--panel); }
    [data-fig="apartments"] .brick line { stroke:var(--detail); stroke-width:.35; }
    [data-fig="apartments"] .ind { font-size:5.4px; }
  `,
  mount(stage, api) {
    const K = api.iso.frame([[0,220,0],[300,0,7],[300,220,0],[0,0,7],[24,24,193],[58,48,243],[214,60,225],[244,60,225]], 0.05);
    const { TOP, FRONT, SIDE, box, path } = K, slits = api.iso.slits;
    const PZ = 7, BX = 24, BY = 24, BW = 190, BD = 126, BH = 186, BT = PZ + BH, BF = BY + BD, FH = 26, N = 7;
    const SX = BX + BW, SY = 60, SW = 30, SD = 36, ST = 217;
    const PX = 222, PY = 110, PW = 60, PD = 22, PH = 14;
    const z0 = i => PZ + (i - 1) * FH;
    const vt = i => BT - (z0(i) + FH);
    const FWIN = [10, 38, 66, 106, 134, 162];
    const SWIN = [8, 24, 38, 96, 110];

    let svg = `<defs><pattern id="apartments-brick" width="14" height="6" patternUnits="userSpaceOnUse"><g class="brick">
      <line x1="0" y1="3" x2="14" y2="3"/><line x1="0" y1="6" x2="14" y2="6"/><line x1="4" y1="0" x2="4" y2="3"/><line x1="11" y1="3" x2="11" y2="6"/></g></pattern></defs>`;

    svg += box(0, 0, 0, 300, 220, PZ, 14);
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="detail" x="8" y="8" width="284" height="204" rx="10"/>
      ${[[14,14],[286,14],[14,206],[286,206]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="2.6"/><line class="detail" x1="${x-1.6}" y1="${y}" x2="${x+1.6}" y2="${y}"/>`).join('')}
      ${Array.from({ length: 12 }, (_, i) => `<rect class="face recess" x="${22 + i * 22}" y="202" width="12" height="2.4" rx="1"/>`).join('')}
      <line class="detail" x1="16" y1="193" x2="284" y2="193"/>
      ${slits(232, 284, 6, 30, 100)}
    </g>`;

    svg += box(BX, BY, PZ, BW, BD, BH, 3);
    svg += `<g transform="${TOP(BX,BY,BT)}"><rect class="detail" x="4" y="4" width="${BW-8}" height="${BD-8}" rx="2"/><rect class="face recess" x="120" y="70" width="30" height="20" rx="2"/></g>`;
    let fr = `<rect width="${BW}" height="${BH}" fill="url(#apartments-brick)"/>`;
    for (let i = 1; i <= N; i++) {
      const v = vt(i);
      fr += `<rect class="fhalo" data-f="${i}" x="4" y="${v + 3}" width="${BW - 8}" height="${FH - 5}" filter="url(#bloom)"/>`;
      if (i < N) fr += `<line class="detail" x1="0" y1="${v + FH}" x2="${BW}" y2="${v + FH}"/><line class="detail" x1="0" y1="${v + FH - 1.6}" x2="${BW}" y2="${v + FH - 1.6}"/>`;
    }
    for (let i = 1; i <= N; i++) {
      const v = vt(i);
      fr += `<g class="fl" data-f="${i}">${FWIN.map((u, k) => `<rect class="win${(k + i) % 3 ? '' : ' hi'}" x="${u}" y="${v + 6}" width="18" height="14"/>`).join('')}</g>`;
      fr += FWIN.map(u => `<line class="detail" x1="${u + 9}" y1="${v + 6}" x2="${u + 9}" y2="${v + 20}"/><rect class="face" x="${u - 1}" y="${v + 20}" width="20" height="1.6"/>`).join('');
    }
    fr += `<rect class="face recess" x="84" y="166" width="22" height="14" rx="1"/><line class="detail" x1="95" y1="166" x2="95" y2="180"/>
      <rect class="face" x="86" y="157" width="18" height="6" rx="1"/>
      <rect class="halo hot" x="86" y="157" width="18" height="6" filter="url(#bloom)"/>
      <rect class="face glass hot" x="87" y="157.6" width="16" height="4.8" rx=".8" filter="url(#soft)"/>
      <text id="apartments-ind" class="scr ind" x="95" y="161.9" text-anchor="middle" filter="url(#soft)">1F</text>
      <text class="label" x="5" y="${BH - 3}" font-size="4.5">NO. 27 · ELM ROW</text>`;
    svg += `<g transform="${FRONT(BX,BF,BT)}">${fr}</g>`;
    let sd = `<rect width="${BD}" height="${BH}" fill="url(#apartments-brick)"/>`;
    for (let i = 1; i <= N; i++) {
      const v = vt(i);
      if (i < N) sd += `<line class="detail" x1="0" y1="${v + FH}" x2="${BD}" y2="${v + FH}"/><line class="detail" x1="0" y1="${v + FH - 1.6}" x2="${BD}" y2="${v + FH - 1.6}"/>`;
      sd += `<g class="fl" data-f="${i}">${SWIN.map((u, k) => `<rect class="win${(k + i) % 2 ? '' : ' hi'}" x="${u}" y="${v + 6}" width="12" height="14"/>`).join('')}</g>`;
      sd += `<rect class="face recess" x="60" y="${v + 4}" width="24" height="21"/><line class="detail" x1="72" y1="${v + 4}" x2="72" y2="${v + 25}"/>`;
    }
    svg += `<g transform="${SIDE(SX,BF,BT)}">${sd}</g>`;

    [[60,50],[92,50],[60,84],[92,84]].forEach(([x, y]) => { svg += box(x, y, BT, 2.4, 2.4, 18); });
    svg += box(58, 48, BT + 18, 38, 38, 2, 2);
    svg += box(60, 50, BT + 20, 34, 34, 18, 6);
    svg += `<g transform="${FRONT(60,84,BT+38)}">${slits(4, 16, 4, 0, 34, false)}</g><g transform="${SIDE(94,84,BT+38)}">${slits(4, 16, 4, 0, 34, false)}</g>`;
    svg += box(68, 58, BT + 38, 18, 18, 4, 3);
    svg += box(150, 36, BT, 26, 18, 9, 2);
    svg += `<g transform="${FRONT(150,54,BT+9)}">${slits(4, 22, 2.6, 2, 7)}</g>`;
    svg += `<path class="detail" d="${path([[190,40,BT],[190,40,BT+30]])}"/><path class="detail" d="${path([[186,40,BT+24],[194,40,BT+24]])}"/>`;

    svg += `<g transform="${FRONT(SX,SY,ST)}"><rect class="face recess" width="${SW}" height="${ST - PZ}"/>${slits(6, 24, 18, 0, ST - PZ)}</g>`;
    svg += `<g transform="${TOP(SX,SY,PZ)}"><rect class="face recess" width="${SW}" height="${SD}"/></g>`;
    const CZ = z0(1) + 1.5;
    svg += `<g id="apartments-carmove">
      <g transform="${SIDE(241,93,CZ+22)}"><rect class="halo hot" x="-8" y="-6" width="46" height="34" filter="url(#bloom)"/></g>
      <g class="car" filter="url(#glow)">${box(217, 63, CZ, 24, 30, 22, 1.5)}
        <g transform="${FRONT(217,93,CZ+22)}"><line class="detail" x1="12" y1="3" x2="12" y2="22"/></g>
        <g transform="${SIDE(241,93,CZ+22)}">${slits(3, 9, 3, 6, 9, false)}</g></g></g>`;
    svg += `<path id="apartments-cable" class="wire hot" filter="url(#soft)"/>`;
    let gf = `<rect class="sg" width="${SW}" height="${ST - PZ}"/>`, gs = `<rect class="sg" width="${SD}" height="${ST - PZ}"/>`;
    for (let i = 1; i <= N; i++) {
      const v = ST - z0(i);
      gf += `<line class="detail" x1="0" y1="${v}" x2="${SW}" y2="${v}"/>`;
      gs += `<line class="detail" x1="0" y1="${v}" x2="${SD}" y2="${v}"/><rect class="lamp" data-f="${i}" x="3" y="${v - 25}" width="${SD - 6}" height="2"/>`;
    }
    svg += `<g transform="${FRONT(SX,SY+SD,ST)}">${gf}</g><g transform="${SIDE(SX+SW,SY+SD,ST)}">${gs}</g>`;
    svg += box(SX + SW - 1.6, SY + SD - 1.6, PZ, 1.6, 1.6, ST - PZ);
    svg += box(SX, SY, ST, SW, SD, 8, 2);
    svg += `<g transform="${SIDE(SX+SW,SY+SD,ST+8)}">${slits(6, 30, 3, 2, 6)}</g>`;

    svg += box(PX, PY, PZ, PW, PD, PH, 2);
    svg += `<g transform="${TOP(PX,PY,PZ+PH)}"><rect class="face recess" x="1.5" y="2" width="${PW - 3}" height="${PD - 4}" rx="2"/></g>`;
    svg += `<g transform="${FRONT(PX,PY+PD,PZ+PH)}"><text class="label" x="3" y="6" font-size="4">CALL · LIFT</text>${slits(40, 56, 2.4, 3, 10)}</g>`;
    svg += `<g transform="${SIDE(PX+PW,PY+PD,PZ+PH)}"><rect class="face recess" x="4" y="3" width="14" height="4" rx="1"/></g>`;
    for (let i = 1; i <= N; i++) {
      const x = PX + 3 + (i - 1) * 8;
      svg += `<g class="press btn" data-f="${i}">${box(x, PY + 4, PZ + PH, 6.4, 13, 2.6, 1.2)}<g transform="${TOP(x, PY + 4, PZ + PH + 2.6)}"><text x="3.2" y="9" font-size="6" text-anchor="middle">${i}</text></g></g>`;
    }

    svg += box(10, BF, PZ, 280, 38, 2, 2);
    svg += `<g transform="${TOP(10,BF,PZ+2)}">${slits(14, 270, 16, 0, 38)}</g>`;
    svg += box(102, BF, PZ + 2, 34, 12, 2, 1);
    svg += box(105, BF, PZ + 4, 28, 7, 2, 1);
    svg += box(104, BF, 28, 30, 7, 2, 1);
    for (let i = 2; i <= N; i++) {
      [38, 134].forEach(u => {
        const x = BX + u - 5, z = z0(i);
        svg += box(x, BF, z, 28, 11, 1.6, .6);
        svg += box(x, BF, z + 1.6, 1.4, 9.6, 7);
        svg += box(x + 26.6, BF, z + 1.6, 1.4, 9.6, 7);
        svg += box(x, BF + 9.6, z + 1.6, 28, 1.4, 7);
        svg += `<g transform="${FRONT(x, BF + 11, z + 8.6)}">${slits(2.5, 26, 2.3, 1.2, 7)}</g>`;
      });
    }

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    const q = s => stage.querySelector(s), qa = s => [...stage.querySelectorAll(s)];
    const carEl = q('#apartments-carmove'), cable = q('#apartments-cable'), ind = q('#apartments-ind');
    const btns = new Map(qa('.btn').map(b => [+b.dataset.f, b]));
    const A = 6, VMAX = 1 / 0.6;
    const st = { pos: 1, v: 0, dir: 0, queue: [], lit: new Set(), landing: 0, dwell: 0, target: null };

    function pick() {
      if (!st.queue.length) return null;
      if (st.dir) {
        const ahead = st.queue.filter(f => st.dir > 0 ? f > st.pos - 1e-6 : f < st.pos + 1e-6);
        const brake = st.v * st.v / (2 * A) * 0.9;
        const ok = ahead.filter(f => f === st.target || Math.abs(f - st.pos) >= brake);
        const c = ok.length ? ok : ahead;
        if (c.length) return c.reduce((a, b) => Math.abs(b - st.pos) < Math.abs(a - st.pos) ? b : a);
      }
      return st.queue.reduce((a, b) => Math.abs(b - st.pos) < Math.abs(a - st.pos) ? b : a);
    }
    function arrive(f) {
      st.pos = f; st.v = 0;
      st.queue = st.queue.filter(x => x !== f);
      if (st.lit.has(f)) st.lit.delete(f); else st.lit.add(f);
      st.landing = f; st.dwell = 0.3;
      if (!st.queue.length) st.dir = 0;
      try { const { ctx, out } = api.audio(); const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
        o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.55); } catch (e) {}
    }
    function call(f) {
      if (!(f >= 1 && f <= N)) return false;
      api.flash(btns.get(f), 220);
      if (Math.abs(st.pos - f) < 1e-6 && st.v === 0) arrive(f);
      else if (!st.queue.includes(f)) st.queue.push(f);
      render(); return true;
    }
    function render() {
      const floor = Math.round(st.pos), moving = st.v > 0 || st.queue.length > 0;
      const arrow = moving && st.dir > 0 ? '↑' : moving && st.dir < 0 ? '↓' : '';
      carEl.setAttribute('transform', `translate(0 ${(-(st.pos - 1) * FH).toFixed(2)})`);
      cable.setAttribute('d', path([[229, 78, ST], [229, 78, CZ + 22 + (st.pos - 1) * FH]]));
      ind.textContent = `${floor}F${arrow ? ' ' + arrow : ''}`;
      qa('.fl, .fhalo').forEach(g => g.classList.toggle('on', st.lit.has(+g.dataset.f)));
      qa('.lamp').forEach(l => l.classList.toggle('on', +l.dataset.f === st.landing));
      btns.forEach((b, f) => b.classList.toggle('latched', st.queue.includes(f)));
      api.power(moving || st.lit.size > 0);
      const n = st.lit.size;
      api.readout(`car ${floor}F${arrow ? ' ' + arrow : ''} · queue ${st.queue.join(' ') || '—'} · ${n} home${n === 1 ? '' : 's'} lit`);
    }
    let last = performance.now();
    function tick() {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (dt <= 0) return;
      if (st.dwell > 0) { st.dwell -= dt; return; }
      const t = st.target = pick();
      if (t === null) { if (st.v) { st.v = 0; render(); } return; }
      const dist = t - st.pos, s = Math.sign(dist);
      st.dir = s; st.landing = 0;
      st.v = Math.min(st.v + A * dt, VMAX, Math.sqrt(2 * A * Math.abs(dist)) + 0.05);
      const step = st.v * dt;
      if (step >= Math.abs(dist)) arrive(t); else st.pos += s * step;
      render();
    }
    api.loop(tick);
    api.every(40, tick);

    stage.addEventListener('click', e => { const b = e.target.closest('.btn'); if (b) call(+b.dataset.f); });
    render();
    return {
      key: e => /^[1-7]$/.test(e.key) && !e.repeat ? call(+e.key) : false,
      demo: () => { call(1); api.after(80, () => call(5)); api.after(160, () => call(2)); },
    };
  },
});
