// Les logos ENOGIA sont désormais de vrais fichiers SVG dans /public (enogia-logo-white.svg, enogia-logo-color.svg)

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Palette ancrée sur le dégradé du logo ENOGIA (navy → teal) + un accent "braise"
// qui évoque le cycle thermique ORC (froid → chaud) pour les statuts urgents.
// Rendu plat et net (bordures fines + ombres discrètes). v182 : néomorphisme abandonné — les anciens jetons neu* sont renommés
// panel / panelDim (fonds de panneau), outline / outlineSoft (filets), insetSm / inset (filets intérieurs).
// l'objectif est un outil industriel qui ressemble à un vrai produit, pas à un tableur.


// ── Thèmes (v139) ───────────────────────────────────────────────────────────────────────────────────────────────
// Un thème = une famille de couleurs « marque » (teal* = couleur principale, navy* = fonds sombres de marque), des neutres teintés
// (page, cartes, filets), et UN SEUL accent décoratif (accent*), qui remplace l'ancien laiton. Les couleurs de SENS sont communes à tous les thèmes :
//   rouge = retard / risque · vert = conforme / avance · ambre = vigilance · bleu = information · orange braise = retard important.
// L'accent est choisi hors de ces teintes (sarcelle, magenta, violet, rose antique, vert-de-gris) pour ne jamais être pris pour un statut.
// Contrastes : texte ≥ 4,5:1 sur tous les fonds de chaque thème, clair et sombre (vérifié par scripts/check-contrast.mjs).

const SEMANTIC_LIGHT = {
  // v177 : nouvelle palette (Orange #F9A620, Forest Green #548C2F, Tomato #F95738, Sandy Brown #EE964B) ; les variantes « 600 » sont les encres lisibles.
  amber600:"#8A5700", amber500:"#F9A620", amber100:"#FDF0D5",
  emerald600:"#3B6620", emerald500:"#548C2F", emerald100:"#E6F0DF",
  violet600:"#6249A3", violet500:"#7C63B8", violet100:"#EEEAF8",
  // v281 : graphiques KPI — 3 séries catégorielles validées par le script du skill dataviz (CVD ΔE ≥ 9,2, clair et sombre) + dégradé de charge d'une seule teinte
  dv1:"#2a78d6", dv2:"#eb6834", dv3:"#1baf7a", dvSeq2:"#B9D3F3", dvSeq3:"#7FAEE6", dvSeq4:"#3E84D6", dvSeq5:"#1F5FAE",
  red600:"#A82F15", red500:"#B8331A", red100:"#FEE6DF", redFill:"#B8331A", onFill:"#FFFFFF", onInd:"#FFFFFF", fieldLine:"#7E8796", // v348 : bord des champs ≥ 3:1 (WCAG 1.4.11) // v344 (audit taste, lot 5) : texte sur aplat / sur la pastille active des sélecteurs
  // v177 : tomate assombrie pour rester lisible en texte (≥ 4,5:1) et sous texte blanc
  ember600:"#8E4A12", ember500:"#EE964B", ember100:"#FCEBDD",
  info600:"#2557B8", info500:"#3F72D6", info100:"#E6EEFC", // v139 : bleu = information (identique dans tous les thèmes)
  // v140 : TROIS niveaux d'élévation seulement (les anciens noms restent des alias).
  //   plat      = simple filet (boutons, champs, pastilles)
  //   carte     = filet + ombre douce (cadres, panneaux, lignes survolées)
  //   flottant  = ombre marquée (menus, fenêtres, tiroirs, sélecteurs)
  shadowFlat:"0 0 0 1px rgba(16,24,34,.07)",
  shadowCard:"0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)",
  shadowFloat:"0 16px 40px rgba(10,20,32,.14), 0 2px 8px rgba(10,20,32,.06)",
  shadowSm:"0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)",
  shadowMd:"0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)",
  shadowLg:"0 16px 40px rgba(10,20,32,.14), 0 2px 8px rgba(10,20,32,.06)",
  outlineSoft:"0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)",
  outline:"0 0 0 1px rgba(16,24,34,.07)",
  inset:"inset 0 0 0 1px rgba(16,24,34,.09)",
  insetSm:"inset 0 0 0 1px rgba(16,24,34,.08)",
};
const SEMANTIC_DARK = {
  amber600:"#FFD27A", amber500:"#F9A620", amber100:"#3A3020",
  emerald600:"#A8D68A", emerald500:"#7FB55A", emerald100:"#22331C",
  violet600:"#BBA9EE", violet500:"#8A72C8", violet100:"#312A50",
  dv1:"#3987e5", dv2:"#d95926", dv3:"#199e70", dvSeq2:"#294A7A", dvSeq3:"#2F64A8", dvSeq4:"#3E84D6", dvSeq5:"#7FAEE6",
  red600:"#FFAE9C", red500:"#FF957D", red100:"#432823", redFill:"#B83A20", onFill:"#FFFFFF", onInd:"#0B1130", fieldLine:"#6E727B",
  // v139 : red500 éclairci (texte rouge ≥ 4,5:1 sur les fonds sombres) ; redFill = fond plein sous texte blanc
  ember600:"#F5B888", ember500:"#EE964B", ember100:"#3D2D21",
  info600:"#A5BEEE", info500:"#6E93DC", info100:"#232F4A",
  // v141 : en sombre, le relief vient d'un filet clair (et du fond un peu plus clair des cartes), pas d'ombres noires.
  shadowFlat:"0 0 0 1px rgba(255,255,255,.09)",
  shadowCard:"0 0 0 1px rgba(255,255,255,.09)",
  shadowFloat:"0 0 0 1px rgba(255,255,255,.14), 0 12px 28px rgba(0,0,0,.32)",
  shadowSm:"0 0 0 1px rgba(255,255,255,.09)",
  shadowMd:"0 0 0 1px rgba(255,255,255,.09)",
  shadowLg:"0 0 0 1px rgba(255,255,255,.14), 0 12px 28px rgba(0,0,0,.32)",
  outlineSoft:"0 0 0 1px rgba(255,255,255,.09)",
  outline:"0 0 0 1px rgba(255,255,255,.09)",
  inset:"inset 0 0 0 1px rgba(255,255,255,.09)",
  insetSm:"inset 0 0 0 1px rgba(255,255,255,.08)",
};

