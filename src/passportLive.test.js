import { testsLive, savLive } from "./passportLive";
import { dossierHtml } from "./dossierMachine";

test("v401 : fiche de tests → passeport (livret, FAT) avec les problèmes à traiter", () => {
  const doc = { plans: { PJ900: { book: { rows: { a: { s: "ok" }, b: { s: "ok" }, c: { s: "pb" } } } } } };
  const t = testsLive(doc, "PJ900");
  expect(t.livret).toMatchObject({ v: "2 étapes OK · 1 problème", bad: true, phase: "tests" });
  expect(testsLive(null, "PJ900")).toEqual({});
});

test("v401 : SAV → passeport — MES, dernière intervention, pièce changée (la plus récente), tickets ouverts", () => {
  const sav = { inters: {
    i1: { pj: "PJ900", type: "Mise en service", st: "Réalisée", a: "2026-03-01", b: "2026-03-03", resp: "Tech A" },
    i2: { pj: "PJ900", type: "Maintenance curative", st: "Validée", a: "2026-06-10", b: "2026-06-11", changes: [{ el: "turbines", v: "T-0200", note: "ancienne T-0141" }] },
    i3: { pj: "PJ900", type: "Maintenance curative", st: "Planifiée", a: "2026-12-01", b: "2026-12-02", changes: [{ el: "turbines", v: "T-0300" }] } },
    tickets: { t1: { pj: "PJ900", type: "x", step: 0 } } };
  const s = savLive(sav, "PJ900");
  expect(s.mesDate).toMatchObject({ v: "03/03/2026", phase: "mes" });
  expect(s.lastInter.v).toMatch(/Maintenance curative · 11\/06\/2026/);
  expect(s.turbines).toMatchObject({ v: "T-0200", phase: "sav", sav: true });
  expect(s.ticketsOpen).toMatchObject({ bad: true });
});

test("v401 : dossier machine — valeurs échappées, images de Firebase Storage seulement", () => {
  const h = dossierHtml({ r: { pj: "PJ900", gamme: "180LT" }, meta: { nomProjet: "<b>Client</b>" },
    rows: [{ el: { id: "x", group: "Électrique", label: "Choke" }, planned: "<script>x</script>", real: { v: "Oui" } }], R: {},
    photos: [{ step: "rai", shot: "CE", url: "javascript:alert(1)" }, { step: "rai", shot: "<i>ok</i>", url: "https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg" }] });
  expect(h).not.toMatch(/<b>Client<\/b>/);
  expect(h).not.toMatch(/<script>x/);
  expect(h).not.toMatch(/javascript:alert/);
  expect(h).toMatch(/&lt;i&gt;ok&lt;\/i&gt;/);
});
