import { defaultCfg, buildNeeds, moveNeedOrder, assignOps, unassignOps, installOps, allocOps, unallocOps, stockTiles, maxBouches, refsOf, autoFill } from "./turbineNeeds";
import { setResolved, isSeenFor, isResolvedFor } from "./mentions";

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
  expect(needs.find(n => n.key === "pj:PJ2")).toMatchObject({ cfgSet: false, want: 1, roueMiss: 1, injMiss: 1 });
  expect(free.map(x => x.num).sort()).toEqual(["100N1", "20N1"]);
  expect(refsOf(doc, "roues", "100")).toEqual(["R1"]);
});
test("turbine prête ou sans roue : sortie du stock ; retirer : retour au stock", () => {
  const { needs, free } = buildNeeds(doc, rows, metaOf, today);
  const x = free.find(t => t.num === "100N1"), p1 = needs.find(n => n.key === "pj:PJ1");
  const t = assignOps(doc, x, p1, today).writes[0].data;
  expect(t).toMatchObject({ besoin: "pj:PJ1", livree: "2026-11-04", sortieOrc: "2026-11-04" });
  const back = unassignOps(doc, { id: "a", num: "100N1", raw: t }).writes[0].data;
  expect(back.livree).toBeUndefined(); expect(back.besoin).toBeUndefined(); expect(back.affaire).toBe("");
  const d = { ...doc, turbines: { e: { num: "100N9", step: "att" }, f: { num: "100N8", step: "s1" } } };
  const b2 = buildNeeds(d, rows, metaOf, today);
  expect(b2.free.find(y => y.num === "100N8").sansRoue).toBe(true);
  expect(assignOps(d, b2.free.find(y => y.num === "100N9"), p1, today).writes[0].data.livree).toBeUndefined(); // en fabrication : réservée
});
test("roue et injecteur glissés : stock décompté, allocation, retour au stock", () => {
  const d = { ...doc, injecteurs: { i1: { ref: "MT11", qte: 3, ouvertures: 12, variantes: [{ bouches: 3, qte: 1 }] } } };
  const { needs } = buildNeeds(d, rows, metaOf, today), p1 = needs.find(n => n.key === "pj:PJ1");
  const st = stockTiles(d, "100");
  expect(st.injs.map(x => [x.ref, x.bouches, x.qte])).toEqual([["MT11", null, 3], ["MT11", 3, 1]]);
  const r = allocOps(d, p1, 1, st.roues[0], today, () => "A1");
  expect(r.writes[0]).toEqual({ c: "roues", id: "r1", data: { ref: "R1", qte: 1 } });
  expect(r.writes[1]).toMatchObject({ c: "allocs", id: "A1", data: { besoin: "pj:PJ1", slot: 1, kind: "roue", ref: "R1" } });
  const iv = allocOps(d, p1, 1, st.injs[1], today, () => "A2");
  expect(iv.writes[0].data.variantes).toEqual([]);
  const d2 = { ...d, allocs: { A1: r.writes[1].data, A2: iv.writes[1].data } };
  const s1 = buildNeeds(d2, rows, metaOf, today).needs.find(n => n.key === "pj:PJ1").slots[1];
  expect(s1.roue.ref).toBe("R1"); expect(s1.inj.bouches).toBe(3);
  expect(allocOps(d2, buildNeeds(d2, rows, metaOf, today).needs.find(n => n.key === "pj:PJ1"), 1, st.roues[0]).error).toMatch(/déjà sa roue/);
  const back = unallocOps(d2, { id: "A2", ...iv.writes[1].data });
  expect(back.writes[0].data.variantes).toEqual([{ bouches: 3, qte: 2 }]); expect(back.dels).toEqual([{ c: "allocs", id: "A2" }]);
  expect(allocOps(d, p1, 0, { ...st.roues[0], qte: 0 }).error).toMatch(/Plus de roue/);
  expect(maxBouches(12)).toBe(11);
});
test("commentaire : « Vu » puis « Traité » (traité vaut vu), visibles de tous", () => {
  const list = [{ text: "x", mentions: ["g@enogia.com"] }];
  const a = setResolved(list, 0, "g@enogia.com", true, "2026-11-04T10:00:00Z", "seen");
  expect(isSeenFor(a[0], "g@enogia.com")).toBe(true); expect(isResolvedFor(a[0], "g@enogia.com")).toBe(false);
  const b = setResolved(list, 0, "g@enogia.com", true, "2026-11-04T11:00:00Z");
  expect(isSeenFor(b[0], "g@enogia.com")).toBe(true); expect(isResolvedFor(b[0], "g@enogia.com")).toBe(true);
});
test("remplir automatiquement : turbine, roue et injecteur prévus, stock décompté une seule fois par élément", () => {
  const d = { ...doc, turbines: { a: { num: "100N1", step: "ok", roue: "R1" }, e: { num: "100N9", step: "att" } }, besoins: {}, injecteurs: { i1: { ref: "MT11", qte: 3 } } };
  const { needs, free } = buildNeeds(d, rows, metaOf, today);
  let k = 0; const r = autoFill(d, needs, free, today, () => "X" + (k++));
  const p1 = needs.find(n => n.key === "pj:PJ1"); expect(p1.want).toBe(2);
  expect(r.turbs).toEqual(["a", "e"]);
  // la turbine prête a déjà la roue R1 : une seule roue sortie (emplacement 2) ; deux injecteurs MT11
  expect(r.writes.find(w => w.c === "roues").data.qte).toBe(1);
  expect(r.writes.find(w => w.c === "injecteurs").data.qte).toBe(1);
  expect(r.writes.filter(w => w.c === "allocs")).toHaveLength(3);
});
test("roue imposée : turbine ou roue d'une autre référence refusée", () => {
  const d = { ...doc, turbines: { a: { num: "100N1", step: "ok", roue: "R9" }, b: { num: "100N2", step: "s1" } }, roues: { r1: { ref: "R1", qte: 2 }, r9: { ref: "R9", qte: 1 } } };
  const { needs, free } = buildNeeds(d, rows, metaOf, today), p1 = needs.find(n => n.key === "pj:PJ1");
  expect(assignOps(d, free.find(x => x.num === "100N1"), p1, today).error).toMatch(/attend la roue R1/);
  expect(assignOps(d, free.find(x => x.num === "100N2"), p1, today).error).toBeUndefined(); // testée sans roue : acceptée
  expect(allocOps(d, p1, 0, stockTiles(d, "100").roues.find(r => r.ref === "R9")).error).toMatch(/refusée/);
  expect(autoFill(d, needs, free, today).turbs).toEqual(["b"]);
});

