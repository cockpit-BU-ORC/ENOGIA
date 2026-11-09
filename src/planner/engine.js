// ── Moteur de planification (remplace MS Project pour l'ordonnancement) ───────────────────────────────
// Modèle : chaque PJ a 5 étapes (Arrivée, Production, Tests, Fin de production, Départ) ; chaque étape a une durée en
// jours ouvrés (0 = jalon), une éventuelle « date imposée » (pas avant le…) et peut être reliée à n'importe quelle autre
// étape (du même PJ ou d'un autre) par un lien FS / SS / FF / SF avec décalage en jours ouvrés. Les dates sont recalculées
// en cascade à chaque modification. Toutes les dates sont des chaînes ISO « AAAA-MM-JJ » (pas de fuseau horaire).
//
// Règle des liens (alignée sur MS Project) :
// Règles de ressources (activables) : une seule Production à la fois et un seul test au banc à la fois. Elles créent
// automatiquement des liens « fin → début » entre PJ consécutifs dans l'ordre de passage (plan.order.prod / plan.order.banc).
//   FS tâche→tâche : le successeur commence le jour ouvré SUIVANT la fin du prédécesseur ; si l'un des deux est un jalon,
//   il se place le MÊME jour. SS : même début. FF : même fin. SF : fin du successeur = début du prédécesseur. + décalage.

import { isEstimatePj } from "../changeDiff";
// v239 : les PJXX (estimations, pas des PJ vendus) ne comptent nulle part : ni charge, ni publication, ni écarts.
export { isEstimatePj };

export const STEPS = [
  ["arrivee", "Arrivée", true],       // jalon : le matériel est arrivé
  ["production", "Production", false], // phase atelier — une seule à la fois (règle)
  ["tests", "Tests", false],           // phase banc d'essai — un seul PJ à la fois (règle)
  ["finProd", "Packing", false], // phase atelier (ex « Fin de production », renommée Packing en V211) — peut se faire en même temps qu'une autre production
  ["depart", "Départ", true],          // jalon : le PJ part
];
export const STEP_KIND = { arrivee: "jalon", production: "atelier", tests: "banc", finProd: "atelier", depart: "jalon" };
export const RES_STEP = { prod: "production", banc: "tests" };   // ressources à un seul PJ à la fois → étape concernée
export const STEP_RES = { production: "prod", tests: "banc" };
export const DEFAULT_CAP = { people: 4, hours: 35 };              // capacité atelier : 4 personnes × 35 h / semaine
export const DEFAULT_RULES = { prod: false, banc: false };   // désactivées par défaut : le plan créé reprend exactement les dates actuelles
export const STEP_KEYS = STEPS.map(s => s[0]);
export const STEP_LABEL = Object.fromEntries(STEPS.map(s => [s[0], s[1]]));
export const STEP_IS_MS = Object.fromEntries(STEPS.map(s => [s[0], s[2]]));
export const LINK_TYPES = ["FS", "SS", "FF", "SF"];
// Tâches libres (ajoutées à la main, clés « x1 », « x2 »…) : elles ne sont pas publiées, mais ordonnancées et reliables comme les autres
export const isCustomKey = k => /^x\d+$/.test(k);
export const stepKeysOf = p => {
  const st = (p && p.steps) || {}; const all = [...STEP_KEYS.filter(k => st[k]), ...Object.keys(st).filter(k => isCustomKey(k) && st[k]).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))];
  // v211 : ordre d'affichage choisi par l'utilisateur (p.seq), les tâches absentes de la liste gardent leur place par défaut à la fin
  if (!Array.isArray(p && p.seq)) return all; const set = new Set(all); const out = p.seq.filter(k => set.has(k)); all.forEach(k => { if (!out.includes(k)) out.push(k); }); return out;
};
// v211 : phases (Production, Tests, Packing) et ressources (atelier, testeur, banc 1 / 2)
export const PHASES = [["production", "Production"], ["tests", "Tests"], ["finProd", "Packing"]];
export const PHASE_LABEL = Object.fromEntries(PHASES);
export const benchOf = p => (p && p.steps && p.steps.tests && Number(p.steps.tests.banc) === 2 ? 2 : 1);
export const phaseOf = (p, k) => isCustomKey(k) ? ((p && p.steps && p.steps[k] && p.steps[k].phase) || null) : (k === "production" || k === "tests" || k === "finProd" ? k : null);
export const stepLabel = (p, k) => isCustomKey(k) ? ((p && p.steps && p.steps[k] && p.steps[k].name) || "Tâche") : STEP_LABEL[k];
export function addCustomStep(plan, pj, name) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return { plan, key: null };
  let n = 1; while (p.steps["x" + n]) n++; const id = "x" + n;
  p.steps[id] = { dur: 5, snet: null, name: name || "Nouvelle tâche", custom: true }; return { plan: np, key: nodeKey(pj, id) };
}
export const nodeKey = (pj, step) => pj + "|" + step;
export const splitKey = k => { const i = k.lastIndexOf("|"); return { pj: k.slice(0, i), step: k.slice(i + 1) }; };

// ── Dates ─────────────────────────────────────────────────────────────────────────────────────────────
export const dayNum = iso => { const [y, m, d] = iso.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
export const isoOfDay = n => { const d = new Date(n * 86400000); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); };
const dow = n => (new Date(n * 86400000).getUTCDay() + 6) % 7; // 0 = lundi

// Jours fériés français (métropole) : fixes + dépendant de Pâques.
export function frenchHolidays(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = Date.UTC(year, month - 1, day) / 86400000;
  const fixed = [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25]].map(([mm, dd]) => Date.UTC(year, mm - 1, dd) / 86400000);
  return new Set([...fixed, easter + 1, easter + 39, easter + 50]);
}

