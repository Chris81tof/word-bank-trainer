import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkCard, cardPrompt, parseCards } from "../js/core/cards.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));
const ids = cards.map((c) => c.id);

test("alle Karten aus data/ bestehen die Prüfung für eigene Karten", () => {
  for (const c of cards) assert.deepEqual(checkCard(c).errors, [], c.id);
});

test("Formular: Mindestangaben und Lücke", () => {
  assert.deepEqual(checkCard({ term: "a", de: "b" }).errors, []);
  assert.equal(checkCard({ term: "", de: "b" }).errors.length, 1);
  assert.equal(checkCard({ term: "a" }).errors.length, 1);
  assert.match(checkCard({ term: "a", de: "b", sentence: "no gap", answer: "x" }).errors[0], /Lücke/);
  assert.match(checkCard({ term: "a", de: "b", sentence: "two ____ ____", answer: "x" }).errors[0], /Lücke/);
  assert.match(checkCard({ term: "a", de: "b", sentence: "one ____" }).errors[0], /Lösung/);
  assert.equal(checkCard({ term: "a", de: "b", answer: "x" }).card.answer, "", "ohne Satz keine Lösung");
});

test("falsche Optionen: genau drei, verschieden, keine richtige", () => {
  const base = { term: "a", de: "b", sentence: "x ____", answer: "go" };
  assert.deepEqual(checkCard({ ...base, wrong: ["a", "b", "c"] }).card.wrong, ["a", "b", "c"]);
  assert.equal(checkCard({ ...base, wrong: ["a", "b"] }).errors.length, 1);
  assert.equal(checkCard({ ...base, wrong: ["a", "a", "c"] }).errors.length, 1);
  assert.equal(checkCard({ ...base, wrong: ["Go", "b", "c"] }).errors.length, 1);
});

test("Prompt: eigene Wendungen oder Vorschläge ohne Dubletten", () => {
  const own = cardPrompt({ terms: ["fly off the handle", ""], cat: "Idiom", count: 5 }, cards);
  assert.ok(own.includes("- fly off the handle"));
  assert.ok(!own.includes(cards[0].term + ";"));
  const sug = cardPrompt({ terms: [], cat: "Idiom", count: 5 }, cards);
  assert.ok(sug.includes("Schlage 5 Wendungen der Kategorie „Idiom“"));
  assert.ok(sug.includes(cards[0].term));
  assert.ok(sug.includes('"wrong"'));
});

test("Import: neue IDs, Dubletten übersprungen, Fehler benannt", () => {
  const good = { cat: "Idiom", term: "fly off the handle", de: "aus der Haut fahren", sentence: "He tends to ____ off the handle.", answer: "fly", wrong: ["run", "jump", "go"], plain: "He gets angry quickly.", reg: "i" };
  const dup = { ...good, term: "to bunk off" };
  const bad = { ...good, term: "lose it", sentence: "no gap here" };
  const r = parseCards("```json\n" + JSON.stringify([good, dup, bad]) + "\n```", cards, [...ids, "u01"]);
  assert.deepEqual(r.cards.map((c) => c.id), ["u02"]);
  assert.equal(r.cards[0].reg, "i");
  assert.deepEqual(r.skipped, ["to bunk off"]);
  assert.match(r.errors[0], /„lose it“.*Lücke/);
  assert.equal(parseCards("nichts", cards, ids).errors.length, 1);
});
