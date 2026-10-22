/* Fig 9 — Observatory: open the dome slit, turn the dome, capture exposures on the control monitor. */
FIGS.push({
  id: 'observatory',
  name: 'Observatory',
  hint: 'O or click dome: slit · ←/→ rotate · space: expose',
  aria: 'Isometric mountaintop observatory on terraced rock with a winding access road, a domed telescope building, a control building with a live star-field monitor, and a small radio dish. Press O or click the dome to open or close the slit, ArrowLeft and ArrowRight to rotate the dome, and Space to capture an exposure.',
  css: `
    [data-fig="observatory"] #observatory-dome { cursor:pointer; }
    [data-fig="observatory"] #observatory-dome:hover #observatory-hull { stroke:var(--ink); }
    [data-fig="observatory"] .road-e { fill:none; stroke:var(--line); stroke-width:15; stroke-linecap:round; stroke-linejoin:round; }
    [data-fig="observatory"] .road-f { fill:none; stroke:var(--recess); stroke-width:13; stroke-linecap:round; stroke-linejoin:round; }
    [data-fig="observatory"] .road-c { fill:none; stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; stroke-dasharray:4 5; }
    [data-fig="observatory"] .shut { fill:var(--deck); stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
    [data-fig="observatory"] .slit-open { fill:var(--recess); stroke:var(--accent); stroke-width:1; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
    [data-fig="observatory"] .tube { fill:none; stroke:var(--accent); stroke-width:11; stroke-linecap:butt; }
    [data-fig="observatory"] .tube-hi { fill:none; stroke:var(--accent-hi); stroke-width:3; }
    [data-fig="observatory"] .slit-halo { fill:var(--accent); opacity:.55; }
    [data-fig="observatory"] .star { fill:var(--accent-hi); }
    [data-fig="observatory"] #observatory-sky { transition:opacity .4s; }
    [data-fig="observatory"] #observatory-sky.dim { opacity:.18; }
    [data-fig="observatory"] .cl .ring { fill:none; stroke:var(--accent); stroke-width:.6; opacity:0; }
    [data-fig="observatory"] .cl.hl .ring { opacity:1; }
    [data-fig="observatory"] .cl.hl .star { fill:var(--accent); }
    [data-fig="observatory"] .xh { stroke:var(--accent); stroke-width:.5; fill:none; }
    [data-fig="observatory"] .flashr { fill:var(--accent-hi); opacity:0; }
    [data-fig="observatory"] .flashr.go { animation:observatory-flash .45s ease-out; }
    @keyframes observatory-flash { 0% { opacity:.95; } 100% { opacity:0; } }
    [data-fig="observatory"] .win { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="observatory"] .win.on { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="observatory"] .mast { stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; fill:none; }
  `,
  mount(stage, api) {
    /*  boxes / solids        x    y    z    w    d    h
        plate                 0    0    0  340  300    7
        terrace 1            14   14    7  312  272   16  -> 23
        terrace 2            34   24   23  262  214   14  -> 37
        terrace 3            54   34   37  216  176   12  -> 49
        drum (cylinder)    c=(118,100) r=46, z 49..87
        dome (hemisphere)  c=(118,100,87) R=50  -> top 137
        radio dish         pedestal (84,174,49) 12x12x10, dish r=15 at (90,180,74)
        control building    176  120   49   82   70   50  -> 99, monitor on FRONT (y=190)  */
    const CX = 118, CY = 100, ZE = 87, RD = 46, R = 50, Z3 = 49;
    const K = api.iso.frame([[0,300,0],[340,0,7],[340,300,0],[0,0,7],[CX-40,CY+40,ZE+R*1.2],[CX+40,CY-40,ZE+R*1.2],[CX,CY,ZE+R*1.25],[244,134,130]]);
    const { P, TOP, FRONT, SIDE, box, path } = K, slits = api.iso.slits;
    const f2 = n => n.toFixed(2);
    const pd = pts => 'M' + pts.map(p => P(...p).map(f2).join(' ')).join('L');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // rock strata on a face: broken horizontal lines + a few cracks
    const strata = (w, h) => { let s = '';
      for (let y = 3.5; y < h - 1; y += 3.6 + rnd() * 2) { let x = 4 + rnd() * 10;
        while (x < w - 6) { const l = 10 + rnd() * 40; s += `<line class="detail" x1="${f2(x)}" y1="${f2(y)}" x2="${f2(Math.min(w - 4, x + l))}" y2="${f2(y + (rnd() - .5) * 1.2)}"/>`; x += l + 5 + rnd() * 14; } }
      for (let x = 20; x < w - 10; x += 30 + rnd() * 40) s += `<path class="detail" d="M${f2(x)} 0 l${f2(rnd()*4-2)} ${f2(h*.4)} l${f2(rnd()*4-2)} ${f2(h*.35)}"/>`;
      return s; };
    const terrace = (x, y, z, w, d, h) => box(x, y, z, w, d, h, 4) +
      `<g transform="${FRONT(x, y + d, z + h)}">${strata(w, h)}</g><g transform="${SIDE(x + w, y + d, z + h)}">${strata(d, h)}</g>`;
    const road = (t, d) => `<g transform="${t}"><path class="road-e" d="${d}"/><path class="road-f" d="${d}"/><path class="road-c" d="${d}"/></g>`;

    let svg = `<defs><clipPath id="observatory-glass"><rect x="7" y="6" width="68" height="30" rx="2.5"/></clipPath>
      <clipPath id="observatory-slitclip"><path id="observatory-clipd" d=""/></clipPath></defs>`;
    // plate
    svg += box(0, 0, 0, 340, 300, 7, 14);
    svg += `<g transform="${TOP(0,0,7)}"><rect class="detail" x="8" y="8" width="324" height="284" rx="10"/>
      ${[[13,13],[327,13],[13,287],[327,287]].map(([x,y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="2.6"/><line class="detail" x1="${x-1.6}" y1="${y}" x2="${x+1.6}" y2="${y}"/>`).join('')}</g>`;
    // terraces + switchback road
    svg += terrace(14, 14, 7, 312, 272, 16);
    svg += road(TOP(14, 14, 23), 'M6 250 H283 Q297 250 297 236 V12');
    svg += `<g transform="${TOP(14,14,23)}">${slits(30, 260, 26, 260, 262, true)}</g>`;
    svg += terrace(34, 24, 23, 262, 214, 14);
    svg += road(TOP(34, 24, 37), 'M249 4 V186 Q249 200 235 200 H6');
    svg += terrace(54, 34, 37, 216, 176, 12);
    svg += road(TOP(54, 34, 49), 'M4 166 H212');
    svg += `<g transform="${TOP(54,34,49)}"><rect class="detail" x="124" y="140" width="76" height="14" rx="2"/>${slits(136, 190, 9, 141, 153)}</g>`;

    // ---- dome building ----
    const cyl = (r, z, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a), z];
    const rad = d => d * Math.PI / 180;
    const arc = (r, z, a0, a1, n = 36) => Array.from({ length: n + 1 }, (_, i) => cyl(r, z, rad(a0 + (a1 - a0) * i / n)));
    svg += `<g id="observatory-dome">`;
    svg += `<path class="face" d="${pd([...arc(RD, Z3, -45, 135), ...arc(RD, ZE, 135, -45)])}Z"/>`;
    for (let a = -30; a <= 120; a += 15) svg += `<path class="detail" d="${pd([cyl(RD, Z3, rad(a)), cyl(RD, ZE - 4, rad(a))])}"/>`;
    svg += `<path class="detail" d="${pd(arc(RD, ZE - 4, -45, 135))}"/><path class="detail" d="${pd(arc(RD, Z3 + 3, -45, 135))}"/>`;
    // door on the drum
    svg += `<path class="face recess" d="${pd([...arc(RD + .2, Z3, 70, 86, 6), ...arc(RD + .2, Z3 + 18, 86, 70, 6)])}Z"/>`;
    // dome hull (convex hull of projected upper hemisphere)
    const sph = (th, ph, s = 0, A = 0) => { // point on sphere along meridian th, latitude ph, offset s sideways
      const r = Math.sqrt(R * R - s * s), u = [Math.cos(th), Math.sin(th)], t = [-Math.sin(th), Math.cos(th)];
      return [CX + r * Math.cos(ph) * u[0] + s * t[0], CY + r * Math.cos(ph) * u[1] + s * t[1], ZE + r * Math.sin(ph)]; };
    const vis = (th, ph) => Math.cos(ph) * (Math.cos(th) + Math.sin(th)) + Math.sin(ph) > 0;
    const hp = [];
    for (let i = 0; i <= 10; i++) for (let j = 0; j < 72; j++) hp.push(P(...sph(rad(j * 5), rad(i * 9))));
    hp.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
    const lo = [], hi = [];
    for (const p of hp) { while (lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of hp.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length-2], hi[hi.length-1], p) <= 0) hi.pop(); hi.push(p); }
    const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
    svg += `<path id="observatory-hull" class="face top" d="M${hull.map(p => p.map(f2).join(' ')).join('L')}Z"/>`;
    // static latitude rings (visible part)
    const runs = (pts, ok) => { const out = []; let cur = [];
      pts.forEach((p, i) => { if (ok[i]) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } });
      if (cur.length > 1) out.push(cur); return out; };
    [22, 44, 64].forEach(lat => { const pts = [], ok = [];
      for (let a = -180; a <= 180; a += 4) { pts.push(sph(rad(a), rad(lat))); ok.push(vis(rad(a), rad(lat))); }
      runs(pts, ok).forEach(r => { svg += `<path class="detail" d="${pd(r)}"/>`; }); });
    svg += `<g id="observatory-ribs"></g>
      <path id="observatory-shut" class="shut" d=""/><path id="observatory-ticks" class="detail" d=""/>
      <path id="observatory-halo" class="slit-halo" filter="url(#bloom)" d=""/>
      <path id="observatory-open" class="slit-open" d=""/>
      <g clip-path="url(#observatory-slitclip)"><g filter="url(#soft)"><path id="observatory-tube" class="tube" d=""/><path id="observatory-tubehi" class="tube-hi" d=""/></g></g>`;
    svg += `</g>`;

    // ---- radio dish ----
    svg += box(84, 174, Z3, 12, 12, 10, 2);
    svg += `<path class="mast" d="${pd([[90,180,59],[90,180,72]])}"/>`;
    const DO = [90, 181, 74], n0 = [0.25, 0.62, 0.74], nl = Math.hypot(...n0), N = n0.map(v => v / nl);
    const U = [N[1], -N[0], 0].map(v => v / Math.hypot(N[1], N[0])), V = [N[1]*U[2]-N[2]*U[1], N[2]*U[0]-N[0]*U[2], N[0]*U[1]-N[1]*U[0]];
    const dishT = K.plane(DO, U, V.map(v => -v));
    const feed = DO.map((v, i) => v + N[i] * 12);
    const rim = a => DO.map((v, i) => v + 15 * (Math.cos(a) * U[i] + Math.sin(a) * V[i]));
    svg += `<g transform="${dishT}"><circle class="face top" r="15"/><circle class="detail" r="10.5"/><circle class="detail" r="6"/><circle class="face recess" r="1.6"/></g>`;
    svg += [0, 2.1, 4.2].map(a => `<path class="mast" d="${pd([rim(a), feed])}"/>`).join('');
    svg += `<circle id="observatory-feed" class="led" filter="url(#soft)" cx="${f2(P(...feed)[0])}" cy="${f2(P(...feed)[1])}" r="1.8"/>`;

    // ---- control building ----
    const BX = 176, BY = 120, BW = 82, BDp = 70, BH = 50, BT = Z3 + BH;
    svg += box(BX, BY, Z3, BW, BDp, BH, 3);
    svg += `<g transform="${SIDE(BX+BW, BY+BDp, BT)}"><g filter="url(#soft)">
      ${[0,1,2].map(c => [0,1].map(r => `<rect class="win${c===1&&r===0?' on':''}" x="${7+c*14}" y="${8+r*16}" width="9" height="9" rx=".8"/>`).join('')).join('')}</g>
      <rect class="face recess" x="50" y="26" width="12" height="24" rx="1"/>${slits(4, 46, 3, 44, 47)}</g>`;
    svg += `<g transform="${FRONT(BX, BY+BDp, BT)}">
      <rect class="face recess" x="4" y="3" width="74" height="36" rx="3.5"/>
      <rect class="halo hot" id="observatory-mhalo" x="7" y="6" width="68" height="30" rx="2.5" filter="url(#bloom)"/>
      <rect class="face glass hot" filter="url(#soft)" x="7" y="6" width="68" height="30" rx="2.5"/>
      <g clip-path="url(#observatory-glass)">
        <g id="observatory-sky"><g id="observatory-stars"></g><use href="#observatory-stars" id="observatory-u1"/><use href="#observatory-stars" id="observatory-u2"/></g>
        <g filter="url(#soft)">
          <circle class="xh" cx="41" cy="21" r="5"/><path class="xh" d="M41 11V17M41 25V31M29 21H36M46 21H53"/>
          <text class="scr" id="observatory-tgt" x="10" y="11" font-size="3.6">TARGET —</text>
          <text class="scr" id="observatory-mstat" x="72" y="34" font-size="3.4" text-anchor="end">AZ 000° · FR 000</text>
        </g>
        <rect class="flashr" id="observatory-flash" x="7" y="6" width="68" height="30"/>
      </g>
      <text class="label" x="6" y="46" font-size="4.2" letter-spacing=".6">OBS CTRL · 2</text>
      ${slits(52, 76, 3, 41, 47)}
    </g>`;
    svg += box(188, 128, BT, 18, 16, 7, 1.5);
    svg += `<g transform="${TOP(188,128,BT+7)}"><circle class="detail" cx="9" cy="8" r="5.5"/></g>`;
    svg += box(214, 152, BT, 22, 14, 5, 1.5);
    svg += `<g transform="${FRONT(214,166,BT+5)}">${slits(3, 19, 2.5, 1, 4)}</g>`;
    svg += `<path class="mast" d="${pd([[246,132,BT],[246,132,BT+28]])}"/><path class="mast" d="${pd([[240,132,BT+20],[252,132,BT+20]])}"/>`;
    svg += `<circle class="led hot blink" filter="url(#soft)" cx="${f2(P(246,132,BT+28)[0])}" cy="${f2(P(246,132,BT+28)[1])}" r="1.5"/>`;
    // boulders on the lower terrace front
    [[34,270,10,9,5],[128,274,8,7,4],[214,268,12,8,6],[268,276,7,6,4]].forEach(([x,y,w,d,h]) => { svg += box(x, y, 23, w, d, h, 2); });

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;
    const q = s => stage.querySelector(s);

    // ---- sky: stars + clusters (face-local units of the monitor) ----
    const KPX = 0.9, SKY = 360 * KPX, GC = 41;
    let stars = '';
    for (let i = 0; i < 120; i++) stars += `<circle class="star" cx="${f2(rnd() * SKY)}" cy="${f2(7 + rnd() * 28)}" r="${f2(.25 + rnd() * .45)}"/>`;
    const CL = [];
    for (let k = 0; k < 6; k++) {
      const cx = (k * 60 + 18 + rnd() * 20) * KPX, cy = 14 + rnd() * 14;
      let g = `<g class="cl" id="observatory-cl${k}"><circle class="ring" cx="${f2(cx)}" cy="${f2(cy)}" r="5.2"/>`;
      for (let i = 0; i < 7; i++) g += `<circle class="star" cx="${f2(cx + (rnd() - .5) * 7)}" cy="${f2(cy + (rnd() - .5) * 6)}" r="${f2(.35 + rnd() * .4)}"/>`;
      stars += g + `</g>`; CL.push({ x: cx, name: `CL-${String(k * 3 + 4).padStart(2, '0')}` });
    }
    q('#observatory-stars').innerHTML = stars;
    q('#observatory-u1').setAttribute('x', -SKY); q('#observatory-u2').setAttribute('x', SKY);

    const st = { open: false, amt: 0, th: 69, frames: 0, drift: 0, last: null, cl: -1 };
    const az = () => Math.round(((177 - st.th) % 360 + 360) % 360);
    const W = 8;
    function drawDome() {
      const A = rad(st.th);
      // rotating ribs
      let ribs = '';
      for (let k = 0; k < 8; k++) { const th = A + rad(22.5 + k * 45), pts = [], ok = [];
        for (let p = 0; p <= 84; p += 4) { pts.push(sph(th, rad(p))); ok.push(vis(th, rad(p))); }
        runs(pts, ok).forEach(r => { ribs += `<path class="detail" d="${pd(r)}"/>`; }); }
      q('#observatory-ribs').innerHTML = ribs;
      // slit band: visible run along meridian A from equator to past the zenith
      const phs = []; for (let p = 0; p <= 105; p += 3) if (vis(A, rad(p))) phs.push(rad(p));
      const band = w => phs.length < 2 ? '' : pd([...phs.map(p => sph(A, p, -w)), ...phs.slice().reverse().map(p => sph(A, p, w))]) + 'Z';
      q('#observatory-shut').setAttribute('d', band(W));
      q('#observatory-ticks').setAttribute('d', phs.length < 2 ? '' : phs.filter((_, i) => i % 3 === 1).map(p => pd([sph(A, p, -W), sph(A, p, W)])).join('') + pd(phs.map(p => sph(A, p, 0))));
      const ow = st.amt > .02 ? band(W * st.amt) : '';
      ['#observatory-open', '#observatory-halo', '#observatory-clipd'].forEach(s => q(s).setAttribute('d', ow));
      const piv = [CX, CY, ZE - 22], end = sph(A, rad(58)).map((v, i) => piv[i] + (v - piv[i]) * 1.1);
      const td = pd([piv, end]);
      q('#observatory-tube').setAttribute('d', ow ? td : ''); q('#observatory-tubehi').setAttribute('d', ow ? td : '');
    }
    function nearest(cx) {
      let best = 0, bd = 1e9;
      CL.forEach((c, i) => { let d = Math.abs(((c.x - cx) % SKY + SKY * 1.5) % SKY - SKY / 2); if (d < bd) { bd = d; best = i; } });
      return [best, bd / KPX];
    }
    function sky() {
      const cx = ((az() + st.drift) * KPX % SKY + SKY) % SKY;
      q('#observatory-stars').parentNode.setAttribute('transform', `translate(${f2(GC - cx)} 0)`);
      const [i, d] = nearest(cx); st.cl = i;
      const t = st.open ? `TARGET ${CL[i].name} · ${d.toFixed(1)}°` : 'SLIT CLOSED';
      if (t !== st.last) { q('#observatory-tgt').textContent = t; st.last = t; }
    }
    function render() {
      q('#observatory-sky').classList.toggle('dim', !st.open);
      q('#observatory-feed').classList.toggle('hot', st.open);
      q('#observatory-mstat').textContent = `AZ ${String(az()).padStart(3, '0')}° · FR ${String(st.frames).padStart(3, '0')}`;
      api.power(st.open);
      drawDome(); sky();
      api.readout(`slit ${st.open ? 'open' : 'closed'} · az ${az()}° · ${st.frames} frame${st.frames === 1 ? '' : 's'}`);
    }
    const toggle = () => { st.open = !st.open; render();
      for (let i = 1; i <= 10; i++) api.after(i * 32, () => { st.amt = st.open ? Math.max(st.amt, i / 10) : Math.min(st.amt, 1 - i / 10); drawDome(); }); };
    const rotate = d => { st.th = ((st.th - d) % 360 + 360) % 360; render(); };
    function capture() {
      api.replay(q('#observatory-flash'));
      if (!st.open) { st.last = null; q('#observatory-tgt').textContent = 'OPEN SLIT FIRST'; st.last = 'OPEN SLIT FIRST'; return; }
      st.frames++; sky();
      stage.querySelectorAll('.cl').forEach(c => c.classList.remove('hl'));
      q(`#observatory-cl${st.cl}`).classList.add('hl');
      render();
    }
    let prev = 0;
    api.loop(ts => {
      const dt = prev ? Math.min(.1, (ts - prev) / 1000) : 0; prev = ts;
      st.drift += dt * 0.25;
      sky();
    });
    stage.addEventListener('click', e => { if (e.target.closest('#observatory-dome')) toggle(); });
    render();
    return {
      key(e) {
        if (e.key === 'o' || e.key === 'O') { if (!e.repeat) toggle(); return true; }
        if (e.key === 'ArrowLeft') { rotate(-3); return true; }
        if (e.key === 'ArrowRight') { rotate(3); return true; }
        if (e.key === ' ') { if (!e.repeat) capture(); return true; }
        return false;
      },
      demo() {
        toggle();
        for (let i = 0; i < 8; i++) api.after(120 + i * 60, () => rotate(3));
        api.after(640, capture);
      },
    };
  },
});
