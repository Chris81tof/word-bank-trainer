// Reiter „Sammlung“: Suche, Leicht-Filter, Entfernen, eigene Karten (Formular und Prompt für Claude),
// Sicherung, Wiederherstellen und Zurücksetzen.
import { esc, copyText, setMsg, armed } from "../core/dom.js";
import { MODES, TRANSFER, cue, ans0 } from "../core/modes.js";
import { categoryOf, STATUS, MAX_BOX } from "../core/srs.js";
import { nextCustomId } from "../core/state.js";
import { exportData, backupName, parseBackup } from "../core/backup.js";
import { norm } from "../core/match.js";
import { today } from "../core/dates.js";
import { icon, catIcon } from "../core/icons.js";
import { CATS, checkCard, cardPrompt, parseCards } from "../core/cards.js";
import { REG, REGION } from "../exercises/common.js";
import { openEditor, editBtn } from "./editor.js";
import { levelOf as levelOfCard, isEdited } from "../core/edit.js";

const LABELS = { ...Object.fromEntries(Object.entries(MODES).map(([m, M]) => [m, M.label])), ...TRANSFER };
const LEVEL_OPTS = [["all", "Alle Karten"], ["core", "Vorschlag: sicher A1–B1"], ["edge", "Grenzfall B1/B2"], ["both", "Beides (zu leicht?)"], ["edited", "Bearbeitet"]];

const ui = { editing: null, scrollY: 0, q: "", level: "all", picked: new Set(), open: {} };
// Meldungen, die ein Neuzeichnen überleben: { msgId: [text, kind] }
let flash = {};

const levelOf = (app, c) => levelOfCard(app.levels, app.state, c);

function shown(app) {
  const q = norm(ui.q);
  return app.cards().filter((c) => {
    if (q && !norm([c.term, c.de, c.prompt, c.sentence].filter(Boolean).join(" ")).includes(q)) return false;
    const l = levelOf(app, c);
    if (ui.level === "edited") return isEdited(app.state, c.id);
    if (ui.level === "core" || ui.level === "edge") return l === ui.level;
    if (ui.level === "both") return !!l;
    return true;
  });
}

function removeCards(app, ids) {
  const { state } = app;
  const gone = new Set(ids);
  state.custom = state.custom.filter((c) => !gone.has(c.id));
  for (const id of ids) if (!state.deleted.includes(id)) state.deleted.push(id);
  for (const id of ids) ui.picked.delete(id);
  app.save();
  app.invalidatePlan();
}

function itemHtml(app, c, day) {
  const p = app.state.progress[c.id];
  const l = levelOf(app, c);
  const status = STATUS[categoryOf(p)] + (p && p.seen ? ` · Stufe ${p.box} von ${MAX_BOX}` : "");
  const ms = Object.entries((p && p.ms) || {}).map(([m, [r, w]]) => `${LABELS[m] || m} ${r}/${r + w}`).join(", ");
  return `<li><label class="sel"><input type="checkbox" data-sel="${esc(c.id)}"${ui.picked.has(c.id) ? " checked" : ""} aria-label="${esc(c.term)} auswählen"></label>` +
    `<div class="meta"><strong>${esc(c.term)}</strong>` +
    (isEdited(app.state, c.id) ? '<span class="edited">bearbeitet</span>' : "") +
    (l ? `<span class="lvl">${l === "core" ? "Vorschlag: A1–B1" : "Grenzfall B1/B2"}</span>` : "") +
    `<span class="catline">${icon(catIcon(c.cat))}${esc(c.cat)}${c.id.startsWith("u") ? " · eigene Karte" : ""} · ${esc(status)}</span>` +
    `<span>${esc(cue(c))}</span>` +
    '<details class="d"><summary>Details</summary>' +
    (c.sentence ? `<p>${esc(c.sentence.replace(/____/g, ans0(c)))}</p>` : "") +
    (c.note ? `<p>${esc(c.note)}</p>` : "") +
    (REG[c.reg] ? `<p>Register (Einschätzung): ${esc(REG[c.reg])}</p>` : "") +
    (REGION[c.region] ? `<p>Regionaler Gebrauch: ${esc(REGION[c.region])}</p>` : "") +
    `<p>Übungen (richtig/gesamt): ${ms ? esc(ms) : "noch keine"}</p>` +
    (p && p.hinted ? `<p>Mit Hinweis gelöst: ${p.hinted} Mal</p>` : "") +
    (c.hint ? `<p>Eigener Hinweis: ${esc(c.hint)}</p>` : "") +
    (p && p.seen ? `<p>Nächste Wiederholung: ${p.due <= day ? "heute fällig" : "in " + (p.due - day) + " Tagen"}</p>` : "") +
    `<p class="hint">ID ${esc(c.id)}</p></details></div>` +
    `<div class="acts">${editBtn(c.id, "small")}<button type="button" class="small" data-del="${esc(c.id)}" aria-label="${esc(c.term)} entfernen">Entfernen</button></div></li>`;
}

