import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkEdit, saveEdit, restoreOriginal, isEdited, levelOf, formValues } from "../js/core/edit.js";
import { createState, allCards, progressOf, normalize } from "../js/core/state.js";
import { exportData, parseBackup } from "../js/core/backup.js";
import { record } from "../js/core/srs.js";
import { checkCard } from "../js/core/cards.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const base = read("../data/cards.json");
const levels = read("../data/levels.json");
const id = base.find((c) => c.sentence && c.wrong && !levels[c.id]).id;
const origCard = base.find((c) => c.id === id);
const form = (extra = {}) => ({ ...formValues(levels, createState(), origCard), ...extra });
const edit = (s, extra, b = base, cardId = id) => saveEdit(s, b, levels, allCards(b, s), cardId, form(extra));

test("Bearbeiten: Korrektur gilt, Datei und Lernstand bleiben unverändert", () => {
  const s = createState();
  record(progressOf(s, id), true, "gap", 20000);
  const before = JSON.stringify(s.progress);
  const r = edit(s, { de: "neue Bedeutung", note: "Merke dir das." });
  assert.ok(r.ok);
  const c = allCards(base, s).find((x) => x.id === id);
  assert.equal(c.de, "neue Bedeutung");
  assert.equal(c.note, "Merke dir das.");
  assert.equal(c.term, origCard.term, "unveränderte Felder kommen aus der Datei");
  assert.deepEqual(s.fixes[id], { de: "neue Bedeutung", note: "Merke dir das." }, "nur geänderte Felder");
  assert.equal(JSON.stringify(s.progress), before, "Lernstand bleibt");
  assert.equal(base.find((x) => x.id === id).de, origCard.de);
  assert.ok(isEdited(s, id));
});

test("Bearbeiten: Weitere Schreibweisen, Register, Region und Niveau", () => {
  const s = createState();
  assert.ok(edit(s, { alt: "foo bar\n\n baz ", reg: "s", region: "us", level: "C1" }).ok);
  const c = allCards(base, s).find((x) => x.id === id);
  assert.deepEqual(c.alt, ["foo bar", "baz"]);
  assert.equal(c.reg, "s");
  assert.equal(c.region, "us");
  assert.equal(levelOf(levels, s, c), "C1");
  assert.ok(edit(s, { reg: "", region: "", alt: "", level: "" }).ok, "Angaben lassen sich wieder entfernen");
  const d = allCards(base, s).find((x) => x.id === id);
  assert.ok(!("reg" in d) && !("region" in d) && !("alt" in d));
});

test("Bearbeiten ohne Änderung legt keine Korrektur an", () => {
  const s = createState();
  assert.ok(edit(s, {}).ok);
  assert.deepEqual(s.fixes, {});
});

test("Prüfungen beim Speichern", () => {
  const s = createState();
  const err = (extra) => saveEdit(s, base, levels, allCards(base, s), id, form(extra)).errors;
  assert.match(err({ term: "  " })[0], /Ausdruck darf nicht leer/);
  assert.match(err({ sentence: "Keine Lücke hier." }).join(" "), /genau eine Lücke/);
  assert.match(err({ sentence: "Zwei ____ Lücken ____." }).join(" "), /genau eine Lücke/);
  assert.match(err({ sentence: "Fünf _____ Striche." }).join(" "), /genau eine Lücke/);
  assert.match(err({ sentence: "" }).join(" "), /Beispielsatz fehlt/);
  assert.match(err({ answer: "" }).join(" "), /Lösung.*fehlt/);
  assert.match(err({ answer: "a||b" }).join(" "), /Lösungen ist leer/);
  assert.match(err({ answer: "____" }).join(" "), /in die Lücke passt/);
  assert.match(err({ answer: origCard.wrong[0] }).join(" "), /falsche Option/);
  assert.match(err({ term: base.find((c) => c.id !== id).term }).join(" "), /gibt es schon/);
  assert.match(err({ reg: "x" }).join(" "), /Register/);
  assert.match(err({ region: "xx" }).join(" "), /Region/);
  assert.deepEqual(s.fixes, {}, "bei Fehlern wird nichts gespeichert");
  assert.equal(err({ answer: "fly | flies" }), undefined, "mehrere Lösungen sind erlaubt");
});

