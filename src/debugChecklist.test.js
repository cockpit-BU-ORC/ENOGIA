import { DEBUG_ITEMS, DEBUG_SECTIONS, debugProgress, setDebugRow, debugSections, debugRemoved } from "./debugChecklist";
import { debugHtml, debugPdfName } from "./debugPdf";

// v264 : checklist de debug — contenu du modèle Word, cochage, export PDF (v272)
test("le modèle : 6 sections, 36 contrôles, options repérées", () => {
  expect(DEBUG_SECTIONS.map(s => s.title)).toEqual(["Sorties", "Entrée Température", "Entrée analogique (4-20 mA)", "Signal de vibration", "Onduleur et driver", "Communication"]);
  expect(DEBUG_ITEMS).toHaveLength(36);
  expect(new Set(DEBUG_ITEMS.map(i => i.id)).size).toBe(36);
  expect(DEBUG_ITEMS.filter(i => i.opt).length).toBe(7);
});
test("cochage : OK / NOK / S.O., recliquer décoche, avancement", () => {
  let d = setDebugRow({}, "s-vent", { r: "ok" });
  d = setDebugRow(d, "s-pcool", { r: "nok", pb: "Pas de débit" });
  d = setDebugRow(d, "t-tt-03b", { r: "na" });
  expect(debugProgress(d)).toMatchObject({ done: 3, total: 36, nok: 1, signed: false });
  d = setDebugRow(d, "s-vent", { r: "ok" });
  expect(d.rows["s-vent"]).toBeUndefined();
  expect(d.rows["s-pcool"].pb).toBe("Pas de débit");
});
test("export PDF : page A4 paysage au format du modèle, au nom du modèle", () => {
  const h = debugHtml({ pj: "PJ999-1", date: "2026-11-04", name: "Testeur Exemple", debug: { rows: { "s-pcool": { r: "nok", pb: "Pas de débit" } } }, sign: null });
  expect(h).toContain("size:A4 landscape"); expect(h).toContain("N° Projet : PJ999-1"); expect(h).toContain("Pas de débit"); expect(h).toContain("Checklist de Debug ORC");
  expect(h).toContain("<title>PI105-047-XX0003-A-Check list debug - PJ999-1</title>");
  expect(debugPdfName("PJ999-1")).toBe("PI105-047-XX0003-A-Check list debug - PJ999-1");
});
test("liste modifiable : lignes retirées / ajoutées au modèle et pour une machine", () => {
  const model = { removed: ["s-vent"], added: [{ id: "m1", section: "sorties", label: "Vanne FCV-13", hint: "Ouvrir / fermer", opt: false }] };
  const debug = { hide: ["s-pcool"], extra: [{ id: "p1", section: "temp", label: "TT-99", opt: true }], rows: { "m1": { r: "ok" }, "s-vent": { r: "ok" } } };
  const secs = debugSections(model, debug), ids = secs.flatMap(s => s.items.map(i => i.id));
  expect(ids).not.toContain("s-vent"); expect(ids).not.toContain("s-pcool"); expect(ids).toContain("m1"); expect(ids).toContain("p1");
  expect(debugProgress(debug, secs)).toMatchObject({ done: 1, total: 36 - 2 + 2 });
  expect(debugRemoved(model, debug).map(x => [x.id, x.scope])).toEqual([["s-vent", "model"], ["s-pcool", "pj"]]);
});
