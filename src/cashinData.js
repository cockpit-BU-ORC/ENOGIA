// V146 — Cash in dans le Manager : accès aux données et couleurs transmises à la page (public/cashin.html).
import { doc } from "firebase/firestore";
import { db } from "./firebase";
import { T, statusSoft, mixHex } from "./theme";

// Même convention que le reste du site : en bêta, le document s'appelle beta_cashin (la production n'est jamais touchée).
export const CASHIN_DOC_ID = (process.env.REACT_APP_BETA === "1" ? "beta_" : "") + "cashin";
export const CASHIN_DOC_REF = () => doc(db, "planning", CASHIN_DOC_ID);
// V146.2 : liaisons choisies à la main entre les PJ du Cash in et ceux de l'ordo (document à part : la page Cash in réécrit « cashin » en entier).
export const CASHIN_LINKS_ID = (process.env.REACT_APP_BETA === "1" ? "beta_" : "") + "cashinLinks";
export const CASHIN_LINKS_REF = () => doc(db, "planning", CASHIN_LINKS_ID);
// v323 (demandé : « flaguer les jalons liés à un livrable du Produit ; ils remontent sur l'accueil du responsable produit ») :
// copie des seuls jalons cochés « Produit » dans le Cash in (PJ, nom, jalon, montant, dates de facture), écrite à chaque enregistrement
// du Cash in, lisible par tout compte ENOGIA (le Cash in complet reste réservé à la Finance).
export const CASHIN_PRODUIT_ID = (process.env.REACT_APP_BETA === "1" ? "beta_" : "") + "cashinProduit";
export const CASHIN_PRODUIT_REF = () => doc(db, "planning", CASHIN_PRODUIT_ID);
export function produitItems(d) {
  const labels = (d && d.labels) || {};
  return ((d && Array.isArray(d.rows)) ? d.rows : []).filter(r => r && r.produit && !r.epc)
    .map(r => ({ id: r.id || "", pj: r.pj, nom: labels[r.pj] || "", jalon: r.jalon || "", montant: r.montant == null || isNaN(Number(r.montant)) ? null : Number(r.montant), factInit: r.factInit || null, factPrevue: r.factPrevue || null, factReelle: r.factReelle || null }))
    .sort((a, b) => String(a.factPrevue || a.factInit || "9").localeCompare(String(b.factPrevue || b.factInit || "9")) || a.pj.localeCompare(b.pj));
}
// V146.12 : copie réduite du Cash in (seulement les PJ rattachés à un PJ de l'ordo) publiée par le super admin pour que les administrateurs
// voient les jalons de paiement dans les fiches synthèse (lecture seule). Le document « cashin » complet reste réservé au super admin.
export const CASHIN_SHARED_ID = (process.env.REACT_APP_BETA === "1" ? "beta_" : "") + "cashinShared";
export const CASHIN_SHARED_REF = () => doc(db, "planning", CASHIN_SHARED_ID);
// v374 : fiche du lundi (destinataires, envoi automatique, demandes d'envoi, historique) — lue et écrite par la Finance (Admin), envoyée par la fonction serveur
export const CASHIN_WEEKLY_ID = (process.env.REACT_APP_BETA === "1" ? "beta_" : "") + "cashinWeekly";
export const CASHIN_WEEKLY_REF = () => doc(db, "planning", CASHIN_WEEKLY_ID);
export const CASHIN_PAGE_VERSION = "371"; // change à chaque modification de public/cashin.html (évite le cache du navigateur)
export const CASHIN_MAX_BYTES = 900 * 1024;  // limite Firestore : 1 Mo par document

