// Reiter „Üben“: Übungsart wählen, Runde starten, Karten der Reihe nach abfragen.
import { esc, shuffle, armed } from "../core/dom.js";
import { MODES, LEVELS } from "../core/modes.js";
import { record, categoryOf, isDue, MASTERED } from "../core/srs.js";
import { progressOf } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { ART } from "../core/art.js";
import * as meaning from "../exercises/meaning.js";
import * as cards from "../exercises/cards.js";
import * as explain from "../exercises/explain.js";
import * as choice from "../exercises/choice.js";
import * as gap from "../exercises/gap.js";
import * as translate from "../exercises/translate.js";
import * as error from "../exercises/error.js";
import * as rewrite from "../exercises/rewrite.js";
import * as produce from "../exercises/produce.js";
import * as cloze from "../exercises/cloze.js";
import * as passive from "./passive.js";
import { canSpeak, say, stopSpeaking, spokenTerm, spokenSentence } from "../core/speech.js";

const EX = { meaning, cards, explain, choice, gap, translate, error, rewrite, produce };
const SCOPES = { due: "Heute fällig", open: "Alle nicht gemeisterten", problem: "Nur problematische", all: "Alle Karten" };
const SIZES = [10, 20, 50, 0];

// Auswahl bleibt erhalten, solange die App offen ist
const pick = { mode: "meaning", cat: "all", scope: "due", size: 20 };
let session = null;

// Vom Tagesplan aus: diese Karten mit dieser Übung
export function start(app, mode, ids) {
  pick.mode = mode;
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  begin(app, ids.filter((id) => byId.has(id)), ids.length);
  app.go("practice");
}

// Von der Statistik aus: Auswahl auf problematische Karten stellen
export function pickProblems(app) {
  session = null;
  if (MODES[pick.mode]?.text || pick.mode === "passive") pick.mode = "meaning";
  pick.scope = "problem";
  pick.cat = "all";
  app.go("practice");
}

// Einen Lückentext öffnen (vom Tagesplan aus)
export function startText(app, id) {
  pick.mode = "cloze";
  session = null;
  cloze.openText(app, id);
  app.go("practice");
}

function eligible(app) {
  const all = app.cards();
  const M = MODES[pick.mode];
  const day = today();
  return all.filter((c) => {
    if (pick.cat !== "all" && c.cat !== pick.cat) return false;
    if (!M.need(c, all)) return false;
    const p = app.state.progress[c.id];
    if (pick.scope === "due") return isDue(p, day);
    if (pick.scope === "problem") return categoryOf(p) === "problem";
    if (pick.scope === "open") return !p || p.box < MASTERED;
    return true;
  });
}

function queueFromPick(app) {
  const p = (c) => app.state.progress[c.id];
  const rank = (c) => (categoryOf(p(c)) === "problem" ? 0 : p(c) && p(c).seen ? 1 : 2);
  const list = shuffle(eligible(app)).sort((a, b) => rank(a) - rank(b) || (p(a)?.due || 0) - (p(b)?.due || 0));
  const avail = list.length;
  begin(app, (pick.size ? list.slice(0, pick.size) : list).map((c) => c.id), avail);
}

function begin(app, ids, avail) {
  session = {
    mode: pick.mode, queue: ids, total: ids.length, avail, right: 0, wrong: 0,
    result: null, ui: null, flipped: false, cards: app.cards(), rerender: null
  };
}

export function render(root, app) {
  if (session) renderSession(root, app);
  else if (pick.mode === "cloze" && cloze.isOpen()) cloze.renderText(root, app, () => render(root, app));
  else if (pick.mode === "passive" && passive.isRunning()) passive.render(root, app, () => render(root, app));
  else renderPicker(root, app);
}

// Beim Wechsel des Reiters: Vorlesen anhalten
export function leave() {
  passive.stop();
  stopSpeaking();
  lastSpoken = "";
}

