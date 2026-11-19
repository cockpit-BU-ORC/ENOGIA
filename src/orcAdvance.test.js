import { orcAdvance, ADV_PHASES, mesDoneOf } from "./orcAdvance";

test("v423 : avancement global pondéré (KOM 5, Design 20, Achats 20, Fabrication 25, FAT 10, Livraison 15, MES 5)", () => {
  expect(ADV_PHASES.reduce((s, p) => s + p[2], 0)).toBe(100);
  expect(orcAdvance({ etat: "NOT ORDERED" }, {}).pct).toBe(0);
  expect(orcAdvance({ etat: "NOT ORDERED" }, { contratT0: "2026-01-10" }).pct).toBe(5);
  expect(orcAdvance({ etat: "MONTAGE", debutProd: "2026-11-01", tests: "2026-11-21" }, { contratT0: "x" }, { today: "2026-11-11" }).pct).toBe(5 + 20 + 20 + 13); // fab = 50 %
  expect(orcAdvance({ etat: "TESTS" }, {}, { testsPct: 0.5 }).pct).toBe(5 + 20 + 20 + 25 + 5);
  expect(orcAdvance({ etat: "SHIPPED" }, {}).pct).toBe(95);
  expect(orcAdvance({ etat: "SHIPPED" }, {}, { mesDone: true }).pct).toBe(100);
  const a = orcAdvance({ etat: "En fabrication" }, {}, { achatsPct: 50 });
  expect(a.phases.find(p => p.k === "appro")).toMatchObject({ done: 0.5, how: "Achats / Appro : lignes livrées" });
  expect(mesDoneOf({ parc: { PJ214: { mes: "2022-10-20" } } }, "PJ214-1", "2026-11-19")).toBe(true);
  expect(mesDoneOf({ tickets: { a: { pj: "PJ5", type: "mes", closedAt: "2026-01-01" } } }, "PJ5", "2026-11-19")).toBe(true);
  expect(mesDoneOf({}, "PJ5")).toBe(false);
});
