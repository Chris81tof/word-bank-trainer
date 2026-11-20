import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardWeight, textScore, suggestTexts, pickCards, coverage, textPrompt, parseTexts } from "../js/core/texts.js";
import { createState } from "../js/core/state.js";
import { newProgress } from "../js/core/srs.js";

const load = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const cards = load("cards.json");
const texts = load("texts.json");
const ids = new Set(cards.map((c) => c.id));
const D = 20000;

const prog = (box, extra = {}) => ({ ...newProgress(), box, seen: 3, right: 3, first: D - 20, last: D - 2, due: D + 5, ...extra });

test("Gewichte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, fällig +2", () => {
  assert.equal(cardWeight(undefined, D), 1.5);
  assert.equal(cardWeight(prog(2), D), 3);
  assert.equal(cardWeight(prog(5), D), 1);
  assert.equal(cardWeight(prog(1, { right: 1, wrong: 3 }), D), 5);
  assert.equal(cardWeight(prog(2, { due: D }), D), 5);
});

test("Abzug für kürzlich bearbeitete Texte sinkt über 14 Tage", () => {
  const t = texts[0];
  const base = textScore(t, {}, {}, D);
  assert.equal(base, t.gaps.length * 1.5);
  assert.equal(textScore(t, {}, { [t.id]: D }, D), base - 10);
  assert.equal(textScore(t, {}, { [t.id]: D - 7 }, D), base - 5);
  assert.equal(textScore(t, {}, { [t.id]: D - 14 }, D), base);
});

test("Vorschläge: Texte mit problematischen Karten zuerst, höchstens 6", () => {
  const s = createState();
  const target = texts[5];
  for (const [id] of target.gaps) s.progress[id] = prog(1, { right: 0, wrong: 3, due: D });
  const list = suggestTexts(texts, s, D, ids);
  assert.equal(list.length, 6);
  assert.equal(list[0].t.id, target.id);
});

test("Kartenauswahl für neue Texte: keine doppelt, bevorzugt Karten ohne Text", () => {
  const s = createState();
  let i = 0;
  const rand = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
  const picked = pickCards(cards, s, texts, D, 8, rand);
  assert.equal(picked.length, 8);
  assert.equal(new Set(picked.map((c) => c.id)).size, 8);
  const cov = coverage(texts);
  const uncovered = cards.filter((c) => !cov.get(c.id)).length;
  if (uncovered >= 8) assert.ok(picked.filter((c) => !cov.get(c.id)).length >= 4);
});

test("Prompt nennt Karten, Textsorte, Länge und das JSON-Format", () => {
  const p = textPrompt(cards.slice(0, 3), { kind: "Essay", words: 180 });
  for (const c of cards.slice(0, 3)) assert.ok(p.includes(c.id + " · " + c.term));
  assert.ok(p.includes("Textsorte: Essay"));
  assert.ok(p.includes("etwa 180 Wörter"));
  assert.ok(p.includes("Lücken: 3"));
  assert.ok(p.includes('"gaps"'));
});

const good = { kind: "Essay · Schule", title: "Skiving", text: "He was {1} off school and later {2} up a win.", gaps: [["s01", "bunking"], ["s02", "chalked"]] };

test("Import: gültiger Text mit Begleittext und Codeblock bekommt eine neue ID", () => {
  const raw = "Hier ist dein Text:\n```json\n" + JSON.stringify(good) + "\n```\nViel Erfolg!";
  const r = parseTexts(raw, ids, ["c1", "i1"]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.texts.length, 1);
  assert.equal(r.texts[0].id, "i2");
  assert.deepEqual(r.texts[0].gaps, good.gaps);
});

test("Import: mehrere Texte als Liste", () => {
  const r = parseTexts(JSON.stringify([good, good]), ids, []);
  assert.deepEqual(r.texts.map((t) => t.id), ["i1", "i2"]);
});

test("Import: Fehler werden genau benannt", () => {
  assert.equal(parseTexts("keine Ahnung", ids, []).errors.length, 1);
  const unknown = parseTexts(JSON.stringify({ ...good, gaps: [["zz9", "x"], ["s02", "chalked"]] }), ids, []);
  assert.match(unknown.errors[0], /zz9/);
  const missing = parseTexts(JSON.stringify({ ...good, text: "He was {1} off school." }), ids, []);
  assert.match(missing.errors[0], /Platzhalter/);
  const order = parseTexts(JSON.stringify({ ...good, text: "{2} and {1}" }), ids, []);
  assert.match(order.errors[0], /Platzhalter/);
  const empty = parseTexts(JSON.stringify({ ...good, gaps: [["s01", ""], ["s02", "chalked"]] }), ids, []);
  assert.match(empty.errors[0], /Lösung fehlt/);
  assert.equal(empty.texts.length, 0);
});
