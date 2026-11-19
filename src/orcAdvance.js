// v423 (demandé : « pour l'avancement global ORC, voici les règles : KOM 5 %, Design 20 %, Achats et approvisionnements 20 %,
// Fabrication et assemblage atelier 25 %, FAT 10 %, Livraison et expédition 15 %, MES 5 % » + « un export Excel PJ, nom, avancement global pour le DAF ») :
// avancement global d'une machine = somme des poids × part réalisée de chaque phase (0 à 1), d'après ce que le Cockpit sait déjà.
export const ADV_PHASES = [
  ["kom", "KOM", 5], ["design", "Design", 20], ["appro", "Achats et approvisionnements", 20], ["fab", "Fabrication et assemblage atelier", 25],
  ["fat", "FAT", 10], ["exp", "Livraison et expédition", 15], ["mes", "MES", 5]];
// ordre des états de l'ordo (Non commandée → Expédiée)
const ORDER = ["NOT ORDERED", "NON_DESIGNEE", "A_DEFINIR", "En fabrication", "STOCKAGE_EXT", "MONTAGE", "ELEC", "TESTS", "PACKAGING", "SHIPPED"];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const iso = d => (d ? String(d).slice(0, 10) : "");
const between = (a, b, today) => { if (!a || !b || b <= a) return null; const t = Date.parse(today), A = Date.parse(a), B = Date.parse(b); return clamp((t - A) / (B - A)); };
const frac = (list, f) => (list && list.length ? list.filter(c => c && c[f]).length / list.length : null);

// r : ligne de l'ordo (etat, debutProd, tests, testsFin, finProd, depart) ; meta : fiche projet (contratT0, composants) ;
// o : { today, testsPct (0–1, fiche de tests), achatsPct (0–100, lignes livrées dans Achats / Appro), mesDone (MES faite, SAV) }
// → { pct (0–100), phases: [{ k, label, w, done (0–1), how }] }
export function orcAdvance(r, meta, o = {}) {
  const today = o.today || new Date().toISOString().slice(0, 10), i = ORDER.indexOf((r && r.etat) || ""), m = meta || {};
  const comps = Array.isArray(m.composants) ? m.composants : null, at = idx => i >= idx;
  const P = {};
  // KOM : contrat signé (T0) ou machine commandée
  P.kom = m.contratT0 || at(1) ? [1, m.contratT0 ? "T0 du contrat" : "machine commandée"] : [0, "pas encore de T0"];
  // Design : terminé dès la fabrication fournisseurs ; avant, part des composants dont le design est fait
  P.design = at(3) ? [1, "design terminé (état de l'ordo)"] : comps && frac(comps, "des") != null ? [frac(comps, "des"), "composants : design"] : [0, "design en cours"];
  // Achats : terminé dès le montage ; avant, lignes livrées (Achats / Appro), sinon composants réceptionnés
  P.appro = at(5) ? [1, "pièces reçues (montage commencé)"]
    : o.achatsPct != null ? [clamp(o.achatsPct / 100), "Achats / Appro : lignes livrées"]
    : comps && frac(comps, "inst") != null ? [frac(comps, "inst"), "composants réceptionnés"]
    : at(3) ? [0.5, "fabrication fournisseurs en cours"] : [0, "à lancer"];
  // Fabrication : terminée dès les tests ; montage / élec = temps écoulé entre le début de production et le début des tests
  const tf = between(iso(r && r.debutProd) || iso(r && r.arrivee), iso(r && r.tests), today);
  P.fab = at(7) ? [1, "montage terminé"] : at(6) ? [Math.max(0.5, tf == null ? 0.7 : tf), "montage élec"] : at(5) ? [clamp(tf == null ? 0.3 : tf, 0.05, 0.5), "montage méca"] : [0, "pas commencée"];
  // FAT : terminée dès le packaging ; pendant les tests, avancement de la fiche de tests
  P.fat = at(8) ? [1, "tests terminés"] : at(7) ? [o.testsPct != null ? clamp(o.testsPct) : 0.5, "fiche de tests"] : [0, "pas commencée"];
  // Livraison et expédition : packaging = moitié, expédiée = terminée
  P.exp = at(9) ? [1, "expédiée"] : at(8) ? [0.5, "packaging"] : [0, "pas encore"];
  // MES : mise en service faite (SAV / MES)
  P.mes = o.mesDone ? [1, "mise en service faite"] : [0, "pas encore"];
  const phases = ADV_PHASES.map(([k, label, w]) => ({ k, label, w, done: Math.round(P[k][0] * 100) / 100, how: P[k][1] }));
  return { pct: Math.round(phases.reduce((s, p) => s + p.w * p.done, 0)), phases };
}
// MES faite d'après SAV / MES : date de mise en service du parc (sav.parc[PJ].mes) passée, ou ticket de mise en service clos
export function mesDoneOf(savDoc, pj, today = new Date().toISOString().slice(0, 10)) {
  const base = String(pj || "").replace(/-\d+[A-Z]*$/, ""), p = ((savDoc && savDoc.parc) || {})[base] || ((savDoc && savDoc.parc) || {})[pj];
  if (p && p.mes && String(p.mes).slice(0, 10) <= today) return true;
  return Object.values((savDoc && savDoc.tickets) || {}).some(t => t && t.type === "mes" && (t.pj === pj || String(t.pj || "").replace(/-\d+[A-Z]*$/, "") === base) && (t.closedAt || t.statut === "clos"));
}
