import { makeCalendar, initPlanFromRows, schedule, loadModel, levelPlan, shiftPj, pjDates, refreshPlanFromRows, planToRows, diffRows, setCapWeek, newPjPlan, splitBenches, benchOf, allLinks, moveStepOrder, stepKeysOf, addPhaseTask, nodeKey } from "./engine";

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
    // v239 : un PJXX du plan n'est ni publié, ni compté dans les écarts, ni dans la charge
    const rx = [...rows.map(r => ({ ...r, heuresAtelier: 100 })), { pj: "PJXX", etat: "A_DEFINIR", arrivee: "2026-10-05", tests: "2026-11-03", testsFin: "2026-11-05", finProd: "2026-11-10", depart: "2026-11-13", heuresAtelier: 100 }];
    const px = initPlanFromRows(rx, cal), sx = schedule(px, cal), pub = planToRows(px, sx, rx, null, cal);
    expect(pub.some(r => r.pj === "PJXX")).toBe(false);
    expect(diffRows(rows, pub).some(c => c.pj === "PJXX")).toBe(false);
    expect(loadModel(px, sx, cal).phases.some(x => x.pj === "PJXX")).toBe(false);
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
  test("v208 : capacité spéciale d'une semaine", () => {
    const rh = rows.map(r => ({ ...r, heuresAtelier: 200 })), plan = setCapWeek({ ...initPlanFromRows(rh, cal), cap: { people: 4, hours: 35 } }, "2026-10-19", 70), lm = loadModel(plan, schedule(plan, cal), cal);
    const w = lm.weeks.find(x => x.week === "2026-10-19"), n = lm.weeks.find(x => x.week === "2026-10-26");
    expect(w.cap).toBe(70); expect(w.special).toBe(true); expect(n.special).toBe(false);
    expect(setCapWeek(plan, "2026-10-19", null).capWeeks["2026-10-19"]).toBeUndefined();
  });
  test("v211 : nouveau PJ complet, 2 bancs, ordre des tâches", () => {
    let plan = initPlanFromRows(rows, cal);
    plan = newPjPlan(plan, cal, { pj: "pj9", start: "2026-11-02", durs: { production: 10, tests: 2, finProd: 3 }, works: { production: 80, finProd: 20 }, banc: 2, extra: [{ name: "Câblage", phase: "production", dur: 2, work: 16 }] });
    const p = plan.pjs.find(x => x.pj === "PJ9");
    expect(stepKeysOf(p)).toEqual(["arrivee", "production", "x1", "tests", "finProd", "depart"]);
    expect(benchOf(p)).toBe(2); expect(p.hAt).toBe(100);
    const s9 = schedule(plan, cal); expect(s9.cycle).toBeFalsy(); expect(pjDates(s9, "PJ9").depart > "2026-11-02").toBe(true);
    expect(stepKeysOf(moveStepOrder(plan, "PJ9", "x1", "production").pjs.find(x => x.pj === "PJ9"))[1]).toBe("x1");
    const t = addPhaseTask(plan, "PJ1", { name: "Essai froid", phase: "tests", dur: 1, after: "tests" }); expect(t.key).toBe(nodeKey("PJ1", "x1"));
    const two = splitBenches({ ...plan, rules: { banc: true } }, cal); const seqB = allLinks(two).filter(l => l.res === "banc");
    seqB.forEach(l => { const a = two.pjs.find(x => x.pj === l.from.split("|")[0]), b = two.pjs.find(x => x.pj === l.to.split("|")[0]); expect(benchOf(a)).toBe(benchOf(b)); });
  });
  test("v218 : jours sans production d'un PJ (Calendrier) : la production s'allonge, pas de charge ces jours-là", () => {
    const rh = rows.map(r => ({ ...r, heuresAtelier: 200 })), plan = initPlanFromRows(rh, cal), base = schedule(plan, cal).nodes[nodeKey("PJ1", "production")];
    const off = makeCalendar({ closurePeriods: [], pjOff: { PJ1: ["2026-10-05", "2026-10-06"] } }), n = schedule(plan, off).nodes[nodeKey("PJ1", "production")];
    expect(n.f - n.s).toBe(base.f - base.s + 2); expect(n.off.size).toBe(2);
    const lm = loadModel(plan, schedule(plan, off), off), i = [...n.off][0];
    expect(lm.day.get(i) || 0).toBe(0);
  });
});
