// Stufe 1 · Karteikarten: überlegen, umdrehen, selbst bewerten
import { esc } from "../core/dom.js";
import { progressHtml, chip, cueParas, sentenceHtml } from "./common.js";

export function render(box, c, s) {
  let h = progressHtml(s);
  if (!s.flipped) {
    h += '<div class="card flip" id="flip" role="button" tabindex="0" aria-label="Karte umdrehen">' +
      chip(c) + cueParas(c) +
      (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence)}</p>` : "") +
      '<span class="hint">Antwort überlegen, dann antippen oder Leertaste drücken</span></div>';
    box.innerHTML = h;
    const f = box.querySelector("#flip");
    const flip = () => { s.flipped = true; s.rerender(); };
    f.addEventListener("click", flip);
    f.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
    f.focus();
    return;
  }
  h += '<div class="card">' + chip(c) +
    `<p class="term">${esc(c.term)}</p>` +
    (c.de ? `<p class="prompt">${esc(c.de)}</p>` : "") +
    (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : c.prompt ? `<p class="prompt">${esc(c.prompt)}</p>` : "") +
    (c.note ? `<p class="note">${esc(c.note)}</p>` : "") +
    "</div>" +
    '<div class="btnrow"><button type="button" id="again1">Nochmal</button><button type="button" class="primary" id="known">Gewusst</button></div>' +
    '<p class="hint">Tastatur: Pfeil links = Nochmal, Pfeil rechts = Gewusst</p>';
  box.innerHTML = h;
  box.querySelector("#again1").addEventListener("click", () => s.answer(false));
  box.querySelector("#known").addEventListener("click", () => s.answer(true));
  box.querySelector("#known").focus();
}
