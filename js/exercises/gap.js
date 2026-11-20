// Stufe 3 · Lückentext: das fehlende Wort eintippen
import { esc } from "../core/dom.js";
import { answerOk } from "../core/match.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, expectedHtml, nextBtn } from "./common.js";

export function render(box, c, s) {
  let h = progressHtml(s) + '<div class="card">' + chip(c) + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, s.result ? c.answer : "")}</p>`;
  if (!s.result) h += answerRow("Lösung");
  else {
    h += expectedHtml(s, c.answer.split("|").join(" / ")) +
      `<p class="term small">${esc(c.term)}</p>` +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") + nextBtn();
  }
  box.innerHTML = h + "</div>";
  bindAnswer(box, s, (given) => ({ ok: answerOk(c, given), given: given.trim() }));
}
