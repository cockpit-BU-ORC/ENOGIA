import { DEFAULT_TEST_CATALOG, catalogOf, planOf, activeSections, selectedIds, toggleTest, assignTester, unassignTester, setAssignDates, effRange, findConflicts, assignmentsOf, dropTester, dropTestFromPlans, packLanes, dayDiffIso, addDaysIso, mondayOf, testerOfEmail, setNote } from "./testPlan";

const rows = [{ pj: "PJ1", tests: "2026-11-02", testsFin: "2026-11-06" }, { pj: "PJ2", tests: "2026-11-05", testsFin: "2026-11-10" }, { pj: "PJ3", tests: "2026-12-01", testsFin: "2026-12-03" }];

test("catalogue par défaut = checklist FAT (6 internes, 2 client, 3 NOBO)", () => {
  const c = catalogOf({});
  expect([c.interne.length, c.client.length, c.nobo.length]).toEqual([6, 2, 3]);
  expect(catalogOf({ catalog: { client: [] } }).client).toEqual([]);
  expect(catalogOf({ catalog: { client: [] } }).interne).toBe(DEFAULT_TEST_CATALOG.interne);
});

test("parties actives selon la présence", () => {
  expect(activeSections(null)).toEqual(["interne"]);
  expect(activeSections("client")).toEqual(["interne", "client"]);
  expect(activeSections("nobo")).toEqual(["interne", "nobo"]);
  expect(activeSections("both")).toEqual(["interne", "client", "nobo"]);
});

test("sélection des tests : tout par défaut, décocher puis recocher garde l'ordre du catalogue", () => {
  const cat = catalogOf({});
  let p = planOf({}, "PJ1");
  expect(selectedIds(p, cat, "client")).toEqual(["c1", "c2"]);
  p = toggleTest(p, cat, "client", "c1");
  expect(selectedIds(p, cat, "client")).toEqual(["c2"]);
  p = toggleTest(p, cat, "client", "c1");
  expect(selectedIds(p, cat, "client")).toEqual(["c1", "c2"]);
});

test("affectation : dates par défaut = période de tests, dates propres possibles, pas de doublon", () => {
  let p = assignTester(planOf({}, "PJ1"), "t1");
  p = assignTester(p, "t1");
  expect(p.assign).toHaveLength(1);
  expect(effRange(p.assign[0], rows[0])).toEqual({ from: "2026-11-02", to: "2026-11-06" });
  p = setAssignDates(p, "t1", "2026-11-03", "2026-11-04");
  expect(effRange(p.assign[0], rows[0])).toEqual({ from: "2026-11-03", to: "2026-11-04" });
  expect(unassignTester(p, "t1").assign).toEqual([]);
});

test("conflits : même testeur sur deux PJ qui se chevauchent", () => {
  const doc = { plans: { PJ1: { assign: [{ tid: "t1" }, { tid: "t2" }] }, PJ2: { assign: [{ tid: "t1" }] }, PJ3: { assign: [{ tid: "t1" }] } } };
  const c = findConflicts(doc, rows);
  expect(c).toHaveLength(1);
  expect([c[0].tid, c[0].a.pj, c[0].b.pj]).toEqual(["t1", "PJ1", "PJ2"]);
  const fixed = { plans: { ...doc.plans, PJ2: { assign: [{ tid: "t1", from: "2026-11-07", to: "2026-11-10" }] } } };
  expect(findConflicts(fixed, rows)).toHaveLength(0);
  expect(assignmentsOf(doc, "t1", rows).map(a => a.pj)).toEqual(["PJ1", "PJ2", "PJ3"]);
});

test("suppression d'un testeur ou d'un test nettoie les plans", () => {
  const doc = { testers: [{ id: "t1", name: "A" }, { id: "t2", name: "B" }], plans: { PJ1: { assign: [{ tid: "t1" }, { tid: "t2" }], sel: { client: ["c1", "c2"] } } } };
  const d1 = dropTester(doc, "t1");
  expect(d1.testers.map(t => t.id)).toEqual(["t2"]);
  expect(d1.plans.PJ1.assign.map(a => a.tid)).toEqual(["t2"]);
  expect(dropTestFromPlans(doc, "client", "c1").plans.PJ1.sel.client).toEqual(["c2"]);
});

test("frise : lignes sans chevauchement, 2e ligne si le testeur est pris deux fois", () => {
  const r = packLanes([{ pj: "A", from: "2026-11-05", to: "2026-11-09" }, { pj: "B", from: "2026-11-02", to: "2026-11-06" }, { pj: "C", from: "2026-11-10", to: "2026-11-12" }]);
  expect(r.map(x => x.pj + x.lane)).toEqual(["B0", "A1", "C0"]);
});