const grad = (a,b,c) => ({
  thermalGradient:"linear-gradient(90deg,"+a+" 0%,"+b+" 60%,"+c+" 100%)",
  thermalGradientHot:"linear-gradient(90deg,"+a+" 0%,"+b+" 45%,#C9703F 100%)",
});

export const THEMES = {
  // ── Ardoise (v161, ex-Marine) : l'identité ENOGIA (RAL 5011 « bleu acier ») sur fond gris froid + accent sarcelle ──
  marine: { label:"ENOGIA", desc:"Clair : gris froid · sombre : ardoise dense", swatch:["#1D2C4E","#F3F5F8","#F4D35E"],
    light:{ ...grad("#0B1130","#1D2C4E","#46587F"),
      navy900:"#0B1130", navy800:"#131B49", navy700:"#1E2C66", navy600:"#2C3F8C",
      teal600:"#121B30", teal500:"#1D2C4E", teal400:"#4B5D85", teal100:"#E8EAF0",
      surface:"#F3F5F8", surfaceAlt:"#E9EDF3", card:"#FFFFFF",
      ink900:"#101828", ink700:"#344054", ink500:"#52607A", ink300:"#5B6880", ink100:"#E4E8EF",
      line:"#DDE2EA", panel:"#F1F3F7", panelDim:"#E7EAF0", contour:"#C7D2DE",
      accent:"#0A9DB5", accentInk:"#076477", accentSoft:"#D3F0F6" },
    dark:{ ...grad("#082440","#0D3B66","#4A6F92"),
      navy900:"#0B0C0D", navy800:"#C9D6E6", navy700:"#2E5A88", navy600:"#6F93BD",
      teal600:"#D0DCEB", teal500:"#4A73A3", teal400:"#9DB6D3", teal100:"#262A31",
      // v306 (maquette v306-navigation, choix « 2 » : Graphite — demandé : « le mode sombre est plus bleu que sombre ») : gris neutres sans teinte
      surface:"#111214", surfaceAlt:"#1F2125", card:"#191A1D",
      ink900:"#F2F3F5", ink700:"#D3D5DA", ink500:"#A3A7AF", ink300:"#979BA3", ink100:"#2A2C31",
      line:"#2A2C31", panel:"#1D1F22", panelDim:"#232529", contour:"#3A3D43",
      accent:"#F4D35E", accentInk:"#F7DE84", accentSoft:"#4A3E22" } }, // v197 (demandé : « garder un seul thème ») : clair d'Ardoise + sombre de Salle de contrôle};
};
export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = "marine"; // v197 : thème unique (clair d'Ardoise + sombre de Salle de contrôle)
// v173 : nouvelle clé de stockage du thème — l'ancienne (« enogia_theme ») était écrite pour tout le monde à chaque visite,
// donc changer le thème par défaut n'aurait touché personne. Chacun peut toujours repasser en Ardoise (Forêt et Cuivre retirés en v176).
export const THEME_KEY = "enogia_theme3"; // v185 : nouvelle clé pour que le nouveau thème par défaut s'applique à tous

