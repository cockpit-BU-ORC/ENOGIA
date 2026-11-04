import { DEBUG_ITEMS, DEBUG_SECTIONS, debugProgress, setDebugRow } from "./debugChecklist";
import { buildDebugDocx, debugDocxName } from "./debugDocx";
import { zipCrc32 } from "./zipStore";

// v264 : checklist de debug — contenu du modèle Word, cochage, export .docx
const text = u => { let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return s; };
const u8 = t => unescape(encodeURIComponent(t)); // texte cherché, encodé en UTF-8 comme dans le fichier
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
test("export Word : fichier .docx complet, au nom du modèle", () => {
  const u = buildDebugDocx({ pj: "PJ999-1", date: "2026-11-04", name: "Testeur Exemple", debug: { rows: { "s-pcool": { r: "nok", pb: "Pas de débit" } } }, sign: null });
  const s = text(u);
  expect(u[0]).toBe(0x50); expect(u[1]).toBe(0x4b); // « PK » : archive zip
  ["[Content_Types].xml", "word/document.xml", "word/styles.xml", "word/media/image1.png"].forEach(n => expect(s).toContain(n));
  expect(s).toContain(u8("N° Projet : PJ999-1")); expect(s).toContain(u8("Pas de débit")); expect(s).toContain('w:orient="landscape"');
  expect(zipCrc32(new Uint8Array([49, 50, 51, 52, 53, 54, 55, 56, 57]))).toBe(0xCBF43926); // valeur de contrôle du CRC-32
  expect(debugDocxName("PJ999-1")).toBe("PI105-047-XX0003-A-Check list debug - PJ999-1.docx");
});
