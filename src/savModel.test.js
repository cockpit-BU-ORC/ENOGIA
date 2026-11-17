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
  expect(r.inter).toMatchObject({ pj: "PJ9", a: "2026-11-20", b: "2026-11-23", st: "À planifier", tk: "TC-26-42" });
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

// v332
import { savStats, parseFourn, fournLabel, addStepNote, delStepNote } from "./savModel";
test("v332 : KPI du SAV (personnes, interventions, tickets, finance)", () => {
  const doc = {
    tickets: { "TC-26-01": { type: "cur", prio: "h", date: "2026-10-01", step: 0 }, "TC-26-02": { type: "dev", prio: "b", date: "2026-09-01", closedAt: "2026-09-11", satisf: 4, step: 4 } },
    inters: { "INT-001": { pj: "PJ1", resp: "Lou", who: ["Sam"], a: "2026-11-02", b: "2026-11-04", st: "Réalisée", reussite: "Succès", type: "Maintenance curative", costs: { pdr: 1000, repas: 200 } },
      "INT-002": { pj: "PJ2", resp: "Lou", a: "2026-11-23", b: "2026-11-24", st: "Planifiée", type: "Mise en service" },
      "INT-003": { pj: "PJ3", st: "À planifier" } },
    parc: { PJ1: { contrat: "Premium", contratStatut: "En cours", forfait: 7200 } },
  };
  const S = savStats(doc, ["Lou", "Sam", "Noa"], new Date(2026, 10, 13, 12));
  const lou = S.people.find(p => p.name === "Lou"), noa = S.people.find(p => p.name === "Noa");
  expect(lou).toMatchObject({ past: 3, next: 2, lead: 1 });
  expect(S.people.find(p => p.name === "Sam")).toMatchObject({ past: 3, support: 1 });
  expect(noa).toMatchObject({ past: 0, next: 0 });
  expect(S.inters).toMatchObject({ count: 1, done: 1, success: 100, toPlan: 1, upcoming: 1 });
  expect(S.tickets).toMatchObject({ open: 1, high: 1, closed: 1, avgDays: 10, satisf: 4 });
  expect(S.finance).toMatchObject({ total: 1200, contracts: 1, forfaits: 7200, perInter: 1200 });
  expect(S.finance.byMonth.find(x => x.m === "2026-11").v).toBe(1200);
});
test("v332 : fournitures et commentaires d'étape", () => {
  expect(parseFourn("ORC + Drycooler, 2x conteneur")).toEqual([{ id: "f1", type: "ORC", qte: 1 }, { id: "f2", type: "Drycooler", qte: 1 }, { id: "f3", type: "Conteneur", qte: 2 }]);
  expect(fournLabel([{ type: "ORC", qte: 2 }, { type: "Drycooler", qte: 1 }])).toBe("2 × ORC · Drycooler");
  let t = addStepNote({ type: "cur", step: 1 }, 1, "  Pièce commandée ", "Lou", "2026-11-13T10:00:00Z");
  t = addStepNote(t, 1, "Reçue", "Sam");
  expect(t.stepNotes[1].map(n => n.t)).toEqual(["Pièce commandée", "Reçue"]);
  expect(delStepNote(delStepNote(t, 1, 0), 1, 0).stepNotes[1]).toBeUndefined();
});

// v377 : règle des créneaux pour les chefs de projet (ressources disponibles réglées par le responsable SAV)
test("v377 : capacité du jour — nombre de techniciens, réglage, période particulière", () => {
  const { capacityOn } = require("./savModel");
  expect(capacityOn(null, 3, "2026-11-20")).toBe(3);
  expect(capacityOn({ n: 2 }, 3, "2026-11-20")).toBe(2);
  expect(capacityOn({ n: 2, periods: [{ from: "2026-12-21", to: "2027-01-01", n: 0 }] }, 3, "2026-12-24")).toBe(0);
});
test("v377 : état des jours — complet, places possibles, libre", () => {
  const { slotDays } = require("./savModel");
  const inters = { a: { a: "2026-11-23", b: "2026-11-24", resp: "Léo", who: ["Sam"], st: "Planifiée" }, b: { a: "2026-11-25", b: "2026-11-25", resp: "", st: "À planifier" }, c: { a: "2026-11-26", b: "2026-11-26", st: "Annulée" } };
  const pend = [{ date: "2026-11-25", days: 1 }];
  const S = slotDays(inters, ["Léo", "Sam", "Max"], pend, ["2026-11-23", "2026-11-25", "2026-11-26"], { n: 2 });
  expect(S.map(x => x.state)).toEqual(["full", "full", "free"]); // 2 techniciens sur 2 ; intervention à planifier + demande = 2 ; annulée ignorée
  const S3 = slotDays(inters, ["Léo", "Sam", "Max"], [], ["2026-11-25"], null);
  expect(S3[0]).toMatchObject({ cap: 3, used: 1, left: 2, state: "some" });
});
