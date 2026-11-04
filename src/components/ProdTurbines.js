// v226 (demandé : « une nouvelle page, disponible uniquement au directeur de production turbines et à moi ; intégrer son .md en
// gardant tout le design du site ») : reprise de l'outil « Production turbines » du directeur (artifact claude.ai) dans le site —
// Accueil (turbines prêtes, testées sans roue, stocks de roues et d'injecteurs, dates prévisionnelles), Planning (pièces : appro,
// contrôle qualité, non-conformités ; tableau des turbines et des arbres, glisser une carte sur sa ligne pour changer d'étape),
// Stocks roues & injecteurs, Gamme & durées (+ accès, propriétaire). Mêmes règles de calcul que l'original : jours ouvrés
// (lundi–vendredi), durées de la gamme moins le temps déjà passé, un arbre « Disponible » requis pour l'assemblage (affecté
// automatiquement, le premier carter terminé prend le premier arbre prêt), une roue requise pour le banc avec roue.
// Données : document Firestore planning/prodTurbines (préfixe beta_ en bêta), une entrée par élément (écritures fusionnées).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF, stageSoft, alertSoft } from "../theme";
import { PageHead, NavIcon } from "./SharedUI";

// ===== DÉBUT PAGE (kit Jérémie : tout ce qui suit jusqu’à FIN PAGE est échangé avec son Claude — scripts/prodturb-kit.js / prodturb-import.js) =====

/* ---------- Gamme de montage (reprise de l'original) ---------- */
const PHASES = { att: "À lancer", carter: "Montage carter", assy: "Assemblage / finition", tests: "Tests", ok: "Prête", arbre: "Arbre", dispo: "Disponible", stock: "Stock", roue: "Équilibrage des roues", reco: "Contrôle et démontage", recond: "Reconditionnement", fin: "Réintégration" };
export const T_STEPS = [
  { id: "att", ph: "att", l: "À lancer", d: 0 },
  { id: "c1", ph: "carter", l: "Montage génératrice", d: 1 },
  { id: "c2", ph: "carter", l: "Montage chemisage", d: 1 },
  { id: "c3", ph: "carter", l: "Étanchéité chemisage", d: 0.5 },
  { id: "c4", ph: "carter", l: "Montage raccords + liner", d: 1 },
  { id: "c5", ph: "carter", l: "Montage presse-étoupes", d: 0.5 },
  { id: "c6", ph: "carter", l: "Câblage", d: 1 },
  { id: "cc", ph: "stock", l: "Carter câblé", d: 0 },
  { id: "a1", ph: "assy", l: "Assemblage rotor dans stator", d: 1 },
  { id: "a2", ph: "assy", l: "Pose couvercle AR", d: 0.5 },
  { id: "a3", ph: "assy", l: "Pose isolant + ressorts", d: 0.5 },
  { id: "a4", ph: "assy", l: "Précharge", d: 0.5 },
  { id: "a5", ph: "assy", l: "Contrôle faux-rond", d: 0.5 },
  { id: "t1", ph: "tests", l: "Test d'étanchéité", d: 0.5 },
  { id: "t2", ph: "tests", l: "Banc d'essai : lubrification", d: 1 },
  { id: "t3", ph: "tests", l: "Banc d'essai : sans roue", d: 1 },
  { id: "s1", ph: "stock", l: "Stock testée sans roue", d: 0 },
  { id: "t4", ph: "tests", l: "Banc d'essai : avec roue", d: 1 },
  { id: "ok", ph: "ok", l: "Prête", d: 0 },
];
export const A_STEPS = [
  { id: "b0", ph: "att", l: "À lancer", d: 0 },
  { id: "b1", ph: "arbre", l: "Montage aimant", d: 1 },
  { id: "bp", ph: "arbre", l: "Préparation envoi équilibrage", d: 0.5 },
  { id: "b2", ph: "arbre", l: "Équilibrage (SST)", d: 10 },
  { id: "b3", ph: "arbre", l: "Contrôle de l'équilibrage", d: 0.5 },
  { id: "b4", ph: "arbre", l: "Montage roulements", d: 0.5 },
  { id: "b5", ph: "arbre", l: "Montage douille", d: 0.5 },
  { id: "b6", ph: "dispo", l: "Disponible", d: 0 },
];
const TI = Object.fromEntries(T_STEPS.map((s, i) => [s.id, i]));
const AI = Object.fromEntries(A_STEPS.map((s, i) => [s.id, i]));
// Lots de roues à équilibrer (pièces au statut "equil") : après le contrôle qualité, jusqu'au stock de roues équilibrées.
const R_STEPS = [
  { id: "r1", ph: "roue", l: "Préparation envoi équilibrage", d: 0.5 },
  { id: "r2", ph: "roue", l: "Équilibrage (SST)", d: 10 },
  { id: "r3", ph: "dispo", l: "Équilibrées, en stock", d: 0 },
];
const RI = Object.fromEntries(R_STEPS.map((s, i) => [s.id, i]));
// Turbines reconditionnées (pièces au statut "reco") : contrôles OK / NOK à chaque étape, puis réintégration de l'arbre et du carter câblé.
// Q_STEPS : turbine entière (contrôle et démontage) ; à « Dissociée », elle devient un arbre (QA_STEPS) et un carter câblé (QC_STEPS).
const Q_STEPS = [
  { id: "q1", ph: "reco", l: "Contrôle turbine assemblée", d: 0.5 },
  { id: "q2", ph: "reco", l: "Démontage roue", d: 0.5 },
  { id: "q3", ph: "reco", l: "Démontage couvercle AR / isolant", d: 0.5 },
  { id: "q4", ph: "reco", l: "Démontage rotor / stator", d: 0.5 },
  { id: "qd", ph: "fin", l: "Dissociée", d: 0 },
];
const QA_STEPS = [
  { id: "q5", ph: "recond", l: "Reconditionnement arbre", d: 0.5 },
  { id: "qaf", ph: "fin", l: "Terminé", d: 0 },
];
const QC_STEPS = [
  { id: "q6", ph: "recond", l: "Reconditionnement carter câblé", d: 0.5 },
  { id: "q7", ph: "recond", l: "Décâblage", d: 0.5 },
  { id: "qcf", ph: "fin", l: "Terminé", d: 0 },
];
const QI = Object.fromEntries(Q_STEPS.map((s, i) => [s.id, i])), QAI = Object.fromEntries(QA_STEPS.map((s, i) => [s.id, i])), QCI = Object.fromEntries(QC_STEPS.map((s, i) => [s.id, i]));
const recoKind = x => x.part === "arbre" ? "recoA" : x.part === "carter" ? "recoC" : "reco";
const RECO_CHECKS = {
  q1: [{ id: "rot", l: "Rotation manuelle roue" }, { id: "fr3", l: "Faux-rond × 3" }, { id: "jrc", l: "Jeu roue / carter" }, { id: "jri", l: "Jeu roue / isolant" }, { id: "osc", l: "Rotation perceuse, oscilloscope" }, { id: "die", l: "Test diélectrique + résistance sonde" }],
  q2: [{ id: "roue", l: "Roue réutilisable" }, { id: "prech", l: "Test précharge" }, { id: "frb", l: "Faux-rond bout d'arbre" }],
  q3: [{ id: "couv", l: "Couvercle AR réutilisable" }, { id: "iso", l: "Isolant réutilisable" }, { id: "flq", l: "Aspect flasque AR extérieur" }, { id: "ad", l: "Aspect arbre et douille extérieur" }],
  q4: [{ id: "blo", l: "Blocage sortie" }, { id: "flq", l: "Aspect flasque AR" }, { id: "rar", l: "Aspect roulement AR extérieur" }, { id: "rav", l: "Aspect roulement AV extérieur" }, { id: "dou", l: "Aspect douille" }, { id: "arb", l: "Aspect arbre" }],
  q5: [{ id: "dflq", l: "Démontage flasque AR" }, { id: "ddou", l: "Démontage douille" }, { id: "drar", l: "Démontage roulement AR" }, { id: "drav", l: "Démontage roulement AV" }, { id: "equ", l: "Contrôle équilibrage arbre" }],
  q6: [{ id: "eta", l: "Test étanchéité carter câblé" }, { id: "log", l: "Contrôle logement douille" }],
};
const recoAllOk = (x, s) => (RECO_CHECKS[s] || []).every(c => ((x.checks || {})[s] || {})[c.id] === "ok");
// Étapes quittées (de l'étape actuelle jusqu'avant la cible) dont un contrôle n'a pas encore de réponse.
const recoUnanswered = (x, target) => { const k = recoKind(x), steps = KSTEPS[k], I = KI[k], out = [];
  for (let j = I[x.step] ?? 0; j < (I[target] ?? 0); j++) { const s = steps[j].id;
    if ((RECO_CHECKS[s] || []).some(c => !((x.checks || {})[s] || {})[c.id])) out.push(s); } return out; };
const KSTEPS = { turbine: T_STEPS, arbre: A_STEPS, roue: R_STEPS, reco: Q_STEPS, recoA: QA_STEPS, recoC: QC_STEPS }, KI = { turbine: TI, arbre: AI, roue: RI, reco: QI, recoA: QAI, recoC: QCI };
const KLABEL = { turbine: "Turbine", arbre: "Arbre", roue: "Lot de roues", reco: "Turbine reconditionnée", recoA: "Arbre en reconditionnement", recoC: "Carter câblé en reconditionnement" };
const EMPTY_TXT = { turbine: "Aucune turbine en cours. Créez la première avec « Nouvelle turbine ».", arbre: "Aucun arbre en stock ou en cours.", roue: "Aucune roue à équilibrer. Les roues déclarées conformes au contrôle qualité arrivent ici.", reco: "Aucune turbine en reconditionnement. Ajoutez-en une avec « Nouvelle turbine reconditionnée ».", recoA: "Aucun arbre en reconditionnement. Il apparaît ici quand une turbine est dissociée.", recoC: "Aucun carter câblé en reconditionnement. Il apparaît ici quand une turbine est dissociée." };
const STEP = Object.fromEntries([...T_STEPS, ...A_STEPS, ...R_STEPS, ...Q_STEPS, ...QA_STEPS, ...QC_STEPS].map(s => [s.id, s]));
const IA1 = TI.a1, IT4 = TI.t4;
export const EMPTY_PROD = { turbines: {}, arbres: {}, pieces: {}, roues: {}, injecteurs: {}, params: { d: {}, l: {} }, access: [] };

/* ---------- Dates (jours ouvrés lundi–vendredi, comme l'original) ---------- */
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parseD = s => { if (!s) return null; const d = new Date(s + "T00:00:00"); return isNaN(d) ? null : d; };
const isWork = d => d.getDay() % 6 !== 0;
function nextWork(d) { d = new Date(d); while (!isWork(d)) d.setDate(d.getDate() + 1); return d; }
function addWD(d, n) { d = nextWork(d); while (n > 0) { d.setDate(d.getDate() + 1); if (isWork(d)) n--; } return d; }
function wdBetween(a, b) { a = new Date(a); a.setHours(0, 0, 0, 0); b = new Date(b); b.setHours(0, 0, 0, 0); if (a > b) return -wdBetween(b, a); let n = 0; while (a < b) { if (isWork(a)) n++; a.setDate(a.getDate() + 1); } return n; }
const T0 = () => nextWork(today0());
const offDate = x => x <= 0 ? T0() : addWD(T0(), Math.ceil(x - 1e-9) - 1);
const fmtD = d => d ? d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
const fmtShort = d => d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—";
const fmtJ = n => (Math.round(n * 10) / 10).toLocaleString("fr-FR") + " j";
const elapsed = it => { const d = parseD(it.since); return d ? Math.max(0, wdBetween(d, today0())) : 0; };
const sortNum = (a, b) => (a.num || "").localeCompare(b.num || "", "fr", { numeric: true });
const byRef = (a, b) => (a.ref || "").localeCompare(b.ref || "", "fr", { numeric: true });
const vars = r => (r.variantes || []).filter(v => (+v.qte || 0) > 0).sort((a, b) => a.bouches - b.bouches);
const injTotal = r => (+r.qte || 0) + vars(r).reduce((s, v) => s + (+v.qte || 0), 0);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- Calculs (purs, testables) ---------- */
export function makeModel(S) {
  const dur = id => { const v = S.params && S.params.d && S.params.d[id]; return typeof v === "number" && v >= 0 ? v : STEP[id].d; };
  const lbl = id => (S.params && S.params.l && S.params.l[id]) || STEP[id].l;
  const live = Object.values(S.turbines || {}).filter(t => !t.livree);
  const hasArbre = t => !!(t.arbreId && S.arbres[t.arbreId]);
  const used = new Set(live.map(t => t.arbreId).filter(Boolean));
  const availableArbres = () => Object.values(S.arbres || {}).filter(a => a.step === "b6" && !used.has(a.id) && !a.livree).sort((a, b) => (a.since || "").localeCompare(b.since || "") || sortNum(a, b));
  const arbreReadyOffset = a => {
    const i = AI[a.step] ?? 0, iD = AI.b6; if (i >= iD) return 0; let x = 0;
    if (i === 0) { const L = parseD(a.lancement); x = L ? Math.max(0, wdBetween(T0(), L)) : 0; }
    for (let j = Math.max(i, 1); j < iD; j++) { const id = A_STEPS[j].id;
      if (id === "b2" && j === i) { const r = parseD(a.retour); if (r) { x += Math.max(0, wdBetween(T0(), r)); continue; } }
      x += j === i ? Math.max(0, dur(id) - elapsed(a)) : dur(id); }
    return x;
  };
  const pushSeg = (segs, ph, from, to) => { if (to <= from) return; const last = segs[segs.length - 1]; if (last && last.ph === ph && Math.abs(last.to - from) < 1e-9) last.to = to; else segs.push({ ph, from, to }); };
  const runFrom = (t, i, x, segs) => {
    for (let j = i; j <= IT4; j++) { const s = T_STEPS[j]; if (s.ph === "att") continue;
      if (s.id === "s1") { if (!t.roue) { segs.noRoue = true; return x; } continue; }
      const d = j === TI[t.step] ? Math.max(0, dur(s.id) - elapsed(t)) : dur(s.id); pushSeg(segs, s.ph, x, x + d); x += d; }
    return x;
  };
  const progressOf = t => { let total = 0, done = 0; const i = TI[t.step] ?? 0;
    for (let j = 1; j <= IT4; j++) { const d = dur(T_STEPS[j].id); total += d; if (j < i) done += d; else if (j === i) done += Math.min(d, elapsed(t)); }
    if (t.step === "ok") return 1; return total ? done / total : 0; };
  const sch = {}, needs = [];
  for (const t of live) {
    const i = TI[t.step] ?? 0, segs = [];
    if (t.step === "ok") { sch[t.id] = { segs, end: 0, ready: true }; continue; }
    let x = 0;
    if (i === 0) { const L = parseD(t.lancement); x = L ? Math.max(0, wdBetween(T0(), L)) : 0; }
    if (i < IA1) {
      for (let j = Math.max(i, 1); j < IA1; j++) { const d = j === i ? Math.max(0, dur(T_STEPS[j].id) - elapsed(t)) : dur(T_STEPS[j].id); pushSeg(segs, "carter", x, x + d); x += d; }
      if (!hasArbre(t)) { needs.push({ t, x, segs }); continue; }
    }
    sch[t.id] = { segs, end: runFrom(t, Math.max(i, IA1), x, segs), noRoue: segs.noRoue };
  }
  // Affectation prévisionnelle des arbres : premier carter terminé = premier arbre prêt
  const pool = Object.values(S.arbres || {}).filter(a => !used.has(a.id) && !a.livree).map(a => ({ a, r: arbreReadyOffset(a) })).sort((p, q) => p.r - q.r);
  needs.sort((p, q) => p.x - q.x || (p.t.ordre || 0) - (q.t.ordre || 0));
  for (const n of needs) {
    const p = pool.shift();
    if (!p) { n.segs.push({ ph: "missing", from: n.x, to: null }); sch[n.t.id] = { segs: n.segs, end: null, missing: true }; continue; }
    if (p.r > n.x) pushSeg(n.segs, "wait", n.x, p.r);
    sch[n.t.id] = { segs: n.segs, end: runFrom(n.t, IA1, Math.max(n.x, p.r), n.segs), arbrePrevu: p.a.num, wait: Math.max(0, p.r - n.x), noRoue: n.segs.noRoue };
  }
  return { dur, lbl, live, hasArbre, used, availableArbres, arbreReadyOffset, progressOf, sch };
}

