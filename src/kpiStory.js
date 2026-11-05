// v281 (maquette « Refonte KPI » validée : « Oui, code-la ») — chaque sous-onglet KPI suit le patron réponse → preuve → action
// (skills data-storytelling, kpi-dashboard-design, dataviz). Ce module calcule, à partir du planning publié, la phrase de réponse,
// les chiffres face aux objectifs, les données des graphiques et la liste « À faire ». Calculs purs, testés dans kpiStory.test.js.
import { monthReview, monthKey, addMonths, monthLabel } from "./monthReview";
import { getPjMeta, ETAT_META, chefsOf } from "./pjMeta";
import { isEstimatePj } from "./changeDiff";

const iso = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const dOf = v => { const s = iso(v); return s ? new Date(s + "T12:00:00") : null; };
const fr = n => String(n).replace(".", ",");
const list = a => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
const nomOf = r => { const n = getPjMeta(r.pj, r).nomProjet; return n && n !== "—" ? n : ""; };
const etatLab = e => (ETAT_META[e] && ETAT_META[e].label) || e || "";
const live = rows => (rows || []).filter(r => r && r.pj && !isEstimatePj(r.pj) && r.etat !== "SLOT_LIBRE");
export const weekNum = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y) / 864e5 + 1) / 7); };
const wl = w => "S" + String(weekNum(w.a)).padStart(2, "0");

// PJ ouverts en retard sur leur départ initial, du plus en retard au moins en retard
export function topRisk(rows, driftRows, n = 6) {
  const by = {}; (driftRows || []).forEach(d => { if (d.depart && d.depart.delta != null) by[d.pj] = d.depart.delta; });
  return live(rows).filter(r => r.etat !== "SHIPPED" && (by[r.pj] || 0) > 0).map(r => ({ pj: r.pj, nom: nomOf(r), etat: etatLab(r.etat), v: by[r.pj] })).sort((a, b) => b.v - a.v).slice(0, n);
}

// ── Synthèse ──
export function storySynthese({ rows, driftRows, targets, metrics, weeks, today = new Date() }) {
  const t = targets, m = metrics, over = (weeks || []).filter(w => w.cap > 0 && w.hours > w.cap + 0.5);
  const okT = m.tenus != null && m.tenus >= t.tenus;
  const p1 = m.tenus == null ? "Pas de planning initial pour juger les dates" : okT ? "Oui pour les dates : " + m.tenus + " % des PJ tiennent leur départ" : (m.tenus < 50 ? "Non : moins d'un PJ sur deux tient sa date de départ (" + m.tenus + " %)" : "Non : seulement " + m.tenus + " % des PJ tiennent leur date de départ");
  const p2 = over.length ? ", et l'atelier dépasse sa capacité " + (over.length > 1 ? over.length + " semaines sur " + weeks.length + " (" + list(over.map(wl)) + ")" : "en " + wl(over[0])) + "." : ", et l'atelier reste sous sa capacité sur " + (weeks || []).length + " semaines.";
  const risk = topRisk(rows, driftRows, 8), big = risk.filter(r => r.v > 90);
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0); const l30 = new Date(t0); l30.setDate(l30.getDate() + 30);
  const by = {}; (driftRows || []).forEach(d => { if (d.depart && d.depart.delta != null) by[d.pj] = d.depart.delta; });
  const dep30 = live(rows).filter(r => r.etat !== "SHIPPED" && dOf(r.depart) && dOf(r.depart) >= t0 && dOf(r.depart) <= l30);
  const actions = [];
  if (over.length) actions.push({ b: "Arbitrer la surcharge " + list(over.map(wl)), t: "(" + over.map(w => "+" + Math.round(w.hours - w.cap) + " h").join(", ") + ") : décaler un montage ou niveler la charge dans le planificateur." });
  if (big.length) actions.push({ b: "Statuer sur " + (big.length > 1 ? "les " + big.length + " PJ" : "le PJ") + " à plus de 3 mois de retard", t: "", pjs: big.slice(0, 4).map(r => r.pj) });
  if (dep30.length) actions.push({ b: "Confirmer les " + dep30.length + " départ" + (dep30.length > 1 ? "s" : "") + " des 30 prochains jours", t: dep30.filter(r => (by[r.pj] || 0) > 0).length ? "dont " + dep30.filter(r => (by[r.pj] || 0) > 0).length + " en retard sur l'initial." : "aucun en retard.", pjs: dep30.map(r => r.pj).slice(0, 6) });
  if (!actions.length) actions.push({ b: "Rien d'urgent", t: "les dates tiennent et l'atelier a de la marge." });
  return { answer: p1 + p2, risk: risk.slice(0, 6), actions };
}

