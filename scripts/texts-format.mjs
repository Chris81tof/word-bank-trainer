// Schreibt data/texts.json im Projektformat: zwei Leerzeichen Einzug, jede Lücke kompakt in einer Zeile.
import { writeFileSync } from "node:fs";

export function formatTexts(texts) {
  return JSON.stringify(texts, null, 2)
    .replace(/\[\s*\n\s*("(?:[^"\\]|\\.)*"),\s*\n\s*("(?:[^"\\]|\\.)*")\s*\n\s*\]/g, "[$1, $2]") + "\n";
}

export function saveTexts(texts, file = new URL("../data/texts.json", import.meta.url)) {
  writeFileSync(file, formatTexts(texts));
}
