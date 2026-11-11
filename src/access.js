// v305 (maquette « Les accès » validée : « Go ») : accès par page, donnés par le rôle de chaque personne.
// Une personne a un seul rôle (planning/profiles.byEmail[...].role, le même que pour son accueil) ; chaque rôle a, pour chaque page,
// un niveau : n = masquée, r = lecture seule, w = modifier, a = admin (modifier + réglages de la page). Le propriétaire est le seul
// super admin (tout, partout, et la page Accès). Les niveaux sont dans planning/access = { on, roles, levels: { page: { rôle: niveau } } }.
// Tant que « on » n'est pas vrai, rien ne change : chacun garde les droits d'avant (listes d'accès, admins du Manager).
import { ROLES as HOME_ROLES } from "./profiles";

export const LEVELS = ["n", "r", "w", "a"];
export const LEVEL_LABEL = { n: "Masqué", r: "Lecture", w: "Modifier", a: "Admin" };
export const rank = l => Math.max(0, LEVELS.indexOf(l));
export const atLeast = (l, min) => rank(l) >= rank(min);

// Pages réglables (Personnes et site, Planificateur et Accès restent au super admin).
export const ACCESS_PAGES = [
  { id: "home", g: "Travailler", l: "Aujourd'hui", d: "accueil du poste", adm: "", min: "r" },
  { id: "planning", g: "Travailler", l: "Planning", d: "Liste, Gantt, Calendrier, Modifications", adm: "changer les états, déclarer et classer les retards" },
  { id: "tests", g: "Travailler", l: "Tests", d: "bancs, testeurs, fiches", adm: "affecter les testeurs, catalogue, checklists" },
  { id: "turbines", g: "Travailler", l: "Turbines", d: "production et besoins", adm: "import de données, gammes et durées" },
  { id: "achats", g: "Travailler", l: "Achats / Appro", d: "projets, PO, fournisseurs", adm: "réglages, synchronisation Odoo" },
  { id: "projets", g: "Suivre", l: "Projets", d: "fiches projet, point hebdo, machines ORC", adm: "gérer les états, machines ORC" },
  { id: "finance", g: "Suivre", l: "Finance", d: "Cash in, montants", adm: "" },
  { id: "pilotage", g: "Suivre", l: "Pilotage", d: "KPI, retards, CODIR", adm: "" },
  { id: "comments", g: "Suivre", l: "Commentaires", d: "fils par PJ", adm: "" },
  { id: "calprod", g: "Régler", l: "Calendrier de production", d: "fermetures, jours sans production", adm: "" },
];

// Rôles : ceux de l'accueil (Personnes et rôles) + Achats et SAV / MES.
export const DEFAULT_ROLES = HOME_ROLES.map(r => [r[0], r[1]]);

// Niveaux par défaut = droits d'avant la V305 (au plus près) : planning et commentaires pour tous, tests aux testeurs,
// turbines / achats à leurs responsables, Manager (projets, pilotage, calendrier) et finance à la direction.
const D = (o, def = "n") => Object.fromEntries(DEFAULT_ROLES.map(([k]) => [k, o[k] || def]));
export const DEFAULT_LEVELS = {
  home: D({}, "r"),
  planning: D({ direction: "a" }, "r"),
  tests: D({ direction: "a", cdp: "r", testeur: "r", resptest: "w", atelier: "r" }),
  turbines: D({ direction: "r", turbines: "a", atelier: "r" }),
  achats: D({ direction: "r", achats: "a" }),
  projets: D({ direction: "a", cdp: "r" }),
  finance: D({ direction: "w" }),
  pilotage: D({ direction: "r" }),
  comments: D({}, "w"),
  calprod: D({ direction: "w", atelier: "r" }),
};

export const accessOn = doc => !!(doc && doc.on === true);
export const rolesOf = doc => (doc && Array.isArray(doc.roles) && doc.roles.length ? doc.roles.map(r => [r.id, r.name]) : DEFAULT_ROLES);
export const roleOrDefault = role => role || "autre";
export function levelOf(doc, role, page) {
  const p = ACCESS_PAGES.find(x => x.id === page), lv = doc && doc.levels && doc.levels[page];
  const base = DEFAULT_LEVELS[page] || {};
  const r = roleOrDefault(role);
  let v = lv && lv[r] != null ? lv[r] : base[r] != null ? base[r] : "n";
  if (!LEVELS.includes(v)) v = "n";
  if (p && p.min && rank(v) < rank(p.min)) v = p.min;
  return v;
}
// Matrice complète (pages × rôles), valeurs par défaut comprises : base de la page Accès.
export function levelsOf(doc) {
  const roles = rolesOf(doc);
  return Object.fromEntries(ACCESS_PAGES.map(p => [p.id, Object.fromEntries(roles.map(([k]) => [k, levelOf(doc, k, p.id)]))]));
}
// Droits de la personne connectée. owner = super admin. null quand les nouveaux accès ne sont pas activés (droits d'avant).
export function myAccess(doc, role, owner) {
  if (owner) return Object.fromEntries(ACCESS_PAGES.map(p => [p.id, "a"]));
  if (!accessOn(doc)) return null;
  return Object.fromEntries(ACCESS_PAGES.map(p => [p.id, levelOf(doc, role, p.id)]));
}
// Résumé d'un rôle pour la liste des personnes : « 7 pages, admin sur 2 ».
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