// Calendrier des jours ouvrés : lundi→vendredi, hors fermetures de l'entreprise (closurePeriods) et, au choix, jours fériés.
// v218 : pjOff = { PJ: [dateIso…] } — jours sans production d'un PJ (réglés dans le Calendrier) : ses tâches d'atelier s'allongent
// d'autant et sa charge n'est pas comptée ces jours-là.
export function makeCalendar({ closurePeriods = [], holidays = true, fromYear = 2023, toYear = 2040, pjOff = null } = {}) {
  const closed = new Set();
  (closurePeriods || []).forEach(p => {
    if (!p || !p.start) return;
    const a = dayNum(p.start), b = dayNum(p.end || p.start);
    for (let n = a; n <= b && n - a < 800; n++) closed.add(n);
  });
  const hol = new Set();
  if (holidays) for (let y = fromYear; y <= toYear; y++) frenchHolidays(y).forEach(n => hol.add(n));
  const first = dayNum(fromYear + "-01-01"), last = dayNum(toYear + "-12-31");
  const work = [];
  for (let n = first; n <= last; n++) if (dow(n) < 5 && !closed.has(n) && !hol.has(n)) work.push(n);
  const lower = x => { let lo = 0, hi = work.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (work[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
  const clamp = i => Math.max(0, Math.min(work.length - 1, i));
  const offMap = {}; Object.entries(pjOff || {}).forEach(([pj, list]) => { const set = new Set(); (list || []).forEach(iso => { const n = dayNum(iso), i = lower(n); if (work[i] === n) set.add(i); }); if (set.size) offMap[pj] = set; });
  return {
    offOf: pj => offMap[pj] || null,
    isWork: iso => { const n = dayNum(iso); return dow(n) < 5 && !closed.has(n) && !hol.has(n); },
    idxOnOrAfter: iso => clamp(lower(dayNum(iso))),                       // 1er jour ouvré ≥ date
    idxOnOrBefore: iso => { const n = dayNum(iso), i = lower(n); return clamp(work[i] === n ? i : i - 1); }, // dernier jour ouvré ≤ date
    dateOf: i => isoOfDay(work[clamp(i)]),
    // nombre de jours ouvrés entre deux dates, bornes incluses (≥ 1 si a ≤ b)
    countBetween: (a, b) => Math.max(0, lower(dayNum(b) + 1) - lower(dayNum(a))),
    addWork: (iso, n) => isoOfDay(work[clamp(lower(dayNum(iso)) + n)]),
    size: work.length,
  };
}

// ── Règles de ressources et liens ───────────────────────────────────────────────────────────────────────
export const rulesOf = plan => ({ ...DEFAULT_RULES, ...((plan && plan.rules) || {}) });
export const capWeek = plan => { const c = (plan && plan.cap) || DEFAULT_CAP; return (Number(c.people) || 0) * (Number(c.hours) || 0); };
// Ordre de passage d'une ressource (« prod » ou « banc ») : l'ordre enregistré, filtré sur les PJ qui ont l'étape, puis les autres.
export function orderOf(plan, res) {
  const step = RES_STEP[res];
  const has = new Set((plan.pjs || []).filter(p => p.steps && p.steps[step]).map(p => p.pj));
  const base = ((plan.order && plan.order[res]) || []).filter(x => has.has(x));
  const seen = new Set(base);
  (plan.pjs || []).forEach(p => { if (has.has(p.pj) && !seen.has(p.pj)) { base.push(p.pj); seen.add(p.pj); } });
  return base;
}
// Liens explicites + liens automatiques de l'ordre de passage (id « seq:prod:PJxxx », seq = true)
export function allLinks(plan) {
  const out = [...(plan.links || [])]; const r = rulesOf(plan);
  Object.keys(RES_STEP).forEach(res => {
    if (!r[res]) return;
    const o = orderOf(plan, res).filter(x => !(plan._free && plan._free[res] === x)); // _free : PJ laissé libre (calcul interne)
    // v211 : deux bancs de tests — une file d'attente par banc (le PJ suit le précédent du même banc)
    const groups = res === "banc" ? [1, 2].map(b => o.filter(x => benchOf((plan.pjs || []).find(q => q.pj === x)) === b)) : [o];
    groups.forEach(g => { for (let i = 1; i < g.length; i++) out.push({ id: "seq:" + res + ":" + g[i], from: nodeKey(g[i - 1], RES_STEP[res]), to: nodeKey(g[i], RES_STEP[res]), type: "FS", lag: 0, seq: true, res }); });
  });
  return out;
}

// ── Calcul des dates ──────────────────────────────────────────────────────────────────────────────────
// Renvoie { nodes: { "PJ|step": {pj, step, ms, dur, s, f, start, finish, driver, snetIgnored} }, cycle: [clés] | null }.
// driver = "snet" (date imposée), "lvl" (nivellement), l'id du lien (ou « seq:… » = ordre de passage) qui impose la date, ou null.
// snetIgnored = date imposée plus tôt que ce que permettent les liens (elle n'a aucun effet).
export function schedule(plan, cal) {
  const nodes = {};
  (plan.pjs || []).forEach(p => {
    stepKeysOf(p).forEach(step => {
      const st = p.steps && p.steps[step];
      if (!st) return;
      const ms = !!STEP_IS_MS[step];
      nodes[nodeKey(p.pj, step)] = { pj: p.pj, step, ms, dur: ms ? 0 : Math.max(1, st.dur || 1), noDur: !ms && !(st.dur > 0), snet: st.snet || null, lvl: st.lvl || null, s: null, f: null, start: null, finish: null, driver: null, snetIgnored: false };
    });
  });
  const incoming = {}; const outCount = {}; const indeg = {};
  Object.keys(nodes).forEach(k => { incoming[k] = []; outCount[k] = []; indeg[k] = 0; });
  allLinks(plan).forEach(l => {
    if (!nodes[l.from] || !nodes[l.to] || l.from === l.to) return;
    incoming[l.to].push(l); outCount[l.from].push(l.to); indeg[l.to]++;
  });
  // tri topologique (Kahn)
  const queue = Object.keys(nodes).filter(k => indeg[k] === 0); const order = [];
  for (let qi = 0; qi < queue.length; qi++) { const k = queue[qi]; order.push(k); outCount[k].forEach(t => { if (--indeg[t] === 0) queue.push(t); }); }
  const cycle = order.length < Object.keys(nodes).length ? Object.keys(nodes).filter(k => indeg[k] > 0) : null;
  order.forEach(k => {
    const n = nodes[k]; let lower = null, driver = null;
    if (n.snet) { lower = cal.idxOnOrAfter(n.snet); driver = "snet"; }
    incoming[k].forEach(l => {
      const p = nodes[l.from]; if (p.s === null) return;
      const L = Number(l.lag) || 0; let req;
      if (l.type === "SS") req = p.s + L;
      else if (l.type === "FF") req = p.f + L - (n.ms ? 0 : n.dur - 1);
      else if (l.type === "SF") req = p.s + L - (n.ms ? 0 : n.dur - 1);
      else req = p.f + ((!p.ms && !n.ms) ? 1 : 0) + L;                  // FS
      if (lower === null || req > lower) { lower = req; driver = l.id || "lien"; }
    });
    if (n.lvl) { const li = cal.idxOnOrAfter(n.lvl); if (lower === null || li > lower) { lower = li; driver = "lvl"; } }
    if (n.snet && driver !== "snet") n.snetIgnored = true;
    if (lower === null) return;
    n.s = Math.max(0, lower); n.f = n.ms ? n.s : n.s + n.dur - 1; n.driver = driver;
    // v292 (demandé : « répartition de la charge sur les jours restants, pas de modification de date de fin ») : les jours sans
    // production d'un PJ (Calendrier) restent dans la tâche d'atelier — même début, même fin — et ses heures se répartissent sur
    // les jours restants (atelierPhases : heures ÷ jours travaillés). Si TOUS ses jours sont sans production, elle s'allonge
    // (comme en V218) pour ne pas perdre d'heures. Avant la V292, elle s'allongeait toujours.
    const off = !n.ms && cal.offOf ? cal.offOf(n.pj) : null;
    if (off && atelierStep(plan, n.pj, n.step)) {
      const hit = []; for (let i = n.s; i <= n.f; i++) if (off.has(i)) hit.push(i);
      if (hit.length >= n.dur) { let c = 0, i = n.s; hit.length = 0; for (let g = 0; g < 2000; g++) { if (off.has(i)) hit.push(i); else if (++c >= n.dur) break; i++; } n.f = i; }
      if (hit.length) n.off = new Set(hit);
    }
    // Une date imposée est conservée telle quelle même si elle tombe un jour non ouvré (ex. date issue d'un ancien planning) ;
    // seules les dates calculées par les liens sont toujours des jours ouvrés.
    n.start = driver === "snet" ? n.snet : cal.dateOf(n.s);
    n.finish = n.ms ? n.start : cal.dateOf(n.f);
  });
  return { nodes, cycle };
}

// Plan vierge : seulement les PJ demandés, 5 étapes chacun, aucune date, aucune durée, aucun lien (les heures du planning actuel sont reprises)
export function initBlankPlan(codes, rows) {
  const seen = new Set(); const pjs = [];
  (codes || []).map(c => String(c).trim()).filter(Boolean).forEach(c => {
    const r = (rows || []).find(x => String(x.pj).toLowerCase() === c.toLowerCase()); const code = r ? r.pj : c.toUpperCase();
    if (seen.has(code)) return; seen.add(code);
    const steps = {}; STEP_KEYS.forEach(k => { steps[k] = { dur: STEP_IS_MS[k] ? 0 : null, snet: null }; });
    pjs.push({ pj: code, nomProjet: (r && r.nomProjet) || null, hAt: (r && r.heuresAtelier) || 0, hAu: (r && r.heuresAutom) || 0, steps });
  });
  return rebuildOrder({ v: 2, cal: { holidays: true }, rules: { ...DEFAULT_RULES }, cap: { ...DEFAULT_CAP }, pjs, links: [] }, makeCalendar());
}

// Ajouter ce lien créerait-il une boucle ?
export function wouldCycle(plan, link, cal) {
  const res = schedule({ ...plan, links: [...(plan.links || []), { ...link, id: "__new" }] }, cal);
  return !!res.cycle;
}

// ── Charge atelier ────────────────────────────────────────────────────────────────────────────────────
// Les heures atelier d'un PJ se répartissent sur ses phases atelier (Production, Fin de production) au prorata des durées,
// puis uniformément sur les jours ouvrés de chaque phase. La capacité est (personnes × heures) / 5 par jour ouvré.
export function phaseHours(p) {
  const a = p.steps && p.steps.production, b = p.steps && p.steps.finProd; const H = Number(p.hAt) || 0;
  const da = a ? Math.max(1, a.dur || 1) : 0, db = b ? Math.max(1, b.dur || 1) : 0;
  if (!da && !db) return {};
  // travail saisi tâche par tâche (colonne « Travail ») : on le prend tel quel ; sinon le total atelier est réparti selon les durées
  if (a && b && a.work != null && b.work != null) return { production: Number(a.work) || 0, finProd: Number(b.work) || 0 };
  const tot = da + db; return { production: a ? H * da / tot : 0, finProd: b ? H * db / tot : 0 };
}
// Travail d'une tâche (heures) : Production et Fin de production = heures atelier, Tests = heures autom
export function stepWork(p, step) {
  if (step === "tests") return p.steps && p.steps.tests ? (Number(p.hAu) || 0) : null;
  if (step === "production" || step === "finProd") { const h = phaseHours(p); return p.steps && p.steps[step] ? Math.round((h[step] || 0) * 10) / 10 : null; }
  if (isCustomKey(step) && p.steps && p.steps[step]) return Number(p.steps[step].work) || 0; // v211 : heures d'une tâche libre
  return null;
}
export function setWork(plan, pj, step, hours) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p || !p.steps[step]) return plan;
  const h = Math.max(0, Math.round((Number(hours) || 0) * 10) / 10);
  if (step === "tests") { p.hAu = h; return np; }
  if (isCustomKey(step)) { p.steps[step] = { ...p.steps[step], work: h }; return np; } // v211
  if (step !== "production" && step !== "finProd") return plan;
  const other = step === "production" ? "finProd" : "production"; const cur = phaseHours(p);
  if (!p.steps[other]) { p.hAt = h; delete p.hEst; p.steps[step] = { ...p.steps[step], work: null }; return np; }
  const o = Math.round((cur[other] || 0) * 10) / 10;
  p.steps[step] = { ...p.steps[step], work: h }; p.steps[other] = { ...p.steps[other], work: o };
  p.hAt = Math.round((h + o) * 10) / 10; delete p.hEst; return np;
}
// Tâche faite par l'atelier (Production, Packing, ou tâche libre affectée à l'atelier)
function atelierStep(plan, pj, step) {
  if (step === "production" || step === "finProd") return true;
  if (!isCustomKey(step)) return false; const p = (plan.pjs || []).find(x => x.pj === pj), st = p && p.steps && p.steps[step];
  return !!st && (st.res || "atelier") === "atelier" && st.phase !== "tests";
}
// v292 : jours réellement travaillés d'une tâche (f − s + 1 jours ouvrés, moins ses jours sans production), au moins 1
const workedDays = n => Math.max(1, (n.f - n.s + 1) - (n.off ? n.off.size : 0));
export function atelierPhases(plan, sched) {
  const out = []; const ord = orderOf(plan, "prod");
  (plan.pjs || []).forEach((p, pi) => {
    if (isEstimatePj(p.pj)) return; // v239 : pas dans la charge
    const h = phaseHours(p);
    ["production", "finProd"].forEach(step => {
      const n = sched.nodes[nodeKey(p.pj, step)]; if (!n || n.s === null || !h[step]) return;
      const pos = ord.indexOf(p.pj);
      out.push({ key: nodeKey(p.pj, step), pj: p.pj, step, s: n.s, f: n.f, dur: n.dur, hours: h[step], daily: h[step] / workedDays(n), prio: pos >= 0 ? pos : 1000 + pi, off: n.off || null });
    });
    // v211 : une tâche libre affectée à l'atelier compte dans la charge avec ses heures
    Object.keys(p.steps || {}).filter(isCustomKey).forEach(k => {
      const st = p.steps[k], hrs = Number(st && st.work) || 0; if (!st || (st.res || "atelier") !== "atelier" || hrs <= 0) return;
      const n = sched.nodes[nodeKey(p.pj, k)]; if (!n || n.s === null) return; const pos = ord.indexOf(p.pj);
      out.push({ key: nodeKey(p.pj, k), pj: p.pj, step: k, s: n.s, f: n.f, dur: n.dur, hours: hrs, daily: hrs / workedDays(n), prio: pos >= 0 ? pos : 1000 + pi, off: n.off || null });
    });
  });
  return out;
}
export function loadModel(plan, sched, cal) {
  const cw = capWeek(plan), capDay = cw / 5; const ph = atelierPhases(plan, sched); const day = new Map();
  ph.forEach(x => { for (let i = x.s; i <= x.f; i++) if (!(x.off && x.off.has(i))) day.set(i, (day.get(i) || 0) + x.daily); });
  const tooDense = ph.filter(x => x.daily > capDay + 1e-6).map(x => ({ pj: x.pj, step: x.step, hours: Math.round(x.hours), dur: x.dur, min: capDay > 0 ? Math.ceil(x.hours / capDay - 1e-9) : null }));
  if (!day.size) return { capDay, capWeek: cw, weeks: [], phases: ph, tooDense, overWeeks: 0, peak: 0, day };
  const lo = Math.min(...day.keys()), hi = Math.max(...day.keys()); const wk = new Map();
  for (let i = lo; i <= hi; i++) {
    const iso = cal.dateOf(i); const n = dayNum(iso); const key = isoOfDay(n - dow(n));
    let w = wk.get(key); if (!w) { w = { week: key, hours: 0 }; wk.set(key, w); }
    w.hours += day.get(i) || 0;
  }
  const weeks = [...wk.values()].sort((a, b) => a.week < b.week ? -1 : 1).map(w => {
    let days = 0; for (let d = 0; d < 5; d++) if (cal.isWork(isoOfDay(dayNum(w.week) + d))) days++;
    const ov = plan && plan.capWeeks && plan.capWeeks[w.week], cap = ov != null ? Number(ov) : capDay * days; // v208 : semaine spéciale
    return { ...w, hours: Math.round(w.hours * 10) / 10, days, cap, special: ov != null, over: w.hours > cap + 0.5 };
  });
  const peak = weeks.reduce((m, w) => Math.max(m, w.cap > 0 ? w.hours / w.cap : (w.hours > 0 ? 9 : 0)), 0);
  return { capDay, capWeek: cw, weeks, phases: ph, tooDense, overWeeks: weeks.filter(w => w.over).length, peak, day };
}

// ── Passage planning ↔ lignes publiées ────────────────────────────────────────────────────────────────
export const ROW_FIELDS = ["arrivee", "tests", "testsFin", "finProd", "depart"];
export function pjDates(sched, pj) {
  const g = (step, w) => { const n = sched.nodes[nodeKey(pj, step)]; return n && n.s !== null ? n[w] : null; };
  return { arrivee: g("arrivee", "start"), tests: g("tests", "start"), testsFin: g("tests", "finish"), finProd: g("finProd", "finish"), depart: g("depart", "start") };
}
// Lignes à publier : on ne touche qu'aux PJ du plan ; gamme / nom / état déjà présents sont conservés.
export function planToRows(plan, sched, currentRows, guessGamme, cal) {
  const cur = (currentRows || []).filter(r => r && !isEstimatePj(r.pj)); // v239 : jamais publiés
  const byPj = {}; cur.forEach(r => { byPj[r.pj] = r; });
  const rows = cur.map(r => ({ ...r }));
  const idx = {}; rows.forEach((r, i) => { idx[r.pj] = i; });
  (plan.pjs || []).forEach(p => {
    if (isEstimatePj(p.pj)) return;
    const d = pjDates(sched, p.pj);
    const base = byPj[p.pj] ? { ...byPj[p.pj] } : { pj: p.pj, gamme: guessGamme ? guessGamme(p.pj) : "", etat: "A_DEFINIR", nomProjet: p.nomProjet || null, heuresAtelier: 0, heuresAutom: 0 };
    ROW_FIELDS.forEach(f => {
      let v = d[f] || null; const old = byPj[p.pj] && byPj[p.pj][f];
      // une date actuelle posée un jour non ouvré (week-end, férié) qui correspond au jour ouvré calculé n'est pas un changement
      if (cal && v && old && old !== v && !cal.isWork(old) && (cal.dateOf(cal.idxOnOrAfter(old)) === v || cal.dateOf(cal.idxOnOrBefore(old)) === v)) v = old;
      base[f] = v;
    });
    if (p.hAt != null && !p.hEst) base.heuresAtelier = p.hAt; // v206 : des heures estimées (hEst) servent à la charge, pas au planning publié
    if (p.hAu != null) base.heuresAutom = p.hAu;
    if (idx[p.pj] != null) rows[idx[p.pj]] = base; else rows.push(base);
  });
  return rows;
}
// Différences entre les lignes actuelles et celles qui seraient publiées : [{pj, field, from, to}]
export function diffRows(oldRows, newRows) {
  const o = {}; (oldRows || []).forEach(r => { o[r.pj] = r; });
  const out = [];
  (newRows || []).forEach(r => {
    if (isEstimatePj(r.pj)) return; // v239
    const a = o[r.pj];
    if (!a) { out.push({ pj: r.pj, field: "new", from: null, to: r.arrivee || r.depart || null }); return; }
    ROW_FIELDS.forEach(f => { if ((a[f] || null) !== (r[f] || null)) out.push({ pj: r.pj, field: f, from: a[f] || null, to: r[f] || null }); });
    if ((a.heuresAtelier || 0) !== (r.heuresAtelier || 0)) out.push({ pj: r.pj, field: "heuresAtelier", from: a.heuresAtelier || 0, to: r.heuresAtelier || 0 });
    if ((a.heuresAutom || 0) !== (r.heuresAutom || 0)) out.push({ pj: r.pj, field: "heuresAutom", from: a.heuresAutom || 0, to: r.heuresAutom || 0 });
  });
  return out;
}

// ── Synthèse des écarts entre deux états du planning (onglet « Modifications ») ──────────────────────────
// Compare des lignes (planning actuel, planning initial, plan à une date) aux lignes du plan en cours : une entrée par PJ qui a
// bougé, avec l'écart en jours calendaires pour chaque date (positif = plus tard). Le départ est l'indicateur principal.
export function summarizeChanges(refRowsAll, nowRowsAll) {
  const refRows = (refRowsAll || []).filter(r => !isEstimatePj(r.pj)), nowRows = (nowRowsAll || []).filter(r => !isEstimatePj(r.pj)); // v239
  const ref = {}; (refRows || []).forEach(r => { ref[r.pj] = r; });
  const seen = new Set(); const pjs = [];
  const st = { nPj: 0, nDates: 0, late: 0, early: 0, maxLate: 0, maxEarly: 0, nNew: 0, nRemoved: 0, nHours: 0 };
  (nowRows || []).forEach(r => {
    seen.add(r.pj); const a = ref[r.pj];
    if (!a) { st.nNew++; pjs.push({ pj: r.pj, nomProjet: r.nomProjet || null, isNew: true, d: {}, hours: null, departDelta: null, maxShift: 0, group: 4, row: r }); return; }
    const d = {}; let maxShift = 0;
    ROW_FIELDS.forEach(f => { const x = a[f] || null, y = r[f] || null; if (x === y) return; const delta = x && y ? dayNum(y) - dayNum(x) : null; d[f] = { from: x, to: y, delta }; st.nDates++; if (delta !== null) maxShift = Math.max(maxShift, Math.abs(delta)); });
    const hours = {};
    [["heuresAtelier", "at"], ["heuresAutom", "au"]].forEach(([f, k]) => { const x = Number(a[f]) || 0, y = Number(r[f]) || 0; if (Math.round(x * 10) !== Math.round(y * 10)) hours[k] = { from: x, to: y }; });
    const hasH = Object.keys(hours).length > 0; if (hasH) st.nHours++;
    if (!Object.keys(d).length && !hasH) return;
    const dd = d.depart ? d.depart.delta : null;
    if (dd !== null && dd > 0) { st.late++; st.maxLate = Math.max(st.maxLate, dd); } else if (dd !== null && dd < 0) { st.early++; st.maxEarly = Math.max(st.maxEarly, -dd); }
    const group = dd !== null && dd > 0 ? 0 : dd !== null && dd < 0 ? 2 : Object.keys(d).length ? 1 : 3;
    pjs.push({ pj: r.pj, nomProjet: r.nomProjet || a.nomProjet || null, isNew: false, d, hours: hasH ? hours : null, departDelta: dd, maxShift, group, row: r });
  });
  (refRows || []).forEach(r => { if (!seen.has(r.pj)) st.nRemoved++; });
  pjs.sort((x, y) => x.group - y.group || (x.group === 0 ? y.departDelta - x.departDelta : x.group === 2 ? x.departDelta - y.departDelta : y.maxShift - x.maxShift) || (x.pj < y.pj ? -1 : 1));
  st.nPj = pjs.filter(x => !x.isNew).length;
  return { pjs, stats: st };
}

// Ce qui a changé DANS le plan entre deux versions (causes des décalages) : priorité, durées, dates imposées, travail, liens,
// tâches libres, réglages. Renvoie une liste de lignes { pj, kind, text }.
export function diffPlans(a, b) {
  const out = []; if (!a || !b || a.v !== 2 || b.v !== 2) return out;
  const A = {}, B = {}; (a.pjs || []).forEach(p => { A[p.pj] = p; }); (b.pjs || []).forEach(p => { B[p.pj] = p; });
  const common = (a.pjs || []).map(p => p.pj).filter(k => B[k]); const commonB = (b.pjs || []).map(p => p.pj).filter(k => A[k]);
  const rk = {}; common.forEach((k, i) => { rk[k] = i; });
  const moves = commonB.map((k, i) => ({ k, from: rk[k] + 1, to: i + 1 })).filter(m => m.from !== m.to);
  const maxAbs = moves.reduce((m, x) => Math.max(m, Math.abs(x.from - x.to)), 0);
  moves.filter(m => Math.abs(m.from - m.to) >= (maxAbs > 1 ? 2 : 1)).forEach(m => out.push({ pj: m.k, kind: "Priorité", text: "rang " + m.from + " → " + m.to }));
  (b.pjs || []).forEach(p => { if (!A[p.pj]) out.push({ pj: p.pj, kind: "PJ", text: "ajouté au plan" }); });
  (a.pjs || []).forEach(p => { if (!B[p.pj]) out.push({ pj: p.pj, kind: "PJ", text: "retiré du plan" }); });
  commonB.forEach(k => {
    const pa = A[k], pb = B[k]; const ka = new Set(stepKeysOf(pa)), kb = new Set(stepKeysOf(pb));
    [...kb].forEach(s => { if (!ka.has(s)) out.push({ pj: k, kind: isCustomKey(s) ? "Tâche libre" : "Étape", text: "« " + stepLabel(pb, s) + " » ajoutée" }); });
    [...ka].forEach(s => { if (!kb.has(s)) out.push({ pj: k, kind: isCustomKey(s) ? "Tâche libre" : "Étape", text: "« " + stepLabel(pa, s) + " » retirée" }); });
    [...kb].filter(s => ka.has(s)).forEach(s => {
      const x = pa.steps[s], y = pb.steps[s], lab = stepLabel(pb, s);
      if (isCustomKey(s) && (x.name || "") !== (y.name || "")) out.push({ pj: k, kind: "Tâche libre", text: "renommée « " + (x.name || "Tâche") + " » → « " + lab + " »" });
      if ((x.dur || 0) !== (y.dur || 0) && !STEP_IS_MS[s]) out.push({ pj: k, kind: "Durée", text: lab + " : " + (x.dur || "—") + " → " + (y.dur || "—") + " j ouvrés" });
      if ((x.snet || null) !== (y.snet || null)) out.push({ pj: k, kind: "Date imposée", text: lab + " : " + (x.snet ? isoFr(x.snet) : "aucune") + " → " + (y.snet ? isoFr(y.snet) : "aucune") });
      const wa = stepWork(pa, s), wb = stepWork(pb, s); if (wa !== null && wb !== null && Math.round(wa * 10) !== Math.round(wb * 10)) out.push({ pj: k, kind: "Travail", text: lab + " : " + wa + " → " + wb + " h" });
    });
  });
  const lk = l => l.from + ">" + l.to + ":" + (l.type || "FS") + ":" + (Number(l.lag) || 0);
  const nameOf = key => { const q = splitKey(key); const p = B[q.pj] || A[q.pj]; return q.pj + " " + stepLabel(p, q.step); };
  const la = new Map((a.links || []).map(l => [lk(l), l])), lb = new Map((b.links || []).map(l => [lk(l), l]));
  const desc = l => nameOf(l.from) + " → " + nameOf(l.to) + " (" + (l.type || "FS") + ((Number(l.lag) || 0) ? (l.lag > 0 ? "+" : "") + l.lag + " j" : "") + ")";
  lb.forEach((l, key) => { if (!la.has(key)) out.push({ pj: splitKey(l.to).pj, kind: "Lien", text: "ajouté : " + desc(l) }); });
  la.forEach((l, key) => { if (!lb.has(key)) out.push({ pj: splitKey(l.to).pj, kind: "Lien", text: "retiré : " + desc(l) }); });
  const ca = a.cap || DEFAULT_CAP, cb = b.cap || DEFAULT_CAP;
  if ((Number(ca.people) || 0) !== (Number(cb.people) || 0) || (Number(ca.hours) || 0) !== (Number(cb.hours) || 0)) out.push({ pj: null, kind: "Capacité", text: (ca.people * ca.hours) + " → " + (cb.people * cb.hours) + " h / semaine (" + cb.people + " × " + cb.hours + " h)" });
  const ra = rulesOf(a), rb = rulesOf(b);
  if (ra.prod !== rb.prod) out.push({ pj: null, kind: "Règle", text: "« Une production à la fois » " + (rb.prod ? "activée" : "désactivée") });
  if (ra.banc !== rb.banc) out.push({ pj: null, kind: "Règle", text: "« Un test au banc à la fois » " + (rb.banc ? "activé" : "désactivé") });
  if (hasLevel(a) !== hasLevel(b)) out.push({ pj: null, kind: "Nivellement", text: hasLevel(b) ? "appliqué" : "retiré" });
  return out.filter(x => !isEstimatePj(x.pj)); // v239
}
const isoFr = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(2, 4) : "—";

// ── Création du plan à partir des lignes actuelles ────────────────────────────────────────────────────
// Chaque PJ reçoit sa chaîne de liens Arrivée → Production → Tests → Fin de production → Départ. Les dates actuelles de
// l'arrivée, des tests et du départ sont reprises comme dates imposées (📌) ; Production et Fin de production sont calculées.
export function initPlanFromRows(rows, cal) {
  const pjs = []; const links = [];
  (rows || []).forEach(r => {
    const steps = {};
    const dayBefore = iso => cal.dateOf(cal.idxOnOrBefore(isoOfDay(dayNum(iso) - 1)));
    if (r.arrivee) steps.arrivee = { dur: 0, snet: r.arrivee };
    const lastBeforeFin = r.tests || r.finProd;
    if (r.arrivee && lastBeforeFin) steps.production = { dur: Math.max(1, cal.countBetween(r.arrivee, dayBefore(lastBeforeFin))), snet: null };
    if (r.tests) steps.tests = { dur: r.testsFin ? Math.max(1, cal.countBetween(r.tests, r.testsFin)) : 1, snet: r.tests };
    if (r.finProd && (r.tests || r.arrivee)) {
      const from = r.tests ? (r.testsFin || r.tests) : null;
      const dur = from && r.finProd > from ? Math.max(1, cal.countBetween(isoOfDay(dayNum(from) + 1), r.finProd)) : 1;
      steps.finProd = { dur, snet: null };
    }
    if (r.depart) steps.depart = { dur: 0, snet: r.depart };
    const chain = STEP_KEYS.filter(k => steps[k]);
    for (let i = 1; i < chain.length; i++) links.push({ id: "c_" + r.pj + "_" + chain[i], from: nodeKey(r.pj, chain[i - 1]), to: nodeKey(r.pj, chain[i]), type: "FS", lag: 0 });
    pjs.push({ pj: r.pj, nomProjet: r.nomProjet || null, hAt: r.heuresAtelier || 0, hAu: r.heuresAutom || 0, steps });
  });
  return rebuildOrder(fitPlanToRows({ v: 2, cal: { holidays: true }, rules: { ...DEFAULT_RULES }, cap: { ...DEFAULT_CAP }, pjs, links }, rows || [], cal), cal);
}
// Garantit que le plan recalculé redonne EXACTEMENT les dates du planning actuel : une date trop tôt est imposée, un lien qui
// forcerait une date plus tardive que l'actuelle n'est pas créé, une durée est ajustée pour retomber sur la fin actuelle.
function fitPlanToRows(plan, rows, cal) {
  let np = plan; const FIELD_STEP = { arrivee: "arrivee", tests: "tests", testsFin: "tests", finProd: "finProd", depart: "depart" };
  for (let it = 0; it < 6; it++) {
    const s = schedule(np, cal); const out = planToRows(np, s, rows, null, cal);
    const diffs = diffRows(rows, out).filter(d => FIELD_STEP[d.field] && d.from);
    if (!diffs.length) break;
    const cur = clonePlan(np);
    diffs.forEach(d => {
      const p = cur.pjs.find(x => x.pj === d.pj); const step = FIELD_STEP[d.field], st = p && p.steps[step]; if (!st) return;
      const key = nodeKey(d.pj, step), n = s.nodes[key], t = d.from, isEnd = d.field === "testsFin" || d.field === "finProd";
      if (isEnd) {
        if (n && n.s !== null && n.start <= t) st.dur = Math.max(1, cal.countBetween(n.start, t));
        else { cur.links = cur.links.filter(l => l.to !== key); st.snet = t; st.dur = 1; }
      } else {
        if (n && n.s !== null && n.start > t) cur.links = cur.links.filter(l => l.to !== key);
        st.snet = t;
      }
    });
    np = cur;
  }
  return np;
}
// Reconstruit l'ordre de passage d'après les dates (sans appliquer les règles de ressources)
export function rebuildOrder(plan, cal) {
  const s = schedule({ ...plan, rules: { prod: false, banc: false } }, cal); const order = {};
  Object.keys(RES_STEP).forEach(res => {
    const step = RES_STEP[res];
    const list = (plan.pjs || []).filter(p => p.steps && p.steps[step]).map((p, i) => { const n = s.nodes[nodeKey(p.pj, step)]; return { pj: p.pj, i, s: n && n.s !== null ? n.s : Infinity }; });
    list.sort((a, b) => a.s !== b.s ? (a.s < b.s ? -1 : 1) : a.i - b.i);
    order[res] = list.map(x => x.pj);
  });
  return { ...plan, order };
}

// ── Opérations d'édition (renvoient un NOUVEAU plan) ──────────────────────────────────────────────────
const clonePlan = p => ({ ...p, pjs: p.pjs.map(x => ({ ...x, steps: { ...x.steps } })), links: [...(p.links || [])], order: p.order ? { prod: [...(p.order.prod || [])], banc: [...(p.order.banc || [])] } : p.order });
export function setStep(plan, pj, step, patch) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan;
  // changer la durée d'une phase atelier ne change pas son travail : les heures sont figées tâche par tâche avant la modification
  if (patch && patch.dur !== undefined && (step === "production" || step === "finProd") && p.steps.production && p.steps.finProd && (p.steps.production.work == null || p.steps.finProd.work == null)) {
    const h = phaseHours(p); ["production", "finProd"].forEach(k => { p.steps[k] = { ...p.steps[k], work: Math.round((h[k] || 0) * 10) / 10 }; });
  }
  p.steps[step] = { ...(p.steps[step] || { dur: STEP_IS_MS[step] ? 0 : 1 }), ...patch };
  if (patch && patch.snet === null) p.steps[step].snet = null;
  return np;
}
export function removeStep(plan, pj, step) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan;
  delete p.steps[step]; const k = nodeKey(pj, step);
  np.links = np.links.filter(l => l.from !== k && l.to !== k);
  return np;
}
export function addLink(plan, link) { const np = clonePlan(plan); np.links.push({ id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: "FS", lag: 0, ...link }); return np; }
export function removeLink(plan, id) { const np = clonePlan(plan); np.links = np.links.filter(l => l.id !== id); return np; }
export function updateLink(plan, id, patch) { const np = clonePlan(plan); np.links = np.links.map(l => l.id === id ? { ...l, ...patch } : l); return np; }
export function movePj(plan, pj, delta) {
  const np = clonePlan(plan); const i = np.pjs.findIndex(x => x.pj === pj); const j = i + delta;
  if (i < 0 || j < 0 || j >= np.pjs.length) return plan;
  [np.pjs[i], np.pjs[j]] = [np.pjs[j], np.pjs[i]]; return np;
}
export function setPjField(plan, pj, patch) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan; Object.assign(p, patch); if (patch && patch.hAt !== undefined) delete p.hEst;
  if (patch && patch.hAt !== undefined) ['production', 'finProd'].forEach(k => { if (p.steps[k] && p.steps[k].work != null) p.steps[k] = { ...p.steps[k], work: null }; });
  return np;
}
export function setCap(plan, patch) { return { ...clonePlan(plan), cap: { ...DEFAULT_CAP, ...(plan.cap || {}), ...patch } }; }
export function setRules(plan, patch) { return { ...clonePlan(plan), rules: { ...rulesOf(plan), ...patch } }; }

