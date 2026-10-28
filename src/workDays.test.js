import { toggleClosedDay, isClosedDay, workDaysBetween, gapRanges } from "./workDays";

// v213 : jours non travaillés gérés depuis le Calendrier (fermetures de l'atelier, jours sans production d'un PJ)
describe("jours de production (v213)", () => {
  test("fermer puis rouvrir un jour, y compris au milieu d'une période", () => {
    const a = toggleClosedDay([], "2026-11-10");
    expect(isClosedDay(a, "2026-11-10")).toBe(true);
    expect(toggleClosedDay(a, "2026-11-10")).toEqual([]);
    const cut = toggleClosedDay([{ start: "2026-12-21", end: "2026-12-31", label: "Noël" }], "2026-12-24");
    expect(cut).toEqual([{ start: "2026-12-21", end: "2026-12-23", label: "Noël" }, { start: "2026-12-25", end: "2026-12-31", label: "Noël" }]);
  });
  test("jours ouvrés et coupures d'un PJ", () => {
    const closed = [{ start: "2026-11-11", end: "2026-11-11" }];
    expect(workDaysBetween("2026-11-09", "2026-11-13", closed, ["2026-11-12"])).toEqual(["2026-11-09", "2026-11-10", "2026-11-13"]);
    expect(gapRanges("2026-11-09", "2026-11-13", closed, ["2026-11-12"])).toEqual([{ from: "2026-11-11", to: "2026-11-11", kind: "closed" }, { from: "2026-11-12", to: "2026-11-12", kind: "excluded" }]);
  });
});
