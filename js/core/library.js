// Logik der Sammlung ohne Oberfläche: Filter, Suche, Nachladen in Abschnitten, Aufklappen.
import { norm } from "./match.js";
import { categoryOf } from "./srs.js";
import { CATS } from "./cards.js";

// So viele Karten werden auf einmal gezeichnet; der Rest lädt beim Scrollen nach.
export const PAGE = 50;

export const STAT_OPTS = [
  ["Lernstand", [["all", "Alle Lernstände"], ["new", "Neu"], ["developing", "Developing"], ["problem", "Problematic"], ["mastered", "Mastered"], ["due", "Heute fällig"]]],
  ["Einschätzung", [["core", "Vorschlag: sicher A1–B1"], ["edge", "Grenzfall B1/B2"], ["both", "Beides (zu leicht?)"], ["edited", "Bearbeitet"]]]
];
const STATS = STAT_OPTS.flatMap(([, items]) => items.map(([v]) => v));

// f: { q, cat, stat }. ctx: { progress, day, levelOf(card), isEdited(id) }
export function matches(card, f, ctx) {
  const q = norm(f.q || "");
  if (q && !norm([card.term, card.de, card.prompt, card.sentence].filter(Boolean).join(" ")).includes(q)) return false;
  if (f.cat && f.cat !== "all" && card.cat !== f.cat) return false;
  const s = STATS.includes(f.stat) ? f.stat : "all";
  if (s === "all") return true;
  const p = ctx.progress[card.id];
  if (s === "due") return !!(p && p.seen && p.due <= ctx.day);
  if (s === "edited") return ctx.isEdited(card.id);
  if (s === "core" || s === "edge") return ctx.levelOf(card) === s;
  if (s === "both") return !!ctx.levelOf(card);
  return categoryOf(p) === s;
}

export const filterCards = (cards, f, ctx) => cards.filter((c) => matches(c, f, ctx));

// Kategorien, die es gibt: erst die bekannten in fester Reihenfolge, dann eigene.
export function categoriesOf(cards) {
  const have = new Set(cards.map((c) => c.cat));
  return [...CATS.filter((c) => have.has(c)), ...[...have].filter((c) => !CATS.includes(c)).sort()];
}

// Kurzer Lernstand für die Zeile: „Neu“, „Stufe 2“, „Problematic“, „Mastered“
export function statusLabel(p) {
  const k = categoryOf(p);
  if (k === "new") return "Neu";
  if (k === "mastered") return "Mastered";
  if (k === "problem") return "Problematic";
  return `Stufe ${p.box}`;
}

// Wie viele Karten nach dem nächsten Nachladen sichtbar sind
export const nextShown = (shown, total) => Math.min(total, shown + PAGE);
// Wie viele Karten das Nachladen als Nächstes bringt
export const restCount = (shown, total) => Math.max(0, Math.min(PAGE, total - shown));

// Aufklappen mit höchstens einem offenen Eintrag (Werkzeuge, Karten): erneut antippen schließt.
export const toggleOne = (current, id) => (current === id ? "" : id);

export function toggleIn(set, id) {
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return set;
}
