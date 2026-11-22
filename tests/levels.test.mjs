// Niveau-Einschätzung: Skala keine, A1 bis C2, Umrechnung früherer Werte, Speichern und Import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS, EASY, LEVEL_NAMES, LEVEL_PICK, LEVEL_NONE, normLevel, baseLevel } from "../js/core/levels.js";
import { levelOf, checkEdit, saveEdit, formValues } from "../js/core/edit.js";
import { createState, normalize, cleanFix, allCards } from "../js/core/state.js";
import { exportData, parseBackup } from "../js/core/backup.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const base = read("../data/cards.json");
const levels = read("../data/levels.json");
const card = base.find((c) => c.sentence && c.wrong && !levels[c.id]);

test("Skala: keine, A1, A2, B1, B2, C1, C2 in dieser Reihenfolge", () => {
  assert.deepEqual(LEVELS, ["A1", "A2", "B1", "B2", "C1", "C2"]);
  assert.deepEqual(Object.keys(LEVEL_NAMES), ["", "A1", "A2", "B1", "B2", "C1", "C2"]);
  assert.deepEqual(Object.keys(LEVEL_PICK), LEVELS);
  assert.equal(LEVEL_NAMES[""], LEVEL_NONE);
  assert.deepEqual(EASY, ["A1", "A2", "B1"], "für C2 zu leicht: bis B1");
});

test("frühere Werte werden umgerechnet: sicher A1–B1 wird B1, Grenzfall wird B2", () => {
  assert.equal(normLevel("core"), "B1");
  assert.equal(normLevel("edge"), "B2");
  for (const l of LEVELS) assert.equal(normLevel(l), l);
  for (const bad of ["", undefined, null, "D1", "b2", "both", 3]) assert.equal(normLevel(bad), "");
});

test("Niveau einer Startkarte kommt aus levels.json; fehlt sie dort, gibt es keins", () => {
  assert.equal(baseLevel({ s09: "B2" }, "s09"), "B2");
  assert.equal(baseLevel({ s09: "core" }, "s09"), "B1", "auch ein alter Wert in der Datei wird gelesen");
  assert.equal(baseLevel({ s09: "B2" }, "s10"), "");
  assert.equal(baseLevel({}, "toString"), "", "kein Treffer über Object-Eigenschaften");
  assert.equal(baseLevel(undefined, "s09"), "");
});

test("alte Korrekturen im Gerätespeicher werden beim Laden umgerechnet", () => {
  assert.deepEqual(cleanFix({ level: "core" }), { level: "B1" });
  assert.deepEqual(cleanFix({ level: "edge", de: "x" }), { level: "B2", de: "x" });
  assert.deepEqual(cleanFix({ level: "" }), { level: "" }, "„keine“ trotz Eintrag in levels.json bleibt erhalten");
  assert.deepEqual(cleanFix({ level: "Quatsch" }), { level: "" });
  const s = normalize({ fixes: { s09: { level: "edge" } } });
  assert.equal(levelOf(levels, s, base.find((c) => c.id === "s09")), "B2");
});

test("alte eigene Karten: Niveau wird umgerechnet, ohne Niveau gibt es kein Feld", () => {
  const s = normalize({ custom: [
    { id: "u01", term: "a", level: "core" }, { id: "u02", term: "b", level: "edge" },
    { id: "u03", term: "c", level: "" }, { id: "u04", term: "d", level: "C2" }, { id: "u05", term: "e" }
  ] });
  assert.deepEqual(s.custom.map((c) => c.level), ["B1", "B2", undefined, "C2", undefined]);
  assert.ok(!("level" in s.custom[2]));
});

test("Sicherung der alten Version mit „edge“ wird eingelesen", () => {
  const raw = JSON.stringify({ app: "word-bank-trainer", format: 2, fixes: { s09: { level: "edge" } }, custom: [{ id: "u01", term: "a", level: "core" }] });
  const s = parseBackup(raw, base);
  assert.equal(s.fixes.s09.level, "B2");
  assert.equal(s.custom[0].level, "B1");
});

test("Formular nimmt jede Stufe und „keine“ an, alles andere nicht", () => {
  const form = (level) => ({ ...formValues(levels, createState(), card), level });
  for (const l of ["", ...LEVELS]) assert.deepEqual(checkEdit(card, form(l), base).errors, [], `„${l}“`);
  for (const bad of ["core", "edge", "D1", "b2"]) assert.match(checkEdit(card, form(bad), base).errors.join(" "), /Niveau/, bad);
});

test("Speichern: Stufe ändern, auf „keine“ setzen, zurück zum Original", () => {
  const s = createState();
  const save = (level) => saveEdit(s, base, levels, allCards(base, s), card.id, { ...formValues(levels, s, card), level });
  assert.equal(levelOf(levels, s, card), "");
  assert.ok(save("C2").ok);
  assert.equal(levelOf(levels, s, card), "C2");
  assert.deepEqual(s.fixes[card.id], { level: "C2" });
  assert.ok(save("").ok);
  assert.deepEqual(s.fixes, {}, "gleich wie das Original: keine Korrektur");
  // Karte mit Niveau in levels.json auf „keine“ setzen: das ist eine Abweichung
  const rated = base.find((c) => c.sentence && c.wrong && levels[c.id] === "B2");
  assert.ok(saveEdit(s, base, levels, allCards(base, s), rated.id, { ...formValues(levels, s, rated), level: "" }).ok);
  assert.equal(levelOf(levels, s, rated), "");
  assert.deepEqual(s.fixes[rated.id], { level: "" });
});

test("Niveau übersteht Export und Import", () => {
  const s = createState();
  s.fixes[card.id] = { level: "C1" };
  s.custom.push({ id: "u01", cat: "Idiom", term: "x", de: "y", prompt: "", sentence: "", answer: "", level: "A2" });
  const back = parseBackup(JSON.stringify(exportData(s)), base);
  assert.deepEqual(back, s);
  assert.equal(levelOf(levels, back, card), "C1");
  assert.equal(levelOf(levels, back, back.custom[0]), "A2");
});

test("Editor und Details benutzen die Skala", () => {
  const editor = readFileSync(new URL("../js/views/editor.js", import.meta.url), "utf8");
  assert.ok(editor.includes("opts(LEVEL_PICK, v.level, LEVEL_NONE)"));
  const lib = readFileSync(new URL("../js/views/library.js", import.meta.url), "utf8");
  assert.ok(!/core|edge/.test(lib.replace(/\bcore\//g, "")), "keine alten Werte mehr in der Ansicht");
});