// v173 : menu latéral « industriel » (fond marine, repère jaune) pour le thème Atelier ; les autres thèmes gardent leur menu clair.
export function navTokens(){
  // v197 : thème unique — en sombre, menu « Salle de contrôle » (ardoise très sombre, repère or) ; en clair, menu clair.
  if (T.mode === "dark") return { industrial:true, bg:"#0B0C0D", border:"#25272B", ink:"#C7CAD0", inkOn:"#FFFFFF", bgOn:"rgba(244,211,94,.14)", hover:"rgba(255,255,255,.07)", hoverInk:"#FFFFFF", group:"#F4D35E", mark:"#F4D35E" };
  if (T.themeId !== "atelier") return { // (le thème « atelier » n'existe plus depuis v183 : branche conservée pour Ardoise)
 industrial:false, bg:T.card, border:T.line, ink:T.ink500, inkOn:T.teal600, bgOn:T.teal100, hover:T.surface, hoverInk:T.ink900, group:T.ink500, mark:"currentColor" };
  const dark = T.mode === "dark";
  return { industrial:true, bg:dark?"#0B2440":"#0D3B66", border:dark?"#1E3A5A":"#0D3B66", ink:"#D6E2EE", inkOn:"#FFFFFF", bgOn:"rgba(244,211,94,.14)", hover:"rgba(255,255,255,.07)", hoverInk:"#FFFFFF", group:"#F4D35E", mark:"#F4D35E" };
}

