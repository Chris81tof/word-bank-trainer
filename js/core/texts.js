// Stufe 5 · Texte: Auswahl nach Lernstand, Prompt für neue Texte und Import der Antwort.
import { categoryOf } from "./srs.js";
import { ans0 } from "./modes.js";

export const RECENT_DAYS = 14;
export const SUGGEST = 6;
export const KINDS = ["Zeitungsartikel", "Essay", "Interview", "Bericht", "Rezension", "Brief", "Rede", "Blogbeitrag"];

// Gewicht einer Karte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, fällig +2
export function cardWeight(p, day) {
  const k = categoryOf(p);
  let w = k === "problem" ? 5 : k === "developing" ? 3 : k === "new" ? 1.5 : 1;
  if (p && p.seen && p.due <= day) w += 2;
  return w;
}

// Punktzahl eines Textes: Summe der Gewichte seiner Lücken, abzüglich eines Abzugs,
// der vom Tag der Bearbeitung über 14 Tage auf null sinkt. Fehlende Karten zählen nicht.
export function textScore(t, progress, textLog, day, known) {
  let s = 0;
  for (const [id] of t.gaps) if (!known || known.has(id)) s += cardWeight(progress[id], day);
  const last = textLog[t.id];
  if (typeof last === "number" && day - last < RECENT_DAYS) s -= (10 * (RECENT_DAYS - (day - last))) / RECENT_DAYS;
  return s;
}

export function suggestTexts(texts, state, day, known, n = SUGGEST) {
  return texts
    .map((t) => ({ t, score: textScore(t, state.progress, state.textLog, day, known) }))
    .sort((a, b) => b.score - a.score || String(a.t.id).localeCompare(String(b.t.id)))
    .slice(0, n);
}

// Wie oft jede Karte in einem Text vorkommt
export function coverage(texts) {
  const m = new Map();
  for (const t of texts) for (const [id] of t.gaps) m.set(id, (m.get(id) || 0) + 1);
  return m;
}

// Karten für einen neuen Text: nach Gewicht gezogen; Karten ohne Text bekommen +3.
export function pickCards(cards, state, texts, day, n, rand = Math.random) {
  const cov = coverage(texts);
  const pool = cards.filter((c) => c.term && c.answer).map((c) => ({
    c, w: cardWeight(state.progress[c.id], day) + (cov.get(c.id) ? 0 : 3)
  }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = rand() * pool.reduce((s, x) => s + x.w, 0);
    let i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].c);
  }
  return out;
}

export function textPrompt(cards, { kind, words }) {
  const list = cards.map((c) => `- ${c.id} · ${c.term} · ${c.de || c.prompt || ""} · Beispiel-Lösung: ${ans0(c)}`).join("\n");
  return "Schreib mir einen Lückentext zum Üben für die Cambridge C2 Proficiency (Use of English, Part 6 im Kleinen). Britisches Englisch.\n\n" +
    `Textsorte: ${kind}\nLänge: etwa ${words} Wörter\nLücken: ${cards.length}, eine für jede Wendung unten\n\n` +
    "Wendungen (ID · Wendung · Bedeutung · Beispiel-Lösung aus einem Übungssatz):\n" + list + "\n\n" +
    "Regeln:\n" +
    "- Jede Wendung kommt genau einmal vor, die Reihenfolge ist frei.\n" +
    "- Eine Lücke ersetzt nur das Wort, das gelernt werden soll, meist das Verb in der passenden Form. Der Rest der Wendung (z. B. die Partikel) bleibt im Text stehen.\n" +
    "- Der Zusammenhang muss genau diese Wendung nahelegen, damit die Lösung eindeutig ist.\n" +
    "- Ein natürlicher, zusammenhängender Text auf C2-Niveau, keine Aufzählung der Wendungen.\n" +
    "- Markiere die Lücken im Text als {1}, {2}, … in der Reihenfolge, in der sie vorkommen.\n" +
    "- In \"gaps\" steht für jede Lücke in derselben Reihenfolge [ID der Wendung, Lösung]. Mehrere richtige Lösungen trennst du mit |.\n" +
    "- \"kind\" ist die Textsorte mit Thema auf Deutsch, z. B. \"Zeitungsartikel · Wirtschaft\". \"title\" ist ein englischer Titel.\n\n" +
    "Antworte nur mit diesem JSON, ohne weiteren Text:\n" +
    '{"kind": "…", "title": "…", "text": "… {1} … {2} …", "gaps": [["ID", "Lösung"], ["ID", "Lösung"]]}';
}

// JSON aus einer eingefügten Antwort holen, auch mit Begleittext oder ```-Block
function extractJson(raw) {
  const s = String(raw);
  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("Kein JSON gefunden.");
  return JSON.parse(s.slice(start, end + 1));
}

function nextTextId(taken) {
  let n = 1;
  while (taken.has("i" + n)) n++;
  taken.add("i" + n);
  return "i" + n;
}

// Prüft eingefügte Texte. Ergebnis: gültige Texte (mit neuer ID) und Fehlermeldungen.
export function parseTexts(raw, cardIds, takenIds) {
  let data;
  try {
    data = extractJson(raw);
  } catch {
    return { texts: [], errors: ["Die Antwort enthält kein gültiges JSON. Kopiere die ganze Antwort von Claude."] };
  }
  const items = Array.isArray(data) ? data : Array.isArray(data.texts) ? data.texts : [data];
  const taken = new Set(takenIds);
  const texts = [];
  const errors = [];
  items.forEach((t, i) => {
    const name = items.length > 1 ? `Text ${i + 1}: ` : "";
    const errs = [];
    if (!t || typeof t !== "object") { errors.push(name + "kein Textobjekt."); return; }
    if (typeof t.text !== "string" || !t.text.trim()) errs.push("„text“ fehlt.");
    if (typeof t.title !== "string" || !t.title.trim()) errs.push("„title“ fehlt.");
    const gaps = Array.isArray(t.gaps) ? t.gaps.map((g) => (Array.isArray(g) ? g : g && [g.id, g.answer])) : null;
    if (!gaps || !gaps.length) errs.push("„gaps“ fehlt oder ist leer.");
    if (!errs.length) {
      const nums = [...t.text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
      const want = gaps.map((_, k) => k + 1);
      if (nums.join() !== want.join()) errs.push(`Der Text braucht die Platzhalter {1} bis {${gaps.length}} je einmal und in Reihenfolge (gefunden: ${nums.map((x) => `{${x}}`).join(" ") || "keine"}).`);
      gaps.forEach((g, k) => {
        if (!g || typeof g[0] !== "string" || !cardIds.has(g[0])) errs.push(`Lücke ${k + 1}: Karte „${g && g[0]}“ gibt es nicht.`);
        if (!g || typeof g[1] !== "string" || !g[1].trim()) errs.push(`Lücke ${k + 1}: Lösung fehlt.`);
      });
    }
    if (errs.length) { errors.push(name + errs.join(" ")); return; }
    texts.push({
      id: nextTextId(taken),
      kind: typeof t.kind === "string" && t.kind.trim() ? t.kind.trim() : "Text",
      title: t.title.trim(),
      text: t.text.trim(),
      gaps: gaps.map((g) => [g[0], g[1].trim()])
    });
  });
  return { texts, errors };
}
