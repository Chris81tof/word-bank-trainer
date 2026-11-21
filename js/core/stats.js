// Zahlen für die Statistik, ohne Oberfläche.
import { categoryOf, isDue, MAX_BOX } from "./srs.js";

export function summarize(cards, progress, day) {
  const p = (c) => progress[c.id];
  const by = { new: 0, developing: 0, problem: 0, mastered: 0 };
  const boxes = Array(MAX_BOX + 1).fill(0);
  const cats = {};
  const modes = {};
  let due = 0;
  let dueNew = 0;
  let today = 0;
  let hinted = 0;
  let hintedCards = 0;
  const forecast = Array(7).fill(0);

  for (const c of cards) {
    const pc = p(c);
    const k = categoryOf(pc);
    by[k]++;
    if (pc && pc.seen) boxes[Math.min(MAX_BOX, pc.box)]++;
    const o = cats[c.cat] || (cats[c.cat] = { n: 0, mastered: 0, problem: 0 });
    o.n++;
    if (k === "mastered") o.mastered++;
    if (k === "problem") o.problem++;
    if (isDue(pc, day)) { due++; if (!pc || !pc.seen) dueNew++; }
    if (pc && pc.last === day) today++;
    if (pc && pc.hinted > 0) { hinted += pc.hinted; hintedCards++; }
    if (pc && pc.seen && pc.due > day && pc.due < day + 7) forecast[pc.due - day]++;
    for (const [m, [r, w]] of Object.entries((pc && pc.ms) || {})) {
      const x = modes[m] || (modes[m] = [0, 0]);
      x[0] += r;
      x[1] += w;
    }
  }
  forecast[0] = due;

  const problems = cards.filter((c) => categoryOf(p(c)) === "problem")
    .sort((a, b) => p(b).wrong - p(a).wrong).slice(0, 10)
    .map((c) => ({ c, right: p(c).right, wrong: p(c).wrong }));

  return { by, boxes, cats, modes, due, dueNew, today, forecast, problems, hinted, hintedCards };
}