// Place un PJ dans l'ordre de passage d'une ressource selon sa date de début RÉELLEMENT atteignable : on calcule ce début en le
// laissant libre de l'ordre de passage (il reste borné par ses propres liens), puis on l'insère après tous les PJ qui commencent avant.
function repositionInOrder(plan, cal, res, pj, wantedIso) {
  const step = RES_STEP[res]; const key = nodeKey(pj, step);
  const p = plan.pjs.find(x => x.pj === pj); if (!p || !p.steps[step]) return plan;
  const s = schedule({ ...plan, _free: { [res]: pj } }, cal);
  const mine = s.nodes[key]; const start = mine && mine.s !== null ? mine.start : wantedIso;
  const base = orderOf(plan, res).filter(x => x !== pj); let pos = 0;
  base.forEach(code => { const n = s.nodes[nodeKey(code, step)]; if (n && n.s !== null && n.start < start) pos++; });
  const np = clonePlan(plan); const o = base.slice(); o.splice(pos, 0, pj);
  np.order = { ...(np.order || {}), [res]: o }; return np;
}
// Déplace une étape à une date (pas avant) ; pour Production et Tests, le PJ prend automatiquement sa place dans l'ordre de passage.
export function moveStepTo(plan, cal, pj, step, wantedIso) {
  let np = setStep(plan, pj, step, { snet: wantedIso });
  const res = STEP_RES[step];
  if (res && rulesOf(plan)[res]) np = repositionInOrder(np, cal, res, pj, wantedIso);
  return np;
}
// v258 (demandé : « avoir la main sur quand commence une tâche tant qu'elle est liée à une tâche prédécesseur et successeur
// par PJ ») : la tâche commence le jour choisi. Plus tard que ses liens : date imposée (pas avant). Plus tôt : le lien du même PJ
// qui la repousse est GARDÉ et prend une avance (décalage négatif) pour qu'elle commence ce jour-là. Un lien vers un autre PJ
// ou l'ordre de passage ne sont pas modifiés : blocked = ce qui empêche (texte), la tâche commence alors au plus tôt possible.
export function startAtKeepLinks(plan, cal, pj, step, iso) {
  let np = moveStepTo(plan, cal, pj, step, iso); const want = cal.idxOnOrAfter(iso), key = nodeKey(pj, step);
  for (let g = 0; g < 8; g++) {
    const n = schedule(np, cal).nodes[key]; if (!n || n.s === null || n.s <= want) return { plan: np, blocked: null };
    const l = (np.links || []).find(x => x.id === n.driver);
    if (!l || splitKey(l.from).pj !== pj) return { plan: np, blocked: startReason(np, n) };
    np = clonePlan(np); const m = np.links.find(x => x.id === l.id); m.lag = (Number(m.lag) || 0) - (n.s - want);
  }
  return { plan: np, blocked: "liens en chaîne" };
}
// v258 (demandé : « je ne sais pas quand la date est imposée et quelle est la date imposée de la tâche ») : ce qui fixe le début
export function startReason(plan, n) {
  if (!n || n.s === null) return "Pas de date : ni date imposée ni prédécesseur.";
  const pin = n.snet ? "date imposée (pas avant le " + isoFr(n.snet) + ")" : "";
  if (n.driver === "snet") return "Début fixé par la " + pin + ".";
  let why = "Début calculé.";
  if (n.driver === "lvl") why = "Début fixé par le lissage de la charge.";
  else if (n.driver) {
    const l = allLinks(plan).find(x => x.id === n.driver);
    if (l && l.seq) why = "Début fixé par l'ordre de passage " + (l.res === "banc" ? "au banc" : "en production") + " : après " + splitKey(l.from).pj + ".";
    else if (l) { const f = splitKey(l.from), p = (plan.pjs || []).find(x => x.pj === f.pj), lag = Number(l.lag) || 0;
      why = "Début fixé par le lien avec « " + (f.pj !== n.pj ? f.pj + " · " : "") + stepLabel(p, f.step) + " » (" + (l.type || "FS") + (lag ? (lag > 0 ? " +" : " ") + lag + " j" : "") + ")."; }
  }
  return why + (pin ? " Date imposée (pas avant le " + isoFr(n.snet) + ")" + (n.snetIgnored ? " : sans effet, la tâche ne peut pas commencer plus tôt." : ".") : " Pas de date imposée.");
}
// Passer un PJ avant / après son voisin dans l'ordre de passage (les deux échangent leurs créneaux : leurs dates imposées sur cette étape sont libérées)
export function moveInOrder(plan, res, pj, delta) {
  const o = orderOf(plan, res); const i = o.indexOf(pj), j = i + delta; if (i < 0 || j < 0 || j >= o.length) return plan;
  const np = clonePlan(plan); const o2 = o.slice(); [o2[i], o2[j]] = [o2[j], o2[i]]; np.order = { ...(np.order || {}), [res]: o2 };
  [o[i], o[j]].forEach(code => { const p = np.pjs.find(x => x.pj === code); const k = RES_STEP[res]; if (p && p.steps[k] && p.steps[k].snet) p.steps[k] = { ...p.steps[k], snet: null }; });
  return np;
}
// Décale de n jours ouvrés toutes les dates imposées d'un PJ (équivalent « décaler le projet ») et le replace dans les ordres de passage
export function shiftPj(plan, pj, n, cal) {
  const before = schedule(plan, cal);
  let np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan;
  Object.keys(p.steps).forEach(k => { const st = p.steps[k]; if (st) p.steps[k] = { ...st, snet: st.snet ? cal.addWork(st.snet, n) : st.snet, lvl: null }; });
  Object.keys(RES_STEP).forEach(res => {
    if (!rulesOf(plan)[res]) return;
    const b = before.nodes[nodeKey(pj, RES_STEP[res])]; if (!b || b.s === null) return;
    np = repositionInOrder(np, cal, res, pj, cal.addWork(b.start, n));
  });
  return np;
}
export function addPj(plan, pj, rowOrNull, cal) {
  if (plan.pjs.some(x => x.pj === pj)) return plan;
  const fresh = initPlanFromRows(rowOrNull ? [rowOrNull] : [{ pj }], cal);
  let np = clonePlan(plan); np.pjs.push(fresh.pjs[0]); np.links.push(...fresh.links);
  const f = fresh.pjs[0].steps;
  if (f.arrivee && f.arrivee.snet && f.production) np = repositionInOrder(np, cal, "prod", pj, f.arrivee.snet);
  if (f.tests && f.tests.snet) np = repositionInOrder(np, cal, "banc", pj, f.tests.snet);
  return np;
}
export function removePj(plan, pj) {
  const np = clonePlan(plan); np.pjs = np.pjs.filter(x => x.pj !== pj);
  np.links = np.links.filter(l => splitKey(l.from).pj !== pj && splitKey(l.to).pj !== pj); return np;
}
// Trie les PJ par date de début (ordre d'affichage)
export function sortPjsByStart(plan, cal) {
  const s = schedule(plan, cal); const np = clonePlan(plan);
  const first = p => { let m = Infinity; STEP_KEYS.forEach(k => { const n = s.nodes[nodeKey(p.pj, k)]; if (n && n.s !== null && n.s < m) m = n.s; }); return m; };
  np.pjs = np.pjs.map((p, i) => ({ p, i, m: first(p) })).sort((a, b) => a.m !== b.m ? (a.m < b.m ? -1 : 1) : a.i - b.i).map(x => x.p); return np;
}