// Polices et jetons non colorés, communs à tous les thèmes
const SHARED = {
  // Fraunces/Inter abandonnées : Roboto partout (demandé explicitement) ; un seul token « display » et un seul token « corps ».
  // v177 (choix de Gabriel, police A) : Cabinet Grotesk pour les titres et grands chiffres, Satoshi pour le texte.
  fontDisplay:"'Cabinet Grotesk','Satoshi',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  font:"'Satoshi',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontMono:"'JetBrains Mono','SF Mono',Consolas,monospace",
  fontLabel:"'Satoshi',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", // v286 (lot D, choix B) : étiquettes en Satoshi — IBM Plex Sans (V188) retirée, 3 familles
  // v162 : Montserrat abandonnée — une seule famille (Roboto) pour toute l'app ; le token reste pour compatibilité.
  fontMontserrat:"'Satoshi',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

export function buildPalette(themeId, dark){
  const th = THEMES[themeId] || THEMES[DEFAULT_THEME];
  return { ...SHARED, ...(dark ? SEMANTIC_DARK : SEMANTIC_LIGHT), ...(dark ? th.dark : th.light), mode: dark ? "dark" : "light", themeId: THEMES[themeId] ? themeId : DEFAULT_THEME };
}

// T est un objet MUTABLE (même référence tout le temps) : setThemeMode() modifie ses champs en place.
// Comme tous les composants lisent T.xxx à chaque rendu, un changement de darkMode dans App()
// (qui force un re-rendu global) suffit à propager les nouvelles couleurs partout, sans avoir
// à faire transiter le thème par props/contexte dans chaque fichier.

// ── Échelle typographique (v127) : sept tailles de texte, en pixels ──────────────────────────────────────────────
// xs  = petits libellés, légendes, étiquettes       sm = texte courant, cellules, boutons
// md  = texte de lecture, titres de bloc             lg = titres de page / de fiche
// xl  = grands chiffres                              xxl, hero = très grands chiffres
// Toute nouvelle taille doit être prise dans cette liste (FZ.xs, FZ.sm…) plutôt qu'écrite en dur.
// v140 : une seule grille. Rayons 4 / 8 / 12 / 16 (+ pastille 999) ; espacements en multiples de 4 (2 et 6 tolérés pour les micro-ajustements).
export const R = { xs: 4, sm: 8, md: 12, lg: 12, pill: 999 }; // v286 (rayons B) : 4 · 8 · 12 · pilule (lg = md)
export const SP = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };
// Mélange de deux couleurs #RRGGBB (t = part de b) → couleur opaque (zébrage, survol : une teinte opaque reste lisible sous une colonne collante).
export function mixHex(a, b, t) {
  const p = h => { h = String(h).replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export const FZ = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64 };
// v132 : même échelle, un cran plus petite, pour les fiches synthèse (fiche Manager et volet de droite) : plus d'informations à l'écran, moins de défilement.
export const FZF = { xs: 12, sm: 13, md: 14, lg: 16, xl: 24, xxl: 34, hero: 52 }; // v291 (lot H) : échelle 12 · 13 · 14 · 16 (avant 11 · 12,5 · 14,5 · 17)

export const T = buildPalette(DEFAULT_THEME,false);

// ── v141 : mode présentation (projection / réunion) : contraste maximal, filets francs, textes plus grands ─────────────────
// Surcharge de la palette du thème (clair ou sombre) : encres au maximum de contraste, filets et ombres plus marqués, statuts plus profonds
// (clair) ou plus lumineux (sombre). Les tailles de police sont agrandies par setPresentation().
const PRESENT_LIGHT = {
  ink900:"#000000", ink700:"#1A1D21", ink500:"#2E3338", ink300:"#434A52",
  teal600:"#0B1226", line:"#8A93A0",
  red600:"#8E1C1C", red500:"#A62222", amber600:"#744105", emerald600:"#0B6347", info600:"#1B47A0", ember600:"#8A4116", violet600:"#4F3790",
  shadowFlat:"0 0 0 1px rgba(0,0,0,.40)", shadowCard:"0 0 0 1px rgba(0,0,0,.40)", shadowSm:"0 0 0 1px rgba(0,0,0,.40)", shadowMd:"0 0 0 1px rgba(0,0,0,.40)", outlineSoft:"0 0 0 1px rgba(0,0,0,.40)", outline:"0 0 0 1px rgba(0,0,0,.40)",
  shadowFloat:"0 0 0 2px rgba(0,0,0,.55), 0 12px 28px rgba(0,0,0,.25)", shadowLg:"0 0 0 2px rgba(0,0,0,.55), 0 12px 28px rgba(0,0,0,.25)",
};
const PRESENT_DARK = {
  ink900:"#FFFFFF", ink700:"#F2F5F9", ink500:"#DCE2EA", ink300:"#C9D1DB",
  teal600:"#E6ECFA", line:"#7C8798",
  red600:"#FFB3B3", red500:"#FFA6A6", amber600:"#FFD487", emerald600:"#8FE8C3", info600:"#BFD3FF", ember600:"#FFC09A", violet600:"#D5C8FF",
  shadowFlat:"0 0 0 1px rgba(255,255,255,.35)", shadowCard:"0 0 0 1px rgba(255,255,255,.35)", shadowSm:"0 0 0 1px rgba(255,255,255,.35)", shadowMd:"0 0 0 1px rgba(255,255,255,.35)", outlineSoft:"0 0 0 1px rgba(255,255,255,.35)", outline:"0 0 0 1px rgba(255,255,255,.35)",
  shadowFloat:"0 0 0 2px rgba(255,255,255,.55), 0 12px 28px rgba(0,0,0,.4)", shadowLg:"0 0 0 2px rgba(255,255,255,.55), 0 12px 28px rgba(0,0,0,.4)",
};
const FZ_BASE = { ...FZ }, FZF_BASE = { ...FZF };
const PRESENT_SCALE = 1.15;

// setThemeMode(dark[, themeId[, present]]) : sans identifiant de thème on garde le thème courant ; present = mode présentation.
export function setThemeMode(dark, themeId, present){
  const pr = present === undefined ? !!T.present : !!present;
  const base = buildPalette(themeId || T.themeId, dark);
  Object.assign(T, base, pr ? (dark ? PRESENT_DARK : PRESENT_LIGHT) : {}, { present: pr });
  const k = pr ? PRESENT_SCALE : 1;
  for (const key of Object.keys(FZ_BASE)) { FZ[key] = Math.round(FZ_BASE[key] * k * 2) / 2; FZF[key] = Math.round(FZF_BASE[key] * k * 2) / 2; }
  // v263 (audit apple-design) : « contraste élevé » demandé par Windows ou le navigateur → filets et gris plus marqués
  try { if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) Object.assign(T, { line: T.ink300, ink500: T.ink700, ink300: T.ink500 }); } catch (e) { /* navigateur ancien */ }
}
export function isPresentation(){ return !!T.present; }

