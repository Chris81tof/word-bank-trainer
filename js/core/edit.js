// Karten bearbeiten: prüfen und speichern.
// Karten aus data/cards.json bleiben unverändert; ihre Korrektur steht pro ID in state.fixes (nur geänderte Felder).
// Eigene Karten (u01 …) werden direkt geändert. Die ID und der Lernstand bleiben immer erhalten.
import { REG, REGION } from "./cards.js";
import { cleanFix } from "./state.js";
import { hintLeaks } from "./hints.js";

export const LEVEL_NAMES = { "": "Keine Einschätzung", core: "Vorschlag: sicher A1–B1", edge: "Grenzfall B1/B2" };
const str = (v) => (typeof v === "string" ? v.trim() : "");
const lines = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map(str).filter(Boolean);

export const isCustom = (id) => /^u\d+$/.test(id);
export const isEdited = (state, id) => !!(state.fixes && state.fixes[id]);

// Niveau-Einschätzung (core, edge oder ""): eigene Karten tragen sie selbst, Startkarten eine Korrektur oder levels.json.
export function levelOf(levels, state, card) {
  if (isCustom(card.id)) return card.level || "";
  const fix = state.fixes && state.fixes[card.id];
  if (fix && "level" in fix) return fix.level;
  return levels.core.includes(card.id) ? "core" : levels.edge.includes(card.id) ? "edge" : "";
}

// Werte fürs Formular
export function formValues(levels, state, card) {
  return {
    term: card.term || "", alt: (card.alt || []).join("\n"), de: card.de || "", prompt: card.prompt || "",
    sentence: card.sentence || "", answer: card.answer || "", note: card.note || "", cat: card.cat || "",
    reg: card.reg || "", region: card.region || "", hint: card.hint || "", level: levelOf(levels, state, card)
  };
}

// Prüft das Formular. card: die Karte vor der Änderung, others: alle anderen Karten (gegen doppelte Ausdrücke).
// Gibt { fields, errors } zurück; errors sind deutsche Meldungen.
export function checkEdit(card, form, others = []) {
  const errors = [];
  const f = {
    term: str(form.term), alt: lines(form.alt), de: str(form.de), prompt: str(form.prompt), sentence: str(form.sentence),
    answer: str(form.answer), note: str(form.note), cat: str(form.cat), reg: str(form.reg), region: str(form.region), hint: str(form.hint), level: str(form.level)
  };
  if (!f.term) errors.push("Der Ausdruck darf nicht leer sein.");
  else if (others.some((o) => o.id !== card.id && o.term.toLowerCase() === f.term.toLowerCase())) errors.push(`„${f.term}“ gibt es schon als andere Karte.`);
  if (!f.cat) errors.push("Bitte eine Kategorie wählen.");
  if (!f.de && !f.prompt) errors.push("Es fehlt eine Bedeutung (Deutsch oder Englisch).");
  if (f.reg && !REG[f.reg]) errors.push("Dieses Register gibt es nicht.");
  if (f.region && !REGION[f.region]) errors.push("Diese Region gibt es nicht.");
  if (!(f.level in LEVEL_NAMES)) errors.push("Diese Niveau-Einschätzung gibt es nicht.");
  // Bei Karten mit Satz bleibt der Satz Pflicht, sonst hätten Lückenübungen nichts zu fragen.
  if (f.sentence || card.sentence) {
    const gaps = f.sentence.split("____").length - 1;
    if (!f.sentence) errors.push("Der Beispielsatz fehlt. Er braucht genau eine Lücke aus vier Unterstrichen (____).");
    else if (gaps !== 1 || f.sentence.replace("____", "").includes("_")) errors.push("Der Satz braucht genau eine Lücke aus vier Unterstrichen (____).");
    if (!f.answer) errors.push("Die Lösung für die Lücke fehlt.");
    else {
      const parts = f.answer.split("|").map((a) => a.trim());
      if (parts.some((a) => !a)) errors.push("Eine der Lösungen ist leer. Mehrere Lösungen trennst du mit einem einzelnen |.");
      else if (parts.some((a) => a.includes("____") || a.includes("\n"))) errors.push("Die Lösung muss ein Wort oder eine Wortgruppe sein, die in die Lücke passt, ohne ____.");
      else {
        const clash = (card.wrong || []).find((w) => parts.some((a) => a.toLowerCase() === w.toLowerCase()));
        if (clash) errors.push(`„${clash}“ ist als falsche Option hinterlegt und kann nicht zugleich die Lösung sein.`);
      }
      f.answer = parts.join("|");
    }
  } else f.answer = "";
  if (f.hint && hintLeaks({ hint: f.hint, answer: f.answer, term: f.term })) errors.push("Der eigene Hinweis verrät die Lösung. Formuliere ihn so, dass er nur in die Richtung zeigt.");
  return { fields: f, errors };
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Welche Felder weichen von der Originalkarte ab? Gibt eine Korrektur oder null zurück.
export function diffFix(orig, origLevel, f) {
  const fix = {};
  for (const k of ["cat", "term", "de", "prompt", "sentence", "answer", "note", "reg", "region", "hint"]) if (f[k] !== (orig[k] || "")) fix[k] = f[k];
  if (!sameList(f.alt, orig.alt || [])) fix.alt = f.alt;
  if (f.level !== origLevel) fix.level = f.level;
  return cleanFix(fix);
}

// Speichert die Änderung. base: Karten aus data/, levels: data/levels.json.
// Gibt { errors } oder { ok: true } zurück. Der Lernstand (state.progress) wird nicht berührt.
export function saveEdit(state, base, levels, allCardsNow, id, form) {
  const card = allCardsNow.find((c) => c.id === id);
  if (!card) return { errors: ["Diese Karte gibt es nicht mehr."] };
  const { fields: f, errors } = checkEdit(card, form, allCardsNow);
  if (errors.length) return { errors };
  if (isCustom(id)) {
    const i = state.custom.findIndex((c) => c.id === id);
    if (i < 0) return { errors: ["Diese Karte gibt es nicht mehr."] };
    const next = { ...state.custom[i], cat: f.cat, term: f.term, de: f.de, prompt: f.prompt, sentence: f.sentence, answer: f.answer };
    for (const [k, v] of [["note", f.note], ["reg", f.reg], ["region", f.region], ["hint", f.hint], ["level", f.level]]) if (v) next[k] = v; else delete next[k];
    if (f.alt.length) next.alt = f.alt; else delete next.alt;
    state.custom[i] = next;
    return { ok: true };
  }
  const orig = base.find((c) => c.id === id);
  if (!orig) return { errors: ["Diese Karte gibt es nicht mehr."] };
  const origLevel = levels.core.includes(id) ? "core" : levels.edge.includes(id) ? "edge" : "";
  const fix = diffFix(orig, origLevel, f);
  if (!state.fixes) state.fixes = {};
  if (fix) state.fixes[id] = fix; else delete state.fixes[id];
  return { ok: true };
}

// Verwirft die Korrektur einer Startkarte.
export function restoreOriginal(state, id) {
  if (!state.fixes || !state.fixes[id]) return false;
  delete state.fixes[id];
  return true;
}