// ── Propositions : dates au plus tôt, nivellement de la charge, durées compatibles avec la capacité ───
export const hasPins = plan => (plan.pjs || []).some(p => Object.keys(p.steps).some(k => k !== "arrivee" && k !== "depart" && p.steps[k] && p.steps[k].snet));
export const hasLevel = plan => (plan.pjs || []).some(p => Object.keys(p.steps).some(k => p.steps[k] && p.steps[k].lvl));
function mapSteps(plan, fn) { const np = clonePlan(plan); np.pjs = np.pjs.map(p => ({ ...p, steps: Object.fromEntries(Object.entries(p.steps).map(([k, st]) => [k, st ? fn(p.pj, k, st) : st])) })); return np; }
export const clearLevel = plan => mapSteps(plan, (pj, k, st) => st.lvl ? { ...st, lvl: null } : st);
// Libère les dates imposées (hors arrivées et départs) : chaque étape part au plus tôt selon ses liens et l'ordre de passage
export const releasePins = (plan, onlyPj) => mapSteps(plan, (pj, k, st) => (k === "arrivee" || k === "depart" || isCustomKey(k) || (onlyPj && pj !== onlyPj) || !st.snet) ? st : { ...st, snet: null });
// Allonge les phases atelier dont la durée est trop courte pour la capacité (heures / jour > capacité par jour)
export function fitDurations(plan) {
  const capDay = capWeek(plan) / 5; if (capDay <= 0) return plan; const np = clonePlan(plan);
  np.pjs = np.pjs.map(p => { const h = phaseHours(p); const steps = { ...p.steps };
    ["production", "finProd"].forEach(k => { if (steps[k] && h[k]) { const min = Math.ceil(h[k] / capDay - 1e-9); if ((steps[k].dur || 1) < min) steps[k] = { ...steps[k], dur: min }; } });
    // les heures restent celles de chaque tâche, même si la durée change
    if (steps.production && steps.finProd && (steps.production.dur !== p.steps.production.dur || steps.finProd.dur !== p.steps.finProd.dur)) ["production", "finProd"].forEach(k => { steps[k] = { ...steps[k], work: Math.round((h[k] || 0) * 10) / 10 }; });
    return { ...p, steps }; });
  return np;
}
// Nivellement par priorité : tant qu'un jour dépasse la capacité atelier, on décale (« pas avant ») la phase du PJ le moins
// prioritaire (dernier dans l'ordre de passage) parmi celles actives ce jour-là, au premier créneau où elle tient à côté des phases
// plus prioritaires ; les phases moins prioritaires, elles, seront décalées à leur tour si besoin. Tout se recalcule en cascade
// (liens, ordre de passage). Les heures d'un PJ restent dans sa phase ; seules les dates de départ des phases changent.
// v259 (demandé : « choisir de quand à quand je nivelle la charge et sur quelle capacité ») : opts.from / opts.to (ISO) bornent
// les jours vérifiés et les phases déplacées (celles qui commencent avant « from » ne bougent pas, leur nivellement est gardé) ;
// opts.cap = capacité en heures par semaine pour ce nivellement (sinon la capacité du plan, semaines spéciales comprises).
export function levelPlan(plan, cal, opts = {}) {
  const lo = opts.from ? cal.idxOnOrAfter(opts.from) : -Infinity, hi = opts.to ? cal.idxOnOrBefore(opts.to) : Infinity;
  let cur = clearLevel(plan);
  if (opts.from) { const s0 = schedule(plan, cal); cur = mapSteps(plan, (pj, k, st) => { const n = s0.nodes[nodeKey(pj, k)]; return st.lvl && n && n.s !== null && n.s >= lo ? { ...st, lvl: null } : st; }); }
  const capDay = opts.cap > 0 ? opts.cap / 5 : capWeek(plan) / 5; const cd = opts.cap > 0 ? () => opts.cap / 5 : capDayFn(plan, cal); const ignored = new Set(); const moved = new Set(); let iter = 0;
  if (capDay <= 0) return { plan: cur, moved: 0, iterations: 0, stuck: true };
  const EPS = 1e-6;
  while (iter++ < 4000) {
    const s = schedule(cur, cal); if (s.cycle) break;
    const ph = atelierPhases(cur, s); const day = new Map();
    ph.forEach(x => { for (let i = x.s; i <= x.f; i++) if (!(x.off && x.off.has(i))) day.set(i, (day.get(i) || 0) + x.daily); });
    const bad = [...day.keys()].sort((a, b) => a - b).find(i => i >= lo && i <= hi && day.get(i) > cd(cal.dateOf(i)) + EPS && !ignored.has(i));
    if (bad === undefined) break;
    const cands = ph.filter(x => x.s <= bad && x.f >= bad && x.s >= lo && x.daily <= capDay + EPS).sort((a, b) => a.prio !== b.prio ? b.prio - a.prio : b.s - a.s);
    if (!cands.length) { ignored.add(bad); continue; }
    const x = cands[0]; const hp = new Map();
    ph.forEach(y => { if (y.pj !== x.pj && y.prio < x.prio) for (let i = y.s; i <= y.f; i++) if (!(y.off && y.off.has(i))) hp.set(i, (hp.get(i) || 0) + y.daily); });
    let ns = Math.max(x.s, bad) + 1;
    for (let c = x.s + 1; c < x.s + 500; c++) {
      let ok = true;
      for (let i = c; i < c + x.dur; i++) if ((hp.get(i) || 0) + x.daily > cd(cal.dateOf(i)) + EPS) { ok = false; c = i; break; }
      if (ok) { ns = c; break; }
    }
    const sp = splitKey(x.key);
    cur = setStep(cur, sp.pj, sp.step, { lvl: cal.dateOf(ns) }); moved.add(x.key);
  }
  return { plan: cur, moved: moved.size, iterations: iter, stuck: iter >= 4000 };
}

