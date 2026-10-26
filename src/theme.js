// Les logos ENOGIA sont désormais de vrais fichiers SVG dans /public (enogia-logo-white.svg, enogia-logo-color.svg)

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Palette ancrée sur le dégradé du logo ENOGIA (navy → teal) + un accent "braise"
// qui évoque le cycle thermique ORC (froid → chaud) pour les statuts urgents.
// Rendu plat et net (bordures fines + ombres discrètes) plutôt que néomorphisme :
// l'objectif est un outil industriel qui ressemble à un vrai produit, pas à un tableur.


// ── Thèmes (v139) ───────────────────────────────────────────────────────────────────────────────────────────────
// Un thème = une famille de couleurs « marque » (teal* = couleur principale, navy* = fonds sombres de marque), des neutres teintés
// (page, cartes, filets), et UN SEUL accent décoratif (accent*), qui remplace l'ancien laiton. Les couleurs de SENS sont communes à tous les thèmes :
//   rouge = retard / risque · vert = conforme / avance · ambre = vigilance · bleu = information · orange braise = retard important.
// L'accent est choisi hors de ces teintes (sarcelle, magenta, violet, rose antique, vert-de-gris) pour ne jamais être pris pour un statut.
// Contrastes : texte ≥ 4,5:1 sur tous les fonds de chaque thème, clair et sombre (vérifié par scripts/check-contrast.mjs).

const SEMANTIC_LIGHT = {
  amber600:"#9A5B10", amber500:"#C1831E", amber100:"#F8EEDD",
  emerald600:"#157A5E", emerald500:"#2B9C78", emerald100:"#E4F3EC",
  violet600:"#6249A3", violet500:"#7C63B8", violet100:"#EEEAF8",
  red600:"#AE3434", red500:"#BE3A3A", red100:"#FBEAEA", redFill:"#BE3A3A", // v127 : red500 ≥ 4,9:1 (texte rouge lisible), texte blanc dessus 5,7:1
  ember600:"#9E5226", ember500:"#DB6B2C", ember100:"#F9EAE0",
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
  neuOut:"0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)",
  neuOutSm:"0 0 0 1px rgba(16,24,34,.07)",
  neuIn:"inset 0 0 0 1px rgba(16,24,34,.09)",
  neuInSm:"inset 0 0 0 1px rgba(16,24,34,.08)",
};
const SEMANTIC_DARK = {
  amber600:"#DDB878", amber500:"#C8A054", amber100:"#373022",
  emerald600:"#7FCFB0", emerald500:"#4BA98A", emerald100:"#1F3731",
  violet600:"#BBA9EE", violet500:"#8A72C8", violet100:"#312A50",
  red600:"#E8A3A3", red500:"#E39595", red100:"#3E2A2D", redFill:"#B24848", // v139 : red500 éclairci (texte rouge ≥ 4,5:1 sur les fonds sombres) ; redFill = fond plein sous texte blanc
  ember600:"#E0AA85", ember500:"#D4875A", ember100:"#3C2D25",
  info600:"#A5BEEE", info500:"#6E93DC", info100:"#232F4A",
  // v141 : en sombre, le relief vient d'un filet clair (et du fond un peu plus clair des cartes), pas d'ombres noires.
  shadowFlat:"0 0 0 1px rgba(255,255,255,.09)",
  shadowCard:"0 0 0 1px rgba(255,255,255,.09)",
  shadowFloat:"0 0 0 1px rgba(255,255,255,.14), 0 12px 28px rgba(0,0,0,.32)",
  shadowSm:"0 0 0 1px rgba(255,255,255,.09)",
  shadowMd:"0 0 0 1px rgba(255,255,255,.09)",
  shadowLg:"0 0 0 1px rgba(255,255,255,.14), 0 12px 28px rgba(0,0,0,.32)",
  neuOut:"0 0 0 1px rgba(255,255,255,.09)",
  neuOutSm:"0 0 0 1px rgba(255,255,255,.09)",
  neuIn:"inset 0 0 0 1px rgba(255,255,255,.09)",
  neuInSm:"inset 0 0 0 1px rgba(255,255,255,.08)",
};

