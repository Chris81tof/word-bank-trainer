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

// Transfer: Geschichte, Sprechen, Schreiben. d ist der Entwurf (state.drafts[sub]).
export const exprLine = (c) => "- " + c.term + (c.de ? " (" + c.de + ")" : "");

export function transferPrompt(sub, d, cards) {
  const list = cards.map(exprLine).join("\n");
  if (sub === "story") {
    return "Part 10 · Storytelling Challenge (C2)\n\nIch habe diese Ausdrücke in einer Geschichte verwendet:\n" + list + "\n\nMeine Geschichte:\n" + (d.text || "[leer]") +
      "\n\nBitte prüfe: 1) Ist jeder Ausdruck korrekt und natürlich verwendet (Form, Präposition, Register)? 2) Welche klingen unnatürlich, und wie würde ein Muttersprachler es sagen? 3) Gib mir eine verbesserte Fassung. Antworte auf Deutsch, Beispiele auf Englisch. Keine langen Vorreden.";
  }
  if (sub === "speak") {
    return "Part 8 · Speaking Simulation (Cambridge C2 Proficiency, Part 3/4)\n\nFrage: " + d.task + "\n\nAusdrücke, die ich einbauen wollte:\n" + list + "\n\nMeine Stichpunkte / mein Transkript:\n" + (d.notes || "[ich füge mein Transkript im Chat ein]") +
      "\n\nBitte stelle dich als Prüfer vor, stelle mir zuerst die Frage und danach 2 Nachfragen, und bewerte meine Antworten nach Grammar and Vocabulary, Discourse Management, Pronunciation (soweit aus Text erkennbar) und Interactive Communication. Nenne, welche Ausdrücke natürlich verwendet wurden. Antworte auf Deutsch, Beispiele auf Englisch.";
  }
  return "Part 9 · Writing Task (" + d.type + ", Cambridge C2 Proficiency)\n\nAufgabe: " + d.task + "\n\nAusdrücke, die ich einbauen wollte:\n" + list + "\n\nMein Text:\n" + (d.text || "[leer]") +
    "\n\nBitte bewerte nach Content, Communicative Achievement, Organisation und Language (je 0–5, Cambridge-Skala), prüfe jeden eingebauten Ausdruck auf Korrektheit und Natürlichkeit und schlage 3 konkrete Verbesserungen vor. Antworte auf Deutsch, Beispiele auf Englisch.";
}

// Aufträge für Claude
export const CLAUDE_KINDS = [
  ["nuance", "Part 1 · Deep Meaning & Nuance"],
  ["translate", "Part 2 · Deutsche Sätze ins C2-Englisch übersetzen"],
  ["choice", "Part 4 · Native Speaker Choice (neue Aufgaben)"],
  ["error", "Part 5 · Error Detection & Repair (neue Aufgaben)"],
  ["rewrite", "Part 7 · Idiomatic Rewrite (neue Aufgaben)"],
  ["review", "Mini-Review: Ich erkläre, du korrigierst"]
];

export function claudePrompt(kind, cards) {
  const list = cards.map(exprLine).join("\n");
  switch (kind) {
    case "nuance": return "Part 1 · Deep Meaning & Nuance\n\nErkläre mir diese Ausdrücke ausführlich auf C2-Niveau:\n" + list + "\n\nFür jeden Ausdruck: Bedeutung und Konnotation, Register (informell/neutral/formell), typische Kollokationen, 2 ähnliche Ausdrücke mit dem Unterschied, 2 Beispielsätze und ein häufiger Fehler deutscher Lernender. Antworte auf Deutsch, Beispiele auf Englisch.";
    case "translate": return "Part 2 · German → C2 English\n\nBitte schreibe für jeden dieser Ausdrücke einen anspruchsvollen deutschen Satz (Alltag, Beruf oder Diskussion gemischt), den ich ins Englische übersetze und dabei den Ausdruck verwende:\n" + list + "\n\nGib mir erst nur die deutschen Sätze, nummeriert. Ich antworte mit meinen Übersetzungen, dann korrigierst du sie, nennst die beste C2-Fassung und markierst Fehler bei Kollokationen und Präpositionen. Antworte auf Deutsch.";
    case "choice": return "Part 4 · Native Speaker Choice\n\nErstelle für diese Ausdrücke je eine Multiple-Choice-Aufgabe (4 Optionen), bei der nur eine Option wie ein Muttersprachler klingt, die anderen sind typische Lernerfehler:\n" + list + "\n\nStelle die Aufgaben eine nach der anderen, warte auf meine Antwort und erkläre danach, warum die falschen Optionen unnatürlich sind. Antworte auf Deutsch, Sätze auf Englisch.";
    case "error": return "Part 5 · Error Detection & Repair\n\nSchreibe zu diesen Ausdrücken je einen Satz, der entweder korrekt ist oder einen Fehler bei dem Ausdruck enthält (falsche Präposition, falsches Verb, falsche Form):\n" + list + "\n\nIch sage, ob der Satz korrekt ist, und repariere ihn. Danach bewertest du. Stelle die Sätze einzeln. Antworte auf Deutsch, Sätze auf Englisch.";
    case "rewrite": return "Part 7 · Idiomatic Rewrite\n\nGib mir für jeden dieser Ausdrücke einen schlichten, steifen Satz, den ich mit dem Ausdruck idiomatisch auf C2-Niveau umschreibe:\n" + list + "\n\nStelle sie einzeln, bewerte meine Fassung und zeige eine Musterlösung. Antworte auf Deutsch, Sätze auf Englisch.";
    default: return "Ich erkläre dir gleich diese Ausdrücke in meinen eigenen Worten:\n" + list + "\n\nKorrigiere meine Erklärungen, ergänze Konnotation und Register und nenne Verwechslungsgefahren. Antworte auf Deutsch, Beispiele auf Englisch.";
  }
}
