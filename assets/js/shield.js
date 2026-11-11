(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= SHIELD ADV: BlockList.parse i BlockList.lookup ================= */
(function(){
  const form = $('#sh-form'); if (!form) return;
  const CAT = {
    ads: ['Reklama', 'NISKIE RYZYKO', 'sieć reklamowa – wyświetla natarczywe reklamy w aplikacjach.'],
    tracking: ['Śledzenie', 'ŚREDNIE RYZYKO', 'tracker – śledzi, co robisz w telefonie, i buduje Twój profil.'],
    scam: ['Niebezpieczna', 'WYSOKIE RYZYKO', 'natarczywe reklamy, które często prowadzą do oszustw i wyłudzeń.']
  };
  function parse(text){
    const map = new Map(); let category = 'ads';
    for (const raw of text.split('\n')) {
      let line = raw; const hash = line.indexOf('#');
      if (hash >= 0) line = line.substring(0, hash);
      line = line.trim();
      if (line === '') continue;
      if (line.startsWith('[') && line.endsWith(']')) { const key = line.substring(1, line.length - 1).trim().toLowerCase(); if (CAT[key]) category = key; continue; }
      const parts = line.split(/[ \t]/).filter(p => p !== '');
      const domain = (parts.length === 1 ? parts[0] : parts[1]).toLowerCase().replace(/\.+$/, '');
      if (domain !== '' && domain !== 'localhost' && domain.includes('.')) map.set(domain, category);
    }
    return map;
  }
  function lookup(map, host){
    let h = host.toLowerCase().replace(/\.+$/, ''); const steps = [];
    while (h !== '') {
      steps.push(h);
      if (map.has(h)) return { cat: map.get(h), hit: h, steps: steps };
      const dot = h.indexOf('.');
      if (dot < 0) return { cat: null, steps: steps };
      h = h.substring(dot + 1);
    }
    return { cat: null, steps: steps };
  }
  const LIST = parse(window.SHIELD_BLOCKLIST);
  $('#sh-size').textContent = 'Wbudowana lista: ' + LIST.size + ' domen. Wpis blokuje domenę i wszystkie jej subdomeny.';
  function check(host){
    host = host.trim(); const out = $('#sh-out');
    if (!host) { out.className = 'verdict'; out.textContent = 'Wpisz nazwę domeny.'; return; }
    const r = lookup(LIST, host), chain = r.steps.map(s => esc(s) + (r.hit === s ? ' ✓ na liście' : ' — brak')).join(' → ');
    if (r.cat) {
      const c = CAT[r.cat];
      out.className = 'verdict block';
      out.innerHTML = '<b>Zablokowana: ' + c[0] + ', ' + c[1].toLowerCase() + '</b><span>Aplikacja odpowiada „nie istnieje” (NXDOMAIN). Opis dla użytkownika: ' + esc(c[2]) + '</span><span class="chain">' + chain + '</span>';
    } else {
      out.className = 'verdict pass';
      out.innerHTML = '<b>Przepuszczona przez wbudowaną listę</b><span>W aplikacji zapytanie przechodzi jeszcze przez listę CERT Polska i filtr AdGuard, a potem trafia do serwera DNS operatora.</span><span class="chain">' + chain + '</span>';
    }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); check($('#sh-in').value); });
  $$('[data-dom]').forEach(b => b.addEventListener('click', () => { $('#sh-in').value = b.dataset.dom; check(b.dataset.dom); }));
  check($('#sh-in').value);
  window.__sh = { lookup: (h) => lookup(LIST, h), size: LIST.size };
})();
})();
