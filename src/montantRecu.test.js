import { setEncReelle, paidAmount, paidGap, groupStats, monthly } from "./cashinModel";
import { weeklyReport } from "./cashWeekly";

// v375 : le DAF peut noter un montant reçu différent du montant prévu ; par défaut rien ne change
const T0 = "2026-11-16";
const ROWS = [{ id: "a", pj: "PJ1", jalon: "FAT", montant: 100000, delai: 30, factReelle: "2026-10-01", encPrevue: "2026-10-31", encInit: "2026-10-31" }];

test("v375 : sans montant saisi, le jalon est payé au montant prévu et rien n'est noté", () => {
  const r = setEncReelle(ROWS, "a", "2026-11-10", T0)[0];
  expect(r.encReelle).toBe("2026-11-10"); expect("montantRecu" in r).toBe(false);
  expect(paidAmount(r)).toBe(100000); expect(paidGap(r)).toBe(null);
  expect(setEncReelle(ROWS, "a", "2026-11-10", T0, 100000)[0].montantRecu).toBeUndefined(); // égal au prévu = rien de noté
});
test("v375 : montant reçu différent — gardé à part, compté dans l'encaissé", () => {
  const rows = setEncReelle(ROWS, "a", "2026-11-10", T0, "95000.5"), r = rows[0];
  expect(r.montant).toBe(100000); expect(r.montantRecu).toBe(95000.5);
  expect(paidGap(r)).toBe(-4999.5);
  expect(groupStats(rows, T0).paid).toBe(95000.5);
  expect(monthly(rows, T0).months.find(m => m.key === "2026-11").paid).toBe(95000.5);
  expect(weeklyReport({ rows }, T0).ytd.paid).toBe(95000.5);
});
test("v375 : remettre à encaisser efface aussi le montant reçu", () => {
  const paid = setEncReelle(ROWS, "a", "2026-11-10", T0, 90000), back = setEncReelle(paid, "a", null, T0)[0];
  expect(back.encReelle).toBeFalsy(); expect("montantRecu" in back).toBe(false);
});
