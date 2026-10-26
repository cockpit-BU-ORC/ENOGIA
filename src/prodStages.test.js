import { autoPct, buildProgress, normalizeEtat, stageFromPct } from "./prodStages";
test("avancement imposé par l'état (milieu de l'étape)", () => {
  expect(autoPct("MONTAGE")).toBe(20);
  expect(autoPct("ELEC")).toBe(60);
  expect(autoPct("TESTS")).toBe(85);
  expect(autoPct("PACKAGING")).toBe(93);
  expect(autoPct("SHIPPED")).toBe(100);
  expect(autoPct("NOT ORDERED")).toBeNull();
});
test("ancien état PROD", () => {
  expect(stageFromPct(10)).toBe("MONTAGE"); expect(stageFromPct(40)).toBe("ELEC"); expect(stageFromPct(85)).toBe("TESTS"); expect(stageFromPct(92)).toBe("PACKAGING");
  expect(normalizeEtat("PROD", 55)).toBe("ELEC"); expect(normalizeEtat("PROD")).toBe("MONTAGE"); expect(normalizeEtat("SHIPPED", 3)).toBe("SHIPPED");
});
test("carte d'avancement effective", () => {
  const p = buildProgress({ PJ1: 33, PJ2: 20, PJ3: 5 }, [{ pj: "PJ1", etat: "ELEC" }, { pj: "PJ2", etat: "En fabrication" }, { pj: "PJ3", etat: "SHIPPED" }]);
  expect(p).toEqual({ PJ1: 60, PJ2: 20, PJ3: 100 });
});
