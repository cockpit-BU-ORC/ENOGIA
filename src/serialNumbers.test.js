import { gammeCode, parseSn, planSerials, serialsDue } from "./serialNumbers";

test("v315 : code gamme sur 3 chiffres", () => {
  expect(gammeCode("180LTV3")).toBe("180");
  expect(gammeCode("20LTV3")).toBe("020");
  expect(gammeCode("100MT")).toBe("100");
  expect(gammeCode("40LTV2R")).toBe("040");
  expect(gammeCode("CONTENEUR")).toBeNull();
  expect(parseSn("2026-016-180")).toEqual({ year: 2026, seq: 16, code: "180" });
  expect(parseSn("ORC-1233-20-362")).toBeNull();
});

test("v315 : S/N prévus dans l'ordre des arrivées, après le plus grand S/N fixé de l'année", () => {
  const rows = [
    { pj: "PJ1", gamme: "180LTV3", arrivee: "2026-03-01" },
    { pj: "PJ2", gamme: "100LTV3", arrivee: "2026-11-20" },
    { pj: "PJ3", gamme: "20LTV3", arrivee: "2026-11-05" },
    { pj: "PJ4", gamme: "180MT", arrivee: "2027-01-10" },
    { pj: "PJXX", gamme: "180LTV3", arrivee: "2026-12-01" },
    { pj: "PJ5", gamme: "180LTV3", arrivee: null },
  ];
  const meta = { PJ1: { numSerie: "2026-033-180" } };
  const p = planSerials(rows, r => meta[r.pj] || {}, "2026-11-12");
  expect(p.get("PJ1")).toMatchObject({ fixed: true, sn: "2026-033-180" });
  expect(p.get("PJ3")).toMatchObject({ planned: true, sn: "2026-034-020", due: true });
  expect(p.get("PJ2")).toMatchObject({ sn: "2026-035-100", due: false });
  expect(p.get("PJ4").sn).toBe("2027-001-180");
  expect(p.has("PJXX")).toBe(false);
  expect(p.has("PJ5")).toBe(false);
  expect(serialsDue(p).map(x => x.pj)).toEqual(["PJ3"]);
});
