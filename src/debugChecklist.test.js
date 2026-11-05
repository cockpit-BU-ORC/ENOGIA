import { DEBUG_ITEMS, DEBUG_SECTIONS, debugProgress, setDebugRow, debugSections } from "./debugChecklist";
import { parseDocxXml, parseChecklistText } from "./checklistImport";
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
test("modèle de la page Checklists : sections complètes, ancien format encore lu", () => {
  const sections = [{ id: "s1", title: "Sorties", items: [{ id: "a", label: "Vanne", hint: "Ouvrir", opt: false }, { id: "b", label: "", hint: "" }] }];
  expect(debugSections({ sections })).toEqual([{ id: "s1", title: "Sorties", items: [{ id: "a", label: "Vanne", hint: "Ouvrir", opt: false }] }]);
  expect(debugProgress({ rows: { a: { r: "nok" } } }, debugSections({ sections }))).toMatchObject({ done: 1, nok: 1, total: 1 });
  const old = debugSections({ removed: ["s-vent"], added: [{ id: "m1", section: "sorties", label: "FCV-13" }] }).flatMap(s => s.items.map(i => i.id));
  expect(old).not.toContain("s-vent"); expect(old).toContain("m1");
  expect(debugSections(null).flatMap(s => s.items)).toHaveLength(36);
});
test("import : Word au format du modèle et texte collé depuis Excel", () => {
  const cell = t => "<w:tc><w:p><w:r><w:t>" + t + "</w:t></w:r></w:p></w:tc>", row = cs => "<w:tr>" + cs.map(cell).join("") + "</w:tr>";
  const xml = row(["N° Projet : PJ1", "Date"]) + row(["Sorties", "OK", "NOK", "Problème", "Causalité", "Correctif", "Temps", "Commentaires"]) + row(["Pompe cooling", "", "", "", "", "", "", "Activer la pompe"]) + row(["TT-03B (Option)", "", "", "", "", "", "", "Débrancher"]);
  const d = parseDocxXml(xml);
  expect(d).toHaveLength(1); expect(d[0].title).toBe("Sorties");
  expect(d[0].items.map(i => [i.label, i.hint, i.opt])).toEqual([["Pompe cooling", "Activer la pompe", false], ["TT-03B (Option)", "Débrancher", true]]);
  const p = parseChecklistText(["Section\tContrôle\tConsigne\tOption", "Sorties\tVanne A\tOuvrir\t", "Sorties\tVanne B\tFermer\toui", "Capteurs\tTT-1\t\t"].join("\n"));
  expect(p.map(s => [s.title, s.items.length])).toEqual([["Sorties", 2], ["Capteurs", 1]]);
  expect(p[0].items[1].opt).toBe(true);
});
