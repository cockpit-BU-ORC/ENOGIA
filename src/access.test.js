import { levelOf, myAccess, levelsOf, roleSummary, DEFAULT_LEVELS, ACCESS_PAGES, slugRole, atLeast, setLevel, copyRole } from "./access";

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

test("v308 : sous-pages — suivent la page, catalogue réservé aux admins, page = plus haut de ses sous-pages", () => {
  expect(levelOf(null, "cdp", "planning.gantt")).toBe("r");
  expect(levelOf(null, "resptest", "tests.catalog")).toBe("n");
  expect(levelOf(null, "direction", "tests.catalog")).toBe("a");
  let lv = levelsOf(null);
  lv = setLevel(lv, "turbines", "cdp", "r");
  expect(lv["turbines.prod"].cdp).toBe("r"); expect(lv["turbines.orc"].cdp).toBe("r");
  lv = setLevel(lv, "turbines.prod", "cdp", "n");
  expect(lv.turbines.cdp).toBe("r");
  lv = setLevel(lv, "turbines.orc", "cdp", "w");
  expect(lv.turbines.cdp).toBe("w");
  lv = setLevel(lv, "home", "cdp", "n");
  expect(lv.home.cdp).toBe("r");
  const c = copyRole(lv, "cdp", "sav");
  expect(c["turbines.orc"].sav).toBe("w"); expect(c["turbines.prod"].sav).toBe("n");
  const me = myAccess({ on: true, levels: c }, "sav", false);
  expect(me["turbines.prod"]).toBe("n"); expect(me.turbines).toBe("w");
});
