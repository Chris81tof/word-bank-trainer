// Kleine Helfer für die Oberfläche.

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
}

// In die Zwischenablage kopieren; Safari erlaubt das nur direkt nach einem Tippen.
export async function copyText(text, msgEl) {
  try {
    await navigator.clipboard.writeText(text);
    setMsg(msgEl, "Kopiert. Jetzt in Claude einfügen.", "ok");
  } catch {
    setMsg(msgEl, "Kopieren wurde blockiert. Markiere den Text im Feld und kopiere ihn von Hand.", "err");
  }
}

// Zweimal tippen zum Bestätigen (für Entfernen und Zurücksetzen)
export function armed(btn, label, action) {
  const plain = btn.textContent;
  btn.addEventListener("click", () => {
    if (btn.dataset.armed !== "1") {
      btn.dataset.armed = "1";
      btn.textContent = label;
      setTimeout(() => {
        if (btn.isConnected) { btn.dataset.armed = ""; btn.textContent = plain; }
      }, 4000);
      return;
    }
    action();
  });
}
