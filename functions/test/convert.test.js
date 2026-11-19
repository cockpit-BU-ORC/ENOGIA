// v294 : tests de la conversion Odoo → PO (données d'exemple inventées). Lancer : cd functions && npm test
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { buildPo, plan, summary, statutOf } = require("../convert");

const orders = [
  { id: 1, name: "P00010", date_approve: "2026-10-02 08:00:00", date_order: "2026-10-01 09:00:00", state: "purchase" },
  { id: 2, name: "P00011", date_approve: false, date_order: "2026-10-05 09:00:00", state: "sent" },
  { id: 3, name: "P00012", date_approve: false, date_order: "2026-10-06 09:00:00", state: "cancel" },
];
const lines = [
  { id: 101, order_id: [1, "P00010"], sequence: 20, product_id: [7, "Pompe"], name: "Pompe cycle\nDétail", product_qty: 2, qty_received: 2, date_planned: "2026-11-10 10:00:00", x_projet: "PJ100" },
  { id: 100, order_id: [1, "P00010"], sequence: 10, product_id: [8, "Vanne"], name: "Vanne", product_qty: 4, qty_received: 1, date_planned: "2026-11-12 10:00:00", x_projet: [5, "PJ100"] },
  { id: 200, order_id: 2, sequence: 10, product_id: 7, name: "Pompe", product_qty: 1, qty_received: 0, date_planned: "2026-12-01 00:00:00", x_projet: false },
  { id: 300, order_id: [3, "P00012"], sequence: 10, product_id: [8, "Vanne"], name: "Vanne", product_qty: 1, qty_received: 0, date_planned: false, x_projet: "PJ100" },
];
const products = [{ id: 7, default_code: "POMP-01" }, { id: 8, default_code: false }];
const now = "2026-11-09T02:00:00.000Z";

test("statuts : brouillon, envoyée, confirmée, livrée", () => {
  assert.strictEqual(statutOf("draft", 1, 0), "apasser");
  assert.strictEqual(statutOf("to approve", 1, 0), "apasser");
  assert.strictEqual(statutOf("sent", 1, 0), "envoyee");
  assert.strictEqual(statutOf("purchase", 1, 0), "attente");
  assert.strictEqual(statutOf("purchase", 2, 2), "livre");
});

test("conversion : numéro, rang de ligne, réf, dates, projet, annulées", () => {
  const b = buildPo(orders, lines, products, { champProjet: "x_projet", now });
  assert.deepStrictEqual(Object.keys(b.po).sort(), ["o100", "o101", "o200"]);
  assert.strictEqual(b.po.o100.ligne, "1"); assert.strictEqual(b.po.o101.ligne, "2");   // tri par sequence
  assert.strictEqual(b.po.o101.ref, "POMP-01"); assert.strictEqual(b.po.o100.ref, "");
  assert.strictEqual(b.po.o101.designation, "Pompe cycle");
  assert.strictEqual(b.po.o101.dateCommande, "2026-10-02"); assert.strictEqual(b.po.o200.dateCommande, "2026-10-05");
  assert.strictEqual(b.po.o101.dateLivraison, "2026-11-10");
  assert.strictEqual(b.po.o101.statut, "livre"); assert.strictEqual(b.po.o100.statut, "attente"); assert.strictEqual(b.po.o200.statut, "envoyee");
  assert.strictEqual(b.po.o100.projet, "PJ100"); assert.strictEqual(b.po.o200.projet, "");
  assert.strictEqual(b.po.o101.source, "odoo"); assert.strictEqual(b.po.o101.odooId, 101);
  assert.ok(b.cancelled.has("o300"));
});

test("filtre « seulement les fiches »", () => {
  const b = buildPo(orders, lines, products, { champProjet: "x_projet", projetsFiches: new Set(["PJ100"]), now });
  assert.ok(b.outOfScope.has("o200")); assert.ok(!b.outOfScope.has("o100"));
});

test("plan : ajout, mise à jour, saisie manuelle intacte, annulée affectée, disparue, hors fenêtre", () => {
  const b = buildPo(orders, lines, products, { champProjet: "x_projet", projetsFiches: new Set(["PJ100"]), now });
  const doc = {
    po: {
      o100: { numero: "P00010", ligne: "1", ref: "", designation: "Vanne", qte: 4, qteRecue: 0, dateCommande: "2026-10-02", dateLivraison: "2026-11-12", statut: "attente", projet: "PJ100", source: "odoo", annule: false },
      o300: { numero: "P00012", source: "odoo", dateCommande: "2026-10-06" },                  // commande annulée, affectée
      o400: { numero: "P00013", source: "odoo", dateCommande: "2026-10-20" },                  // disparue, non affectée
      o500: { numero: "P00001", source: "odoo", dateCommande: "2025-01-10" },                  // hors fenêtre
      p77_1: { numero: "77", ligne: "1", source: "" },                                         // saisie à la main
      o200: { numero: "P00011", source: "odoo", dateCommande: "2026-10-05" },                  // hors fiches, non affectée
    },
    lignes: { L1: { poId: "o300" } },
  };
  const r = plan(doc, b, "2026-01-01");
  assert.ok(r.set.o101 && !doc.po.o101);                                // ajoutée
  assert.strictEqual(r.set.o100.qteRecue, 1);                           // mise à jour
  assert.strictEqual(r.set.o300.annule, true);                          // annulée mais affectée : gardée, marquée
  assert.ok(r.del.includes("o400"));                                    // disparue : supprimée
  assert.ok(r.del.includes("o200"));                                    // hors fiches : supprimée
  assert.ok(!r.del.includes("o500") && !r.set.o500);                    // hors fenêtre : intacte
  assert.ok(!r.set.p77_1 && !r.del.includes("p77_1"));                  // saisie manuelle : intacte
  assert.deepStrictEqual(r.stats, { nb: 2, ajoutees: 1, maj: 1, annulees: 3 });
  const again = plan({ ...doc, po: { ...doc.po, ...r.set } }, b, "2026-01-01");
  assert.strictEqual(again.stats.maj, 0); assert.strictEqual(again.stats.ajoutees, 0); // deuxième passage : rien à changer
});

test("compte rendu : lues, sans projet, écartées avec exemples, aucune fiche", () => {
  const b = buildPo(orders, lines, products, { champProjet: "x_projet", projetsFiches: new Set(["PJ999"]), now });
  const m = summary({ orders, lines }, b, { depuis: "2026-10-01", fiches: new Set(["PJ999"]), champProjet: "x_projet" });
  assert.match(m, /3 commande\(s\) et 4 ligne\(s\) lues dans Odoo depuis le 01\/10\/2026/);
  assert.match(m, /1 ligne\(s\) sans n° de projet/);
  assert.match(m, /3 ligne\(s\) écartée\(s\).*valeurs Odoo : PJ100/);
  assert.match(summary({ orders, lines }, b, { fiches: new Set(), champProjet: "x_projet" }), /aucune fiche machine/);
});

test("v413 : une ligne de PO supprimée par un admin ne revient pas", () => {
  const b = buildPo(orders, lines, products, { champProjet: "x_projet", projetsFiches: new Set(["PJ100"]), now });
  const r = plan({ po: {}, lignes: {}, params: { poIgnores: { o101: { at: now } } } }, b, "2026-01-01");
  assert.ok(!r.set.o101 && r.set.o100);
});
