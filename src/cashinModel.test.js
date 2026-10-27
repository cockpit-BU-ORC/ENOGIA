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

describe("Cash in intégré : Projets, Cash par mois, Écarts (v194)", () => {
  const { groupStats, monthly, ecartGroups, ecartKpis, matrixItems, monthRange } = require("./cashinModel");
  const T0 = "2026-10-27";
  const rows = [
    { id: "a", pj: "PJ1", montant: 100, factInit: "2026-08-01", factPrevue: "2026-08-01", factReelle: "2026-08-05", encInit: "2026-08-31", encPrevue: "2026-09-04", encReelle: "2026-09-10" },
    { id: "b", pj: "PJ1", montant: 50, factInit: "2026-09-01", factPrevue: "2026-09-10", factReelle: "2026-09-12", encInit: "2026-10-01", encPrevue: "2026-10-12" },
    { id: "c", pj: "PJ2", montant: 30, factInit: "2026-11-01", factPrevue: "2026-11-01", encInit: "2026-12-01", encPrevue: "2026-12-01" },
    { id: "d", pj: "PJ2", montant: 999, epc: true },
  ];
  test("projets : payés, en attente, reste à facturer, prochain encaissement", () => {
    expect(groupStats(rows.filter(r => r.pj === "PJ1"), T0)).toMatchObject({ n: 2, paidN: 1, paid: 100, inv: 50, toBill: 0, next: "2026-10-12" });
    expect(groupStats(rows.filter(r => r.pj === "PJ2"), T0)).toMatchObject({ epc: 999, toBill: 30, next: "2026-12-01" });
  });
  test("cash par mois : initial vs réel / actualisé, EPC exclu", () => {
    const m = monthly(rows, T0), by = k => m.months.find(x => x.key === k);
    expect(by("2026-08")).toMatchObject({ init: 100 });
    expect(by("2026-09")).toMatchObject({ paid: 100, sh: 100 });
    expect(by("2026-10")).toMatchObject({ init: 50, fc: 50 });
    expect(matrixItems(rows, T0)).toHaveLength(3);
    expect(monthRange(["2026-11", "2027-02"])).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
  test("écarts : retard de paiement par PJ, chiffres clés", () => {
    const g = ecartGroups({ rows }, "eEncReel", "pj", "avg", T0);
    expect(g.map(x => [x.key, Math.round(x.val)])).toEqual([["PJ1", 11]]);
    const k = ecartKpis(rows, T0);
    expect(k).toMatchObject({ paidN: 1, lateN: 1, avgRet: 6 });
    expect(k.worst.r.id).toBe("b");
  });
});
