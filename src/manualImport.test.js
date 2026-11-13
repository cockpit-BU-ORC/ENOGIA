import { parseManual, bookStepsOf, bookImages, setStep, manualProgress, filterSteps, exportCsv, exportJson, parseExport, printHtml } from "./manualImport";

const P = (style, text, extra = "") => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
const IMG = id => `<w:p><w:r><w:drawing><a:blip r:embed="${id}"/></w:drawing></w:r></w:p>`;
const doc = `<w:document><w:body>${P("Titre", "Manuel de configuration")}${P("TOC1", "Sommaire")}
${P("Titre1", "Prérequis")}${P("", "Avoir le PC de mise en service.")}
${P("Titre1", "Configuration hardware")}${P("Titre2", "AFE")}${P("Titre3", "MD050N")}${P("", "Régler la tension.")}${P("Titre4", "Tension de travail.")}${P("", "Mettre 400 V.", "<w:numPr><w:ilvl w:val=\"0\"/></w:numPr>")}${IMG("rId9")}
<w:tbl><w:tr><w:tc>${P("", "Param")}</w:tc><w:tc>${P("", "Valeur")}</w:tc></w:tr><w:tr><w:tc>${P("", "P01")}</w:tc><w:tc>${P("", "50 Hz")}</w:tc></w:tr></w:tbl>
${P("Titre1", "Annexes")}${P("Titre2", "Vide")}</w:body></w:document>`;
const styles = `<w:style w:type="paragraph" w:styleId="Titre1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Titre2"><w:name w:val="heading 2"/></w:style><w:style w:type="paragraph" w:styleId="Titre3"><w:name w:val="heading 3"/></w:style><w:style w:type="paragraph" w:styleId="Titre4"><w:name w:val="heading 4"/></w:style>`;
const rels = `<Relationship Id="rId9" Type="image" Target="media/image3.png"/>`;

test("v337 : manuel Word découpé en chapitres et étapes", () => {
  const book = parseManual({ documentXml: doc, stylesXml: styles, relsXml: rels });
  expect(book.chapters.map(c => c.title)).toEqual(["Prérequis", "Configuration hardware"]); // « Annexes » sans contenu retiré, page de garde ignorée
  const steps = bookStepsOf(book);
  expect(steps.map(s => s.id)).toEqual(["prerequis", "configuration-hardware/afe/md050n", "configuration-hardware/afe/md050n/tension-de-travail"]);
  expect(steps[2]).toMatchObject({ title: "Tension de travail.", path: ["Configuration hardware", "AFE", "MD050N"] });
  expect(steps[2].blocks).toEqual([{ t: "p", text: "Mettre 400 V.", list: true }, { t: "img", src: "media/image3.png" }, { t: "table", rows: [{ c: ["Param", "Valeur"] }, { c: ["P01", "50 Hz"] }] }]);
  expect(bookImages(book)).toEqual(["media/image3.png"]);
});

test("v337 : statuts, progression, filtres, exports et réimport", () => {
  const book = parseManual({ documentXml: doc, stylesXml: styles, relsXml: rels });
  let rows = setStep({}, "prerequis", { v: true, s: "ok" }, "Lou", "2026-11-13T10:00:00Z");
  rows = setStep(rows, "configuration-hardware/afe/md050n", { s: "pb", c: "Tension lue 380 V; à revoir" }, "Lou", "2026-11-13T10:05:00Z");
  const pr = manualProgress(book, rows);
  expect(pr).toMatchObject({ total: 3, valid: 1, ok: 1, pb: 1, todo: 1 });
  expect(pr.problems[0]).toMatchObject({ title: "MD050N", c: "Tension lue 380 V; à revoir" });
  expect(filterSteps(book, rows, { status: "pb" }).map(s => s.title)).toEqual(["MD050N"]);
  expect(filterSteps(book, rows, { status: "novalid" }).length).toBe(2);
  expect(filterSteps(book, rows, { q: "400 v" }).map(s => s.title)).toEqual(["Tension de travail."]);
  expect(setStep(rows, "prerequis", { v: false, s: "todo" })).not.toHaveProperty("prerequis");
  // JSON → réimport identique ; CSV → statuts et commentaires repris (point-virgule échappé)
  const back = parseExport(exportJson(book, rows, { pj: "PJ9" }), book);
  expect(back).toMatchObject({ pj: "PJ9", n: 2, unknown: 0 }); expect(back.rows.prerequis).toMatchObject({ v: true, s: "ok" });
  const csv = parseExport(exportCsv(book, rows, { pj: "PJ9" }), book);
  expect(csv.rows["configuration-hardware/afe/md050n"]).toMatchObject({ s: "pb", c: "Tension lue 380 V; à revoir" });
  expect(csv.rows.prerequis.v).toBe(true);
  expect(() => parseExport('{"a":1}', book)).toThrow();
  expect(printHtml(book, rows, { pj: "PJ9", title: "Manuel" })).toMatch(/Synthèse des problèmes \(1\)/);
});

// v338 : Firestore refuse les tableaux de tableaux (« Nested arrays are not supported ») — le livret n'en contient aucun
test("v338 : livret enregistrable dans Firestore (pas de tableau imbriqué)", () => {
  const book = parseManual({ documentXml: doc, stylesXml: styles, relsXml: rels });
  const nested = v => Array.isArray(v) ? v.some(x => Array.isArray(x) || nested(x)) : v && typeof v === "object" ? Object.values(v).some(nested) : false;
  expect(nested(book)).toBe(false);
});
