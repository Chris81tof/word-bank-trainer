// Reiter „Sammlung“: Werkzeuge (zugeklappt, immer nur eines offen), angepinnte Suche mit Filtern,
// schlanke Kartenliste, die in Abschnitten nachlädt. Dazu Entfernen, eigene Karten, Prompt für Claude,
// Sicherung, Wiederherstellen und Zurücksetzen.
import { esc, copyText, setMsg, armed } from "../core/dom.js";
import { MODES, TRANSFER, cue, ans0 } from "../core/modes.js";
import { categoryOf, STATUS, MAX_BOX } from "../core/srs.js";
import { nextCustomId } from "../core/state.js";
import { exportData, backupName, parseBackup } from "../core/backup.js";
import { today } from "../core/dates.js";
import { icon, catIcon } from "../core/icons.js";
import { CATS, checkCard, cardPrompt, parseCards } from "../core/cards.js";
import { REG, REGION } from "../exercises/common.js";
import { openEditor } from "./editor.js";
import { levelOf as levelOfCard, isEdited } from "../core/edit.js";
import { PAGE, STAT_OPTS, filterCards, categoriesOf, statusLabel, nextShown, restCount, toggleOne, toggleIn } from "../core/library.js";

const LABELS = { ...Object.fromEntries(Object.entries(MODES).map(([m, M]) => [m, M.label])), ...TRANSFER };

// tool: das offene Werkzeug, expanded: die aufgeklappte Karte, shown: wie viele Karten gezeichnet werden
const ui = { editing: null, scrollY: 0, q: "", cat: "all", stat: "all", shown: PAGE, tool: "", expanded: "", selecting: false, picked: new Set() };
// Meldungen, die ein Neuzeichnen überleben: { msgId: [text, kind] }
let flash = {};
let io = null;

export function leave() {
  if (io) { io.disconnect(); io = null; }
  document.getElementById("view")?.classList.remove("libpage");
}

const levelOf = (app, c) => levelOfCard(app.levels, app.state, c);

function matched(app) {
  return filterCards(app.cards(), ui, {
    progress: app.state.progress,
    day: today(),
    levelOf: (c) => levelOf(app, c),
    isEdited: (id) => isEdited(app.state, id)
  });
}

function removeCards(app, ids) {
  const { state } = app;
  const gone = new Set(ids);
  state.custom = state.custom.filter((c) => !gone.has(c.id));
  for (const id of ids) if (!state.deleted.includes(id)) state.deleted.push(id);
  for (const id of ids) ui.picked.delete(id);
  if (gone.has(ui.expanded)) ui.expanded = "";
  app.save();
  app.invalidatePlan();
}

// Eine Zeile: Kategoriesymbol, Ausdruck, Lernstand. Die Details entstehen erst beim Aufklappen.
function rowHtml(app, c, day) {
  const p = app.state.progress[c.id];
  const open = !ui.selecting && ui.expanded === c.id;
  const picked = ui.picked.has(c.id);
  const head = ui.selecting ? `role="checkbox" aria-checked="${picked}"` : `aria-expanded="${open}"`;
  return `<li class="lrow" data-id="${esc(c.id)}"><button type="button" class="lhead" ${head}>` +
    (ui.selecting ? `<span class="box${picked ? " on" : ""}" aria-hidden="true"></span>` : "") +
    `${icon(catIcon(c.cat))}<span class="sr">${esc(c.cat)}: </span><span class="t">${esc(c.term)}</span>` +
    `<span class="st${categoryOf(p) === "problem" ? " p" : ""}">${esc(statusLabel(p))}</span></button>` +
    `<div class="ld"${open ? "" : " hidden"}>${open ? detailHtml(app, c, day) : ""}</div></li>`;
}

