// v305 (maquette « Les accès » validée) puis v308 (demandé : « trop complexe ; une sous-page pour gérer les rôles, une page avec les
// accès pour chaque page / sous-page ») : accès par page ET par sous-page, donnés par le rôle de chaque personne.
// Une personne a un seul rôle (planning/profiles.byEmail[...].role, le même que pour son accueil ; vide = « autre »). Chaque rôle a,
// pour chaque page et chaque sous-page, un niveau : n = masquée, r = lecture seule, w = modifier, a = admin (modifier + réglages).
// Une sous-page sans niveau propre suit sa page ; le niveau d'une page qui a des sous-pages = le plus haut de ses sous-pages
// (c'est lui que lisent les règles Firestore). Le propriétaire est le seul super admin.
// planning/access = { on, roles: [{ id, name }], levels: { "page" | "page.sous-page": { rôle: niveau } } }.
// Tant que « on » n'est pas vrai, rien ne change : chacun garde les droits d'avant.
import { ROLES as HOME_ROLES } from "./profiles";

export const LEVELS = ["n", "r", "w", "a"];
export const LEVEL_LABEL = { n: "Masqué", r: "Lecture", w: "Modifier", a: "Admin" };
export const rank = l => Math.max(0, LEVELS.indexOf(l));
export const atLeast = (l, min) => rank(l) >= rank(min);
const maxLevel = arr => arr.reduce((m, l) => (rank(l) > rank(m) ? l : m), "n");

// Pages et sous-pages réglables (Personnes et site, Planificateur et Accès restent au super admin).
// Sous-pages : identifiants des vues du site (Planning : view ; Tests : sub ; Turbines : tab ; Projets / Pilotage : onglets du Manager).
export const ACCESS_PAGES = [
  { id: "home", g: "Opérations", l: "Accueil", d: "accueil du poste", adm: "", min: "r" },
  { id: "planning", g: "Opérations", l: "Planning", d: "le planning publié", adm: "changer les états, déclarer et classer les retards",
    subs: [["table", "Liste"], ["gantt", "Gantt"], ["calendar", "Calendrier"], ["changes", "Modifications"]] },
  { id: "tests", g: "Opérations", l: "Tests", d: "bancs, testeurs, fiches", adm: "affecter les testeurs, catalogue, checklists",
    subs: [["semaine", "Par semaine"], ["testers", "Par testeur"], ["catalog", "Catalogue"], ["checklists", "Checklists"]] },
  { id: "turbines", g: "Opérations", l: "Turbines", d: "production et besoins", adm: "import de données, gammes et durées",
    subs: [["prod", "Production"], ["orc", "Besoins ORC et SAV"]] },
  { id: "achats", g: "Opérations", l: "Achats / Appro", d: "projets, PO, fournisseurs", adm: "réglages, synchronisation Odoo" },
  { id: "sav", g: "Opérations", l: "SAV / MES", d: "tickets, interventions, planning des équipes, parc ; en lecture : demander une intervention", adm: "techniciens de l'équipe, suppressions",
    subs: [["tickets", "Tickets"], ["inters", "Interventions"], ["planning", "Planning des équipes"], ["dispo", "Disponibilités"], ["parc", "Parc"], ["kpi", "KPI"]] },
  { id: "projets", g: "Gestion", l: "Projets", d: "fiches projet, point hebdo, machines", adm: "gérer les états, machines ORC",
    subs: [["fiche", "Fiches projet"], ["hebdo", "Point hebdo"], ["serie", "Machines ORC"]] },
  { id: "finance", g: "Gestion", l: "Finance", d: "Cash in, montants", adm: "" },
  { id: "pilotage", g: "Gestion", l: "Pilotage", d: "KPI, retards", adm: "", subs: [["kpi", "KPI"], ["retards", "Retards"]] },
  { id: "comments", g: "Opérations", l: "Commentaires", d: "fils par PJ", adm: "supprimer un commentaire" },
  { id: "calprod", g: "Administration", l: "Fermetures de l'atelier", d: "fermetures de l'atelier (Réglages) ; les jours sans production se règlent dans le Calendrier", adm: "" },
];
export const ACCESS_IDS = ACCESS_PAGES.flatMap(p => [p.id, ...(p.subs || []).map(([s]) => p.id + "." + s)]);
const pageOf = id => ACCESS_PAGES.find(p => p.id === String(id).split(".")[0]);
// Sous-pages réservées par défaut aux admins de la page (comme avant : catalogue et checklists des tests)
const ADMIN_SUBS = ["tests.catalog", "tests.checklists"];

// Rôles : ceux de l'accueil (Personnes et rôles, avec Achats et SAV / MES).
export const DEFAULT_ROLES = HOME_ROLES.map(r => [r[0], r[1]]);
export const BUILTIN_ROLE_IDS = DEFAULT_ROLES.map(r => r[0]);

