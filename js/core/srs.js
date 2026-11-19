// Wiederholung in 6 Stufen. Regeln siehe CLAUDE.md, Abschnitt „Lernlogik“.
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MAX_BOX = INTERVALS.length - 1;
export const MASTERED = 4;

// Höchste Stufe, die eine Übung erreichen kann. Nicht aufgeführte Übungen: MAX_BOX.
export const CAP = { meaning: 1, choice: 1, cards: 2, explain: 2 };
// Bei diesen Übungen fällt eine Karte nach einem Fehler nur um eine Stufe.
export const SOFT = new Set(["meaning", "choice"]);

export const STATUS = { new: "Neu", developing: "Developing", problem: "Problematic", mastered: "Mastered" };

export function newProgress() {
  return { box: 0, due: 0, seen: 0, right: 0, wrong: 0, first: 0, last: 0, ms: {} };
}

export function capOf(mode) {
  return CAP[mode] ?? MAX_BOX;
}

export function categoryOf(p) {
  if (!p || !p.seen) return "new";
  if (p.box >= MASTERED) return "mastered";
  if (p.wrong >= 2 && p.wrong >= p.right) return "problem";
  return "developing";
}

export function isDue(p, day) {
  return !p || !p.seen || p.due <= day;
}

// Ergebnis einer Aufgabe verbuchen. Verändert p und gibt es zurück.
export function record(p, ok, mode, day) {
  const was = p.box;
  if (!p.seen) p.first = day;
  p.seen += 1;
  p.last = day;
  const ms = p.ms[mode] || (p.ms[mode] = [0, 0]);
  if (ok) {
    ms[0] += 1;
    p.right += 1;
    const nb = Math.min(capOf(mode), was + 1, MAX_BOX);
    if (nb > was) {
      p.box = nb;
      p.due = day + INTERVALS[nb];
    } else {
      p.due = day + INTERVALS[Math.max(1, was)];
    }
  } else {
    ms[1] += 1;
    p.wrong += 1;
    p.box = SOFT.has(mode) ? Math.max(0, was - 1) : 0;
    p.due = day;
  }
  return p;
}