// v206 (demandé : « reprendre les dates qui existent déjà pour voir comment ça rend avec la charge ») :
// heures atelier manquantes = modèle de la gamme (Production + Fin de production), sinon moyenne des PJ de la même gamme
// qui en ont ; ces PJ sont marqués hEst (heures estimées) pour le dire à l'écran.
export function fillMissingHours(plan, rows, templates) {
  const R = rows || [], gOf = pj => { const r = R.find(x => x.pj === pj); return (r && r.gamme) || "Sans gamme"; };
  const avg = {}; R.forEach(r => { if (Number(r.heuresAtelier) > 0) { const g = r.gamme || "Sans gamme"; (avg[g] = avg[g] || []).push(Number(r.heuresAtelier)); } });
  const np = clonePlan(plan); let n = 0;
  np.pjs = np.pjs.map(p => {
    if (Number(p.hAt) > 0) return p;
    const g = gOf(p.pj), t = templates && templates[g]; let h = 0;
    if (t && t.production && t.production.work != null) h = (Number(t.production.work) || 0) + (Number(t.finProd && t.finProd.work) || 0);
    else if (avg[g]) h = Math.round(avg[g].reduce((a, b) => a + b, 0) / avg[g].length);
    if (h > 0) { n++; return { ...p, hAt: h, hEst: true }; }
    return p;
  });
  return { plan: np, n };
}
// Recrée le plan depuis le planning actuel (dates exactes) en gardant la capacité, les modèles par gamme et le calendrier.
export function refreshPlanFromRows(plan, rows, cal) {
  const base = initPlanFromRows(rows, cal);
  const kept = { ...base, cap: (plan && plan.cap) || base.cap, cal: (plan && plan.cal) || base.cal, ...(plan && plan.templates ? { templates: plan.templates } : {}) };
  return fillMissingHours(kept, rows, kept.templates).plan;
}

