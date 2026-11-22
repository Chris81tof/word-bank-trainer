# Umbauplan: Word Bank Trainer als Web-App

Stand: 19.11.2026. Ausgangspunkt ist `alt-word-bank-trainer.html` (2.775 Zeilen, 278 Karten, 18 Lückentexte).

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Lernstand | Neustart. Aus dem Export vom 19.11. werden die Einstellungen übernommen (60 Min/Tag, 20 neue Karten), ein Fortschritt ist darin nicht enthalten. Der Import alter Dateien bleibt trotzdem möglich. |
| Neue Karten | Ein Formular in der App und ein Knopf „Prompt kopieren“: Claude liefert Karten als JSON, die in der App eingefügt oder in `data/cards.json` übernommen werden. |
| Leicht-Filter | Bleibt („Vorschlag: sicher A1–B1“ und „Grenzfall B1/B2“). |
| Quizlet-Import | Fällt weg. |
| Stufe 5, Texte | Zu den 18 alten kommen rund 45 neue, sodass jede Karte in mindestens einem Text vorkommt. Die Auswahl richtet sich nach dem Lernstand. Neue Texte kommen über Prompt und Import. |
| Wiederholung | 6 Stufen: 1, 3, 7, 14, 30, 60 Tage. Mastered ab Stufe 4. |
| KI | Keine im Code. Die eingebaute Claude-Prüfung bei „Satz schreiben“ entfällt, der Prompt zum Kopieren bleibt. |
| Prüfungstermin | Noch keiner. Der Tagesplan richtet sich nach Zeitbudget und Zahl der neuen Karten. |
| Design | „Wörterbuch“: cremefarbenes Papier, Tintenschwarz, rote Akzente, Serifenschrift, Kategorien in Kapitälchen. Dunkelmodus nach Systemeinstellung. |
| Navigation | Unten eine Leiste mit 5 Reitern: Heute, Üben, Transfer, Statistik, Sammlung. Passiv steckt unter Üben. Auf breiten Bildschirmen eine Seitenleiste. |
| Veröffentlichung | Öffentliches Repository `Chris81tof/word-bank-trainer`, GitHub Pages über Actions. Es wird erst am Ende und nach Rückfrage angelegt. |

## Was erhalten bleibt

- **Übungen:**
  - Stufe 1: Bedeutung, Karteikarten, Erklären
  - Stufe 2: Auswahl
  - Stufe 3: Lückentext, Übersetzen
  - Stufe 4: Fehlersuche
  - Stufe 5: Umformulieren, Satz schreiben, Texte
- **Transfer:** Geschichte, Sprechen mit Timer, Schreiben, Aufträge für Claude.
- **Weitere Bereiche:**
  - Tagesplan mit Zeitbudget und neuen Karten pro Tag
  - Passiv-Durchlauf mit Vorlesen
  - Statistik
  - Sammlung mit Suche, eigenen Karten, Entfernen, Sicherung und Zurücksetzen
- **Erkennen eingebauter Ausdrücke:** unregelmäßige Formen (`IRR`, `forms`), damit eingebaute Ausdrücke auch in gebeugter Form gefunden werden.
- **Alle Prompt-Texte für Claude**, wörtlich übernommen.

## Dateistruktur

```
index.html, manifest.webmanifest, sw.js
icons/, fonts/
css/      tokens.css, base.css, components.css
data/     cards.json, texts.json, tasks.json, levels.json
js/
  main.js
  core/   dom, dates, state, srs, backup, match (Formen, Ausdruck erkennen),
          plan (Tagesplan), texts (Auswahl, Import), speech, prompts
  views/  today, practice, passive, transfer, stats, library, settings
  exercises/ meaning, cards, explain, choice, gap, translate, error,
             rewrite, produce, cloze
tests/    srs.test.mjs, backup.test.mjs, data.test.mjs, texts.test.mjs, match.test.mjs
scripts/  extract-old.mjs (einmalig: Daten aus der alten Datei holen)
.github/workflows/pages.yml
```

## Datenformat Lernstand (v2)

```json
{
  "app": "word-bank-trainer", "format": 2, "exported": "…",
  "progress": { "s01": { "box": 0, "due": 0, "seen": 0, "right": 0, "wrong": 0, "hinted": 0, "first": 0, "last": 0, "ms": {} } },
  "custom": [ /* eigene Karten, gleiches Format wie data/cards.json */ ],
  "deleted": [ "f33" ],
  "fixes": { "s01": { "de": "…", "reg": "s", "region": "us", "hint": "…", "level": "edge" } },
  "texts": [ /* importierte Lückentexte */ ],
  "textLog": { "c1": 20410 },
  "drafts": {},
  "prefs": { "budget": 60, "newPerDay": 20, "speak": true, "voice": "", "rate": 0.92 }
}
```

