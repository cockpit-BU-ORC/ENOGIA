import { storySynthese, storyBilan, storySemaines, storyDerives, storyCharge, storyAvancement, explore, topRisk } from "./kpiStory";

// v281 : refonte KPI — réponse, preuve, action calculées depuis le planning
const today = new Date(2026, 10, 4);
const rows = [
  { pj: "PJ1", etat: "MONTAGE", gamme: "180LTV3", arrivee: "2026-10-01", tests: "2026-11-16", testsFin: "2026-11-20", finProd: "2026-11-25", depart: "2026-11-20" },
  { pj: "PJ2", etat: "SHIPPED", gamme: "100LTV3", arrivee: "2026-09-01", depart: "2026-10-10", testsFin: "2026-10-01" },
  { pj: "PJ3", etat: "TESTS", gamme: "180LTV3", arrivee: "2026-09-15", tests: "2026-11-16", testsFin: "2026-11-18", depart: "2026-12-10" },
  { pj: "PJXX", etat: "MONTAGE", depart: "2026-11-10" },
];
const drift = [{ pj: "PJ1", hasInitial: true, depart: { delta: 120 } }, { pj: "PJ3", hasInitial: true, depart: { delta: 0 } }];
const mkW = (h, i) => { const a = new Date(2026, 10, 2 + 7 * i); return { a, hours: h, cap: 175 }; };
test("synthèse : réponse, PJ à risque, actions", () => {
  const s = storySynthese({ rows, driftRows: drift, targets: { tenus: 80 }, metrics: { tenus: 50 }, weeks: [100, 200, 150].map(mkW), today });
  expect(s.answer).toMatch(/^Non : seulement 50 % des PJ tiennent leur date de départ, et l'atelier dépasse sa capacité en S46\.$/);
  expect(topRisk(rows, drift).map(r => r.pj)).toEqual(["PJ1"]);
  expect(s.actions.map(a => a.b)).toEqual(["Arbitrer la surcharge S46", "Statuer sur le PJ à plus de 3 mois de retard", "Confirmer les 1 départ des 30 prochains jours"]);
});
test("bilan, semaines, charge, avancement, explorer", () => {
  const b = storyBilan({ rows, notes: {}, today });
  expect(b.months.map(m => [m.m, m.kind, m.d])).toEqual([["Septembre", "fait", 0], ["Octobre", "fait", 1], ["Novembre", "en cours", 1], ["Décembre", "prévu", 1]]);
  expect(b.answer).toMatch(/^Octobre tenu à 100 %/);
  const w = storySemaines({ rows, weeks: [100, 100, 200].map(mkW) });
  expect(w.cols[2].banc).toEqual(["PJ1", "PJ3"]); expect(w.cols[2].decide[0]).toBe("surcharge 114 %");
  expect(w.cols[2].dep).toEqual(["PJ1"]); expect(w.cols[2].decide).toContain("PJ1 : fin de prod. après le départ");
  const c = storyCharge({ weeks: [100, 200, 60].map(mkW) });
  expect(c.answer).toMatch(/^Pas en l'état : 1 semaine sur 3 dépasse la capacité, avec un pic à 114 % en S46\./);
  const a = storyAvancement({ rows, progress: { PJ1: 10, PJ3: 90 }, today });
  expect(a.items[0]).toMatchObject({ pj: "PJ1", real: 10 }); expect(a.items[0].exp).toBe(68);
  expect(explore({ rows, measure: "count", dim: "gamme", scope: "all" })).toEqual([{ k: "180LTV3", raw: "180LTV3", v: 2 }, { k: "100LTV3", raw: "100LTV3", v: 1 }]);
  const d = storyDerives({ stepSummary: [{ l: "Arrivée", pct: 80 }, { l: "Tests", pct: 40, late: 3, worst: ["PJ1 +12j"] }], comparable: [], kpiStep: "depart", labels: {} });
  expect(d.answer).toMatch(/entre « arrivée » et « tests »/);
});
