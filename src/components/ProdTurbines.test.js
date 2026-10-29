// v226 : Production turbines — dates prévisionnelles, affectation des arbres et garde-fous de changement d'étape.
import { makeModel, moveTurbine, EMPTY_PROD } from "./ProdTurbines";

const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
const base = () => ({ ...EMPTY_PROD,
  turbines: { t1: { id: "t1", num: "T-101", step: "c2", since: d(0), roue: "R1", ordre: 1 }, t2: { id: "t2", num: "T-102", step: "c1", since: d(0), ordre: 2 } },
  arbres: { a1: { id: "a1", num: "A-1", step: "b6", since: d(-3) }, a2: { id: "a2", num: "A-2", step: "b2", since: d(0) } } });

test("les carters terminés prennent les arbres dans l'ordre où ils sont prêts", () => {
  const M = makeModel(base());
  expect(M.sch.t1.arbrePrevu).toBe("A-1");
  expect(M.sch.t2.arbrePrevu).toBe("A-2");
  expect(M.sch.t2.wait).toBeGreaterThan(0);
  expect(M.sch.t2.noRoue).toBe(true);
});

test("sans arbre disponible, pas d'assemblage ; sans roue, pas de banc avec roue", () => {
  const S = base(); S.arbres = {}; const M = makeModel(S);
  expect(moveTurbine(S, M, S.turbines.t1, { step: "a1" }).error).toMatch(/aucun arbre/);
  expect(M.sch.t1.missing).toBe(true);
  const S2 = base(), M2 = makeModel(S2);
  const r = moveTurbine(S2, M2, S2.turbines.t1, { step: "a1" });
  expect(r.turbine.arbreId).toBe("a1");
  expect(moveTurbine(S2, M2, { ...S2.turbines.t2, step: "t3", arbreId: "a1" }, { step: "t4" }).error).toMatch(/roue/);
});
