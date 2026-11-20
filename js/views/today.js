// Reiter „Heute“: Tagesplan nach Zeitbudget und neuen Karten pro Tag, dazu der Lernstand.
import { esc } from "../core/dom.js";
import { MODES, LEVELS } from "../core/modes.js";
import { buildPlan, planKey } from "../core/plan.js";
import { categoryOf, STATUS } from "../core/srs.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { ART } from "../core/art.js";
import { suggestTexts } from "../core/texts.js";
import { start, startText } from "./practice.js";

const BUDGETS = [20, 30, 40, 60, 90];
const NEW_PER_DAY = [5, 10, 15, 20, 30];

function tile(sym, n, label) {
  return `<div class="tile"><span class="sym" aria-hidden="true">${sym}</span><strong>${n}</strong><span>${esc(label)}</span></div>`;
}

const options = (vals, cur, unit = "") =>
  [...new Set([...vals, cur])].sort((a, b) => a - b).map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v}${unit}</option>`).join("");

export function render(root, app) {
  const day = today();
  const cards = app.cards();
  const { state } = app;
  if (!app.plan || app.plan.day !== day || app.plan.key !== planKey(state.prefs)) app.plan = buildPlan(cards, state, day);
  const plan = app.plan;
  const prog = (id) => state.progress[id];
  const doneToday = cards.filter((c) => prog(c.id) && prog(c.id).last === day).length;

  let h = ART.book + '<h1>Heute</h1><h2>Tagesplan</h2>' +
    `<p class="prompt">Geplant sind Aufgaben für etwa <strong>${plan.used} Minuten</strong> aus ${plan.pool} Kandidaten (fällige und neue Karten). Heute schon geübt: <strong>${doneToday}</strong> Karten.</p>` +
    '<div class="controls">' +
    `<label>Zeit <select id="bdSel">${options(BUDGETS, state.prefs.budget, " Minuten")}</select></label>` +
    `<label>Neue Karten pro Tag <select id="npSel">${options(NEW_PER_DAY, state.prefs.newPerDay)}</select></label>` +
    '<button type="button" class="small" id="rePlan">Neu planen</button></div>';

  if (!plan.blocks.length) {
    h += `<div class="summary">${ART.hourglass}<p>Für heute ist nichts mehr fällig${plan.skippedNew ? ", und das Limit für neue Karten ist erreicht" : ""}. Du kannst unter „Üben“ selbst etwas wählen.</p></div>`;
  } else {
    plan.blocks.forEach((b, i) => {
      const done = b.ids.filter((id) => prog(id) && prog(id).last === day).length;
      const M = MODES[b.mode];
      const all = done >= b.ids.length;
      h += `<div class="block">${icon(b.mode)}<div class="meta"><strong>${esc(M.label)}</strong><span>${b.ids.length} Karten · ca. ${b.mins} Min. · ${esc(LEVELS[M.lv])}${done ? " · " + done + " erledigt" : ""}</span></div>` +
        `<button type="button" class="small${all ? "" : " primary"}" data-blk="${i}">${all ? "Nochmal" : done ? "Fortsetzen" : "Start"}</button></div>`;
    });
    h += '<p class="hint">Die Reihenfolge geht von leicht zu schwer. Welche Übungsart eine Karte bekommt, hängt von ihrer Stufe ab: neue Karten starten mit Bedeutung, sichere Karten werden getippt, geprüft und angewendet.</p>';
  }

  // Stufe 5: die drei Texte, die am besten zum Lernstand passen
  const known = new Set(cards.map((c) => c.id));
  h += '<h2>Texte</h2><p class="prompt">Ein Lückentext übt mehrere Wendungen im Zusammenhang (ca. 6 Minuten).</p>';
  for (const { t } of suggestTexts(app.texts(), state, day, known, 3)) {
    h += `<div class="block">${icon("cloze")}<div class="meta"><strong>${esc(t.title)}</strong><span>${esc(t.kind)} · ${t.gaps.length} Lücken</span></div>` +
      `<button type="button" class="small" data-text="${esc(t.id)}">Öffnen</button></div>`;
  }

  const by = { new: 0, developing: 0, problem: 0, mastered: 0 };
  for (const c of cards) by[categoryOf(prog(c.id))]++;
  h += '<h2>Lernstand</h2><div class="tiles">' +
    tile("○", by.new, STATUS.new) + tile("◐", by.developing, STATUS.developing) +
    tile("▲", by.problem, STATUS.problem) + tile("●", by.mastered, STATUS.mastered) + "</div>";
  root.innerHTML = h;

  root.querySelectorAll("button[data-blk]").forEach((btn) => btn.addEventListener("click", () => {
    const b = plan.blocks[Number(btn.dataset.blk)];
    const open = b.ids.filter((id) => !prog(id) || prog(id).last !== day);
    start(app, b.mode, open.length ? open : b.ids);
  }));
  root.querySelectorAll("button[data-text]").forEach((btn) => btn.addEventListener("click", () => startText(app, btn.dataset.text)));
  root.querySelector("#bdSel").addEventListener("change", (e) => { state.prefs.budget = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#npSel").addEventListener("change", (e) => { state.prefs.newPerDay = Number(e.target.value); app.save(); render(root, app); });
  root.querySelector("#rePlan").addEventListener("click", () => { app.invalidatePlan(); render(root, app); });
}
