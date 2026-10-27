import { makeCalendar, initPlanFromRows, schedule, loadModel, levelPlan, shiftPj, pjDates, refreshPlanFromRows, planToRows, diffRows } from "./engine";

// v204 : le module de planification est rebranché (onglet Planificateur) — vérifie le calcul de base.
const rows = [
  { pj: "PJ1", etat: "ELEC", arrivee: "2026-10-01", tests: "2026-11-02", testsFin: "2026-11-04", finProd: "2026-11-09", depart: "2026-11-12", gamme: "180LTV3" },
  { pj: "PJ2", etat: "MONTAGE", arrivee: "2026-10-20", tests: "2026-11-16", testsFin: "2026-11-18", finProd: "2026-11-23", depart: "2026-11-26", gamme: "100MT" },
];
describe("planificateur (v204)", () => {
  const cal = makeCalendar({ closurePeriods: [] });
  test("le plan créé depuis le planning reprend ses dates, sans boucle", () => {
    const plan = initPlanFromRows(rows, cal), s = schedule(plan, cal);
    expect(plan.pjs.map(p => p.pj)).toEqual(["PJ1", "PJ2"]);
    expect(s.cycle).toBeFalsy();
    expect(pjDates(s, "PJ1").depart).toBe("2026-11-12");
    expect(loadModel(plan, s, cal)).toBeTruthy();
    expect(levelPlan(plan, cal)).toBeTruthy();
  });
  test("décaler un PJ décale ses dates", () => {
    const plan = initPlanFromRows(rows, cal), moved = shiftPj(plan, "PJ1", 5, cal);
    const a = pjDates(schedule(plan, cal), "PJ1").depart, b = pjDates(schedule(moved, cal), "PJ1").depart;
    expect(b > a).toBe(true);
  });
  test("v206 : reprise des dates du planning, heures manquantes estimées par gamme sans être publiées", () => {
    const rs = [...rows, { pj: "PJ3", etat: "MONTAGE", arrivee: "2026-10-26", tests: "2026-11-23", testsFin: "2026-11-25", finProd: "2026-11-30", depart: "2026-12-03", gamme: "100MT", heuresAtelier: 0 }];
    rs[1] = { ...rs[1], heuresAtelier: 200 };
    const plan = refreshPlanFromRows({ cap: { people: 3, hours: 35 } }, rs, cal), p3 = plan.pjs.find(p => p.pj === "PJ3");
    expect(plan.cap.people).toBe(3);
    expect(p3.hAt).toBe(200); expect(p3.hEst).toBe(true);
    expect(diffRows(rs, planToRows(plan, schedule(plan, cal), rs, null, cal))).toEqual([]);
  });
});
