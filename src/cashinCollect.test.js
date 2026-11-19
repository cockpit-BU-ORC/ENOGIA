import { toCollect, recentlyPaid, setEncReelle } from "./cashinModel";

const today = "2026-11-18"; // mercredi : la semaine finit le dimanche 22/11
const rows = [
  { id: "a", pj: "PJ902", montant: 48000, factReelle: "2026-10-02", delai: 30, encPrevue: "2026-11-01", encReelle: null },
  { id: "b", pj: "PJ905", montant: 72600, factReelle: "2026-11-12", delai: 7, encPrevue: "2026-11-19", encReelle: null },
  { id: "c", pj: "PJ909", montant: 36800, factReelle: "2026-11-05", delai: null, encPrevue: "2026-11-22", encReelle: null },
  { id: "d", pj: "PJ901", montant: 134000, factReelle: "2026-11-14", delai: 30, encPrevue: null, encReelle: null },
  { id: "e", pj: "PJ903", montant: 63000, factReelle: null, factPrevue: "2026-11-30", encReelle: null },
  { id: "f", pj: "PJ898", montant: 21000, factReelle: "2026-09-02", encReelle: "2026-11-10" },
  { id: "g", pj: "PJ900", montant: 9000, factReelle: "2026-11-01", encReelle: null, epc: true },
];

describe("encaissements du DAF (v369)", () => {
  test("factures émises non payées, hors EPC, groupées et triées", () => {
    const L = toCollect(rows, today);
    expect(L.map(x => [x.r.id, x.group])).toEqual([["a", "late"], ["b", "week"], ["c", "week"], ["d", "later"]]);
    expect(L[0].days).toBe(-17);
    expect(L[3].due).toBe("2026-12-14"); // facture + délai quand l'encaissement prévu manque
  });
  test("paiements reçus récemment", () => {
    expect(recentlyPaid(rows, today).map(r => r.id)).toEqual(["f"]);
    expect(recentlyPaid(rows, "2026-12-31").length).toBe(0);
  });
  test("saisie et remise à vide de la date de paiement, statut recalculé", () => {
    const paid = setEncReelle(rows, "b", "2026-11-18", today).find(r => r.id === "b");
    expect(paid.encReelle).toBe("2026-11-18");
    expect(paid.statut).toBe("paid");
    expect(paid.factReelle).toBe("2026-11-12");
    const back = setEncReelle([paid], "b", null, today)[0];
    expect(back.encReelle).toBe(null);
    expect(back.statut).not.toBe("paid");
  });
});

test("v421 : payé (forcé) = payé, hors encaissements à suivre", () => {
  const { statusOf } = require("./cashinLink");
  const r = { pj: "PJ1", factReelle: "2026-01-01", encPrevue: "2026-02-01", payeForce: true };
  expect(statusOf(r, "2026-11-19")).toEqual({ k: "paid", forced: true });
  expect(toCollect([r], "2026-11-19")).toEqual([]);
});
