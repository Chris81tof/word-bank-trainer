// Passiv-Durchlauf (unter „Üben“): Wendung zeigen und vorlesen, dann Bedeutung und Beispielsatz.
// Verändert den Lernstand nicht.
import { esc, shuffle } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { canSpeak, say, stopSpeaking, spokenTerm, spokenSentence } from "../core/speech.js";
import { chip, sentenceHtml } from "../exercises/common.js";

const TEMPI = [5, 8, 12];
const opts = { cat: "all", order: "seq", tempo: 8 };
// list, i, phase (0 = Wendung, 1 = Auflösung), playing, token (bricht alte Abläufe ab), timers
const pass = { list: null, i: 0, phase: 0, playing: false, token: 0, timers: [] };

export const isRunning = () => !!pass.list;

function clearTimers() { pass.timers.forEach(clearTimeout); pass.timers = []; }
const later = (fn, ms) => pass.timers.push(setTimeout(fn, ms));

export function stop() {
  pass.playing = false;
  pass.token++;
  clearTimers();
  stopSpeaking();
}

// Einstellungen unter der Übungsauswahl
export function renderSetup(area, app, onStart) {
  const cats = [...new Set(app.cards().map((c) => c.cat))];
  const { prefs } = app.state;
  area.innerHTML = '<p class="hint">Die App zeigt jede Wendung, liest sie vor und deckt danach Bedeutung und Beispielsatz auf. Gut für unterwegs. Der Lernstand ändert sich dabei nicht.</p>' +
    '<div class="controls">' +
    `<label>Kategorie <select id="pCat"><option value="all">Alle</option>${cats.map((c) => `<option${c === opts.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` +
    `<label>Reihenfolge <select id="pOrder"><option value="seq"${opts.order === "seq" ? " selected" : ""}>Wie in der Sammlung</option><option value="random"${opts.order === "random" ? " selected" : ""}>Zufällig</option></select></label>` +
    `<label>Tempo <select id="pTempo">${TEMPI.map((t) => `<option value="${t}"${t === opts.tempo ? " selected" : ""}>${t} Sekunden pro Karte</option>`).join("")}</select></label>` +
    "</div>" +
    `<label class="check"><input type="checkbox" id="pSpeak"${prefs.speak ? " checked" : ""}${canSpeak() ? "" : " disabled"}> Englisch vorlesen${canSpeak() ? "" : " (in diesem Browser nicht möglich)"}</label>` +
    '<div class="btnrow"><button type="button" class="primary" id="pGo">Passiv-Durchlauf starten</button></div>';
  area.querySelector("#pCat").addEventListener("change", (e) => { opts.cat = e.target.value; });
  area.querySelector("#pOrder").addEventListener("change", (e) => { opts.order = e.target.value; });
  area.querySelector("#pTempo").addEventListener("change", (e) => { opts.tempo = Number(e.target.value); });
  area.querySelector("#pSpeak").addEventListener("change", (e) => { prefs.speak = e.target.checked; app.save(); });
  area.querySelector("#pGo").addEventListener("click", () => {
    const list = app.cards().filter((c) => opts.cat === "all" || c.cat === opts.cat);
    Object.assign(pass, { list: opts.order === "random" ? shuffle(list) : list, i: 0, phase: 0 });
    onStart();
  });
}

export function render(root, app, onEnd) {
  const prefs = app.state.prefs;
  const draw = (focusId) => {
    if (!pass.list || !pass.list.length) {
      root.innerHTML = '<div class="summary"><p>Für diese Kategorie gibt es keine Karten.</p><div class="btnrow"><button type="button" id="pEnd">Zurück</button></div></div>';
      root.querySelector("#pEnd").addEventListener("click", end);
      return;
    }
    const c = pass.list[pass.i];
    const tap = !pass.playing && pass.phase === 0;
    let h = `<div class="sessionbar"><h1 class="withicon">${icon("passive")}Passiv</h1><button type="button" class="small" id="pEnd">Beenden</button></div>` +
      `<p class="progress">Karte ${pass.i + 1} von ${pass.list.length} · ${pass.playing ? "läuft" : "pausiert"}</p>` +
      `<div class="card${tap ? " flip" : ""}" id="pcard"${tap ? ' role="button" tabindex="0" aria-label="Bedeutung aufdecken"' : ""}>` +
      chip(c) + `<p class="term">${esc(c.term)}</p>`;
    h += pass.phase === 1
      ? (c.de ? `<p class="de">${esc(c.de)}</p>` : "") + (c.prompt ? `<p class="prompt">${esc(c.prompt)}</p>` : "") +
        (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") + (c.note ? `<p class="note">${esc(c.note)}</p>` : "")
      : `<span class="hint">${pass.playing ? "Die Bedeutung erscheint gleich." : "Antippen deckt die Bedeutung auf."}</span>`;
    h += "</div>" +
      '<div class="btnrow"><button type="button" id="pprev">Zurück</button>' +
      `<button type="button" class="primary" id="ptoggle">${pass.playing ? "Pause" : "Start"}</button>` +
      '<button type="button" id="pnext">Weiter</button></div>' +
      '<p class="hint">Passiv verändert den Lernstand nicht. Zum Vorlesen den Bildschirm eingeschaltet lassen.</p>';
    root.innerHTML = h;
    root.querySelector("#pEnd").addEventListener("click", end);
    root.querySelector("#pprev").addEventListener("click", () => move(-1));
    root.querySelector("#pnext").addEventListener("click", () => move(1));
    root.querySelector("#ptoggle").addEventListener("click", toggle);
    if (tap) {
      const pc = root.querySelector("#pcard");
      const open = () => { pass.phase = 1; draw("ptoggle"); };
      pc.addEventListener("click", open);
      pc.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); open(); } });
    }
    if (focusId) root.querySelector("#" + focusId)?.focus();
  };

  // Wendung zeigen und sprechen; weiter, wenn Sprechen und Mindestzeit beide fertig sind.
  const runCard = (focusId) => {
    clearTimers();
    const tok = ++pass.token;
    const c = pass.list[pass.i];
    const T = opts.tempo * 1000;
    pass.phase = 0;
    draw(focusId);
    let pending = 2;
    const gate = () => { if (tok === pass.token && pass.playing && --pending === 0) reveal(tok, c, T); };
    later(gate, T * 0.45);
    say(spokenTerm(c), prefs, gate);
  };
  const reveal = (tok, c, T) => {
    pass.phase = 1;
    draw();
    let pending = 2;
    const gate = () => {
      if (tok === pass.token && pass.playing && --pending === 0) {
        pass.i = (pass.i + 1) % pass.list.length;
        runCard();
      }
    };
    later(gate, T * 0.55);
    say(spokenSentence(c), prefs, gate);
  };
  const toggle = () => {
    if (pass.playing) { stop(); draw("ptoggle"); } else { pass.playing = true; runCard("ptoggle"); }
  };
  const move = (d) => {
    const was = pass.playing;
    stop();
    pass.i = (pass.i + d + pass.list.length) % pass.list.length;
    pass.phase = 0;
    if (was) { pass.playing = true; runCard(d > 0 ? "pnext" : "pprev"); } else draw(d > 0 ? "pnext" : "pprev");
  };
  function end() { stop(); pass.list = null; onEnd(); }

  draw();
}

// Tastatur: Pfeile blättern
export function onKey(e) {
  if (!pass.list || !document.getElementById("pcard")) return;
  if (e.key === "ArrowRight") document.getElementById("pnext")?.click();
  else if (e.key === "ArrowLeft") document.getElementById("pprev")?.click();
}
