import { monthReview, addMonths, monthLabel } from "./monthReview";

// v274 : bilan mensuel des KPI — réalisé / à venir / en retard, écart à l'initial, PJXX exclus
test("bilan d'un mois : départs faits, en retard, à venir ; écart à l'initial", () => {
  const rows = [
    { pj: "PJ1", etat: "SHIPPED", depart: "2026-10-05", finProd: "2026-09-20" },
    { pj: "PJ2", etat: "PACKAGING", depart: "2026-10-20", finProd: "2026-10-02" },
    { pj: "PJ3", etat: "MONTAGE", depart: "2026-10-28" },
    { pj: "PJXX", etat: "MONTAGE", depart: "2026-10-10" },
  ];
  const r = monthReview(rows, { PJ1: { depart: "2026-09-25" } }, "2026-10", new Date(2026, 9, 25));
  const dep = r.groups.find(g => g.k === "depart").items;
  expect(dep.map(i => [i.pj, i.st])).toEqual([["PJ1", "done"], ["PJ2", "late"], ["PJ3", "todo"]]);
  expect(dep[0].drift).toBe(10);
  expect(r.groups.find(g => g.k === "finProd").items.map(i => i.st)).toEqual(["done"]);
  expect(r).toMatchObject({ shipped: 1, departs: 3, late: 1 });
  expect(addMonths("2026-01", -2)).toBe("2025-11");
  expect(monthLabel("2026-11")).toMatch(/^Novembre 2026$/);
});