// ── Bilan mensuel ──
export function storyBilan({ rows, notes, today = new Date() }) {
  const cur = monthKey(today), keys = [addMonths(cur, -2), addMonths(cur, -1), cur, addMonths(cur, 1)];
  const rev = keys.map(k => monthReview(rows, null, k, today));
  const cnt = (r, k, onlyDone) => (r.groups.find(g => g.k === k) || { items: [] }).items.filter(i => !onlyDone || i.st === "done").length;
  const months = rev.map((r, i) => ({ key: r.key, m: monthLabel(r.key).split(" ")[0], kind: i < 2 ? "fait" : i === 2 ? "en cours" : "prévu", d: cnt(r, "depart", i < 2), t: cnt(r, "testsFin", i < 2), a: cnt(r, "arrivee", i < 2), late: r.late, done: r.done }));
  const prev = rev[1], now = rev[2], pr = prev.done + prev.late ? Math.round(prev.done / (prev.done + prev.late) * 100) : null;
  const nowDep = (now.groups.find(g => g.k === "depart") || { items: [] }).items;
  const answer = monthLabel(prev.key).split(" ")[0] + (pr == null ? " : aucun jalon au planning" : " tenu à " + pr + " % (" + months[1].d + " départ" + (months[1].d > 1 ? "s" : "") + ", " + months[1].t + " test" + (months[1].t > 1 ? "s" : "") + " terminé" + (months[1].t > 1 ? "s" : "") + ", " + months[1].a + " arrivée" + (months[1].a > 1 ? "s" : "") + ")") + ". " + monthLabel(now.key).split(" ")[0] + " : " + nowDep.length + " départ" + (nowDep.length > 1 ? "s" : "") + " à tenir" + (now.late ? ", " + now.late + " jalon" + (now.late > 1 ? "s" : "") + " déjà en retard." : ".");
  const actions = [];
  const todo = nowDep.filter(i => i.st !== "done");
  if (todo.length) actions.push({ b: "Tenir les " + todo.length + " départ" + (todo.length > 1 ? "s" : "") + " de " + monthLabel(now.key).split(" ")[0].toLowerCase(), t: "", pjs: todo.map(i => i.pj) });
  now.groups.forEach(g => g.items.filter(i => i.st === "late").forEach(i => actions.push({ b: "Rattraper « " + g.one.toLowerCase() + " »", t: "prévu le " + i.date.slice(8, 10) + "/" + i.date.slice(5, 7) + ", pas encore fait.", pjs: [i.pj] })));
  if (!(notes || {})[now.key]) actions.push({ b: "Écrire la ligne de " + monthLabel(now.key).split(" ")[0].toLowerCase(), t: "avant le CODIR (faits marquants, objectifs)." });
  return { answer, months, actions: actions.slice(0, 5) };
}

