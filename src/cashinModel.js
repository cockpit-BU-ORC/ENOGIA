// ── v193 : Cash in intégré au site — règles d'édition d'un jalon, reprises à l'identique de public/cashin.html ─────────
// (applyEdit / recalcInit / followInit / normalize). Le document Firestore garde sa forme : { rows, labels, totals, owners, updatedAt }.
import { addDays, statusOf, nextDue, toneOf, todayISO, STATUS_LABEL } from "./cashinLink";

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

// Synthèse d'un PJ du Cash in (en-tête de groupe) : montant du projet, total des jalons, encaissé.
export function groupInfo(doc, pj) {
  const rows = ((doc && doc.rows) || []).filter(r => r.pj === pj), live = rows.filter(r => !r.epc);
  const sum = live.reduce((a, r) => a + (Number(r.montant) || 0), 0), paid = live.filter(r => r.encReelle).reduce((a, r) => a + (Number(r.montant) || 0), 0);
  const t = doc && doc.totals && doc.totals[pj];
  return { rows, total: t > 0 ? t : sum, sum, paid, epc: rows.length > 0 && live.length === 0, label: (doc && doc.labels && doc.labels[pj]) || "" };
}
export const pjList = doc => { const seen = new Set(), out = []; ((doc && doc.rows) || []).forEach(r => { if (!seen.has(r.pj)) { seen.add(r.pj); out.push(r.pj); } }); return out; };
