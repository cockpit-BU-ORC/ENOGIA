import { statusOf, billDue, nextDue, toneOf, cashGroupsFor, linkedPayments, cashSummary, setCashinDoc, diffDays } from "./cashinLink";
import { paiementsOf, payPct } from "./pjProgress";

const T0 = "2026-10-16";
const row = (o) => ({ id: "x" + Math.random(), pj: "PJ460", jalon: "J", montant: 1000, delai: 30, ...o });
const doc = {
  rows: [
    row({ id: "a", pj: "PJ460", jalon: "Acompte", montant: 3000, factReelle: "2026-06-01", encReelle: "2026-07-01" }),
    row({ id: "b", pj: "PJ460", jalon: "Livraison", montant: 5000, factReelle: "2026-09-01", encPrevue: "2026-10-01" }),
    row({ id: "c", pj: "PJ460", jalon: "Solde", montant: 2000, encPrevue: "2026-10-25" }),
    row({ id: "d", pj: "PJ46", jalon: "Autre", montant: 999 }),
    row({ id: "e", pj: "PJ405-Y34", jalon: "Y34", montant: 500, epc: true }),
    row({ id: "f", pj: "PJ405", jalon: "Base", montant: 1500, factPrevue: "2026-12-01", encPrevue: "2027-01-10" }),
  ],
  labels: { PJ460: "Projet 460" }, totals: {},
};
afterEach(() => setCashinDoc(null));

test("statuts : payé, en retard, à facturer, à venir, EPC", () => {
  expect(statusOf(doc.rows[0], T0).k).toBe("paid");
  expect(statusOf(doc.rows[1], T0)).toEqual({ k: "late", days: 15 });
  expect(statusOf(doc.rows[2], T0).k).toBe("tobill"); // 25/10 − 30 j = 25/09 : facture à émettre depuis 21 j
  expect(statusOf(doc.rows[5], T0).k).toBe("future");
  expect(statusOf(doc.rows[4], T0).k).toBe("epc");
});
test("date de facturation : prévue, sinon encaissement − délai", () => {
  expect(billDue({ factPrevue: "2026-11-02" })).toBe("2026-11-02");
  expect(billDue({ encPrevue: "2026-10-31", delai: 30 })).toBe("2026-10-01");
  expect(billDue({})).toBeNull();
});
test("teinte : à facturer depuis plus d'un jour → orange, échéance ≤ 15 j → orange, retard → rouge", () => {
  expect(toneOf({ k: "tobill", days: 21 }, null)).toBe("warn");
  expect(toneOf({ k: "tobill", days: 0 }, null)).toBe("tobill");
  expect(toneOf({ k: "future" }, { days: 10 })).toBe("warn");
  expect(toneOf({ k: "future" }, { days: 40 })).toBe("future");
  expect(toneOf({ k: "late", days: 3 }, { days: -3 })).toBe("late");
});
test("rapprochement des PJ : PJ46 ne reprend pas PJ460, PJ405 reprend PJ405-Y34", () => {
  expect(cashGroupsFor("PJ46", doc).map(g => g.pj)).toEqual(["PJ46"]);
  expect(cashGroupsFor("pj 405", doc).map(g => g.pj)).toEqual(["PJ405-Y34", "PJ405"]);
  expect(cashGroupsFor("PJ999", doc)).toEqual([]);
});
test("jalons liés : pourcentage du total, montants, retard", () => {
  const l = linkedPayments("PJ460", doc, T0);
  expect(l.map(p => p.k)).toEqual(["paid", "late", "tobill"]);
  expect(l[0].pct).toBe(30);
  expect(l[1].retard).toBe(15);
  expect(l[1].groupLabel).toBe("Projet 460");
});
test("synthèse : retards, prochain paiement, EPC exclus", () => {
  const cs = cashSummary(linkedPayments("PJ460", doc, T0));
  expect(cs.total).toBe(10000); expect(cs.paid).toBe(3000); expect(cs.late).toBe(5000); expect(cs.lateN).toBe(1);
  expect(cashSummary(linkedPayments("PJ405", doc, T0)).allEpc).toBe(false);
  expect(cashSummary([{ linked: true, epc: true, montant: 1 }]).allEpc).toBe(true);
  expect(cashSummary([])).toBeNull();
});
test("paiementsOf / payPct : Cash in prioritaire, sinon saisie de la fiche, pondération par montant", () => {
  const meta = { paiements: [{ id: "p1", label: "Acompte", pct: 30, done: true }, { id: "p2", label: "Solde", pct: 70, done: false }] };
  expect(payPct(meta, "PJ460")).toBe(30); // pas de Cash in : fiche
  setCashinDoc(doc);
  expect(paiementsOf(meta, "PJ460").every(p => p.linked)).toBe(true);
  expect(payPct(meta, "PJ460")).toBe(30);  // 3000 / 10000
  expect(paiementsOf(meta, "PJ777")).toBe(meta.paiements); // PJ inconnu du Cash in : fiche
  expect(payPct({}, "PJ405")).toBe(0); // la ligne EPC est exclue, reste « Base » non payé
  expect(diffDays("2026-10-01", "2026-10-16")).toBe(15);
});
test("nextDue : paiement attendu ou facture à émettre, la plus proche", () => {
  expect(nextDue(doc.rows[1], T0)).toMatchObject({ kind: "paiement", days: -15 });
  expect(nextDue(doc.rows[0], T0)).toBeNull();
});

