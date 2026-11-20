// Prompt-Texte für Claude, wörtlich aus der Originalversion.

export const PRODUCE_LABELS = ["Definition auf Englisch (eigene Worte)", "Beispielsatz 1 · Alltag", "Beispielsatz 2 · Beruf", "Beispielsatz 3 · abstrakte Diskussion"];

// v: Definition und drei Beispielsätze
export function producePrompt(c, v) {
  const L = ["Definition auf Englisch (eigene Worte)", "Beispielsatz 1 (Alltag)", "Beispielsatz 2 (Beruf)", "Beispielsatz 3 (abstrakte Diskussion)"];
  const lines = v.map((t, i) => (i + 1) + ". " + L[i] + ": " + (t.trim() ? t : "(leer)")).join("\n");
  return "Du bist ein strenger, aber freundlicher Englisch-Prüfer (Cambridge-Niveau). Eine Person (Muttersprache Deutsch, Ziel: C2) übt den Ausdruck unten. Sie hat eine Definition in eigenen Worten und drei Beispielsätze geschrieben. Prüfe jeden Eintrag. Antworte auf Deutsch, Beispiele und Verbesserungen auf Englisch. Kein Markdown, keine Sternchen, nur einfacher Text.\n\n" +
    "Ausdruck: " + c.term + "\nKategorie: " + (c.cat || "") + (c.de ? "\nBedeutung (Deutsch): " + c.de : "") + (c.prompt ? "\nEnglische Definition: " + c.prompt : "") + (c.note ? "\nHinweise zur Karte: " + c.note : "") +
    "\n\nEinträge der Person:\n" + lines +
    "\n\nGib für jeden nicht leeren Eintrag genau diese Zeilen aus:\n" +
    "Nr. und Urteil (richtig / teilweise / falsch)\n" +
    "Grammatik und Rechtschreibung: konkrete Fehler mit Regel in einem Satz, oder 'keine Fehler'\n" +
    "Inhalt: ist der Ausdruck richtig verwendet und passt die Bedeutung?\n" +
    "Natürlichkeit und Register: klingt es idiomatisch, zu formell oder zu umgangssprachlich?\n" +
    "Niveau (Schätzung nach CEFR, B1 bis C2): wirkt der Satz auf diesem Niveau, und reicht das für C2?\n" +
    "Verbesserte Fassung: ein besserer Satz auf Englisch, der den Ausdruck beibehält.\n" +
    "Bei der Definition zusätzlich: enthält sie den Ausdruck selbst (nicht erlaubt)?\n" +
    "Am Ende: Gesamteindruck in einem Satz (stark / solide / schwach) und die wichtigste Verbesserung für das nächste Mal. Wenn du dir bei Niveau oder Register nicht sicher bist, sag es. Erfinde keine Regeln oder Quellen.";
}

export function explainPrompt(c, text) {
  return "Part 1 · Deep Meaning & Nuance\nAusdruck: " + c.term + (c.de ? " (" + c.de + ")" : "") +
    "\n\nMeine Erklärung (Bedeutung, Konnotation, Register, Unterschied zu ähnlichen Ausdrücken):\n" +
    (text ? text : "[noch nichts geschrieben]") +
    "\n\nBitte bewerte meine Erklärung, ergänze, was fehlt (Konnotation, Register, typische Kollokationen, 2 ähnliche Ausdrücke mit Unterschied) und gib mir 2 Beispielsätze. Antworte auf Deutsch, Beispiele auf Englisch.";
}