// Was in welcher Phase einer Übung vorgelesen wird (wie in der Originalversion).
// k unterscheidet die Phasen, damit beim Neuzeichnen nichts doppelt gesprochen wird.
function speechFor(mode, c, s) {
  const t = spokenTerm(c);
  const sn = spokenSentence(c);
  const both = sn ? t + ". " + sn : t;
  const judged = s.ui && s.ui.stage === "judge";
  switch (mode) {
    case "cards": return s.flipped ? { k: "b", t: both } : null;
    case "meaning": return s.result ? { k: "r", t: sn } : { k: "q", t };
    case "choice": case "gap": case "error": return s.result ? { k: "r", t: sn } : null;
    case "translate": return s.result ? { k: "r", t: both } : null;
    case "rewrite": case "produce": return judged ? { k: "j", t: sn } : { k: "w", t };
    case "explain": return judged ? { k: "j", t: both } : { k: "w", t };
  }
  return null;
}
let lastSpoken = "";

function speakCard(box, app, c, s) {
  if (!canSpeak()) return;
  const { prefs } = app.state;
  const sp = speechFor(s.mode, c, s);
  const k = sp && sp.t ? s.mode + c.id + sp.k : "";
  if (k !== lastSpoken) {
    lastSpoken = k;
    stopSpeaking();
    if (k) say(sp.t, prefs);
  }
  const card = box.querySelector(".card");
  if (k && card && prefs.speak) {
    card.insertAdjacentHTML("beforeend", `<button type="button" class="small speakbtn" id="replay">${icon("passive")}Anhören</button>`);
    card.querySelector("#replay").addEventListener("click", (e) => { e.stopPropagation(); say(sp.t, prefs); });
  }
}

const modeBtn = (m, label) =>
  `<button type="button" class="mode${m === pick.mode ? " on" : ""}" data-mode="${m}" aria-pressed="${m === pick.mode}">${icon(m)}<span>${esc(label)}</span></button>`;

function renderPicker(root, app) {
  const cats = [...new Set(app.cards().map((c) => c.cat))];
  const isPassive = pick.mode === "passive";
  const isText = !isPassive && !!MODES[pick.mode].text;
  const n = isText || isPassive ? 0 : eligible(app).length;
  let h = '<h1>Üben</h1>';
  for (const lv of [1, 2, 3, 4, 5]) {
    const ms = Object.entries(MODES).filter(([, M]) => M.lv === lv);
    h += `<h2 class="lvl">${esc(LEVELS[lv])}</h2><div class="modes">` + ms.map(([m, M]) => modeBtn(m, M.label)).join("") + "</div>";
  }
  h += '<h2 class="lvl">Ohne Wertung</h2><div class="modes">' + modeBtn("passive", "Passiv-Durchlauf") + "</div>";
  if (isPassive) {
    root.innerHTML = h + '<div id="passiveArea"></div>';
    bindModes(root, app);
    passive.renderSetup(root.querySelector("#passiveArea"), app, () => render(root, app));
    return;
  }
  h += `<p class="hint">${esc(MODES[pick.mode].desc)}</p>`;
  if (isText) {
    root.innerHTML = h + '<div id="clozeArea"></div>';
    bindModes(root, app);
    cloze.renderList(root.querySelector("#clozeArea"), app, () => render(root, app));
    return;
  }
  h += '<div class="controls">' +
    '<label>Kategorie <select id="catSel"><option value="all">Alle</option>' +
    cats.map((c) => `<option value="${esc(c)}"${c === pick.cat ? " selected" : ""}>${esc(c)}</option>`).join("") + "</select></label>" +
    '<label>Karten <select id="scopeSel">' +
    Object.entries(SCOPES).map(([k, v]) => `<option value="${k}"${k === pick.scope ? " selected" : ""}>${v}</option>`).join("") + "</select></label>" +
    '<label>Rundengröße <select id="sizeSel">' +
    SIZES.map((v) => `<option value="${v}"${v === pick.size ? " selected" : ""}>${v || "Alle"}</option>`).join("") + "</select></label></div>";
  h += `<div class="btnrow"><button type="button" class="primary" id="go"${n ? "" : " disabled"}>Runde starten</button></div>` +
    `<p class="hint">${n} passende Karten.</p>`;
  root.innerHTML = h;

  bindModes(root, app);
  root.querySelector("#catSel").addEventListener("change", (e) => { pick.cat = e.target.value; render(root, app); });
  root.querySelector("#scopeSel").addEventListener("change", (e) => { pick.scope = e.target.value; render(root, app); });
  root.querySelector("#sizeSel").addEventListener("change", (e) => { pick.size = Number(e.target.value); render(root, app); });
  root.querySelector("#go").addEventListener("click", () => { queueFromPick(app); render(root, app); });
}

