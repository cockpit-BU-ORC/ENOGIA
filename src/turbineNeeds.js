// v270 (demandé : « la production produit des turbines ; dans les besoins, une liste des PJ, et on prend dans une liste de turbines
// disponibles pour les glisser sur un PJ ; garder les besoins SAV ; sur chaque fiche projet, la turbine (2×100 kW, 100 kW, 20 kW,
// 2×40 kW), la roue et l'injecteur (listes définies avec le responsable turbines) ; une turbine libre / terminée prise dans la production
// doit sortir de son stock ; les besoins doivent remonter dans son planning : on attend cette turbine avec cette roue et cet injecteur
// pour telle date ; pareil pour le SAV »).
// Calculs purs (testés dans turbineNeeds.test.js) :
//  · besoins = PJ en cours (configuration de la fiche projet, sinon déduite de la gamme) + besoins SAV (planning/prodTurbines.besoins) ;
//  · une turbine est rattachée à un besoin par son champ `besoin` (« pj:PJ479-1 » / « sav:<id> »), sinon par son « Affaire » (ancien usage) ;
//  · attribuer = écrire la turbine (affaire, besoin, roue si vide) ; une turbine **prête** sort du stock (livree = aujourd'hui, sortieOrc)
//    et prend un injecteur vierge du stock (injPris) ; retirer l'attribution remet tout comme avant.
import { createContext } from "react";
import { makeModel, EMPTY_PROD } from "./components/ProdTurbines";
import { turbinesNeeded } from "./turbines";

export const TURB_CFGS = [
  { id: "2x100", l: "2 × 100 kW", n: 2, g: "100" },
  { id: "100", l: "100 kW", n: 1, g: "100" },
  { id: "20", l: "20 kW", n: 1, g: "20" },
  { id: "2x40", l: "2 × 40 kW", n: 2, g: "20" }, // les ORC 40 kW reçoivent des turbines de la ligne 20 kW (comme avant : « 20 kW, gammes 20 et 40 »)
];
export const cfgById = id => TURB_CFGS.find(c => c.id === id) || null;
// Configuration par défaut d'après la gamme du PJ (100 → 100 kW, 180 → 2 × 100 kW, 20 → 20 kW, 40 → 2 × 40 kW)
export function defaultCfg(gamme) {
  const n = turbinesNeeded(gamme); if (!n) return null;
  return n.type === "20LT" ? (n.n > 1 ? "2x40" : "20") : (n.n > 1 ? "2x100" : "100");
}
export const pjCfg = (meta, gamme) => cfgById((meta && meta.turbCfg) || defaultCfg(gamme));

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
const gammeOf = x => (x && String(x.gamme) === "20" ? "20" : "100");
// Même lecture que la page de production : éléments de la gamme, identifiant repris de la clé, durées du 20 kW dans params.r20
export function prodState(doc, g) {
  const d = doc || {}, dp = d.params || {};
  const o = { ...EMPTY_PROD, ...d, gamme: g, params: g === "20" ? { d: {}, l: {}, ...(dp.r20 || {}) } : { d: {}, l: {}, ...dp } };
  COLLS.forEach(c => { o[c] = Object.fromEntries(Object.entries(d[c] || {}).filter(([, v]) => gammeOf(v) === g).map(([k, v]) => [k, { ...v, id: k }])); });
  return o;
}
const isWork = d => d.getDay() % 6 !== 0;
export const isoDay = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function workDate(n, from = new Date()) { const d = new Date(from); d.setHours(0, 0, 0, 0); while (!isWork(d)) d.setDate(d.getDate() + 1); let k = Math.ceil(n || 0); while (k > 0) { d.setDate(d.getDate() + 1); if (isWork(d)) k--; } return isoDay(d); }
export const isoOf = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : isoDay(d); };
// PJ du planning désigné par le champ « Affaire » (« PJ479-1 - EDF PEI » → PJ479-1) : le plus long numéro qui commence le texte
export function pjOfAffaire(aff, pjs) {
  const a = String(aff || "").trim().toUpperCase(); if (!a) return null;
  let best = null;
  (pjs || []).forEach(p => { const P = String(p).toUpperCase(); if (a.startsWith(P) && !/[A-Z0-9-]/.test(a.charAt(P.length)) && (!best || P.length > best.length)) best = p; });
  return best;
}
// Références de roues / d'injecteurs définies dans la production (pour une gamme, ou toutes)
export function refsOf(doc, c, g) {
  const s = new Set(); Object.values((doc && doc[c]) || {}).forEach(x => { if (x && x.ref && (!g || gammeOf(x) === g)) s.add(String(x.ref)); });
  return [...s].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
}
const stockOf = (doc, c, ref) => Object.entries((doc && doc[c]) || {}).find(([, x]) => x && String(x.ref || "").toUpperCase() === String(ref || "").toUpperCase()) || null;
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");

