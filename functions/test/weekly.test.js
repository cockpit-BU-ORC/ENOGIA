// v374 : fiche du lundi — le PDF (3 pages) et l'image de la courbe se fabriquent sans erreur à partir d'un Cash in d'essai
"use strict";
const test = require("node:test"), assert = require("node:assert");
const { buildPdf, curvePng, P } = require("../weekly");
const T0 = "2026-11-16";
const R = (id, pj, montant, o) => ({ id, pj, jalon: "Jalon " + id, montant, delai: 30, ...o });
const DOC = { labels: { PJ1: "Client A", PJ2: "Client B" }, owners: { PJ1: "Chef A", PJ2: "Chef B" }, rows: [
  R("a", "PJ1", 100000, { factInit: "2026-01-05", factReelle: "2026-01-05", encInit: "2026-02-04", encPrevue: "2026-02-04", encReelle: "2026-02-10" }),
  R("b", "PJ1", 200000, { factInit: "2026-09-20", factReelle: "2026-10-01", encInit: "2026-10-20", encPrevue: "2026-10-31" }),
  R("c", "PJ2", 50000, { factInit: "2026-10-15", factPrevue: "2026-10-15", encInit: "2026-11-14", encPrevue: "2026-11-14" }),
  R("d", "PJ2", 80000, { factInit: "2026-10-20", factReelle: "2026-10-20", encInit: "2026-11-19", encPrevue: "2026-11-19" }),
  R("e", "PJ2", 120000, { factInit: "2026-11-05", factPrevue: "2026-11-25", encInit: "2026-12-05", encPrevue: "2026-12-25" }),
]};
test("PDF de 3 pages et courbe PNG", async () => {
  const M = await import("../shared/cashWeekly.mjs");
  const rep = M.weeklyReport(DOC, T0);
  const pdf = await buildPdf(rep, M, new Date("2026-11-16T06:00:00Z"));
  assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
  assert.strictEqual((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 3);
  const png = curvePng(rep, M);
  assert.ok(png.slice(1, 4).toString() === "PNG" && png.length > 2000);
  assert.ok(M.mailHtml(rep).includes("cid:courbe"));
  assert.strictEqual(P("−12 k€ → x"), "-12 k€ -> x");
});
