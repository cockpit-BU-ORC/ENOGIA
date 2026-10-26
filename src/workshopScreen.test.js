import { isInProduction, closedDaysOf } from "./components/WorkshopScreen";
describe("écran atelier (v146.17)", () => {
  test("seules les étapes de production comptent comme « à fabriquer »", () => {
    ["MONTAGE", "ELEC", "TESTS", "PACKAGING"].forEach(e => expect(isInProduction({ etat: e })).toBe(true));
    ["SHIPPED", "NOT_ORDERED", "SLOT_LIBRE", "A_DEFINIR", "FNR"].forEach(e => expect(isInProduction({ etat: e })).toBe(false));
  });
  test("les fermetures deviennent des jours exclus", () => {
    expect(closedDaysOf([{ start: "2026-12-24", end: "2026-12-26" }])).toEqual(["2026-12-24", "2026-12-25", "2026-12-26"]);
    expect(closedDaysOf(null)).toEqual([]);
  });
});
