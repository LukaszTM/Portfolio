/* Dyżurny Ruchu: uproszczony pulpit. Dwa tory, jedno przejście między nimi,
   nastawianie przebiegu dwoma przyciskami (początek, potem koniec). */
window.DEMOS.dyzurny = function (root) {
  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }
  const SEGMENTS = {
    t1a: "M40 70 L260 70", t1b: "M260 70 L600 70",
    x: "M260 70 L380 150",
    t2a: "M40 150 L380 150", t2b: "M380 150 L600 150"
  };
  const ROUTES = {
    "A-C": { segments: ["t1a", "t1b"], path: "M40 70 L600 70", sw: "prosto" },
    "A-D": { segments: ["t1a", "x", "t2b"], path: "M40 70 L260 70 L380 150 L600 150", sw: "na bok" },
    "B-D": { segments: ["t2a", "t2b"], path: "M40 150 L600 150", sw: null }
  };
  const POINTS = { A: [40, 70], B: [40, 150], C: [600, 70], D: [600, 150] };
  const active = {};      // przebieg -> true, gdy ustawiony
  let from = null;

  const board = svg("svg", { viewBox: "0 0 640 220", class: "dr-board", role: "img", "aria-label": "Schemat: tor 1 od A do C, tor 2 od B do D, przejście z toru 1 na tor 2" });
  const lines = {};
  Object.keys(SEGMENTS).forEach(function (key) {
    lines[key] = svg("path", { d: SEGMENTS[key], class: "dr-seg" });
    board.appendChild(lines[key]);
  });
  const lamps = { A: svg("circle", { cx: 96, cy: 44, r: 9, class: "dr-lamp" }), B: svg("circle", { cx: 96, cy: 176, r: 9, class: "dr-lamp" }) };
  [["A", 96, 44], ["B", 96, 176]].forEach(function (s) {
    board.appendChild(svg("line", { x1: s[1], y1: s[2] + (s[0] === "A" ? 9 : -9), x2: s[1], y2: s[0] === "A" ? 70 : 150, class: "dr-post" }));
    board.appendChild(lamps[s[0]]);
  });
  [["Tor 1", 320, 56], ["Tor 2", 470, 172]].forEach(function (t) {
    const text = svg("text", { x: t[1], y: t[2], class: "dr-text", "text-anchor": "middle" });
    text.textContent = t[0]; board.appendChild(text);
  });
  const train = svg("circle", { r: 11, class: "dr-train", visibility: "hidden" });
  board.appendChild(train);

  const status = el("p", { class: "dr-status", "aria-live": "polite", text: "Wybierz początek przebiegu: A albo B." });
  const buttons = {};
  const pad = el("div", { class: "dr-pad" });
  ["A", "B", "C", "D"].forEach(function (name) {
    buttons[name] = el("button", { class: "btn dr-button", onclick: function () { press(name); } },
      (name === "A" || name === "B" ? "Początek " : "Koniec ") + name);
    pad.appendChild(buttons[name]);
  });

  function paint() {
    Object.keys(lines).forEach(function (key) { lines[key].setAttribute("class", "dr-seg"); });
    Object.keys(active).forEach(function (route) {
      ROUTES[route].segments.forEach(function (key) { lines[key].setAttribute("class", "dr-seg is-" + active[route]); });
    });
    ["A", "B"].forEach(function (name) {
      const set = Object.keys(active).some(function (route) { return route[0] === name && active[route] === "set"; });
      lamps[name].setAttribute("class", "dr-lamp" + (set ? " is-green" : ""));
      buttons[name].classList.toggle("is-picked", from === name);
    });
  }

  function press(name) {
    if (name === "A" || name === "B") {
      from = name; paint();
      status.textContent = "Początek " + name + ". Teraz wybierz koniec: C albo D.";
      return;
    }
    if (!from) { status.textContent = "Najpierw wybierz początek przebiegu: A albo B."; return; }
    const id = from + "-" + name;
    const route = ROUTES[id];
    const start = from; from = null;
    if (!route) { status.textContent = "Z " + start + " do " + name + " nie ma drogi. Przejście prowadzi tylko z toru 1 na tor 2."; paint(); return; }
    if (active[id]) { status.textContent = "Przebieg " + start + " → " + name + " jest już ustawiony."; paint(); return; }
    const clash = Object.keys(active).filter(function (other) {
      return ROUTES[other].segments.some(function (seg) { return route.segments.indexOf(seg) !== -1; });
    })[0];
    if (clash) { status.textContent = "Odmowa: przebieg " + start + " → " + name + " koliduje z ustawionym " + clash.replace("-", " → ") + ". Poczekaj, aż pociąg zwolni tor."; paint(); return; }
    active[id] = "set"; paint();
    status.textContent = "Przebieg " + start + " → " + name + " ustawiony" + (route.sw ? ", zwrotnica " + route.sw : "") + ". Semafor " + start + " podaje sygnał zezwalający.";
    window.setTimeout(function () { run(id); }, 900);
  }

  function run(id) {
    const guide = svg("path", { d: ROUTES[id].path });
    const length = guide.getTotalLength();
    const began = performance.now();
    const duration = 3600;
    active[id] = "busy"; paint();
    train.setAttribute("visibility", "visible");
    (function frame(now) {
      const t = Math.min(1, (now - began) / duration);
      const p = guide.getPointAtLength(length * t);
      train.setAttribute("cx", p.x); train.setAttribute("cy", p.y);
      if (t < 1) { window.requestAnimationFrame(frame); return; }
      train.setAttribute("visibility", "hidden");
      delete active[id]; paint();
      status.textContent = "Pociąg przejechał, przebieg " + id.replace("-", " → ") + " zwolniony. Ustaw następny.";
    })(began);
  }

  Object.keys(POINTS).forEach(function (name) {
    const text = svg("text", { x: POINTS[name][0] + (name === "A" || name === "B" ? -22 : 22), y: POINTS[name][1] + 7, class: "dr-text dr-name", "text-anchor": "middle" });
    text.textContent = name; board.appendChild(text);
  });

  root.appendChild(board);
  root.appendChild(pad);
  root.appendChild(status);
  root.appendChild(el("p", { class: "demo-note", text: "Uproszczony przykład zasady z gry: przebieg ustawia się dwoma przyciskami, zwrotnice przekładają się same, a kolidującego przebiegu nie da się ustawić. Spróbuj ustawić A → D, a zaraz potem B → D." }));
  paint();
};
