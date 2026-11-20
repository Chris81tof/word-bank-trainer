// Stufe 5 · Satz schreiben: Definition in eigenen Worten und drei Beispielsätze,
// danach Prüfung, ob die Wendung erkannt wird, und ein Prompt zum Kopieren für Claude.
import { esc, copyText } from "../core/dom.js";
import { usesExpr } from "../core/match.js";
import { producePrompt, PRODUCE_LABELS } from "../core/prompts.js";
import { progressHtml, chip, sentenceHtml, gradeBtns, bindGrade, checkLine } from "./common.js";

const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export function render(box, c, s) {
  if (!s.ui || s.ui.id !== c.id) s.ui = { id: c.id, stage: "write", v: ["", "", "", ""] };
  const ui = s.ui;
  let h = progressHtml(s) + '<div class="card">' + chip(c, "Satz schreiben") +
    `<p class="term">${esc(c.term)}</p>` + (c.de ? `<p class="prompt">${esc(c.de)}</p>` : "");
  if (ui.stage === "write") {
    h += PRODUCE_LABELS.map((l, i) =>
      `<div class="field"><label for="pf${i}">${esc(l)}</label><textarea class="mid" id="pf${i}" spellcheck="false">${esc(ui.v[i])}</textarea></div>`
    ).join("") + '<div class="btnrow"><button type="button" class="primary" id="doCheck">Prüfen</button></div>';
  } else {
    h += `<p class="prompt">Deine Definition:</p><p class="own">${esc(ui.v[0]) || "–"}</p>`;
    if (ui.v[0] && usesExpr(ui.v[0], c)) h += checkLine(false, "Die Definition enthält den Ausdruck selbst. Umschreibe ihn.");
    for (let i = 1; i < 4; i++) {
      const ok = usesExpr(ui.v[i], c);
      h += checkLine(ok, PRODUCE_LABELS[i] + (ok ? "" : ": Ausdruck nicht erkannt") + (words(ui.v[i]) < 6 ? " (sehr kurz)" : ""), ui.v[i]);
    }
    h += '<div class="btnrow"><button type="button" id="copyPr">Prompt für Claude kopieren</button></div><p class="msg" id="prMsg"></p>' +
      '<p class="prompt">Muster:</p>' + (c.prompt ? `<p>${esc(c.prompt)}</p>` : "") +
      (c.sentence ? `<p class="sentence">${sentenceHtml(c.sentence, c.answer)}</p>` : "") +
      (c.note ? `<p class="note">${esc(c.note)}</p>` : "") +
      '<p class="prompt">Wie gut waren Definition und Sätze insgesamt?</p>' + gradeBtns();
  }
  box.innerHTML = h + "</div>";
  if (ui.stage === "write") {
    box.querySelector("#pf0").focus();
    box.querySelector("#doCheck").addEventListener("click", () => {
      const v = [0, 1, 2, 3].map((i) => box.querySelector("#pf" + i).value);
      if (!v.some((t) => t.trim())) { box.querySelector("#pf0").focus(); return; }
      ui.v = v;
      ui.stage = "judge";
      s.rerender();
    });
  } else {
    bindGrade(box, s);
    box.querySelector("#copyPr").addEventListener("click", () => copyText(producePrompt(c, ui.v), box.querySelector("#prMsg")));
  }
}
