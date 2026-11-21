import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scaffold, hintLine, gapTarget, termTarget, wordsOf, buildOptions, gapOptions, termOptions, textGapOptions, hintLeaks } from "../js/core/hints.js";
import { hintHtml, newHint } from "../js/exercises/common.js";
import { newProgress, record, INTERVALS } from "../js/core/srs.js";
import { createState, progressOf, normalize } from "../js/core/state.js";
import { exportData, parseBackup } from "../js/core/backup.js";
import { summarize } from "../js/core/stats.js";
import { checkEdit } from "../js/core/edit.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const cards = read("../data/cards.json");
const texts = read("../data/texts.json");
const rand = () => 0.3;

test("Stufe 1: Kategorie und Gerüst mit Wortzahl", () => {
  assert.equal(hintLine("Phrasal verb", termTarget("to crack down"), 1), "Phrasal verb, 2 Wörter: _ _ _ _ _  _ _ _ _");
  assert.equal(hintLine("Collocation", gapTarget("fly"), 1), "Collocation, 1 Wort: _ _ _");
});

test("Stufe 2: Anfangsbuchstaben jedes Wortes", () => {
  assert.equal(hintLine("Phrasal verb", termTarget("to crack down"), 2), "Phrasal verb, 2 Wörter: c _ _ _ _  d _ _ _");
});

test("Ausdrücke: to, sth. und Klammern zählen nicht mit", () => {
  assert.deepEqual(wordsOf(termTarget("to take sth. into account")), ["take", "into", "account"]);
  assert.deepEqual(wordsOf(termTarget("be (very) keen on")), ["be", "keen", "on"]);
});

test("Varianten (alt): das Gerüst folgt der Hauptlösung", () => {
  assert.equal(hintLine("", gapTarget("flew|flown"), 1), "1 Wort: _ _ _ _");
  assert.deepEqual(wordsOf(termTarget("take account of sth.")), ["take", "account", "of"]);
});

test("Kein Hinweis vor Stufe 3 verrät die Lösung: bei allen Karten bleibt mindestens ein Strich", () => {
  for (const c of cards) {
    const targets = [termTarget(c.term), ...(c.answer ? [gapTarget(c.answer)] : [])];
    for (const t of targets) for (const level of [1, 2]) {
      const line = hintLine(c.cat, t, level).split(": ").slice(1).join(": ");
      assert.ok(line.includes("_"), `${c.id} Stufe ${level}: ${line}`);
    }
  }
  assert.equal(scaffold(["a"], true), "_", "ein einzelner Buchstabe wird nicht aufgedeckt");
});

test("Stufe 3: 4 Optionen mit der Lösung, ohne gleiche und ohne weitere richtige", () => {
  const c = cards.find((x) => x.sentence && x.wrong && x.answer);
  const o = gapOptions(c, cards, c.answer, rand);
  const main = c.answer.split("|")[0];
  assert.equal(o.length, 4);
  assert.ok(o.includes(main));
  assert.equal(new Set(o.map((x) => x.toLowerCase())).size, 4);
  assert.deepEqual(o.filter((x) => x !== main).sort(), [...c.wrong].sort(), "vorhandene Ablenker der Karte kommen zuerst");
});

test("Stufe 3 ohne Ablenker der Karte: passende Ausdrücke derselben Kategorie", () => {
  const c = cards.find((x) => x.cat === "Idiom");
  const o = termOptions({ ...c, wrong: undefined }, cards, rand);
  assert.equal(o.length, 4);
  assert.ok(o.includes(c.term));
  const sameCat = new Set(cards.filter((x) => x.cat === c.cat).map((x) => x.term));
  assert.ok(o.every((x) => sameCat.has(x)));
  const own = { id: "u01", cat: "Idiom", term: "pull the other one", answer: "pull" };
  const g = gapOptions(own, [own, ...cards], own.answer, rand);
  assert.equal(g.length, 4);
  assert.ok(g.includes("pull"));
});

test("Optionen: Varianten der Lösung erscheinen nie als Ablenker", () => {
  const o = buildOptions("flew", [["flown", "FLEW", "run", "go", "walk"]], ["flown"], rand);
  assert.ok(!o.includes("flown"));
  assert.equal(o.filter((x) => x.toLowerCase() === "flew").length, 1);
  assert.equal(o.length, 4);
});

test("Texte, Stufe 5: pro Lücke 4 Optionen mit der Lösung", () => {
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const t of texts) t.gaps.forEach(([id, ans], i) => {
    const others = t.gaps.filter((_, k) => k !== i).map((g) => g[1].split("|")[0]);
    const o = textGapOptions(byId.get(id), cards, ans, others, rand);
    const main = ans.split("|")[0];
    assert.equal(o.length, 4, `${t.id} Lücke ${i + 1}`);
    assert.ok(o.includes(main));
    for (const variant of ans.split("|").slice(1)) assert.ok(!o.includes(variant), `${t.id}: ${variant}`);
  });
});

