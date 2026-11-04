import { besoinOf, lineState, STATUTS, EMPTY_ACHATS } from "./components/Achats";

// v262 : page Achats / Appro — date de besoin et état d'une ligne (exports gardés par le kit du responsable achats)
const row = { pj: "PJ1", arrivee: "2026-12-10" }, params = { marge: 10 };
test("date de besoin : arrivée du PJ moins la marge, sauf date saisie", () => {
  expect(besoinOf({}, row, params)).toBe("2026-11-30");
  expect(besoinOf({ dateBesoin: "2026-11-20" }, row, params)).toBe("2026-11-20");
  expect(besoinOf({}, {}, params)).toBe("");
});
test("état d'une ligne : reçue, non conforme, en retard, à commander vite, dans les temps", () => {
  const t = "2026-11-04";
  expect(lineState({ statut: "recu" }, row, params, t).k).toBe("done");
  expect(lineState({ statut: "nc" }, row, params, t).k).toBe("nc");
  const late = lineState({ statut: "confirme", datePrevue: "2026-12-05" }, row, params, t);
  expect(late.k).toBe("late"); expect(late.retardJ).toBe(5);
  expect(lineState({ statut: "besoin" }, row, params, t).k).toBe("todo");          // besoin dans 26 j
  expect(lineState({ statut: "besoin" }, row, params, "2026-11-15").k).toBe("soon"); // besoin dans 15 j
  expect(lineState({ statut: "besoin" }, row, params, "2026-12-02").k).toBe("late"); // besoin dépassé
  expect(lineState({ statut: "commande", datePrevue: "2026-11-25" }, row, params, t).k).toBe("ok");
  expect(STATUTS.length).toBe(7); expect(EMPTY_ACHATS.params.marge).toBe(10);
});
