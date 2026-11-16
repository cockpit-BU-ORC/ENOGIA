import { placeNeedKey } from "./turbineNeeds";

const needs = ["a", "b", "c", "d", "e"].map(key => ({ key }));
describe("ordre des besoins : déplacer à la place d'un autre (v373)", () => {
  test("en montant, le besoin passe avant la cible", () => {
    expect(placeNeedKey(needs, "d", "b")).toEqual(["a", "d", "b", "c", "e"]);
    expect(placeNeedKey(needs, "e", "a")).toEqual(["e", "a", "b", "c", "d"]);
  });
  test("en descendant, il passe après la cible", () => {
    expect(placeNeedKey(needs, "a", "c")).toEqual(["b", "c", "a", "d", "e"]);
    expect(placeNeedKey(needs, "b", "e")).toEqual(["a", "c", "d", "e", "b"]);
  });
  test("cible identique ou inconnue : rien", () => {
    expect(placeNeedKey(needs, "b", "b")).toBe(null);
    expect(placeNeedKey(needs, "b", "z")).toBe(null);
  });
});
