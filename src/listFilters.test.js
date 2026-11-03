import { filterRows, filterOptions } from "./listFilters";
import { MONTHS } from "./pjMeta";

// v261 : filtres de la Liste sortis d'App.js — même comportement
const rows = [
  { pj: "PJ1", etat: "TESTS", gamme: "180LTV3", depart: "2026-11-20", drift: 5 },
  { pj: "PJ2", etat: "SHIPPED", gamme: "100LTV3", depart: "2026-06-10", drift: 0 },
  { pj: "PJ3", etat: "SLOT_LIBRE", gamme: "", depart: "2026-12-01", drift: null },
];
const all = { selEtats: new Set(["TESTS", "SHIPPED", "SLOT_LIBRE"]), selGammes: new Set(["180LTV3", "100LTV3"]), selPJs: null, selProjets: null, selPays: null, selChefs: null, onlyDrift: false, onlyChanged: false, selMoisArrivee: new Set(MONTHS), selMoisTests: new Set(MONTHS), selMoisFinProd: new Set(MONTHS), selMoisDepart: new Set(MONTHS) };
const marks = { marks: new Set(["PJ2"]) };
test("filtres de la Liste : état, gamme (pas pour un slot libre), dérive, modifiés, mois de départ", () => {
  expect(filterRows(rows, all, marks).map(r => r.pj)).toEqual(["PJ1", "PJ2", "PJ3"]);
  expect(filterRows(rows, { ...all, selEtats: new Set(["TESTS"]) }, marks).map(r => r.pj)).toEqual(["PJ1"]);
  expect(filterRows(rows, { ...all, selGammes: new Set(["180LTV3"]) }, marks).map(r => r.pj)).toEqual(["PJ1", "PJ3"]);
  expect(filterRows(rows, { ...all, onlyDrift: true }, marks).map(r => r.pj)).toEqual(["PJ1"]);
  expect(filterRows(rows, { ...all, onlyChanged: true }, marks).map(r => r.pj)).toEqual(["PJ2"]);
  expect(filterRows(rows, { ...all, selMoisDepart: new Set([MONTHS[10]]) }, marks).map(r => r.pj)).toEqual(["PJ1"]);
  expect(filterOptions(rows).allPJs).toEqual(["PJ1", "PJ2", "PJ3"]);
});
