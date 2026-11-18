import { PHOTO_STEPS, photoProgress, photosOfShot, freePhotos, safeImgUrl } from "./photos";
import { raiHtml } from "./rai";

const L = [
  { id: "a", step: "elec", shot: "Armoire ouverte", url: "https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg" },
  { id: "b", step: "elec", shot: "Armoire ouverte", url: "https://firebasestorage.googleapis.com/v0/b/x/o/b.jpg" },
  { id: "c", step: "elec", shot: "", url: "https://firebasestorage.googleapis.com/v0/b/x/o/c.jpg" },
];

test("v395 : avancement des photos attendues d'une étape (une photo libre ne compte pas)", () => {
  expect(photoProgress(L, "elec")).toEqual({ expected: PHOTO_STEPS.find(s => s.id === "elec").shots.length, done: 1, total: 3 });
  expect(photosOfShot(L, "elec", "Armoire ouverte").length).toBe(2);
  expect(freePhotos(L, "elec").map(p => p.id)).toEqual(["c"]);
});

test("v395 : seules les adresses Firebase Storage (ou locales de la galerie) entrent dans le PDF, légendes échappées", () => {
  expect(safeImgUrl("javascript:alert(1)")).toBe("");
  expect(safeImgUrl("https://evil.example/x.jpg")).toBe("");
  expect(safeImgUrl(L[0].url)).toBe(L[0].url);
  const h = raiHtml({ R: {}, pass: {}, info: { ref: "PJ900-741-RA001-A" }, photos: [...L, { id: "d", step: "rai", shot: "<img src=x onerror=alert(1)>", url: "javascript:alert(1)" }, { id: "e", step: "rai", shot: "<b>CE</b>", by: "x", url: L[0].url }] });
  expect(h).toMatch(/<h2>Photos<\/h2>/);
  expect(h).not.toMatch(/javascript:/);
  expect(h).not.toMatch(/<b>CE<\/b>/);
  expect(h).toMatch(/&lt;b&gt;CE&lt;\/b&gt;/);
});
