import { buildIcs } from "./ics";
import { anchoredBill, anchorShifts, anchorKey, setCashinLinks, setOrdoPjs } from "./cashinLink";
import { contractLate } from "./penalties";

// v260 : agenda des testeurs, jalons du Cash in liés au planning, retard contractuel de l'aperçu de publication
describe("v260", () => {
  afterEach(() => { setCashinLinks(null); setOrdoPjs([]); });
  test("agenda .ics : journées entières, même identifiant d'un export à l'autre", () => {
    const txt = buildIcs([{ uid: "PJ1-t1", from: "2026-11-09", to: "2026-11-12", title: "Tests PJ1, 180LT", details: "ligne 1\nligne 2" }], "Tests — Léa", new Date("2026-11-03T10:00:00Z"));
    expect(txt).toMatch(/BEGIN:VCALENDAR/);
    expect(txt).toMatch(/DTSTART;VALUE=DATE:20261109/);
    expect(txt).toMatch(/DTEND;VALUE=DATE:20261113/); // fin exclue : lendemain du dernier jour
    expect(txt).toMatch(/UID:PJ1-t1@cockpit-bu-orc/);
    expect(txt).toMatch(/SUMMARY:Tests PJ1\\, 180LT/);
    expect(txt).toMatch(/DESCRIPTION:ligne 1\\nligne 2/);
  });
  test("jalon lié au planning : date suivie + décalage, la plus tardive des machines", () => {
    setOrdoPjs(["PJ5-1", "PJ5-2"]);
    const row = { id: "r1", pj: "PJ5", factPrevue: "2026-12-01" };
    setCashinLinks({ PJ5: ["PJ5-1", "PJ5-2"], [anchorKey("r1")]: { on: "depart", lag: 10 } });
    const plan = { "PJ5-1": { pj: "PJ5-1", depart: "2026-12-04" }, "PJ5-2": { pj: "PJ5-2", depart: "2026-12-11" } };
    expect(anchoredBill(row, plan)).toBe("2026-12-21");
    const sh = anchorShifts(Object.values(plan), { rows: [row, { ...row, id: "r2" }, { id: "r3", pj: "PJ5", factReelle: "2026-11-01" }] });
    expect(sh.map(s => s.row.id)).toEqual(["r1"]); // r2 pas lié, r3 déjà facturé
    expect(sh[0].delta).toBe(20);
  });
  test("retard contractuel : avec et sans conditions de pénalité", () => {
    const meta = { contratTFin: "2026-12-01", prixFiche: 100000, penalite: { ref: "mad", ratePct: 1, graceWeeks: 0, capType: "pct", cap: 10, actif: true } };
    const a = contractLate(meta, "2026-12-15", new Date("2026-11-03"));
    expect(a.lateDays).toBe(14);
    expect(a.amount).toBe(2000);
    const b = contractLate({ contratTFin: "2026-12-01" }, "2026-12-08", new Date("2026-11-03"));
    expect(b.lateDays).toBe(7);
    expect(b.amount).toBeNull();
    expect(contractLate({}, "2026-12-08", new Date())).toBeNull();
  });
});
