import { penaltyCalc, ficheBase, pjBase, siblingsOf, pjTotals } from "./penalties";

const base = { prixFiche: 1000000, contratTFin: "2026-03-02", penalite: { ref: "mad", ratePct: 0.5, graceWeeks: 1, capType: "pct", cap: 5 } };

test("prix de la fiche : prixFiche, sinon montant global", () => {
  expect(ficheBase({ prixFiche: 500 })).toBe(500);
  expect(ficheBase({ montantContrat: 800 })).toBe(800);
  expect(ficheBase({ prixFiche: 500, montantContrat: 800 })).toBe(500);
  expect(ficheBase({})).toBeNull();
});

test("pas de pénalité dans la franchise", () => {
  const c = penaltyCalc(base, "2026-03-09", "2026-01-01");        // 7 j de retard = 1 semaine de grâce
  expect(c.status).toBe("ok"); expect(c.lateDays).toBe(7); expect(c.chargeableWeeks).toBe(0); expect(c.amount).toBe(0);
});

test("franchise déduite, semaine entamée comptée", () => {
  const c = penaltyCalc(base, "2026-03-12", "2026-01-01");        // 10 j → 3 j au-delà → 1 semaine entamée
  expect(c.chargeableWeeks).toBe(1); expect(c.weekly).toBe(5000); expect(c.amount).toBe(5000);
  expect(c.startDate).toBe("2026-03-09");
});

test("plafond en % et en €", () => {
  const c = penaltyCalc(base, "2027-03-02", "2026-01-01");        // un an de retard
  expect(c.capped).toBe(true); expect(c.capEur).toBe(50000); expect(c.amount).toBe(50000);
  const e = penaltyCalc({ ...base, penalite: { ...base.penalite, capType: "eur", cap: 12000 } }, "2027-03-02", "2026-01-01");
  expect(e.amount).toBe(12000);
});

test("jalon livraison : prévision saisie, sinon aujourd'hui si l'échéance est dépassée", () => {
  const m = { prixFiche: 200000, contratLivr: "2026-05-04", penalite: { ref: "livr", ratePct: 1, graceWeeks: 0 } };
  const a = penaltyCalc(m, "2026-04-01", "2026-05-18");
  expect(a.provisional).toBe(true); expect(a.lateDays).toBe(14); expect(a.chargeableWeeks).toBe(2); expect(a.amount).toBe(4000);
  const b = penaltyCalc({ ...m, livrPrevue: "2026-05-11" }, "2026-04-01", "2026-05-18");
  expect(b.provisional).toBe(false); expect(b.chargeableWeeks).toBe(1);
  expect(penaltyCalc(m, "2026-04-01", "2026-04-20").lateDays).toBe(0);            // échéance pas encore atteinte
});

test("conditions incomplètes", () => {
  expect(penaltyCalc({}, "2026-03-02", "2026-01-01").status).toBe("off");
  const c = penaltyCalc({ penalite: { ref: "livr", ratePct: 1 } }, null, "2026-01-01");
  expect(c.status).toBe("incomplete"); expect(c.missing.length).toBe(2);
});

test("plusieurs fiches d'un même PJ", () => {
  expect(pjBase("PJ461-2")).toBe("PJ461"); expect(pjBase("PJ461")).toBe("PJ461");
  const rows = [{ pj: "PJ461-1", depart: "2026-03-12" }, { pj: "PJ461-2", depart: "2026-03-02" }, { pj: "PJ4610", depart: "2026-03-02" }, { pj: "PJ461-3", etat: "SLOT_LIBRE" }];
  expect(siblingsOf(rows, "PJ461-1").map(r => r.pj)).toEqual(["PJ461-1", "PJ461-2"]);
  const metas = { "PJ461-1": base, "PJ461-2": { ...base, prixFiche: 2000000 } };
  const t = pjTotals(rows, "PJ461-2", pj => metas[pj] || {}, "2026-01-01");
  expect(t.count).toBe(2); expect(t.price).toBe(3000000); expect(t.amount).toBe(5000); expect(t.lateFiches).toBe(1);
});

test("pénalités non activées par le client : aucun montant, et activées par défaut pour les anciennes fiches", () => {
  const off = penaltyCalc({ ...base, penalite: { ...base.penalite, actif: false } }, "2026-06-01", "2026-01-01");
  expect(off.status).toBe("inactive"); expect(off.amount).toBe(0);
  expect(penaltyCalc({ ...base, penalite: { ...base.penalite, actif: true } }, "2026-06-01", "2026-01-01").status).toBe("ok");
  expect(penaltyCalc(base, "2026-06-01", "2026-01-01").status).toBe("ok");
  const rows = [{ pj: "PJ461-1", depart: "2026-06-01" }];
  expect(pjTotals(rows, "PJ461-1", () => ({ ...base, penalite: { ...base.penalite, actif: false } }), "2026-01-01").amount).toBe(0);
});
