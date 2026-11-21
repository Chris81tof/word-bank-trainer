// Lernstand (Format 2): nur Fortschritt je Karten-ID, eigene Karten, gelöschte IDs,
// importierte Texte, Entwürfe und Einstellungen. Die Karten aus data/ stehen nicht darin.
import { newProgress } from "./srs.js";

export const STORAGE_KEY = "word-bank-trainer-v2";
export const FORMAT = 2;

export const DEFAULT_PREFS = { budget: 40, newPerDay: 10, speak: true, voice: "", rate: 0.92 };

export function createState() {
  return { progress: {}, custom: [], deleted: [], fixes: {}, texts: [], textLog: {}, drafts: {}, prefs: { ...DEFAULT_PREFS } };
}

const num = (v, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

export function cleanProgress(p) {
  const out = newProgress();
  if (!isObj(p)) return out;
  for (const k of ["box", "due", "seen", "right", "wrong", "first", "last"]) out[k] = num(p[k]);
  if (isObj(p.ms)) {
    for (const [m, v] of Object.entries(p.ms)) {
      if (Array.isArray(v)) out.ms[m] = [num(v[0]), num(v[1])];
    }
  }
  return out;
}

// Korrektur einer Karte aus data/cards.json: nur die geänderten Felder. null, wenn nichts Gültiges darin steht.
export const FIX_FIELDS = ["cat", "term", "alt", "de", "prompt", "sentence", "answer", "note", "reg", "region", "level"];
export function cleanFix(f) {
  if (!isObj(f)) return null;
  const out = {};
  for (const k of FIX_FIELDS) {
    if (k === "alt") {
      if (Array.isArray(f.alt)) out.alt = f.alt.filter((a) => typeof a === "string" && a.trim());
    } else if (typeof f[k] === "string") out[k] = f[k];
  }
  return Object.keys(out).length ? out : null;
}

// Macht aus beliebigen (auch unvollständigen oder älteren) Daten einen gültigen Lernstand.
export function normalize(raw) {
  const s = createState();
  if (!isObj(raw)) return s;
  if (isObj(raw.progress)) {
    for (const [id, p] of Object.entries(raw.progress)) s.progress[id] = cleanProgress(p);
  }
  if (Array.isArray(raw.custom)) s.custom = raw.custom.filter((c) => isObj(c) && c.id && c.term);
  if (isObj(raw.fixes)) {
    for (const [id, f] of Object.entries(raw.fixes)) {
      const fix = cleanFix(f);
      if (fix) s.fixes[id] = fix;
    }
  }
  if (Array.isArray(raw.deleted)) s.deleted = raw.deleted.filter((id) => typeof id === "string");
  if (Array.isArray(raw.texts)) s.texts = raw.texts.filter((t) => isObj(t) && t.id && t.text && Array.isArray(t.gaps));
  if (isObj(raw.textLog)) {
    for (const [id, d] of Object.entries(raw.textLog)) if (typeof d === "number") s.textLog[id] = d;
  }
  if (isObj(raw.drafts)) s.drafts = raw.drafts;
  if (isObj(raw.prefs)) {
    const p = raw.prefs;
    s.prefs.budget = num(p.budget, DEFAULT_PREFS.budget);
    s.prefs.newPerDay = num(p.newPerDay, DEFAULT_PREFS.newPerDay);
    s.prefs.speak = typeof p.speak === "boolean" ? p.speak : DEFAULT_PREFS.speak;
    s.prefs.voice = typeof p.voice === "string" ? p.voice : "";
    s.prefs.rate = num(p.rate, DEFAULT_PREFS.rate);
  }
  return s;
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* beschädigt oder gesperrt: mit leerem Stand starten */ }
  return createState();
}

export function save(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Karte aus data/ mit ihrer Korrektur aus dem Gerätespeicher; „level“ gehört nicht zur Karte.
export function applyFix(card, fix) {
  if (!fix) return card;
  const out = { ...card };
  for (const [k, v] of Object.entries(fix)) {
    if (k === "level") continue;
    if (["alt", "note", "reg", "region"].includes(k) && (!v || !v.length)) delete out[k];
    else out[k] = v;
  }
  return out;
}

// Alle Karten, die gerade gelten: Grunddaten mit Korrekturen, ohne gelöschte, dazu eigene Karten.
// Korrekturen zu IDs, die es in der Kartendatei nicht (mehr) gibt, werden ignoriert.
export function allCards(base, state) {
  const gone = new Set(state.deleted);
  const fixes = state.fixes || {};
  return [...base.filter((c) => !gone.has(c.id)).map((c) => applyFix(c, fixes[c.id])), ...state.custom.filter((c) => !gone.has(c.id))];
}

// Fortschritt einer Karte; legt ihn bei Bedarf an.
export function progressOf(state, id) {
  return state.progress[id] || (state.progress[id] = newProgress());
}

// Nächste freie ID für eigene Karten (u01, u02 …). IDs werden nie wiederverwendet.
export function nextCustomId(base, state) {
  const used = new Set([...base, ...state.custom].map((c) => c.id));
  for (const id of state.deleted) used.add(id);
  let n = 1;
  while (used.has("u" + String(n).padStart(2, "0"))) n++;
  return "u" + String(n).padStart(2, "0");
}
