import { defaultCfg, buildNeeds, assignOps, unassignOps, demandesOf, refsOf } from "./turbineNeeds";

// v270 : besoins PJ + SAV, turbines glissées sur un besoin, sortie du stock de la production
const today = new Date(2026, 10, 4);
const rows = [
  { pj: "PJ1", gamme: "180LTV3", etat: "MONTAGE", arrivee: "2026-12-01" },
  { pj: "PJ2", gamme: "20LTV3", etat: "MONTAGE", arrivee: "2026-11-20" },
  { pj: "PJ3", gamme: "180LTV3", etat: "SHIPPED" },
];
const doc = {
  turbines: { a: { num: "100N1", step: "ok", roue: "R1", affaire: "" }, b: { num: "100N2", step: "ok", affaire: "PJ1 - Client" }, c: { num: "20N1", gamme: "20", step: "ok" }, d: { num: "100N3", step: "ok", besoin: "sav:s1" } },
  roues: { r1: { ref: "R1", qte: 2 }, r2: { ref: "R20", qte: 1, gamme: "20" } },
  injecteurs: { i1: { ref: "MT11", qte: 3 } },
  besoins: { s1: { label: "SAV411", cfg: "100", roue: "R1", inj: "MT11", date: "2026-11-15" } },
};
const meta = { PJ1: { turbCfg: "2x100", turbRoue: "R1", turbInj: "MT11" } };
const metaOf = r => meta[r.pj] || {};

test("configuration par défaut d'après la gamme", () => {
  expect(defaultCfg("100LTV3")).toBe("100");
  expect(defaultCfg("180LTV3")).toBe("2x100");
  expect(defaultCfg("20LTV3")).toBe("20");
  expect(defaultCfg("40LTV3")).toBe("2x40");
  expect(defaultCfg("TBD")).toBeNull();
});
test("besoins : PJ en cours + SAV, turbines attribuées par « besoin » ou par « Affaire », disponibles", () => {
  const { needs, free } = buildNeeds(doc, rows, metaOf, today);
  expect(needs.map(n => n.key)).toEqual(["sav:s1", "pj:PJ2", "pj:PJ1"]); // tri par date de besoin
  const p1 = needs.find(n => n.key === "pj:PJ1");
  expect(p1.want).toBe(2); expect(p1.got.map(x => x.num)).toEqual(["100N2"]);
  expect(p1.issues.map(i => i.t)).toContain("1 turbine à attribuer");
  expect(needs.find(n => n.key === "sav:s1").got.map(x => x.num)).toEqual(["100N3"]);
  expect(needs.find(n => n.key === "pj:PJ2").issues.some(i => /déduite de la gamme/.test(i.t))).toBe(true);
  expect(free.map(x => x.num).sort()).toEqual(["100N1", "20N1"]);
  expect(refsOf(doc, "roues", "100")).toEqual(["R1"]);
});
test("attribuer une turbine prête : sortie du stock et injecteur décompté ; retirer : tout revient", () => {
  const { needs, free } = buildNeeds(doc, rows, metaOf, today);
  const x = free.find(t => t.num === "100N1"), p1 = needs.find(n => n.key === "pj:PJ1");
  const ops = assignOps(doc, x, p1, today);
  const t = ops.writes.find(w => w.c === "turbines").data;
  expect(t).toMatchObject({ besoin: "pj:PJ1", livree: "2026-11-04", sortieOrc: "2026-11-04", injPris: "i1" });
  expect(ops.writes.find(w => w.c === "injecteurs").data.qte).toBe(2);
  const doc2 = { ...doc, turbines: { ...doc.turbines, a: t }, injecteurs: { i1: { ref: "MT11", qte: 2 } } };
  const back = unassignOps(doc2, { id: "a", num: "100N1", raw: t });
  const t2 = back.writes.find(w => w.c === "turbines").data;
  expect(t2.livree).toBeUndefined(); expect(t2.besoin).toBeUndefined(); expect(t2.affaire).toBe("");
  expect(back.writes.find(w => w.c === "injecteurs").data.qte).toBe(3);
});
test("turbine en cours : réservée (roue posée si vide, injecteur demandé) ; demandes pour la production", () => {
  const d = { ...doc, turbines: { e: { num: "100N9", step: "att" } } };
  const { needs, free } = buildNeeds(d, rows, metaOf, today);
  const ops = assignOps(d, free[0], needs.find(n => n.key === "pj:PJ1"), today);
  expect(ops.writes).toHaveLength(1);
  expect(ops.writes[0].data).toMatchObject({ besoin: "pj:PJ1", roue: "R1", injDemande: "MT11" });
  expect(ops.writes[0].data.livree).toBeUndefined();
  const dem = demandesOf(needs);
  expect(dem.find(x => x.key === "pj:PJ1")).toMatchObject({ gamme: "100", n: 2, roue: "R1", inj: "MT11", manque: 2, date: "2026-12-01" });
});
