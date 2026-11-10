/* Kronikarz: tryb offline. Odpowiedź narratora według proceduralAnswer z narrator.go,
   profile gatunków w js/data/kronikarz-profiles.js. */
window.DEMOS.kronikarz = function (root) {
  const data = window.KRONIKARZ;
  if (!data) { root.textContent = "Nie udało się wczytać danych gry."; return; }

  function pick(pool) { return pool.length ? pool[Math.floor(Math.random() * pool.length)] : ""; }
  function containsAny(text, words) { return words.some(function (word) { return text.indexOf(word) !== -1; }); }

  /* Kolejność sprawdzania jak w grze: obserwacja, rozmowa, walka, ruch, reszta. */
  function answer(profile, action) {
    const low = action.toLowerCase();
    let pool = profile.filler;
    let kind = "inne działanie";
    if (containsAny(low, data.words.lookWords)) { pool = profile.look; kind = "obserwacja"; }
    else if (containsAny(low, data.words.talkWords)) { pool = profile.talk; kind = "rozmowa"; }
    else if (containsAny(low, data.words.fightWords)) { pool = profile.fight; kind = "walka"; }
    else if (containsAny(low, data.words.moveWords)) { pool = profile.move; kind = "ruch"; }
    const parts = [pick(pool), pick(profile.ambient)].filter(Boolean);
    return { text: (parts.join(" ") + " " + pick(data.closing)).trim(), kind: kind };
  }

  let profile = data.profiles[0];
  const select = el("select", { class: "kr-select", id: "kr-genre", onchange: function () {
    profile = data.profiles[select.selectedIndex];
    drawPlaces();
    say("Zmieniasz świat na: " + profile.label + ". " + pick(profile.ambient) + " " + pick(data.closing), "nowy świat");
  } });
  data.profiles.forEach(function (p) { select.appendChild(el("option", { text: p.label })); });

  const places = el("ul", { class: "kr-places" });
  function drawPlaces() {
    places.textContent = "";
    [profile.socialHub, profile.edge, profile.depth].forEach(function (place) {
      places.appendChild(el("li", null, el("strong", { text: place[0] }), el("span", { text: place[1] })));
    });
  }

  const story = el("div", { class: "kr-story", "aria-live": "polite", tabindex: "0", "aria-label": "Kronika" });
  function say(text, kind, who) {
    const entry = el("p", { class: "kr-entry" + (who === "gracz" ? " is-player" : "") }, text);
    if (kind) { entry.appendChild(el("span", { class: "kr-kind", text: "Rozpoznano: " + kind })); }
    story.appendChild(entry);
    story.scrollTop = story.scrollHeight;
  }

  const input = el("input", { class: "kr-input", type: "text", "aria-label": "Co robisz?", placeholder: "Co robisz? np. Rozglądam się po okolicy", autocomplete: "off" });
  function act(text) {
    const action = text.trim();
    if (!action) { input.focus(); return; }
    say(action, null, "gracz");
    const reply = answer(profile, action);
    say(reply.text, reply.kind);
    input.value = "";
  }
  const form = el("form", { class: "kr-form", onsubmit: function (event) { event.preventDefault(); act(input.value); } },
    input, el("button", { class: "btn", type: "submit" }, "Wyślij"));

  const chips = el("div", { class: "demo-chips" });
  ["Rozglądam się po okolicy", "Pytam o drogę", "Idę dalej, ostrożnie", "Dobywam broni"].forEach(function (text) {
    chips.appendChild(el("button", { class: "demo-chip", onclick: function () { act(text); } }, text));
  });

  root.appendChild(el("div", { class: "kr-top" },
    el("label", { for: "kr-genre", text: "Gatunek świata" }), select));
  root.appendChild(el("p", { class: "demo-note", text: "Miejsca, które gra dopisuje do Kroniki w tym gatunku:" }));
  root.appendChild(places);
  root.appendChild(story);
  root.appendChild(form);
  root.appendChild(chips);
  root.appendChild(el("p", { class: "demo-note", text: "To tryb offline: silnik rozpoznaje rodzaj działania i dobiera narrację do gatunku. W grze tę rolę może przejąć Claude, OpenAI albo lokalny model Bielik." }));
  drawPlaces();
  say(pick(profile.ambient) + " " + pick(data.closing), null);
};
