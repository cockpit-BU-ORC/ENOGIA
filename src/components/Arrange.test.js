// v230 : placement libre des cadrans — seuls les cadrans recouverts descendent.
import { resolve } from "./Arrange";
import { ETAT_META, registerEtatEdits, etatOrig, ETAT_EDITS } from "../pjMeta";

test("un cadran posé sur un autre le fait descendre juste en dessous, le vide est gardé", () => {
  const P = { a: { x: 0, y: 0, w: 6, h: 20 }, b: { x: 6, y: 0, w: 6, h: 20 }, c: { x: 0, y: 40, w: 12, h: 10 } };
  const r = resolve({ ...P, b: { x: 3, y: 5, w: 6, h: 20 } }, "b");
  expect(r.b).toEqual({ x: 3, y: 5, w: 6, h: 20 });
  expect(r.a.y).toBe(25);
  expect(r.c.y).toBe(45);
  const r2 = resolve({ ...P, b: { x: 6, y: 60, w: 6, h: 20 } }, "b");
  expect(r2.a.y).toBe(0); expect(r2.c.y).toBe(40); expect(r2.b.y).toBe(60);
});

test("états intégrés : nom et couleur modifiables, puis rétablis", () => {
  expect(ETAT_META["En fabrication"].label).toBe("Fabrication/Montage Fournisseurs");
  registerEtatEdits({ STOCKAGE_EXT: { label: "Stock extérieur", color: "#123456", desc: "x" } });
  expect(ETAT_META.STOCKAGE_EXT.label).toBe("Stock extérieur");
  expect(ETAT_EDITS.STOCKAGE_EXT.desc).toBe("x");
  registerEtatEdits({});
  expect(ETAT_META.STOCKAGE_EXT.label).toBe(etatOrig("STOCKAGE_EXT").label);
  expect(ETAT_EDITS.STOCKAGE_EXT).toBeUndefined();
});
