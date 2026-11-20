// Stufe 3 · Übersetzen: aus der deutschen Bedeutung die englische Wendung tippen
import { esc } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { key, variantsOf } from "../core/match.js";
import { progressHtml, chip, sentenceHtml, answerRow, bindAnswer, expectedHtml, nextBtn } from "./common.js";

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
  if (!s.result) h += '<p class="prompt">Wie heißt die Wendung auf Englisch?</p>' + answerRow("Englisch");
  else {
    h += expectedHtml(s, c.term) +
      (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") + nextBtn();
  }
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => ({ ok: termOk(c, given), given: given.trim() }));
}
