// v393 (maquette v393-passeport-machine.html, piste B validée : « Oui lot 1 ») : passeport machine — la configuration d'une machine
// qui vit d'une phase à l'autre (design, appro, fabrication, tests, MES, SAV). Lot 1 : éléments, standards par gamme, configuration
// voulue (design) et valeur réelle sur la machine (saisie, avec sa phase et sa source), historique, import du « Tableau configuration
// machines ». Les liens automatiques (Turbines, Achats, Tests, SAV qui écrivent le réel) viennent aux lots suivants.
//
// Document planning/machines = {
//   elements: [{ id, group, label, opts: [..], phase, achat, scope, turb }] | absent (= DEFAULT_ELEMENTS),
//   standards: { [gamme]: { [élément]: valeur } },
//   pass: { [PJ]: { cfg: { [élément]: valeur }, real: { [élément]: { v, phase, src, by, at } }, hist: [{ at, by, phase, el, k, from, to }] } } }
// cfg absent = standard de la gamme ; une valeur de cfg différente du standard = écart.

export const PHASES = [["design", "Design"], ["appro", "Appro"], ["fab", "Fabrication"], ["tests", "Tests"], ["mes", "MES"], ["sav", "SAV"]];
export const PHASE_LABEL = Object.fromEntries(PHASES);
export const GROUPS = ["Identité", "Turbines", "Skid", "Électrique", "Lubrification", "Fluides et refroidissement", "Auxiliaires", "Tests", "MES et SAV"];

