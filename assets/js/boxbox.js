(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= BOXBOX: dane z nagrania monza-trening_2026-10-26 ================= */
(function(){
  const BB = window.BB_MONZA;
  const mapEl = $('#bb-map'); if (!mapEl) return;
  const chart = $('#bb-chart'), pos = $('#bb-pos');
  const REF = 3; let lap = 4, cur = 900;
  const fmtM = (d) => String(Math.round(d)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' m';
  const idx = (d) => Math.max(0, Math.min(BB.n - 1, Math.round(d / BB.step)));
  /* mapa */
  const MX = 30, MY = 20, MW = 340, MH = 400;
  const pt = (k) => [MX + BB.path[k][0] * MW, MY + BB.path[k][1] * MH];
  function drawMap(){
    let h = '';
    const line = (a, b, cls) => { let s = ''; for (let k = a; k <= b; k++) { const p = pt(Math.min(k, BB.n - 1)); s += (k === a ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); } return '<path d="' + s + '" class="' + cls + '"/>'; };
    h += '<style>#bb-map .tr{fill:none;stroke:var(--line);stroke-width:7;stroke-linecap:round;stroke-linejoin:round}#bb-map .zn{fill:none;stroke:var(--muted);stroke-width:7;stroke-linecap:butt}#bb-map text{font-family:var(--f-mono);font-size:12px;fill:var(--ink)}#bb-map .sf{stroke:var(--ink);stroke-width:2}</style>';
    h += line(0, BB.n - 1, 'tr');
    const a0 = pt(0), aN = pt(BB.n - 1);
    h += '<path d="M' + aN[0].toFixed(1) + ' ' + aN[1].toFixed(1) + 'L' + a0[0].toFixed(1) + ' ' + a0[1].toFixed(1) + '" class="tr"/>';
    BB.corners.forEach(c => {
      h += line(idx(c.entry), idx(c.exit), 'zn');
      const p = pt(idx(c.apex));
      const cx = MX + MW / 2, cy = MY + MH / 2, dx = p[0] - cx, dy = p[1] - cy, len = Math.hypot(dx, dy) || 1;
      const lx = p[0] + dx / len * 26, ly = p[1] + dy / len * 20;
      h += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="middle">' + esc(c.name) + '</text>';
    });
    h += '<line x1="' + (a0[0] - 9) + '" y1="' + a0[1] + '" x2="' + (a0[0] + 9) + '" y2="' + a0[1] + '" class="sf"/><text x="' + (a0[0] + 14) + '" y="' + (a0[1] + 4) + '">meta</text>';
    const m = pt(idx(cur));
    h += '<circle id="bb-dot" cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="7" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>';
    mapEl.innerHTML = h;
  }
  /* wykres prędkości: jedna oś, dwie serie */
  const X0 = 44, X1 = 708, Y0 = 16, Y1 = 208, VMAX = 350;
  const sx = (d) => X0 + d / BB.len * (X1 - X0), sy = (v) => Y1 - v / VMAX * (Y1 - Y0);
  function series(n, cls){
    const v = BB.laps[n].v; let s = '', pen = false;
    for (let k = 0; k < BB.n; k++) { if (v[k] == null) { pen = false; continue; } s += (pen ? 'L' : 'M') + sx(k * BB.step).toFixed(1) + ' ' + sy(v[k]).toFixed(1); pen = true; }
    return '<path d="' + s + '" class="' + cls + '"/>';
  }
  function drawChart(){
    let h = '<style>#bb-chart .g{stroke:var(--line);stroke-width:1}#bb-chart .z{fill:var(--sunk)}#bb-chart .s1{fill:none;stroke:var(--s1);stroke-width:2;stroke-linejoin:round}#bb-chart .s2{fill:none;stroke:var(--s2);stroke-width:1.6;stroke-dasharray:5 4;stroke-linejoin:round}#bb-chart .x{stroke:var(--ink);stroke-width:1}#bb-chart .zl{fill:var(--ink)}</style>';
    BB.corners.forEach(c => { h += '<rect class="z" x="' + sx(c.entry).toFixed(1) + '" y="' + Y0 + '" width="' + (sx(c.exit) - sx(c.entry)).toFixed(1) + '" height="' + (Y1 - Y0) + '"/><text class="zl" x="' + sx((c.entry + c.exit) / 2).toFixed(1) + '" y="' + (Y0 - 4) + '" text-anchor="middle">' + esc(c.name) + '</text>'; });
    [0, 100, 200, 300].forEach(v => { h += '<line class="g" x1="' + X0 + '" x2="' + X1 + '" y1="' + sy(v) + '" y2="' + sy(v) + '"/><text x="' + (X0 - 6) + '" y="' + (sy(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    [0, 1000, 2000, 3000, 4000, 5000].forEach(d => { h += '<text x="' + sx(d) + '" y="' + (Y1 + 16) + '" text-anchor="middle">' + (d / 1000) + ' km</text>'; });
    h += '<text x="' + X0 + '" y="' + (Y1 + 34) + '">dystans okrążenia</text><text x="6" y="' + (Y0 - 4) + '">km/h</text>';
    h += series(REF, 's2') + series(lap, 's1');
    const x = sx(cur).toFixed(1), k = idx(cur), v1 = BB.laps[lap].v[k], v2 = BB.laps[REF].v[k];
    h += '<line class="x" id="bb-x" x1="' + x + '" x2="' + x + '" y1="' + Y0 + '" y2="' + Y1 + '"/>';
    if (v2 != null) h += '<circle cx="' + x + '" cy="' + sy(v2).toFixed(1) + '" r="4.5" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/>';
    if (v1 != null) h += '<circle cx="' + x + '" cy="' + sy(v1).toFixed(1) + '" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>';
    chart.innerHTML = h;
  }
  function cornerAt(d){ const c = BB.corners.find(c => d >= c.entry && d <= c.exit); return c ? c.name : 'prosta'; }
  function readout(){
    const k = idx(cur), a = BB.laps[lap], r = BB.laps[REF];
    const one = (L, n) => L.v[k] == null ? 'okr. ' + n + ': brak próbki' : 'okr. ' + n + ': ' + L.v[k] + ' km/h, gaz ' + L.t[k] + '%, hamulec ' + L.b[k] + '%';
    $('#bb-read').textContent = fmtM(cur) + ' (' + cornerAt(cur) + ')  ·  ' + one(a, lap) + '  ·  ' + one(r, REF);
  }
  const KIND = { corner: 'po zakręcie', lap: 'po okrążeniu', guide: 'prowadzenie', info: 'informacja' };
  function drawRadio(){
    const ev = BB.ev[lap] || [];
    $('#bb-count').textContent = ev.length + ' komunikatów';
    $('#bb-radio').innerHTML = ev.map((e, i) => '<li><button type="button" data-i="' + i + '"' + (Math.abs(e.d - cur) < 10 ? ' aria-current="true"' : '') + '><span class="d">' + fmtM(e.d) + '</span><span class="k">' + KIND[e.k] + '</span><span>' + esc(e.t) + '</span></button></li>').join('') || '<li class="demo-note">Na tym okrążeniu mechanik milczał.</li>';
  }
  function drawTable(){
    $('#bb-th-sel').textContent = 'Okr. ' + lap + ' (km/h)';
    $('#bb-table').innerHTML = BB.corners.map(c => {
      const k = idx(c.apex), a = BB.laps[lap].v[k], r = BB.laps[REF].v[k], d = (a != null && r != null) ? a - r : null;
      return '<tr><td>' + esc(c.name) + '</td><td class="mono">' + Math.round(c.apex) + '</td><td class="mono">' + (a == null ? '—' : a) + '</td><td class="mono">' + (r == null ? '—' : r) + '</td><td class="mono">' + (d == null ? '—' : (d > 0 ? '+' : '') + d) + '</td></tr>';
    }).join('');
  }
  function setPos(d, fromSlider){
    cur = Math.max(0, Math.min(BB.len - 18, Math.round(d / BB.step) * BB.step));
    if (!fromSlider) pos.value = cur;
    drawChart(); readout();
    const m = pt(idx(cur)), dot = $('#bb-dot'); if (dot) { dot.setAttribute('cx', m[0].toFixed(1)); dot.setAttribute('cy', m[1].toFixed(1)); }
    $$('#bb-radio button').forEach(b => { const e = BB.ev[lap][+b.dataset.i]; if (Math.abs(e.d - cur) < 10) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function setLap(n){
    lap = n;
    $$('#bb-laps button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lap === n)));
    $('#bb-leg-sel').textContent = 'okrążenie ' + n;
    drawRadio(); drawTable();
    const first = (BB.ev[n] || []).find(e => e.k === 'corner');
    setPos(first ? first.d : cur);
  }
  $('#bb-laps').innerHTML = BB.pick.map(n => '<button type="button" data-lap="' + n + '" aria-pressed="false">Okrążenie ' + n + '</button>').join('');
  $('#bb-laps').addEventListener('click', (e) => { const b = e.target.closest('[data-lap]'); if (b) setLap(+b.dataset.lap); });
  pos.addEventListener('input', () => setPos(+pos.value, true));
  $('#bb-radio').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) setPos(BB.ev[lap][+b.dataset.i].d); });
  function fromPointer(e){
    const r = chart.getBoundingClientRect(); if (!r.width) return;
    const vx = (e.clientX - r.left) / r.width * 720;
    setPos((vx - X0) / (X1 - X0) * BB.len);
  }
  chart.addEventListener('pointermove', fromPointer);
  chart.addEventListener('pointerdown', fromPointer);
  $$('[data-clip]').forEach(b => b.addEventListener('click', () => {
    $$('#demo-bb audio').forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    const a = $('#bb-a-' + b.dataset.clip); if (a) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
  }));
  drawMap(); setLap(4);
  window.__bb = { BB: BB, setLap: setLap, setPos: setPos };
})();
})();
