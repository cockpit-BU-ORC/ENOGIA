// v366 (maquette maquettes-design/v366-bancs-turbines.html, piste A validée : « Go, piste A ») — modèle des bancs de tests :
// banc d'une machine (planificateur, sinon planning publié, sinon banc 1), file des machines à venir par banc, rangement des créneaux
// d'une même ligne sans chevauchement (sous-lignes), historique des tests validés groupé par mois.
export const BENCHES = [1, 2];

// banc d'une machine : plan du planificateur (benches[PJ]) puis colonne « banc » du planning publié ; défaut 1
export function benchOf(benches, r) {
  const b = benches && r && benches[r.pj];
  if (b === 2 || b === "2") return 2;
  if (b === 1 || b === "1") return 1;
  return r && (r.banc === 2 || r.banc === "2") ? 2 : 1;
}

// machines dont les tests commencent après aujourd'hui, par banc, dans l'ordre de passage (n par banc)
export function nextByBench(list, n = 4) {
  const out = {}; BENCHES.forEach(b => { out[b] = []; });
  [...list].sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : String(x.pj).localeCompare(String(y.pj)))).forEach(x => { (out[x.bench] = out[x.bench] || []); if (out[x.bench].length < n) out[x.bench].push(x); });
  return out;
}

// créneaux { a, b } (dates ISO) rangés en sous-lignes : chaque élément reçoit .row ; renvoie le nombre de sous-lignes
export function packRows(items) {
  const ends = [];
  [...items].sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0)).forEach(it => {
    let i = ends.findIndex(e => e < it.a);
    if (i < 0) { i = ends.length; ends.push(it.b); } else ends[i] = it.b;
    it.row = i;
  });
  return Math.max(1, ends.length);
}

// historique : [{ month: "AAAA-MM", label: "Novembre 2026", items }], du plus récent au plus ancien
export function byMonth(list, dateOf) {
  const m = new Map();
  [...list].sort((x, y) => (dateOf(x) < dateOf(y) ? 1 : -1)).forEach(x => { const k = String(dateOf(x) || "").slice(0, 7) || "????"; if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return [...m.entries()].map(([month, items]) => {
    const d = new Date(month + "-15T12:00:00"), l = isNaN(d) ? "Sans date" : d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { month, label: l.charAt(0).toUpperCase() + l.slice(1), items };
  });
}
