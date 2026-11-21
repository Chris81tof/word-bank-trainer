// Offline-Betrieb: alle ausgelieferten Dateien beim Installieren zwischenspeichern, danach aus dem Speicher liefern.
// Bei JEDER Änderung an einer dieser Dateien VERSION erhöhen, sonst bekommt das iPhone die neue Fassung nicht.
// tests/sw.test.mjs prüft, dass FILES genau zu den Dateien im Projekt passt.
const VERSION = "3";
const CACHE = "word-bank-trainer-" + VERSION;

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/tokens.css",
  "css/base.css",
  "css/components.css",
  "js/main.js",
  "js/core/art.js",
  "js/core/backup.js",
  "js/core/cards.js",
  "js/core/dates.js",
  "js/core/dom.js",
  "js/core/edit.js",
  "js/core/hints.js",
  "js/core/icons.js",
  "js/core/match.js",
  "js/core/modes.js",
  "js/core/pick.js",
  "js/core/plan.js",
  "js/core/prompts.js",
  "js/core/speech.js",
  "js/core/srs.js",
  "js/core/state.js",
  "js/core/stats.js",
  "js/core/texts.js",
  "js/exercises/cards.js",
  "js/exercises/choice.js",
  "js/exercises/cloze.js",
  "js/exercises/common.js",
  "js/exercises/error.js",
  "js/exercises/explain.js",
  "js/exercises/gap.js",
  "js/exercises/meaning.js",
  "js/exercises/produce.js",
  "js/exercises/rewrite.js",
  "js/exercises/translate.js",
  "js/views/editor.js",
  "js/views/library.js",
  "js/views/passive.js",
  "js/views/practice.js",
  "js/views/settings.js",
  "js/views/stats.js",
  "js/views/today.js",
  "js/views/transfer.js",
  "data/cards.json",
  "data/levels.json",
  "data/tasks.json",
  "data/texts.json",
  "fonts/SourceSerif4-latin.woff2",
  "fonts/SourceSerif4-Italic-latin.woff2",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" umgeht den HTTP-Cache, damit wirklich die neue Fassung gespeichert wird.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("word-bank-trainer-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
    )
  );
});