// ── v141 : densité d'affichage (confortable / compacte), lue par la liste, la fiche et le cadre principal ───────────────────
export const D = { mode: "comfortable", row: 52, cellY: 6, main: "20px 28px", gap: 16, frame: 16 };
export function setDensity(mode){
  const compact = mode === "compact";
  Object.assign(D, compact
    ? { mode: "compact", row: 40, cellY: 3, main: "12px 20px", gap: 8, frame: 12 }
    : { mode: "comfortable", row: 52, cellY: 6, main: "20px 28px", gap: 16, frame: 16 });
}
export function getThemeId(){ return T.themeId; }

export function isDarkMode(){
  return T.mode==="dark";
}

// ── Couleurs des étapes (Calendrier, Gantt, fiche) : une seule source ──
// v144.1 : une teinte pastel DISTINCTE par étape (lavande · bleu ciel · beurre · menthe · pêche), identique dans le Calendrier, le Gantt et la fiche.
// bg = fond de tuile, ring = liseré / anneau un cran plus soutenu, ink = texte foncé (clair) ou clair (sombre), tous ≥ 4,5:1 sur bg.
const STAGE_HUES = {
  // v162 : palette B « cinq teintes distinctes » (violet · bleu · cyan · émeraude · vert). Fond = 16 % de la couleur (clair), liseré = la couleur pleine ; en sombre, fond sombre teinté et liseré éclairci.
  // v177 : nouvelle palette — arrivée Light Blue #A8D5E2 · production Regal Navy #0D3B66 · tests Royal Gold #F4D35E · fin prod Forest Green #548C2F · départ Black Forest #104911.
  arrivee   : { light: { bg: "#E3F2F6", ring: "#A8D5E2", ink: "#1E5263", solid: "#A8D5E2" }, dark: { bg: "#3D5F69", ring: "#A8D5E2", ink: "#F5F7FC", solid: "#A8D5E2" } },
  production: { light: { bg: "#DCE6F0", ring: "#0D3B66", ink: "#0D3B66", solid: "#0D3B66" }, dark: { bg: "#34507A", ring: "#8FB0D6", ink: "#F5F7FC", solid: "#5A84B8" } },
  tests     : { light: { bg: "#FCF0BE", ring: "#F4D35E", ink: "#5C4600", solid: "#F4D35E" }, dark: { bg: "#6B5A1E", ring: "#F4D35E", ink: "#F5F7FC", solid: "#F4D35E" } },
  finProd   : { light: { bg: "#E2EEDA", ring: "#548C2F", ink: "#2E5418", solid: "#4A7D29" }, dark: { bg: "#3F6128", ring: "#8DC06A", ink: "#F5F7FC", solid: "#7FB55A" } },
  depart    : { light: { bg: "#D8E6D3", ring: "#104911", ink: "#104911", solid: "#104911" }, dark: { bg: "#2C4F2A", ring: "#7FB77A", ink: "#F5F7FC", solid: "#3E7A3A" } },
};
// « Payé » (Cash in) garde son vert : ce n'est pas une étape du Calendrier.
const PAID_HUE = { light: { bg: "#B4DDB9", ring: "#89BA91", ink: "#17321D" }, dark: { bg: "#376E4C", ring: "#6FB088", ink: "#FFFFFF" } };
// Le Gantt garde exactement ses teintes de la v146 (demande du 16/10 : ne pas y toucher) — valeurs figées, indépendantes de STAGE_HUES.
// v161 : le Gantt suit la même rampe que les autres vues (palette Ardoise).
const GANTT_HUES = {
  // v162 : marqueurs pleins (couleur de l'étape, lettre blanche ; en sombre couleur éclaircie, lettre foncée).
  arrivee   : { light: { bg: "#7C4DDB", ring: "#7C4DDB", ink: "#FFFFFF" }, dark: { bg: "#B094E9", ring: "#B094E9", ink: "#0B1020" } },
  production: { light: { bg: "#1D63E0", ring: "#1D63E0", ink: "#FFFFFF" }, dark: { bg: "#77A1EC", ring: "#77A1EC", ink: "#0B1020" } },
  tests     : { light: { bg: "#0B809C", ring: "#0B809C", ink: "#FFFFFF" }, dark: { bg: "#6DB9CB", ring: "#6DB9CB", ink: "#0B1020" } },
  finProd   : { light: { bg: "#0D8563", ring: "#0D8563", ink: "#FFFFFF" }, dark: { bg: "#6FC4AC", ring: "#6FC4AC", ink: "#0B1020" } },
  depart    : { light: { bg: "#3D8618", ring: "#3D8618", ink: "#FFFFFF" }, dark: { bg: "#94CB78", ring: "#94CB78", ink: "#0B1020" } },
};
export function ganttSoft() {
  const m = T.mode === "dark" ? "dark" : "light", o = {};
  for (const k of Object.keys(GANTT_HUES)) o[k] = GANTT_HUES[k][m];
  return o;
}
// v162 : liseré de couleur posé en haut d'un cadre (fond en couches : la bande suit l'arrondi du cadre, rien ne déborde).
export function stripeBg(color, base, h = 4) { return "linear-gradient(" + color + "," + color + ") top/100% " + h + "px no-repeat, " + base; }
// Couleurs « sémantiques » des liserés : attention, retard, mention, marque (clair / sombre).
export function stripeHues() {
  return T.mode === "dark" ? { warn: "#FFD27A", late: "#FF957D", note: "#E07BD0", brand: "#8FB0D6" } : { warn: "#F9A620", late: "#F95738", note: "#C026A3", brand: "#0D3B66" };
}
export function stageSoft() {
  const m = T.mode === "dark" ? "dark" : "light";
  const o = {}; for (const k of Object.keys(STAGE_HUES)) o[k] = STAGE_HUES[k][m];
  return o;
}
// ── Statuts des jalons de paiement (Cash in, fiches, rapports) ──────────────────────────────────────────────
// v146.1 : mêmes teintes poudrées que les étapes (palette Pantone B) + un rouge doux et un orange doux du même grain, utilisés
// seulement quand il faut : orange = à surveiller (relancé, échéance proche), rouge = en retard.
// Payé = Fin prod (vert sauge) · Facture émise = Production (bleu) · À facturer = Arrivée (violet) · À venir / EPC = gris neutre.
const ALERT_HUES = {
  red:    { light: { bg: "#F3D4D1", ring: "#DDA7A2", ink: "#7C2D29" }, dark: { bg: "#5A3A3C", ring: "#A86F6F", ink: "#F6CCC8" } },
  orange: { light: { bg: "#F7E0C6", ring: "#E5BC8C", ink: "#7A4510" }, dark: { bg: "#5B4631", ring: "#A98558", ink: "#F4D6B0" } },
  neutral:{ light: { bg: "#ECEAE6", ring: "#CFCBC4", ink: "#4F565E" }, dark: { bg: "#323C48", ring: "#566170", ink: "#C3CBD5" } },
  // v169 : mentions @ (pastille « Mention » de l'accueil), même grain que les autres teintes douces.
  note:   { light: { bg: "#F6DDF1", ring: "#C026A3", ink: "#6B1259" }, dark: { bg: "#553A52", ring: "#E07BD0", ink: "#F8D3F0" } },
};
// Rouge / orange / neutre doux (même grain que les étapes) — pour les états d'alerte partout dans l'appli.
// v168 : encre lisible posée sur une couleur pleine (pastille sélectionnée…) — blanc ou encre foncée, celle qui contraste le plus.
const relLum = hex => { const c = String(hex || "").replace("#", ""); if (c.length < 6) return 1; return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
export function inkOn(bg) { const L = relLum(bg), INK = "#101828"; return (1.05 / (L + .05)) >= ((L + .05) / (relLum(INK) + .05)) ? "#FFFFFF" : INK; }
export function alertSoft() { const m = T.mode === "dark" ? "dark" : "light"; return { red: ALERT_HUES.red[m], orange: ALERT_HUES.orange[m], neutral: ALERT_HUES.neutral[m], note: ALERT_HUES.note[m] }; }
export function statusSoft() {
  const m = T.mode === "dark" ? "dark" : "light", S = stageSoft();
  return {
    paid: PAID_HUE[m], invoiced: S.production, tobill: S.arrivee,
    chased: ALERT_HUES.orange[m], soon: ALERT_HUES.orange[m], warn: ALERT_HUES.orange[m], late: ALERT_HUES.red[m],
    future: ALERT_HUES.neutral[m], epc: ALERT_HUES.neutral[m],
  };
}
export function stagePalette() {
  const S = stageSoft();
  return {
    "Arrivée":    { c: S.arrivee.solid,    t: inkOn(S.arrivee.solid),    bold: true },
    "Production": { c: S.production.solid, t: inkOn(S.production.solid), bold: true },
    "Tests":      { c: S.tests.solid,      t: inkOn(S.tests.solid),      bold: true },
    "Fin prod":   { c: S.finProd.solid,    t: inkOn(S.finProd.solid),    bold: true },
    "Départ":     { c: S.depart.solid,     t: inkOn(S.depart.solid),     bold: true },
  };
}

// ── v286 (lot D du système de design, choix de Gabriel : rayons B, boutons, 3 polices, bulle maison) ──────────────────
// Rayons : petit 4 (plaques, barres, cases) · contrôle 8 (boutons, champs, menus, bulles) · cadre 12 (cartes, cadrans,
// fenêtres) · pilule (étiquettes, compteurs). Les fenêtres de 18 à 22 px (fiche d'un PJ) gardent le leur.
// jetons : R (plus haut) — xs 4, sm 8, md 12, pill.
// Bouton commun : variantes pri (action principale, une seule pleine par écran) · sec · ghost (discret) · dan (danger) ;
// tailles sm 28 px · md 34 px. Lu au rendu (T change en place avec le mode). Composant : Btn (SharedUI.js).
export function btn(variant = "sec", size = "md") {
  const sm = size === "sm";
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: R.sm, minHeight: sm ? 28 : 34, padding: sm ? "0 10px" : "0 14px",
    fontSize: sm ? 12.5 : 13.5, fontWeight: 600, fontFamily: T.font, cursor: "pointer", whiteSpace: "nowrap", border: "1px solid transparent", boxSizing: "border-box" };
  if (variant === "pri") return { ...base, background: T.ink900, color: T.card, borderColor: T.ink900 };
  if (variant === "ghost") return { ...base, background: "transparent", color: T.ink700 };
  if (variant === "dan") return { ...base, background: T.card, color: T.red500, borderColor: T.line };
  return { ...base, background: T.card, color: T.ink900, borderColor: T.line };
}
