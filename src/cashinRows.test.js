import { cashGroupsFor, linkedPayments, rowKey, setCashinLinks, setOrdoPjs } from "./cashinLink";

// Contrat général PJ461 : 3 jalons globaux + 1 jalon réservé à la machine PJ461-B.
const doc = { rows: [
  { id: "a", pj: "PJ461", jalon: "Acompte", montant: 300 },
  { id: "b", pj: "PJ461", jalon: "Livraison", montant: 600 },
  { id: "c", pj: "PJ461", jalon: "Option machine B", montant: 100 },
], labels: {}, totals: {} };
const ordo = ["PJ461-A", "PJ461-B", "PJ461-C"];
const links = { PJ461: ordo, [rowKey("c")]: ["PJ461-B"] };

describe("liaison jalon par jalon (v146.15)", () => {
  beforeEach(() => { setOrdoPjs(ordo); setCashinLinks(links); });
  test("un jalon réparti est divisé entre toutes les machines liées", () => {
    const l = linkedPayments("PJ461-A", doc, "2026-10-19");
    expect(l.map(x => x.label)).toEqual(["Acompte", "Livraison"]);
    expect(l.map(x => Math.round(x.montant))).toEqual([100, 200]);
    expect(l.every(x => !x.shared)).toBe(true);
  });
  test("un jalon commun à plusieurs machines n'est PAS divisé et reste marqué commun", () => {
    const lk = { PJ461: ordo, [rowKey("a")]: ["PJ461-A", "PJ461-B"] };
    setCashinLinks(lk);
    const a = linkedPayments("PJ461-A", doc, "2026-10-19").find(x => x.label === "Acompte");
    const b = linkedPayments("PJ461-B", doc, "2026-10-19").find(x => x.label === "Acompte");
    expect(a.montant).toBe(300); expect(b.montant).toBe(300);
    expect(a.shared).toBe(true); expect(a.sharedN).toBe(2);
    expect(linkedPayments("PJ461-C", doc, "2026-10-19").some(x => x.label === "Acompte")).toBe(false);
  });
  test("un jalon réservé à une seule machine revient en entier, sans marque commun", () => {
    const g = cashGroupsFor("PJ461-B", doc, links, ordo)[0];
    expect(g.rows.map(r => r.jalon)).toEqual(["Acompte", "Livraison", "Option machine B"]);
    expect(Math.round(g.total)).toBe(100 + 200 + 100);
    expect(g.rows[2]._shared).toBe(false);
  });
  test("sans jalon particulier, le comportement d'avant est conservé (total ÷ n)", () => {
    const g = cashGroupsFor("PJ461-C", doc, { PJ461: ordo }, ordo)[0];
    expect(Math.round(g.total)).toBe(333);
    expect(g.custom).toBe(false);
  });
});
