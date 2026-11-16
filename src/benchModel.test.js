import { benchOf, nextByBench, packRows, byMonth } from "./benchModel";

describe("modèle des bancs (v366)", () => {
  test("banc : planificateur, puis planning publié, puis banc 1", () => {
    expect(benchOf({ PJ1: 2 }, { pj: "PJ1", banc: 1 })).toBe(2);
    expect(benchOf({}, { pj: "PJ1", banc: "2" })).toBe(2);
    expect(benchOf(null, { pj: "PJ1" })).toBe(1);
  });
  test("4 prochaines par banc, dans l'ordre de passage", () => {
    const L = [["A", 1, "2026-12-08"], ["B", 1, "2026-11-24"], ["C", 2, "2026-12-01"], ["D", 1, "2026-12-20"], ["E", 1, "2027-01-05"], ["F", 1, "2027-01-20"]].map(([pj, bench, a]) => ({ pj, bench, a }));
    const n = nextByBench(L, 4);
    expect(n[1].map(x => x.pj)).toEqual(["B", "A", "D", "E"]);
    expect(n[2].map(x => x.pj)).toEqual(["C"]);
  });
  test("créneaux qui se chevauchent : sous-lignes", () => {
    const it = [{ a: "2026-11-02", b: "2026-11-06" }, { a: "2026-11-05", b: "2026-11-10" }, { a: "2026-11-09", b: "2026-11-12" }];
    expect(packRows(it)).toBe(2);
    expect(it.map(x => x.row)).toEqual([0, 1, 0]);
    expect(packRows([])).toBe(1);
  });
  test("historique par mois, du plus récent", () => {
    const g = byMonth([{ d: "2026-10-28" }, { d: "2026-11-13" }, { d: "2026-11-06" }], x => x.d);
    expect(g.map(x => x.month)).toEqual(["2026-11", "2026-10"]);
    expect(g[0].label).toBe("Novembre 2026");
    expect(g[0].items.map(x => x.d)).toEqual(["2026-11-13", "2026-11-06"]);
  });
});
