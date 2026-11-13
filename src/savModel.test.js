import { nextTicketId, nextInterId, isClosed, planBars, dayLoad, workDaysFrom, mondayOf, acceptDemande, parcOf, savKpis, interCost, flowOf } from "./savModel";

const today = new Date("2026-11-13T10:00:00");

test("numérotation des tickets (par année) et des interventions", () => {
  expect(nextTicketId({ "TC-26-07": {}, "TC-26-41": {}, "TC-25-90": {} }, today)).toBe("TC-26-42");
  expect(nextTicketId({}, today)).toBe("TC-26-01");
  expect(nextInterId({ "INT-083": {}, "INT-005": {} })).toBe("INT-084");
});

test("un ticket est clos à sa dernière étape ou avec une date de clôture", () => {
  expect(isClosed({ type: "qtech", step: flowOf("qtech").length - 1 })).toBe(true);
  expect(isClosed({ type: "cur", step: 2 })).toBe(false);
  expect(isClosed({ type: "cur", step: 2, closedAt: "2026-11-01" })).toBe(true);
});

test("planning des équipes : barres par technicien et vue d'une seule ligne", () => {
  const inters = { "INT-1": { resp: "A", who: ["B"], a: "2026-11-17", b: "2026-11-18", pj: "PJ1" }, "INT-2": { resp: "A", a: "2026-11-20", b: "2026-11-20", st: "Annulée" } };
  const bars = planBars(inters, ["A", "B", "C"]);
  expect(bars.A.map(b => b.id)).toEqual(["INT-1"]);
  expect(bars.B[0].lead).toBe(false);
  expect(bars.C).toEqual([]);
  const days = workDaysFrom("2026-11-16", 5);
  expect(days).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
  expect(dayLoad(inters, ["A", "B", "C"], days).map(x => x.free)).toEqual([3, 1, 1, 3, 3]);
  expect(mondayOf("2026-11-13")).toBe("2026-11-09");
});

test("demande d'un chef de projet acceptée : ticket et intervention créés sur les jours demandés", () => {
  const r = acceptDemande({ id: "d1", pj: "PJ9", obj: "Paramétrage Modbus", date: "2026-11-20", days: 2, by: "Camille" }, { tickets: { "TC-26-41": {} }, inters: { "INT-083": {} } }, today);
  expect(r.tid).toBe("TC-26-42");
  expect(r.iid).toBe("INT-084");
  expect(r.inter).toMatchObject({ pj: "PJ9", a: "2026-11-20", b: "2026-11-23", st: "Planifiée", tk: "TC-26-42" });
  expect(r.ticket).toMatchObject({ orig: "Chef de projet", inters: ["INT-084"], demande: "d1" });
});

test("parc : machines expédiées regroupées par projet et projets ajoutés à la main", () => {
  const rows = [{ pj: "PJ903-1", etat: "SHIPPED", gamme: "20LTV3", depart: "2026-05-02" }, { pj: "PJ903-2", etat: "SHIPPED", gamme: "20LTV3" }, { pj: "PJ950", etat: "TESTS" }];
  const P = parcOf(rows, r => ({ nomProjet: "Biogaz", numSerie: r.pj === "PJ903-1" ? "2026-010-020" : "" }), { PJ214: { nom: "Ancien site", contrat: "Premium" } }, { a: { pj: "PJ903-2", type: "cur", step: 1 } });
  expect(P.map(p => p.pj)).toEqual(["PJ214", "PJ903"]);
  expect(P[1]).toMatchObject({ nom: "Biogaz", sn: ["2026-010-020"], gammes: ["20LTV3"], ouverts: 1 });
  expect(P[0].manuel).toBe(true);
});

test("chiffres : ouverts, coûts, jours-homme, demandes en attente", () => {
  const doc = { tickets: { a: { type: "cur", step: 1, prio: "h", date: "2026-11-01" }, b: { type: "qtech", step: 3, date: "2026-10-01", closedAt: "2026-10-11", satisf: 4 } },
    inters: { x: { resp: "A", who: ["B"], a: "2026-11-17", b: "2026-11-18", st: "Planifiée", costs: { repas: 120, heberg: "200" } }, y: { st: "À planifier" } } };
  const k = savKpis(doc, { items: { d: { st: "attente" }, e: { st: "ok" } } }, today);
  expect(k).toMatchObject({ open: 1, high: 1, avgDays: 10, satisf: 4, toPlan: 1, manDays: 4, monthCost: 320, demandes: 1 });
  expect(interCost(doc.inters.x)).toBe(320);
});
