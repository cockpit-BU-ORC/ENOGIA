// Copie générée par scripts/sync-functions.js depuis src/ — ne pas modifier ici.
// ── v193 : Cash in intégré au site — règles d'édition d'un jalon, reprises à l'identique de public/cashin.html ─────────
// (applyEdit / recalcInit / followInit / normalize). Le document Firestore garde sa forme : { rows, labels, totals, owners, updatedAt }.
import { addDays, diffDays, statusOf, nextDue, toneOf, todayISO, STATUS_LABEL } from "./cashinLink.mjs";

export const newId = () => "r" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
export const newRow = (pj, jalon) => ({ id: newId(), pj, jalon: jalon || "", montant: null, pct: null, delai: null, statut: "future", factInit: null, factPrevue: null, factReelle: null, ref: "", encInit: null, encPrevue: null, encReelle: null, relance: null, note: "" });

function recalcInit(r) {
  if (r.factInit && r.delai != null && !isNaN(r.delai)) r.encInit = addDays(r.factInit, r.delai);
  else { if (r.encInit && !r.encInitOld) r.encInitOld = r.encInit; r.encInit = null; }
}
const followInit = r => !r.factReelle && !r.encReelle && !!r.encInit;
const derive = (r, today) => { const k = statusOf({ ...r, epc: false }, today).k; return k; };

// Modifie le champ f du jalon (copie) et recalcule les dates liées, comme la page d'origine. Renvoie { row, autoDelai }.
export function applyEdit(row, f, v, today = todayISO()) {
  const r = { ...row }; let autoDelai = false;
  if (f === "epc") { r.epc = !!v; return { row: r, autoDelai }; }
  const prevInit = r.encInit, prevFI = r.factInit;
  if (f === "montant" || f === "delai") {
    const n = v === "" || v == null ? null : Number(v); r[f] = n == null || isNaN(n) ? null : n;
    if (f === "delai" && r.delai != null) { const bs = r.factReelle || r.factPrevue; if (bs) r.encPrevue = addDays(bs, r.delai); }
  } else if (f === "jalon" || f === "ref" || f === "note") { r[f] = String(v || "").trim(); return { row: r, autoDelai }; }
  else {
    r[f] = v || null;
    if (v && (f === "factInit" || f === "factPrevue" || f === "factReelle") && r.delai == null) { r.delai = 30; autoDelai = true; }
    if (f === "factInit" && (!r.factPrevue || r.factPrevue === prevFI)) { r.factPrevue = r.factInit; if (r.factPrevue && r.delai != null) r.encPrevue = addDays(r.factPrevue, r.delai); }
    if (f === "factPrevue" && r.factPrevue && r.delai != null) r.encPrevue = addDays(r.factPrevue, r.delai);
    if (f === "factReelle" && r.delai != null) { const b2 = v || r.factPrevue; if (b2) r.encPrevue = addDays(b2, r.delai); }
  }
  recalcInit(r);
  if (followInit(r) && (!r.encPrevue || r.encPrevue === prevInit)) r.encPrevue = r.encInit;
  r.statut = derive(r, today);
  return { row: r, autoDelai };
}

// Vue d'un jalon pour l'écran : statut, teinte (avec « échéance proche » / « à facturer depuis »), prochaine échéance.
export function rowView(r, today = todayISO()) {
  const st = statusOf(r, today), due = nextDue(r, today);
  return { st, due, tone: toneOf(st, due), label: STATUS_LABEL[st.k] || "" };
}

// Liste « À traiter » : retards de paiement, factures à émettre en retard, échéances dans les 15 jours (hors EPC et payés).
export function toTreat(rows, today = todayISO()) {
  const out = [];
  (rows || []).forEach(r => {
    if (!r || r.epc) return;
    const v = rowView(r, today);
    if (v.st.k === "late") out.push({ r, kind: "late", days: v.st.days || 0, text: "paiement en retard de " + (v.st.days || 0) + " j" });
    else if (v.st.k === "tobill" && (v.st.days || 0) > 0) out.push({ r, kind: "tobill", days: v.st.days, text: "facture à émettre depuis " + v.st.days + " j" });
    else if (v.tone === "warn" && v.due && v.due.days >= 0) out.push({ r, kind: "soon", days: -v.due.days, text: (v.due.kind === "facture" ? "facture" : "paiement") + " dans " + v.due.days + " j" });
  });
  const rank = { late: 0, tobill: 1, soon: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.days - a.days);
}

