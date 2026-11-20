import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ICONS, catIcon } from "../js/core/icons.js";
import { ART } from "../js/core/art.js";
import { MODES } from "../js/core/modes.js";

const cards = JSON.parse(readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));

test("jede Übungsart und jeder Reiter hat ein Piktogramm", () => {
  for (const m of [...Object.keys(MODES), "rewrite", "produce", "cloze", "passive", "story", "speak", "write"]) assert.ok(ICONS.includes(m), m);
  for (const t of ["today", "practice", "transfer", "stats", "library"]) assert.ok(ICONS.includes(t), t);
});

test("jede Kategorie der Karten hat ein eigenes Piktogramm", () => {
  for (const cat of new Set(cards.map((c) => c.cat))) assert.notEqual(catIcon(cat), "entry", cat);
  assert.equal(catIcon("Eigene Kategorie"), "entry");
});

test("Illustrationen sind vollständig berechnet und ihre IDs eindeutig", () => {
  const all = Object.values(ART).join("");
  assert.ok(!/NaN|undefined/.test(all));
  const ids = [...all.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, ref] of all.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), ref);
});
