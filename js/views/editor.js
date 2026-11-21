// Formular „Karte bearbeiten“: wird von den Übungen, dem Passiv-Durchlauf und der Sammlung benutzt.
import { esc, setMsg, armed } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { CATS, REG, REGION } from "../core/cards.js";
import { LEVEL_NAMES, formValues, saveEdit, restoreOriginal, isEdited, isCustom } from "../core/edit.js";

// Stift-Knopf; bindEdit hängt die Funktion an alle Stifte in root
export const editBtn = (id, cls = "") =>
  `<button type="button" class="iconbtn editbtn${cls ? " " + cls : ""}" data-edit="${esc(id)}" aria-label="Karte bearbeiten" title="Bearbeiten">${icon("edit")}</button>`;
export function bindEdit(root, fn) {
  root.querySelectorAll("button[data-edit]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); fn(b.dataset.edit); }));
}

const opts = (map, cur, first) =>
  (first !== undefined ? [`<option value=""${cur ? "" : " selected"}>${esc(first)}</option>`] : [])
    .concat(Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(v)}</option>`)).join("");

// Zeichnet das Formular in host. done(saved) wird nach Speichern, Wiederherstellen (true) oder Abbrechen (false) gerufen.
export function openEditor(host, app, id, done) {
  const card = app.cards().find((c) => c.id === id);
  if (!card) { done(false); return; }
  const v = formValues(app.levels, app.state, card);
  const cats = CATS.includes(v.cat) ? CATS : [...CATS, v.cat];
  const canRestore = !isCustom(id) && isEdited(app.state, id);
  host.innerHTML = `<div class="sessionbar"><h1>Karte bearbeiten</h1><span class="hint">${esc(id)}</span></div>` +
    '<form id="editForm" class="form" novalidate>' +
    `<label>Ausdruck <input name="term" value="${esc(v.term)}" autocomplete="off" autocapitalize="none" spellcheck="false"></label>` +
    `<label>Weitere richtige Schreibweisen des Ausdrucks (eine pro Zeile) <textarea name="alt" class="mid" autocapitalize="none" spellcheck="false">${esc(v.alt)}</textarea></label>` +
    `<label>Bedeutung auf Deutsch <input name="de" value="${esc(v.de)}" autocomplete="off"></label>` +
    `<label>Erklärung auf Englisch <textarea name="prompt" class="mid" spellcheck="false">${esc(v.prompt)}</textarea></label>` +
    `<label>Beispielsatz mit Lücke ____ <textarea name="sentence" class="mid" spellcheck="false">${esc(v.sentence)}</textarea></label>` +
    `<label>Lösung für die Lücke (mehrere mit | trennen) <input name="answer" value="${esc(v.answer)}" autocomplete="off" autocapitalize="none" spellcheck="false"></label>` +
    `<label>Notiz <textarea name="note" class="mid">${esc(v.note)}</textarea></label>` +
    `<label>Eigener Hinweis (erscheint bei „Hinweis“ in den Übungen, ohne die Lösung) <textarea name="hint" class="mid">${esc(v.hint)}</textarea></label>` +
    `<label>Kategorie <select name="cat">${cats.map((c) => `<option${c === v.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` +
    `<label>Register <select name="reg">${opts(REG, v.reg, "Keine Angabe")}</select></label>` +
    `<label>Regionaler Gebrauch <select name="region">${opts(REGION, v.region, "Keine Angabe (allgemein gebräuchlich)")}</select></label>` +
    `<label>Niveau-Einschätzung <select name="level">${opts({ core: LEVEL_NAMES.core, edge: LEVEL_NAMES.edge }, v.level, LEVEL_NAMES[""])}</select></label>` +
    '<p class="msg" id="editMsg" role="alert"></p>' +
    '<div class="btnrow"><button type="submit" class="primary">Speichern</button><button type="button" id="editCancel">Abbrechen</button></div>' +
    (canRestore ? '<div class="btnrow"><button type="button" id="editRestore">Original wiederherstellen</button></div>' : "") +
    "</form>" +
    (isCustom(id) ? '<p class="hint">Eigene Karte: Änderungen gelten sofort und ersetzen die Karte.</p>'
      : '<p class="hint">Deine Änderung gilt nur auf diesem Gerät. Die Karte in den Startdaten bleibt unverändert, Lernstand und ID auch.</p>');
  const form = host.querySelector("#editForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = saveEdit(app.state, app.base, app.levels, app.cards(), id, Object.fromEntries(new FormData(form)));
    if (r.errors) { setMsg(host.querySelector("#editMsg"), r.errors.join(" "), "err"); return; }
    app.save();
    app.invalidatePlan();
    done(true);
  });
  host.querySelector("#editCancel").addEventListener("click", () => done(false));
  const rb = host.querySelector("#editRestore");
  if (rb) armed(rb, "Wirklich? Noch einmal tippen", () => {
    restoreOriginal(app.state, id);
    app.save();
    app.invalidatePlan();
    done(true);
  });
  host.querySelector("input[name=term]").focus({ preventScroll: true });
}
