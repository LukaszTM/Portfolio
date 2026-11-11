(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= MR.PYTHON: AnswerChecker.normalizeOutput, Rules, LessonSession ================= */
(function(){
  const form = $('#mp-form'); if (!form) return;
  const EX = [
    { code: 'print("ha" * 3)', accepted: ['hahaha'], why: 'Napis pomnożony przez liczbę powtarza się tyle razy.' },
    { code: '# print("A")\nprint("B")', accepted: ['B'], why: 'Pierwsza linia jest komentarzem, więc się nie wykona.' },
    { code: 'print("Ala", "ma", "kota")', accepted: ['Ala ma kota'], why: 'Kilka argumentów print() rozdziela spacjami.' },
    { code: 'print("Ala")\nprint("ma kota")', accepted: ['Ala\nma kota'], why: 'Każde wywołanie print() kończy się nową linią.' }
  ];
  const MAX_HEARTS = 5, XP_PER_LESSON = 10, XP_PERFECT_BONUS = 5;
  function normalizeOutput(text){
    const lines = text.replace(/\r\n/g, '\n').split('\n').map(l => l.trim());
    while (lines.length && lines[0] === '') lines.shift();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }
  const isCorrect = (ex, value) => ex.accepted.some(a => normalizeOutput(a) === normalizeOutput(value));
  let queue, hearts, mistakes, done, total, locked;
  const fb = $('#mp-fb'), input = $('#mp-in');
  function show(){
    const end = queue.length === 0 || hearts === 0;
    $('#mp-hearts').textContent = 'serca: ' + hearts + ' z ' + MAX_HEARTS;
    $('#mp-check').hidden = end || locked; $('#mp-next').hidden = !locked || end;
    input.disabled = end || locked;
    if (hearts === 0) { $('#mp-progress').textContent = 'Koniec serc'; $('#mp-code').textContent = 'W aplikacji serce odnawia się co 20 minut.'; return; }
    if (queue.length === 0) {
      $('#mp-progress').textContent = 'Lekcja ukończona';
      $('#mp-code').textContent = 'Wynik: +' + (XP_PER_LESSON + (mistakes === 0 ? XP_PERFECT_BONUS : 0)) + ' XP' + (mistakes === 0 ? ' (z premią za brak błędów)' : ', błędów: ' + mistakes);
      return;
    }
    $('#mp-progress').textContent = 'Zadanie ' + Math.min(done + 1, total) + ' z ' + total + (queue.length > total - done ? ' + powtórka' : '');
    $('#mp-code').textContent = queue[0].code;
  }
  function restart(){ queue = EX.slice(); hearts = MAX_HEARTS; mistakes = 0; done = 0; total = EX.length; locked = false; input.value = ''; fb.hidden = true; show(); }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (locked || queue.length === 0 || hearts === 0) return;
    const ex = queue[0];
    if (isCorrect(ex, input.value)) { fb.className = 'fb ok'; fb.textContent = 'Dobrze. ' + ex.why; queue.shift(); done = Math.min(done + 1, total); }
    else { hearts = Math.max(0, hearts - 1); mistakes++; fb.className = 'fb bad'; fb.textContent = 'Poprawna odpowiedź: ' + ex.accepted[0].replace(/\n/g, ' ⏎ ') + '. ' + ex.why + ' To zadanie wróci na końcu lekcji.'; queue.push(queue.shift()); }
    fb.hidden = false; locked = true; show();
  });
  $('#mp-next').addEventListener('click', () => { locked = false; input.value = ''; fb.hidden = true; show(); input.focus(); });
  $('#mp-restart').addEventListener('click', restart);
  restart();
  window.__mp = { normalizeOutput: normalizeOutput, isCorrect: isCorrect, EX: EX };
})();
})();
