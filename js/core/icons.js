// Eigene Piktogramme im Wörterbuch-Stil: Linien in currentColor auf einem 24er-Raster,
// feine Schraffuren (0,75) wie im Kupferstich. Namen = Reiter, Übungsarten, Kategorien.

const fine = (d) => `<path d="${d}" stroke-width=".75"/>`;

const P = {
  // Reiter
  today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>' +
    fine("M10 13.5h4.3M10.6 15h3"),
  practice: '<path d="M20 4C13.5 4.5 8.5 9 7 16l3.5-.5C16 14 19.5 9.5 20 4Z"/><path d="M4 20 15.5 8.5"/>' +
    fine("M10.2 13.6l2.2.3M12.2 11.4l2.3.1M14.3 9.3l2.2-.1M16.4 7.2l1.8-.3"),
  transfer: '<path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3"/>',
  stats: '<path d="M3.5 20.5h17"/><rect x="5.5" y="13" width="3.2" height="7.5"/><rect x="10.4" y="7" width="3.2" height="13.5"/><rect x="15.3" y="10" width="3.2" height="10.5"/>' +
    fine("M11 10l2-2M11 13l2-2M11 16l2-2M11 19l2-2M15.9 13l2-2M15.9 16l2-2M15.9 19l2-2"),
  library: '<path d="M3 20.5h18"/><rect x="5" y="6" width="3.2" height="14.5"/><rect x="9.2" y="4" width="3.2" height="16.5"/><path d="M13.6 7.6l3-.9 3.8 13-3 .9Z"/>' +
    fine("M5 9h3.2M5 17h3.2M9.2 7h3.2M9.2 17.5h3.2"),

  edit: '<path d="M4.5 19.5l.9-4L16.2 4.7a2.1 2.1 0 0 1 3 3L8.4 18.6Z"/><path d="M14.5 6.5l3 3"/>' + fine("M6.2 15.6l2.2 2.2M5.4 19.5l1.5-.4"),
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/><circle cx="12" cy="12" r="6.5"/>',

  // Übungen
  meaning: '<circle cx="10.5" cy="10.5" r="5.8"/><path d="M14.7 14.7 20.5 20.5" stroke-width="2"/>' + fine("M8 8.8h5M8 10.8h5M8 12.8h3"),
  cards: '<path d="M7.5 8.5V4h13v10h-3"/><rect x="3.5" y="8.5" width="14" height="11.5" rx=".5"/>' + fine("M6.5 13h8M6.5 15.5h5"),
  explain: '<path d="M4 4.5h16v11.5h-8l-4.5 3.5V16H4Z"/>' + fine("M7.5 8.5h9M7.5 11h9M7.5 13.5h5"),
  choice: '<circle cx="5.8" cy="6.5" r="1.7"/><circle cx="5.8" cy="12" r="1.7"/><circle cx="5.8" cy="17.5" r="1.7"/><circle cx="5.8" cy="12" r=".5" fill="currentColor"/><path d="M10 6.5h10M10 12h10M10 17.5h10"/>',
  gap: '<path d="M3 12h4.5M17 12h4"/><rect x="9" y="9" width="6.5" height="6" rx=".5" stroke-dasharray="2 1.4"/>' + fine("M3 6.5h18M3 17.5h12"),
  translate: '<path d="M3 4h10v7.5H8L5 14v-2.5H3Z"/><path d="M11 13.5h10V20h-2v2.5L16 20h-5Z"/><path d="M15.5 5.5h2.5a2 2 0 0 1 2 2v2M18.5 8l1.5 1.5L21.5 8"/>' +
    fine("M5.5 7h5M5.5 9h3.5M13.5 16h5M13.5 18h3.5"),
  error: '<path d="M3 6.5h18M3 12h5.5M15.5 12h5.5M3 19h11"/><path d="M9 14.8l1.1-1 1.2 1 1.2-1 1.2 1 1.1-1" stroke-width="1.2"/>' + fine("M9.5 10.5h5M9.5 12h5"),
  rewrite: '<path d="M4 6h9M4 10h6M4 14h4"/><path d="M19.8 14.5A5 5 0 1 1 18 9"/><path d="M15.5 8.2 18.2 9l.4-2.8"/>' + fine("M4 18h7"),
  produce: '<path d="M12 2.8 17 9l-5 12-5-12Z"/><path d="M12 2.8v8.4"/><circle cx="12" cy="12.4" r="1.2"/>' + fine("M9.2 9.6 7.6 11M14.8 9.6l1.6 1.4"),
  cloze: '<rect x="3.5" y="3.5" width="17" height="17" rx=".5"/><path d="M6.5 7.5h11" stroke-width="2"/><rect x="13" y="11" width="4.5" height="4" stroke-dasharray="1.5 1"/>' +
    fine("M6.5 11h4.5M6.5 13h4.5M6.5 15h4.5M6.5 17.5h11"),
  passive: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10"/>',
  story: '<path d="M12 6.5C9.5 5 6.5 4.8 3 5.5v13c3.5-.7 6.5-.5 9 1 2.5-1.5 5.5-1.7 9-1v-13c-3.5-.7-6.5-.5-9 1Z"/><path d="M12 6.5v13"/>' +
    fine("M5.3 9c1.8-.3 3.4-.2 4.6.3M5.3 11.5c1.8-.3 3.4-.2 4.6.3M5.3 14c1.8-.3 3.4-.2 4.6.3M14.1 9.3c1.2-.5 2.8-.6 4.6-.3M14.1 11.8c1.2-.5 2.8-.6 4.6-.3"),
  speak: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>' + fine("M10.5 6.5h3M10.5 8.5h3M10.5 10.5h3"),
  write: '<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v4h4"/>' + fine("M9 11h7M9 13.5h7M9 16h7M9 18.5h4"),
  claude: '<rect x="5" y="4.5" width="14" height="16.5" rx="1"/><path d="M9 4.5V3.5h6v1M9 4.5v1.5h6V4.5"/>' + fine("M8 10h8M8 12.5h8M8 15h8M8 17.5h5"),

  // Kategorien
  phrasal: '<rect x="3" y="10" width="8.5" height="5.5" rx=".5"/><path d="M13.5 12.8h2.5a3 3 0 0 0 3-3V5M16.5 7.5 19 5l2.5 2.5"/>' + fine("M5 12.8h4.5"),
  collocation: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>' + fine("M11 9.2v5.6M12 8.3v7.4M13 9.2v5.6"),
  wordform: '<rect x="2.5" y="9" width="5" height="6" rx=".5"/><rect x="9" y="7.5" width="6" height="9" rx=".5"/><rect x="16.5" y="9" width="5" height="6" rx=".5"/>' +
    fine("M9.5 11l2-2.5M9.5 14l4.5-5.5M10.5 15.8l4-4.8M13.2 15.8l1.3-1.6"),
  idiom: '<path d="M4 4.5h16v11.5h-8l-4.5 3.5V16H4Z"/><path d="M12 7.3v5.4M9.7 8.6l4.6 2.8M14.3 8.6l-4.6 2.8"/>',
  prep: '<rect x="3" y="8" width="9" height="8" rx=".5"/><rect x="15.5" y="10" width="5.5" height="4" rx=".5"/><path d="M12 12h3.5"/>' + fine("M5 10.5h5M5 13.5h3.5"),
  entry: '<path d="M6 3.5h11.5v17H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M4.5 17.5A1.5 1.5 0 0 1 6 16h11.5"/>' + fine("M8 7.5h7M8 10h5")
};

export const ICONS = Object.keys(P);

export function icon(name, cls = "") {
  return `<svg class="picto${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.entry}</svg>`;
}

// Kategorie einer Karte → Piktogramm (auch für eigene Kategorien)
export function catIcon(cat) {
  const c = String(cat).toLowerCase();
  if (c.includes("preposition")) return "prep";
  if (c.includes("phrasal")) return "phrasal";
  if (c.includes("colloc")) return "collocation";
  if (c.includes("formation")) return "wordform";
  if (c.includes("idiom")) return "idiom";
  return "entry";
}
