// Übungsarten: Name, Übungsstufe, geschätzte Minuten je Karte und welche Daten eine Karte dafür braucht.
// Wie weit eine Übung den Lernstand hebt, steht in srs.js (CAP).

export const cue = (c) => c.de || c.prompt || "";
export const ans0 = (c) => (c.answer || "").split("|")[0];
export const hasGap = (c) => !!(c.sentence && c.answer);
export const hasWrong = (c) => Array.isArray(c.wrong) && c.wrong.length >= 3;

export const LEVELS = { 1: "Stufe 1 · Verstehen", 2: "Stufe 2 · Erkennen", 3: "Stufe 3 · Abrufen", 4: "Stufe 4 · Prüfen", 5: "Stufe 5 · Anwenden" };

export const MODES = {
  meaning: {
    label: "Bedeutung", lv: 1, est: 0.5,
    need: (c, cards) => !!cue(c) && cards.filter(cue).length >= 4,
    desc: "Stufe 1 · Part 1: Wähle die richtige Bedeutung. Gut für den ersten Kontakt. Zählt bis Stufe 1."
  },
  cards: {
    label: "Karteikarten", lv: 1, est: 0.5,
    need: (c) => !!c.term,
    desc: "Stufe 1 · Erst überlegen, dann umdrehen und dich selbst bewerten. Zählt bis Stufe 2."
  },
  explain: {
    label: "Erklären", lv: 1, est: 2,
    need: (c) => !!(c.de || c.prompt),
    desc: "Stufe 1 · Part 1: Erkläre Bedeutung, Konnotation, Register und Unterschiede zu ähnlichen Ausdrücken. Selbstbewertung, optional mit Prompt für Claude. Zählt bis Stufe 2."
  },
  choice: {
    label: "Auswahl", lv: 2, est: 0.6,
    need: (c) => hasGap(c) && hasWrong(c),
    desc: "Stufe 2 · Part 4: Welche Option klingt im Satz natürlich? Zählt bis Stufe 1."
  },
  gap: {
    label: "Lückentext", lv: 3, est: 1,
    need: hasGap,
    desc: "Stufe 3 · Part 6 im Kleinen: Das fehlende Wort selbst eintippen."
  },
  translate: {
    label: "Übersetzen", lv: 3, est: 1,
    need: (c) => !!cue(c),
    desc: "Stufe 3 · Part 2: Wie heißt die Wendung auf Englisch? Bedeutung auf Deutsch, du tippst den Ausdruck."
  },
  error: {
    label: "Fehlersuche", lv: 4, est: 0.8,
    need: (c) => hasGap(c) && hasWrong(c),
    desc: "Stufe 4 · Part 5: Ist der Satz korrekt? Wenn nicht, tippst du die Korrektur ein."
  },
  rewrite: {
    label: "Umformulieren", lv: 5, est: 2,
    need: (c) => hasGap(c) && !!c.plain,
    desc: "Stufe 5 · Part 7: Formuliere den schlichten Satz mit dem Ausdruck auf C2-Niveau um. Selbstbewertung."
  },
  produce: {
    label: "Satz schreiben", lv: 5, est: 3,
    need: (c) => !!c.term,
    desc: "Stufe 5 · Part 3: Definition auf Englisch und drei eigene Beispielsätze (Alltag, Beruf, abstrakte Diskussion)."
  },
  // Texte arbeiten nicht mit einer Kartenrunde, sondern mit ganzen Lückentexten (exercises/cloze.js).
  cloze: {
    label: "Texte", lv: 5, est: 6, text: true,
    need: () => false,
    desc: "Stufe 5 · Part 6: Zeitung, Essay, Interview und mehr mit mehreren Lücken. Vorgeschlagen werden die Texte, die zu deinem Lernstand passen."
  }
};

// Reihenfolge im Tagesplan: von leicht zu schwer
export const ORDER = ["meaning", "choice", "gap", "translate", "error", "rewrite", "produce", "cards", "explain"];