// v208 (demandé : « gérer la charge de l'atelier à la semaine pour des cas spéciaux ») : capacité propre à une semaine.
// plan.capWeeks = { "lundi ISO": heures de la semaine } ; sinon la capacité normale (personnes × heures). La capacité d'un jour
// ouvré d'une semaine spéciale = ses heures / ses jours ouvrés. Utilisée par la charge et le nivellement.
export const weekKeyOf = iso => { const n = dayNum(iso); return isoOfDay(n - dow(n)); };
export function capDayFn(plan, cal) {
  const base = capWeek(plan) / 5, ov = (plan && plan.capWeeks) || {}, memo = {};
  return iso => {
    const k = weekKeyOf(iso); if (ov[k] == null) return base;
    if (memo[k] == null) { let d = 0; for (let i = 0; i < 5; i++) if (cal.isWork(isoOfDay(dayNum(k) + i))) d++; memo[k] = d ? Number(ov[k]) / d : 0; }
    return memo[k];
  };
}
export function setCapWeek(plan, week, hours) {
  const capWeeks = { ...((plan && plan.capWeeks) || {}) };
  if (hours == null || hours === "") delete capWeeks[week]; else capWeeks[week] = Math.max(0, Math.round(Number(hours) || 0));
  return { ...clonePlan(plan), capWeeks };
}

