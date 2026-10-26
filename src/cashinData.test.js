// V146 — Cash in : validation du fichier de reprise et lisibilité des couleurs transmises à la page (tous thèmes, clair et sombre).
jest.mock("firebase/firestore", () => ({ doc: () => ({}) }));
jest.mock("./firebase", () => ({ db: {} }));
const { validateCashin, cleanCashin, cashinTheme, contrast } = require("./cashinData");
const { setThemeMode, THEME_IDS } = require("./theme");

const ok = { rows: [{ id: "a", pj: "PJ1", jalon: "x", montant: 10 }], labels: { PJ1: "Test" }, totals: {}, owners: {} };

test("une sauvegarde valide passe", () => { expect(validateCashin(ok)).toBeNull(); });
test("refus : pas un objet, pas de rows, jalon sans PJ, champ invalide", () => {
  expect(validateCashin(null)).toMatch(/sauvegarde/);
  expect(validateCashin([])).toMatch(/sauvegarde/);
  expect(validateCashin({})).toMatch(/rows/);
  expect(validateCashin({ rows: [{ id: "a" }] })).toMatch(/n° 1/);
  expect(validateCashin({ rows: [], labels: [] })).toMatch(/labels/);
});
test("refus : trop gros pour Firestore", () => {
  expect(validateCashin({ rows: Array.from({ length: 6000 }, (_, i) => ({ id: "r" + i, pj: "PJ" + i, note: "x".repeat(200) })) })).toMatch(/trop gros/);
});
test("cleanCashin garde la forme de l'artefact", () => {
  const c = cleanCashin({ rows: ok.rows });
  expect(Object.keys(c).sort()).toEqual(["labels", "owners", "rows", "totals", "updatedAt"]);
});
test("couleurs Cash in : texte lisible (≥ 4,5:1) dans tous les thèmes", () => {
  for (const id of THEME_IDS) for (const dark of [false, true]) {
    setThemeMode(dark, id, false);
    const { vars } = cashinTheme();
    const pairs = [["--paid", "--paid-bg"], ["--invoiced", "--invoiced-bg"], ["--chased", "--chased-bg"], ["--tobill", "--tobill-bg"], ["--late", "--late-bg"], ["--future", "--future-bg"], ["--ink", "--bg"], ["--ink", "--surface"], ["--ink-2", "--surface"], ["--accent", "--accent-soft"], ["--accent-ink", "--accent"], ["--on-late", "--late"], ["--ink", "--warn-bg"], ["--ink", "--late-bg"]];
    for (const [fg, bg] of pairs) expect([id, dark, fg, contrast(vars[fg], vars[bg]) >= 4.5]).toEqual([id, dark, fg, true]);
  }
});

describe("copie réduite pour les administrateurs (v146.12)", () => {
  const { buildSharedCashin } = require("./cashinData");
  test("ne garde que les PJ rattachés à l'ordo, avec libellés, totaux et liaisons", () => {
    const doc = { rows: [{ id: "a", pj: "PJ405" }, { id: "b", pj: "PJ999" }], labels: { PJ405: "X", PJ999: "Y" }, totals: { PJ405: 100, PJ999: 5 } };
    const out = buildSharedCashin(doc, { PJ405: ["PJ405"], PJ999: [] }, ["PJ405"]);
    expect(out.rows.map(r => r.pj)).toEqual(["PJ405"]);
    expect(out.labels).toEqual({ PJ405: "X" });
    expect(out.totals).toEqual({ PJ405: 100 });
    expect(out.links).toEqual({ PJ405: ["PJ405"] });
  });
});
