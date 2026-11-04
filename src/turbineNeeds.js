// v270 (demandé : « la production produit des turbines ; dans les besoins, une liste des PJ, et on prend dans une liste de turbines
// disponibles pour les glisser sur un PJ ; garder les besoins SAV ; sur chaque fiche projet, la turbine (2×100 kW, 100 kW, 20 kW,
// 2×40 kW), la roue et l'injecteur ; une turbine libre / terminée prise dans la production doit sortir de son stock »).
// v271 (demandé : « différencier les turbines prêtes avec et sans roue ; avoir aussi le stock de roues et d'injecteurs prêts pour faire un
// glisser-déposer ; tout glisser-déposer met à jour le stock de Jérémie ; pour chaque PJ, la roue et l'injecteur à installer signalés ;
// l'injecteur peut être à boucher : indiquer le nombre de bouchages ») :
//  · un besoin (PJ en cours ou SAV) a autant d'emplacements que de turbines ; chaque emplacement = turbine + roue + injecteur ;
//  · turbine : champ `besoin` (« pj:PJ » / « sav:id ») ; une turbine prête (avec roue) ou testée sans roue sort du stock (livree, sortieOrc) ;
//  · roue / injecteur : `planning/prodTurbines.allocs[id] = { besoin, slot, kind: "roue"|"inj", stockId, ref, bouches, at }` ;
//    la quantité du stock (roues.qte, injecteurs.qte vierges ou variantes[bouches].qte) baisse de 1, et revient si on retire l'élément ;
//  · une turbine qui a déjà sa roue montée couvre la roue de son emplacement.
// Calculs purs, testés dans turbineNeeds.test.js.
import { createContext } from "react";
import { makeModel, EMPTY_PROD } from "./components/ProdTurbines";
import { turbinesNeeded } from "./turbines";

export const TURB_CFGS = [
  { id: "2x100", l: "2 × 100 kW", n: 2, g: "100" },
  { id: "100", l: "100 kW", n: 1, g: "100" },
  { id: "20", l: "20 kW", n: 1, g: "20" },
  { id: "2x40", l: "2 × 40 kW", n: 2, g: "20" }, // les ORC 40 kW reçoivent des turbines de la ligne 20 kW
];
export const cfgById = id => TURB_CFGS.find(c => c.id === id) || null;
export function defaultCfg(gamme) {
  const n = turbinesNeeded(gamme); if (!n) return null;
  return n.type === "20LT" ? (n.n > 1 ? "2x40" : "20") : (n.n > 1 ? "2x100" : "100");
}
export const pjCfg = (meta, gamme) => cfgById((meta && meta.turbCfg) || defaultCfg(gamme));

const COLLS = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
const gammeOf = x => (x && String(x.gamme) === "20" ? "20" : "100");
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
export function pjOfAffaire(aff, pjs) {
  const a = String(aff || "").trim().toUpperCase(); if (!a) return null;
  let best = null;
  (pjs || []).forEach(p => { const P = String(p).toUpperCase(); if (a.startsWith(P) && !/[A-Z0-9-]/.test(a.charAt(P.length)) && (!best || P.length > best.length)) best = p; });
  return best;
}
const U = v => String(v || "").trim().toUpperCase();
export function refsOf(doc, c, g) {
  const s = new Set(); Object.values((doc && doc[c]) || {}).forEach(x => { if (x && x.ref && (!g || gammeOf(x) === g)) s.add(String(x.ref)); });
  return [...s].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
}
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");
const vars = r => (r.variantes || []).filter(v => (+v.qte || 0) > 0);
// Stock de roues et d'injecteurs d'une gamme : une tuile par référence (roues) ; injecteurs : vierges + une tuile par nombre de bouchages
export function stockTiles(doc, g) {
  const roues = Object.entries((doc && doc.roues) || {}).filter(([, r]) => r && gammeOf(r) === g).map(([id, r]) => ({ kind: "roue", stockId: id, ref: String(r.ref || ""), qte: +r.qte || 0, g }))
    .sort((a, b) => a.ref.localeCompare(b.ref, "fr", { numeric: true }));
  const injs = [];
  Object.entries((doc && doc.injecteurs) || {}).filter(([, r]) => r && gammeOf(r) === g).sort((a, b) => String(a[1].ref).localeCompare(String(b[1].ref), "fr", { numeric: true })).forEach(([id, r]) => {
    injs.push({ kind: "inj", stockId: id, ref: String(r.ref || ""), bouches: null, qte: +r.qte || 0, ouv: +r.ouvertures || 0, g });
    vars(r).sort((a, b) => a.bouches - b.bouches).forEach(v => injs.push({ kind: "inj", stockId: id, ref: String(r.ref || ""), bouches: +v.bouches, qte: +v.qte || 0, ouv: +r.ouvertures || 0, g }));
  });
  return { roues, injs };
}
// Injecteur d'une référence : ouvertures (pour borner les bouchages) et quantités prêtes
export function injInfo(doc, ref) {
  const e = Object.entries((doc && doc.injecteurs) || {}).find(([, r]) => r && U(r.ref) === U(ref)); if (!e) return null;
  const r = e[1]; return { id: e[0], ouv: +r.ouvertures || 0, vierges: +r.qte || 0, variantes: vars(r).map(v => ({ bouches: +v.bouches, qte: +v.qte || 0 })) };
}
export const maxBouches = ouv => (ouv > 0 ? ouv - 1 : 99); // comme la production : il reste au moins une ouverture

