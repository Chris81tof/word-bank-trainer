// Stufe 3 · Lückentext: das fehlende Wort eintippen
import { esc } from "../core/dom.js";
import { answerOk } from "../core/match.js";
import { gapTarget, gapOptions } from "../core/hints.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, expectedHtml, nextBtn, hintState, hintHtml, bindHint } from "./common.js";

export function render(box, c, s) {
  let h = progressHtml(s) + '<div class="card">' + chip(c) + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, s.result ? c.answer : "")}</p>`;
  const spec = { c, target: gapTarget(c.answer), options: () => gapOptions(c, s.cards) };
  const h0 = hintState(s, c);
  if (!s.result) h += hintHtml(h0, spec) + answerRow("Lösung", s);
  else {
    h += expectedHtml(s, c.answer.split("|").join(" / ")) +
      `<p class="term small">${esc(c.term)}</p>` +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") + nextBtn();
  }
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => ({ ok: answerOk(c, given), given: given.trim() }));
  if (!s.result) {
    bindHint(box, h0, spec, {
      save: () => { s.typed = box.querySelector("#ans").value; },
      redraw: s.rerender,
      onRight: (t) => { s.result = { ok: true, given: t }; s.rerender(); },
      onReveal: () => { s.result = { ok: false, given: "", revealed: true }; s.rerender(); }
    });
  }
}
