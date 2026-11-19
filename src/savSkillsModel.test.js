import { periodsAround, quarterOf, stateOf, rawScore, current, stepTarget, prefillMgr, freezeScores, mirrorOf, personStats, catsOf, stateOfView, avgSeries } from "./savSkillsModel";

const cat = { id: "c1", name: "Fluidique", kind: "technique", levels: [{ label: "N1", skills: [{ id: "a" }, { id: "b" }] }, { label: "N2", skills: [{ id: "c" }, { id: "d" }] }, { label: "N3", skills: [] }] };
test("v412 : trimestres autour d'aujourd'hui", () => {
  expect(quarterOf(new Date(2026, 10, 19))).toBe("Q4-26");
  expect(periodsAround(new Date(2026, 10, 19))).toEqual(["Q3-26", "Q4-26", "Q1-27", "Q2-27", "Q3-27", "Q4-27"]);
  expect(periodsAround(new Date(2026, 1, 1))[0]).toBe("Q4-25");
});
test("v412 : niveau d'une catégorie d'après les compétences du manager", () => {
  const S = stateOf({ people: { p1: { name: "Tech" } }, assess: { p1: { mgr: { a: 2, b: 2, c: 1 } } } });
  expect(rawScore(S, "p1", cat)).toBe(1.25);
  expect(current(S, "p1", cat, "Q4-26")).toEqual({ v: 1.5, src: "live" });
  const S2 = stateOf({ people: { p1: {} }, snapshots: { x: { personId: "p1", period: "Q4-26", scores: { c1: 3 } } } });
  expect(current(S2, "p1", cat, "Q4-26")).toEqual({ v: 3, src: "import" });
  expect(current(S2, "p1", cat, "Q1-27").src).toBe("none");
});
test("v412 : objectif par pas de 0,5, prérremplissage, trimestre figé, fiche de la personne", () => {
  expect(stepTarget(null, 2, 0.5)).toBe(2.5); expect(stepTarget(null, 0, -0.5)).toBeNull(); expect(stepTarget(5, 5, 0.5)).toBe(5); expect(stepTarget(0, 0, -0.5)).toBeNull();
  expect(prefillMgr({}, cat, 1.5)).toEqual({ a: 2, b: 2, c: 2, d: 0 });
  const S = stateOf({ people: { p1: { name: "Tech", uid: "t@e.com" } }, assess: { p1: { mgr: { a: 2, b: 2 } } }, objectives: { o: { personId: "p1", period: "Q1-27", targets: { c1: 2 } } } }, { "t@e.com": { a: 1 } });
  expect(freezeScores(S, [cat], "Q4-26")).toEqual({ p1: { c1: 1 } });
  const m = mirrorOf(S, S.people[0], ["Q4-26", "Q1-27"]); expect(m.objectives).toEqual({ "Q1-27": { c1: 2 } }); expect(m.mgr).toEqual({ a: 2, b: 2 });
  expect(personStats(S, "p1", [cat])).toEqual({ total: 4, mast: 2, gaps: 1 });
  const V = stateOfView(m, { self: { a: 2 } }, "t@e.com"); expect(V.people[0].id).toBe("me"); expect(current(V, "me", cat, "Q4-26").v).toBe(1);
  expect(avgSeries(S, "p1", [cat], ["Q3-26", "Q4-26", "Q1-27"], "Q4-26")).toEqual([null, 1, null]);
  expect(catsOf({ categories: { c: { name: "X" } } })[0]).toMatchObject({ kind: "technique", levels: [] });
});
