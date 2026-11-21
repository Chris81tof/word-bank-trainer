// Bausteine, die mehrere Übungen teilen.
// s ist die laufende Runde (views/practice.js): queue, right, wrong, result, ui, rerender(), next().
import { esc } from "../core/dom.js";
import { ans0 } from "../core/modes.js";
import { icon, catIcon } from "../core/icons.js";
import { REG, REGION } from "../core/cards.js";
import { hintLine, MAX_HINT } from "../core/hints.js";

export { REG, REGION };

export function sentenceHtml(s, fill) {
  const out = esc(s);
  if (fill) return out.replace(/____/g, "<mark>" + esc(fill.split("|")[0]) + "</mark>");
  return out.replace(/____/g, '<span class="blank" role="img" aria-label="Lücke"></span>');
}

export function progressHtml(s) {
  return `<p class="progress">Noch ${s.queue.length} in dieser Runde · richtig ${s.right} · nochmal ${s.wrong}</p>`;
}

export function chip(c, extra) {
  return `<span class="chip">${icon(catIcon(c.cat))}<span>${esc(c.cat)}${extra ? " · " + esc(extra) : ""}</span></span>`;
}

export function cueParas(c) {
  return (c.de ? `<p class="de">${esc(c.de)}</p>` : "") + (c.prompt ? `<p class="prompt">${esc(c.prompt)}</p>` : "");
}

// Auflösung: Wendung, Beispielsatz (abschaltbar), Hinweis, Register
export function refHtml(c, withSentence = true) {
  const rg = [REG[c.reg], REGION[c.region]].filter(Boolean).join(" · ");
  return `<p class="term small">${esc(c.term)}</p>` +
    (withSentence && c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") +
    (c.note ? `<p class="note">${esc(c.note)}</p>` : "") +
    (rg ? `<p><span class="tag">Register (Einschätzung): ${esc(rg)}</span></p>` : "");
}

export function fb(ok, text) {
  return `<div class="feedback ${ok ? "good" : "bad"}" role="status">${ok ? "✓ Richtig. " : "✗ Nicht ganz. "}${esc(text || "")}</div>`;
}

export const nextBtn = () => '<button type="button" class="primary" id="next">Weiter</button>';

export function bindNext(box, s) {
  const nx = box.querySelector("#next");
  if (!nx) return;
  nx.addEventListener("click", () => s.next());
  nx.focus();
}

export function gradeBtns() {
  return '<div class="btnrow"><button type="button" id="gNo">Noch nicht</button><button type="button" class="primary" id="gOk">Passt</button></div>';
}

export function bindGrade(box, s) {
  box.querySelector("#gOk").addEventListener("click", () => s.answer(true));
  box.querySelector("#gNo").addEventListener("click", () => s.answer(false));
}

// Mehrfachauswahl (Bedeutung, Auswahl): s.ui.opts = [{ t, ok }]
export function optsHtml(s) {
  const { ui, result } = s;
  return '<div class="opts">' + ui.opts.map((o, i) => {
    let cls = "opt";
    let mark = "";
    if (result) {
      if (o.ok) { cls += " good"; mark = " ✓"; } else if (ui.picked === i) { cls += " bad"; mark = " ✗"; }
    }
    return `<button type="button" class="${cls}" data-i="${i}"${result ? " disabled" : ""}><span class="k">${i + 1}</span><span>${esc(o.t)}${mark}</span></button>`;
  }).join("") + "</div>";
}

export function bindOpts(box, s) {
  box.querySelectorAll("button.opt").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    const o = s.ui.opts[i];
    if (s.result || !o) return;
    s.ui.picked = i;
    s.result = { ok: o.ok, given: o.t };
    s.rerender();
  }));
}

// Eingabezeile für Tippaufgaben
// s.typed: bereits getippter Text, bleibt beim Neuzeichnen (z. B. nach einem Hinweis) erhalten
export function answerRow(label, s) {
  return `<div class="answer"><label for="ans" class="chip">${esc(label)}</label>` +
    `<input type="text" id="ans" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" value="${esc((s && s.typed) || "")}">` +
    '<button type="button" class="primary" id="check">Prüfen</button></div>';
}

