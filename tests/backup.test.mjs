import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { exportData, parseBackup, backupName, migrateOldBox } from "../js/core/backup.js";
import { createState, normalize, load, save, STORAGE_KEY, allCards, progressOf, nextCustomId } from "../js/core/state.js";
import { record } from "../js/core/srs.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const base = JSON.parse(read("../data/cards.json"));

// Kleiner Ersatz für localStorage
const fakeStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), map: m };
};

// Alte Sicherung mit Fortschritt: s01 auf Stufe 3, s02 auf Stufe 1, eine eigene Karte, eine Entwurfsgrundlage.
function oldBackup() {
  const card = (c, extra = {}) => ({ box: 0, ...c, seen: 0, right: 0, wrong: 0, due: 0, first: 0, last: 0, ms: {}, ...extra });
  const s01 = base.find((c) => c.id === "s01");
  const s02 = base.find((c) => c.id === "s02");
  const s03 = base.find((c) => c.id === "s03");
  return {
    app: "word-bank-trainer", format: 1, storageKey: "kollokations-trainer-v1", exported: "2026-11-01T10:00:00Z", cards: 4,
    state: {
      cards: [
        card({ id: "s01", cat: s01.cat, term: s01.term }, { box: 3, seen: 6, right: 5, wrong: 1, due: 20100, first: 20000, last: 20079, ms: { gap: [3, 1], choice: [2, 0] } }),
        card({ id: "s02", cat: s02.cat, term: s02.term }, { box: 1, seen: 2, right: 2, due: 20081, first: 20079, last: 20080, ms: { gap: [2, 0] } }),
        card({ id: "s03", cat: s03.cat, term: s03.term }),
        card({ id: "x99", cat: "Idiom", term: "pull the other one", de: "Das glaube ich nicht", sentence: "Oh, ____ the other one!", answer: "pull" }, { box: 2, seen: 3, right: 3, due: 20090 })
      ],
      deleted: ["f33"], seedVer: 24, drafts: { story: { ids: ["s01"], text: "Once…" } },
      prefs: { budget: 60, newPerDay: 20, speak: false }
    }
  };
}

test("alte Sicherung: Fortschritt wird je ID übernommen, Stufe 3 wird Stufe 4", () => {
  const s = parseBackup(JSON.stringify(oldBackup()), base);
  assert.equal(s.progress.s01.box, 4);
  assert.equal(s.progress.s01.due, 20100, "Fälligkeitsdatum bleibt");
  assert.deepEqual([s.progress.s01.seen, s.progress.s01.right, s.progress.s01.wrong], [6, 5, 1]);
  assert.deepEqual(s.progress.s01.ms, { gap: [3, 1], choice: [2, 0] });
  assert.equal(s.progress.s02.box, 1);
  assert.equal(migrateOldBox(2), 2);
});

test("alte Sicherung: Karten ohne Übung bekommen keinen Fortschritt", () => {
  const s = parseBackup(JSON.stringify(oldBackup()), base);
  assert.ok(!("s03" in s.progress));
});

test("alte Sicherung: unbekannte Karte wird zur eigenen Karte, bekannte nicht", () => {
  const s = parseBackup(JSON.stringify(oldBackup()), base);
  assert.deepEqual(s.custom.map((c) => c.id), ["x99"]);
  assert.equal(s.custom[0].term, "pull the other one");
  assert.equal(s.progress.x99.box, 2);
});

test("alte Sicherung: gelöschte Karten, Entwürfe und Einstellungen", () => {
  const s = parseBackup(JSON.stringify(oldBackup()), base);
  assert.deepEqual(s.deleted, ["f33"]);
  assert.equal(s.drafts.story.text, "Once…");
  assert.equal(s.prefs.budget, 60);
  assert.equal(s.prefs.newPerDay, 20);
  assert.equal(s.prefs.speak, false);
  assert.equal(s.prefs.rate, 0.92, "neue Einstellungen bekommen Standardwerte");
});

test("deine echte Export-Datei vom 19.11. lässt sich einlesen", () => {
  const s = parseBackup(read("../word-bank-trainer-lernstand-2026-11-19.json"), base);
  assert.deepEqual(Object.keys(s.progress), [], "kein Fortschritt in dieser Datei");
  assert.equal(s.custom.length, 0, "alle 278 Karten gibt es schon in data/");
  assert.equal(s.prefs.budget, 60);
  assert.equal(s.prefs.newPerDay, 20);
});

test("neues Format: Export und Import ergeben denselben Lernstand", () => {
  const s = createState();
  record(progressOf(s, "s01"), true, "gap", 20000);
  record(progressOf(s, "s02"), false, "choice", 20001);
  s.custom.push({ id: "u01", cat: "Idiom", term: "a", de: "b", prompt: "", sentence: "x ____", answer: "y" });
  s.deleted.push("f33");
  s.textLog.c1 = 20001;
  s.prefs.voice = "Daniel";
  const back = parseBackup(JSON.stringify(exportData(s)), base);
  assert.deepEqual(back, s);
});

test("kaputte oder fremde Dateien werden mit deutscher Meldung abgelehnt", () => {
  assert.throws(() => parseBackup("kein json", base), /keine gültige Sicherung/);
  assert.throws(() => parseBackup("[1,2]", base), /keine gültige Sicherung/);
  assert.throws(() => parseBackup('{"hallo":1}', base), /keine gültige Sicherung/);
  assert.throws(() => parseBackup('{"app":"word-bank-trainer","format":1,"state":{"cards":[]}}', base), /keine Karten/);
  assert.throws(() => parseBackup('{"app":"word-bank-trainer","format":9}', base), /neueren Version/);
});

test("Dateiname enthält das Datum", () => {
  assert.equal(backupName(new Date(2026, 10, 19)), "word-bank-trainer-lernstand-2026-11-19.json");
});

test("normalize repariert unvollständige und fehlerhafte Daten", () => {
  const s = normalize({ progress: { s01: { box: "x", seen: 2 }, bad: 5 }, prefs: { budget: "viel" }, deleted: [1, "a"], texts: [{ id: "t" }] });
  assert.equal(s.progress.s01.box, 0);
  assert.equal(s.progress.s01.seen, 2);
  assert.equal(s.progress.bad.seen, 0);
  assert.equal(s.prefs.budget, 40);
  assert.deepEqual(s.deleted, ["a"]);
  assert.deepEqual(s.texts, []);
});

test("Speichern und Laden über localStorage; kaputter Inhalt führt zum leeren Stand", () => {
  const st = fakeStorage();
  const s = createState();
  progressOf(s, "s01").seen = 3;
  assert.ok(save(st, s));
  assert.equal(load(st).progress.s01.seen, 3);
  assert.deepEqual(load(fakeStorage({ [STORAGE_KEY]: "{kaputt" })), createState());
  assert.equal(save({ setItem() { throw new Error("voll"); } }, s), false);
});

test("allCards: gelöschte Karten fehlen, eigene kommen dazu; neue IDs werden nie doppelt vergeben", () => {
  const s = createState();
  s.deleted.push("s01");
  s.custom.push({ id: "u01", term: "t" });
  const cards = allCards(base, s);
  assert.equal(cards.length, base.length - 1 + 1);
  assert.ok(!cards.some((c) => c.id === "s01"));
  assert.equal(nextCustomId(base, s), "u02");
  s.deleted.push("u02");
  assert.equal(nextCustomId(base, s), "u03", "gelöschte eigene IDs bleiben belegt");
});
