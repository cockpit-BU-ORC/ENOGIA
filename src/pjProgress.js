import { linkedPayments, getCashinDoc } from "./cashinLink";
// Avancement d'un PJ : production (déjà saisi dans Manager › Suivi › Avancement), gros composants (désigné / commandé / réceptionné (reçu à ENOGIA ou installé))
// et jalons de paiement. L'avancement global, lui, est saisi à la main (voir globalProgress).
// Les saisies vivent dans la fiche projet (planning/pjMetaOverrides : composants, paiements), jamais écrasées par un import.
export const COMP_STEPS = [["des", "Design"], ["cmd", "PO"], ["inst", "Réceptionné"]];
export const DEFAULT_COMPOSANTS = ["Pompe", "Échangeur", "Skid", "Turbine", "Générateur", "Armoire électrique"];

// Liste de départ des PJ qui n'ont pas encore de liste propre : celle que les administrateurs gèrent (planning/overrides › composantCatalog), à défaut la liste standard.
let DEFAULTS = DEFAULT_COMPOSANTS;
export const setDefaultComposants = l => { const c = Array.isArray(l) ? l.map(x => String(x || "").trim()).filter(Boolean) : []; DEFAULTS = c.length ? c : DEFAULT_COMPOSANTS; };
export const getDefaultComposants = () => DEFAULTS;
export const composantsOf = meta => Array.isArray(meta && meta.composants) ? meta.composants : DEFAULTS.map((label, i) => ({ id: "d" + i, label, des: false, cmd: false, inst: false }));
// Jalons de paiement : ceux du Cash in quand le PJ y figure (lecture seule, super admin), sinon ceux saisis dans la fiche.
export const paiementsOf = (meta, pj) => {
  if (pj && getCashinDoc()) { const li = linkedPayments(pj); if (li.length) return li; }
  return Array.isArray(meta && meta.paiements) ? meta.paiements : [];
};

// % de cases cochées (null tant que rien n'a été saisi ni coché)
export function compPct(meta) {
  const l = composantsOf(meta); if (!l.length) return null;
  const k = l.reduce((a, c) => a + COMP_STEPS.filter(([f]) => c[f]).length, 0);
  if (!Array.isArray(meta && meta.composants) && k === 0) return null;
  return Math.round(k / (l.length * COMP_STEPS.length) * 100);
}
// % des jalons de paiement atteints : pondéré par le % du contrat de chaque jalon s'il est renseigné, sinon au nombre
export function payPct(meta, pj) {
  const all = paiementsOf(meta, pj), l = all.filter(p => !p.epc); if (!l.length) return null;
  const w = p => p.linked ? (Number(p.montant) || 0) : (Number(p.pct) || 0); // Cash in : pondéré par le montant ; fiche : par le % du contrat
  const tot = l.reduce((a, p) => a + w(p), 0);
  if (tot > 0) return Math.round(l.reduce((a, p) => a + (p.done ? w(p) : 0), 0) / tot * 100);
  return Math.round(l.filter(p => p.done).length / l.length * 100);
}
export const prodPct = (r, progress) => progress && progress[r.pj] != null ? progress[r.pj] : r.etat === "SHIPPED" ? 100 : 0;

// Avancement global = avancement du PROJET, de la signature du contrat à la mise en service (MES). C'est une valeur saisie en dur
// par le chef de projet (meta.avGlobal, 0-100), jamais une formule : { global, set, parts }. Les volets (production, composants,
// paiements) restent affichés à côté à titre d'information.
export const manualGlobal = meta => { const v = meta && meta.avGlobal; return v != null && v !== "" && !isNaN(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : null; };
export function globalProgress(r, meta, progress) {
  const parts = [{ k: "prod", label: "Production", v: prodPct(r, progress) }];
  const c = compPct(meta); if (c != null) parts.push({ k: "comp", label: "Composants", v: c });
  const p = payPct(meta, r.pj); if (p != null) parts.push({ k: "pay", label: "Paiements", v: p });
  const m = manualGlobal(meta);
  return { global: m != null ? m : 0, set: m != null, parts };
}
// Montant global du contrat (€) : meta.montantContrat, nombre positif ou null
export const montantOf = meta => { const v = meta && meta.montantContrat; return v != null && v !== "" && !isNaN(Number(v)) && Number(v) > 0 ? Number(v) : null; };
export const fmtEur = v => v == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v)).replace(/\u202f|\u00a0/g, " ") + " €";

// Actions de la semaine (meta.actions) et plans de mitigation (meta.mitigations) : listes de puces clôturables avec une date.
// [{ id, text, createdAt, done, doneAt ("AAAA-MM-JJ") }]. Tant qu'aucune liste n'a été enregistrée, l'ancien texte libre
// (notes.sem / notes.mit) est repris ligne par ligne ; dès la première modification, la liste devient la référence.
const LEGACY_NOTE = { actions: "sem", mitigations: "mit" };
const LEGACY_AT = { actions: "semAt", mitigations: "mitAt" };
export function itemsOf(meta, key) {
  if (meta && Array.isArray(meta[key])) return meta[key];
  const t = ((meta && meta.notes && meta.notes[LEGACY_NOTE[key]]) || "").trim();
  if (!t) return [];
  return t.split(/\n+/).map(x => x.replace(/^\s*[-•*–]\s*/, "").trim()).filter(Boolean)
    .map((text, i) => ({ id: "l" + i, text, createdAt: (meta && meta[LEGACY_AT[key]]) || null, done: false, doneAt: null }));
}
// v146.19 — actions et plans de mitigation structurés : état + échéance (+ risque / mesure pour les mitigations).
// `done` / `doneAt` restent la référence pour « ouvert / clôturé » (rapports, compteurs) : l'état « Terminé » les pilote.
export const ITEM_STATUS = [["todo", "À faire"], ["doing", "En cours"], ["blocked", "Bloqué"], ["done", "Terminé"]];
export const itemStatus = x => (x && ITEM_STATUS.some(s => s[0] === x.status) ? x.status : x && x.done ? "done" : "todo");
export const statusPatch = (x, st, today) => st === "done" ? { status: st, done: true, doneAt: (x && x.doneAt) || today } : { status: st, done: false, doneAt: null };
export const mitText = (risk, measure) => [String(risk || "").trim(), String(measure || "").trim()].filter(Boolean).join(" → ");
// Une mitigation saisie avant v146.19 n'a qu'un texte : il devient le « risque »
export const mitParts = x => (x && (x.risk != null || x.measure != null) ? { risk: x.risk || "", measure: x.measure || "" } : { risk: (x && x.text) || "", measure: "" });
// Ouvertes d'abord (ordre de saisie), puis clôturées (les plus récemment closes en premier)
export const sortedItems = list => [...list.filter(x => !x.done), ...list.filter(x => x.done).sort((a, b) => String(b.doneAt || "").localeCompare(String(a.doneAt || "")))];
