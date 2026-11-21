// Stufe 5 · Umformulieren: den schlichten Satz mit der Wendung auf C2-Niveau umschreiben
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { norm, usesExpr } from "../core/match.js";
import { termTarget, termOptions } from "../core/hints.js";
import { progressHtml, chip, sentenceHtml, gradeBtns, bindGrade, bindNext, nextBtn, checkLine, hintState, hintHtml, bindHint } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) s.ui = { id: c.id, stage: "write", text: "" };
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Umformulieren") +
    `<p class="prompt">Schlichte Fassung:</p><p class="sentence">${esc(c.plain)}</p>` +
    `<p class="prompt">Formuliere den Satz auf C2-Niveau um und baue <strong>${esc(c.term)}</strong> ein. Bedeutung: ${esc(cue(c))}</p>`;
  const spec = { c, target: termTarget(c.term), options: () => termOptions(c, s.cards) };
  const h0 = hintState(s, c);
  if (s.ui.stage === "write") {
    h += hintHtml(h0, spec) + `<textarea class="mid" id="txt" aria-label="Dein Satz" spellcheck="false">${esc(s.ui.text)}</textarea>` +
      '<div class="btnrow"><button type="button" class="primary" id="doCheck">Prüfen</button></div>';
  } else {
    const found = usesExpr(s.ui.text, c);
    h += `<p class="sentence own">${esc(s.ui.text)}</p>` +
      checkLine(found, "Ausdruck " + (found ? "erkannt." : "nicht erkannt. Prüfe Form und Wortlaut, auch eine Synonymwendung kann in Ordnung sein.")) +
      (norm(s.ui.text) === norm(c.plain) ? checkLine(false, "Der Satz ist unverändert.") : "") +
      `<p class="prompt">Mustersatz:</p><p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") +
      (s.result
        ? `<div class="feedback bad" role="status">✗ Lösung gezeigt, das zählt als nicht gewusst. Gesucht: ${esc(c.term)}</div>` + nextBtn()
        : '<p class="prompt">Wie war dein Satz im Vergleich?</p>' + gradeBtns());
  }
  box.innerHTML = h + "</div>";
  if (s.ui.stage === "write") {
    const ta = box.querySelector("#txt");
    ta.focus();
    bindHint(box, h0, spec, {
      save: () => { s.ui.text = ta.value; },
      redraw: s.rerender,
      onRight: () => s.rerender(),
      onReveal: () => { s.ui.stage = "judge"; s.result = { ok: false, revealed: true }; s.rerender(); }
    });
    box.querySelector("#doCheck").addEventListener("click", () => {
      if (!ta.value.trim()) { ta.focus(); return; }
      s.ui.text = ta.value;
      s.ui.stage = "judge";
      s.rerender();
    });
  } else if (s.result) bindNext(box, s);
  else bindGrade(box, s);
}