test("Eigene Karten werden direkt geändert, ID und Lernstand bleiben", () => {
  const s = createState();
  s.custom.push({ id: "u01", cat: "Idiom", term: "pull the other one", de: "Das glaube ich nicht", prompt: "", sentence: "Oh, ____ the other one!", answer: "pull" });
  record(progressOf(s, "u01"), true, "gap", 20000);
  const r = saveEdit(s, base, levels, allCards(base, s), "u01", { term: "pull the other one", alt: "", de: "Na klar", prompt: "", sentence: "Oh, ____ the other one!", answer: "pull", note: "", cat: "Idiom", reg: "c", region: "gb", level: "B1" });
  assert.ok(r.ok);
  assert.equal(s.custom[0].id, "u01");
  assert.equal(s.custom[0].de, "Na klar");
  assert.equal(s.custom[0].reg, "c");
  assert.deepEqual(s.fixes, {}, "keine Korrektur-Einträge für eigene Karten");
  assert.equal(levelOf(levels, s, s.custom[0]), "B1");
  assert.equal(s.progress.u01.seen, 1);
  assert.ok(!isEdited(s, "u01"));
});

test("Eigene Karte ohne Satz darf ohne Satz bleiben", () => {
  const s = createState();
  s.custom.push({ id: "u01", cat: "Idiom", term: "x", de: "y", prompt: "", sentence: "", answer: "" });
  const f = { term: "x2", alt: "", de: "y", prompt: "", sentence: "", answer: "", note: "", cat: "Idiom", reg: "", region: "", level: "" };
  assert.ok(saveEdit(s, base, levels, allCards(base, s), "u01", f).ok);
});

test("Original wiederherstellen", () => {
  const s = createState();
  edit(s, { de: "anders", level: "C1" });
  assert.ok(restoreOriginal(s, id));
  assert.deepEqual(allCards(base, s).find((x) => x.id === id), origCard);
  assert.ok(!isEdited(s, id));
  assert.equal(restoreOriginal(s, id), false, "nichts mehr zu tun");
});

test("Korrektur übersteht Sicherung und Import", () => {
  const s = createState();
  record(progressOf(s, id), true, "gap", 20000);
  edit(s, { de: "anders", reg: "d", region: "za", level: "C1" });
  const back = parseBackup(JSON.stringify(exportData(s)), base);
  assert.deepEqual(back, s);
  const c = allCards(base, back).find((x) => x.id === id);
  assert.equal(c.de, "anders");
  assert.equal(c.reg, "d");
  assert.equal(levelOf(levels, back, c), "C1");
});

test("Alte Sicherungen ohne Korrekturen sind gültig, kaputte Korrekturen werden bereinigt", () => {
  assert.deepEqual(normalize({ app: "x" }).fixes, {});
  const s = normalize({ fixes: { a: { de: "x", term: 5, foo: 1 }, b: 7, c: {} } });
  assert.deepEqual(s.fixes, { a: { de: "x" } });
});

test("Korrektur übersteht eine neue Version der Kartendatei", () => {
  const s = createState();
  edit(s, { de: "meine Fassung" });
  // neue Version: dieselbe ID, andere Erklärung; außerdem ist eine Karte verschwunden
  const gone = base.find((c) => c.id !== id).id;
  const v2 = base.filter((c) => c.id !== gone && c.id !== id).concat({ ...origCard, prompt: "new explanation", de: "neue Datei" });
  s.fixes[gone] = { de: "für verschwundene Karte" };
  const c = allCards(v2, s).find((x) => x.id === id);
  assert.equal(c.de, "meine Fassung", "Korrektur gewinnt");
  assert.equal(c.prompt, "new explanation", "nicht korrigierte Felder kommen aus der neuen Datei");
  assert.ok(!allCards(v2, s).some((x) => x.id === gone), "Korrektur zu fehlender Karte wird ignoriert");
});

test("Register und Region in neuen Karten (Import von Claude)", () => {
  const ok = checkCard({ term: "t", de: "d", reg: "s", region: "ca" });
  assert.equal(ok.card.reg, "s");
  assert.equal(ok.card.region, "ca");
  const bad = checkCard({ term: "t", de: "d", reg: "q", region: "mars" });
  assert.ok(!("reg" in bad.card) && !("region" in bad.card));
});
