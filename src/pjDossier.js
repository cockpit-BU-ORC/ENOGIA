// v309 (revue frontend, point 3 « le PJ n'est pas encore le centre de tout ») : ce que la fiche d'un PJ montre des autres pages.
//  · turbineOf : le besoin turbine du PJ (Turbines › Besoins) — turbines attribuées, roue, injecteur, installée, disponibilité.
//  · achatsOf : les lignes d'achat de ses fiches machine (Achats / Appro) — par statut, et les commandes (PO) avec leur livraison.
// Lecture seule : on modifie dans la page d'origine.

export function turbineOf(prodDoc, rows, pj, metaOf, buildNeeds, today = new Date()) {
  if (!prodDoc || !pj || !buildNeeds) return null; // v324 : calcul fourni par l'appelant (turbineNeeds chargé à la demande)
  const { needs } = buildNeeds(prodDoc, rows, metaOf, today);
  const n = needs.find(x => x.key === "pj:" + pj);
  if (!n) return null;
  const slots = n.slots.filter(s => !s.extra).map(s => ({
    num: s.t ? s.t.num || "Turbine" : "", allouee: !!s.t, installee: s.installee || "",
    roue: s.roue ? s.roue.ref : s.roueMontee || "", inj: s.inj ? s.inj.ref + (s.inj.bouches != null ? " · " + s.inj.bouches + " bouchage" + (s.inj.bouches > 1 ? "s" : "") : "") : "",
    dispo: s.dispo || null, estimee: !!s.estimee, estNum: s.estNum || "", ecart: s.ecart }));
  return { cfg: n.cfg, date: n.date, roue: n.roue, inj: n.inj, slots, issues: n.issues.filter(i => i.bad).map(i => i.t), complete: !!n.complete,
    late: !!n.late, installees: n.installees || 0, want: n.want };
}

const LEGACY_ST = { besoin: "apasser", consult: "apasser", commande: "envoyee", confirme: "attente", expedie: "attente", recu: "livre" };
export const ACHAT_ST = [["apasser", "À commander"], ["envoyee", "Commande envoyée"], ["attente", "En attente de livraison"], ["livre", "Livré"], ["nc", "Non conforme"]];
const isoOf = v => { if (!v) return ""; const s = String(v); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ""; };

export function achatsOf(achatsDoc, pj, todayIso) {
  if (!achatsDoc || !pj) return null;
  const P = String(pj).trim(), base = P.replace(/-\d+$/, "");
  const fiches = Object.values(achatsDoc.projets || {}).filter(f => f && (String(f.machine || "").trim() === P || (!f.machine && String(f.projet || "").trim() === base)));
  const ids = new Set(fiches.map(f => f.id));
  const lines = Object.values(achatsDoc.lignes || {}).filter(l => l && (ids.has(l.projetId) || (!l.projetId && String(l.pj || "").trim() === P)));
  if (!fiches.length && !lines.length) return null;
  const t = todayIso || new Date().toISOString().slice(0, 10), po = achatsDoc.po || {};
  const counts = Object.fromEntries(ACHAT_ST.map(([k]) => [k, 0])), byPo = new Map();
  lines.forEach(l => {
    const p = l.poId && po[l.poId] && !po[l.poId].annule ? po[l.poId] : null;
    const st = p ? (p.statut || "envoyee") : l.statut === "nc" ? "nc" : (LEGACY_ST[l.statut] || l.statut || "apasser");
    counts[counts[st] != null ? st : "apasser"]++;
    if (p) { const k = p.numero || l.poId; const cur = byPo.get(k) || { numero: p.numero || "—", statut: st, livraison: isoOf(p.dateLivraison), lignes: 0, source: p.source || "" };
      cur.lignes++; if (isoOf(p.dateLivraison) && (!cur.livraison || isoOf(p.dateLivraison) > cur.livraison)) cur.livraison = isoOf(p.dateLivraison); byPo.set(k, cur); }
  });
  const pos = [...byPo.values()].map(x => ({ ...x, retard: x.statut !== "livre" && x.livraison && x.livraison < t })).sort((a, b) => String(a.livraison || "9").localeCompare(String(b.livraison || "9")));
  return { fiches: fiches.length, lignes: lines.length, counts, pos, retards: pos.filter(x => x.retard).length };
}
