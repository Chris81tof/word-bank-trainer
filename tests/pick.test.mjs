import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickExprs, weightedSample } from "../js/core/pick.js";
import { createState } from "../js/core/state.js";
import { newProgress } from "../js/core/srs.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));
const D = 20000;

test("gewichtetes Ziehen: ohne Zurücklegen, nie mehr als vorhanden", () => {
  const got = weightedSample([1, 2, 3], () => 1, 5);
  assert.deepEqual([...got].sort(), [1, 2, 3]);
});

test("gewichtetes Ziehen bevorzugt schwere Elemente", () => {
  let heavy = 0;
  for (let i = 0; i < 200; i++) if (weightedSample(["a", "b"], (x) => (x === "a" ? 9 : 1), 1)[0] === "a") heavy++;
  assert.ok(heavy > 140);
});

test("Transfer-Auswahl filtert nach Lernstand", () => {
  const s = createState();
  s.progress[cards[0].id] = { ...newProgress(), box: 5, seen: 6, right: 6, due: D + 20 };
  s.progress[cards[1].id] = { ...newProgress(), box: 1, seen: 2, right: 1, wrong: 1, due: D };
  assert.deepEqual(pickExprs(cards, s, D, 5, "mast").map((c) => c.id), [cards[0].id]);
  assert.deepEqual(pickExprs(cards, s, D, 5, "dev").map((c) => c.id), [cards[1].id]);
  assert.equal(pickExprs(cards, s, D, 5, "seen").length, 2);
  assert.equal(pickExprs(cards, s, D, 8, "rec").length, 8);
});
