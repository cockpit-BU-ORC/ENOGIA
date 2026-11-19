import { legacyRows } from "./legacyMachines";

test("v413 : machines du parc SAV absentes du planning = passeports « avant l'ordo »", () => {
  const data = [{ pj: "PJ903-1" }, { pj: "PJ903-2" }, { pj: "PJ910" }];
  const parc = { PJ214: { nom: "Ancien site", gamme: "20LTV2", sn: ["2021-004-020"], mes: "2022-10-20" }, PJ903: { nom: "Dans l'ordo" }, PJ100: { sn: "A, B" }, X: { nom: "pas un PJ" }, PJ5: null };
  const L = legacyRows(data, parc);
  expect(L.map(r => r.pj)).toEqual(["PJ100", "PJ214"]);
  expect(L[1]).toMatchObject({ legacy: true, etat: "SHIPPED", gamme: "20LTV2", nomProjet: "Ancien site", sn: ["2021-004-020"], mes: "2022-10-20" });
  expect(L[0].sn).toEqual(["A", "B"]);
  expect(legacyRows(null, null)).toEqual([]);
});
