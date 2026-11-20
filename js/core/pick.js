// Karten nach Lernstand gewichtet auswählen (Texte, Transfer, Aufträge für Claude).
import { categoryOf } from "./srs.js";

// Gewicht einer Karte: problematisch 5, in Arbeit 3, neu 1,5, gemeistert 1, fällig +2
export function cardWeight(p, day) {
  const k = categoryOf(p);
  let w = k === "problem" ? 5 : k === "developing" ? 3 : k === "new" ? 1.5 : 1;
  if (p && p.seen && p.due <= day) w += 2;
  return w;
}

// Zieht n Elemente ohne Zurücklegen; weight(x) bestimmt die Chance.
export function weightedSample(items, weight, n, rand = Math.random) {
  const pool = items.map((x) => ({ x, w: weight(x) }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = rand() * pool.reduce((s, e) => s + e.w, 0);
    let i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].x);
  }
  return out;
}

export const POOLS = [
  ["rec", "Empfohlen (schwache und fällige zuerst)"],
  ["dev", "Nur Developing und Problematic"],
  ["seen", "Nur schon geübte"],
  ["mast", "Nur Mastered (Auffrischen)"],
  ["all", "Zufällig aus allen"]
];

// Ausdrücke für Transfer-Aufgaben, wie in der Originalversion
export function pickExprs(cards, state, day, n, pool, rand = Math.random) {
  const p = (c) => state.progress[c.id];
  let list = cards.filter((c) => c.term);
  if (pool === "dev") list = list.filter((c) => ["developing", "problem"].includes(categoryOf(p(c))));
  else if (pool === "mast") list = list.filter((c) => categoryOf(p(c)) === "mastered");
  else if (pool === "seen") list = list.filter((c) => p(c) && p(c).seen);
  return weightedSample(list, (c) => (pool === "all" ? 1 : cardWeight(p(c), day)), n, rand);
}
