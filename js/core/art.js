// Illustrationen im Kupferstich-Stil: Umrisse, parallele Schraffur und Kreuzschraffur.
// Alles in currentColor (Tinte), nur das Lesebändchen in der Akzentfarbe.
// Flächen mit class="bg" decken in Papierfarbe ab (--art-bg).

const r = (n) => Math.round(n * 10) / 10;
const P = (p) => `${r(p[0])},${r(p[1])}`;
const poly = (pts) => "M" + pts.map(P).join("L");
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const quad = (p0, c, p1, t) => lerp(lerp(p0, c, t), lerp(c, p1, t), t);
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

function hatch(id, angle, gap, w = 0.5, color = "") {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${angle})"${color ? ` style="color:${color}"` : ""}>` +
    `<line x1="${gap / 2}" y1="0" x2="${gap / 2}" y2="${gap}" stroke="currentColor" stroke-width="${w}"/></pattern>`;
}

function svg(name, vb, defs, body) {
  return `<svg class="art art-${name}" viewBox="${vb}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><defs>${defs}</defs>${body}</svg>`;
}

// Schreibfeder von der Spitze (base) zum Ende der Fahne (tip); die rechte Fahne ist dichter schraffiert.
function quill(base, tip, width) {
  const d = [tip[0] - base[0], tip[1] - base[1]];
  const len = Math.hypot(d[0], d[1]);
  const n = [-d[1] / len, d[0] / len];
  const at = (t, off = 0) => [base[0] + d[0] * t + n[0] * off, base[1] + d[1] * t + n[1] * off];
  const t0 = 0.24;
  const w = (t, side) => {
    const s = (t - t0) / (1 - t0);
    if (s <= 0 || s >= 1) return 0;
    return side * width * Math.pow(Math.sin(Math.PI * s), 0.55) * (side > 0 ? 1 : 0.7) * (1 - 0.25 * s);
  };
  const ts = range(t0, 1, 30);
  const outline = poly([...ts.map((t) => at(t, w(t, 1))), ...ts.slice().reverse().map((t) => at(t, w(t, -1)))]) + "Z";
  let barbs = "";
  for (const [side, count] of [[1, 26], [-1, 40]]) {
    for (const t of range(t0 + 0.02, 0.96, count)) {
      const t2 = Math.min(1, t + 0.08);
      barbs += "M" + P(at(t)) + "L" + P(at(t2, w(t2, side) * 0.97));
    }
  }
  return `<path class="bg" d="${outline}" stroke="none"/><path d="${barbs}" stroke-width=".45"/><path d="${outline}" stroke-width=".7"/>` +
    `<path d="M${P(base)}L${P(at(t0))}" stroke-width="1.6"/><path d="M${P(at(t0))}L${P(at(0.99))}" stroke-width="1"/>`;
}

