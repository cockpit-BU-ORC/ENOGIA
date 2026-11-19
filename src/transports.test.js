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

test("v416 : véhicule, écarts au souhaité, ligne d'infos, résumé", () => {
  const { vehicleOf, gapOf, metaOf, summaryOf, transportList } = require("./transports");
  expect(vehicleOf({ status: "colis ramasse", mode: "boat" })).toMatchObject({ mode: "boat", pos: 80, moving: true });
  expect(vehicleOf({ status: "en consultation" })).toMatchObject({ mode: "truck", pos: 30, parked: true });
  expect(gapOf({ status: "en consultation", enlSouhaitee: "2026-09-10" }, "2026-11-19")).toEqual({ t: "dépassé de 70 j", tone: "late" });
  expect(gapOf({ status: "colis livre", livSouhaitee: "2026-11-17", livReelle: "2026-11-16" })).toEqual({ t: "-1 j sur le souhaité", tone: "early" });
  expect(gapOf({ status: "colis ramasse", livSouhaitee: "2026-10-20", livPrevue: "2026-10-21" })).toEqual({ t: "+1 j sur le souhaité", tone: "late" });
  expect(metaOf({ transporteur: "HEPPNER", colis: 1, cond: "Palette", poids: 4850, incoterm: "DAP" })).toEqual(["HEPPNER", "1 colis · palette", "4,9 t", "DAP"]);
  const L = transportList({ items: { a: { status: "colis ramasse", statusType: "done" }, b: { status: "en consultation", horsUE: true }, c: { status: "en attente infos demandeur" } } });
  expect(summaryOf(L)).toEqual({ route: 1, prog: 0, consult: 1, infos: 1, horsUE: 1 });
});
