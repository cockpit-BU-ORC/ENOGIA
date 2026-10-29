// v225 (demandé : « pour chaque page mettre un fond d'écran ») : un motif léger par page, dans le coin haut droit, à l'opacité
// des isothermes de la V223 (jeton T.contour). Peint en image de fond de <main> : il reste sous les cartes, sans clic ni effet
// sur l'empilement des fenêtres.
// v233 (demandé : « trop présent », « j'aime les turbines ou le cycle de Mollier », « pas de texte », « papier millimétré même
// sur les tableaux ») : deux couches seulement — le papier millimétré sur toute la page et un seul motif sans texte, plus petit et
// plus pâle : diagramme T-s du cycle ORC, diagramme de Mollier (h-s) ou rotor de turbine. Les tableaux reçoivent une maille
// encore plus pâle (variable CSS --enogia-grid, règle dans styles.css).
import { T } from "./theme";

const W = 520, H = 420;
const fade = i => Math.max(0.25, 1 - i * 0.08).toFixed(2);

// Diagramme température-entropie : axes, cloche de saturation, boucle du cycle (pompe, évaporateur, détente, condenseur)
const ts = () => `<g transform="translate(40,10) scale(1.6)"><path d="M40,220 V20 M40,220 H290" opacity=".55"/>
  <path d="M70,215 C110,60 170,40 200,45 C230,52 250,120 270,215"/><path d="M95,190 L100,120 L190,120 C205,120 215,100 230,95 L250,190 Z" stroke-width="1.4"/>
  <circle cx="100" cy="120" r="3"/><circle cx="230" cy="95" r="3"/><circle cx="250" cy="190" r="3"/><circle cx="95" cy="190" r="3"/></g>`;
// Diagramme de Mollier (enthalpie-entropie) : axes, courbe de saturation, faisceau d'isobares et une détente dans la turbine
function hs() {
  const g = [`<path d="M60,400 V20 M60,400 H500" opacity=".55"/>`, `<path d="M90,380 C180,250 300,170 470,140" stroke-width="1.4"/>`];
  for (let i = 0; i < 6; i++) g.push(`<path d="M${110 + i * 40},400 C${170 + i * 45},300 ${250 + i * 40},120 ${330 + i * 35},${20 + i * 6}" opacity="${fade(i)}"/>`);
  g.push(`<path d="M300,90 L330,250" stroke-width="1.6"/><circle cx="300" cy="90" r="3.5"/><circle cx="330" cy="250" r="3.5"/>`);
  return g.join("");
}
// Rotor de turbine vu de face, coupé par le coin : moyeu, aubes courbes, carter
function rotor() {
  const b = [`<circle cx="${W}" cy="0" r="60"/>`, `<circle cx="${W}" cy="0" r="110"/>`, `<circle cx="${W}" cy="0" r="330"/>`, `<circle cx="${W}" cy="0" r="355" opacity=".5"/>`];
  for (let i = 0; i < 8; i++) b.push(`<path d="M${W},110 C${W - 50},180 ${W - 80},250 ${W - 80},335" transform="rotate(${i * 12} ${W} 0)" opacity="${fade(i)}"/>`);
  return b.join("");
}

const MOTIF = { ts, hs, rotor };
// Motif de chaque page
export const PAGE_MOTIF = { home: "ts", table: "hs", gantt: "rotor", calendar: "ts", changes: "hs", comments: "rotor", tests: "hs", planner: "ts", cashin: "ts", turbines: "rotor", manager: "hs", prodturb: "rotor" };

const cache = {};
const svg = (key, body, w, h, color) => {
  if (!cache[key]) cache[key] = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><g fill="none" stroke="${color}" stroke-width="1.2">${body()}</g></svg>`)}")`;
  return cache[key];
};
// papier millimétré : maille de 32 px, trait plus marqué tous les 160 px ; k = intensité
const grid = k => () => { const g = []; for (let i = 0; i < 160; i += 32) g.push(`<path d="M${i},0 V160 M0,${i} H160" opacity="${((i ? 0.22 : 0.45) * k).toFixed(2)}" stroke-width="${i ? 0.6 : 0.8}"/>`); return g.join(""); };

export function backdropStyle(view) {
  const m = PAGE_MOTIF[view]; if (!m) return {};
  const color = T.contour || T.line;
  return {
    backgroundImage: [svg(m + color, () => `<g opacity=".55">${MOTIF[m]()}</g>`, W, H, color), svg("grid" + color, grid(1), 160, 160, color)].join(", "),
    backgroundRepeat: "no-repeat, repeat",
    backgroundPosition: "right top, left top",
    backgroundSize: "min(520px, 55%) auto, 160px 160px",
    "--enogia-grid": svg("gridT" + color, grid(0.75), 160, 160, color),
  };
}
