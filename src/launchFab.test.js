import { setLaunch, togglePlug, plugCount, signLaunch, launchState, SIGN_ROLES, offRef, refOf, componentsOf, DEFAULT_COMPONENTS, piecesArrived, achatOfComp, phaseOfEtat, launchHtml, NR, elecListsOf } from "./launchFab";

test("v404 : setLaunch écrit un chemin, efface une valeur vide, horodate", () => {
  let L = setLaunch({}, "elec.neutre", "TN-S", "A", "2026-11-18T10:00:00Z");
  expect(L.elec.neutre).toBe("TN-S"); expect(L.by).toBe("A");
  L = setLaunch(L, "elec.neutre", "", "A"); expect(L.elec.neutre).toBeUndefined();
});
test("v404 : bouchages de l'injecteur sur 8 trous", () => {
  let L = togglePlug({}, 0, "A"); L = togglePlug(L, 4, "A"); expect(plugCount(L)).toBe(2);
  L = togglePlug(L, 0, "A"); expect(plugCount(L)).toBe(1); expect(L.inj.plugs.length).toBe(8);
});
test("v404 : lancée quand les quatre rôles ont signé", () => {
  let L = {}; SIGN_ROLES.slice(0, 3).forEach((r, i) => { L = signLaunch(L, r, "X", true, "2026-11-1" + i + "T08:00:00Z"); });
  expect(launchState(L).launched).toBe(false);
  L = signLaunch(L, SIGN_ROLES[3], "Y", true, "2026-11-15T08:00:00Z");
  expect(launchState(L)).toMatchObject({ launched: true, signed: 4, at: "2026-11-15T08:00:00Z" });
  L = signLaunch(L, SIGN_ROLES[0], "X", false); expect(launchState(L).signed).toBe(3);
});
test("v404 : la référence n'est qu'un avertissement ; pas de référence pour un composant acheté ni pour « Non requis »", () => {
  expect(offRef("W0400", "W0400")).toBe(false); expect(offRef("Inovance MD520", "Inovance")).toBe(false); expect(offRef("W0250", "W0400")).toBe(true);
  expect(offRef(NR, "W0400")).toBe(false); expect(offRef("", "W0400")).toBe(false);
  expect(refOf({ kind: "achat", refs: { G: "x" } }, "G")).toBe(""); expect(refOf({ kind: "choix", refs: { G: "x" } }, "G")).toBe("x");
  expect(componentsOf({})).toBe(DEFAULT_COMPONENTS); expect(elecListsOf({ elecLists: { freq: ["50 Hz"] } }).freq).toEqual(["50 Hz"]);
});
test("v404 : pièces arrivées et composant suivi par Achats", () => {
  const doc = { projets: { f1: { id: "f1", machine: "PJ901" } }, po: { p1: { numero: "PO1", statut: "livre" }, p2: { numero: "PO2", statut: "attente", dateLivraison: "2026-11-01" } },
    lignes: { a: { projetId: "f1", poId: "p1" }, b: { projetId: "f1", poId: "p1" }, c: { projetId: "f1", poId: "p2" } } };
  const r = piecesArrived(doc, "PJ901", "2026-11-18");
  expect(r).toMatchObject({ n: 2, t: 3, pct: 67, ready: false }); expect(r.waiting[0]).toMatchObject({ numero: "PO2", retard: true });
  expect(piecesArrived(doc, "PJ999")).toBeNull();
  expect(achatOfComp({ scope: "Chassis" }, { CHASSIS: { lines: 2, livre: 2, pos: ["PO1"] } }).st).toBe("livré");
  expect(achatOfComp({ scope: "" }, {})).toBeNull();
});
test("v404 : phase du passeport d'après l'état ; fiche imprimable échappée", () => {
  expect(phaseOfEtat("MONTAGE")).toBe("fab"); expect(phaseOfEtat("SHIPPED")).toBe("sav"); expect(phaseOfEtat("??")).toBe("design");
  const h = launchHtml({ pj: "PJ<1>", gamme: "100LTV3", info: { chef: "<b>x</b>" }, L: { txt: { bom: "<script>" } }, comps: [{ id: "c", label: "Drive", v: "MD<5>" }], dims: null, ready: null });
  expect(h).not.toMatch(/<script>|<b>x<\/b>|MD<5>/); expect(h).toContain("PJ&lt;1&gt;");
});

test("v415 : choix rangés par grandeur puis alphabet ; pas de référence turbine par gamme", () => {
  const { sortOpts } = require("./launchFab"), { stdOf } = require("./passport");
  expect(sortOpts(["690 V", "400 V", "1000 V", "415 V", "400 V"])).toEqual(["400 V", "415 V", "690 V", "1000 V"]);
  expect(sortOpts(["TT", "IT", "TN-S"])).toEqual(["IT", "TN-S", "TT"]);
  const doc = { standards: { "100LTV3": { roue: "W0400", injecteur: "I0350", bouchages: "2", cuve: "C1" } } };
  expect(stdOf(doc, "100LTV3")).toEqual({ cuve: "C1" });
});
