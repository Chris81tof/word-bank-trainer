// Start der App: Daten laden, Lernstand lesen, Reiter verwalten.
import { $, esc } from "./core/dom.js";
import { load, save, allCards } from "./core/state.js";
import * as todayView from "./views/today.js";
import * as practiceView from "./views/practice.js";

const TABS = [
  { id: "today", label: "Heute", icon: "◉", view: todayView },
  { id: "practice", label: "Üben", icon: "✎", view: practiceView },
  { id: "transfer", label: "Transfer", icon: "⇄" },
  { id: "stats", label: "Statistik", icon: "▤" },
  { id: "library", label: "Sammlung", icon: "☰" }
];

function placeholder(root, tab) {
  root.innerHTML = `<h1>${esc(tab.label)}</h1><p class="hint">Dieser Bereich kommt in einem der nächsten Schritte.</p>`;
}

async function boot() {
  const view = $("view");
  let base;
  try {
    const res = await fetch("data/cards.json");
    base = await res.json();
  } catch {
    view.innerHTML = '<p class="msg err">Die Karten konnten nicht geladen werden.</p>';
    return;
  }

  const app = {
    base,
    state: load(localStorage),
    plan: null,
    cards: () => allCards(app.base, app.state),
    save: () => save(localStorage, app.state),
    invalidatePlan: () => { app.plan = null; },
    go: (id) => {
      if (location.hash !== "#" + id) location.hash = id;
      else show();
    }
  };

  const nav = $("tabs");
  nav.innerHTML = TABS.map((t) =>
    `<a href="#${t.id}" data-tab="${t.id}"><span class="ico" aria-hidden="true">${t.icon}</span><span>${esc(t.label)}</span></a>`
  ).join("");

  function show() {
    const id = location.hash.slice(1);
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    nav.querySelectorAll("a").forEach((a) => {
      if (a.dataset.tab === tab.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (tab.view) tab.view.render(view, app);
    else placeholder(view, tab);
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", show);
  document.addEventListener("keydown", practiceView.onKey);
  show();
}

boot();