// Aufgeschlagenes Wörterbuch mit zweispaltigen Seiten, Feder und Lesebändchen
function book() {
  const W = 260;
  const L = (p) => p;
  const R = (p) => [W - p[0], p[1]];
  const sT = [130, 30], cT = [88, 14], oT = [34, 24];
  const sB = [130, 104], cB = [86, 88], oB = [30, 94];
  const edge = (a, c, b, t0, t1, n, f) => range(t0, t1, n).map((t) => f(quad(a, c, b, t)));

  const page = (f) => poly([...edge(sT, cT, oT, 0, 1, 24, f), ...edge(sB, cB, oB, 1, 0, 24, f)]) + "Z";
  const gutter = (f) => poly([...edge(sT, cT, oT, 0, 0.07, 4, f), ...edge(sB, cB, oB, 0.07, 0, 4, f)]) + "Z";
  const stack = (f) => [1, 2, 3].map((k) => poly(edge([130, 104 + k * 2.2], [86, 88 + k * 2.2], [30 - k * 0.7, 94 + k * 2.2], 0, 1, 20, f))).join("");
  const cover = (f) => poly([...edge([130, 113], [84, 97], [24, 102], 0, 1, 20, f), f([27, 94])]);

  // Textzeilen in zwei Spalten, einzelne Stichwörter fett am Zeilenanfang
  // (t läuft vom Bund nach außen; links beginnt die Zeile also außen).
  const rows = (f, left) => {
    let out = "";
    let heads = "";
    for (let i = 1; i <= 10; i++) {
      const k = i / 11;
      const p0 = lerp(sT, sB, k), c = lerp(cT, cB, k), p1 = lerp(oT, oB, k);
      let d = "";
      [[0.1, 0.5], [0.56, 0.92]].forEach(([a, b], col) => {
        d += poly(edge(p0, c, p1, a, b, 8, f));
        const h = left ? b - 0.08 : a;
        if ((i + col) % 3 === 1) heads += poly(edge(p0, c, p1, h, h + 0.08, 2, f));
      });
      out += `<path d="${d}" stroke-width=".55" stroke-dasharray="9 2 4 2 13 2 6 2" stroke-dashoffset="${(i * 7) % 23}"/>`;
    }
    return out + `<path d="${heads}" stroke-width="1.4"/>`;
  };

  const defs = hatch("bk-v", 12, 1.6) + hatch("bk-hz", 90, 2.2) + hatch("bk-r", 45, 1.6, 0.6, "var(--accent)");
  let body = '<ellipse cx="130" cy="117" rx="104" ry="6" fill="url(#bk-hz)" stroke="none"/>';
  body += '<path d="M128 112C127 119 135 121 133 128L136 125L139 129C140 120 132 118 133 112Z" fill="url(#bk-r)" style="stroke:var(--accent)" stroke-width=".8"/>';
  for (const f of [L, R]) {
    body += `<path d="${stack(f)}" stroke-width=".6"/><path d="${cover(f)}" stroke-width="1.1"/>` +
      `<path class="bg" d="${page(f)}" stroke="none"/><path d="${gutter(f)}" fill="url(#bk-v)" stroke="none"/>` +
      rows(f, f === L) + `<path d="${page(f)}" stroke-width="1"/>`;
  }
  body += '<path d="M130 30V104" stroke-width=".8"/>' + quill([150, 104], [238, 16], 10);
  return svg("book", "0 0 260 132", defs, body);
}

