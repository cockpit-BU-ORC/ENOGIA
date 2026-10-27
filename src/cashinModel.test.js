import { applyEdit, newRow, toTreat, groupInfo } from "./cashinModel";

describe("Cash in intégré : édition d'un jalon (v193, mêmes règles que la page d'origine)", () => {
  test("facture initiale : délai de 30 j par défaut, facture prévue et encaissements calculés", () => {
    const { row, autoDelai } = applyEdit(newRow("PJ1", "Acompte"), "factInit", "2026-11-02", "2026-10-27");
    expect(autoDelai).toBe(true);
    expect(row).toMatchObject({ delai: 30, factPrevue: "2026-11-02", encInit: "2026-12-02", encPrevue: "2026-12-02", statut: "future" });
  });
  test("facture émise puis paiement : encaissement prévu recalculé, statut payé", () => {
    let r = applyEdit(newRow("PJ1"), "factInit", "2026-09-01", "2026-10-27").row;
    r = applyEdit(r, "factReelle", "2026-09-10", "2026-10-27").row;
    expect(r.encPrevue).toBe("2026-10-10");
    expect(r.statut).toBe("late");
    r = applyEdit(r, "encReelle", "2026-10-20", "2026-10-27").row;
    expect(r.statut).toBe("paid");
  });
  test("À traiter : retard de paiement avant facture à émettre ; EPC ignoré", () => {
    const rows = [
      { id: "a", pj: "PJ1", montant: 10, factReelle: "2026-09-01", encPrevue: "2026-10-01" },
      { id: "b", pj: "PJ2", montant: 10, factPrevue: "2026-10-20" },
      { id: "c", pj: "PJ3", montant: 10, factPrevue: "2026-10-01", epc: true },
    ];
    expect(toTreat(rows, "2026-10-27").map(x => [x.r.id, x.kind])).toEqual([["a", "late"], ["b", "tobill"]]);
  });
  test("synthèse d'un PJ : montant du projet saisi prioritaire", () => {
    const doc = { rows: [{ pj: "PJ1", montant: 30, encReelle: "2026-01-01" }, { pj: "PJ1", montant: 70 }], totals: { PJ1: 200 } };
    expect(groupInfo(doc, "PJ1")).toMatchObject({ total: 200, sum: 100, paid: 30 });
  });
});
