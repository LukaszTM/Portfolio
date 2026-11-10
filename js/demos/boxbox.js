/* BoxBox Academy: przykładowe okrążenie Monzy z komunikatami na radiu.
   Teksty i nagrania pochodzą z programu (assets/voice), scenariusz jest przykładowy. */
window.DEMOS.boxbox = function (root) {
  const CORNERS = [["T1-T2", 12], ["T3", 22], ["T4-T5", 36], ["T6", 46], ["T7", 54], ["T8-T10", 70], ["T11", 88]];
  const MODES = {
    nauka: { label: "Tryb nauki", who: "Trener", events: [
      { at: 2, where: "Wyjazd", clip: "misc_hello", text: "Mechanik na radiu, słyszę cię. Jedź spokojnie, najpierw czyste okrążenie." },
      { at: 17, where: "T1-T2", clip: "rule_entry_fast_b", text: "Wolniej na wejściu, wcześniej na gaz: czas robi się na wyjściu." },
      { at: 41, where: "T4-T5", clip: "rule_throttle_early_b", text: "Poczekaj z pełnym gazem, aż auto się wyprostuje." },
      { at: 75, where: "T8-T10", clip: "rule_throttle_late_b", text: "Gdy kierownica się prostuje, dodawaj gaz pewniej." },
      { at: 100, where: "Meta", clip: "misc_lap_best", text: "Nowe najlepsze okrążenie." }
    ] },
    wyscig: { label: "Wyścig", who: "Inżynier", events: [
      { at: 30, where: "Prosta", clip: "eng_tyres_hot", text: "Opony przegrzane. Spokojniej na wyjściach, daj im odpocząć." },
      { at: 80, where: "Prosta", clip: "eng_manage_pace", text: "Zejdź z tempa o dwie dziesiąte, dowieziemy te opony." }
    ] }
  };
  const LAP_MS = 20000;
  let mode = "nauka", running = false, sound = true, frame = null;
  const queue = []; let playing = null;

  function playNext() {
    if (playing || !queue.length) { return; }
    const audio = new Audio("audio/" + queue.shift() + ".mp3");
    playing = audio;
    const done = function () { playing = null; playNext(); };
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    const started = audio.play();
    if (started && started.catch) { started.catch(done); }
  }
  function stopAudio() { queue.length = 0; if (playing) { playing.pause(); playing = null; } }

  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) { const n = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
  const strip = svg("svg", { viewBox: "0 0 1000 110", class: "bb-strip", role: "img", "aria-label": "Okrążenie Monzy: siedem zakrętów od T1 do T11" });
  strip.appendChild(svg("line", { x1: 20, y1: 60, x2: 980, y2: 60, class: "bb-line" }));
  const progress = svg("line", { x1: 20, y1: 60, x2: 20, y2: 60, class: "bb-line is-done" });
  strip.appendChild(progress);
  CORNERS.forEach(function (corner) {
    const x = 20 + 9.6 * corner[1];
    strip.appendChild(svg("circle", { cx: x, cy: 60, r: 9, class: "bb-stop" }));
    const text = svg("text", { x: x, y: 28, class: "bb-label", "text-anchor": "middle" });
    text.textContent = corner[0]; strip.appendChild(text);
  });
  const car = svg("circle", { cx: 20, cy: 60, r: 13, class: "bb-car" });
  strip.appendChild(car);

  const radio = el("ol", { class: "bb-radio", "aria-live": "polite", "aria-label": "Komunikaty na radiu" });
  const go = el("button", { class: "bb-go", onclick: toggle }, "Jedź");
  const modeButtons = el("div", { class: "bb-modes", role: "group", "aria-label": "Tryb pracy" });
  Object.keys(MODES).forEach(function (key) {
    modeButtons.appendChild(el("button", { class: "demo-chip", "aria-pressed": key === mode ? "true" : "false", "data-mode": key, onclick: function () {
      mode = key; stop();
      modeButtons.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === key ? "true" : "false"); });
      reset();
    } }, MODES[key].label));
  });
  const soundBox = el("input", { type: "checkbox", id: "bb-sound", checked: true, onchange: function () { sound = soundBox.checked; if (!sound) { stopAudio(); } } });

  function place(percent) {
    const x = 20 + 9.6 * percent;
    car.setAttribute("cx", x); progress.setAttribute("x2", x);
  }
  function reset() {
    place(0); radio.textContent = "";
    radio.appendChild(el("li", { class: "bb-empty", text: "Naciśnij Jedź, żeby przejechać okrążenie z " + (mode === "nauka" ? "trenerem" : "inżynierem wyścigowym") + "." }));
  }
  function stop() {
    running = false; go.textContent = "Jedź";
    if (frame) { window.cancelAnimationFrame(frame); frame = null; }
    stopAudio();
  }
  function toggle() {
    if (running) { stop(); return; }
    running = true; go.textContent = "Zatrzymaj"; radio.textContent = "";
    const events = MODES[mode].events.slice();
    const began = performance.now();
    (function tick(now) {
      const percent = Math.min(100, 100 * (now - began) / LAP_MS);
      place(percent);
      while (events.length && events[0].at <= percent) {
        const event = events.shift();
        radio.insertBefore(el("li", null, el("span", { class: "bb-where", text: event.where }), el("span", { text: event.text })), radio.firstChild);
        if (sound) { queue.push(event.clip); playNext(); }
      }
      if (percent < 100) { frame = window.requestAnimationFrame(tick); return; }
      running = false; frame = null; go.textContent = "Jedź jeszcze raz";
    })(began);
  }

  root.appendChild(el("div", { class: "bb-top" }, modeButtons,
    el("label", { class: "bb-sound", for: "bb-sound" }, soundBox, " Dźwięk z radia")));
  root.appendChild(strip);
  root.appendChild(el("div", { class: "bb-main" }, go, radio));
  root.appendChild(el("p", { class: "demo-note", text: "Komunikaty i głos pochodzą z programu. Kolejność zdarzeń na tym okrążeniu jest przykładowa: w programie wynika z telemetrii gry." }));
  reset();
};
