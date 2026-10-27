// v154 — Manager › Tests : testeurs, affectation aux périodes de tests des PJ, tests FAT à réaliser (interne / client / NOBO).
// Modèle : OP022-DP001-A « ORC Internal FAT – Test Checklist ». Logique pure (sans React ni Firestore).
// Document planning/tests : { testers:[{id,name,email}], catalog:{interne,client,nobo}, plans:{ [pj]: { assign:[{tid,from,to}], sel:{interne,client,nobo}, extra:{interne,client,nobo} } } }

export const SECTIONS = [
  ["interne", "FAT interne", "Toujours réalisé en atelier avant la présentation"],
  ["client", "FAT client", "Réalisé en présence du client"],
  ["nobo", "FAT NOBO", "Réalisé en présence de NOBO"],
];

// Catalogue de départ : le contenu du fichier de checklist FAT.
export const DEFAULT_TEST_CATALOG = {
  interne: [
    { id: "i1", name: "Configuration ORC (Inovance + Ziehl)", obj: "Configuration du variateur Inovance\nConfiguration du relais de protection Ziehl" },
    { id: "i2", name: "Debug ORC", obj: "Vérification de la communication avec l'automate\nVérification du bon fonctionnement des capteurs (température, pression)\nVérification des actionneurs (pompes, vannes, ventilateurs)\nVérification Turbines" },
    { id: "i3", name: "Carte SIM", obj: "Installation carte SIM" },
    { id: "i4", name: "Run d'ajustement", obj: "Stabiliser les températures et pressions du cycle\nVérifier le démarrage de la turbine et du générateur\nAjuster les paramètres de régulation si nécessaire\nVérifier l'absence de comportement anormal" },
    { id: "i5", name: "Run 1h stable", obj: "Vérifier la capacité de l'ORC à fonctionner de manière stable sur une durée prolongée.\nProduction électrique stable" },
    { id: "i6", name: "Arrêt d'urgence (via le bouton)", obj: "Activer l'arrêt d'urgence lorsque la machine est à bas régime, afin de limiter les contraintes mécaniques sur les équipements" },
  ],
  client: [
    { id: "c1", name: "Run 1h stable", obj: "Vérifier la capacité de l'ORC à fonctionner de manière stable sur une durée prolongée.\nProduction électrique stable" },
    { id: "c2", name: "Arrêt d'urgence (via le bouton)", obj: "Activer l'arrêt d'urgence lorsque la machine est en run" },
  ],
  nobo: [
    { id: "n1", name: "Déclenchement TT03", obj: "Activer l'arrêt de l'ORC suite au déclenchement TT03" },
    { id: "n2", name: "Run", obj: "Vérifier la capacité de l'ORC à fonctionner de manière stable sur une durée prolongée.\nProduction électrique stable" },
    { id: "n3", name: "Arrêt d'urgence (via le bouton)", obj: "Activer l'arrêt d'urgence lorsque la machine est en run" },
  ],
};

export const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export function catalogOf(doc) {
  const c = (doc && doc.catalog) || {};
  const out = {};
  SECTIONS.forEach(([k]) => { out[k] = Array.isArray(c[k]) ? c[k] : DEFAULT_TEST_CATALOG[k]; });
  return out;
}
export const testersOf = doc => (doc && Array.isArray(doc.testers) ? doc.testers : []);
export const planOf = (doc, pj) => {
  const p = doc && doc.plans && doc.plans[pj];
  return { assign: Array.isArray(p && p.assign) ? p.assign : [], sel: (p && p.sel) || {}, extra: (p && p.extra) || {}, notes: (p && p.notes) || {}, done: (p && p.done) || {}, st: (p && p.st) || {}, stBy: (p && p.stBy) || {}, forced: (p && p.forced) || null };
};

// Parties présentes selon la présence aux tests (null | "client" | "nobo" | "both") : l'interne est toujours fait.
export function activeSections(kind) {
  return SECTIONS.map(([k]) => k).filter(k => k === "interne" || (k === "client" && (kind === "client" || kind === "both")) || (k === "nobo" && (kind === "nobo" || kind === "both")));
}

