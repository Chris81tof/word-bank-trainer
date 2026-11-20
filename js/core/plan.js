// Tagesplan: fällige und neue Karten auf Übungsarten verteilen, bis das Zeitbudget erreicht ist.
import { MODES, ORDER } from "./modes.js";
import { categoryOf, MASTERED } from "./srs.js";

const usable = (m, c, cards) => !!MODES[m] && MODES[m].need(c, cards);

// Passende Übungsart für eine Karte nach ihrem Lernstand
export function recMode(c, p, cards) {
  let m;
  if (!p || !p.seen) m = "meaning";
  else if (categoryOf(p) === "problem") m = p.ms.meaning && p.ms.meaning[0] > 0 ? "choice" : "meaning";
  else if (p.box <= 0) m = "choice";
  else if (p.box === 1) m = "gap";
  else if (p.box === 2) m = p.seen % 2 === 0 ? "translate" : "error";
  else m = p.seen % 2 === 0 ? "error" : "gap";
  return [m, "gap", "translate", "cards"].find((x) => usable(x, c, cards)) || "cards";
}

// Gemeisterte Karten werden angewendet (Stufe 5), sobald es diese Übungen gibt.
export function planMode(c, p, cards) {
  if (p && p.seen && p.box >= MASTERED) {
    const m = p.seen % 2 === 0 ? "rewrite" : "produce";
    if (usable(m, c, cards)) return m;
  }
  return recMode(c, p, cards);
}

export const planKey = (prefs) => prefs.budget + "|" + prefs.newPerDay;

export function buildPlan(cards, state, day) {
  const prog = (c) => state.progress[c.id];
  const newDone = cards.filter((c) => prog(c) && prog(c).seen && prog(c).first === day).length;
  let newLeft = Math.max(0, state.prefs.newPerDay - newDone);
  const cand = [];
  for (const c of cards) {
    const p = prog(c);
    if (!p || !p.seen) cand.push({ c, p, rank: 2, due: 0 });
    else if (p.due <= day) cand.push({ c, p, rank: categoryOf(p) === "problem" ? 0 : 1, due: p.due });
  }
  cand.sort((a, b) => a.rank - b.rank || a.due - b.due);
  let used = 0;
  let skippedNew = 0;
  const groups = {};
  for (const { c, p } of cand) {
    const isNew = !p || !p.seen;
    if (isNew && newLeft <= 0) { skippedNew++; continue; }
    const m = planMode(c, p, cards);
    const mins = MODES[m].est;
    if (used + mins > state.prefs.budget) continue;
    used += mins;
    if (isNew) newLeft--;
    (groups[m] || (groups[m] = [])).push(c.id);
  }
  const blocks = ORDER.filter((m) => groups[m]).map((m) => ({
    mode: m, ids: groups[m], mins: Math.max(1, Math.round(groups[m].length * MODES[m].est))
  }));
  return { day, key: planKey(state.prefs), blocks, used: Math.round(used), pool: cand.length, skippedNew };
}
