import { composantsOf, setDefaultComposants, getDefaultComposants, DEFAULT_COMPOSANTS } from "./pjProgress";

afterEach(() => setDefaultComposants([]));
test("liste générale des composants : modifiable, repli sur la liste standard, listes propres inchangées", () => {
  expect(composantsOf({}).map(c => c.label)).toEqual(DEFAULT_COMPOSANTS);
  setDefaultComposants(["Pompe", " Vanne ", ""]);
  expect(composantsOf({}).map(c => c.label)).toEqual(["Pompe", "Vanne"]);
  expect(composantsOf({ composants: [{ id: "x", label: "Skid" }] }).map(c => c.label)).toEqual(["Skid"]);
  setDefaultComposants([]);
  expect(getDefaultComposants()).toEqual(DEFAULT_COMPOSANTS);
});