test("dates ISO : écart, ajout de jours, lundi de la semaine", () => {
  expect(dayDiffIso("2026-10-25", "2026-10-27")).toBe(2); // passage à l'heure d'hiver
  expect(addDaysIso("2026-11-30", 1)).toBe("2026-12-01");
  expect(mondayOf("2026-10-23")).toBe("2026-10-19");
  expect(mondayOf("2026-10-25")).toBe("2026-10-19");
  expect(mondayOf("2026-10-19")).toBe("2026-10-19");
});

test("accès à l'onglet : un testeur de la liste est reconnu par son adresse, notes par test", () => {
  const doc = { testers: [{ id: "t1", name: "A", email: "A@enogia.com" }, { id: "t2", name: "B" }] };
  expect(testerOfEmail(doc, "a@enogia.com").id).toBe("t1");
  expect(testerOfEmail(doc, "b@enogia.com")).toBeNull();
  expect(testerOfEmail(doc, "")).toBeNull();
  const p = setNote(planOf({}, "PJ1"), "i1", "ok");
  expect(p.notes).toEqual({ i1: "ok" });
  expect(setNote(p, "i1", "").notes).toEqual({});
});

describe("tests réalisés (v186)", () => {
  const { toggleDone, doneIds, progressOf, planOf, catalogOf } = require("./testPlan");
  test("cocher puis décocher un test fait", () => {
    const p0 = planOf({ plans: {} }, "PJ1");
    const p1 = toggleDone(p0, "interne", "i1");
    expect(doneIds(p1, "interne")).toEqual(["i1"]);
    expect(doneIds(toggleDone(p1, "interne", "i1"), "interne")).toEqual([]);
  });
  test("l'avancement ne compte que les tests retenus des parties actives", () => {
    const cat = catalogOf({});
    let p = planOf({ plans: {} }, "PJ1");
    p = toggleDone(p, "interne", "i1"); p = toggleDone(p, "client", "c1");
    expect(progressOf(p, cat, ["interne"])).toMatchObject({ done: 1, total: cat.interne.length });
    expect(progressOf(p, cat, ["interne", "client"])).toMatchObject({ done: 2, total: cat.interne.length + cat.client.length });
  });
});

describe("statuts des tests et validation forcée (v187)", () => {
  const { setStatus, statusOf, statusByOf, doneIds, progressOf, planOf, catalogOf, setForced, isForced } = require("./testPlan");
  test("en cours, réussi, échec : seuls réussi et échec comptent comme faits", () => {
    const cat = catalogOf({}), [a, b, c] = cat.interne.map(x => x.id);
    let p = planOf({ plans: {} }, "PJ1");
    p = setStatus(p, "interne", a, "ok", "Marc", "2026-10-27T10:00:00Z"); p = setStatus(p, "interne", b, "ko", "Marc"); p = setStatus(p, "interne", c, "wip", "Marc");
    expect(statusOf(p, "interne", a)).toBe("ok");
    expect(statusByOf(p, "interne", a)).toEqual({ by: "Marc", at: "2026-10-27T10:00:00Z" });
    expect(doneIds(p, "interne").sort()).toEqual([a, b].sort());
    expect(progressOf(p, cat, ["interne"])).toEqual({ done: 2, total: cat.interne.length, ok: 1, ko: 1, wip: 1 });
  });
  test("validation forcée", () => {
    const p = setForced(planOf({ plans: {} }, "PJ1"), true, "Gabriel");
    expect(isForced(p)).toBe(true);
    expect(isForced(setForced(p, false))).toBe(false);
  });
});

describe("affectations notifiées (v188)", () => {
  const { assignTester, assignmentsSince, planOf } = require("./testPlan");
  const { gcalUrl } = require("./gcal");
  test("une affectation datée apparaît après la dernière visite, pas avant", () => {
    const p = assignTester(planOf({}, "PJ1"), "t1", "Gabriel", "2026-10-27T10:00:00Z");
    const doc = { plans: { PJ1: p, PJ2: { assign: [{ tid: "t1" }] } } };
    expect(assignmentsSince(doc, "t1", "2026-10-26T00:00:00Z").map(x => x.pj)).toEqual(["PJ1"]);
    expect(assignmentsSince(doc, "t1", "2026-10-28T00:00:00Z")).toEqual([]);
  });
  test("lien Google Agenda sur la journée entière, fin exclue", () => {
    const u = new URL(gcalUrl({ title: "Tests PJ1", from: "2026-11-02", to: "2026-11-06", guests: ["a@x.fr", "b@x.fr"] }));
    expect(u.searchParams.get("dates")).toBe("20261102/20261107");
    expect(u.searchParams.get("add")).toBe("a@x.fr,b@x.fr");
  });
});
