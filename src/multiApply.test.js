import { buildMultiPatch, statutProblems } from "./components/MultiApply";

const metas = { "PJ461-1": { actions: [{ id: "a0", text: "ancienne", done: false }] }, "PJ461-2": {}, "PJ461-3": { mitigations: [{ id: "m", text: "déjà", done: false }] } };
const metaOf = pj => metas[pj];
const pjs = ["PJ461-1", "PJ461-2", "PJ461-3"];

describe("saisie sur plusieurs projets (v146.18)", () => {
  test("une action est ajoutée à chaque PJ, avec le même groupId, sans toucher à l'existant", () => {
    const p = buildMultiPatch("actions", pjs, metaOf, { text: " Relancer le fournisseur ", deadline: "2026-11-01", status: "doing" });
    expect(Object.keys(p)).toEqual(pjs);
    expect(p["PJ461-1"].actions.map(a => a.text)).toEqual(["ancienne", "Relancer le fournisseur"]);
    expect(p["PJ461-2"].actions).toHaveLength(1);
    const ids = pjs.map(k => p[k].actions[p[k].actions.length - 1]);
    expect(new Set(ids.map(a => a.groupId)).size).toBe(1);
    expect(ids[0].groupId).toBeTruthy();
    expect(ids[0].groupPjs).toEqual(pjs);
    expect(ids[0].deadline).toBe("2026-11-01");
    expect(ids[0].status).toBe("doing");
    expect(ids[0].done).toBe(false);
    expect(new Set(ids.map(a => a.id)).size).toBe(3);
  });
  test("un seul PJ : pas de groupe", () => {
    const p = buildMultiPatch("mitigations", ["PJ461-2"], metaOf, { risk: "retard", measure: "relance", deadline: "2026-11-01" });
    expect(p["PJ461-2"].mitigations[0].groupId).toBeUndefined();
  });
  test("statut : le feu et le commentaire sont écrits sur chaque PJ ; effacer retire le feu", () => {
    const p = buildMultiPatch("statut", pjs, metaOf, { axis: "cash", level: "yellow", note: "attente paiement" });
    expect(p["PJ461-2"].feux).toEqual({ cash: "yellow" });
    expect(p["PJ461-2"].notes).toEqual({ cash: "attente paiement" });
    const c = buildMultiPatch("statut", pjs, () => ({ feux: { cash: "red" } }), { axis: "cash", level: null, note: "" });
    expect(c["PJ461-1"].feux).toEqual({});
  });
  test("statut à risque : commentaire obligatoire ; Planning exige un plan de mitigation pour les PJ qui n'en ont pas", () => {
    expect(statutProblems(pjs, metaOf, { axis: "cash", level: "red", note: "" })).toHaveLength(1);
    expect(statutProblems(pjs, metaOf, { axis: "planning", level: "red", note: "ok", risk: "", measure: "" })[0]).toMatch(/PJ461-1, PJ461-2/);
    expect(statutProblems(pjs, metaOf, { axis: "planning", level: "red", note: "ok", risk: "retard", measure: "plan B", deadline: "2026-11-01" })).toEqual([]);
    const p = buildMultiPatch("statut", pjs, metaOf, { axis: "planning", level: "red", note: "ok", risk: "retard", measure: "plan B", deadline: "2026-11-01" });
    expect(p["PJ461-1"].mitigations.map(m => [m.risk, m.measure, m.deadline, m.status])).toEqual([["retard", "plan B", "2026-11-01", "todo"]]);
    expect(p["PJ461-3"].mitigations).toBeUndefined(); // déjà un plan ouvert : on n'en ajoute pas
  });
});
