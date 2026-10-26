import { withMad, stampExport, exportRows, exportHead, parseBossRows, planningNeeds, pendingShare, markShared, shareMessage, parseTurbineRows, parseWhen, normType, mergeImport, makeTurbine, stockByWeek, takenNames, mondayOf, isoOf, summary } from "./turbines";

const today = new Date(2026, 9, 20); // 20/10/2026

describe("lecture de l'Excel des turbines (v146.22)", () => {
  test("types et dates variés", () => {
    expect(normType("100 kW")).toBe("100LT"); expect(normType("20LT")).toBe("20LT"); expect(normType("40")).toBeNull();
    expect(parseWhen("05/11/2026", today)).toBe("2026-11-05");
    expect(parseWhen("05/11/26", today)).toBe("2026-11-05");
    expect(parseWhen("2026-11-05", today)).toBe("2026-11-05");
    expect(parseWhen(new Date(2026, 10, 5), today)).toBe("2026-11-05");
    expect(parseWhen(46331, today)).toBe("2026-11-05"); // série Excel
    expect(parseWhen("S46", today)).toBe("2026-11-09"); // lundi de la semaine 46
    expect(parseWhen("2027-S02", today)).toBe("2027-01-11");
    expect(parseWhen("n'importe quoi", today)).toBeNull();
  });
  test("une ligne = une turbine, quantité > 1 duplique, erreurs signalées ligne par ligne", () => {
    const r = parseTurbineRows([["Type", "Date MàD", "Réf.", "Quantité"], ["100LT", "S46", "T-1", 2], ["20 kW", "10/11/2026", "", ""], ["50", "S46"], ["100", "bof"]], today);
    expect(r.items).toEqual([{ type: "100LT", mad: "2026-11-09", ref: "T-1-1", id: "" }, { type: "100LT", mad: "2026-11-09", ref: "T-1-2", id: "" }, { type: "20LT", mad: "2026-11-10", ref: "", id: "" }]);
    expect(r.errors).toHaveLength(2);
  });
  test("sans en-tête : colonnes dans l'ordre type, date", () => {
    expect(parseTurbineRows([["100", "S47"]], today).items).toEqual([{ type: "100LT", mad: "2026-11-16", ref: "", id: "" }]);
  });
});