// Sanduhr mit gedrechselten Säulen: „für heute ist nichts mehr fällig“
function hourglass() {
  const glass = "M56 72C56 62 36 58 37 42C38 30 40 24 42 20L78 20C80 24 82 30 83 42C84 58 64 62 64 72" +
    "C64 82 84 86 83 102C82 114 80 120 78 124L42 124C40 120 38 114 37 102C36 86 56 82 56 72Z";
  const defs = hatch("hg-v", 0, 1.7) + hatch("hg-h", 90, 1.8) + hatch("hg-a", 45, 1.4) + hatch("hg-b", -45, 1.4) +
    `<clipPath id="hg-glass"><path d="${glass}"/></clipPath>`;
  const sandTop = "M40 58Q60 61 80 58L64 74L56 74Z";
  const sandBottom = "M36 124Q60 92 84 124Z";
  let body = '<ellipse cx="60" cy="143" rx="50" ry="4" fill="url(#hg-h)" stroke="none"/>';
  for (const x of [30, 90]) {
    body += `<rect class="bg" x="${x - 2.5}" y="20" width="5" height="104" stroke="none"/>` +
      `<rect x="${x}" y="20" width="2.5" height="104" fill="url(#hg-v)" stroke="none"/>` +
      `<rect x="${x - 2.5}" y="20" width="5" height="104" stroke-width=".8"/>` +
      `<ellipse class="bg" cx="${x}" cy="72" rx="4.5" ry="3" stroke-width=".8"/>` +
      `<ellipse cx="${x}" cy="72" rx="4.5" ry="3" fill="url(#hg-h)" stroke="none"/>` +
      `<ellipse class="bg" cx="${x}" cy="26" rx="3.8" ry="1.5" stroke-width=".7"/><ellipse class="bg" cx="${x}" cy="118" rx="3.8" ry="1.5" stroke-width=".7"/>`;
  }
  body += '<g clip-path="url(#hg-glass)">' +
    '<rect x="71" y="20" width="16" height="104" fill="url(#hg-v)" stroke="none"/>' +
    `<path class="bg" d="${sandTop}" stroke="none"/><path d="${sandTop}" fill="url(#hg-a)" stroke="none"/><path d="${sandTop}" fill="url(#hg-b)" stroke="none"/>` +
    `<path class="bg" d="${sandBottom}" stroke="none"/><path d="${sandBottom}" fill="url(#hg-a)" stroke="none"/><path d="${sandBottom}" fill="url(#hg-b)" stroke="none"/>` +
    '<path d="M45 58.6Q60 61 75 58.6M38 121Q60 93 82 121" stroke-width=".6"/></g>' +
    '<path d="M60 72V108" stroke-width=".7"/>' +
    `<path d="${glass}" stroke-width="1.1"/>` +
    '<path d="M41.5 30C40.5 38 41.5 46 46 53M41.5 114C40.5 108 41.5 100 45.5 94" stroke-width=".6"/>';
  for (const y of [8, 124]) {
    body += `<rect class="bg" x="18" y="${y}" width="84" height="12" rx="2" stroke="none"/>` +
      `<rect x="18" y="${y + 6}" width="84" height="6" fill="url(#hg-h)" stroke="none"/>` +
      `<rect x="18" y="${y}" width="84" height="12" rx="2" stroke-width="1"/><path d="M20 ${y + 6}H100" stroke-width=".6"/>`;
  }
  return svg("hourglass", "0 0 120 150", defs, body);
}

// Tintenfass mit Feder: „Runde geschafft“
function inkwell() {
  const pot = "M30 118C26 100 30 84 50 80L90 80C110 84 114 100 110 118Q70 126 30 118Z";
  const defs = hatch("iw-a", 30, 1.7) + hatch("iw-b", -35, 1.7) + hatch("iw-h", 90, 2.2) + hatch("iw-v", 0, 1.6) +
    `<clipPath id="iw-pot"><path d="${pot}"/></clipPath>`;
  let body = '<ellipse cx="72" cy="124" rx="58" ry="5" fill="url(#iw-h)" stroke="none"/>';
  body += `<path class="bg" d="${pot}" stroke="none"/>` +
    '<g clip-path="url(#iw-pot)"><rect x="86" y="78" width="30" height="50" fill="url(#iw-a)" stroke="none"/>' +
    '<rect x="98" y="78" width="20" height="50" fill="url(#iw-b)" stroke="none"/>' +
    '<rect x="24" y="78" width="10" height="50" fill="url(#iw-a)" stroke="none"/></g>' +
    `<path d="${pot}" stroke-width="1.1"/><path d="M50 80Q70 87 90 80" stroke-width=".8"/>` +
    '<path class="bg" d="M57 81V68H83V81Z" stroke="none"/><rect x="77" y="68" width="6" height="13" fill="url(#iw-v)" stroke="none"/>' +
    '<path d="M57 81V68M83 68V81" stroke-width="1"/>' +
    '<ellipse class="bg" cx="70" cy="68" rx="15" ry="4" stroke-width="1"/>' +
    '<ellipse cx="70" cy="68" rx="10" ry="2.4" fill="url(#iw-a)" stroke="none"/><ellipse cx="70" cy="68" rx="10" ry="2.4" fill="url(#iw-b)" stroke-width=".6"/>';
  body += quill([68, 68], [30, 2], 11);
  return svg("inkwell", "0 0 150 132", defs, body);
}

export const ART = { book: book(), hourglass: hourglass(), inkwell: inkwell() };
