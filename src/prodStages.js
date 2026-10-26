// ── Étapes de production chez ENOGIA : remplacent l'ancien état « Production ENOGIA » ──────────────────────────────────────
// Montage Méca 0–40 % · Montage Élec 40–80 % · Tests 80–90 % · Packaging 90–95 % · Expédiée 100 %.
// L'avancement de production d'un PJ dans l'une de ces étapes est déduit de son ÉTAT (choisi dans Manager › Suivi › Statut & état) :
// milieu de la plage de l'étape. Les éléments entre parenthèses (lub, cooling, test de pression…) sont purement informatifs (frise « i »).
export const STAGES = [
  { id: "MONTAGE", label: "Montage Méca", from: 0, to: 40, steps: ["Lubrification (lub)", "Refroidissement (cooling)", "Test de pression", "Tirage au vide", "Remplissage*"] },
  { id: "ELEC", label: "Montage Élec", from: 40, to: 80, steps: ["Tirage de câbles", "Pose de l'armoire", "Câblage"] },
  { id: "TESTS", label: "Tests", from: 80, to: 90, steps: ["Essais de la machine", "FAT"] },
  { id: "PACKAGING", label: "Packaging", from: 90, to: 95, steps: ["RAI", "Mise des carters", "Emballage"] },
];
// Note de bas de page des étapes marquées d'un « * » (frise « i »).
export const STEP_NOTE = "* Le remplissage peut se faire à tout moment, dès que le test de pression et le tirage au vide sont finalisés — principalement entre le montage méca et le montage élec.";
export const STAGE_IDS = STAGES.map(s => s.id);
export const stageOf = etat => STAGES.find(s => s.id === etat) || null;
export const stageIndex = etat => STAGE_IDS.indexOf(etat);
export const isStage = etat => stageIndex(etat) !== -1;

// Ancien état « PROD » : l'étape est déduite de l'avancement qui avait été saisi à la main (< 40 Montage, < 80 Élec, < 90 Tests, sinon Packaging).
export function stageFromPct(p) {
  const v = Number(p); if (!isFinite(v)) return "MONTAGE";
  return v < 40 ? "MONTAGE" : v < 80 ? "ELEC" : v < 90 ? "TESTS" : "PACKAGING";
}
export const normalizeEtat = (etat, manualPct) => etat === "PROD" ? stageFromPct(manualPct != null ? manualPct : 0) : etat;

// Avancement (0-100) imposé par l'état, ou null si l'état n'est pas une étape de production (alors l'avancement déjà saisi est conservé).
export function autoPct(etat) {
  if (etat === "SHIPPED") return 100;
  const st = stageOf(etat); if (!st) return null;
  return Math.round((st.from + st.to) / 2);
}
export function buildProgress(manual, rows) {
  const out = { ...(manual || {}) };
  (rows || []).forEach(r => { const a = autoPct(r.etat); if (a != null) out[r.pj] = a; });
  return out;
}
