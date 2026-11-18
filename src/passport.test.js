import { rowOf, passportRows, phaseProgress, setCfg, setReal, gammeKey, parseConfigTable, parseReference, importPlan, elementsOf } from "./passport";

const el = id => elementsOf({}).find(e => e.id === id);
const doc0 = { standards: { "180LT": { choke: "Aucun", pompeLub: "A2V", elecPuissance: "Inovance" } }, pass: {} };

test("v393 : gamme du planning ramenée au standard le plus proche", () => {
  expect(gammeKey(doc0, "180LTV3")).toBe("180LT");
  expect(gammeKey(doc0, "20LT")).toBe("20LT");
});

test("v393 : prévu = standard, écart surligné seulement s'il diffère, retour au standard = champ retiré", () => {
  expect(rowOf(doc0, "PJ900", "180LTV3", el("choke"))).toMatchObject({ planned: "Aucun", dev: false, own: false });
  const P = setCfg(doc0, "PJ900", "180LTV3", "choke", "Oui", "Camille");
  expect(P.cfg.choke).toBe("Oui");
  expect(P.hist[0]).toMatchObject({ phase: "design", el: "choke", from: "Aucun", to: "Oui" });
  const d1 = { ...doc0, pass: { PJ900: P } };
  expect(rowOf(d1, "PJ900", "180LTV3", el("choke"))).toMatchObject({ planned: "Oui", dev: true });
  const P2 = setCfg(d1, "PJ900", "180LTV3", "choke", "Aucun", "Camille");
  expect(P2.cfg.choke).toBeUndefined();
});

test("v393 : réel avec phase et source ; plus précis que le prévu = pas d'écart, différent = écart", () => {
  const P = setReal(doc0, "PJ900", "elecPuissance", "Inovance MD500", "appro", "PO 2611", "Alex");
  const d1 = { ...doc0, pass: { PJ900: P } };
  expect(rowOf(d1, "PJ900", "180LT", el("elecPuissance"))).toMatchObject({ gap: false });
  expect(P.real.elecPuissance).toMatchObject({ v: "Inovance MD500", phase: "appro", src: "PO 2611", by: "Alex" });
  const d2 = { ...doc0, pass: { PJ900: setReal(d1, "PJ900", "elecPuissance", "Emotron FDU", "appro", "substitution", "Alex") } };
  expect(rowOf(d2, "PJ900", "180LT", el("elecPuissance")).gap).toBe(true);
  expect(d2.pass.PJ900.hist.length).toBe(2);
});

test("v393 : avancement par phase (design = prévu défini, autres = réel renseigné)", () => {
  const pp = phaseProgress(doc0, "PJ900", "180LT");
  expect(pp.map(p => p.k)).toEqual(["design", "appro", "fab", "tests", "mes", "sav"]);
  expect(pp[0].done).toBe(3);
  expect(passportRows(doc0, "PJ900", "180LT").length).toBe(elementsOf(doc0).length);
});

test("v393 : import du Tableau configuration machines (TARGET = prévu, ACTUEL = réel) et de la Référence", () => {
  const table = parseConfigTable([
    ["", "PJ", "Nom PJ", "S/N ORC", "ORC", "Nb de \n Turbine/Volute", "Application", "ACTUEL : Injecteur", "ACTUEL : Nb bouchages", "TARGET : Injecteur", "Choke", "Schafner", "Colonne inconnue"],
    ["", "PJ901", "Client", "2024-001-20", "180LT", "2", "Maritime", "DF045", "5/11", "I0350", "Aucun", "--------", "x"],
    ["", "", "", "", "", "", "", "", "", "", "", "", ""],
  ]);
  expect(table.machines.PJ901).toMatchObject({ gamme: "180LT", cfg: { nbTurb: "2", application: "Maritime", injecteur: "I0350", bouchages: "5/11", choke: "Aucun" }, real: { injecteur: "DF045", bouchages: "5/11" } });
  expect(table.machines.PJ901.cfg.schaffner).toBeUndefined();
  expect(table.unknown).toContain("Colonne inconnue");
  const ref = parseReference([["", "", "", "", "Intégration"], ["", "", "Volute", "Jacket water", "Intérieur", "Pompe de Lub"], ["", "180LT", "100-V2", "100-V2", "WAGO", "A2V"]]);
  expect(ref["180LT"]).toEqual({ volute: "100-V2", jacket: "100-V2", pompeLub: "A2V" });
  // ce qui est déjà saisi n'est pas écrasé ; une valeur égale au standard n'est pas recopiée en écart
  const d = { standards: { "180LT": { choke: "Aucun" } }, pass: { PJ901: { cfg: { application: "Terrestre" } } } };
  const plan = importPlan(d, table, ref, "Gabriel");
  expect(plan.pass.PJ901.cfg.application).toBe("Terrestre");
  expect(plan.pass.PJ901.cfg.choke).toBeUndefined();
  expect(plan.pass.PJ901.real.injecteur).toMatchObject({ v: "DF045", phase: "fab" });
  expect(plan.standards["180LT"]).toMatchObject({ choke: "Aucun", volute: "100-V2" });
});

