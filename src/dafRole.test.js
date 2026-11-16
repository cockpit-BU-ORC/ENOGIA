import { rolesOf, levelOf, DEFAULT_ROLES } from "./access";

describe("rôle DAF (v370)", () => {
  test("le DAF est un rôle intégré, avec « Modifier » sur Finance par défaut", () => {
    expect(DEFAULT_ROLES.map(r => r[0])).toContain("daf");
    expect(levelOf(null, "daf", "finance")).toBe("w");
    expect(levelOf(null, "daf", "pilotage")).toBe("n");
  });
  test("une liste de rôles déjà enregistrée reçoit les rôles intégrés manquants, à la fin", () => {
    const doc = { roles: [{ id: "direction", name: "Direction" }, { id: "x1", name: "Rôle maison" }] };
    const ids = rolesOf(doc).map(r => r[0]);
    expect(ids.slice(0, 2)).toEqual(["direction", "x1"]);
    expect(ids).toContain("daf");
    expect(ids.filter(x => x === "direction").length).toBe(1);
  });
  test("un niveau enregistré pour le DAF l'emporte sur le défaut", () => {
    expect(levelOf({ levels: { finance: { daf: "r" } } }, "daf", "finance")).toBe("r");
  });
});
