import { withMad, planningNeeds, makeTurbine, stockByWeek, takenNames, mondayOf, isoOf, summary } from "./turbines";

const today = new Date(2026, 9, 20); // 20/10/2026


describe("pool de turbines", () => {
  const t1 = makeTurbine({ id: "a", type: "100LT", mad: "2026-10-26", ref: "T-1" });
  const t2 = makeTurbine({ id: "b", type: "100LT", mad: "2026-11-09", ref: "T-2", target: { kind: "PJ", ref: "PJ482-1" } });
  const t3 = makeTurbine({ id: "c", type: "20LT", mad: "2026-11-02" });
  test("besoins depuis le planning : une turbine par besoin non couvert, datée de l'arrivée", () => {
    const rows = [{ pj: "P1", gamme: "180LTV3", arrivee: "2026-11-01", etat: "MONTAGE" }, { pj: "P2", gamme: "20LTV3", arrivee: "2026-12-01", etat: "SHIPPED" }, { pj: "P3", gamme: "10LTV3", arrivee: "2026-12-01" }];
    const need = planningNeeds(rows, [makeTurbine({ id: "z", type: "100LT", target: { kind: "PJ", ref: "P1" } })], r => r.etat === "SHIPPED");
    expect(need).toEqual([{ type: "100LT", mad: "2026-11-01", origin: "P1" }]);
  });
  test("stock virtuel par semaine : libres cumulés, attribuées à part", () => {
    const mons = [new Date(2026, 9, 26), new Date(2026, 10, 2), new Date(2026, 10, 9)];
    const s = stockByWeek([t1, t2, t3], mons);
    expect(s["100LT"].map(x => x.libres)).toEqual([1, 1, 1]);
    expect(s["100LT"].map(x => x.attribuees)).toEqual([0, 0, 1]);
    expect(s["100LT"].map(x => x.arrivent)).toEqual([1, 0, 1]);
    expect(s["20LT"].map(x => x.libres)).toEqual([0, 1, 1]);
  });
  test("une roue cochée n'est prise que par une turbine ; décochée elle est libre", () => {
    const a = { ...t1, wheel: { name: "R1", ok: true } }, b = { ...t2, wheel: { name: "R1", ok: false } };
    expect(takenNames([a, b], "wheel", "b").get("R1").id).toBe("a");
    expect(takenNames([a, b], "wheel", "a").size).toBe(0);
  });
  test("résumé", () => {
    expect(summary([t1, t2, t3], "2026-10-27")["100LT"]).toMatchObject({ libresMaintenant: 1, attribuees: 1, total: 2 });
    expect(isoOf(mondayOf(new Date(2026, 10, 5)))).toBe("2026-11-02");
  });
});

describe("tableau d'attribution (v146.24)", () => {
  const { turbinesNeeded, pjCheck, moveTurbine, placeElement, makeTurbine } = require("./turbines");
  test("gamme → turbines nécessaires", () => {
    expect(turbinesNeeded("100LTV3")).toEqual({ type: "100LT", n: 1 });
    expect(turbinesNeeded("100MT")).toEqual({ type: "100LT", n: 1 });
    expect(turbinesNeeded("180LTV3")).toEqual({ type: "100LT", n: 2 });
    expect(turbinesNeeded("180MT")).toEqual({ type: "100LT", n: 2 });
    expect(turbinesNeeded("20LTV3")).toEqual({ type: "20LT", n: 1 });
    expect(turbinesNeeded("40LTV2R")).toEqual({ type: "20LT", n: 2 });
    expect(turbinesNeeded("10LTV3")).toBeNull();
    expect(turbinesNeeded("CONTENEUR")).toBeNull();
  });
  const row = { gamme: "180LTV3", tests: "2026-11-05", depart: "2026-12-01", etat: "MONTAGE" };
  const t1 = makeTurbine({ id: "a", type: "100LT", mad: "2026-10-20", ref: "T1", target: { kind: "PJ", ref: "PJ1" } });
  test("erreur si roue / injecteur / turbine manquent dans la semaine qui arrive", () => {
    const c = pjCheck(row, [t1], "2026-11-01");           // tests dans 4 j
    expect(c.need.n).toBe(2);
    const errs = c.issues.filter(i => i.level === "error").map(i => i.text);
    expect(errs.some(e => /1 turbine à attribuer/.test(e))).toBe(true);
    expect(errs.some(e => /Roue manquante/.test(e))).toBe(true);
    expect(errs.some(e => /Injecteur/.test(e))).toBe(false);   // départ dans 30 j
  });
  test("pas d'erreur loin des échéances, ni sur un PJ expédié", () => {
    expect(pjCheck(row, [t1], "2026-09-01").issues.filter(i => i.level === "error")).toEqual([]);
    expect(pjCheck({ ...row, etat: "SHIPPED" }, [], "2026-11-01").issues).toEqual([]);
  });
  test("roue posée → plus d'erreur ; un nom ne sert qu'à une turbine", () => {
    const t2 = makeTurbine({ id: "b", type: "100LT", target: { kind: "PJ", ref: "PJ1" } });
    let L = placeElement([t1, t2], "wheel", "Roue A", "a");
    expect(pjCheck(row, [L[0], L[1]], "2026-11-01").issues.filter(i => /Roue/.test(i.text) && i.level === "error").length).toBe(1);
    L = placeElement(L, "wheel", "Roue A", "b");
    expect(L[0].wheel.name).toBe(""); expect(L[1].wheel).toEqual({ name: "Roue A", ok: true });
    expect(placeElement(L, "wheel", "Roue A", null)[1].wheel.name).toBe("");
  });
  test("retour au stock : la roue et l'injecteur sont libérés", () => {
    const t = { ...t1, wheel: { name: "Roue A", ok: true }, injector: { name: "Inj 1", ok: true } };
    const m = moveTurbine([t], "a", null)[0];
    expect(m.target).toBeNull(); expect(m.wheel.name).toBe(""); expect(m.injector.name).toBe("");
    expect(moveTurbine([t], "a", { kind: "SAV", ref: "X" })[0].wheel.name).toBe("Roue A");
  });
});

