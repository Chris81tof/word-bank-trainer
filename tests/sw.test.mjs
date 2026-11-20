// Prüft, dass sw.js genau die ausgelieferten Dateien zwischenspeichert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const sw = readFileSync(new URL("sw.js", root), "utf8");
const listed = JSON.parse("[" + sw.match(/const FILES = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, "") + "]");

function walk(dir, keep) {
  return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(dir + e.name + "/", keep) : keep(e.name) ? [dir + e.name] : []);
}

test("sw.js hat eine Versionsnummer", () => {
  assert.match(sw, /const VERSION = "\d+";/);
});

test("jede gelistete Datei existiert", () => {
  for (const f of listed) if (f !== "./") assert.ok(existsSync(new URL(f, root)), f);
});

test("jede ausgelieferte Datei ist gelistet", () => {
  const shipped = [
    "index.html", "manifest.webmanifest",
    ...walk("css/", (n) => n.endsWith(".css")),
    ...walk("js/", (n) => n.endsWith(".js")),
    ...walk("data/", (n) => n.endsWith(".json")),
    ...walk("fonts/", (n) => n.endsWith(".woff2")),
    ...walk("icons/", (n) => n.endsWith(".png"))
  ];
  const missing = shipped.filter((f) => !listed.includes(f));
  assert.deepEqual(missing, [], "in sw.js nachtragen");
  assert.ok(listed.includes("./"));
  assert.equal(new Set(listed).size, listed.length, "doppelte Einträge");
});

test("Manifest und index.html verweisen auf vorhandene Icons", () => {
  const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", root), "utf8"));
  for (const i of manifest.icons) assert.ok(listed.includes(i.src), i.src);
  const html = readFileSync(new URL("index.html", root), "utf8");
  for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) assert.ok(listed.includes(href), href);
});