// Le document garde exactement la forme de l'ancien artefact : { rows, labels, totals, owners, updatedAt }.
export function validateCashin(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return "Le fichier n'est pas une sauvegarde Cash in.";
  if (!Array.isArray(d.rows)) return "Le fichier ne contient pas de liste de jalons (rows).";
  const bad = d.rows.findIndex(r => !r || typeof r !== "object" || typeof r.pj !== "string" || !r.pj);
  if (bad >= 0) return "Le jalon n° " + (bad + 1) + " n'a pas de numéro de PJ.";
  for (const k of ["labels", "totals", "owners"]) if (d[k] != null && (typeof d[k] !== "object" || Array.isArray(d[k]))) return "Le champ « " + k + " » est invalide.";
  const size = JSON.stringify(d).length;
  if (size > CASHIN_MAX_BYTES) return "Le fichier est trop gros pour un document Firestore (" + Math.round(size / 1024) + " Ko).";
  return null;
}
export function cleanCashin(d) {
  return { rows: d.rows, labels: d.labels || {}, totals: d.totals || {}, owners: d.owners || {}, updatedAt: d.updatedAt || new Date().toISOString() };
}

const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
export const contrast = (a, b) => { const p = lum(a), q = lum(b); return (Math.max(p, q) + .05) / (Math.min(p, q) + .05); };
// Teinte « forte » d'un statut : part du liseré de l'étape et se rapproche du texte jusqu'à lire ≥ 4,5:1 sur le fond pastel
// (la même couleur sert de texte, de liseré et de remplissage de barre dans la page).
function strong(s, minRatio = 4.6) {
  for (let t = 0; t <= 1.0001; t += .05) { const c = mixHex(s.ring, s.ink, t); if (contrast(c, s.bg) >= minRatio) return c; }
  return s.ink;
}

// Variables CSS posées par le site sur la page Cash in : mêmes teintes que le Calendrier (Payé = Fin prod, Facture émise = Production, À facturer = Arrivée)
// + orange doux (relancé, échéance proche) et rouge doux (en retard), voir statusSoft() dans theme.js.
export function cashinTheme() {
  const S = statusSoft(), dark = T.mode === "dark";
  const whiteOrDark = bg => contrast("#FFFFFF", bg) >= contrast("#101820", bg) ? "#FFFFFF" : "#101820";
  const accent = T.teal600;
  return {
    mode: dark ? "dark" : "light",
    vars: {
      "--bg": T.surface, "--surface": T.card, "--surface-2": T.surfaceAlt,
      "--ink": T.ink900, "--ink-2": T.ink700, "--ink-3": T.ink500,
      "--line": T.line, "--line-2": mixHex(T.line, T.card, .5),
      "--accent": accent, "--accent-ink": whiteOrDark(accent), "--accent-soft": T.teal100,
      "--paid": strong(S.paid), "--paid-bg": S.paid.bg,
      "--invoiced": strong(S.invoiced), "--invoiced-bg": S.invoiced.bg,
      "--chased": strong(S.chased), "--chased-bg": S.chased.bg,
      "--tobill": strong(S.tobill), "--tobill-bg": S.tobill.bg,
      "--future": strong(S.future), "--future-bg": S.future.bg,
      "--late": strong(S.late, 5.5), "--late-bg": S.late.bg, "--on-late": whiteOrDark(strong(S.late, 5.5)),
      "--warn-bg": S.soon.bg, "--warn-line": S.soon.ring,
    },
  };
}

// Contenu publié pour les administrateurs : uniquement les PJ du Cash in rattachés (automatiquement ou à la main) à un PJ de l'ordo.
// groupKeys = clés des PJ du Cash in concernés (calculées par cashGroupsFor côté App).
export function buildSharedCashin(doc, links, groupKeys) {
  const keys = new Set(groupKeys);
  const rows = ((doc && doc.rows) || []).filter(r => keys.has(r.pj));
  const labels = {}, totals = {}, lk = {};
  keys.forEach(k => {
    if (doc.labels && doc.labels[k] != null) labels[k] = doc.labels[k];
    if (doc.totals && doc.totals[k] != null) totals[k] = doc.totals[k];
    if (links && Array.isArray(links[k])) lk[k] = links[k];
  });
  rows.forEach(r => { const e = links && links["row:" + r.id]; if (Array.isArray(e)) lk["row:" + r.id] = e; }); // jalons réservés à certaines machines (v146.14)
  return { rows, labels, totals, links: lk };
}
