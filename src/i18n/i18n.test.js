import { EN, EN_PATTERNS } from "./en";

// v322 : le dictionnaire anglais reste propre (valeurs remplies, motifs valides)
test("dictionnaire anglais : chaque texte a une traduction", () => {
  const empty = Object.entries(EN).filter(([, v]) => typeof v !== "string" || !v.trim());
  expect(empty).toEqual([]);
  expect(Object.keys(EN).length).toBeGreaterThan(900);
});
test("motifs : nombres et textes composés", () => {
  const tr = s => { for (const [re, o] of EN_PATTERNS) { const m = s.match(re); if (m) return typeof o === "function" ? o(...m.slice(1)) : s.replace(re, o); } return s; };
  expect(tr("il y a 3 min")).toBe("3 min ago");
  expect(tr("12 à attribuer")).toBe("12 to assign");
  expect(tr("Affichage : Jours")).toBe("Display: Days");
  expect(tr("+4 j")).toBe("+4 d");
});
