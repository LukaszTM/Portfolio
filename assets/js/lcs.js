(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= DYŻURNY RUCHU: port interlocking.gd ================= */
const LCS_DATA = {
  points: { itZ:[84,130], pA:[196,130], W1:[296,130], T1s:[386,130], T2s:[386,215], T1e:[594,130], T2e:[594,215], W2:[684,130], pB:[784,130], itW:[896,130] },
  segments: [
    {id:'sz1',from:'itZ',to:'pA'}, {id:'wA',from:'pA',to:'W1'}, {id:'c1',from:'W1',to:'T1s'}, {id:'c2',from:'W1',to:'T2s'},
    {id:'trk1',from:'T1s',to:'T1e'}, {id:'trk2',from:'T2s',to:'T2e'}, {id:'d1',from:'T1e',to:'W2'}, {id:'d2',from:'T2e',to:'W2'},
    {id:'wB',from:'W2',to:'pB'}, {id:'sz2',from:'pB',to:'itW'}
  ],
  switches: [ {id:'1',point:'W1',root:'wA',plus:'c1',minus:'c2'}, {id:'2',point:'W2',root:'wB',plus:'d1',minus:'d2'} ],
  signals: [
    {id:'A',point:'pA',dir:1,typ:'wjazdowy'}, {id:'N1',point:'T1e',dir:1,typ:'wyjazdowy'}, {id:'N2',point:'T2e',dir:1,typ:'wyjazdowy'},
    {id:'B',point:'pB',dir:-1,typ:'wjazdowy'}, {id:'K1',point:'T1s',dir:-1,typ:'wyjazdowy'}, {id:'K2',point:'T2s',dir:-1,typ:'wyjazdowy'}
  ],
  line_ends: [ {id:'itZ',name:'Zachód',dir_in:1,kind:'pociagowy'}, {id:'itW',name:'Wschód',dir_in:-1,kind:'pociagowy'} ]
};
/* StationLayout (station_layout.gd) */
function Layout(d){
  this.points = d.points; this.segments = {}; this.adj_e = {}; this.adj_w = {};
  this.switches = {}; this.switch_at_point = {}; this.signals = {}; this.line_ends = {};
  d.segments.forEach(s => {
    this.segments[s.id] = s;
    (this.adj_e[s.from] = this.adj_e[s.from] || []).push({ seg: s.id, to: s.to });
    (this.adj_w[s.to] = this.adj_w[s.to] || []).push({ seg: s.id, to: s.from });
  });
  d.switches.forEach(w => { this.switches[w.id] = w; this.switch_at_point[w.point] = w.id; });
  d.signals.forEach(s => { this.signals[s.id] = s; });
  d.line_ends.forEach(l => { this.line_ends[l.id] = l; });
}
Layout.prototype.transition_error = function(pt, in_seg, out_seg){
  if (in_seg === '') return '';
  const wid = this.switch_at_point[pt] || '';
  if (wid === '') return '';
  const w = this.switches[wid], pair = [in_seg, out_seg];
  if (pair.includes(w.root) && (pair.includes(w.plus) || pair.includes(w.minus))) return '';
  return 'rozjazd nr ' + wid + ' nie łączy tych torów';
};
Layout.prototype.required_position = function(wid, in_seg, out_seg){
  const w = this.switches[wid];
  return (w.plus === in_seg || w.plus === out_seg) ? '+' : '-';
};
/* Interlocking (interlocking.gd) */
const ASPECT_STOP = 0, ASPECT_JAZDA = 1;
const ST_NASTAWIANIE = 'NASTAWIANIE', ST_UTWIERDZONY = 'UTWIERDZONY';
const SW_MOVE_TIME = 3.0;
function Interlocking(layout){
  this.layout = layout; this.sim_time = 0;
  this.sw_pos = {}; this.sw_moving = {}; this.sw_locked = {};
  this.sig_state = {}; this.locked_segs = {}; this.locked_pts = {}; this.occupied_segs = {};
  this.routes = {}; this._next_id = 1; this.onLocked = null;
  Object.keys(layout.switches).forEach(w => { this.sw_pos[w] = '+'; });
  Object.keys(layout.signals).forEach(s => { this.sig_state[s] = { aspect: ASPECT_STOP }; });
}
Interlocking.prototype.aspect = function(sig){ return this.sig_state[sig] ? this.sig_state[sig].aspect : ASPECT_STOP; };
Interlocking.prototype.route_of_signal = function(sig){
  for (const id in this.routes) if (this.routes[id].signal_id === sig) return this.routes[id];
  return null;
};
Interlocking.prototype.find_path = function(start_pt, dest_pt, dir, ignore_blocks){
  const L = this.layout, adj = dir > 0 ? L.adj_e : L.adj_w;
  const prev = {}, visited = {}; visited[start_pt + '|'] = true;
  const queue = [{ pt: start_pt, in: '' }];
  let found_key = '';
  while (queue.length) {
    const cur = queue.shift(), pt = cur.pt, in_seg = cur.in;
    if (pt === dest_pt && in_seg !== '') { found_key = pt + '|' + in_seg; break; }
    for (const edge of (adj[pt] || [])) {
      const seg = edge.seg, np = edge.to;
      if (L.transition_error(pt, in_seg, seg) !== '') continue;
      if (!ignore_blocks) {
        if (seg in this.locked_segs || seg in this.occupied_segs) continue;
        const wid = L.switch_at_point[pt] || '';
        if (wid !== '' && wid in this.sw_locked) continue;
        const wid2 = L.switch_at_point[np] || '';
        if (wid2 !== '' && wid2 in this.sw_locked) continue;
        if (np in this.locked_pts) continue;
      }
      const key = np + '|' + seg;
      if (visited[key]) continue;
      visited[key] = true;
      prev[key] = { pt: pt, in: in_seg, seg: seg };
      queue.push({ pt: np, in: seg });
    }
  }
  if (found_key === '') return { error: 'brak drogi przebiegu' };
  const pts = [dest_pt], segs = [];
  let key2 = found_key;
  while (prev[key2]) { const e = prev[key2]; segs.unshift(e.seg); pts.unshift(e.pt); key2 = e.pt + '|' + e.in; }
  const sw_need = {};
  for (let i = 0; i < pts.length; i++) {
    const wid3 = L.switch_at_point[pts[i]] || '';
    if (wid3 === '') continue;
    const in_s = i > 0 ? segs[i - 1] : '', out_s = i < segs.length ? segs[i] : '';
    if (in_s === '' || out_s === '') continue;
    sw_need[wid3] = L.required_position(wid3, in_s, out_s);
  }
  return { pts: pts, segs: segs, sw: sw_need };
};
Interlocking.prototype.set_route = function(sig_id, dest_id, dest_kind, kind){
  const L = this.layout;
  if (!L.signals[sig_id]) return { error: 'Nieznany sygnalizator ' + sig_id + '.' };
  const sg = L.signals[sig_id];
  if (this.route_of_signal(sig_id)) return { error: 'Spod sygnalizatora ' + sig_id + ' jest już nastawiony przebieg.' };
  const start_pt = sg.point; let dest_pt = dest_id;
  if (dest_kind === 'signal') {
    if (!L.signals[dest_id]) return { error: 'Nieznany sygnalizator końcowy.' };
    const dsg = L.signals[dest_id];
    if (dsg.dir !== sg.dir) return { error: 'Sygnalizator ' + dest_id + ' jest zwrócony w przeciwną stronę — nie może kończyć tego przebiegu.' };
    dest_pt = dsg.point;
  } else if (dest_kind === 'line_end') {
    if (!L.line_ends[dest_id]) return { error: 'Nieznany przycisk szlaku.' };
    const le = L.line_ends[dest_id];
    if (le.dir_in === sg.dir) return { error: 'Szlak ' + dest_id + ' leży po stronie wjazdu — nie może kończyć tego przebiegu.' };
  } else return { error: 'Nieprawidłowy koniec drogi przebiegu.' };
  if (dest_pt === start_pt) return { error: 'Koniec przebiegu pokrywa się z jego początkiem.' };
  if (start_pt in this.locked_pts) return { error: 'Początek drogi przebiegu jest zajęty innym przebiegiem.' };
  const path = this.find_path(start_pt, dest_pt, sg.dir, false);
  if (path.error) {
    const alt = this.find_path(start_pt, dest_pt, sg.dir, true);
    if (alt.error) return { error: 'Brak drogi przebiegu ' + sig_id + ' → ' + dest_id + ' (układ torowy nie pozwala na taką jazdę).' };
    return { error: 'Droga przebiegu ' + sig_id + ' → ' + dest_id + ' niewolna: zajętość toru, przebieg wrogi, zamknięcie toru lub usterka rozjazdu.' };
  }
  const rid = this._next_id++;
  const route = { id: rid, signal_id: sig_id, dest_id: dest_id, dest_kind: dest_kind, start_pt: start_pt, dest_pt: dest_pt,
    dir: sg.dir, kind: kind, pts: path.pts, segs: path.segs, sw: path.sw, state: ST_NASTAWIANIE,
    ready_at: this.sim_time + SW_MOVE_TIME, passed: false };
  route.segs.forEach(s => { this.locked_segs[s] = rid; });
  route.pts.forEach(p => { this.locked_pts[p] = rid; });
  for (const wid in route.sw) {
    this.sw_locked[wid] = rid;
    if (this.sw_pos[wid] !== route.sw[wid]) {
      this.sw_moving[wid] = this.sim_time + SW_MOVE_TIME;
      route.ready_at = Math.max(route.ready_at, this.sim_time + SW_MOVE_TIME);
    }
  }
  this.routes[rid] = route;
  return route;
};
Interlocking.prototype.step = function(p_time){
  this.sim_time = p_time; let changed = false;
  for (const wid of Object.keys(this.sw_moving)) {
    if (this.sim_time >= this.sw_moving[wid]) {
      delete this.sw_moving[wid]; changed = true;
      const r = this.routes[this.sw_locked[wid]];
      if (r && r.sw[wid]) this.sw_pos[wid] = r.sw[wid];
    }
  }
  for (const id in this.routes) {
    const r = this.routes[id];
    if (r.state === ST_NASTAWIANIE && this.sim_time >= r.ready_at) {
      r.state = ST_UTWIERDZONY;
      this.sig_state[r.signal_id].aspect = ASPECT_JAZDA;
      changed = true;
      if (this.onLocked) this.onLocked(r);
    }
  }
  return changed;
};
Interlocking.prototype.finish_route = function(route){
  const rid = route.id;
  route.segs.forEach(s => { if (this.locked_segs[s] === rid) delete this.locked_segs[s]; });
  route.pts.forEach(p => { if (this.locked_pts[p] === rid) delete this.locked_pts[p]; });
  for (const wid in route.sw) if (this.sw_locked[wid] === rid) delete this.sw_locked[wid];
  if (!route.passed) this.sig_state[route.signal_id].aspect = ASPECT_STOP;
  delete this.routes[rid];
};
Interlocking.prototype.cmd_release = function(sig_id, kind){
  const r = this.route_of_signal(sig_id);
  if (!r) return 'Spod sygnalizatora ' + sig_id + ' nie ma nastawionego przebiegu.';
  if (r.kind !== kind) return 'Przebieg spod ' + sig_id + ' jest pociągowy — użyj polecenia ZD.';
  this.finish_route(r);
  return '';
};
Interlocking.prototype.cmd_switch = function(wid){
  if (!this.layout.switches[wid]) return 'Nieznany rozjazd.';
  if (wid in this.sw_locked) return 'Rozjazd nr ' + wid + ' jest zamknięty w przebiegu.';
  if (wid in this.sw_moving) return 'Rozjazd nr ' + wid + ' jest w trakcie przestawiania.';
  const target = this.sw_pos[wid] === '+' ? '-' : '+';
  this.sw_moving[wid] = this.sim_time + SW_MOVE_TIME;
  this.sw_pos[wid] = target;
  return '';
};

/* pulpit (odpowiednik sim_core.gd: click_element, _click_route, _try_route) */
(function(){
  const svg = $('#lcs-svg'); if (!svg) return;
  const layout = new Layout(LCS_DATA);
  let inter, cmd = 'PP', pending = '', log = [], t0 = performance.now(), busy = false;
  const startClock = new Date();
  const CMD_HELP = {
    PP: 'Nastawianie przebiegu pociągowego: przycisk początku (semafor), potem przycisk końca (semafor lub szlak).',
    ZD: 'Zwolnienie drogi przebiegu pociągowego — wskaż sygnalizator początku przebiegu.',
    ZW: 'Indywidualne przestawienie rozjazdu — wskaż rozjazd (+ / −).'
  };
  const simTime = () => (performance.now() - t0) / 1000;
  function clockText(){
    const d = new Date(startClock.getTime() + simTime() * 1000), p = (x) => String(x).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function show(text, level){
    const m = $('#lcs-msg'); m.textContent = text;
    m.className = 'lcs-msg' + (level === 2 ? ' err' : level === 3 ? ' ok' : '');
  }
  function edr(rodzaj, text){ log.unshift({ t: clockText(), r: rodzaj, x: text }); if (log.length > 7) log.pop(); renderLog(); }
  function renderLog(){
    $('#lcs-log').innerHTML = log.length ? log.map(e => '<tr><td>' + e.t + '</td><td>' + esc(e.r) + '</td><td>' + esc(e.x) + '</td></tr>').join('')
      : '<tr><td>' + clockText() + '</td><td>Służba</td><td>Objęcie dyżuru na posterunku demonstracyjnym.</td></tr>';
  }
  function swText(sw){ const k = Object.keys(sw); return k.length ? k.map(w => w + sw[w]).sort().join(', ') : 'brak'; }
  function reset(){
    inter = new Interlocking(layout); pending = ''; log = []; t0 = performance.now();
    inter.onLocked = (r) => {
      show('Przebieg ' + r.signal_id + ' → ' + r.dest_id + ' utwierdzony. Semafor ' + r.signal_id + ' podaje sygnał zezwalający (S2).', 3);
      edr('Przebieg', 'Utwierdzono przebieg ' + r.signal_id + ' → ' + r.dest_id + ', sygnał zezwalający na ' + r.signal_id + '.');
    };
    setCmd('PP'); renderLog(); draw();
  }
  function setCmd(c){
    cmd = c; pending = '';
    $$('.lcs-bar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cmd === c)));
    show(CMD_HELP[c], 0); draw();
  }
  function click(kind, id){
    if (cmd === 'PP') {
      if (pending === '') {
        if (kind !== 'signal') { show('Wskaż przycisk POCZĄTKU drogi przebiegu (sygnalizator).', 1); return; }
        pending = id; show('Początek drogi przebiegu: ' + id + '. Wskaż przycisk KOŃCA (sygnalizator albo szlak).', 0); draw(); return;
      }
      if (kind === 'signal' && id === pending) { pending = ''; show('Anulowano wybór początku drogi przebiegu.', 0); draw(); return; }
      if (kind !== 'signal' && kind !== 'line_end') { show('Końcem drogi przebiegu może być sygnalizator albo przycisk szlaku.', 1); return; }
      const start = pending; pending = '';
      tryRoute(start, id, kind);
    } else if (cmd === 'ZD') {
      if (kind !== 'signal') { show('Polecenie ZD wykonuje się na sygnalizatorze początku przebiegu.', 1); return; }
      const err = inter.cmd_release(id, 'P');
      if (err !== '') show('✗ ' + err, 2);
      else { edr('Przebieg', 'Zwolniono drogę przebiegu spod sygnalizatora ' + id + ' (ZD).'); show('✓ Zwolniono drogę przebiegu spod ' + id + '.', 3); }
    } else if (cmd === 'ZW') {
      if (kind !== 'switch') { show('Polecenie ZW wykonuje się na rozjeździe.', 1); return; }
      const err2 = inter.cmd_switch(id);
      if (err2 !== '') show('✗ ' + err2, 2);
      else { edr('Przebieg', 'Indywidualne przestawienie rozjazdu nr ' + id + ' w położenie ' + inter.sw_pos[id] + '.'); show('Rozjazd nr ' + id + ' — przestawianie w położenie ' + inter.sw_pos[id] + '.', 0); }
    }
    draw();
  }
  function tryRoute(sig, dest, destKind){
    inter.sim_time = simTime();
    const res = inter.set_route(sig, dest, destKind, 'P');
    if (res.error) { show('✗ ' + res.error, 2); edr('Odmowa', res.error); draw(); return false; }
    edr('Przebieg', 'Nastawiono przebieg pociągowy: ' + sig + ' → ' + dest + ' (rozjazdy: ' + swText(res.sw) + ').');
    show('Przebieg pociągowy ' + sig + ' → ' + dest + ': nastawianie rozjazdów…', 0);
    draw(); return true;
  }

  /* rysunek */
  const P = LCS_DATA.points;
  function sigGeom(s){
    const p = P[s.point], above = s.dir > 0, y = p[1] + (above ? -20 : 20), x = p[0] + (s.dir > 0 ? -16 : 16);
    return { x: x, y: y, ly: above ? y - 16 : y + 26, dir: s.dir, mastY1: p[1], mastX: p[0] + (s.dir > 0 ? -2 : 2) };
  }
  function draw(){
    if (!inter) return;
    let h = '';
    h += '<rect x="0" y="0" width="980" height="280" fill="var(--lcs-bg)"/>';
    h += '<text x="490" y="34" text-anchor="middle" font-size="19" fill="var(--lcs-yellow)" style="font-family:var(--f-display);font-weight:600;letter-spacing:.04em">POSTERUNEK DEMONSTRACYJNY</text>';
    h += '<text x="490" y="54" text-anchor="middle" font-size="11" fill="var(--lcs-dim)">układ uproszczony na potrzeby portfolio</text>';
    h += '<rect x="420" y="160" width="140" height="13" fill="none" stroke="var(--lcs-text)" stroke-width="1"/><text x="490" y="170.5" text-anchor="middle" font-size="9.5" fill="var(--lcs-text)">Peron 1</text>';
    h += '<text x="490" y="120" text-anchor="middle" font-size="11" fill="var(--lcs-dim)">tor 1</text><text x="490" y="238" text-anchor="middle" font-size="11" fill="var(--lcs-dim)">tor 2</text>';
    LCS_DATA.segments.forEach(s => {
      const a = P[s.from], b = P[s.to], rid = inter.locked_segs[s.id], r = rid ? inter.routes[rid] : null;
      let col = 'var(--lcs-track)', dash = '';
      if (r) { col = 'var(--lcs-green)'; if (r.state === ST_NASTAWIANIE) dash = ' stroke-dasharray="9 6"'; }
      h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + col + '" stroke-width="' + (r ? 4.5 : 3.5) + '" stroke-linecap="round"' + dash + '/>';
    });
    /* przerwy izolacyjne na końcach torów */
    ['T1s','T1e','T2s','T2e','pA','pB'].forEach(k => { h += '<line x1="' + P[k][0] + '" y1="' + (P[k][1] - 6) + '" x2="' + P[k][0] + '" y2="' + (P[k][1] + 6) + '" stroke="var(--lcs-bg)" stroke-width="3"/>'; });
    LCS_DATA.switches.forEach(w => {
      const p = P[w.point], pos = inter.sw_pos[w.id], moving = w.id in inter.sw_moving, locked = w.id in inter.sw_locked;
      const legSeg = layout.segments[pos === '+' ? w.plus : w.minus];
      const other = P[legSeg.from === w.point ? legSeg.to : legSeg.from];
      const dx = other[0] - p[0], dy = other[1] - p[1], len = Math.hypot(dx, dy), k = 26 / len;
      h += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + (p[0] + dx * k) + '" y2="' + (p[1] + dy * k) + '" stroke="var(--lcs-teal)" stroke-width="5.5" stroke-linecap="round"' + (moving ? ' class="blink"' : '') + '/>';
      const lx = p[0] + (w.id === '1' ? -4 : 4), anchor = w.id === '1' ? 'end' : 'start';
      h += '<g tabindex="0" role="button" data-kind="switch" data-id="' + w.id + '" aria-label="Rozjazd nr ' + w.id + ', położenie ' + (pos === '+' ? 'plus' : 'minus') + (locked ? ', zamknięty w przebiegu' : '') + '">';
      h += '<rect x="' + (p[0] - 24) + '" y="' + (p[1] - 46) + '" width="48" height="44" fill="var(--lcs-bg)" fill-opacity="0"/>';
      h += '<text x="' + lx + '" y="' + (p[1] - 12) + '" text-anchor="' + anchor + '" font-size="13" fill="var(--lcs-teal)"' + (moving ? ' class="blink"' : '') + '>' + w.id + ' ' + (moving ? '…' : (pos === '+' ? '+' : '−')) + '</text>';
      h += '</g>';
    });
    LCS_DATA.signals.forEach(s => {
      const g = sigGeom(s), asp = inter.aspect(s.id), r = inter.route_of_signal(s.id);
      const on = asp === ASPECT_JAZDA, col = on ? 'var(--lcs-green)' : 'var(--lcs-text)';
      const d = s.dir, x = g.x, y = g.y;
      const tri = (ox) => '<polygon points="' + (x + ox) + ',' + (y - 7) + ' ' + (x + ox + 11 * d) + ',' + y + ' ' + (x + ox) + ',' + (y + 7) + '" fill="' + (on ? col : 'var(--lcs-bg)') + '" stroke="' + col + '" stroke-width="1.6" stroke-linejoin="round"/>';
      h += '<g tabindex="0" role="button" data-kind="signal" data-id="' + s.id + '" aria-label="Sygnalizator ' + s.id + ' (' + s.typ + '), ' + (on ? 'sygnał zezwalający' : 'Stój') + (r ? ', przebieg ' + r.state.toLowerCase() : '') + '">';
      h += '<rect x="' + (x - 22 + (d > 0 ? 6 : -6)) + '" y="' + (Math.min(y, g.ly) - 14) + '" width="44" height="46" fill="var(--lcs-bg)" fill-opacity="0"/>';
      h += '<line x1="' + (x - 3 * d) + '" y1="' + (y - 8) + '" x2="' + (x - 3 * d) + '" y2="' + (y + 8) + '" stroke="' + col + '" stroke-width="1.6"/>';
      h += tri(0) + tri(9 * d);
      if (pending === s.id) h += '<circle cx="' + (x + 9 * d) + '" cy="' + y + '" r="17" fill="none" stroke="var(--lcs-teal)" stroke-width="1.6"/>';
      h += '<text x="' + (x + 8 * d) + '" y="' + g.ly + '" text-anchor="middle" font-size="13" fill="var(--lcs-yellow)">' + s.id + '</text>';
      h += '</g>';
    });
    LCS_DATA.line_ends.forEach(le => {
      const p = P[le.id], west = le.dir_in > 0, x = west ? p[0] - 62 : p[0] + 6;
      h += '<g tabindex="0" role="button" data-kind="line_end" data-id="' + le.id + '" aria-label="Przycisk szlaku ' + le.id + ', kierunek ' + le.name + '">';
      h += '<rect x="' + x + '" y="' + (p[1] - 14) + '" width="56" height="28" fill="var(--lcs-btn)" stroke="var(--lcs-dim)" stroke-width="1"/>';
      h += '<text x="' + (x + 28) + '" y="' + (p[1] + 4.5) + '" text-anchor="middle" font-size="12.5" fill="var(--lcs-text)">' + le.id + '</text>';
      h += '<text x="' + (x + 28) + '" y="' + (p[1] - 22) + '" text-anchor="middle" font-size="10.5" fill="var(--lcs-dim)">' + le.name + '</text>';
      h += '</g>';
    });
    const active = document.activeElement && svg.contains(document.activeElement) ? document.activeElement.dataset.kind + '|' + document.activeElement.dataset.id : '';
    svg.innerHTML = h;
    if (active) { const el = svg.querySelector('[data-kind="' + active.split('|')[0] + '"][data-id="' + active.split('|')[1] + '"]'); if (el) el.focus({ preventScroll: true }); }
  }
  svg.addEventListener('click', (e) => { const g = e.target.closest('[data-kind]'); if (g && !busy) click(g.dataset.kind, g.dataset.id); });
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest('[data-kind]'); if (!g || busy) return;
    e.preventDefault(); click(g.dataset.kind, g.dataset.id);
  });
  $$('.lcs-bar button').forEach(b => b.addEventListener('click', () => { if (!busy) setCmd(b.dataset.cmd); }));
  setInterval(() => {
    $('#lcs-clock').textContent = clockText();
    if (inter && inter.step(simTime())) draw();
  }, 200);

  /* gotowe scenariusze */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  function scenario(sig, dest, kind){ if (busy) return; setCmd('PP'); click('signal', sig); click(kind, dest); }
  $('#lcs-s1').addEventListener('click', () => scenario('A', 'N1', 'signal'));
  $('#lcs-s2').addEventListener('click', () => scenario('B', 'K1', 'signal'));
  $('#lcs-s3').addEventListener('click', () => scenario('B', 'K2', 'signal'));
  $('#lcs-reset').addEventListener('click', () => { if (!busy) reset(); });
  $('#lcs-auto').addEventListener('click', async () => {
    if (busy) return;
    reset(); busy = true;
    const btns = $$('#demo-lcs .btnrow .btn'); btns.forEach(b => { b.disabled = true; });
    try {
      await wait(500); click('signal', 'A'); await wait(900); click('signal', 'N1');
      await wait(3600);
      click('signal', 'B'); await wait(900); click('signal', 'K1');
      await wait(2600);
      click('signal', 'B'); await wait(900); click('signal', 'K2');
      await wait(3500);
    } finally { busy = false; btns.forEach(b => { b.disabled = false; }); }
  });
  reset();
  window.__lcs = { get inter(){ return inter; }, click: click, setCmd: setCmd, reset: reset };
})();
})();
