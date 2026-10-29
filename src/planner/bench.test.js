// v224 : insertion d'une tâche entre deux tâches (les liens suivent) et bancs d'essai (aucun chevauchement avec la règle).
import * as E from "./engine";

const loc = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const iso = k => { const d = new Date(); d.setDate(d.getDate() + k); return loc(d); };
const rows = Array.from({ length: 6 }, (_, i) => ({ pj: "PJ" + (470 + i), etat: "MONTAGE", gamme: "180MT", arrivee: iso(-20 + i * 3), tests: iso(1 + i * 2), testsFin: iso(4 + i * 2), finProd: iso(10 + i * 3), depart: iso(12 + i * 3), heuresAtelier: 160 }));

test("une tâche insérée reprend les liens de la tâche d'avant", () => {
  const cal = E.makeCalendar({});
  const p = E.newPjPlan({ v: 2, pjs: [], links: [] }, cal, { pj: "PJ900", durs: {}, works: {} });
  const r = E.addPhaseTask(p, "PJ900", { name: "Peinture", phase: "production", dur: 2, after: "production" });
  expect(r.plan.links.some(l => l.from === "PJ900|production" && l.to === r.key)).toBe(true);
  expect(r.plan.links.some(l => l.from === r.key && l.to === "PJ900|tests")).toBe(true);
  expect(r.plan.links.some(l => l.from === "PJ900|production" && l.to === "PJ900|tests")).toBe(false);
});

test("bancs : avec la règle, plus aucun chevauchement sur un même banc", () => {
  const cal = E.makeCalendar({});
  let p = E.initPlanFromRows(rows, cal);
  p = { ...p, pjs: p.pjs.map(x => x.steps.tests ? { ...x, steps: { ...x.steps, tests: { ...x.steps.tests, banc: 1 } } } : x) };
  expect(E.benchConflicts(p, E.schedule(p, cal)).length).toBeGreaterThan(0);
  const p2 = E.benchOrderByStart(E.setRules(p, { banc: true }), cal);
  expect(E.benchConflicts(p2, E.schedule(p2, cal)).length).toBe(0);
  const p3 = E.setBench(p2, cal, "PJ471", 2);
  expect(E.benchConflicts(p3, E.schedule(p3, cal)).length).toBe(0);
});

test("priorité : le plus grand numéro passe en tête, archivage réversible", () => {
  const cal = E.makeCalendar({});
  let p = E.initPlanFromRows(rows, cal);
  p = E.setPrio(p, "PJ474", 9); p = E.setPrio(p, "PJ472", 3);
  expect(p.pjs.slice(0, 2).map(x => x.pj)).toEqual(["PJ474", "PJ472"]);
  expect(p.order.prod[0]).toBe("PJ474");
  const a = E.setArchived(p, "PJ470", true);
  expect(!!a.pjs.find(x => x.pj === "PJ470").archived).toBe(true);
  expect(E.setArchived(a, "PJ470", false).pjs.find(x => x.pj === "PJ470").archived).toBeUndefined();
});