describe("pool de turbines", () => {
  const t1 = makeTurbine({ id: "a", type: "100LT", mad: "2026-10-26", ref: "T-1" });
  const t2 = makeTurbine({ id: "b", type: "100LT", mad: "2026-11-09", ref: "T-2", target: { kind: "PJ", ref: "PJ482-1" } });
  const t3 = makeTurbine({ id: "c", type: "20LT", mad: "2026-11-02" });
  test("ré-import : met à jour par réf., garde tout le reste (turbines libres absentes comprises)", () => {
    const r = mergeImport([t1, t2, t3], [{ type: "100LT", mad: "2026-11-23", ref: "T-2" }, { type: "100LT", mad: "2026-11-30", ref: "" }]);
    expect(r.turbines.find(t => t.id === "b").mad).toBe("2026-11-23");
    expect(r.turbines.find(t => t.id === "b").target).toEqual(t2.target);   // l'attribution n'est jamais touchée
    expect(r.turbines.find(t => t.id === "a")).toBeDefined();
    expect(r.turbines.find(t => t.id === "c")).toBeDefined();
    expect(r.turbines).toHaveLength(4);
    expect(r.stats).toMatchObject({ added: 1, updated: 1, removed: 0 });
    expect(r.turbines.find(t => t.mad === "2026-11-30").ref).toMatch(/^T100-001$/);   // réf. automatique
    expect(r.absent.map(t => t.id).sort()).toEqual(["a", "c"]);
    const r2 = mergeImport([t1, t2, t3], [{ type: "100LT", mad: "2026-11-23", ref: "T-2" }], { removeFreeAbsent: true });
    expect(r2.turbines.map(t => t.id)).toEqual(["b"]); expect(r2.stats.removed).toBe(2);
  });
  test("fusion à trois : la correction faite ici survit à un fichier inchangé, le fichier gagne s'il a bougé", () => {
    const live = withMad({ ...t1, ref: "T-1", madSrc: "2026-11-02" }, "2026-11-20");   // corrigée en direct (fichier d'origine : 02/11)
    const same = mergeImport([live], [{ type: "100LT", mad: "2026-11-02", ref: "T-1" }]);
    expect(same.turbines[0].mad).toBe("2026-11-20"); expect(same.conflicts).toEqual([]);
    const moved = mergeImport([live], [{ type: "100LT", mad: "2026-12-01", ref: "T-1" }]);
    expect(moved.turbines[0].mad).toBe("2026-12-01"); expect(moved.conflicts).toEqual([{ ref: "T-1", live: "2026-11-20", file: "2026-12-01" }]);
    expect(withMad({ ...t1 }, "2026-11-20").madSrc).toBe(t1.mad);
  });
  test("export au format du responsable → ré-import à l'identique ne change rien", () => {
    const L = stampExport([{ ...t1, ref: "T-1" }, t2]);
    const rows = exportRows(L, "2026-10-20"); expect(rows[0]).toEqual(exportHead("2026-10-20"));
    expect(rows[0].slice(0, 7)).toEqual(["Projet", "Modèle", "N° Série", "Échéance", "Livraison S43", "Status", "Retard (j)"]);
    const parsed = parseBossRows(rows, {}, new Date("2026-10-20"));
    expect(parsed.items).toHaveLength(2);
    const r = mergeImport(L, parsed.items);
    expect(r.stats).toMatchObject({ added: 0, updated: 0 });
    expect(r.turbines.find(t => t.id === "b").target).toEqual(t2.target);
  });
  test("export : statut, retard, ancienne date et modèle", () => {
    const L = [{ ...makeTurbine({ id: "x", type: "100LT", mad: "2026-10-10", ref: "PJ456", model: "100kW MT" }), madSrc: "2026-10-10" }, { ...makeTurbine({ id: "y", type: "100LT", mad: "2026-11-30", ref: "PJ461-4-2", need: "2026-11-16" }), madSrc: "2026-11-27" }, makeTurbine({ id: "z", type: "20LT", mad: "2026-12-01", ref: "PJ470", need: "2026-12-10" })];
    const R = exportRows(L, "2026-10-20");
    expect(R[1].slice(0, 7)).toEqual(["PJ456", "100kW MT", "", "NC", expect.any(Date), "Livré", "NC"]);
    expect(R[2][5]).toBe("Critique"); expect(R[2][6]).toBe(14); expect(R[2][8]).toBe("Oui"); expect(R[2][7]).toBeInstanceOf(Date);
    expect(R[3][1]).toBe("20kW"); expect(R[3][5]).toBe("OK");
  });
  test("besoins depuis le planning : une turbine par besoin non couvert, datée de l'arrivée", () => {
    const rows = [{ pj: "P1", gamme: "180LTV3", arrivee: "2026-11-01", etat: "MONTAGE" }, { pj: "P2", gamme: "20LTV3", arrivee: "2026-12-01", etat: "SHIPPED" }, { pj: "P3", gamme: "10LTV3", arrivee: "2026-12-01" }];
    const need = planningNeeds(rows, [makeTurbine({ id: "z", type: "100LT", target: { kind: "PJ", ref: "P1" } })], r => r.etat === "SHIPPED");
    expect(need).toEqual([{ type: "100LT", mad: "2026-11-01", origin: "P1" }]);
  });
  test("à communiquer au responsable turbines", () => {
    const a = makeTurbine({ id: "x", type: "100LT", ref: "T-1", mad: "2026-11-02" });
    expect(pendingShare([a])).toHaveLength(0);
    const b = { ...a, target: { kind: "PJ", ref: "PJ461-2" }, wheel: { name: "Roue A", ok: true } };
    expect(pendingShare([b])).toHaveLength(1);
    expect(shareMessage([b], "2026-10-20")).toMatch(/T-1.*attribuée à PJ461-2, avec roue Roue A/);
    expect(pendingShare(markShared([b]))).toHaveLength(0);
    const back = { ...markShared([b])[0], target: null, wheel: { name: "", ok: false } };
    expect(pendingShare([back])).toHaveLength(1); expect(shareMessage([back], "2026-10-20")).toMatch(/remise en stock/);
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
  const { parseBossRows, bossTarget, parseWhen, mergeImport, savName, lateDays, pjCheck, snapOf } = require("./turbines");
  const ids = new Set(["PJ446-10", "PJ460-1", "PJ461-2", "PJ420", "PJ376-1", "PJ503"]);
  test("dates avec jour de semaine, #N/A, NC", () => {
    expect(parseWhen("lun. 07/09/26", new Date(2026, 9, 20))).toBe("2026-09-07");
    expect(parseWhen("#N/A")).toBeNull(); expect(parseWhen("NC")).toBeNull();
  });
  test("nom de ligne → projet", () => {
    expect(bossTarget("PJ446-10-1", ids)).toEqual({ kind: "PJ", ref: "PJ446-10" });
    expect(bossTarget("PJ460-1", ids)).toEqual({ kind: "PJ", ref: "PJ460-1" });
    expect(bossTarget("PJ420", ids)).toEqual({ kind: "PJ", ref: "PJ420" });
    expect(bossTarget("PJ482-1-2", ids)).toEqual({ kind: "PJ", ref: "PJ482-1" });
    expect(bossTarget("SAV411", ids)).toEqual({ kind: "SAV", ref: "SAV411" });
    expect(bossTarget("SAV", ids)).toBeNull();
  });
  test("feuille large : dernière date de livraison, modèle, échéance", () => {
    const rows = [["KPI", "Valeur"], ["Total turbines", 3], ["Projet", "Modèle", "N° Série", "Échéance", "Livraison - S06", "Livraison - S07", "Livraison S42", "Status", "Retard (j)"],
      ["PJ446-10-1", "100kW LT", "", "02/03/2026", "27/03/2026", "20/03/2026", "", "Livré", 0], ["PJ376-1", "20kW", "", "21/01/2027", "13/03/2026", "#N/A", "30/10/2026", "OK", 0], ["PJ999", "100kW MT", "", "", "", "", "", "OK", 0]];
    const r = parseBossRows(rows, { pjIds: ids });
    expect(r.kind).toBe("large"); expect(r.noDate).toBe(1);
    expect(r.items[0]).toMatchObject({ ref: "PJ446-10-1", type: "100LT", mad: "2026-03-20", need: "2026-03-02", target: { kind: "PJ", ref: "PJ446-10" } });
    expect(r.items[1]).toMatchObject({ type: "20LT", mad: "2026-10-30" });
  });
  test("feuille hebdomadaire : type déduit, SAV sans numéro à préciser", () => {
    const rows = [["PJ473", "lun. 07/09/26", "ven. 24/07/26"], ["SAV", "NC", "jeu. 22/10/26"], ["SAV411", "NC", "mar. 22/09/26"], ["PJ503", "lun. 22/03/27", "mer. 24/02/27"]];
    const r = parseBossRows(rows, { pjIds: ids, typeOf: (id, t) => t && t.ref === "PJ503" ? "100LT" : null });
    expect(r.kind).toBe("hebdo"); expect(r.items).toHaveLength(4); expect(r.guessed).toBe(3); expect(r.unspecified).toBe(1);
    expect(r.items[1].target).toBeNull(); expect(r.items[1].note).toBe("SAV à préciser");
    const m = mergeImport([], r.items);
    expect(m.turbines).toHaveLength(4); expect(m.newSav).toEqual(["SAV411"]);
    const t = m.turbines.find(x => x.ref === "PJ503"); expect(t.target).toEqual({ kind: "PJ", ref: "PJ503" }); expect(t.need).toBe("2027-03-22");
    expect(t.shared).toEqual(snapOf(t));
    // ré-import hebdomadaire : la date bouge, l'attribution (même modifiée ici) reste
    const moved = { ...t, target: { kind: "PJ", ref: "PJ505" } };
    const r2 = mergeImport([moved], [{ ref: "PJ503", type: "100LT", mad: "2027-03-03", need: "2027-03-22", target: { kind: "PJ", ref: "PJ503" } }]);
    expect(r2.turbines[0].mad).toBe("2027-03-03"); expect(r2.turbines[0].target.ref).toBe("PJ505");
  });
  test("SAV, retard sur échéance, besoin SAV", () => {
    expect(savName("PJ411")).toBe("SAV411"); expect(savName("411")).toBe("SAV411"); expect(savName("PJ411-1")).toBe("SAV411-1"); expect(savName("pj 446 - 10")).toBe("SAV446-10"); expect(savName("abc")).toBe("");
    expect(lateDays({ mad: "2026-12-11", need: "2026-12-02" })).toBe(9); expect(lateDays({ mad: "2026-11-01", need: "2026-12-02" })).toBe(0);
    const c = pjCheck({ pj: "SAV411", needOverride: { type: "20LT", n: 2 }, tests: "2026-11-05", depart: "2026-11-05" }, [], "2026-11-01");
    expect(c.issues[0].text).toMatch(/2 turbines à attribuer/);
  });
});

describe("règles d'arrivée, « complet », éléments seuls, stock du fichier (v146.27)", () => {
  const { pjCheck, dueDates, makeTurbine, placeLoose, absorbLoose, looseOf, parseBossRows, mergeImport } = require("./turbines");
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
  test("date Excel décalée de quelques heures par le fuseau : arrondie au bon jour", () => {
    const { parseWhen } = require("./turbines");
    expect(parseWhen(new Date(2026, 9, 4, 23, 59, 48))).toBe("2026-10-05"); expect(parseWhen(new Date(2026, 9, 5, 0, 0, 0))).toBe("2026-10-05"); expect(parseWhen(new Date(2026, 9, 5, 2, 0, 0))).toBe("2026-10-05");
  });
  test("fichier du responsable : lignes ignorées (skip) et import en stock libre (attach:false)", () => {
    const rows = [["Projet", "Modèle", "N° Série", "Échéance", "Livraison S41", "Livraison S42", "Status"], ["PJ456", "100kW LT", "", "20/10/2026", "01/10/2026", "28/09/2026", "Livré"], ["PJ446-6-1", "100kW LT", "", "16/01/2026", "19/01/2026", "19/01/2026", "En retard"], ["PJ479-1-1", "100kW MT", "", "17/09/2026", "", "07/12/2026", "OK"]];
    const p = parseBossRows(rows, { skip: t => t.ref === "PJ446-6" }, new Date("2026-10-20"));
    expect(p.items.map(i => i.ref)).toEqual(["PJ456", "PJ479-1-1"]); expect(p.skipped).toBe(1);
    const r = mergeImport([], p.items, { attach: false });
    expect(r.turbines.every(t => !t.target)).toBe(true); expect(r.newSav).toEqual([]);
    expect(r.turbines.map(t => t.need)).toEqual(["2026-10-20", "2026-09-17"]);
    expect(mergeImport([], p.items).turbines[0].target.ref).toBe("PJ456");
  });
});
