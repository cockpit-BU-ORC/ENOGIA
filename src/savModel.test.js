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

// v379 : capacité = personnes de l'équipe sélectionnées et disponibles ce jour-là (jours off, congés)
test("v379 : disponibilités — hors ressources, jour off chaque semaine, congés", () => {
  const { isAvailable, unavailableWhy, setAbsence } = require("./savModel");
  let D = { Léo: { exclu: true }, Sam: { weekOff: [3] } }; // v422 : weekOff n'est plus lu
  expect(isAvailable(D, "Léo", "2026-11-23")).toBe(false);
  expect(unavailableWhy(D, "Sam", "2026-11-25")).toBe(""); // v422 : plus de jour off chaque semaine
  expect(isAvailable(D, "Sam", "2026-11-26")).toBe(true);
  D = setAbsence(D, "Max", "2026-11-27", "2026-12-01", "conge");
  expect(Object.keys(D.Max.days)).toEqual(["2026-11-27", "2026-11-30", "2026-12-01"]); // week-end sauté
  expect(unavailableWhy(D, "Max", "2026-11-30")).toBe("Congés");
  expect(setAbsence(D, "Max", "2026-11-30", "2026-11-30", "").Max.days["2026-11-30"]).toBeUndefined();
});
test("v379 : état des jours d'après les personnes disponibles", () => {
  const { slotDays } = require("./savModel");
  const techs = ["Léo", "Sam", "Max"], dispo = { Max: { exclu: true } };
  const inters = { a: { a: "2026-11-23", b: "2026-11-24", resp: "Léo", who: ["Sam"], st: "Planifiée" }, b: { a: "2026-11-25", b: "2026-11-25", resp: "", st: "À planifier" }, c: { a: "2026-11-26", b: "2026-11-26", st: "Annulée" } };
  const S = slotDays(inters, techs, [{ date: "2026-11-26", days: 1 }], ["2026-11-23", "2026-11-25", "2026-11-26", "2026-11-27"], dispo);
  expect(S.map(x => x.state)).toEqual(["full", "full", "full", "free"]); // v422 : une intervention sans personne et une demande prennent une équipe (2)
  expect(S[1]).toMatchObject({ cap: 2, used: 2, left: 0 });
  const off = slotDays({}, techs, [], ["2026-11-27"], { Léo: { days: { "2026-11-27": "conge" } }, Sam: { days: { "2026-11-27": "off" } }, Max: { exclu: true } });
  expect(off[0].state).toBe("full"); // personne de disponible
});

test("v422 : 4 techniciens en 2 équipes — 2 libres = réservable, 1 libre = sous réserve, 0 = complet ; non dispo ; fermeture T0 + N semaines", () => {
  const { slotDays, unavailableWhy, resaOf, lockUntil } = require("./savModel");
  const techs = ["A", "B", "C", "D"], d = "2026-11-25";
  const I = who => ({ x: { a: d, b: d, resp: who[0], who: who.slice(1), st: "Planifiée" } });
  expect(slotDays({}, techs, [], [d], {})[0].state).toBe("free");
  expect(slotDays(I(["A", "B"]), techs, [], [d], {})[0].state).toBe("free"); // une équipe libre
  expect(slotDays(I(["A", "B", "C"]), techs, [], [d], {})[0].state).toBe("some"); // 3 sur 4 en intervention
  expect(slotDays(I(["A", "B", "C", "D"]), techs, [], [d], {})[0].state).toBe("full"); // les 2 équipes prises
  expect(slotDays(I(["A", "B"]), techs, [], [d], { C: { days: { [d]: "nondispo" } } })[0].state).toBe("some"); // non dispo = pas d'intervention
  expect(unavailableWhy({ C: { days: { [d]: "nondispo" } } }, "C", d)).toBe("Non dispo (pas d'intervention)");
  expect(resaOf({ resa: { lockWeeks: "4" } })).toEqual({ lockWeeks: 4, team: 2 });
  expect(lockUntil({ lockWeeks: 4 }, "2026-11-19")).toBe("2026-12-17");
  expect(lockUntil({ lockWeeks: 0 }, "2026-11-19")).toBe("");
});

test("v424 : demande de 5 jours dont les 2 derniers sont complets = refusée (jours complets nommés)", () => {
  const { demandeCheck } = require("./savModel");
  const techs = ["A", "B", "C", "D"], full = { x: { a: "2026-11-26", b: "2026-11-27", resp: "A", who: ["B", "C", "D"], st: "Planifiée" } };
  const c = demandeCheck({ inters: full, techs, demandes: {}, dispo: {}, resa: { lockWeeks: 0, team: 2 }, date: "2026-11-23", n: 5, today: "2026-11-19" });
  expect(c.days).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
  expect(c.full).toEqual(["2026-11-26", "2026-11-27"]);
  expect(demandeCheck({ inters: {}, techs, demandes: {}, dispo: {}, resa: { lockWeeks: 4, team: 2 }, date: "2026-11-23", n: 2, today: "2026-11-19" }).lock).toEqual(["2026-11-23", "2026-11-24"]);
});

test("v425 : une même personne sur 2 interventions qui se chevauchent = conflit", () => {
  const { techClashes, clashSet } = require("./savModel");
  const inters = { A: { a: "2026-12-07", b: "2026-12-11", resp: "Arthur", who: [], st: "Planifiée", pj: "PJ456" }, B: { a: "2026-12-10", b: "2026-12-15", resp: "Léa", who: ["Arthur"], st: "À planifier", pj: "PJ460" }, C: { a: "2026-12-10", b: "2026-12-12", resp: "Arthur", st: "Annulée" } };
  expect(techClashes(inters, "B", inters.B)).toEqual([{ name: "Arthur", id: "A", a: "2026-12-07", b: "2026-12-11", pj: "PJ456" }]);
  expect(techClashes(inters, "A", { ...inters.A, b: "2026-12-09" })).toEqual([]);
  expect([...clashSet(inters)].sort()).toEqual(["A|Arthur", "B|Arthur"]);
});