// Niveaux par défaut des pages = droits d'avant la V305 (au plus près).
const D = (o, def = "n") => Object.fromEntries(DEFAULT_ROLES.map(([k]) => [k, o[k] || def]));
export const DEFAULT_LEVELS = {
  home: D({}, "r"),
  planning: D({ direction: "a" }, "r"),
  tests: D({ direction: "a", cdp: "r", testeur: "r", resptest: "w", atelier: "r" }),
  turbines: D({ direction: "r", turbines: "a", atelier: "r" }),
  achats: D({ direction: "r", achats: "a" }),
  sav: D({ direction: "r", sav: "a", cdp: "r" }), // v326
  projets: D({ direction: "a", cdp: "r" }),
  finance: D({ direction: "w", daf: "w" }), // v370 : le DAF saisit les encaissements (Cash in › Encaissements)
  pilotage: D({ direction: "r" }),
  comments: D({}, "w"),
  calprod: D({ direction: "w", atelier: "r" }),
};

export const accessOn = doc => !!(doc && doc.on === true);
// v370 : un rôle intégré ajouté après l'enregistrement de la liste (ex. « DAF ») y est rajouté à la fin, pour qu'il apparaisse dans Gestion des accès
export const rolesOf = doc => { if (!(doc && Array.isArray(doc.roles) && doc.roles.length)) return DEFAULT_ROLES; const L = doc.roles.map(r => [r.id, r.name]), have = new Set(L.map(r => r[0])); return [...L, ...DEFAULT_ROLES.filter(r => !have.has(r[0]))]; };
export const roleOrDefault = role => role || "autre";
const valid = v => (LEVELS.includes(v) ? v : null);
// Niveau d'une page ou d'une sous-page (« page.sous-page ») pour un rôle.
export function levelOf(doc, role, id) {
  const r = roleOrDefault(role), lv = doc && doc.levels, p = pageOf(id);
  const own = lv && lv[id] && valid(lv[id][r]);
  let v;
  if (String(id).includes(".")) {
    if (own) v = own;
    else { const pl = levelOf(doc, r, p.id); v = ADMIN_SUBS.includes(id) ? (pl === "a" ? "a" : "n") : pl; }
  } else {
    const base = DEFAULT_LEVELS[id] || {};
    v = own || valid(base[r]) || "n";
  }
  if (p && p.min && rank(v) < rank(p.min)) v = p.min;
  return v;
}
// Matrice complète (pages et sous-pages × rôles) : base de la page Accès.
export function levelsOf(doc) {
  const roles = rolesOf(doc);
  return Object.fromEntries(ACCESS_IDS.map(id => [id, Object.fromEntries(roles.map(([k]) => [k, levelOf(doc, k, id)]))]));
}
// Change un niveau : une page entraîne toutes ses sous-pages ; une sous-page remonte sa page au plus haut de ses sous-pages.
export function setLevel(levels, id, role, v) {
  const p = pageOf(id); if (!p) return levels;
  const next = { ...levels }, put = (k, val) => { next[k] = { ...(next[k] || {}), [role]: val }; };
  if (p.min && rank(v) < rank(p.min)) v = p.min;
  if (!String(id).includes(".")) { put(id, v); (p.subs || []).forEach(([s]) => put(p.id + "." + s, v)); }
  else { put(id, v); put(p.id, maxLevel((p.subs || []).map(([s]) => (next[p.id + "." + s] || {})[role] || "n"))); }
  return next;
}
// Copie tous les niveaux d'un rôle vers un autre.
export const copyRole = (levels, from, to) => Object.fromEntries(Object.entries(levels).map(([k, m]) => [k, { ...m, [to]: (m || {})[from] || "n" }]));
// Droits de la personne connectée (pages et sous-pages). owner = super admin. null tant que les accès ne sont pas activés.
export function myAccess(doc, role, owner) {
  if (owner) return Object.fromEntries(ACCESS_IDS.map(id => [id, "a"]));
  if (!accessOn(doc)) return null;
  return Object.fromEntries(ACCESS_IDS.map(id => [id, levelOf(doc, role, id)]));
}
// Résumé d'un rôle : « 7 pages, admin sur 2 » (pages seulement).
export function roleSummary(levels, role) {
  let v = 0, a = 0;
  ACCESS_PAGES.forEach(p => { const l = (levels[p.id] || {})[role] || "n"; if (l !== "n") v++; if (l === "a") a++; });
  return v + " page" + (v > 1 ? "s" : "") + (a ? ", admin sur " + a : "");
}
export const slugRole = (name, taken) => {
  let base = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 16) || "role";
  let k = base, i = 2; while (taken.includes(k)) k = base + i++;
  return k;
};
