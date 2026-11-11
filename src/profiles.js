// ── v188 : profils des comptes (Manager › Réglages › Personnes et rôles) ────────────────────────────────────────
// Document Firestore planning/profiles (bêta : beta_profiles) : { byEmail: { [userKey(email)]: { email, name, role, pjs:[], chefs:[] } } }.
//  · role  : "direction" | "cdp" | "testeur" | "atelier" | "turbines" | "autre" | "" (automatique) → choisit l'accueil de la personne ;
//  · homeLayouts (v229, à la racine du document) : { [rôle]: { order, span, extra, hidden } } — disposition de l'accueil de chaque poste, réglée par le propriétaire.
//  · pjs   : PJ associés à la personne (accueil chef de projet, liste des fiches) ;
//  · chefs : noms de chef de projet tels qu'écrits dans les fiches (« Chef de projet ») → tous leurs PJ, présents et à venir.
import { userKey } from "./mentions";
import { getPjMeta, chefsOf } from "./pjMeta";

export const ROLES = [
  ["direction", "Direction", "Vision globale : ordo, tests, turbines, cash, alertes, charge atelier"],
  ["cdp", "Chef de projet", "Ses PJ, retards, jalons des 3 semaines, FAT client, mentions"],
  ["testeur", "Testeur", "Ses tests du jour, fiches à signer, sa semaine, ses remarques"],
  ["resptest", "Responsable des testeurs", "Les tests de tous les testeurs : au banc, semaine, fiches à signer, résultats ; renseigne l'avancement de chaque test"],
  ["atelier", "Chef d'atelier", "Charge atelier, arrivées et départs, machines en montage, postes de test"],
  ["turbines", "Directeur production turbines", "Turbines prêtes et sans roue, pièces à suivre, dates prévisionnelles, stocks roues et injecteurs"],
  ["achats", "Achats", "Achats et approvisionnements ; accueil commun en attendant le sien"], // v305 : rôles de la page Accès
  ["sav", "SAV / MES", "SAV et mises en service ; accueil commun en attendant le sien"],
  ["autre", "Autres personnes","Chiffres clés, prochains départs, où en sont les machines"],
];
// v191 : blocs de l'accueil de chaque rôle, cochés par le super admin pour chaque personne (profile.blocks ; absent = tous).
export const ROLE_BLOCKS = {
  testeur: [["today", "Au banc aujourd'hui"], ["sign", "Fiches à signer"], ["week", "Ma semaine"], ["arrivees", "Prochaines arrivées au banc"], ["results", "Derniers résultats"]],
  resptest: [["today", "Au banc aujourd'hui"], ["sign", "Fiches à signer"], ["week", "La semaine"], ["arrivees", "Prochaines arrivées au banc"], ["results", "Derniers résultats"], ["postes", "Postes de test"]],
  cdp: [["pjs", "Mes PJ"], ["jalons", "Jalons des 3 semaines"], ["todo", "À traiter"], ["fat", "FAT client / NOBO"], ["avance", "Avancement"]], // v229 : accueils validés
  direction: [["kpis", "Grands chiffres"], ["tests", "Tests"], ["turbines", "Turbines"], ["cash", "Cash in"], ["alertes", "Alertes"], ["charge", "Charge atelier"], ["postes", "Postes de test"], ["departs", "Départs à venir"], ["parcours", "Parcours des machines"]],
  atelier: [["charge", "Charge atelier"], ["arrdep", "Arrivées et départs"], ["montage", "En montage"], ["postes", "Postes de test"]],
  turbines: [["ptReady", "Turbines prêtes"], ["ptNoWheel", "Testées sans roue"], ["ptPieces", "Pièces à suivre"], ["ptDates", "Dates prévisionnelles"], ["ptRoues", "Roues équilibrées"], ["ptInj", "Injecteurs"]],
  autre: [["kpis", "Chiffres clés"], ["departs", "Prochains départs"], ["parcours", "Où en sont les machines"]],
};
export const blockOn = (profile, id) => !profile || !Array.isArray(profile.blocks) || profile.blocks.includes(id);
export const roleLabel = id => (ROLES.find(r => r[0] === id) || [])[1] || "Automatique";
const lc = v => String(v || "").trim().toLowerCase();

export const profileOf = (doc, email) => {
  const p = doc && doc.byEmail && doc.byEmail[userKey(email)];
  return { email: lc(email), name: (p && p.name) || "", role: (p && p.role) || "", pjs: Array.isArray(p && p.pjs) ? p.pjs : [], chefs: Array.isArray(p && p.chefs) ? p.chefs : [], blocks: Array.isArray(p && p.blocks) ? p.blocks : null };
};
// v238 : personnes retirées de la liste (profil gardé avec removed: true, pour qu'un ancien compte connecté ne revienne pas)
export const isRemoved = (doc, email) => !!(doc && doc.byEmail && doc.byEmail[userKey(email)] && doc.byEmail[userKey(email)].removed);
export function removePerson(doc, email, on = true) {
  const k = userKey(email), cur = (doc && doc.byEmail && doc.byEmail[k]) || {};
  return { ...(doc || {}), byEmail: { ...((doc && doc.byEmail) || {}), [k]: on ? { email: lc(email), name: cur.name || "", removed: true } : { ...cur, email: lc(email), removed: false } } };
}
// v238 : liste collée (une personne par ligne : « Prénom NOM <prenom.nom@enogia.com> », « prenom.nom@enogia.com », séparées par , ou ;)
// → [{ email, name }] ; seules les adresses du domaine gardées, sans doublon.
export function parsePeopleList(text, domain = "enogia.com") {
  const out = new Map();
  String(text || "").split(/[\n;,]+/).forEach(part => {
    const m = part.match(/[^\s<>"']+@[^\s<>"']+/); if (!m) return;
    const email = lc(m[0]); if (!email.endsWith("@" + domain) || out.has(email)) return;
    const name = part.replace(m[0], "").replace(/[<>"'()]/g, " ").replace(/\s+/g, " ").trim();
    out.set(email, { email, name });
  });
  return [...out.values()];
}
export function setProfile(doc, email, patch) {
  const k = userKey(email), cur = profileOf(doc, email);
  const next = { ...cur, ...patch, email: lc(email) };
  return { ...(doc || {}), byEmail: { ...((doc && doc.byEmail) || {}), [k]: next } };
}
// Rôle effectif : celui choisi dans le Manager, sinon déduit (propriétaire → direction, testeur → testeur, chef de projet → cdp).
export function effectiveRole(profile, { owner, tester, hasProjects, prodTurb }) {
  if (profile && profile.role) return profile.role;
  if (owner) return "direction";
  if (prodTurb) return "turbines";
  if (tester) return "testeur";
  if (hasProjects) return "cdp";
  return "autre"; // v229 : accueil de base pour les autres personnes
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
