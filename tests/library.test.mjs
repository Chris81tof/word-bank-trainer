// Sammlung: Filter, Suche, Nachladen in Abschnitten, Aufklappen und die Verdrahtung der Ansicht.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE, STAT_OPTS, matches, filterCards, categoriesOf, statusLabel, nextShown, restCount, toggleOne, toggleIn } from "../js/core/library.js";
import { newProgress, record } from "../js/core/srs.js";
import { createState } from "../js/core/state.js";
import { levelOf } from "../js/core/edit.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const cards = JSON.parse(read("../data/cards.json"));
const levels = JSON.parse(read("../data/levels.json"));
const D = 20000;

// Lernstand: s01 problematisch, s02 gemeistert, s03 in Arbeit und fällig, s04 in Arbeit, noch nicht fällig; s05 bearbeitet
function setup() {
  const state = createState();
  const p = (id, fn) => { state.progress[id] = fn(newProgress()); };
  p("s01", (x) => { record(x, false, "gap", D - 3); record(x, false, "gap", D - 2); return x; });
  p("s02", (x) => { for (let i = 0; i < 5; i++) record(x, true, "gap", D - 100); x.due = D + 50; return x; });
  p("s03", (x) => { record(x, true, "gap", D - 5); x.due = D - 1; return x; });
  p("s04", (x) => { record(x, true, "gap", D); return x; });
  state.fixes.s05 = { de: "geändert" };
  const ctx = { progress: state.progress, day: D, levelOf: (c) => levelOf(levels, state, c), isEdited: (id) => !!state.fixes[id] };
  return { state, ctx };
}
const ids = (list) => list.map((c) => c.id);
const f = (o = {}) => ({ q: "", cat: "all", stat: "all", ...o });

test("Aufklappen: immer nur ein Eintrag offen, erneut antippen schließt", () => {
  let tool = "";
  tool = toggleOne(tool, "add");
  assert.equal(tool, "add");
  tool = toggleOne(tool, "backup");
  assert.equal(tool, "backup", "ein anderes Werkzeug ersetzt das offene");
  tool = toggleOne(tool, "backup");
  assert.equal(tool, "", "erneut antippen schließt");
  const open = ["add", "claude", "backup", "reset"].map((id) => id === toggleOne("claude", "reset"));
  assert.equal(open.filter(Boolean).length, 1);
});

test("Auswahl: Karten an- und abwählen", () => {
  const s = new Set();
  toggleIn(s, "a");
  toggleIn(s, "b");
  assert.deepEqual([...s], ["a", "b"]);
  toggleIn(s, "a");
  assert.deepEqual([...s], ["b"]);
});

test("ohne Filter bleiben alle Karten", () => {
  const { ctx } = setup();
  assert.equal(filterCards(cards, f(), ctx).length, cards.length);
});

test("Suche: in Wendung, Bedeutung und Satz, ohne Groß- und Kleinschreibung", () => {
  const { ctx } = setup();
  assert.ok(ids(filterCards(cards, f({ q: "BUNK" }), ctx)).includes("s01"));
  assert.ok(ids(filterCards(cards, f({ q: "schwänzen" }), ctx)).includes("s01"), "Bedeutung");
  assert.ok(ids(filterCards(cards, f({ q: "shopping centre" }), ctx)).includes("s01"), "Satz");
  assert.ok(ids(filterCards(cards, f({ q: "  bunk off. " }), ctx)).includes("s01"), "Leerzeichen und Punkt am Ende");
  assert.deepEqual(filterCards(cards, f({ q: "qqqxyz" }), ctx), []);
});

test("Kategorie: nur Karten dieser Kategorie, und die Liste der Kategorien passt dazu", () => {
  const { ctx } = setup();
  const cats = categoriesOf(cards);
  assert.deepEqual(cats.slice(0, 4), ["Phrasal verb", "Collocation", "Word formation", "Idiom"]);
  assert.equal(new Set(cats).size, cats.length);
  for (const cat of cats) {
    const list = filterCards(cards, f({ cat }), ctx);
    assert.ok(list.length > 0, cat);
    assert.ok(list.every((c) => c.cat === cat));
  }
  assert.deepEqual(categoriesOf([{ cat: "Zeta" }, { cat: "Idiom" }, { cat: "Alpha" }]), ["Idiom", "Alpha", "Zeta"], "eigene Kategorien am Ende, sortiert");
});