function bindModes(root, app) {
  root.querySelectorAll("button.mode").forEach((b) => b.addEventListener("click", () => { pick.mode = b.dataset.mode; render(root, app); }));
}

function renderSession(root, app) {
  const s = session;
  const M = MODES[s.mode];
  const { prefs } = app.state;
  const speakBtn = canSpeak()
    ? `<button type="button" class="small toggle iconbtn" id="spk" aria-pressed="${prefs.speak}" aria-label="Englisch vorlesen">${icon("passive")}</button>`
    : "";
  root.innerHTML = `<div class="sessionbar"><h1 class="withicon">${icon(s.mode)}${esc(M.label)}</h1>` +
    `<div class="acts">${speakBtn}<button type="button" class="small" id="stop">Beenden</button></div></div><div id="study" aria-live="polite"></div>`;
  root.querySelector("#stop").addEventListener("click", () => { session = null; leave(); render(root, app); });
  root.querySelector("#spk")?.addEventListener("click", () => {
    prefs.speak = !prefs.speak;
    app.save();
    if (!prefs.speak) stopSpeaking();
    lastSpoken = "";
    renderSession(root, app);
  });
  const box = root.querySelector("#study");
  const byId = new Map(app.cards().map((c) => [c.id, c]));

  const reset = () => { s.result = null; s.ui = null; s.flipped = false; };
  s.rerender = () => renderSession(root, app);
  // Ergebnis verbuchen; falsch beantwortete Karten kommen zwei Plätze später noch einmal.
  s.answer = (ok) => {
    const id = s.queue.shift();
    record(progressOf(app.state, id), ok, s.mode, today());
    if (ok) s.right++;
    else { s.wrong++; s.queue.splice(Math.min(2, s.queue.length), 0, id); }
    app.save();
    reset();
    s.rerender();
  };
  s.next = () => { if (s.result) s.answer(s.result.ok); };

  while (s.queue.length && !byId.has(s.queue[0])) s.queue.shift();
  const c = byId.get(s.queue[0]);
  if (!c) { renderSummary(box, root, app); return; }

  EX[s.mode].render(box, c, s);
  speakCard(box, app, c, s);
  box.insertAdjacentHTML("beforeend", '<p class="easyrow"><button type="button" id="easyBtn">Zu leicht – Karte aus dem Speicher entfernen</button></p>');
  armed(box.querySelector("#easyBtn"), `Sicher? „${c.term}“ endgültig entfernen`, () => {
    if (!app.state.deleted.includes(c.id)) app.state.deleted.push(c.id);
    app.save();
    app.invalidatePlan();
    s.queue = s.queue.filter((id) => id !== c.id);
    s.cards = app.cards();
    reset();
    s.rerender();
  });
}

function renderSummary(box, root, app) {
  const s = session;
  const msg = s.total === 0
    ? (pick.scope === "due"
      ? "Für diese Auswahl ist heute nichts mehr fällig. Wähle „Alle nicht gemeisterten“ oder komm morgen wieder."
      : "Für diese Auswahl gibt es keine passenden Karten.")
    : `Runde geschafft: ${s.right} richtig, ${s.wrong} zum Wiederholen.` +
      (s.avail > s.total ? ` In dieser Auswahl warten noch ${s.avail - s.total} weitere Karten.` : "");
  // Sanduhr: nichts zu tun; Tintenfass: Runde erledigt
  box.innerHTML = `<div class="summary">${s.total === 0 ? ART.hourglass : ART.inkwell}<p>${esc(msg)}</p><div class="btnrow"><button type="button" class="primary" id="again">Neue Runde</button><button type="button" id="toPlan">Zum Tagesplan</button></div></div>`;
  box.querySelector("#again").addEventListener("click", () => { session = null; render(root, app); });
  box.querySelector("#toPlan").addEventListener("click", () => { session = null; app.go("today"); });
  box.querySelector("#again").focus();
}

// Tastatur: 1–4 wählt eine Option, Pfeile bewerten Karteikarten
export function onKey(e) {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!session) { passive.onKey(e); return; }
  const study = document.getElementById("study");
  if (!study) return;
  const click = (sel) => { const b = study.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  if (/^[1-4]$/.test(e.key)) click(`button.opt[data-i="${Number(e.key) - 1}"]`);
  else if (e.key === "ArrowLeft") click("#again1");
  else if (e.key === "ArrowRight") click("#known");
}