const grad = (a,b,c) => ({
  thermalGradient:"linear-gradient(90deg,"+a+" 0%,"+b+" 60%,"+c+" 100%)",
  thermalGradientHot:"linear-gradient(90deg,"+a+" 0%,"+b+" 45%,#C9703F 100%)",
});

export const THEMES = {
  // ── Ardoise (v161, ex-Marine) : l'identité ENOGIA (RAL 5011 « bleu acier ») sur fond gris froid + accent sarcelle ──
  marine: { label:"Ardoise", desc:"Bleu acier, fond gris froid", swatch:["#1D2C4E","#F3F5F8","#0A9DB5"],
    light:{ ...grad("#0B1130","#1D2C4E","#46587F"),
      navy900:"#0B1130", navy800:"#131B49", navy700:"#1E2C66", navy600:"#2C3F8C",
      teal600:"#121B30", teal500:"#1D2C4E", teal400:"#4B5D85", teal100:"#E8EAF0",
      surface:"#F3F5F8", surfaceAlt:"#E9EDF3", card:"#FFFFFF",
      ink900:"#101828", ink700:"#344054", ink500:"#52607A", ink300:"#5B6880", ink100:"#E4E8EF",
      line:"#DDE2EA", neuPanel:"#F1F3F7", neuPanelDim:"#E7EAF0",
      accent:"#0A9DB5", accentInk:"#076477", accentSoft:"#D3F0F6" },
    dark:{ ...grad("#0B1130","#1D2C4E","#46587F"),
      navy900:"#0B1130", navy800:"#C9D3F0", navy700:"#3B4F94", navy600:"#6F86CC",
      teal600:"#C6D0EE", teal500:"#5C73B8", teal400:"#9AABDC", teal100:"#33406A",
      surface:"#1C2536", surfaceAlt:"#2A3550", card:"#27324A",
      ink900:"#EEF2F9", ink700:"#CDD6E6", ink500:"#B5C1D6", ink300:"#AAB7CF", ink100:"#3C4A68",
      line:"#3C4A68", neuPanel:"#2B3650", neuPanelDim:"#33405E",
      accent:"#2FD0E6", accentInk:"#7FE0EE", accentSoft:"#1F4A57" } },
  // ── Forêt : vert foncé ──
  foret: { label:"Forêt", desc:"Vert foncé, fond sauge très clair", swatch:["#1B6B48","#EFF6F0","#D6336C"],
    light:{ ...grad("#0A1F17","#17402F","#5A8473"),
      navy900:"#08241A", navy800:"#0F3F2B", navy700:"#1B6B48", navy600:"#2E8A63",
      teal600:"#0C3A27", teal500:"#1B6B48", teal400:"#4F9473", teal100:"#DAEEE2",
      surface:"#EFF6F0", surfaceAlt:"#DFEDE1", card:"#FFFFFF",
      ink900:"#131A16", ink700:"#38433D", ink500:"#55615A", ink300:"#5F6B63", ink100:"#E4E9E3",
      line:"#C6DBC9", neuPanel:"#E9F2EA", neuPanelDim:"#DDEBDF",
      accent:"#D6336C", accentInk:"#A8214F", accentSoft:"#FBDFE8" },
    dark:{ ...grad("#0A1F17","#17402F","#5A8473"),
      navy900:"#0A1F17", navy800:"#CBE5D8", navy700:"#2F6B54", navy600:"#6FB296",
      teal600:"#C2E8D4", teal500:"#357D5D", teal400:"#86C9A8", teal100:"#1F4231",
      surface:"#1C2621", surfaceAlt:"#2B382F", card:"#242F29",
      ink900:"#E8EFEA", ink700:"#C2CEC6", ink500:"#B0BCB4", ink300:"#9EAAA2", ink100:"#33413A",
      line:"#384639", neuPanel:"#2C382F", neuPanelDim:"#333F37",
      accent:"#F0608F", accentInk:"#F7A6C0", accentSoft:"#4B2233" } },
  // ── Cuivre : marron chaud, fond sable ──
  cuivre: { label:"Cuivre", desc:"Marron chaud, fond sable", swatch:["#7A4526","#FAF2E8","#0F9D94"],
    light:{ ...grad("#24150E","#43291C","#8C6A58"),
      navy900:"#2A1409", navy800:"#47260F", navy700:"#7A4526", navy600:"#9C5E38",
      teal600:"#44230F", teal500:"#7A4526", teal400:"#A8744F", teal100:"#F3E4D8",
      surface:"#FAF2E8", surfaceAlt:"#F1E2CF", card:"#FFFFFF",
      ink900:"#1D1713", ink700:"#473B33", ink500:"#655850", ink300:"#6D6056", ink100:"#EBE3DB",
      line:"#E2CBAF", neuPanel:"#F5ECE0", neuPanelDim:"#ECDECC",
      accent:"#0F9D94", accentInk:"#0A6B65", accentSoft:"#D3F0ED" },
    dark:{ ...grad("#24150E","#43291C","#8C6A58"),
      navy900:"#24150E", navy800:"#EBD3C5", navy700:"#8A5E48", navy600:"#BD9078",
      teal600:"#F0D3BF", teal500:"#9A6446", teal400:"#D9A988", teal100:"#4A3022",
      surface:"#28211D", surfaceAlt:"#3A302A", card:"#312823",
      ink900:"#F1EAE5", ink700:"#D0C4BB", ink500:"#BDB0A6", ink300:"#AFA399", ink100:"#42372F",
      line:"#483B33", neuPanel:"#3A3029", neuPanelDim:"#42372F",
      accent:"#2FD3C8", accentInk:"#8DE4DD", accentSoft:"#133F3C" } },
};
export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = "marine";

