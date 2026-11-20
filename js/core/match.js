// Vergleichen und Erkennen: Antworten prüfen, Wendungen in freien Texten finden.

export function norm(s) {
  return String(s).toLowerCase().replace(/[’‘]/g, "'").trim().replace(/[.!?,;:]+$/, "").replace(/\s+/g, " ").trim();
}

const PLACEHOLDERS = /^(s\.o\.?|s\.b\.?|o\.s\.?|sth\.?|so|sb|someone|somebody|something|doing|oneself|yourself|myself|himself|herself|themselves|one's|my|your|his|her|their)$/;

// Vergleichsform einer Wendung: ohne to, sth., s.o., someone, (doing)
export function key(s) {
  const t = norm(s).replace(/\([^)]*\)/g, " ").replace(/\//g, " ").split(" ").filter((w) => w && !PLACEHOLDERS.test(w));
  if (t[0] === "to") t.shift();
  return t.join(" ");
}

const IRR = {
  put: ["put", "puts", "putting"], let: ["let", "lets", "letting"], come: ["come", "comes", "came", "coming"],
  take: ["take", "takes", "took", "taken", "taking"], draw: ["draw", "draws", "drew", "drawn", "drawing"],
  tear: ["tear", "tears", "tore", "torn", "tearing"], hang: ["hang", "hangs", "hung", "hanging"],
  make: ["make", "makes", "made", "making"], give: ["give", "gives", "gave", "given", "giving"],
  run: ["run", "runs", "ran", "running"], tell: ["tell", "tells", "told", "telling"],
  get: ["get", "gets", "got", "gotten", "getting"], go: ["go", "goes", "went", "gone", "going"],
  grow: ["grow", "grows", "grew", "grown", "growing"], stand: ["stand", "stands", "stood", "standing"],
  do: ["do", "does", "did", "done", "doing"], send: ["send", "sends", "sent", "sending"],
  have: ["have", "has", "had", "having"], write: ["write", "writes", "wrote", "written", "writing"],
  see: ["see", "sees", "saw", "seen", "seeing"], speak: ["speak", "speaks", "spoke", "spoken", "speaking"],
  show: ["show", "shows", "showed", "shown", "showing"], lie: ["lie", "lies", "lay", "lain", "lying"],
  sink: ["sink", "sinks", "sank", "sunk", "sinking"], burn: ["burn", "burns", "burned", "burnt", "burning"],
  blow: ["blow", "blows", "blew", "blown", "blowing"], wind: ["wind", "winds", "wound", "winding"],
  lean: ["lean", "leans", "leaned", "leant", "leaning"],
  be: ["be", "is", "are", "was", "were", "been", "being", "am", "'m", "'s", "'re"],
  live: ["live", "lives", "lived", "living"], dry: ["dry", "dries", "dried", "drying"], cut: ["cut", "cuts", "cutting"],
  rule: ["rule", "rules", "ruled", "ruling"], pay: ["pay", "pays", "paid", "paying"],
  keep: ["keep", "keeps", "kept", "keeping"], rise: ["rise", "rises", "rose", "risen", "rising"],
  drive: ["drive", "drives", "drove", "driven", "driving"], bear: ["bear", "bears", "bore", "borne", "bearing"],
  tie: ["tie", "ties", "tied", "tying"], leave: ["leave", "leaves", "left", "leaving"],
  hold: ["hold", "holds", "held", "holding"], fall: ["fall", "falls", "fell", "fallen", "falling"],
  bring: ["bring", "brings", "brought", "bringing"], think: ["think", "thinks", "thought", "thinking"]
};

// Mögliche Formen eines Wortes (regelmäßig und unregelmäßig)
export function forms(w) {
  if (IRR[w]) return IRR[w];
  const f = [w, w + "s", w + "es", w + "ed", w + "d", w + "ing"];
  if (/e$/.test(w)) f.push(w.slice(0, -1) + "ing");
  if (/y$/.test(w)) f.push(w.slice(0, -1) + "ies", w.slice(0, -1) + "ied");
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) f.push(w + w.slice(-1) + "ed", w + w.slice(-1) + "ing");
  return f;
}

export function tokens(t) {
  return String(t).toLowerCase().replace(/[’‘]/g, "'").split(/[^a-z']+/).filter(Boolean);
}

// Alle Schreibweisen einer Karte: term plus alt
export function variantsOf(card) {
  return [card.term, ...(card.alt || [])];
}

// Die Wörter von w müssen in dieser Reihenfolge vorkommen, höchstens 5 Wörter auseinander.
function matchWords(tk, w) {
  const f0 = forms(w[0]);
  for (let i = 0; i < tk.length; i++) {
    if (!f0.includes(tk[i])) continue;
    let pos = i;
    let ok = true;
    for (let k = 1; k < w.length; k++) {
      const fk = forms(w[k]);
      let found = -1;
      for (let j = pos + 1; j <= pos + 5 && j < tk.length; j++) {
        if (fk.includes(tk[j])) { found = j; break; }
      }
      if (found < 0) { ok = false; break; }
      pos = found;
    }
    if (ok) return true;
  }
  return false;
}

// Kommt die Wendung der Karte im Text vor (auch gebeugt oder mit eingeschobenen Wörtern)?
export function usesExpr(text, card) {
  const tk = tokens(text);
  if (!tk.length) return false;
  return variantsOf(card).some((v) => {
    const w = key(String(v).replace(/-/g, " ")).split(" ").filter(Boolean);
    if (["be", "a", "an", "the"].includes(w[0])) w.shift();
    return w.length > 0 && matchWords(tk, w);
  });
}

// Ist die Eingabe eine der richtigen Lösungen (mehrere mit | getrennt)?
export function answerOk(card, given) {
  return card.answer.split("|").some((a) => norm(a) === norm(given));
}