// ── v211 (demandé : « bouger les tâches entre elles dans l'ordre ; un nouveau PJ garde des tâches initiales associées à la
// production, aux tests ou au packing, avec une ressource atelier ou testeur ; il y a 2 bancs de tests ») ─────────────────
export function moveStepOrder(plan, pj, key, beforeKey) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p || key === beforeKey) return plan;
  const cur = stepKeysOf(p).filter(k => k !== key); const i = beforeKey ? cur.indexOf(beforeKey) : -1;
  if (i < 0) cur.push(key); else cur.splice(i, 0, key); p.seq = cur; return np;
}
export function setStepMeta(plan, pj, key, patch) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p || !p.steps[key]) return plan;
  p.steps[key] = { ...p.steps[key], ...patch }; return np;
}
// Répartit les tests sur les 2 bancs : dans l'ordre des débuts, chaque PJ va sur le banc libéré le plus tôt.
export function splitBenches(plan, cal) {
  const s = schedule({ ...plan, rules: { ...rulesOf(plan), banc: false } }, cal); const np = clonePlan(plan); const free = { 1: -Infinity, 2: -Infinity };
  np.pjs.map(p => ({ p, n: s.nodes[nodeKey(p.pj, "tests")] })).filter(x => x.p.steps.tests && x.n && x.n.s !== null).sort((a, b) => a.n.s - b.n.s)
    .forEach(({ p, n }) => { const b = free[1] < n.s ? 1 : free[2] < n.s ? 2 : (free[1] <= free[2] ? 1 : 2); p.steps.tests = { ...p.steps.tests, banc: b }; free[b] = Math.max(free[b], n.f); });
  return np;
}
// Ajoute une tâche libre rattachée à une phase et une ressource, placée après une autre tâche du même PJ (lien fin → début).
export function addPhaseTask(plan, pj, { name, phase, dur, work, res, after }) {
  const r = addCustomStep(plan, pj, name); if (!r.key) return { plan, key: null };
  const step = splitKey(r.key).step; let np = setStepMeta(r.plan, pj, step, { phase: phase || null, res: res || (phase === "tests" ? "testeur" : "atelier"), dur: Math.max(1, Number(dur) || 1), work: Number(work) || 0 });
  // v224 (demandé : « si je rajoute une tâche entre 2 tâches, le lien doit se mettre à jour ») : les liens qui partaient de la tâche
  // « après » vers une autre tâche du même PJ partent maintenant de la nouvelle tâche (A → C devient A → nouvelle → C).
  if (after) { const fromK = nodeKey(pj, after); np = { ...np, links: (np.links || []).map(l => l.from === fromK && l.to !== r.key && splitKey(l.to).pj === pj ? { ...l, from: r.key } : l) }; np = addLink(np, { from: fromK, to: r.key, type: "FS", lag: 0 }); const p = np.pjs.find(x => x.pj === pj); const ks = stepKeysOf(p).filter(k => k !== step); ks.splice(ks.indexOf(after) + 1, 0, step); p.seq = ks; }
  return { plan: np, key: r.key };
}
// Nouveau PJ complet : Arrivée → Production → Tests → Packing → Départ (durées du modèle de la gamme), enchaînés, avec leurs
// ressources (atelier, banc + testeur) et des tâches supplémentaires rangées dans leur phase.
export function newPjPlan(plan, cal, o) {
  const pj = String(o.pj || "").trim().toUpperCase(); if (!pj || plan.pjs.some(x => x.pj === pj)) return plan;
  const D = o.durs || {}, W = o.works || {}, start = o.start || cal.dateOf(cal.idxOnOrAfter(isoOfDay(dayNum(new Date().toISOString().slice(0, 10)))));
  const steps = {
    arrivee: { dur: 0, snet: start },
    production: { dur: Math.max(1, Number(D.production) || 15), snet: null, res: "atelier", ...(W.production != null ? { work: Number(W.production) || 0 } : {}) },
    tests: { dur: Math.max(1, Number(D.tests) || 3), snet: null, banc: Number(o.banc) === 2 ? 2 : 1, res: o.tester || "testeur" },
    finProd: { dur: Math.max(1, Number(D.finProd) || 5), snet: null, res: "atelier", ...(W.finProd != null ? { work: Number(W.finProd) || 0 } : {}) },
    depart: { dur: 0, snet: null },
  };
  const seq = ["arrivee", "production"]; let n = 1; const extra = (o.extra || []).filter(x => x && String(x.name || "").trim());
  const byPhase = ph => extra.filter(x => (x.phase || "production") === ph).map(x => { const k = "x" + n++; steps[k] = { dur: Math.max(1, Number(x.dur) || 1), snet: null, name: String(x.name).trim(), custom: true, phase: x.phase || "production", res: x.res || (x.phase === "tests" ? "testeur" : "atelier"), work: Number(x.work) || 0 }; return k; });
  seq.push(...byPhase("production"), "tests", ...byPhase("tests"), "finProd", ...byPhase("finProd"), "depart");
  const links = []; for (let i = 1; i < seq.length; i++) links.push({ id: "c_" + pj + "_" + seq[i], from: nodeKey(pj, seq[i - 1]), to: nodeKey(pj, seq[i]), type: "FS", lag: 0 });
  const hAt = (Number(W.production) || 0) + (Number(W.finProd) || 0);
  let np = clonePlan(plan); np.pjs.push({ pj, nomProjet: o.nomProjet || null, gamme: o.gamme || null, hAt, hAu: Number(W.tests) || 0, steps, seq }); np.links.push(...links);
  np = repositionInOrder(np, cal, "prod", pj, start); np = repositionInOrder(np, cal, "banc", pj, start);
  return np;
}

