// Stufe 4 · Fehlersuche: Ist das markierte Wort richtig? Wenn nicht, die Korrektur tippen.
import { answerOk } from "../core/match.js";
import { ans0 } from "../core/modes.js";
import { progressHtml, chip, cueParas, sentenceHtml, answerRow, bindAnswer, fb, refHtml, nextBtn, bindNext } from "./common.js";

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) {
    const wrong = Math.random() < 0.6;
    s.ui = { id: c.id, wrong, word: wrong ? c.wrong[Math.floor(Math.random() * c.wrong.length)] : ans0(c), stage: "judge" };
  }
  const ui = s.ui;
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Fehlersuche") + cueParas(c) +
    `<p class="sentence">${sentenceHtml(c.sentence, ui.word)}</p>`;
  if (s.result) h += fb(s.result.ok, s.result.msg) + refHtml(c) + nextBtn();
  else if (ui.stage === "judge") {
    h += '<p class="prompt">Ist das markierte Wort in diesem Satz richtig?</p>' +
      '<div class="btnrow"><button type="button" id="eOk">Ja, der Satz ist korrekt</button><button type="button" class="primary" id="eErr">Nein, hier steckt ein Fehler</button></div>';
  } else h += '<p class="prompt">Welches Wort gehört an die markierte Stelle?</p>' + answerRow("Korrektur");
  box.innerHTML = h + "</div>";

  if (s.result) { bindNext(box, s); return; }
  if (ui.stage === "fix") {
    bindAnswer(box, s, (given) => {
      const ok = answerOk(c, given);
      return { ok, msg: ok ? "Richtig gefunden und korrigiert." : `Der Fehler stimmt, aber die Korrektur nicht. Gesucht: ${ans0(c)} (deine Antwort: ${given.trim()}).` };
    });
    return;
  }
  box.querySelector("#eOk").addEventListener("click", () => {
    s.result = ui.wrong
      ? { ok: false, msg: `Das markierte Wort „${ui.word}“ ist falsch. Richtig ist: ${ans0(c)}.` }
      : { ok: true, msg: "Der Satz war korrekt." };
    s.rerender();
  });
  box.querySelector("#eErr").addEventListener("click", () => {
    if (!ui.wrong) s.result = { ok: false, msg: `Der Satz war korrekt, das Wort „${ui.word}“ passt hier.` };
    else ui.stage = "fix";
    s.rerender();
  });
}
