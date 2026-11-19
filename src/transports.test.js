import { transportList, stepOf } from "./transports";

test("v413 : demandes de transport — en cours (attente du demandeur en tête), livrées, filtre des PJ d'un chef de projet", () => {
  const doc = { items: {
    a: { name: "A", pj: "PJ446", status: "en consultation", statusType: "custom", enlevement: "2026-11-25" },
    b: { name: "B", pj: "PJ468-4", status: "en attente infos demandeur", statusType: "custom", enlevement: "2026-12-10" },
    c: { name: "C", pj: "", status: "demandes", statusType: "open", enlevement: "2026-11-21" },
    d: { name: "D", pj: "PJ468", status: "colis livre", statusType: "closed", closed: "2026-11-02" },
  } };
  const L = transportList(doc);
  expect(L.open.map(x => x.id)).toEqual(["b", "c", "a"]);
  expect(L.done.map(x => x.id)).toEqual(["d"]); expect(L.waiting).toBe(1);
  const M = transportList(doc, new Set(["PJ468-1"]));
  expect(M.open.map(x => x.id)).toEqual(["b"]); expect(M.done.map(x => x.id)).toEqual(["d"]);
  expect(stepOf("Colis livre").label).toBe("Colis livré"); expect(stepOf("autre").i).toBe(-1);
  expect(transportList(null).open).toEqual([]);
});

test("v414 : frise de suivi et texte de date", () => {
  const { trackOf, whenOf } = require("./transports");
  expect(trackOf({ status: "en attente infos demandeur" })).toEqual({ k: 1, bad: true });
  expect(trackOf({ status: "colis ramasse" }).k).toBe(3); expect(trackOf({ status: "cloture doc frn" }).k).toBe(4);
  expect(whenOf({ status: "en consultation", enlSouhaitee: "2026-10-14" }, "2026-11-19")).toBe("souhaité 2026-10-14 · passé");
  expect(whenOf({ status: "depart programme", enlPrevue: "2026-11-24", enlSouhaitee: "2026-11-20" }, "2026-11-19")).toBe("enlèvement prévu 2026-11-24");
  expect(whenOf({ status: "colis livre", livReelle: "2026-11-12" })).toBe("livré le 2026-11-12");
});