// Toutes les turbines de la production, avec leur date de fin prévue
export function allTurbines(doc, today = new Date()) {
  const out = [];
  ["100", "20"].forEach(g => {
    const S = prodState(doc, g), M = makeModel(S);
    Object.values(S.turbines).forEach(t => {
      const sc = M.sch[t.id] || {}, ready = t.step === "ok", end = t.livree || ready ? isoDay(today) : sc.end != null ? workDate(sc.end, today) : null;
      out.push({ id: t.id, raw: t, num: t.num || "", gamme: g, step: M.lbl(t.step), ready, end, livree: t.livree || "", missing: !!sc.missing, roue: t.roue || "", affaire: t.affaire || "", besoin: t.besoin || "" });
    });
  });
  return out;
}

// Besoins (PJ en cours + SAV) et turbines disponibles
export function buildNeeds(doc, rows, metaOf, today = new Date()) {
  const open = (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE");
  const ids = (rows || []).map(r => r.pj), openIds = new Set(open.map(r => r.pj));
  const needs = [];
  open.forEach(r => { const m = (metaOf && metaOf(r)) || {}, cfg = pjCfg(m, r.gamme); if (!cfg && !m.turbCfg) return;
    needs.push({ key: "pj:" + r.pj, kind: "pj", pj: r.pj, label: r.pj, sub: m.nomProjet || "", r, cfg, cfgSet: !!m.turbCfg, roue: m.turbRoue || "", inj: m.turbInj || "", date: isoOf(r.arrivee) }); });
  Object.entries((doc && doc.besoins) || {}).forEach(([id, b]) => { if (!b || b.done) return;
    needs.push({ key: "sav:" + id, kind: "sav", id, label: b.label || "SAV", sub: b.note || "", raw: b, cfg: cfgById(b.cfg) || TURB_CFGS[1], cfgSet: true, roue: b.roue || "", inj: b.inj || "", date: isoOf(b.date) }); });
  const keys = new Set(needs.map(n => n.key));
  const turbs = allTurbines(doc, today), by = {}, free = [];
  turbs.forEach(x => {
    const k = x.besoin || (() => { const pj = pjOfAffaire(x.affaire, ids); return pj ? "pj:" + pj : null; })(); // une turbine attribuée (même à un PJ expédié ou un SAV terminé) n’est plus disponible
    if (k) { if (keys.has(k)) (by[k] = by[k] || []).push(x); return; }
    if (!x.livree) free.push(x);
  });
  needs.forEach(n => {
    const got = by[n.key] || [], issues = [], want = n.cfg ? n.cfg.n : 0;
    if (want > got.length) issues.push({ bad: true, t: (want - got.length) + " turbine" + (want - got.length > 1 ? "s" : "") + " à attribuer" });
    if (n.kind === "pj" && !n.cfgSet && n.cfg) issues.push({ bad: false, t: "configuration déduite de la gamme : à confirmer dans la fiche projet" });
    if (!n.roue) issues.push({ bad: false, t: "roue à choisir" });
    if (!n.inj) issues.push({ bad: false, t: "injecteur à choisir" });
    got.forEach(x => {
      if (n.cfg && x.gamme !== n.cfg.g) issues.push({ bad: true, t: (x.num || "Turbine") + " : " + x.gamme + " kW au lieu de " + n.cfg.g + " kW" });
      if (n.roue && x.roue && x.roue !== n.roue) issues.push({ bad: true, t: (x.num || "Turbine") + " : roue " + x.roue + " au lieu de " + n.roue });
      if (x.missing && !x.ready && !x.livree) issues.push({ bad: true, t: (x.num || "Turbine") + " : pas d'arbre prévu" });
      else if (!x.ready && !x.livree && x.end && n.date && x.end > n.date) issues.push({ bad: true, t: (x.num || "Turbine") + " prête le " + fd(x.end) + ", après le besoin du " + fd(n.date) });
    });
    Object.assign(n, { got, issues, want });
  });
  needs.sort((a, b) => String(a.date || "9").localeCompare(String(b.date || "9")) || a.label.localeCompare(b.label));
  free.sort((a, b) => (b.ready - a.ready) || String(a.end || "9").localeCompare(String(b.end || "9")) || a.num.localeCompare(b.num));
  return { needs, free, openIds };
}

// Écritures pour attribuer une turbine à un besoin. Renvoie { writes: [{ c, id, data }], msg, warn }
export function assignOps(doc, x, need, today = new Date()) {
  const t = { ...x.raw }; delete t.id;
  const writes = [], notes = [];
  t.besoin = need.key; t.affaire = need.kind === "pj" ? need.label + (need.sub ? " - " + need.sub : "") : "SAV · " + need.label;
  if (need.roue && !t.roue) { t.roue = need.roue; notes.push("roue " + need.roue + " attribuée"); }
  let warn = need.roue && x.roue && x.roue !== need.roue ? "La turbine a déjà la roue " + x.roue + " (demandée : " + need.roue + ")." : "";
  if (x.ready && !x.livree) {
    t.livree = isoDay(today); t.sortieOrc = isoDay(today); notes.push("sortie du stock de la production");
    if (need.inj) { const s = stockOf(doc, "injecteurs", need.inj);
      if (s && (+s[1].qte || 0) > 0) { const inj = { ...s[1] }; delete inj.id; inj.qte = (+inj.qte || 0) - 1; writes.push({ c: "injecteurs", id: s[0], data: inj }); t.injPris = s[0]; notes.push("1 injecteur " + need.inj + " sorti du stock"); }
      else warn = (warn ? warn + " " : "") + "Pas d'injecteur " + need.inj + " vierge en stock : à sortir à la main."; }
    if (t.arbreId && doc.arbres && doc.arbres[t.arbreId] && !doc.arbres[t.arbreId].livree) { const a = { ...doc.arbres[t.arbreId], livree: isoDay(today) }; delete a.id; writes.push({ c: "arbres", id: t.arbreId, data: a }); }
  } else if (need.inj) t.injDemande = need.inj;
  writes.unshift({ c: "turbines", id: x.id, data: t });
  return { writes, msg: (x.num || "Turbine") + " → " + need.label + (notes.length ? " (" + notes.join(", ") + ")" : ""), warn };
}
// Retirer l'attribution : la turbine redevient disponible ; si elle était sortie du stock par l'attribution, elle y revient (avec son injecteur)
export function unassignOps(doc, x) {
  const t = { ...x.raw }; delete t.id; const writes = [];
  const fromStock = !!t.sortieOrc;
  delete t.besoin; delete t.injDemande; t.affaire = "";
  if (fromStock) {
    delete t.livree; delete t.sortieOrc;
    if (t.injPris && doc.injecteurs && doc.injecteurs[t.injPris]) { const inj = { ...doc.injecteurs[t.injPris] }; delete inj.id; inj.qte = (+inj.qte || 0) + 1; writes.push({ c: "injecteurs", id: t.injPris, data: inj }); }
    delete t.injPris;
    if (t.arbreId && doc.arbres && doc.arbres[t.arbreId] && doc.arbres[t.arbreId].livree) { const a = { ...doc.arbres[t.arbreId] }; delete a.id; delete a.livree; writes.push({ c: "arbres", id: t.arbreId, data: a }); }
  }
  writes.unshift({ c: "turbines", id: x.id, data: t });
  return { writes, msg: (x.num || "Turbine") + " retirée" + (fromStock ? " et remise dans le stock de la production" : "") };
}

// Demandes pour le planning de la production (page de Jérémie) : une ligne par besoin non couvert ou en cours
export function demandesOf(needs) {
  return (needs || []).filter(n => n.cfg).map(n => ({ key: n.key, kind: n.kind, label: n.label, sub: n.sub, date: n.date, gamme: n.cfg.g, n: n.cfg.n, cfg: n.cfg.l, roue: n.roue, inj: n.inj,
    turbines: n.got.map(x => ({ num: x.num, ready: x.ready || !!x.livree, end: x.end, livree: x.livree })), manque: Math.max(0, n.cfg.n - n.got.length) }))
    .filter(d => d.manque > 0 || d.turbines.some(t => !t.livree));
}

// Document de la production turbines, fourni par App (fiche projet : listes de roues et d’injecteurs)
export const ProdDocCtx = createContext(null);