// check(given) liefert das Ergebnis { ok, … } oder null bei leerer Eingabe
export function bindAnswer(box, s, check) {
  if (s.result) { bindNext(box, s); return; }
  const inp = box.querySelector("#ans");
  if (!inp) return;
  const run = () => {
    if (!inp.value.trim()) { inp.focus(); return; }
    s.result = check(inp.value);
    s.rerender();
  };
  inp.focus();
  box.querySelector("#check").addEventListener("click", run);
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
}

// Prüfzeile mit ✓ oder ✗, optional mit dem geprüften Text darunter
export function checkLine(ok, text, quote) {
  return `<p class="chk ${ok ? "good" : "bad"}"><b aria-hidden="true">${ok ? "✓" : "✗"}</b> ${esc(text)}` +
    (quote !== undefined ? `<br><span class="own">${esc(quote) || "–"}</span>` : "") + "</p>";
}

export function expectedHtml(s, expected) {
  const r = s.result;
  const hinted = r.ok && s.hint && s.hint.level > 0;
  return `<div class="feedback ${r.ok ? "good" : "bad"}" role="status">` +
    (r.ok ? "✓ Richtig." + (hinted ? " Mit Hinweis gelöst: Die Karte bleibt auf ihrer Stufe und kommt morgen wieder." : "")
      : (r.revealed ? "✗ Lösung gezeigt, das zählt als nicht gewusst. Gesucht: " : "✗ Nicht ganz. Gesucht: ") + esc(expected) + (r.given ? " (deine Antwort: " + esc(r.given) + ")" : "")) +
    "</div>";
}

// Gestufte Hinweise (Stufe 1 bis 3, danach „Lösung zeigen“). Der Zustand h gehört zur Karte bzw. zur Lücke:
// { level, wrong: [Indizes falscher Optionen], opts: [Optionen] | null, right: gefunden }.
export const newHint = () => ({ level: 0, wrong: [], opts: null, right: false });

export function hintState(s, c) {
  if (!s.hint || s.hint.id !== c.id) s.hint = { id: c.id, ...newHint() };
  return s.hint;
}

// spec: { c, target, options() }
export function hintHtml(h, spec) {
  let out = '<div class="hintbox">';
  if (h.level >= 1) {
    out += `<p class="scaffold" aria-label="Hinweis">${esc(hintLine(spec.c.cat, spec.target, h.level))}</p>` +
      (spec.c.hint ? `<p class="note">Eigener Hinweis: ${esc(spec.c.hint)}</p>` : "");
  }
  if (h.level >= MAX_HINT && h.opts) {
    out += '<div class="opts" role="group" aria-label="Welche Option passt?">' + h.opts.map((o, i) => {
      const bad = h.wrong.includes(i);
      const good = h.right && o === spec.target.text;
      return `<button type="button" class="opt${bad ? " bad" : good ? " good" : ""}" data-hopt="${i}"${bad || h.right ? " disabled" : ""}><span class="k">${i + 1}</span><span>${esc(o)}${bad ? " ✗" : good ? " ✓" : ""}</span></button>`;
    }).join("") + "</div>";
  }
  out += '<div class="btnrow">' + (h.level < MAX_HINT
    ? `<button type="button" class="small" id="hintBtn">${h.level ? `Nächster Hinweis (${h.level + 1} von ${MAX_HINT})` : "Hinweis"}</button>`
    : '<button type="button" class="small" id="revealBtn">Lösung zeigen</button>') + "</div></div>";
  return out;
}

// hooks: save() sichert Eingaben vor dem Neuzeichnen, redraw() zeichnet neu,
// onRight(text) wird bei der richtigen Option gerufen, onReveal() bei „Lösung zeigen“.
export function bindHint(box, h, spec, hooks) {
  box.querySelector("#hintBtn")?.addEventListener("click", () => {
    hooks.save?.();
    h.level++;
    if (h.level >= MAX_HINT && !h.opts) h.opts = spec.options();
    hooks.redraw();
  });
  box.querySelector("#revealBtn")?.addEventListener("click", () => { hooks.save?.(); hooks.onReveal(); });
  box.querySelectorAll("button[data-hopt]").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.hopt);
    hooks.save?.();
    if (h.opts[i] === spec.target.text) { h.right = true; hooks.onRight(h.opts[i]); } else { h.wrong.push(i); hooks.redraw(); }
  }));
}

export { ans0 };
