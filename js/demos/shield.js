/* Shield ADV: sprawdzanie adresu na wbudowanej liście blokad.
   Parsowanie i wyszukiwanie przeniesione z BlockList.kt, lista z assets/blocklist.txt. */
window.DEMOS.shield = function (root) {
  const CATEGORIES = {
    ads: { name: "Reklama", rating: "Niskie ryzyko", level: "low", desc: "sieć reklamowa – wyświetla natarczywe reklamy w aplikacjach." },
    tracking: { name: "Śledzenie", rating: "Średnie ryzyko", level: "mid", desc: "tracker – śledzi, co robisz w telefonie, i buduje Twój profil." },
    scam: { name: "Niebezpieczna", rating: "Wysokie ryzyko", level: "high", desc: "natarczywe reklamy, które często prowadzą do oszustw i wyłudzeń." }
  };

  function parse(text) {
    const map = {};
    let category = "ads";
    text.split("\n").forEach(function (raw) {
      let line = raw;
      const hash = line.indexOf("#");
      if (hash >= 0) { line = line.slice(0, hash); }
      line = line.trim();
      if (!line) { return; }
      if (line[0] === "[" && line[line.length - 1] === "]") {
        const key = line.slice(1, -1).trim().toLowerCase();
        if (CATEGORIES[key]) { category = key; }
        return;
      }
      const parts = line.split(/[ \t]+/).filter(Boolean);
      const domain = (parts.length === 1 ? parts[0] : parts[1]).toLowerCase().replace(/\.+$/, "");
      if (domain && domain !== "localhost" && domain.indexOf(".") !== -1) { map[domain] = category; }
    });
    return map;
  }
  /* Wpis blokuje domenę i wszystkie jej subdomeny. */
  function lookup(map, host) {
    let h = host.toLowerCase().replace(/\.+$/, "");
    while (h) {
      if (map[h]) { return { category: map[h], rule: h }; }
      const dot = h.indexOf(".");
      if (dot < 0) { return null; }
      h = h.slice(dot + 1);
    }
    return null;
  }
  function hostOf(value) {
    return value.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[\/?#:]/)[0];
  }

  const list = parse(window.SHIELD_BLOCKLIST || "");
  const size = Object.keys(list).length;
  let on = true;
  let blocked = 0;

  const power = el("button", { class: "sh-power is-on", "aria-pressed": "true", onclick: function () {
    on = !on;
    power.classList.toggle("is-on", on);
    power.setAttribute("aria-pressed", on ? "true" : "false");
    power.textContent = on ? "Ochrona włączona" : "Ochrona wyłączona";
    state.textContent = on ? "Dotknij, aby wyłączyć" : "Dotknij, aby włączyć";
  } }, "Ochrona włączona");
  const state = el("p", { class: "demo-note", text: "Dotknij, aby wyłączyć" });
  const counter = el("p", { class: "sh-counter", "aria-live": "polite", text: "Zablokowano w tej sesji: 0" });

  const input = el("input", { class: "sh-input", type: "text", "aria-label": "Adres strony", placeholder: "np. pagead2.googlesyndication.com", autocomplete: "off", spellcheck: "false" });
  const log = el("ul", { class: "sh-log", "aria-live": "polite" });
  function test(value) {
    const host = hostOf(value);
    if (!host || host.indexOf(".") === -1) { input.focus(); return; }
    const hit = lookup(list, host);
    let item;
    if (!on) {
      item = el("li", { class: "sh-row is-off" }, el("strong", { text: host }), el("span", { text: "Ochrona jest wyłączona, więc adres nie został sprawdzony." }));
    } else if (hit) {
      const cat = CATEGORIES[hit.category];
      blocked += 1;
      counter.textContent = "Zablokowano w tej sesji: " + blocked;
      item = el("li", { class: "sh-row is-" + cat.level },
        el("strong", { text: host }),
        el("span", { class: "sh-badge", text: cat.rating }),
        el("span", { text: cat.name + ": " + cat.desc }),
        hit.rule !== host ? el("span", { class: "demo-note", text: "Zadziałała reguła dla domeny " + hit.rule + ", która obejmuje też subdomeny." }) : null);
    } else {
      item = el("li", { class: "sh-row is-ok" }, el("strong", { text: host }), el("span", { class: "sh-badge", text: "Przepuszczona" }),
        el("span", { text: "Nie ma jej na wbudowanej liście. Aplikacja sprawdziłaby jeszcze listę CERT Polska i filtr AdGuard." }));
    }
    log.insertBefore(item, log.firstChild);
    while (log.children.length > 5) { log.removeChild(log.lastChild); }
    input.value = "";
  }
  const form = el("form", { class: "sh-form", onsubmit: function (event) { event.preventDefault(); test(input.value); } },
    input, el("button", { class: "btn", type: "submit" }, "Sprawdź adres"));

  const firstTracking = Object.keys(list).filter(function (d) { return list[d] === "tracking"; })[0];
  const examples = ["pagead2.googlesyndication.com", "taboola.com", firstTracking, "wikipedia.org"].filter(Boolean);
  const chips = el("div", { class: "demo-chips" }, el("span", { class: "demo-note", text: "Przykłady:" }));
  examples.forEach(function (example) {
    chips.appendChild(el("button", { class: "demo-chip", onclick: function () { test(example); } }, example));
  });

  root.appendChild(el("div", { class: "sh-top" }, el("div", null, power, state), counter));
  root.appendChild(form);
  root.appendChild(chips);
  root.appendChild(log);
  root.appendChild(el("p", { class: "demo-note", text: "Demonstracja używa tej samej wbudowanej listy co aplikacja (" + size + " domen) i tego samego sposobu dopasowania subdomen." }));
};