function detailHtml(app, c, day) {
  const p = app.state.progress[c.id];
  const l = levelOf(app, c);
  const ms = Object.entries((p && p.ms) || {}).map(([m, [r, w]]) => `${LABELS[m] || m} ${r}/${r + w}`).join(", ");
  const status = STATUS[categoryOf(p)] + (p && p.seen ? ` · Stufe ${p.box} von ${MAX_BOX}` : "");
  return `<p>${esc(c.cat)}${c.id.startsWith("u") ? " · eigene Karte" : ""} · ${esc(status)}${isEdited(app.state, c.id) ? ' · <span class="edited">bearbeitet</span>' : ""}</p>` +
    (cue(c) ? `<p>${esc(cue(c))}</p>` : "") +
    (c.sentence ? `<p>${esc(c.sentence.replace(/____/g, ans0(c)))}</p>` : "") +
    (c.note ? `<p>${esc(c.note)}</p>` : "") +
    (REG[c.reg] ? `<p>Register (Einschätzung): ${esc(REG[c.reg])}</p>` : "") +
    (REGION[c.region] ? `<p>Regionaler Gebrauch: ${esc(REGION[c.region])}</p>` : "") +
    (l ? `<p>Niveau: ${esc(l)} (eigene Einschätzung, keine offizielle Einstufung)</p>` : "") +
    `<p>Übungen (richtig/gesamt): ${ms ? esc(ms) : "noch keine"}</p>` +
    (p && p.hinted ? `<p>Mit Hinweis gelöst: ${p.hinted} Mal</p>` : "") +
    (c.hint ? `<p>Eigener Hinweis: ${esc(c.hint)}</p>` : "") +
    (p && p.seen ? `<p>Nächste Wiederholung: ${p.due <= day ? "heute fällig" : "in " + (p.due - day) + " Tagen"}</p>` : "") +
    `<p class="hint">ID ${esc(c.id)}</p>` +
    `<div class="acts"><button type="button" data-edit="${esc(c.id)}">${icon("edit")} Bearbeiten</button>` +
    `<button type="button" data-del="${esc(c.id)}" aria-label="${esc(c.term)} entfernen">Entfernen</button></div>`;
}

// Werkzeug: zugeklappter Bereich; ob er offen ist, steht in ui.tool
const tool = (id, title, body) => {
  const open = ui.tool === id;
  return `<section class="tool" data-tool="${id}"><button type="button" class="toolhead" id="th-${id}" aria-expanded="${open}" aria-controls="tb-${id}">${esc(title)}</button>` +
    `<div class="toolbody" id="tb-${id}" role="region" aria-labelledby="th-${id}"${open ? "" : " hidden"}>${body}</div></section>`;
};

const msg = (id) => {
  const f = flash[id];
  return `<p class="msg${f ? " " + f[1] : ""}" id="${id}" role="status">${f ? esc(f[0]) : ""}</p>`;
};

