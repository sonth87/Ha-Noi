/* Fig 10 — Night diner & gas station: neon sign toggles, pumps meter real fuel. */
FIGS.push({
  id: 'diner',
  name: 'Night diner',
  hint: 'N or click the sign · 1 / 2 or click a pump · S stop',
  aria: 'Isometric roadside diner and gas station at night: a streamlined diner with a counter and stools behind its windows, a tall DINER 24 neon pole sign, and a canopy over two fuel pumps with a car parked at pump 1. Press n or click the sign to switch the neon and the diner lights; press 1 or 2 or click a pump to start or stop fuelling (its display counts litres and dollars); press s to stop all pumps.',
  css: `
    [data-fig="diner"] .sign, [data-fig="diner"] .pump { cursor:pointer; }
    [data-fig="diner"] .sign:hover .face.top, [data-fig="diner"] .pump:hover .face.top { stroke:var(--ink); }
    [data-fig="diner"] .tube { fill:none; stroke:var(--line); stroke-width:1.5; vector-effect:non-scaling-stroke; stroke-linecap:round; stroke-linejoin:round;  }
    [data-fig="diner"] .tubes text { font-weight:500; }
    [data-fig="diner"].neon .tube { stroke:var(--accent-hi); }
    [data-fig="diner"].neon .tube.flk { stroke:var(--line); }
        [data-fig="diner"].neon .tubes { filter:url(#glow); }
    [data-fig="diner"] .dwin { fill:var(--glass); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="diner"].neon .dwin { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="diner"] .din { fill:var(--body); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="diner"].neon .din { fill:var(--recess); stroke:var(--recess); }
    [data-fig="diner"] .dinl { fill:none; stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="diner"].neon .dinl { stroke:var(--recess); }
    [data-fig="diner"] .lamp { fill:var(--detail); }
    [data-fig="diner"].neon .lamp { fill:var(--accent-hi); }
        [data-fig="diner"].neon .wins { filter:url(#soft); }
    [data-fig="diner"] .ptxt { fill:var(--ink); font-family:var(--mono); }
    [data-fig="diner"] .pump.run .ptxt { fill:var(--accent-hi); }
    [data-fig="diner"] .pump.run .pdisp { filter:url(#soft); }
    [data-fig="diner"] .pump.run .phead { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="diner"] .pump.run .phead + .ptxt { fill:var(--recess); }
    [data-fig="diner"] .hose { stroke-width:1.8; transition:none; }
    [data-fig="diner"] .hose.hot { filter:url(#glow); stroke:var(--accent-hi); }
    [data-fig="diner"] .strip { fill:var(--recess); }
    [data-fig="diner"] .strip.hot { fill:var(--accent-hi); filter:url(#glow); }
    [data-fig="diner"] .lane { fill:none; stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
  `,
  mount(stage, api) {
    /*  boxes             x    y    z    w    d    h
        plate             0    0    0  450  350    7
        curb              0  262    7  450    8    3     road y 272..342 drawn on plate top
        diner plinth     24   34    7  212   78    4
        diner body       20   30   11  220   85   55   -> front y=115, top z=66
        pole            283  110    7    6    6  143
        canopy          300   80   98  125   95   12   -> front y=175
        island          312  140    7  104   18    3
        pump i       318/372  142   10   26   12   46   -> front y=154, top z=56
        car             300  168    9   66   28   14   cabin 316..352 to z 34
        sign board      246  108  150   80    8   72   -> top z=222                       */
    const K = api.iso.frame([[0,256,0],[450,0,7],[450,256,0],[0,0,7],[246,116,222],[326,108,222],[246,108,222]]);
    const { TOP, FRONT, SIDE, box, path } = K, slits = api.iso.slits;
    const PZ = 7;
    const DX = 20, DY = 30, DZ = 11, DW = 220, DD = 85, DH = 55, DT = DZ + DH, DF = DY + DD;
    const PUMPS = [{ n: 1, x: 318 }, { n: 2, x: 372 }];
    const PY = 142, PD = 12, PW = 26, PZ0 = 10, PH = 46, PT = PZ0 + PH, PF = PY + PD;
    const SX = 246, SY = 108, SZ = 150, SW = 80, SD = 8, SH = 72, ST = SZ + SH;
    const PRICE = 1.76, RATE = 0.62; // $/L, L/s

    let svg = `<defs><clipPath id="diner-wclip">`;
    const WIN = []; for (let i = 0; i < 7; i++) WIN.push(10 + i * 23);
    WIN.forEach(x => { svg += `<rect x="${x}" y="16" width="20" height="25" rx="3"/>`; });
    svg += `</clipPath></defs>`;

    // ---------- plate ----------
    svg += box(0, 0, 0, 450, 256, PZ, 14);
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="detail" x="9" y="9" width="432" height="238" rx="10"/>
      ${[[16,16],[434,16],[16,240],[434,240]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="3"/><line class="detail" x1="${x-1.8}" y1="${y}" x2="${x+1.8}" y2="${y}"/>`).join('')}
      <rect class="face recess" x="4" y="208" width="442" height="42" rx="2"/>
      <line class="lane" x1="4" y1="213" x2="446" y2="213"/><line class="lane" x1="4" y1="245" x2="446" y2="245"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect class="detail" x="${10 + i * 37}" y="227.5" width="20" height="3"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<line class="detail" x1="${30 + i * 28}" y1="124" x2="${30 + i * 28}" y2="166"/>`).join('')}
      <line class="detail" x1="30" y1="166" x2="226" y2="166"/>
      <rect class="detail" x="24" y="${DF}" width="212" height="6"/>
    </g>`;
    // curb
    svg += box(0, 200, PZ, 450, 8, 3, 1.5);
    svg += `<g transform="${FRONT(0,208,PZ+3)}">${slits(12, 440, 24, 0, 3)}</g>`;

    // ---------- diner ----------
    svg += box(DX + 4, DY + 4, PZ, DW - 8, DD - 7, DZ - PZ, 3);
    svg += box(DX, DY, DZ, DW, DD, DH, 14);
    // front face
    svg += `<g transform="${FRONT(DX,DF,DT)}">
      ${slits(3, 12, 1.8, 6, DW - 6, false)}
      <line class="detail" x1="4" y1="14" x2="${DW-4}" y2="14"/>
      <rect class="halo" id="diner-whalo" x="6" y="14" width="200" height="30" rx="6" filter="url(#bloom)"/>
      <g class="wins">
        ${WIN.map(x => `<rect class="dwin" x="${x}" y="16" width="20" height="25" rx="3"/>`).join('')}
        <g clip-path="url(#diner-wclip)">
          ${Array.from({ length: 10 }, (_, i) => `<circle class="lamp" cx="${16 + i * 17}" cy="19.5" r="1.4"/>`).join('')}
          <rect class="din" x="22" y="22" width="22" height="5" rx="1"/>
          <rect class="din" x="98" y="22" width="30" height="4"/>
          <rect class="din" x="0" y="33" width="180" height="1.8"/>
          <rect class="din" x="4" y="34.8" width="172" height="6.4"/>
          ${Array.from({ length: 11 }, (_, i) => { const x = 18 + i * 14.5;
            return `<rect class="din" x="${x-2.8}" y="35.6" width="5.6" height="1.4" rx=".7"/><line class="dinl" x1="${x}" y1="37" x2="${x}" y2="41"/>`; }).join('')}
          <circle class="din" cx="60" cy="27" r="2.6"/><rect class="din" x="140" y="25" width="5" height="6"/>
        </g>
      </g>
      ${WIN.map(x => `<line class="detail" x1="${x}" y1="28" x2="${x+20}" y2="28"/>`).join('')}
      <rect class="face recess" x="177" y="16" width="22" height="39" rx="2"/>
      <rect class="dwin" x="181" y="19" width="14" height="16" rx="1.5"/>
      <rect class="face" x="203" y="17" width="12" height="8" rx="1.5"/>
      <g class="tubes"><text class="tube" id="diner-open" x="209" y="23" font-size="4.4" text-anchor="middle" stroke-width="1">OPEN</text></g>
      ${slits(6, 172, 4, 45, 53)}
      <line class="detail" x1="4" y1="44" x2="174" y2="44"/>
    </g>`;
    // side face
    svg += `<g transform="${SIDE(DX+DW,DF,DT)}">
      ${slits(3, 12, 1.8, 8, DD - 8, false)}
      <rect class="halo" id="diner-shalo" x="10" y="14" width="66" height="30" rx="6" filter="url(#bloom)"/>
      <g class="wins">${[12, 34, 56].map(x => `<rect class="dwin" x="${x}" y="16" width="18" height="25" rx="3"/>`).join('')}</g>
      ${slits(10, 76, 4, 45, 53)}
    </g>`;
    // roof: AC units, vent stacks
    svg += `<g transform="${TOP(DX,DY,DT)}"><rect class="detail" x="8" y="8" width="${DW-16}" height="${DD-16}" rx="8"/></g>`;
    svg += box(60, 46, DT, 34, 24, 10, 2);
    svg += `<g transform="${FRONT(60,70,DT+10)}">${slits(3, 31, 2.5, 2, 8)}</g><g transform="${TOP(60,46,DT+10)}"><circle class="detail" cx="17" cy="12" r="8"/><circle class="detail" cx="17" cy="12" r="3"/></g>`;
    svg += box(130, 50, DT, 22, 18, 7, 2);
    svg += `<g transform="${TOP(130,50,DT+7)}">${slits(4, 18, 2.5, 3, 15)}</g>`;
    svg += box(186, 56, DT, 6, 6, 16, 1) + box(200, 56, DT, 6, 6, 12, 1);

    // ---------- pole ----------
    svg += box(280, 107, PZ, 12, 12, 4, 2);
    svg += box(283, 110, PZ + 4, 6, 6, SZ - PZ - 4, 1);

    // ---------- canopy + pumps ----------
    const col = (x, y) => box(x, y, PZ, 6, 6, 91, 1);
    svg += col(306, 90) + col(413, 90);
    svg += box(300, 80, 98, 125, 95, 12, 4);
    svg += `<g transform="${FRONT(300,175,110)}">
      ${slits(2.5, 5.5, 1.5, 4, 121, false)}
      <rect class="strip" id="diner-strip" x="4" y="8" width="117" height="2.2" rx="1"/>
    </g>`;
    svg += `<g transform="${SIDE(425,175,110)}">${slits(2.5, 5.5, 1.5, 4, 91, false)}<rect class="strip" x="4" y="8" width="87" height="2.2" rx="1"/></g>`;
    svg += `<g transform="${TOP(300,80,110)}"><rect class="detail" x="6" y="6" width="113" height="83" rx="3"/><text class="label" x="62" y="50" font-size="14" text-anchor="middle" letter-spacing="3">FUEL</text></g>`;
    svg += box(312, 140, PZ, 104, 18, 3, 2);
    PUMPS.forEach(p => {
      svg += `<g class="pump" data-pump="${p.n}">`;
      svg += box(p.x, PY, PZ0, PW, PD, PH, 2);
      svg += `<g transform="${FRONT(p.x,PF,PT)}">
        <rect class="face recess phead" x="2" y="2" width="22" height="5" rx="1"/>
        <text class="ptxt" x="13" y="6.1" font-size="3.8" text-anchor="middle">PUMP ${p.n}</text>
        <rect class="halo" id="diner-ph${p.n}" x="1" y="8" width="24" height="17" rx="2" filter="url(#bloom)"/>
        <g class="pdisp">
          <rect class="face glass" id="diner-pg${p.n}" x="3" y="9" width="20" height="15" rx="1.5"/>
          <text class="ptxt" id="diner-pd${p.n}" x="21" y="15.6" font-size="5" text-anchor="end">$0.00</text>
          <text class="ptxt" id="diner-pl${p.n}" x="21" y="21.6" font-size="4.2" text-anchor="end">0.0 L</text>
        </g>
        <rect class="face recess" x="15" y="27" width="8" height="10" rx="1"/>
        ${[0,1,2].map(i => `<rect class="face" x="${3 + i * 3.6}" y="28" width="2.6" height="2.6" rx=".5"/>`).join('')}
        <circle class="led" id="diner-led${p.n}" cx="5" cy="35" r="1.2"/>
        ${slits(40, 44, 2, 3, 23, false)}
      </g>
      <g transform="${SIDE(p.x+PW,PF,PT)}">${slits(3, 9, 2, 6, 38)}</g>
      <g transform="${TOP(p.x,PY,PT)}"><rect class="detail" x="2" y="2" width="${PW-4}" height="${PD-4}" rx="1"/></g>`;
      svg += `</g>`;
    });
    svg += col(306, 150) + col(413, 150);
    // hoses
    const bez = (P0, P1, P2, P3, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n;
      return P0.map((_, j) => (1-t)**3*P0[j] + 3*(1-t)**2*t*P1[j] + 3*(1-t)*t**2*P2[j] + t**3*P3[j]); });
    const h1 = path(bez([PUMPS[0].x+19, PF, PT-34], [PUMPS[0].x+14, PF+4, 36], [PUMPS[0].x-4, 162, 38], [PUMPS[0].x-11, 171, 26]));
    const h2 = path(bez([PUMPS[1].x+19, PF, PT-34], [PUMPS[1].x+24, PF+12, 4], [PUMPS[1].x+4, PF+12, 4], [PUMPS[1].x+8, PF, PT-30]));
    svg += `<path class="wire-under" d="${h2}"/><path class="wire hose" id="diner-hose2" d="${h2}"/>`;
    svg += box(PUMPS[1].x + 6, PF, PT - 32, 4, 3, 5, 1);

    // ---------- car ----------
    const CX = 300, CY = 168, CW = 66, CD = 28;
    svg += box(CX, CY, 9, CW, CD, 14, 6);
    svg += box(CX + 16, CY + 3, 23, 36, CD - 6, 11, 5);
    svg += `<g transform="${FRONT(CX+16,CY+CD-3,34)}">
      <rect class="face recess" x="4" y="2" width="13" height="8" rx="2"/><rect class="face recess" x="19" y="2" width="13" height="8" rx="2"/></g>`;
    svg += `<g transform="${SIDE(CX+CW,CY+CD,23)}"><circle class="led hot" cx="5" cy="5" r="1.8"/><circle class="led hot" cx="23" cy="5" r="1.8"/>${slits(9, 19, 2, 8, 11)}</g>`;
    svg += `<g transform="${SIDE(CX+16+36,CY+CD-3,34)}"><rect class="face recess" x="3" y="2" width="16" height="8" rx="2"/></g>`;
    svg += `<g transform="${FRONT(CX,CY+CD,23)}">
      <line class="detail" x1="4" y1="5" x2="${CW-4}" y2="5"/><line class="detail" x1="33" y1="2" x2="33" y2="12"/>
      <circle class="face recess" cx="13" cy="12" r="5.5"/><circle class="detail" cx="13" cy="12" r="2"/>
      <circle class="face recess" cx="53" cy="12" r="5.5"/><circle class="detail" cx="53" cy="12" r="2"/></g>`;
    svg += box(PUMPS[0].x - 14, 169, 23, 6, 5, 3, 1);
    svg += `<path class="wire-under" d="${h1}"/><path class="wire hose" id="diner-hose1" d="${h1}"/>`;

    // ---------- sign ----------
    svg += `<g class="sign" id="diner-sign">`;
    svg += box(SX, SY, SZ, SW, SD, SH, 4);
    const L = ['D','I','N','E','R'];
    svg += `<g transform="${FRONT(SX,SY+SD,ST)}">
      <rect class="face recess" x="3" y="3" width="${SW-6}" height="${SH-6}" rx="6"/>
      <rect class="halo" id="diner-shalo2" x="4" y="4" width="${SW-8}" height="${SH-8}" rx="8" filter="url(#bloom)"/>
      <g class="tubes">
        <rect class="tube" id="diner-t-frame" x="6" y="6" width="${SW-12}" height="${SH-12}" rx="7"/>
        ${L.map((c, i) => `<text class="tube" id="diner-t${i}" x="${16 + i * 12}" y="30" font-size="17" text-anchor="middle">${c}</text>`).join('')}
        <text class="tube" id="diner-t5" x="40" y="57" font-size="22" text-anchor="middle">24</text>
        <path class="tube" id="diner-t6" d="M14 46 H24 M18 42 L24 46 L18 50 M66 46 H56 M62 42 L56 46 L62 50"/>
      </g>
    </g>`;
    svg += `<g transform="${SIDE(SX+SW,SY+SD,ST)}">${slits(6, 66, 4, 2, 6, false)}</g>`;
    svg += `<g transform="${TOP(SX,SY,ST)}">${slits(6, 74, 6, 2, 6)}</g>`;
    svg += `</g>`;

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    const q = s => stage.querySelector(s);
    const st = { neon: false, pumps: { 1: { run: false, L: 0 }, 2: { run: false, L: 0 } }, last: 0 };
    const tubes = [...stage.querySelectorAll('#diner-sign .tube')].filter(t => t.id !== 'diner-t-frame');
    const money = L => '$' + (L * PRICE).toFixed(2);

    function drawPump(n) {
      const p = st.pumps[n];
      q(`#diner-pd${n}`).textContent = money(p.L);
      q(`#diner-pl${n}`).textContent = p.L.toFixed(1) + ' L';
    }
    function readout() {
      const parts = [st.neon ? 'open' : 'closed'];
      if (st.last) { const p = st.pumps[st.last]; parts.push(`pump ${st.last}`, p.L.toFixed(1) + ' L', money(p.L)); if (!p.run) parts.push('stopped'); }
      else parts.push('pumps idle');
      api.readout(parts.join(' · '));
    }
    function render() {
      stage.classList.toggle('neon', st.neon);
      ['#diner-whalo', '#diner-shalo', '#diner-shalo2'].forEach(s => q(s).classList.toggle('hot', st.neon));
      const any = st.pumps[1].run || st.pumps[2].run;
      stage.querySelectorAll('.strip').forEach(s => s.classList.toggle('hot', st.neon || any));
      [1, 2].forEach(n => { const run = st.pumps[n].run;
        q(`.pump[data-pump="${n}"]`).classList.toggle('run', run);
        q(`#diner-pg${n}`).classList.toggle('hot', run); q(`#diner-ph${n}`).classList.toggle('hot', run);
        q(`#diner-led${n}`).classList.toggle('hot', run); q(`#diner-hose${n}`).classList.toggle('hot', run);
        drawPump(n); });
      api.power(st.neon || any);
      readout();
    }
    function toggleNeon() { st.neon = !st.neon; if (!st.neon) tubes.forEach(t => t.classList.remove('flk')); render(); }
    function togglePump(n) { const p = st.pumps[n]; p.run = !p.run; st.last = n; render(); }
    function stopAll() { let any = false; [1, 2].forEach(n => { if (st.pumps[n].run) { st.pumps[n].run = false; any = true; } }); render(); return any; }

    // fuel metering in real time
    let prev = null;
    api.loop(ts => {
      const dt = prev == null ? 0 : Math.min(0.25, (ts - prev) / 1000); prev = ts;
      let ch = false;
      [1, 2].forEach(n => { const p = st.pumps[n]; if (p.run) { p.L += RATE * dt; drawPump(n); ch = true; } });
      if (ch) readout();
    });
    // occasional realistic flicker of one tube
    api.every(450, () => {
      if (!st.neon || Math.random() > 0.18) return;
      const t = tubes[Math.floor(Math.random() * tubes.length)];
      const blips = 1 + Math.floor(Math.random() * 3); let at = 0;
      for (let i = 0; i < blips; i++) {
        const off = 40 + Math.random() * 90, on = 30 + Math.random() * 70;
        api.after(at, () => st.neon && t.classList.add('flk'));
        api.after(at + off, () => t.classList.remove('flk'));
        at += off + on;
      }
    });

    stage.addEventListener('click', e => {
      const p = e.target.closest('.pump'); if (p) { togglePump(+p.dataset.pump); return; }
      if (e.target.closest('.sign')) toggleNeon();
    });
    render();
    return {
      key: e => {
        const k = e.key.toLowerCase();
        if (k === 'n') { toggleNeon(); return true; }
        if (k === '1' || k === '2') { togglePump(+k); return true; }
        if (k === 's') { stopAll(); return true; }
        return false;
      },
      demo: () => { api.after(60, () => { if (!st.neon) toggleNeon(); }); api.after(260, () => { if (!st.pumps[1].run) togglePump(1); }); },
    };
  },
});
