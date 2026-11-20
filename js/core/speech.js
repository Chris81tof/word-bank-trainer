// Sprachausgabe: englische Stimme automatisch wählen oder aus den Einstellungen nehmen, vorlesen.

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export const SAMPLE = "It's a difficult task, but I'm sure she will rise to the challenge.";

// Bekannte gute Stimmen (Apple, Google, Microsoft); britische zuerst
const KNOWN = ["daniel", "kate", "serena", "arthur", "martha", "oliver", "jamie", "stephanie", "google uk english", "libby", "sonia", "ryan", "moira", "fiona", "karen", "samantha", "ava", "evan", "zoe"];
// Spaß- und Effektstimmen von Apple, mit ihren deutschen Namen: nie automatisch wählen
const NOVELTY = new RegExp("^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|" +
  "junior|ralph|fred|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|monster|" +
  "flüstern|glocken|gute neuigkeiten|schlechte neuigkeiten|seifenblasen|spaßvogel|orgel|katrin)(\\s|\\(|$)", "i");

const isEnglish = (v) => /^en([-_]|$)/i.test(v.lang || "");

// Qualität: 2 = Premium, 1 = Enhanced/Erweitert, 0 = normal (Safari schreibt sie in Name oder voiceURI)
export function qualityOf(v) {
  const s = `${v.name} ${v.voiceURI || ""}`;
  if (/premium/i.test(s)) return 2;
  if (/enhanced|erweitert|neural|natural/i.test(s)) return 1;
  return 0;
}

// en-GB 3, en-US 2, anderes Englisch 1
export function langRank(v) {
  const l = (v.lang || "").replace("_", "-").toLowerCase();
  if (l === "en-gb") return 3;
  if (l === "en-us") return 2;
  return isEnglish(v) ? 1 : 0;
}

const knownRank = (v) => {
  const n = v.name.toLowerCase();
  const i = KNOWN.findIndex((k) => n.startsWith(k));
  return i < 0 ? KNOWN.length : i;
};

// Englische Stimmen, beste zuerst
export function rankVoices(voices) {
  return voices.filter(isEnglish).slice().sort((a, b) => {
    const na = NOVELTY.test(a.name), nb = NOVELTY.test(b.name);
    if (na !== nb) return na ? 1 : -1;
    const qa = qualityOf(a), qb = qualityOf(b);
    if ((qa > 0) !== (qb > 0)) return qa > 0 ? -1 : 1;
    if (qa > 0) return langRank(b) - langRank(a) || qb - qa || knownRank(a) - knownRank(b) || a.name.localeCompare(b.name);
    return knownRank(a) - knownRank(b) || langRank(b) - langRank(a) || (b.localService ? 1 : 0) - (a.localService ? 1 : 0) || a.name.localeCompare(b.name);
  });
}

// Gewählte Stimme aus den Einstellungen, sonst die beste
export function bestVoice(voices, name) {
  return (name && voices.find((v) => v.name === name)) || rankVoices(voices)[0] || null;
}

export function voiceLabel(v) {
  const q = qualityOf(v);
  return `${v.name.replace(/\s*\((premium|enhanced|erweitert)\)/i, "")} · ${(v.lang || "").replace("_", "-")}${q === 2 ? " · Premium" : q === 1 ? " · Erweitert" : ""}`;
}

// Safari meldet die Stimmen verzögert: auf voiceschanged warten und zur Sicherheit nachfragen.
let cache = [];
const listeners = new Set();

function refresh() {
  try {
    const v = window.speechSynthesis.getVoices();
    if (v.length && v.length !== cache.length) {
      cache = v;
      // Über eine Kopie laufen: Wer sich im Aufruf neu anmeldet, darf die Schleife nicht verlängern.
      [...listeners].forEach((fn) => fn(cache));
    }
  } catch { /* keine Sprachausgabe */ }
}

export function initVoices() {
  if (!canSpeak()) return;
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
  let tries = 0;
  const poll = setInterval(() => { refresh(); if (++tries >= 20) clearInterval(poll); }, 250);
}

export const voices = () => cache;

// Wird bei jeder neuen Stimmenliste aufgerufen; gibt eine Abmeldefunktion zurück.
export function onVoices(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stopSpeaking() {
  try { if (canSpeak()) window.speechSynthesis.cancel(); } catch { /* nichts zu tun */ }
}

// Spricht text und ruft danach done() auf, auch wenn die Ausgabe hängt (höchstens 14 Sekunden).
// force: auch sprechen, wenn Vorlesen ausgeschaltet ist (Probe in den Einstellungen).
export function say(text, prefs, done = () => {}, { force = false, voice } = {}) {
  if (!text || (!prefs.speak && !force) || !canSpeak()) { done(); return; }
  let finished = false;
  const fin = () => { if (!finished) { finished = true; clearTimeout(t); done(); } };
  const t = setTimeout(fin, 14000);
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voice || bestVoice(cache.length ? cache : window.speechSynthesis.getVoices(), prefs.voice);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    u.rate = prefs.rate || 0.92;
    u.onend = fin;
    u.onerror = fin;
    window.speechSynthesis.speak(u);
  } catch {
    fin();
  }
}

// Wendung zum Vorlesen: sth./s.o. ausgeschrieben, Klammern weg
export function spokenTerm(c) {
  return c.term.replace(/\([^)]*\)/g, " ").replace(/\bs\.o\.?/gi, "someone").replace(/\bsb\b\.?/gi, "somebody")
    .replace(/\bsth\b\.?/gi, "something").replace(/\bo\.s\.?/gi, "oneself").replace(/\//g, " or ").replace(/\s+/g, " ").trim();
}

export function spokenSentence(c) {
  return c.sentence ? c.sentence.replace(/____/g, c.answer.split("|")[0]) : "";
}
