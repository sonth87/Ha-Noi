/* Fig 3 — Lighthouse: click the lantern to light it; the beam sweeps, h sounds the foghorn. */
FIGS.push({
  id: 'lighthouse',
  name: 'Lighthouse',
  hint: 'Click the lantern · ← → speed · h horn',
  aria: 'Isometric coastal lighthouse on a rocky outcrop with a keeper\'s cottage, surrounded by water. Click the lantern or press space to switch the light; the beam sweeps around. Left and right arrows change the rotation speed; h sounds the foghorn.',
  css: `
    [data-fig="lighthouse"] #lighthouse-tower { cursor:pointer; }
    [data-fig="lighthouse"] #lighthouse-tower:hover .lamp .face { stroke:var(--ink); }
    [data-fig="lighthouse"] .band .face { fill:var(--recess); }
    [data-fig="lighthouse"] .rail { fill:none; stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; stroke-linecap:round; }
    [data-fig="lighthouse"] .mull { fill:none; stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="lighthouse"] .lamp .face { fill:var(--glass); }
    [data-fig="lighthouse"].on .lamp .face { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="lighthouse"].on .lamp .face.top { fill:var(--accent-hi); }
    [data-fig="lighthouse"].on .lamp { filter:url(#glow); }
    [data-fig="lighthouse"].on .mull { stroke:var(--panel); }
    [data-fig="lighthouse"] .beam { opacity:0; }
    [data-fig="lighthouse"] .ring { fill:none; stroke:var(--ink-hi); stroke-width:1; vector-effect:non-scaling-stroke; opacity:0; }
    [data-fig="lighthouse"] .win.hot { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="lighthouse"] .wave { stroke:var(--line); }
  `,
  mount(stage, api) {
    const CX = 140, CY = 130, PZ = 7, LZ = 197;
    const K = api.iso.frame([[0,280,0],[320,0,7],[320,280,0],[0,0,7],[CX,CY,240],[CX-20,CY-20,194],[CX+20,CY-20,194]], 0.06);
    const { P, TOP, FRONT, SIDE, box, path } = K, slits = api.iso.slits;

    let svg = `<defs>
      <clipPath id="lighthouse-sea"><rect x="8" y="8" width="304" height="264" rx="10"/></clipPath>
      <linearGradient id="lighthouse-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style="stop-color:var(--accent-hi);stop-opacity:.95"/>
        <stop offset=".35" style="stop-color:var(--accent);stop-opacity:.55"/>
        <stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/>
      </linearGradient>
    </defs>`;

    svg += box(0, 0, 0, 320, 280, PZ, 14);
    svg += `<g transform="${FRONT(0,280,PZ)}"><text class="label" x="24" y="5.4" font-size="4.6" letter-spacing=".8">NORTH POINT LT · 41°N</text>${slits(250, 296, 3, 1.6, 5.4)}</g>`;
    const NO = [[92,82,96,96],[188,142,76,62],[60,140,40,36],[180,86,30,30],[160,170,30,26],[30,40,24,22],[262,60,26,28]];
    const inNo = (x, y) => NO.some(([a,b,w,d]) => x > a-4 && x < a+w+4 && y > b-2 && y < b+d+2);
    let waves = '';
    for (let r = 0, y = 16; y < 268; y += 10, r++)
      for (let x = 16 + (r % 2) * 9; x < 300; x += 18) if (!inNo(x, y) && !inNo(x+8, y)) waves += `<line class="detail wave" x1="${x}" y1="${y}" x2="${x+8}" y2="${y}"/>`;
    svg += `<g transform="${TOP(0,0,PZ)}">
      <rect class="detail" x="8" y="8" width="304" height="264" rx="10"/>
      ${[[15,15],[305,15],[15,265],[305,265]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="3"/><line class="detail" x1="${x-1.8}" y1="${y}" x2="${x+1.8}" y2="${y}"/>`).join('')}
      <g id="lighthouse-waves">${waves}</g>
      <g clip-path="url(#lighthouse-sea)">${[0,1,2].map(i => `<circle class="ring" id="lighthouse-ring${i}" cx="176" cy="145" r="10"/>`).join('')}</g>
    </g>`;

    const rock = (x,y,z,w,d,h) => box(x,y,z,w,d,h,3) +
      `<g transform="${FRONT(x,y+d,z+h)}"><path class="detail" d="M${w*.2} 1 l${w*.08} ${h*.45} l${w*.1} ${h*.3}"/></g>` +
      `<g transform="${SIDE(x+w,y+d,z+h)}"><path class="detail" d="M${d*.6} 1 l${-d*.1} ${h*.5}"/></g>`;
    svg += rock(30,40,PZ,24,22,6) + rock(262,60,PZ,26,28,8) + rock(60,140,PZ,22,20,11) + rock(70,150,PZ+11,10,9,5);
    svg += rock(100,90,PZ,80,80,17);
    svg += box(110,100,24,60,60,6,4);
    svg += `<g transform="${FRONT(110,160,30)}">${slits(4, 56, 4, 1.5, 4.5)}</g>`;

    svg += `<g filter="url(#soft)"><polygon class="beam" id="lighthouse-beamB" fill="url(#lighthouse-grad)"/></g>`;

    svg += `<g id="lighthouse-tower">`;
    const SEG = [24, 21, 18, 15], SH = 38;
    SEG.forEach((hw, i) => {
      const z = 30 + i * SH, x = CX - hw, y = CY - hw, w = 2 * hw, band = i % 2 === 1;
      svg += `<g class="${band ? 'band' : ''}">${box(x, y, z, w, w, SH, 2)}</g>`;
      if (band) {
        svg += `<g transform="${FRONT(x,y+w,z+SH)}">${slits(4, SH-4, 4, 0, w, false)}</g>`;
        svg += `<g transform="${SIDE(x+w,y+w,z+SH)}">${slits(4, SH-4, 4, 0, w, false)}</g>`;
      }
      svg += `<g transform="${FRONT(x,y+w,z+SH)}"><rect class="face recess" x="${hw-2.5}" y="12" width="5" height="10" rx="1"/></g>`;
      svg += `<g transform="${SIDE(x+w,y+w,z+SH)}"><rect class="face recess" x="${hw-2}" y="20" width="4" height="8" rx="1"/></g>`;
      svg += box(x-1.5, y-1.5, z+SH-2, w+3, w+3, 2, 1);
    });
    svg += box(CX-20, CY-20, 182, 40, 40, 4, 2);
    svg += `<g transform="${FRONT(CX-20,CY+20,186)}">${slits(3, 37, 3.4, 1, 3)}</g><g transform="${SIDE(CX+20,CY+20,186)}">${slits(3, 37, 3.4, 1, 3)}</g>`;
    const R = 19, RZ0 = 186, RZ1 = 194, posts = n => [...Array(n + 1)].map((_, i) => -R + 2 * R * i / n);
    let railB = '', railF = '';
    posts(8).forEach(t => {
      railB += path([[CX+t,CY-R,RZ0],[CX+t,CY-R,RZ1]]) + path([[CX-R,CY+t,RZ0],[CX-R,CY+t,RZ1]]);
      railF += path([[CX+t,CY+R,RZ0],[CX+t,CY+R,RZ1]]) + path([[CX+R,CY+t,RZ0],[CX+R,CY+t,RZ1]]);
    });
    railB += path([[CX-R,CY+R,RZ1],[CX-R,CY-R,RZ1],[CX+R,CY-R,RZ1]]);
    railF += path([[CX-R,CY+R,RZ1],[CX+R,CY+R,RZ1],[CX+R,CY-R,RZ1]]) + path([[CX-R,CY+R,190],[CX+R,CY+R,190],[CX+R,CY-R,190]]);
    svg += `<path class="rail" d="${railB}"/>`;
    const LH = 10;
    svg += `<rect class="halo" id="lighthouse-halo" x="${P(CX,CY,LZ)[0]-34}" y="${P(CX,CY,LZ)[1]-30}" width="68" height="60" rx="30" filter="url(#bloom)"/>`;
    svg += box(CX-12, CY-12, 186, 24, 24, 2, 1);
    svg += `<g class="lamp">${box(CX-LH, CY-LH, 188, 2*LH, 2*LH, 20, 1)}</g>`;
    svg += `<g transform="${FRONT(CX-LH,CY+LH,208)}">${slits(5, 15, 5, 0, 20, true, 'mull')}${slits(10, 10, 1, 0, 20, false, 'mull')}</g>`;
    svg += `<g transform="${SIDE(CX+LH,CY+LH,208)}">${slits(5, 15, 5, 0, 20, true, 'mull')}${slits(10, 10, 1, 0, 20, false, 'mull')}</g>`;
    svg += `<path class="rail" d="${railF}"/>`;
    svg += box(CX-13, CY-13, 208, 26, 26, 3, 2);
    svg += box(CX-9, CY-9, 211, 18, 18, 4, 3) + box(CX-6, CY-6, 215, 12, 12, 4, 3) + box(CX-3, CY-3, 219, 6, 6, 3, 2);
    svg += `<path class="rail" d="${path([[CX,CY,222],[CX,CY,238]])}"/>`;
    svg += `<g transform="${FRONT(CX-8,CY,236)}"><path class="face" d="M2 0 L13 0 L16 2 L13 4 L2 4 L4 2 Z"/></g>`;
    svg += `<g transform="${TOP(CX-6,CY-6,229)}"><path class="rail" d="M0 6 L12 6 M6 0 L6 12"/></g>`;
    svg += `</g>`;

    svg += `<g class="press" id="lighthouse-horn">${box(172,140,24,7,10,6,1)}<g transform="${SIDE(179,150,30)}"><circle class="face recess" cx="5" cy="3" r="2"/></g></g>`;
    svg += rock(180,86,PZ,22,24,9) + rock(160,170,PZ,24,18,7);
    svg += rock(188,142,PZ,70,58,10);
    svg += box(202,156,17,44,32,26,2);
    svg += `<g transform="${FRONT(202,188,43)}">
      <rect class="face recess" x="6" y="9" width="9" height="17" rx="1"/><text class="label" x="6.5" y="6.5" font-size="3.4">KEEPER</text>
      <rect class="halo" id="lighthouse-winhalo" x="18" y="2" width="26" height="20" rx="8" filter="url(#bloom)"/>
      <rect class="face win" filter="url(#soft)" x="23" y="7" width="15" height="11" rx="1"/>
      <line class="mull" x1="30.5" y1="7" x2="30.5" y2="18"/><line class="mull" x1="23" y1="12.5" x2="38" y2="12.5"/>
    </g>`;
    svg += `<g transform="${SIDE(246,188,43)}"><rect class="face win" filter="url(#soft)" x="10" y="7" width="12" height="10" rx="1"/><line class="mull" x1="16" y1="7" x2="16" y2="17"/></g>`;
    svg += box(199,153,43,50,38,4,2);
    svg += box(230,162,47,8,8,13,1) + box(229,161,60,10,10,2,1);

    svg += `<g filter="url(#soft)"><polygon class="beam" id="lighthouse-beamF" fill="url(#lighthouse-grad)"/></g>`;

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    const q = s => stage.querySelector(s);
    const beamB = q('#lighthouse-beamB'), beamF = q('#lighthouse-beamF'), grad = q('#lighthouse-grad');
    const halo = q('#lighthouse-halo'), winHalo = q('#lighthouse-winhalo'), horn = q('#lighthouse-horn');
    const rings = [0,1,2].map(i => q('#lighthouse-ring' + i));
    const st = { on: false, rpm: 6, th: 1.0, horn: -1 };
    const L = 280, SPREAD = 0.13;

    const bearing = () => Math.round(((st.th * 180 / Math.PI + 90) % 360 + 360) % 360);
    function render() {
      stage.classList.toggle('on', st.on);
      api.power(st.on);
      stage.querySelectorAll('.win').forEach(w => w.classList.toggle('hot', st.on));
      winHalo.classList.toggle('hot', st.on); halo.classList.toggle('hot', st.on);
      api.readout(st.on ? `beam on · ${st.rpm} rpm · bearing ${bearing()}°` : `beam off · ${st.rpm} rpm`);
    }
    function drawBeam() {
      if (!st.on) { beamB.style.opacity = 0; beamF.style.opacity = 0; halo.style.opacity = ''; return; }
      const pt = (a, r) => P(CX + r * Math.cos(a), CY + r * Math.sin(a), LZ);
      const a0 = st.th - SPREAD, a1 = st.th + SPREAD, n = 8;
      const pts = [pt(st.th - 1.2, 3), pt(st.th + 1.2, 3)];
      for (let i = 0; i <= n; i++) pts.push(pt(a1 - (a1 - a0) * i / n, L));
      const ps = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const c = P(CX, CY, LZ), e = pt(st.th, L);
      grad.setAttribute('x1', c[0]); grad.setAttribute('y1', c[1]); grad.setAttribute('x2', e[0]); grad.setAttribute('y2', e[1]);
      const flash = Math.pow(Math.max(0, Math.cos(st.th - Math.PI / 4)), 6);
      const front = Math.cos(st.th) + Math.sin(st.th) > 0;
      (front ? beamF : beamB).setAttribute('points', ps);
      (front ? beamF : beamB).style.opacity = (0.55 + 0.45 * flash).toFixed(3);
      (front ? beamB : beamF).style.opacity = 0;
      halo.style.opacity = (0.3 + 0.5 * flash).toFixed(3);
    }
    function drawRings(ts) {
      if (st.horn < 0) return;
      const t = (ts - st.horn) / 1000;
      rings.forEach((r, i) => {
        const k = (t - i * 0.45) / 2.6;
        if (k < 0 || k > 1) { r.style.opacity = 0; return; }
        r.setAttribute('r', (12 + k * 150).toFixed(1));
        r.style.opacity = ((1 - k) * 0.55).toFixed(3);
      });
      if (t > 4) st.horn = -1;
    }
    let last = null;
    api.loop(ts => {
      const dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000); last = ts;
      if (st.on) { st.th = (st.th + dt * st.rpm * 2 * Math.PI / 60) % (2 * Math.PI); render(); }
      drawBeam(); drawRings(ts);
    });

    function toggle() { st.on = !st.on; render(); drawBeam(); }
    function speed(d) { st.rpm = Math.max(2, Math.min(12, st.rpm + d)); render(); }
    let voice = null;
    function foghorn() {
      api.flash(horn, 1200);
      st.horn = performance.now();
      try {
        const { ctx, out } = api.audio(), t0 = ctx.currentTime;
        const g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 420;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.08);
        g.gain.setValueAtTime(0.35, t0 + 1.05); g.gain.linearRampToValueAtTime(0, t0 + 1.25);
        const oscs = [0, 1].map(k => { const o = ctx.createOscillator(); o.type = 'sawtooth';
          o.frequency.setValueAtTime(98 * (k ? 1.006 : 1), t0); o.frequency.setValueAtTime(73.4 * (k ? 1.006 : 1), t0 + 0.6);
          o.connect(lp); o.start(t0); o.stop(t0 + 1.3); return o; });
        lp.connect(g); g.connect(out); voice = { oscs, g };
      } catch (e) {}
    }

    stage.addEventListener('click', e => { if (e.target.closest('#lighthouse-tower')) toggle(); else if (e.target.closest('#lighthouse-horn')) foghorn(); });
    render(); drawBeam();
    return {
      key(e) {
        if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) toggle(); return true; }
        if (e.key === 'ArrowRight') { speed(1); return true; }
        if (e.key === 'ArrowLeft') { speed(-1); return true; }
        if (e.key === 'h' || e.key === 'H') { if (!e.repeat) foghorn(); return true; }
        return false;
      },
      unmount() { if (voice) try { voice.oscs.forEach(o => o.stop()); voice.g.disconnect(); } catch (e) {} },
      demo() { api.after(0, toggle); api.after(150, () => speed(1)); api.after(300, () => speed(1)); },
    };
  },
});
