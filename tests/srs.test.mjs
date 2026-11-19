import { test } from "node:test";
import assert from "node:assert/strict";
import { INTERVALS, MASTERED, newProgress, record, categoryOf, isDue } from "../js/core/srs.js";

const D = 20000;

test("aktive Übungen führen über alle 6 Stufen mit wachsenden Abständen", () => {
  const p = newProgress();
  for (let box = 1; box <= 6; box++) {
    record(p, true, "gap", D);
    assert.equal(p.box, box);
    assert.equal(p.due, D + INTERVALS[box]);
  }
  record(p, true, "gap", D);
  assert.equal(p.box, 6, "über Stufe 6 hinaus geht es nicht");
  assert.equal(p.due, D + 60);
});

test("Mastered ab Stufe 4", () => {
  const p = newProgress();
  for (let i = 0; i < 3; i++) record(p, true, "translate", D);
  assert.equal(categoryOf(p), "developing");
  record(p, true, "translate", D);
  assert.equal(p.box, MASTERED);
  assert.equal(categoryOf(p), "mastered");
});

test("Auswahl und Bedeutung bringen höchstens auf Stufe 1", () => {
  const p = newProgress();
  record(p, true, "choice", D);
  record(p, true, "meaning", D);
  assert.equal(p.box, 1);
  assert.equal(p.due, D + 1, "an der Grenze: Abstand der aktuellen Stufe");
});

test("Karteikarten und Erklären bringen höchstens auf Stufe 2", () => {
  const p = newProgress();
  for (let i = 0; i < 4; i++) record(p, true, i % 2 ? "cards" : "explain", D);
  assert.equal(p.box, 2);
  assert.equal(p.due, D + 3);
});

test("eine hohe Stufe sinkt durch eine richtige Auswahlaufgabe nicht", () => {
  const p = Object.assign(newProgress(), { box: 5, seen: 5, right: 5 });
  record(p, true, "choice", D);
  assert.equal(p.box, 5);
  assert.equal(p.due, D + 30);
});

test("Fehler: zurück auf 0, bei Auswahl nur eine Stufe", () => {
  const a = Object.assign(newProgress(), { box: 4, seen: 4, right: 4 });
  record(a, false, "gap", D);
  assert.equal(a.box, 0);
  assert.equal(a.due, D);
  const b = Object.assign(newProgress(), { box: 3, seen: 3, right: 3 });
  record(b, false, "choice", D);
  assert.equal(b.box, 2);
  assert.equal(b.due, D);
});

test("Zähler, erster und letzter Tag, Ergebnisse je Übung", () => {
  const p = newProgress();
  record(p, true, "gap", D);
  record(p, false, "gap", D + 2);
  assert.deepEqual([p.seen, p.right, p.wrong, p.first, p.last], [2, 1, 1, D, D + 2]);
  assert.deepEqual(p.ms.gap, [1, 1]);
});

test("Status problematisch und fällig", () => {
  const p = newProgress();
  assert.equal(categoryOf(p), "new");
  assert.ok(isDue(p, D));
  record(p, false, "gap", D);
  record(p, false, "gap", D);
  assert.equal(categoryOf(p), "problem");
  record(p, true, "gap", D);
  assert.ok(!isDue(p, D));
  assert.ok(isDue(p, D + 1));
});
