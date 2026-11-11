(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= TCA: port mapping.py ================= */
function Calibration(min, max, invert){ this.min = min; this.max = max; this.invert = !!invert; }
Calibration.prototype.normalize = function(raw){
  const span = this.max - this.min;
  if (span <= 0) return 0.0;
  let value = (raw - this.min) / span;
  value = Math.min(1.0, Math.max(0.0, value));
  return this.invert ? 1.0 - value : value;
};
function NotchedAxis(positions, increase_key, decrease_key, calibration, hysteresis, current_notch){
  this.positions = positions; this.increase_key = increase_key; this.decrease_key = decrease_key;
  this.calibration = calibration; this.hysteresis = hysteresis;
  this.current_notch = Math.max(0, Math.min(positions - 1, current_notch || 0));
}
NotchedAxis.prototype.resync = function(notch){ this.current_notch = Math.max(0, Math.min(this.positions - 1, notch || 0)); };
NotchedAxis.prototype.update = function(raw){
  if (this.positions < 2) return [];
  const value = this.calibration.normalize(raw), notch_width = 1.0 / (this.positions - 1), taps = [];
  while (true) {
    const up_threshold = (this.current_notch + 0.5 + this.hysteresis) * notch_width;
    const down_threshold = (this.current_notch - 0.5 - this.hysteresis) * notch_width;
    if (value > up_threshold && this.current_notch < this.positions - 1) { this.current_notch += 1; taps.push(this.increase_key); }
    else if (value < down_threshold && this.current_notch > 0) { this.current_notch -= 1; taps.push(this.decrease_key); }
    else break;
  }
  return taps;
};
function ZonesAxis(zones, calibration, margin){ this.zones = zones; this.calibration = calibration; this.margin = margin; this._active = null; }
ZonesAxis.prototype.update = function(raw){
  const value = this.calibration.normalize(raw);
  if (this._active !== null) {
    if ((this._active.start - this.margin) <= value && value <= (this._active.end + this.margin)) return this._active.key;
  }
  for (const zone of this.zones) { if (zone.start <= value && value <= zone.end) { this._active = zone; return zone.key; } }
  this._active = null; return null;
};
const KEYNAME = { num_add: 'Num +', num_subtract: 'Num −', num9: 'Num 9', num3: 'Num 3' };
const mkZones = () => new ZonesAxis([{ start: 0.0, end: 0.35, key: 'num9' }, { start: 0.35, end: 0.65, key: null }, { start: 0.65, end: 1.0, key: 'num3' }], new Calibration(0, 1), 0.02);

(function(){
  const l1 = $('#tca-l1'); if (!l1) return;
  const l2 = $('#tca-l2'), prof = $('#tca-profile'), keys = $('#tca-keys'), ladder = $('#tca-ladder');
  let axis, shadow, zones = mkZones(), count = 0, jit = null, cH = 0, c0 = 0;
  function build(){
    const parts = prof.value.split('|'), n = parseInt(parts[0], 10), h = parseFloat(parts[1]);
    axis = new NotchedAxis(n, 'num_add', 'num_subtract', new Calibration(0, 1), h, 0);
    count = 0; keys.innerHTML = ''; l1.value = 0;
    ladder.innerHTML = new Array(n).fill('<i></i>').join('');
    stopJitter(); render();
  }
  function emit(taps){
    taps.forEach(k => { const s = document.createElement('span'); s.className = 'key'; s.textContent = KEYNAME[k]; keys.appendChild(s); });
    while (keys.children.length > 60) keys.removeChild(keys.firstChild);
    keys.scrollTop = keys.scrollHeight; count += taps.length;
  }
  function render(){
    $('#tca-val').textContent = pl(parseFloat(l1.value), 3);
    $('#tca-notch').textContent = axis.current_notch + ' / ' + (axis.positions - 1);
    $('#tca-count').textContent = String(count);
    Array.from(ladder.children).forEach((el, i) => { el.className = i === axis.current_notch ? 'cur' : (i < axis.current_notch ? 'on' : ''); });
  }
  function feed(v){ emit(axis.update(v)); render(); }
  function stopJitter(){
    if (jit) { clearInterval(jit); jit = null; }
    $('#tca-jitter').setAttribute('aria-pressed', 'false');
    $('#tca-jitter').textContent = 'Symuluj drgania dźwigni na granicy pozycji';
  }
  function startJitter(){
    const w = 1 / (axis.positions - 1);
    const n = Math.min(axis.current_notch, axis.positions - 2);
    axis.resync(n);
    const centre = (n + 0.5) * w;
    shadow = new NotchedAxis(axis.positions, 'num_add', 'num_subtract', new Calibration(0, 1), 0, n);
    cH = 0; c0 = 0; $('#tca-cmp').hidden = false;
    $('#tca-jitter').setAttribute('aria-pressed', 'true');
    $('#tca-jitter').textContent = 'Zatrzymaj drgania';
    jit = setInterval(() => {
      const v = Math.min(1, Math.max(0, centre + (Math.random() * 2 - 1) * 0.15 * w));
      l1.value = v;
      const t = axis.update(v); cH += t.length; emit(t);
      c0 += shadow.update(v).length;
      $('#tca-c-h').textContent = String(cH); $('#tca-c-0').textContent = String(c0);
      render();
    }, 60);
  }
  l1.addEventListener('input', () => { if (jit) stopJitter(); feed(parseFloat(l1.value)); });
  prof.addEventListener('change', build);
  $('#tca-jitter').addEventListener('click', () => { if (jit) stopJitter(); else startJitter(); });
  function renderZ(){
    const v = parseFloat(l2.value), key = zones.update(v);
    $('#tca-val2').textContent = pl(v, 3);
    $('#tca-held').textContent = key ? KEYNAME[key] + ' (trzymany)' : 'brak';
    const spans = $$('#tca-zones span');
    spans[0].className = key === 'num9' ? 'on' : ''; spans[1].className = ''; spans[2].className = key === 'num3' ? 'on' : '';
    $('#tca-zmark').style.left = (v * 100) + '%';
  }
  l2.addEventListener('input', renderZ);

  /* przypadki z tests/test_mapping.py */
  const names = (t) => t.length ? t.map(k => KEYNAME[k]).join(', ') : 'brak naciśnięć';
  const mk5 = () => new NotchedAxis(5, 'num_add', 'num_subtract', new Calibration(0, 1), 0.15, 0);
  const TESTS = {
    sweep: () => { const ax = mk5(); const t = ax.update(1.0);
      return [['update(1.0)', '4 × Num +, pozycja 4', names(t) + ', pozycja ' + ax.current_notch, t.length === 4 && t.every(k => k === 'num_add') && ax.current_notch === 4]]; },
    jitter: () => { const ax = mk5(); ax.update(0.25); const a = ax.current_notch; const t2 = ax.update(0.38); const b = ax.current_notch; const t3 = ax.update(0.45);
      return [
        ['update(0.25)', 'pozycja 1', 'pozycja ' + a, a === 1],
        ['update(0.38), tuż za granicą 0,375', 'brak naciśnięć, pozycja 1', names(t2) + ', pozycja ' + b, t2.length === 0 && b === 1],
        ['update(0.45), wyraźnie dalej', '1 naciśnięcie, pozycja 2', names(t3) + ', pozycja ' + ax.current_notch, t3.length === 1 && ax.current_notch === 2]
      ]; },
    resync: () => { const ax = mk5(); ax.update(1.0); ax.resync(0); const a = ax.current_notch; const t = ax.update(1.0);
      return [
        ['update(1.0), potem resync(0)', 'pozycja 0', 'pozycja ' + a, a === 0],
        ['update(1.0)', '4 naciśnięcia', t.length + ' naciśnięcia', t.length === 4]
      ]; },
    edge: () => { const ax = mkZones(); const k1 = ax.update(0.3), k2 = ax.update(0.36), k3 = ax.update(0.5); const kn = (k) => k ? KEYNAME[k] : 'brak klawisza';
      return [
        ['update(0.3)', 'Num 9', kn(k1), k1 === 'num9'],
        ['update(0.36), za krawędzią, w marginesie', 'Num 9', kn(k2), k2 === 'num9'],
        ['update(0.5)', 'brak klawisza', kn(k3), k3 === null]
      ]; }
  };
  $$('[data-tcatest]').forEach(b => b.addEventListener('click', () => {
    const rows = TESTS[b.dataset.tcatest]();
    $('#tca-testout').hidden = false;
    $('#tca-testbody').innerHTML = rows.map((r, i) => '<tr' + (r[3] ? '' : ' class="failrow"') + '><td class="mono">' + (i + 1) + '</td><td class="mono">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td><span class="badge ' + (r[3] ? 'pass">PASS' : 'fail">FAIL') + '</span></td></tr>').join('');
  }));
  build(); renderZ();
  window.__tca = { TESTS: TESTS };
})();
})();
