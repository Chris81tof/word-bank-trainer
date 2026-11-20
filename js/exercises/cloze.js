// Stufe 5 · Texte: Lückentexte nach Lernstand vorschlagen, bearbeiten, neue per Prompt holen und importieren.
import { esc, shuffle, copyText, setMsg, armed } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { norm } from "../core/match.js";
import { record } from "../core/srs.js";
import { progressOf } from "../core/state.js";
import { today } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { suggestTexts, pickCards, textPrompt, parseTexts, KINDS } from "../core/texts.js";

const WORDS = [120, 180, 250];
const GAPS = [6, 8, 10];

// Geöffneter Text: { t, vals, res, checked, bank, order }
let open = null;
// Meldung nach dem Import, die das Neuzeichnen überlebt: { text, kind }
let notice = null;

export const isOpen = () => !!open;

export function openText(app, id) {
  const t = app.texts().find((x) => x.id === id);
  open = t ? { t, vals: [], res: [], checked: false, bank: false, order: shuffle(t.gaps.map((g) => g[1].split("|")[0])) } : null;
}

function lastDone(app, t, day) {
  const d = app.state.textLog[t.id];
  if (typeof d !== "number") return "noch nicht bearbeitet";
  return day - d === 0 ? "heute bearbeitet" : day - d === 1 ? "gestern bearbeitet" : `vor ${day - d} Tagen bearbeitet`;
}

function textItem(app, t, day, extra = "") {
  return `<li><div class="meta"><strong>${esc(t.title)}</strong><span>${esc(t.kind)} · ${t.gaps.length} Lücken · ${lastDone(app, t, day)}</span></div>` +
    `<div class="acts">${extra}<button type="button" class="small primary" data-open="${esc(t.id)}">Öffnen</button></div></li>`;
}