// Toutes les turbines de la production, avec leur date de fin prévue
export function allTurbines(doc, today = new Date()) {
  const out = [];
  ["100", "20"].forEach(g => {
    const S = prodState(doc, g), M = makeModel(S);
    Object.values(S.turbines).forEach(t => {
      const sc = M.sch[t.id] || {}, ready = t.step === "ok", sansRoue = t.step === "s1", dispo = ready || sansRoue;
      const end = t.livree || dispo ? isoDay(today) : sc.end != null ? workDate(sc.end, today) : null;
      out.push({ id: t.id, raw: t, num: t.num || "", gamme: g, step: M.lbl(t.step), ready, sansRoue, dispo, end, livree: t.livree || "", missing: !!sc.missing, roue: t.roue || "", affaire: t.affaire || "", besoin: t.besoin || "" });
    });
  });
  return out;
}

// Besoins (PJ en cours + SAV), emplacements, turbines disponibles
export function buildNeeds(doc, rows, metaOf, today = new Date()) {
  const open = (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE");
  const ids = (rows || []).map(r => r.pj);
  const needs = [];
  open.forEach(r => { const m = (metaOf && metaOf(r)) || {}, cfg = pjCfg(m, r.gamme); if (!cfg) return;
    needs.push({ key: "pj:" + r.pj, kind: "pj", pj: r.pj, label: r.pj, sub: m.nomProjet && m.nomProjet !== "—" ? m.nomProjet : "", r, cfg, cfgSet: !!m.turbCfg, roue: m.turbRoue || "", inj: m.turbInj || "", injB: m.turbInjB == null ? null : +m.turbInjB, date: isoOf(r.arrivee) }); });
  Object.entries((doc && doc.besoins) || {}).forEach(([id, b]) => { if (!b || b.done) return;
    needs.push({ key: "sav:" + id, kind: "sav", id, label: b.label || "SAV", sub: b.note || "", raw: b, cfg: cfgById(b.cfg) || TURB_CFGS[1], cfgSet: true, roue: b.roue || "", inj: b.inj || "", injB: b.injB == null || b.injB === "" ? null : +b.injB, date: isoOf(b.date) }); });
  const keys = new Set(needs.map(n => n.key));
  const turbs = allTurbines(doc, today), by = {}, free = [];
  turbs.forEach(x => {
    const k = x.besoin || (() => { const pj = pjOfAffaire(x.affaire, ids); return pj ? "pj:" + pj : null; })();
    if (k) { if (keys.has(k)) (by[k] = by[k] || []).push(x); return; }
    if (!x.livree) free.push(x);
  });
  const allocs = Object.entries((doc && doc.allocs) || {}).map(([id, a]) => ({ id, ...a }));
  needs.forEach(n => {
    const got = by[n.key] || [], want = n.cfg.n, issues = [];
    const mine = allocs.filter(a => a.besoin === n.key);
    const slots = [];
    for (let i = 0; i < Math.max(want, got.length); i++) {
      const t = got[i] || null;
      const roue = mine.find(a => a.kind === "roue" && +a.slot === i) || null, inj = mine.find(a => a.kind === "inj" && +a.slot === i) || null;
      const roueMontee = t && t.roue && !t.sansRoue ? t.roue : "";
      slots.push({ i, t, roue, inj, roueMontee, roueOk: !!(roue || roueMontee), extra: i >= want });
    }
    if (want > got.length) issues.push({ bad: true, t: (want - got.length) + " turbine" + (want - got.length > 1 ? "s" : "") + " à attribuer" });
    slots.forEach(s => {
      const t = s.t, nm = t ? t.num || "Turbine" : "Emplacement " + (s.i + 1);
      if (t && t.gamme !== n.cfg.g) issues.push({ bad: true, t: nm + " : " + t.gamme + " kW au lieu de " + n.cfg.g + " kW" });
      const rr = s.roue ? s.roue.ref : s.roueMontee;
      if (n.roue && rr && U(rr) !== U(n.roue)) issues.push({ bad: true, t: nm + " : roue " + rr + " au lieu de " + n.roue });
      if (n.inj && s.inj && U(s.inj.ref) !== U(n.inj)) issues.push({ bad: true, t: nm + " : injecteur " + s.inj.ref + " au lieu de " + n.inj });
      if (s.inj && n.injB != null && s.inj.bouches != null && +s.inj.bouches !== n.injB) issues.push({ bad: true, t: nm + " : injecteur à " + s.inj.bouches + " bouchages au lieu de " + n.injB });
      if (t && !t.dispo && !t.livree && t.missing) issues.push({ bad: true, t: nm + " : pas d'arbre prévu" });
      else if (t && !t.dispo && !t.livree && t.end && n.date && t.end > n.date) issues.push({ bad: true, t: nm + " prête le " + fd(t.end) + ", après le besoin du " + fd(n.date) });
    });
    const roueMiss = slots.filter(s => !s.extra && !s.roueOk).length, injMiss = slots.filter(s => !s.extra && !s.inj).length;
    Object.assign(n, { got, want, slots, issues, roueMiss, injMiss, complete: got.length >= want && !roueMiss && !injMiss });
  });
  needs.sort((a, b) => String(a.date || "9").localeCompare(String(b.date || "9")) || a.label.localeCompare(b.label));
  free.sort((a, b) => (b.ready - a.ready) || (b.sansRoue - a.sansRoue) || String(a.end || "9").localeCompare(String(b.end || "9")) || a.num.localeCompare(b.num));
  return { needs, free };
}

const clean = o => { const x = { ...o }; delete x.id; return x; };
// Turbine → emplacement d'un besoin. Une turbine disponible (prête ou testée sans roue) sort du stock (avec son arbre).
export function assignOps(doc, x, need, today = new Date()) {
  const t = clean(x.raw), writes = [];
  t.besoin = need.key; t.affaire = need.kind === "pj" ? need.label + (need.sub ? " - " + need.sub : "") : "SAV · " + need.label;
  let note = "réservée";
  if (x.dispo && !x.livree) {
    t.livree = isoDay(today); t.sortieOrc = isoDay(today); note = "sortie du stock de la production";
    if (t.arbreId && doc.arbres && doc.arbres[t.arbreId] && !doc.arbres[t.arbreId].livree) writes.push({ c: "arbres", id: t.arbreId, data: { ...clean(doc.arbres[t.arbreId]), livree: isoDay(today) } });
  }
  writes.unshift({ c: "turbines", id: x.id, data: t });
  const warn = need.roue && x.roue && !x.sansRoue && U(x.roue) !== U(need.roue) ? "Elle a déjà la roue " + x.roue + " (prévue : " + need.roue + ")." : "";
  return { writes, msg: (x.num || "Turbine") + " → " + need.label + " (" + note + ")", warn };
}
export function unassignOps(doc, x) {
  const t = clean(x.raw), writes = [], fromStock = !!t.sortieOrc;
  delete t.besoin; delete t.injDemande; t.affaire = "";
  if (fromStock) {
    delete t.livree; delete t.sortieOrc;
    if (t.injPris && doc.injecteurs && doc.injecteurs[t.injPris]) writes.push({ c: "injecteurs", id: t.injPris, data: { ...clean(doc.injecteurs[t.injPris]), qte: (+doc.injecteurs[t.injPris].qte || 0) + 1 } });
    delete t.injPris;
    if (t.arbreId && doc.arbres && doc.arbres[t.arbreId] && doc.arbres[t.arbreId].livree) { const a = clean(doc.arbres[t.arbreId]); delete a.livree; writes.push({ c: "arbres", id: t.arbreId, data: a }); }
  }
  writes.unshift({ c: "turbines", id: x.id, data: t });
  return { writes, msg: (x.num || "Turbine") + " retirée" + (fromStock ? " et remise dans le stock de la production" : "") };
}
// Quantité d'une tuile de stock modifiée de d (roue : qte ; injecteur : vierges ou variante « bouches »)
function bump(doc, tile, d) {
  const c = tile.kind === "roue" ? "roues" : "injecteurs", cur = doc && doc[c] && doc[c][tile.stockId]; if (!cur) return null;
  const x = clean(cur);
  if (tile.kind === "inj" && tile.bouches != null) {
    const v = (x.variantes || []).map(y => ({ ...y })), k = v.find(y => +y.bouches === +tile.bouches);
    if (k) k.qte = Math.max(0, (+k.qte || 0) + d); else if (d > 0) v.push({ bouches: +tile.bouches, qte: d }); else return null;
    x.variantes = v.filter(y => (+y.qte || 0) > 0);
  } else x.qte = Math.max(0, (+x.qte || 0) + d);
  return { c, id: tile.stockId, data: x };
}
// Roue ou injecteur du stock → emplacement i d'un besoin : le stock baisse de 1, une allocation garde la trace
export function allocOps(doc, need, slot, tile, today = new Date(), newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)) {
  if (!tile || tile.qte <= 0) return { error: "Plus de " + (tile && tile.kind === "roue" ? "roue " : "injecteur ") + ((tile && tile.ref) || "") + " en stock." };
  const s = need.slots[slot]; if (!s) return { error: "Emplacement introuvable." };
  if (tile.kind === "roue" && (s.roue || s.roueMontee)) return { error: "Cet emplacement a déjà sa roue." };
  if (tile.kind === "inj" && s.inj) return { error: "Cet emplacement a déjà son injecteur." };
  const st = bump(doc, tile, -1); if (!st) return { error: "Stock introuvable." };
  const id = newId(), a = { besoin: need.key, slot, kind: tile.kind, stockId: tile.stockId, ref: tile.ref, at: isoDay(today) };
  if (tile.kind === "inj") a.bouches = tile.bouches == null ? null : +tile.bouches;
  const warn = tile.kind === "roue" ? (need.roue && U(need.roue) !== U(tile.ref) ? "Roue prévue : " + need.roue + "." : "")
    : (need.inj && U(need.inj) !== U(tile.ref) ? "Injecteur prévu : " + need.inj + "." : need.injB != null && tile.bouches == null && need.injB > 0 ? "Injecteur vierge : " + need.injB + " bouchage" + (need.injB > 1 ? "s" : "") + " à faire." : need.injB != null && tile.bouches != null && +tile.bouches !== need.injB ? "Prévu : " + need.injB + " bouchages." : "");
  return { writes: [st, { c: "allocs", id, data: a }], msg: (tile.kind === "roue" ? "Roue " : "Injecteur ") + tile.ref + (tile.bouches != null ? " (" + tile.bouches + " bouchages)" : "") + " → " + need.label + " · sorti du stock", warn };
}
export function unallocOps(doc, alloc) {
  const st = bump(doc, { kind: alloc.kind, stockId: alloc.stockId, bouches: alloc.kind === "inj" ? alloc.bouches : null }, +1);
  return { writes: st ? [st] : [], dels: [{ c: "allocs", id: alloc.id }], msg: (alloc.kind === "roue" ? "Roue " : "Injecteur ") + alloc.ref + " remis en stock" };
}

// Document de la production turbines, fourni par App (fiche projet : listes de roues et d’injecteurs)
export const ProdDocCtx = createContext(null);
