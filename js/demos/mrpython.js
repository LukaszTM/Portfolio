/* Mr.Python: pierwsza lekcja kursu, zadania przepisane z CourseContent.kt (lekcja u1l1). */
window.DEMOS.mrpython = function (root) {
  const TASKS = [
    { type: "choice", instruction: "Która instrukcja wypisze tekst na ekranie?",
      options: ['print("Cześć")', 'echo "Cześć"', 'console.log("Cześć")', "printf Cześć"], correct: 0,
      explanation: "W Pythonie tekst wypisujemy funkcją print()." },
    { type: "output", instruction: "Co wypisze ten program?", code: 'print("Witaj, świecie!")',
      expected: "Witaj, świecie!", explanation: "print() wypisuje napis bez cudzysłowów." },
    { type: "tiles", instruction: "Ułóż kod, który wypisze: Hej", solution: ["print(", '"Hej"', ")"],
      distractors: ["echo", "Hej"], explanation: "Napis musi być w cudzysłowie i w nawiasach funkcji print." },
    { type: "fill", instruction: "Uzupełnij, aby wypisać słowo Python.", code: '____("Python")',
      options: ["print", "write", "say"], correct: "print", explanation: "Funkcja wypisująca tekst to print." },
    { type: "output", instruction: "Co wypisze ten program?", code: 'print("Ala")\nprint("ma kota")',
      expected: "Ala\nma kota", explanation: "Każde wywołanie print() kończy się nową linią." }
  ];
  const MAX_HEARTS = 5;
  let queue, hearts, done, answer, checked;

  /* Tak samo jak AnswerChecker.normalizeOutput w aplikacji. */
  function normalize(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n").map(function (l) { return l.trim(); });
    while (lines.length && lines[0] === "") { lines.shift(); }
    while (lines.length && lines[lines.length - 1] === "") { lines.pop(); }
    return lines.join("\n");
  }
  function isCorrect(task) {
    if (task.type === "choice") { return answer === task.correct; }
    if (task.type === "fill") { return task.options[answer] === task.correct; }
    if (task.type === "tiles") { return (answer || []).join("\u0001") === task.solution.join("\u0001"); }
    return normalize(answer || "") === normalize(task.expected);
  }
  function correctText(task) {
    if (task.type === "choice") { return task.options[task.correct]; }
    if (task.type === "fill") { return task.correct; }
    if (task.type === "tiles") { return task.solution.join(" "); }
    return task.expected;
  }

  function start() { queue = TASKS.slice(); hearts = MAX_HEARTS; done = 0; next(); }
  function next() { answer = null; checked = false; render(); }

  function render() {
    root.textContent = "";
    const total = done + queue.length;
    const head = el("div", { class: "mp-head" },
      el("div", { class: "mp-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done), "aria-label": "Postęp lekcji" },
        el("span", { style: "width:" + Math.round(100 * done / total) + "%" })),
      el("span", { class: "mp-hearts", "aria-label": "Serca: " + hearts + " z " + MAX_HEARTS }, "❤ " + hearts));
    root.appendChild(head);

    if (hearts === 0) {
      root.appendChild(el("p", { class: "mp-instruction", text: "Skończyły się serca." }));
      root.appendChild(el("p", { class: "demo-note", text: "W aplikacji serce odnawia się co 20 minut, a powtórka ukończonej lekcji oddaje jedno." }));
      root.appendChild(el("button", { class: "btn primary", onclick: start }, "Zacznij lekcję od nowa"));
      return;
    }
    if (!queue.length) {
      root.appendChild(el("p", { class: "mp-instruction", text: "Lekcja „Witaj, świecie!” ukończona." }));
      root.appendChild(el("p", { class: "demo-note", text: "To pierwsza z 14 lekcji. W aplikacji odblokowałaby się teraz kolejna: „Napisy i komentarze”." }));
      root.appendChild(el("button", { class: "btn primary", onclick: start }, "Powtórz lekcję"));
      return;
    }

    const task = queue[0];
    root.appendChild(el("p", { class: "mp-instruction", text: task.instruction }));
    if (task.code) { root.appendChild(el("pre", { class: "mp-code" }, el("code", { text: task.code }))); }

    const area = el("div", { class: "mp-area" });
    root.appendChild(area);
    const checkButton = el("button", { class: "btn primary", disabled: true, onclick: check }, "Sprawdź");
    function ready(value) { answer = value; checkButton.disabled = value === null || value === "" || (Array.isArray(value) && !value.length); }

    if (task.type === "choice" || task.type === "fill") {
      const group = el("div", { class: "mp-options", role: "radiogroup", "aria-label": "Odpowiedzi" });
      task.options.forEach(function (option, i) {
        const button = el("button", { class: "mp-option", role: "radio", "aria-checked": "false", onclick: function () {
          if (checked) { return; }
          group.querySelectorAll(".mp-option").forEach(function (b) { b.setAttribute("aria-checked", "false"); });
          button.setAttribute("aria-checked", "true");
          ready(i);
        } }, el("code", { text: option }));
        group.appendChild(button);
      });
      area.appendChild(group);
    } else if (task.type === "tiles") {
      const picked = [];
      const line = el("div", { class: "mp-line", "aria-label": "Ułożony kod", "aria-live": "polite" });
      const bank = el("div", { class: "mp-bank" });
      const tiles = task.solution.concat(task.distractors).map(function (text, i) { return { text: text, id: i }; })
        .sort(function (a, b) { return (a.id * 7 + 3) % 5 - (b.id * 7 + 3) % 5; });
      function draw() {
        line.textContent = ""; bank.textContent = "";
        picked.forEach(function (tile, index) {
          line.appendChild(el("button", { class: "mp-tile", "aria-label": "Usuń kafelek " + tile.text, onclick: function () { if (!checked) { picked.splice(index, 1); draw(); } } }, el("code", { text: tile.text })));
        });
        if (!picked.length) { line.appendChild(el("span", { class: "mp-hint", text: "Klikaj kafelki poniżej" })); }
        tiles.forEach(function (tile) {
          const used = picked.indexOf(tile) !== -1;
          bank.appendChild(el("button", { class: "mp-tile", disabled: used, onclick: function () { if (!checked) { picked.push(tile); draw(); } } }, el("code", { text: tile.text })));
        });
        ready(picked.map(function (t) { return t.text; }));
      }
      area.appendChild(line); area.appendChild(bank); draw();
    } else {
      const input = el("textarea", { class: "mp-input", rows: String(task.expected.split("\n").length + 1), "aria-label": "Wynik programu", placeholder: "Wpisz to, co pojawi się w konsoli", spellcheck: "false", oninput: function () { ready(input.value); } });
      area.appendChild(input);
    }

    const feedback = el("div", { class: "mp-feedback", "aria-live": "polite" });
    root.appendChild(feedback);
    const actions = el("div", { class: "mp-actions" }, checkButton);
    root.appendChild(actions);

    function check() {
      checked = true;
      const good = isCorrect(task);
      queue.shift();
      if (good) { done += 1; } else { hearts -= 1; queue.push(task); }
      feedback.className = "mp-feedback " + (good ? "is-good" : "is-bad");
      feedback.appendChild(el("strong", { text: good ? "Dobrze!" : "Poprawna odpowiedź:" }));
      if (!good) { feedback.appendChild(el("pre", { class: "mp-code" }, el("code", { text: correctText(task) }))); }
      feedback.appendChild(el("p", { text: task.explanation }));
      if (!good) { feedback.appendChild(el("p", { class: "demo-note", text: "To zadanie wróci na końcu lekcji." })); }
      area.querySelectorAll("button, textarea").forEach(function (control) { control.disabled = true; });
      actions.textContent = "";
      const go = el("button", { class: "btn primary", onclick: next }, "Dalej");
      actions.appendChild(go); go.focus();
    }
  }
  start();
};
