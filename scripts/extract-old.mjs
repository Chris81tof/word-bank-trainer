// Einmaliges Skript: holt Karten, Texte und Aufgaben aus alt-word-bank-trainer.html nach data/.
// Aufruf: node scripts/extract-old.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const html = readFileSync(new URL("alt-word-bank-trainer.html", root), "utf8");

// Abschnitt von "var SEED = [" bis vor "var SEED_VER" sind reine Daten.
const start = html.indexOf("var SEED = [");
const end = html.indexOf("var SEED_VER");
const levels = html.match(/var LEVEL_CORE = \[[^\]]*\];\s*var LEVEL_EDGE = \[[^\]]*\];/);
if (start < 0 || end < 0 || !levels) throw new Error("Datenabschnitt nicht gefunden");

const src = html.slice(start, end) + levels[0] +
  "\nresult = { SEED, EXTRA, PASSAGES, SPEAK, WRITE, LEVEL_CORE, LEVEL_EDGE };";
const ctx = { result: null };
vm.runInNewContext(src, ctx);
const { SEED, EXTRA, PASSAGES, SPEAK, WRITE, LEVEL_CORE, LEVEL_EDGE } = ctx.result;

const cards = SEED.map((c) => {
  const x = EXTRA[c.id];
  if (!x) throw new Error("Keine Zusatzdaten für " + c.id);
  const card = {
    id: c.id, cat: c.cat, term: c.term, de: c.de || "", prompt: c.prompt || "",
    sentence: c.sentence || "", answer: c.answer || "",
    wrong: x[0].split("|"), plain: x[1], reg: x[2]
  };
  if (c.note) card.note = c.note;
  // Varianten der Wendung, mit | getrennt. "basis" für f05 stand in der alten App als Sonderfall im Code.
  const alt = (c.alt ? c.alt.split("|") : []).concat(c.id === "f05" ? ["basis"] : []);
  if (alt.length) card.alt = alt;
  const unknown = Object.keys(c).filter((k) => !["id", "cat", "term", "de", "prompt", "sentence", "answer", "note", "alt"].includes(k));
  if (unknown.length) throw new Error(`${c.id}: unbekannte Felder ${unknown}`);
  return card;
});

const texts = PASSAGES.map((p) => ({ id: p.id, kind: p.kind, title: p.title, text: p.text, gaps: p.g }));
const tasks = {
  speak: SPEAK.map((s) => ({ topic: s.t, q: s.q })),
  write: WRITE.map((w) => ({ type: w.type, task: w.t }))
};

const out = (name, data) => {
  mkdirSync(new URL("data/", root), { recursive: true });
  // Kurze Listen aus Zeichenketten (falsche Optionen, Lücken) in eine Zeile schreiben
  const json = JSON.stringify(data, null, 2)
    .replace(/\[\s+("(?:[^"\\]|\\.)*"(?:,\s+"(?:[^"\\]|\\.)*")*)\s+\]/g, (m, inner) => "[" + inner.replace(/,\s+/g, ", ") + "]");
  writeFileSync(new URL("data/" + name, root), json + "\n");
};
out("cards.json", cards);
out("texts.json", texts);
out("tasks.json", tasks);
out("levels.json", { core: LEVEL_CORE, edge: LEVEL_EDGE });

console.log(`${cards.length} Karten, ${texts.length} Texte, ${tasks.speak.length} Sprech- und ${tasks.write.length} Schreibaufgaben, ${LEVEL_CORE.length + LEVEL_EDGE.length} Level-Vorschläge`);