// Changement d'étape d'une turbine (mêmes garde-fous que l'original) → { turbine, msg } ou { error }
export function moveTurbine(S, M, old, nv) {
  const t = { ...old, ...nv }; const oldI = TI[old.step] ?? 0, newI = TI[t.step] ?? 0; let msg = null;
  if (t.arbreId === "") t.arbreId = null;
  if (newI >= TI.t4 && oldI < TI.t4 && !t.roue) return { error: "Attribuez d'abord une roue à " + t.num + " (fiche turbine) avant le banc d'essai avec roue." };
  if (newI >= IA1 && !(t.arbreId && S.arbres[t.arbreId])) {
    const av = M.availableArbres();
    if (!av.length) return { error: "Impossible de passer en assemblage : aucun arbre équilibré disponible. Faites d'abord avancer un arbre jusqu'à « Disponible »." };
    t.arbreId = av[0].id; msg = "Arbre " + av[0].num + " affecté à " + t.num;
  }
  if (newI < IA1 && oldI >= IA1 && old.arbreId && t.arbreId === old.arbreId) { msg = "Arbre " + ((S.arbres[old.arbreId] || {}).num || "") + " remis en stock"; t.arbreId = null; }
  if (old.step !== t.step || !t.since) t.since = iso(today0());
  return { turbine: t, msg };
}

/* ---------- Pièces consommées par la gamme (stock « pieces » au statut "stock") ---------- */
// k : mots recherchés dans « désignation + référence » de la ligne de stock (sans accents, en minuscules).
const NEEDS = {
  c1: [{ l: "Carter DC005", k: ["dc005"] }, { l: "Stator", k: ["stator"] }],
  c2: [{ l: "Chemisage DC011", k: ["dc011"] }],
  c4: [{ l: "Liner DC037", k: ["dc037"] }],
  a1: [{ l: "Flasque DC027", k: ["dc027"] }],
  a2: [{ l: "Couvercle AR", k: ["couvercle"] }],
  a3: [{ l: "Isolant DC014 (PEEK ou PPS ; POMC pour LT seulement)", k: ["dc014"], variant: "isolant" }, { l: "Plaque ressort DC047", k: ["dc047"] }],
  b1: [{ l: "Arbre DC019", k: ["dc019"] }, { l: "Rotor", k: ["rotor"] }],
  b5: [{ l: "Douille coulissante DC021", k: ["dc021"] }],
};
/* ---------- Gammes de turbines : 100 kW (par défaut, y compris les données sans champ « gamme ») et 20 kW ---------- */
const GAMMES = [["100", "100 kW", "100N"], ["20", "20 kW", "20N"]];
const gammeOf = x => x && String(x.gamme) === "20" ? "20" : "100";
const gammeL = g => (GAMMES.find(x => x[0] === g) || GAMMES[0])[1];
const gammePrefix = g => (GAMMES.find(x => x[0] === g) || GAMMES[0])[2];
// 20 kW : références propres (DF…), pièces reconnues par leur désignation ; un seul isolant (PEEK), valable pour MT et LT.
const NEEDS20 = {
  c1: [{ l: "Carter", k: ["carter"] }, { l: "Stator", k: ["stator"] }],
  c2: [{ l: "Chemisage", k: ["chemisage"] }],
  c4: [{ l: "Liner", k: ["liner"] }],
  a1: [{ l: "Flasque", k: ["flasque"] }],
  a2: [{ l: "Couvercle AR", k: ["couvercle"] }],
  a3: [{ l: "Isolant PEEK", k: ["isolant"] }, { l: "Plaque ressort", k: ["plaque ressort"] }],
  b1: [{ l: "Arbre", k: ["arbre"] }, { l: "Rotor", k: ["rotor"] }],
  b5: [{ l: "Douille coulissante", k: ["douille"] }],
};
const needsTable = g => g === "20" ? NEEDS20 : NEEDS;
const normTxt = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const byPo = (a, b) => (a.po || "").localeCompare(b.po || "", "fr", { numeric: true }) || String(a.id).localeCompare(String(b.id));
// Type de turbine : champ « type » (LT ou MT), sinon déduit de la roue attribuée (« MT EDP », « LT min DC051 »…).
const turbineType = t => { const x = String((t && t.type) || "").toUpperCase(); if (x === "LT" || x === "MT") return x; const r = normTxt(t && t.roue); return r.startsWith("mt") ? "MT" : r.startsWith("lt") ? "LT" : ""; };
// Pièces réellement demandées par une étape pour cet élément (l'isolant DC014 dépend du type de turbine).
function needsFor(s, item, g) {
  return (needsTable(g)[s] || []).map(n => { if (n.variant !== "isolant") return n; const ty = turbineType(item);
    // Ordre de k = ordre de préférence : MT n'accepte pas le POMC, qui est donc pris en premier pour les LT.
    return ty === "MT" ? { l: "Isolant DC014 PPS ou PEEK", k: ["dc014 pps", "dc014 peek"] } : ty === "LT" ? { l: "Isolant DC014 POMC, PPS ou PEEK", k: ["dc014 pomc", "dc014 pps", "dc014 peek"] } : { l: "Isolant DC014 (type LT ou MT à préciser sur la fiche turbine)", k: [] }; });
}
const needIdx = (p, n) => n.k.findIndex(k => normTxt((p.designation || "") + " " + (p.ref || "")).includes(k));
const byNeed = n => (a, b) => needIdx(a, n) - needIdx(b, n) || byPo(a, b);
const fitsNeed = (p, n) => p.statut === "stock" && n.k.some(k => normTxt((p.designation || "") + " " + (p.ref || "")).includes(k));
// Passage de item (turbine ou arbre) à newStep : en avançant, chaque étape franchie consomme ses pièces (la plus ancienne PO d'abord) ;
// en reculant, les pièces enregistrées dans item.conso reviennent en stock. Renvoie { missing, conso, qte } sans rien écrire.
function stockPlan(S, kind, item, newStep) {
  const steps = KSTEPS[kind], I = KI[kind];
  const oldI = I[item.step] ?? 0, newI = I[newStep] ?? 0, conso = { ...(item.conso || {}) }, qte = {}, missing = [];
  const q = id => qte[id] ?? (+((S.pieces || {})[id] || {}).qte || 0);
  if (newI > oldI) {
    for (let j = oldI + 1; j <= newI; j++) { const s = steps[j].id; const ns = needsFor(s, item, S.gamme); if (!ns.length || conso[s]) continue; const used = [];
      ns.forEach(n => { const p = Object.values(S.pieces || {}).filter(x => fitsNeed(x, n) && q(x.id) > 0).sort(byNeed(n))[0];
        if (p) { qte[p.id] = q(p.id) - 1; used.push(p.id); } else missing.push(n.l); });
      conso[s] = used; }
  } else {
    for (let j = newI + 1; j <= oldI; j++) { const s = steps[j].id; (conso[s] || []).forEach(id => { if ((S.pieces || {})[id]) qte[id] = q(id) + 1; }); delete conso[s]; }
  }
  return { missing, conso, qte };
}

/* ---------- Couleurs des phases (jetons du thème) ---------- */
function phaseColors() {
  const S = stageSoft(), A = alertSoft();
  const tone = o => ({ c: o.solid || o.ring, bg: o.bg, ink: o.ink });
  return {
    att: { c: T.ink300, bg: T.surfaceAlt, ink: T.ink700 }, stock: { c: T.ink500, bg: T.surfaceAlt, ink: T.ink700 },
    carter: tone(S.production), assy: tone(S.finProd), tests: tone(S.tests), ok: tone(S.depart), arbre: tone(S.arrivee), roue: tone(S.arrivee), reco: tone(S.tests), recond: tone(S.production), fin: tone(S.depart), dispo: tone(S.finProd),
    wait: { c: A.orange.ring, bg: A.orange.bg, ink: A.orange.ink }, missing: { c: A.red.ring, bg: A.red.bg, ink: A.red.ink },
  };
}

/* ---------- Petits éléments communs ---------- */
const card = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 10, padding: "12px 14px", minWidth: 0, boxSizing: "border-box" });
const btn = (kind) => ({ border: kind === "primary" ? "1px solid " + T.ink900 : "1px solid " + (kind === "danger" ? T.red500 : T.line), background: kind === "primary" ? T.ink900 : T.card, color: kind === "primary" ? T.card : kind === "danger" ? T.red500 : T.ink700, borderRadius: 6, padding: "4px 10px", minHeight: 28, fontSize: FZF.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" });
const H2 = ({ children, sub, right }) => (<div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", margin: "4px 0 8px" }}>
  <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, color: T.ink900 }}>{children}</h2>
  {sub && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>{sub}</span>}
  {right && <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>{right}</span>}
</div>);
const Muted = ({ children }) => <div style={{ fontSize: FZF.sm, color: T.ink500, padding: "6px 0" }}>{children}</div>;

// Fenêtre d'édition générique (mêmes champs que l'original)
function FormDialog({ title, fields, vals, onSave, extra = [], readOnly, onClose, notify }) {
  const [v, setV] = useState(() => { const o = {}; fields.forEach(f => { o[f.k] = vals[f.k] ?? (f.type === "number" ? 0 : ""); }); return o; });
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const val = () => { const o = {}; fields.forEach(f => { let x = v[f.k]; if (f.type === "number") x = Math.max(0, parseInt(x || "0", 10) || 0); o[f.k] = typeof x === "string" ? x.trim() : x; }); return o; };
  const submit = async e => { e.preventDefault(); const r = val(); const miss = fields.find(f => f.req && (!f.show || f.show(r)) && !r[f.k]); if (miss) { notify("Renseignez le champ « " + miss.l + " ».", true); return; } const ok = await onSave(r); if (ok !== false) onClose(); };
  const inp = { width: "100%", height: 34, border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, padding: "0 10px", fontSize: FZF.sm, fontFamily: T.font, boxSizing: "border-box" };
  const cur = val();
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,.45)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <form role="dialog" aria-label={title} onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, width: "min(460px,100%)", maxHeight: "90vh", overflow: "auto", padding: "16px 18px", fontFamily: T.font }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 18, marginBottom: 10 }}>{title}</div>
      {fields.filter(f => !f.show || f.show(cur)).map(f => (<label key={f.k} style={{ display: "block", marginBottom: 10 }}>
        <span style={{ display: "block", fontSize: FZF.xs, fontWeight: 700, color: T.ink700, marginBottom: 4 }}>{f.l}{f.req ? " *" : ""}</span>
        {f.type === "select" ? <select disabled={readOnly} value={v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={inp}>{f.opts.map(([ov, ol]) => <option key={ov} value={ov}>{ol}</option>)}</select>
          : f.type === "textarea" ? <textarea disabled={readOnly} value={v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={{ ...inp, height: 70, padding: 8, resize: "vertical" }} />
          : <><input disabled={readOnly} type={f.type || "text"} min={f.type === "number" ? 0 : undefined} value={v[f.k]} list={f.list ? "pt-dl-" + f.k : undefined} onChange={e => setV({ ...v, [f.k]: e.target.value })} style={inp} />
            {f.list && <datalist id={"pt-dl-" + f.k}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}</>}
        {f.hint && <span style={{ display: "block", fontSize: 11.5, color: T.ink500, marginTop: 3 }}>{f.hint}</span>}
      </label>))}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        {!readOnly && extra.map((x, i) => <button key={i} type="button" style={btn(x.danger ? "danger" : "")} onClick={async () => { const ok = await x.fn(val()); if (ok !== false) onClose(); }}>{x.l}</button>)}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn("")} onClick={onClose}>{readOnly ? "Fermer" : "Annuler"}</button>
        {!readOnly && <button type="submit" style={btn("primary")}>Enregistrer</button>}
      </div>
    </form>
  </div>);
}

