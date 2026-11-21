# Word Bank Trainer – Projektregeln

Lern-App für die Cambridge C2 Proficiency (CPE), Teil Use of English: Collocations, Phrasal Verbs, Word Formation, Idioms. Läuft als Web-App auf GitHub Pages, vor allem auf dem iPhone (Home-Bildschirm, offline).

Der Umbauplan steht in `UMBAUPLAN.md`. Die Originalversion ist `alt-word-bank-trainer.html` (ein Claude-Artefakt). Sie dient nur als Quelle und wird nicht verändert.

## Zusammenarbeit

- Antworten und Erklärungen auf Deutsch. Der Nutzer lernt Claude Code: Jeden Schritt kurz erklären (was und warum), ohne lange Vorträge.
- In kleinen Schritten arbeiten, ein Commit pro Schritt, mit deutscher Commit-Nachricht („Schritt 3: Übungen Stufe 1 bis 4“).
- Vor dem ersten Push, dem Anlegen des GitHub-Repositorys und jeder Veröffentlichung ausdrücklich nachfragen.
- Rückfragen gebündelt stellen, mit Vorschlag.

## Technik

- Kein Build-Schritt und keine Laufzeit-Abhängigkeiten: reines HTML, CSS und JavaScript als ES-Module.
- **Keine KI im Code:** kein API-Schlüssel, kein Aufruf von `window.claude`. Wo Claude helfen soll, erzeugt die App einen Prompt zum Kopieren. Die Antwort fügt der Nutzer wieder in die App ein.
- **Daten getrennt vom Code:**
  - `data/cards.json`: alle Karten.
  - `data/texts.json`: Lückentexte für Stufe 5.
  - `data/tasks.json`: Sprech- und Schreibaufgaben.
- Die Karten-IDs (`s01`, `g12`, `p03` …) ändern sich nie, denn der Lernstand hängt daran. Neue Karten bekommen neue IDs, und keine ID wird wiederverwendet.
- Der Lernstand liegt im `localStorage` unter dem Schlüssel `word-bank-trainer-v2`. Er enthält nur den Fortschritt je Karten-ID, eigene Karten, Korrekturen (`fixes`), importierte Texte und die Einstellungen, nicht die Karten aus `data/`.
- Der Import liest das neue Format und das alte Format (`"app": "word-bank-trainer"`, `"format": 1`, Schlüssel `kollokations-trainer-v1`).
- Offline-Betrieb über `sw.js`. Bei jeder Änderung an ausgelieferten Dateien die Versionsnummer in `sw.js` erhöhen. Neue Dateien in die Liste `FILES` in `sw.js` eintragen (ein Test prüft das). Auf `localhost` wird der Service Worker nur mit `?sw` registriert.
- Schriften und Icons liegen im Projekt, es werden keine externen Ressourcen geladen.

## Lernlogik (nicht ohne Rückfrage ändern)

- 6 Stufen mit den Abständen `INTERVALS = [0, 1, 3, 7, 14, 30, 60]` Tage. Ab Stufe 4 gilt eine Karte als „Mastered“.
- Obergrenzen je Übung:
  - Bedeutung und Auswahl: höchstens Stufe 1.
  - Karteikarten und Erklären: höchstens Stufe 2.
  - Alle anderen Übungen: bis Stufe 6.
- Wenn eine Karte richtig beantwortet wird, ihre Stufe aber schon an der Grenze der Übung liegt, wird sie nach dem Abstand ihrer aktuellen Stufe wieder fällig.
- Fehler: Die Karte fällt auf Stufe 0 zurück und ist heute wieder fällig. Bei Bedeutung und Auswahl fällt sie nur um eine Stufe.
- Nur aktive Übungen verändern den Lernstand, der Passiv-Durchlauf nicht.

## Inhalte

- Englische Inhalte in britischem Englisch (Cambridge), die Oberfläche auf Deutsch.
- Jede Karte braucht:
  - `id`, `cat`, `term`, `de`,
  - `prompt` (englische Erklärung; darf vorerst leer sein, bei 112 alten Karten fehlt sie noch),
  - `sentence` mit genau einer Lücke `____`,
  - `answer` (mehrere Lösungen mit `|` getrennt),
  - `wrong` (3 falsche Optionen), `plain` (schlichte Fassung des Satzes), `reg` (Register: `i` informal, `f` formal, `n` neutral, `d` dated, `c` colloquial, `s` slang; Bezeichnungen auf Englisch).
  - `region` (regionaler Gebrauch, nur wenn die Wendung regional ist: `gb`, `us`, `au`, `ca`, `ie`, `nz`, `za`; fehlt sie, gilt die Wendung als allgemein gebräuchlich) ist optional.
  - `note` und `alt` (Liste weiterer Schreibweisen der Wendung, damit sie in Texten erkannt wird) sind optional.
  - Eigene Karten aus der App haben IDs `u01`, `u02` …; sie brauchen `wrong`, `plain` und `reg` nicht, dann entfallen Auswahl, Fehlersuche und Umformulieren für sie.
- Lückentexte: Platzhalter `{1}` bis `{n}` im Text, dazu `gaps` mit `[kartenId, lösung]` in derselben Reihenfolge. Jede Karten-ID muss existieren.
- Nach jeder Datenänderung die Tests laufen lassen, denn sie prüfen genau diese Regeln.

## Korrekturen an Karten

- Die App kann jede Karte bearbeiten (Stift-Symbol). Änderungen an Karten aus `data/cards.json` liegen als Korrektur pro Karten-ID in `fixes` im Gerätespeicher (nur die geänderten Felder, dazu `level` für die Niveau-Einschätzung). Die Datei selbst bleibt unverändert, ID und Lernstand bleiben erhalten. Eigene Karten (`u…`) werden direkt geändert.
- **Bei der Übernahme einer Sicherung werden die Korrekturen fest in die Kartendatei übernommen** (`data/cards.json`, und `data/levels.json` für `level`). Die IDs bleiben gleich. Danach werden die Korrekturen im Gerätespeicher gelöscht (Sicherung mit leerem `fixes` neu einspielen oder in der Sammlung „Original wiederherstellen“). Danach `sw.js` hochzählen und die Tests laufen lassen.

## Tests

- `node --test` startet alle Tests in `tests/`, ohne zusätzliche Pakete.
- Lokal ansehen: `node scripts/serve.mjs` (Port 8123, verbietet dem Browser das Zwischenspeichern).
- Die Tests decken die Lernlogik, den Import alter Lernstände und die Prüfung der Daten ab.
- GitHub Actions führt die Tests bei jedem Push aus. Veröffentlicht wird nur, wenn sie bestehen.