// Abschnitt zum Auf- und Zuklappen; der Zustand bleibt beim Neuzeichnen erhalten.
const section = (id, title, body) =>
  `<details class="sec" data-sec="${id}"${ui.open[id] ? " open" : ""}><summary>${esc(title)}</summary>${body}</details>`;

const msg = (id) => {
  const f = flash[id];
  return `<p class="msg${f ? " " + f[1] : ""}" id="${id}" role="status">${f ? esc(f[0]) : ""}</p>`;
};

export function render(root, app) {
  const rerender = () => render(root, app);
  const { state } = app;
  // Bearbeiten ersetzt die Seite, danach geht es zurück zur Liste
  if (ui.editing) {
    openEditor(root, app, ui.editing, (saved) => {
      if (saved) flash.delMsg = ["Karte gespeichert.", "ok"];
      ui.editing = null;
      rerender();
      window.scrollTo(0, ui.scrollY || 0);
    });
    window.scrollTo(0, 0);
    return;
  }

  let h = `<div class="sessionbar"><h1 class="withicon">${icon("library")}Sammlung</h1><a class="small btnlink iconbtn" href="#settings" aria-label="Einstellungen">${icon("settings")}</a></div>` +
    `<div class="controls"><label class="grow">Suche <input type="search" id="search" value="${esc(ui.q)}" placeholder="Wendung, Bedeutung, Satz" autocomplete="off" autocapitalize="none" spellcheck="false"></label>` +
    `<label>Filter <select id="lvl">${LEVEL_OPTS.map(([v, t]) => `<option value="${v}"${v === ui.level ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>` +
    '<p class="hint">Der Leicht-Filter ist eine eigene Einschätzung, keine offizielle Einstufung. So findest du Karten, die für C2 zu leicht sein könnten.</p>' +
    '<div class="btnrow"><button type="button" class="small" id="selShown">Alle gezeigten wählen</button><button type="button" class="small" id="selNone">Auswahl aufheben</button>' +
    '<button type="button" class="small" id="delSel">Auswahl entfernen</button></div>' +
    `<p class="hint" id="count"></p>${msg("delMsg")}<ul class="list lib" id="libList"></ul>`;

  h += section("add", "Eigene Karte anlegen",
    '<form id="addForm" class="form">' +
    `<label>Kategorie <select name="cat">${CATS.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>` +
    '<label>Wendung <input name="term" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="z. B. fly off the handle"></label>' +
    '<label>Bedeutung auf Deutsch <input name="de" autocomplete="off"></label>' +
    '<label>Erklärung auf Englisch (optional) <input name="prompt" autocomplete="off" spellcheck="false"></label>' +
    '<label>Beispielsatz mit Lücke ____ (optional) <input name="sentence" autocomplete="off" spellcheck="false" placeholder="He tends to ____ off the handle."></label>' +
    '<label>Lösung für die Lücke <input name="answer" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="fly"></label>' +
    '<label>Hinweis (optional) <input name="note" autocomplete="off"></label>' +
    '<div class="btnrow"><button type="submit" class="primary">Karte speichern</button></div></form>' + msg("addMsg") +
    '<p class="hint">Eigene Karten aus dem Formular haben keine falschen Optionen und keine schlichte Fassung. Auswahl, Fehlersuche und Umformulieren entfallen für sie. Vollständige Karten liefert Claude (nächster Abschnitt).</p>');

  const draft = state.drafts.cards || { terms: "", cat: CATS[0], count: 5 };
  h += section("claude", "Neue Karten von Claude",
    '<p class="hint">Trage Wendungen ein, eine pro Zeile, oder lass das Feld leer, dann schlägt Claude passende vor (ohne die, die du schon hast). Kopiere den Prompt in Claude und füge die Antwort unten ein.</p>' +
    `<label class="field" for="cTerms">Wendungen (optional)</label><textarea id="cTerms" class="mid" autocapitalize="none" spellcheck="false">${esc(draft.terms)}</textarea>` +
    '<div class="controls">' +
    `<label>Kategorie <select id="cCat">${CATS.map((c) => `<option${c === draft.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` +
    `<label>Anzahl <select id="cCount">${[5, 10, 15].map((n) => `<option value="${n}"${n === draft.count ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>` +
    '<div class="btnrow"><button type="button" class="primary" id="cCopy">Prompt kopieren</button></div>' + msg("cMsg") +
    '<label class="field" for="cPaste">Antwort von Claude hier einfügen</label><textarea id="cPaste" spellcheck="false" placeholder="[{&quot;cat&quot;: …, &quot;term&quot;: …}]"></textarea>' +
    '<div class="btnrow"><button type="button" id="cImport">Karten importieren</button></div>' + msg("iMsg"));

  h += section("backup", "Sicherung",
    '<p class="hint">Die Sicherung enthält deinen Lernstand, eigene Karten, importierte Texte und Einstellungen. Sichere regelmäßig, zum Beispiel in iCloud Drive oder einer Notiz.</p>' +
    '<div class="btnrow"><button type="button" class="primary" id="bDown">Sicherung herunterladen</button><button type="button" id="bShow">Als Text anzeigen</button></div>' +
    '<textarea id="bText" class="mid" readonly hidden></textarea><div class="btnrow" id="bCopyRow" hidden><button type="button" id="bCopy">Text kopieren</button></div>' + msg("bMsg") +
    '<h3>Wiederherstellen</h3><p class="hint">Liest neue Sicherungen und solche der alten Version. Der aktuelle Lernstand wird dabei ersetzt.</p>' +
    '<label class="field">Datei wählen <input type="file" id="rFile" accept=".json,application/json,text/plain"></label>' +
    '<label class="field" for="rText">oder Sicherungstext einfügen</label><textarea id="rText" class="mid" spellcheck="false"></textarea>' +
    '<div class="btnrow"><button type="button" id="rGo">Sicherung einspielen</button></div>' + msg("rMsg") +
    (state.custom.length ? '<h3>Eigene Karten übernehmen</h3><p class="hint">Kopiert deine eigenen Karten als JSON, um sie dauerhaft in <code>data/cards.json</code> aufzunehmen.</p>' +
      `<div class="btnrow"><button type="button" id="uCopy">${state.custom.length} eigene Karten kopieren</button></div>` + msg("uMsg") : ""));

  h += section("reset", "Zurücksetzen",
    '<div class="btnrow"><button type="button" id="resetProg">Lernstand zurücksetzen</button>' +
    `<button type="button" id="restoreSeed"${state.deleted.some((id) => app.base.some((c) => c.id === id)) ? "" : " disabled"}>Entfernte Startkarten zurückholen</button></div>` +
    '<p class="hint">Zurücksetzen löscht den Fortschritt aller Karten und die Entwürfe. Eigene Karten, importierte Texte und Einstellungen bleiben.</p>' + msg("tMsg"));

  root.innerHTML = h;
  flash = {};
  root.querySelectorAll("details.sec").forEach((d) => d.addEventListener("toggle", () => { ui.open[d.dataset.sec] = d.open; }));

  // Liste
  const list = root.querySelector("#libList");
  const drawList = () => {
    const day = today();
    const cards = shown(app);
    list.innerHTML = cards.map((c) => itemHtml(app, c, day)).join("") || "<li>Keine Karte gefunden.</li>";
    root.querySelector("#count").textContent = `${cards.length} von ${app.cards().length} Karten · ${ui.picked.size} ausgewählt`;
    root.querySelector("#delSel").disabled = ui.picked.size === 0;
    list.querySelectorAll("[data-del]").forEach((b) => armed(b, "Sicher?", () => {
      const own = state.custom.some((c) => c.id === b.dataset.del);
      removeCards(app, [b.dataset.del]);
      flash.delMsg = [own ? "Eigene Karte gelöscht." : "Karte entfernt. Startkarten holst du unter „Zurücksetzen“ zurück.", "ok"];
      rerender();
    }));
  };
  drawList();
  // Delegiert, denn die Liste wird beim Suchen neu gezeichnet
  list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-edit]");
    if (!b) return;
    ui.scrollY = window.scrollY;
    ui.editing = b.dataset.edit;
    rerender();
  });
  root.querySelector("#search").addEventListener("input", (e) => { ui.q = e.target.value; drawList(); });
  root.querySelector("#lvl").addEventListener("change", (e) => { ui.level = e.target.value; drawList(); });
  list.addEventListener("change", (e) => {
    const cb = e.target.closest("input[data-sel]");
    if (!cb) return;
    if (cb.checked) ui.picked.add(cb.dataset.sel); else ui.picked.delete(cb.dataset.sel);
    root.querySelector("#count").textContent = `${shown(app).length} von ${app.cards().length} Karten · ${ui.picked.size} ausgewählt`;
    root.querySelector("#delSel").disabled = ui.picked.size === 0;
  });
  root.querySelector("#selShown").addEventListener("click", () => { shown(app).forEach((c) => ui.picked.add(c.id)); drawList(); });
  root.querySelector("#selNone").addEventListener("click", () => { ui.picked.clear(); drawList(); });
  const delSel = root.querySelector("#delSel");
  delSel.addEventListener("click", () => {
    const n = ui.picked.size;
    if (!n) return;
    if (delSel.dataset.armed !== "1") {
      delSel.dataset.armed = "1";
      delSel.textContent = `Sicher? ${n} Karten entfernen`;
      setTimeout(() => { if (delSel.isConnected) { delSel.dataset.armed = ""; delSel.textContent = "Auswahl entfernen"; } }, 5000);
      return;
    }
    removeCards(app, [...ui.picked]);
    flash.delMsg = [`${n} Karten entfernt. Startkarten holst du unter „Zurücksetzen“ zurück.`, "ok"];
    rerender();
  });

  // Formular
  root.querySelector("#addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const { card, errors } = checkCard(f);
    if (errors.length) { setMsg(root.querySelector("#addMsg"), errors.join(" "), "err"); return; }
    if (app.cards().some((c) => c.term.toLowerCase() === card.term.toLowerCase())) {
      setMsg(root.querySelector("#addMsg"), `„${card.term}“ gibt es schon.`, "err");
      return;
    }
    state.custom.push({ id: nextCustomId(app.base, state), ...card });
    app.save();
    app.invalidatePlan();
    flash.addMsg = [`„${card.term}“ gespeichert.`, "ok"];
    rerender();
  });

  // Karten von Claude
  const keepDraft = () => {
    state.drafts.cards = {
      terms: root.querySelector("#cTerms").value,
      cat: root.querySelector("#cCat").value,
      count: Number(root.querySelector("#cCount").value)
    };
    app.save();
    return state.drafts.cards;
  };
  for (const id of ["cTerms", "cCat", "cCount"]) root.querySelector("#" + id).addEventListener("change", keepDraft);
  root.querySelector("#cCopy").addEventListener("click", () => {
    const d = keepDraft();
    copyText(cardPrompt({ terms: d.terms.split("\n"), cat: d.cat, count: d.count }, app.cards()), root.querySelector("#cMsg"));
  });
  root.querySelector("#cImport").addEventListener("click", () => {
    const raw = root.querySelector("#cPaste").value;
    if (!raw.trim()) { setMsg(root.querySelector("#iMsg"), "Erst die Antwort von Claude einfügen.", "err"); return; }
    const taken = [...app.base.map((c) => c.id), ...state.custom.map((c) => c.id), ...state.deleted];
    const { cards, errors, skipped } = parseCards(raw, app.cards(), taken);
    const parts = [];
    if (cards.length) parts.push(`${cards.length} Karten importiert: ${cards.map((c) => c.term).join(", ")}.`);
    if (skipped.length) parts.push(`Schon vorhanden, übersprungen: ${skipped.join(", ")}.`);
    if (errors.length) parts.push("Nicht übernommen: " + errors.join(" "));
    if (!cards.length) { setMsg(root.querySelector("#iMsg"), parts.join(" ") || "Keine Karten gefunden.", "err"); return; }
    state.custom.push(...cards);
    if (state.drafts.cards) state.drafts.cards.terms = "";
    app.save();
    app.invalidatePlan();
    flash.iMsg = [parts.join(" "), errors.length ? "err" : "ok"];
    rerender();
  });

  // Sicherung
  const backupText = () => JSON.stringify(exportData(state), null, 1);
  const showText = () => {
    const ta = root.querySelector("#bText");
    ta.value = backupText();
    ta.hidden = false;
    root.querySelector("#bCopyRow").hidden = false;
  };
  root.querySelector("#bDown").addEventListener("click", () => {
    try {
      const url = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = backupName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg(root.querySelector("#bMsg"), `„${backupName()}“ wird gespeichert. Falls keine Datei erscheint: „Als Text anzeigen“ und kopieren.`, "ok");
    } catch {
      showText();
      setMsg(root.querySelector("#bMsg"), "Als Datei ging es hier nicht. Kopiere den Text unten und sichere ihn zum Beispiel in einer Notiz.", "err");
    }
  });
  root.querySelector("#bShow").addEventListener("click", showText);
  root.querySelector("#bCopy").addEventListener("click", () => copyText(root.querySelector("#bText").value, root.querySelector("#bMsg")));
  root.querySelector("#rFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    file.text().then(
      (t) => { root.querySelector("#rText").value = t; setMsg(root.querySelector("#rMsg"), "Datei geladen. Tippe auf „Sicherung einspielen“.", "ok"); },
      () => setMsg(root.querySelector("#rMsg"), "Die Datei ließ sich nicht lesen.", "err")
    );
  });
  armed(root.querySelector("#rGo"), "Wirklich? Aktueller Stand wird ersetzt", () => {
    const raw = root.querySelector("#rText").value.trim();
    if (!raw) { setMsg(root.querySelector("#rMsg"), "Bitte zuerst eine Datei wählen oder den Sicherungstext einfügen.", "err"); return; }
    try {
      app.state = parseBackup(raw, app.base);
    } catch (err) {
      setMsg(root.querySelector("#rMsg"), err.message, "err");
      return;
    }
    app.save();
    app.invalidatePlan();
    ui.picked.clear();
    flash.rMsg = [`Sicherung eingespielt: Lernstand für ${Object.keys(app.state.progress).length} Karten, ${app.state.custom.length} eigene Karten.`, "ok"];
    rerender();
  });
  root.querySelector("#uCopy")?.addEventListener("click", () => copyText(JSON.stringify(state.custom, null, 2), root.querySelector("#uMsg")));

  // Zurücksetzen
  armed(root.querySelector("#resetProg"), "Wirklich? Noch einmal tippen", () => {
    state.progress = {};
    state.textLog = {};
    state.drafts = {};
    app.save();
    app.invalidatePlan();
    flash.tMsg = ["Lernstand zurückgesetzt.", "ok"];
    rerender();
  });
  root.querySelector("#restoreSeed").addEventListener("click", () => {
    const baseIds = new Set(app.base.map((c) => c.id));
    const n = state.deleted.filter((id) => baseIds.has(id)).length;
    state.deleted = state.deleted.filter((id) => !baseIds.has(id));
    app.save();
    app.invalidatePlan();
    flash.tMsg = [`${n} Startkarten zurückgeholt.`, "ok"];
    rerender();
  });
}