test("v299 : disponibilité (attribuée, estimée), écart au besoin, installée", () => {
  const { needs } = buildNeeds(doc, rows, metaOf, today);
  const sav = needs.find(n => n.key === "sav:s1").slots[0];
  expect(sav).toMatchObject({ dispo: "2026-11-04", estimee: false, ecart: 11 });          // prête : aujourd'hui ; besoin le 15/11
  const p1 = needs.find(n => n.key === "pj:PJ1").slots[1];
  expect(p1).toMatchObject({ estimee: true, estNum: "100N1", dispo: "2026-11-04", ecart: 27 }); // emplacement vide : prochaine turbine libre
  expect(needs.find(n => n.key === "pj:PJ2").slots[0]).toMatchObject({ estimee: true, estNum: "20N1" });
  // installée : plus de date, retrait refusé tant que l'installation n'est pas annulée
  const x = needs.find(n => n.key === "sav:s1").slots[0].t, op = installOps(doc, x, true, today);
  expect(op.writes[0].data.installee).toBe("2026-11-04");
  const d2 = { ...doc, turbines: { ...doc.turbines, d: { ...doc.turbines.d, installee: "2026-11-04" } } };
  const s2 = buildNeeds(d2, rows, metaOf, today).needs.find(n => n.key === "sav:s1");
  expect(s2.slots[0]).toMatchObject({ installee: "2026-11-04", dispo: null }); expect(s2.installees).toBe(1);
  expect(unassignOps(d2, s2.slots[0].t).error).toMatch(/installée/);
  expect(installOps(d2, s2.slots[0].t, false, today).writes[0].data.installee).toBeUndefined();
});

test("v301 : allouer une turbine qui a déjà sa roue ne change pas le stock de roues", () => {
  const { needs, free } = buildNeeds(doc, rows, metaOf, today);
  const x = free.find(t => t.num === "100N1"), p1 = needs.find(n => n.key === "pj:PJ1"); // 100N1 : prête, roue R1 montée
  const op = assignOps(doc, x, p1, today);
  expect(op.writes.some(w => w.c === "roues")).toBe(false);
  expect(op.msg).toMatch(/roue R1 déjà montée/);
});

test("v302 : ordre de priorité choisi à la main, dans le mois, et déplacement d'un cran", () => {
  const d2 = { ...doc, besoins: { ...doc.besoins, s2: { label: "SAV2", cfg: "100", date: "2026-11-28" } }, ordre: { besoins: { keys: ["sav:s2", "sav:s1", "pj:PJ2"] } } };
  const { needs } = buildNeeds(d2, rows, metaOf, today);
  expect(needs.map(n => n.key)).toEqual(["sav:s2", "sav:s1", "pj:PJ2", "pj:PJ1"]); // novembre (ordre choisi) puis décembre
  expect(moveNeedOrder(needs, "sav:s1", -1)).toEqual(["sav:s1", "sav:s2", "pj:PJ2", "pj:PJ1"]);
  expect(moveNeedOrder(needs, "pj:PJ2", 1)).toBeNull(); // PJ1 est en décembre : on ne change pas de mois
  expect(moveNeedOrder(needs, "pj:PJ2", -1, n => n.kind === "pj")).toBeNull(); // pas d'autre PJ avant dans le mois
});
