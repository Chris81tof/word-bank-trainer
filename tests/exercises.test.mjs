import { test } from "node:test";
import assert from "node:assert/strict";
import { termOk } from "../js/exercises/translate.js";

const card = { term: "to take sth. into account", alt: ["take account of sth."] };

test("Übersetzen: Wendung ohne to, sth. und Groß-/Kleinschreibung", () => {
  assert.ok(termOk(card, "take into account"));
  assert.ok(termOk(card, "To take something into account"));
  assert.ok(termOk(card, "take account of"), "weitere Schreibweise aus alt");
  assert.ok(termOk(card, "take into account the costs"), "Zusatz nach der Wendung ist erlaubt");
});

test("Übersetzen: falsche oder unvollständige Wendung", () => {
  assert.ok(!termOk(card, "take into"));
  assert.ok(!termOk(card, "bring into account"));
  assert.ok(!termOk(card, "take into accounting"));
});