/* ---------- Page ---------- */
const TABS = [["accueil", "Accueil"], ["planning", "Planning"], ["stocks", "Stock"], ["parametres", "Gamme & durées"]];

// pjs (facultatif) : PJ du planning proposés dans « Affaire / client » (« PJ479-1 - EDF PEI ») ; la page Turbines › Besoins des ORC
// rattache une turbine au PJ dont le numéro commence ce champ.
export function ProdTurbines({ doc, api, canEdit, owner, pjs, demandes }) { // v270 : demandes = besoins ORC / SAV envoyés par le site (garder la prop)
  // Gamme affichée (100 kW ou 20 kW) : préférence d'affichage propre à ce navigateur.
  const [gamme, setGamme] = useState(() => { try { return localStorage.getItem("enogia_prodturb_gamme") === "20" ? "20" : "100"; } catch (e) { return "100"; } });
  useEffect(() => { try { localStorage.setItem("enogia_prodturb_gamme", gamme); } catch (e) { /* stockage indisponible */ } }, [gamme]);
  // Chaque élément reçoit son identifiant depuis sa clé (Firestore enregistre les éléments sans le champ id).
  // Seuls les éléments de la gamme affichée sont gardés : planning, stocks, dates et décomptes restent propres à chaque gamme.
  const S = useMemo(() => { const d = doc || {}, dp = d.params || {};
    const o = { ...EMPTY_PROD, ...d, gamme, params: gamme === "20" ? { d: {}, l: {}, ...(dp.r20 || {}) } : { d: {}, l: {}, ...dp } };
    ["turbines", "arbres", "pieces", "roues", "injecteurs"].forEach(c => { o[c] = Object.fromEntries(Object.entries(d[c] || {}).filter(([, v]) => gammeOf(v) === gamme).map(([k, v]) => [k, { ...v, id: k }])); }); return o; }, [doc, gamme]);
  const M = useMemo(() => makeModel(S), [S]);
  const P = phaseColors();
  const readOnly = !canEdit;
  const [tab, setTab] = useState(() => { try { const v = localStorage.getItem("enogia_prodturb_tab"); return TABS.some(t => t[0] === v) ? v : "accueil"; } catch (e) { return "accueil"; } });
  useEffect(() => { try { localStorage.setItem("enogia_prodturb_tab", tab); } catch (e) { /* stockage indisponible */ } }, [tab]);
  const [form, setForm] = useState(null); const [toast, setToast] = useState(null); const tRef = useRef(null);
  const notify = (msg, err) => { setToast({ msg, err }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), err ? 5200 : 3000); };
  const GCOLL = ["turbines", "arbres", "pieces", "roues", "injecteurs"];
  const put = async (c, id, data) => { const d = { ...data }; delete d.id; if (GCOLL.includes(c) && !d.gamme) d.gamme = gamme; const ok = await api.put(c, id, d); if (!ok) notify("Enregistrement impossible, réessayez dans un instant.", true); return ok; };
  const del = (c, id) => api.del(c, id);
  // Durées et noms d'étapes : ceux du 100 kW à la racine de params (comme avant), ceux du 20 kW dans params.r20.
  const saveParams = p => { const dp = (doc && doc.params) || {};
    return gamme === "20" ? api.setParams({ ...dp, r20: p }) : api.setParams(dp.r20 ? { ...p, r20: dp.r20 } : p); };
  // Pièces : vérifie le stock, le décompte (ou le restitue en reculant) puis renvoie la trace des pièces montées.
  const applyStock = async (kind, item, newStep, skip) => {
    if (skip || item.step === newStep) return { conso: item.conso || {} };
    const r = stockPlan(S, kind, item, newStep);
    if (r.missing.length) return { error: "Stock insuffisant pour « " + M.lbl(newStep) + " » : il manque " + r.missing.join(", ") + "." };
    for (const [id, n] of Object.entries(r.qte)) await put("pieces", id, { ...S.pieces[id], qte: n });
    return { conso: r.conso };
  };
  const withConso = (o, conso) => { const n = { ...o }; delete n.deduire; if (conso && Object.keys(conso).length) n.conso = conso; else delete n.conso; return n; };
  // Si le changement d'étape est refusé (arbre, roue ou stock), les autres champs de la fiche sont quand même enregistrés.
  const saveTurbine = async (old, nv, isNew) => { const r = moveTurbine(S, M, old, nv);
    // Le stock se calcule avec les valeurs saisies dans la fiche (type LT / MT notamment), à partir de l'étape actuelle.
    const st = r.error ? null : await applyStock("turbine", { ...r.turbine, step: old.step, conso: old.conso }, r.turbine.step, isNew && nv.deduire !== "oui");
    const err = r.error || st.error;
    if (err) {
      if (!isNew && nv.step && nv.step !== old.step) { const keep = moveTurbine(S, M, old, { ...nv, step: old.step });
        if (!keep.error) { const t = withConso(keep.turbine, old.conso); if (await put("turbines", t.id, t)) { notify(err + " Les autres modifications de la fiche sont enregistrées ; l'étape reste « " + M.lbl(old.step) + " ».", true); return true; } } }
      notify(err, true); return false; }
    if (r.msg) notify(r.msg); const t = withConso(r.turbine, st.conso); return put("turbines", t.id, t); };
  const saveArbre = async (a, nv, isNew) => { const n0 = { ...a, ...nv };
    const st = await applyStock("arbre", { ...n0, step: a.step, conso: a.conso }, n0.step, isNew && nv.deduire !== "oui");
    if (st.error) {
      if (!isNew && n0.step !== a.step) { const k = withConso({ ...n0, step: a.step }, a.conso); if (await put("arbres", k.id, k)) { notify(st.error + " Les autres modifications de la fiche sont enregistrées ; l'étape reste « " + M.lbl(a.step) + " ».", true); return true; } }
      notify(st.error, true); return false; }
    const n = withConso(n0, st.conso); if (n.step !== a.step || !n.since) n.since = iso(today0()); return put("arbres", n.id, n); };
  const isRoue = p => normTxt(p.designation).startsWith("roue");
  const lotOffset = x => { const i = RI[x.step] ?? 0; let o = 0;
    for (let j = i; j < RI.r3; j++) { const id = R_STEPS[j].id;
      if (j === i && id === "r2" && parseD(x.retour)) { o += Math.max(0, wdBetween(T0(), parseD(x.retour))); continue; }
      o += j === i ? Math.max(0, M.dur(id) - elapsed(x)) : M.dur(id); }
    return o; };
  // Passage d'un lot de roues : à « Équilibrées, en stock », sa quantité s'ajoute au stock de roues équilibrées de même référence et le lot disparaît.
  const saveLot = async (lot, nv) => { const n = { ...lot, ...nv, statut: "equil" };
    if (n.step === "r3") { const ref = n.ref || n.designation || "Roues"; const r = Object.values(S.roues).find(x => normTxt(x.ref) === normTxt(ref));
      const ok = r ? await put("roues", r.id, { ...r, qte: (+r.qte || 0) + (+n.qte || 0) }) : await put("roues", newId(), { ref, qte: +n.qte || 0 });
      if (!ok) return false; await del("pieces", n.id); notify((+n.qte || 0) + " roues " + ref + " ajoutées au stock de roues équilibrées"); return true; }
    if (n.step !== lot.step || !n.since) n.since = iso(today0()); return put("pieces", n.id, n); };
  const openLot = l => setForm({ title: "Roues " + (l.ref || "") + " à équilibrer", vals: l,
    fields: [{ k: "ref", l: "Référence de roue", req: true, list: Object.values(S.roues).map(r => r.ref).filter(Boolean).sort() }, { k: "qte", l: "Quantité", type: "number", req: true },
      { k: "step", l: "Étape actuelle", type: "select", opts: R_STEPS.map(s => [s.id, M.lbl(s.id)]), hint: "À « Équilibrées, en stock », les roues passent dans le stock de roues équilibrées." },
      { k: "retour", l: "Retour prévu de l'équilibrage", type: "date", show: v => v.step === "r2", hint: "Remplace la durée standard dans le calcul des dates." },
      { k: "po", l: "N° de PO" }, { k: "fournisseur", l: "Fournisseur" }, { k: "note", l: "Note", type: "textarea" }],
    onSave: v => saveLot(l, v), extra: [{ l: "Supprimer", danger: true, fn: () => del("pieces", l.id) }] });
  // Reconditionnement : à « Dissociée », la turbine d'origine devient deux entités : un carter câblé (même numéro que la turbine)
  // et un arbre (numéro et PO, comme les arbres en montage). Arbre conforme → arbres à « Contrôle de l'équilibrage ».
  // Carter conforme → turbines à « Carter câblé » ; sinon décâblage, puis turbines à « Câblage ».
  const recoTurbine = async (n, step) => { if (n.turbineId && S.turbines[n.turbineId]) return true; const id = newId();
    const ok = await put("turbines", id, { num: n.num, affaire: n.affaire ? n.affaire + " (reconditionnée)" : "Reconditionnée", type: n.type || "", roue: "", step, since: iso(today0()), ordre: Math.max(0, ...M.live.map(x => x.ordre || 0)) + 1, arbreId: null });
    if (ok) { n.turbineId = id; notify("Carter câblé " + n.num + " réintégré au flux des turbines, à « " + M.lbl(step) + " »"); } return ok; };
  const saveReco = async (old, nv) => { const n = { ...old, ...nv, statut: "reco" }; const k = recoKind(n), I = KI[k]; const oI = I[old.step] ?? 0, tI = I[n.step] ?? 0;
    if (tI > oI) {
      const miss = recoUnanswered({ ...old, checks: n.checks }, n.step);
      if (miss.length) { notify("Indiquez OK ou NOK pour chaque contrôle de « " + miss.map(s => M.lbl(s)).join(" », « ") + " » avant de passer à la suite.", true); return false; }
      if (k === "reco" && tI >= QI.qd) {
        if (!n.arbreNum || !n.arbrePo) { notify("Renseignez le numéro et la PO de l'arbre dans la fiche avant de dissocier la turbine.", true); return false; }
        const day = iso(today0());
        if (!n.arbreRecoId) { const id = newId(); if (!(await put("pieces", id, { statut: "reco", part: "arbre", num: n.arbreNum, ref: n.arbrePo, origine: n.num, affaire: n.affaire || "", step: "q5", since: day, checks: {} }))) return false; n.arbreRecoId = id; }
        if (!n.carterRecoId) { const id = newId(); if (!(await put("pieces", id, { statut: "reco", part: "carter", num: n.num, affaire: n.affaire || "", type: n.type || "", step: "q6", since: day, checks: {} }))) return false; n.carterRecoId = id; }
        n.step = "qd"; notify("Turbine " + n.num + " dissociée : carter câblé " + n.num + " et arbre " + n.arbreNum + " en reconditionnement");
      }
      if (k === "recoA" && oI <= QAI.q5 && tI > QAI.q5) {
        if (recoAllOk(n, "q5")) { if (!n.arbreId) { const id = newId(); if (!(await put("arbres", id, { num: n.num, ref: n.ref || "", step: "b3", since: iso(today0()) }))) return false;
          n.arbreId = id; notify("Arbre " + n.num + " réintégré au flux des arbres, à « " + M.lbl("b3") + " »"); } }
        else { n.arbreNok = true; notify("Arbre " + n.num + " non conforme : il ne rejoint pas le flux des arbres.", true); }
        n.step = "qaf"; }
      if (k === "recoC") {
        if (oI <= QCI.q6 && tI > QCI.q6) {
          if (recoAllOk(n, "q6")) { if (!(await recoTurbine(n, "cc"))) return false; n.step = "qcf"; }
          else if (tI > QCI.q7) { if (!(await recoTurbine(n, "c6"))) return false; n.step = "qcf"; }
          else n.step = "q7"; }
        else if (oI === QCI.q7 && tI > QCI.q7) { if (!(await recoTurbine(n, "c6"))) return false; n.step = "qcf"; }
      }
    }
    if (n.step !== old.step || !n.since) n.since = iso(today0()); return put("pieces", n.id, n); };
  const openReco = x => { const isNew = !x; x = x || { id: newId(), statut: "reco", num: gammePrefix(gamme), type: "", step: "q1", checks: {}, since: iso(today0()) };
    const k = recoKind(x), steps = KSTEPS[k]; const vals = { ...x, type: turbineType(x) }; const chk = [];
    steps.forEach(st => (RECO_CHECKS[st.id] || []).forEach(c => { const key = "chk_" + st.id + "_" + c.id; vals[key] = ((x.checks || {})[st.id] || {})[c.id] || "";
      chk.push({ k: key, l: c.l, type: "select", opts: [["", "À contrôler"], ["ok", "OK"], ["nok", "NOK"]], show: v => v.step === st.id }); }));
    const stepF = { k: "step", l: "Étape actuelle", type: "select", opts: steps.map(s => [s.id, PHASES[s.ph] + " : " + M.lbl(s.id)]), hint: "Les contrôles affichés dessous sont ceux de l'étape choisie." };
    const proj = { k: "affaire", l: "Projet d'origine", hint: "Par exemple : PJ405 - CDA." };
    const typeF = { k: "type", l: "Type de turbine", type: "select", opts: [["", "Non précisé"], ["LT", "LT"], ["MT", "MT"]] };
    const head = k === "recoA" ? [{ k: "num", l: "Numéro de l'arbre", req: true, hint: "Par exemple : #3/21." }, { k: "ref", l: "N° de PO de l'arbre" }, { k: "origine", l: "Turbine d'origine" }, proj]
      : k === "recoC" ? [{ k: "num", l: "Numéro du carter câblé (turbine d'origine)", req: true }, proj, typeF]
      : [{ k: "num", l: "Numéro de turbine", req: true, hint: "Turbine " + gammeL(gamme) + " : " + gammePrefix(gamme) + "XXXXXXX." }, proj, typeF];
    const split = k === "reco" ? [{ k: "arbreNum", l: "Numéro de l'arbre", show: v => v.step === "q4", hint: "Nécessaire pour dissocier la turbine. Même identification que les arbres en montage, par exemple #3/21." },
      { k: "arbrePo", l: "N° de PO de l'arbre", show: v => v.step === "q4", hint: "Par exemple : PO2026_254." }] : [];
    const title = isNew ? "Nouvelle turbine reconditionnée" : KLABEL[k] + " " + x.num;
    setForm({ title, vals, fields: [...head, stepF, ...chk, ...split, { k: "note", l: "Note", type: "textarea" }],
      onSave: v => { const checks = {}; steps.forEach(st => (RECO_CHECKS[st.id] || []).forEach(c => { const r = v["chk_" + st.id + "_" + c.id]; if (r) { checks[st.id] = checks[st.id] || {}; checks[st.id][c.id] = r; } }));
        const base = { step: v.step, note: v.note, checks }; head.concat(split).forEach(f => { base[f.k] = v[f.k]; });
        return saveReco(isNew ? { ...x, step: v.step } : x, base); },
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del("pieces", x.id) }] }); };
  const itemOf = (kind, id) => kind === "turbine" ? S.turbines[id] : kind === "arbre" ? S.arbres[id] : S.pieces[id];
  const itemName = (kind, x) => !x ? "" : kind === "roue" ? (x.ref || x.designation || "Roues") + " ×" + (+x.qte || 0) : x.num;
  const openItem = (kind, x) => { if (!x) return; if (kind === "turbine") openTurbine(x); else if (kind === "arbre") openArbre(x); else if (kind.startsWith("reco")) openReco(x); else openLot(x); };
  const deduireField = (isNew, first) => ({ k: "deduire", l: "Déduire du stock les pièces des étapes déjà faites", type: "select", opts: [["oui", "Oui, les sortir du stock maintenant"], ["non", "Non, elles sont déjà sorties du stock"]], show: v => isNew && v.step !== first, hint: "Seulement à la création. Ensuite, chaque changement d'étape met le stock à jour." });

  /* ---- fiches ---- */
  const openTurbine = t => {
    const isNew = !t;
    t = t || { id: newId(), num: gammePrefix(gamme), affaire: "", roue: "", step: "att", ordre: Math.max(0, ...M.live.map(x => x.ordre || 0)) + 1, arbreId: null, since: iso(today0()) };
    const roueRefs = Object.values(S.roues).map(r => r.ref).filter(Boolean).sort(); if (t.roue && !roueRefs.includes(t.roue)) roueRefs.push(t.roue);
    const av = M.availableArbres();
    const arbreOpts = [["", "Aucun (affectation automatique)"], ...(t.arbreId && S.arbres[t.arbreId] ? [[t.arbreId, "Arbre " + S.arbres[t.arbreId].num]] : []), ...av.map(a => [a.id, "Arbre " + a.num + " (disponible)"])];
    setForm({ title: isNew ? "Nouvelle turbine" : "Turbine " + t.num, vals: { ...t, type: turbineType(t), arbreId: t.arbreId || "", deduire: "oui" },
      fields: [
        { k: "num", l: "Numéro de turbine", req: true, hint: "Turbine " + gammeL(gamme) + " : " + gammePrefix(gamme) + "XXXXXXX." }, { k: "affaire", l: "Affaire / client", list: pjs && pjs.length ? pjs : undefined, hint: pjs && pjs.length ? "Choisissez le PJ de l'ORC qui recevra la turbine (vide : stock)." : undefined },
        { k: "type", l: "Type de turbine", type: "select", opts: [["", "Non précisé"], ["LT", "LT"], ["MT", "MT"]], hint: "Détermine les isolants DC014 utilisables : PPS ou PEEK pour MT ; POMC, PPS ou PEEK pour LT." },
        { k: "roue", l: "Roue attribuée", type: "select", opts: [["", "Non attribuée"], ...roueRefs.map(r => [r, r])], hint: "Sans roue, la turbine s'arrête en « Stock testée sans roue » après le banc d'essai sans roue." },
        { k: "step", l: "Étape actuelle", type: "select", opts: T_STEPS.map(s => [s.id, PHASES[s.ph] + " : " + M.lbl(s.id)]) },
        { k: "lancement", l: "Lancement prévu", type: "date", show: v => v.step === "att" },
        deduireField(isNew, "att"),
        { k: "arbreId", l: "Arbre", type: "select", opts: arbreOpts, hint: "Obligatoire à partir de l'assemblage : seul un arbre équilibré peut être affecté." },
        { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => saveTurbine(t, v, isNew),
      extra: isNew ? [] : [
        ...(t.step === "ok" ? [{ l: "Marquer livrée", fn: async () => { await put("turbines", t.id, { ...t, livree: iso(today0()) }); if (t.arbreId && S.arbres[t.arbreId]) await put("arbres", t.arbreId, { ...S.arbres[t.arbreId], livree: iso(today0()) }); notify(t.num + " marquée livrée"); } }] : []),
        { l: "Supprimer", danger: true, fn: async () => { if (!window.confirm("Supprimer la turbine " + t.num + " ? Son arbre éventuel retourne en stock.")) return false; await del("turbines", t.id); notify(t.num + " supprimée"); } },
      ] });
  };
  const openArbre = a => {
    const isNew = !a; a = a || { id: newId(), num: "", ref: "", step: "b0", since: iso(today0()) };
    setForm({ title: isNew ? "Nouvel arbre" : "Arbre " + a.num, vals: { ...a, deduire: "oui" },
      fields: [
        { k: "num", l: "Numéro d'arbre", req: true }, { k: "ref", l: "Référence" },
        { k: "step", l: "Étape actuelle", type: "select", opts: A_STEPS.map(s => [s.id, M.lbl(s.id)]) },
        { k: "lancement", l: "Lancement prévu", type: "date", show: v => v.step === "b0" },
        { k: "retour", l: "Retour prévu de l'équilibrage", type: "date", show: v => v.step === "b2", hint: "Remplace la durée standard dans le calcul des dates." },
        deduireField(isNew, "b0"),
        { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => saveArbre(a, v, isNew),
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: async () => { if (!window.confirm("Supprimer l'arbre " + a.num + " ?")) return false; await del("arbres", a.id); } }] });
  };
  const openPiece = (p, statut) => {
    const isNew = !p; p = p || { id: newId(), statut: statut || "appro", designation: "", ref: "", qte: 1, cqEtat: "en attente", since: iso(today0()) };
    setForm({ title: isNew ? "Nouvelle pièce" : (p.designation || "Pièce"), vals: p,
      fields: [
        { k: "designation", l: "Désignation", req: true }, { k: "ref", l: "Référence" }, { k: "qte", l: "Quantité", type: "number" },
        { k: "po", l: "N° de PO", req: true, show: v => v.statut === "appro" }, { k: "fournisseur", l: "Fournisseur", req: true, show: v => v.statut === "appro" },
        { k: "turbine", l: "Turbine concernée", list: M.live.map(t => t.num).sort() },
        { k: "statut", l: "Statut", type: "select", opts: [["appro", "Appro : pas encore livrée"], ["cq", "Contrôle qualité"], ["nc", "Non conforme"]] },
        { k: "dateLiv", l: "Date de livraison prévue", type: "date", show: v => v.statut === "appro" },
        { k: "cqEtat", l: "État du contrôle", type: "select", opts: [["en attente", "En attente de contrôle"], ["en cours", "Contrôle en cours"]], show: v => v.statut === "cq" },
        { k: "motif", l: "Motif de non-conformité", show: v => v.statut === "nc" }, { k: "note", l: "Note", type: "textarea" },
      ],
      onSave: v => { const n = { ...p, ...v }; if (n.statut !== p.statut) n.since = iso(today0()); return put("pieces", n.id, n); },
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del("pieces", p.id) }] });
  };
  const pieceAction = async (id, act) => {
    const p = S.pieces[id]; if (!p) return;
    if (act === "recue") { await put("pieces", id, { ...p, statut: "cq", cqEtat: "en attente", since: iso(today0()) }); notify(p.designation + " passée au contrôle qualité"); }
    if (act === "conforme") {
      if (isRoue(p)) { await put("pieces", id, { ...p, statut: "equil", step: R_STEPS[0].id, since: iso(today0()) }); notify((p.qte || 1) + " " + (p.designation || "roues") + (p.ref ? " " + p.ref : "") + " conformes, à préparer pour l'équilibrage"); }
      else { await del("pieces", id); notify(p.designation + " conforme, retirée de la liste"); } }
    if (act === "nc") openPiece({ ...p, statut: "nc", since: iso(today0()) });
    if (act === "traitee") { await del("pieces", id); notify("NC " + p.designation + " soldée"); }
  };
  const openStock = (c, r) => {
    const isNew = !r; r = r || { id: newId(), ref: "", qte: 0 };
    const fields = [{ k: "ref", l: "Référence", req: true }, { k: "qte", l: c === "roues" ? "Roues équilibrées en stock" : "Injecteurs vierges en stock", type: "number" }];
    if (c === "injecteurs") fields.push({ k: "ouvertures", l: "Nombre total d'ouvertures", type: "number", hint: "Par exemple 11 pour MT EDP. Les bouchages se gèrent dans le tableau, avec « Ajouter un bouchage »." });
    setForm({ title: isNew ? "Nouvelle référence" : r.ref, vals: r, fields, onSave: v => put(c, r.id, { ...r, ...v }), extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del(c, r.id) }] });
  };
  const addVar = r => setForm({ title: r.ref + " : injecteurs avec bouchages", vals: { bouches: "", qte: 1 },
    fields: [{ k: "bouches", l: "Ouvertures bouchées" + (r.ouvertures ? " (sur " + r.ouvertures + ")" : ""), type: "number", req: true }, { k: "qte", l: "Quantité", type: "number", req: true }],
    onSave: f => { if (r.ouvertures && f.bouches >= r.ouvertures) { notify("Un injecteur " + r.ref + " a " + r.ouvertures + " ouvertures : il faut en boucher moins de " + r.ouvertures + ".", true); return false; }
      const v = (r.variantes || []).map(x => ({ ...x })); const x = v.find(y => +y.bouches === f.bouches); if (x) x.qte = (+x.qte || 0) + f.qte; else v.push({ bouches: f.bouches, qte: f.qte });
      return put("injecteurs", r.id, { ...r, variantes: v }); } });
  const bumpQty = (c, r, d) => put(c, r.id, { ...r, qte: Math.max(0, (+r.qte || 0) + d) });
  const openStockPiece = p => {
    const isNew = !p; p = p || { id: newId(), statut: "stock", designation: "", ref: "", qte: 1, numeros: "", po: "", fournisseur: "" };
    setForm({ title: isNew ? "Nouvelle pièce en stock" : (p.designation || "Pièce") + (p.ref ? " " + p.ref : ""), vals: p,
      fields: [{ k: "designation", l: "Désignation", req: true, hint: "Par exemple : Arbres, Rotors, Carters." }, { k: "ref", l: "Référence", hint: "Par exemple : DC019." },
        { k: "qte", l: "Quantité en stock", type: "number" },
        { k: "numeros", l: "Numéros des exemplaires", hint: "Facultatif, séparés par des virgules. Par exemple : #11, #12, #14." },
        { k: "po", l: "N° de PO" }, { k: "fournisseur", l: "Fournisseur" }, { k: "note", l: "Note", type: "textarea" }],
      onSave: v => put("pieces", p.id, { ...p, ...v, statut: "stock" }),
      extra: isNew ? [] : [{ l: "Supprimer", danger: true, fn: () => del("pieces", p.id) }] });
  };
  const bumpVar = (r, b, d) => { const v = (r.variantes || []).map(x => ({ ...x })); const x = v.find(y => +y.bouches === b); if (x) x.qte = Math.max(0, (+x.qte || 0) + d); put("injecteurs", r.id, { ...r, variantes: v.filter(y => (+y.qte || 0) > 0) }); };

  /* ---- glisser une carte sur sa ligne (souris et tactile) ---- */
  const dragRef = useRef(null); const [drag, setDrag] = useState(null);
  // Ordre des encarts (Accueil, Planning et Stock), propre à chaque utilisateur et à ce navigateur : simple préférence d'affichage.
  const ORDER_DEF = { accueil: ["demandes", "pretes", "sansroue", "roues", "injecteurs", "vision"], planning: ["pieces", "turbines", "reco", "arbres", "roues"], stocks: ["roues", "injecteurs", "stock"] };
  const BLOCK_L = { accueil: { demandes: "Demandes ORC et SAV", pretes: "Turbines prêtes", sansroue: "Testées sans roue", roues: "Roues équilibrées par réf.", injecteurs: "Injecteurs par réf.", vision: "Dates prévisionnelles des prochaines turbines" }, planning: { pieces: "Appro, contrôle qualité et non-conformités", turbines: "Turbines", reco: "Turbines reconditionnées", arbres: "Arbres", roues: "Roues à équilibrer" },
    stocks: { roues: "Roues équilibrées", injecteurs: "Injecteurs", stock: "Pièces en stock" } };
  const ORDER_KEY = "enogia_prodturb_order";
  const [blockOrder, setBlockOrder] = useState(() => { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || "{}") || {}; } catch { return {}; } });
  const orderFrom = (o, tb) => { const def = ORDER_DEF[tb], cur = ((o || {})[tb] || []).filter(k => def.includes(k)); return [...cur, ...def.filter(k => !cur.includes(k))]; };
  const saveOrder = no => { try { localStorage.setItem(ORDER_KEY, JSON.stringify(no)); } catch {} return no; };
  const moveBlock = (tb, k, d) => setBlockOrder(o => { const list = orderFrom(o, tb), i = list.indexOf(k), j = i + d; if (j < 0 || j >= list.length) return o;
    const n = list.slice(); [n[i], n[j]] = [n[j], n[i]]; return saveOrder({ ...o, [tb]: n }); });
  const resetOrder = tb => setBlockOrder(o => { const no = { ...o }; delete no[tb]; return saveOrder(no); });
  const orderedBlocks = (tb, blocks, wrapStyle) => { const list = orderFrom(blockOrder, tb), custom = (blockOrder[tb] || []).length > 0;
    const arrow = { ...btn(""), minWidth: 28, minHeight: 28, padding: "0 8px", lineHeight: 1 };
    return list.map((k, i) => (<div key={k} style={{ minWidth: 0, ...(wrapStyle ? wrapStyle(k) : {}) }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginBottom: 4 }}>
        {custom && i === 0 && <button type="button" style={{ ...btn(""), minHeight: 28, marginRight: "auto" }} onClick={() => resetOrder(tb)}>Ordre par défaut</button>}
        <button type="button" style={{ ...arrow, opacity: i === 0 ? 0.4 : 1 }} disabled={i === 0} aria-label={"Monter l'encart " + BLOCK_L[tb][k]} title="Monter" onClick={() => moveBlock(tb, k, -1)}>↑</button>
        <button type="button" style={{ ...arrow, opacity: i === list.length - 1 ? 0.4 : 1 }} disabled={i === list.length - 1} aria-label={"Descendre l'encart " + BLOCK_L[tb][k]} title="Descendre" onClick={() => moveBlock(tb, k, 1)}>↓</button>
      </div>
      {blocks[k]}
    </div>)); };
  // Tableaux du planning : hauteur limitée avec en-têtes figés (comme « Figer les volets »), ou toutes les lignes.
  const [fullBoards, setFullBoards] = useState({});
  const ruleBlocked = (item, stepId) => (TI[stepId] >= IA1 && !M.hasArbre(item) && !M.availableArbres().length) || (TI[stepId] >= TI.t4 && (TI[item.step] ?? 0) < TI.t4 && !item.roue);
  const cellState = (kind, item, stepId) => {
    if (kind === "turbine" && ruleBlocked(item, stepId)) return "blocked";
    if (kind.startsWith("reco")) return recoUnanswered(item, stepId).length || (kind === "reco" && QI[stepId] >= QI.qd && (!item.arbreNum || !item.arbrePo)) ? "blocked" : "valid";
    return stockPlan(S, kind, item, stepId).missing.length ? "blocked" : "valid";
  };
  // Prochaine étape qui consomme des pièces, pour chaque turbine (ordre du planning) puis chaque arbre (le plus avancé d'abord) :
  // le stock est réparti dans cet ordre, donc une pièce réservée par une turbine ne compte plus pour les suivantes.
  const shortMap = useMemo(() => {
    const rem = {}, out = {}, stock = Object.values(S.pieces).filter(p => p.statut === "stock").sort(byPo);
    stock.forEach(p => { rem[p.id] = +p.qte || 0; });
    const run = (kind, item) => { const steps = KSTEPS[kind], I = KI[kind];
      for (let j = (I[item.step] ?? 0) + 1; j < steps.length; j++) { const s = steps[j].id;
        if (needsTable(S.gamme)[s] && !(item.conso || {})[s]) { const miss = [];
          needsFor(s, item, S.gamme).forEach(n => { const p = stock.filter(x => fitsNeed(x, n) && rem[x.id] > 0).sort(byNeed(n))[0]; if (p) rem[p.id]--; else miss.push(n.l); });
          if (miss.length) out[kind + ":" + item.id] = { step: s, missing: miss }; return; } } };
    M.live.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || sortNum(a, b)).forEach(t => run("turbine", t));
    Object.values(S.arbres).filter(a => !M.used.has(a.id) && !a.livree).sort((a, b) => (AI[b.step] ?? 0) - (AI[a.step] ?? 0) || sortNum(a, b)).forEach(a => run("arbre", a));
    return out; }, [S, M]);
  const nextShort = (kind, item) => shortMap[kind + ":" + item.id] || null;
  const onCardDown = (e, kind, id) => { if (e.button != null && e.button !== 0) return; dragRef.current = { kind, id, x0: e.clientX, y0: e.clientY, moved: false }; };
  useEffect(() => {
    const move = e => { const d = dragRef.current; if (!d) return;
      if (!d.moved) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6 || readOnly) return; d.moved = true; }
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY); const td = el && el.closest && el.closest("td[data-step]");
      d.target = td && td.getAttribute("data-row") === d.id ? td.getAttribute("data-step") : null;
      setDrag({ kind: d.kind, id: d.id, x: e.clientX, y: e.clientY, target: d.target });
    };
    const up = async () => { const d = dragRef.current; dragRef.current = null; if (!d) return;
      if (!d.moved) { openItem(d.kind, itemOf(d.kind, d.id)); return; }
      setDrag(null); if (!d.target) return;
      if (d.kind === "turbine") { const t = S.turbines[d.id]; if (!t || t.step === d.target) return;
        if (ruleBlocked(t, d.target)) { notify(TI[d.target] >= TI.t4 && !t.roue ? "Attribuez d'abord une roue à " + t.num + " : cliquez sur sa carte." : "Impossible de passer en assemblage : aucun arbre disponible.", true); return; }
        await saveTurbine(t, { step: d.target }); }
      else if (d.kind === "arbre") { const a = S.arbres[d.id]; if (a && a.step !== d.target) await saveArbre(a, { step: d.target }); }
      else if (d.kind.startsWith("reco")) { const x = S.pieces[d.id]; if (x && x.step !== d.target) await saveReco(x, { step: d.target }); }
      else { const l = S.pieces[d.id]; if (l && l.step !== d.target) await saveLot(l, { step: d.target }); }
    };
    const esc = e => { if (e.key === "Escape" && dragRef.current) { dragRef.current = null; setDrag(null); } };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("keydown", esc); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- rendu ---- */
  const kpi = (title, big, body) => (<section aria-label={title} style={{ ...card(), display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h3 style={{ margin: 0, fontSize: FZF.sm, fontWeight: 700, color: T.ink700, flex: 1 }}>{title}</h3>
      <span style={{ fontFamily: T.fontDisplay, fontSize: 30, fontWeight: 300, lineHeight: 1, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>{big}</span></div>
    {body}
  </section>);
  const li = { display: "flex", justifyContent: "space-between", gap: 8, minHeight: 28, alignItems: "center", borderTop: "1px solid " + T.line, fontSize: FZF.sm };

  const renderHome = () => {
    const turbs = M.live, ready = turbs.filter(t => t.step === "ok").sort(sortNum), noWheel = turbs.filter(t => t.step === "s1").sort(sortNum);
    const roues = Object.values(S.roues).sort(byRef), injs = Object.values(S.injecteurs).sort(byRef);
    const maxR = Math.max(1, ...roues.map(r => +r.qte || 0)), sumR = roues.reduce((s, r) => s + (+r.qte || 0), 0), sumI = injs.reduce((s, r) => s + injTotal(r), 0);
    const upcoming = turbs.filter(t => t.step !== "ok").map(t => ({ t, s: M.sch[t.id] || { segs: [], end: null } })).sort((p, q) => (p.s.end ?? 1e9) - (q.s.end ?? 1e9) || sortNum(p.t, q.t));
    const H = Math.min(120, Math.ceil(Math.max(10, ...upcoming.map(u => u.s.end ?? 0))) + 2);
    const pct = x => Math.max(0, Math.min(100, (x / H) * 100));
    const ticks = []; for (let k = 0; k < H; k++) { const d = addWD(T0(), k); if (k === 0 || d.getDay() === 1) ticks.push({ k, l: fmtShort(d) }); }
    const hatch = c => "repeating-linear-gradient(135deg," + c + " 0 3px,transparent 3px 7px)";
    // v270 : besoins ORC / SAV de la gamme affichée — date, configuration, roue et injecteur demandés, turbines déjà attribuées
    const dem = (demandes || []).filter(d => String(d.gamme) === gamme).sort((a, b) => String(a.date || "9").localeCompare(String(b.date || "9")));
    const refQ = (c, ref) => { const x = Object.values(S[c] || {}).find(y => normTxt(y.ref) === normTxt(ref)); return x ? (c === "injecteurs" ? injTotal(x) : +x.qte || 0) : null; };
    const blocks = {
      demandes: (<section aria-label="Demandes ORC et SAV" style={card()}>
        <H2 sub="Envoyées par le site (Turbines › Besoins ORC et SAV) : ce qui est attendu, pour quand, avec quelle roue et quel injecteur.">Demandes ORC et SAV</H2>
        {dem.length === 0 ? <Muted>Aucune demande en attente pour la gamme {gammeL(gamme)}.</Muted> : <div role="region" tabIndex={0} aria-label="Demandes ORC et SAV" style={{ overflow: "auto", maxHeight: "min(60vh, 480px)" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: FZF.sm, fontVariantNumeric: "tabular-nums", minWidth: 640 }}>
          <thead><tr>{["Pour le", "Demande", "Turbine", "Roue", "Injecteur", "Turbines attribuées"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 12, fontWeight: 500, color: T.ink500, padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>{dem.map(d => { const late = d.turbines.some(t => !t.ready && t.end && d.date && t.end > d.date), rq = d.roue ? refQ("roues", d.roue) : null, iq = d.inj ? refQ("injecteurs", d.inj) : null;
            return <tr key={d.key}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", fontWeight: 700 }}>{d.date ? fmtShort(parseD(d.date)) : "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line }}><b>{d.label}</b>{d.kind === "sav" ? <span style={{ color: T.amber600, fontWeight: 700 }}> · SAV</span> : null}{d.sub ? <div style={{ fontSize: FZF.xs, color: T.ink500 }}>{d.sub}</div> : null}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" }}>{d.cfg}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" }}>{d.roue || <span style={{ color: T.ink500 }}>à préciser</span>}{rq != null ? <div style={{ fontSize: FZF.xs, color: rq > 0 ? T.ink500 : T.red600 }}>{rq} en stock</div> : null}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" }}>{d.inj || <span style={{ color: T.ink500 }}>à préciser</span>}{iq != null ? <div style={{ fontSize: FZF.xs, color: iq > 0 ? T.ink500 : T.red600 }}>{iq} en stock</div> : null}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid " + T.line }}>{d.turbines.map(t => <div key={t.num} style={{ fontSize: FZF.xs }}><b>{t.num}</b> · {t.livree ? "sortie le " + fmtShort(parseD(t.livree)) : t.ready ? "prête" : t.end ? "fin prévue " + fmtShort(parseD(t.end)) : "en cours"}</div>)}
                {d.manque > 0 && <div style={{ fontSize: FZF.xs, fontWeight: 700, color: T.red600 }}>{d.manque} à fournir</div>}{late && <div style={{ fontSize: FZF.xs, fontWeight: 700, color: T.red600 }}>prête après la date demandée</div>}</td>
            </tr>; })}</tbody></table></div>}
      </section>),
      pretes: (kpi("Turbines prêtes", ready.length, ready.length ? ready.map(t => <div key={t.id} style={li}><b>{t.num}</b><span style={{ color: T.ink500, fontSize: FZF.xs }}>{t.roue ? "roue " + t.roue : "config. roue à renseigner"}</span></div>) : <Muted>Aucune turbine prête pour l'instant.</Muted>)),
      sansroue: (kpi("Testées sans roue", noWheel.length, noWheel.length ? noWheel.map(t => <div key={t.id} style={li}><b>{t.num}</b><span style={{ color: T.ink500, fontSize: FZF.xs }}>{t.roue ? "roue " + t.roue + " attribuée" : "en stock depuis le " + fmtShort(parseD(t.since))}</span></div>) : <Muted>Aucune turbine en stock sans roue.</Muted>)),
      roues: (kpi("Roues équilibrées par réf.", sumR, roues.length ? roues.map(r => <div key={r.id} style={{ ...li, display: "block", padding: "4px 0" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>{r.ref}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{+r.qte || 0}</b></div>
          <div style={{ height: 4, background: T.surfaceAlt, borderRadius: 2, marginTop: 3 }}><div style={{ width: ((+r.qte || 0) / maxR * 100) + "%", height: 4, borderRadius: 2, background: P.arbre.c }} /></div></div>) : <Muted>Ajoutez les références dans l'onglet Stocks.</Muted>)),
      injecteurs: (kpi("Injecteurs par réf.", sumI, injs.length ? injs.map(r => <div key={r.id} style={{ ...li, alignItems: "flex-start", padding: "4px 0" }}><span>{r.ref}<br /><span style={{ fontSize: FZF.xs, color: T.ink500 }}>{+r.qte || 0} vierge{(+r.qte || 0) > 1 ? "s" : ""}</span>{vars(r).map(v => <span key={v.bouches} style={{ display: "block", fontSize: FZF.xs, color: T.ink700 }}>{v.qte} avec {v.bouches}/{r.ouvertures || "?"} bouchages</span>)}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{injTotal(r)}</b></div>) : <Muted>Ajoutez les références dans l'onglet Stocks.</Muted>)),
      vision: (
      <section aria-label="Dates prévisionnelles des prochaines turbines" style={card()}>
        <H2 sub="jours ouvrés" right={<span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", fontSize: FZF.xs, color: T.ink500 }}>
          {[["carter", "Montage carter"], ["assy", "Assemblage / finition"], ["tests", "Tests"], ["wait", "Attente arbre"]].map(([k, l]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 14, height: 9, borderRadius: 2, background: k === "wait" ? hatch(P.wait.c) : P[k].c, display: "inline-block" }} />{l}</span>)}
        </span>}>Dates prévisionnelles des prochaines turbines</H2>
        {upcoming.length === 0 ? <Muted>Aucune turbine en cours. Créez-en une depuis l'onglet Planning.</Muted> : (() => { const manyV = upcoming.length > 6, fullV = !!fullBoards.vision; return (<>
          <div role="region" tabIndex={0} aria-label={"Dates prévisionnelles" + (manyV && !fullV ? ", faire défiler pour voir toutes les turbines" : "")} style={{ overflow: "auto", maxHeight: manyV && !fullV ? "min(62vh, 540px)" : undefined }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 150px", gap: 10, alignItems: "end", fontSize: 12, color: T.ink500, padding: "4px 0", position: "sticky", top: 0, zIndex: 2, background: T.card, borderBottom: "1px solid " + T.line }}>
              <span style={{ position: "sticky", left: 0, background: T.card, zIndex: 1 }}>Turbine et étape actuelle</span>
              <div style={{ position: "relative", height: 16 }}>{ticks.map(t => <span key={t.k} style={{ position: "absolute", left: pct(t.k) + "%", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{t.l}</span>)}</div>
              <span style={{ textAlign: "right" }}>Prête le</span>
            </div>
            {upcoming.map(({ t, s }) => { const st = STEP[t.step] || T_STEPS[0], pc = P[st.ph] || P.att;
              const end = s.missing ? <><b style={{ color: P.missing.ink }}>Arbre manquant</b><small>pas d'arbre en cours</small></>
                : s.noRoue ? <><b style={{ color: P.wait.ink }}>Roue à attribuer</b><small>{t.step === "s1" ? "en stock, testée sans roue" : "testée sans roue le " + fmtD(offDate(s.end))}</small></>
                : <><b>{fmtD(offDate(s.end))}</b><small>{s.wait ? "dont " + fmtJ(s.wait) + " d'attente arbre" : t.affaire || " "}</small></>;
              return (<div key={t.id} style={{ display: "grid", gridTemplateColumns: "210px 1fr 150px", gap: 10, alignItems: "center", minHeight: 46, borderTop: "1px solid " + T.line }}>
                <button type="button" onClick={() => openTurbine(t)} style={{ border: "none", background: T.card, textAlign: "left", padding: "4px 0", cursor: "pointer", fontFamily: T.font, color: T.ink900, minWidth: 0, position: "sticky", left: 0, zIndex: 1, alignSelf: "stretch" }}>
                  <b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{t.num}</b>{t.roue ? <span style={{ fontSize: FZF.xs, color: T.ink500 }}> roue {t.roue}</span> : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZF.xs, color: T.ink700 }}><i style={{ width: 8, height: 8, borderRadius: 4, background: pc.c, display: "inline-block", flexShrink: 0 }} /><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{M.lbl(st.id)}</span></div>
                  <div style={{ height: 3, background: T.surfaceAlt, borderRadius: 2, marginTop: 3 }}><div style={{ width: Math.round(M.progressOf(t) * 100) + "%", height: 3, borderRadius: 2, background: pc.c }} /></div>
                </button>
                <div style={{ position: "relative", height: 16, background: T.surface, borderRadius: 3 }}>
                  {ticks.slice(1).map(k => <i key={k.k} style={{ position: "absolute", left: pct(k.k) + "%", top: -4, bottom: -4, width: 1, background: T.line }} />)}
                  {s.segs.map((g, i) => <div key={i} title={g.ph === "wait" ? "Attente arbre" : g.ph === "missing" ? "Aucun arbre prévu" : PHASES[g.ph]} style={{ position: "absolute", top: 2, bottom: 2, left: pct(g.from) + "%", width: (g.to === null ? 100 - pct(g.from) : pct(g.to) - pct(g.from)) + "%", borderRadius: 2, background: g.ph === "wait" ? hatch(P.wait.c) : g.ph === "missing" ? hatch(P.missing.c) : (P[g.ph] || P.att).c }} />)}
                  <i title="Aujourd'hui" style={{ position: "absolute", left: 0, top: -6, bottom: -6, width: 2, background: T.red500 }} />
                </div>
                <div style={{ textAlign: "right", fontSize: FZF.sm, display: "flex", flexDirection: "column", lineHeight: 1.25 }}>{end}</div>
              </div>); })}
          </div></div>
          {manyV && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {!fullV && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>Faites défiler la liste : les en-têtes et la première colonne restent visibles.</span>}
            <button type="button" style={btn("")} aria-expanded={fullV} onClick={() => setFullBoards(o => ({ ...o, vision: !o.vision }))}>{fullV ? "Réduire l'affichage" : "Afficher les " + upcoming.length + " turbines"}</button>
          </div>}
        </>); })()}
        <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 8 }}>Calcul en jours ouvrés à partir des durées de la gamme, du temps déjà passé à l'étape en cours et de la disponibilité des arbres équilibrés.</div>
      </section>),
    };
    return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: 12, alignItems: "start" }}>{orderedBlocks("accueil", blocks, k => k === "vision" || k === "demandes" ? { gridColumn: "1 / -1" } : undefined)}</div>);
  };

  const board = (kind, steps, lockId, items, nameCell, cardText) => {
    const groups = []; steps.forEach(s => { const g = groups[groups.length - 1]; if (g && g.ph === s.ph) g.n++; else groups.push({ ph: s.ph, n: 1, first: s.id }); });
    const HEAD1 = 50, full = !!fullBoards[kind], many = items.length > 5;
    const th = { position: "sticky", top: 0, zIndex: 1, background: T.surface, fontSize: 12, color: T.ink500, fontWeight: 600, padding: "4px 6px", textAlign: "left", borderBottom: "1px solid " + T.line, whiteSpace: "nowrap" };
    const item = drag && drag.kind === kind ? itemOf(kind, drag.id) : null;
    return (<div>
      <div role="region" tabIndex={0} aria-label={"Tableau " + KLABEL[kind].toLowerCase() + (many && !full ? ", faire défiler pour voir toutes les lignes" : "")}
        style={{ overflow: "auto", maxHeight: many && !full ? "min(62vh, 540px)" : undefined, border: "1px solid " + T.line, borderRadius: 10, background: T.card }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontFamily: T.font }}>
        <thead>
          <tr><th rowSpan={2} style={{ ...th, left: 0, zIndex: 3, minWidth: 190, verticalAlign: "bottom" }}>{KLABEL[kind]}</th>
            {groups.map(g => <th key={g.first} colSpan={g.n} style={{ ...th, height: HEAD1, boxSizing: "border-box", verticalAlign: "top", borderTop: "3px solid " + (P[g.ph] || P.att).c, color: T.ink700, fontWeight: 700 }}>{PHASES[g.ph]}{g.first === lockId ? <small style={{ display: "block", fontWeight: 500, color: T.ink500 }}>Arbre disponible requis</small> : null}</th>)}</tr>
          <tr>{steps.map(s => <th key={s.id} style={{ ...th, top: HEAD1, minWidth: 104, whiteSpace: "normal", lineHeight: 1.2, borderLeft: s.id === lockId ? "2px solid " + T.ink500 : undefined }}>{M.lbl(s.id)}{M.dur(s.id) ? <em style={{ display: "block", fontStyle: "normal", color: T.ink300, fontVariantNumeric: "tabular-nums" }}>{fmtJ(M.dur(s.id))}</em> : null}</th>)}</tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={steps.length + 1} style={{ padding: 14, color: T.ink500, fontSize: FZF.sm }}>{EMPTY_TXT[kind]}</td></tr>}
          {items.map(x => { const idx = KI[kind][x.step] ?? 0; const dragging = drag && drag.id === x.id;
            return (<tr key={x.id}>
              <td style={{ position: "sticky", left: 0, zIndex: 2, background: T.card, borderTop: "1px solid " + T.line, padding: "6px 8px", verticalAlign: "top", minWidth: 190, maxWidth: 230 }}>{nameCell(x)}</td>
              {steps.map((c, j) => { const pc = P[c.ph] || P.att; const isCur = j === idx; const st = dragging && item ? cellState(kind, item, c.id) : null; const hot = dragging && drag.target === c.id;
                return (<td key={c.id} data-step={c.id} data-row={x.id} style={{ borderTop: "1px solid " + T.line, borderLeft: c.id === lockId ? "2px solid " + T.ink500 : "1px solid " + T.line, padding: 4, verticalAlign: "middle", minWidth: 104, height: 52, boxSizing: "border-box",
                  background: hot ? (st === "blocked" ? P.missing.bg : pc.bg) : st === "blocked" ? "repeating-linear-gradient(135deg," + T.surfaceAlt + " 0 4px,transparent 4px 8px)" : j < idx ? T.surface : "transparent", outline: hot ? "2px solid " + (st === "blocked" ? P.missing.c : pc.c) : "none", outlineOffset: -2 }}>
                  {isCur && <button type="button" aria-label={KLABEL[kind] + " " + itemName(kind, x) + " : " + M.lbl(c.id) + ". Glisser sur la ligne pour changer d'étape, cliquer pour la fiche."} onPointerDown={e => onCardDown(e, kind, x.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(kind, x); } }}
                    style={{ width: "100%", textAlign: "left", border: "1px solid " + pc.c, borderLeft: "4px solid " + pc.c, background: pc.bg, color: pc.ink, borderRadius: 6, padding: "4px 6px", cursor: readOnly ? "pointer" : "grab", fontFamily: T.font, touchAction: "none", opacity: dragging ? 0.45 : 1 }}>
                    <b style={{ display: "block", fontFamily: T.fontMono, fontSize: 12 }}>{itemName(kind, x)}</b><span style={{ fontSize: 11 }}>{cardText(x, c)}</span>
                  </button>}
                </td>); })}
            </tr>); })}
        </tbody>
      </table>
      </div>
      {many && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
        {!full && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>Faites défiler le tableau : les en-têtes et la première colonne restent visibles.</span>}
        <button type="button" style={btn("")} aria-expanded={full} onClick={() => setFullBoards(o => ({ ...o, [kind]: !o[kind] }))}>{full ? "Réduire l'affichage" : "Afficher les " + items.length + " lignes"}</button>
      </div>}
    </div>);
  };

  const renderPlanning = () => {
    const pieces = Object.values(S.pieces), t0 = iso(today0());
    const appro = pieces.filter(p => p.statut === "appro").sort((a, b) => (a.dateLiv || "9").localeCompare(b.dateLiv || "9"));
    const cq = pieces.filter(p => p.statut === "cq").sort((a, b) => (a.since || "").localeCompare(b.since || ""));
    const nc = pieces.filter(p => p.statut === "nc").sort((a, b) => (a.since || "").localeCompare(b.since || ""));
    const late = { color: T.red600, fontWeight: 600 };
    const pItem = (p, meta, acts) => (<div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid " + T.line, padding: "6px 0", minHeight: 36 }}>
      <button type="button" onClick={() => openPiece(p)} style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: T.font, color: T.ink900, padding: 0 }}>
        <span style={{ fontSize: FZF.sm, fontWeight: 600 }}>{p.designation || "Pièce"}{p.qte > 1 ? <span style={{ color: T.ink500 }}> ×{p.qte}</span> : null}{p.turbine ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: T.surfaceAlt, color: T.ink700, borderRadius: 99, padding: "0 7px" }}>{p.turbine}</span> : null}</span>
        <span style={{ display: "block", fontSize: FZF.xs, color: T.ink500 }}>{meta}</span>
      </button>
      {!readOnly && <span style={{ display: "inline-flex", gap: 4 }}>{acts}</span>}
    </div>);
    const panel = (title, sub, kind, list, empty) => (<section aria-label={title} style={card()}>
      <H2 sub={sub} right={!readOnly && <button type="button" style={btn("")} onClick={() => openPiece(null, kind)}>Ajouter</button>}>{title}</H2>
      {list.length ? list : <Muted>{empty}</Muted>}
    </section>);
    const turbs = M.live.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || sortNum(a, b));
    const arbres = Object.values(S.arbres).filter(a => !M.used.has(a.id) && !a.livree).sort((a, b) => (AI[b.step] ?? 0) - (AI[a.step] ?? 0) || sortNum(a, b));
    const mounted = Object.values(S.arbres).filter(a => M.used.has(a.id));
    const nAvail = M.availableArbres().length;
    const chip = (ok, txt, soft) => <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "0 7px", background: ok ? P.dispo.bg : P.missing.bg, color: ok ? P.dispo.ink : P.missing.ink, opacity: soft ? 0.8 : 1 }}>{txt}</span>;
    const blocks = {
      pieces: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12, alignItems: "start" }}>
        {panel("Appro", "Pièces pas encore livrées", "appro", appro.map(p => pItem(p, <>{p.ref ? p.ref + " — " : ""}{p.po || p.fournisseur ? [p.po, p.fournisseur].filter(Boolean).join(", ") + " — " : <span style={late}>PO et fournisseur à renseigner — </span>}livraison {p.dateLiv ? <span style={p.dateLiv < t0 ? late : undefined}>{fmtD(parseD(p.dateLiv))}</span> : "non datée"}</>,
          <button type="button" style={btn("")} title="Passer en contrôle qualité" onClick={() => pieceAction(p.id, "recue")}>Reçue</button>)), "Rien en attente de livraison.")}
        {panel("Contrôle qualité", "En cours ou en attente de contrôle", "cq", cq.map(p => pItem(p, (p.ref ? p.ref + " — " : "") + (p.cqEtat === "en cours" ? "contrôle en cours" : "en attente de contrôle"),
          <><button type="button" style={btn("")} onClick={() => pieceAction(p.id, "conforme")}>Conforme</button><button type="button" style={btn("danger")} onClick={() => pieceAction(p.id, "nc")}>NC</button></>)), "Aucune pièce au contrôle.")}
        {panel("Non-conformités", "Pièces déclarées NC", "nc", nc.map(p => pItem(p, (p.ref ? p.ref + " — " : "") + (p.motif || "motif à préciser"),
          <button type="button" style={btn("")} title="Retirer de la liste" onClick={() => pieceAction(p.id, "traitee")}>Soldée</button>)), "Aucune pièce NC.")}
      </div>),
      turbines: (
      <section aria-label="Turbines">
        <H2 sub={"Glissez une carte sur sa ligne pour changer d'étape · " + nAvail + " arbre" + (nAvail > 1 ? "s" : "") + " prêt" + (nAvail > 1 ? "s" : "") + " à monter"} right={!readOnly && <button type="button" style={btn("primary")} onClick={() => openTurbine(null)}>Nouvelle turbine</button>}>Turbines</H2>
        {board("turbine", T_STEPS, "a1", turbs, t => { const i = TI[t.step] ?? 0, sc = M.sch[t.id] || {};
          return (<button type="button" onClick={() => openTurbine(t)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{t.num}</b>{t.affaire ? <span style={{ fontSize: FZF.xs, color: T.ink500 }}> {t.affaire}</span> : null}
            <div style={{ fontSize: FZF.xs, color: T.ink500 }}>{turbineType(t) ? turbineType(t) + " · " : ""}{t.roue ? "Roue " + t.roue : "Roue non attribuée"}</div>
            {M.hasArbre(t) ? chip(true, "Arbre " + S.arbres[t.arbreId].num) : i < IA1 ? (sc.arbrePrevu ? chip(true, "Arbre prévu : " + sc.arbrePrevu, true) : chip(false, "Aucun arbre prévu")) : t.step === "ok" ? null : chip(false, "Arbre à affecter")}
            {(() => { const n = nextShort("turbine", t); return n ? <div>{chip(false, "Manque pour " + M.lbl(n.step) + " : " + n.missing.join(", "))}</div> : null; })()}
            <div style={{ fontSize: FZF.xs, fontWeight: 700, marginTop: 2, color: t.step === "ok" ? P.dispo.ink : sc.missing ? T.red600 : sc.noRoue ? P.wait.ink : T.ink700 }}>{t.step === "ok" ? "Prête" : sc.missing ? "Date bloquée : arbre manquant" : sc.noRoue ? "Roue à attribuer" : "Prête le " + fmtD(offDate(sc.end))}</div>
          </button>); },
          (t, c) => { const late = M.dur(c.id) && elapsed(t) > M.dur(c.id); const txt = c.id === "ok" ? (t.roue ? "roue " + t.roue : "prête") : c.id === "s1" ? (t.roue ? "roue " + t.roue : "sans roue") : c.id === "cc" ? "attend un arbre" : c.id === "att" ? (t.lancement ? "lancement " + fmtShort(parseD(t.lancement)) : "à lancer") : "J" + (elapsed(t) + 1) + " / " + Math.max(1, Math.ceil(M.dur(c.id))); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; })}
      </section>),
      reco: (
      <section aria-label="Turbines reconditionnées">
        <H2 sub="Indiquez OK ou NOK pour chaque contrôle dans la fiche. Après le démontage rotor / stator, la turbine est dissociée en un carter câblé et un arbre." right={!readOnly && <button type="button" style={btn("")} onClick={() => openReco(null)}>Nouvelle turbine reconditionnée</button>}>Turbines reconditionnées</H2>
        {(() => { const recos = Object.values(S.pieces).filter(p => p.statut === "reco");
          const of = k => recos.filter(p => recoKind(p) === k).sort((a, b) => (KI[k][a.step] ?? 0) - (KI[k][b.step] ?? 0) || sortNum(a, b));
          const sub = t => <div style={{ fontSize: FZF.sm, fontWeight: 700, color: T.ink700, margin: "14px 0 6px" }}>{t}</div>;
          const okNok = x => { const all = Object.values(x.checks || {}).flatMap(o => Object.values(o)); return all.filter(r => r === "ok").length + " OK, " + all.filter(r => r === "nok").length + " NOK"; };
          const name = (x, lines) => (<button type="button" onClick={() => openReco(x)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{x.num}</b>{turbineType(x) && x.part !== "arbre" ? <span style={{ fontSize: FZF.xs, color: T.ink500 }}> {turbineType(x)}</span> : null}
            {lines}<div style={{ fontSize: FZF.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{okNok(x)}</div></button>);
          const projL = x => <div style={{ fontSize: FZF.xs, color: T.ink700 }}>{x.affaire ? "Projet " + x.affaire : "Projet d'origine à renseigner"}</div>;
          const cardT = fin => (x, c) => { if (c.id === fin) return fin === "qd" ? "dissociée" : "terminé"; const late = M.dur(c.id) && elapsed(x) > M.dur(c.id); const r = ((x.checks || {})[c.id]) || {}, n = (RECO_CHECKS[c.id] || []).length, done = Object.keys(r).length;
            const txt = "J" + (elapsed(x) + 1) + (M.dur(c.id) ? " / " + Math.ceil(M.dur(c.id)) : "") + (n ? " · " + done + "/" + n : ""); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; };
          return (<>
            {sub("Contrôle et démontage")}
            {board("reco", Q_STEPS, null, of("reco"), x => name(x, <>{projL(x)}{x.step === "qd" ? <div>{chip(true, "Dissociée : carter " + x.num + ", arbre " + (x.arbreNum || ""))}</div> : null}</>), cardT("qd"))}
            {sub("Arbres en reconditionnement")}
            {board("recoA", QA_STEPS, null, of("recoA"), x => name(x, <><div style={{ fontSize: FZF.xs, color: T.ink500 }}>{[x.ref, x.origine ? "de la turbine " + x.origine : ""].filter(Boolean).join(", ")}</div>{projL(x)}
              {x.arbreId ? <div>{chip(true, "Réintégré aux arbres")}</div> : x.arbreNok ? <div>{chip(false, "Non conforme")}</div> : null}</>), cardT("qaf"))}
            {sub("Carters câblés en reconditionnement")}
            {board("recoC", QC_STEPS, null, of("recoC"), x => name(x, <>{projL(x)}
              {x.turbineId ? <div>{chip(true, "Réintégré aux turbines")}</div> : x.step === "q7" ? <div>{chip(false, "À décâbler")}</div> : null}</>), cardT("qcf"))}
          </>); })()}
      </section>),
      arbres: (
      <section aria-label="Arbres">
        <H2 sub="Un arbre « Disponible » (contrôlé, roulements et douille montés) est affecté automatiquement à la turbine qui passe en assemblage." right={!readOnly && <button type="button" style={btn("")} onClick={() => openArbre(null)}>Nouvel arbre</button>}>Arbres</H2>
        {board("arbre", A_STEPS, null, arbres, a => (<button type="button" onClick={() => openArbre(a)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{a.num}</b><div style={{ fontSize: FZF.xs, color: T.ink500 }}>{a.ref ? a.ref + " · " : ""}{a.step === "b6" ? "Prêt à monter" : "Dispo le " + fmtD(addWD(T0(), Math.ceil(M.arbreReadyOffset(a) - 1e-9)))}</div>
            {(() => { const n = nextShort("arbre", a); return n ? <div>{chip(false, "Manque pour " + M.lbl(n.step) + " : " + n.missing.join(", "))}</div> : null; })()}
          </button>),
          (a, c) => { const late = M.dur(c.id) && elapsed(a) > M.dur(c.id); const txt = c.id === "b6" ? "disponible" : c.id === "b0" ? (a.lancement ? "lancement " + fmtShort(parseD(a.lancement)) : "à lancer") : "J" + (elapsed(a) + 1) + (M.dur(c.id) ? " / " + Math.ceil(M.dur(c.id)) : ""); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; })}
        {mounted.length > 0 && <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 6 }}>Arbres montés : {mounted.map(a => a.num + " sur " + ((M.live.find(t => t.arbreId === a.id) || {}).num || "")).join(", ")}</div>}
      </section>),
      roues: (
      <section aria-label="Roues à équilibrer">
        <H2 sub="Après le contrôle qualité. À la dernière étape, les roues passent dans le stock de roues équilibrées.">Roues à équilibrer</H2>
        {board("roue", R_STEPS, null, Object.values(S.pieces).filter(p => p.statut === "equil").sort((a, b) => (RI[b.step] ?? 0) - (RI[a.step] ?? 0) || byRef(a, b)), l => (<button type="button" onClick={() => openLot(l)} style={{ border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", fontFamily: T.font, color: T.ink900 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{l.ref || l.designation}</b> <span style={{ fontSize: FZF.xs, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>×{+l.qte || 0}</span>
            <div style={{ fontSize: FZF.xs, color: T.ink500 }}>{[l.po, l.fournisseur].filter(Boolean).join(", ")}</div>
            <div style={{ fontSize: FZF.xs, fontWeight: 700, color: T.ink700 }}>En stock vers le {fmtD(addWD(T0(), Math.ceil(lotOffset(l) - 1e-9)))}</div>
          </button>),
          (l, c) => { const late = M.dur(c.id) && elapsed(l) > M.dur(c.id); const txt = "J" + (elapsed(l) + 1) + (M.dur(c.id) ? " / " + Math.ceil(M.dur(c.id)) : ""); return late ? <b style={{ color: T.red600 }}>{txt}</b> : txt; })}
      </section>),
    };
    return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{orderedBlocks("planning", blocks)}</div>);
  };

  const qty = (onMinus, n, onPlus, lab) => (<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    {!readOnly && <button type="button" aria-label={"Retirer " + lab} onClick={onMinus} style={{ ...btn(""), minWidth: 28, padding: 0 }}>−</button>}
    <b style={{ minWidth: 22, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{n}</b>
    {!readOnly && <button type="button" aria-label={"Ajouter " + lab} onClick={onPlus} style={{ ...btn(""), minWidth: 28, padding: 0 }}>+</button>}
  </span>);
  const thS = { fontSize: 12, color: T.ink500, fontWeight: 600, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid " + T.line };
  const tdS = { padding: "6px 8px", borderTop: "1px solid " + T.line, fontSize: FZF.sm, verticalAlign: "top" };
  const renderStocks = () => {
    const roues = Object.values(S.roues).sort(byRef), injs = Object.values(S.injecteurs).sort(byRef);
    const stk = Object.values(S.pieces).filter(p => p.statut === "stock").sort((a, b) => (a.designation || "").localeCompare(b.designation || "", "fr") || byRef(a, b) || (a.po || "").localeCompare(b.po || "", "fr", { numeric: true }));
    const gKey = p => normTxt(p.designation) + "|" + normTxt(p.ref);
    const groups = []; stk.forEach(p => { const g = groups[groups.length - 1]; if (g && g.key === gKey(p)) g.items.push(p); else groups.push({ key: gKey(p), items: [p] }); });
    const mono = { ...tdS, fontFamily: T.fontMono, fontSize: FZF.xs, fontVariantNumeric: "tabular-nums" };
    const blocks = {
      roues: (
      <section aria-label="Roues équilibrées" style={card()}>
        <H2 right={!readOnly && <button type="button" style={btn("")} onClick={() => openStock("roues", null)}>Ajouter une référence</button>}>Roues équilibrées</H2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Référence</th><th style={thS}>Quantité</th><th style={thS} /></tr></thead><tbody>
          {roues.length === 0 && <tr><td colSpan={3} style={{ ...tdS, color: T.ink500 }}>Aucune référence.</td></tr>}
          {roues.map(r => <tr key={r.id}><td style={tdS}>{r.ref}</td><td style={tdS}>{qty(() => bumpQty("roues", r, -1), +r.qte || 0, () => bumpQty("roues", r, 1), "une roue " + r.ref)}</td><td style={{ ...tdS, textAlign: "right" }}>{!readOnly && <button type="button" style={btn("")} onClick={() => openStock("roues", r)}>Modifier</button>}</td></tr>)}
        </tbody></table>
      </section>),
      injecteurs: (
      <section aria-label="Injecteurs" style={card()}>
        <H2 right={!readOnly && <button type="button" style={btn("")} onClick={() => openStock("injecteurs", null)}>Ajouter une référence</button>}>Injecteurs</H2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Référence</th><th style={thS}>Vierges</th><th style={thS}>Avec bouchages</th><th style={thS} /></tr></thead><tbody>
          {injs.length === 0 && <tr><td colSpan={4} style={{ ...tdS, color: T.ink500 }}>Aucune référence.</td></tr>}
          {injs.map(r => <tr key={r.id}><td style={tdS}>{r.ref}<br /><span style={{ fontSize: FZF.xs, color: r.ouvertures ? T.ink500 : T.red600 }}>{r.ouvertures ? r.ouvertures + " ouvertures" : "ouvertures à renseigner"}</span></td>
            <td style={tdS}>{qty(() => bumpQty("injecteurs", r, -1), +r.qte || 0, () => bumpQty("injecteurs", r, 1), "un injecteur vierge " + r.ref)}</td>
            <td style={tdS}>{vars(r).length === 0 && <span style={{ fontSize: FZF.xs, color: T.ink500 }}>Aucun</span>}
              {vars(r).map(v => <div key={v.bouches} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>{qty(() => bumpVar(r, v.bouches, -1), v.qte, () => bumpVar(r, v.bouches, 1), "un injecteur " + v.bouches + " bouchages")}<span style={{ fontSize: FZF.xs, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{v.bouches}/{r.ouvertures || "?"}</span></div>)}
              {!readOnly && <button type="button" style={{ ...btn(""), marginTop: 4 }} onClick={() => addVar(r)}>Ajouter un bouchage</button>}</td>
            <td style={{ ...tdS, textAlign: "right" }}>{!readOnly && <button type="button" style={btn("")} onClick={() => openStock("injecteurs", r)}>Modifier</button>}</td></tr>)}
        </tbody></table>
      </section>),
      stock: (
      <section aria-label="Pièces en stock" style={card()}>
        <H2 sub={groups.length ? groups.length + " pièce" + (groups.length > 1 ? "s" : "") + ", " + stk.length + " ligne" + (stk.length > 1 ? "s" : "") + " par commande" : undefined} right={!readOnly && <button type="button" style={btn("")} onClick={() => openStockPiece(null)}>Ajouter une pièce</button>}>Pièces en stock</H2>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}><thead><tr><th style={thS}>Pièce</th><th style={thS}>Quantité</th><th style={thS}>Numéros</th><th style={thS}>N° de PO</th><th style={thS}>Fournisseur</th><th style={thS} /></tr></thead><tbody>
          {stk.length === 0 && <tr><td colSpan={6} style={{ ...tdS, color: T.ink500 }}>Aucune pièce en stock.</td></tr>}
          {groups.map(g => [...g.items.map(p => <tr key={p.id}><td style={tdS}>{p.designation}{p.ref ? <span style={{ color: T.ink500 }}> {p.ref}</span> : null}</td>
            <td style={tdS}>{qty(() => bumpQty("pieces", p, -1), +p.qte || 0, () => bumpQty("pieces", p, 1), "une pièce " + [p.designation, p.ref].filter(Boolean).join(" "))}</td>
            <td style={mono}>{p.numeros || "—"}</td>
            <td style={{ ...mono, whiteSpace: "nowrap" }}>{p.po || "—"}</td>
            <td style={tdS}>{p.fournisseur || "—"}</td>
            <td style={{ ...tdS, textAlign: "right" }}>{!readOnly && <button type="button" style={btn("")} onClick={() => openStockPiece(p)}>Modifier</button>}</td></tr>),
            g.items.length > 1 ? <tr key={g.key + "-total"}><td style={{ ...tdS, borderTop: "none", paddingTop: 0, fontSize: FZF.xs, color: T.ink500 }}>Total {g.items[0].designation}{g.items[0].ref ? " " + g.items[0].ref : ""}</td>
              <td style={{ ...tdS, borderTop: "none", paddingTop: 0, fontWeight: 700, fontVariantNumeric: "tabular-nums", paddingLeft: 44 }}>{g.items.reduce((n, p) => n + (+p.qte || 0), 0)}</td><td colSpan={4} style={{ ...tdS, borderTop: "none", paddingTop: 0 }} /></tr> : null])}
        </tbody></table></div>
      </section>),
    };
    return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 12, alignItems: "start" }}>{orderedBlocks("stocks", blocks, k => k === "stock" ? { gridColumn: "1 / -1" } : undefined)}</div>);
  };

  const [pd, setPd] = useState(null); const [mail, setMail] = useState("");
  const renderParams = () => {
    const cur = pd || { d: { ...S.params.d }, l: { ...S.params.l } };
    const dOf = id => (cur.d[id] != null ? cur.d[id] : STEP[id].d), lOf = id => cur.l[id] != null ? cur.l[id] : M.lbl(id);
    const inp = { height: 30, border: "1px solid " + T.line, borderRadius: 6, background: T.card, color: T.ink900, padding: "0 8px", fontSize: FZF.sm, fontFamily: T.font, boxSizing: "border-box" };
    const rows = steps => steps.map(s => <tr key={s.id}><td style={tdS}><input aria-label={"Nom de l'étape " + STEP[s.id].l} disabled={readOnly} value={lOf(s.id)} onChange={e => setPd({ ...cur, l: { ...cur.l, [s.id]: e.target.value } })} style={{ ...inp, width: "100%" }} />{needsTable(gamme)[s.id] && <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 3 }}>Consomme : {needsTable(gamme)[s.id].map(n => n.l).join(", ")}</div>}{RECO_CHECKS[s.id] && <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 3 }}>Contrôles : {RECO_CHECKS[s.id].map(c => c.l).join(", ")}</div>}</td>
      <td style={{ ...tdS, width: 110 }}><input aria-label={"Durée en jours ouvrés de " + STEP[s.id].l} disabled={readOnly} type="number" min={0} step={0.5} value={dOf(s.id)} onChange={e => setPd({ ...cur, d: { ...cur.d, [s.id]: e.target.value } })} style={{ ...inp, width: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }} /></td></tr>);
    const grp = (title, ph, steps) => <><tr><td colSpan={2} style={{ ...tdS, fontWeight: 700, color: T.ink900, borderLeft: "4px solid " + (P[ph] || P.att).c, background: T.surface }}>{title}</td></tr>{rows(steps)}</>;
    const save = async () => { const p = { d: {}, l: {} };
      Object.keys(cur.d).forEach(id => { const v = parseFloat(String(cur.d[id]).replace(",", ".")); if (!isNaN(v) && v >= 0 && v !== STEP[id].d) p.d[id] = v; });
      Object.keys(cur.l).forEach(id => { const v = String(cur.l[id] || "").trim(); if (v && v !== STEP[id].l) p.l[id] = v; });
      if (await saveParams(p)) { setPd(null); notify("Gamme " + gammeL(gamme) + " enregistrée"); } };
    const access = Array.isArray(S.access) ? S.access : [];
    return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: FZF.sm, color: T.ink500, maxWidth: 820 }}>Les durées sont en jours ouvrés (lundi à vendredi). Elles alimentent les dates prévisionnelles de l'accueil. Pour l'équilibrage sous-traité, une date de retour saisie sur l'arbre remplace la durée standard.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 12, alignItems: "start" }}>
        <section aria-label="Étapes turbine" style={card()}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Étape turbine</th><th style={thS}>Durée (j)</th></tr></thead><tbody>
          {grp("Montage carter", "carter", T_STEPS.filter(s => s.ph === "carter"))}{grp("Assemblage / finition", "assy", T_STEPS.filter(s => s.ph === "assy"))}{grp("Tests", "tests", T_STEPS.filter(s => s.ph === "tests"))}{grp("Turbines reconditionnées", "reco", [...Q_STEPS, ...QA_STEPS, ...QC_STEPS].filter(s => s.ph === "reco" || s.ph === "recond"))}
        </tbody></table></section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section aria-label="Étapes arbre" style={card()}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thS}>Étape arbre et roue</th><th style={thS}>Durée (j)</th></tr></thead><tbody>
            {grp("Arbre", "arbre", A_STEPS.filter(s => s.ph === "arbre"))}{grp("Roues à équilibrer", "roue", R_STEPS.filter(s => s.ph === "roue"))}</tbody></table>
            {!readOnly && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button type="button" style={btn("primary")} onClick={save}>Enregistrer la gamme</button>
              <button type="button" style={btn("")} onClick={async () => { if (window.confirm("Revenir aux durées et noms d'étapes par défaut ?") && await saveParams({ d: {}, l: {} })) { setPd(null); notify("Gamme remise par défaut"); } }}>Revenir aux valeurs par défaut</button></div>}
          </section>
          {owner && <section aria-label="Accès à la page" style={card()}>
            <H2 sub="propriétaire seulement">Accès à la page</H2>
            <div style={{ fontSize: FZF.xs, color: T.ink500, marginBottom: 8 }}>En plus de vous, ces comptes voient et modifient Production turbines (adresse de connexion au site).</div>
            {access.length === 0 && <Muted>Aucun compte ajouté.</Muted>}
            {access.map(m => <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, borderTop: "1px solid " + T.line, fontSize: FZF.sm }}><span style={{ flex: 1 }}>{m}</span><button type="button" style={btn("danger")} onClick={() => api.setAccess(access.filter(x => x !== m))}>Retirer</button></div>)}
            <form onSubmit={async e => { e.preventDefault(); const m = mail.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { notify("Saisissez une adresse e-mail valide.", true); return; } if (!access.includes(m) && await api.setAccess([...access, m])) { setMail(""); notify(m + " a accès à Production turbines"); } }} style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="email" aria-label="Adresse e-mail à ajouter" placeholder="prenom.nom@enogia.com" value={mail} onChange={e => setMail(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button type="submit" style={btn("primary")}>Ajouter</button>
            </form>
          </section>}
        </div>
      </div>
    </div>);
  };

  return (<div style={{ fontFamily: T.font }}>
    <PageHead title="Production turbines" accent={P.carter.c} sub={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · turbines " + gammeL(gamme) + (readOnly ? " · lecture seule" : "")} />
    <div role="group" aria-label="Gamme de turbines" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ fontSize: FZF.sm, color: T.ink700, fontWeight: 600 }}>Gamme</span>
      <div style={{ display: "inline-flex", border: "1px solid " + T.line, borderRadius: 8, overflow: "hidden" }}>
        {GAMMES.map(([g, l]) => <button key={g} type="button" aria-pressed={gamme === g} onClick={() => { setGamme(g); setPd(null); }}
          style={{ border: "none", padding: "6px 14px", minHeight: 32, cursor: "pointer", fontFamily: T.font, fontSize: FZF.sm, fontWeight: 700, background: gamme === g ? T.ink900 : T.card, color: gamme === g ? T.card : T.ink700 }}>Turbines {l}</button>)}
      </div>
      <span style={{ fontSize: FZF.xs, color: T.ink500 }}>Accueil, planning, stocks et gamme sont propres à chaque gamme.</span>
    </div>
    <div role="tablist" aria-label="Sous-pages Production turbines" style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 12, overflowX: "auto" }}>
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ border: "none", background: "transparent", padding: "8px 0", marginBottom: -1, borderBottom: "2px solid " + (tab === k ? T.ink900 : "transparent"), color: tab === k ? T.ink900 : T.ink500, fontWeight: tab === k ? 700 : 500, fontSize: FZF.sm, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", minHeight: 32 }}>{l}</button>)}
    </div>
    <div key={tab} className="enogia-view-in">
      {tab === "accueil" && renderHome()}
      {tab === "planning" && renderPlanning()}
      {tab === "stocks" && renderStocks()}
      {tab === "parametres" && renderParams()}
    </div>
    {form && <FormDialog {...form} readOnly={readOnly} notify={notify} onClose={() => setForm(null)} />}
    {drag && drag.x != null && <div aria-hidden="true" style={{ position: "fixed", left: drag.x + 12, top: drag.y + 12, zIndex: 10020, pointerEvents: "none", background: T.ink900, color: T.card, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, fontFamily: T.fontMono, boxShadow: T.shadowLg }}>{itemName(drag.kind, itemOf(drag.kind, drag.id))}{drag.target ? " → " + M.lbl(drag.target) : ""}</div>}
    {toast && <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 10030, background: toast.err ? T.redFill : T.ink900, color: toast.err ? "#fff" : T.card, borderRadius: 10, padding: "8px 14px", fontSize: FZF.sm, fontWeight: 600, boxShadow: T.shadowLg, maxWidth: "min(560px,92vw)" }}><NavIcon name={toast.err ? "warning" : "check"} size={14} /> {toast.msg}</div>}
  </div>);
}
// ===== FIN PAGE =====
