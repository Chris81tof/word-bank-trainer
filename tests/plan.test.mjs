import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPlan, recMode } from "../js/core/plan.js";
import { createState } from "../js/core/state.js";
import { newProgress } from "../js/core/srs.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));
const D = 20000;
const allIds = (plan) => plan.blocks.flatMap((b) => b.ids);

function seen(box, extra = {}) {
  return { ...newProgress(), box, seen: 2, right: 2, first: D - 10, last: D - 1, due: D, ...extra };
}

test("neue Karten beginnen mit Bedeutung", () => {
  assert.equal(recMode(cards[0], undefined, cards), "meaning");
});

test("Übungsart richtet sich nach der Stufe", () => {
  const c = cards[0];
  assert.equal(recMode(c, seen(0), cards), "choice");
  assert.equal(recMode(c, seen(1), cards), "gap");
  assert.equal(recMode(c, seen(2), cards), "translate");
  assert.equal(recMode(c, seen(2, { seen: 3 }), cards), "error");
});

test("eigene Karten ohne falsche Optionen bekommen keine Auswahl", () => {
  const own = { id: "u01", cat: "Idiom", term: "a test", de: "ein Test", sentence: "It was ____ test.", answer: "a" };
  assert.equal(recMode(own, seen(0), [...cards, own]), "gap");
});

test("Zahl neuer Karten pro Tag wird eingehalten", () => {
  const s = createState();
  s.prefs = { ...s.prefs, budget: 60, newPerDay: 5 };
  const plan = buildPlan(cards, s, D);
  assert.equal(allIds(plan).length, 5);
  assert.equal(plan.skippedNew, cards.length - 5);
});

test("heute schon begonnene neue Karten zählen mit", () => {
  const s = createState();
  s.prefs = { ...s.prefs, budget: 60, newPerDay: 5 };
  for (const c of cards.slice(0, 3)) s.progress[c.id] = seen(1, { first: D, due: D + 1 });
  assert.equal(allIds(buildPlan(cards, s, D)).length, 2);
});

test("Zeitbudget wird nicht überschritten, keine Karte doppelt", () => {
  const s = createState();
  s.prefs = { ...s.prefs, budget: 20, newPerDay: 0 };
  for (const c of cards) s.progress[c.id] = seen(2, { due: D - 1 });
  const plan = buildPlan(cards, s, D);
  assert.ok(plan.used <= 20);
  const ids = allIds(plan);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length);
});

test("problematische Karten kommen zuerst, nicht fällige gar nicht", () => {
  const s = createState();
  s.prefs = { ...s.prefs, budget: 1, newPerDay: 0 };
  s.progress[cards[0].id] = seen(1, { due: D - 5 });
  s.progress[cards[1].id] = seen(0, { right: 0, wrong: 3, due: D });
  s.progress[cards[2].id] = seen(3, { due: D + 4 });
  const ids = allIds(buildPlan(cards, s, D));
  assert.deepEqual(ids, [cards[1].id]);
});