describe("fichier du responsable turbines (v146.26)", () => {
  const { savName, lateDays, pjCheck } = require("./turbines");
  const ids = new Set(["PJ446-10", "PJ460-1", "PJ461-2", "PJ420", "PJ376-1", "PJ503"]);
  test("SAV, retard sur échéance, besoin SAV", () => {
    expect(savName("PJ411")).toBe("SAV411"); expect(savName("411")).toBe("SAV411"); expect(savName("PJ411-1")).toBe("SAV411-1"); expect(savName("pj 446 - 10")).toBe("SAV446-10"); expect(savName("abc")).toBe("");
    expect(lateDays({ mad: "2026-12-11", need: "2026-12-02" })).toBe(9); expect(lateDays({ mad: "2026-11-01", need: "2026-12-02" })).toBe(0);
    const c = pjCheck({ pj: "SAV411", needOverride: { type: "20LT", n: 2 }, tests: "2026-11-05", depart: "2026-11-05" }, [], "2026-11-01");
    expect(c.issues[0].text).toMatch(/2 turbines à attribuer/);
  });
});

describe("règles d'arrivée, « complet », éléments seuls, stock du fichier (v146.27)", () => {
  const { pjCheck, dueDates, makeTurbine, placeLoose, absorbLoose, looseOf } = require("./turbines");
  const row = { pj: "PJ456", gamme: "100LTV3", arrivee: "2026-10-19", tests: "2026-11-12", depart: "2026-11-18", etat: "MONTAGE" };
  const T = (o = {}) => makeTurbine({ id: "a", type: "100LT", mad: "2026-08-21", ref: "T100-001", target: { kind: "PJ", ref: "PJ456" }, ...o });
  test("échéances : turbine à l'arrivée, roue 1 semaine avant, injecteur le jour de l'arrivée", () => {
    expect(dueDates(row)).toMatchObject({ turbine: "2026-10-19", wheel: "2026-10-12", injector: "2026-10-19", fromArrival: true });
    expect(dueDates({ tests: "2026-11-12", depart: "2026-11-18" })).toMatchObject({ turbine: "2026-11-12", wheel: "2026-11-12", injector: "2026-11-18", fromArrival: false });
  });
  test("roue en erreur quand l'échéance (arrivée − 7 j) est à moins d'une semaine, injecteur à l'arrivée", () => {
    const c = pjCheck(row, [T()], "2026-10-06");        // roue due le 12/10 (dans 6 j), injecteur dû le 19/10 (dans 13 j)
    expect(c.issues.find(i => i.scope === "wheel").level).toBe("error");
    expect(c.issues.find(i => i.scope === "injector").level).toBe("warn");
    expect(c.complete).toBe(false);
  });
  test("complet seulement si turbine + roue + injecteur", () => {
    const full = T({ wheel: { name: "Roue A", ok: true }, injector: { name: "Inj 1", ok: true } });
    expect(pjCheck(row, [full], "2026-09-01").complete).toBe(true);
    expect(pjCheck(row, [T({ wheel: { name: "Roue A", ok: true } })], "2026-08-01").complete).toBe(false);   // pas d'alerte (loin), mais pas complet
    expect(pjCheck(row, [T({ wheel: { name: "Roue A", ok: true } })], "2026-08-01").missing).toEqual({ turbines: 0, wheels: 0, injectors: 1 });
    expect(pjCheck(row, [], "2026-08-01").complete).toBe(false);
  });
  test("MàD après l'arrivée : alerte", () => {
    expect(pjCheck(row, [T({ mad: "2026-10-25" })], "2026-08-01").issues.some(i => /après l'arrivée/.test(i.text))).toBe(true);
  });
  test("injecteur seul sur un PJ sans turbine : compté, pas d'erreur, repris par la turbine qui arrive", () => {
    const loose = [{ kind: "injector", name: "Inj 1", target: { kind: "PJ", ref: "PJ456" } }];
    const c = pjCheck(row, [T({ wheel: { name: "Roue A", ok: true } })], "2026-10-15", 7, loose);
    expect(c.issues.some(i => i.scope === "injector")).toBe(false); expect(c.complete).toBe(true);
    expect(pjCheck(row, [], "2026-08-01", 7, loose).injectors).toBe(1);
    const t = T(); const r = absorbLoose([t], loose, "a");
    expect(r.turbines[0].injector).toEqual({ name: "Inj 1", ok: true }); expect(r.looseEls).toEqual([]);
  });
  test("placeLoose : un nom ne sert qu'une fois", () => {
    const t = T({ wheel: { name: "Roue A", ok: true } });
    const r = placeLoose([t], [], "wheel", "Roue A", { kind: "PJ", ref: "PJ9" });
    expect(r.turbines[0].wheel.name).toBe(""); expect(looseOf(r.looseEls, { kind: "PJ", ref: "PJ9" }).length).toBe(1);
    expect(placeLoose(r.turbines, r.looseEls, "wheel", "Roue A", { kind: "PJ", ref: "PJ10" }).looseEls.map(l => l.target.ref)).toEqual(["PJ10"]);
    expect(placeLoose(r.turbines, r.looseEls, "wheel", "Roue A", null).looseEls).toEqual([]);
  });
});
