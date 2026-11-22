// Niveau-Einschätzung einer Karte: keine oder eine Stufe von A1 bis C2 (eigene Einschätzung, keine offizielle Einstufung).
// Startkarten tragen sie in data/levels.json ({ "kartenId": "B2" }), eigene Karten im Feld level, Korrekturen in fixes.

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Für C2 gelten Karten bis B1 als zu leicht.
export const EASY = ["A1", "A2", "B1"];

export const LEVEL_NONE = "Keine Einschätzung";
export const LEVEL_NAMES = { "": LEVEL_NONE, ...Object.fromEntries(LEVELS.map((l) => [l, l])) };
export const LEVEL_PICK = Object.fromEntries(LEVELS.map((l) => [l, l]));

// Frühere Werte: „sicher A1–B1“ (core) wurde B1, „Grenzfall B1/B2“ (edge) wurde B2.
const LEGACY = { core: "B1", edge: "B2" };

// Macht aus einem gespeicherten Wert (neu, früher oder ungültig) eine gültige Stufe oder "".
export const normLevel = (v) => (LEVELS.includes(v) ? v : LEGACY[v] || "");

// Niveau einer Startkarte laut levels.json
export const baseLevel = (levels, id) => (levels && Object.hasOwn(levels, id) ? normLevel(levels[id]) : "");
