// Prompt-Texte für Claude, wörtlich aus der Originalversion.

export function explainPrompt(c, text) {
  return "Part 1 · Deep Meaning & Nuance\nAusdruck: " + c.term + (c.de ? " (" + c.de + ")" : "") +
    "\n\nMeine Erklärung (Bedeutung, Konnotation, Register, Unterschied zu ähnlichen Ausdrücken):\n" +
    (text ? text : "[noch nichts geschrieben]") +
    "\n\nBitte bewerte meine Erklärung, ergänze, was fehlt (Konnotation, Register, typische Kollokationen, 2 ähnliche Ausdrücke mit Unterschied) und gib mir 2 Beispielsätze. Antworte auf Deutsch, Beispiele auf Englisch.";
}
