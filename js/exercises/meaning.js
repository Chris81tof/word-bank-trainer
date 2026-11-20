// Stufe 1 · Bedeutung: die richtige Bedeutung aus vier wählen
import { esc, shuffle } from "../core/dom.js";
import { cue } from "../core/modes.js";
import { progressHtml, chip, sentenceHtml, optsHtml, bindOpts, fb, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) {
    const correct = cue(c);
    const pool = s.cards.filter((o) => o.id !== c.id && cue(o) && cue(o) !== correct);
    const picks = [...shuffle(pool.filter((o) => o.cat === c.cat)), ...shuffle(pool.filter((o) => o.cat !== c.cat))];
    const seen = new Set([correct]);
    const opts = [{ t: correct, ok: true }];
    for (const o of picks) {
      if (opts.length >= 4) break;
      const t = cue(o);
      if (!seen.has(t)) { seen.add(t); opts.push({ t, ok: false }); }
    }
    s.ui = { id: c.id, opts: shuffle(opts), picked: null };
  }
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Bedeutung") +
    `<p class="term">${esc(c.term)}</p>` +
    (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") +
    '<p class="prompt">Was bedeutet die Wendung hier?</p>' + optsHtml(s);
  if (s.result) h += fb(s.result.ok, s.result.ok ? "" : "Gesucht: " + cue(c)) + refHtml(c, false) + nextBtn();
  box.innerHTML = h + "</div>";
  bindOpts(box, s);
  bindNext(box, s);
}
