import { pickUnseen, mergeReleases } from "./ReleaseNotes";
const R = [
  { id: "c", items: [{ t: "a" }, { t: "cash", admin: true }] },
  { id: "b", items: [{ t: "b" }] },
  { id: "a", items: [{ t: "x" }] },
  { id: "z", items: [{ t: "old" }] },
];
test("première visite : les 3 plus récentes", () => { expect(pickUnseen(R, null, false).map(r => r.id)).toEqual(["c", "b", "a"]); });
test("déjà vu la dernière : rien", () => { expect(pickUnseen(R, "c", true)).toEqual([]); });
test("une version manquée", () => { expect(pickUnseen(R, "b", false).map(r => r.id)).toEqual(["c"]); });
test("items admin masqués pour les autres", () => {
  expect(pickUnseen(R, "b", false)[0].items.map(i => i.t)).toEqual(["a"]);
  expect(pickUnseen(R, "b", true)[0].items.map(i => i.t)).toEqual(["a", "cash"]);
});
test("entrée uniquement admin : masquée pour les autres", () => { expect(pickUnseen([{ id: "q", items: [{ t: "s", admin: true }] }], null, false)).toEqual([]); });

test("lignes masquées et publication désactivée", () => {
  expect(pickUnseen([{ id: "a", items: [{ t: "x", hidden: true }, { t: "y" }] }], null, true)[0].items.map(i => i.t)).toEqual(["y"]);
  expect(pickUnseen([{ id: "a", off: true, items: [{ t: "y" }] }], null, true)).toEqual([]);
});
test("fusion : l'appli remplace le code à id égal, le code reste visible sinon", () => {
  const code = [{ id: "n", date: "2026-10-19", items: [{ t: "code" }] }, { id: "o", date: "2026-10-01", items: [{ t: "ancien" }] }];
  const m = mergeReleases([{ id: "o", date: "2026-10-01", items: [{ t: "corrigé" }] }, { id: "z", date: "2026-11-02", items: [{ t: "app" }] }], code);
  expect(m.map(r => r.id)).toEqual(["z", "n", "o"]);
  expect(m[2].items[0].t).toBe("corrigé");
  expect(mergeReleases(null, code).map(r => r.id)).toEqual(["n", "o"]);
});