// Éléments de départ : colonnes du « Tableau configuration machines » (onglets Tableau et Référence) + composants identifiés dans le RAI.
// phase = la phase qui renseigne la valeur réelle ; achat / scope = suivi en Achats / Appro (scope de params.scopes) ; turb = suivi en Turbines.
// un élément acheté se renseigne à l’appro (article et commande reçus), sinon à la fabrication
const E = (group, id, label, opts, x) => ({ id, group, label, opts: opts || [], achat: false, scope: "", turb: false, ...(x || {}), phase: (x && x.phase) || (x && x.achat ? "appro" : "fab") });
export const DEFAULT_ELEMENTS = [
  E("Identité", "application", "Application", ["Terrestre", "Maritime"], { phase: "design" }),
  E("Identité", "integration", "Intégration", ["Intérieur", "Extérieur"], { phase: "design" }),
  E("Identité", "multiOrc", "Multi-ORC", ["Non", "Oui"], { phase: "design" }),
  E("Identité", "neutre", "Régime de neutre", [], { phase: "design" }),
  E("Identité", "software", "Version software", [], { phase: "tests" }),
  E("Turbines", "nbTurb", "Nombre de turbines / volutes", ["1", "2"], { phase: "design", turb: true }),
  E("Turbines", "turbines", "Turbines montées (n°)", [], { turb: true }),
  E("Turbines", "injecteur", "Injecteur", ["I0250", "I0282", "I0338", "I0350", "I0400", "I1100"], { turb: true }),
  E("Turbines", "bouchages", "Nombre de bouchages", [], { turb: true }),
  E("Turbines", "roue", "Roue", ["W0250", "W0350", "W0400", "W0800", "W1100"], { turb: true }),
  E("Turbines", "volute", "Volute", ["20-V1", "100-V2"], { achat: true }),
  E("Turbines", "jacket", "Jacket water", ["20-V1", "100-V2"], { achat: true }),
  E("Skid", "evaporateur", "Évaporateur", [], { achat: true }),
  E("Skid", "condenseur", "Condenseur", [], { achat: true }),
  E("Skid", "pompeCycle", "Pompe cycle", [], { achat: true }),
  E("Skid", "pompeCooling", "Pompe cooling", [], { achat: true }),
  E("Skid", "vanneFlush", "Vanne « flush »", [], { achat: true }),
  E("Skid", "reservoir", "Réservoir", [], { achat: true }),
  E("Skid", "chassis", "Châssis", [], { achat: true }),
  E("Skid", "presseEtoupe", "Type de presse-étoupe", [], { achat: true }),
  E("Électrique", "connecteurs", "Connecteurs", ["WAGO", "Phoenix Contact 3P"], { achat: true }),
  E("Électrique", "capteursVib", "Capteurs de vibration", ["IFM", "Wago"], { achat: true }),
  E("Électrique", "elecPuissance", "Marque élec. de puissance", ["Inovance", "Emotron"], { achat: true }),
  E("Électrique", "drive", "Modèle drive", [], { achat: true }),
  E("Électrique", "choke", "Choke", ["Aucun", "Oui"], { achat: true }),
  E("Électrique", "schaffner", "Filtre Schaffner", [], { achat: true }),
  E("Électrique", "cem", "Optimisé CEM", ["Non", "Oui"], { phase: "design" }),
  E("Électrique", "v2v", "Contrôle V2V", ["On/Off", "Proportionnel"], { phase: "design" }),
  E("Électrique", "armoire", "Armoire électrique", [], { achat: true }),
  E("Électrique", "plc", "PLC (automate)", [], { achat: true }),
  E("Électrique", "sim", "Carte SIM", []),
  E("Électrique", "afe", "AFE", [], { achat: true }),
  E("Lubrification", "coolingLub", "Cooling de lub", ["Non", "Oui"], { achat: true }),
  E("Lubrification", "flexibleLub", "Flexible de lub", ["Inox - Flexible", "Acier - Rigide"], { achat: true }),
  E("Lubrification", "pompeLub", "Pompe de lub", ["A2V"], { achat: true }),
  E("Fluides et refroidissement", "aerotherme", "Aérotherme de cooling", ["Stefani"], { achat: true }),
  E("Fluides et refroidissement", "tt03", "Capteur TT03", ["Lent", "Rapide"], { achat: true }),
  E("Fluides et refroidissement", "mitrFluide", "Mitraillette fluide", [], { achat: true }),
  E("Fluides et refroidissement", "mitrEau", "Mitraillette eau", [], { achat: true }),
  E("Fluides et refroidissement", "injSout", "Injection / soutirage communs", ["Non", "Oui"], { phase: "design" }),
  E("Auxiliaires", "bypassVannes", "Vannes bypass ORC", [], { achat: true }),
  E("Auxiliaires", "bypassAct", "Actionneurs de vanne bypass", [], { achat: true }),
  E("Auxiliaires", "pompeBF", "Pompe BF", [], { achat: true }),
  E("Auxiliaires", "autres", "Autres modifications à faire", [], { phase: "design", opt: true }),
  // v401 : remplis par la fiche de tests et le SAV (passportLive.js) — rien de prévu, une saisie à la main reste possible
  E("Tests", "livret", "Livret de configuration", [], { phase: "tests", opt: true }),
  E("Tests", "debugCk", "Checklist de debug", [], { phase: "tests", opt: true }),
  E("Tests", "freqs", "Fréquences turbines", [], { phase: "tests", opt: true }),
  E("Tests", "vibs", "Vibrations", [], { phase: "tests", opt: true }),
  E("Tests", "fat", "Tests FAT", [], { phase: "tests", opt: true }),
  E("MES et SAV", "mesDate", "Mise en service", [], { phase: "mes", opt: true }),
  E("MES et SAV", "lastInter", "Dernière intervention", [], { phase: "sav", opt: true }),
  E("MES et SAV", "ticketsOpen", "Tickets SAV ouverts", [], { phase: "sav", opt: true }),
];

// v397 (lot 3) : scope Achats / Appro de chaque élément acheté (liste de départ des scopes d'Achats) — modifiable dans Standards par gamme
const SCOPE_OF = { volute: "VOLUTE", jacket: "VOLUTE", evaporateur: "SKID", condenseur: "SKID", vanneFlush: "SKID", reservoir: "SKID", chassis: "SKID", presseEtoupe: "SKID",
  bypassVannes: "SKID", bypassAct: "SKID", pompeCycle: "POMPE CYCLE", pompeCooling: "POMPE DE COOLING", pompeLub: "POMPE DE LUB", flexibleLub: "POMPE DE LUB", coolingLub: "POMPE DE LUB",
  armoire: "ARMOIRE", elecPuissance: "ARMOIRE", drive: "ARMOIRE", afe: "ARMOIRE", schaffner: "ARMOIRE", plc: "ELEC CTRL", connecteurs: "ELEC CTRL",
  capteursVib: "ELEC PROTECTION TURBINE", choke: "CHOKE", aerotherme: "AIR COOLER", tt03: "FLUIDE", mitrFluide: "FLUIDE", mitrEau: "FLUIDE" };
