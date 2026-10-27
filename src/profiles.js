// ── v188 : profils des comptes (Manager › Réglages › Personnes et rôles) ────────────────────────────────────────
// Document Firestore planning/profiles (bêta : beta_profiles) : { byEmail: { [userKey(email)]: { email, name, role, pjs:[], chefs:[] } } }.
//  · role  : "direction" | "cdp" | "testeur" | "atelier" | "" (automatique) → choisit l'accueil de la personne ;
//  · pjs   : PJ associés à la personne (accueil chef de projet, liste des fiches) ;
//  · chefs : noms de chef de projet tels qu'écrits dans les fiches (« Chef de projet ») → tous leurs PJ, présents et à venir.
import { userKey } from "./mentions";
import { getPjMeta, chefsOf } from "./pjMeta";

export const ROLES = [
  ["direction", "Direction", "Vision globale : ordo, tests, turbines, cash, alertes, charge atelier"],
  ["cdp", "Chef de projet", "Ses PJ, retards, jalons des 3 semaines, FAT client, mentions"],
  ["testeur", "Testeur", "Ses tests du jour, fiches à signer, sa semaine, ses remarques"],
  ["atelier", "Chef d'atelier", "Arrivées et départs, postes de test"],
];
// v191 : blocs de l'accueil de chaque rôle, cochés par le super admin pour chaque personne (profile.blocks ; absent = tous).
export const ROLE_BLOCKS = {
  testeur: [["today", "Mes tests du jour"], ["sign", "Fiches à signer"], ["week", "Ma semaine"], ["notes", "Mes remarques"]],
  cdp: [["pjs", "Mes PJ et retards"], ["jalons", "Jalons des 3 semaines"], ["fat", "FAT client à venir"], ["mentions", "Mentions"]],
  direction: [["kpis", "Grands chiffres"], ["tests", "Tests"], ["turbines", "Turbines"], ["cash", "Cash in"], ["alertes", "Alertes"], ["charge", "Charge atelier"], ["postes", "Postes de test"], ["departs", "Départs à venir"], ["parcours", "Parcours des machines"]],
  atelier: [["kpis", "Grands chiffres"], ["arrdep", "Arrivées et départs"], ["postes", "Postes de test"]],
};
export const blockOn = (profile, id) => !profile || !Array.isArray(profile.blocks) || profile.blocks.includes(id);
export const roleLabel = id => (ROLES.find(r => r[0] === id) || [])[1] || "Automatique";
const lc = v => String(v || "").trim().toLowerCase();

export const profileOf = (doc, email) => {
  const p = doc && doc.byEmail && doc.byEmail[userKey(email)];
  return { email: lc(email), name: (p && p.name) || "", role: (p && p.role) || "", pjs: Array.isArray(p && p.pjs) ? p.pjs : [], chefs: Array.isArray(p && p.chefs) ? p.chefs : [], blocks: Array.isArray(p && p.blocks) ? p.blocks : null };
};
export function setProfile(doc, email, patch) {
  const k = userKey(email), cur = profileOf(doc, email);
  const next = { ...cur, ...patch, email: lc(email) };
  return { ...(doc || {}), byEmail: { ...((doc && doc.byEmail) || {}), [k]: next } };
}
// Rôle effectif : celui choisi dans le Manager, sinon déduit (propriétaire → direction, testeur → testeur, chef de projet → cdp).
export function effectiveRole(profile, { owner, tester, hasProjects }) {
  if (profile && profile.role) return profile.role;
  if (owner) return "direction";
  if (tester) return "testeur";
  if (hasProjects) return "cdp";
  return "";
}
// Noms de chef de projet présents dans les fiches, avec leur nombre de PJ ouverts.
export function chefNames(rows) {
  const m = new Map();
  (rows || []).forEach(r => chefsOf(getPjMeta(r.pj, r)).forEach(c => m.set(c, (m.get(c) || 0) + 1)));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr")).map(([name, n]) => ({ name, n }));
}
// PJ d'une personne : PJ associés à la main + tous ceux des chefs de projet associés.
export function pjsOfProfile(profile, rows) {
  if (!profile) return [];
  const chefs = new Set(profile.chefs.map(lc)), set = new Set(profile.pjs);
  (rows || []).forEach(r => { if (chefsOf(getPjMeta(r.pj, r)).some(c => chefs.has(lc(c)))) set.add(r.pj); });
  return [...set];
}
