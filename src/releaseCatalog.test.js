import { mergeReleases, pickUnseen } from "./components/ReleaseNotes";
import { RELEASE_CATALOG } from "./releaseCatalog";

const code = [
  { id: "c2", date: "2026-10-19", title: "Code 2", items: [{ t: "a", d: "" }] },
  { id: "c1", date: "2026-10-18", title: "Code 1", items: [{ t: "b", d: "" }] },
  { id: "c0", date: "2026-10-25", title: "Futur", items: [{ t: "z", d: "" }] },
];

describe("pop-up : ne revient pas une fois « J'ai compris » (v146.18)", () => {
  const rel = [{ id: "n2", date: "2026-10-20", items: [{ t: "b" }] }, { id: "pub", date: "2026-10-19", items: [{ t: "a" }] }];
  test("identifiant disparu de la liste mais date connue : seul le plus récent compte", () => {
    expect(pickUnseen(rel, "ancien-id", false, "2026-10-19").map(r => r.id)).toEqual(["n2"]);
    expect(pickUnseen(rel, "ancien-id", false, "2026-10-20")).toEqual([]);
  });
  test("une publication catalogue masque TOUTES les notes du code, même plus récentes", () => {
    const stored = [{ id: "pub", date: "2026-10-19", replaceCode: true, items: [{ t: "choisi" }] }];
    const code = [{ id: "c-nouveau", date: "2026-10-20", items: [{ t: "code" }] }];
    expect(mergeReleases(stored, code).map(r => r.id)).toEqual(["pub"]);
  });
});

describe("catalogue des nouveautés (v146.17)", () => {
  test("une publication « catalogue » remplace toutes les notes du code", () => {
    const stored = [{ id: "r1", date: "2026-10-19", title: "Choix", replaceCode: true, items: [{ t: "x", d: "" }] }];
    expect(mergeReleases(stored, code).map(r => r.id)).toEqual(["r1"]);
  });
  test("sans replaceCode, rien ne change", () => {
    const stored = [{ id: "r1", date: "2026-10-19", title: "Choix", items: [{ t: "x", d: "" }] }];
    expect(mergeReleases(stored, code).length).toBe(4);
  });
  test("une publication préparée (off) masque aussi les notes du code, sans rien afficher", () => {
    const stored = [{ id: "r1", date: "2026-10-19", title: "Choix", replaceCode: true, off: true, items: [{ t: "x", d: "" }] }];
    const all = mergeReleases(stored, code);
    expect(all.map(r => r.id)).toEqual(["r1"]);
    expect(pickUnseen(all, null, true)).toEqual([]);
  });
  test("le pop-up ne montre que les lignes publiées, et celles réservées au super admin seulement à lui", () => {
    const rel = [{ id: "r1", date: "2026-10-19", title: "Choix", items: [{ t: "x", d: "" }, { t: "y", d: "", admin: true }] }];
    expect(pickUnseen(rel, null, false)[0].items.length).toBe(1);
    expect(pickUnseen(rel, null, true)[0].items.length).toBe(2);
  });
  test("le catalogue couvre de la V146.5 à la V218, sans titre vide", () => {
    expect(RELEASE_CATALOG[0].v).toBe("146.5");
    expect(RELEASE_CATALOG[RELEASE_CATALOG.length - 1].v).toBe("218");
    RELEASE_CATALOG.forEach(g => g.items.forEach(it => { expect(it[0]).toBeTruthy(); expect(it[1]).toBeTruthy(); }));
  });
});
