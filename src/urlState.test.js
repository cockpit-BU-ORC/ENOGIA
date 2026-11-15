import { readUrlState, buildSearch } from "./urlState";

test("v342 : lecture de l'adresse (page inconnue ignorée) et écriture en gardant les autres paramètres", () => {
  expect(readUrlState("?p=tests&s=testers&pj=PJ426")).toEqual({ p: "tests", s: "testers", pj: "PJ426" });
  expect(readUrlState("?p=inconnue").p).toBe("");
  expect(buildSearch("ecran=1&p=home", { p: "gantt", s: "", pj: "PJ12" })).toBe("ecran=1&p=gantt&pj=PJ12");
  expect(buildSearch("p=gantt&pj=PJ12", { p: "gantt", s: "", pj: "" })).toBe("p=gantt");
});
