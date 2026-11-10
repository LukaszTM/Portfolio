# Portfolio programistyczne — Łukasz

Strona portfolio z demonstracjami projektów działającymi w przeglądarce. Czysty HTML, CSS i JavaScript, bez budowania i bez zależności.

## Publikacja na GitHub Pages

1. Wgraj całą zawartość tego folderu do repozytorium `Portfolio` (plik `index.html` ma leżeć w katalogu głównym).
2. W repozytorium otwórz Settings → Pages i sprawdź, że źródłem jest gałąź `main` i katalog `/ (root)`.
3. Po minucie strona będzie pod adresem `https://lukasztm.github.io/Portfolio/`.

Stare adresy `mobile/`, `systems/` i `agentic/` przekierowują do nowej strony z wybraną rolą, więc wcześniej wysłane linki nadal działają.

## Co uzupełnić

- **Kontakt:** w pliku `js/main.js`, na samej górze, wpisz e-mail, adres LinkedIn i nazwę pliku CV. Puste pole oznacza, że przycisk się nie pokaże.
- **O mnie:** sekcja `id="o-mnie"` w `index.html`. Zmień albo usuń tekst według uznania.
- **BoxBox Academy:** gdy upublicznisz kod, zamień notkę o prywatnym repozytorium na link (komentarz w `index.html` pokazuje jak).

## Linki pod konkretną rolę

Strona układa projekty pod wybraną rolę. Każdy układ ma własny adres:

- `…/Portfolio/?rola=ai` – wdrożenia i automatyzacja AI
- `…/Portfolio/?rola=android` – aplikacje na Androida
- `…/Portfolio/?rola=python` – Python

## Struktura

```
index.html            treść strony
css/style.css         wygląd strony
css/demos.css         wygląd demonstracji
js/main.js            dane kontaktowe i zwrotnica (wybór roli)
js/demo-loader.js     uruchamianie demonstracji
js/demos/             osiem demonstracji, po jednej na projekt
js/data/              dane z repozytoriów: słownik Mój Łan, profile gatunków
                      Kronikarza, lista blokad Shield ADV, motywy PorządMisia
img/                  grafiki projektów
assets/favicon.svg    ikona strony
mobile/ systems/ agentic/   przekierowania ze starych adresów
audio/                siedem komunikatów głosowych z BoxBox Academy
```

## Skąd pochodzą dane w demonstracjach

| Demonstracja | Źródło |
| --- | --- |
| Mój Łan | wycinek słownika `assets/dane/slowniki.sqlite` (rejestr MRiRW, karencje z etykiet), komunikaty jak na ekranie „Zapisano” |
| BoxBox Academy | teksty i nagrania z `assets/voice`, scenariusz okrążenia przykładowy |
| Kronikarz | profile gatunków i zasady odpowiedzi z `narrator.go` |
| PorządMiś | motywy z `assets/themes/*.json`, nazwy działów z `app_pl.arb` |
| Shield ADV | lista z `assets/blocklist.txt`, dopasowanie jak w `BlockList.kt` |
| Mr.Python | zadania pierwszej lekcji z `CourseContent.kt`, sprawdzanie jak w `AnswerChecker.kt` |
| Dyżurny Ruchu | uproszczony układ torów, zasada nastawiania przebiegów jak w grze |
| Thrustmaster Train Control | strefy i klawisze z profilu `config/z-ed.json` |
