import { makeCalendar, initPlanFromRows, schedule, loadModel, levelPlan, shiftPj, pjDates, refreshPlanFromRows, planToRows, diffRows, setCapWeek, newPjPlan, splitBenches, benchOf, allLinks, moveStepOrder, stepKeysOf, addPhaseTask, nodeKey, startAtKeepLinks, startReason } from "./engine";

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
  test("v292 : jours sans production d'un PJ (Calendrier) : même fin, charge répartie sur les jours restants", () => {
    const rh = rows.map(r => ({ ...r, heuresAtelier: 200 })), plan = initPlanFromRows(rh, cal), base = schedule(plan, cal).nodes[nodeKey("PJ1", "production")];
    const off = makeCalendar({ closurePeriods: [], pjOff: { PJ1: ["2026-10-05", "2026-10-06"] } }), n = schedule(plan, off).nodes[nodeKey("PJ1", "production")];
    expect(n.s).toBe(base.s); expect(n.f).toBe(base.f); expect(n.finish).toBe(base.finish); expect(n.off.size).toBe(2);
    const lm0 = loadModel(plan, schedule(plan, cal), cal), lm = loadModel(plan, schedule(plan, off), off), i = [...n.off][0];
    expect(lm.day.get(i) || 0).toBe(0);
    const tot = m => [...m.day.values()].reduce((a, b) => a + b, 0);
    expect(Math.round(tot(lm))).toBe(Math.round(tot(lm0))); // les heures ne se perdent pas
    const other = [...Array(n.f - n.s + 1).keys()].map(k => n.s + k).find(k => !n.off.has(k));
    expect(lm.day.get(other)).toBeGreaterThan(lm0.day.get(other)); // plus d'heures les autres jours
  });
  test("v293 : premier jour de production sans production → le début se décale, la fin reste", () => {
    const rh = rows.map(r => ({ ...r, heuresAtelier: 200 })), plan = initPlanFromRows(rh, cal), base = schedule(plan, cal).nodes[nodeKey("PJ1", "production")];
    const off = makeCalendar({ closurePeriods: [], pjOff: { PJ1: [base.start] } }), n = schedule(plan, off).nodes[nodeKey("PJ1", "production")];
    expect(n.s).toBe(base.s + 1); expect(n.start).toBe(off.dateOf(base.s + 1)); expect(n.finish).toBe(base.finish); expect(n.off).toBeFalsy();
    const tot = m => [...m.day.values()].reduce((a, b) => a + b, 0);
    expect(Math.round(tot(loadModel(plan, schedule(plan, off), off)))).toBe(Math.round(tot(loadModel(plan, schedule(plan, cal), cal))));
  });
});

describe("v258 : début d'une tâche choisi en gardant les liens du PJ", () => {
  const cal = makeCalendar({ closurePeriods: [] });
  test("plus tôt : le lien est gardé avec une avance ; plus tard : date imposée", () => {
    const plan = initPlanFromRows(rows, cal), s = schedule(plan, cal);
    const k = Object.keys(s.nodes).find(x => { const n = s.nodes[x]; return n.pj === "PJ1" && !n.ms && (plan.links || []).some(l => l.id === n.driver && l.from.startsWith("PJ1|")); });
    expect(k).toBeTruthy();
    const n = s.nodes[k], step = n.step, nLinks = plan.links.length;
    const early = cal.addWork(n.start, -2), r = startAtKeepLinks(plan, cal, "PJ1", step, early);
    expect(r.blocked).toBeNull();
    expect(schedule(r.plan, cal).nodes[k].start).toBe(early);
    expect(r.plan.links.length).toBe(nLinks);
    expect(r.plan.links.find(l => l.id === n.driver).lag).toBeLessThan(0);
    const late = cal.addWork(n.start, 3), r2 = startAtKeepLinks(plan, cal, "PJ1", step, late), n2 = schedule(r2.plan, cal).nodes[k];
    expect(n2.start).toBe(late); expect(n2.driver).toBe("snet");
    expect(startReason(r2.plan, n2)).toMatch(/date imposée/);
  });
});

describe("v259 : nivellement sur une période", () => {
  const cal = makeCalendar({ closurePeriods: [] });
  test("hors période, rien ne bouge ; capacité choisie prise en compte", () => {
    const rs = rows.map(r => ({ ...r, heuresAtelier: 100 })), plan = initPlanFromRows(rs, cal);
    expect(levelPlan(plan, cal, { from: "2030-01-01", to: "2030-06-30", cap: 30 }).moved).toBe(0);
    expect(levelPlan(plan, cal, { from: "2026-01-01", to: "2027-12-31", cap: 30 }).moved).toBeGreaterThan(0);
  });
});

test("v312 : départ changé hors planificateur reporté dans le plan, début de production publié", () => {
  const { applyPendingDeparts } = require("./engine");
  const cal = makeCalendar({ closurePeriods: [] });
  const plan = initPlanFromRows(rows, cal), s = schedule(plan, cal), d0 = pjDates(s, "PJ1");
  expect(d0.debutProd).toBeTruthy();
  expect(planToRows(plan, s, rows, null, cal).find(r => r.pj === "PJ1").debutProd).toBe(d0.debutProd);
  const later = cal.addWork(d0.depart, 4), earlier = cal.addWork(d0.depart, -2);
  const a = applyPendingDeparts(plan, cal, { PJ1: { date: later } });
  expect(a.applied).toEqual(["PJ1"]); expect(pjDates(schedule(a.plan, cal), "PJ1").depart).toBe(later);
  const b = applyPendingDeparts(plan, cal, { PJ1: { date: earlier }, PJ999: { date: later } });
  expect(pjDates(schedule(b.plan, cal), "PJ1").depart).toBe(earlier); expect(b.applied).toEqual(["PJ1"]);
});
