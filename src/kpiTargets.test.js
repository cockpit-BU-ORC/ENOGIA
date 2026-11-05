import { judge, targetsOf, kpiMetrics } from "./kpiTargets";

// v279 : objectifs chiffrés des KPI — valeurs par défaut, réglage, jugement, mesures
test("objectifs : défaut, réglage, jugement dans le bon sens", () => {
  const t = targetsOf({ kpiTargets: { tenus: 75 } });
  expect(t).toMatchObject({ tenus: 75, charge: 100, derive: 7 });
  expect(judge("tenus", 70, t)).toMatchObject({ ok: false, gap: -5 });
  expect(judge("charge", 92, t)).toMatchObject({ ok: true, gap: 8 });
  expect(judge("derive", 12, t)).toMatchObject({ ok: false, gap: -5 });
  expect(judge("tenus", null, t).ok).toBeNull();
});
test("mesures : tenus à date, dérive moyenne, mois écoulé", () => {
  const drift = [{ hasInitial: true, depart: { delta: 0 } }, { hasInitial: true, depart: { delta: 10 } }, { hasInitial: true, depart: { delta: -4 } }, { hasInitial: false, depart: { delta: 50 } }];
  const rows = [{ pj: "PJ1", etat: "SHIPPED", depart: "2026-10-10" }, { pj: "PJ2", etat: "MONTAGE", depart: "2026-10-20" }];
  const m = kpiMetrics(rows, drift, new Date(2026, 10, 5));
  expect(m).toMatchObject({ tenus: 67, derive: 2, livraisons: 1, prevMonth: "2026-10", realisation: 50 });
});
