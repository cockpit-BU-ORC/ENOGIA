// v279 (demandé : « objectifs chiffrés, et passer tous les sous-onglets KPI au skill KPI ») — skill kpi-dashboard-design :
// des KPI SMART (définition claire, mesurable, objectif réaliste, période définie), le contexte (objectif, écart) et la méthode affichés,
// rouge = mauvais / vert = bon. Objectifs réglables par le propriétaire : planning/profiles.kpiTargets = { clé: valeur }.
import { monthReview, monthKey, addMonths } from "./monthReview";

export const KPI_TARGETS = [
  { k: "tenus", l: "PJ tenus à date (départ)", unit: "%", dir: "min", def: 80, how: "Part des PJ ayant un planning initial dont le départ actuel n'est pas plus tard que le départ promis (écart ≤ 0)." },
  { k: "derive", l: "Dérive moyenne du départ", unit: "j", dir: "max", def: 7, how: "Moyenne des écarts (jours) entre départ actuel et départ initial, PJ en retard et en avance confondus." },
  { k: "charge", l: "Charge atelier (4 semaines)", unit: "%", dir: "max", def: 100, how: "Heures planifiées des 4 prochaines semaines ÷ capacité de ces semaines (jours fermés déduits)." },
  { k: "realisation", l: "Jalons du mois écoulé tenus", unit: "%", dir: "min", def: 90, how: "Mois dernier : jalons faits ÷ (faits + en retard). « En retard » = date passée sans que l'état de la machine ait suivi." },
  { k: "livraisons", l: "Machines expédiées par mois", unit: "", dir: "min", def: 3, how: "Machines à l'état Expédiée dont le départ tombe dans le mois écoulé." },
];
export const targetsOf = profiles => { const t = (profiles && profiles.kpiTargets) || {}; const o = {}; KPI_TARGETS.forEach(x => { o[x.k] = t[x.k] != null && t[x.k] !== "" && !isNaN(+t[x.k]) ? +t[x.k] : x.def; }); return o; };
export const targetDef = k => KPI_TARGETS.find(x => x.k === k);
// Jugement d'une valeur face à son objectif : ok / pas ok et écart (signé dans le sens « bon »)
export function judge(k, v, targets) {
  const d = targetDef(k); if (!d || v == null || isNaN(v)) return { ok: null, gap: null, target: targets ? targets[k] : null };
  const t = (targets || {})[k] != null ? targets[k] : d.def;
  const gap = d.dir === "min" ? v - t : t - v;
  return { ok: gap >= 0, gap: Math.round(gap * 10) / 10, target: t };
}
// Mesures communes aux sous-onglets
export function kpiMetrics(rows, driftRows, today = new Date()) {
  const comp = (driftRows || []).filter(r => r.hasInitial && r.depart && r.depart.delta != null);
  const tenus = comp.length ? Math.round(comp.filter(r => r.depart.delta <= 0).length / comp.length * 100) : null;
  const derive = comp.length ? Math.round(comp.reduce((a, r) => a + r.depart.delta, 0) / comp.length * 10) / 10 : null;
  const prev = addMonths(monthKey(today), -1), mr = monthReview(rows, null, prev, today);
  const realisation = mr.done + mr.late ? Math.round(mr.done / (mr.done + mr.late) * 100) : null;
  return { tenus, derive, realisation, livraisons: mr.shipped, prevMonth: prev, nComp: comp.length };
}
