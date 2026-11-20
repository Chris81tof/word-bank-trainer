// Start der App: Daten laden, Lernstand lesen, Reiter verwalten.
import { $, esc } from "./core/dom.js";
import { load, save, allCards } from "./core/state.js";
import { icon } from "./core/icons.js";
import * as todayView from "./views/today.js";
import * as practiceView from "./views/practice.js";
import * as transferView from "./views/transfer.js";
import * as statsView from "./views/stats.js";
import * as libraryView from "./views/library.js";
import * as settingsView from "./views/settings.js";
import { initVoices } from "./core/speech.js";

const TABS = [
  { id: "today", label: "Heute", view: todayView },
  { id: "practice", label: "Üben", view: practiceView },
  { id: "transfer", label: "Transfer", view: transferView },
  { id: "stats", label: "Statistik", view: statsView },
  { id: "library", label: "Sammlung", view: libraryView }
];
// Seiten ohne eigenen Reiter
const PAGES = [{ id: "settings", view: settingsView }];

async function boot() {
  const view = $("view");
  let base;
  let baseTexts;
  let levels;
  try {
    [base, baseTexts, levels] = await Promise.all(["data/cards.json", "data/texts.json", "data/levels.json"].map((f) => fetch(f).then((r) => r.json())));
  } catch {
    view.innerHTML = '<p class="msg err">Die Karten konnten nicht geladen werden.</p>';
    return;
  }

  const app = {
    base,
    baseTexts,
    levels,
    state: load(localStorage),
    plan: null,
    cards: () => allCards(app.base, app.state),
    texts: () => [...app.baseTexts, ...app.state.texts],
    save: () => save(localStorage, app.state),
    invalidatePlan: () => { app.plan = null; },
    go: (id) => {
      if (location.hash !== "#" + id) location.hash = id;
      else show();
    }
  };

  const nav = $("tabs");
  nav.innerHTML = TABS.map((t) =>
    `<a href="#${t.id}" data-tab="${t.id}">${icon(t.id)}<span>${esc(t.label)}</span></a>`
  ).join("");

  let current = null;
  function show() {
    const id = location.hash.slice(1);
    const tab = [...TABS, ...PAGES].find((t) => t.id === id) || TABS[0];
    if (current && current !== tab) current.view?.leave?.();
    current = tab;
    nav.querySelectorAll("a").forEach((a) => {
      if (a.dataset.tab === tab.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    tab.view.render(view, app);
    window.scrollTo(0, 0);
  }

  initVoices();
  registerOffline();
  window.addEventListener("hashchange", show);
  document.addEventListener("keydown", practiceView.onKey);
  show();
}

// Offline-Betrieb über sw.js. Beim Entwickeln auf localhost nur mit ?sw, damit nichts Altes hängen bleibt.
function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  if (location.hostname === "localhost" && !new URLSearchParams(location.search).has("sw")) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(() => { /* ohne Offline-Betrieb weiter */ });
  // Eine neue Fassung ist installiert: Hinweis zum Neuladen (nicht beim allerersten Installieren).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || $("update")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div id="update" class="toast" role="status">Neue Version geladen. <button type="button" class="small primary">Neu laden</button></div>');
    $("update").querySelector("button").addEventListener("click", () => location.reload());
  });
}

boot();