// Tests retenus pour un PJ dans une partie : par défaut tout le catalogue, puis le choix enregistré.
export function selectedIds(plan, catalog, section) {
  const all = (catalog[section] || []).map(t => t.id);
  const s = plan.sel && plan.sel[section];
  return Array.isArray(s) ? all.filter(id => s.includes(id)) : all;
}
export function toggleTest(plan, catalog, section, id) {
  const cur = selectedIds(plan, catalog, section);
  const next = cur.includes(id) ? cur.filter(x => x !== id) : (catalog[section] || []).map(t => t.id).filter(x => cur.includes(x) || x === id);
  return { ...plan, sel: { ...plan.sel, [section]: next } };
}
// v186 : tests réalisés (« fait »), par partie — plan.done = { interne:[ids], client:[ids], nobo:[ids] }. Champ ajouté, rétrocompatible.
// v187 : statut de chaque test, renseigné par le testeur — plan.st = { interne: { id: "wip"|"ok"|"ko" } }, plan.stBy = { interne: { id: { by, at } } }.
// « Fait » = réussi ou en échec. Les listes plan.done de la V186 (jamais publiée) restent lues comme « réussi ».
export const TEST_STATUS = [["todo", "À faire"], ["wip", "En cours"], ["ok", "Réussi"], ["ko", "Échec"]];
export const statusOf = (plan, section, id) => {
  const v = plan.st && plan.st[section] && plan.st[section][id];
  if (v) return v;
  return plan.done && Array.isArray(plan.done[section]) && plan.done[section].includes(id) ? "ok" : "todo";
};
export const statusByOf = (plan, section, id) => (plan.stBy && plan.stBy[section] && plan.stBy[section][id]) || null;
export function setStatus(plan, section, id, value, by, at) {
  const st = { ...(plan.st || {}), [section]: { ...((plan.st || {})[section] || {}), [id]: value } };
  const stBy = { ...(plan.stBy || {}), [section]: { ...((plan.stBy || {})[section] || {}), [id]: { by: by || "", at: at || new Date().toISOString() } } };
  return { ...plan, st, stBy };
}
export const doneIds = (plan, section) => {
  const ids = new Set([...(plan.done && Array.isArray(plan.done[section]) ? plan.done[section] : []), ...Object.keys((plan.st && plan.st[section]) || {})]);
  return [...ids].filter(id => ["ok", "ko"].includes(statusOf(plan, section, id)));
};
export const toggleDone = (plan, section, id, by, at) => setStatus(plan, section, id, ["ok", "ko"].includes(statusOf(plan, section, id)) ? "todo" : "ok", by, at);
// Avancement d'une machine sur les parties actives (interne, + client / NOBO si présents) : faits (réussis + échecs) / à réaliser.
export function progressOf(plan, catalog, sections) {
  let done = 0, total = 0, ok = 0, ko = 0, wip = 0;
  sections.forEach(k => selectedIds(plan, catalog, k).forEach(id => {
    const v = statusOf(plan, k, id); total++;
    if (v === "ok") { ok++; done++; } else if (v === "ko") { ko++; done++; } else if (v === "wip") wip++;
  }));
  return { done, total, ok, ko, wip };
}
// v187 : validation forcée d'une ancienne période de tests (admin), même sans testeur ni test coché.
export const isForced = plan => !!(plan && plan.forced && plan.forced.at);
export const setForced = (plan, on, by, at) => ({ ...plan, forced: on ? { by: by || "", at: at || new Date().toISOString() } : null });
export const setNote = (plan, testId, text) => { const notes = { ...plan.notes }; if (text) notes[testId] = text; else delete notes[testId]; return { ...plan, notes }; };
export const setExtra = (plan, section, text) => ({ ...plan, extra: { ...plan.extra, [section]: text } });

