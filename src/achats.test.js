import { besoinOf, lineState, STATUTS, EMPTY_ACHATS } from "./components/Achats";

// v262, mis à jour v293 (kit du responsable achats) : date de besoin = début de la machine (ou arrivée), sauf date saisie ;
// livraison cible = besoin − marge ; commande au plus tard = cible − LT fournisseur − LT transport.
const row = { pj: "PJ1", arrivee: "2026-12-10" }, params = { marge: 10 }, four = { ltJ: 10, ltTransportJ: 2 };
test("date de besoin : début / arrivée du PJ, sauf date saisie", () => {
  expect(besoinOf({}, row, params)).toBe("2026-12-10");
  expect(besoinOf({}, { dateDebut: "2026-12-01", arrivee: "2026-12-10" }, params)).toBe("2026-12-01");
  expect(besoinOf({ dateBesoin: "2026-11-20" }, row, params)).toBe("2026-11-20");
  expect(besoinOf({}, {}, params)).toBe("");
});
test("état d'une ligne : livrée, non conforme, en retard, à commander vite, à passer, dans les temps", () => {
  const ext = { four };
  const s = lineState({ statut: "apasser" }, row, params, "2026-11-01", ext);
  expect(s.cible).toBe("2026-11-30"); expect(s.auPlusTard).toBe("2026-11-16"); // v400 : transport en jours ouvrés (30/11 − 2 j ouvrés = 26/11, − LT 10 j)
  expect(lineState({ statut: "recu" }, row, params, "2026-11-04", ext).k).toBe("done");       // ancien statut repris
  expect(lineState({ statut: "nc" }, row, params, "2026-11-04", ext).k).toBe("nc");
  const late = lineState({ statut: "confirme", datePrevue: "2026-12-05" }, row, params, "2026-11-04", ext);
  expect(late.k).toBe("late"); expect(late.retardJ).toBe(5);
  expect(s.k).toBe("todo");                                                                      // commande dans 15 j
  expect(lineState({ statut: "apasser" }, row, params, "2026-11-10", ext).k).toBe("soon");      // dans 6 j
  const cl = lineState({ statut: "apasser" }, row, params, "2026-11-20", ext);
  expect(cl.k).toBe("late"); expect(cl.retardJ).toBe(4);
  expect(lineState({ statut: "apasser" }, row, params, "2026-11-04").l).toBe("Fournisseur manquant");
  expect(lineState({}, row, params, "2026-11-04", { four, poLine: { statut: "envoyee", dateLivraison: "2026-11-25" } }).k).toBe("ok"); // statut = celui de la PO affectée
  // v400 : livraison prévue d’une PO = date Odoo (chez le fournisseur) + LT transport en jours ouvrés (29/01 + 5 j ouvrés = 05/02)
  const tr = lineState({}, row, params, "2027-01-04", { four: { ltJ: 10, ltTransportJ: 5 }, poLine: { statut: "attente", dateLivraison: "2027-01-29" } });
  expect(tr.prevueFour).toBe("2027-01-29"); expect(tr.prevue).toBe("2027-02-05");
  expect(STATUTS.length).toBe(4); expect(EMPTY_ACHATS.params.marge).toBe(10);
});