DEFAULT_ELEMENTS.forEach(e => { if (e.achat && !e.scope && SCOPE_OF[e.id]) e.scope = SCOPE_OF[e.id]; });
export const elementsOf = doc => { if (!(doc && Array.isArray(doc.elements) && doc.elements.length)) return DEFAULT_ELEMENTS;
  const ids = new Set(doc.elements.map(e => e.id)); return [...doc.elements, ...DEFAULT_ELEMENTS.filter(e => (e.group === "Tests" || e.group === "MES et SAV") && !ids.has(e.id))]; };
// gamme de la ligne de planning (« 180LTV3 » → standard « 180LT » s'il n'y a pas de standard au nom exact)
export const gammeKey = (doc, gamme) => {
  const g = String(gamme || "").trim(), S = (doc && doc.standards) || {};
  if (S[g]) return g;
  const keys = Object.keys(S).sort((a, b) => b.length - a.length);
  return keys.find(k => g.toUpperCase().startsWith(k.toUpperCase())) || g;
};
// v415 (demandé : « il n'y a pas de standard par gamme de machine pour les turbines ») : les éléments Turbines n'ont pas de référence par gamme
export const TURB_STD_OFF = new Set(DEFAULT_ELEMENTS.filter(e => e.turb).map(e => e.id).concat(["turbine"]));
export const stdOf = (doc, gamme) => Object.fromEntries(Object.entries(((doc && doc.standards) || {})[gammeKey(doc, gamme)] || {}).filter(([k]) => !TURB_STD_OFF.has(k)));
const pOf = (doc, pj) => ((doc && doc.pass) || {})[pj] || {};
const has = v => v != null && String(v).trim() !== "";

// Une ligne du passeport : prévu (cfg sinon standard), écart au standard, réel (avec sa phase et sa source), écart réel ≠ prévu
export function rowOf(doc, pj, gamme, el) {
  const P = pOf(doc, pj), std = stdOf(doc, gamme)[el.id], own = (P.cfg || {})[el.id];
  const planned = has(own) ? own : has(std) ? std : "";
  const real = (P.real || {})[el.id] || null;
  return { el, std: has(std) ? std : "", planned, own: has(own), dev: has(own) && has(std) && String(own) !== String(std), real,
    // un réel plus précis que le prévu (« Inovance MD500 » pour « Inovance ») n’est pas un écart
    gap: !!(real && has(real.v) && has(planned) && !String(real.v).trim().toLowerCase().startsWith(String(planned).trim().toLowerCase())) };
}
export function passportRows(doc, pj, gamme) { return elementsOf(doc).map(el => rowOf(doc, pj, gamme, el)); }

