import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../js/core/stats.js";
import { newProgress } from "../js/core/srs.js";

const D = 20000;
const cards = [
  { id: "a1", cat: "Idiom" }, { id: "a2", cat: "Idiom" }, { id: "a3", cat: "Collocation" }, { id: "a4", cat: "Collocation" }
];
const progress = {
  a1: { ...newProgress(), box: 5, seen: 6, right: 6, due: D + 3, last: D, ms: { gap: [4, 0], cloze: [2, 0] } },
  a2: { ...newProgress(), box: 0, seen: 4, right: 1, wrong: 3, due: D, last: D - 1, ms: { gap: [1, 3] } },
  a3: { ...newProgress(), box: 2, seen: 2, right: 2, due: D + 9, last: D - 2, ms: { meaning: [2, 0] } }
};

test("Überblick, Stufen und Kategorien", () => {
  const s = summarize(cards, progress, D);
  assert.deepEqual(s.by, { new: 1, developing: 1, problem: 1, mastered: 1 });
  assert.deepEqual(s.boxes, [1, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual(s.cats.Idiom, { n: 2, mastered: 1, problem: 1 });
  assert.deepEqual(s.cats.Collocation, { n: 2, mastered: 0, problem: 0 });
});

test("Fälligkeiten: heute inklusive neuer Karten, dann die nächsten 6 Tage", () => {
  const s = summarize(cards, progress, D);
  assert.equal(s.due, 2);
  assert.equal(s.dueNew, 1);
  assert.equal(s.today, 1);
  assert.deepEqual(s.forecast, [2, 0, 0, 1, 0, 0, 0]);
});

test("Ergebnisse je Übung und problematische Karten", () => {
  const s = summarize(cards, progress, D);
  assert.deepEqual(s.modes.gap, [5, 3]);
  assert.deepEqual(s.modes.cloze, [2, 0]);
  assert.deepEqual(s.problems.map((x) => x.c.id), ["a2"]);
});
