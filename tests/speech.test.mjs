import { test } from "node:test";
import assert from "node:assert/strict";
import { rankVoices, bestVoice, qualityOf, voiceLabel, spokenTerm, spokenSentence } from "../js/core/speech.js";

const v = (name, lang, extra = {}) => ({ name, lang, voiceURI: "com.apple.voice." + name, localService: true, ...extra });

// Stimmen wie auf einem iPhone mit deutscher Systemsprache
const IPHONE = [
  v("Anna", "de-DE"),
  v("Samantha", "en-US"),
  v("Daniel", "en-GB"),
  v("Bubbles", "en-US"),
  v("Karen", "en-AU"),
  v("Ava (Premium)", "en-US", { voiceURI: "com.apple.voice.premium.en-US.Ava" }),
  v("Serena (Erweitert)", "en-GB", { voiceURI: "com.apple.voice.enhanced.en-GB.Serena" }),
  v("Rishi", "en-IN"),
  v("Zarvox", "en-US")
];

test("nur englische Stimmen, Spaßstimmen zuletzt", () => {
  const r = rankVoices(IPHONE).map((x) => x.name);
  assert.ok(!r.includes("Anna"));
  assert.deepEqual(r.slice(-2).sort(), ["Bubbles", "Zarvox"]);
});

test("Spaßstimmen auch mit deutschen Namen (macOS auf Deutsch)", () => {
  const mac = [v("Flüstern", "en-US"), v("Glocken", "en-US"), v("Seifenblasen", "en-US"), v("Eddy (Englisch (Vereinigtes Königreich))", "en-GB"), v("Tessa", "en-ZA"), v("Daniel", "en-GB")];
  assert.deepEqual(rankVoices(mac).slice(0, 2).map((x) => x.name), ["Daniel", "Tessa"]);
});

test("Premium und Erweitert zuerst, dabei britisch vor amerikanisch", () => {
  const r = rankVoices(IPHONE).map((x) => x.name);
  assert.deepEqual(r.slice(0, 2), ["Serena (Erweitert)", "Ava (Premium)"]);
});

test("ohne hochwertige Stimmen: bekannte gute Stimmen, britische zuerst", () => {
  const plain = IPHONE.filter((x) => qualityOf(x) === 0);
  const r = rankVoices(plain).map((x) => x.name);
  assert.deepEqual(r.slice(0, 3), ["Daniel", "Karen", "Samantha"]);
});

test("Chrome und Windows: Google- und Microsoft-Stimmen", () => {
  const list = [
    v("Google US English", "en-US", { localService: false }),
    v("Google UK English Female", "en-GB", { localService: false }),
    v("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB")
  ];
  assert.equal(rankVoices(list)[0].name, "Microsoft Sonia Online (Natural) - English (United Kingdom)");
  assert.equal(rankVoices(list.slice(0, 2))[0].name, "Google UK English Female");
});

test("gewählte Stimme hat Vorrang, fehlt sie, gilt die automatische Wahl", () => {
  assert.equal(bestVoice(IPHONE, "Karen").name, "Karen");
  assert.equal(bestVoice(IPHONE, "Gibt es nicht").name, "Serena (Erweitert)");
  assert.equal(bestVoice([v("Anna", "de-DE")], ""), null);
});

test("Anzeige und Vorlesetext", () => {
  assert.equal(voiceLabel(IPHONE[6]), "Serena · en-GB · Erweitert");
  assert.equal(spokenTerm({ term: "do s.o. out of sth." }), "do someone out of something");
  assert.equal(spokenTerm({ term: "take (great) pains" }), "take pains");
  assert.equal(spokenSentence({ sentence: "He was ____ off.", answer: "bunking|skiving" }), "He was bunking off.");
});
