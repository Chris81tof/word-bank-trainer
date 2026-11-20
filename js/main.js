// Start der App: Daten laden, Lernstand lesen, Reiter verwalten.
import { $, esc } from "./core/dom.js";
import { load, save, allCards } from "./core/state.js";
import { icon } from "./core/icons.js";
import * as todayView from "./views/today.js";
import * as practiceView from "./views/practice.js";
import * as transferView from "./views/transfer.js";

const TABS = [
  { id: "today", label: "Heute", view: todayView },
  { id: "practice", label: "Üben", view: practiceView },
  { id: "transfer", label: "Transfer", view: transferView },
  { id: "stats", label: "Statistik" },
  { id: "library", label: "Sammlung" }
];

function placeholder(root, tab) {
  root.innerHTML = `<h1 class="withicon">${icon(tab.id)}${esc(tab.label)}</h1><p class="hint">Dieser Bereich kommt in einem der nächsten Schritte.</p>`;
}

async function boot() {
  const view = $("view");
  let base;
  let baseTexts;
  try {
    [base, baseTexts] = await Promise.all(["data/cards.json", "data/texts.json"].map((f) => fetch(f).then((r) => r.json())));
  } catch {
    view.innerHTML = '<p class="msg err">Die Karten konnten nicht geladen werden.</p>';
    return;
  }

  const app = {
    base,
    baseTexts,
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
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    if (current && current !== tab) current.view?.leave?.();
    current = tab;
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
