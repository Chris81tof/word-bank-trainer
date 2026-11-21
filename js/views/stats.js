// Reiter „Statistik“: Überblick, Fälligkeiten, Stufen, Ergebnisse je Übung und Kategorie.
import { esc } from "../core/dom.js";
import { MODES, TRANSFER, cue } from "../core/modes.js";
import { STATUS, MASTERED, INTERVALS } from "../core/srs.js";
import { summarize } from "../core/stats.js";
import { today, dayToDate } from "../core/dates.js";
import { icon } from "../core/icons.js";
import { pickProblems } from "./practice.js";

function tile(sym, n, label) {
  return `<div class="tile"><span class="sym" aria-hidden="true">${sym}</span><strong>${n}</strong><span>${esc(label)}</span></div>`;
}

// Säulendiagramm mit einer Reihe: Werte stehen über den Säulen, die Beschriftung darunter.
function bars(items, label) {
  const max = Math.max(1, ...items.map((x) => x.n));
  const desc = items.map((x) => `${x.label}: ${x.n}`).join(", ");
  return `<div class="bars" role="img" aria-label="${esc(label + ": " + desc)}">` +
    items.map((x) => `<div class="bar" title="${esc(x.label + ": " + x.n + " Karten")}"><span class="v">${x.n}</span>` +
      `<i style="height:${Math.round((x.n / max) * 80)}px"></i><span class="l">${esc(x.label)}</span></div>`).join("") + "</div>";
}

const rate = (r, w) => (r + w ? Math.round((r / (r + w)) * 100) + " %" : "–");

export function render(root, app) {
  const day = today();
  const s = summarize(app.cards(), app.state.progress, day);

  let h = `<h1 class="withicon">${icon("stats")}Statistik</h1><h2>Überblick</h2><div class="tiles">` +
    tile("○", s.by.new, STATUS.new) + tile("◐", s.by.developing, STATUS.developing) +
    tile("▲", s.by.problem, STATUS.problem) + tile("●", s.by.mastered, STATUS.mastered) + "</div>" +
    `<p class="hint">Mastered: ab Stufe ${MASTERED}. Problematic: mindestens 2 falsche Antworten und nicht weniger falsche als richtige. Developing: alles dazwischen.</p>`;

  h += `<h2>Heute</h2><p class="prompt"><strong>${s.due}</strong> Karten sind fällig, davon ${s.dueNew} noch nie geübt. Heute geübt: <strong>${s.today}</strong> Karten.</p>` +
    '<div class="btnrow"><button type="button" class="primary" id="goPlan">Zum Tagesplan</button>' +
    `<button type="button" id="goProblem"${s.by.problem ? "" : " disabled"}>Problematische üben</button></div>`;

  const wd = (k) => (k === 0 ? "heute" : dayToDate(day + k).toLocaleDateString("de-DE", { weekday: "short" }));
  if (s.hinted) h += `<p class="hint">Mit Hinweis gelöst: ${s.hinted} Mal bei ${s.hintedCards} Karten. Solche Antworten heben die Karte nicht in die nächste Stufe.</p>`;

  h += "<h2>Fällig in den nächsten 7 Tagen</h2>" + bars(s.forecast.map((n, k) => ({ n, label: wd(k) })), "Fällige Karten je Tag");

  h += "<h2>Geübte Karten nach Stufe</h2>" +
    bars(s.boxes.map((n, b) => ({ n, label: String(b) })), "Karten je Stufe") +
    `<p class="hint">Stufe 0 bis 6, Abstände ${INTERVALS.slice(1).join(", ")} Tage. Neue Karten sind nicht mitgezählt.</p>`;

  const labels = { ...Object.fromEntries(Object.entries(MODES).map(([m, M]) => [m, M.label])), ...TRANSFER };
  h += '<h2>Nach Übungsart</h2><div class="tablewrap"><table><thead><tr><th>Übung</th><th>Richtig</th><th>Falsch</th><th>Quote</th></tr></thead><tbody>' +
    Object.entries(labels).map(([m, l]) => {
      const [r, w] = s.modes[m] || [0, 0];
      return `<tr><td>${esc(l)}</td><td>${r}</td><td>${w}</td><td>${rate(r, w)}</td></tr>`;
    }).join("") + "</tbody></table></div>";

  h += '<h2>Nach Kategorie</h2><div class="tablewrap"><table><thead><tr><th>Kategorie</th><th>Karten</th><th>Mastered</th><th>Problematic</th></tr></thead><tbody>' +
    Object.entries(s.cats).map(([name, o]) => `<tr><td>${esc(name)}</td><td>${o.n}</td><td>${o.mastered}</td><td>${o.problem}</td></tr>`).join("") +
    "</tbody></table></div>";

  h += "<h2>Problematische Karten</h2>";
  h += s.problems.length
    ? '<ul class="list">' + s.problems.map(({ c, right, wrong }) =>
      `<li><div class="meta"><strong>${esc(c.term)}</strong><span>${esc(cue(c))}</span><span>${wrong} falsch, ${right} richtig</span></div></li>`).join("") + "</ul>"
    : '<p class="prompt">Noch keine. Karten erscheinen hier, sobald du sie mehrfach falsch beantwortest.</p>';

  root.innerHTML = h;
  root.querySelector("#goPlan").addEventListener("click", () => app.go("today"));
  root.querySelector("#goProblem").addEventListener("click", () => pickProblems(app));
}
