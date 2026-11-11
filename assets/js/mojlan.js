(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= MÓJ ŁAN: port Prog.oceny i Obowiazek.ocena (lib/rdzen/reguly/regula_prawna.dart) ================= */
(function(){
  const form = $('#ml-form'); if (!form) return;
  const D = window.MOJLAN_REGULY;

  /* ProfilGospodarstwa.wartosc: null znaczy „aplikacja nie wie” */
  function wartosc(profil, miara){
    switch (miara) {
      case 'powierzchnia_ur_ha': return profil.powierzchniaUrHa;
      case 'powierzchnia_upraw_intensywnych_ha': return profil.powierzchniaUprawIntensywnychHa;
      case 'djp': return profil.djp;
      case 'zadeklarowany_ekoschemat': return profil.zadeklarowanyEkoschemat ? 1 : 0;
      case 'posiadacz_zwierzat': return profil.posiadaczZwierzat === null ? null : (profil.posiadaczZwierzat ? 1 : 0);
      default: return null; /* miara z nowszego słownika, której ta wersja nie zna */
    }
  }
  const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, 'jest': (a, b) => a === b };
  /* Prog.oceny */
  function ocenaProgu(prog, profil){
    const zGospodarstwa = wartosc(profil, prog.miara), op = OPS[prog.operator];
    if (zGospodarstwa === null || zGospodarstwa === undefined || !op) return 'nieWiadomo';
    return op(zGospodarstwa, prog.wartosc) ? 'dotyczy' : 'nieDotyczy';
  }
  /* Obowiazek.ocena: obowiązek bez progów dotyczy każdego */
  function ocena(obowiazek, profil){
    const progi = obowiazek.progi || [];
    if (progi.length === 0) return 'dotyczy';
    const oceny = progi.map(p => ocenaProgu(p, profil));
    if ((obowiazek.polaczenie_progow || 'lub') === 'lub') {
      if (oceny.includes('dotyczy')) return 'dotyczy';
      return oceny.includes('nieWiadomo') ? 'nieWiadomo' : 'nieDotyczy';
    }
    if (oceny.includes('nieDotyczy')) return 'nieDotyczy';
    return oceny.includes('nieWiadomo') ? 'nieWiadomo' : 'dotyczy';
  }

  /* --- formularz --- */
  const num = (el) => { const v = parseFloat(String(el.value).replace(',', '.').replace(/\s/g, '')); return isFinite(v) && v >= 0 ? v : 0; };
  const herd = $('#ml-herd');
  herd.innerHTML = D.grupy.map(g => '<label for="ml-g-' + g.id + '">' + esc(g.nazwa) + ' <span>× ' + String(g.wspolczynnik).replace('.', ',') + '</span></label><input type="text" inputmode="numeric" id="ml-g-' + g.id + '" data-g="' + g.id + '" value="0" autocomplete="off">').join('');
  const zw = () => (form.querySelector('input[name="ml-zw"]:checked') || {}).value || 'brak';

  /* Tak jak ProfilZBazy.policz: rejestr stada daje liczbę, sama odpowiedź „mam zwierzęta” zostawia DJP nieznane */
  function profil(){
    const p = { powierzchniaUrHa: num($('#ml-ur')), powierzchniaUprawIntensywnychHa: num($('#ml-int')), zadeklarowanyEkoschemat: $('#ml-eko').checked, djp: null, posiadaczZwierzat: null, sztuk: 0 };
    const tryb = zw();
    if (tryb === 'nie') { p.djp = 0; p.posiadaczZwierzat = false; }
    else if (tryb === 'tak') { p.djp = null; p.posiadaczZwierzat = true; }
    else if (tryb === 'stado') {
      let suma = 0, sztuk = 0;
      D.grupy.forEach(g => { const n = Math.round(num(document.getElementById('ml-g-' + g.id))); sztuk += n; suma += n * g.wspolczynnik; });
      p.djp = suma; p.sztuk = sztuk; p.posiadaczZwierzat = sztuk > 0;
    }
    return p;
  }

  const MIARA = {
    powierzchnia_ur_ha: (v) => 'użytki rolne ' + (v === null ? '?' : pl(v, 2) + ' ha'),
    powierzchnia_upraw_intensywnych_ha: (v) => 'uprawy intensywne ' + (v === null ? '?' : pl(v, 2) + ' ha'),
    djp: (v) => 'DJP ' + (v === null ? 'nieznane' : pl(v, 2)),
    zadeklarowany_ekoschemat: (v) => 'ekoschemat ' + (v ? 'zadeklarowany' : 'niezadeklarowany'),
    posiadacz_zwierzat: (v) => 'zwierzęta: ' + (v === null ? 'brak odpowiedzi' : (v ? 'są' : 'nie ma'))
  };
  const WYNIK = { dotyczy: ['Dotyczy', 'yes', '●'], nieDotyczy: ['Nie dotyczy', 'no', '○'], nieWiadomo: ['Do sprawdzenia', 'unk', '?'] };
  const SLOWO = { dotyczy: 'tak', nieDotyczy: 'nie', nieWiadomo: 'nie wiadomo' };
  function progOpis(prog, p){
    const v = wartosc(p, prog.miara), nazwa = (MIARA[prog.miara] || (() => prog.miara))(v === undefined ? null : v);
    const warunek = prog.operator === 'jest' ? '' : ' ' + prog.operator + ' ' + String(prog.wartosc).replace('.', ',');
    return nazwa + warunek + ': ' + SLOWO[ocenaProgu(prog, p)];
  }

  function render(){
    const p = profil(), tryb = zw();
    herd.hidden = tryb !== 'stado';
    $('#ml-djp').textContent = tryb === 'stado'
      ? 'Stado: ' + p.sztuk + ' szt., razem ' + pl(p.djp, 2) + ' DJP. Współczynniki z tabeli 3 programu azotanowego.'
      : (tryb === 'nie' ? 'DJP = 0.' : 'DJP nieznane. Aplikacja nie wpisuje zera, tylko oznacza obowiązki zależne od DJP jako „do sprawdzenia”.');
    const licz = { dotyczy: 0, nieWiadomo: 0, nieDotyczy: 0 };
    $('#ml-out').innerHTML = D.obowiazki.map(o => {
      const w = ocena(o, p), W = WYNIK[w]; licz[w]++;
      const progi = (o.progi || []).length
        ? o.progi.map(x => esc(progOpis(x, p))).join(' <span class="ml-or">' + ((o.polaczenie_progow || 'lub') === 'lub' ? 'lub' : 'i') + '</span> ')
        : 'bez progów, dotyczy każdego';
      return '<li class="ml-ob ' + W[1] + '"><span class="ml-badge"><span aria-hidden="true">' + W[2] + '</span> ' + W[0] + '</span><div><b>' + esc(o.nazwa) + '</b><span class="chain">' + progi + '</span><span class="ml-meta">' + esc(o.kogo_dotyczy) + ' · dokumenty przechowuje się ' + o.przechowywanie_lat + ' ' + (o.przechowywanie_lat === 5 ? 'lat' : 'lata') + '</span></div></li>';
    }).join('');
    $('#ml-sum').textContent = 'Dotyczy: ' + licz.dotyczy + ' · do sprawdzenia: ' + licz.nieWiadomo + ' · nie dotyczy: ' + licz.nieDotyczy + ' (z ' + D.obowiazki.length + ' obowiązków w słowniku)';
  }

  const PRESETS = {
    male: { ur: '8', int: '0', eko: false, zw: 'nie', g: {} },
    krowy: { ur: '9,5', int: '0', eko: false, zw: 'stado', g: { bydlo_krowa: 12 } },
    granica: { ur: '10', int: '0', eko: false, zw: 'nie', g: {} },
    niewiem: { ur: '9', int: '0', eko: false, zw: 'tak', g: {} },
    duze: { ur: '120', int: '0', eko: true, zw: 'nie', g: {} }
  };
  function apply(k){
    const s = PRESETS[k]; if (!s) return;
    $('#ml-ur').value = s.ur; $('#ml-int').value = s.int; $('#ml-eko').checked = s.eko;
    form.querySelectorAll('input[name="ml-zw"]').forEach(r => { r.checked = r.value === s.zw; });
    D.grupy.forEach(g => { document.getElementById('ml-g-' + g.id).value = String(s.g[g.id] || 0); });
    render();
  }
  form.addEventListener('input', render); form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  $$('[data-ml]').forEach(b => b.addEventListener('click', () => apply(b.dataset.ml)));

  $('#ml-ver').textContent = D.wersja;
  const wzor = D.obowiazki.find(o => o.id === 'program_azotanowy_ewidencja');
  $('#ml-json').textContent = JSON.stringify({ id: wzor.id, kogo_dotyczy: wzor.kogo_dotyczy, progi: wzor.progi, polaczenie_progow: wzor.polaczenie_progow, przechowywanie_lat: wzor.przechowywanie_lat }, null, 2);
  apply('krowy');
  window.__ml = { ocena: (id, p) => ocena(D.obowiazki.find(o => o.id === id), p), apply: apply, n: D.obowiazki.length };
})();
})();
