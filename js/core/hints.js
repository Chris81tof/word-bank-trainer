// Gestufte Hinweise für Übungen mit freier Eingabe.
// Stufe 1: Kategorie und Gerüst (Wortzahl, Striche), Stufe 2: Anfangsbuchstaben, Stufe 3: Auswahl aus 4 Optionen.
// Vor Stufe 3 verrät nichts die Lösung vollständig.
import { key, norm } from "./match.js";

export const MAX_HINT = 3;
const isLetter = (ch) => /[\p{L}\p{N}]/u.test(ch);

// Ziel eines Hinweises: die Hauptlösung. Bei Ausdrücken zählt die Vergleichsform (ohne to, sth.),
// bei Lückenwörtern das erste Wort vor einem |. Varianten (alt) werden nicht benutzt.
export const gapTarget = (answer) => ({ text: String(answer).split("|")[0].trim(), isTerm: false });
export const termTarget = (term) => ({ text: String(term).trim(), isTerm: true });

export function wordsOf(target) {
  const t = target.isTerm ? key(target.text) : norm(target.text);
  const w = t.split(" ").filter(Boolean);
  return w.length ? w : String(target.text).split(/\s+/).filter(Boolean);
}

// "_ _ _ _  _ _ _ _"; mit first erscheint der erste Buchstabe jedes Wortes mit mindestens zwei Buchstaben.
export function scaffold(words, first = false) {
  return words.map((w) => {
    const n = [...w].filter(isLetter).length;
    return [...w].map((ch, i) => (isLetter(ch) && !(first && n >= 2 && i === 0) ? "_" : ch)).join(" ");
  }).join("  ");
}

// Text für Stufe 1 und 2, z. B. "Phrasal verb, 2 Wörter: _ _ _ _  _ _ _ _"
export function hintLine(cat, target, level) {
  const w = wordsOf(target);
  return `${cat ? cat + ", " : ""}${w.length} ${w.length === 1 ? "Wort" : "Wörter"}: ${scaffold(w, level >= 2)}`;
}

function shuffled(a, rand = Math.random) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 4 gemischte Optionen: die Lösung plus 3 Ablenker. tiers: Listen von Kandidaten, die erste hat Vorrang.
// exclude: Schreibweisen, die ebenfalls richtig sind und nie als Ablenker erscheinen dürfen.
export function buildOptions(solution, tiers, exclude = [], rand = Math.random) {
  const seen = new Set([solution, ...exclude].map((x) => norm(x)));
  const pick = [];
  for (const tier of tiers) {
    for (const cand of shuffled(tier, rand)) {
      const k = norm(cand);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      pick.push(cand);
      if (pick.length === 3) return shuffled([solution, ...pick], rand);
    }
  }
  return shuffled([solution, ...pick], rand);
}

const sameCat = (cards, card) => cards.filter((c) => c.id !== card.id && c.cat === card.cat);
const rest = (cards, card) => cards.filter((c) => c.id !== card.id && c.cat !== card.cat);
const answerWords = (cs) => cs.filter((c) => c.answer).map((c) => c.answer.split("|")[0].trim());

// Optionen für ein Lückenwort: die falschen Optionen der Karte, sonst Lösungen anderer Karten der Kategorie.
export function gapOptions(card, cards, answer = card.answer, rand = Math.random) {
  const sol = gapTarget(answer).text;
  const own = String(answer).split("|").map((a) => a.trim());
  const fits = card.answer && own.some((a) => card.answer.split("|").some((b) => norm(b) === norm(a)));
  return buildOptions(sol, [fits && card.wrong ? card.wrong : [], answerWords(sameCat(cards, card)), answerWords(rest(cards, card))], own, rand);
}

// Optionen für einen Ausdruck: Ausdrücke derselben Kategorie.
export function termOptions(card, cards, rand = Math.random) {
  return buildOptions(termTarget(card.term).text, [sameCat(cards, card).map((c) => c.term), rest(cards, card).map((c) => c.term)], card.alt || [], rand);
}

// Optionen für eine Lücke in einem Text. others: die Lösungen der anderen Lücken desselben Textes.
export function textGapOptions(card, cards, answer, others, rand = Math.random) {
  const sol = gapTarget(answer).text;
  const own = String(answer).split("|").map((a) => a.trim());
  const fits = card && card.answer && own.some((a) => card.answer.split("|").some((b) => norm(b) === norm(a)));
  const c = card || { id: "", cat: "" };
  return buildOptions(sol, [fits && card.wrong ? card.wrong : [], others, answerWords(sameCat(cards, c)), answerWords(rest(cards, c))], own, rand);
}

// Verrät ein eigener Hinweis die Lösung (Lösungswort oder Ausdruck als ganze Wörter)?
export function hintLeaks(card) {
  const hint = norm(card.hint || "").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
  if (!hint) return false;
  const hay = ` ${hint} `;
  const found = (s) => {
    const k = norm(s).replace(/[^\p{L}\p{N}']+/gu, " ").trim();
    return k.length >= 3 && hay.includes(` ${k} `);
  };
  return (card.answer ? card.answer.split("|").some(found) : false) || found(key(card.term || ""));
}
