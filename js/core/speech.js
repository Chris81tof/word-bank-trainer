// Sprachausgabe (Grundfunktion). Stimmenwahl und Einstellungen folgen in Schritt 6.

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function pickVoice(prefs) {
  try {
    const voices = window.speechSynthesis.getVoices();
    return (prefs.voice && voices.find((v) => v.name === prefs.voice)) ||
      voices.find((v) => /^en[-_]GB/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) || null;
  } catch {
    return null;
  }
}

export function stopSpeaking() {
  try { if (canSpeak()) window.speechSynthesis.cancel(); } catch { /* nichts zu tun */ }
}

// Spricht text und ruft danach done() auf, auch wenn die Ausgabe hängt (höchstens 14 Sekunden).
export function say(text, prefs, done = () => {}) {
  if (!text || !prefs.speak || !canSpeak()) { done(); return () => {}; }
  let finished = false;
  const fin = () => { if (!finished) { finished = true; clearTimeout(t); done(); } };
  const t = setTimeout(fin, 14000);
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = prefs.rate || 0.92;
    const v = pickVoice(prefs);
    if (v) u.voice = v;
    u.onend = fin;
    u.onerror = fin;
    window.speechSynthesis.speak(u);
  } catch {
    fin();
  }
  return () => { finished = true; clearTimeout(t); };
}

// Wendung zum Vorlesen: sth./s.o. ausgeschrieben, Klammern weg
export function spokenTerm(c) {
  return c.term.replace(/\([^)]*\)/g, " ").replace(/\bs\.o\.?/gi, "someone").replace(/\bsb\b\.?/gi, "somebody")
    .replace(/\bsth\b\.?/gi, "something").replace(/\bo\.s\.?/gi, "oneself").replace(/\//g, " or ").replace(/\s+/g, " ").trim();
}

export function spokenSentence(c) {
  return c.sentence ? c.sentence.replace(/____/g, c.answer.split("|")[0]) : "";
}
