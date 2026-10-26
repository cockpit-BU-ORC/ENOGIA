import { isEstimatePj, cleanEntry, summarizeChanges } from "./changeDiff";

test("les PJXXX sont des estimations", () => {
  ["PJXXX", "PJXXX-1", "PJ XXX", "pjxxx2", "PJ_XXX"].forEach(p => expect(isEstimatePj(p)).toBe(true));
  ["PJ460", "PJ405-Y34", "PJX1", "", null].forEach(p => expect(isEstimatePj(p)).toBe(false));
});
test("summarizeChanges ignore les PJXXX (modifiés, ajoutés, retirés)", () => {
  const a = [{ pj: "PJ1", depart: "2026-10-01" }, { pj: "PJXXX", depart: "2026-10-01" }, { pj: "PJXXX-2", depart: "2026-11-01" }];
  const b = [{ pj: "PJ1", depart: "2026-10-05" }, { pj: "PJXXX", depart: "2026-12-01" }, { pj: "PJXXX-3", depart: "2026-12-01" }];
  const s = summarizeChanges(a, b);
  expect(s.pjs.map(p => p.pj)).toEqual(["PJ1"]);
  expect(s.stats).toMatchObject({ nPj: 1, late: 1, maxLate: 4, nNew: 0, nRemoved: 0 });
});
test("cleanEntry nettoie une entrée déjà enregistrée et recalcule les totaux", () => {
  const e = { at: "x", stats: { nPj: 3, late: 2, early: 0, maxLate: 90, maxEarly: 0, nNew: 1, nRemoved: 1, nDates: 3, nHours: 0 },
    pjs: [{ pj: "PJ1", d: { depart: {} }, departDelta: 4 }, { pj: "PJXXX", d: { depart: {} }, departDelta: 90 }, { pj: "PJXXX-9", isNew: true }],
    removed: [{ pj: "PJXXX-1" }] };
  const c = cleanEntry(e);
  expect(c.pjs.map(p => p.pj)).toEqual(["PJ1"]);
  expect(c.removed).toEqual([]);
  expect(c.stats).toMatchObject({ nPj: 1, late: 1, maxLate: 4, nNew: 0, nRemoved: 0, nDates: 1 });
  expect(cleanEntry({ ...e, pjs: [e.pjs[0]], removed: [] })).toEqual({ ...e, pjs: [e.pjs[0]], removed: [] });
});
