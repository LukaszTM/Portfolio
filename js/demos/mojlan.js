/* Mój Łan: wpis oprysku w pięciu dotknięciach.
   Środki, dawki i karencje pochodzą ze słownika aplikacji (js/data/mojlan-dane.js),
   komunikaty o karencji są takie same jak na ekranie „Zapisano" w aplikacji. */
window.DEMOS.mojlan = function (root) {
  const data = window.MOJLAN;
  if (!data) { root.textContent = "Nie udało się wczytać danych aplikacji."; return; }
  const STEPS = 5;
  let taps, field, product, dose;

  function plNumber(value) {
    return (Math.round(value * 100) / 100).toFixed(value % 1 === 0 ? 0 : 2).replace(".", ",");
  }
  function day(date) {
    return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  }
  function labelDate(iso) {
    const p = iso.split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }

  const screen = el("div", { class: "ml-screen" });
  const counter = el("p", { class: "ml-counter", "aria-live": "polite" });
  root.appendChild(el("div", { class: "ml-phone" }, counter, screen));
  root.appendChild(el("p", { class: "demo-note", text: "Środki, dawki i karencje pochodzą ze słownika aplikacji zbudowanego z rejestru MRiRW (stan na " + labelDate(data.dataRejestru) + "). Nazwy pól są przykładowe. W aplikacji lista środków jest pełna, tutaj pokazuję po cztery na uprawę." }));

  function show(title, nodes) {
    counter.textContent = taps === 0 ? "Wpis oprysku: 5 dotknięć, bez klawiatury" : "Dotknięcie " + Math.min(taps, STEPS) + " z " + STEPS;
    screen.textContent = "";
    screen.appendChild(el("h4", { class: "ml-title", text: title }));
    nodes.forEach(function (node) { if (node) { screen.appendChild(node); } });
    const first = screen.querySelector("button:not([disabled])");
    if (first && taps > 0) { first.focus({ preventScroll: true }); }
  }
  function big(label, sub, onclick, extra) {
    return el("button", { class: "ml-big" + (extra ? " " + extra : ""), onclick: onclick },
      el("span", { class: "ml-big-main", text: label }), sub ? el("span", { class: "ml-big-sub", text: sub }) : null);
  }

  function home() {
    taps = 0; field = null; product = null;
    show("Mój Łan", [
      el("p", { class: "ml-text", text: "Dziś: brak zaległych wpisów." }),
      big("Dodaj zabieg", null, function () { taps = 1; chooseField(); }, "is-action")
    ]);
  }
  function chooseField() {
    show("Na którym polu?", data.pola.map(function (pole) {
      return big(pole.nazwa, pole.uprawa + ", " + plNumber(pole.ha) + " ha", function () { field = pole; taps = 2; chooseKind(); });
    }));
  }
  function chooseKind() {
    show("Jaki zabieg?", [
      big("Oprysk", null, function () { taps = 3; chooseProduct(); }),
      el("button", { class: "ml-big", disabled: true }, el("span", { class: "ml-big-main", text: "Nawożenie" }), el("span", { class: "ml-big-sub", text: "w aplikacji" })),
      el("button", { class: "ml-big", disabled: true }, el("span", { class: "ml-big-main", text: "Inny zabieg" }), el("span", { class: "ml-big-sub", text: "w aplikacji" }))
    ]);
  }
  function chooseProduct() {
    const nodes = [el("p", { class: "ml-text", text: "Środki dopuszczone w uprawie: " + field.uprawa + " (" + field.wszystkichSrodkow + " w rejestrze)." })];
    field.srodki.forEach(function (srodek) {
      nodes.push(big(srodek.nazwa, srodek.rodzaj + " · " + srodek.cel + " · " + plNumber(srodek.dawka) + " " + srodek.jednostka + "/" + srodek.odniesienie,
        function () { product = srodek; dose = srodek.dawka; taps = 4; confirm(); }));
    });
    show("Jaki środek?", nodes);
  }
  function confirm() {
    const now = new Date();
    const step = product.dawka >= 1 ? 0.25 : 0.05;
    const doseText = el("strong", { class: "ml-dose" });
    const warning = el("p", { class: "ml-warning", role: "alert", hidden: true }, "Dawka ponad dopuszczalną w rejestrze (" + plNumber(product.dawka) + " " + product.jednostka + "/" + product.odniesienie + "). Zmniejsz dawkę przyciskiem „−” albo sprawdź etykietę.");
    function drawDose() {
      doseText.textContent = plNumber(dose) + " " + product.jednostka + "/" + product.odniesienie;
      warning.hidden = dose <= product.dawka + 1e-9;
    }
    const stepper = el("div", { class: "ml-stepper" },
      el("button", { class: "ml-round", "aria-label": "Zmniejsz dawkę", onclick: function () { dose = Math.max(step, Math.round((dose - step) * 100) / 100); drawDose(); } }, "−"),
      doseText,
      el("button", { class: "ml-round", "aria-label": "Zwiększ dawkę", onclick: function () { dose = Math.round((dose + step) * 100) / 100; drawDose(); } }, "+"));
    const rows = el("dl", { class: "ml-rows" });
    [["Pole", field.nazwa + ", " + plNumber(field.ha) + " ha"], ["Uprawa", field.uprawa + " (kod EPPO " + field.eppo + ")"],
     ["Środek", product.nazwa + ", zezwolenie " + product.zezwolenie], ["Przyczyna", product.cel],
     ["Data", day(now) + ", " + now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })]].forEach(function (row) {
      rows.appendChild(el("div", null, el("dt", { text: row[0] }), el("dd", { text: row[1] })));
    });
    drawDose();
    show("Sprawdź i zapisz", [
      el("p", { class: "ml-text", text: "Wszystko uzupełniło się samo: z pola, z rejestru środków i z zegara." }),
      rows, el("p", { class: "ml-label", text: "Dawka" }), stepper, warning,
      big("Zapisz", null, function () { taps = 5; saved(now); }, "is-action")
    ]);
  }
  function saved(when) {
    let message, source = null;
    if (product.karencjaStan === "dni" && product.karencjaDni !== null) {
      const harvest = new Date(when.getTime()); harvest.setDate(harvest.getDate() + product.karencjaDni);
      message = "Karencja: " + product.karencjaDni + " dni. Zbiór najwcześniej " + day(harvest) + ".";
      source = "Z etykiety z " + labelDate(product.dataEtykiety) + ". Sprawdź opakowanie, jeśli masz nowszą partię.";
    } else if (product.karencjaStan === "nie_dotyczy") {
      message = "Etykieta podaje: karencja nie dotyczy.";
    } else {
      message = "Karencji nie znamy dla tego środka.";
      source = "Sprawdź karencję na opakowaniu. Aplikacja nie zgaduje i nie wpisuje zera.";
    }
    show("Zapisano w 5 dotknięciach", [
      el("p", { class: "ml-saved", text: product.nazwa + ", " + plNumber(dose) + " " + product.jednostka + "/" + product.odniesienie + ", pole " + field.nazwa + " (" + plNumber(Math.round(dose * field.ha * 100) / 100) + " " + product.jednostka + " na całe pole)." }),
      el("p", { class: "ml-karencja" + (product.karencjaStan === "do_sprawdzenia" ? " is-unknown" : ""), text: message }),
      source ? el("p", { class: "ml-text", text: source }) : null,
      el("p", { class: "ml-text", text: "Z tego jednego wpisu aplikacja składa ewidencję oprysków do wydruku PDF i eksportu CSV lub XLSX." }),
      big("Dodaj kolejny zabieg", null, function () { taps = 1; chooseField(); }),
      el("button", { class: "ml-link", onclick: home }, "Wróć na start")
    ]);
  }
  home();
};
