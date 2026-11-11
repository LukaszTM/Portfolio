# Portfolio programistyczne — Łukasz Kap

Wielostronicowe portfolio do publikacji na GitHub Pages. Zachowuje adresy poprzedniej wersji
(`mobile/`, `systems/`, `agentic/` oraz kotwice `#projekty`, `#dowody`, `#ai`).

## Strony

- `index.html` — start: wybór roli i siedem projektów.
- `mobile/`, `systems/`, `agentic/` — trzy role, każda z wybranymi projektami.
- `projekty/` — lista projektów; każdy projekt ma własną stronę z działającym demem:
  `moj-lan`, `boxbox-academy`, `porzadmis`, `dyzurny-ruchu`, `thrustmaster-simrail`, `shield-adv`, `mr-python`.
- `pytania/` — pytania rekrutera i kontakt.

## Zasoby

- `assets/css/site.css` — jeden arkusz stylów, motyw jasny i ciemny.
- `assets/js/common.js` — wspólne funkcje; pozostałe pliki to dema poszczególnych projektów.
- `assets/js/monza-data.js` — dane z nagrania `monza-trening_2026-10-26` (tor jazdy, prędkość, komunikaty).
- `assets/js/blocklist-data.js` — wbudowana lista domen z aplikacji Shield ADV.
- `assets/js/mojlan-data.js` — obowiązki i współczynniki z pliku `reguly_prawne.json` aplikacji Mój Łan.
- `assets/img`, `assets/audio` — zrzuty z działających programów i klipy głosu mechanika.

## Publikacja

1. Repozytorium: `https://github.com/LukaszTM/Portfolio`.
2. Prześlij zawartość tego folderu do katalogu głównego gałęzi `main`.
3. Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
4. Adres: `https://lukasztm.github.io/Portfolio/`.

Strona nie wymaga budowania ani serwera: to statyczne pliki HTML, CSS i JS.
Liczby i logi pochodzą z repozytoriów, stan na 10 listopada 2026.
