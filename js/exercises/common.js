// Bausteine, die mehrere Übungen teilen.
// s ist die laufende Runde (views/practice.js): queue, right, wrong, result, ui, rerender(), next().
import { esc } from "../core/dom.js";
import { ans0 } from "../core/modes.js";
import { icon, catIcon } from "../core/icons.js";

export const REG = { i: "informell", n: "neutral", f: "formell / gehoben" };

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
  const rg = REG[c.reg];
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
export function answerRow(label) {
  return `<div class="answer"><label for="ans" class="chip">${esc(label)}</label>` +
    '<input type="text" id="ans" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">' +
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

export function expectedHtml(s, expected) {
  const r = s.result;
  return `<div class="feedback ${r.ok ? "good" : "bad"}" role="status">` +
    (r.ok ? "✓ Richtig." : "✗ Nicht ganz. Gesucht: " + esc(expected) + (r.given ? " (deine Antwort: " + esc(r.given) + ")" : "")) +
    "</div>";
}

export { ans0 };