// ── v224 (demandé : « j'ai 2 slots de banc d'essai : 2 machines en même temps, mais jamais 2 machines sur le même slot ;
// une attribution simple et claire ») ─────────────────────────────────────────────────────────────────────────────────
// Ordre de passage des bancs = ordre des débuts de tests (calculés sans la règle) : avec la règle, chaque banc enchaîne ses
// machines dans l'ordre où elles arrivent, sans en faire passer une plus tardive devant.
export function benchOrderByStart(plan, cal) {
  const s = schedule({ ...plan, rules: { ...rulesOf(plan), banc: false } }, cal);
  const at = p => { const n = s.nodes[nodeKey(p.pj, "tests")]; return n && n.s !== null ? n.s : 1e9; };
  const ids = (plan.pjs || []).filter(p => p.steps && p.steps.tests).slice().sort((a, b) => at(a) - at(b)).map(p => p.pj);
  const np = clonePlan(plan); np.order = { ...(np.order || {}), banc: ids }; return np;
}
export function setBench(plan, cal, pj, b) {
  const np = setStepMeta(plan, pj, "tests", { banc: Number(b) === 2 ? 2 : 1 });
  return rulesOf(np).banc ? benchOrderByStart(np, cal) : np;
}
// Fait passer un PJ avant le précédent du même banc (ordre de passage), quand la règle « un test à la fois par banc » est active.
export function benchMoveUp(plan, pj) {
  const o = orderOf(plan, "banc"), p = (plan.pjs || []).find(x => x.pj === pj); if (!p) return plan;
  const b = benchOf(p), same = o.filter(x => benchOf((plan.pjs || []).find(q => q.pj === x)) === b), i = same.indexOf(pj); if (i <= 0) return plan;
  const prev = same[i - 1], next = o.filter(x => x !== pj); next.splice(next.indexOf(prev), 0, pj);
  const np = clonePlan(plan); np.order = { ...(np.order || {}), banc: next }; return np;
}
// Chevauchements sur un même banc (deux machines au banc en même temps).
// v230 (demandé : « après allocation des bancs j'ai toujours le warning rouge ») : opts.skip(p) écarte les PJ masqués (archivés,
// expédiés, slots libres) et opts.since (date) les tests déjà terminés — ni l'un ni l'autre ne peut plus être corrigé.
export function benchConflicts(plan, sched, opts = {}) {
  const out = []; const skip = opts.skip || (() => false);
  [1, 2].forEach(b => {
    const L = (plan.pjs || []).filter(p => p.steps && p.steps.tests && benchOf(p) === b && !skip(p)).map(p => ({ pj: p.pj, n: sched.nodes[nodeKey(p.pj, "tests")] })).filter(x => x.n && x.n.s !== null && (!opts.since || !x.n.finish || x.n.finish >= opts.since)).sort((x, y) => x.n.s - y.n.s);
    let last = null; L.forEach(x => { if (last && x.n.s <= last.n.f) out.push({ b, pj: x.pj, with: last.pj }); if (!last || x.n.f > last.n.f) last = x; });
  });
  return out;
}

// ── v228 (demandé : « un numéro de priorité des tâches mères pour chaque PJ : plus le numéro est grand, plus je veux que ses tâches
// soient terminées en priorité » ; « archiver des projets : ils gardent leurs dernières dates mais ne sont plus dans la liste ») ──
// La priorité range les PJ (la liste = l'ordre de priorité utilisé par « une production à la fois » et le lissage) : du plus grand
// numéro au plus petit, les PJ sans numéro gardent leur place relative après eux.
export function setPrio(plan, pj, v) {
  const n = v === "" || v == null ? null : Math.round(Number(String(v).replace(",", ".")));
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan;
  if (n == null || isNaN(n)) delete p.prio; else p.prio = n;
  const idx = new Map(np.pjs.map((x, i) => [x.pj, i]));
  np.pjs.sort((a, b) => { const pa = a.prio != null ? a.prio : -Infinity, pb = b.prio != null ? b.prio : -Infinity; return pb - pa || idx.get(a.pj) - idx.get(b.pj); });
  np.order = { ...(np.order || {}), prod: np.pjs.filter(x => x.steps && x.steps.production).map(x => x.pj) };
  return np;
}
export function setArchived(plan, pj, on) {
  const np = clonePlan(plan); const p = np.pjs.find(x => x.pj === pj); if (!p) return plan;
  if (on) p.archived = new Date().toISOString().slice(0, 10); else delete p.archived; return np;
}
