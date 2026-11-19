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