test("Lernstand: neu, in Arbeit, problematisch, gemeistert, fällig", () => {
  const { ctx } = setup();
  const by = (stat) => ids(filterCards(cards, f({ stat }), ctx));
  assert.deepEqual(by("problem"), ["s01"]);
  assert.deepEqual(by("mastered"), ["s02"]);
  assert.deepEqual(by("developing").sort(), ["s03", "s04"]);
  assert.equal(by("new").length, cards.length - 4);
  assert.deepEqual(by("due").sort(), ["s01", "s03"], "geübt und heute oder früher fällig; s04 und s02 nicht");
  assert.equal(by("problem").length + by("mastered").length + by("developing").length + by("new").length, cards.length, "jede Karte hat genau einen Lernstand");
});

test("Niveau: jede Stufe einzeln, „Bis B1“, „Ohne Niveau“ und Bearbeitet", () => {
  const { state, ctx } = setup();
  const by = (stat) => ids(filterCards(cards, f({ stat }), ctx));
  const inFile = (l) => Object.values(levels).filter((v) => v === l).length;
  for (const l of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.equal(by(l).length, inFile(l), l);
  assert.equal(by("easy").length, inFile("A1") + inFile("A2") + inFile("B1"));
  assert.equal(by("nolevel").length, cards.length - Object.keys(levels).length);
  assert.deepEqual(by("edited"), ["s05"]);
  // eine Korrektur ändert das Niveau einer Karte: erst Teil von B2, dann von C1, dann ohne Niveau
  const b2 = by("B2")[0];
  state.fixes[b2] = { level: "C1" };
  assert.ok(!by("B2").includes(b2) && by("C1").includes(b2));
  state.fixes[b2] = { level: "" };
  assert.ok(by("nolevel").includes(b2) && !by("easy").includes(b2));
});

test("Filter wirken zusammen; unbekannter Lernstand zählt als „alle“", () => {
  const { ctx } = setup();
  const list = filterCards(cards, f({ q: "bunk", cat: "Phrasal verb", stat: "problem" }), ctx);
  assert.deepEqual(ids(list), ["s01"]);
  assert.deepEqual(filterCards(cards, f({ q: "bunk", cat: "Idiom" }), ctx), []);
  assert.ok(matches(cards[0], { q: "", cat: "all", stat: "gibt-es-nicht" }, ctx));
  assert.ok(matches(cards[0], {}, ctx), "fehlende Felder");
});

test("jeder Eintrag im Lernstand-Filter ist ein bekannter Wert", () => {
  const values = STAT_OPTS.flatMap(([, items]) => items.map(([v]) => v));
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.includes("all"));
  for (const v of ["new", "developing", "problem", "mastered", "due", "A1", "A2", "B1", "B2", "C1", "C2", "easy", "nolevel", "edited"]) assert.ok(values.includes(v), v);
  for (const v of ["core", "edge", "both"]) assert.ok(!values.includes(v), `${v} gibt es nicht mehr`);
});

test("Nachladen: 50 Karten pro Abschnitt, am Ende nichts mehr", () => {
  assert.equal(PAGE, 50);
  assert.equal(nextShown(50, 578), 100);
  assert.equal(nextShown(550, 578), 578, "nicht über das Ende hinaus");
  assert.equal(restCount(550, 578), 28);
  assert.equal(restCount(578, 578), 0);
  assert.equal(restCount(0, 30), 30);
  // alle Abschnitte nacheinander
  let shown = PAGE;
  let steps = 0;
  while (restCount(shown, 578)) { shown = nextShown(shown, 578); steps++; }
  assert.deepEqual([shown, steps], [578, 11]);
  // 500 und mehr Karten: Filtern bleibt schnell
  const big = Array.from({ length: 5000 }, (_, i) => ({ id: "u" + i, cat: i % 2 ? "Idiom" : "Collocation", term: "wendung " + i, de: "bedeutung " + i, sentence: "ein satz " + i }));
  const t0 = performance.now();
  const hit = filterCards(big, f({ q: "wendung 49", cat: "Idiom" }), { progress: {}, day: D, levelOf: () => "", isEdited: () => false });
  assert.ok(performance.now() - t0 < 500);
  assert.ok(hit.length > 0 && hit.every((c) => c.cat === "Idiom"));
});