// Liste unter der Übungsauswahl: Vorschläge, alle Texte, neuer Text per Prompt
export function renderList(area, app, rerender) {
  const day = today();
  const { state } = app;
  const cards = app.cards();
  const known = new Set(cards.map((c) => c.id));
  const texts = app.texts();
  const imported = new Set(state.texts.map((t) => t.id));
  const draft = state.drafts.text || { kind: KINDS[0], words: 180, n: 6, ids: [] };

  let h = '<h2>Vorschläge für dich</h2><p class="hint">Texte mit problematischen, fälligen und neuen Karten stehen oben. Kürzlich bearbeitete rutschen für zwei Wochen nach unten.</p>' +
    '<ul class="list">' + suggestTexts(texts, state, day, known).map(({ t }) => textItem(app, t, day)).join("") + "</ul>";

  h += `<details class="all"><summary>Alle Texte (${texts.length})</summary><ul class="list">` +
    texts.map((t) => textItem(app, t, day, imported.has(t.id) ? `<button type="button" class="small" data-del="${esc(t.id)}">Entfernen</button>` : "")).join("") +
    "</ul></details>";

  h += '<h2>Neuer Text von Claude</h2><p class="hint">Die App wählt Karten nach deinem Lernstand, bevorzugt solche, die noch in keinem Text vorkommen. Kopiere den Prompt in Claude und füge die Antwort unten ein.</p>' +
    '<div class="controls">' +
    `<label>Textsorte <select id="tKind">${KINDS.map((k) => `<option${k === draft.kind ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>` +
    `<label>Länge <select id="tWords">${WORDS.map((w) => `<option value="${w}"${w === draft.words ? " selected" : ""}>${w} Wörter</option>`).join("")}</select></label>` +
    `<label>Lücken <select id="tN">${GAPS.map((n) => `<option value="${n}"${n === draft.n ? " selected" : ""}>${n}</option>`).join("")}</select></label>` +
    "</div>";
  const picked = draft.ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
  if (picked.length) {
    h += '<ul class="ex">' + picked.map((c) => `<li><span class="term-s">${esc(c.term)}</span><span class="de2">${esc(cue(c))}</span></li>`).join("") + "</ul>";
  }
  h += '<div class="btnrow">' +
    `<button type="button" id="tPick">${picked.length ? "Andere Karten" : "Karten vorschlagen"}</button>` +
    `<button type="button" class="primary" id="tCopy"${picked.length ? "" : " disabled"}>Prompt kopieren</button></div><p class="msg" id="tMsg"></p>` +
    '<label class="field" for="tPaste">Antwort von Claude hier einfügen</label>' +
    '<textarea id="tPaste" spellcheck="false" placeholder="{&quot;kind&quot;: …, &quot;title&quot;: …, &quot;text&quot;: …, &quot;gaps&quot;: […]}"></textarea>' +
    '<div class="btnrow"><button type="button" id="tImport">Importieren</button></div>' +
    `<div class="msg${notice ? " " + notice.kind : ""}" id="iMsg" role="status">${notice ? esc(notice.text) : ""}</div>`;
  area.innerHTML = h;
  notice = null;

  area.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => { openText(app, b.dataset.open); rerender(); }));
  area.querySelectorAll("[data-del]").forEach((b) => armed(b, "Sicher?", () => {
    state.texts = state.texts.filter((t) => t.id !== b.dataset.del);
    delete state.textLog[b.dataset.del];
    app.save();
    rerender();
  }));

  const keep = () => {
    state.drafts.text = {
      kind: area.querySelector("#tKind").value,
      words: Number(area.querySelector("#tWords").value),
      n: Number(area.querySelector("#tN").value),
      ids: draft.ids
    };
    app.save();
    return state.drafts.text;
  };
  for (const id of ["tKind", "tWords"]) area.querySelector("#" + id).addEventListener("change", keep);
  area.querySelector("#tN").addEventListener("change", () => { keep().ids = []; app.save(); rerender(); });
  area.querySelector("#tPick").addEventListener("click", () => {
    const d = keep();
    d.ids = pickCards(cards, state, texts, day, d.n).map((c) => c.id);
    app.save();
    rerender();
  });
  area.querySelector("#tCopy").addEventListener("click", () => {
    const d = keep();
    copyText(textPrompt(picked, d), area.querySelector("#tMsg"));
  });
  area.querySelector("#tImport").addEventListener("click", () => {
    const msg = area.querySelector("#iMsg");
    const raw = area.querySelector("#tPaste").value;
    if (!raw.trim()) { setMsg(msg, "Erst die Antwort von Claude einfügen.", "err"); return; }
    const allIds = new Set([...app.base.map((c) => c.id), ...state.custom.map((c) => c.id)]);
    const { texts: fresh, errors } = parseTexts(raw, allIds, texts.map((t) => t.id));
    if (fresh.length) {
      state.texts.push(...fresh);
      if (state.drafts.text) state.drafts.text.ids = [];
      app.save();
      notice = {
        text: `Importiert: ${fresh.map((t) => "„" + t.title + "“").join(", ")}. Du findest ${fresh.length > 1 ? "sie" : "ihn"} unter „Alle Texte“.` +
          (errors.length ? " Nicht übernommen: " + errors.join(" ") : ""),
        kind: errors.length ? "err" : "ok"
      };
      rerender();
    } else setMsg(msg, errors.join(" "), "err");
  });
}

// Geöffneter Text mit Eingabefeldern in den Lücken
export function renderText(root, app, rerender) {
  const { t } = open;
  const byId = new Map(app.cards().map((c) => [c.id, c]));
  const parts = t.text.split(/\{(\d+)\}/);
  let body = "";
  parts.forEach((p, k) => {
    if (k % 2 === 0) { body += esc(p); return; }
    const n = Number(p);
    const cls = "gi" + (open.checked ? (open.res[n - 1] ? " good" : " bad") : "");
    body += `<span class="num">${n}</span><input type="text" class="${cls}" id="gi${n}" aria-label="Lücke ${n}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" value="${esc(open.vals[n - 1] || "")}"${open.checked ? " readonly" : ""}>`;
  });

  let h = `<div class="sessionbar"><h1 class="withicon">${icon("cloze")}Texte</h1><button type="button" class="small" id="clBack">Anderer Text</button></div>` +
    `<p class="progress">${esc(t.kind)}</p><h2 class="ttl">${esc(t.title)}</h2><div class="passage">${body}</div>`;
  if (!open.checked) {
    if (open.bank) h += '<div class="bank" aria-label="Wortbank">' + open.order.map((w) => `<span>${esc(w)}</span>`).join("") + "</div>";
    h += '<div class="btnrow"><button type="button" class="primary" id="clCheck">Prüfen</button>' +
      `<button type="button" id="clBank">${open.bank ? "Wortbank ausblenden" : "Wortbank einblenden (leichter)"}</button></div>` +
      '<p class="hint">Die gesuchten Wendungen stehen in der richtigen Beugung. Ohne Wortbank ist es Stufe 5, mit Wortbank leichter.</p>';
  } else {
    const right = open.res.filter(Boolean).length;
    h += `<div class="feedback ${right === t.gaps.length ? "good" : "bad"}" role="status">${right} von ${t.gaps.length} richtig.</div><ul class="ex">` +
      t.gaps.map(([id, ans], i) => {
        const c = byId.get(id);
        return `<li><span class="st">${open.res[i] ? "✓" : "✗"}</span><span>${i + 1}. ${esc(ans.split("|").join(" / "))}</span>` +
          `<span class="de2">${c ? esc(c.term) + (cue(c) ? " · " + esc(cue(c)) : "") : ""}</span></li>`;
      }).join("") + "</ul>" +
      '<div class="btnrow"><button type="button" class="primary" id="clAgain">Nochmal</button></div>';
  }
  root.innerHTML = h;

  const snap = () => { open.vals = t.gaps.map((_, i) => root.querySelector("#gi" + (i + 1))?.value || ""); };
  root.querySelector("#clBack").addEventListener("click", () => { open = null; rerender(); });
  if (open.checked) {
    root.querySelector("#clAgain").addEventListener("click", () => {
      Object.assign(open, { checked: false, vals: [], res: [], order: shuffle(open.order) });
      rerender();
    });
    return;
  }
  const check = () => {
    snap();
    if (!open.vals.some((v) => v.trim())) { root.querySelector("#gi1").focus(); return; }
    const day = today();
    open.res = t.gaps.map(([id, ans], i) => {
      const ok = ans.split("|").some((a) => norm(a) === norm(open.vals[i]));
      // Lücken zu entfernten Karten werden geprüft, aber nicht verbucht.
      if (byId.has(id)) record(progressOf(app.state, id), ok, "cloze", day);
      return ok;
    });
    open.checked = true;
    app.state.textLog[t.id] = day;
    app.save();
    app.invalidatePlan();
    rerender();
  };
  root.querySelector("#clCheck").addEventListener("click", check);
  root.querySelector("#clBank").addEventListener("click", () => { snap(); open.bank = !open.bank; rerender(); });
  t.gaps.forEach((_, i) => {
    const el = root.querySelector("#gi" + (i + 1));
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const nx = root.querySelector("#gi" + (i + 2));
      if (nx) nx.focus(); else check();
    });
  });
  root.querySelector("#gi1")?.focus();
}
