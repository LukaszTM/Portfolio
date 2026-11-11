/* Wspólne funkcje portfolio */
(function(){
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const pl = (n, d) => n.toFixed(d).replace('.', ',');
window.PF = { $: $, $$: $$, esc: esc, pl: pl };
/* kopiowanie adresu */
$$('[data-copy]').forEach(b => b.addEventListener('click', () => {
  const txt = b.dataset.copy, from = document.getElementById(b.dataset.copyFrom || '');
  const sel = () => { if (from) { const r = document.createRange(); r.selectNodeContents(from); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } b.textContent = 'Zaznaczono, skopiuj ręcznie'; };
  try { navigator.clipboard.writeText(txt).then(() => { b.textContent = 'Skopiowano'; }, sel); } catch (e) { sel(); }
}));
/* powiększanie zrzutów */
let lb = null;
function zoom(btn){
  if (!lb) {
    lb = document.createElement('dialog'); lb.className = 'lb';
    lb.innerHTML = '<div class="lb-in"><img alt=""><div class="lb-bar"><span></span><button type="button">Zamknij</button></div></div>';
    document.body.appendChild(lb);
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('button')) lb.close(); });
  }
  const img = lb.querySelector('img'), small = btn.querySelector('img');
  img.src = btn.dataset.zoom; img.alt = small ? small.alt : '';
  lb.querySelector('span').textContent = btn.dataset.cap || '';
  if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
}
$$('[data-zoom]').forEach(b => b.addEventListener('click', () => zoom(b)));
/* lista kontrolna prototypu */
$$('#todo-list input').forEach(cb => {
  try { cb.checked = localStorage.getItem('pf-' + cb.id) === '1'; } catch (e) {}
  cb.addEventListener('change', () => { try { localStorage.setItem('pf-' + cb.id, cb.checked ? '1' : '0'); } catch (e) {} });
});
})();
