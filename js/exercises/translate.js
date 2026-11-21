// Stufe 3 · Übersetzen: aus der deutschen Bedeutung die englische Wendung tippen
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { key, variantsOf } from "../core/match.js";
import { termTarget, termOptions } from "../core/hints.js";
import { progressHtml, chip, sentenceHtml, answerRow, bindAnswer, expectedHtml, nextBtn, hintState, hintHtml, bindHint } from "./common.js";

// Vergleich ohne to, sth., s.o. usw.; ein Zusatz nach der Wendung ist erlaubt.
export function termOk(c, given) {
  const kg = key(given);
  return variantsOf(c).some((t) => {
    const kt = key(t);
    return kt && (kg === kt || kg.startsWith(kt + " "));
  });
}

export function render(box, c, s) {
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Deutsch zu Englisch") + `<p class="de">${esc(cue(c))}</p>`;
  const spec = { c, target: termTarget(c.term), options: () => termOptions(c, s.cards) };
  const h0 = hintState(s, c);
  if (!s.result) h += '<p class="prompt">Wie heißt die Wendung auf Englisch?</p>' + hintHtml(h0, spec) + answerRow("Englisch", s);
  else {
    h += expectedHtml(s, c.term) +
      (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") + nextBtn();
  }
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => ({ ok: termOk(c, given), given: given.trim() }));
  if (!s.result) {
    bindHint(box, h0, spec, {
      save: () => { s.typed = box.querySelector("#ans").value; },
      redraw: s.rerender,
      onRight: (t) => { s.result = { ok: true, given: t }; s.rerender(); },
      onReveal: () => { s.result = { ok: false, given: "", revealed: true }; s.rerender(); }
    });
  }
}
