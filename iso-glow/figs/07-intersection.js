/* Fig 7 — Intersection: a downtown crossroads with working signals and queuing traffic. */
FIGS.push({
  id: 'intersection',
  name: 'Intersection',
  hint: 'Click a signal or space to switch · A auto-cycle',
  aria: 'Isometric downtown crossroads with four corner buildings and traffic lights on each corner. Cars drive both streets, stop and queue at red, and cross on green. Click a signal or press space to switch the phase early; press a to toggle automatic cycling.',
  css: `
    [data-fig="intersection"] .sig { cursor:pointer; }
    [data-fig="intersection"] .sig:hover .face.top { stroke:var(--ink); }
    [data-fig="intersection"] .lamp { fill:var(--recess); stroke:var(--detail); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="intersection"] .lamp.on { fill:var(--accent-hi); stroke:var(--accent); filter:url(#glow); }
    [data-fig="intersection"] .mark { fill:var(--line); }
    [data-fig="intersection"] .mline { fill:none; stroke:var(--line); stroke-width:1; vector-effect:non-scaling-stroke; }
    [data-fig="intersection"] .wu { fill:var(--recess); stroke:var(--detail); stroke-width:.8; vector-effect:non-scaling-stroke; }
    [data-fig="intersection"] .lw { fill:var(--accent); }
    [data-fig="intersection"] .lwh { fill:var(--accent-hi); }
    [data-fig="intersection"] .band { fill:var(--accent); stroke:var(--accent-hi); stroke-width:.8; vector-effect:non-scaling-stroke; }
    [data-fig="intersection"] .beam { fill:var(--accent); opacity:.10; }
    [data-fig="intersection"] .beam2 { fill:var(--accent-hi); opacity:.12; }
    [data-fig="intersection"] .hl { fill:var(--accent-hi); }
    [data-fig="intersection"] .tl { fill:var(--accent); opacity:.55; }
    [data-fig="intersection"] .awn { fill:var(--recess); }
    [data-fig="intersection"] .beacon { fill:var(--accent); }
  `,
  mount(stage, api) {
    /*  boxes                 x    y    z    w    d    h
        plate                 0    0    0  400  400    7      streets = plate top: EW y 170..230, NS x 170..230
        sidewalk blocks       6/236 (each 158 square), h 3 -> SZ 10
        office (back)        22   22   24  100  100  160  + lobby, crown, antenna to z 230
        walk-up (right)     268   24   10  114   88   90  + cornice, fire escape, water tank
        parking (left)       22  262   10  110  118   58  + P sign on the x=max face
        cafe (front, low)   270  270   10  110  110   28  + awning on the y=max face
        signal poles   (157|241, 157|241)  head 7x7x17 at z 46                                   */
    const K = api.iso.frame([[0,400,0],[400,0,0],[400,400,0],[0,0,7],[22,22,234],[122,22,200],[22,122,200]], 0.06);
    const { D, TOP, FRONT, SIDE, box, boxc } = K, slits = api.iso.slits;
    const PZ = 7, SZ = 10;
    const hash = i => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
    const f2 = n => +n.toFixed(2);

    let svg = `<defs>
      <pattern id="intersection-win" x="6" y="14" width="8" height="10" patternUnits="userSpaceOnUse"><rect class="wu" x="1.5" y="2" width="5" height="6.5"/></pattern>
      <pattern id="intersection-brick" width="12" height="4" patternUnits="userSpaceOnUse"><path class="detail" d="M0 4H12M0 0V2M6 2V4"/></pattern>
    </defs>`;

    /* ---------- plate + street paint ---------- */
    svg += box(0, 0, 0, 400, 400, PZ, 14);
    let paint = `<rect class="detail" x="3" y="3" width="394" height="394" rx="11"/>`;
    // centre double lines
    [[0, 146], [254, 400]].forEach(([a, b]) => {
      paint += `<path class="mline" d="M${a} 198.6H${b}M${a} 201.4H${b}M198.6 ${a}V${b}M201.4 ${a}V${b}"/>`;
    });
    // lane edge dashes
    for (let a = 6; a < 146; a += 14) [a, 254 + (a - 6)].forEach(p => {
      paint += `<rect class="mark" x="${p}" y="171.5" width="7" height="1"/><rect class="mark" x="${p}" y="227.5" width="7" height="1"/>`;
      paint += `<rect class="mark" x="171.5" y="${p}" width="1" height="7"/><rect class="mark" x="227.5" y="${p}" width="1" height="7"/>`;
    });
    // crosswalks (stripes parallel to traffic) + stop lines
    for (let s = 173; s < 228; s += 6) {
      paint += `<rect class="mark" x="150" y="${s}" width="15" height="3"/><rect class="mark" x="235" y="${s}" width="15" height="3"/>`;
      paint += `<rect class="mark" x="${s}" y="150" width="3" height="15"/><rect class="mark" x="${s}" y="235" width="3" height="15"/>`;
    }
    paint += `<rect class="mark" x="145" y="201" width="2" height="28"/><rect class="mark" x="253" y="171" width="2" height="28"/>`;
    paint += `<rect class="mark" x="171" y="145" width="28" height="2"/><rect class="mark" x="201" y="253" width="28" height="2"/>`;
    // manhole + drains
    paint += `<circle class="face recess" cx="212" cy="188" r="5"/><path class="detail" d="M208 188H216M212 184V192"/>`;
    svg += `<g transform="${TOP(0, 0, PZ)}">${paint}</g>`;

    /* ---------- sidewalk blocks ---------- */
    [[6, 6], [236, 6], [6, 236], [236, 236]].forEach(([x, y]) => {
      svg += box(x, y, PZ, 158, 158, SZ - PZ, 6);
      let t = `<rect class="detail" x="4" y="4" width="150" height="150" rx="4"/>`;
      // paving joints near the street edges
      const nearX = x === 6 ? 158 : 0, nearY = y === 6 ? 158 : 0;
      for (let k = 12; k < 158; k += 12) {
        t += `<line class="detail" x1="${k}" y1="${nearY ? 146 : 0}" x2="${k}" y2="${nearY ? 158 : 12}"/>`;
        t += `<line class="detail" x1="${nearX ? 146 : 0}" y1="${k}" x2="${nearX ? 158 : 12}" y2="${k}"/>`;
      }
      svg += `<g transform="${TOP(x, y, SZ)}">${t}</g>`;
      const sx = x === 6 ? 158 : 0, sy = y === 6 ? 158 : 0; // curb face slits
      svg += `<g transform="${FRONT(x, y + 158, SZ)}">${slits(8, 150, 10, 0.6, 2.4)}</g>`;
      void sx; void sy;
    });
    // small furniture on plazas (low, never near traffic)
    svg += box(252, 300, SZ, 6, 22, 3, 1) + box(300, 252, SZ, 22, 6, 3, 1);
    svg += box(138, 300, SZ, 8, 8, 4, 2) + box(139, 301, SZ + 4, 6, 6, 10, 3);

    /* ---------- beams layer + scene (depth-sorted per frame) ---------- */
    svg += `<g id="intersection-beams"></g><g id="intersection-scene">`;

    // OFFICE (back)
    {
      let s = box(26, 26, SZ, 92, 92, 14, 2);
      s += `<g transform="${FRONT(26, 118, SZ + 14)}"><rect class="halo hot" x="10" y="3" width="72" height="9" filter="url(#bloom)"/><rect class="face glass hot" x="10" y="3" width="72" height="11"/>${slits(18, 74, 8, 3, 14)}</g>`;
      s += `<g transform="${SIDE(118, 118, SZ + 14)}"><rect class="face glass hot" x="10" y="3" width="72" height="11"/>${slits(18, 74, 8, 3, 14)}</g>`;
      s += box(22, 22, 24, 100, 100, 160, 3);
      let lit = '';
      const face = (seed) => {
        let o = `<rect x="6" y="14" width="88" height="140" fill="url(#intersection-win)"/>`;
        for (let f = 0; f < 14; f++) for (let c = 0; c < 11; c++) {
          const h = hash(seed + f * 11 + c);
          if (h < 0.22 || (f === 3 && c > 2 && c < 9)) lit += `<rect class="${h < .07 ? 'lwh' : 'lw'}" x="${6 + c * 8 + 1.5}" y="${14 + f * 10 + 2}" width="5" height="6.5"/>`;
        }
        return o;
      };
      let fr = face(1); const litF = lit; lit = '';
      let sd = face(500); const litS = lit;
      const band = `<rect class="halo hot" x="0" y="2" width="100" height="7" filter="url(#bloom)"/><rect class="band" x="2" y="3" width="96" height="5"/>`;
      s += `<g transform="${FRONT(22, 122, 184)}">${fr}${band}<g filter="url(#soft)">${litF}</g>${slits(6, 94, 8, 156, 160)}</g>`;
      s += `<g transform="${SIDE(122, 122, 184)}">${sd}${band}<g filter="url(#soft)">${litS}</g></g>`;
      s += `<g transform="${TOP(22, 22, 184)}"><rect class="detail" x="4" y="4" width="92" height="92" rx="2"/></g>`;
      s += box(32, 34, 184, 30, 26, 10, 1.5) + `<g transform="${TOP(32, 34, 194)}">${slits(4, 26, 3, 3, 23)}</g>`;
      s += box(80, 72, 184, 22, 22, 7, 1.5) + `<g transform="${FRONT(80, 94, 191)}">${slits(3, 19, 3, 1.5, 5.5)}</g>`;
      s += box(66, 54, 184, 2.4, 2.4, 46);
      s += `<g transform="${FRONT(64, 56.4, 232)}"><circle class="beacon blink" filter="url(#glow)" cx="3.2" cy="1.5" r="2"/></g>`;
      s = `<g id="intersection-office">${s}</g>`;
      svg += s;
    }

    // WALK-UP (right) — long, detailed FRONT faces the EW street
    {
      let s = box(268, 24, SZ, 114, 88, 90, 2);
      let lit = '';
      let fr = `<rect x="0" y="4" width="114" height="66" fill="url(#intersection-brick)"/>`;
      for (let f = 0; f < 4; f++) for (let c = 0; c < 7; c++) {
        const x = 7 + c * 15.3, y = 8 + f * 16;
        fr += `<rect class="wu" x="${x}" y="${y}" width="8" height="10"/><line class="detail" x1="${x - 1}" y1="${y + 11}" x2="${x + 9}" y2="${y + 11}"/>`;
        if (hash(900 + f * 7 + c) < 0.34) lit += `<rect class="lw" x="${x}" y="${y}" width="8" height="10"/>`;
      }
      fr += `<rect class="face recess" x="6" y="72" width="70" height="18"/><rect class="face glass hot" x="9" y="76" width="64" height="11"/>`;
      fr += `<rect class="face recess" x="84" y="74" width="12" height="16"/><text class="label" x="9" y="71.2" font-size="4.6" letter-spacing=".8">BODEGA · 7TH ST</text>`;
      s += `<g transform="${FRONT(268, 112, 100)}">${fr}<g filter="url(#soft)">${lit}<text class="scr" x="41" y="84" font-size="5.5" text-anchor="middle" letter-spacing="1">OPEN</text></g></g>`;
      let sd = `<rect x="0" y="4" width="88" height="86" fill="url(#intersection-brick)"/>`; lit = '';
      for (let f = 0; f < 5; f++) for (let c = 0; c < 5; c++) {
        const x = 8 + c * 16, y = 8 + f * 16;
        sd += `<rect class="wu" x="${x}" y="${y}" width="8" height="10"/>`;
        if (hash(300 + f * 5 + c) < 0.3) lit += `<rect class="lw" x="${x}" y="${y}" width="8" height="10"/>`;
      }
      s += `<g transform="${SIDE(382, 112, 100)}">${sd}<g filter="url(#soft)">${lit}</g></g>`;
      s += box(266, 22, 100, 118, 92, 4, 1);
      s += `<g transform="${TOP(266, 22, 104)}"><rect class="detail" x="3" y="3" width="112" height="86"/></g>`;
      // water tank on legs
      [[340, 40], [354, 40], [340, 54], [354, 54]].forEach(([x, y]) => { s += box(x, y, 104, 1.6, 1.6, 8); });
      s += box(338, 38, 112, 18, 18, 16, 3) + `<g transform="${FRONT(338, 56, 128)}">${slits(3, 15, 3, 2, 14)}</g>` + box(342, 42, 128, 10, 10, 3, 2);
      s += box(290, 40, 104, 14, 10, 6, 1);
      // fire escape: landings protruding from the front face + stairs
      for (let f = 0; f < 3; f++) {
        const z = 100 - (8 + f * 16) - 12;
        s += box(334, 112, z, 30, 6, 1.2, 0.5);
        s += `<g transform="${FRONT(334, 118, z + 6)}"><rect class="detail" x="0" y="0" width="30" height="6"/>${slits(3, 27, 3, 0, 6)}</g>`;
        if (f < 2) { const zl = z - 16; s += `<path class="mline" d="${K.path([[336, 117, z], [358, 117, zl + 1.2]])}"/>`; }
      }
      svg += `<g id="intersection-walkup">${s}</g>`;
    }

    // PARKING (left)
    {
      let s = box(22, 262, SZ, 110, 118, 58, 2);
      const levels = (w, bays) => {
        let o = '', lit = '';
        for (let L = 0; L < 4; L++) {
          const y = 4 + L * 14.5;
          for (let b = 0; b < bays; b++) {
            const bw = (w - 6) / bays, x = 3 + b * bw + 1.5;
            o += `<rect class="face recess" x="${f2(x)}" y="${y}" width="${f2(bw - 3)}" height="8"/>`;
            if (hash(L * 9 + b + w) < 0.45) o += `<rect class="wu" x="${f2(x + 3)}" y="${y + 4.5}" width="${f2(Math.min(10, bw - 9))}" height="3.5" rx="1"/>`;
            lit += `<rect class="lw" x="${f2(x + 1)}" y="${y + .6}" width="${f2(bw - 5)}" height="1.1"/>`;
          }
          o += `<line class="detail" x1="0" y1="${y + 11}" x2="${w}" y2="${y + 11}"/>`;
        }
        return o + `<g filter="url(#soft)">${lit}</g>`;
      };
      s += `<g transform="${FRONT(22, 380, 68)}">${levels(110, 4)}</g>`;
      s += `<g transform="${SIDE(132, 380, 68)}">${levels(118, 4)}</g>`;
      let top = `<rect class="detail" x="3" y="3" width="104" height="112" rx="2"/>`;
      for (let k = 30; k < 110; k += 12) top += `<line class="detail" x1="${k}" y1="10" x2="${k}" y2="34"/><line class="detail" x1="${k}" y1="84" x2="${k}" y2="108"/>`;
      top += `<path class="detail" d="M24 60H104"/>`;
      s += `<g transform="${TOP(22, 262, 68)}">${top}</g>`;
      s += box(24, 264, 68, 18, 18, 12, 1.5);
      [[67, 274], [91, 350]].forEach(([x, y]) => { s += box(x, y, 68, 9, 17, 4, 1.5) + box(x + 1, y + 4, 72, 7, 8, 3, 1); });
      s += box(80, 318, 68, 1.6, 1.6, 16) + box(77, 316, 84, 8, 6, 1.5, .5);
      // vertical P sign on the street-facing side
      s += box(132, 268, SZ + 26, 3, 12, 28, 1);
      s += `<g transform="${SIDE(135, 280, SZ + 54)}"><rect class="halo hot" x="0" y="1" width="12" height="26" filter="url(#bloom)"/><rect class="face glass hot" x="1.5" y="2" width="9" height="24" rx="1"/>
        <g filter="url(#soft)"><text class="scr" x="6" y="15" font-size="11" text-anchor="middle">P</text><text class="scr" x="6" y="22.5" font-size="3.2" text-anchor="middle">1–4</text></g></g>`;
      svg += `<g id="intersection-parking">${s}</g>`;
    }

    // CAFE (front, low)
    {
      let s = box(270, 270, SZ, 110, 110, 28, 3);
      s += `<g transform="${FRONT(270, 380, 38)}">
        <rect class="face recess" x="6" y="10" width="76" height="17"/>
        <rect class="halo hot" x="8" y="11" width="72" height="15" filter="url(#bloom)"/>
        <rect class="face glass hot" x="8" y="11.5" width="72" height="15"/>
        ${slits(26, 62, 18, 11.5, 26.5)}
        <g filter="url(#soft)"><rect class="lw" x="8" y="11.5" width="72" height="1.6"/><text class="scr" x="44" y="22" font-size="5" text-anchor="middle" letter-spacing="1.4">COFFEE · PIE</text></g>
        <rect class="face recess" x="88" y="12" width="13" height="16"/><circle class="led hot" cx="98.5" cy="20" r=".9"/>
        ${slits(6, 104, 4, 3, 5)}
      </g>`;
      s += `<g transform="${SIDE(380, 380, 38)}">
        <rect class="halo hot" x="8" y="10" width="38" height="13" filter="url(#bloom)"/><rect class="face glass hot" x="8" y="10" width="38" height="13"/>
        <rect class="halo hot" x="58" y="10" width="38" height="13" filter="url(#bloom)"/><rect class="face glass hot" x="58" y="10" width="38" height="13"/>
        <g filter="url(#soft)"><rect class="lw" x="8" y="10" width="38" height="1.4"/><rect class="lw" x="58" y="10" width="38" height="1.4"/></g>
        ${slits(6, 104, 4, 3, 5)}
      </g>`;
      s += `<g transform="${TOP(270, 270, 38)}"><rect class="detail" x="3" y="3" width="104" height="104" rx="2"/></g>`;
      s += box(300, 300, 38, 22, 18, 7, 1.5) + `<g transform="${SIDE(322, 318, 45)}">${slits(3, 15, 3, 1.5, 6)}</g>`;
      s += box(346, 336, 38, 8, 8, 4, 1);
      // roof sign
      s += box(296, 368, 38, 1.5, 1.5, 8) + box(350, 368, 38, 1.5, 1.5, 8);
      s += box(292, 368, 46, 64, 3, 12, 1);
      s += `<g transform="${FRONT(292, 371, 58)}"><rect class="halo hot" x="0" y="0" width="64" height="12" filter="url(#bloom)"/><rect class="face glass hot" x="1.5" y="1.5" width="61" height="9" rx="1"/>
        <g filter="url(#soft)"><text class="scr" x="32" y="8.6" font-size="6.6" text-anchor="middle" letter-spacing="1.2">CAFE 24</text></g></g>`;
      // striped awning over the front window (sloped plane), with valance
      const AW = `matrix(${D(1,0,0).join(' ')} ${D(0,1,-0.5).join(' ')} ${K.P(274, 380, 37).join(' ')})`;
      let aw = `<rect class="face" width="82" height="7"/>`;
      for (let k = 0; k < 82; k += 8) aw += `<rect class="awn" x="${k}" y="0" width="4" height="7"/>`;
      s += `<g transform="${AW}">${aw}<rect class="detail" width="82" height="7"/></g>`;
      s += `<g transform="${FRONT(274, 387, 33.5)}"><rect class="face" width="82" height="3"/>${slits(4, 80, 8, 0, 3)}</g>`;
      svg += `<g id="intersection-cafe">${s}</g>`;
    }

    // SIGNAL POLES
    const POLES = [[157, 157], [241, 157], [157, 241], [241, 241]];
    const lamps = ax => ['r', 'a', 'g'].map((k, i) => `<circle class="lamp" data-ax="${ax}" data-k="${k}" cx="3.5" cy="${3.4 + i * 5}" r="1.9"/>`).join('');
    POLES.forEach(([px, py], i) => {
      let s = box(px - 2, py - 2, SZ, 6, 6, 2, 1) + box(px, py, SZ + 2, 2.4, 2.4, 34);
      s += `<g class="press head">${box(px - 2.2, py - 2.2, SZ + 36, 7, 7, 16, 1.5)}
        <g transform="${FRONT(px - 2.2, py + 4.8, SZ + 52)}">${lamps('y')}</g>
        <g transform="${SIDE(px + 4.8, py + 4.8, SZ + 52)}">${lamps('x')}</g></g>`;
      svg += `<g class="sig" id="intersection-sig${i}">${s}</g>`;
    });
    svg += `</g>`;

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    const q = s => stage.querySelector(s);
    const NS = 'http://www.w3.org/2000/svg';
    const scene = q('#intersection-scene'), beams = q('#intersection-beams');
    const statics = [
      { el: q('#intersection-office'), x0: 22, x1: 122, y0: 22, y1: 122 },
      { el: q('#intersection-walkup'), x0: 266, x1: 384, y0: 22, y1: 118 },
      { el: q('#intersection-parking'), x0: 22, x1: 135, y0: 262, y1: 380 },
      { el: q('#intersection-cafe'), x0: 270, x1: 380, y0: 270, y1: 394 },
      ...POLES.map(([px, py], i) => ({ el: q('#intersection-sig' + i), x0: px - 2.2, x1: px + 4.8, y0: py - 2.2, y1: py + 4.8 })),
    ];

    /* ---------- cars ---------- */
    const L = 22, W = 12, ZB = PZ + 1.5;
    const LANES = [
      { ax: 'x', dir: 1, c: 215 }, { ax: 'x', dir: -1, c: 185 },
      { ax: 'y', dir: 1, c: 185 }, { ax: 'y', dir: -1, c: 215 },
    ];
    function carMarkup(ax, dir) {
      const hx = ax === 'x' ? dir : 0, hy = ax === 'y' ? dir : 0;
      let s = '';
      if (ax === 'x') {
        [-8, 3].forEach(x => { s += boxc(x, 4, PZ, 5, 2.6, 3.2, 1, 'recess'); });
        s += box(-11, -6, ZB, 22, 12, 6, 2);
        const cx = -5.5 - 2 * hx;
        s += box(cx, -5, ZB + 6, 11, 10, 4.5, 1.5);
        s += `<g transform="${FRONT(cx, 5, ZB + 10.5)}"><rect class="face recess" x="1.2" y="1" width="4" height="2.6"/><rect class="face recess" x="5.8" y="1" width="4" height="2.6"/></g>`;
        s += `<g transform="${SIDE(cx + 11, 5, ZB + 10.5)}"><rect class="face recess" x="1.2" y="1" width="7.6" height="2.6"/></g>`;
        s += `<g transform="${SIDE(11, 6, ZB + 6)}">` + (dir > 0
          ? `<g filter="url(#soft)"><circle class="hl" cx="2.3" cy="2.2" r="1.3"/><circle class="hl" cx="9.7" cy="2.2" r="1.3"/></g>`
          : `<rect class="tl" x="1" y="1.4" width="2.6" height="1.4"/><rect class="tl" x="8.4" y="1.4" width="2.6" height="1.4"/>`) + `</g>`;
      } else {
        [-8, 3].forEach(y => { s += boxc(4, y, PZ, 2.6, 5, 3.2, 1, 'recess'); });
        s += box(-6, -11, ZB, 12, 22, 6, 2);
        const cy = -5.5 - 2 * hy;
        s += box(-5, cy, ZB + 6, 10, 11, 4.5, 1.5);
        s += `<g transform="${SIDE(5, cy + 11, ZB + 10.5)}"><rect class="face recess" x="1.2" y="1" width="4" height="2.6"/><rect class="face recess" x="5.8" y="1" width="4" height="2.6"/></g>`;
        s += `<g transform="${FRONT(-5, cy + 11, ZB + 10.5)}"><rect class="face recess" x="1.2" y="1" width="7.6" height="2.6"/></g>`;
        s += `<g transform="${FRONT(-6, 11, ZB + 6)}">` + (dir > 0
          ? `<g filter="url(#soft)"><circle class="hl" cx="2.3" cy="2.2" r="1.3"/><circle class="hl" cx="9.7" cy="2.2" r="1.3"/></g>`
          : `<rect class="tl" x="1" y="1.4" width="2.6" height="1.4"/><rect class="tl" x="8.4" y="1.4" width="2.6" height="1.4"/>`) + `</g>`;
      }
      return s;
    }
    function beamMarkup(ax, dir) {
      const hx = ax === 'x' ? dir : 0, hy = ax === 'y' ? dir : 0;
      const pt = (a, b) => `${f2(a * hx - b * hy)} ${f2(a * hy + b * hx)}`;
      return `<g transform="${TOP(0, 0, PZ)}"><path class="beam" d="M${pt(11, -4)}L${pt(64, -17)}L${pt(64, 17)}L${pt(11, 4)}Z"/><path class="beam2" d="M${pt(11, -3)}L${pt(36, -8)}L${pt(36, 8)}L${pt(11, 3)}Z"/></g>`;
    }
    const MK = LANES.map(l => ({ car: carMarkup(l.ax, l.dir), beam: beamMarkup(l.ax, l.dir) }));

    const STOP = 146, EXIT = 230, END = 400, VMAX = 56, ACC = 38, DEC = 95, GAP = 6;
    const cars = [];
    function addCar(li, t, v = VMAX) {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'car'); g.innerHTML = MK[li].car;
      const b = document.createElementNS(NS, 'g'); b.innerHTML = MK[li].beam;
      scene.appendChild(g); beams.appendChild(b);
      const c = { li, t, v, el: g, beam: b, counted: t - L / 2 > EXIT };
      cars.push(c); place(c); return c;
    }
    function xy(c) { const l = LANES[c.li], p = l.dir > 0 ? c.t : END - c.t; return l.ax === 'x' ? [p, l.c] : [l.c, p]; }
    function place(c) {
      const [x, y] = xy(c), [sx, sy] = D(x, y, 0);
      const tr = `translate(${f2(sx)} ${f2(sy)})`;
      c.el.setAttribute('transform', tr); c.beam.setAttribute('transform', tr);
      const o = Math.max(0, Math.min(1, (c.t - 4) / 18, (END + 2 - c.t) / 18));
      c.el.style.opacity = o; c.beam.style.opacity = o;
    }

    /* ---------- signals ---------- */
    const PH = [['y', 'g'], ['y', 'a'], ['x', 'g'], ['x', 'a']];
    const DUR = [4, 1.1, 4, 1.1];
    const st = { ph: 2, tph: 0, auto: true, through: 0 };
    const light = ax => { const [a, s] = PH[st.ph]; return a === ax ? s : 'r'; };
    const WORD = { g: 'green', a: 'amber', r: 'red' };
    const lampEls = [...stage.querySelectorAll('.lamp')];
    function render() {
      lampEls.forEach(l => l.classList.toggle('on', light(l.dataset.ax) === l.dataset.k));
      api.power(true);
      api.readout(`NS ${WORD[light('y')]} · EW ${WORD[light('x')]} · ${st.through} car${st.through === 1 ? '' : 's'} through` + (st.auto ? '' : ' · hold'));
    }
    function advance() { st.ph = (st.ph + 1) % 4; st.tph = 0; render(); }
    function switchPhase(el) {
      if (el) api.flash(el, 260); else stage.querySelectorAll('.sig .head').forEach(h => api.flash(h, 260));
      if (PH[st.ph][1] === 'g') { st.ph++; st.tph = 0; render(); } else advance();
      return true;
    }

    /* ---------- simulation ---------- */
    let lastTs = 0, spawnIn = LANES.map((_, i) => 0.6 + i * 0.5), order = [];
    function step(dt) {
      st.tph += dt;
      if (PH[st.ph][1] === 'a' ? st.tph > DUR[st.ph] : (st.auto && st.tph > DUR[st.ph])) advance();
      LANES.forEach((l, li) => {
        const lane = cars.filter(c => c.li === li).sort((a, b) => b.t - a.t);
        const lt = light(l.ax);
        lane.forEach((c, k) => {
          let limit = Infinity;
          if (k > 0) limit = lane[k - 1].t - L - GAP;
          const front = c.t + L / 2;
          if (lt !== 'g' && front <= STOP + 0.5) {
            const dist = STOP - front;
            if (lt === 'r' || dist > (c.v * c.v) / (2 * DEC) * 0.8) limit = Math.min(limit, STOP - L / 2);
          }
          const vt = Math.min(VMAX, Math.sqrt(2 * DEC * Math.max(0, limit - c.t - 0.3)));
          c.v = Math.max(0, Math.min(c.v + ACC * dt, vt));
          c.t += c.v * dt;
          if (!c.counted && c.t - L / 2 > EXIT) { c.counted = true; st.through++; render(); }
        });
        spawnIn[li] -= dt;
        const last = lane[lane.length - 1];
        if (spawnIn[li] <= 0 && lane.length < 6 && (!last || last.t > L + 14)) {
          addCar(li, L / 2, last ? Math.min(VMAX, last.v + 10) : VMAX);
          spawnIn[li] = 1.4 + hash(st.through * 3 + li + cars.length) * 2.6;
        }
      });
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i];
        if (c.t - L / 2 > END) { c.el.remove(); c.beam.remove(); cars.splice(i, 1); } else place(c);
      }
      sortScene();
    }
    // topological painter's sort: A behind B if their screen spans overlap and A ends before B along x or y
    function sortScene() {
      const items = statics.concat(cars.map(c => { const [x, y] = xy(c), l = LANES[c.li];
        const hw = l.ax === 'x' ? L / 2 : W / 2, hd = l.ax === 'x' ? W / 2 : L / 2;
        return { el: c.el, x0: x - hw, x1: x + hw, y0: y - hd, y1: y + hd }; }));
      items.sort((a, b) => (a.x0 + a.x1 + a.y0 + a.y1) - (b.x0 + b.x1 + b.y0 + b.y1));
      const behind = (a, b) => (a.x0 - a.y1) < (b.x1 - b.y0) && (b.x0 - b.y1) < (a.x1 - a.y0) &&
        (a.x1 <= b.x0 + 0.01 || a.y1 <= b.y0 + 0.01);
      const out = [], mark = new Map();
      const visit = n => { if (mark.get(n)) return; mark.set(n, 1);
        items.forEach(m => { if (m !== n && behind(m, n)) visit(m); }); out.push(n.el); };
      items.forEach(visit);
      if (out.length !== order.length || out.some((e, i) => e !== order[i])) { out.forEach(e => scene.appendChild(e)); order = out; }
    }

    // seed: EW flowing, NS queued at the red
    [[0, 40], [0, 120], [0, 222], [1, 70], [1, 226], [1, 350]].forEach(([li, t]) => addCar(li, t));
    [[2, STOP - L / 2], [2, STOP - L / 2 - L - GAP], [2, STOP - L / 2 - 2 * (L + GAP)], [3, STOP - L / 2], [3, STOP - L / 2 - L - GAP]].forEach(([li, t]) => addCar(li, t, 0));
    sortScene();

    api.loop(ts => { const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0; lastTs = ts; if (dt > 0) step(dt); });

    stage.addEventListener('click', e => { const s = e.target.closest('.sig'); if (s) switchPhase(s.querySelector('.head')); });
    render();
    return {
      key(e) {
        if (e.key === ' ') { if (!e.repeat) switchPhase(); return true; }
        if (e.key === 'a' || e.key === 'A') { st.auto = !st.auto; st.tph = 0; render(); return true; }
        return false;
      },
      demo() { api.after(120, () => switchPhase(q("#intersection-sig3 .head"))); api.after(650, () => switchPhase(q("#intersection-sig0 .head"))); },
    };
  },
});