// ── v397 : valeurs réelles venues des autres pages (jamais enregistrées : recalculées à l'affichage)
// Achats / Appro : lignes de la fiche machine du PJ, regroupées par scope, statut d'après le PO (comme la page Achats)
const LEGACY = { besoin: "apasser", consult: "apasser", commande: "envoyee", confirme: "attente", expedie: "attente", recu: "livre" };
export function achatScopes(achatsDoc, pj, todayIso = new Date().toISOString().slice(0, 10)) {
  if (!achatsDoc || !pj) return {};
  const P = String(pj).trim(), fiches = Object.entries(achatsDoc.projets || {}).filter(([, f]) => f && String(f.machine || "").trim() === P).map(([id, f]) => f.id || id), ids = new Set(fiches);
  const po = achatsDoc.po || {}, comp = achatsDoc.composants || {}, out = {};
  Object.values(achatsDoc.lignes || {}).forEach(l => {
    if (!l || !ids.has(l.projetId)) return;
    const art = comp[l.composantId] || Object.values(comp).find(c => c && l.ref && String(c.ref || "").toLowerCase() === String(l.ref).toLowerCase()) || null;
    const sc = String(l.famille || (art && art.famille) || "").trim().toUpperCase(); if (!sc) return;
    const p = l.poId && po[l.poId] && !po[l.poId].annule ? po[l.poId] : null;
    const st = p ? (p.statut || "envoyee") : l.statut === "nc" ? "nc" : l.livreSansPo ? "livre" : (LEGACY[l.statut] || l.statut || "apasser");
    const o = out[sc] || (out[sc] = { lines: 0, livre: 0, cmd: 0, apasser: 0, nc: 0, late: 0, pos: [], refs: [] });
    o.lines++; if (st === "livre") o.livre++; else if (st === "nc") o.nc++; else if (st === "apasser") o.apasser++; else o.cmd++;
    if (p && st !== "livre" && p.dateLivraison && String(p.dateLivraison).slice(0, 10) < todayIso) o.late++;
    if (p && p.numero && !o.pos.includes(p.numero)) o.pos.push(p.numero);
    const ref = (art && art.ref) || l.ref || l.designation || ""; if (ref && !o.refs.includes(ref)) o.refs.push(ref);
  });
  return out;
}
// Turbines › Besoins (turbineOf de pjDossier) : turbines allouées / installées, roue et injecteur réellement posés
export function turbLive(t) {
  if (!t || !t.slots) return {};
  const S = t.slots, src = "Turbines › Besoins", out = {};
  const nums = S.filter(x => x.allouee).map(x => x.num + (x.installee ? " (installée)" : ""));
  if (nums.length) out.turbines = { v: nums.join(", "), phase: "fab", src: src + " · " + nums.length + " / " + S.length + " allouée" + (nums.length > 1 ? "s" : ""), live: true };
  const roues = [...new Set(S.map(x => x.roue).filter(Boolean))]; if (roues.length) out.roue = { v: roues.join(", "), phase: "fab", src, live: true };
  const injs = S.map(x => x.inj).filter(Boolean);
  if (injs.length) { const refs = [...new Set(injs.map(x => x.split(" · ")[0]))], bou = [...new Set(injs.map(x => (x.split(" · ")[1] || "").replace(/\D+/g, "") || "0"))];
    out.injecteur = { v: refs.join(", "), phase: "fab", src, live: true }; out.bouchages = { v: bou.join(", "), phase: "fab", src, live: true }; }
  return out;
}
// Lignes du passeport + valeurs vivantes : un réel saisi à la main l'emporte ; un élément acheté porte l'état de son scope
export function liveRows(rows, live) {
  const L = live || {}, real = L.real || {}, sc = L.scopes || {};
  return rows.map(x => {
    const lv = real[x.el.id] || null, newer = lv && lv.sav && x.real && x.real.v && String(lv.at || "") > String(x.real.at || "").slice(0, 10);
    const r = x.real && x.real.v && !newer ? x.real : lv || null, a = x.el.achat && x.el.scope ? sc[String(x.el.scope).toUpperCase()] || null : null;
    const planned = x.planned;
    const gap = !!(r && r.v && planned && !String(r.v).toLowerCase().includes(String(planned).toLowerCase()) && !String(r.v).toLowerCase().startsWith(String(planned).toLowerCase()));
    return { ...x, real: r, achatSt: a, gap: x.real && x.real.v ? x.gap : gap };
  });
}

// v399 (piste A « à traiter ») : ce qui cloche sur une ligne (null si rien) — rouge = réel ≠ prévu, non conforme, achat en retard ;
// ambre = valeur de design à définir (élément non facultatif), achat à commander
export function rowIssue(x) {
  const a = x.achatSt;
  if (x.gap) return { t: "Réel ≠ prévu", tone: "bad", title: "prévu " + x.planned };
  if (x.real && x.real.bad) return { t: x.real.badT || "À vérifier", tone: "bad", title: x.real.src };
  if (a && a.nc) return { t: a.nc + " non conforme" + (a.nc > 1 ? "s" : ""), tone: "bad" };
  if (a && a.late) return { t: "Achat en retard" + (a.pos.length ? " · " + a.pos[0] : ""), tone: "bad", title: "scope " + x.el.scope };
  if (!x.planned && x.el.phase === "design" && !x.el.opt) return { t: "À définir (design)", tone: "warn" };
  if (a && a.apasser && !(x.real && x.real.v)) return { t: "À commander", tone: "warn", title: "scope " + x.el.scope };
  return null;
}
// état d'une ligne sans problème : livré, commandé, turbines allouées, conforme
export function rowState(x) {
  const a = x.achatSt, r = x.real;
  if (a && a.lines && a.livre === a.lines) return { t: "Livré" + (a.pos.length ? " · " + a.pos[0] : ""), tone: "ok", title: "scope " + x.el.scope };
  if (a && a.cmd) return { t: "Commandé" + (a.pos.length ? " · " + a.pos[0] : ""), tone: "mute", title: "scope " + x.el.scope };
  if (r && r.v && r.live && /allou/.test(r.src || "")) return { t: String(r.src).split(" · ").pop(), tone: "mute" };
  if (r && r.v && r.live) return { t: String(r.src || "").split(" · ")[0], tone: "mute", title: r.src };
  if (r && r.v && x.planned) return { t: "Conforme", tone: "ok" };
  return null;
}