test("v397 : achats par scope (statut d'après le PO, livré sans PO, retard) et réel des turbines", () => {
  const { achatScopes, turbLive, liveRows, passportRows, elementsOf } = require("./passport");
  const A = { projets: { f1: { id: "f1", projet: "PJ900", machine: "PJ900" }, f2: { id: "f2", machine: "PJ901" } },
    po: { o1: { numero: "PO 1", statut: "livre" }, o2: { numero: "PO 2", statut: "attente", dateLivraison: "2026-11-01" } },
    lignes: { a: { projetId: "f1", famille: "armoire", ref: "MD500", poId: "o1" }, b: { projetId: "f1", famille: "ARMOIRE", designation: "AFE", poId: "o2" }, c: { projetId: "f1", famille: "CHOKE", livreSansPo: true }, d: { projetId: "f2", famille: "CHOKE" } } };
  const sc = achatScopes(A, "PJ900", "2026-11-18");
  expect(sc.ARMOIRE).toMatchObject({ lines: 2, livre: 1, cmd: 1, late: 1, pos: ["PO 1", "PO 2"] });
  expect(sc.CHOKE).toMatchObject({ lines: 1, livre: 1 });
  const t = turbLive({ slots: [{ num: "T-1", allouee: true, installee: "2026-11-10", roue: "W0400", inj: "I0350 · 2 bouchages" }, { num: "", allouee: false, roue: "", inj: "" }] });
  expect(t.turbines.v).toBe("T-1 (installée)");
  expect(t.roue.v).toBe("W0400");
  expect(t.bouchages.v).toBe("2");
  const doc = { standards: { "180LT": { roue: "W0400" } } };
  const rows = liveRows(passportRows(doc, "PJ900", "180LT"), { real: t, scopes: sc });
  const by = id => rows.find(x => x.el.id === id);
  expect(by("roue")).toMatchObject({ gap: false });
  expect(by("roue").real.src).toMatch(/Turbines/);
  expect(by("choke").achatSt).toMatchObject({ livre: 1 });
  expect(elementsOf({}).find(e => e.id === "choke").scope).toBe("CHOKE");
});

test("v399 : « à traiter » — réel ≠ prévu, achat en retard, à définir (sauf facultatif), à commander ; sinon état", () => {
  const { rowIssue, rowState } = require("./passport");
  const el = (id, x) => ({ id, label: id, phase: "appro", scope: "S", ...(x || {}) });
  expect(rowIssue({ el: el("a"), planned: "IFM", real: { v: "Wago" }, gap: true })).toMatchObject({ tone: "bad", t: "Réel ≠ prévu" });
  expect(rowIssue({ el: el("a"), planned: "A2V", achatSt: { late: 1, pos: ["PO 2"], apasser: 0 } })).toMatchObject({ tone: "bad" });
  expect(rowIssue({ el: el("n", { phase: "design" }), planned: "" })).toMatchObject({ tone: "warn" });
  expect(rowIssue({ el: el("autres", { phase: "design", opt: true }), planned: "" })).toBeNull();
  expect(rowIssue({ el: el("c"), planned: "Oui", achatSt: { apasser: 1, late: 0, pos: [] } })).toMatchObject({ t: "À commander" });
  expect(rowState({ el: el("c"), planned: "Oui", achatSt: { lines: 1, livre: 1, pos: ["PO 1"] } })).toMatchObject({ t: "Livré · PO 1", tone: "ok" });
  expect(rowState({ el: el("r"), planned: "W0400", real: { v: "W0400" } })).toMatchObject({ t: "Conforme" });
});