// Polices et jetons non colorés, communs à tous les thèmes
const SHARED = {
  // Fraunces/Inter abandonnées : Roboto partout (demandé explicitement) ; un seul token « display » et un seul token « corps ».
  fontDisplay:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  font:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontMono:"'JetBrains Mono','SF Mono',Consolas,monospace",
  // v162 : Montserrat abandonnée — une seule famille (Roboto) pour toute l'app ; le token reste pour compatibilité.
  fontMontserrat:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
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
export const R = { xs: 4, sm: 8, md: 12, lg: 16, pill: 999 };
export const SP = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };
// Mélange de deux couleurs #RRGGBB (t = part de b) → couleur opaque (zébrage, survol : une teinte opaque reste lisible sous une colonne collante).
export function mixHex(a, b, t) {
  const p = h => { h = String(h).replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export const FZ = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, hero: 64 };
// v132 : même échelle, un cran plus petite, pour les fiches synthèse (fiche Manager et volet de droite) : plus d'informations à l'écran, moins de défilement.
export const FZF = { xs: 11, sm: 12.5, md: 14.5, lg: 17, xl: 24, xxl: 34, hero: 52 };

export const T = buildPalette(DEFAULT_THEME,false);

// ── v141 : mode présentation (projection / réunion) : contraste maximal, filets francs, textes plus grands ─────────────────
// Surcharge de la palette du thème (clair ou sombre) : encres au maximum de contraste, filets et ombres plus marqués, statuts plus profonds
// (clair) ou plus lumineux (sombre). Les tailles de police sont agrandies par setPresentation().
const PRESENT_LIGHT = {
  ink900:"#000000", ink700:"#1A1D21", ink500:"#2E3338", ink300:"#434A52",
  teal600:"#0B1226", line:"#8A93A0",
  red600:"#8E1C1C", red500:"#A62222", amber600:"#744105", emerald600:"#0B6347", info600:"#1B47A0", ember600:"#8A4116", violet600:"#4F3790",
  shadowFlat:"0 0 0 1px rgba(0,0,0,.40)", shadowCard:"0 0 0 1px rgba(0,0,0,.40)", shadowSm:"0 0 0 1px rgba(0,0,0,.40)", shadowMd:"0 0 0 1px rgba(0,0,0,.40)", neuOut:"0 0 0 1px rgba(0,0,0,.40)", neuOutSm:"0 0 0 1px rgba(0,0,0,.40)",
  shadowFloat:"0 0 0 2px rgba(0,0,0,.55), 0 12px 28px rgba(0,0,0,.25)", shadowLg:"0 0 0 2px rgba(0,0,0,.55), 0 12px 28px rgba(0,0,0,.25)",
};
const PRESENT_DARK = {
  ink900:"#FFFFFF", ink700:"#F2F5F9", ink500:"#DCE2EA", ink300:"#C9D1DB",
  teal600:"#E6ECFA", line:"#7C8798",
  red600:"#FFB3B3", red500:"#FFA6A6", amber600:"#FFD487", emerald600:"#8FE8C3", info600:"#BFD3FF", ember600:"#FFC09A", violet600:"#D5C8FF",
  shadowFlat:"0 0 0 1px rgba(255,255,255,.35)", shadowCard:"0 0 0 1px rgba(255,255,255,.35)", shadowSm:"0 0 0 1px rgba(255,255,255,.35)", shadowMd:"0 0 0 1px rgba(255,255,255,.35)", neuOut:"0 0 0 1px rgba(255,255,255,.35)", neuOutSm:"0 0 0 1px rgba(255,255,255,.35)",
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
  arrivee   : { light: { bg: "#EAE3F9", ring: "#7C4DDB", ink: "#2A1A4A" }, dark: { bg: "#686195", ring: "#B094E9", ink: "#F5F7FC" } },
  production: { light: { bg: "#DBE6FA", ring: "#1D63E0", ink: "#0A224C" }, dark: { bg: "#4D6797", ring: "#77A1EC", ink: "#F5F7FC" } },
  tests     : { light: { bg: "#D8ECF1", ring: "#0C8AA8", ink: "#042F39" }, dark: { bg: "#456C81", ring: "#6DB9CB", ink: "#F5F7FC" } },
  finProd   : { light: { bg: "#D9EFE9", ring: "#0F9D74", ink: "#053527" }, dark: { bg: "#446E72", ring: "#6FC4AC", ink: "#F5F7FC" } },
  depart    : { light: { bg: "#E2F1DB", ring: "#4CA81E", ink: "#1A390A" }, dark: { bg: "#516E5C", ring: "#94CB78", ink: "#F5F7FC" } },
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
  return T.mode === "dark" ? { warn: "#F0B35A", late: "#F28B8B", note: "#E07BD0", brand: "#8FA2D6" } : { warn: "#E08A00", late: "#DC2626", note: "#C026A3", brand: "#1B2A55" };
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
};
// Rouge / orange / neutre doux (même grain que les étapes) — pour les états d'alerte partout dans l'appli.
export function alertSoft() { const m = T.mode === "dark" ? "dark" : "light"; return { red: ALERT_HUES.red[m], orange: ALERT_HUES.orange[m], neutral: ALERT_HUES.neutral[m] }; }
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
    "Arrivée":    { c: S.arrivee.bg,    t: S.arrivee.ink,    bold: false },
    "Production": { c: S.production.bg, t: S.production.ink, bold: false },
    "Tests":      { c: S.tests.bg,      t: S.tests.ink,      bold: false },
    "Fin prod":   { c: S.finProd.bg,    t: S.finProd.ink,    bold: false },
    "Départ":     { c: S.depart.bg,     t: S.depart.ink,     bold: true },
  };
}