Import des alten Formats (`format: 1`):
- Der Fortschritt wird je ID übernommen.
- Karten, die es in `data/cards.json` nicht gibt, werden zu eigenen Karten.
- Alte Stufe 3 (Mastered) wird zu neuer Stufe 4, das Fälligkeitsdatum bleibt erhalten.

## Stufe 5: Textvorrat

- **Auswahl:** Jeder Text bekommt eine Punktzahl.
  - Für jede Lücke zählt das Gewicht der Karte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, und +2, wenn sie fällig ist.
  - Davon geht ein Abzug ab, wenn der Text in den letzten 14 Tagen bearbeitet wurde.
  - Vorgeschlagen werden die besten 6 Texte. Frei wählbar bleibt jeder.
- **„Prompt kopieren“** stellt einen Auftrag zusammen:
  - Liste der gewählten Karten mit ID, Wendung, Bedeutung und Beispiel-Lösung,
  - Textsorte, Länge und Anzahl der Lücken,
  - das genaue JSON-Format der Antwort.
- **Import:** Die Antwort wird eingefügt und geprüft (Karten vorhanden, Zahl der Lücken stimmt, Platzhalter vollständig). Danach wird der Text im Lernstand gespeichert und kommt mit in den Export.

## Sprachausgabe

- **Automatische Wahl:**
  - Bevorzugt werden englische Stimmen in der Qualität „Premium“ oder „Enhanced“ (en-GB vor en-US vor anderem Englisch), dann bekannte gute Stimmen (Daniel, Kate, Serena, Arthur, Martha …).
  - Stimmen in Neuer Qualität lädt iOS unter Einstellungen › Bedienungshilfen › Gesprochene Inhalte herunter. Ein Hinweis dazu steht in der App.
- **Einstellungen:** Liste aller englischen Stimmen mit Probe-Knopf, dazu das Sprechtempo.
- Safari meldet die Stimmen verzögert (`voiceschanged`). Das wird berücksichtigt, wie in der Spanisch-App.

## Schritte (je ein Commit)

**Alle Schritte 0 bis 12 sind fertig.** Die App ist veröffentlicht (Schritt 12 noch nicht hochgeladen).