// v252 (demandé : « voir toutes les facturations et encaissements prévus jusqu'à fin 2026 ») : factures pas encore émises et
// encaissements pas encore reçus dont la date prévue tombe d'ici `until` (les retards inclus), hors EPC, triés par date.
export function plannedUntil(rows, until = "2026-12-31") {
  const out = [];
  (rows || []).forEach(r => {
    if (!r || r.epc) return;
    if (!r.factReelle && r.factPrevue && r.factPrevue <= until) out.push({ r, kind: "facture", date: r.factPrevue, montant: Number(r.montant) || 0 });
    if (!r.encReelle && r.encPrevue && r.encPrevue <= until) out.push({ r, kind: "encaissement", date: r.encPrevue, montant: Number(r.montant) || 0 });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.r.pj.localeCompare(b.r.pj));
}

// Synthèse d'un PJ du Cash in (en-tête de groupe) : montant du projet, total des jalons, encaissé.
export function groupInfo(doc, pj) {
  const rows = ((doc && doc.rows) || []).filter(r => r.pj === pj), live = rows.filter(r => !r.epc);
  const sum = live.reduce((a, r) => a + (Number(r.montant) || 0), 0), paid = live.filter(r => r.encReelle).reduce((a, r) => a + (Number(r.montant) || 0), 0);
  const t = doc && doc.totals && doc.totals[pj];
  return { rows, total: t > 0 ? t : sum, sum, paid, epc: rows.length > 0 && live.length === 0, label: (doc && doc.labels && doc.labels[pj]) || "" };
}
export const pjList = doc => { const seen = new Set(), out = []; ((doc && doc.rows) || []).forEach(r => { if (!seen.has(r.pj)) { seen.add(r.pj); out.push(r.pj); } }); return out; };

// ── v194 : étape 2 — Projets, Cash par mois, Écarts (calculs repris de public/cashin.html) ──────────────────────────
const D = (a, b) => (a && b ? diffDays(a, b) : null);
const kOf = (r, today) => statusOf(r, today).k;
// Synthèse d'une liste de jalons (vue Projets) : payés, encaissé, facturé en attente, reste à facturer, prochain encaissement.
export function groupStats(list, today = todayISO()) {
  const o = { n: list.length, epc: 0, paidN: 0, total: 0, paid: 0, inv: 0, toBill: 0, next: null, nextRow: null };
  list.forEach(r => {
    const a = Number(r.montant) || 0, s = kOf(r, today); o.total += a;
    if (r.epc) { o.epc += a; return; }
    if (s === "paid") { o.paid += a; o.paidN++; }
    else {
      if (s === "invoiced" || s === "late") o.inv += a; else o.toBill += a;
      if (r.encPrevue && (!o.next || r.encPrevue < o.next)) { o.next = r.encPrevue; o.nextRow = r; }
    }
  });
  return o;
}
// Tenue de la date : à l'heure = paiement (réel ou prévu) pas plus tard que l'encaissement initial.
export function punctual(r, today = todayISO()) {
  const ref = r.encInit || r.encInitOld;
  if (r.epc || !r.montant || !ref) return null;
  const paid = kOf(r, today) === "paid" && !!r.encReelle, eff = paid ? r.encReelle : r.encPrevue;
  if (!eff) return null;
  const d = diffDays(ref, eff);
  if (!paid && d <= 0 && eff < today) return { k: "shift", d: diffDays(ref, today), paid: false };
  return { k: d > 0 ? "shift" : "ontime", d, paid };
}
export function monthKeys(r, today = todayISO()) {
  const a = Number(r.montant) || 0; if (!a || r.epc) return null;
  const paid = kOf(r, today) === "paid" && !!r.encReelle, ik = r.encInit || r.encPrevue || r.encReelle, ad = paid ? r.encReelle : r.encPrevue;
  return { init: ik ? ik.slice(0, 7) : "none", act: ad ? ad.slice(0, 7) : "none", paid };
}
// Cash par mois : initial (encaissement initial, à défaut prévu) vs réel + actualisé, et tenue des dates.
export function monthly(rows, today = todayISO()) {
  const M = {}, nodate = { init: 0, fc: 0 };
  const get = k => M[k] || (M[k] = { key: k, init: 0, paid: 0, fc: 0, ot: 0, sh: 0, otN: 0, shN: 0 });
  (rows || []).forEach(r => {
    const mk = monthKeys(r, today); if (!mk) return; const a = Number(r.montant);
    if (mk.init === "none") nodate.init += a; else get(mk.init).init += a;
    if (mk.act === "none") nodate.fc += a; else if (mk.paid) get(mk.act).paid += a; else get(mk.act).fc += a;
    const pu = punctual(r, today);
    if (pu && mk.act !== "none") { const g = get(mk.act); if (pu.k === "ontime") { g.ot += a; g.otN++; } else { g.sh += a; g.shN++; } }
  });
  return { months: Object.keys(M).sort().map(k => M[k]), nodate };
}
// Matrice PJ × mois : mois du paiement reçu, sinon de l'encaissement prévu (EPC exclus).
export function matrixItems(rows, today = todayISO()) {
  return (rows || []).filter(r => !r.epc && r.montant).map(r => { const paid = kOf(r, today) === "paid" && !!r.encReelle, d = paid ? r.encReelle : r.encPrevue; return { r, paid, key: d ? d.slice(0, 7) : "none" }; });
}
export function monthRange(sorted) {
  if (!sorted.length) return [];
  const out = [], last = sorted[sorted.length - 1]; let y = +sorted[0].slice(0, 4), m = +sorted[0].slice(5, 7);
  for (let i = 0; i < 240; i++) { const k = y + "-" + String(m).padStart(2, "0"); out.push(k); if (k >= last) break; m++; if (m > 12) { m = 1; y++; } }
  return out;
}
// Écarts (en jours, positif = plus tard que prévu).
export function retard(r, today = todayISO()) {
  if (r.epc) return null; const k = kOf(r, today);
  if (k === "paid") return D(r.encPrevue, r.encReelle);
  if ((k === "invoiced" || k === "late") && r.encPrevue && r.encPrevue < today) return diffDays(r.encPrevue, today);
  return null;
}
export function retardFact(r, today = todayISO()) {
  if (r.factReelle) return D(r.factPrevue || r.factInit, r.factReelle);
  const base = r.factPrevue || r.factInit;
  if (base && base < today && !r.encReelle) return diffDays(base, today);
  return null;
}
export const ECARTS = [
  { k: "eFactPrev", short: "Facture : initiale → prévue", label: "Facture : initiale → prévue", fn: r => D(r.factInit, r.factPrevue), date: r => r.factPrevue },
  { k: "eFactEm", short: "Facture : prévue → émise", label: "Facture : prévue → émise", fn: (r, t) => retardFact(r, t), date: r => r.factReelle || r.factPrevue },
  { k: "eFactTot", short: "Facture : initiale → émise", label: "Facture : initiale → émise", fn: r => D(r.factInit, r.factReelle), date: r => r.factReelle },
  { k: "eEncPrev", short: "Enc. : initial → prévu", label: "Encaissement : initial → prévu", fn: r => D(r.encInit, r.encPrevue), date: r => r.encPrevue },
  { k: "eEncReel", short: "Enc. : prévu → paiement", label: "Encaissement : prévu → paiement client", fn: (r, t) => retard(r, t), date: r => r.encReelle || r.encPrevue },
  { k: "eEncTot", short: "Enc. : initial → paiement", label: "Encaissement : initial → paiement client", fn: (r, t) => (kOf(r, t) === "paid" ? D(r.encInit, r.encReelle) : null), date: r => r.encReelle },
].map(e => ({ ...e, fn: (r, t = todayISO()) => (r.epc ? null : e.fn(r, t)) }));
export const ecartOf = k => ECARTS.find(e => e.k === k) || ECARTS[4];
export function isoWeekOf(iso) { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"), n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return { y, w }; }
// Regroupement des écarts : mois, semaine, PJ, chef de projet (owners) ou jalon ; valeur = moyenne ou pire écart.
export function ecartGroups(doc, metric, by, measure, today = todayISO()) {
  const m = ecartOf(metric), rows = (doc && doc.rows) || [], labels = (doc && doc.labels) || {}, owners = (doc && doc.owners) || {};
  const G = {};
  rows.map(r => ({ r, v: m.fn(r, today), d: m.date(r) })).filter(x => x.v != null).forEach(x => {
    const r = x.r; let k, l;
    if (by === "pj") { k = r.pj; l = r.pj + (labels[r.pj] ? " · " + labels[r.pj] : ""); }
    else if (by === "cdp") { k = owners[r.pj] || "~sans"; l = owners[r.pj] || "Sans CdP"; }
    else if (by === "jalon") { k = r.id; l = r.pj + " — " + (r.jalon || "sans nom"); }
    else if (!x.d) return;
    else if (by === "semaine") { const o = isoWeekOf(x.d); k = o.y + "-W" + String(o.w).padStart(2, "0"); l = "Semaine " + o.w + " · " + o.y; }
    else { k = x.d.slice(0, 7); l = k; }
    (G[k] || (G[k] = { key: k, label: l, items: [] })).items.push(x);
  });
  const arr = Object.values(G).map(g => { const vals = g.items.map(x => x.v); g.avg = vals.reduce((s, v) => s + v, 0) / vals.length; g.max = Math.max(...vals); g.val = measure === "max" ? g.max : g.avg; return g; });
  if (by === "pj" || by === "jalon" || by === "cdp") arr.sort((a, b) => b.val - a.val); else arr.sort((a, b) => (a.key < b.key ? -1 : 1));
  return arr;
}
// Chiffres clés de l'onglet Écarts.
export function ecartKpis(rows, today = todayISO()) {
  const paidRows = (rows || []).filter(r => kOf(r, today) === "paid" && D(r.encPrevue, r.encReelle) != null);
  const avgRet = paidRows.length ? paidRows.reduce((s, r) => s + D(r.encPrevue, r.encReelle), 0) / paidRows.length : null;
  const lateN = paidRows.filter(r => D(r.encPrevue, r.encReelle) > 0).length;
  const gl = (rows || []).filter(r => !r.epc && D(r.encInit, r.encPrevue) != null);
  const avgGl = gl.length ? gl.reduce((s, r) => s + D(r.encInit, r.encPrevue), 0) / gl.length : null;
  let worst = null; (rows || []).forEach(r => { const v = retard(r, today); if (v != null && (!worst || v > worst.v)) worst = { v, r }; });
  return { avgRet, paidN: paidRows.length, lateN, avgGl, glN: gl.length, worst };
}

// ── v369 (maquette v369-daf-encaissements.html, proposition A validée) : saisie des encaissements par le DAF ──────────
// Jalons facturés (date de facture émise) et pas encore payés, hors EPC : groupe « late » (encaissement prévu dépassé),
// « week » (prévu d'ici dimanche), « later » (ensuite ou sans date). L'encaissement prévu manquant = facture + délai.
const sundayOf = iso => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"), k = (d.getUTCDay() + 6) % 7; return addDays(String(iso).slice(0, 10), 6 - k); };
export function toCollect(rows, today = todayISO()) {
  const end = sundayOf(today), rank = { late: 0, week: 1, later: 2 };
  return (rows || []).filter(r => r && !r.epc && r.factReelle && !r.encReelle).map(r => {
    const due = r.encPrevue || (r.delai != null ? addDays(r.factReelle, r.delai) : null);
    const group = !due ? "later" : due < today ? "late" : due <= end ? "week" : "later";
    return { r, due, group, days: due ? diffDays(today, due) : null };
  }).sort((a, b) => rank[a.group] - rank[b.group] || String(a.due || "9999").localeCompare(String(b.due || "9999")) || String(a.r.pj).localeCompare(String(b.r.pj)));
}
// Paiements reçus depuis `days` jours (pour « Remettre à encaisser » en cas d'erreur), du plus récent
export const recentlyPaid = (rows, today = todayISO(), days = 30) => (rows || []).filter(r => r && !r.epc && r.encReelle && r.encReelle >= addDays(today, -days)).sort((a, b) => b.encReelle.localeCompare(a.encReelle));
// Seul champ que le DAF modifie : date de paiement reçu (ou vide) ; statut et dates liées recalculés comme dans la page Cash in
export const setEncReelle = (rows, id, iso, today = todayISO()) => (rows || []).map(r => (r && r.id === id ? applyEdit(r, "encReelle", iso || null, today).row : r));