// Avancement par phase : part des éléments de la phase qui ont une valeur (design : prévu ; autres : réel)
export function phaseProgress(doc, pj, gamme, live) {
  const rows = live ? liveRows(passportRows(doc, pj, gamme), live) : passportRows(doc, pj, gamme);
  return PHASES.map(([k, l]) => {
    const R = k === "design" ? rows : rows.filter(r => r.el.phase === k);
    const done = k === "design" ? R.filter(r => has(r.planned)).length : R.filter(r => (r.real && has(r.real.v)) || (r.achatSt && r.achatSt.lines && r.achatSt.livre === r.achatSt.lines)).length;
    return { k, l, total: R.length, done };
  });
}

const histOf = (P, e) => [e, ...(P.hist || [])].slice(0, 300);
// Configuration voulue (design) : valeur égale au standard = on revient au standard (champ retiré)
export function setCfg(doc, pj, gamme, elId, v, by, at = new Date().toISOString()) {
  const P = pOf(doc, pj), cfg = { ...(P.cfg || {}) }, before = rowOf(doc, pj, gamme, elementsOf(doc).find(e => e.id === elId) || { id: elId }).planned;
  const std = stdOf(doc, gamme)[elId];
  if (!has(v) || (has(std) && String(v) === String(std))) delete cfg[elId]; else cfg[elId] = String(v).trim();
  const after = has(cfg[elId]) ? cfg[elId] : has(std) ? std : "";
  if (String(before) === String(after)) return P;
  return { ...P, cfg, hist: histOf(P, { at, by: by || "", phase: "design", el: elId, k: "prévu", from: before, to: after }) };
}
// Valeur réelle sur la machine : saisie par une phase (appro, fab, tests, MES, SAV), source libre (PO, n° de série, intervention…)
export function setReal(doc, pj, elId, v, phase, src, by, at = new Date().toISOString()) {
  const P = pOf(doc, pj), real = { ...(P.real || {}) }, before = (real[elId] && real[elId].v) || "";
  if (!has(v)) delete real[elId]; else real[elId] = { v: String(v).trim(), phase: phase || "fab", src: String(src || "").trim(), by: by || "", at };
  if (String(before) === String(has(v) ? String(v).trim() : "") && !(has(v) && (real[elId].src !== ((P.real || {})[elId] || {}).src))) return P;
  return { ...P, real, hist: histOf(P, { at, by: by || "", phase: phase || "fab", el: elId, k: "réel", from: before, to: has(v) ? String(v).trim() : "" }) };
}