// Période effective d'une affectation : ses dates propres, sinon la période de tests du PJ.
const iso = v => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export function effRange(a, row) {
  const from = a.from || iso(row && row.tests), to = a.to || iso(row && row.testsFin) || from;
  return { from, to: to < from ? from : to };
}
export function assignTester(plan, tid, by, at) {
  if (plan.assign.some(a => a.tid === tid)) return plan;
  return { ...plan, assign: [...plan.assign, { tid, from: "", to: "", by: by || "", at: at || new Date().toISOString() }] }; // v188 : by / at → notification au testeur
}
// v188 : affectations d'un testeur faites après « since » (ISO) → cloche de l'en-tête. Les affectations d'avant la v188 n'ont pas de date.
export function assignmentsSince(doc, tid, since) {
  const out = [];
  Object.entries((doc && doc.plans) || {}).forEach(([pj, p]) => (Array.isArray(p && p.assign) ? p.assign : []).forEach(a => {
    if (a.tid === tid && a.at && (!since || a.at > since)) out.push({ pj, at: a.at, by: a.by || "", from: a.from || "", to: a.to || "" });
  }));
  return out.sort((x, y) => y.at.localeCompare(x.at));
}
export const unassignTester = (plan, tid) => ({ ...plan, assign: plan.assign.filter(a => a.tid !== tid) });
export const setAssignDates = (plan, tid, from, to) => ({ ...plan, assign: plan.assign.map(a => a.tid === tid ? { ...a, from: from || "", to: to || "" } : a) });

// Un testeur affecté à deux PJ dont les périodes se chevauchent : [{ tid, a:{pj,from,to}, b:{pj,from,to} }]
export function findConflicts(doc, rows) {
  const byPj = {}; (rows || []).forEach(r => { byPj[r.pj] = r; });
  const per = {};
  Object.entries((doc && doc.plans) || {}).forEach(([pj, p]) => (p.assign || []).forEach(a => {
    const r = effRange(a, byPj[pj]); if (!r.from) return;
    (per[a.tid] = per[a.tid] || []).push({ pj, ...r });
  }));
  const out = [];
  Object.entries(per).forEach(([tid, list]) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (list[i].from <= list[j].to && list[j].from <= list[i].to) out.push({ tid, a: list[i], b: list[j] }); });
  return out;
}
// Affectations d'un testeur : [{ pj, from, to }] triées par date.
export function assignmentsOf(doc, tid, rows) {
  const byPj = {}; (rows || []).forEach(r => { byPj[r.pj] = r; });
  const out = [];
  Object.entries((doc && doc.plans) || {}).forEach(([pj, p]) => (p.assign || []).forEach(a => { if (a.tid === tid) out.push({ pj, ...effRange(a, byPj[pj]) }); }));
  return out.sort((x, y) => x.from.localeCompare(y.from));
}
// Retire un testeur supprimé de tous les plans.
export function dropTester(doc, tid) {
  const plans = {};
  Object.entries((doc && doc.plans) || {}).forEach(([pj, p]) => { plans[pj] = { ...p, assign: (p.assign || []).filter(a => a.tid !== tid) }; });
  return { ...doc, testers: testersOf(doc).filter(t => t.id !== tid), plans };
}
// Retire un test supprimé du catalogue des sélections enregistrées.
export function dropTestFromPlans(doc, section, id) {
  const plans = {};
  Object.entries((doc && doc.plans) || {}).forEach(([pj, p]) => { const s = p.sel && p.sel[section]; plans[pj] = Array.isArray(s) ? { ...p, sel: { ...p.sel, [section]: s.filter(x => x !== id) } } : p; });
  return { ...doc, plans };
}

// Frise des testeurs : répartit des périodes [{ from, to, … }] sur des lignes sans chevauchement (une 2e ligne = le testeur est pris deux fois).
export function packLanes(items) {
  const sorted = [...items].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  const laneEnd = [];
  return sorted.map(it => {
    let l = laneEnd.findIndex(e => e < it.from);
    if (l < 0) { l = laneEnd.length; laneEnd.push(it.to); } else laneEnd[l] = it.to;
    return { ...it, lane: l };
  });
}
// Jours entre deux dates ISO (to - from), sans effet d'heure d'été.
export const dayDiffIso = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
export const addDaysIso = (iso, n) => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)); return d.toISOString().slice(0, 10); };
// Lundi de la semaine d'une date ISO.
export const mondayOf = iso => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))); const w = (d.getUTCDay() + 6) % 7; return addDaysIso(iso, -w); };
// Le compte connecté est-il un testeur de la liste ? (adresse renseignée) — donne accès en lecture à l'onglet Tests.
export const testerOfEmail = (doc, email) => { const e = String(email || "").trim().toLowerCase(); return e ? testersOf(doc).find(t => String(t.email || "").trim().toLowerCase() === e) || null : null; };
