// Vérifie le contraste (WCAG, texte normal ≥ 4,5:1) des couleurs de chaque thème, en clair et en sombre.
// Usage : node scripts/check-contrast.mjs        (code de sortie 1 s'il reste un échec)
import fs from "fs"; import path from "path"; import os from "os"; import { pathToFileURL } from "url";
const src = fs.readFileSync(new URL("../src/theme.js", import.meta.url), "utf8");
const tmp = path.join(os.tmpdir(), "enogia-theme-check.mjs"); fs.writeFileSync(tmp, src);
const { THEMES, buildPalette, setThemeMode, stagePalette, stageSoft, statusSoft, T } = await import(pathToFileURL(tmp).href);
// v141 : mode présentation = palette du thème + surcharge (setThemeMode mute T) ; on la contrôle comme les autres.
const palette = (id, dark, pres) => { if (!pres) return buildPalette(id, dark); setThemeMode(dark, id, true); const P = { ...T }; setThemeMode(dark, id, false); return P; };
const lum = hex => { const c = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
let fails = 0, n = 0; const rows = [];
for (const id of Object.keys(THEMES)) for (const dark of [false, true]) for (const pres of [false, true]) {
  const P = palette(id, dark, pres), tag = id + (dark ? " (sombre)" : " (clair)") + (pres ? " (présentation)" : "");
  const bgs = ["surface", "surfaceAlt", "card", "panel", "panelDim"];
  const pairs = [];
  for (const t of ["ink900", "ink700", "ink500", "ink300"]) for (const b of bgs) pairs.push([t, b]);
  for (const b of ["surface", "card", "teal100", "surfaceAlt"]) pairs.push(["teal600", b]);
  pairs.push(["accentInk", "card"], ["accentInk", "surface"], ["accentInk", "accentSoft"], ["accentInk", "surfaceAlt"]);
  for (const k of ["red", "amber", "emerald", "info", "violet", "ember"]) { pairs.push([k + "600", "card"], [k + "600", k + "100"], [k + "600", "surface"]); }
  pairs.push(["red500", "card"], ["red500", "red100"], ["red500", "surface"]);
  const fillW = ["teal500", "navy700", "redFill"]; // texte blanc posé sur une couleur pleine (boutons, pastilles)
  const check = (fg, bg, label, min = 4.5) => { n++; const r = ratio(fg, bg); if (r < min) { fails++; rows.push(tag + " : " + label + " = " + r.toFixed(2) + ":1 (min " + min + ")"); } };
  for (const [t, b] of pairs) check(P[t], P[b], t + " sur " + b);
  for (const f of fillW) check("#FFFFFF", P[f], "blanc sur " + f);
  check("#FFFFFF", P.info500, "blanc sur info500", dark ? 3 : 4.5); // info500 : barres et pastilles, jamais de petit texte blanc en sombre
  // v143 : couleurs d'étape (Calendrier) dérivées du thème
  if (pres) setThemeMode(dark, id, true); else setThemeMode(dark, id, false);
  for (const [k, v] of Object.entries(stagePalette())) { check(v.t, v.c, "étape " + k); if (dark) { check(v.c, P.card, "distinction fond/carte, étape " + k, 1.9); check(v.c, P.surface, "distinction fond/page, étape " + k, 1.9); } }
  for (const [k, v] of Object.entries(stageSoft())) { check(v.ink, v.bg, "étape douce " + k); check(T.ink900, v.bg, "date sur étape douce " + k); }
  for (const [k, v] of Object.entries(statusSoft())) { check(v.ink, v.bg, "statut doux " + k); check(T.ink900, v.bg, "texte courant sur statut doux " + k); }
  setThemeMode(false, id, false);
  // fond de pastille « Statut » : texte teal600 sur teal100 vérifié plus haut
}

// ── Palettes « catégories » (états, présence, phases du calendrier) : texte sur son fond de pastille, mêmes 4,5:1 ──
const grab = (file, re) => { const s = fs.readFileSync(new URL(file, import.meta.url), "utf8"); const out = []; let m; while ((m = re.exec(s))) out.push([m[1], m[2], m[0].slice(0, 60)]); return out; };
const cats = [
  ...grab("../src/pjMeta.js", /bg:"(#[0-9a-fA-F]{6})",text:"(#[0-9a-fA-F]{6})"/g).map(([bg, fg, l]) => [fg, bg, "état " + l]),
  ...grab("../src/pjMeta.js", /bg:"(#[0-9a-fA-F]{6})"[^}]*?ink:"(#[0-9a-fA-F]{6})"/g).map(([bg, fg, l]) => [fg, bg, "présence " + l]),
];
// v146.12 : en sombre, la pastille d'un état doit se détacher du fond de la carte (≥ 1,5:1)
const CARD_DARK = ["#27324A", "#242F29", "#312823"];
for (const [, bg, l] of grab("../src/pjMeta.js", /\{bg:"(#[0-9a-fA-F]{6})",text:"#[0-9a-fA-F]{6}",border:"(#[0-9a-fA-F]{6})",bar:"#[0-9a-fA-F]{6}"\},"/g).map(x => [0, x[0], x[2]])) for (const c of CARD_DARK) { n++; const r = ratio(bg, c); if (r < 1.5) { fails++; rows.push("sombre : fond d'état " + bg + " trop proche de la carte " + c + " = " + r.toFixed(2) + ":1"); } }
for (const [fg, bg, l] of cats) { n++; const r = ratio(fg, bg); if (r < 4.5) { fails++; rows.push("catégorie " + l + " : " + fg + " sur " + bg + " = " + r.toFixed(2) + ":1"); } }
console.log(rows.join("\n") || "OK");
console.log(n + " vérifications, " + fails + " échec(s)");
process.exit(fails ? 1 : 0);
