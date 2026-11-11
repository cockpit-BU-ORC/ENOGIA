import { levelOf, myAccess, levelsOf, roleSummary, DEFAULT_LEVELS, ACCESS_PAGES, slugRole, atLeast } from "./access";

test("v305 : niveaux par défaut, minimum de l'accueil, rôle vide = Autres", () => {
  expect(levelOf(null, "turbines", "turbines")).toBe("a");
  expect(levelOf(null, "", "planning")).toBe("r");
  expect(levelOf(null, "", "finance")).toBe("n");
  const doc = { on: true, levels: { home: { autre: "n" }, finance: { cdp: "r" } } };
  expect(levelOf(doc, "autre", "home")).toBe("r"); // l'accueil ne se masque pas
  expect(levelOf(doc, "cdp", "finance")).toBe("r");
  expect(levelOf(doc, "inconnu", "tests")).toBe("n");
  expect(Object.keys(DEFAULT_LEVELS).sort()).toEqual(ACCESS_PAGES.map(p => p.id).sort());
});

test("v305 : droits de la personne connectée — super admin, pas encore activé, activé", () => {
  expect(Object.values(myAccess(null, "", true)).every(l => l === "a")).toBe(true);
  expect(myAccess({ on: false }, "cdp", false)).toBeNull();
  const me = myAccess({ on: true, levels: { achats: { achats: "w" } } }, "achats", false);
  expect(me.achats).toBe("w"); expect(me.finance).toBe("n"); expect(atLeast(me.planning, "r")).toBe(true);
});

test("v305 : matrice complète, résumé, identifiant de rôle", () => {
  const lv = levelsOf({ roles: [{ id: "x", name: "X" }], levels: { tests: { x: "a" } } });
  expect(lv.tests.x).toBe("a"); expect(lv.home.x).toBe("r");
  expect(roleSummary(lv, "x")).toBe("2 pages, admin sur 1");
  expect(slugRole("Qualité", ["qualite"])).toBe("qualite2");
});
