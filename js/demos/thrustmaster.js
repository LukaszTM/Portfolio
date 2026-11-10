/* Thrustmaster Train Control: profil config/z-ed.json (lokomotywy z hamulcem elektrodynamicznym).
   Dźwignie działają w trybie strefowym: klawisz jest trzymany, dopóki dźwignia jest w strefie. */
window.DEMOS.thrustmaster = function (root) {
  const KEY_NAMES = { num_add: "Num +", num_subtract: "Num −", num9: "Num 9", num3: "Num 3", space: "Spacja", q: "Q", num8: "Num 8" };
  const AXES = [
    { label: "Dźwignia 1: zadajnik jazdy i hamowania ED",
      zones: [{ from: 0, to: 0.35, key: "num_subtract" }, { from: 0.35, to: 0.65, key: null }, { from: 0.65, to: 1, key: "num_add" }] },
    { label: "Dźwignia 2: hamulec zespolony",
      zones: [{ from: 0, to: 0.35, key: "num9" }, { from: 0.35, to: 0.65, key: null }, { from: 0.65, to: 1, key: "num3" }] }
  ];
  const BUTTONS = [
    { label: "Czuwak / SHP", action: "tap", key: "space" },
    { label: "Syrena", action: "hold", key: "q" },
    { label: "Piasecznica", action: "hold", key: "num8" }
  ];
  const held = {};
  const keysBox = el("div", { class: "tm-keys", "aria-live": "polite" });
  const log = el("ol", { class: "tm-log", "aria-label": "Ostatnie zdarzenia" });

  function note(text) {
    log.insertBefore(el("li", { text: text }), log.firstChild);
    while (log.children.length > 6) { log.removeChild(log.lastChild); }
  }
  function drawKeys() {
    keysBox.textContent = "";
    const names = Object.keys(held).filter(function (k) { return held[k]; });
    keysBox.appendChild(el("span", { class: "demo-note", text: "Klawisze trzymane w grze:" }));
    if (!names.length) { keysBox.appendChild(el("span", { class: "tm-none", text: "żaden" })); }
    names.forEach(function (key) { keysBox.appendChild(el("kbd", { text: KEY_NAMES[key] })); });
  }
  function press(key) { if (!held[key]) { held[key] = true; note("Wciśnięto " + KEY_NAMES[key]); drawKeys(); } }
  function release(key) { if (held[key]) { held[key] = false; note("Puszczono " + KEY_NAMES[key]); drawKeys(); } }

  function zoneKey(axis, value) {
    for (let i = 0; i < axis.zones.length; i++) {
      const z = axis.zones[i];
      if (value >= z.from && (value < z.to || (i === axis.zones.length - 1 && value <= z.to))) { return z.key; }
    }
    return null;
  }

  AXES.forEach(function (axis, index) {
    let current = null;
    const id = "tm-axis-" + index;
    const out = el("span", { class: "tm-zone", text: "środek: utrzymanie" });
    const slider = el("input", { type: "range", id: id, class: "tm-slider", min: "0", max: "100", value: "50", oninput: function () {
      const value = Number(slider.value) / 100;
      const key = zoneKey(axis, value);
      if (key !== current) {
        if (current) { release(current); }
        if (key) { press(key); }
        current = key;
      }
      out.textContent = key ? "strefa klawisza " + KEY_NAMES[key] : "środek: utrzymanie";
    } });
    root.appendChild(el("div", { class: "tm-axis" },
      el("label", { for: id, text: axis.label }),
      el("div", { class: "tm-track" }, slider,
        el("div", { class: "tm-scale", "aria-hidden": "true" },
          el("span", { text: KEY_NAMES[axis.zones[0].key] }), el("span", { text: "martwa strefa" }), el("span", { text: KEY_NAMES[axis.zones[2].key] }))),
      out));
  });

  const pad = el("div", { class: "tm-buttons" });
  BUTTONS.forEach(function (button) {
    const control = el("button", { class: "btn tm-button" }, button.label);
    if (button.action === "tap") {
      control.addEventListener("click", function () { note("Krótkie naciśnięcie " + KEY_NAMES[button.key] + " (40 ms)"); });
    } else {
      const down = function (event) { if (event.type === "keydown" && event.key !== " " && event.key !== "Enter") { return; } press(button.key); };
      const up = function () { release(button.key); };
      control.addEventListener("pointerdown", down);
      control.addEventListener("pointerup", up);
      control.addEventListener("pointerleave", up);
      control.addEventListener("keydown", down);
      control.addEventListener("keyup", up);
      control.addEventListener("blur", up);
    }
    pad.appendChild(control);
  });

  root.appendChild(pad);
  root.appendChild(keysBox);
  root.appendChild(log);
  root.appendChild(el("p", { class: "demo-note", text: "Przesuń dźwignię poza martwą strefę, a program przytrzyma w grze właściwy klawisz. Syrenę i piasecznicę trzeba przytrzymać. Ustawienia pochodzą z profilu dla lokomotyw z hamulcem elektrodynamicznym." }));
  drawKeys();
};
