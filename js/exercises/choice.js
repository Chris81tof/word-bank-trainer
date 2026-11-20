// Stufe 2 · Auswahl: welche Option klingt im Satz natürlich?
import { shuffle } from "../core/dom.js";
import { ans0 } from "../core/modes.js";
import { progressHtml, chip, cueParas, sentenceHtml, optsHtml, bindOpts, fb, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) {
    const opts = [{ t: ans0(c), ok: true }, ...c.wrong.slice(0, 3).map((t) => ({ t, ok: false }))];
    s.ui = { id: c.id, opts: shuffle(opts), picked: null };
  }
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Welche Option klingt natürlich?") + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, s.result ? c.answer : "")}</p>` + optsHtml(s);
  if (s.result) {
    h += fb(s.result.ok, s.result.ok ? "" : "Gesucht: " + ans0(c)) +
      '<p class="prompt">Die anderen Optionen bilden mit dieser Bedeutung keine feste Wendung.</p>' +
      refHtml(c, false) + nextBtn();
  }
  box.innerHTML = h + "</div>";
  bindOpts(box, s);
  bindNext(box, s);
}