test("Lernstand in der Zeile", () => {
  assert.equal(statusLabel(undefined), "Neu");
  assert.equal(statusLabel(newProgress()), "Neu");
  const a = newProgress();
  record(a, true, "gap", D);
  record(a, true, "gap", D);
  assert.equal(statusLabel(a), "Stufe 2");
  for (let i = 0; i < 2; i++) record(a, true, "gap", D);
  assert.equal(statusLabel(a), "Mastered");
  const b = newProgress();
  record(b, false, "gap", D);
  record(b, false, "gap", D);
  assert.equal(statusLabel(b), "Problematic");
});

// Die Ansicht selbst läuft nur im Browser. Diese Prüfungen fangen Tippfehler bei Verknüpfungen ab.
const view = read("../js/views/library.js");

test("Ansicht lädt ohne Fehler und bietet render und leave", async () => {
  const m = await import("../js/views/library.js");
  assert.equal(typeof m.render, "function");
  assert.equal(typeof m.leave, "function");
});

test("Ansicht: jede abgefragte Element-ID gibt es im erzeugten HTML", () => {
  const queried = new Set([...view.matchAll(/\$\("#([A-Za-z]+)"\)/g)].map((m) => m[1]));
  // Meldungszeilen entstehen über msg("id"), alle anderen stehen als id="…" im HTML
  const present = (id) => view.includes(`id="${id}"`) || view.includes(`msg("${id}")`);
  const missing = [...queried].filter((id) => !present(id));
  assert.deepEqual(missing, [], "im HTML fehlt eine ID, die der Code sucht");
  assert.ok(queried.size > 25);
});

test("Ansicht: alle bisherigen Funktionen sind noch verdrahtet", () => {
  for (const id of ["addForm", "cCopy", "cImport", "bDown", "bShow", "bCopy", "rFile", "rGo", "uCopy", "resetProg", "restoreSeed", "delSel", "selAll", "selNone"]) {
    assert.ok(view.includes(`$("#${id}")`), id);
  }
  for (const fn of ["checkCard(", "parseCards(", "cardPrompt(", "parseBackup(", "exportData(", "removeCards(", "openEditor("]) assert.ok(view.includes(fn), fn);
  assert.ok(view.includes("armed("), "Zwei-Tipp-Sicherung beim Zurücksetzen und Einspielen");
});

test("Ansicht: vier Werkzeuge, zugeklappt, mit Beschriftung", () => {
  const tools = [...view.matchAll(/tool\("([a-z]+)", "([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(tools, [["add", "Eigene Karte anlegen"], ["claude", "Neue Karten von Claude"], ["backup", "Sichern und Wiederherstellen"], ["reset", "Zurücksetzen"]]);
  assert.ok(view.includes('aria-expanded="${open}"') && view.includes("aria-controls"));
  assert.match(view, /const ui = \{[^}]*tool: ""/, "beim Start ist kein Werkzeug offen");
});

test("Ansicht: Zeilen sind Knöpfe mit Beschriftung, Details erst beim Aufklappen", () => {
  assert.match(view, /<button type="button" class="lhead"/);
  assert.ok(view.includes('class="sr"'), "Kategorie für Screenreader");
  assert.ok(view.includes("open ? detailHtml(app, c, day)"), "Details nur bei aufgeklappter Zeile");
});

test("CSS: Tippflächen mindestens 44 Pixel, Leiste angepinnt, flaches Querformat in einer Zeile", () => {
  const css = read("../css/components.css");
  assert.match(read("../css/tokens.css"), /--tap: 44px/);
  assert.match(css, /\.libbar \{[^}]*position: sticky; top: 0/);
  assert.match(css, /\.toolhead \{[^}]*min-height: var\(--tap\)/);
  assert.match(css, /\.lhead \{[^}]*min-height: 48px/);
  assert.match(css, /\.ld \.acts button \{[^}]*min-height: var\(--tap\)/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(css, /\.libbar \.libsel\[hidden\] \{ display: none; \}/, "hidden muss gegen display:flex gewinnen");
});
