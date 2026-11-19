// Sicherung exportieren und einlesen, im neuen (Format 2) und im alten Format (Format 1).
import { FORMAT, normalize, createState, cleanProgress } from "./state.js";
import { isoDate } from "./dates.js";

export const APP = "word-bank-trainer";

export function exportData(state, now = new Date()) {
  return { app: APP, format: FORMAT, exported: now.toISOString(), cards: Object.keys(state.progress).length, ...state };
}

export function backupName(now = new Date()) {
  return `${APP}-lernstand-${isoDate(now)}.json`;
}

// Alte Stufen 0 bis 3 (Abstände 1, 3, 7, danach 21 Tage) werden zu 0 bis 4:
// Alte Stufe 3 („Mastered“) wird neue Stufe 4, das Fälligkeitsdatum bleibt erhalten.
export function migrateOldBox(box) {
  return box >= 3 ? 4 : Math.max(0, box);
}

function fromV1(old, baseIds) {
  const s = createState();
  const cards = Array.isArray(old.cards) ? old.cards : [];
  for (const c of cards) {
    if (!c || !c.id || !c.term) continue;
    if (!baseIds.has(c.id)) {
      // Eigene Karte aus der alten App: Inhalt bleibt erhalten, Zusatzdaten fehlen.
      const { id, cat, term, de, prompt, sentence, answer, note, alt } = c;
      const own = { id, cat: cat || "Sonstiges", term, de: de || "", prompt: prompt || "", sentence: sentence || "", answer: answer || "" };
      if (note) own.note = note;
      if (alt) own.alt = String(alt).split("|");
      s.custom.push(own);
    }
    if (c.seen > 0 || c.box > 0 || c.right > 0 || c.wrong > 0) {
      const p = cleanProgress(c);
      p.box = migrateOldBox(p.box);
      s.progress[c.id] = p;
    }
  }
  const rest = normalize({ deleted: old.deleted, drafts: old.drafts, prefs: old.prefs });
  s.deleted = rest.deleted;
  s.drafts = rest.drafts;
  s.prefs = rest.prefs;
  return s;
}

// Liest eine Sicherung (Text). baseCards sind die Karten aus data/cards.json.
// Wirft einen Fehler mit deutscher Meldung, wenn die Datei nicht passt.
export function parseBackup(raw, baseCards) {
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    throw new Error("Das ist keine gültige Sicherung des Word Bank Trainers.");
  }
  if (!o || typeof o !== "object") throw new Error("Das ist keine gültige Sicherung des Word Bank Trainers.");
  // Sicherungen der alten App: { app, format: 1, state: { cards, … } }; zur Not auch nur das state-Objekt.
  const oldState = o.state && typeof o.state === "object" ? o.state : o;
  if (Array.isArray(oldState.cards) && o.format !== FORMAT) {
    if (!oldState.cards.length) throw new Error("Die Sicherung enthält keine Karten.");
    return fromV1(oldState, new Set(baseCards.map((c) => c.id)));
  }
  if (o.app === APP && o.format === FORMAT) return normalize(o);
  if (o.app === APP && typeof o.format === "number" && o.format > FORMAT) {
    throw new Error("Diese Sicherung stammt aus einer neueren Version der App.");
  }
  throw new Error("Das ist keine gültige Sicherung des Word Bank Trainers.");
}