// ── Semaines (8) : charge, départs, machines au banc, décisions ──
export function storySemaines({ rows, weeks }) {
  const L = live(rows).filter(r => r.etat !== "SHIPPED");
  const cols = (weeks || []).map(w => { const a = new Date(w.a), b = new Date(a); b.setDate(b.getDate() + 6);
    const inW = v => { const d = dOf(v); return d && d >= a && d <= new Date(b.getTime() + 864e5 - 1); };
    const dep = L.filter(r => inW(r.depart)).map(r => r.pj);
    const banc = L.filter(r => { const s = dOf(r.tests), e = dOf(r.testsFin) || s; return s && s <= b && e >= a; }).map(r => r.pj);
    const late = L.filter(r => inW(r.depart) && dOf(r.finProd) && dOf(r.finProd) > dOf(r.depart)).map(r => r.pj);
    const decide = [w.cap > 0 && w.hours > w.cap + 0.5 ? "surcharge " + Math.round(w.hours / w.cap * 100) + " %" : "", banc.length > 2 ? banc.length + " machines au banc" : "", ...late.map(p => p + " : fin de prod. après le départ")].filter(Boolean);
    return { lab: wl(w), hours: Math.round(w.hours), cap: w.cap, pct: w.cap ? Math.round(w.hours / w.cap * 100) : null, dep, banc, decide };
  });
  const dec = cols.filter(c => c.decide.length);
  // phrase regroupée par type de décision : surcharges, bancs, fins de production après le départ
  const sur = cols.filter(c => c.decide.some(d => d.startsWith("surcharge"))).map(c => c.lab), bancs = cols.filter(c => c.banc.length > 2), lateD = cols.flatMap(c => c.decide.filter(d => d.includes("après le départ")).map(d => d.split(" : ")[0]));
  const parts = [sur.length ? "surcharge en " + list(sur) : "", ...bancs.map(c => c.banc.length + " machines au banc en " + c.lab), lateD.length ? "fin de production après le départ pour " + list(lateD) : ""].filter(Boolean);
  const nDec = dec.reduce((n, c) => n + c.decide.length, 0);
  const answer = parts.length ? (nDec > 1 ? nDec + " décisions" : "Une décision") + " dans les " + cols.length + " semaines : " + parts.join(" ; ") + "." : "Rien à décider sur les " + cols.length + " prochaines semaines : charge sous la capacité, pas de conflit au banc.";
  const actions = dec.flatMap(c => c.decide.map(d => ({ b: c.lab, t: d }))).slice(0, 6);
  return { answer, cols, actions };
}

// ── Dérives ──
export function storyDerives({ stepSummary, comparable, kpiStep, labels }) {
  const s = (stepSummary || []).filter(x => x.pct != null);
  let drop = null; for (let i = 1; i < s.length; i++) { const d = s[i - 1].pct - s[i].pct; if (d > 0 && (!drop || d > drop.d)) drop = { d, a: s[i - 1].l, b: s[i].l }; }
  const answer = s.length ? "Tenus à date : " + s.map(x => x.l.toLowerCase() + " " + x.pct + " %").join(", ") + "." + (drop ? " Le retard se creuse surtout entre « " + drop.a.toLowerCase() + " » et « " + drop.b.toLowerCase() + " »." : "") : "Pas de planning initial à comparer pour cette période et ces machines.";
  const dumb = (comparable || []).filter(r => r[kpiStep] && r[kpiStep].delta != null && r[kpiStep].delta > 0).sort((a, b) => b[kpiStep].delta - a[kpiStep].delta).slice(0, 8).map(r => ({ pj: r.pj, v: r[kpiStep].delta }));
  const worst = s.slice().sort((a, b) => a.pct - b.pct)[0];
  const actions = [];
  if (worst && worst.late) actions.push({ b: "« " + worst.l + " » : " + worst.pct + " % tenus", t: "regarder les causes dans Retards › Analyse.", pjs: (worst.worst || []).map(x => x.split(" ")[0]) });
  actions.push({ b: "Pour le CODIR", t: "choisir la période (« Mois dernier ») dans la vue ci-dessous, puis faire la capture." });
  return { answer, dumb, stepLabel: (labels || {})[kpiStep] || "", actions };
}

