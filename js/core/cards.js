// Eigene Karten: prüfen, Prompt für neue Karten, Import der Antwort von Claude.
import { key } from "./match.js";

export const CATS = ["Phrasal verb", "Collocation", "Word formation", "Idiom", "Verb + preposition", "Adjective + preposition", "Sonstiges"];
// Register einer Wendung (Kürzel in den Daten → englische Bezeichnung)
export const REG = { i: "informal", f: "formal", n: "neutral", d: "dated", c: "colloquial", s: "slang" };
const REGS = Object.keys(REG);
// Regionaler Gebrauch (optionales Feld „region“)
export const REGION = { gb: "British English", us: "American English", au: "Australian English", ca: "Canadian English", ie: "Irish English", nz: "New Zealand English", za: "South African English" };
const str = (v) => (typeof v === "string" ? v.trim() : "");

// Prüft eine Karte und gibt sie bereinigt zurück: { card, errors }.
// Pflicht: Wendung, Kategorie, eine Bedeutung; ein Satz braucht genau eine Lücke und eine Lösung.
// wrong (3 Optionen), plain und reg sind freiwillig; fehlen sie, entfallen Auswahl, Fehlersuche und Umformulieren.
export function checkCard(raw) {
  const errors = [];
  const c = {
    cat: str(raw.cat) || "Sonstiges",
    term: str(raw.term),
    de: str(raw.de),
    prompt: str(raw.prompt),
    sentence: str(raw.sentence),
    answer: str(raw.answer)
  };
  if (!c.term) errors.push("Die Wendung fehlt.");
  if (!c.de && !c.prompt) errors.push("Es fehlt eine Bedeutung (Deutsch oder Englisch).");
  if (c.sentence) {
    const gaps = c.sentence.split("____").length - 1;
    if (gaps !== 1) errors.push("Der Satz braucht genau eine Lücke aus vier Unterstrichen (____).");
    if (!c.answer) errors.push("Die Lösung für die Lücke fehlt.");
  } else c.answer = "";
  if (Array.isArray(raw.wrong) && raw.wrong.length) {
    const wrong = raw.wrong.map(str).filter(Boolean);
    const right = c.answer.toLowerCase().split("|");
    if (wrong.length !== 3 || new Set(wrong.map((w) => w.toLowerCase())).size !== 3) errors.push("„wrong“ braucht drei verschiedene falsche Optionen.");
    else if (wrong.some((w) => right.includes(w.toLowerCase()))) errors.push("Eine falsche Option ist zugleich richtig.");
    else c.wrong = wrong;
  }
  if (str(raw.plain)) c.plain = str(raw.plain);
  if (REGS.includes(raw.reg)) c.reg = raw.reg;
  if (raw.region in REGION) c.region = raw.region;
  if (str(raw.note)) c.note = str(raw.note);
  if (str(raw.hint)) c.hint = str(raw.hint);
  const alt = Array.isArray(raw.alt) ? raw.alt.map(str).filter(Boolean) : [];
  if (alt.length) c.alt = alt;
  return { card: c, errors };
}

// Nächste freie ID u01, u02 … (IDs werden nie wiederverwendet)
function nextId(taken) {
  let n = 1;
  while (taken.has("u" + String(n).padStart(2, "0"))) n++;
  const id = "u" + String(n).padStart(2, "0");
  taken.add(id);
  return id;
}

export function cardPrompt({ terms, cat, count }, existing) {
  const own = terms.map((t) => t.trim()).filter(Boolean);
  const what = own.length
    ? "Erstelle Lernkarten für diese Wendungen:\n" + own.map((t) => "- " + t).join("\n")
    : `Schlage ${count} Wendungen der Kategorie „${cat}“ vor, die für die Cambridge C2 Proficiency (Use of English) wichtig sind, und erstelle Lernkarten dafür. Diese Wendungen habe ich schon, bitte keine davon:\n` +
      existing.map((c) => c.term).join("; ");
  return "Ich lerne für die Cambridge C2 Proficiency (Use of English). Britisches Englisch, Muttersprache Deutsch.\n\n" + what + "\n\n" +
    "Felder je Karte:\n" +
    `- cat: eine von ${CATS.map((c) => `"${c}"`).join(", ")}\n` +
    "- term: die Wendung in Grundform, z. B. \"take sth. into account\"\n" +
    "- de: deutsche Bedeutung, knapp\n" +
    "- prompt: kurze englische Erklärung (Learner's-Dictionary-Stil)\n" +
    "- sentence: ein natürlicher Beispielsatz auf C2-Niveau mit genau einer Lücke ____ an der Stelle des Wortes, das gelernt werden soll (meist das Verb, in der passenden Form); der Rest der Wendung bleibt stehen\n" +
    "- answer: das Wort für die Lücke; mehrere richtige Lösungen mit | trennen\n" +
    "- wrong: drei falsche, aber plausible Optionen für die Lücke (typische Lernerfehler), keine davon richtig\n" +
    "- plain: derselbe Satz schlicht formuliert, ohne die Wendung\n" +
    "- reg: Register, \"i\" (informal), \"n\" (neutral), \"f\" (formal), \"d\" (dated), \"c\" (colloquial) oder \"s\" (slang)\n" +
    "- region: optional, nur wenn die Wendung regional ist: \"gb\" (British), \"us\" (American), \"au\" (Australian), \"ca\" (Canadian), \"ie\" (Irish), \"nz\" (New Zealand) oder \"za\" (South African)\n" +
    "- note: optional, ein Hinweis auf Deutsch (Gebrauch, Verwechslungsgefahr)\n" +
    "- hint: optional, ein eigener Hinweis auf Deutsch für die Übung, der die Lösung nicht verrät\n" +
    "- alt: optional, Liste weiterer Schreibweisen der Wendung\n\n" +
    "Antworte nur mit einer JSON-Liste, ohne weiteren Text:\n" +
    '[{"cat": "…", "term": "…", "de": "…", "prompt": "…", "sentence": "… ____ …", "answer": "…", "wrong": ["…", "…", "…"], "plain": "…", "reg": "n", "note": "…"}]';
}

function extractJson(raw) {
  const s = String(raw);
  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("kein JSON");
  return JSON.parse(s.slice(start, end + 1));
}

// Liest eingefügte Karten. existing: alle vorhandenen Karten (für Dubletten), takenIds: vergebene IDs.
export function parseCards(raw, existing, takenIds) {
  let data;
  try {
    data = extractJson(raw);
  } catch {
    return { cards: [], errors: ["Die Antwort enthält kein gültiges JSON. Kopiere die ganze Antwort von Claude."], skipped: [] };
  }
  const items = Array.isArray(data) ? data : Array.isArray(data.cards) ? data.cards : [data];
  const seen = new Set(existing.map((c) => key(c.term)));
  const taken = new Set(takenIds);
  const cards = [];
  const errors = [];
  const skipped = [];
  items.forEach((item, i) => {
    if (!item || typeof item !== "object") { errors.push(`Karte ${i + 1}: kein Kartenobjekt.`); return; }
    const { card, errors: errs } = checkCard(item);
    const name = card.term ? `„${card.term}“` : `Karte ${i + 1}`;
    if (errs.length) { errors.push(`${name}: ${errs.join(" ")}`); return; }
    if (seen.has(key(card.term))) { skipped.push(card.term); return; }
    seen.add(key(card.term));
    cards.push({ id: nextId(taken), ...card });
  });
  return { cards, errors, skipped };
}
