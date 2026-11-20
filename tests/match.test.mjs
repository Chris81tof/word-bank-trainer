import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { norm, key, forms, usesExpr, answerOk } from "../js/core/match.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));
const byId = (id) => cards.find((c) => c.id === id);

test("norm ignoriert Groß-/Kleinschreibung, Satzzeichen am Ende und Apostrophe", () => {
  assert.equal(norm("  Don’t  Go! "), "don't go");
});

test("key entfernt to, sth., s.o. und Klammern", () => {
  assert.equal(key("to bunk off"), "bunk off");
  assert.equal(key("saddle s.o. with sth."), "saddle with");
  assert.equal(key("get away (with)"), "get away");
});

test("forms kennt regelmäßige und unregelmäßige Formen", () => {
  assert.ok(forms("tear").includes("torn"));
  assert.ok(forms("stop").includes("stopped"));
  assert.ok(forms("carry").includes("carried"));
  assert.ok(forms("chalk").includes("chalked"));
  assert.ok(forms("hope").includes("hoping"));
});

test("usesExpr findet gebeugte Phrasal Verbs", () => {
  const c = byId("s01");
  assert.ok(usesExpr("He was bunking off again.", c));
  assert.ok(usesExpr("They bunked off after lunch.", c));
  assert.ok(!usesExpr("He went to school.", c));
});

test("usesExpr erlaubt eingeschobene Wörter und prüft die Reihenfolge", () => {
  const c = byId("s02");
  assert.ok(usesExpr("We chalked another win up.", c));
  assert.ok(!usesExpr("Up in the hills he chalked nothing.", c));
});

test("usesExpr nutzt die Varianten (alt)", () => {
  const c = byId("f05");
  assert.ok(usesExpr("He works there on a part-time basis.", c));
  assert.ok(usesExpr("On a regular basis, we meet.", c));
});

test("jede Karte erkennt ihre eigene Wendung im ausgefüllten Satz", () => {
  // Die Lösungswörter stehen im Satz; die Wendung selbst muss dort nicht immer vorkommen
  // (z. B. Word formation), aber bei Phrasal Verbs und Collocations schon.
  const misses = cards
    .filter((c) => ["Phrasal verb", "Collocation"].includes(c.cat))
    .filter((c) => !usesExpr(c.sentence.replace("____", c.answer.split("|")[0]), c))
    .map((c) => c.id);
  assert.ok(misses.length <= 20, `zu viele Karten werden im eigenen Satz nicht erkannt: ${misses.join(" ")}`);
});

test("answerOk akzeptiert mehrere Lösungen", () => {
  assert.ok(answerOk({ answer: "clarity|clearness" }, " Clearness. "));
  assert.ok(!answerOk({ answer: "clarity|clearness" }, "clear"));
});

test("weitere unregelmäßige Formen", () => {
  assert.ok(usesExpr("Wages have not kept pace with prices.", { term: "keep pace with" }));
  assert.ok(usesExpr("She rose to the challenge.", { term: "rise to the challenge" }));
  assert.ok(usesExpr("Buyers drove up prices.", { term: "drive up (prices/demand)" }));
  assert.ok(usesExpr("He bore in mind what she had said.", { term: "bear in mind (that)" }));
  assert.ok(usesExpr("She is tying herself down.", { term: "tie s.o. down (to sth.)" }));
});
