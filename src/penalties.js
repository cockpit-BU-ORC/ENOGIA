// v146.23 — Pénalités de retard d'une fiche synthèse (un PJ-n = une fiche, chacune avec ses propres conditions).
// Calcul pur (aucune dépendance React/Firestore) : date contractuelle de référence (MaD ORC ou livraison) comparée
// à la date prévue / réelle → jours de retard → semaines facturables (après franchise) → montant, plafonné.
//
// Conditions saisies dans la fiche (meta.penalite) :
//   ref        "mad" | "livr"           jalon contractuel qui déclenche les pénalités
//   ratePct    % du prix de la fiche par semaine de retard
//   graceWeeks période de grâce (semaines) : déduite du retard, seules les semaines au-delà sont facturées ;
//              une semaine entamée compte pour une semaine entière
//   capType    "pct" (% du prix) | "eur" (montant)   ; cap : valeur du plafond
export const PEN_REFS = {
  mad:  { label: "MaD ORC",   long: "mise à disposition de l'ORC", contract: "contratTFin", forecast: null },
  livr: { label: "Livraison", long: "livraison contractuelle",     contract: "contratLivr", forecast: "livrPrevue" },
};
// actif : le client a activé les pénalités dans le contrat (case à cocher de la fiche). Absent = actif (fiches saisies avant la v148).
export const PEN_DEFAULT = { ref: "mad", ratePct: null, graceWeeks: 0, capType: "pct", cap: null, actif: true };

const DAY = 86400000;
const toDay = v => {
  if (!v) return null;
  const d = v instanceof Date ? new Date(v) : new Date(String(v).slice(0, 10) + "T00:00:00");
  if (isNaN(+d)) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const num = v => { if (v == null || v === "") return null; const n = Number(String(v).replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? null : n; };

// Prix de la fiche : prixFiche en priorité, à défaut l'ancien « montant global » du contrat
export function ficheBase(meta) {
  const p = num(meta && meta.prixFiche), m = num(meta && meta.montantContrat);
  return p != null && p > 0 ? p : m != null && m > 0 ? m : null;
}

// Pénalités d'une fiche.
//   meta     : métadonnées de la fiche (dates contractuelles, prix, penalite…)
//   depart   : départ prévu du planning (sert de prévision pour la MaD ORC)
//   today    : date du jour
// Résultat : { status: "off"|"inactive"|"incomplete"|"ok", missing[], ref, contract, effective, provisional, lateDays, graceDays,
//   chargeableWeeks, base, weekly, raw, capEur, amount, capped, startDate }
// v255 (demandé : « livraison prévue = fin projetée + durée transport, pour que ce soit plus simple ») : quand la fiche a une durée de
// transport (meta.transportJ, jours calendaires), la livraison prévue se calcule depuis le départ prévu du planning ; sinon, la date saisie.
export function livrPrevueOf(meta, depart) {
  const m = meta || {}, n = m.transportJ;
  if (n != null && n !== "" && !isNaN(Number(n)) && depart) { const d = new Date(depart); if (!isNaN(d)) { d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + Number(n)); return d.toISOString().slice(0, 10); } }
  return m.livrPrevue || null;
}
export function penaltyCalc(meta, depart, today) {
  const p = { ...PEN_DEFAULT, ...((meta && meta.penalite) || {}) };
  const R = PEN_REFS[p.ref] || PEN_REFS.mad;
  const rate = num(p.ratePct), cap = num(p.cap), grace = Math.max(0, num(p.graceWeeks) || 0);
  const base = ficheBase(meta);
  const out = { status: "off", missing: [], ref: p.ref, refLabel: R.label, contract: null, effective: null, provisional: false, lateDays: 0, graceDays: grace * 7, chargeableWeeks: 0, base, weekly: null, raw: 0, capEur: null, amount: 0, capped: false, startDate: null };
  if (meta && meta.penalite && p.actif === false) { out.status = "inactive"; return out; }   // conditions saisies mais non activées par le client : aucun montant
  if (!meta || !meta.penalite || rate == null || rate <= 0) { out.status = meta && meta.penalite ? "incomplete" : "off"; if (out.status === "incomplete") out.missing.push("taux (%/semaine)"); return out; }
  if (base == null) out.missing.push("prix de la fiche");
  const contract = toDay(meta[R.contract]);
  if (!contract) out.missing.push("date contractuelle « " + R.label + " »");
  if (p.capType === "eur" ? (cap == null || cap <= 0) : false) out.missing.push("plafond");
  out.contract = contract ? iso(contract) : null;
  if (contract) {
    out.startDate = iso(new Date(+contract + (out.graceDays) * DAY));
    let eff = R.forecast ? toDay(R.forecast === "livrPrevue" ? livrPrevueOf(meta, depart) : meta[R.forecast]) : toDay(depart);
    const t = toDay(today);
    if (!eff && t && t > contract) { eff = t; out.provisional = true; }   // pas de prévision mais l'échéance est dépassée : on compte jusqu'à aujourd'hui
    if (eff) out.effective = iso(eff);
    if (eff) out.lateDays = Math.max(0, Math.round((+eff - +contract) / DAY));
  }
  out.status = out.missing.length ? "incomplete" : "ok";
  if (!contract) return out;
  const L = out.lateDays, G = out.graceDays;
  const days = L > G ? L - G : 0;
  out.chargeableWeeks = Math.ceil(days / 7);   // semaine entamée = semaine entière
  if (base != null) {
    out.weekly = base * rate / 100;
    out.raw = out.weekly * out.chargeableWeeks;
    out.capEur = cap == null || cap <= 0 ? null : p.capType === "eur" ? cap : base * cap / 100;
    out.amount = out.capEur != null ? Math.min(out.raw, out.capEur) : out.raw;
    out.capped = out.capEur != null && out.raw >= out.capEur && out.raw > 0;
  }
  return out;
}

// Fiches d'un même PJ : PJ461 → PJ461, PJ461-1, PJ461-2… (la base est ce qui précède le premier « - »)
export const pjBase = pj => String(pj || "").split("-")[0];
export function siblingsOf(rows, pj) {
  const b = pjBase(pj);
  return (rows || []).filter(r => r && r.pj && pjBase(r.pj) === b && r.etat !== "SLOT_LIBRE");
}
// Total (prix et pénalités) d'un PJ sur toutes ses fiches
export function pjTotals(rows, pj, getMeta, today) {
  const sib = siblingsOf(rows, pj);
  let price = 0, priced = 0, amount = 0, cap = 0, weekly = 0, lateFiches = 0;
  sib.forEach(r => {
    const m = getMeta(r.pj, r), b = ficheBase(m);
    if (b != null) { price += b; priced++; }
    const c = penaltyCalc(m, r.depart, today);
    if (c.status === "ok") { amount += c.amount; if (c.capEur != null) cap += c.capEur; if (c.weekly != null) weekly += c.weekly; if (c.chargeableWeeks > 0) lateFiches++; }
  });
  return { count: sib.length, price, priced, amount, cap, weekly, lateFiches, fiches: sib.map(r => r.pj) };
}