describe("liaisons choisies à la main et répartition ÷ X", () => {
  const { setCashinLinks, setOrdoPjs, toggleLink, targetsOf, autoTargets, getCashinLinks } = require("./cashinLink");
  afterEach(() => { setCashinLinks(null); setOrdoPjs([]); });

  test("un PJ du Cash in réparti sur 2 PJ de l'ordo : chacun reçoit la moitié, le % ne change pas", () => {
    setCashinLinks({ PJ460: ["PJ2001", "PJ2002"] });
    const a = linkedPayments("PJ2001", doc, T0), b = linkedPayments("PJ2002", doc, T0);
    expect(a.map(p => p.montant)).toEqual([1500, 2500, 1000]);
    expect(b.map(p => p.montant)).toEqual([1500, 2500, 1000]);
    expect(a[0].pct).toBe(30); expect(a[0].split).toBe(2);
    expect(cashSummary(a).total).toBe(5000);
    expect(linkedPayments("PJ460", doc, T0)).toEqual([]); // la liaison choisie remplace le rapprochement automatique
  });
  test("liaison vers un PJ de numéro différent, et liste vide = ignoré", () => {
    setCashinLinks({ PJ460: ["PJ999"], PJ46: [] });
    expect(linkedPayments("PJ999", doc, T0).length).toBe(3);
    expect(linkedPayments("PJ46", doc, T0)).toEqual([]);
  });
  test("rapprochement automatique avec la liste de l'ordo : le numéro exact l'emporte", () => {
    setOrdoPjs(["PJ405", "PJ405-Y34", "PJ460"]);
    expect(autoTargets("PJ405-Y34")).toEqual(["PJ405-Y34"]);
    expect(autoTargets("PJ405")).toEqual(["PJ405"]);
    expect(autoTargets("PJ405-Z34")).toEqual(["PJ405"]);
    expect(targetsOf("PJ460")).toEqual({ list: ["PJ460"], explicit: false });
  });
  test("toggleLink part de la liaison automatique, ajoute puis retire", () => {
    setOrdoPjs(["PJ460", "PJ470"]);
    let l = toggleLink({}, "PJ460", "PJ470");
    expect(l).toEqual({ PJ460: ["PJ460", "PJ470"] });
    setCashinLinks(l);
    l = toggleLink(getCashinLinks(), "PJ460", "PJ460");
    expect(l).toEqual({ PJ460: ["PJ470"] });
  });
});

describe("synthèse globale du Cash in (v191)", () => {
  const { cashOverview } = require("./cashinLink");
  test("payé, facturé, en retard, à facturer, hors EPC", () => {
    const doc = { rows: [
      { id: 1, montant: 100, encReelle: "2026-10-01" },
      { id: 2, montant: 50, factReelle: "2026-09-01", encPrevue: "2026-10-10", pj: "PJ1", jalon: "Solde" },
      { id: 3, montant: 30, factReelle: "2026-10-20", encPrevue: "2026-11-15" },
      { id: 4, montant: 20, factPrevue: "2026-10-20" },
      { id: 5, montant: 999, epc: true },
    ] };
    const o = cashOverview(doc, "2026-10-27");
    expect([o.paid, o.invoiced, o.late, o.toBill, o.next30]).toEqual([100, 80, 50, 20, 30]);
    expect(o.lateRows[0]).toMatchObject({ pj: "PJ1", days: 17 });
    expect(cashOverview({ rows: [] })).toBeNull();
  });
});
