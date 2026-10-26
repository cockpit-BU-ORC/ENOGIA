import { nodeKey, splitKey, stepKeysOf, addLink, schedule } from "./engine";
import { parsePredecessors } from "./importPlan";

// Colonne « Prédécesseurs » façon MS Project : numéros de ligne, type (FS par défaut) et décalage en jours ouvrés.
// Exemple : « 2 ; 7SS+3j » = après la ligne 2, et en même temps que la ligne 7 avec 3 jours de retard.

// Numérote toutes les étapes dans l'ordre d'affichage (PJ, puis ses étapes), indépendamment des PJ repliés
export function numberRows(plan) {
  const idOf = {}, keyOf = {}, pjId = {}; let n = 0;
  (plan.pjs || []).forEach(p => { pjId[p.pj] = ++n; stepKeysOf(p).forEach(k => { const key = nodeKey(p.pj, k); idOf[key] = ++n; keyOf[n] = key; }); });
  return { idOf, keyOf, pjId };
}

export function predText(plan, idOf, key) {
  return (plan.links || []).filter(l => l.to === key && idOf[l.from] != null)
    .map(l => idOf[l.from] + (l.type === "FS" ? "" : l.type) + (l.lag ? (l.lag > 0 ? "+" : "") + l.lag + "j" : "")).join(" ; ");
}

// Remplace les prédécesseurs saisis à la main d'une étape ; renvoie { plan } ou { error }
export function applyPredText(plan, key, text, cal) {
  const { keyOf, pjId } = numberRows(plan); const ids = Object.keys(keyOf).length;
  const items = parsePredecessors(text); const bad = items.find(x => x.id == null);
  if (bad) return { error: bad.warn || "Lien illisible." };
  for (const it of items) {
    if (!keyOf[it.id]) return { error: Object.values(pjId).includes(it.id) ? "La ligne " + it.id + " est un PJ : choisissez une de ses étapes." : "La ligne " + it.id + " n'existe pas (1 à " + (ids + Object.keys(pjId).length) + ")." };
    if (keyOf[it.id] === key) return { error: "Une tâche ne peut pas dépendre d'elle-même." };
  }
  let np = { ...plan, links: (plan.links || []).filter(l => l.to !== key) };
  items.forEach(it => { np = addLink(np, { from: keyOf[it.id], to: key, type: it.type, lag: it.lag || 0 }); });
  const s = schedule(np, cal);
  if (s.cycle) { const x = splitKey(s.cycle[0]); return { error: "Ce lien créerait une boucle (autour de " + x.pj + ")." }; }
  return { plan: np };
}