export function render(root, app) {
  leave();
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
  root.classList.add("libpage");
  const all = app.cards();
  if (ui.cat !== "all" && !all.some((c) => c.cat === ui.cat)) ui.cat = "all";

  const cats = categoriesOf(all);
  let h = `<div class="sessionbar"><h1 class="withicon">${icon("library")}Sammlung</h1><a class="small btnlink iconbtn" href="#settings" aria-label="Einstellungen">${icon("settings")}</a></div>`;

  h += '<div class="tools">';
  h += tool("add", "Eigene Karte anlegen",
    '<form id="addForm" class="form">' +
    `<label>Kategorie <select name="cat">${CATS.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>` +
    '<label>Wendung <input name="term" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="z. B. fly off the handle"></label>' +
    '<label>Bedeutung auf Deutsch <input name="de" autocomplete="off"></label>' +
    '<label>Erklärung auf Englisch (optional) <input name="prompt" autocomplete="off" spellcheck="false"></label>' +
    '<label>Beispielsatz mit Lücke ____ (optional) <input name="sentence" autocomplete="off" spellcheck="false" placeholder="He tends to ____ off the handle."></label>' +
    '<label>Lösung für die Lücke <input name="answer" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="fly"></label>' +
    '<label>Hinweis (optional) <input name="note" autocomplete="off"></label>' +
    '<div class="btnrow"><button type="submit" class="primary">Karte speichern</button></div></form>' + msg("addMsg") +
    '<p class="hint">Eigene Karten aus dem Formular haben keine falschen Optionen und keine schlichte Fassung. Auswahl, Fehlersuche und Umformulieren entfallen für sie. Vollständige Karten liefert Claude (nächster Bereich).</p>');

  const draft = state.drafts.cards || { terms: "", cat: CATS[0], count: 5 };
  h += tool("claude", "Neue Karten von Claude",
    '<p class="hint">Trage Wendungen ein, eine pro Zeile, oder lass das Feld leer, dann schlägt Claude passende vor (ohne die, die du schon hast). Kopiere den Prompt in Claude und füge die Antwort unten ein.</p>' +
    `<label class="field" for="cTerms">Wendungen (optional)</label><textarea id="cTerms" class="mid" autocapitalize="none" spellcheck="false">${esc(draft.terms)}</textarea>` +
    '<div class="controls">' +
    `<label>Kategorie <select id="cCat">${CATS.map((c) => `<option${c === draft.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` +
    `<label>Anzahl <select id="cCount">${[5, 10, 15].map((n) => `<option value="${n}"${n === draft.count ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>` +
    '<div class="btnrow"><button type="button" class="primary" id="cCopy">Prompt kopieren</button></div>' + msg("cMsg") +
    '<label class="field" for="cPaste">Antwort von Claude hier einfügen</label><textarea id="cPaste" spellcheck="false" placeholder="[{&quot;cat&quot;: …, &quot;term&quot;: …}]"></textarea>' +
    '<div class="btnrow"><button type="button" id="cImport">Karten importieren</button></div>' + msg("iMsg"));

  h += tool("backup", "Sichern und Wiederherstellen",
    '<p class="hint">Die Sicherung enthält deinen Lernstand, eigene Karten, importierte Texte und Einstellungen. Sichere regelmäßig, zum Beispiel in iCloud Drive oder einer Notiz.</p>' +
    '<div class="btnrow"><button type="button" class="primary" id="bDown">Sicherung herunterladen</button><button type="button" id="bShow">Als Text anzeigen</button></div>' +
    '<textarea id="bText" class="mid" readonly hidden></textarea><div class="btnrow" id="bCopyRow" hidden><button type="button" id="bCopy">Text kopieren</button></div>' + msg("bMsg") +
    '<h3>Wiederherstellen</h3><p class="hint">Liest neue Sicherungen und solche der alten Version. Der aktuelle Lernstand wird dabei ersetzt.</p>' +
    '<label class="field">Datei wählen <input type="file" id="rFile" accept=".json,application/json,text/plain"></label>' +
    '<label class="field" for="rText">oder Sicherungstext einfügen</label><textarea id="rText" class="mid" spellcheck="false"></textarea>' +
    '<div class="btnrow"><button type="button" id="rGo">Sicherung einspielen</button></div>' + msg("rMsg") +
    (state.custom.length ? '<h3>Eigene Karten übernehmen</h3><p class="hint">Kopiert deine eigenen Karten als JSON, um sie dauerhaft in <code>data/cards.json</code> aufzunehmen.</p>' +
      `<div class="btnrow"><button type="button" id="uCopy">${state.custom.length} eigene Karten kopieren</button></div>` + msg("uMsg") : ""));

  h += tool("reset", "Zurücksetzen",
    '<div class="btnrow"><button type="button" id="resetProg">Lernstand zurücksetzen</button>' +
    `<button type="button" id="restoreSeed"${state.deleted.some((id) => app.base.some((c) => c.id === id)) ? "" : " disabled"}>Entfernte Startkarten zurückholen</button></div>` +
    '<p class="hint">Zurücksetzen löscht den Fortschritt aller Karten und die Entwürfe. Eigene Karten, importierte Texte und Einstellungen bleiben.</p>' + msg("tMsg"));
  h += "</div>";

  // Angepinnte Leiste: Suche, Filter, Anzahl, Auswahlmodus
  h += '<div class="libbar" id="libbar">' +
    `<input type="search" id="search" aria-label="Suchen" value="${esc(ui.q)}" placeholder="Wendung, Bedeutung, Satz" autocomplete="off" autocapitalize="none" spellcheck="false">` +
    `<button type="button" class="iconbtn" id="selMode" aria-label="Karten auswählen" aria-pressed="${ui.selecting}">${icon("choice")}</button>` +
    `<select id="fCat" aria-label="Kategorie"><option value="all">Alle Kategorien</option>${cats.map((c) => `<option${c === ui.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>` +
    `<select id="fStat" aria-label="Lernstand und Einschätzung">${STAT_OPTS.map(([g, items]) =>
      `<optgroup label="${esc(g)}">${items.map(([v, t]) => `<option value="${v}"${v === ui.stat ? " selected" : ""}>${esc(t)}</option>`).join("")}</optgroup>`).join("")}</select>` +
    '<p class="libcount" id="count" aria-live="polite"></p>' +
    '<div class="libsel" id="libsel" hidden><button type="button" id="selAll" aria-label="Alle gezeigten wählen">Alle</button>' +
    '<button type="button" id="selNone">Keine</button><button type="button" id="delSel">Entfernen</button></div></div>';
  h += `${msg("delMsg")}<ul class="lib" id="libList"></ul>`;

  root.innerHTML = h;
  flash = {};
  const $ = (sel) => root.querySelector(sel);

  // Werkzeuge: immer nur eines offen
  root.querySelectorAll(".toolhead").forEach((b) => b.addEventListener("click", () => {
    ui.tool = toggleOne(ui.tool, b.closest(".tool").dataset.tool);
    root.querySelectorAll(".tool").forEach((t) => {
      const open = t.dataset.tool === ui.tool;
      t.querySelector(".toolhead").setAttribute("aria-expanded", String(open));
      t.querySelector(".toolbody").hidden = !open;
    });
  }));

  // Liste: in Abschnitten zeichnen
  const list = $("#libList");
  let rows = [];
  let drawn = 0;
  const moreHtml = () => {
    if (!rows.length) return '<li class="empty">Keine Karte gefunden.</li>';
    const rest = restCount(drawn, rows.length);
    return rest ? `<li class="more"><button type="button" id="moreBtn">${rest} weitere Karten laden</button></li>` : "";
  };
  const watchMore = () => {
    if (io) { io.disconnect(); io = null; }
    const b = $("#moreBtn");
    if (!b || !("IntersectionObserver" in window)) return;
    io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) loadMore(); }, { rootMargin: "400px 0px" });
    io.observe(b);
  };
  function loadMore() {
    const to = nextShown(drawn, rows.length);
    if (to === drawn) return;
    const day = today();
    const from = drawn;
    drawn = to;
    ui.shown = Math.max(ui.shown, drawn);
    const more = list.querySelector("li.more");
    if (more) more.remove();
    list.insertAdjacentHTML("beforeend", rows.slice(from, to).map((c) => rowHtml(app, c, day)).join("") + moreHtml());
    watchMore();
  }
  const updateSel = () => {
    const n = ui.picked.size;
    $("#libsel").hidden = !ui.selecting;
    const mode = $("#selMode");
    mode.setAttribute("aria-pressed", String(ui.selecting));
    mode.classList.toggle("on", ui.selecting);
    $("#count").textContent = ui.selecting ? `${n} gewählt · ${rows.length} Karten` : `${rows.length} von ${all.length} Karten`;
    const del = $("#delSel");
    del.disabled = n === 0;
    del.dataset.armed = "";
    del.textContent = "Entfernen";
  };
  const drawList = () => {
    rows = matched(app);
    if (ui.expanded && !rows.some((c) => c.id === ui.expanded)) ui.expanded = "";
    const day = today();
    drawn = Math.min(Math.max(ui.shown, PAGE), rows.length);
    list.innerHTML = rows.slice(0, drawn).map((c) => rowHtml(app, c, day)).join("") + moreHtml();
    updateSel();
    watchMore();
  };
  // Nach einer Änderung von Suche oder Filter: wieder von vorn, und nicht unterhalb der Liste stehen bleiben
  const refilter = () => {
    ui.shown = PAGE;
    drawList();
    const top = list.getBoundingClientRect().top + window.scrollY - $("#libbar").offsetHeight;
    if (window.scrollY > top) window.scrollTo(0, Math.max(0, top));
  };
  drawList();

  $("#search").addEventListener("input", (e) => { ui.q = e.target.value; refilter(); });
  $("#fCat").addEventListener("change", (e) => { ui.cat = e.target.value; refilter(); });
  $("#fStat").addEventListener("change", (e) => { ui.stat = e.target.value; refilter(); });

  // Zeilen: Aufklappen oder, im Auswahlmodus, Auswählen. Ein Handler für die ganze Liste.
  list.addEventListener("click", (e) => {
    const more = e.target.closest("#moreBtn");
    if (more) { loadMore(); return; }
    const ed = e.target.closest("button[data-edit]");
    if (ed) {
      ui.scrollY = window.scrollY;
      ui.editing = ed.dataset.edit;
      rerender();
      return;
    }
    const del = e.target.closest("button[data-del]");
    if (del) {
      if (del.dataset.armed !== "1") {
        del.dataset.armed = "1";
        const plain = del.textContent;
        del.textContent = "Sicher?";
        setTimeout(() => { if (del.isConnected) { del.dataset.armed = ""; del.textContent = plain; } }, 4000);
        return;
      }
      const own = state.custom.some((c) => c.id === del.dataset.del);
      removeCards(app, [del.dataset.del]);
      flash.delMsg = [own ? "Eigene Karte gelöscht." : "Karte entfernt. Startkarten holst du unter „Zurücksetzen“ zurück.", "ok"];
      rerender();
      return;
    }
    const head = e.target.closest(".lhead");
    if (!head) return;
    const li = head.closest("li");
    const id = li.dataset.id;
    if (ui.selecting) {
      toggleIn(ui.picked, id);
      const on = ui.picked.has(id);
      head.setAttribute("aria-checked", String(on));
      head.querySelector(".box").classList.toggle("on", on);
      updateSel();
      return;
    }
    const prev = ui.expanded;
    ui.expanded = toggleOne(prev, id);
    const fold = (rowId, open) => {
      const r = list.querySelector(`li[data-id="${rowId}"]`);
      if (!r) return;
      r.querySelector(".lhead").setAttribute("aria-expanded", String(open));
      const d = r.querySelector(".ld");
      d.hidden = !open;
      d.innerHTML = open ? detailHtml(app, rows.find((c) => c.id === rowId), today()) : "";
    };
    if (prev) fold(prev, false);
    if (ui.expanded) fold(ui.expanded, true);
  });

  // Auswahlmodus
  $("#selMode").addEventListener("click", () => {
    ui.selecting = !ui.selecting;
    ui.expanded = "";
    if (!ui.selecting) ui.picked.clear();
    drawList();
  });
  $("#selAll").addEventListener("click", () => { rows.forEach((c) => ui.picked.add(c.id)); drawList(); });
  $("#selNone").addEventListener("click", () => { ui.picked.clear(); drawList(); });
  const delSel = $("#delSel");
  delSel.addEventListener("click", () => {
    const n = ui.picked.size;
    if (!n) return;
    if (delSel.dataset.armed !== "1") {
      delSel.dataset.armed = "1";
      delSel.textContent = `Sicher? ${n} Karten entfernen`;
      setTimeout(() => { if (delSel.isConnected && delSel.dataset.armed === "1") updateSel(); }, 5000);
      return;
    }
    removeCards(app, [...ui.picked]);
    ui.picked.clear();
    flash.delMsg = [`${n} Karten entfernt. Startkarten holst du unter „Zurücksetzen“ zurück.`, "ok"];
    rerender();
  });

  // Formular
  $("#addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const { card, errors } = checkCard(f);
    if (errors.length) { setMsg($("#addMsg"), errors.join(" "), "err"); return; }
    if (app.cards().some((c) => c.term.toLowerCase() === card.term.toLowerCase())) {
      setMsg($("#addMsg"), `„${card.term}“ gibt es schon.`, "err");
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
      terms: $("#cTerms").value,
      cat: $("#cCat").value,
      count: Number($("#cCount").value)
    };
    app.save();
    return state.drafts.cards;
  };
  for (const id of ["cTerms", "cCat", "cCount"]) $("#" + id).addEventListener("change", keepDraft);
  $("#cCopy").addEventListener("click", () => {
    const d = keepDraft();
    copyText(cardPrompt({ terms: d.terms.split("\n"), cat: d.cat, count: d.count }, app.cards()), $("#cMsg"));
  });
  $("#cImport").addEventListener("click", () => {
    const raw = $("#cPaste").value;
    if (!raw.trim()) { setMsg($("#iMsg"), "Erst die Antwort von Claude einfügen.", "err"); return; }
    const taken = [...app.base.map((c) => c.id), ...state.custom.map((c) => c.id), ...state.deleted];
    const { cards, errors, skipped } = parseCards(raw, app.cards(), taken);
    const parts = [];
    if (cards.length) parts.push(`${cards.length} Karten importiert: ${cards.map((c) => c.term).join(", ")}.`);
    if (skipped.length) parts.push(`Schon vorhanden, übersprungen: ${skipped.join(", ")}.`);
    if (errors.length) parts.push("Nicht übernommen: " + errors.join(" "));
    if (!cards.length) { setMsg($("#iMsg"), parts.join(" ") || "Keine Karten gefunden.", "err"); return; }
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
    const ta = $("#bText");
    ta.value = backupText();
    ta.hidden = false;
    $("#bCopyRow").hidden = false;
  };
  $("#bDown").addEventListener("click", () => {
    try {
      const url = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = backupName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg($("#bMsg"), `„${backupName()}“ wird gespeichert. Falls keine Datei erscheint: „Als Text anzeigen“ und kopieren.`, "ok");
    } catch {
      showText();
      setMsg($("#bMsg"), "Als Datei ging es hier nicht. Kopiere den Text unten und sichere ihn zum Beispiel in einer Notiz.", "err");
    }
  });
  $("#bShow").addEventListener("click", showText);
  $("#bCopy").addEventListener("click", () => copyText($("#bText").value, $("#bMsg")));
  $("#rFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    file.text().then(
      (t) => { $("#rText").value = t; setMsg($("#rMsg"), "Datei geladen. Tippe auf „Sicherung einspielen“.", "ok"); },
      () => setMsg($("#rMsg"), "Die Datei ließ sich nicht lesen.", "err")
    );
  });
  armed($("#rGo"), "Wirklich? Aktueller Stand wird ersetzt", () => {
    const raw = $("#rText").value.trim();
    if (!raw) { setMsg($("#rMsg"), "Bitte zuerst eine Datei wählen oder den Sicherungstext einfügen.", "err"); return; }
    try {
      app.state = parseBackup(raw, app.base);
    } catch (err) {
      setMsg($("#rMsg"), err.message, "err");
      return;
    }
    app.save();
    app.invalidatePlan();
    ui.picked.clear();
    flash.rMsg = [`Sicherung eingespielt: Lernstand für ${Object.keys(app.state.progress).length} Karten, ${app.state.custom.length} eigene Karten.`, "ok"];
    rerender();
  });
  $("#uCopy")?.addEventListener("click", () => copyText(JSON.stringify(state.custom, null, 2), $("#uMsg")));

  // Zurücksetzen
  armed($("#resetProg"), "Wirklich? Noch einmal tippen", () => {
    state.progress = {};
    state.textLog = {};
    state.drafts = {};
    app.save();
    app.invalidatePlan();
    flash.tMsg = ["Lernstand zurückgesetzt.", "ok"];
    rerender();
  });
  $("#restoreSeed").addEventListener("click", () => {
    const baseIds = new Set(app.base.map((c) => c.id));
    const n = state.deleted.filter((id) => baseIds.has(id)).length;
    state.deleted = state.deleted.filter((id) => !baseIds.has(id));
    app.save();
    app.invalidatePlan();
    flash.tMsg = [`${n} Startkarten zurückgeholt.`, "ok"];
    rerender();
  });
}