// ── Charge (12 semaines) ──
export function storyCharge({ weeks }) {
  const w = (weeks || []).map(x => ({ lab: wl(x), hours: Math.round(x.hours), cap: Math.round(x.cap), pct: x.cap ? Math.round(x.hours / x.cap * 100) : null }));
  const over = w.filter(x => x.cap && x.hours > x.cap), peak = w.slice().sort((a, b) => (b.pct || 0) - (a.pct || 0))[0];
  const marge = w.filter(x => x.cap && x.pct < 70).reduce((a, x) => a + Math.round(x.cap * 0.85 - x.hours), 0), low = w.filter(x => x.cap && x.pct < 70);
  const answer = over.length ? "Pas en l'état : " + over.length + " semaine" + (over.length > 1 ? "s" : "") + " sur " + w.length + " dépasse" + (over.length > 1 ? "nt" : "") + " la capacité, avec un pic à " + peak.pct + " % en " + peak.lab + "." + (low.length ? " " + list(low.slice(0, 3).map(x => x.lab)) + " (sous 70 %) peu" + (low.length > 1 ? "vent" : "t") + " en accueillir une partie." : "") : "Oui : aucune semaine au-dessus de la capacité sur " + w.length + " semaines" + (peak ? " (au plus " + peak.pct + " % en " + peak.lab + ")." : ".");
  const actions = over.length ? [{ b: "Lisser " + list(over.slice(0, 4).map(x => x.lab)), t: "« Niveler la charge » dans le planificateur." }, { b: "Si impossible", t: "renfort en " + peak.lab + " (≈ " + Math.round(peak.hours - peak.cap) + " h)." }] : [{ b: "Rien à faire", t: "la charge tient." }];
  return { answer, weeks: w, peak, marge: Math.max(0, marge), low, actions };
}

// ── Avancement : réel (saisi) face à l'attendu (position dans le planning à date) ──
export function storyAvancement({ rows, progress, today = new Date() }) {
  const t = new Date(today); t.setHours(12, 0, 0, 0);
  const items = live(rows).filter(r => r.etat !== "SHIPPED" && dOf(r.arrivee) && dOf(r.depart) && dOf(r.depart) > dOf(r.arrivee)).map(r => {
    const a = dOf(r.arrivee), d = dOf(r.depart), exp = Math.round(Math.max(0, Math.min(1, (t - a) / (d - a))) * 100), real = progress && progress[r.pj] != null ? +progress[r.pj] : 0;
    return { pj: r.pj, nom: nomOf(r), real, exp, gap: real - exp };
  }).filter(x => x.exp > 0 || x.real > 0).sort((a, b) => a.gap - b.gap);
  const behind = items.filter(x => x.gap < -15);
  const answer = behind.length ? (behind.length > 1 ? behind.length + " PJ sont" : "Un PJ est") + " nettement en dessous de l'avancement attendu à date : " + list(behind.slice(0, 3).map(x => x.pj + " (" + x.real + " % au lieu de " + x.exp + " %)")) + (behind.length > 3 ? "…" : ".") : "Les machines avancent comme prévu : aucun PJ à plus de 15 points sous l'avancement attendu.";
  const actions = behind.slice(0, 4).map(x => ({ b: x.pj, t: Math.abs(x.gap) + " points de retard sur l'avancement — point avec le chef de projet.", pjs: [] }));
  return { answer, items, actions: actions.length ? actions : [{ b: "Rien à faire", t: "pas d'écart notable." }] };
}

// ── Explorer : une mesure × un découpage × des machines ──
export const EXPLORE_MEASURES = [["count", "Machines"], ["depart", "Départs"], ["arrivee", "Arrivées"], ["testsFin", "Tests terminés"], ["finProd", "Fins de production"]];
export const EXPLORE_DIMS = [["mois", "mois"], ["gamme", "gamme"], ["pays", "pays"], ["chef", "chef de projet"], ["etat", "état"]];
export function explore({ rows, measure = "count", dim = "gamme", scope = "open" }) {
  const L = live(rows).filter(r => scope === "all" || (scope === "shipped" ? r.etat === "SHIPPED" : r.etat !== "SHIPPED"));
  const m = {};
  L.forEach(r => { if (measure !== "count" && !iso(r[measure])) return;
    const meta = getPjMeta(r.pj, r);
    const k = dim === "mois" ? iso(measure === "count" ? r.depart : r[measure]).slice(0, 7) : dim === "gamme" ? r.gamme : dim === "pays" ? (meta.pays !== "—" ? meta.pays : "") : dim === "chef" ? (chefsOf(meta)[0] || "") : etatLab(r.etat);
    const key = k || "Non renseigné"; m[key] = (m[key] || 0) + 1; });
  const out = Object.entries(m).map(([k, v]) => ({ k: dim === "mois" && /^\d{4}-\d{2}$/.test(k) ? monthLabel(k) : k, raw: k, v }));
  return dim === "mois" ? out.sort((a, b) => a.raw.localeCompare(b.raw)) : out.sort((a, b) => b.v - a.v);
}
export { fr };
