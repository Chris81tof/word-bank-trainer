// Einstellungen (erreichbar über „Heute“ und „Sammlung“): Sprachausgabe mit Stimmenwahl und Tempo.
import { esc } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { canSpeak, voices, onVoices, rankVoices, bestVoice, voiceLabel, qualityOf, say, stopSpeaking, SAMPLE } from "../core/speech.js";

let unsubscribe = null;

export function leave() {
  stopSpeaking();
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

export function render(root, app) {
  const { prefs } = app.state;
  const rerender = () => render(root, app);
  // Safari liefert die Stimmen manchmal erst nach dem ersten Zeichnen. Einmal pro Besuch anmelden.
  if (!unsubscribe) unsubscribe = onVoices(rerender);

  let h = `<div class="sessionbar"><h1 class="withicon">${icon("settings")}Einstellungen</h1><a class="small btnlink" href="#today">Zurück</a></div>`;
  h += "<h2>Sprachausgabe</h2>";
  if (!canSpeak()) {
    root.innerHTML = h + '<p class="prompt">Dieser Browser kann nicht vorlesen.</p>';
    return;
  }
  const list = rankVoices(voices());
  const auto = bestVoice(voices(), "");
  const current = bestVoice(voices(), prefs.voice);
  const missing = prefs.voice && !voices().some((v) => v.name === prefs.voice);

  h += `<label class="check"><input type="checkbox" id="sSpeak"${prefs.speak ? " checked" : ""}> Englisch vorlesen (Übungen und Passiv-Durchlauf)</label>` +
    `<label class="field" for="sRate">Tempo: <strong id="sRateV">${Math.round(prefs.rate * 100)} %</strong></label>` +
    `<input type="range" id="sRate" min="0.6" max="1.2" step="0.02" value="${prefs.rate}">` +
    `<p class="prompt">Jetzt aktiv: <strong>${current ? esc(voiceLabel(current)) : "keine englische Stimme gefunden"}</strong></p>` +
    (missing ? `<p class="msg err">Die gewählte Stimme „${esc(prefs.voice)}“ gibt es auf diesem Gerät nicht. Es gilt die automatische Wahl.</p>` : "");

  h += '<ul class="list voices" role="radiogroup" aria-label="Stimme">' +
    `<li><label class="pick"><input type="radio" name="voice" value=""${prefs.voice ? "" : " checked"}><span class="meta"><strong>Automatisch</strong><span>${auto ? esc(voiceLabel(auto)) : "–"}</span></span></label>` +
    `<button type="button" class="small" data-try="">Probe</button></li>` +
    list.map((v, i) => `<li><label class="pick"><input type="radio" name="voice" value="${esc(v.name)}"${prefs.voice === v.name ? " checked" : ""}>` +
      `<span class="meta"><strong>${esc(v.name.replace(/\s*\((premium|enhanced|erweitert)\)/i, ""))}</strong><span>${esc((v.lang || "").replace("_", "-"))}${qualityOf(v) === 2 ? " · Premium" : qualityOf(v) === 1 ? " · Erweitert" : ""}${i === 0 ? " · beste Wahl" : ""}</span></span></label>` +
      `<button type="button" class="small" data-try="${esc(v.name)}">Probe</button></li>`).join("") +
    "</ul>";
  if (!list.length) h += '<p class="hint">Noch keine Stimmen geladen. Falls die Liste leer bleibt, die App einmal neu öffnen.</p>';

  h += '<h2>Bessere Stimmen auf dem iPhone</h2>' +
    '<p class="prompt">Die Stimmen in Premium- oder erweiterter Qualität klingen deutlich natürlicher. iOS lädt sie nicht von selbst:</p>' +
    '<ol class="steps"><li>Einstellungen › Bedienungshilfen › Gesprochene Inhalte › Stimmen › Englisch</li>' +
    "<li>Eine britische Stimme wählen, zum Beispiel Daniel, Serena oder Jamie, und die Fassung „Premium“ oder „Erweitert“ laden.</li>" +
    "<li>Die App danach ganz schließen und neu öffnen. Die automatische Wahl nimmt die neue Stimme dann von selbst.</li></ol>";

  root.innerHTML = h;

  root.querySelector("#sSpeak").addEventListener("change", (e) => {
    prefs.speak = e.target.checked;
    if (!prefs.speak) stopSpeaking();
    app.save();
  });
  const rate = root.querySelector("#sRate");
  rate.addEventListener("input", () => { root.querySelector("#sRateV").textContent = Math.round(rate.value * 100) + " %"; });
  rate.addEventListener("change", () => { prefs.rate = Number(rate.value); app.save(); say(SAMPLE, prefs, undefined, { force: true }); });
  root.querySelectorAll('input[name="voice"]').forEach((r) => r.addEventListener("change", () => {
    prefs.voice = r.value;
    app.save();
    say(SAMPLE, prefs, undefined, { force: true });
    rerender();
  }));
  root.querySelectorAll("[data-try]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.try ? voices().find((x) => x.name === b.dataset.try) : auto;
    say(SAMPLE, prefs, undefined, { force: true, voice: v || undefined });
  }));
}
