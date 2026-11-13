import { turbineOf, achatsOf } from "./pjDossier";
import { buildNeeds } from "./turbineNeeds";

test("v309 : turbine du PJ dans sa fiche", () => {
  const doc = { turbines: { a: { num: "100N1", step: "ok", roue: "R1", besoin: "pj:PJ1" } }, roues: {}, injecteurs: {}, allocs: {} };
  const rows = [{ pj: "PJ1", gamme: "180LTV3", etat: "MONTAGE", arrivee: "2026-12-01" }];
  const t = turbineOf(doc, rows, "PJ1", () => ({}), buildNeeds);
  expect(t).toBeTruthy(); expect(t.slots[0].num).toBe("100N1"); expect(t.slots[0].roue).toBe("R1");
  expect(turbineOf(doc, rows, "PJ9", () => ({}), buildNeeds)).toBeNull();
});

test("v309 : achats du PJ — lignes par statut, commandes et retards", () => {
  const doc = { projets: { f1: { id: "f1", projet: "PJ480", machine: "PJ480-1" } },
    lignes: { l1: { id: "l1", projetId: "f1", statut: "apasser" }, l2: { id: "l2", projetId: "f1", poId: "p1" }, l3: { id: "l3", projetId: "f1", poId: "p2" }, l4: { id: "l4", projetId: "zz" } },
    po: { p1: { numero: "PO1", statut: "attente", dateLivraison: "2026-11-01" }, p2: { numero: "PO2", statut: "livre", dateLivraison: "2026-10-01" } } };
  const a = achatsOf(doc, "PJ480-1", "2026-11-12");
  expect(a.lignes).toBe(3); expect(a.counts.apasser).toBe(1); expect(a.counts.attente).toBe(1); expect(a.counts.livre).toBe(1);
  expect(a.pos.length).toBe(2); expect(a.retards).toBe(1);
  expect(achatsOf(doc, "PJ999", "2026-11-12")).toBeNull();
});