test("Eigener Hinweis erscheint auf Stufe 1, nicht davor", () => {
  const c = { id: "x", cat: "Idiom", term: "to pull the other one", hint: "Man sagt es, wenn man jemandem nicht glaubt." };
  const spec = { c, target: termTarget(c.term), options: () => [] };
  const h = newHint();
  assert.ok(!hintHtml(h, spec).includes("Eigener Hinweis"));
  h.level = 1;
  const html = hintHtml(h, spec);
  assert.ok(html.includes("Eigener Hinweis: Man sagt es"));
  assert.ok(html.includes("Idiom, 4 Wörter"));
  assert.ok(html.includes("Nächster Hinweis (2 von 3)"));
  h.level = 3;
  h.opts = ["a", "pull the other one", "b", "c"];
  const h3 = hintHtml(h, spec);
  assert.equal([...h3.matchAll(/data-hopt/g)].length, 4);
  assert.ok(h3.includes("Lösung zeigen"));
});

test("Bewertung: richtig ohne Hinweis steigt auf wie bisher", () => {
  const p = Object.assign(newProgress(), { box: 2, seen: 2, right: 2 });
  record(p, true, "gap", 100, false);
  assert.equal(p.box, 3);
  assert.equal(p.due, 100 + INTERVALS[3]);
  assert.equal(p.hinted, 0);
});

test("Bewertung: richtig mit Hinweis bleibt auf der Stufe und kommt morgen wieder", () => {
  const p = Object.assign(newProgress(), { box: 3, seen: 3, right: 3, due: 100 });
  record(p, true, "gap", 100, true);
  assert.equal(p.box, 3);
  assert.equal(p.due, 101);
  assert.equal(p.right, 4, "zählt als richtig");
  assert.equal(p.hinted, 1);
  assert.deepEqual(p.ms.gap, [1, 0]);
  const fresh = newProgress();
  record(fresh, true, "translate", 100, true);
  assert.equal(fresh.box, 0);
  assert.equal(fresh.due, 101);
  assert.equal(fresh.seen, 1);
});

test("Bewertung: „Lösung zeigen“ ist falsch, auch nach Hinweisen", () => {
  const p = Object.assign(newProgress(), { box: 3, seen: 3, right: 3 });
  record(p, false, "gap", 100, false);
  assert.equal(p.box, 0);
  assert.equal(p.due, 100);
  assert.equal(p.wrong, 1);
  assert.equal(p.hinted, 0, "nur gelöste Karten zählen als „mit Hinweis“");
});

test("Statistik zählt, wie oft Karten mit Hinweis gelöst wurden; der Zähler übersteht Sicherung", () => {
  const s = createState();
  record(progressOf(s, "s01"), true, "gap", 100, true);
  record(progressOf(s, "s01"), true, "gap", 101, true);
  record(progressOf(s, "s02"), true, "gap", 101, true);
  const st = summarize(cards.slice(0, 3), s.progress, 101);
  assert.equal(st.hinted, 3);
  assert.equal(st.hintedCards, 2);
  const back = parseBackup(JSON.stringify(exportData(s)), cards);
  assert.equal(back.progress.s01.hinted, 2);
  assert.equal(normalize({ progress: { a: { seen: 1 } } }).progress.a.hinted, 0, "alte Sicherungen: 0");
});

test("Eigener Hinweis: darf die Lösung nicht verraten", () => {
  assert.ok(hintLeaks({ hint: "Das Wort ist fly.", answer: "fly|flies", term: "fly off the handle" }));
  assert.ok(hintLeaks({ hint: "Die Wendung lautet: fly off the handle", answer: "fly", term: "fly off the handle" }));
  assert.ok(!hintLeaks({ hint: "Beginnt mit einem Tier, das fliegt.", answer: "fly", term: "fly off the handle" }), "Teile von Wörtern zählen nicht");
  assert.ok(!hintLeaks({ hint: "", answer: "fly", term: "x" }));
  const c = cards.find((x) => x.sentence && x.wrong);
  const form = { term: c.term, alt: "", de: c.de, prompt: "", sentence: c.sentence, answer: c.answer, note: "", cat: c.cat, reg: "", region: "", level: "" };
  assert.match(checkEdit(c, { ...form, hint: "Lösung: " + c.answer.split("|")[0] + " genau." }).errors.join(" "), /verrät die Lösung/);
  const ok = checkEdit(c, { ...form, hint: "Denk an die deutsche Bedeutung." });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.fields.hint, "Denk an die deutsche Bedeutung.");
});

test("Daten: ein eigener Hinweis in cards.json verrät die Lösung nicht", () => {
  for (const c of cards) if (c.hint) assert.ok(!hintLeaks(c), c.id);
});
