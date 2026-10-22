/* Fig 6 — Power grid: a plant, a substation with four breakers, four districts on one plate. */
FIGS.push({
  id: 'grid',
  name: 'Power grid',
  hint: 'Press A · B · C · D to switch districts · X blackout',
  aria: 'Isometric miniature city on a plate: a power plant with cooling towers and a stack, a substation with a load meter and four breaker switches A to D, and transmission lines on pylons to four districts: A downtown towers, B houses, C a sawtooth-roof factory, D a stadium and clinic. Press a, b, c or d, or click a breaker, to power a district; x cuts all power.',
  css: `
    [data-fig="grid"] .brk { cursor:pointer; }
    [data-fig="grid"] .win { fill:var(--recess); stroke:var(--detail); stroke-width:.6; vector-effect:non-scaling-stroke; }
    [data-fig="grid"] .bld.on .win { fill:var(--accent); stroke:none; }
    [data-fig="grid"] .bld.on .win.hi { fill:var(--accent-hi); }
    [data-fig="grid"] .bld.on .win.dk { fill:var(--recess); stroke:var(--detail); }
    [data-fig="grid"] .bld.on .wins { filter:url(#soft); }
    [data-fig="grid"] .lamp .face { transition:fill .3s; }
    [data-fig="grid"] .lamp.on .face { fill:var(--accent-hi); stroke:var(--accent); }
    [data-fig="grid"] .lamp.on { filter:url(#glow); }
    [data-fig="grid"] .pool { fill:var(--accent); opacity:0; transition:opacity .4s; }
    [data-fig="grid"] .pool.on { opacity:.35; }
    [data-fig="grid"] .field { transition:fill .4s; }
    [data-fig="grid"] .field.on { fill:var(--glass-on); stroke:var(--accent); }
    [data-fig="grid"] .fmark { fill:none; stroke:var(--detail); vector-effect:non-scaling-stroke; }
    [data-fig="grid"] .field-g.on .fmark { stroke:var(--accent-hi); }
    [data-fig="grid"] .field-g.on { filter:url(#soft); }
    [data-fig="grid"] .fhalo { fill:var(--accent); opacity:0; transition:opacity .4s; }
    [data-fig="grid"] .fhalo.on { opacity:.3; }
    [data-fig="grid"] .wire { stroke-width:1.1; transition:none; }
    [data-fig="grid"] .wire.hot { filter:url(#soft); }
    [data-fig="grid"] .wire-under { stroke-width:2.6; }
    [data-fig="grid"] .pulse { stroke-width:2.6; }
    [data-fig="grid"] .stacklight { fill:var(--detail); }
    [data-fig="grid"].run .stacklight { fill:var(--accent); filter:url(#soft); }
    [data-fig="grid"].cap .stacklight { fill:var(--accent-hi); filter:url(#glow); animation-duration:.5s; }
    [data-fig="grid"] .ttop { fill:var(--recess); stroke:var(--line); vector-effect:non-scaling-stroke; transition:fill .4s, stroke .4s; }
    [data-fig="grid"].run .ttop { stroke:var(--accent); }
    [data-fig="grid"].cap .ttop { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="grid"] .thalo { fill:var(--accent); opacity:0; transition:opacity .4s; }
    [data-fig="grid"].run .thalo { opacity:.12; }
    [data-fig="grid"].cap .thalo { opacity:.45; }
    [data-fig="grid"] .steam { opacity:0; transition:opacity .4s; stroke:var(--accent-dim); }
    [data-fig="grid"].cap .steam { opacity:1; stroke:var(--accent); }
    [data-fig="grid"] .pwin { fill:var(--recess); stroke:var(--detail); stroke-width:.6; vector-effect:non-scaling-stroke; }
    [data-fig="grid"].run .pwin { fill:var(--accent); stroke:none; }
    [data-fig="grid"].run .pwins { filter:url(#soft); }
    [data-fig="grid"] .seg { fill:var(--recess); stroke:var(--detail); stroke-width:.6; vector-effect:non-scaling-stroke; }
    [data-fig="grid"] .seg.on { fill:var(--accent); stroke:var(--accent-hi); }
    [data-fig="grid"] .mtxt { fill:var(--ink); }
    [data-fig="grid"].run .mtxt { fill:var(--accent-hi); }
    [data-fig="grid"] .capt { opacity:0; }
    [data-fig="grid"].cap .capt { opacity:1; }
    [data-fig="grid"] .bled { fill:var(--detail); }
    [data-fig="grid"] .bled.on { fill:var(--accent); filter:url(#soft); }
    [data-fig="grid"] .dlbl.on { fill:var(--accent-hi); }
    [data-fig="grid"] .sign { fill:var(--recess); transition:fill .3s; }
    [data-fig="grid"] .bld.on .sign { fill:var(--accent-hi); }
  `,
  mount(stage, api) {
    /*  boxes             x    y    z    w    d    h
        plate             0    0    0  460  400    8
        cooling towers   12/12 .. 56   stacked rounded tiers, centres (34,34) (34,84), h 62
        stack           126   16    8   12   12  150
        turbine hall     64   50    8   82   58   34
        transformers    174 20/40   8   22   16   18
        control house   206   16    8   64   44   36   (load meter glass on its FRONT face)
        breaker console 182   72    8  110   32   12   (4 switches on top)
        districts: A x320-448 y12-112 · B x14-146 y140-392 · C x170-296 y136-392 · D x320-448 y136-392 */
    const PZ = 8, STK = 150;
    const K = api.iso.frame([[0,400,0],[460,0,PZ],[460,400,0],[0,0,PZ],[126,16,PZ+STK+6],[370,14,PZ+134+22],[0,400,PZ]]);
    const { P, D, TOP, FRONT, SIDE, plane, box, path } = K, slits = api.iso.slits;

    // deterministic pseudo-random
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

    const DIST = {
      a: { L: 'A', name: 'downtown', mw: 168 },
      b: { L: 'B', name: 'houses', mw: 58 },
      c: { L: 'C', name: 'factory', mw: 136 },
      d: { L: 'D', name: 'stadium', mw: 108 },
    };
    const KEYS = ['a', 'b', 'c', 'd'];
    const bldCount = { a: 0, b: 0, c: 0, d: 0 };

    // window grid on a face (face-local coords)
    function wins(t, w, h, o = {}) {
      const cp = o.cp || 6, fp = o.fp || 7, ww = o.ww || 3, wh = o.wh || 4, mx = o.mx || 4, top = o.top || 4, bot = o.bot || 3;
      const cols = Math.max(1, Math.floor((w - 2 * mx + (cp - ww)) / cp)), rows = Math.max(1, Math.floor((h - top - bot + (fp - wh)) / fp));
      const x0 = (w - (cols * cp - (cp - ww))) / 2;
      let s = `<g transform="${t}">`;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const v = rnd(); const cls = v < .13 ? 'win dk' : v > .8 ? 'win hi' : 'win';
        s += `<rect class="${cls}" x="${(x0 + c * cp).toFixed(2)}" y="${top + r * fp}" width="${ww}" height="${wh}"/>`;
      }
      return s + `</g>`;
    }
    // building: box + window grids on both visible faces + roof extras
    function bld(dk, x, y, z, w, d, h, o = {}) {
      const i = bldCount[dk]++;
      let s = `<g class="bld" data-d="${dk}" data-i="${i}">` + box(x, y, z, w, d, h, o.r || 1.5);
      s += `<g class="wins">` + wins(FRONT(x, y + d, z + h), w, h, o) + wins(SIDE(x + w, y + d, z + h), d, h, o) + (o.extraWin || '') + `</g>`;
      if (o.roof) s += o.roof;
      return s + `</g>`;
    }
    // gable roof, ridge along x
    function gable(x, y, z, w, d, rh) {
      const back = plane([x, y, z], [1, 0, 0], [0, 1, 2 * rh / d]);
      const front = plane([x, y + d / 2, z + rh], [1, 0, 0], [0, 1, -2 * rh / d]);
            return `<g transform="${back}"><rect class="face top" width="${w}" height="${d / 2}"/></g>` +
        `<g transform="${front}"><rect class="face top" width="${w}" height="${d / 2}"/>${slits(2, d / 2 - 1, 2.4, 1, w - 1, false)}</g>` +
        `<g transform="${SIDE(x + w, y + d, z + rh)}"><path class="face" d="M0 ${rh} L${d / 2} 0 L${d} ${rh} Z"/></g>`;
    }
    // street lamp
    const lamp = (dk, x, y) => box(x, y, PZ, 1.6, 1.6, 15) + `<g class="lamp" data-d="${dk}">${box(x - 1, y - 1, PZ + 15, 3.6, 3.6, 2.4, 1)}</g>`;
    const pool = (dk, x, y) => `<g transform="${TOP(x - 9, y - 9, PZ)}"><ellipse class="pool" data-d="${dk}" cx="9.8" cy="9.8" rx="9" ry="9" filter="url(#bloom)"/></g>`;

    let svg = '';
    // ---------- plate ----------
    svg += box(0, 0, 0, 460, 400, PZ, 16);
    svg += `<g transform="${FRONT(0, 400, PZ)}">${slits(20, 440, 8, 2.5, 5.5)}</g>`;
    svg += `<g transform="${TOP(0, 0, PZ)}">
      <rect class="detail" x="6" y="6" width="448" height="388" rx="11"/>
      ${[[10, 10], [450, 10], [10, 390], [450, 390]].map(([x, y]) => `<circle class="face recess" cx="${x}" cy="${y}" r="2.6"/><line class="detail" x1="${x - 1.6}" y1="${y}" x2="${x + 1.6}" y2="${y}"/>`).join('')}
      <rect class="face recess" x="14" y="116" width="434" height="16" rx="2"/>
      <rect class="face recess" x="150" y="132" width="16" height="258" rx="2"/>
      <rect class="face recess" x="300" y="14" width="16" height="376" rx="2"/>
      ${(() => { let s = ''; for (let x = 20; x < 444; x += 14) if (!(x > 144 && x < 170) && !(x > 294 && x < 320)) s += `<line class="detail" x1="${x}" y1="124" x2="${x + 7}" y2="124"/>`;
        for (let y = 140; y < 386; y += 14) s += `<line class="detail" x1="158" y1="${y}" x2="158" y2="${y + 7}"/><line class="detail" x1="308" y1="${y}" x2="308" y2="${y + 7}"/>`;
        for (let y = 20; y < 108; y += 14) s += `<line class="detail" x1="308" y1="${y}" x2="308" y2="${y + 7}"/>`;
        for (let k = 0; k < 5; k++) { s += `<line class="detail" x1="${151 + k * 3.4}" y1="134" x2="${151 + k * 3.4}" y2="140"/><line class="detail" x1="${301 + k * 3.4}" y1="134" x2="${301 + k * 3.4}" y2="140"/><line class="detail" x1="${301 + k * 3.4}" y1="108" x2="${301 + k * 3.4}" y2="114"/>`; }
        return s; })()}
      <text class="label dlbl" data-d="a" x="322" y="111" font-size="6" letter-spacing=".6">A · DOWNTOWN</text>
      <text class="label dlbl" data-d="b" x="16" y="388" font-size="6" letter-spacing=".6">B · HOUSES</text>
      <text class="label dlbl" data-d="c" x="172" y="388" font-size="6" letter-spacing=".6">C · FACTORY</text>
      <text class="label dlbl" data-d="d" x="322" y="388" font-size="6" letter-spacing=".6">D · STADIUM</text>
      <text class="label" x="16" y="111" font-size="5" letter-spacing=".6">PLANT 1</text>
      <text class="label" x="172" y="111" font-size="5" letter-spacing=".6">SUBSTATION 7</text>
    </g>`;

    // ---------- lamp pools (ground layer) ----------
    const LAMPS = {
      a: [[318, 30], [318, 70], [440, 108]],
      b: [[146, 160], [146, 230], [146, 300], [60, 136], [146, 370]],
      c: [[170, 150], [170, 260], [290, 136], [296, 330]],
      d: [[318, 160], [318, 240], [318, 320], [400, 136]],
    };
    KEYS.forEach(k => LAMPS[k].forEach(([x, y]) => { svg += pool(k, x, y); }));

    // ---------- parts, sorted back to front ----------
    const parts = [];
    const add = (key, html) => parts.push([key, html]);

    // power plant
    const tower = (cx, cy) => {
      const tiers = [[22, 10], [20, 10], [18, 10], [16.5, 10], [15.8, 8], [16.4, 7], [17.4, 7]];
      let z = PZ, s = '';
      tiers.forEach(([r, h]) => { s += box(cx - r, cy - r, z, 2 * r, 2 * r, h, r * .92); z += h; });
      const r = tiers[tiers.length - 1][0];
      s += `<g transform="${TOP(cx - r, cy - r, z)}"><ellipse class="thalo" cx="${r}" cy="${r}" rx="${r * 1.1}" ry="${r * 1.1}" filter="url(#bloom)"/><ellipse class="ttop" cx="${r}" cy="${r}" rx="${r - 2.5}" ry="${r - 2.5}"/></g>`;
      s += `<path class="steam" fill="none" stroke-width="1" d="${path([[cx - 6, cy, z + 6], [cx - 3, cy, z + 14], [cx - 7, cy, z + 22]])}"/>`;
      s += `<path class="steam" fill="none" stroke-width="1" d="${path([[cx + 4, cy, z + 4], [cx + 7, cy, z + 12], [cx + 3, cy, z + 20]])}"/>`;
      return s;
    };
    add(68, `<g class="plantg">${tower(34, 34)}</g>`);
    add(118, `<g class="plantg">${tower(34, 84)}</g>`);
    add(140, `<g class="plantg">${box(122, 12, PZ, 20, 20, 6, 2)}${box(126, 16, PZ + 6, 12, 12, STK - 6, 2)}
      <g transform="${FRONT(126, 28, PZ + STK)}">${slits(6, STK - 10, 12, 0, 12, false)}</g>
      <g transform="${SIDE(138, 28, PZ + STK)}">${slits(6, STK - 10, 12, 0, 12, false)}</g>
      ${box(125, 15, PZ + STK, 14, 14, 3, 1)}
      <g transform="${TOP(126, 16, PZ + STK + 3)}"><circle class="stacklight blink" cx="6" cy="6" r="3.2"/></g></g>`);
    add(180, `<g class="plantg">${box(64, 50, PZ, 82, 58, 34, 2)}
      <g transform="${TOP(64, 50, PZ + 34)}">${slits(6, 76, 5, 6, 52)}<rect class="face" x="30" y="18" width="22" height="20" rx="2"/></g>
      <g transform="${FRONT(64, 108, PZ + 34)}"><g class="pwins">${Array.from({ length: 9 }, (_, i) => `<rect class="pwin" x="${5 + i * 8.4}" y="5" width="5" height="16"/>`).join('')}</g>
        <rect class="face recess" x="58" y="24" width="18" height="10"/>${slits(26, 33, 2.4, 58, 76, false)}</g>
      <g transform="${SIDE(146, 108, PZ + 34)}"><g class="pwins">${Array.from({ length: 6 }, (_, i) => `<rect class="pwin" x="${5 + i * 8.6}" y="5" width="5" height="12"/>`).join('')}</g>
        <text class="label" x="6" y="29" font-size="5.5" letter-spacing=".6">PLANT 1 · 470 MW</text></g></g>`);

    // substation: transformers
    [[174, 20], [174, 40]].forEach(([x, y]) => add(x + y + 10, `${box(x, y, PZ, 22, 16, 18, 1.5)}
      <g transform="${FRONT(x, y + 16, PZ + 18)}">${slits(3, 19, 2.2, 3, 15)}</g>
      <g transform="${SIDE(x + 22, y + 16, PZ + 18)}">${slits(3, 13, 2.2, 3, 15)}</g>
      ${[4, 10, 16].map(dx => box(x + dx, y + 6, PZ + 18, 2.4, 2.4, 8, 1) + box(x + dx - .8, y + 5.2, PZ + 26, 4, 4, 1.2, 1)).join('')}`));
    // control house
    add(206 + 16 + 30, `${box(206, 16, PZ, 64, 44, 36, 2)}
      <g transform="${TOP(206, 16, PZ + 36)}">${slits(4, 60, 4, 4, 14)}<rect class="face" x="40" y="22" width="16" height="14" rx="1"/></g>
      <g transform="${SIDE(270, 60, PZ + 36)}">${slits(4, 40, 3, 26, 33)}<text class="label" x="4" y="9" font-size="4.2">132 kV</text></g>
      <g transform="${FRONT(206, 60, PZ + 36)}"><text class="label" x="6" y="9" font-size="5" letter-spacing=".6">SUBSTATION 7</text>${slits(6, 58, 4, 13, 20)}<rect class="face recess" x="44" y="16" width="12" height="20"/></g>`);
    // breaker console: 4 switches on top, the lit load meter on its front
    const CX = 182, CY = 70, CW = 100, CD = 36, CH = 22;
    add(CX + CY + 40, `<g>${box(CX, CY, PZ, CW, CD, CH, 3)}
      <g transform="${TOP(CX, CY, PZ + CH)}"><rect class="detail" x="3" y="3" width="${CW - 6}" height="${CD - 6}" rx="2"/>
        ${KEYS.map((k, i) => `<text class="label dlbl" data-d="${k}" x="${14 + i * 24}" y="31.5" font-size="7" text-anchor="middle">${DIST[k].L}</text><circle class="bled" id="grid-led-${k}" cx="${21 + i * 24}" cy="29" r="1.6"/>`).join('')}</g>
      <g transform="${FRONT(CX, CY + CD, PZ + CH)}">
        <rect class="face recess" x="2.5" y="2.5" width="${CW - 5}" height="16" rx="2"/>
        <rect class="halo" id="grid-halo" x="0" y="0" width="${CW}" height="21" rx="3" filter="url(#bloom)"/>
        <rect class="face glass" id="grid-glass" x="4" y="4" width="${CW - 8}" height="13" rx="1.5"/>
        <g filter="url(#soft)">
          <text class="mtxt" id="grid-mw" x="40" y="14.6" font-size="10.5" text-anchor="end">0</text>
          <text class="mtxt" x="42" y="14.6" font-size="4.6">MW</text>
          ${KEYS.map((k, i) => `<rect class="seg" id="grid-seg-${k}" x="${55 + i * 10.4}" y="6.5" width="9" height="4.2" rx=".6"/>`).join('')}
          <text class="mtxt capt" x="55" y="15.2" font-size="3.2" letter-spacing=".3">AT CAPACITY</text>
        </g>
      </g>
      ${KEYS.map((k, i) => `<g class="press brk" data-k="${k}" id="grid-brk-${k}">${box(CX + 5 + i * 24, CY + 4, PZ + CH, 18, 18, 6, 2)}
        <g transform="${TOP(CX + 5 + i * 24, CY + 4, PZ + CH + 6)}"><rect class="detail" x="3" y="3" width="12" height="12" rx="1.5"/></g></g>`).join('')}</g>`);

    // pylons
    const pylon = (px, py, h) => `${box(px - 7, py - 1, PZ, 2, 2, h)}${box(px + 5, py - 1, PZ, 2, 2, h)}
      <g transform="${FRONT(px - 5, py + 1, PZ + h - 6)}"><path class="detail" d="${(() => { let s = ''; for (let v = 0; v < h - 8; v += 8) s += `M0 ${v}L10 ${v + 8}M10 ${v}L0 ${v + 8}`; return s; })()}"/></g>
      ${box(px - 12, py - 1, PZ + h, 24, 2, 2)}${box(px - 3, py - 1, PZ + h + 2, 6, 2, 6)}`;
    const PY = { G: [288, 40, 50], PA: [308, 100, 44], PH: [308, 124, 44], PL: [158, 124, 44] };
    Object.values(PY).forEach(([x, y, h]) => add(x + y + 1, pylon(x, y, h)));
    // kiosks (district end points)
    const KIOSK = { a: [326, 92], b: [134, 144], c: [286, 146], d: [324, 142] };
    Object.entries(KIOSK).forEach(([k, [x, y]]) => add(x + y + 6, `${box(x - 6, y - 6, PZ, 12, 12, 14, 1.5)}<g transform="${FRONT(x - 6, y + 6, PZ + 14)}"><circle class="bled" data-d="${k}" cx="6" cy="4" r="1.6"/>${slits(2, 10, 2, 8, 12)}</g>`));

    // district A: towers
    const roofA = (x, y, z, w, d, ant) => box(x + 4, y + 4, z, w * .4, d * .35, 5, 1) + (ant ? box(x + w / 2, y + d / 2, z, 1.4, 1.4, ant) : '');
    [[330, 16, 28, 30, 110, 0], [370, 14, 32, 32, 134, 22], [414, 16, 28, 28, 80, 0], [338, 58, 26, 30, 62, 0], [376, 58, 30, 32, 96, 10], [416, 56, 26, 40, 46, 0]]
      .forEach(([x, y, w, d, h, ant]) => add(x + w / 2 + y + d / 2, bld('a', x, y, PZ, w, d, h, { roof: roofA(x, y, PZ + h, w, d, ant), fp: 7, cp: 5 })));

    // district B: houses
    [[24, 160], [86, 156], [24, 226], [86, 222], [24, 292], [86, 288], [30, 346], [92, 342]].forEach(([x, y], i) => {
      const w = 40 - (i % 3) * 4, d = 30, h = 16 + (i % 2) * 6;
      add(x + w / 2 + y + d / 2, bld('b', x, y, PZ, w, d, h, { cp: 9, fp: 9, ww: 4, wh: 5, mx: 5, top: 4, bot: 4,
        roof: gable(x, y, PZ + h, w, d, 10) + box(x + w * .7, y + 4, PZ + h + 3, 4, 4, 10) }));
    });

    // district C: factory with sawtooth roof
    (() => {
      const x = 178, y = 160, w = 112, d = 76, h = 24, z = PZ + h, n = 4, tw = w / n, th = 13;
      let s = box(x, y, PZ, w, d, h, 1.5);
      s += `<g class="wins">${wins(FRONT(x, y + d, z), w, h, { cp: 7, fp: 9, ww: 4, wh: 5, top: 4 })}${wins(SIDE(x + w, y + d, z), d, h, { cp: 7, fp: 9, ww: 4, wh: 5, top: 4 })}`;
      for (let i = 0; i < n; i++) {
        const x0 = x + i * tw;
        s += `<g transform="${plane([x0, y, z], [tw, 0, th].map(v => v / tw), [0, 1, 0])}"><rect class="face top" width="${tw}" height="${d}"/>${slits(6, d - 6, 6, 2, tw - 2, false)}</g>`;
        s += `<g transform="${SIDE(x0 + tw, y + d, z + th)}"><rect class="face" width="${d}" height="${th}"/>${Array.from({ length: 9 }, (_, j) => `<rect class="win${j % 4 === 3 ? ' hi' : ''}" x="${3 + j * 8.1}" y="2.5" width="6" height="${th - 5}"/>`).join('')}</g>`;
        s += `<g transform="${FRONT(x0, y + d, z + th)}"><path class="face" d="M0 ${th} L${tw} 0 L${tw} ${th} Z"/></g>`;
      }
      s += `</g>`;
      add(x + w / 2 + y + d / 2, `<g class="bld" data-d="c" data-i="${bldCount.c++}">${s}</g>`);
    })();
    add(262 + 262, box(258, 256, PZ, 16, 16, 4, 2) + `<g class="bld" data-d="c" data-i="${bldCount.c++}">${box(261, 259, PZ + 4, 10, 10, 72, 4)}<g class="wins"><g transform="${FRONT(261, 269, PZ + 76)}"><rect class="win hi" x="1" y="4" width="8" height="3"/><rect class="win" x="1" y="10" width="8" height="2"/></g></g></g>`);
    add(200 + 290, bld('c', 180, 268, PZ, 48, 40, 32, { cp: 6, fp: 7, roof: box(186, 274, PZ + 32, 14, 10, 5, 1) }));
    add(230 + 345, bld('c', 196, 326, PZ, 70, 40, 18, { cp: 7, fp: 7 }));

    // district D: stadium + clinic
    (() => {
      const x = 334, y = 168, w = 106, d = 120;
      // field (ground) first
      add(x + y + 10, `<g transform="${TOP(x + 14, y + 16, PZ + 1)}">
        <rect class="fhalo" id="grid-fhalo" x="0" y="0" width="${w - 28}" height="${d - 30}" filter="url(#bloom)"/>
        <g class="field-g" id="grid-fieldg"><rect class="face field" id="grid-field" x="0" y="0" width="${w - 28}" height="${d - 30}"/>
        <rect class="fmark" x="5" y="5" width="${w - 38}" height="${d - 40}"/><line class="fmark" x1="5" y1="${(d - 30) / 2}" x2="${w - 33}" y2="${(d - 30) / 2}"/>
        <circle class="fmark" cx="${(w - 28) / 2}" cy="${(d - 30) / 2}" r="9"/>
        <rect class="fmark" x="${(w - 28) / 2 - 12}" y="5" width="24" height="10"/><rect class="fmark" x="${(w - 28) / 2 - 12}" y="${d - 45}" width="24" height="10"/></g></g>`);
      const stand = (sx, sy, sw, sd, sh, rows) => `${box(sx, sy, PZ, sw, sd, sh, 1.5)}<g transform="${TOP(sx, sy, PZ + sh)}">${rows}</g>`;
      add(x + y + 20, `<g class="bld" data-d="d" data-i="${bldCount.d++}">${stand(x, y, w, 16, 22, slits(3, 13, 2.5, 2, w - 2, false))}<g class="wins">${wins(FRONT(x, y + 16, PZ + 22), w, 22, { cp: 8, fp: 8, ww: 5, wh: 2, top: 5 })}</g></g>`);
      add(x + 8 + y + 60, `<g class="bld" data-d="d" data-i="${bldCount.d++}">${stand(x, y + 16, 14, d - 30, 14, slits(3, 11, 2.5, 2, d - 32))}<g class="wins">${wins(FRONT(x, y + d - 14, PZ + 14), 14, 14, { cp: 5, fp: 6, ww: 2, wh: 2 })}</g></g>`);
      add(x + w + y + 60, `<g class="bld" data-d="d" data-i="${bldCount.d++}">${stand(x + w - 14, y + 16, 14, d - 30, 14, slits(3, 11, 2.5, 2, d - 32))}<g class="wins">${wins(SIDE(x + w, y + d - 14, PZ + 14), d - 30, 14, { cp: 8, fp: 6, ww: 5, wh: 2, top: 5 })}</g></g>`);
      add(x + w / 2 + y + d - 7, `<g class="bld" data-d="d" data-i="${bldCount.d++}">${stand(x, y + d - 14, w, 14, 8, slits(3, 11, 2.5, 2, w - 2, false))}<g class="wins">${wins(FRONT(x, y + d, PZ + 8), w, 8, { cp: 8, fp: 6, ww: 5, wh: 2, top: 3, bot: 2 })}${wins(SIDE(x + w, y + d, PZ + 8), 14, 8, { cp: 6, fp: 6, ww: 3, wh: 2, top: 3, bot: 2 })}</g></g>`);
      // floodlight masts
      [[x - 4, y - 4], [x + w + 2, y - 4], [x - 4, y + d + 2], [x + w + 2, y + d + 2]].forEach(([mx, my]) =>
        add(mx + my + 1, `${box(mx, my, PZ, 2, 2, 56)}<g class="lamp" data-d="d">${box(mx - 4, my - 1, PZ + 56, 10, 4, 6, 1)}</g>`));
    })();
    add(370 + 345, bld('d', 340, 318, PZ, 72, 54, 28, { cp: 6, fp: 7,
      roof: box(368, 330, PZ + 28, 16, 16, 8, 1) + `<g transform="${SIDE(384, 346, PZ + 36)}"><path class="sign" d="M6 1.5h4v2.5h2.5v4h-2.5v2.5h-4v-2.5h-2.5v-4h2.5z"/></g>` }));

    // street lamps
    KEYS.forEach(k => LAMPS[k].forEach(([x, y]) => add(x + y, lamp(k, x, y))));

    parts.sort((p, q) => p[0] - q[0]).forEach(p => { svg += p[1]; });

    // ---------- transmission lines (drawn last: they hang above the city) ----------
    const OFF = { a: -9, b: -3, c: 3, d: 9 };
    const top = (n, k) => { const [x, y, h] = PY[n]; return [x + OFF[k], y, PZ + h + 1]; };
    const ROUTE = {
      a: [top('G', 'a'), top('PA', 'a'), [KIOSK.a[0], KIOSK.a[1], PZ + 14]],
      b: [top('G', 'b'), top('PL', 'b'), [KIOSK.b[0], KIOSK.b[1], PZ + 14]],
      c: [top('G', 'c'), top('PH', 'c'), [KIOSK.c[0], KIOSK.c[1], PZ + 14]],
      d: [top('G', 'd'), top('PH', 'd'), [KIOSK.d[0], KIOSK.d[1], PZ + 14]],
    };
    const sag = nodes => { const pts = [nodes[0]];
      for (let i = 1; i < nodes.length; i++) { const a = nodes[i - 1], b = nodes[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let t = 1; t <= 14; t++) { const u = t / 14; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u - L * .05 * 4 * u * (1 - u)]); } }
      return path(pts); };
    // feeder: plant hall -> transformers -> gantry
    const feed = path([[146, 40, PZ + 26], [160, 34, PZ + 30], [178, 26, PZ + 27], [196, 22, PZ + 36], [230, 10, PZ + 50], [288, 40, PZ + 51]]);
    svg += `<path class="wire-under" d="${feed}"/><path class="wire" id="grid-feed" d="${feed}"/>`;
    const lines = KEYS.map(k => [k, sag(ROUTE[k])]);
    lines.forEach(([k, d]) => { svg += `<path class="wire-under" d="${d}"/><path class="wire" data-d="${k}" d="${d}"/>`; });
    svg += `<path class="pulse" id="grid-pfeed" pathLength="1000" d="${feed}"/>`;
    lines.forEach(([k, d]) => { svg += `<path class="pulse" data-d="${k}" pathLength="1000" d="${d}"/>`; });

    stage.setAttribute('viewBox', K.viewBox);
    stage.innerHTML = svg;

    // ---------- state ----------
    const q = s => stage.querySelector(s), qa = s => [...stage.querySelectorAll(s)];
    const st = { a: 0, b: 0, c: 0, d: 0 };
    const gen = { a: 0, b: 0, c: 0, d: 0 };
    const load = () => KEYS.reduce((m, k) => m + (st[k] ? DIST[k].mw : 0), 0);
    function render() {
      const n = KEYS.filter(k => st[k]).length, mw = load(), run = n > 0, cap = n === 4;
      stage.classList.toggle('run', run); stage.classList.toggle('cap', cap);
      KEYS.forEach(k => {
        const on = !!st[k];
        q(`#grid-brk-${k}`).classList.toggle('latched', on);
        q(`#grid-led-${k}`).classList.toggle('on', on);
        q(`#grid-seg-${k}`).classList.toggle('on', on);
        qa(`[data-d="${k}"].wire`).forEach(e => e.classList.toggle('hot', on));
        qa(`.lamp[data-d="${k}"], .pool[data-d="${k}"], .bled[data-d="${k}"], .dlbl[data-d="${k}"]`).forEach(e => e.classList.toggle('on', on));
      });
      ['#grid-field', '#grid-fieldg', '#grid-fhalo'].forEach(s => q(s).classList.toggle('on', !!st.d));
      q('#grid-feed').classList.toggle('hot', run);
      q('#grid-glass').classList.toggle('hot', run); q('#grid-halo').classList.toggle('hot', run);
      q('#grid-mw').textContent = mw;
      api.power(run);
      api.readout(`${n}/4 districts · ${mw} MW` + (cap ? ' · at capacity' : n === 0 ? ' · blackout' : ''));
    }
    function setD(k, on) {
      if (!!st[k] === !!on) return;
      st[k] = on ? 1 : 0; const g = ++gen[k];
      const blds = qa(`.bld[data-d="${k}"]`).sort((a, b) => a.dataset.i - b.dataset.i);
      if (on) {
        api.replay(q('#grid-pfeed'));
        api.after(260, () => { if (gen[k] === g) api.replay(q(`.pulse[data-d="${k}"]`)); });
        blds.forEach((b, i) => api.after(140 + i * 60, () => { if (gen[k] === g) b.classList.add('on'); }));
      } else blds.forEach(b => b.classList.remove('on'));
      render();
    }
    function toggle(k) { if (!(k in st)) return false; api.flash(q(`#grid-brk-${k}`), 220); setD(k, !st[k]); return true; }
    function blackout() { KEYS.forEach(k => { if (st[k]) api.flash(q(`#grid-brk-${k}`), 220); setD(k, 0); }); return true; }
    // current keeps flowing: pulses repeat while districts are live
    api.every(1100, () => {
      const live = KEYS.filter(k => st[k]); if (!live.length) return;
      api.replay(q('#grid-pfeed'));
      api.after(280, () => live.forEach(k => { if (st[k]) api.replay(q(`.pulse[data-d="${k}"]`)); }));
    });
    stage.addEventListener('click', e => { const b = e.target.closest('.brk'); if (b) toggle(b.dataset.k); });
    render();
    return {
      key: e => { const k = e.key.toLowerCase(); if (e.repeat) return k in st || k === 'x';
        if (k === 'x') return blackout(); return toggle(k); },
      demo: () => { api.after(30, () => toggle("a")); api.after(110, () => toggle("c")); api.after(190, () => toggle("d")); },
    };
  },
});