0. Projektregeln, Plan, Git ✔
1. **Daten auslagern:** Ein Skript holt SEED, EXTRA, PASSAGES, SPEAK, WRITE und die Level-Listen aus der alten Datei nach `data/`. Danach kommen die Datentests. ✔
2. **Kern:** state, srs (6 Stufen), backup (Import alt und neu), match, mit Tests. ✔
3. **Grundgerüst und Navigation:** Reiter, Tagesplan, Übungen der Stufen 1 bis 4. ✔
4. **Stufe 5:** Umformulieren, Satz schreiben, Texte mit Auswahl nach Lernstand, Prompt und Import. ✔
5. **Weitere Bereiche:** Transfer, Passiv, Statistik, Sammlung mit Formular und Karten-Prompt. ✔
6. **Sprachausgabe** mit automatischer Stimmenwahl und Auswahl. ✔
7. **Design** „Wörterbuch“, iPhone-Feinschliff. ✔
8. **Offline:** Web-App, Icons, Schriften. ✔
9. **Textvorrat:** rund 45 neue Lückentexte, geprüft durch die Datentests. ✔ (45 neue, zusammen 63; jede Karte kommt vor)
10. **Veröffentlichung:** GitHub-Repository, Actions mit Tests, Pages. Nur nach Rückfrage. (Workflow `.github/workflows/pages.yml` ist angelegt; veröffentlicht unter https://chris81tof.github.io/word-bank-trainer/.) ✔
11. **Karten bearbeiten:** ✔
    - Stift-Symbol auf jeder Karte in allen Übungen, im Passiv-Durchlauf und in der Sammlung. Wer es vor der Antwort öffnet, überspringt die Karte (nichts wird verbucht); nach dem Speichern geht die Übung mit der korrigierten Karte weiter.
    - Bearbeitbar: Ausdruck, weitere Schreibweisen (`alt`), Deutsch, englische Erklärung, Satz mit Lücke, Lösung, Notiz, Kategorie, Register, regionaler Gebrauch, Niveau-Einschätzung.
    - Register: informal, formal, neutral, dated, colloquial, slang. Region (optional): British, American, Australian, Canadian, Irish, New Zealand, South African English; keine Angabe = allgemein gebräuchlich.
    - Prüfungen beim Speichern: genau eine Lücke `____`, Lösung vorhanden und ohne leere Teile, nicht zugleich falsche Option, Ausdruck nicht leer und nicht doppelt.
    - Speicherung: Korrektur pro Karten-ID in `fixes` (nur geänderte Felder), Kartendatei unverändert; eigene Karten werden direkt geändert. „Original wiederherstellen“, Filter „Bearbeitet“ und Markierung in der Sammlung. Korrekturen sind Teil der Sicherung.
    - **Gestufte Hinweise** (zweite Funktion in diesem Schritt): Knopf „Hinweis“ bei Lückentext, Übersetzen, Umformulieren und in den Texten pro Lücke. Stufe 1 Kategorie und Gerüst (z. B. „Phrasal verb, 2 Wörter: _ _ _ _  _ _ _ _“) mit eigenem Hinweis, Stufe 2 Anfangsbuchstaben, Stufe 3 Auswahl aus 4 Optionen (Ablenker der Karte, sonst Ausdrücke derselben Kategorie), danach „Lösung zeigen“.
    - Bewertung: richtig ohne Hinweis steigt auf wie bisher; richtig mit Hinweis bleibt auf der Stufe und ist morgen wieder fällig; „Lösung zeigen“ ist falsch. Die Statistik zeigt, wie oft Karten mit Hinweis gelöst wurden (`hinted`).
    - Neues optionales Kartenfeld `hint` („Eigener Hinweis“), im Bearbeiten-Formular änderbar; ein Hinweis, der die Lösung verrät, wird beim Speichern abgelehnt.
    - Regel für die Übernahme in die Kartendatei: siehe CLAUDE.md. Offen: `plain` (schlichte Fassung) ist nicht bearbeitbar und kann nach einer Satzänderung veraltet sein.

12. **Sammlung übersichtlicher:** ✔
    - **Werkzeuge** (Eigene Karte anlegen, Neue Karten von Claude, Sichern und Wiederherstellen, Zurücksetzen) stehen als zugeklappte Bereiche direkt unter dem Titel, oberhalb der Liste. Es ist immer nur einer offen. Zurücksetzen und Einspielen behalten die Zwei-Tipp-Sicherung.
    - **Kartenliste:** eine Zeile pro Karte mit Kategoriesymbol, Ausdruck und Lernstand („Neu“, „Stufe 2“, „Problematic“, „Mastered“). Antippen klappt die Details auf (Bedeutung, Satz, Notiz, Register, Niveau, Fälligkeit, Bearbeiten, Entfernen); es ist immer nur eine Karte aufgeklappt, und nach dem Bearbeiten steht sie wieder aufgeklappt in der Liste.
    - **Angepinnte Leiste** beim Scrollen: Suchfeld, Filter nach Kategorie, Filter nach Lernstand (Neu, Developing, Problematic, Mastered, Heute fällig; dazu die Einschätzungen A1–B1, B1/B2, „Beides“ und „Bearbeitet“) und die Anzahl. Im flachen Querformat steht alles in einer Zeile (60 Pixel) und die Seite nutzt die volle Breite.
    - **Auswählen** ist ein eigener Modus (Knopf rechts neben der Suche): Kästchen erscheinen, darunter „Alle“, „Keine“ und „Entfernen“ (Zwei-Tipp). Außerhalb des Modus bleibt die Liste ruhig.
    - **Nachladen:** 50 Karten pro Abschnitt, die nächsten laden beim Scrollen nach (IntersectionObserver), dazu der Knopf „50 weitere Karten laden“. Getestet mit 578 Karten: Neuzeichnen rund 10 ms.
    - Alle Tippflächen mindestens 44 Pixel (geprüft bei 320, 390 und 844 Pixel Breite, kein seitliches Überlaufen).
    - **Code:** Die Logik (Filter, Suche, Nachladen, Aufklappen) steht in `js/core/library.js` und ist getestet (`tests/library.test.mjs`, 17 Tests); `js/views/library.js` zeichnet nur. `sw.js` Version 4.
    - Geändert gegenüber vorher: Der Leicht-Filter („Vorschlag: A1–B1“, „Grenzfall B1/B2“) liegt jetzt im Lernstand-Filter unter „Einschätzung“; der Hinweistext dazu steht in den Details der Karte. Die Kästchen zum Entfernen erscheinen nur im Auswahlmodus.

## Offene Punkte

- 112 Karten (p01–p19, r01–r47, t01–t46) haben keine englische Erklärung (`prompt`). Sie könnten zusammen mit Schritt 9 ergänzt werden.

- Node.js für die Tests: Homebrew ist nicht installiert. Eine Lösung steht noch aus.
- Schriften: Source Serif 4 (SIL Open Font License) liegt seit Schritt 8 in `fonts/`. ✔
