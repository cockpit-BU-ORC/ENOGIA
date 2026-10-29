// v225 (demandé : « pour chaque page mettre un fond d'écran ») : un motif léger par page, dans le coin haut droit, à l'opacité
// des isothermes de la V223 (jeton T.contour). Peint en image de fond de <main> : il reste sous les cartes, sans clic ni effet
// sur l'empilement des fenêtres. Motifs tirés du métier : diagramme T-s du cycle ORC, tuyauterie (P&ID), isothermes,
// traces de banc d'essai, rotor de turbine.
import { T } from "./theme";

const W = 520, H = 420;
const fade = i => Math.max(0.25, 1 - i * 0.08).toFixed(2);

function iso() {
  return Array.from({ length: 10 }, (_, i) => {
    const r = 70 + i * 46, pts = [];
    for (let k = 0; k <= 48; k++) {
      const a = Math.PI / 2 + (k / 48) * Math.PI / 2;
      const w = r * (1 + 0.07 * Math.sin(3 * a + i * 0.7) + 0.04 * Math.sin(5 * a - i * 0.4));
      pts.push((W + w * Math.cos(a)).toFixed(1) + "," + (w * Math.sin(a) * 0.82).toFixed(1));
    }
    return `<path d="M${pts.join(" L")}" opacity="${fade(i)}"/>`;
  }).join("");
}
// Diagramme température-entropie : cloche de saturation, boucle du cycle (pompe, évaporateur, détente, condenseur)
const ts = () => `<g transform="translate(40,10) scale(1.6)"><path d="M40,220 V20 M40,220 H290" opacity=".55"/>
  <path d="M70,215 C110,60 170,40 200,45 C230,52 250,120 270,215"/><path d="M95,190 L100,120 L190,120 C205,120 215,100 230,95 L250,190 Z" stroke-width="1.5"/>
  <circle cx="100" cy="120" r="3"/><circle cx="230" cy="95" r="3"/><circle cx="250" cy="190" r="3"/><circle cx="95" cy="190" r="3"/></g>`;
// Tuyauterie : lignes, coudes, brides, vanne, pompe
const pid = () => `<g transform="translate(40,0) scale(1.6)" stroke-linecap="round"><path d="M20,30 H220 Q240,30 240,50 V200"/><path d="M60,60 H190 Q205,60 205,75 V150 Q205,165 220,165 H300" opacity=".8"/>
  <path d="M110,0 V20"/><path d="M110,95 H300" opacity=".7"/><path d="M90,26 V34 M96,26 V34"/><path d="M236,120 H244 M236,126 H244"/>
  <path d="M150,88 L165,102 M150,102 L165,88 M150,88 V102 M165,88 V102"/><circle cx="270" cy="95" r="9"/></g>`;
// Traces de banc d'essai : grille légère et trois courbes de mesure (montée en régime, palier, oscillation amortie)
function signal() {
  const g = [];
  for (let x = 120; x <= W; x += 50) g.push(`<path d="M${x},0 V300" opacity=".35"/>`);
  for (let y = 50; y <= 300; y += 50) g.push(`<path d="M120,${y} H${W}" opacity=".35"/>`);
  const curve = (f, op) => { const p = []; for (let x = 120; x <= W; x += 4) p.push(x + "," + f((x - 120) / (W - 120)).toFixed(1)); return `<path d="M${p.join(" L")}" opacity="${op}"/>`; };
  g.push(curve(t => 260 - 190 * (1 - Math.exp(-5 * t)), 1));
  g.push(curve(t => 200 - 60 * Math.exp(-3 * t) * Math.cos(18 * t), 0.75));
  g.push(curve(t => 120 + 30 * Math.sin(9 * t) * Math.exp(-1.5 * t) + 40 * t, 0.5));
  return g.join("");
}
// Rotor de turbine vu de face, coupé par le coin : moyeu, aubes courbes, carter
function rotor() {
  const b = [`<circle cx="${W}" cy="0" r="60"/>`, `<circle cx="${W}" cy="0" r="110"/>`, `<circle cx="${W}" cy="0" r="330"/>`, `<circle cx="${W}" cy="0" r="355" opacity=".5"/>`];
  for (let i = 0; i < 8; i++) b.push(`<path d="M${W},110 C${W - 50},180 ${W - 80},250 ${W - 80},335" transform="rotate(${i * 12} ${W} 0)" opacity="${fade(i)}"/>`);
  return b.join("");
}

const MOTIF = { iso, ts, pid, signal, rotor };
// Motif de chaque page
export const PAGE_MOTIF = { home: "ts", table: "pid", gantt: "signal", calendar: "iso", changes: "pid", comments: "iso", tests: "signal", planner: "iso", cashin: "ts", turbines: "rotor", manager: "rotor" };

const cache = {};
export function backdropStyle(view) {
  const m = PAGE_MOTIF[view]; if (!m) return {};
  const color = T.contour || T.line, key = m + color;
  if (!cache[key]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="${color}" stroke-width="1.2">${MOTIF[m]()}</g></svg>`;
    cache[key] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  return { backgroundImage: cache[key], backgroundRepeat: "no-repeat", backgroundPosition: "right top", backgroundSize: "min(620px, 75%) auto" };
}
