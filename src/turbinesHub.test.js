import { pjOfAffaire, parseProdJson, importPlan, workDate } from "./components/TurbinesHub";

// v267 : page Turbines — besoins des ORC calculés depuis la production, reprise des données de l'outil de Jérémie
test("« Affaire » → PJ du planning : le numéro le plus long qui commence le champ", () => {
  const pjs = ["PJ461", "PJ461-1", "PJ479-1", "PJ424-100MT"];
  expect(pjOfAffaire("PJ461-1 - CHEM SOLV", pjs)).toBe("PJ461-1");
  expect(pjOfAffaire("pj461 contrat global", pjs)).toBe("PJ461");
  expect(pjOfAffaire("PJ424-100MT", pjs)).toBe("PJ424-100MT");
  expect(pjOfAffaire("SAV411", pjs)).toBeNull();
  expect(pjOfAffaire("", pjs)).toBeNull();
});
test("jours ouvrés : fin prévue après n jours ouvrés", () => {
  expect(workDate(0, new Date(2026, 10, 7))).toBe("2026-11-09"); // samedi → lundi
  expect(workDate(3, new Date(2026, 10, 5))).toBe("2026-11-10"); // jeudi + 3 j ouvrés
});
test("import JSON : enveloppe, listes, doublons ignorés, gamme par défaut", () => {
  const txt = JSON.stringify({ "turbines-planning": JSON.stringify({ turbines: [{ num: "100N9", step: "c1" }, { num: "100N1", step: "ok" }], roues: { r1: { ref: "R-MT11", qte: 3 } }, params: { d: { c1: 2 } } }) });
  const p = parseProdJson(txt);
  expect(p.turbines).toHaveLength(2); expect(p.params.d.c1).toBe(2);
  const plan = importPlan(p, { turbines: { x: { num: "100N1" } } }, "100");
  expect(plan.filter(x => !x.dup).map(x => x.data.num || x.data.ref)).toEqual(["100N9", "R-MT11"]);
  expect(plan.find(x => x.data.num === "100N9").data.gamme).toBe("100");
  expect(() => parseProdJson("{\"a\":1}")).toThrow();
});
