// Prüft die Inhalte in data/ gegen die Regeln aus CLAUDE.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL("../data/" + name, import.meta.url), "utf8"));
const cards = load("cards.json");
const texts = load("texts.json");
const tasks = load("tasks.json");
const levels = load("levels.json");
const ids = new Set(cards.map((c) => c.id));

const CATS = ["Phrasal verb", "Collocation", "Word formation", "Idiom", "Verb + preposition", "Adjective + preposition", "Sonstiges"];
const TEXT_FIELDS = ["id", "cat", "term", "de", "sentence", "answer", "plain"];
const KNOWN = [...TEXT_FIELDS, "prompt", "wrong", "reg", "note", "alt"];

test("Karten-IDs sind eindeutig und gut geformt", () => {
  assert.equal(ids.size, cards.length, "doppelte IDs");
  for (const c of cards) assert.match(c.id, /^[a-z]+\d+$/, c.id);
});

test("jede Karte hat alle Pflichtfelder", () => {
  for (const c of cards) {
    for (const f of TEXT_FIELDS) {
      assert.equal(typeof c[f], "string", `${c.id}: ${f} fehlt`);
      assert.ok(c[f].trim(), `${c.id}: ${f} ist leer`);
    }
    assert.ok(CATS.includes(c.cat), `${c.id}: unbekannte Kategorie ${c.cat}`);
    assert.ok(["i", "n", "f"].includes(c.reg), `${c.id}: Register ${c.reg}`);
    assert.equal(typeof c.prompt, "string", `${c.id}: prompt muss Text sein (darf leer sein)`);
    if ("note" in c) assert.equal(typeof c.note, "string", `${c.id}: note`);
    if ("alt" in c) assert.ok(Array.isArray(c.alt) && c.alt.every((a) => typeof a === "string" && a.trim()), `${c.id}: alt`);
    const extra = Object.keys(c).filter((k) => !KNOWN.includes(k));
    assert.deepEqual(extra, [], `${c.id}: unbekannte Felder`);
  }
});

test("jeder Satz hat genau eine Lücke", () => {
  for (const c of cards) assert.equal(c.sentence.split("____").length - 1, 1, `${c.id}: ${c.sentence}`);
});

test("drei verschiedene falsche Optionen, keine davon richtig", () => {
  for (const c of cards) {
    assert.ok(Array.isArray(c.wrong) && c.wrong.length === 3, `${c.id}: wrong braucht 3 Einträge`);
    assert.equal(new Set(c.wrong.map((w) => w.toLowerCase())).size, 3, `${c.id}: doppelte falsche Optionen`);
    const right = c.answer.toLowerCase().split("|");
    for (const w of c.wrong) {
      assert.ok(w.trim(), `${c.id}: leere falsche Option`);
      assert.ok(!right.includes(w.toLowerCase()), `${c.id}: „${w}“ ist auch eine richtige Lösung`);
    }
  }
});

test("Lückentexte: Platzhalter passen zu den Lücken", () => {
  const seen = new Set();
  for (const t of texts) {
    assert.ok(!seen.has(t.id), `doppelte Text-ID ${t.id}`);
    seen.add(t.id);
    for (const f of ["kind", "title", "text"]) assert.ok(typeof t[f] === "string" && t[f].trim(), `${t.id}: ${f}`);
    const nums = [...t.text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    assert.deepEqual(nums, t.gaps.map((_, i) => i + 1), `${t.id}: Platzhalter {1}…{n} fehlen oder sind nicht in Reihenfolge`);
  }
});

test("Lückentexte: jede Lücke zeigt auf eine vorhandene Karte", () => {
  for (const t of texts) {
    for (const [id, word] of t.gaps) {
      assert.ok(ids.has(id), `${t.id}: Karte ${id} gibt es nicht`);
      assert.ok(typeof word === "string" && word.trim(), `${t.id}: leere Lösung für ${id}`);
    }
  }
});

test("Sprech- und Schreibaufgaben sind vollständig", () => {
  assert.ok(tasks.speak.length > 0 && tasks.write.length > 0);
  for (const s of tasks.speak) assert.ok(s.topic && s.q, JSON.stringify(s));
  for (const w of tasks.write) assert.ok(w.type && w.task, JSON.stringify(w));
});

test("Level-Vorschläge verweisen auf vorhandene Karten", () => {
  for (const id of [...levels.core, ...levels.edge]) assert.ok(ids.has(id), `Level-Liste: ${id} fehlt`);
});