// ── Import du « Tableau configuration machines » (export Excel / CSV : onglets Tableau et Référence) ──────────────────
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// en-têtes du fichier → élément du passeport
const HEAD = [
  ["nb de turbine", "nbTurb"], ["application", "application"], ["integration", "integration"], ["multi orc", "multiOrc"],
  ["target injecteur", "injecteur"], ["target nb bouchages", "bouchages"], ["target roue", "roue"],
  ["actuel injecteur", "injecteur*"], ["actuel nb bouchages", "bouchages*"], ["actuelle roue", "roue*"],
  ["volute", "volute"], ["jacket water", "jacket"], ["connecteurs", "connecteurs"], ["capteurs de vib", "capteursVib"],
  ["marque elec de puissance", "elecPuissance"], ["modele drive", "drive"], ["choke", "choke"], ["schafner", "schaffner"],
  ["optimise cem", "cem"], ["controle v2v", "v2v"], ["cooling de lub", "coolingLub"], ["type de flexible de lub", "flexibleLub"],
  ["pompe de lub", "pompeLub"], ["aerotherme de cooling", "aerotherme"], ["capteur tt03", "tt03"], ["mitraillette fluide", "mitrFluide"],
  ["mitraillette eau", "mitrEau"], ["autres modifications a faire", "autres"], ["regime de neutre", "neutre"],
  ["injection soustirage communs", "injSout"], ["type de presse etoupe", "presseEtoupe"],
];
const headId = h => { const n = norm(h); const hit = HEAD.find(([k]) => n === k || n.startsWith(k)); return hit ? hit[1] : null; };
const clean = v => { const s = String(v == null ? "" : v).trim(); return /^-{3,}$/.test(s) ? "" : s; };
// Onglet « Tableau » : une ligne par machine (colonne PJ). Les colonnes « ACTUEL » donnent le réel (fabrication), « TARGET » le prévu ;
// sans cible, l'actuel sert aussi de prévu.
export function parseConfigTable(rows) {
  const out = { machines: {}, unknown: [] };
  const hi = rows.findIndex(r => (r || []).some(c => norm(c) === "pj"));
  if (hi < 0) return out;
  const H = rows[hi], pjCol = H.findIndex(c => norm(c) === "pj"), gCol = H.findIndex(c => norm(c) === "orc");
  const cols = H.map((h, i) => ({ i, id: headId(h), h })).filter(c => c.i !== pjCol && c.i !== gCol && norm(c.h) && !["nom pj", "s n orc"].includes(norm(c.h)));
  cols.filter(c => !c.id).forEach(c => out.unknown.push(String(c.h).trim()));
  rows.slice(hi + 1).forEach(r => {
    const pj = clean((r || [])[pjCol]).toUpperCase(); if (!/^PJ\d/.test(pj)) return;
    const cfg = {}, real = {};
    cols.forEach(c => { if (!c.id) return; const v = clean(r[c.i]); if (!v) return; if (c.id.endsWith("*")) real[c.id.slice(0, -1)] = v; else cfg[c.id] = v; });
    Object.keys(real).forEach(k => { if (!cfg[k]) cfg[k] = real[k]; });
    out.machines[pj] = { gamme: clean(r[gCol]), cfg, real };
  });
  return out;
}
// Onglet « Référence » : en-têtes sur la 2e ligne (Volute, Jacket water, Intérieur…) et une ligne par gamme (colonne B).
// Les colonnes « Intérieur / Extérieur », « Terrestre / Maritime », « Oui / Non » du fichier sont des listes de choix, pas des standards : ignorées.
export function parseReference(rows) {
  const hi = rows.findIndex(r => (r || []).some(c => norm(c) === "volute"));
  if (hi < 0) return {};
  const H = rows[hi], std = {};
  rows.slice(hi + 1).forEach(r => {
    const g = clean((r || [])[1]); if (!g) return;
    const S = {};
    H.forEach((h, i) => { const id = headId(h); const v = clean(r[i]); if (id && !id.endsWith("*") && v) S[id] = v; });
    std[g] = S;
  });
  return std;
}
// Plan d'import : on n'écrase jamais une valeur déjà saisie dans le Cockpit (même règle que la reprise de l'historique SAV)
export function importPlan(doc, table, reference, by, at = new Date().toISOString()) {
  const pass = { ...((doc && doc.pass) || {}) }, standards = { ...((doc && doc.standards) || {}) };
  let nStd = 0, nPj = 0, nVals = 0;
  Object.entries(reference || {}).forEach(([g, S]) => { const cur = standards[g] || {}; const add = Object.fromEntries(Object.entries(S).filter(([k]) => !has(cur[k]))); if (Object.keys(add).length) { standards[g] = { ...cur, ...add }; nStd++; } });
  Object.entries((table && table.machines) || {}).forEach(([pj, m]) => {
    const P = pass[pj] || {}, cfg = { ...(P.cfg || {}) }, real = { ...(P.real || {}) }; let n = 0;
    const std = standards[m.gamme] || {};
    Object.entries(m.cfg).forEach(([k, v]) => { if (!has(cfg[k]) && String(std[k] || "") !== v) { cfg[k] = v; n++; } });
    Object.entries(m.real).forEach(([k, v]) => { if (!real[k]) { real[k] = { v, phase: "fab", src: "Tableau configuration machines", by: by || "", at }; n++; } });
    if (n) { pass[pj] = { ...P, cfg, real, hist: [{ at, by: by || "", phase: "design", el: "*", k: "import", from: "", to: n + " valeur" + (n > 1 ? "s" : "") + " reprise" + (n > 1 ? "s" : "") + " du tableau" }, ...(P.hist || [])].slice(0, 300) }; nPj++; nVals += n; }
  });
  return { pass, standards, nStd, nPj, nVals };
}
