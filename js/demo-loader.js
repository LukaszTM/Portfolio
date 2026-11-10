/* Wspólne narzędzia dla demonstracji i ich uruchamianie po kliknięciu. */
window.DEMOS = window.DEMOS || {};

/* Tworzy element: el("button", {class: "btn", onclick: fn}, "Tekst", innyElement) */
window.el = function (tag, props) {
  const node = document.createElement(tag);
  Object.keys(props || {}).forEach(function (key) {
    const value = props[key];
    if (value === null || value === undefined || value === false) { return; }
    if (key === "class") { node.className = value; }
    else if (key === "text") { node.textContent = value; }
    else if (key.slice(0, 2) === "on") { node.addEventListener(key.slice(2), value); }
    else { node.setAttribute(key, value === true ? "" : value); }
  });
  for (let i = 2; i < arguments.length; i++) {
    const child = arguments[i];
    if (child === null || child === undefined || child === false) { continue; }
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
};

(function () {
  document.querySelectorAll(".demo").forEach(function (box) {
    const button = box.querySelector(".demo-open");
    const stage = box.querySelector(".demo-stage");
    const label = button.textContent;
    let started = false;
    button.addEventListener("click", function () {
      const open = stage.hidden;
      stage.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.textContent = open ? "Zamknij demonstrację" : label;
      if (open && !started) {
        started = true;
        const start = window.DEMOS[box.dataset.demo];
        if (start) { start(stage); }
        else { stage.textContent = "Nie udało się wczytać demonstracji. Odśwież stronę."; }
      }
    });
  });
})();
